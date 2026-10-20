const KV_KEY = "published";

export function emptyBundle() {
  return { version: 1, certificates: {} };
}

export function normalizeBundle(raw) {
  if (!raw || typeof raw !== "object") return emptyBundle();
  const certificates =
    raw.certificates && typeof raw.certificates === "object" ? raw.certificates : {};
  return {
    version: 1,
    updatedAt: raw.updatedAt || null,
    certificates,
  };
}

export function mergeBundles(...bundles) {
  const merged = emptyBundle();
  for (const bundle of bundles) {
    const normalized = normalizeBundle(bundle);
    merged.certificates = { ...merged.certificates, ...normalized.certificates };
    if (normalized.updatedAt) merged.updatedAt = normalized.updatedAt;
  }
  return merged;
}

export async function loadStaticPublished(request, assets) {
  try {
    const url = new URL("/published-certificates.json", request.url);
    const req = new Request(url, { headers: { Accept: "application/json" } });
    const res = assets ? await assets.fetch(req) : await fetch(req);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return null;
    return normalizeBundle(await res.json());
  } catch {
    return null;
  }
}

export async function loadKvBundle(env) {
  if (!env.CERTS_KV) return null;
  try {
    const raw = await env.CERTS_KV.get(KV_KEY);
    if (!raw) return null;
    return normalizeBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function loadD1Bundle(env) {
  try {
    const { d1Configured, d1LoadBundle } = await import("./d1-certificates.js");
    if (!d1Configured(env)) return null;
    return await d1LoadBundle(getD1FromEnv(env));
  } catch {
    return null;
  }
}

function getD1FromEnv(env) {
  return env?.Dastak_binding ?? env?.DB ?? null;
}

export async function loadMerged(env, request) {
  const kvBundle = await loadKvBundle(env);
  const d1Bundle = await loadD1Bundle(env);
  const d1Count = d1Bundle ? Object.keys(d1Bundle.certificates).length : 0;

  // D1 is live source once it has rows — ignore static JSON so deletes stay gone.
  if (d1Count > 0) {
    return mergeBundles(kvBundle, d1Bundle);
  }

  const parts = [];
  const staticBundle = await loadStaticPublished(request, env.ASSETS);
  if (staticBundle) parts.push(staticBundle);
  if (kvBundle) parts.push(kvBundle);
  if (d1Bundle) parts.push(d1Bundle);
  return mergeBundles(...parts);
}

export function findEntry(bundle, slug) {
  const id = decodeURIComponent(String(slug ?? "").trim());
  if (!id) return null;
  if (bundle.certificates[id]) {
    return { token: id, payload: bundle.certificates[id] };
  }
  for (const [token, payload] of Object.entries(bundle.certificates)) {
    const tracking = String(payload?.values?.["Tracking ID"] ?? "").trim();
    const certNo = String(payload?.values?.["Certificate Number"] ?? "").trim();
    if (tracking === id || certNo === id) {
      return { token, payload };
    }
  }
  return null;
}

function daysUntilExpiry(iso) {
  const raw = String(iso ?? "").trim();
  if (!raw) return null;
  const exp = new Date(raw);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp - now) / 86400000);
}

function normalizeRegKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s.\-_/]/g, "");
}

function parseCertListSortTime(row) {
  const issue = String(row.issueDate ?? "").trim();
  if (issue) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(issue) ? `${issue}T12:00:00` : issue;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const tracking = String(row.trackingId ?? "").trim();
  const m = tracking.match(/VF(\d{2})(\d{2})(\d{2})/i);
  if (m) {
    const yy = 2000 + Number(m[1]);
    const mm = Number(m[2]) - 1;
    const dd = Number(m[3]);
    const t = new Date(yy, mm, dd).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function compareCertsNewestFirst(a, b) {
  const byDate = parseCertListSortTime(b) - parseCertListSortTime(a);
  if (byDate !== 0) return byDate;
  return String(b.trackingId ?? b.token ?? "").localeCompare(String(a.trackingId ?? a.token ?? ""));
}

function summarizeEntry(token, payload) {
  const values = payload?.values || {};
  const expiry = String(values["Expiry Date"] ?? "").trim();
  const issueDate = String(values["Issue Date"] ?? "").trim();
  return {
    token,
    status: payload?.status || "Issued",
    applicant: String(values["Applicant Name"] ?? "").trim() || "—",
    registrationNumber: String(values["Registration Number"] ?? "").trim(),
    trackingId: String(values["Tracking ID"] ?? "").trim(),
    certificateNumber: String(values["Certificate Number"] ?? "").trim(),
    district: String(values["District"] ?? "").trim(),
    issueDate,
    expiryDate: expiry,
    daysLeft: daysUntilExpiry(expiry),
  };
}

export function listCertificates(bundle, searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));
  const q = String(searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  const district = String(searchParams.get("district") || "").trim();
  const status = String(searchParams.get("status") || "").trim();
  const expiringDays = parseInt(searchParams.get("expiring") || "0", 10) || 0;

  let items = Object.entries(bundle.certificates).map(([token, payload]) =>
    summarizeEntry(token, payload)
  );

  if (district) {
    items = items.filter((row) => row.district === district);
  }
  if (status) {
    items = items.filter((row) => row.status === status);
  }
  if (expiringDays > 0) {
    items = items.filter(
      (row) => row.daysLeft != null && row.daysLeft >= 0 && row.daysLeft <= expiringDays
    );
  }
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    items = items.filter((row) => {
      const hay = [
        row.applicant,
        row.registrationNumber,
        row.trackingId,
        row.certificateNumber,
        row.token,
        row.district,
      ]
        .join(" ")
        .toLowerCase();
      const regNorm = normalizeRegKey(row.registrationNumber);
      return terms.every((term) => {
        if (hay.includes(term)) return true;
        const compact = normalizeRegKey(term);
        return compact && regNorm.includes(compact);
      });
    });
  }

  items.sort(compareCertsNewestFirst);
  const total = items.length;
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  return {
    version: 1,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: pageItems,
  };
}
