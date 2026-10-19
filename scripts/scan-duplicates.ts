// Same as the "Qayta solishtirish" button on /crm/clients/duplicates.
// Merges confident 1C ↔ potential duplicates, queues the rest. Usage: npx tsx scripts/scan-duplicates.ts
import { scanAllDuplicates } from "../src/services/crm/client-merge.service";

scanAllDuplicates()
  .then((r) => { console.log(r); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
