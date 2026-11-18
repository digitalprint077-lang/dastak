import { getAdminSyncKey } from "./admin.js";

export const ARMS_STATUS_OPTIONS = ["Issued", "Pending", "Under Review", "Revoked", "Expired"];

export const ARMS_DISTRICT_OPTIONS = [
  "Peshawar",
  "Nowshera",
  "Charsadda",
  "Mardan",
  "Swabi",
  "Kohat",
  "Hangu",
  "Karak",
  "Bannu",
  "Lakki Marwat",
  "Dera Ismail Khan",
  "Tank",
  "Abbottabad",
  "Haripur",
  "Mansehra",
  "Battagram",
  "Kohistan",
  "Swat",
  "Shangla",
  "Buner",
  "Dir Lower",
  "Dir Upper",
  "Chitral",
  "Malakand",
];

export const ARMS_PERSON_CATEGORY_OPTIONS = ["Private", "Government", "Official", "A", "B", "C"];

export const ARMS_FORM_SECTIONS = [
  {
    title: "License",
    desc: "Public license number, tracking ID, validity, and issuing district.",
    fields: ["License No", "Tracking ID", "Issue Date", "Expiry Date", "District"],
  },
  {
    title: "License holder",
    desc: "Identity fields shown on Arms License Details preview.",
    fields: ["Name", "Father Name", "CNIC", "Contact", "Person Category"],
  },
  {
    title: "Addresses",
    desc: "Current and permanent addresses as on the license.",
    fields: ["Current Address", "Permanent Address"],
  },
  {
    title: "Weapon",
    desc: "Weapon registration, bore, cartridges, restriction, and coverage.",
    fields: ["Weapon No", "Weapon Bore", "Cartridges", "Restriction", "Coverage"],
  },
];

export const ARMS_ALL_FIELDS = [
  ...ARMS_FORM_SECTIONS.flatMap((s) => s.fields),
  "Photo",
];

export const ARMS_DATE_FIELDS = ["Issue Date", "Expiry Date"];

export const ARMS_REQUIRED_FIELDS = ["License No", "Name", "CNIC", "Issue Date", "Expiry Date"];

const STORAGE_PREFIX = "dastak:arms-license:";
const OVERLAY_KEY = "dastak:arms-licenses-overlay";
const LAST_SAVE_PREFIX = "dastak:arms-license-saved:";

export const ARMS_VALIDITY_YEARS = 3;

const DEFAULT_VALUES = {
  "License No": "",
  "Tracking ID": "",
  Name: "",
  "Father Name": "",
  CNIC: "",
  Contact: "",
  "Issue Date": "",
  "Expiry Date": "",
  District: "Peshawar",
  "Current Address": "",
  "Permanent Address": "",
  "Weapon No": "",
  "Weapon Bore": "",
  Cartridges: "",
  Restriction: "",
  Coverage: "Whole Pakistan",
  "Person Category": "Private",
  Photo: "",
};

let overlayLicenses = { version: 1, licenses: {} };

export function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addCalendarYears(iso, years) {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const d = new Date(Number(m[1]) + years, Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function expiryFromArmsIssueDate(issueValue) {
  return addCalendarYears(issueValue, ARMS_VALIDITY_YEARS);
}

export function applyArmsValidity(values) {
  if (!values || !values["Issue Date"]) return values;
  values["Expiry Date"] = expiryFromArmsIssueDate(values["Issue Date"]);
  return values;
}

export function fillArmsValidityFields(form, { onlyIfEmpty = false } = {}) {
  const issue = form?.querySelector(`[name="${cssEscapeName("Issue Date")}"]`)?.value?.trim();
  if (!issue) return;
  const input = form.querySelector(`[name="${cssEscapeName("Expiry Date")}"]`);
  if (!input) return;
  if (onlyIfEmpty && input.value.trim()) return;
  input.value = expiryFromArmsIssueDate(issue);
}

export function generateArmsLinkId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 12; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function generateArmsLicenseNo() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const seq = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const number = `KP-ARM-${seq}`;
    if (!findArmsLicenseTokenByField("License No", number)) return number;
  }
  return `KP-ARM-${String(Date.now()).slice(-8)}`;
}

export function generateArmsTrackingId() {
  return String(Math.floor(1_000_000 + Math.random() * 8_999_999)).padStart(10, "0");
}

function readStoredLicense(token) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredLicense(token, payload) {
  localStorage.setItem(`${STORAGE_PREFIX}${token}`, JSON.stringify(payload));
}

function readOverlay() {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return { version: 1, licenses: {} };
    const parsed = JSON.parse(raw);
    return { version: 1, licenses: parsed?.licenses && typeof parsed.licenses === "object" ? parsed.licenses : {} };
  } catch {
    return { version: 1, licenses: {} };
  }
}

