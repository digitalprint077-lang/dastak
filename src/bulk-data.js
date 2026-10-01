import { saveCertificate, listSavedTokens, getCertificateForEdit, isCertificateSaved, FOLLOW_TOKEN } from "./certificates.js";

export function exportCertificatesJson() {
  const certificates = {};
  for (const token of listSavedTokens()) {
    if (!isCertificateSaved(token) && token !== FOLLOW_TOKEN) continue;
    const data = getCertificateForEdit(token);
    certificates[token] = { status: data.status, values: { ...data.values } };
  }
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      certificates,
    },
    null,
    2
  );
}

export function importCertificatesJson(text) {
  const parsed = JSON.parse(text);
  const map = parsed.certificates || parsed;
  if (!map || typeof map !== "object") throw new Error("Invalid backup format");
  let count = 0;
  for (const [token, payload] of Object.entries(map)) {
    if (!token || !payload?.values) continue;
    saveCertificate(token, {
      status: payload.status || "Issued",
      values: payload.values,
    });
    count += 1;
  }
  return count;
}

const CSV_COLUMNS = [
  "token",
  "status",
  "Tracking ID",
  "Certificate Number",
  "Applicant Name",
  "District",
  "Application Status",
  "Issue Date",
  "Expiry Date",
];

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCertificatesCsv() {
  const rows = [CSV_COLUMNS.join(",")];
  for (const token of listSavedTokens()) {
    const { status, values } = getCertificateForEdit(token);
    const line = [token, status, ...CSV_COLUMNS.slice(2).map((col) => values[col] ?? "")];
    rows.push(line.map(csvEscape).join(","));
  }
  return rows.join("\n");
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function importCertificatesCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV has no data rows");
  const header = parseCsvLine(lines[0]);
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(header.map((h, idx) => [h.trim(), cols[idx] ?? ""]));
    const token = row.token?.trim();
    if (!token) continue;
    const values = { ...getCertificateForEdit(token).values };
    CSV_COLUMNS.slice(2).forEach((key) => {
      if (row[key] != null && String(row[key]).trim()) values[key] = String(row[key]).trim();
    });
    saveCertificate(token, {
      status: row.status?.trim() || "Issued",
      values,
    });
    count += 1;
  }
  return count;
}

export function downloadTextFile(filename, content, mime = "application/json") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
