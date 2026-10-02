import publishedSeed from "../public/published-certificates.json";
import { getAdminSyncKey } from "./admin.js";

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
    tryFetchJson(`/published-certificates.json?_=${Date.now()}`),
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

export async function refreshPublishedCertificates() {
  publishLoadPromise = loadPublishedCertificates();
  return publishLoadPromise;
}

export function buildFullPublishBundle(collectLocalEntries) {
  const local = buildPublishedBundle(collectLocalEntries);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    certificates: {
      ...getMergedPublishedMap(),
      ...local.certificates,
    },
  };
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

export function downloadIndividualCertFile(token, payload) {
  const tracking = String(payload?.values?.["Tracking ID"] ?? "").trim();
  const fileStem = tracking || token;
  if (!fileStem) return;
  const body = JSON.stringify(
    {
      token,
      status: payload?.status || "Issued",
      values: payload?.values || {},
    },
    null,
    2
  );
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileStem}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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

export function ingestPublishedCertificate(token, payload) {
  if (!token || !payload?.values) return;
  const entry = {
    status: payload.status || "Issued",
    values: { ...payload.values },
  };
  remotePublished = normalizeBundle(remotePublished);
  remotePublished.certificates[token] = entry;
  const overlay = getPublishedOverlay();
  setPublishedOverlay({
    version: 1,
    certificates: { ...overlay.certificates, [token]: entry },
  });
}

async function tryIngestCertJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return false;
    const data = await res.json();
    if (!data?.values) return false;
    ingestPublishedCertificate(data.token || "unknown", {
      status: data.status,
      values: data.values,
    });
    return true;
  } catch {
    return false;
  }
}

export async function hydrateCertificateFromStatic(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle || findPublishedEntry(needle)) return;

  const queryToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("t")?.trim()
      : "";
  const candidates = [...new Set([needle, queryToken].filter(Boolean))];

  for (const id of candidates) {
    const safe = encodeURIComponent(id);
    if (await tryIngestCertJson(`/certs/${safe}.json`)) return;
    if (safe !== id && (await tryIngestCertJson(`/certs/${id}.json`))) return;
  }
}

export async function hydrateCertificateFromApi(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle || findPublishedEntry(needle)) return;
  await tryIngestCertJson(`/api/certificate/${encodeURIComponent(needle)}`);
}

export async function upsertPublishedCertificate(token, payload) {
  ingestPublishedCertificate(token, payload);
  const syncKey = getAdminSyncKey();
  if (!syncKey || !token) return { ok: false, reason: "no-key" };
  try {
    const res = await fetch(`/api/certificate/${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Sync-Key": syncKey,
      },
      body: JSON.stringify({
        status: payload.status || "Issued",
        values: payload.values || {},
      }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    return { ok: false, reason: res.status === 503 ? "no-kv" : "unauthorized" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function syncPublishedCertificates(bundle) {
  const normalized = normalizeBundle(bundle);
  const overlay = getPublishedOverlay();
  const mergedOverlay = {
    version: 1,
    certificates: { ...overlay.certificates, ...normalized.certificates },
  };
  setPublishedOverlay(mergedOverlay);
  remotePublished = {
    ...normalizeBundle(remotePublished),
    certificates: {
      ...normalizeBundle(remotePublished).certificates,
      ...mergedOverlay.certificates,
    },
  };

  const syncKey = getAdminSyncKey();
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
