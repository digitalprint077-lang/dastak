import { resolveAdminSyncKey } from "../../_lib/env-bindings.js";

function authorizeAdmin(request, env) {
  const expected = resolveAdminSyncKey(env) || "dastak-admin";
  const provided = request.headers.get("X-Admin-Sync-Key");
  return provided === expected;
}

async function loadPermit(env, slug) {
  const { d1Configured, d1GetPermit } = await import("../../_lib/d1-permits.js");
  if (!d1Configured(env)) return null;
  const db = env.Dastak_binding ?? env.DB;
  return d1GetPermit(db, slug);
}

export async function onRequestGet(context) {
  const { env, params } = context;
  try {
    const entry = await loadPermit(env, params.slug);
    if (!entry) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    return new Response(
      JSON.stringify({
        token: entry.token,
        status: entry.status || "Issued",
        values: entry.values || {},
      }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}

export async function onRequestPut(context) {
  const { env, request, params } = context;
  if (!authorizeAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const token = decodeURIComponent(String(params.slug ?? "").trim());
  if (!token) return new Response("Bad request", { status: 400 });

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const payload = {
    status: incoming.status || "Issued",
    values: incoming.values && typeof incoming.values === "object" ? incoming.values : {},
  };

  try {
    const { d1Configured, d1UpsertPermit } = await import("../../_lib/d1-permits.js");
    if (d1Configured(env)) {
      const db = env.Dastak_binding ?? env.DB;
      await d1UpsertPermit(db, token, payload);
      return new Response(null, { status: 204, headers: { "X-Publish-Via": "d1" } });
    }
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }

  return new Response(JSON.stringify({ error: "no_d1" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestDelete(context) {
  const { env, request, params } = context;
  if (!authorizeAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { d1Configured, d1DeletePermit } = await import("../../_lib/d1-permits.js");
    if (d1Configured(env)) {
      const db = env.Dastak_binding ?? env.DB;
      await d1DeletePermit(db, params.slug);
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}
