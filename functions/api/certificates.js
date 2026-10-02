const KV_KEY = "published";

function emptyBundle() {
  return JSON.stringify({ version: 1, certificates: {} });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env.CERTS_KV) {
      const raw = await env.CERTS_KV.get(KV_KEY);
      if (raw) {
        return new Response(raw, {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
    }
  } catch {
    /* fall through */
  }
  return new Response(emptyBundle(), {
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
