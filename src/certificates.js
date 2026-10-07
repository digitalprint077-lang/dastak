import { certificatePayloadMatchesSlug, decodeCertificateUrlHash } from "./cert-url-hash.js";
import {
  buildPublishedBundle,
  buildFullPublishBundle,
  findPublishedEntry,
  findPublishedEntryPublic,
  findDeployedPublishedEntry,
  getMergedPublishedMap,
  hydrateCertificateFromApi,
  registerBuiltInCertificates,
  downloadIndividualCertFile,
  syncPublishedCertificates,
  upsertPublishedCertificate,
} from "./publish.js";

export {
  buildFullPublishBundle,
  buildPublishedBundle,
  downloadIndividualCertFile,
  downloadPublishedBundle,
  ensurePublishedLoaded,
  findPublishedEntryPublic,
  findDeployedPublishedEntry,
  hydrateCertificateFromApi,
  hydrateCertificateFromStatic,
  hydratePublicCertificate,
  loadPublishedCertificates,
  refreshPublishedCertificates,
} from "./publish.js";

export const FOLLOW_TOKEN = "TvALy858l8Oc";

export const FIELD_LABELS = [
  "Certificate Number",
  "Tracking ID",
  "Applicant Name",
  "Father Name",
  "Registration Number",
  "Chassis Number",
  "Engine Number",
  "Vehicle Kind",
  "Issue Date",
  "Expiry Date",
  "Service",
  "District",
  "Application Status",
];

export const PRINT_FIELD_LABELS = [
  "Certificate Type",
  "Vehicle Model",
  "Registered Laden Weight",
  "Seating Capacity",
  "Vehicle Fuel Type",
  "Amount",
  "Amount In Words",
  "Renewal From",
  "Renewal To",
];

export const ALL_FIELD_LABELS = [...FIELD_LABELS, ...PRINT_FIELD_LABELS];

export const DATE_FIELD_LABELS = ["Issue Date", "Expiry Date", "Renewal From", "Renewal To"];

export const CERTIFICATE_STATUS_OPTIONS = ["Issued", "Pending", "Under Review", "Revoked", "Expired"];

export const APPLICATION_STATUS_OPTIONS = [
  "Application Submitted",
  "Under Review",
  "Exam Scheduled",
  "Certificate Ready - Available for Download",
  "Rejected",
  "On Hold",
];

/** Vehicle fitness certificates are valid for six months from issue date. */
export const CERTIFICATE_VALIDITY_MONTHS = 6;

const DEFAULT_VALUES = {
  "Certificate Number": "PES001VF00000236",
  "Tracking ID": "VF260921-0000885",
  "Applicant Name": "Fahad Jahanzaib Maqsood",
  "Father Name": "Maqsood Ahmad",
  "Registration Number": "Z 1931",
  "Chassis Number": "FD2JPB-10382",
  "Engine Number": "J08CB23642",
  "Vehicle Kind": "HTV",
  "Issue Date": "2026-09-21",
  "Expiry Date": "2027-03-21",
  Service: "Renewal",
  District: "Peshawar",
  "Application Status": "Certificate Ready - Available for Download",
  "Certificate Type": "RENEWAL",
  "Vehicle Model": "2012",
  "Registered Laden Weight": "0.00",
  "Seating Capacity": "16",
  "Vehicle Fuel Type": "PETROL",
  Amount: "1500",
  "Amount In Words": "ONE THOUSAND FIVE HUNDRED ONLY",
  "Renewal From": "",
  "Renewal To": "",
};

export const certificates = {
  [FOLLOW_TOKEN]: {
    status: "Issued",
    fields: ALL_FIELD_LABELS.map((label) => [label, DEFAULT_VALUES[label]]),
  },
};

const STORAGE_PREFIX = "dastak:cert:";

function readStoredPayload(token) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function readBuiltInPayload(token) {
  if (!certificates[token]) return null;
  return {
    status: certificates[token].status,
    values: Object.fromEntries(certificates[token].fields),
  };
}

export function publicSiteOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function publicQrSlug(token) {
  const { values } = getCertificateForEdit(token);
  const tracking = String(values["Tracking ID"] ?? "").trim();
  return tracking || token;
}

export function followPathPublic(token = FOLLOW_TOKEN) {
  return `/vehiclefitness/${encodeURIComponent(publicQrSlug(token))}`;
}

/** Full public verify URL — used for Preview, Copy link, and QR (must match). */
export function followLinkPublic(origin = publicSiteOrigin(), token = FOLLOW_TOKEN) {
  const site = (origin || publicSiteOrigin()).replace(/\/$/, "");
  return `${site}${followPathPublic(token)}`;
}

