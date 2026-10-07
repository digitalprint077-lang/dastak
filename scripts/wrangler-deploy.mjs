import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function syncBuildSecretsToWorker() {
  const lines = [];
  const token = process.env.GITHUB_TOKEN?.trim();
  const adminKey =
    process.env.ADMIN_SYNC_KEY?.trim() ||
    process.env.VITE_ADMIN_PASSWORD?.trim() ||
    process.env.PUBLISH_ADMIN_PASSWORD?.trim();

  if (token) lines.push(`GITHUB_TOKEN=${token}`);
  if (adminKey) lines.push(`ADMIN_SYNC_KEY=${adminKey}`);

  if (!lines.length) {
    console.warn(
      "wrangler-deploy: no GITHUB_TOKEN / ADMIN_SYNC_KEY in build env — mobile publish will stay off until Cloudflare vars are set."
    );
    return;
  }

  const tmpPath = ".cf-secrets.tmp";
  fs.writeFileSync(tmpPath, `${lines.join("\n")}\n`, "utf8");
  try {
    run("npx", ["wrangler", "secret", "bulk", tmpPath]);
  } finally {
    fs.unlinkSync(tmpPath);
  }
}

run("npm", ["run", "build"]);
syncBuildSecretsToWorker();
run("npx", ["wrangler", "deploy"]);
