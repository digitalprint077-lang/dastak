import { getAdminSyncKey } from "./admin.js";

export const PERMIT_STATUS_OPTIONS = ["Issued", "Pending", "Under Review", "Revoked", "Expired"];

export const PERMIT_TYPE_OPTIONS = [
  "P.Pu.C (Public Carriers Permit)",
  "P.Pr.C (Private Carriers Permit)",
  "Stage Carriage Permit",
  "Contract Carriage Permit",
];

export const PERMIT_CUSTOM_VALUE = "__custom__";

export const PERMIT_MAKER_OPTIONS = ["DAEWOO", "HINO", "NISSAN", "DONGFENG", "TOYOTA", "SUZUKI"];

export const PERMIT_MAKE_OPTIONS = [
  "PICKUP",
  "TRUCK",
  "TRUCK TRAILER",
  "SLEEPER BUS",
  "OIL TANKER",
  "OIL TANKER TRAILER",
  "GAS BOWSER",
  "GAS BOWSER TRAILER",
  "OPEN TRUCK",
  "MINI BUS",
  "MINI TRUCK",
];

export const PERMIT_MODEL_OPTIONS = Array.from({ length: 2070 - 1950 + 1 }, (_, i) => String(1950 + i));

export const PERMIT_LADEN_WEIGHT_OPTIONS = [
  "15000",
  "20000",
  "17000",
  "17500",
  "18000",
  "18500",
  "23000",
  "23200",
  "14200",
  "10920",
  "1250",
  "39500",
  "58500",
  "38500",
];

export const DEFAULT_PERMIT_ROUTE =
  "Bannu, Dera Ismail Khan, Hazara, Kohat, Malakand, Mardan, Peshawar";

export const PERMIT_DISTRICT_OPTIONS = [
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

export const PERMIT_PREVIEW_FIELDS = [
  "Route Permit No",
  "Permit Holder",
  "Father Name",
  "CNIC",
  "Contact",
  "Issue Date",
  "Expiry Date",
  "Permit Type",
  "Vehicle Registration No",
  "District",
  "Current Address",
  "Current Address Line 2",
  "Permanent Address",
  "Permanent Address Line 2",
  "Route",
];

export const PERMIT_VEHICLE_FIELDS = [
  "Chassis No",
  "Date of 1st Registration",
  "Seating Capacity",
  "Laden Weight",
  "Maker",
  "Make",
  "Model",
];

export const PERMIT_EXTRA_FIELDS = [
  "Tracking ID",
  "Renewed Upto",
  "Renewal Application Date",
  "Conditions",
  "Dated",
  "Photo",
];

export const PERMIT_ALL_FIELDS = [
  ...PERMIT_PREVIEW_FIELDS,
  ...PERMIT_VEHICLE_FIELDS,
  ...PERMIT_EXTRA_FIELDS,
];

export const PERMIT_DATE_FIELDS = [
  "Issue Date",
  "Expiry Date",
  "Date of 1st Registration",
  "Renewed Upto",
  "Renewal Application Date",
  "Dated",
];

export const PERMIT_REQUIRED_FIELDS = [
  "Route Permit No",
  "Permit Holder",
  "Vehicle Registration No",
  "Issue Date",
  "Expiry Date",
];

export const PERMIT_FORM_SECTIONS = [
  {
    title: "Permit",
    desc: "Permit number, type, and validity",
    fields: ["Route Permit No", "Tracking ID", "Permit Type", "Issue Date", "Expiry Date", "Dated"],
  },
  {
    title: "Permit holder",
    desc: "Name, father, CNIC, and contact",
    fields: ["Permit Holder", "Father Name", "CNIC", "Contact"],
  },
  {
    title: "Address",
    desc: "Current and permanent address",
    fields: [
      "District",
      "Current Address",
      "Current Address Line 2",
      "Permanent Address",
      "Permanent Address Line 2",
    ],
  },
  {
    title: "Vehicle",
    desc: "Registration and vehicle particulars from the paper permit",
    fields: [
      "Vehicle Registration No",
      "Chassis No",
      "Date of 1st Registration",
      "Seating Capacity",
      "Laden Weight",
      "Maker",
      "Make",
      "Model",
    ],
  },
  {
    title: "Route",
    desc: "Authorized route/area and renewal notes",
    fields: ["Route", "Renewed Upto", "Renewal Application Date", "Conditions"],
  },
];

const STORAGE_PREFIX = "dastak:permit:";
const OVERLAY_KEY = "dastak:published-permits-overlay";
const LAST_SAVE_PREFIX = "dastak:permit-last-save:";

const DEFAULT_VALUES = {
  "Route Permit No": "",
  "Tracking ID": "",
  "Permit Holder": "",
  "Father Name": "",
  CNIC: "",
  Contact: "",
  "Issue Date": "",
  "Expiry Date": "",
  "Permit Type": PERMIT_TYPE_OPTIONS[0],
  "Vehicle Registration No": "",
  District: "Peshawar",
  "Current Address": "",
  "Current Address Line 2": "",
  "Permanent Address": "",
  "Permanent Address Line 2": "",
  Route: DEFAULT_PERMIT_ROUTE,
  "Chassis No": "",
  "Date of 1st Registration": "",
  "Seating Capacity": "3",
  "Laden Weight": "",
  Maker: "",
  Make: "",
  Model: "",
  "Renewed Upto": "",
  "Renewal Application Date": "",
  Conditions: "As prescribed in MVO 1965 & MVR 1969.",
  Dated: "",
  Photo: "",
};

let overlayPermits = { version: 1, permits: {} };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addCalendarYears(iso, years) {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const d = new Date(Number(m[1]) + years, Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addCalendarDays(iso, days) {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generatePermitLinkId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 12; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function generatePermitNumber() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const seq = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const number = `PES001PTA${seq}`;
    if (!findPermitTokenByField("Route Permit No", number)) return number;
  }
  return `PES001PTA${String(Date.now()).slice(-8)}`;
}

export function generatePermitTrackingId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(1_000_000 + Math.random() * 9_000_000));
  return `PTA${yy}${mm}${dd}-${seq}`;
}

