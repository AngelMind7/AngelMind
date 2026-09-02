#!/usr/bin/env node
import { AngelMindRestV1Client } from "../api/rest-v1-client";

function usage(): never {
  console.error("Usage: npm run api:cli -- <health|search|ai-runs> [arguments]");
  console.error("  search <workspaceId> <query> [limit]");
  console.error("  ai-runs <workspaceId>");
  process.exit(2);
}

async function main() {
  const baseUrl = process.env.ANGELMIND_BASE_URL;
  const apiKey = process.env.ANGELMIND_API_KEY;
  if (!baseUrl) throw new Error("ANGELMIND_BASE_URL wajib diisi.");
  if (!apiKey) throw new Error("ANGELMIND_API_KEY wajib diisi untuk endpoint terautentikasi.");

  const client = new AngelMindRestV1Client({ baseUrl, apiKey });
  const [command, first, second, third] = process.argv.slice(2);

  if (command === "health") {
    console.log(JSON.stringify(await client.health(), null, 2));
  } else if (command === "search" && first && second) {
    const workspaceId = Number(first);
    if (!Number.isSafeInteger(workspaceId) || workspaceId < 1) usage();
    const result = await client.search(workspaceId, { query: second, limit: third ? Number(third) : undefined });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "ai-runs" && first) {
    const workspaceId = Number(first);
    if (!Number.isSafeInteger(workspaceId) || workspaceId < 1) usage();
    console.log(JSON.stringify(await client.listAiRuns(workspaceId), null, 2));
  } else {
    usage();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "REST request failed.");
  process.exitCode = 1;
});
