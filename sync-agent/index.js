/**
 * SELXOZMASH TEXTIL — 1C Enterprise Sync Agent
 *
 * Reads sales (Реализация товаров и услуг) and receivables (счет 62)
 * from 1C and sends them to Fabric Automation cloud API.
 *
 * Usage:
 *   node index.js          — run once and exit (retries on failure)
 *   node index.js --status — check last sync status only
 *
 * Daily scheduling: see install-schedule.bat (Windows Task Scheduler).
 * Logs are written to logs/sync-YYYY-MM-DD.log next to this file.
 */

const path = require("path");
const fs   = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { getConfig }                               = require("./src/config");
const { createConnection }                        = require("./src/connection");
const { querySales, queryDebtBalances, queryInvoicesForAging, queryCashEntries } = require("./src/queries");
const { transformSales, transformDebts, transformCashFlows } = require("./src/transform");
const { sendSync, checkStatus }                   = require("./src/api");

const AGENT_VERSION = "1.2.0";
const BATCH_SIZE = 100;
const LOG_DIR = path.join(__dirname, "logs");
const LOG_KEEP_DAYS = 30;

function writeLog(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    fs.appendFileSync(path.join(LOG_DIR, `sync-${day}.log`), line + "\n");
  } catch { /* logging must never break the sync */ }
}

function log(msg)  { const l = `[${new Date().toISOString()}] ${msg}`;        console.log(l);   writeLog(l); }
function warn(msg) { const l = `[${new Date().toISOString()}] WARN: ${msg}`;  console.warn(l);  writeLog(l); }
function err(msg)  { const l = `[${new Date().toISOString()}] ERROR: ${msg}`; console.error(l); writeLog(l); }

