const EVENTS_KEY = "dastak:analytics:events";
const MAX_EVENTS = 800;

export const EVENT_TYPES = {
  CERT_VIEW: "cert_view",
  CERT_PRINT: "cert_print",
  TRACK_LOOKUP: "track_lookup",
  VERIFY_LOOKUP: "verify_lookup",
  ADMIN_SAVE: "admin_save",
  PERMIT_VIEW: "permit_view",
  PERMIT_PRINT: "permit_print",
  PERMIT_SAVE: "permit_save",
};

function isViewType(type) {
  return type === EVENT_TYPES.CERT_VIEW || type === EVENT_TYPES.PERMIT_VIEW;
}

function isPrintType(type) {
  return type === EVENT_TYPES.CERT_PRINT || type === EVENT_TYPES.PERMIT_PRINT;
}

function isSaveType(type) {
  return type === EVENT_TYPES.ADMIN_SAVE || type === EVENT_TYPES.PERMIT_SAVE;
}

function isLookupType(type) {
  return type === EVENT_TYPES.TRACK_LOOKUP || type === EVENT_TYPES.VERIFY_LOOKUP;
}

export function eventRecordKind(event) {
  if (event?.kind === "permit" || event?.kind === "fitness") return event.kind;
  if (String(event?.type || "").startsWith("permit_")) return "permit";
  return "fitness";
}

function matchesMetricKind(event, kind) {
  if (!kind || kind === "all") return true;
  return eventRecordKind(event) === kind;
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function recordAnalyticsEvent(type, detail = {}) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    at: new Date().toISOString(),
    ...detail,
  };
  const events = loadEvents();
  events.unshift(event);
  persistEvents(events);
  return event;
}

export function getAnalyticsEvents(limit = MAX_EVENTS) {
  return loadEvents().slice(0, limit);
}

