import {
  buildFitnessTrackingRows,
  buildPermitTrackingRows,
  mergeAnalyticsRows,
  mergePermitAnalyticsRows,
  dailyActivityBuckets,
  getAnalyticsEvents,
  eventRecordKind,
  EVENT_TYPES,
  formatRelativeTime,
} from "./analytics.js";
import { listSavedTokens, getCertificateForEdit, isCertificateSaved } from "./certificates.js";
import { fetchAdminCertificateList } from "./admin-cert-api.js";
import {
  listSavedPermitTokens,
  getPermitForEdit,
  isPermitSaved,
  fetchPermitList,
} from "./permits.js";
import {
  listSavedPermitTokens as listSavedRtaPermitTokens,
  getPermitForEdit as getRtaPermitForEdit,
  isPermitSaved as isRtaPermitSaved,
  fetchPermitList as fetchRtaPermitList,
} from "./rta-permits.js";

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clockParts(now = new Date()) {
  const hour24 = now.getHours();
  const hour12 = hour24 % 12 || 12;
  let zone = "";
  try {
    zone =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    zone = "";
  }
  return {
    h: pad2(hour12),
    m: pad2(now.getMinutes()),
    s: pad2(now.getSeconds()),
    ampm: hour24 >= 12 ? "PM" : "AM",
    zone,
  };
}

let overviewClockTimer = 0;

export function stopAdminOverviewClock() {
  if (overviewClockTimer) {
    window.clearInterval(overviewClockTimer);
    overviewClockTimer = 0;
  }
}

export function startAdminOverviewClock() {
  stopAdminOverviewClock();
  const root = document.getElementById("admin-ov-clock");
  if (!root) return;

  const tick = () => {
    const el = document.getElementById("admin-ov-clock");
    if (!el) {
      stopAdminOverviewClock();
      return;
    }
    const parts = clockParts();
    const set = (key, value) => {
      const node = el.querySelector(`[data-clock-${key}]`);
      if (node) node.textContent = value;
    };
    set("h", parts.h);
    set("m", parts.m);
    set("s", parts.s);
    set("ampm", parts.ampm);
    set("zone", parts.zone);
    el.setAttribute(
      "aria-label",
      `Current time ${parts.h}:${parts.m}:${parts.s} ${parts.ampm}${parts.zone ? ` ${parts.zone}` : ""}`
    );
    const greet = document.querySelector(".admin-ov-greet");
    if (greet) greet.textContent = greetingLabel();
    const date = document.querySelector(".admin-ov-date");
    if (date) date.textContent = todayLabel();
  };

  tick();
  overviewClockTimer = window.setInterval(tick, 1000);
}