function cleanupOldLogs() {
  try {
    const cutoff = Date.now() - LOG_KEEP_DAYS * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(LOG_DIR)) {
      const full = path.join(LOG_DIR, f);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runStatusCheck(config) {
  log("Checking last sync status...");
  const status = await checkStatus(config);
  if (status.lastSync) {
    const s = status.lastSync;
    log(`Last sync: ${s.status} at ${s.finishedAt || s.startedAt}`);
    log(`  Sales: ${s.salesCount}  Debts: ${s.debtsCount}  Cash: ${s.cashFlowsCount ?? 0}  New clients: ${s.clientsCreated}`);
    if (s.error) warn(`  Error: ${s.error}`);
  } else {
    log("No syncs recorded yet.");
  }
}

async function runSync(config) {
  log("══════════════════════════════════════════");
  log("  SELXOZMASH 1C → Fabric Automation Sync  ");
  log("══════════════════════════════════════════");
  log(`API: ${config.fabricApiUrl}`);
  log(`Sync period: last ${config.syncDays} days`);

  // ── Step 1: Connect to 1C ────────────────────────────────────────────────
  log("Connecting to 1C Enterprise...");
  const conn = createConnection(config.oneC);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - config.syncDays);

  // ── Step 2: Read sales ───────────────────────────────────────────────────
  log("Reading sales invoices (Реализация товаров и услуг)...");
  const rawSales = querySales(conn, fromDate);
  log(`  Found: ${rawSales.length} sales invoices`);

  // ── Step 3: Read debt balances ───────────────────────────────────────────
  log("Reading receivables balance (Счет 62 - Задолженность покупателей)...");
  const rawDebts = queryDebtBalances(conn);
  log(`  Found: ${rawDebts.length} debtors`);

  // ── Step 4: Read invoices for aging ─────────────────────────────────────
  log("Reading invoices for aging calculation...");
  const agingInvoices = queryInvoicesForAging(conn, fromDate);
  log(`  Found: ${agingInvoices.length} invoices`);

  // ── Step 4b: Read cash and bank movements ───────────────────────────────
  // A failure here (e.g. a different chart of accounts) must not stop the sales and debt
  // sync, which has been working. Without a successful read the server is told nothing
  // about cash, so it also won't remove any cash rows.
  let rawCash = [];
  let cashRead = false;
  log("Reading cash and bank movements (accounts 50, 51, 52)...");
  try {
    rawCash = queryCashEntries(conn, fromDate);
    cashRead = true;
    log(`  Found: ${rawCash.length} ledger entries`);
  } catch (e) {
    warn(`Cash/bank read failed, continuing without it: ${e.message || String(e)}`);
  }

  // ── Step 5: Transform ────────────────────────────────────────────────────
  log("Transforming data...");
  const sales = transformSales(rawSales);
  const debts = transformDebts(rawDebts, agingInvoices);
  log(`  Sales ready:  ${sales.length}`);
  log(`  Debts ready:  ${debts.length}`);
  const cashFlows = transformCashFlows(rawCash);
  log(`  Cash ready:   ${cashFlows.length}`);

  if (sales.length === 0 && debts.length === 0 && cashFlows.length === 0) {
    warn("Nothing to sync. Check 1C data and date range.");
    return;
  }

  // ── Step 6: Send to API ──────────────────────────────────────────────────
  // In batches (one request must finish within the server time limit). All batches share
  // a runId; the last one carries final:true so the server closes debts that 1C no longer
  // reports — the debt query only returns clients that still owe money.
  const runId = `run_${Date.now().toString(36)}`;
  const items = [
    ...sales.map((s) => ({ kind: "sales", rec: s })),
    ...debts.map((d) => ({ kind: "debts", rec: d })),
    ...cashFlows.map((c) => ({ kind: "cashFlows", rec: c })),
  ];
  const batches = Math.max(1, Math.ceil(items.length / BATCH_SIZE));
  log(`Sending to Fabric Automation (${batches} batches, run ${runId})...`);

  const result = { salesSynced: 0, debtsSynced: 0, cashFlowsSynced: 0, cashFlowsSkipped: 0, cashFlowsRemoved: 0, clientsCreated: 0, clientsUpdated: 0, debtsClosed: 0, errors: [], durationMs: 0 };
  const cashFrom = fromDate.toISOString().slice(0, 10);
  for (let b = 0; b < batches; b++) {
    const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const payload = {
      sales: chunk.filter((i) => i.kind === "sales").map((i) => i.rec),
      debts: chunk.filter((i) => i.kind === "debts").map((i) => i.rec),
      cashFlows: chunk.filter((i) => i.kind === "cashFlows").map((i) => i.rec),
      agentVersion: AGENT_VERSION,
      runId,
      final: b === batches - 1,
      // Only when the whole ledger was read: lets the server drop rows 1C no longer has.
      ...(cashRead && b === batches - 1 ? { cashFrom } : {}),
    };
    const r = await sendSync(payload, config);
    for (const k of ["salesSynced", "debtsSynced", "cashFlowsSynced", "cashFlowsSkipped", "cashFlowsRemoved", "clientsCreated", "clientsUpdated", "debtsClosed", "durationMs"]) {
      result[k] += r[k] || 0;
    }
    if (r.errors?.length) result.errors.push(...r.errors);
    log(`  Batch ${b + 1}/${batches} ok`);
  }

  // ── Step 7: Report ───────────────────────────────────────────────────────
  log("══════════════════════════════════════════");
  log("  SYNC COMPLETE");
  log(`  Sales synced:     ${result.salesSynced}`);
  log(`  Debts synced:     ${result.debtsSynced}`);
  log(`  Cash synced:      ${result.cashFlowsSynced} (internal transfers skipped: ${result.cashFlowsSkipped}, removed: ${result.cashFlowsRemoved})`);
  log(`  Clients created:  ${result.clientsCreated}`);
  log(`  Clients updated:  ${result.clientsUpdated}`);
  log(`  Debts closed:     ${result.debtsClosed}${result.errors.length ? " (skipped: errors in run)" : ""}`);
  log(`  Duration:         ${result.durationMs}ms`);
  if (result.errors?.length) {
    warn(`  ${result.errors.length} errors:`);
    result.errors.forEach((e) => warn(`    ${e}`));
  }
  log("══════════════════════════════════════════");
}

async function main() {
  let config;
  try {
    config = getConfig();
  } catch (e) {
    err(e.message);
    err("Create a .env file from .env.example and fill in the values.");
    process.exit(1);
  }

  const isStatus = process.argv.includes("--status");

  if (isStatus) {
    try {
      await runStatusCheck(config);
    } catch (e) {
      err(e.message || String(e));
      process.exit(1);
    }
    return;
  }

  cleanupOldLogs();

  // Defaults keep this file working with an older src/config.js that has no retry settings.
  const retryCount = config.retryCount || 3;
  const retryDelayMin = config.retryDelayMin ?? 10;

  // 1C may be locked (backup, users exiting) or the network may be down in
  // the early morning — retry a few times before giving up.
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      await runSync(config);
      return;
    } catch (e) {
      err(`Attempt ${attempt}/${retryCount} failed: ${e.message || String(e)}`);
      if (e.stack) writeLog(e.stack);
      if (attempt < retryCount) {
        log(`Retrying in ${retryDelayMin} min...`);
        await sleep(retryDelayMin * 60 * 1000);
      }
    }
  }
  err("All attempts failed.");
  process.exit(1);
}

main();
