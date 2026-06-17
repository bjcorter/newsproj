import "dotenv/config";
import { ingestAllSources } from "../web/src/services/rss-ingest";

async function main() {
  const result = await ingestAllSources();
  console.log(result);
}

main().catch(console.error);
