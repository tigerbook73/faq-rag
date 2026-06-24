/**
 * Manage webhook settings stored in app.ingest_config table.
 *
 * Usage:
 *   pnpm hook:set          Apply hook settings to local DB
 *   pnpm hook:query        Show current hook settings in local DB
 *   pnpm hook:set:prod     Apply hook settings to remote DB  (NODE_ENV=production)
 *   pnpm hook:query:prod   Query hook settings from remote DB (NODE_ENV=production)
 *
 * Env files (loaded automatically by bun):
 *   Local : .env + .env.development.local  (INGEST_HOOK_SECRET)
 *   Prod  : .env + .env.production         (INGEST_HOOK_SECRET, NEXT_PUBLIC_APP_URL)
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { cac } from "cac";

class WebhookConfig {
  private readonly target: "--local" | "--linked";
  private readonly hookUrl: string;
  private readonly hookSecret: string;

  constructor() {
    const isProd = process.env.NODE_ENV === "production";
    this.target = isProd ? "--linked" : "--local";

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    this.hookUrl = isProd ? `${appUrl}/api/ingest-hook` : "http://host.docker.internal:3000/api/ingest-hook";
    this.hookSecret = process.env.INGEST_HOOK_SECRET ?? "";
  }

  // Uses a temp file to avoid shell-escaping issues with single quotes in SQL values.
  private execQuery(sql: string): void {
    const tmp = join(tmpdir(), `supabase-hook-${Date.now()}.sql`);
    writeFileSync(tmp, sql);
    try {
      execSync(`supabase db query ${this.target} --output table -f "${tmp}"`, { stdio: "inherit" });
    } finally {
      unlinkSync(tmp);
    }
  }

  query(): void {
    const sql = "SELECT key, value FROM app.ingest_config ORDER BY key;";
    console.log(
      this.target === "--linked" ? "Querying remote database...\n" : "Current webhook settings in local database:\n",
    );
    this.execQuery(sql);
  }

  set(): void {
    if (!this.hookSecret) {
      const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development.local";
      console.error(`ERROR: INGEST_HOOK_SECRET is not set in ${envFile}`);
      process.exit(1);
    }

    const updateSql = `
      UPDATE app.ingest_config AS t SET value = v.value
      FROM (VALUES ('hook_url', '${this.hookUrl}'), ('hook_secret', '${this.hookSecret}')) AS v(key, value)
      WHERE t.key = v.key;
    `.trim();
    const querySql = "SELECT key, value FROM app.ingest_config ORDER BY key;";

    console.log(this.target === "--linked" ? "Applying to remote database...\n" : "Applying to local database...");
    this.execQuery(updateSql);
    console.log("\nVerifying...");
    this.execQuery(querySql);
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const cli = cac("bun scripts/setup-webhook");

cli.usage("<command> [options]");

cli.command("").action(() => {
  cli.outputHelp();
});

cli.command("query", "Show current hook settings in the database").action(() => new WebhookConfig().query());

cli.command("set", "Apply hook_url and hook_secret to the database").action(() => new WebhookConfig().set());

cli.help();
cli.parse();
