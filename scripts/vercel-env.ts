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

// ── env file parser ───────────────────────────────────────────────────────────
function parseEnvFile(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map();
  return new Map(Object.entries(parseEnv(readFileSync(path, "utf-8"))));
}

// Merge multiple .env files in order — later files override earlier ones.
function parseEnvFiles(...paths: string[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const p of paths) for (const [k, v] of parseEnvFile(p)) merged.set(k, v);
  return merged;
}

// ── helpers ───────────────────────────────────────────────────────────────────
// Vercel auto-injects these at build/runtime — not user-managed
const SYSTEM_VAR = /^(VERCEL$|VERCEL_|NEXT_RUNTIME|NX_DAEMON|TURBO_)/;

function isSystem(key: string): boolean {
  return SYSTEM_VAR.test(key);
}

// Treat "" and absent as equivalent when diffing
function effective(map: Map<string, string>, key: string): string | undefined {
  const v = map.get(key);
  return v === undefined || v === "" ? undefined : v;
}

function truncate(s: string, n = 38): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function padR(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// ── shared diff + table ───────────────────────────────────────────────────────
const NOT_SET = "(not set)";

type Row = { key: string; vDisp: string; cDisp: string; status: string };

function computeDiff(vercel: Map<string, string>, cloud: Map<string, string>): Row[] {
  const allKeys = [...new Set([...vercel.keys(), ...cloud.keys()])].sort();
  const rows: Row[] = [];

  for (const key of allKeys) {
    if (isSystem(key)) continue;
    const vVal = effective(vercel, key);
    const cVal = effective(cloud,  key);
    if (vVal === undefined && cVal === undefined) continue;

    let status: string;
    if      (vVal !== undefined && cVal === undefined) status = "← only Vercel";
    else if (vVal === undefined && cVal !== undefined) status = "→ not pushed";
    else if (vVal !== cVal)                            status = "≠  differs";
    else continue; // identical — skip

    rows.push({
      key,
      vDisp: vVal !== undefined ? truncate(vVal) : NOT_SET,
      cDisp: cVal !== undefined ? truncate(cVal) : NOT_SET,
      status,
    });
  }
  return rows;
}

function printTable(rows: Row[]): void {
  const LOCAL_HDR = ".env+cloud";
  const W_KEY = Math.min(Math.max("Key".length,      ...rows.map((r) => r.key.length)),   34);
  const W_VER = Math.min(Math.max("Vercel".length,   ...rows.map((r) => r.vDisp.length)), 40);
  const W_LOC = Math.min(Math.max(LOCAL_HDR.length,  ...rows.map((r) => r.cDisp.length)), 40);
  const header = `${padR("Key", W_KEY)}  ${padR("Vercel", W_VER)}  ${padR(LOCAL_HDR, W_LOC)}  Status`;
  console.log("\n" + header);
  console.log("─".repeat(header.length));
  for (const { key, vDisp, cDisp, status } of rows) {
    console.log(`${padR(key, W_KEY)}  ${padR(vDisp, W_VER)}  ${padR(cDisp, W_LOC)}  ${status}`);
  }
  console.log();
}

function pullVercel(): void {
  execFileSync(
    "vercel",
    ["env", "pull", ".env.vercel", "--environment", "production", "--yes"],
    { stdio: "inherit" },
  );
}

// ── dispatch ──────────────────────────────────────────────────────────────────
const cmd = process.argv[2];

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  console.log(`
Usage:
  pnpm vercel:env:pull    Pull Vercel production vars → .env.vercel, diff with .env+.env.cloud
  pnpm vercel:env:push    Diff then push only changed vars to Vercel production
  pnpm vercel:env:delete  Interactively delete a Vercel production env var
  `);
  process.exit(0);
}

// ── pull ──────────────────────────────────────────────────────────────────────
if (cmd === "pull") {
  console.log("Pulling production env vars from Vercel...\n");
  pullVercel();

  const rows = computeDiff(parseEnvFile(".env.vercel"), parseEnvFiles(".env", ".env.cloud"));

  if (rows.length === 0) {
    console.log("\n✓ .env + .env.cloud and Vercel production are in sync.");
  } else {
    printTable(rows);
  }
  process.exit(0);
}

// ── push ──────────────────────────────────────────────────────────────────────
if (cmd === "push") {
  const cloud = parseEnvFiles(".env", ".env.cloud");
  if (cloud.size === 0) {
    console.error("ERROR: .env and .env.cloud are both empty or not found");
    process.exit(1);
  }

  console.log("Fetching current Vercel production state...\n");
  pullVercel();

  const rows    = computeDiff(parseEnvFile(".env.vercel"), cloud);
  const toPush  = rows.filter((r) => r.status !== "← only Vercel");

  if (toPush.length === 0) {
    console.log("\n✓ Already in sync, nothing to push.");
    process.exit(0);
  }

  printTable(rows);
  console.log(`Pushing ${toPush.length} changed var(s) to Vercel production...\n`);

  const clean = (s: string) =>
    (s ?? "").split("\n").filter((l) => l.trim() && !l.includes("<claude-code-hint")).join(" | ");

  let ok = 0, fail = 0;
  for (const { key } of toPush) {
    const value = cloud.get(key) ?? "";
    const baseArgs = ["production", "--value", value, "--no-sensitive", "--yes"];

    // Try add first; if var already exists, fall back to update.
    let result = spawnSync("vercel", ["env", "add", key, ...baseArgs], { encoding: "utf8" });

    const alreadyExists =
      result.status !== 0 &&
      (result.stdout + result.stderr).includes("already exists");

    if (alreadyExists) {
      // update doesn't need --no-sensitive (var is already non-sensitive)
      result = spawnSync(
        "vercel",
        ["env", "update", key, "production", "--value", value, "--yes"],
        { encoding: "utf8" },
      );
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
  process.exit(0);
}

// ── delete ────────────────────────────────────────────────────────────────────
if (cmd === "delete") {
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
  // readline keeps the process alive until rl.close()
  process.exitCode = 0;
}
