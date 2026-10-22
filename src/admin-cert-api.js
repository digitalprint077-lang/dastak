import { DISTRICT_OPTIONS, CERTIFICATE_STATUS_OPTIONS } from "./certificates.js";

export const CERT_LIST_PAGE_KEY = "dastak:cert-list-page";
export const CERT_LIST_FILTERS_KEY = "dastak:cert-list-filters";

const DEFAULT_FILTERS = {
  q: "",
  district: "",
  status: "",
  expiring: "",
  sort: "issue-desc",
  quick: "",
};

export function readCertListFilters() {
  try {
    const raw = sessionStorage.getItem(CERT_LIST_FILTERS_KEY);
    if (!raw) return { ...DEFAULT_FILTERS };
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function writeCertListFilters(filters) {
  sessionStorage.setItem(CERT_LIST_FILTERS_KEY, JSON.stringify(filters));
}

export function readCertListPage() {
  const page = parseInt(sessionStorage.getItem(CERT_LIST_PAGE_KEY) || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function writeCertListPage(page) {
  sessionStorage.setItem(CERT_LIST_PAGE_KEY, String(Math.max(1, page)));
}

export async function fetchAdminCertificateList({ page = 1, limit = 25, filters = {} } = {}) {
  const params = new URLSearchParams({
    list: "1",
    page: String(page),
    limit: String(limit),
  });
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.district?.trim()) params.set("district", filters.district.trim());
  if (filters.status?.trim()) params.set("status", filters.status.trim());
  if (filters.expiring?.trim()) params.set("expiring", filters.expiring.trim());
  if (filters.sort?.trim()) params.set("sort", filters.sort.trim());

  const res = await fetch(`/api/certificates?${params}`, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error("list_failed");
  return res.json();
}

export function districtFilterOptionsHtml(selected) {
  const opts = ['<option value="">All districts</option>']
    .concat(
      DISTRICT_OPTIONS.map(
        (d) => `<option value="${d}"${d === selected ? " selected" : ""}>${d}</option>`
      )
    )
    .join("");
  return opts;
}

export function statusFilterOptionsHtml(selected) {
  const opts = ['<option value="">All statuses</option>']
    .concat(
      CERTIFICATE_STATUS_OPTIONS.map(
        (s) => `<option value="${s}"${s === selected ? " selected" : ""}>${s}</option>`
      )
    )
    .join("");
  return opts;
}
