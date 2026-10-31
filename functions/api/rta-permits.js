import { resolveAdminSyncKey } from "../_lib/env-bindings.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  if (url.searchParams.get("list") !== "1") {
    return new Response(JSON.stringify({ version: 1, items: [] }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  try {
    const { d1Configured, d1ListPermits } = await import("../_lib/d1-rta-permits.js");
    if (!d1Configured(env)) {
      return new Response(JSON.stringify({ version: 1, items: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    const db = env.Dastak_binding ?? env.DB;
    const items = await d1ListPermits(db);
    return new Response(JSON.stringify({ version: 1, items }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const expected = resolveAdminSyncKey(env) || "dastak-admin";
  if (request.headers.get("X-Admin-Sync-Key") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return new Response(null, { status: 204 });
}
