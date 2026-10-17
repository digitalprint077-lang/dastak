/** Cloudflare D1 — live certificate store (instant save, no redeploy). */

export function d1Configured(env) {
  return Boolean(getD1(env));
}

export function getD1(env) {
  return env?.Dastak_binding ?? env?.DB ?? null;
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
  };
}

export async function d1UpsertCertificate(db, token, payload) {
  const status = payload?.status || "Issued";
  const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
  const trackingId = String(values["Tracking ID"] ?? "").trim() || null;
  const valuesJson = JSON.stringify(values);
  await db
    .prepare(
      `INSERT INTO certificates (token, tracking_id, status, values_json, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(token) DO UPDATE SET
         tracking_id = excluded.tracking_id,
         status = excluded.status,
         values_json = excluded.values_json,
         updated_at = datetime('now')`
    )
    .bind(token, trackingId, status, valuesJson)
    .run();
}

export async function d1GetCertificate(db, slugOrToken) {
  const id = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!id) return null;

  let row = await db
    .prepare(`SELECT token, status, values_json FROM certificates WHERE token = ? LIMIT 1`)
    .bind(id)
    .first();
  if (row) return rowToPayload(row);

  row = await db
    .prepare(`SELECT token, status, values_json FROM certificates WHERE tracking_id = ? LIMIT 1`)
    .bind(id)
    .first();
  if (row) return rowToPayload(row);

  row = await db
    .prepare(
      `SELECT token, status, values_json FROM certificates
       WHERE json_extract(values_json, '$."Certificate Number"') = ?
       LIMIT 1`
    )
    .bind(id)
    .first();
  if (row) return rowToPayload(row);

  return null;
}

export async function d1DeleteCertificate(db, slugOrToken) {
  const entry = await d1GetCertificate(db, slugOrToken);
  if (!entry) return false;
  await db.prepare(`DELETE FROM certificates WHERE token = ?`).bind(entry.token).run();
  return true;
}

export async function d1LoadBundle(db) {
  const { results } = await db
    .prepare(`SELECT token, status, values_json, updated_at FROM certificates ORDER BY updated_at DESC`)
    .all();
  const certificates = {};
  let updatedAt = null;
  for (const row of results || []) {
    const parsed = rowToPayload(row);
    if (!parsed?.token) continue;
    certificates[parsed.token] = {
      status: parsed.status,
      values: parsed.values,
    };
    if (row.updated_at && (!updatedAt || row.updated_at > updatedAt)) {
      updatedAt = row.updated_at;
    }
  }
  return {
    version: 1,
    updatedAt: updatedAt || new Date().toISOString(),
    certificates,
  };
}

export async function d1Count(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM certificates`).first();
  return Number(row?.n ?? 0);
}
