import { resolveAdminSyncKey } from "../_lib/env-bindings.js";
import {
  emptyBundle,
  normalizeBundle,
  mergeBundles,
  loadMerged,
  loadStaticPublished,
  loadKvBundle,
  listCertificates,
} from "../_lib/published-bundle.js";

const KV_KEY = "published";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const merged = await loadMerged(env, request);

  if (url.searchParams.get("list") === "1") {
    const body = listCertificates(merged, url.searchParams);
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const count = Object.keys(merged.certificates).length;
  return new Response(
    JSON.stringify({
      version: 1,
      updatedAt: merged.updatedAt,
      count,
      certificates: {},
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const expected = resolveAdminSyncKey(env) || "dastak-admin";
  const provided = request.headers.get("X-Admin-Sync-Key");
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.CERTS_KV) {
    return new Response("KV not configured", { status: 503 });
  }
  const incoming = normalizeBundle(JSON.parse(await request.text()));
  let existing = emptyBundle();
  try {
    const raw = await env.CERTS_KV.get(KV_KEY);
    if (raw) existing = normalizeBundle(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  const staticBundle = await loadStaticPublished(request, env.ASSETS);
  const merged = mergeBundles(staticBundle, existing, incoming);
  await env.CERTS_KV.put(KV_KEY, JSON.stringify(merged));
  return new Response(null, { status: 204 });
}

/** One-time: copy static/KV published certs into D1 (admin auth). */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.searchParams.get("migrate") !== "d1") {
    return new Response("Not Found", { status: 404 });
  }

  const expected = resolveAdminSyncKey(env) || "dastak-admin";
  const provided = request.headers.get("X-Admin-Sync-Key");
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { d1Configured, d1UpsertCertificate } = await import("../_lib/d1-certificates.js");
  if (!d1Configured(env)) {
    return new Response(JSON.stringify({ error: "no_d1" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = env.Dastak_binding ?? env.DB;
  const staticBundle = await loadStaticPublished(request, env.ASSETS);
  const kvBundle = await loadKvBundle(env);
  const merged = mergeBundles(staticBundle, kvBundle);
  let imported = 0;
  for (const [token, payload] of Object.entries(merged.certificates)) {
    await d1UpsertCertificate(db, token, payload);
    imported += 1;
  }

  return new Response(JSON.stringify({ ok: true, imported }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
