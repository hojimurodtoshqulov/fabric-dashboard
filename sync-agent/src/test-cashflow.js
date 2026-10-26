/**
 * Check the cash/bank read against the real 1C. Sends nothing.
 * Run: node src/test-cashflow.js [days]      (default 30)
 *
 * Prints the account pairs found (e.g. 50 <- 62 = cash from customers), their totals and a few
 * sample entries, so the account codes and the document names can be checked by eye before
 * the first real sync.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { getConfig }          = require("./config");
const { createConnection }   = require("./connection");
const { queryCashEntries }   = require("./queries");
const { transformCashFlows } = require("./transform");

const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

async function main() {
  const days = parseInt(process.argv[2] || "30", 10);
  const config = getConfig();
  console.log("Connecting to 1C...");
  const conn = createConnection(config.oneC);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  console.log(`Reading cash/bank ledger entries of the last ${days} days...`);
  const raw = queryCashEntries(conn, fromDate);
  const rows = transformCashFlows(raw);
  console.log(`Found ${raw.length} ledger entries -> ${rows.length} document lines.\n`);

  // Debit <- credit account pairs: the server classifies by exactly these.
  const pairs = new Map();
  for (const r of rows) {
    const key = `Dt ${r.debitAccount}  <-  Kt ${r.creditAccount}`;
    const p = pairs.get(key) || { count: 0, sum: 0 };
    p.count += 1;
    p.sum += r.amount;
    pairs.set(key, p);
  }
  console.log("Account pairs (count, total):");
  [...pairs.entries()]
    .sort((a, b) => b[1].sum - a[1].sum)
    .forEach(([key, p]) => console.log(`  ${key.padEnd(34)} ${String(p.count).padStart(5)}  ${fmt(p.sum).padStart(18)}`));

  console.log("\nFirst 8 lines:");
  console.log(JSON.stringify(rows.slice(0, 8), null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