/** @deprecated alias */
export function followLinkPublicShort(origin = publicSiteOrigin(), token = FOLLOW_TOKEN) {
  return followLinkPublic(origin, token);
}

export function resolveCertificateToken(slug) {
  const id = decodeURIComponent(String(slug ?? "").trim());
  if (!id) return null;
  if (readStoredPayload(id) || readBuiltInPayload(id)) return id;
  const published = findPublishedEntry(id);
  if (published) return published.token;
  for (const token of listSavedTokens()) {
    const { values } = getCertificateForEdit(token);
    if (String(values["Tracking ID"] ?? "").trim() === id) return token;
    if (String(values["Certificate Number"] ?? "").trim() === id) return token;
  }
  return id;
}

function certificateFromTokenKey(token) {
  const stored = readStoredPayload(token);
  if (stored) return certificateFromStored(stored);
  if (certificates[token]) return certificates[token];
  const published = findPublishedEntry(token);
  if (published?.payload) return certificateFromStored(published.payload);
  return null;
}

export function defaultCertificate() {
  return {
    status: "Issued",
    values: { ...DEFAULT_VALUES },
  };
}

export function generateCertificateNumber() {
  for (let attempt = 0; attempt < 24; attempt++) {
    const seq = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const number = `PES001VF${seq}`;
    if (!findTokenByField("Certificate Number", number)) return number;
  }
  return `PES001VF${String(Date.now()).slice(-8)}`;
}

export function generateTrackingId() {
  for (let attempt = 0; attempt < 24; attempt++) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const seq = String(Math.floor(1_000_000 + Math.random() * 9_000_000));
    const id = `VF${yy}${mm}${dd}-${seq}`;
    if (!findTokenByField("Tracking ID", id)) return id;
  }
  return `VF${Date.now()}`;
}

const NEW_CERT_EMPTY_FIELDS = [
  "Applicant Name",
  "Father Name",
  "District",
  "Registration Number",
  "Chassis Number",
  "Engine Number",
];

/** Fresh template for admin “New certificate” (unique cert # and tracking ID). */
export function newCertificateTemplate() {
  const values = {
    ...DEFAULT_VALUES,
    "Certificate Number": generateCertificateNumber(),
    "Tracking ID": generateTrackingId(),
  };
  NEW_CERT_EMPTY_FIELDS.forEach((label) => {
    values[label] = "";
  });
  const issue = todayIsoDate();
  values["Issue Date"] = issue;
  values["Expiry Date"] = expiryFromIssueDate(issue);
  return {
    status: "Issued",
    values,
  };
}

export function certificateFromStored(stored) {
  const merged = { ...DEFAULT_VALUES, ...(stored.values || {}) };
  return {
    status: stored.status || "Issued",
    fields: ALL_FIELD_LABELS.map((label) => [label, merged[label] ?? ""]),
  };
}

function certificateFromUrlHash(slug) {
  const payload = decodeCertificateUrlHash();
  if (!payload || !certificatePayloadMatchesSlug(payload, slug)) return null;
  return certificateFromStored({ status: payload.status, values: payload.values });
}

function certificateFromPublicTokenKey(token) {
  const builtIn = readBuiltInPayload(token);
  if (builtIn) return certificateFromStored(builtIn);
  if (certificates[token]) return certificates[token];
  const published = findPublishedEntryPublic(token);
  if (published?.payload) return certificateFromStored(published.payload);
  const stored = readStoredPayload(token);
  if (stored) return certificateFromStored(stored);
  return null;
}

function publicSlugVariants(slug) {
  const raw = String(slug ?? "").trim();
  if (!raw) return [];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const normalized = decoded.replace(/\u2212/g, "-").replace(/\s+/g, "");
  return [...new Set([raw, decoded, normalized].filter(Boolean))];
}

export function resolvePublicCertificateToken(slug) {
  for (const id of publicSlugVariants(slug)) {
    if (readBuiltInPayload(id)) return id;
    const published = findPublishedEntryPublic(id);
    if (published) return published.token;
    if (readStoredPayload(id)) return id;
    for (const token of listSavedTokens()) {
      const { values } = getCertificateForEdit(token);
      if (String(values["Tracking ID"] ?? "").trim() === id) return token;
      if (String(values["Certificate Number"] ?? "").trim() === id) return token;
    }
  }
  const last = publicSlugVariants(slug).pop();
  return last ?? null;
}

