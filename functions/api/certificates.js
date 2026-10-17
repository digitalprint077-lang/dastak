import { resolveAdminSyncKey } from "../_lib/env-bindings.js";
import {
  emptyBundle,
  normalizeBundle,
  mergeBundles,
  loadMerged,
  loadStaticPublished,
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
