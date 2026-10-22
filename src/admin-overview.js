import {
  buildFitnessTrackingRows,
  mergeAnalyticsRows,
  computeOverviewMetrics,
  dailyActivityBuckets,
  eventsSince,
  getAnalyticsEvents,
  formatEventLabel,
  formatRelativeTime,
} from "./analytics.js";
import { listSavedTokens, getCertificateForEdit, isCertificateSaved } from "./certificates.js";
import { fetchAdminCertificateList } from "./admin-cert-api.js";

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function ovIcon(paths) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function chartDayParts(key) {
  const day = new Date(`${key}T12:00:00`);
  return {
    weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
    date: String(day.getDate()),
  };
}

function breakdownBar(label, count, total, tone) {
  const p = pct(count, total);
  return `
    <div class="admin-ov-breakdown-row">
      <span class="admin-ov-breakdown-label">${escapeHtml(label)}</span>
      <div class="admin-ov-breakdown-track">
        <span class="admin-ov-breakdown-fill admin-ov-tone-${tone}" style="width: ${Math.max(p, count ? 4 : 0)}%"></span>
      </div>
      <span class="admin-ov-breakdown-val">${count}<em>${p}%</em></span>
    </div>
  `;
}

function summaryPills(leftLabel, leftCount, rightLabel, rightCount, leftTone = "ok", rightTone = "warn") {
  return `
    <div class="admin-ov-pills">
      <span class="admin-ov-pill admin-ov-pill-${leftTone}">${escapeHtml(leftLabel)} <strong>${leftCount}</strong></span>
      <span class="admin-ov-pill admin-ov-pill-${rightTone}">${escapeHtml(rightLabel)} <strong>${rightCount}</strong></span>
    </div>
  `;
}

export function buildLocalOverviewRows() {
  return buildFitnessTrackingRows(listSavedTokens(), getCertificateForEdit, isCertificateSaved);
}

export function computeRegistryPublishCounts(rows) {
  let live = 0;
  let local = 0;
  for (const row of rows) {
    if (row.fromServer) live += 1;
    else if (row.saved) local += 1;
  }
  const pending = Math.max(0, rows.length - live - local);
  return { live, pending, local };
}

function countByStatus(rows) {
  const map = {};
  for (const row of rows) {
    const s = row.certStatus || "Issued";
    map[s] = (map[s] || 0) + 1;
  }
  return map;
}

function countByFitness(rows) {
  const buckets = { active: 0, expiring: 0, renewal: 0, expired: 0, unknown: 0 };
  for (const row of rows) {
    const d = row.daysLeft;
    if (d == null) buckets.unknown += 1;
    else if (d < 0) buckets.expired += 1;
    else if (d <= 30) buckets.expiring += 1;
    else if (d <= 90) buckets.renewal += 1;
    else buckets.active += 1;
  }
  return buckets;
}

function renderActivityChartOverview(buckets) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const hasData = buckets.some((b) => b.total > 0);
  if (!hasData) {
    return `
      <div class="admin-ov-empty">
        <span class="admin-ov-empty-icon">${ovIcon(`<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/>`)}</span>
        <p>No public views or prints in the last 7 days.</p>
      </div>
    `;
  }
  const bars = buckets
    .map((b) => {
      const stackH = Math.round((b.total / max) * 100);
      const viewH = b.total ? Math.round((b.views / b.total) * 100) : 0;
      const printH = 100 - viewH;
      const parts = chartDayParts(b.key);
      return `
        <div class="admin-ov-chart-col" title="${escapeHtml(b.label)}: ${b.total} events">
          <span class="admin-ov-chart-count">${b.total || ""}</span>
          <div class="admin-ov-chart-stack" style="height: ${Math.max(stackH, b.total ? 8 : 2)}%">
            <span class="admin-ov-chart-seg admin-ov-chart-prints" style="flex: ${printH}"></span>
            <span class="admin-ov-chart-seg admin-ov-chart-views" style="flex: ${viewH}"></span>
          </div>
          <span class="admin-ov-chart-label"><strong>${escapeHtml(parts.weekday)}</strong>${escapeHtml(parts.date)}</span>
        </div>
      `;
    })
    .join("");
  return `<div class="admin-ov-chart-bars">${bars}</div>`;
}

