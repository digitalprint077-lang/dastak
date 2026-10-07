import fs from "node:fs";
import path from "node:path";

const outPath = path.join(process.cwd(), "functions", "_lib", "runtime-secrets.js");
const token = process.env.GITHUB_TOKEN?.trim() || "";
const adminKey =
  process.env.ADMIN_SYNC_KEY?.trim() ||
  process.env.VITE_ADMIN_PASSWORD?.trim() ||
  process.env.PUBLISH_ADMIN_PASSWORD?.trim() ||
  "";

const body = `/** Generated at build — do not edit. */
export const bakedGithubToken = ${JSON.stringify(token)};
export const bakedAdminSyncKey = ${JSON.stringify(adminKey)};
`;

fs.writeFileSync(outPath, body, "utf8");
console.log(
  `runtime-secrets: githubToken=${token ? "yes" : "no"} adminKey=${adminKey ? "yes" : "no"}`
);
