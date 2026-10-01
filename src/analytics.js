const EVENTS_KEY = "dastak:analytics:events";
const MAX_EVENTS = 800;

export const EVENT_TYPES = {
  CERT_VIEW: "cert_view",
  CERT_PRINT: "cert_print",
  TRACK_LOOKUP: "track_lookup",
  VERIFY_LOOKUP: "verify_lookup",
  ADMIN_SAVE: "admin_save",
};

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

export function eventsSince(days) {
  const cutoff = startOfDay(new Date()).getTime() - (days - 1) * 86400000;
  return loadEvents().filter((e) => new Date(e.at).getTime() >= cutoff);
}

/** @returns {{ key: string, label: string, total: number, views: number, prints: number, lookups: number }[]} */
export function dailyActivityBuckets(days = 7) {
  const buckets = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      total: 0,
      views: 0,
      prints: 0,
      lookups: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const e of loadEvents()) {
    const key = e.at?.slice(0, 10);
    const bucket = byKey[key];
    if (!bucket) continue;
    bucket.total += 1;
    if (e.type === EVENT_TYPES.CERT_VIEW) bucket.views += 1;
    if (e.type === EVENT_TYPES.CERT_PRINT) bucket.prints += 1;
    if (e.type === EVENT_TYPES.TRACK_LOOKUP || e.type === EVENT_TYPES.VERIFY_LOOKUP) {
      bucket.lookups += 1;
    }
  }
  return buckets;
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
    if (e.type === EVENT_TYPES.CERT_VIEW) views += 1;
    if (e.type === EVENT_TYPES.CERT_PRINT) prints += 1;
    if (e.type === EVENT_TYPES.TRACK_LOOKUP || e.type === EVENT_TYPES.VERIFY_LOOKUP) lookups += 1;
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
      ...stats,
    };
  });
}

export function computeOverviewMetrics(rows, eventsWindow) {
  const total = rows.length;
  const saved = rows.filter((r) => r.saved).length;
  const expiringSoon = rows.filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30).length;
  const expired = rows.filter((r) => r.daysLeft != null && r.daysLeft < 0).length;
  const views7d = eventsWindow.filter((e) => e.type === EVENT_TYPES.CERT_VIEW).length;
  const prints7d = eventsWindow.filter((e) => e.type === EVENT_TYPES.CERT_PRINT).length;
  const lookups7d = eventsWindow.filter(
    (e) => e.type === EVENT_TYPES.TRACK_LOOKUP || e.type === EVENT_TYPES.VERIFY_LOOKUP
  ).length;
  const successfulLookups7d = eventsWindow.filter(
    (e) =>
      (e.type === EVENT_TYPES.TRACK_LOOKUP || e.type === EVENT_TYPES.VERIFY_LOOKUP) && e.success === true
  ).length;

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
    views7d,
    prints7d,
    lookups7d,
    successfulLookups7d,
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
