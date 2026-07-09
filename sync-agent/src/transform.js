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

module.exports = { transformSales, transformDebts };