export function renderAdminOverviewPage(rows) {
  const eventsWindow = eventsSince(7);
  const metrics = computeOverviewMetrics(rows, eventsWindow);
  const publish = computeRegistryPublishCounts(rows);
  const total = Math.max(metrics.total, rows.length);
  const fitness = countByFitness(rows);
  const fitnessTotal = Math.max(1, rows.length);
  const statusMap = countByStatus(rows);
  const statusTotal = Math.max(1, rows.length);
  const buckets = dailyActivityBuckets(7);
  const recent = getAnalyticsEvents(12);

  const statusRows = Object.entries(statusMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const expiringList = [...rows]
    .filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30)
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    .slice(0, 5);

  const activityHtml = recent
    .map(
      (event) => `
      <li class="admin-ov-activity-item">
        <span class="admin-ov-activity-dot" aria-hidden="true"></span>
        <div>
          <p class="admin-ov-activity-title">${escapeHtml(formatEventLabel(event))}</p>
          <p class="admin-ov-activity-meta">${escapeHtml([event.trackingId, event.token].filter(Boolean).join(" · ") || "—")}</p>
        </div>
        <time>${formatRelativeTime(event.at)}</time>
      </li>`
    )
    .join("");

  const attentionBits = [];
  if (fitness.expiring) attentionBits.push(`${fitness.expiring} expiring within 30 days`);
  if (fitness.expired) attentionBits.push(`${fitness.expired} already expired`);
  const attentionHtml = attentionBits.length
    ? `
      <a class="admin-ov-attention" href="/admin/dashboard?view=registry">
        <span class="admin-ov-attention-icon" aria-hidden="true">${ovIcon(`<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`)}</span>
        <span class="admin-ov-attention-copy"><strong>Fitness needs attention.</strong> ${escapeHtml(attentionBits.join(" · "))}.</span>
        <span class="admin-ov-attention-go">Review registry</span>
      </a>`
    : "";

  const emptyState = (text) => `
    <li class="admin-ov-empty-row">
      <span>${escapeHtml(text)}</span>
    </li>`;

  return `
    <div id="admin-overview-page" class="admin-overview-page">
      <div class="admin-ov-head">
        <div>
          <p class="admin-ov-greet">${greetingLabel()}</p>
          <p class="admin-ov-date">${todayLabel()}</p>
        </div>
        <div class="admin-ov-shortcuts">
          <a class="admin-ov-shortcut" href="/admin/dashboard?view=registry">
            <span class="admin-ov-shortcut-icon">${ovIcon(`<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>`)}</span>
            <span>
              <strong>Registry</strong>
              <em>Search and open records</em>
            </span>
          </a>
          <a class="admin-ov-shortcut" href="/admin/dashboard?view=analytics">
            <span class="admin-ov-shortcut-icon">${ovIcon(`<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/>`)}</span>
            <span>
              <strong>Analytics</strong>
              <em>Views, prints, expiry</em>
            </span>
          </a>
        </div>
      </div>

      ${attentionHtml}

      <div class="admin-ov-summary-grid">
        <a class="admin-ov-summary-card admin-ov-card-teal" href="/admin/dashboard?view=registry">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>`)}</span>
            <p class="admin-ov-summary-label">Total certificates</p>
          </div>
          <p class="admin-ov-summary-value" id="admin-ov-total">${total}</p>
          <p class="admin-ov-summary-sub">Live site plus local drafts</p>
          ${summaryPills("Live", publish.live, "Local / pending", publish.pending + publish.local, "ok", "warn")}
        </a>
        <a class="admin-ov-summary-card admin-ov-card-green" href="/admin/dashboard?view=analytics">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>`)}</span>
            <p class="admin-ov-summary-label">Fit to operate</p>
          </div>
          <p class="admin-ov-summary-value">${fitness.active + fitness.renewal}</p>
          <p class="admin-ov-summary-sub">Active and 31–90 day renewal window</p>
          ${summaryPills("Expiring ≤30d", fitness.expiring, "Expired", fitness.expired, "warn", "danger")}
        </a>
        <a class="admin-ov-summary-card admin-ov-card-orange" href="/admin/dashboard?view=analytics">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`)}</span>
            <p class="admin-ov-summary-label">Public activity</p>
          </div>
          <p class="admin-ov-summary-value">${metrics.views7d + metrics.prints7d}</p>
          <p class="admin-ov-summary-sub">Last 7 days on this device</p>
          ${summaryPills("Views", metrics.views7d, "Prints / PDF", metrics.prints7d, "info", "warn")}
        </a>
      </div>

      <div class="admin-ov-breakdown-grid">
        <section class="admin-ov-panel">
          <div class="admin-ov-panel-head">
            <div>
              <h3 class="admin-ov-panel-title">Fitness breakdown</h3>
              <p class="admin-ov-panel-desc">By expiry timeline</p>
            </div>
          </div>
          ${breakdownBar("Active (>90 days)", fitness.active, fitnessTotal, "ok")}
          ${breakdownBar("Renewal window (31–90d)", fitness.renewal, fitnessTotal, "info")}
          ${breakdownBar("Expiring ≤30 days", fitness.expiring, fitnessTotal, "warn")}
          ${breakdownBar("Expired", fitness.expired, fitnessTotal, "danger")}
          ${breakdownBar("Unknown expiry", fitness.unknown, fitnessTotal, "muted")}
        </section>
        <section class="admin-ov-panel">
          <div class="admin-ov-panel-head">
            <div>
              <h3 class="admin-ov-panel-title">Certificate status</h3>
              <p class="admin-ov-panel-desc">Workflow / record status</p>
            </div>
          </div>
          ${
            statusRows.length
              ? statusRows
                  .map(([label, count], i) =>
                    breakdownBar(label, count, statusTotal, ["ok", "info", "warn", "danger", "muted", "muted"][i] || "muted")
                  )
                  .join("")
              : breakdownBar("Issued", 0, 1, "muted")
          }
        </section>
      </div>

      <section class="admin-ov-panel admin-ov-chart-panel">
        <div class="admin-ov-chart-head">
          <div>
            <h3 class="admin-ov-panel-title">Last 7 days</h3>
            <p class="admin-ov-panel-desc">Certificate views and print / PDF opens on this browser</p>
          </div>
          <ul class="admin-ov-chart-legend">
            <li><span class="admin-ov-legend-dot admin-ov-chart-views"></span> Views</li>
            <li><span class="admin-ov-legend-dot admin-ov-chart-prints"></span> Prints</li>
          </ul>
        </div>
        ${renderActivityChartOverview(buckets)}
      </section>

      <div class="admin-ov-bottom-grid">
        <section class="admin-ov-panel">
          <div class="admin-ov-panel-head">
            <div>
              <h3 class="admin-ov-panel-title">Recent activity</h3>
              <p class="admin-ov-panel-desc">Latest events on this device</p>
            </div>
            <a class="admin-ov-link-more" href="/admin/dashboard?view=analytics">Analytics</a>
          </div>
          <ul class="admin-ov-activity-list">${activityHtml || emptyState("No events yet — previews and prints will appear here.")}</ul>
        </section>
        <section class="admin-ov-panel">
          <div class="admin-ov-panel-head">
            <div>
              <h3 class="admin-ov-panel-title">Expiring soon</h3>
              <p class="admin-ov-panel-desc">Within the next 30 days</p>
            </div>
            <a class="admin-ov-link-more" href="/admin/dashboard?view=registry">Registry</a>
          </div>
          <ul class="admin-ov-expiring-list">
            ${
              expiringList
                .map(
                  (r) => `
              <li>
                <a href="/admin/dashboard?token=${encodeURIComponent(r.token)}">
                  <span>
                    <strong>${escapeHtml(r.applicant)}</strong>
                    <em>${escapeHtml(r.trackingId)}</em>
                  </span>
                  <span class="admin-ov-days-chip">${r.daysLeft}d</span>
                </a>
              </li>`
                )
                .join("") || emptyState("No certificates expiring in the next 30 days.")
            }
          </ul>
        </section>
      </div>
    </div>
  `;
}

export async function fetchOverviewRowsMerged() {
  const localRows = buildLocalOverviewRows();
  try {
    const data = await fetchAdminCertificateList({ page: 1, limit: 100, filters: {} });
    const merged = mergeAnalyticsRows(localRows, data?.items ?? []);
    return { rows: merged, listItems: data?.items ?? [] };
  } catch {
    return { rows: localRows, listItems: [] };
  }
}