export function clearAnalyticsEvents() {
  localStorage.removeItem(EVENTS_KEY);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function localDayKey(date) {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eventsSince(days) {
  const cutoff = startOfDay(new Date()).getTime() - (days - 1) * 86400000;
  return loadEvents().filter((e) => new Date(e.at).getTime() >= cutoff);
}

/** @returns {{ key: string, label: string, total: number, views: number, prints: number, lookups: number }[]} */
export function dailyActivityBuckets(days = 7, kind = "all") {
  const buckets = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const key = localDayKey(day);
    buckets.push({
      key,
      label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      total: 0,
      views: 0,
      prints: 0,
      lookups: 0,
      saves: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const e of loadEvents()) {
    if (!matchesMetricKind(e, kind)) continue;
    const key = e.at ? localDayKey(e.at) : "";
    const bucket = byKey[key];
    if (!bucket) continue;
    bucket.total += 1;
    if (isViewType(e.type)) bucket.views += 1;
    if (isPrintType(e.type)) bucket.prints += 1;
    if (isLookupType(e.type)) bucket.lookups += 1;
    if (isSaveType(e.type)) bucket.saves += 1;
  }
  return buckets;
}

/** @returns {{ views: number, prints: number, lookups: number, saves: number, total: number }} */
export function eventTypeMix(events) {
  const mix = {
    views: 0,
    prints: 0,
    lookups: 0,
    saves: 0,
    total: 0,
    fitnessViews: 0,
    permitViews: 0,
    fitnessPrints: 0,
    permitPrints: 0,
  };
  for (const e of events) {
    mix.total += 1;
    if (e.type === EVENT_TYPES.CERT_VIEW) {
      mix.views += 1;
      mix.fitnessViews += 1;
    }
    if (e.type === EVENT_TYPES.PERMIT_VIEW) {
      mix.views += 1;
      mix.permitViews += 1;
    }
    if (e.type === EVENT_TYPES.CERT_PRINT) {
      mix.prints += 1;
      mix.fitnessPrints += 1;
    }
    if (e.type === EVENT_TYPES.PERMIT_PRINT) {
      mix.prints += 1;
      mix.permitPrints += 1;
    }
    if (isLookupType(e.type)) mix.lookups += 1;
    if (isSaveType(e.type)) mix.saves += 1;
  }
  return mix;
}

export function buildRowFromApiItem(item, events) {
  const stats = aggregateTokenStats(events, item.token);
  const daysLeft = item.daysLeft ?? daysUntilExpiry(item.expiryDate);
  return {
    token: item.token,
    trackingId: item.trackingId || "—",
    applicant: item.applicant || "—",
    certStatus: item.status || "Issued",
    appStatus: "—",
    district: item.district || "—",
    issue: "",
    expiry: item.expiryDate || "",
    daysLeft,
    health: fitnessHealthLabel(daysLeft),
    saved: true,
    fromServer: true,
    kind: "fitness",
    ...stats,
  };
}

export function mergeAnalyticsRows(localRows, apiItems) {
  const events = loadEvents();
  const byToken = new Map(localRows.map((r) => [r.token, r]));
  for (const item of apiItems || []) {
    if (!item?.token) continue;
    if (!byToken.has(item.token)) {
      byToken.set(item.token, buildRowFromApiItem(item, events));
    }
  }
  return [...byToken.values()];
}

export function exportAnalyticsCsv(rows) {
  const headers = [
    "Kind",
    "Tracking ID",
    "Applicant",
    "District",
    "Fitness",
    "Cert status",
    "Expiry",
    "Days left",
    "Views",
    "Prints",
    "Lookups",
    "Last activity",
    "Token",
  ];
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.kind === "permit" ? "Permit" : "Fitness",
        r.trackingId,
        r.applicant,
        r.district,
        r.health?.label,
        r.certStatus,
        r.expiry,
        r.daysLeft ?? "",
        r.views,
        r.prints,
        r.lookups,
        r.lastAt || "",
        r.token,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function parseIsoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysUntilExpiry(expiryValue) {
  const exp = parseIsoDate(expiryValue);
  if (!exp) return null;
  const today = startOfDay(new Date());
  const expDay = startOfDay(exp);
  return Math.round((expDay - today) / 86400000);
}

export function fitnessHealthLabel(daysLeft) {
  if (daysLeft == null) return { label: "Unknown", tone: "muted" };
  if (daysLeft < 0) return { label: "Expired", tone: "danger" };
  if (daysLeft <= 30) return { label: "Expiring soon", tone: "warn" };
  if (daysLeft <= 90) return { label: "Renewal window", tone: "info" };
  return { label: "Active", tone: "ok" };
}

export function aggregateTokenStats(events, token) {
  let views = 0;
  let prints = 0;
  let lookups = 0;
  let lastAt = null;
  for (const e of events) {
    if (e.token !== token) continue;
    const t = new Date(e.at).getTime();
    if (!lastAt || t > lastAt) lastAt = t;
    if (isViewType(e.type)) views += 1;
    if (isPrintType(e.type)) prints += 1;
    if (isLookupType(e.type)) lookups += 1;
  }
  return {
    views,
    prints,
    lookups,
    lastAt: lastAt ? new Date(lastAt).toISOString() : null,
  };
}

export function buildFitnessTrackingRows(tokens, getCertificateForEdit, isCertificateSaved) {
  const events = loadEvents();
  return tokens.map((token) => {
    const { status, values } = getCertificateForEdit(token);
    const trackingId = values["Tracking ID"] || "—";
    const applicant = values["Applicant Name"] || "—";
    const appStatus = values["Application Status"] || "—";
    const district = values["District"] || "—";
    const issue = values["Issue Date"] || "";
    const expiry = values["Expiry Date"] || "";
    const daysLeft = daysUntilExpiry(expiry);
    const health = fitnessHealthLabel(daysLeft);
    const stats = aggregateTokenStats(events, token);
    return {
      token,
      trackingId,
      applicant,
      certStatus: status,
      appStatus,
      district,
      issue,
      expiry,
      daysLeft,
      health,
      saved: isCertificateSaved(token),
      kind: "fitness",
      ...stats,
    };
  });
}

export function buildPermitRowFromApiItem(item, events) {
  const stats = aggregateTokenStats(events, item.token);
  const daysLeft = item.daysLeft ?? daysUntilExpiry(item.expiryDate);
  return {
    token: item.token,
    trackingId: item.trackingId || item.permitNo || "—",
    applicant: item.holder || "—",
    permitNo: item.permitNo || "—",
    certStatus: item.status || "Issued",
    appStatus: "—",
    district: item.district || "—",
    issue: item.issueDate || "",
    expiry: item.expiryDate || "",
    daysLeft,
    health: fitnessHealthLabel(daysLeft),
    saved: true,
    fromServer: true,
    kind: "permit",
    ...stats,
  };
}

export function mergePermitAnalyticsRows(localRows, apiItems) {
  const events = loadEvents();
  const byToken = new Map(localRows.map((r) => [r.token, r]));
  for (const item of apiItems || []) {
    if (!item?.token) continue;
    if (!byToken.has(item.token)) {
      byToken.set(item.token, buildPermitRowFromApiItem(item, events));
    }
  }
  return [...byToken.values()];
}

export function buildPermitTrackingRows(tokens, getPermitForEdit, isPermitSaved) {
  const events = loadEvents();
  return tokens.map((token) => {
    const { status, values } = getPermitForEdit(token);
    const trackingId = values["Tracking ID"] || values["Route Permit No"] || "—";
    const applicant = values["Permit Holder"] || "—";
    const district = values.District || "—";
    const issue = values["Issue Date"] || "";
    const expiry = values["Expiry Date"] || values["Renewed Upto"] || "";
    const daysLeft = daysUntilExpiry(expiry);
    const health = fitnessHealthLabel(daysLeft);
    const stats = aggregateTokenStats(events, token);
    return {
      token,
      trackingId,
      applicant,
      permitNo: values["Route Permit No"] || "—",
      certStatus: status,
      appStatus: "—",
      district,
      issue,
      expiry,
      daysLeft,
      health,
      saved: isPermitSaved(token),
      kind: "permit",
      ...stats,
    };
  });
}

export function computeOverviewMetrics(rows, eventsWindow, options = {}) {
  const kind = options.kind || "all";
  const scopedEvents = eventsWindow.filter((e) => matchesMetricKind(e, kind));
  const total = rows.length;
  const saved = rows.filter((r) => r.saved).length;
  const expiringSoon = rows.filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30).length;
  const expired = rows.filter((r) => r.daysLeft != null && r.daysLeft < 0).length;
  const views7d = scopedEvents.filter((e) => isViewType(e.type)).length;
  const prints7d = scopedEvents.filter((e) => isPrintType(e.type)).length;
  const adminSaves = scopedEvents.filter((e) => isSaveType(e.type)).length;
  const lookups7d = scopedEvents.filter((e) => isLookupType(e.type)).length;
  const successfulLookups7d = scopedEvents.filter((e) => isLookupType(e.type) && e.success === true).length;
  const lookupSuccessRate =
    lookups7d > 0 ? Math.round((successfulLookups7d / lookups7d) * 100) : null;
  const renewalWindow = rows.filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 90).length;
  const withPublicActivity = rows.filter((r) => r.views + r.prints + r.lookups > 0).length;

  const byDistrict = {};
  for (const r of rows) {
    const d = r.district || "—";
    byDistrict[d] = (byDistrict[d] || 0) + 1;
  }
  const topDistricts = Object.entries(byDistrict)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total,
    saved,
    expiringSoon,
    expired,
    renewalWindow,
    views7d,
    prints7d,
    adminSaves,
    lookups7d,
    successfulLookups7d,
    lookupSuccessRate,
    withPublicActivity,
    topDistricts,
  };
}

export function formatEventLabel(event) {
  switch (event.type) {
    case EVENT_TYPES.CERT_VIEW:
      return event.success === false ? "Certificate view (not found)" : "Certificate preview opened";
    case EVENT_TYPES.CERT_PRINT:
      return "Print layout opened";
    case EVENT_TYPES.TRACK_LOOKUP:
      return event.success ? "Track application (found)" : "Track application (not found)";
    case EVENT_TYPES.VERIFY_LOOKUP:
      return event.success ? "License verify (found)" : "License verify (not found)";
    case EVENT_TYPES.ADMIN_SAVE:
      return "Certificate saved in admin";
    case EVENT_TYPES.PERMIT_VIEW:
      return event.success === false ? "Permit view (not found)" : "Route permit preview opened";
    case EVENT_TYPES.PERMIT_PRINT:
      return "Permit print layout opened";
    case EVENT_TYPES.PERMIT_SAVE:
      return "Route permit saved in admin";
    default:
      return event.type || "Event";
  }
}

export function formatRelativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
