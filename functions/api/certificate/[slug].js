import { resolveAdminSyncKey } from "../../_lib/env-bindings.js";
import { normalizeBundle, loadMerged, findEntry } from "../../_lib/published-bundle.js";

function authorizeAdmin(request, env) {
  const expected = resolveAdminSyncKey(env) || "dastak-admin";
  const provided = request.headers.get("X-Admin-Sync-Key");
  return provided === expected;
}

export async function onRequestGet(context) {
  const { env, request, params } = context;
  const merged = await loadMerged(env, request);
  const entry = findEntry(merged, params.slug);
  if (!entry) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return new Response(
    JSON.stringify({
      token: entry.token,
      status: entry.payload.status || "Issued",
      values: entry.payload.values || {},
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}

export async function onRequestPut(context) {
  const { env, request, params } = context;
  if (!authorizeAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = decodeURIComponent(String(params.slug ?? "").trim());
  if (!token) {
    return new Response("Bad request", { status: 400 });
  }

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

  if (env.CERTS_KV) {
    const merged = await loadMerged(env, request);
    merged.certificates[token] = payload;
    await env.CERTS_KV.put("published", JSON.stringify(merged));
    return new Response(null, { status: 204, headers: { "X-Publish-Via": "kv" } });
  }

  try {
    const { publishCertificateToGitHub } = await import("../../_lib/publish-certificate.js");
    const result = await publishCertificateToGitHub(env, token, payload);
    if (result.ok) {
      return new Response(null, { status: 204, headers: { "X-Publish-Via": "github" } });
    }
    if (result.reason === "no-github") {
      return new Response(JSON.stringify({ error: "no_github_token" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Publish failed", { status: 502 });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}

export async function onRequestDelete(context) {
  const { env, request, params } = context;
  if (!authorizeAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const slug = decodeURIComponent(String(params.slug ?? "").trim());
  if (!slug) {
    return new Response("Bad request", { status: 400 });
  }

  if (env.CERTS_KV) {
    const merged = await loadMerged(env, request);
    const entry = findEntry(merged, slug);
    if (!entry) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    delete merged.certificates[entry.token];
    await env.CERTS_KV.put("published", JSON.stringify(merged));
    return new Response(null, { status: 204, headers: { "X-Publish-Via": "kv" } });
  }

  try {
    const { deleteCertificateFromGitHub } = await import("../../_lib/publish-certificate.js");
    const result = await deleteCertificateFromGitHub(env, slug);
    if (result.ok) {
      return new Response(null, { status: 204, headers: { "X-Publish-Via": "github" } });
    }
    if (result.reason === "not-found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (result.reason === "no-github") {
      return new Response(JSON.stringify({ error: "no_github_token" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Delete failed", { status: 502 });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}
