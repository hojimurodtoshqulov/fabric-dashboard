import { db } from "@/lib/db";

// ─── Public interfaces (used by API route and sync agent) ─────────────────────

export interface SaleRecord {
  date: string;       // ISO date, e.g. "2026-06-01"
  number: string;     // 1C doc number, e.g. "SS000000515"
  amount: number;     // total in UZS
  clientName: string;
  inn: string;        // INN / PINFL
  phone?: string;
  contract: string;
  comment: string;    // salesperson or region
}

export interface DebtInvoice {
  date: string;
  number: string;
  amount: number;
}

export interface DebtRecord {
  clientName: string;
  inn: string;
  phone?: string;
  region?: string;    // from counterpart comment field
  totalDebt: number;  // account 62 balance
  invoices?: DebtInvoice[]; // for aging calculation
}

export interface SyncPayload {
  sales?: SaleRecord[];
  debts?: DebtRecord[];
  agentVersion?: string;
}

export interface SyncResult {
  salesSynced: number;
  debtsSynced: number;
  clientsCreated: number;
  clientsUpdated: number;
  errors: string[];
  durationMs: number;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 9)  return `+998${d}`;
  if (d.length === 12 && d.startsWith("998")) return `+${d}`;
  if (d.length >= 7)   return `+998${d.slice(-9).padStart(9, "0")}`;
  return null;
}

/** FIFO aging: oldest invoices assumed unpaid first */
function calculateAging(totalDebt: number, invoices: DebtInvoice[]) {
  const now = Date.now();
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let remaining = totalDebt;
  let days0to30 = 0, days31to60 = 0, days61to90 = 0, days91to100 = 0, daysOver100 = 0;

  for (const inv of sorted) {
    if (remaining <= 0) break;
    const amount = Math.min(inv.amount, remaining);
    const age = Math.floor((now - new Date(inv.date).getTime()) / 86_400_000);

    if      (age <= 30)  days0to30   += amount;
    else if (age <= 60)  days31to60  += amount;
    else if (age <= 90)  days61to90  += amount;
    else if (age <= 100) days91to100 += amount;
    else                 daysOver100 += amount;

    remaining -= amount;
  }
  if (remaining > 0) daysOver100 += remaining;

  return { days0to30, days31to60, days61to90, days91to100, daysOver100 };
}

async function getSystemUserId(): Promise<string> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM users u
    JOIN roles r ON r.id = u."roleId"
    WHERE r.name = 'DIRECTOR' AND u."isActive" = true
    ORDER BY u."createdAt" ASC LIMIT 1
  `;
  if (rows[0]) return rows[0].id;
  const fallback = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1
  `;
  if (!fallback[0]) throw new Error("No users found in database");
  return fallback[0].id;
}

