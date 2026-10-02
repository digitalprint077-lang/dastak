import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

function mergePublishedCertificatesPlugin() {
  return {
    name: "merge-published-certificates",
    closeBundle() {
      const root = process.cwd();
      const pubPath = path.join(root, "public", "published-certificates.json");
      const certsDir = path.join(root, "public", "certs");
      const outPath = path.join(root, "dist", "published-certificates.json");

      let certificates = {};
      if (fs.existsSync(pubPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(pubPath, "utf8"));
          certificates =
            raw.certificates && typeof raw.certificates === "object" ? { ...raw.certificates } : {};
        } catch {
          /* keep empty */
        }
      }
      if (fs.existsSync(certsDir)) {
        for (const name of fs.readdirSync(certsDir)) {
          if (!name.endsWith(".json")) continue;
          try {
            const data = JSON.parse(fs.readFileSync(path.join(certsDir, name), "utf8"));
            const token = String(data?.token ?? "").trim();
            if (!token || !data?.values) continue;
            certificates[token] = {
              status: data.status || "Issued",
              values: { ...data.values },
            };
          } catch {
            /* skip bad file */
          }
        }
      }
      const bundle = {
        version: 1,
        updatedAt: new Date().toISOString(),
        certificates,
      };
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  plugins: [mergePublishedCertificatesPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
