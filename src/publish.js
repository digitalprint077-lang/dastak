import publishedSeed from "../public/published-certificates.json";

const OVERLAY_KEY = "dastak:published-overlay";

let remotePublished = normalizeBundle(publishedSeed);
let builtInPublished = {};
let publishLoadPromise = null;

function normalizeBundle(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, certificates: {} };
  const certificates = raw.certificates && typeof raw.certificates === "object" ? raw.certificates : {};
  return { version: 1, certificates };
}

export function registerBuiltInCertificates(entries) {
  builtInPublished = entries && typeof entries === "object" ? entries : {};
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
  return { ...builtInPublished, ...remote.certificates, ...overlay.certificates };
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

  const merged = normalizeBundle(remotePublished);
  const api = normalizeBundle(fromApi);
  const stat = normalizeBundle(fromStatic);
  merged.certificates = {
    ...merged.certificates,
    ...stat.certificates,
    ...api.certificates,
  };
  remotePublished = merged;
}

export function ensurePublishedLoaded() {
  if (!publishLoadPromise) {
    publishLoadPromise = loadPublishedCertificates();
  }
  return publishLoadPromise;
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

export function downloadPublishedBundle(bundle) {
  const normalized = normalizeBundle(bundle);
  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "published-certificates.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function syncPublishedCertificates(bundle) {
  const normalized = normalizeBundle(bundle);
  setPublishedOverlay(normalized);
  remotePublished = {
    ...normalizeBundle(remotePublished),
    certificates: {
      ...normalizeBundle(remotePublished).certificates,
      ...normalized.certificates,
    },
  };

  const syncKey = import.meta.env.VITE_ADMIN_PASSWORD;
  if (!syncKey) return { ok: false, reason: "no-key" };

  try {
    const res = await fetch("/api/certificates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Sync-Key": syncKey,
      },
      body: JSON.stringify(normalized),
    });
    if (res.ok || res.status === 204) return { ok: true };
    return { ok: false, reason: res.status === 503 ? "no-kv" : "unauthorized" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
