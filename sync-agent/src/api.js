/**
 * HTTP client for Fabric Automation API.
 * Uses Node 18+ built-in fetch.
 */

/**
 * Send sync payload to Fabric Automation.
 * @param {{ sales: Array, debts: Array }} payload
 * @param {{ fabricApiUrl: string, fabricSyncKey: string }} config
 * @returns {Promise<SyncResult>}
 */
async function sendSync(payload, config) {
  const url = `${config.fabricApiUrl}/api/1c/sync`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sync-key":   config.fabricSyncKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Unknown API error");
  return json.data;
}

/**
 * Check last sync status.
 * @param {{ fabricApiUrl: string, fabricSyncKey: string }} config
 * @returns {Promise<object>}
 */
async function checkStatus(config) {
  const url = `${config.fabricApiUrl}/api/1c/sync/status`;
  const res = await fetch(url, {
    headers: { "x-sync-key": config.fabricSyncKey },
  });
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}

module.exports = { sendSync, checkStatus };
