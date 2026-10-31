import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import { readMergedPublishedBundle, writeCertificateToPublic } from "./scripts/lib/publish-files.mjs";

function mergePublishedCertificatesPlugin() {
  return {
    name: "merge-published-certificates",
    transformIndexHtml(html) {
      const bundle = readMergedPublishedBundle();
      const lite = {
        version: 1,
        updatedAt: bundle.updatedAt,
        count: Object.keys(bundle.certificates || {}).length,
        certificates: {},
      };
      const json = JSON.stringify(lite).replace(/</g, "\\u003c");
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

      const localPermits = new Map();
      const localRtaPermits = new Map();

      const permitListPayload = (store) =>
        [...store.values()].map((row) => ({
          token: row.token,
          status: row.status,
          holder: row.values?.["Permit Holder"] || "—",
          permitNo: row.values?.["Route Permit No"] || "—",
          registration: row.values?.["Vehicle Registration No"] || "—",
          trackingId: row.values?.["Tracking ID"] || "",
          district: row.values?.District || "",
          issueDate: row.values?.["Issue Date"] || "",
          expiryDate: row.values?.["Expiry Date"] || "",
          updatedAt: new Date().toISOString(),
        }));

      const findStoredPermit = (store, slug) =>
        store.get(slug) ||
        [...store.values()].find(
          (row) =>
            row.values?.["Tracking ID"] === slug ||
            row.values?.["Route Permit No"] === slug ||
            row.values?.["Vehicle Registration No"] === slug
        );

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        if (url === "/api/permits" && req.method === "GET") {
          const items = [...localPermits.values()].map((row) => ({
            token: row.token,
            status: row.status,
            holder: row.values?.["Permit Holder"] || "—",
            permitNo: row.values?.["Route Permit No"] || "—",
            registration: row.values?.["Vehicle Registration No"] || "—",
            trackingId: row.values?.["Tracking ID"] || "",
            district: row.values?.District || "",
            issueDate: row.values?.["Issue Date"] || "",
            expiryDate: row.values?.["Expiry Date"] || "",
            updatedAt: new Date().toISOString(),
          }));
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version: 1, items }));
          return;
        }
        if (url.startsWith("/api/permit/")) {
          const slug = decodeURIComponent(url.replace(/^\/api\/permit\//, "").split("?")[0]);
          if (req.method === "GET") {
            const hit =
              localPermits.get(slug) ||
              [...localPermits.values()].find(
                (row) =>
                  row.values?.["Tracking ID"] === slug ||
                  row.values?.["Route Permit No"] === slug ||
                  row.values?.["Vehicle Registration No"] === slug
              );
            if (!hit) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "not_found" }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(hit));
            return;
          }
          if (req.method === "PUT") {
            if (req.headers["x-admin-sync-key"] !== adminKey) {
              res.statusCode = 401;
              res.end("Unauthorized");
              return;
            }
            try {
              const incoming = JSON.parse(await readBody(req));
              localPermits.set(slug, {
                token: slug,
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
            return;
          }
          if (req.method === "DELETE") {
            localPermits.delete(slug);
            res.statusCode = 204;
            res.end();
            return;
          }
        }
        if (url === "/api/rta-permits" && req.method === "GET") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version: 1, items: permitListPayload(localRtaPermits) }));
          return;
        }
        if (url.startsWith("/api/rta-permit/")) {
          const slug = decodeURIComponent(url.replace(/^\/api\/rta-permit\//, "").split("?")[0]);
          if (req.method === "GET") {
            const hit = findStoredPermit(localRtaPermits, slug);
            if (!hit) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "not_found" }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(hit));
            return;
          }
          if (req.method === "PUT") {
            if (req.headers["x-admin-sync-key"] !== adminKey) {
              res.statusCode = 401;
              res.end("Unauthorized");
              return;
            }
            try {
              const incoming = JSON.parse(await readBody(req));
              localRtaPermits.set(slug, {
                token: slug,
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
            return;
          }
          if (req.method === "DELETE") {
            localRtaPermits.delete(slug);
            res.statusCode = 204;
            res.end();
            return;
          }
        }
        next();
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
