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

async function loadStaticPublished(request) {
  try {
    const res = await fetch(new URL("/published-certificates.json", request.url), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return null;
    return normalizeBundle(await res.json());
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const parts = [];

  const staticBundle = await loadStaticPublished(request);
  if (staticBundle) parts.push(staticBundle);

  try {
    if (env.CERTS_KV) {
      const raw = await env.CERTS_KV.get(KV_KEY);
      if (raw) parts.push(normalizeBundle(JSON.parse(raw)));
    }
  } catch {
    /* ignore KV read errors */
  }

  const body = mergeBundles(...parts);
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const expected = env.ADMIN_SYNC_KEY || env.VITE_ADMIN_PASSWORD;
  const provided = request.headers.get("X-Admin-Sync-Key");
  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.CERTS_KV) {
    return new Response("KV not configured", { status: 503 });
  }
  const body = await request.text();
  await env.CERTS_KV.put(KV_KEY, body);
  return new Response(null, { status: 204 });
}
