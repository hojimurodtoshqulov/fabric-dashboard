require("dotenv").config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function getConfig() {
  return {
    fabricApiUrl: required("FABRIC_API_URL").replace(/\/$/, ""),
    fabricSyncKey: required("FABRIC_SYNC_KEY"),
    syncDays: parseInt(process.env.SYNC_DAYS || "90", 10),
    oneC: {
      mode: process.env.ONEC_MODE || "file",
      filePath: process.env.ONEC_FILE_PATH || "",
      server: process.env.ONEC_SERVER || "",
      base: process.env.ONEC_BASE || "",
      user: process.env.ONEC_USER || "Admin",
      password: process.env.ONEC_PASSWORD || "",
    },
  };
}

module.exports = { getConfig };
