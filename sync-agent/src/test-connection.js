/**
 * Quick test: connect to 1C and print the first 3 sales invoices.
 * Run: node src/test-connection.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { getConfig }      = require("./config");
const { createConnection } = require("./connection");
const { querySales }     = require("./queries");

async function main() {
  const config = getConfig();
  console.log("Connecting to 1C...");
  const conn = createConnection(config.oneC);
  console.log("Connected!");

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  console.log("Querying last 30 days of sales...");
  const sales = querySales(conn, fromDate);
  console.log(`Found ${sales.length} invoices. First 3:`);
  console.log(JSON.stringify(sales.slice(0, 3), null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
