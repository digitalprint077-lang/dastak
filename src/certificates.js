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
};

export const certificates = {
  [FOLLOW_TOKEN]: {
    status: "Issued",
    fields: FIELD_LABELS.map((label) => [label, DEFAULT_VALUES[label]]),
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
  return {
    status: stored.status || "Issued",
    fields: FIELD_LABELS.map((label) => [label, stored.values?.[label] ?? ""]),
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
  FIELD_LABELS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    values[label] = input?.value?.trim() ?? "";
  });
  return { status, values };
}

export function fillForm(form, { status, values }) {
  const statusEl = form.querySelector('[name="status"]');
  if (statusEl) statusEl.value = status ?? "Issued";
  FIELD_LABELS.forEach((label) => {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    if (input) input.value = values?.[label] ?? "";
  });
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
