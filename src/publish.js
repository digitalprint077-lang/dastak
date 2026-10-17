import publishedSeed from "../public/published-certificates.json";
import { getAdminSyncKey } from "./admin.js";

const staticCertFiles = import.meta.glob("../public/certs/*.json", {
  eager: true,
  import: "default",
});

const OVERLAY_KEY = "dastak:published-overlay";
const SUPPRESS_KEY = "dastak:published-suppressed";

function readSuppressedPublished() {
  try {
    const raw = localStorage.getItem(SUPPRESS_KEY);
    if (!raw) return { tokens: [], trackingIds: [], certNumbers: [] };
    const parsed = JSON.parse(raw);
    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      trackingIds: Array.isArray(parsed.trackingIds) ? parsed.trackingIds : [],
      certNumbers: Array.isArray(parsed.certNumbers) ? parsed.certNumbers : [],
    };
  } catch {
    return { tokens: [], trackingIds: [], certNumbers: [] };
  }
}

function writeSuppressedPublished(data) {
  try {
    localStorage.setItem(SUPPRESS_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function payloadMatchesSuppressed(payload, suppressed) {
  if (!payload?.values) return false;
  const tracking = String(payload.values["Tracking ID"] ?? "").trim();
  const certNo = String(payload.values["Certificate Number"] ?? "").trim();
  if (tracking && suppressed.trackingIds.includes(tracking)) return true;
  if (certNo && suppressed.certNumbers.includes(certNo)) return true;
  return false;
}

export function isPublishedSuppressed(slugOrToken, payload = null) {
  const needle = String(slugOrToken ?? "").trim();
  if (!needle) return false;
  const suppressed = readSuppressedPublished();
  if (suppressed.tokens.includes(needle)) return true;
  if (suppressed.trackingIds.includes(needle)) return true;
  if (suppressed.certNumbers.includes(needle)) return true;
  if (payload && payloadMatchesSuppressed(payload, suppressed)) return true;
  return false;
}

/** Hide deleted certs until redeploy removes them from static/API bundles. */
export function suppressPublishedCertificate(slugOrToken) {
  const entry = findEntryInMap(getMergedPublishedMapWithoutSuppress(), slugOrToken);
  const suppressed = readSuppressedPublished();
  const tokens = new Set(suppressed.tokens);
  const trackingIds = new Set(suppressed.trackingIds);
  const certNumbers = new Set(suppressed.certNumbers);

  const needle = String(slugOrToken ?? "").trim();
  if (needle) tokens.add(needle);

  if (entry) {
    tokens.add(entry.token);
    const tracking = String(entry.payload?.values?.["Tracking ID"] ?? "").trim();
    const certNo = String(entry.payload?.values?.["Certificate Number"] ?? "").trim();
    if (tracking) trackingIds.add(tracking);
    if (certNo) certNumbers.add(certNo);
  }

  writeSuppressedPublished({
    tokens: [...tokens],
    trackingIds: [...trackingIds],
    certNumbers: [...certNumbers],
  });
}

function filterSuppressedMap(map) {
  const suppressed = readSuppressedPublished();
  const out = {};
  for (const [token, payload] of Object.entries(map)) {
    if (suppressed.tokens.includes(token)) continue;
    if (payloadMatchesSuppressed(payload, suppressed)) continue;
    out[token] = payload;
  }
  return out;
}

function getMergedPublishedMapWithoutSuppress() {
  const remote = normalizeBundle(remotePublished);
  const overlay = getPublishedOverlay();
  return { ...builtInPublished, ...remote.certificates, ...overlay.certificates };
}

function bundleFromRepoStaticFiles() {
  const merged = normalizeBundle(publishedSeed);
  for (const data of Object.values(staticCertFiles)) {
    if (!data || typeof data !== "object") continue;
    const token = String(data.token ?? "").trim();
    if (!token || !data.values) continue;
    merged.certificates[token] = {
      status: data.status || "Issued",
      values: { ...data.values },
    };
  }
  return merged;
}

function readHtmlBootstrapPublished() {
  if (typeof document === "undefined") return null;
  try {
    const el = document.getElementById("dastak-published-bootstrap");
    if (!el?.textContent?.trim()) return null;
    return normalizeBundle(JSON.parse(el.textContent));
  } catch {
    return null;
  }
}

function applyHtmlBootstrapPublished() {
  const boot = readHtmlBootstrapPublished();
  if (!boot?.certificates || !Object.keys(boot.certificates).length) return;
  const merged = normalizeBundle(remotePublished);
  merged.certificates = { ...merged.certificates, ...boot.certificates };
  remotePublished = merged;
}

let remotePublished = bundleFromRepoStaticFiles();
applyHtmlBootstrapPublished();
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
  return filterSuppressedMap(getMergedPublishedMapWithoutSuppress());
}

/** Published data for phones / public verify (no admin localStorage overlay). */
export function getMergedPublishedMapForPublic() {
  const remote = normalizeBundle(remotePublished);
  return filterSuppressedMap({ ...builtInPublished, ...remote.certificates });
}

function findEntryInMap(map, slugOrToken) {
  const needle = String(slugOrToken ?? "").trim();
  if (!needle) return null;
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

export function findPublishedEntry(slugOrToken) {
  return findEntryInMap(getMergedPublishedMap(), slugOrToken);
}

export function findPublishedEntryPublic(slugOrToken) {
  applyHtmlBootstrapPublished();
  return findEntryInMap(getMergedPublishedMapForPublic(), slugOrToken);
}

/** Deployed static publish only (no admin localStorage overlay) — use for mobile QR readiness. */
export function getDeployedPublishedMap() {
  const merged = bundleFromRepoStaticFiles();
  const boot = readHtmlBootstrapPublished();
  if (boot?.certificates) {
    merged.certificates = { ...merged.certificates, ...boot.certificates };
  }
  return filterSuppressedMap({ ...builtInPublished, ...merged.certificates });
}

export function findDeployedPublishedEntry(slugOrToken) {
  return findEntryInMap(getDeployedPublishedMap(), slugOrToken);
}

export async function loadPublishedCertificates() {
  applyHtmlBootstrapPublished();
  const tryFetchJson = async (url) => {
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("text/html")) return null;
      return normalizeBundle(await res.json());
    } catch {
      return null;
    }
  };

  const fromApi = await tryFetchJson("/api/certificates");
  if (fromApi && typeof fromApi.count === "number") {
    remotePublished = normalizeBundle(remotePublished);
    remotePublished.updatedAt = fromApi.updatedAt || remotePublished.updatedAt;
  }
}

export function resetPublishedLoadCache() {
  publishLoadPromise = null;
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

export function removePublishedCertificate(slugOrToken) {
  const entry = findEntryInMap(getMergedPublishedMapWithoutSuppress(), slugOrToken);
  if (!entry) return null;

  remotePublished = normalizeBundle(remotePublished);
  delete remotePublished.certificates[entry.token];

  try {
    const overlay = getPublishedOverlay();
    if (overlay.certificates[entry.token]) {
      delete overlay.certificates[entry.token];
      setPublishedOverlay(overlay);
    }
  } catch {
    /* ignore */
  }

  return entry.token;
}

async function tryDeletePublishedApi(slug, syncKey) {
  const res = await fetch(`/api/certificate/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: { "X-Admin-Sync-Key": syncKey },
  });
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/html")) {
    return { ok: false, reason: "no-api" };
  }
  if (res.ok || res.status === 204) {
    const via = res.headers.get("X-Publish-Via") || "remote";
    return { ok: true, reason: via };
  }
  if (res.status === 404) {
    return { ok: true, reason: "not-on-server" };
  }
  if (res.status === 503) {
    return { ok: false, reason: "no-github" };
  }
  return { ok: false, reason: res.status === 401 ? "unauthorized" : "delete-failed" };
}

export async function deletePublishedCertificate(slugOrToken) {
  const needle = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!needle) return { ok: false, reason: "bad-token" };

  const entry = findEntryInMap(getMergedPublishedMapWithoutSuppress(), needle);
  const candidates = new Set([needle]);
  if (entry) {
    candidates.add(entry.token);
    const tracking = String(entry.payload?.values?.["Tracking ID"] ?? "").trim();
    if (tracking) candidates.add(tracking);
  }

  suppressPublishedCertificate(needle);
  removePublishedCertificate(needle);

  const syncKey = getAdminSyncKey();
  if (!syncKey) return { ok: false, reason: "no-key" };

  try {
    let last = { ok: false, reason: "delete-failed" };
    for (const slug of candidates) {
      last = await tryDeletePublishedApi(slug, syncKey);
      if (last.ok) return last;
    }
    return last;
  } catch {
    return { ok: false, reason: "network" };
  }
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
  try {
    setPublishedOverlay({
      version: 1,
      certificates: { ...overlay.certificates, [token]: entry },
    });
  } catch {
    /* private mode / storage blocked — in-memory publish still updated */
  }
}

function absoluteAssetUrl(path) {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

async function tryIngestCertJson(url) {
  try {
    const res = await fetch(absoluteAssetUrl(url), {
      cache: "no-store",
      credentials: "same-origin",
    });
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

function slugCandidates(slug) {
  const raw = String(slug ?? "").trim();
  if (!raw) return [];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const normalized = decoded.replace(/\u2212/g, "-").replace(/\s+/g, "");
  const queryToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("t")?.trim()
      : "";
  return [...new Set([raw, decoded, normalized, queryToken].filter(Boolean))];
}

export async function hydrateCertificateFromStatic(slug) {
  const candidates = slugCandidates(slug);
  if (!candidates.length) return;
  if (candidates.some((id) => findPublishedEntryPublic(id))) return;

  for (const id of candidates) {
    const safe = encodeURIComponent(id);
    if (await tryIngestCertJson(`/certs/${safe}.json`)) return;
    if (safe !== id && (await tryIngestCertJson(`/certs/${id}.json`))) return;
  }
}

async function ingestCertificateFromApi(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle) return false;
  try {
    const res = await fetch(`/api/certificate/${encodeURIComponent(needle)}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return false;
    const data = await res.json();
    if (!data?.values) return false;
    ingestPublishedCertificate(data.token || needle, {
      status: data.status,
      values: data.values,
    });
    return true;
  } catch {
    return false;
  }
}

export async function hydrateCertificateFromApi(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle || findPublishedEntry(needle)) return;
  await ingestCertificateFromApi(needle);
}

/** Poll until deployed API serves this certificate (after GitHub publish + deploy). */
export async function waitForCertificateLive(
  slugOrToken,
  { timeoutMs = 120000, intervalMs = 4000, onPoll } = {}
) {
  const needle = decodeURIComponent(String(slugOrToken ?? "").trim());
  if (!needle) return false;
  const started = Date.now();
  const deadline = started + timeoutMs;
  while (Date.now() < deadline) {
    onPoll?.({ elapsedMs: Date.now() - started, timeoutMs });
    if (await ingestCertificateFromApi(needle)) {
      if (findPublishedEntryPublic(needle)) return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
  return findPublishedEntryPublic(needle) != null;
}

export async function hydratePublicCertificate(slug) {
  await refreshPublishedCertificates();
  for (let attempt = 0; attempt < 4; attempt++) {
    await hydrateCertificateFromStatic(slug);
    await hydrateCertificateFromApi(slug);
    const needle = decodeURIComponent(String(slug ?? "").trim());
    if (!needle || findPublishedEntryPublic(needle)) return;
    if (typeof window !== "undefined" && attempt < 3) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }
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
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      return { ok: false, reason: "no-api" };
    }
    if (res.ok || res.status === 204) {
      const via = res.headers.get("X-Publish-Via") || "remote";
      return { ok: true, reason: via };
    }
    if (res.status === 503) {
      const detail = (await res.text()).trim();
      return { ok: false, reason: detail.includes("Publish not configured") ? "no-github" : "no-backend" };
    }
    return { ok: false, reason: res.status === 401 ? "unauthorized" : "publish-failed" };
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
