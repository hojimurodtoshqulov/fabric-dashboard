/**
 * 1C Enterprise COM connection via winax (Windows only).
 * Requires 1C Enterprise client installed on the same PC.
 */

let winax;
try {
  winax = require("winax");
} catch {
  winax = null;
}

/**
 * Connect to 1C infobase.
 * @param {{ mode: string, filePath: string, server: string, base: string, user: string, password: string }} cfg
 * @returns {object} 1C COM connection object
 */
function createConnection(cfg) {
  if (!winax) {
    throw new Error(
      "winax module not found. Run: npm install  (requires Windows + 1C Enterprise installed)"
    );
  }

  let connString;
  if (cfg.mode === "server") {
    if (!cfg.server || !cfg.base) throw new Error("ONEC_SERVER and ONEC_BASE required for server mode");
    connString = `Srvr="${cfg.server}";Ref="${cfg.base}";Usr="${cfg.user}";Pwd="${cfg.password}"`;
  } else {
    if (!cfg.filePath) throw new Error("ONEC_FILE_PATH required for file mode");
    connString = `File="${cfg.filePath}";Usr="${cfg.user}";Pwd="${cfg.password}"`;
  }

  console.log(`[1C] Connecting (mode=${cfg.mode})...`);
  const connector = new winax.Object("V83.COMConnector");
  const conn = connector.Connect(connString);
  console.log("[1C] Connected successfully");
  return conn;
}

/**
 * Convert a 1C COM date value to JavaScript Date.
 * winax may return a Date, a number (OLE Automation date), or a string.
 */
function toJSDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // OLE Automation Date: days since December 30, 1899
    const OA_EPOCH = new Date(1899, 11, 30).getTime();
    return new Date(OA_EPOCH + val * 86_400_000);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Set a date parameter on a 1C query.
 * @param {object} conn - 1C COM connection
 * @param {object} query - 1C Query object
 * @param {string} paramName - parameter name in 1C Query Language
 * @param {Date} date - JavaScript date
 */
function setDateParam(conn, query, paramName, date) {
  const d1c = conn.NewObject(
    "DateTime",
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    0, 0, 0
  );
  query.SetParameter(paramName, d1c);
}

/**
 * Execute a 1C Query Language query and iterate results.
 * Field names are accessed by the Latin aliases defined in the query.
 *
 * @param {object} conn - 1C COM connection
 * @param {string} queryText - query text with Latin aliases (e.g. КАК ClientName)
 * @param {Function} rowMapper - (selection) => object | null
 * @param {Function} [setParams] - (conn, query) => void  (optional)
 * @returns {Array}
 */
function executeQuery(conn, queryText, rowMapper, setParams) {
  const query = conn.NewObject("Query");
  query.Text = queryText;
  if (setParams) setParams(conn, query);

  const result = query.Execute();
  const selection = result.Choose();

  const rows = [];
  while (selection.Next()) {
    try {
      const row = rowMapper(selection);
      if (row) rows.push(row);
    } catch (e) {
      console.warn("[1C] Row mapping error:", e.message);
    }
  }
  return rows;
}

module.exports = { createConnection, toJSDate, setDateParam, executeQuery };
