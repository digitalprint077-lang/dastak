import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import { readMergedPublishedBundle, writeCertificateToPublic } from "./scripts/lib/publish-files.mjs";

function mergePublishedCertificatesPlugin() {
  return {
    name: "merge-published-certificates",
    transformIndexHtml(html) {
      const bundle = readMergedPublishedBundle();
      const json = JSON.stringify(bundle).replace(/</g, "\\u003c");
      const tag = `<script type="application/json" id="dastak-published-bootstrap">${json}</script>`;
      return html.replace("</head>", `${tag}\n</head>`);
    },
    closeBundle() {
      const outPath = path.join(process.cwd(), "dist", "published-certificates.json");
      const bundle = readMergedPublishedBundle();
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
    },
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const adminKey = env.VITE_ADMIN_PASSWORD || "dastak-admin";

      const readBody = (req) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          req.on("error", reject);
        });

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "PUT" || !req.url?.startsWith("/api/certificate/")) {
          next();
          return;
        }
        if (req.headers["x-admin-sync-key"] !== adminKey) {
          res.statusCode = 401;
          res.end("Unauthorized");
          return;
        }
        const slug = decodeURIComponent(req.url.replace(/^\/api\/certificate\//, "").split("?")[0]);
        if (!slug) {
          res.statusCode = 400;
          res.end("Bad request");
          return;
        }
        try {
          const incoming = JSON.parse(await readBody(req));
          writeCertificateToPublic(process.cwd(), slug, {
            status: incoming.status || "Issued",
            values: incoming.values || {},
          });
          res.statusCode = 204;
          res.setHeader("X-Publish-Via", "local");
          res.end();
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err?.message || err));
        }
      });
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