/** Verify / QR — published bundle, static files, then saved cert on this device. */
export function getPublicCertificate(tokenOrSlug) {
  if (!tokenOrSlug) return null;
  const fromHash = certificateFromUrlHash(tokenOrSlug);
  if (fromHash) return fromHash;

  if (typeof window !== "undefined") {
    const queryToken = new URLSearchParams(window.location.search).get("t")?.trim();
    if (queryToken) {
      const fromQuery = certificateFromPublicTokenKey(queryToken);
      if (fromQuery) return fromQuery;
    }
  }

  for (const variant of publicSlugVariants(tokenOrSlug)) {
    const resolved = resolvePublicCertificateToken(variant) || variant;
    const cert =
      certificateFromPublicTokenKey(resolved) || certificateFromPublicTokenKey(variant);
    if (cert) return cert;
  }
  return null;
}

export function getCertificate(tokenOrSlug) {
  if (!tokenOrSlug) return null;
  const fromHash = certificateFromUrlHash(tokenOrSlug);
  if (fromHash) return fromHash;

  if (typeof window !== "undefined") {
    const queryToken = new URLSearchParams(window.location.search).get("t")?.trim();
    if (queryToken) {
      const fromQuery = certificateFromTokenKey(queryToken);
      if (fromQuery) return fromQuery;
    }
  }

  const resolved = resolveCertificateToken(tokenOrSlug) || tokenOrSlug;
  return certificateFromTokenKey(resolved) || certificateFromTokenKey(tokenOrSlug);
}

export async function saveCertificate(token, { status, values }) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${token}`,
    JSON.stringify({ status, values })
  );
  const bundle = buildFullPublishBundle(() =>
    listSavedTokens().map((t) => {
      const { status, values } = getCertificateForEdit(t);
      return { token: t, payload: { status, values } };
    })
  );
  const upsertResult = await upsertPublishedCertificate(token, { status, values });
  const syncResult = upsertResult?.ok
    ? upsertResult
    : await syncPublishedCertificates(bundle);
  const publishedOk = Boolean(upsertResult?.ok || syncResult?.ok);
  const publishVia = upsertResult?.ok ? upsertResult.reason : syncResult?.reason;
  return {
    saved: true,
    publishedOnline: publishedOk,
    publishVia,
    syncResult,
    upsertResult,
  };
}

export function deleteCertificate(token) {
  localStorage.removeItem(`${STORAGE_PREFIX}${token}`);
}

export function listSavedTokens() {
  const tokens = new Set([FOLLOW_TOKEN]);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      tokens.add(key.slice(STORAGE_PREFIX.length));
    }
  }
  return [...tokens];
}

export function findTokenByField(label, value) {
  const needle = String(value ?? "").trim();
  if (!needle) return null;
  for (const token of listSavedTokens()) {
    const { values } = getCertificateForEdit(token);
    if (String(values[label] ?? "").trim() === needle) return token;
  }
  for (const [token, payload] of Object.entries(getMergedPublishedMap())) {
    if (String(payload?.values?.[label] ?? "").trim() === needle) return token;
  }
  return null;
}

export function isCertificateSaved(token) {
  return localStorage.getItem(`${STORAGE_PREFIX}${token}`) != null;
}

export function generateLinkId() {
  const part = Math.random().toString(36).slice(2, 10);
  return `VF${Date.now().toString(36).slice(-4)}${part}`.slice(0, 16);
}

export function getCertificateSummary(token) {
  const data = getCertificateForEdit(token);
  return {
    token,
    status: data.status,
    applicant: data.values["Applicant Name"] || "—",
    certificateNumber: data.values["Certificate Number"] || "—",
    saved: isCertificateSaved(token),
  };
}

export function getCertificateForEdit(token) {
  const cert = getCertificate(token);
  if (cert) {
    return {
      status: cert.status,
      values: Object.fromEntries(cert.fields),
    };
  }
  return defaultCertificate();
}

export function readFormValues(form) {
  const status = form.querySelector('[name="status"]')?.value?.trim() || "Issued";
  const values = {};
  ALL_FIELD_LABELS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    values[label] = input?.value?.trim() ?? "";
  });
  applyCertificateValidity(values);
  return { status, values };
}

export function fillForm(form, { status, values }) {
  const statusEl = form.querySelector('[name="status"]');
  if (statusEl) statusEl.value = status ?? "Issued";
  ALL_FIELD_LABELS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    if (!input) return;
    const raw = values?.[label] ?? "";
    input.value = DATE_FIELD_LABELS.includes(label) ? toDateInputValue(raw) : raw;
  });
}

const PRINT_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Normalize stored date strings for HTML date inputs (YYYY-MM-DD). */
export function toDateInputValue(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{2})-([A-Z]{3})-(\d{2})$/);
  if (dmy) {
    const monthIdx = PRINT_MONTHS.indexOf(dmy[2]);
    if (monthIdx >= 0) {
      const year = 2000 + Number(dmy[3]);
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${dmy[1]}`;
    }
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIsoDate() {
  return toDateInputValue(new Date().toISOString().slice(0, 10));
}

