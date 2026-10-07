const KV_KEY = "published";

function emptyBundle() {
  return { version: 1, certificates: {} };
}

function normalizeBundle(raw) {
  if (!raw || typeof raw !== "object") return emptyBundle();
  const certificates =
    raw.certificates && typeof raw.certificates === "object" ? raw.certificates : {};
  return { version: 1, certificates };
}

function mergeBundles(...bundles) {
  const merged = emptyBundle();
  for (const bundle of bundles) {
    const normalized = normalizeBundle(bundle);
    merged.certificates = { ...merged.certificates, ...normalized.certificates };
  }
  return merged;
}

async function loadStaticPublished(request, assets) {
  try {
    const url = new URL("/published-certificates.json", request.url);
    const req = new Request(url, { headers: { Accept: "application/json" } });
    const res = assets ? await assets.fetch(req) : await fetch(req);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return null;
    return normalizeBundle(await res.json());
  } catch {
    return null;
  }
}

async function loadKvBundle(env) {
  if (!env.CERTS_KV) return null;
  try {
    const raw = await env.CERTS_KV.get(KV_KEY);
    if (!raw) return null;
    return normalizeBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}

function findEntry(bundle, slug) {
  const id = decodeURIComponent(String(slug ?? "").trim());
  if (!id) return null;
  if (bundle.certificates[id]) {
    return { token: id, payload: bundle.certificates[id] };
  }
  for (const [token, payload] of Object.entries(bundle.certificates)) {
    const tracking = String(payload?.values?.["Tracking ID"] ?? "").trim();
    const certNo = String(payload?.values?.["Certificate Number"] ?? "").trim();
    if (tracking === id || certNo === id) {
      return { token, payload };
    }
  }
  return null;
}

async function loadMerged(env, request) {
  const parts = [];
  const staticBundle = await loadStaticPublished(request, env.ASSETS);
  if (staticBundle) parts.push(staticBundle);
  const kvBundle = await loadKvBundle(env);
  if (kvBundle) parts.push(kvBundle);
  return mergeBundles(...parts);
}

function authorizePut(request, env) {
  const expected = env.ADMIN_SYNC_KEY || env.VITE_ADMIN_PASSWORD || "dastak-admin";
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
  if (!authorizePut(request, env)) {
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
    await env.CERTS_KV.put(KV_KEY, JSON.stringify(merged));
    return new Response(null, { status: 204, headers: { "X-Publish-Via": "kv" } });
  }

  try {
    const { publishCertificateToGitHub } = await import("../../_lib/publish-certificate.js");
    const result = await publishCertificateToGitHub(env, token, payload);
    if (result.ok) {
      return new Response(null, { status: 204, headers: { "X-Publish-Via": "github" } });
    }
    if (result.reason === "no-github") {
      return new Response("Publish not configured", { status: 503 });
    }
    return new Response("Publish failed", { status: 502 });
  } catch (err) {
    return new Response(String(err?.message || err), { status: 502 });
  }
}
