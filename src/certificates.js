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

export function defaultCertificate() {
  return {
    status: "Issued",
    values: { ...DEFAULT_VALUES },
  };
}

export function certificateFromStored(stored) {
  const merged = { ...DEFAULT_VALUES, ...(stored.values || {}) };
  return {
    status: stored.status || "Issued",
    fields: ALL_FIELD_LABELS.map((label) => [label, merged[label] ?? ""]),
  };
}

export function getCertificate(token) {
  if (!token) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (raw) {
      return certificateFromStored(JSON.parse(raw));
    }
  } catch {
    /* ignore corrupt storage */
  }
  return certificates[token] || null;
}

export function saveCertificate(token, { status, values }) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${token}`,
    JSON.stringify({ status, values })
  );
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
  return { status, values };
}

export function fillForm(form, { status, values }) {
  const statusEl = form.querySelector('[name="status"]');
  if (statusEl) statusEl.value = status ?? "Issued";
  ALL_FIELD_LABELS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    if (input) input.value = values?.[label] ?? "";
  });
}

const PRINT_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

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

export function getPrintData(token, origin = window.location.origin) {
  const { values } = getCertificateForEdit(token);
  const v = (key) => values[key] || "";
  const district = v("District") || "Peshawar";
  const renewalFrom = v("Renewal From") || formatPrintDate(v("Issue Date"));
  const renewalTo = v("Renewal To") || formatPrintDate(v("Expiry Date"));
  const amount = v("Amount");
  const amountWords = v("Amount In Words");
  const amountLine =
    amount && amountWords ? `${amount} (${amountWords})` : amount || amountWords || "—";

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
    district,
    districtOffice: district,
    printedDate: formatPrintDate(new Date().toISOString().slice(0, 10)),
    previewUrl: followLink(origin, token),
    previewPath: followPath(token),
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