/** Find client by INN, then by name. Creates if missing. */
async function findOrCreateClient(
  name: string,
  inn: string,
  phone?: string,
  systemUserId?: string
): Promise<{ id: string; created: boolean; updated: boolean }> {
  // 1. Match by INN
  if (inn) {
    const r = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM clients WHERE inn = ${inn} LIMIT 1
    `;
    if (r[0]) return { id: r[0].id, created: false, updated: false };
  }

  // 2. Match by name
  const byName = await db.$queryRaw<{ id: string; inn: string | null }[]>`
    SELECT id, inn FROM clients WHERE LOWER(name) = LOWER(${name}) LIMIT 1
  `;
  if (byName[0]) {
    if (inn && !byName[0].inn) {
      await db.$executeRaw`
        UPDATE clients SET inn = ${inn}, "updatedAt" = NOW() WHERE id = ${byName[0].id}
      `;
      return { id: byName[0].id, created: false, updated: true };
    }
    return { id: byName[0].id, created: false, updated: false };
  }

  // 3. Create new client
  if (!systemUserId) throw new Error("systemUserId required");
  const id = genId();
  const normalizedPhone =
    normalizePhone(phone) ??
    `+998000${(inn || "0000000").slice(-7).padStart(7, "0")}`;

  await db.$executeRaw`
    INSERT INTO clients (id, name, phone, status, "createdById", inn, "createdAt", "updatedAt")
    VALUES (${id}, ${name}, ${normalizedPhone}, 'PROSPECT', ${systemUserId}, ${inn || null}, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `;
  return { id, created: true, updated: false };
}

async function upsertInvoice(
  sale: SaleRecord,
  clientId: string,
  systemUserId: string
): Promise<void> {
  const externalId = `1C:${sale.number}`;
  const saleDate   = new Date(sale.date);
  const dueDate    = new Date(saleDate.getTime() + 30 * 86_400_000);

  const existing = await db.invoice.findFirst({
    where: { externalId },
    select: { id: true },
  });

  if (existing) {
    await db.invoice.update({
      where: { id: existing.id },
      data: { subtotal: sale.amount, total: sale.amount, updatedAt: new Date() },
    });
    return;
  }

  let invoiceNumber = `1C-${sale.number}`;
  const conflict = await db.invoice.findFirst({ where: { number: invoiceNumber }, select: { id: true } });
  if (conflict) invoiceNumber = `1C-${sale.number}-${Date.now().toString(36)}`;

  await db.invoice.create({
    data: {
      number:      invoiceNumber,
      clientId,
      status:      "SENT",
      subtotal:    sale.amount,
      discount:    0,
      tax:         0,
      total:       sale.amount,
      paid:        0,
      notes:       sale.comment || undefined,
      externalId,
      source:      "1c",
      dueDate,
      createdById: systemUserId,
      createdAt:   saleDate,
    },
  });
}

async function upsertOneCDebt(debt: DebtRecord, clientId: string): Promise<void> {
  const aging = calculateAging(debt.totalDebt, debt.invoices ?? []);

  let status = "PENDING";
  if (debt.totalDebt <= 0) status = "PAID";
  else if (aging.days31to60 + aging.days61to90 + aging.days91to100 + aging.daysOver100 > 0)
    status = "OVERDUE";

  const existing = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM debts WHERE "clientId" = ${clientId} AND "syncSource" = '1c' LIMIT 1
  `;

  if (existing[0]) {
    await db.$executeRaw`
      UPDATE debts SET
        amount        = ${debt.totalDebt},
        status        = ${status}::"DebtStatus",
        "days0to30"   = ${aging.days0to30},
        "days31to60"  = ${aging.days31to60},
        "days61to90"  = ${aging.days61to90},
        "days91to100" = ${aging.days91to100},
        "daysOver100" = ${aging.daysOver100},
        "lastSyncAt"  = NOW(),
        "updatedAt"   = NOW()
      WHERE id = ${existing[0].id}
    `;
  } else {
    const id = genId();
    await db.$executeRaw`
      INSERT INTO debts (
        id, "clientId", amount, "paidAmount", "dueDate", status,
        "days0to30", "days31to60", "days61to90", "days91to100", "daysOver100",
        "syncSource", "lastSyncAt", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${clientId}, ${debt.totalDebt}, 0, NOW(),
        ${status}::"DebtStatus",
        ${aging.days0to30}, ${aging.days31to60}, ${aging.days61to90},
        ${aging.days91to100}, ${aging.daysOver100},
        '1c', NOW(), NOW(), NOW()
      )
    `;
  }

  if (debt.totalDebt > 0) {
    await db.$executeRaw`
      UPDATE clients SET status = 'DEBTOR', "updatedAt" = NOW()
      WHERE id = ${clientId} AND status NOT IN ('DEBTOR', 'LOST')
    `;
  }
}

// ─── Public sync processor ────────────────────────────────────────────────────

export async function processSyncPayload(payload: SyncPayload): Promise<SyncResult> {
  const t0 = Date.now();
  const result: SyncResult = {
    salesSynced: 0, debtsSynced: 0,
    clientsCreated: 0, clientsUpdated: 0,
    errors: [], durationMs: 0,
  };

  const systemUserId = await getSystemUserId();

  for (const sale of payload.sales ?? []) {
    try {
      if (!sale.clientName || !sale.number) continue;
      const client = await findOrCreateClient(sale.clientName, sale.inn, sale.phone, systemUserId);
      if (client.created) result.clientsCreated++;
      if (client.updated) result.clientsUpdated++;
      await upsertInvoice(sale, client.id, systemUserId);
      result.salesSynced++;
    } catch (e) {
      result.errors.push(`sale[${sale.number}]: ${e instanceof Error ? e.message : e}`);
    }
  }

  for (const debt of payload.debts ?? []) {
    try {
      if (!debt.clientName) continue;
      const client = await findOrCreateClient(debt.clientName, debt.inn, debt.phone, systemUserId);
      if (client.created) result.clientsCreated++;
      if (client.updated) result.clientsUpdated++;
      await upsertOneCDebt(debt, client.id);
      result.debtsSynced++;
    } catch (e) {
      result.errors.push(`debt[${debt.clientName}]: ${e instanceof Error ? e.message : e}`);
    }
  }

  result.durationMs = Date.now() - t0;
  return result;
}
