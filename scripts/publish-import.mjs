#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { importAdminExportFile } from "./lib/publish-files.mjs";

const root = process.cwd();
const args = process.argv.slice(2).filter((a) => a !== "--push");
const push = process.argv.includes("--push");
const exportPath = args[0];

if (!exportPath) {
  console.error("Usage: npm run publish:import -- <path-to-dastak-certificates-*.json> [--push]");
  process.exit(1);
}

const resolved = path.resolve(exportPath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const count = importAdminExportFile(root, resolved);
console.log(`Updated public/certs/ and published-certificates.json (${count} certificate(s)).`);

if (push) {
  execSync("git add public/published-certificates.json public/certs", {
    cwd: root,
    stdio: "inherit",
  });
  execSync('git commit -m "Publish certificates from admin export"', {
    cwd: root,
    stdio: "inherit",
  });
  execSync("git push origin main", { cwd: root, stdio: "inherit" });
  console.log("Pushed to origin/main — wait for Cloudflare deploy, then test QR on mobile.");
}
