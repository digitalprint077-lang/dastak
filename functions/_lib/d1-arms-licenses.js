/** Cloudflare D1 — live arms license store. */

export function d1Configured(env) {
  return Boolean(env?.Dastak_binding ?? env?.DB);
}

export function getD1(env) {
  return env?.Dastak_binding ?? env?.DB ?? null;
}

let tableReady = false;

export async function ensureArmsTable(db) {
  if (tableReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS arms_licenses (
         token TEXT PRIMARY KEY,
         tracking_id TEXT,
         license_no TEXT,
         status TEXT,
         values_json TEXT,
         updated_at TEXT
       )`
    )
    .run();
  tableReady = true;
}

function rowToPayload(row) {
  if (!row) return null;
  let values = {};
  try {
    values = JSON.parse(row.values_json || "{}");
  } catch {
    values = {};
  }
  return {
    token: row.token,
    status: row.status || "Issued",
    values,
    updatedAt: row.updated_at || null,
  };
}

export async function d1UpsertArmsLicense(db, token, payload) {
  await ensureArmsTable(db);
  const status = payload?.status || "Issued";
  const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
  const trackingId = String(values["Tracking ID"] ?? "").trim() || null;
  const licenseNo = String(values["License No"] ?? "").trim() || null;
  await db
    .prepare(
      `INSERT INTO arms_licenses (token, tracking_id, license_no, status, values_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(token) DO UPDATE SET
         tracking_id = excluded.tracking_id,
         license_no = excluded.license_no,
         status = excluded.status,
         values_json = excluded.values_json,
         updated_at = datetime('now')`
    )
    .bind(token, trackingId, licenseNo, status, JSON.stringify(values))
    .run();
}

export async function d1GetArmsLicense(db, slugOrToken) {
  await ensureArmsTable(db);
  const id = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!id) return null;

  let row = await db.prepare(`SELECT * FROM arms_licenses WHERE token = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db.prepare(`SELECT * FROM arms_licenses WHERE tracking_id = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db.prepare(`SELECT * FROM arms_licenses WHERE license_no = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db
    .prepare(
      `SELECT * FROM arms_licenses
       WHERE json_extract(values_json, '$.CNIC') = ?
       LIMIT 1`
    )
    .bind(id)
    .first();
  if (row) return rowToPayload(row);

  return null;
}

export async function d1DeleteArmsLicense(db, slugOrToken) {
  const entry = await d1GetArmsLicense(db, slugOrToken);
  if (!entry) return false;
  await db.prepare(`DELETE FROM arms_licenses WHERE token = ?`).bind(entry.token).run();
  return true;
}

export async function d1ListArmsLicenses(db) {
  await ensureArmsTable(db);
  const { results } = await db
    .prepare(`SELECT token, status, values_json, updated_at FROM arms_licenses ORDER BY updated_at DESC`)
    .all();
  const items = [];
  for (const row of results || []) {
    const parsed = rowToPayload(row);
    if (!parsed?.token) continue;
    items.push({
      token: parsed.token,
      status: parsed.status,
      holder: parsed.values.Name || "—",
      licenseNo: parsed.values["License No"] || "—",
      trackingId: parsed.values["Tracking ID"] || "",
      district: parsed.values.District || "",
      issueDate: parsed.values["Issue Date"] || "",
      expiryDate: parsed.values["Expiry Date"] || "",
      updatedAt: parsed.updatedAt,
    });
  }
  return items;
}