function readStoredPermit(token) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredPermit(token, payload) {
  localStorage.setItem(`${STORAGE_PREFIX}${token}`, JSON.stringify(payload));
}

function readOverlay() {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return { version: 1, permits: {} };
    const parsed = JSON.parse(raw);
    return { version: 1, permits: parsed?.permits && typeof parsed.permits === "object" ? parsed.permits : {} };
  } catch {
    return { version: 1, permits: {} };
  }
}

function writeOverlay(map) {
  overlayPermits = map;
  try {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

function ingestPermit(token, payload) {
  const next = readOverlay();
  next.permits[token] = {
    status: payload?.status || "Issued",
    values: { ...(payload?.values || {}) },
    updatedAt: new Date().toISOString(),
  };
  writeOverlay(next);
}

export function listSavedPermitTokens() {
  const tokens = new Set();
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) tokens.add(key.slice(STORAGE_PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  Object.keys(readOverlay().permits).forEach((token) => tokens.add(token));
  Object.keys(overlayPermits.permits || {}).forEach((token) => tokens.add(token));
  return [...tokens];
}

export function defaultPermitValues() {
  return { ...DEFAULT_VALUES };
}

export function newPermitTemplate() {
  const issue = todayIsoDate();
  const expiry = addCalendarYears(issue, 3);
  return {
    status: "Issued",
    values: {
      ...DEFAULT_VALUES,
      "Route Permit No": generatePermitNumber(),
      "Tracking ID": generatePermitTrackingId(),
      "Issue Date": issue,
      "Expiry Date": expiry,
      "Renewed Upto": expiry,
      "Renewal Application Date": addCalendarDays(expiry, -30),
      Dated: issue,
    },
  };
}

export function getPermitForEdit(token) {
  const stored = readStoredPermit(token);
  if (stored?.values) {
    return {
      status: stored.status || "Issued",
      values: { ...DEFAULT_VALUES, ...stored.values },
    };
  }
  const overlay = { ...readOverlay().permits, ...overlayPermits.permits };
  const published = overlay[token];
  if (published?.values) {
    return {
      status: published.status || "Issued",
      values: { ...DEFAULT_VALUES, ...published.values },
    };
  }
  return { status: "Issued", values: { ...DEFAULT_VALUES } };
}

export function isPermitSaved(token) {
  return Boolean(readStoredPermit(token));
}

export function findPermitTokenByField(label, value) {
  const needle = String(value ?? "").trim().toLowerCase();
  if (!needle) return null;
  for (const token of listSavedPermitTokens()) {
    const { values } = getPermitForEdit(token);
    if (String(values[label] ?? "").trim().toLowerCase() === needle) return token;
  }
  return null;
}

export function resolvePermitToken(slug) {
  const id = decodeURIComponent(String(slug ?? "").trim());
  if (!id) return null;
  if (readStoredPermit(id) || readOverlay().permits[id] || overlayPermits.permits[id]) return id;
  return (
    findPermitTokenByField("Tracking ID", id) ||
    findPermitTokenByField("Route Permit No", id) ||
    findPermitTokenByField("Vehicle Registration No", id) ||
    id
  );
}

export function getPublicPermit(slug) {
  const token = resolvePermitToken(slug);
  if (!token) return null;
  const data = getPermitForEdit(token);
  const hasIdentity = String(data.values["Route Permit No"] ?? "").trim() || String(data.values["Permit Holder"] ?? "").trim();
  if (!hasIdentity && !isPermitSaved(token) && !readOverlay().permits[token] && !overlayPermits.permits[token]) {
    return null;
  }
  return { token, status: data.status, values: data.values };
}

export function publicPermitPath(token) {
  return `/routepermits/${encodeURIComponent(token)}`;
}

export function publicPermitLink(token, origin) {
  const site = String(origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${site}${publicPermitPath(token)}`;
}

export function printPermitPath(token) {
  return `/routepermits/${encodeURIComponent(token)}/print`;
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

export function formatPermitDmy(value) {
  const p = isoParts(value);
  if (!p) return String(value ?? "").trim();
  return `${String(p.d).padStart(2, "0")}-${String(p.mo).padStart(2, "0")}-${p.y}`;
}

export function formatPermitRoute(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/\(\s*divisions?\s*\)/i.test(text)) return text;
  return `${text} - (Divisions)`;
}

export function formatPermitLongDate(value) {
  const p = isoParts(value);
  if (!p) return String(value ?? "").trim();
  return `${p.d} ${LONG_MONTHS[p.mo - 1] || ""} ${p.y}`.replace(/\s+/g, " ").trim();
}

export function getPermitPrintData(token) {
  const { values } = getPermitForEdit(token);
  const v = (label) => String(values[label] ?? "").trim();
  const father = v("Father Name");
  const holder = v("Permit Holder");
  const holderLine = father ? `${holder} S/o ${father}` : holder;
  const permitType = v("Permit Type") || "P.Pu.C (Public Carriers Permit)";
  let permitNoLabel = "Permit No";
  if (/P\.?\s*Pu\.?\s*C/i.test(permitType)) permitNoLabel = "P.Pu.C No";
  else if (/P\.?\s*Pr\.?\s*C/i.test(permitType)) permitNoLabel = "P.Pr.C No";
  const addressLine1 = v("Current Address");
  const addressLine2 = v("Current Address Line 2");
  return {
    token,
    permitType,
    permitNoLabel,
    permitNo: v("Route Permit No"),
    holderLine,
    addressLine1,
    addressLine2,
    address: [addressLine1, addressLine2].filter(Boolean).join(" ") || "—",
    registration: v("Vehicle Registration No"),
    chassis: v("Chassis No"),
    firstReg: formatPermitDmy(v("Date of 1st Registration")),
    seating: v("Seating Capacity"),
    ladenWeight: v("Laden Weight"),
    maker: v("Maker"),
    make: v("Make"),
    model: v("Model"),
    route: formatPermitRoute(v("Route")),
    renewedUpto: formatPermitDmy(v("Renewed Upto") || v("Expiry Date")),
    renewalApplication: formatPermitDmy(v("Renewal Application Date")),
    conditions: v("Conditions") || "As prescribed in MVO 1965 & MVR 1969.",
    dated: formatPermitLongDate(v("Dated") || v("Issue Date")),
    previewUrl: publicPermitLink(token),
    previewPath: publicPermitPath(token),
    printPath: printPermitPath(token),
  };
}

export function recordPermitLastSaved(token) {
  if (!token) return;
  try {
    localStorage.setItem(`${LAST_SAVE_PREFIX}${token}`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function readPermitLastSavedIso(token) {
  try {
    return localStorage.getItem(`${LAST_SAVE_PREFIX}${token}`) || "";
  } catch {
    return "";
  }
}

export function listPermitSummaries() {
  return listSavedPermitTokens()
    .map((token) => {
      const { status, values } = getPermitForEdit(token);
      return {
        token,
        holder: values["Permit Holder"] || "—",
        permitNo: values["Route Permit No"] || "—",
        registration: values["Vehicle Registration No"] || "—",
        trackingId: values["Tracking ID"] || "",
        district: values.District || "",
        issueDate: values["Issue Date"] || "",
        expiryDate: values["Expiry Date"] || "",
        status,
        updatedAt: readPermitLastSavedIso(token),
      };
    })
    .sort((a, b) => String(b.updatedAt || b.issueDate).localeCompare(String(a.updatedAt || a.issueDate)));
}

export function readPermitFormValues(form) {
  const status = form.querySelector('[name="status"]')?.value?.trim() || "Issued";
  const values = { ...DEFAULT_VALUES };
  PERMIT_ALL_FIELDS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscapeName(label)}"]`);
    if (!input) return;
    values[label] = input.value?.trim() ?? "";
  });
  ["Maker", "Make", "Laden Weight"].forEach((label) => {
    if (values[label] !== PERMIT_CUSTOM_VALUE) return;
    const custom = form.querySelector(`[name="${cssEscapeName(`${label} custom`)}"]`)?.value?.trim() ?? "";
    values[label] = custom;
  });
  const photo = form.querySelector('[name="Photo"]')?.value?.trim();
  if (photo) values.Photo = photo;
  if (values["Issue Date"] && !values["Expiry Date"]) {
    values["Expiry Date"] = addCalendarYears(values["Issue Date"], 3);
  }
  if (values["Expiry Date"]) {
    if (!values["Renewed Upto"]) values["Renewed Upto"] = values["Expiry Date"];
    if (!values["Renewal Application Date"]) values["Renewal Application Date"] = addCalendarDays(values["Expiry Date"], -30);
  }
  if (values["Issue Date"] && !values.Dated) values.Dated = values["Issue Date"];
  values["Vehicle Registration No"] = String(values["Vehicle Registration No"] ?? "").toUpperCase();
  values["Chassis No"] = String(values["Chassis No"] ?? "").toUpperCase();
  return { status, values };
}

export function validatePermitRequired(values) {
  const missing = PERMIT_REQUIRED_FIELDS.filter((label) => !String(values[label] ?? "").trim());
  return { ok: missing.length === 0, missing };
}

export async function savePermit(token, { status, values }) {
  const payload = { status: status || "Issued", values: { ...values } };
  writeStoredPermit(token, payload);
  ingestPermit(token, payload);
  recordPermitLastSaved(token);
  const published = await upsertPublishedPermit(token, payload);
  return {
    saved: true,
    publishedOnline: Boolean(published?.ok),
    publishVia: published?.reason,
  };
}

export async function deletePermit(token) {
  const id = String(token ?? "").trim();
  if (!id) return { ok: false };
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    localStorage.removeItem(`${LAST_SAVE_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
  const overlay = readOverlay();
  delete overlay.permits[id];
  writeOverlay(overlay);
  const syncKey = getAdminSyncKey();
  if (syncKey) {
    try {
      await fetch(`/api/permit/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "X-Admin-Sync-Key": syncKey },
      });
    } catch {
      /* local delete still counts */
    }
  }
  return { ok: true };
}

export async function upsertPublishedPermit(token, payload) {
  ingestPermit(token, payload);
  const syncKey = getAdminSyncKey();
  if (!syncKey || !token) return { ok: false, reason: "no-key" };
  try {
    const res = await fetch(`/api/permit/${encodeURIComponent(token)}`, {
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

export async function hydratePublicPermit(slug) {
  const needle = decodeURIComponent(String(slug ?? "").trim());
  if (!needle) return;
  try {
    const res = await fetch(`/api/permit/${encodeURIComponent(needle)}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return;
    const data = await res.json();
    if (!data?.values) return;
    ingestPermit(data.token || needle, { status: data.status, values: data.values });
  } catch {
    /* local overlay still used */
  }
}

export async function fetchPermitList() {
  try {
    const res = await fetch("/api/permits?list=1", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return listPermitSummaries();
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return listPermitSummaries();
    const data = await res.json();
    const remote = Array.isArray(data?.items) ? data.items : [];
    const local = listPermitSummaries();
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
    return listPermitSummaries();
  }
}

export function cssEscapeName(value) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

overlayPermits = readOverlay();
