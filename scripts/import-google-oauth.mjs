#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_ORIGINS = [
  "https://hyperchat-tau.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const USAGE = `
Usage:
  npm run auth:import-google -- --file "C:\\Users\\elson\\Downloads\\client_secret_....json"
  npm run auth:import-google -- --client-id "xxxxx.apps.googleusercontent.com"

Options:
  --file <path>        Google OAuth client JSON downloaded from Google Cloud.
  --client-id <id>     Use a client ID directly instead of a JSON file.
  --local-only         Only update .env.local.
  --skip-local         Do not update .env.local.
  --skip-convex        Do not set Convex env vars.
  --skip-vercel        Do not set Vercel env vars.
  --deploy            Deploy production to Vercel after env vars are set.
  --dry-run           Print planned actions without changing anything.
`;

const args = process.argv.slice(2);

const readFlagValue = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
};

const hasFlag = (name) => args.includes(name);

const fileArg = readFlagValue("--file");
const explicitClientId = readFlagValue("--client-id");
const dryRun = hasFlag("--dry-run");
const localOnly = hasFlag("--local-only");
const skipLocal = hasFlag("--skip-local");
const skipConvex = hasFlag("--skip-convex") || localOnly;
const skipVercel = hasFlag("--skip-vercel") || localOnly;
const deploy = hasFlag("--deploy") && !localOnly;

if (!fileArg && !explicitClientId) {
  console.error(USAGE.trim());
  process.exit(1);
}

const maskClientId = (clientId) => {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return `${clientId.slice(0, 6)}...${clientId.slice(-6)}`;
  const prefix = clientId.slice(0, -suffix.length);
  return `${prefix.slice(0, 8)}...${prefix.slice(-6)}${suffix}`;
};

const assertClientId = (clientId) => {
  const value = String(clientId || "").trim();
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(value)) {
    throw new Error("Expected a Google OAuth client ID ending in .apps.googleusercontent.com");
  }
  return value;
};

const readOAuthClient = () => {
  if (explicitClientId) {
    return { clientId: assertClientId(explicitClientId), origins: [], source: "--client-id" };
  }

  const filePath = path.resolve(fileArg);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const client = parsed.web || parsed.installed || parsed;
  return {
    clientId: assertClientId(client.client_id),
    origins: Array.isArray(client.javascript_origins) ? client.javascript_origins : [],
    source: filePath,
    type: parsed.web ? "web" : parsed.installed ? "installed" : "unknown",
  };
};

const updateEnvFile = (filePath, entries) => {
  const absolute = path.resolve(filePath);
  const lines = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8").split(/\r?\n/) : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !(match[1] in entries)) return line;
    seen.add(match[1]);
    return `${match[1]}=${entries[match[1]]}`;
  });

  for (const [key, value] of Object.entries(entries)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }

  const text = `${next.filter((line, index, list) => line.length || index < list.length - 1).join("\n")}\n`;
  if (!dryRun) fs.writeFileSync(absolute, text);
};

const run = (label, command, commandArgs, input) => {
  console.log(`- ${dryRun ? "Would run" : "Running"} ${label}`);
  if (dryRun) return;

  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    input,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status !== 0) {
    throw new Error(`${label} failed${output ? `:\n${output}` : ""}`);
  }
};

const vercelHasEnv = (environment) => {
  const result = spawnSync("vercel", ["env", "ls", environment], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) return false;
  return output.includes("VITE_GOOGLE_CLIENT_ID");
};

const { clientId, origins, source, type } = readOAuthClient();
console.log(`Google OAuth client: ${maskClientId(clientId)}`);
console.log(`Source: ${source}${type ? ` (${type})` : ""}`);

if (origins.length) {
  const missing = EXPECTED_ORIGINS.filter((origin) => !origins.includes(origin));
  if (missing.length) {
    console.warn(`Warning: OAuth client JSON is missing expected JavaScript origins: ${missing.join(", ")}`);
  }
}

if (!skipLocal) {
  console.log(`- ${dryRun ? "Would update" : "Updating"} .env.local`);
  updateEnvFile(".env.local", { VITE_GOOGLE_CLIENT_ID: clientId });
}

if (!skipConvex) {
  run("Convex dev GOOGLE_CLIENT_ID", "npx", ["convex", "env", "set", "GOOGLE_CLIENT_ID", clientId]);
  run("Convex prod GOOGLE_CLIENT_ID", "npx", ["convex", "env", "set", "--prod", "GOOGLE_CLIENT_ID", clientId]);
}

if (!skipVercel) {
  for (const environment of ["production", "preview", "development"]) {
    const verb = vercelHasEnv(environment) ? "update" : "add";
    run(
      `Vercel ${environment} VITE_GOOGLE_CLIENT_ID`,
      "vercel",
      ["env", verb, "VITE_GOOGLE_CLIENT_ID", environment, "--yes"],
      `${clientId}\n`,
    );
  }
}

if (deploy) {
  run("Vercel production deploy", "vercel", ["deploy", "--prod", "--yes"]);
}

console.log("Google OAuth client import complete.");
