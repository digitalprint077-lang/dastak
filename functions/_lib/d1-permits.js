/** Cloudflare D1 — live route-permit store (separate from fitness certificates). */

export function d1Configured(env) {
  return Boolean(env?.Dastak_binding ?? env?.DB);
}

export function getD1(env) {
  return env?.Dastak_binding ?? env?.DB ?? null;
}

let tableReady = false;

export async function ensurePermitsTable(db) {
  if (tableReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS permits (
         token TEXT PRIMARY KEY,
         tracking_id TEXT,
         permit_no TEXT,
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

export async function d1UpsertPermit(db, token, payload) {
  await ensurePermitsTable(db);
  const status = payload?.status || "Issued";
  const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
  const trackingId = String(values["Tracking ID"] ?? "").trim() || null;
  const permitNo = String(values["Route Permit No"] ?? "").trim() || null;
  await db
    .prepare(
      `INSERT INTO permits (token, tracking_id, permit_no, status, values_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(token) DO UPDATE SET
         tracking_id = excluded.tracking_id,
         permit_no = excluded.permit_no,
         status = excluded.status,
         values_json = excluded.values_json,
         updated_at = datetime('now')`
    )
    .bind(token, trackingId, permitNo, status, JSON.stringify(values))
    .run();
}

export async function d1GetPermit(db, slugOrToken) {
  await ensurePermitsTable(db);
  const id = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!id) return null;

  let row = await db.prepare(`SELECT * FROM permits WHERE token = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db.prepare(`SELECT * FROM permits WHERE tracking_id = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db.prepare(`SELECT * FROM permits WHERE permit_no = ? LIMIT 1`).bind(id).first();
  if (row) return rowToPayload(row);

  row = await db
    .prepare(
      `SELECT * FROM permits
       WHERE json_extract(values_json, '$."Vehicle Registration No"') = ?
       LIMIT 1`
    )
    .bind(id)
    .first();
  if (row) return rowToPayload(row);

  return null;
}

export async function d1DeletePermit(db, slugOrToken) {
  const entry = await d1GetPermit(db, slugOrToken);
  if (!entry) return false;
  await db.prepare(`DELETE FROM permits WHERE token = ?`).bind(entry.token).run();
  return true;
}

export async function d1ListPermits(db) {
  await ensurePermitsTable(db);
  const { results } = await db
    .prepare(`SELECT token, status, values_json, updated_at FROM permits ORDER BY updated_at DESC`)
    .all();
  const items = [];
  for (const row of results || []) {
    const parsed = rowToPayload(row);
    if (!parsed?.token) continue;
    items.push({
      token: parsed.token,
      status: parsed.status,
      holder: parsed.values["Permit Holder"] || "—",
      permitNo: parsed.values["Route Permit No"] || "—",
      registration: parsed.values["Vehicle Registration No"] || "—",
      trackingId: parsed.values["Tracking ID"] || "",
      district: parsed.values.District || "",
      issueDate: parsed.values["Issue Date"] || "",
      expiryDate: parsed.values["Expiry Date"] || "",
      updatedAt: parsed.updatedAt,
    });
  }
  return items;
}
