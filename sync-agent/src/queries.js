/**
 * 1C Query Language queries for SELXOZMASH TEXTIL.
 * Configuration: Бухгалтерия предприятия для Узбекистана, редакция 1.2
 *
 * All queries use Latin aliases (КАК LatinName) to avoid Cyrillic property
 * access issues in JavaScript/winax.
 */

const { toJSDate, setDateParam, executeQuery } = require("./connection");

// ─── Sales (Реализация товаров и услуг) ──────────────────────────────────────

const SALES_QUERY = `
ВЫБРАТЬ
    РТУ.Дата                        КАК SaleDate,
    РТУ.Номер                       КАК SaleNumber,
    РТУ.СуммаДокумента              КАК SaleAmount,
    РТУ.Контрагент.Наименование     КАК ClientName,
    РТУ.Контрагент.ИНН              КАК ClientINN,
    РТУ.Контрагент.Телефон          КАК ClientPhone,
    ПРЕДСТАВЛЕНИЕ(РТУ.Договор)      КАК ContractName,
    РТУ.Комментарий                 КАК Comment
ИЗ
    Документ.РеализацияТоваровУслуг КАК РТУ
ГДЕ
    РТУ.Дата      >= &StartDate
    И РТУ.Проведен = ИСТИНА
УПОРЯДОЧИТЬ ПО
    РТУ.Дата УБЫВ
`;

/**
 * Query all posted sales invoices starting from fromDate.
 * @param {object} conn - 1C COM connection
 * @param {Date} fromDate
 * @returns {Array<{ date, number, amount, clientName, inn, phone, contract, comment }>}
 */
function querySales(conn, fromDate) {
  return executeQuery(
    conn,
    SALES_QUERY,
    (sel) => {
      const date = toJSDate(sel.SaleDate);
      if (!date) return null;
      return {
        date:       date.toISOString().slice(0, 10),
        number:     String(sel.SaleNumber   || "").trim(),
        amount:     Number(sel.SaleAmount   || 0),
        clientName: String(sel.ClientName   || "").trim(),
        inn:        String(sel.ClientINN    || "").trim(),
        phone:      String(sel.ClientPhone  || "").trim(),
        contract:   String(sel.ContractName || "").trim(),
        comment:    String(sel.Comment      || "").trim(),
      };
    },
    (conn, query) => setDateParam(conn, query, "StartDate", fromDate)
  );
}

// ─── Debt balances — Account 62 (Расчеты с покупателями) ─────────────────────

const DEBT_BALANCE_QUERY = `
ВЫБРАТЬ
    Ост.Субконто1.Наименование  КАК ClientName,
    Ост.Субконто1.ИНН           КАК ClientINN,
    Ост.Субконто1.Телефон       КАК ClientPhone,
    Ост.Субконто1.Комментарий   КАК ClientRegion,
    Ост.СуммаОстатокДт          КАК TotalDebt
ИЗ
    РегистрБухгалтерии.Хозрасчетный.Остатки(
        &AsOfDate,
        Счет В ИЕРАРХИИ ЗНАЧЕНИЕ(ПланСчетов.Хозрасчетный.62),
        ,
    ) КАК Ост
ГДЕ
    Ост.СуммаОстатокДт > 0
УПОРЯДОЧИТЬ ПО
    Ост.СуммаОстатокДт УБЫВ
`;

/**
 * Query account 62 (Receivables) balance per counterparty.
 * Returns total debt as of today.
 * @param {object} conn
 * @returns {Array<{ clientName, inn, phone, region, totalDebt }>}
 */
function queryDebtBalances(conn) {
  const today = new Date();
  return executeQuery(
    conn,
    DEBT_BALANCE_QUERY,
    (sel) => {
      const debt = Number(sel.TotalDebt || 0);
      if (debt <= 0) return null;
      return {
        clientName: String(sel.ClientName   || "").trim(),
        inn:        String(sel.ClientINN    || "").trim(),
        phone:      String(sel.ClientPhone  || "").trim(),
        region:     String(sel.ClientRegion || "").trim(),
        totalDebt:  debt,
      };
    },
    (conn, query) => setDateParam(conn, query, "AsOfDate", today)
  );
}

// ─── Invoices for aging calculation ──────────────────────────────────────────

const AGING_INVOICES_QUERY = `
ВЫБРАТЬ
    РТУ.Контрагент.ИНН  КАК ClientINN,
    РТУ.Дата             КАК InvoiceDate,
    РТУ.Номер            КАК InvoiceNumber,
    РТУ.СуммаДокумента   КАК InvoiceAmount
ИЗ
    Документ.РеализацияТоваровУслуг КАК РТУ
ГДЕ
    РТУ.Проведен = ИСТИНА
    И РТУ.Дата >= &StartDate
УПОРЯДОЧИТЬ ПО
    РТУ.Контрагент.ИНН,
    РТУ.Дата
`;

/**
 * Query all posted invoices per client (used to calculate aging distribution).
 * @param {object} conn
 * @param {Date} fromDate - how far back to look (e.g. 365 days)
 * @returns {Array<{ inn, date, number, amount }>}
 */
function queryInvoicesForAging(conn, fromDate) {
  // Look back up to 365 days for aging
  const agingStart = new Date(Math.min(
    fromDate.getTime(),
    Date.now() - 365 * 86_400_000
  ));

  return executeQuery(
    conn,
    AGING_INVOICES_QUERY,
    (sel) => {
      const date = toJSDate(sel.InvoiceDate);
      if (!date) return null;
      return {
        inn:    String(sel.ClientINN      || "").trim(),
        date:   date.toISOString().slice(0, 10),
        number: String(sel.InvoiceNumber  || "").trim(),
        amount: Number(sel.InvoiceAmount  || 0),
      };
    },
    (conn, query) => setDateParam(conn, query, "StartDate", agingStart)
  );
}

module.exports = { querySales, queryDebtBalances, queryInvoicesForAging };
