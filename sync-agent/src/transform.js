/**
 * Transform raw 1C data into the Fabric Automation API payload format.
 */

/**
 * Transform raw sales records from 1C.
 * @param {Array} rawSales - from querySales()
 * @returns {Array<SaleRecord>}
 */
function transformSales(rawSales) {
  return rawSales
    .filter((s) => s.number && s.clientName && s.amount > 0)
    .map((s) => ({
      date:       s.date,
      number:     s.number,
      amount:     s.amount,
      clientName: s.clientName,
      inn:        s.inn || "",
      phone:      s.phone || undefined,
      contract:   s.contract || "",
      comment:    s.comment || "",
    }));
}

/**
 * Transform debt balances + invoices into DebtRecord[].
 * Attaches per-client invoice list for aging calculation on the server.
 *
 * @param {Array} rawDebts   - from queryDebtBalances()
 * @param {Array} rawInvoices - from queryInvoicesForAging()
 * @returns {Array<DebtRecord>}
 */
function transformDebts(rawDebts, rawInvoices) {
  // Group invoices by client INN
  const invoicesByInn = {};
  for (const inv of rawInvoices) {
    if (!inv.inn) continue;
    if (!invoicesByInn[inv.inn]) invoicesByInn[inv.inn] = [];
    invoicesByInn[inv.inn].push({
      date:   inv.date,
      number: inv.number,
      amount: inv.amount,
    });
  }

  return rawDebts
    .filter((d) => d.clientName && d.totalDebt > 0)
    .map((d) => ({
      clientName: d.clientName,
      inn:        d.inn || "",
      phone:      d.phone || undefined,
      region:     d.region || undefined,
      totalDebt:  d.totalDebt,
      invoices:   invoicesByInn[d.inn] || [],
    }));
}

/**
 * Group ledger entries into one record per document line, summing the amounts.
 *
 * The key has to match cashFlowKey() on the server (src/lib/sync/cashflow.ts): the server
 * upserts by it, so a line split over two batches would overwrite itself. Grouping the whole
 * run here, before it is cut into batches, keeps every key in exactly one batch.
 *
 * @param {Array} rawEntries - from queryCashEntries()
 * @returns {Array<CashFlowRecord>}
 */
function transformCashFlows(rawEntries) {
  const code = (a) => String(a || "").replace(/\./g, "").trim();
  const side = (inn, name) => String(inn || "").trim() || String(name || "").trim();

  const groups = new Map();
  for (const e of rawEntries) {
    if (!e.docRef || !(e.amount > 0)) continue;
    const key = [
      e.docRef.trim(), code(e.debitAccount), code(e.creditAccount),
      side(e.debitInn, e.debitName), side(e.creditInn, e.creditName),
    ].join("|");
    const g = groups.get(key);
    if (g) {
      g.amount += e.amount;
    } else {
      groups.set(key, {
        date:          e.date,
        docRef:        e.docRef,
        debitAccount:  e.debitAccount,
        creditAccount: e.creditAccount,
        amount:        e.amount,
        debitName:     e.debitName  || undefined,
        debitInn:      e.debitInn   || undefined,
        creditName:    e.creditName || undefined,
        creditInn:     e.creditInn  || undefined,
        purpose:       e.purpose    || undefined,
      });
    }
  }
  return [...groups.values()].map((g) => ({ ...g, amount: Math.round(g.amount * 100) / 100 }));
}

module.exports = { transformSales, transformDebts, transformCashFlows };