function writeOverlay(map) {
  overlayLicenses = map;
  try {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

function ingestLicense(token, payload) {
  const next = readOverlay();
  next.licenses[token] = {
    status: payload?.status || "Issued",
    values: { ...(payload?.values || {}) },
    updatedAt: new Date().toISOString(),
  };
  writeOverlay(next);
}

export function listSavedArmsLicenseTokens() {
  const tokens = new Set();
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) tokens.add(key.slice(STORAGE_PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  Object.keys(readOverlay().licenses).forEach((token) => tokens.add(token));
  Object.keys(overlayLicenses.licenses || {}).forEach((token) => tokens.add(token));
  return [...tokens];
}

export function defaultArmsLicenseValues() {
  return { ...DEFAULT_VALUES };
}

export function newArmsLicenseTemplate() {
  const issue = todayIsoDate();
  const expiry = expiryFromArmsIssueDate(issue);
  return {
    status: "Issued",
    values: {
      ...DEFAULT_VALUES,
      "License No": generateArmsLicenseNo(),
      "Tracking ID": generateArmsTrackingId(),
      "Issue Date": issue,
      "Expiry Date": expiry,
    },
  };
}

export function getArmsLicenseForEdit(token) {
  const stored = readStoredLicense(token);
  if (stored?.values) {
    return {
      status: stored.status || "Issued",
      values: { ...DEFAULT_VALUES, ...stored.values },
    };
  }
  const overlay = { ...readOverlay().licenses, ...overlayLicenses.licenses };
  const published = overlay[token];
  if (published?.values) {
    return {
      status: published.status || "Issued",
      values: { ...DEFAULT_VALUES, ...published.values },
    };
  }
  return { status: "Issued", values: { ...DEFAULT_VALUES } };
}

export function isArmsLicenseSaved(token) {
  return Boolean(readStoredLicense(token));
}

function normalizeArmsLookup(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s-]+/g, "")
    .toLowerCase();
}

export function normalizeArmsCnic(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function findArmsLicenseTokenByField(label, value) {
  const needle = normalizeArmsLookup(value);
  if (!needle) return null;
  for (const token of listSavedArmsLicenseTokens()) {
    const { values } = getArmsLicenseForEdit(token);
    if (normalizeArmsLookup(values[label]) === needle) return token;
  }
  return null;
}

export function resolveArmsLicenseToken(slug) {
  const id = decodeURIComponent(String(slug ?? "").trim());
  if (!id) return null;
  if (readStoredLicense(id) || readOverlay().licenses[id] || overlayLicenses.licenses[id]) return id;
  return (
    findArmsLicenseTokenByField("Tracking ID", id) ||
    findArmsLicenseTokenByField("License No", id) ||
    findArmsLicenseTokenByField("CNIC", id) ||
    id
  );
}

export function getPublicArmsLicense(slug) {
  const token = resolveArmsLicenseToken(slug);
  if (!token) return null;
  const data = getArmsLicenseForEdit(token);
  const hasIdentity =
    String(data.values["License No"] ?? "").trim() || String(data.values.Name ?? "").trim();
  if (
    !hasIdentity &&
    !isArmsLicenseSaved(token) &&
    !readOverlay().licenses[token] &&
    !overlayLicenses.licenses[token]
  ) {
    return null;
  }
  return { token, status: data.status, values: data.values };
}

export function publicArmsLicensePath(token) {
  return `/armslicense/${encodeURIComponent(token)}`;
}

export function publicArmsLicenseLink(token, origin) {
  const site = String(origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${site}${publicArmsLicensePath(token)}`;
}

export function resolveArmsLicenseForVerify(documentNumber, cnic) {
  const doc = String(documentNumber ?? "").trim();
  if (!doc) return null;
  const token =
    findArmsLicenseTokenByField("Tracking ID", doc) ||
    findArmsLicenseTokenByField("License No", doc) ||
    resolveArmsLicenseToken(doc);
  if (!token) return null;
  const { values } = getArmsLicenseForEdit(token);
  const stored = normalizeArmsCnic(values.CNIC);
  const input = normalizeArmsCnic(cnic);
  if (!stored || !input || stored !== input) return null;
  return getPublicArmsLicense(token);
}

const LONG_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoParts(value) {
  const iso = String(value ?? "").trim();
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  const dmy = iso.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return { d: Number(dmy[1]), mo: Number(dmy[2]), y: Number(dmy[3]) };
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return { y: parsed.getFullYear(), mo: parsed.getMonth() + 1, d: parsed.getDate() };
}

export function formatArmsDmy(value) {
  const p = isoParts(value);
  if (!p) return String(value ?? "").trim();
  return `${String(p.d).padStart(2, "0")}-${String(p.mo).padStart(2, "0")}-${p.y}`;
}

export function listArmsLicenseSummaries() {
  return listSavedArmsLicenseTokens()
    .map((token) => {
      const { status, values } = getArmsLicenseForEdit(token);
      return {
        token,
        holder: values.Name || "—",
        licenseNo: values["License No"] || "—",
        trackingId: values["Tracking ID"] || "",
        district: values.District || "",
        issueDate: values["Issue Date"] || "",
        expiryDate: values["Expiry Date"] || "",
        status,
        updatedAt: readArmsLicenseLastSavedIso(token),
      };
    })
    .sort((a, b) => String(b.updatedAt || b.issueDate).localeCompare(String(a.updatedAt || a.issueDate)));
}

export function readArmsLicenseFormValues(form) {
  const status = form.querySelector('[name="status"]')?.value?.trim() || "Issued";
  const values = { ...DEFAULT_VALUES };
  ARMS_ALL_FIELDS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscapeName(label)}"]`);
    if (!input) return;
    values[label] = input.value?.trim() ?? "";
  });
  const photo = form.querySelector('[name="Photo"]')?.value?.trim();
  if (photo) values.Photo = photo;
  values.CNIC = normalizeArmsCnic(values.CNIC);
  return { status, values };
}

