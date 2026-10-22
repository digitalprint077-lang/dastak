import { compareCertsNewestFirst } from "./certificates.js";

export const REGISTRY_COLLAPSED_KEY = "dastak:admin-registry-collapsed";
export const A4_PANEL_COLLAPSED_KEY = "dastak:admin-a4-panel-collapsed";
export const LAST_SAVE_PREFIX = "dastak:last-save:";

export function readRegistryCollapsed() {
  try {
    return localStorage.getItem(REGISTRY_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeRegistryCollapsed(collapsed) {
  try {
    localStorage.setItem(REGISTRY_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function recordCertLastSaved(token) {
  if (!token) return;
  try {
    localStorage.setItem(`${LAST_SAVE_PREFIX}${token}`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function formatCertLastSaved(token) {
  try {
    const raw = localStorage.getItem(`${LAST_SAVE_PREFIX}${token}`);
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function formSectionSlug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function renderCertListSkeleton(count = 6) {
  return Array.from({ length: count })
    .map(
      () => `
    <div class="cert-list-skeleton" aria-hidden="true">
      <span class="cert-list-skeleton-avatar"></span>
      <span class="cert-list-skeleton-lines">
        <span class="cert-list-skeleton-line cert-list-skeleton-line-wide"></span>
        <span class="cert-list-skeleton-line"></span>
        <span class="cert-list-skeleton-line cert-list-skeleton-line-short"></span>
      </span>
    </div>`
    )
    .join("");
}

export function sortCertListItems(items, sort) {
  const list = [...items];
  if (sort === "name-asc") {
    list.sort((a, b) =>
      String(a.applicant ?? "").localeCompare(String(b.applicant ?? ""), undefined, { sensitivity: "base" })
    );
    return list;
  }
  if (sort === "expiry-asc") {
    list.sort((a, b) => {
      const da = a.daysLeft ?? 99999;
      const db = b.daysLeft ?? 99999;
      if (da !== db) return da - db;
      return compareCertsNewestFirst(a, b);
    });
    return list;
  }
  list.sort(compareCertsNewestFirst);
  return list;
}

/** @param {(item: object) => boolean} isLive */
export function applyCertQuickFilter(items, quick, isLive) {
  if (!quick) return items;
  if (quick === "local") return items.filter((i) => i.localOnly);
  if (quick === "live") return items.filter((i) => !i.localOnly && isLive(i));
  if (quick === "pending") return items.filter((i) => !i.localOnly && !isLive(i));
  if (quick === "expiring") {
    return items.filter((i) => i.daysLeft != null && i.daysLeft >= 0 && i.daysLeft <= 30);
  }
  return items;
}

export function serializeFormSnapshot(form, readFormValues) {
  if (!form) return "";
  try {
    const payload = readFormValues(form);
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

export function isFormSnapshotDirty(form, baseline, readFormValues) {
  if (!form || !baseline) return false;
  return serializeFormSnapshot(form, readFormValues) !== baseline;
}
