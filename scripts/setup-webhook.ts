/**
 * Manage webhook settings stored in app.ingest_config table.
 * No superuser required — works with the postgres role in both local and cloud.
 *
 * Usage:
 *   tsx scripts/setup-webhook.ts --update           Apply hook settings to local DB
 *   tsx scripts/setup-webhook.ts --query            Show current hook settings in local DB
 *   tsx scripts/setup-webhook.ts --prod --update    Apply hook settings to remote DB via supabase db psql
 *   tsx scripts/setup-webhook.ts --prod --query     Query hook settings from remote DB via supabase db psql
 *
 * Env files:
 *   Local : .env + .env.development.local  (INGEST_HOOK_SECRET)
 *   Prod  : .env + .env.cloud             (INGEST_HOOK_SECRET, NEXT_PUBLIC_APP_URL)
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { config } from "dotenv";

const isProd   = process.argv.includes("--prod");
const isUpdate = process.argv.includes("--update");
const isQuery  = process.argv.includes("--query");
const isHelp   = process.argv.includes("--help");

// ── help ──────────────────────────────────────────────────────────────────────
if (isHelp || (!isUpdate && !isQuery)) {
  console.log(`
Usage:
  pnpm hook:set          Apply hook settings to local DB
  pnpm hook:query        Show current hook settings in local DB
  pnpm hook:prod:set     Apply hook settings to remote DB (via supabase db psql)
  pnpm hook:prod:query   Query hook settings from remote DB (via supabase db psql)

Flags:
  --update   Apply / set the config values
  --query    Show current config values
  --prod     Production mode: read .env.cloud, execute via supabase db psql
  --help     Show this help
  `);
  process.exit(0);
}

// ── load env ──────────────────────────────────────────────────────────────────
config({ path: ".env", override: false });
config({ path: isProd ? ".env.cloud" : ".env.development.local", override: true });

// ── local docker helper ───────────────────────────────────────────────────────
const CONTAINER = "supabase_db_faq-rag";
// TCP from 127.0.0.1 inside container uses trust auth — no password needed.
function execLocal(sql: string) {
  execSync(
    `docker exec ${CONTAINER} psql "host=127.0.0.1 user=postgres dbname=postgres" -c "${sql.replace(/"/g, '\\"')}"`,
    { stdio: "inherit" },
  );
}

// ── remote helper ─────────────────────────────────────────────────────────────
// Executes SQL against the linked Supabase project via `supabase db query --linked`.
// Uses a temp file to avoid shell-escaping issues with single quotes in SQL values.
// Requires: supabase CLI installed + project linked (`supabase link`).
function execRemote(sql: string) {
  const tmp = join(tmpdir(), `supabase-hook-${Date.now()}.sql`);
  writeFileSync(tmp, sql);
  try {
    execSync(`supabase db query --linked --output table -f "${tmp}"`, { stdio: "inherit" });
  } finally {
    unlinkSync(tmp);
  }
}

// ── SQL templates ─────────────────────────────────────────────────────────────
const appUrl     = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const hookUrl    = isProd
  ? `${appUrl}/api/ingest-hook`
  : "http://host.docker.internal:3000/api/ingest-hook";
const hookSecret = process.env.INGEST_HOOK_SECRET ?? "";

const UPDATE_SQL = [
  `UPDATE app.ingest_config SET value = '${hookUrl}'    WHERE key = 'hook_url';`,
  `UPDATE app.ingest_config SET value = '${hookSecret}' WHERE key = 'hook_secret';`,
].join("\n");

const QUERY_SQL =
  "SELECT key, value FROM app.ingest_config ORDER BY key;";

// ── execute ───────────────────────────────────────────────────────────────────
if (isQuery) {
  if (isProd) {
    console.log("Querying remote database...\n");
    execRemote(QUERY_SQL);
  } else {
    console.log("Current webhook settings in local database:\n");
    execLocal(QUERY_SQL);
  }
}

if (isUpdate) {
  if (!hookSecret) {
    console.error(`ERROR: INGEST_HOOK_SECRET is not set in ${isProd ? ".env.cloud" : ".env.development.local"}`);
    process.exit(1);
  }

  if (isProd) {
    console.log("Applying to remote database...\n");
    execRemote(UPDATE_SQL);
    console.log("\nVerifying...");
    execRemote(QUERY_SQL);
  } else {
    console.log(`Applying to local database (${CONTAINER})...`);
    execLocal(UPDATE_SQL);
    console.log("\nVerifying...");
    execLocal(QUERY_SQL);
  }
}
