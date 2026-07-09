/**
 * SELXOZMASH TEXTIL — 1C Enterprise Sync Agent
 *
 * Reads sales (Реализация товаров и услуг) and receivables (счет 62)
 * from 1C and sends them to Fabric Automation cloud API.
 *
 * Usage:
 *   node index.js          — run once and exit
 *   node index.js --status — check last sync status only
 */

require("dotenv").config();

const { getConfig }                               = require("./src/config");
const { createConnection }                        = require("./src/connection");
const { querySales, queryDebtBalances, queryInvoicesForAging } = require("./src/queries");
const { transformSales, transformDebts }          = require("./src/transform");
const { sendSync, checkStatus }                   = require("./src/api");

function log(msg)  { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] WARN: ${msg}`); }
function err(msg)  { console.error(`[${new Date().toISOString()}] ERROR: ${msg}`); }

async function runStatusCheck(config) {
  log("Checking last sync status...");
  const status = await checkStatus(config);
  if (status.lastSync) {
    const s = status.lastSync;
    log(`Last sync: ${s.status} at ${s.finishedAt || s.startedAt}`);
    log(`  Sales: ${s.salesCount}  Debts: ${s.debtsCount}  New clients: ${s.clientsCreated}`);
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

  // ── Step 5: Transform ────────────────────────────────────────────────────
  log("Transforming data...");
  const sales = transformSales(rawSales);
  const debts = transformDebts(rawDebts, agingInvoices);
  log(`  Sales ready:  ${sales.length}`);
  log(`  Debts ready:  ${debts.length}`);

  if (sales.length === 0 && debts.length === 0) {
    warn("Nothing to sync. Check 1C data and date range.");
    return;
  }

  // ── Step 6: Send to API ──────────────────────────────────────────────────
  log("Sending to Fabric Automation...");
  const result = await sendSync({ sales, debts, agentVersion: "1.0.0" }, config);

  // ── Step 7: Report ───────────────────────────────────────────────────────
  log("══════════════════════════════════════════");
  log("  SYNC COMPLETE");
  log(`  Sales synced:     ${result.salesSynced}`);
  log(`  Debts synced:     ${result.debtsSynced}`);
  log(`  Clients created:  ${result.clientsCreated}`);
  log(`  Clients updated:  ${result.clientsUpdated}`);
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

  try {
    if (isStatus) {
      await runStatusCheck(config);
    } else {
      await runSync(config);
    }
  } catch (e) {
    err(e.message || String(e));
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
