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

function breakdownBar(label, count, total, tone) {
  const p = pct(count, total);
  return `
    <div class="admin-ov-breakdown-row">
      <span class="admin-ov-breakdown-label">${escapeHtml(label)}</span>
      <div class="admin-ov-breakdown-track">
        <span class="admin-ov-breakdown-fill admin-ov-tone-${tone}" style="width: ${Math.max(p, count ? 4 : 0)}%"></span>
      </div>
      <span class="admin-ov-breakdown-val">${count} (${p}%)</span>
    </div>
  `;
}

function summarySplit(okLabel, okCount, waitLabel, waitCount, total) {
  return `
    <div class="admin-ov-summary-splits">
      <span class="admin-ov-split admin-ov-split-ok">${escapeHtml(okLabel)} <strong>${okCount}</strong> (${pct(okCount, total)}%)</span>
      <span class="admin-ov-split admin-ov-split-warn">${escapeHtml(waitLabel)} <strong>${waitCount}</strong> (${pct(waitCount, total)}%)</span>
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
  const bars = buckets
    .map((b) => {
      const stackH = Math.round((b.total / max) * 100);
      const viewH = b.total ? Math.round((b.views / b.total) * 100) : 0;
      const printH = 100 - viewH;
      return `
        <div class="admin-ov-chart-col" title="${escapeHtml(b.label)}: ${b.total} events">
          <div class="admin-ov-chart-stack" style="height: ${stackH}%">
            <span class="admin-ov-chart-seg admin-ov-chart-prints" style="flex: ${printH}"></span>
            <span class="admin-ov-chart-seg admin-ov-chart-views" style="flex: ${viewH}"></span>
          </div>
          <span class="admin-ov-chart-label">${escapeHtml(b.label.replace(",", "").split(" ").slice(0, 2).join(" "))}</span>
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
        <div>
          <p class="admin-ov-activity-title">${escapeHtml(formatEventLabel(event))}</p>
          <p class="admin-ov-activity-meta">${escapeHtml([event.trackingId, event.token].filter(Boolean).join(" · ") || "—")}</p>
        </div>
        <time>${formatRelativeTime(event.at)}</time>
      </li>`
    )
    .join("");

  return `
    <div id="admin-overview-page" class="admin-overview-page">
      <header class="admin-overview-hero">
        <div>
          <p class="admin-overview-kicker">Vehicle fitness · Khyber Pakhtunkhwa</p>
          <h2 class="admin-overview-title">Dashboard</h2>
          <p class="admin-overview-lead">Registry health, publish status, and public activity at a glance.</p>
        </div>
        <div class="admin-overview-hero-actions">
          <a class="btn btn-primary" href="/admin/dashboard?view=registry">Open registry</a>
          <button class="btn btn-ghost" type="button" data-action="admin-create-new">New certificate</button>
        </div>
      </header>

      <div class="admin-ov-summary-grid">
        <article class="admin-ov-summary-card admin-ov-card-blue">
          <div class="admin-ov-summary-icon" aria-hidden="true">📋</div>
          <p class="admin-ov-summary-label">Total certificates</p>
          <p class="admin-ov-summary-value" id="admin-ov-total">${total}</p>
          <p class="admin-ov-summary-sub">In registry (device + live sync)</p>
          ${summarySplit("Live on site", publish.live, "Local / pending", publish.pending + publish.local, total || 1)}
        </article>
        <article class="admin-ov-summary-card admin-ov-card-green">
          <div class="admin-ov-summary-icon" aria-hidden="true">✓</div>
          <p class="admin-ov-summary-label">Fitness status</p>
          <p class="admin-ov-summary-value">${fitness.active + fitness.renewal}</p>
          <p class="admin-ov-summary-sub">Active &amp; renewal window</p>
          ${summarySplit("Expiring ≤30d", fitness.expiring, "Expired", fitness.expired, fitnessTotal)}
        </article>
        <article class="admin-ov-summary-card admin-ov-card-orange">
          <div class="admin-ov-summary-icon" aria-hidden="true">📈</div>
          <p class="admin-ov-summary-label">Public activity</p>
          <p class="admin-ov-summary-value">${metrics.views7d + metrics.prints7d}</p>
          <p class="admin-ov-summary-sub">Last 7 days on this device</p>
          ${summarySplit("Certificate views", metrics.views7d, "Prints / PDF", metrics.prints7d, metrics.views7d + metrics.prints7d || 1)}
        </article>
      </div>

      <div class="admin-ov-breakdown-grid">
        <section class="admin-ov-panel card">
          <h3 class="admin-ov-panel-title">Fitness breakdown</h3>
          <p class="admin-ov-panel-desc">By expiry timeline</p>
          ${breakdownBar("Active (>90 days)", fitness.active, fitnessTotal, "ok")}
          ${breakdownBar("Renewal window (31–90d)", fitness.renewal, fitnessTotal, "info")}
          ${breakdownBar("Expiring ≤30 days", fitness.expiring, fitnessTotal, "warn")}
          ${breakdownBar("Expired", fitness.expired, fitnessTotal, "danger")}
          ${breakdownBar("Unknown expiry", fitness.unknown, fitnessTotal, "muted")}
        </section>
        <section class="admin-ov-panel card">
          <h3 class="admin-ov-panel-title">Certificate status</h3>
          <p class="admin-ov-panel-desc">Workflow / record status</p>
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

      <section class="admin-ov-panel card admin-ov-chart-panel">
        <div class="admin-ov-chart-head">
          <div>
            <h3 class="admin-ov-panel-title">Last 7 days activity</h3>
            <p class="admin-ov-panel-desc">Views and print/PDF opens tracked in this browser</p>
          </div>
          <ul class="admin-ov-chart-legend">
            <li><span class="admin-ov-legend-dot admin-ov-chart-views"></span> Views</li>
            <li><span class="admin-ov-legend-dot admin-ov-chart-prints"></span> Prints</li>
          </ul>
        </div>
        ${renderActivityChartOverview(buckets)}
      </section>

      <div class="admin-ov-bottom-grid">
        <section class="admin-ov-panel card">
          <h3 class="admin-ov-panel-title">Recent activity</h3>
          <ul class="admin-ov-activity-list">${activityHtml || '<li class="muted">No events yet.</li>'}</ul>
          <a class="admin-ov-link-more" href="/admin/dashboard?view=analytics">Full analytics →</a>
        </section>
        <section class="admin-ov-panel card">
          <h3 class="admin-ov-panel-title">Expiring soon</h3>
          <ul class="admin-ov-expiring-list">
            ${
              expiringList
                .map(
                  (r) => `
              <li>
                <a href="/admin/dashboard?token=${encodeURIComponent(r.token)}">
                  <strong>${escapeHtml(r.applicant)}</strong>
                  <span>${escapeHtml(r.trackingId)} · ${r.daysLeft}d left</span>
                </a>
              </li>`
                )
                .join("") || '<li class="muted">No certificates expiring in 30 days.</li>'
            }
          </ul>
          <a class="admin-ov-link-more" href="/admin/dashboard?view=registry">Browse all certificates →</a>
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
