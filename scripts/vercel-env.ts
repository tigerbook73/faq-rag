/**
 * Manage Vercel production environment variables.
 *
 * Usage:
 *   pnpm vercel:env:pull    Pull Vercel production vars → .env.vercel, diff with .env+.env.cloud
 *   pnpm vercel:env:push    Diff then push only changed vars to Vercel production
 *   pnpm vercel:env:delete  Interactively delete a Vercel production env var
 */

import { execFileSync, spawnSync } from "child_process";
import { parse as parseEnv } from "dotenv";
import { existsSync, readFileSync } from "fs";
import * as readline from "readline";
import { cac } from "cac";

type Row = { key: string; vDisp: string; cDisp: string; status: string };

// Vercel auto-injects these at build/runtime — not user-managed
const SYSTEM_VAR = /^(VERCEL$|VERCEL_|NEXT_RUNTIME|NX_DAEMON|TURBO_)/;

class VercelEnvManager {
  private parseEnvFile(path: string): Map<string, string> {
    if (!existsSync(path)) return new Map();
    return new Map(Object.entries(parseEnv(readFileSync(path, "utf-8"))));
  }

  private parseEnvFiles(...paths: string[]): Map<string, string> {
    const merged = new Map<string, string>();
    for (const p of paths) for (const [k, v] of this.parseEnvFile(p)) merged.set(k, v);
    return merged;
  }

  private effective(map: Map<string, string>, key: string): string | undefined {
    const v = map.get(key);
    return v === undefined || v === "" ? undefined : v;
  }

  private truncate(s: string, n = 38): string {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  private padR(s: string, n: number): string {
    return s.length >= n ? s : s + " ".repeat(n - s.length);
  }

  private computeDiff(vercel: Map<string, string>, cloud: Map<string, string>): Row[] {
    const allKeys = [...new Set([...vercel.keys(), ...cloud.keys()])].sort();
    const rows: Row[] = [];
    const NOT_SET = "(not set)";

    for (const key of allKeys) {
      if (SYSTEM_VAR.test(key)) continue;
      const vVal = this.effective(vercel, key);
      const cVal = this.effective(cloud, key);
      if (vVal === undefined && cVal === undefined) continue;

      let status: string;
      if (vVal !== undefined && cVal === undefined) status = "← only Vercel";
      else if (vVal === undefined && cVal !== undefined) status = "→ not pushed";
      else if (vVal !== cVal) status = "≠  differs";
      else continue;

      rows.push({
        key,
        vDisp: vVal !== undefined ? this.truncate(vVal) : NOT_SET,
        cDisp: cVal !== undefined ? this.truncate(cVal) : NOT_SET,
        status,
      });
    }
    return rows;
  }

  private printTable(rows: Row[]): void {
    const LOCAL_HDR = ".env+cloud";
    const W_KEY = Math.min(Math.max("Key".length, ...rows.map((r) => r.key.length)), 34);
    const W_VER = Math.min(Math.max("Vercel".length, ...rows.map((r) => r.vDisp.length)), 40);
    const W_LOC = Math.min(Math.max(LOCAL_HDR.length, ...rows.map((r) => r.cDisp.length)), 40);
    const header = `${this.padR("Key", W_KEY)}  ${this.padR("Vercel", W_VER)}  ${this.padR(LOCAL_HDR, W_LOC)}  Status`;
    console.log("\n" + header);
    console.log("─".repeat(header.length));
    for (const { key, vDisp, cDisp, status } of rows) {
      console.log(`${this.padR(key, W_KEY)}  ${this.padR(vDisp, W_VER)}  ${this.padR(cDisp, W_LOC)}  ${status}`);
    }
    console.log();
  }

  private pullVercel(): void {
    execFileSync("vercel", ["env", "pull", ".env.vercel", "--environment", "production", "--yes"], {
      stdio: "inherit",
    });
  }

  pull(): void {
    console.log("Pulling production env vars from Vercel...\n");
    this.pullVercel();

    const rows = this.computeDiff(this.parseEnvFile(".env.vercel"), this.parseEnvFiles(".env", ".env.cloud"));
    if (rows.length === 0) {
      console.log("\n✓ .env + .env.cloud and Vercel production are in sync.");
    } else {
      this.printTable(rows);
    }
  }

  push(): void {
    const cloud = this.parseEnvFiles(".env", ".env.cloud");
    if (cloud.size === 0) {
      console.error("ERROR: .env and .env.cloud are both empty or not found");
      process.exit(1);
    }

    console.log("Fetching current Vercel production state...\n");
    this.pullVercel();

    const rows = this.computeDiff(this.parseEnvFile(".env.vercel"), cloud);
    const toPush = rows.filter((r) => r.status !== "← only Vercel");

    if (toPush.length === 0) {
      console.log("\n✓ Already in sync, nothing to push.");
      process.exit(0);
    }

    this.printTable(rows);
    console.log(`Pushing ${toPush.length} changed var(s) to Vercel production...\n`);

    const clean = (s: string) =>
      (s ?? "")
        .split("\n")
        .filter((l) => l.trim() && !l.includes("<claude-code-hint"))
        .join(" | ");

    let ok = 0,
      fail = 0;
    for (const { key } of toPush) {
      const value = cloud.get(key) ?? "";
      const baseArgs = ["production", "--value", value, "--no-sensitive", "--yes"];

      let result = spawnSync("vercel", ["env", "add", key, ...baseArgs], { encoding: "utf8" });

      const alreadyExists = result.status !== 0 && (result.stdout + result.stderr).includes("already exists");

      if (alreadyExists) {
        result = spawnSync("vercel", ["env", "update", key, "production", "--value", value, "--yes"], {
          encoding: "utf8",
        });
      }

      if (result.status === 0) {
        console.log(`  ✓  ${key}`);
        ok++;
      } else {
        const msg = clean(result.stderr) || clean(result.stdout) || result.error?.message || `exit ${result.status}`;
        console.error(`  ✗  ${key}: ${msg}`);
        fail++;
      }
    }

    console.log(`\nDone: ${ok} pushed, ${fail} failed.`);
    if (fail) process.exit(1);
  }

  delete(): void {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Enter the env var name to delete from Vercel production: ", (answer) => {
      rl.close();
      const key = answer.trim();
      if (!key) {
        console.error("No key entered, aborting.");
        process.exit(1);
      }
      try {
        execFileSync("vercel", ["env", "remove", key, "production", "--yes"], { stdio: "inherit" });
        console.log(`\n✓ Deleted ${key} from Vercel production.`);
      } catch {
        process.exit(1);
      }
    });
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const cli = cac("vercel-env");

cli
  .command("pull", "Pull Vercel production vars → .env.vercel, then diff with .env + .env.cloud")
  .action(() => new VercelEnvManager().pull());

cli
  .command("push", "Diff then push only changed vars to Vercel production")
  .action(() => new VercelEnvManager().push());

cli.command("delete", "Interactively delete a Vercel production env var").action(() => new VercelEnvManager().delete());

cli.help();
cli.parse();