/** Expiry date = issue date + {@link CERTIFICATE_VALIDITY_MONTHS} months (calendar). */
export function expiryFromIssueDate(issueValue) {
  const iso = toDateInputValue(issueValue);
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + CERTIFICATE_VALIDITY_MONTHS);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function applyCertificateValidity(values) {
  if (!values || !values["Issue Date"]) return values;
  values["Expiry Date"] = expiryFromIssueDate(values["Issue Date"]);
  return values;
}

export function formatPrintDate(value) {
  if (!value) return "—";
  if (/^\d{2}-[A-Z]{3}-\d{2}$/.test(value)) return value;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const day = iso[3];
    const month = PRINT_MONTHS[Number(iso[2]) - 1] || "JAN";
    const year = iso[1].slice(-2);
    return `${day}-${month}-${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = PRINT_MONTHS[parsed.getMonth()];
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function printPath(token) {
  return `/vehiclefitness/${token}/print`;
}

/** Split amount words before HUNDRED ONLY for A4 print (FIVE stays on line 1). */
export function formatAmountPrintLines(amount, amountWords) {
  const num = String(amount ?? "").trim();
  const words = String(amountWords ?? "").trim();
  if (num && words) {
    const split = words.match(/^(.+?\bFIVE)\s+(HUNDRED\s+ONLY)\s*$/i);
    if (split) {
      return { line1: `${num} (${split[1]}`, line2: split[2] };
    }
    return { line1: `${num} (${words})`, line2: null };
  }
  const fallback = num || words || "—";
  return { line1: fallback, line2: null };
}

export function getPrintData(token, origin = publicSiteOrigin()) {
  const { values } = getCertificateForEdit(token);
  const v = (key) => values[key] || "";
  const district = v("District") || "Peshawar";
  const renewalFrom = v("Renewal From") || formatPrintDate(v("Issue Date"));
  const renewalTo = v("Renewal To") || formatPrintDate(v("Expiry Date"));
  const amount = v("Amount");
  const amountWords = v("Amount In Words");
  const amountPrint = formatAmountPrintLines(amount, amountWords);
  const amountLine =
    amountPrint.line2 != null
      ? `${amountPrint.line1} ${amountPrint.line2})`
      : amountPrint.line1;

  return {
    applicationId: v("Tracking ID") || "—",
    certificateNo: v("Certificate Number") || "—",
    vehicleNo: v("Registration Number") || "—",
    expiry: formatPrintDate(v("Expiry Date")),
    renewalFrom,
    renewalTo,
    engine: v("Engine Number") || "—",
    chassis: v("Chassis Number") || "—",
    certType: (v("Certificate Type") || v("Service") || "RENEWAL").toUpperCase(),
    vehicleType: v("Vehicle Kind") || "—",
    model: v("Vehicle Model") || "—",
    ladenWeight: v("Registered Laden Weight") || "0.00",
    seating: v("Seating Capacity") || "—",
    fuel: (v("Vehicle Fuel Type") || "—").toUpperCase(),
    amountWords: amountLine,
    amountPrintLine1: amountPrint.line1,
    amountPrintLine2: amountPrint.line2,
    district,
    districtOffice: district,
    printedDate: formatPrintDate(new Date().toISOString().slice(0, 10)),
    previewUrl: followLinkPublic(origin, token),
    previewPath: followPathPublic(token),
  };
}

export function cssEscape(value) {
  return CSS.escape(value);
}

export function followPath(token = FOLLOW_TOKEN) {
  return `/vehiclefitness/${token}`;
}

export function followLink(origin = window.location.origin, token = FOLLOW_TOKEN) {
  return `${origin}${followPath(token)}`;
}

registerBuiltInCertificates(
  Object.fromEntries(
    Object.entries(certificates).map(([token, cert]) => [
      token,
      { status: cert.status, values: Object.fromEntries(cert.fields) },
    ])
  )
);
