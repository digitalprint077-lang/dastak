import fs from "node:fs";
import path from "node:path";

export function readMergedPublishedBundle(root = process.cwd()) {
  const pubPath = path.join(root, "public", "published-certificates.json");
  const certsDir = path.join(root, "public", "certs");
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
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    certificates,
  };
}

export function writeCertificateToPublic(root, token, payload) {
  const status = payload?.status || "Issued";
  const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
  const tracking = String(values["Tracking ID"] ?? "").trim() || token;

  const certsDir = path.join(root, "public", "certs");
  fs.mkdirSync(certsDir, { recursive: true });
  const certPath = path.join(certsDir, `${tracking}.json`);
  fs.writeFileSync(
    certPath,
    `${JSON.stringify({ token, status, values }, null, 2)}\n`,
    "utf8"
  );

  const bundle = readMergedPublishedBundle(root);
  const pubPath = path.join(root, "public", "published-certificates.json");
  fs.writeFileSync(
    pubPath,
    `${JSON.stringify({ version: 1, certificates: bundle.certificates }, null, 2)}\n`,
    "utf8"
  );
}

export function importAdminExportFile(root, exportPath) {
  const raw = JSON.parse(fs.readFileSync(exportPath, "utf8"));
  const certificates =
    raw?.certificates && typeof raw.certificates === "object" ? raw.certificates : {};
  for (const [token, entry] of Object.entries(certificates)) {
    if (!token || !entry?.values) continue;
    writeCertificateToPublic(root, token, {
      status: entry.status || "Issued",
      values: entry.values,
    });
  }
  return Object.keys(certificates).length;
}
