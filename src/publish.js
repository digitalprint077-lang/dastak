const OVERLAY_KEY = "dastak:published-overlay";

let remotePublished = null;

function normalizeBundle(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, certificates: {} };
  const certificates = raw.certificates && typeof raw.certificates === "object" ? raw.certificates : {};
  return { version: 1, certificates };
}

export function getPublishedOverlay() {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    return raw ? normalizeBundle(JSON.parse(raw)) : { version: 1, certificates: {} };
  } catch {
    return { version: 1, certificates: {} };
  }
}

function setPublishedOverlay(bundle) {
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(normalizeBundle(bundle)));
}

export function getMergedPublishedMap() {
  const remote = normalizeBundle(remotePublished);
  const overlay = getPublishedOverlay();
  return { ...remote.certificates, ...overlay.certificates };
}

export function findPublishedEntry(slugOrToken) {
  const needle = String(slugOrToken ?? "").trim();
  if (!needle) return null;
  const map = getMergedPublishedMap();
  if (map[needle]) return { token: needle, payload: map[needle] };
  for (const [token, payload] of Object.entries(map)) {
    const tracking = String(payload?.values?.["Tracking ID"] ?? "").trim();
    const certNo = String(payload?.values?.["Certificate Number"] ?? "").trim();
    if (tracking === needle || certNo === needle) {
      return { token, payload };
    }
  }
  return null;
}

export async function loadPublishedCertificates() {
  const tryFetchJson = async (url) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("text/html")) return null;
      return normalizeBundle(await res.json());
    } catch {
      return null;
    }
  };

  const [fromApi, fromStatic] = await Promise.all([
    tryFetchJson("/api/certificates"),
    tryFetchJson("/published-certificates.json"),
  ]);
  const merged = normalizeBundle(fromStatic);
  const api = normalizeBundle(fromApi);
  merged.certificates = { ...merged.certificates, ...api.certificates };
  remotePublished =
    Object.keys(merged.certificates).length > 0 ? merged : fromStatic || fromApi || null;
}

export function buildPublishedBundle(collectEntries) {
  const certificates = {};
  for (const { token, payload } of collectEntries()) {
    if (!token || !payload?.values) continue;
    certificates[token] = {
      status: payload.status || "Issued",
      values: { ...payload.values },
    };
  }
  return { version: 1, updatedAt: new Date().toISOString(), certificates };
}

export async function syncPublishedCertificates(bundle) {
  const normalized = normalizeBundle(bundle);
  setPublishedOverlay(normalized);
  remotePublished = normalized;

  const syncKey = import.meta.env.VITE_ADMIN_PASSWORD;
  if (!syncKey) return;

  try {
    await fetch("/api/certificates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Sync-Key": syncKey,
      },
      body: JSON.stringify(normalized),
    });
  } catch {
    /* offline or KV not configured */
  }
}