export function validateArmsLicenseRequired(values) {
  const missing = ARMS_REQUIRED_FIELDS.filter((label) => !String(values[label] ?? "").trim());
  return { ok: missing.length === 0, missing };
}

function recordArmsLicenseLastSaved(token) {
  if (!token) return;
  try {
    localStorage.setItem(`${LAST_SAVE_PREFIX}${token}`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function readArmsLicenseLastSavedIso(token) {
  try {
    return localStorage.getItem(`${LAST_SAVE_PREFIX}${token}`) || "";
  } catch {
    return "";
  }
}

export async function saveArmsLicense(token, { status, values }) {
  const payload = { status: status || "Issued", values: { ...values } };
  writeStoredLicense(token, payload);
  ingestLicense(token, payload);
  recordArmsLicenseLastSaved(token);
  const published = await upsertPublishedArmsLicense(token, payload);
  return {
    saved: true,
    publishedOnline: Boolean(published?.ok),
    publishVia: published?.reason,
  };
}

export async function deleteArmsLicense(token) {
  const id = String(token ?? "").trim();
  if (!id) return { ok: false };
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    localStorage.removeItem(`${LAST_SAVE_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
  const overlay = readOverlay();
  delete overlay.licenses[id];
  writeOverlay(overlay);
  const syncKey = getAdminSyncKey();
  if (syncKey) {
    try {
      await fetch(`/api/arms-license/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "X-Admin-Sync-Key": syncKey },
      });
    } catch {
      /* local delete still counts */
    }
  }
  return { ok: true };
}

export async function upsertPublishedArmsLicense(token, payload) {
  ingestLicense(token, payload);
  const syncKey = getAdminSyncKey();
  if (!syncKey || !token) return { ok: false, reason: "no-key" };
  try {
    const res = await fetch(`/api/arms-license/${encodeURIComponent(token)}`, {
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
    if (type.includes("text/html")) return { ok: false, reason: "no-api" };
    if (res.ok || res.status === 204) {
      return { ok: true, reason: res.headers.get("X-Publish-Via") || "remote" };
    }
    return { ok: false, reason: res.status === 401 ? "unauthorized" : "publish-failed" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function hydratePublicArmsLicense(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle) return;
  const compact = needle.replace(/[\s-]+/g, "");
  const candidates = [...new Set([needle, compact, compact.toUpperCase()])].filter(Boolean);
  for (const id of candidates) {
    try {
      const res = await fetch(`/api/arms-license/${encodeURIComponent(id)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("text/html")) continue;
      const data = await res.json();
      if (!data?.values) continue;
      ingestLicense(data.token || id, { status: data.status, values: data.values });
      return;
    } catch {
      /* try next candidate */
    }
  }
}

export async function fetchArmsLicenseList() {
  try {
    const res = await fetch("/api/arms-licenses?list=1", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return listArmsLicenseSummaries();
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return listArmsLicenseSummaries();
    const data = await res.json();
    const remote = Array.isArray(data?.items) ? data.items : [];
    const local = listArmsLicenseSummaries();
    const byToken = new Map();
    remote.forEach((item) => {
      if (item?.token) byToken.set(item.token, item);
    });
    local.forEach((item) => {
      if (!byToken.has(item.token)) byToken.set(item.token, item);
    });
    return [...byToken.values()].sort((a, b) =>
      String(b.updatedAt || b.issueDate || "").localeCompare(String(a.updatedAt || a.issueDate || ""))
    );
  } catch {
    return listArmsLicenseSummaries();
  }
}

export function cssEscapeName(value) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

overlayLicenses = readOverlay();