function chartDayParts(key) {
  const day = new Date(`${key}T12:00:00`);
  return {
    weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
    date: String(day.getDate()),
  };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function summaryPills(live, expiring, expired) {
  return `
    <div class="admin-ov-pills">
      <span class="admin-ov-pill admin-ov-pill-ok">Live <strong>${live}</strong></span>
      <span class="admin-ov-pill admin-ov-pill-warn">Expiring <strong>${expiring}</strong></span>
      <span class="admin-ov-pill admin-ov-pill-danger">Expired <strong>${expired}</strong></span>
    </div>
  `;
}

function quietEventLabel(event) {
  switch (event.type) {
    case EVENT_TYPES.CERT_VIEW:
      return event.success === false ? "Fitness not found" : "Fitness preview";
    case EVENT_TYPES.CERT_PRINT:
      return "Fitness print";
    case EVENT_TYPES.ADMIN_SAVE:
      return "Fitness saved";
    case EVENT_TYPES.PERMIT_VIEW:
      return event.success === false ? "PTA not found" : "PTA preview";
    case EVENT_TYPES.PERMIT_PRINT:
      return "PTA print";
    case EVENT_TYPES.PERMIT_SAVE:
      return "PTA saved";
    case EVENT_TYPES.RTA_VIEW:
      return event.success === false ? "RTA not found" : "RTA preview";
    case EVENT_TYPES.RTA_PRINT:
      return "RTA print";
    case EVENT_TYPES.RTA_SAVE:
      return "RTA saved";
    case EVENT_TYPES.TRACK_LOOKUP:
      return event.success ? "Track found" : "Track not found";
    case EVENT_TYPES.VERIFY_LOOKUP:
      return event.success ? "Verify found" : "Verify not found";
    default:
      return event.type || "Event";
  }
}

function activityTone(event) {
  const type = String(event.type || "");
  if (type.includes("print")) return "print";
  if (type.includes("save")) return "save";
  if (event.success === false) return "warn";
  return "view";
}

export function buildLocalOverviewRows() {
  return buildFitnessTrackingRows(listSavedTokens(), getCertificateForEdit, isCertificateSaved);
}

export function buildLocalPermitOverviewRows() {
  return buildPermitTrackingRows(listSavedPermitTokens(), getPermitForEdit, isPermitSaved);
}

export function buildLocalRtaPermitOverviewRows() {
  return buildPermitTrackingRows(listSavedRtaPermitTokens(), getRtaPermitForEdit, isRtaPermitSaved, "rta");
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
  const today = todayKey();
  const bars = buckets
    .map((b) => {
      const stackH = Math.round((b.total / max) * 100);
      const viewH = b.total ? Math.round((b.views / b.total) * 100) : 0;
      const printH = 100 - viewH;
      const parts = chartDayParts(b.key);
      const todayClass = b.key === today ? " is-today" : "";
      return `
        <div class="admin-ov-chart-col${todayClass}" title="${escapeHtml(b.label)}: ${b.total} events">
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

function editorHref(row) {
  if (row.kind === "rta") return `/admin/dashboard?view=rta-permits&token=${encodeURIComponent(row.token)}`;
  return row.kind === "permit"
    ? `/admin/dashboard?view=permits&token=${encodeURIComponent(row.token)}`
    : `/admin/dashboard?token=${encodeURIComponent(row.token)}`;
}

function overviewKindLabel(kind) {
  if (kind === "rta") return "RTA";
  if (kind === "permit") return "PTA";
  return "Fitness";
}

function attentionBanner(copy, href, goLabel) {
  return `
      <a class="admin-ov-attention" href="${escapeHtml(href)}">
        <span class="admin-ov-attention-icon" aria-hidden="true">${ovIcon(`<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`)}</span>
        <span class="admin-ov-attention-copy">${copy}</span>
        <span class="admin-ov-attention-go">${escapeHtml(goLabel)}</span>
      </a>`;
}

export function renderAdminOverviewPage(rows, permitRows = [], rtaPermitRows = []) {
  const fitnessRows = rows;
  const permitList = permitRows;
  const rtaList = rtaPermitRows;
  const overallRows = [...fitnessRows, ...permitList, ...rtaList];
  const publish = computeRegistryPublishCounts(fitnessRows);
  const permitPublish = computeRegistryPublishCounts(permitList);
  const rtaPublish = computeRegistryPublishCounts(rtaList);
  const fitness = countByFitness(fitnessRows);
  const permits = countByFitness(permitList);
  const rtaPermits = countByFitness(rtaList);
  const buckets = dailyActivityBuckets(7);
  const recent = getAnalyticsEvents(8);

  const expiringList = overallRows
    .filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 30)
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    .slice(0, 8);

  const activityHtml = recent
    .map((event) => {
      const kind = eventRecordKind(event);
      const tone = activityTone(event);
      return `
      <li class="admin-ov-activity-item admin-ov-activity-${tone}">
        <span class="admin-ov-activity-dot" aria-hidden="true"></span>
        <div>
          <p class="admin-ov-activity-title">${escapeHtml(quietEventLabel(event))}</p>
          <p class="admin-ov-activity-meta">${escapeHtml(overviewKindLabel(kind))} · ${escapeHtml([event.trackingId, event.token].filter(Boolean).join(" · ") || "—")}</p>
        </div>
        <time>${formatRelativeTime(event.at)}</time>
      </li>`;
    })
    .join("");

  const fitnessBits = [];
  if (fitness.expiring) fitnessBits.push(`${fitness.expiring} expiring within 30 days`);
  if (fitness.expired) fitnessBits.push(`${fitness.expired} already expired`);
  const permitBits = [];
  if (permits.expiring) permitBits.push(`${permits.expiring} expiring within 30 days`);
  if (permits.expired) permitBits.push(`${permits.expired} already expired`);
  const rtaBits = [];
  if (rtaPermits.expiring) rtaBits.push(`${rtaPermits.expiring} expiring within 30 days`);
  if (rtaPermits.expired) rtaBits.push(`${rtaPermits.expired} already expired`);
  const attentionItems = [
    fitnessBits.length
      ? attentionBanner(
          `<strong>Fitness needs attention.</strong> ${escapeHtml(fitnessBits.join(" · "))}.`,
          "/admin/dashboard?view=registry",
          "Review"
        )
      : "",
    permitBits.length
      ? attentionBanner(
          `<strong>PTA permits need attention.</strong> ${escapeHtml(permitBits.join(" · "))}.`,
          "/admin/dashboard?view=permits",
          "Review"
        )
      : "",
    rtaBits.length
      ? attentionBanner(
          `<strong>RTA permits need attention.</strong> ${escapeHtml(rtaBits.join(" · "))}.`,
          "/admin/dashboard?view=rta-permits",
          "Review"
        )
      : "",
  ].filter(Boolean);
  const attentionHtml = attentionItems.length
    ? `<div class="admin-ov-attention-stack">${attentionItems.join("")}</div>`
    : "";

  const emptyState = (text) => `
    <li class="admin-ov-empty-row">
      <span>${escapeHtml(text)}</span>
    </li>`;

  return `
    <div id="admin-overview-page" class="admin-overview-page">
      <header class="admin-ov-head">
        <div class="admin-ov-head-lead">
          <div class="admin-ov-hello">
            <p class="admin-ov-kicker">Workspace</p>
            <p class="admin-ov-greet">${greetingLabel()}</p>
            <p class="admin-ov-date">${todayLabel()}</p>
          </div>
          <div
            class="admin-ov-clock"
            id="admin-ov-clock"
            role="timer"
            aria-live="polite"
            aria-atomic="true"
          >
            <span class="admin-ov-clock-label">Local time</span>
            <span class="admin-ov-clock-face">
              <span class="admin-ov-clock-time">
                <span data-clock-h>00</span><span class="admin-ov-clock-sep" aria-hidden="true">:</span><span data-clock-m>00</span><span class="admin-ov-clock-sep" aria-hidden="true">:</span><span data-clock-s>00</span>
              </span>
              <span class="admin-ov-clock-meta">
                <span data-clock-ampm>AM</span>
                <span data-clock-zone></span>
              </span>
            </span>
          </div>
        </div>
      </header>

      ${attentionHtml}

      <div class="admin-ov-summary-grid">
        <a class="admin-ov-summary-card admin-ov-card-green" href="/admin/dashboard?view=registry">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>`)}</span>
            <p class="admin-ov-summary-label">Fitness certificates</p>
          </div>
          <p class="admin-ov-summary-value">${fitnessRows.length}</p>
          <p class="admin-ov-summary-sub">${fitness.active + fitness.renewal} fit to operate · ${publish.live} live · ${publish.local} local</p>
          ${summaryPills(publish.live, fitness.expiring, fitness.expired)}
          <span class="admin-ov-summary-open">Open registry</span>
        </a>
        <a class="admin-ov-summary-card admin-ov-card-navy" href="/admin/dashboard?view=permits">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h6"/>`)}</span>
            <p class="admin-ov-summary-label">PTA permits</p>
          </div>
          <p class="admin-ov-summary-value">${permitList.length}</p>
          <p class="admin-ov-summary-sub">${permits.active + permits.renewal} valid · ${permitPublish.live} live · ${permitPublish.local} local</p>
          ${summaryPills(permitPublish.live, permits.expiring, permits.expired)}
          <span class="admin-ov-summary-open">Open PTA</span>
        </a>
        <a class="admin-ov-summary-card admin-ov-card-plum" href="/admin/dashboard?view=rta-permits">
          <div class="admin-ov-summary-top">
            <span class="admin-ov-summary-icon" aria-hidden="true">${ovIcon(`<path d="M3 10.5 12 4l9 6.5"/><path d="M5 10v9h14v-9"/><path d="M9 19v-6h6v6"/>`)}</span>
            <p class="admin-ov-summary-label">RTA permits</p>
          </div>
          <p class="admin-ov-summary-value">${rtaList.length}</p>
          <p class="admin-ov-summary-sub">${rtaPermits.active + rtaPermits.renewal} valid · ${rtaPublish.live} live · ${rtaPublish.local} local</p>
          ${summaryPills(rtaPublish.live, rtaPermits.expiring, rtaPermits.expired)}
          <span class="admin-ov-summary-open">Open RTA</span>
        </a>
      </div>

      <section class="admin-ov-panel admin-ov-chart-panel">
        <div class="admin-ov-chart-head">
          <div>
            <h3 class="admin-ov-panel-title"><span class="admin-title-icon">${ovIcon(`<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/>`)}</span>Last 7 days</h3>
            <p class="admin-ov-panel-desc">Views and prints on this browser</p>
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
              <h3 class="admin-ov-panel-title"><span class="admin-title-icon">${ovIcon(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`)}</span>Recent activity</h3>
              <p class="admin-ov-panel-desc">Latest on this device</p>
            </div>
            <a class="admin-ov-link-more" href="/admin/dashboard?view=analytics">Analytics</a>
          </div>
          <ul class="admin-ov-activity-list">${activityHtml || emptyState("No events yet — previews and prints will appear here.")}</ul>
        </section>
        <section class="admin-ov-panel">
          <div class="admin-ov-panel-head">
            <div>
              <h3 class="admin-ov-panel-title"><span class="admin-title-icon">${ovIcon(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`)}</span>Expiring soon</h3>
              <p class="admin-ov-panel-desc">Within the next 30 days</p>
            </div>
            <a class="admin-ov-link-more" href="/admin/dashboard?view=analytics&filter=expiring">Analytics</a>
          </div>
          <ul class="admin-ov-expiring-list">
            ${
              expiringList
                .map(
                  (r) => `
              <li>
                <a href="${escapeHtml(editorHref(r))}">
                  <span>
                    <strong>${escapeHtml(r.applicant)}</strong>
                    <em>${escapeHtml(overviewKindLabel(r.kind))} · ${escapeHtml(r.trackingId)}</em>
                  </span>
                  <span class="admin-ov-days-chip${r.daysLeft <= 7 ? " is-urgent" : ""}">${r.daysLeft}d</span>
                </a>
              </li>`
                )
                .join("") || emptyState("No records expiring in the next 30 days.")
            }
          </ul>
        </section>
      </div>
    </div>
  `;
}

export async function fetchOverviewRowsMerged() {
  const localRows = buildLocalOverviewRows();
  const localPermits = buildLocalPermitOverviewRows();
  const localRtaPermits = buildLocalRtaPermitOverviewRows();
  let rows = localRows;
  let permitRows = localPermits;
  let rtaPermitRows = localRtaPermits;
  let listItems = [];
  try {
    const data = await fetchAdminCertificateList({ page: 1, limit: 100, filters: {} });
    rows = mergeAnalyticsRows(localRows, data?.items ?? []);
    listItems = data?.items ?? [];
  } catch {
    /* offline / no API */
  }
  try {
    const items = await fetchPermitList();
    permitRows = mergePermitAnalyticsRows(localPermits, items);
  } catch {
    /* offline / no API */
  }
  try {
    const items = await fetchRtaPermitList();
    rtaPermitRows = mergePermitAnalyticsRows(localRtaPermits, items, "rta");
  } catch {
    /* offline / no API */
  }
  return { rows, permitRows, rtaPermitRows, listItems };
}
