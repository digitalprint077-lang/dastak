import "./style.css";
import "./print-a4.css";
import { applyTheme, syncThemeToggleUI, themeToggleButton, toggleTheme } from "./theme.js";
import { isAdminLoggedIn, loginAdmin, logoutAdmin, requireAdmin } from "./admin.js";
import {
  FIELD_LABELS,
  FOLLOW_TOKEN,
  defaultCertificate,
  deleteCertificate,
  fillForm,
  followLink,
  followPath,
  generateLinkId,
  newCertificateTemplate,
  getCertificate,
  getCertificateForEdit,
  getCertificateSummary,
  findTokenByField,
  listSavedTokens,
  isCertificateSaved,
  printPath,
  readFormValues,
  saveCertificate,
  DATE_FIELD_LABELS,
  toDateInputValue,
  CERTIFICATE_STATUS_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  expiryFromIssueDate,
  cssEscape,
} from "./certificates.js";
import { renderA4PrintPage } from "./print-a4.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import {
  EVENT_TYPES,
  buildFitnessTrackingRows,
  clearAnalyticsEvents,
  computeOverviewMetrics,
  dailyActivityBuckets,
  eventsSince,
  formatEventLabel,
  formatRelativeTime,
  getAnalyticsEvents,
  recordAnalyticsEvent,
  daysUntilExpiry,
} from "./analytics.js";
import { getLang, setLang, t, applyDocumentLang } from "./i18n.js";
import {
  checkLookupRateLimit,
  recordLookupAttempt,
  createCaptchaChallenge,
  verifyCaptchaAnswer,
  isCaptchaPassed,
} from "./rate-limit.js";
import {
  diffCertificateValues,
  recordCertificateAudit,
  renderAuditPanelHtml,
} from "./audit.js";
import {
  downloadTextFile,
  exportCertificatesCsv,
  exportCertificatesJson,
  importCertificatesCsv,
  importCertificatesJson,
} from "./bulk-data.js";

const ECITIZEN_HOME = "https://ecitizen.kp.gov.pk/";

const FORM_SECTIONS = [
  {
    title: "Applicant",
    fields: ["Applicant Name", "Father Name", "District"],
  },
  {
    title: "Vehicle",
    fields: [
      "Registration Number",
      "Chassis Number",
      "Engine Number",
      "Vehicle Kind",
      "Service",
    ],
  },
  {
    title: "Certificate",
    fields: [
      "Certificate Number",
      "Tracking ID",
      "Issue Date",
      "Expiry Date",
      "Application Status",
    ],
  },
  {
    title: "A4 print certificate",
    fields: [
      "Certificate Type",
      "Renewal From",
      "Renewal To",
      "Vehicle Model",
      "Registered Laden Weight",
      "Seating Capacity",
      "Vehicle Fuel Type",
      "Amount",
      "Amount In Words",
    ],
  },
];

const app = document.querySelector("#app");

function iconMessage() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16v12H4z" stroke="currentColor" stroke-width="1.8"/>
    <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.8"/>
  </svg>`;
}

function iconHelp() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
    <path d="M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.4 1-1.4 1.9v.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  </svg>`;
}

function iconSvg(paths, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function iconUserCheck() {
  return iconSvg(
    `<path d="M16 11a4 4 0 1 0-8 0"/><path d="M3 20a7 7 0 0 1 14 0"/><path d="m17 8 2 2 4-4"/>`
  );
}

function iconTrack() {
  return iconSvg(`<path d="M14 2H6a2 2 0 0 0-2 2v16l8-4 8 4V8z"/>`);
}

function iconSave() {
  return iconSvg(
    `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>`
  );
}

function iconLoad() {
  return iconSvg(`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>`);
}

function iconPlus() {
  return iconSvg(`<path d="M12 5v14"/><path d="M5 12h14"/>`);
}

function iconTrash() {
  return iconSvg(
    `<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>`
  );
}

function iconReset() {
  return iconSvg(`<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>`);
}

function iconPreview() {
  return iconSvg(`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`);
}

function iconCopy() {
  return iconSvg(`<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`);
}

function iconPrint() {
  return iconSvg(
    `<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`
  );
}

function iconDownload() {
  return iconSvg(
    `<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>`
  );
}

function iconLogout() {
  return iconSvg(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`);
}

function iconLock() {
  return iconSvg(
    `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`
  );
}

function iconArrowRight() {
  return iconSvg(`<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>`);
}

function iconChart() {
  return iconSvg(`<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/>`);
}

function iconActivity() {
  return iconSvg(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`);
}

const FIELD_ICONS = {
  linkToken: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  status: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>`,
  "Applicant Name": `<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/>`,
  "Father Name": `<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.5-5 6-5"/><path d="M14 19c0-2 1.5-3.5 3.5-3.5"/>`,
  District: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  "Registration Number": `<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h3"/><path d="M14 12h3"/>`,
  "Chassis Number": `<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h2v4H6z"/><path d="M16 10h2v4h-2z"/>`,
  "Engine Number": `<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="m4.93 4.93 2.12 2.12"/><path d="m16.95 16.95 2.12 2.12"/>`,
  "Vehicle Kind": `<path d="M19 17h2c.6 0 1-.4 1-1v-3l-2-5H5L3 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>`,
  Service: `<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10h8"/><path d="M8 14h5"/>`,
  "Certificate Number": `<path d="M14 2H6a2 2 0 0 0-2 2v16l8-4 8 4V8z"/><path d="M14 2v6h6"/>`,
  "Tracking ID": `<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 9v6"/><path d="M14 9v6"/>`,
  "Issue Date": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>`,
  "Expiry Date": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="m9 16 6-6"/>`,
  "Application Status": `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  "Certificate Type": `<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>`,
  "Renewal From": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M7 14h4"/>`,
  "Renewal To": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="m13 16 4-4"/>`,
  "Vehicle Model": `<path d="M19 17h2c.6 0 1-.4 1-1v-3l-2-5H5L3 13v3c0 .6.4 1 1 1h2"/><path d="M7 11h10"/>`,
  "Registered Laden Weight": `<path d="m12 3 7 4v10l-7 4-7-4V7z"/><path d="M12 12 19 8"/><path d="M12 12v9"/><path d="M12 12 5 8"/>`,
  "Seating Capacity": `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  "Vehicle Fuel Type": `<path d="M3 22h12"/><path d="M6 22V10l6-4v16"/><path d="M18 14v8"/><path d="M18 10h-2v4h2z"/>`,
  Amount: `<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>`,
  "Amount In Words": `<path d="M4 7h16"/><path d="M4 12h12"/><path d="M4 17h8"/>`,
};

function fieldIcon(labelOrKey) {
  const paths =
    FIELD_ICONS[labelOrKey] ||
    `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10"/>`;
  return iconSvg(paths, 17);
}

const LICENSE_TYPES = [
  { value: "arms_license", label: "Arms License" },
  { value: "arms_business_license", label: "Arms Business License" },
  { value: "drlv_license", label: "Driving License" },
  { value: "routepermits", label: "Route Permit" },
  { value: "wildlife_license", label: "WildLife License" },
  { value: "bslv_license", label: "Bus Stand License" },
  { value: "vehicle_fitness", label: "Vehicle Fitness Certificate" },
];

function isValidCnic(value) {
  return /^\d{13}$/.test(String(value).replace(/\D/g, ""));
}

function normalizeCnic(value) {
  return String(value).replace(/\D/g, "");
}

function homeCardHint() {
  return t("homeHint");
}

function langToggleMarkup() {
  return `<button class="btn btn-outline lang-toggle" type="button" data-action="toggle-lang" aria-label="Switch language">${t("langToggle")}</button>`;
}

function renderCaptchaFields(formId) {
  if (isCaptchaPassed()) return "";
  const ch = createCaptchaChallenge();
  return `
    <div class="captcha-block" data-captcha-id="${escapeHtml(ch.id)}" data-form-id="${escapeHtml(formId)}">
      <label class="form-label" for="${formId}-captcha">${t("captchaLabel")}</label>
      <p class="captcha-prompt">${t("captchaPrompt")} ${ch.a} + ${ch.b}?</p>
      <input class="home-input" id="${formId}-captcha" name="captchaAnswer" type="number" inputmode="numeric" autocomplete="off" required />
    </div>
  `;
}

function validateCaptchaForForm(form) {
  const block = form.querySelector(".captcha-block");
  if (!block) return true;
  const id = block.getAttribute("data-captcha-id");
  const answer = form.querySelector('[name="captchaAnswer"]')?.value ?? "";
  if (!verifyCaptchaAnswer(id, answer)) {
    showToast("Incorrect security check — try again");
    return false;
  }
  return true;
}

function guardPublicLookup(form) {
  const limit = checkLookupRateLimit();
  if (!limit.needCaptcha) return true;
  if (!form.querySelector(".captcha-block")) {
    showToast("Too many lookups — complete the security check below");
    const extra = form.querySelector(".home-form-extra");
    if (extra) extra.innerHTML = renderCaptchaFields(form.id || "lookup");
    return false;
  }
  return validateCaptchaForForm(form);
}

function countExpiringWithin(days) {
  return listSavedTokens().filter((token) => {
    const { values } = getCertificateForEdit(token);
    const left = daysUntilExpiry(values["Expiry Date"]);
    return left != null && left >= 0 && left <= days;
  }).length;
}

function expiryReminderHtml(expiryValue) {
  const left = daysUntilExpiry(expiryValue);
  if (left == null) return "";
  if (left < 0) {
    return `<div class="cert-banner cert-banner-danger" role="alert">${escapeHtml(t("expiryExpired"))}</div>`;
  }
  if (left <= 30) {
    return `<div class="cert-banner cert-banner-warn" role="alert">${escapeHtml(t("expirySoon30"))} <strong>(${left} days)</strong></div>`;
  }
  if (left <= 60) {
    return `<div class="cert-banner cert-banner-info" role="alert">${escapeHtml(t("expirySoon60"))} <strong>(${left} days)</strong></div>`;
  }
  return "";
}

function maybeShowAdminExpiryReminder() {
  if (!isAdminLoggedIn()) return;
  const expiring = countExpiringWithin(30);
  const expired = listSavedTokens().filter((token) => {
    const { values } = getCertificateForEdit(token);
    const left = daysUntilExpiry(values["Expiry Date"]);
    return left != null && left < 0;
  }).length;
  if (expiring === 0 && expired === 0) return;
  const key = "dastak:expiry-admin-reminder";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const parts = [];
  if (expiring > 0) parts.push(`${expiring} expiring within 30 days`);
  if (expired > 0) parts.push(`${expired} expired`);
  showToast(`Reminder: ${parts.join(", ")}`);
}

function maybeShowPublicExpiryReminder(token, expiryValue) {
  const left = daysUntilExpiry(expiryValue);
  if (left == null || left > 60) return;
  const key = `dastak:expiry-public-${token}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  if (left < 0) showToast(t("expiryExpired"));
  else if (left <= 30) showToast(`${t("expirySoon30")} (${left} days)`);
  else showToast(`${t("expirySoon60")} (${left} days)`);
}

function certSidebarExpiryBadge(daysLeft) {
  if (daysLeft == null || daysLeft > 60) return "";
  if (daysLeft < 0) {
    return `<span class="cert-expiry-pill cert-expiry-pill-danger">Expired</span>`;
  }
  if (daysLeft <= 30) {
    return `<span class="cert-expiry-pill cert-expiry-pill-warn">${daysLeft}d left</span>`;
  }
  return `<span class="cert-expiry-pill cert-expiry-pill-info">${daysLeft}d left</span>`;
}

function layout(mainHtml, options = {}) {
  const { showWelcome = true } = options;
  const welcome = showWelcome
    ? `
        <div class="welcome-row">
          <div class="welcome-text">
            <h3>${t("welcomeTitle")}</h3>
            <h5>${t("welcomeSub")}</h5>
          </div>
          <div class="welcome-actions">
            <button class="btn btn-outline" type="button" data-action="feedback">Feedback ${iconMessage()}</button>
            <button class="btn btn-outline" type="button" data-action="help">Help ${iconHelp()}</button>
          </div>
        </div>
      `
    : "";

  return `
    <div class="app-shell">
      <header class="navbar">
        <div class="navbar-fluid">
          <div class="navbar-menu-wrapper">
            <div class="navbar-left">
              <a class="nav-link" href="${ECITIZEN_HOME}" aria-label="Home">
                <img class="kp-logo" src="/images/kp-logo.png" alt="KP Logo" height="64" />
              </a>
            </div>
            <div class="navbar-brand-wrapper">
              <a class="navbar-brand" href="${ECITIZEN_HOME}" aria-label="Dastak">
                <img class="dastak-logo" src="/images/logo-dastak.png" alt="logo" />
              </a>
            </div>
            <div class="navbar-right">
              ${langToggleMarkup()}
            </div>
          </div>
        </div>
      </header>
      <main class="page">
        ${welcome}
        <div class="container">
          ${mainHtml}
        </div>
      </main>
      <footer class="footer">
        <div class="footer-wrap">
          <div class="footer-inner">
            <a class="footer-logo-link" href="https://www.kpitb.gov.pk/" target="_blank" rel="noreferrer">
              <img class="kpitb-logo d-sm-block" src="/images/kpitb-logo.png" height="48" alt="kpitb" />
            </a>
            <span class="footer-copy">
              Copyright © 2026 <a class="footer-copy-link" href="/">Dastak - KP Digital Transformation Unit</a>
            </span>
            <span class="footer-logo-end">
              <img class="dtu-logo d-sm-block" src="/images/dtu-logo.png" height="40" alt="Digital Transformation Unit" />
            </span>
          </div>
        </div>
      </footer>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

function getAdminView() {
  const view = new URLSearchParams(window.location.search).get("view")?.trim();
  return view === "analytics" ? "analytics" : "certificates";
}

function adminSubnav(activeView) {
  const certHref = "/admin/dashboard";
  const analyticsHref = "/admin/dashboard?view=analytics";
  return `
    <nav class="admin-subnav" aria-label="Admin sections">
      <a class="admin-subnav-link${activeView === "certificates" ? " active" : ""}" href="${certHref}">
        ${iconSave()} Certificates
      </a>
      <a class="admin-subnav-link${activeView === "analytics" ? " active" : ""}" href="${analyticsHref}">
        ${iconChart()} Analytics &amp; tracking
      </a>
    </nav>
  `;
}

function adminDashboardShell(mainHtml, activeView = "certificates") {
  const subtitle =
    activeView === "analytics" ? "Fitness tracking &amp; usage analytics" : "Certificate management";
  return `
    <div class="app-shell admin-shell">
      <header class="admin-topbar">
        <div class="admin-topbar-inner">
          <div class="admin-brand-block">
            <img class="admin-brand-logo" src="/images/logo-dastak.png" alt="" height="36" />
            <div>
              <p class="admin-kicker">Dastak Admin</p>
              <h1 class="admin-title">${subtitle}</h1>
            </div>
          </div>
          <div class="admin-topbar-actions">
            ${themeToggleButton()}
            <button class="btn btn-ghost admin-pill-btn" type="button" data-action="admin-logout">${iconLogout()} Log out</button>
          </div>
        </div>
        ${adminSubnav(activeView)}
      </header>
      <main class="admin-page">
        <div class="admin-container-wide">
          ${mainHtml}
        </div>
      </main>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

function fieldControl({ id, name, value, multiline = false, inputType = "text", readonly = false }) {
  const ro = readonly ? " readonly disabled" : "";
  if (multiline) {
    return `<textarea id="${id}" class="form-control" name="${name}" rows="2"${ro}>${escapeHtml(value)}</textarea>`;
  }
  return `<input id="${id}" class="form-control${inputType === "date" ? " form-control-date" : ""}" type="${inputType}" name="${name}" value="${escapeHtml(value)}"${ro} />`;
}

function fieldSelect({ id, name, value, options, readonly = false }) {
  const opts = options
    .map((opt) => {
      const sel = opt === value ? " selected" : "";
      return `<option value="${escapeHtml(opt)}"${sel}>${escapeHtml(opt)}</option>`;
    })
    .join("");
  const custom = value && !options.includes(value);
  const customOpt = custom
    ? `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)} (custom)</option>`
    : "";
  return `<select id="${id}" class="form-control" name="${name}" ${readonly ? "disabled" : ""} required>${customOpt}${opts}</select>`;
}

function fieldInput(label, value, iconKey = label, readonly = false) {
  const name = label.replace(/"/g, "&quot;");
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const isDate = DATE_FIELD_LABELS.includes(label);
  const displayValue = isDate ? toDateInputValue(value) : value;
  if (label === "Application Status") {
    return `
      <label class="form-field" for="${id}">
        <span class="form-label">${label}</span>
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: displayValue || APPLICATION_STATUS_OPTIONS[0],
            options: APPLICATION_STATUS_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  return `
    <label class="form-field" for="${id}">
      <span class="form-label">${label}</span>
      <div class="form-input-wrap${isDate ? " form-input-wrap-date" : ""}">
        <span class="form-field-icon">${fieldIcon(iconKey)}</span>
        ${fieldControl({
          id,
          name,
          value: displayValue,
          multiline: false,
          inputType: isDate ? "date" : "text",
          readonly,
        })}
      </div>
    </label>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function getEditorToken() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("token")?.trim();
  if (fromQuery) return fromQuery;
  return sessionStorage.getItem("dastak:editor-token") || FOLLOW_TOKEN;
}

function homePage() {
  const licenseOptions = LICENSE_TYPES.map(
    (item) => `<option value="${item.value}">${item.label}</option>`
  ).join("");

  return layout(`
    <div class="home-grid">
      <section class="home-card" id="home-verify">
        <h2 class="home-card-title">${t("verifyTitle")}</h2>
        <form id="verify-license-form" class="home-form">
          <label class="home-field" for="verify-license-type">
            <span class="home-label">${t("licenseType")}</span>
            <select class="home-input" id="verify-license-type" name="licenseType" required>
              ${licenseOptions}
            </select>
          </label>
          <label class="home-field" for="verify-document">
            <span class="home-label">${t("documentNumber")}</span>
            <input class="home-input" id="verify-document" name="documentNumber" type="text" placeholder="${escapeHtml(t("documentPlaceholder"))}" required autocomplete="off" />
          </label>
          <label class="home-field" for="verify-cnic">
            <span class="home-label">${t("cnic")}</span>
            <input
              class="home-input"
              id="verify-cnic"
              name="cnic"
              type="text"
              inputmode="numeric"
              maxlength="13"
              placeholder="${escapeHtml(t("cnicPlaceholder"))}"
              required
              autocomplete="off"
            />
          </label>
          <div class="home-form-extra"></div>
          <button class="home-btn home-btn-verify" type="submit">${iconUserCheck()} ${t("verifyBtn")}</button>
        </form>
        <p class="home-card-hint">${homeCardHint()}</p>
      </section>

      <section class="home-card" id="home-track">
        <h2 class="home-card-title">${t("trackTitle")}</h2>
        <form id="track-application-form" class="home-form">
          <label class="home-field" for="track-id">
            <span class="home-label">${t("trackingId")}</span>
            <input
              class="home-input"
              id="track-id"
              name="trackingId"
              type="text"
              placeholder="${escapeHtml(t("trackingPlaceholder"))}"
              required
              autocomplete="off"
            />
          </label>
          <label class="home-field" for="track-cnic">
            <span class="home-label">${t("cnic")}</span>
            <input
              class="home-input"
              id="track-cnic"
              name="cnic"
              type="text"
              inputmode="numeric"
              maxlength="13"
              placeholder="${escapeHtml(t("cnicPlaceholder"))}"
              required
              autocomplete="off"
            />
          </label>
          <div class="home-form-extra"></div>
          <button class="home-btn home-btn-track" type="submit">${iconTrack()} ${t("trackBtn")}</button>
        </form>
        <p class="home-card-hint">${homeCardHint()}</p>
      </section>
    </div>
    <nav class="home-mobile-bar" aria-label="Quick actions">
      <button class="home-mobile-btn" type="button" data-action="scroll-verify">${t("verifyBtn")}</button>
      <button class="home-mobile-btn home-mobile-btn-accent" type="button" data-action="scroll-track">${t("trackBtn")}</button>
    </nav>
  `);
}

function resolveVehicleFitnessByDocument(documentNumber) {
  const doc = documentNumber.trim();
  if (!doc) return null;
  return (
    findTokenByField("Certificate Number", doc) ||
    findTokenByField("Registration Number", doc) ||
    findTokenByField("Tracking ID", doc)
  );
}

function handleTrackApplication(form) {
  if (!guardPublicLookup(form)) return;
  const trackingId = form.querySelector('[name="trackingId"]')?.value?.trim() ?? "";
  const cnic = normalizeCnic(form.querySelector('[name="cnic"]')?.value ?? "");
  if (!trackingId) {
    showToast("Enter Application Tracking ID");
    return;
  }
  if (!isValidCnic(cnic)) {
    showToast("Enter a valid 13-digit CNIC without dashes");
    return;
  }
  recordLookupAttempt();
  const token =
    findTokenByField("Tracking ID", trackingId) ||
    (listSavedTokens().includes(trackingId) ? trackingId : null);
  if (!token) {
    recordAnalyticsEvent(EVENT_TYPES.TRACK_LOOKUP, {
      success: false,
      trackingId,
    });
    showToast("No application found for this Tracking ID");
    return;
  }
  recordAnalyticsEvent(EVENT_TYPES.TRACK_LOOKUP, {
    success: true,
    trackingId,
    token,
  });
  navigate(followPath(token));
}

function handleVerifyLicense(form) {
  if (!guardPublicLookup(form)) return;
  const licenseType = form.querySelector('[name="licenseType"]')?.value ?? "";
  const documentNumber = form.querySelector('[name="documentNumber"]')?.value?.trim() ?? "";
  const cnic = normalizeCnic(form.querySelector('[name="cnic"]')?.value ?? "");
  if (!documentNumber) {
    showToast("Enter Document Number");
    return;
  }
  if (!isValidCnic(cnic)) {
    showToast("Enter a valid 13-digit CNIC without dashes");
    return;
  }
  if (licenseType !== "vehicle_fitness") {
    showToast("This demo supports Vehicle Fitness Certificate verification only");
    return;
  }
  recordLookupAttempt();
  const token = resolveVehicleFitnessByDocument(documentNumber);
  if (!token) {
    recordAnalyticsEvent(EVENT_TYPES.VERIFY_LOOKUP, {
      success: false,
      licenseType,
    });
    showToast("No certificate found for this document number");
    return;
  }
  recordAnalyticsEvent(EVENT_TYPES.VERIFY_LOOKUP, {
    success: true,
    licenseType,
    token,
  });
  navigate(followPath(token));
}

function adminLoginPage() {
  return `
    <div class="login-shell">
      <div class="login-bg" aria-hidden="true">
        <span class="login-orb login-orb-a"></span>
        <span class="login-orb login-orb-b"></span>
        <span class="login-orb login-orb-c"></span>
        <span class="login-grid-pattern"></span>
      </div>
      <div class="login-card login-panel-enter">
        <aside class="login-brand">
          <img class="login-logo" src="/images/logo-dastak.png" alt="Dastak" height="52" />
          <p class="login-brand-kicker">Dastak · Admin</p>
          <h1 class="login-brand-title">Vehicle fitness certificates</h1>
          <p class="login-brand-text">Create follow links, edit certificate data, and print official A4 forms with QR verification.</p>
          <ul class="login-brand-list">
            <li>Manage certificates &amp; tracking IDs</li>
            <li>Preview &amp; print Form-I layout</li>
            <li>Share secure public follow links</li>
          </ul>
        </aside>
        <section class="login-form-side">
          <div class="login-form-head login-enter login-enter-2">
            <h2 class="login-title">Welcome back</h2>
            <p class="login-subtitle">Sign in to open the admin dashboard.</p>
          </div>
          <form id="admin-login-form" class="admin-login-form login-enter login-enter-4" autocomplete="off">
            <label class="form-field login-field" for="admin-password">
              <span class="form-label">Admin password</span>
              <div class="form-input-wrap login-input-wrap">
                <span class="form-field-icon">${iconLock()}</span>
                <input id="admin-password" class="form-control" name="password" type="password" placeholder="Enter your password" required />
              </div>
            </label>
            <button class="btn btn-teal btn-block login-submit-btn admin-pill-btn" type="submit">
              Continue to dashboard ${iconArrowRight()}
            </button>
          </form>
          <p class="login-footnote login-enter login-enter-4">Authorized staff only. Session stays on this device.</p>
        </section>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

function renderCertSidebar(activeToken) {
  const summaries = listSavedTokens()
    .map((token) => {
      const summary = getCertificateSummary(token);
      const { values } = getCertificateForEdit(token);
      return {
        ...summary,
        daysLeft: daysUntilExpiry(values["Expiry Date"]),
      };
    })
    .sort((a, b) => a.applicant.localeCompare(b.applicant));

  const items = summaries
    .map(
      (item) => `
        <a
          class="cert-list-item${item.token === activeToken ? " active" : ""}"
          href="/admin/dashboard?token=${encodeURIComponent(item.token)}"
        >
          <div class="cert-list-top">
            <strong class="cert-list-name">${escapeHtml(item.applicant)}</strong>
            <span class="cert-list-badges">
              ${certSidebarExpiryBadge(item.daysLeft)}
              <span class="cert-badge ${item.saved ? "cert-badge-saved" : "cert-badge-default"}">
                ${item.saved ? "Saved" : "Default"}
              </span>
            </span>
          </div>
          <p class="cert-list-number">${escapeHtml(item.certificateNumber)}</p>
          <p class="cert-list-id">${escapeHtml(item.token)}</p>
        </a>
      `
    )
    .join("");

  return `
    <aside class="admin-sidebar card">
      <div class="admin-sidebar-head">
        <div>
          <h2 class="admin-sidebar-title">Certificates</h2>
          <p class="admin-sidebar-count">${summaries.length} total</p>
        </div>
        <button class="btn btn-primary btn-sm" type="button" data-action="admin-create-new">${iconPlus()} New</button>
      </div>
      <div class="admin-sidebar-tools">
        <button class="btn btn-ghost btn-sm admin-pill-btn" type="button" data-action="export-json">Export JSON</button>
        <button class="btn btn-ghost btn-sm admin-pill-btn" type="button" data-action="export-csv">Export CSV</button>
        <label class="btn btn-ghost btn-sm admin-pill-btn import-label">
          Import JSON
          <input type="file" accept="application/json,.json" data-import="json" hidden />
        </label>
        <label class="btn btn-ghost btn-sm admin-pill-btn import-label">
          Import CSV
          <input type="file" accept=".csv,text/csv" data-import="csv" hidden />
        </label>
      </div>
      <div class="cert-list">${items}</div>
    </aside>
  `;
}

function renderFormSections(data) {
  return FORM_SECTIONS.map(
    (section) => `
      <section class="admin-form-panel">
        <div class="admin-form-panel-head">
          <h3 class="admin-form-panel-title">${section.title}</h3>
        </div>
        <div class="form-grid">${section.fields.map((label) => fieldInput(label, data.values[label] ?? "")).join("")}</div>
      </section>
    `
  ).join("");
}

function renderCertEditor(token, data, isCreate) {
  const certNo = escapeHtml(data.values["Certificate Number"] || "—");
  const tracking = escapeHtml(data.values["Tracking ID"] || "—");
  const expiringCount = countExpiringWithin(30);
  const alertsHtml =
    expiringCount > 0
      ? `<a class="admin-alert-banner" href="/admin/dashboard?view=analytics&amp;filter=expiring">
          <strong>${expiringCount}</strong> certificate${expiringCount === 1 ? "" : "s"} expiring within 30 days — view in analytics
        </a>`
      : "";

  return `
    <div class="admin-layout">
      ${renderCertSidebar(token)}
      <div class="admin-main">
        ${alertsHtml}
        ${expiryReminderHtml(data.values["Expiry Date"])}
        <div class="admin-main-head">
          <div class="admin-main-head-text">
            <p class="admin-breadcrumb">Dashboard · ${isCreate ? "New" : "Edit"}</p>
            <h2 class="admin-main-title">${isCreate ? "New certificate" : escapeHtml(data.values["Applicant Name"] || "Certificate")}</h2>
            <p class="admin-main-meta"><span>${certNo}</span><span>${tracking}</span></p>
          </div>
          <div class="admin-head-actions">
            <button class="btn btn-ghost admin-pill-btn" type="button" data-action="copy">${iconCopy()} Copy link</button>
            <a class="btn btn-ghost admin-pill-btn" id="open-cert-link" href="${followPath(token)}" target="_blank" rel="noreferrer">${iconPreview()} Preview</a>
            <a class="btn btn-ghost admin-pill-btn" id="open-print-link" href="${printPath(token)}" target="_blank" rel="noreferrer">${iconPrint()} Print</a>
            <button class="btn btn-teal admin-pill-btn" type="button" data-action="download-pdf" data-token="${escapeHtml(token)}">${iconDownload()} Download PDF</button>
          </div>
        </div>

        ${isCreate ? `<div class="admin-banner"><strong>Draft</strong> — fill the form and save to publish this follow link.</div>` : ""}

        <form id="cert-editor" class="admin-editor-card" autocomplete="off">
          <section class="admin-form-panel admin-form-panel-accent">
            <div class="admin-form-panel-head">
              <h3 class="admin-form-panel-title">Link &amp; status</h3>
              <p class="admin-form-panel-desc">Share via <strong>Copy link</strong> after save.</p>
            </div>
            <div class="form-row form-row-token">
              <label class="form-field" for="link-token">
                <span class="form-label">Link ID (URL slug)</span>
                <div class="form-input-wrap">
                  <span class="form-field-icon">${fieldIcon("linkToken")}</span>
                  <input id="link-token" class="form-control" name="linkToken" type="text" value="${escapeHtml(token)}" />
                </div>
              </label>
              <label class="form-field" for="cert-status">
                <span class="form-label">Certificate status</span>
                <div class="form-input-wrap">
                  <span class="form-field-icon">${fieldIcon("status")}</span>
                  ${fieldSelect({
                    id: "cert-status",
                    name: "status",
                    value: data.status || CERTIFICATE_STATUS_OPTIONS[0],
                    options: CERTIFICATE_STATUS_OPTIONS,
                  })}
                </div>
              </label>
            </div>
          </section>

          <div class="admin-form-stack">${renderFormSections(data)}</div>

          <section class="admin-form-panel admin-form-panel-audit">
            <div class="admin-form-panel-head">
              <h3 class="admin-form-panel-title">Audit trail</h3>
              <p class="admin-form-panel-desc">Changes on this device (admin).</p>
            </div>
            ${renderAuditPanelHtml(token, escapeHtml)}
          </section>

          <footer class="editor-toolbar">
            <div class="editor-toolbar-section editor-toolbar-section-primary">
              <p class="editor-toolbar-title">Publish</p>
              <div class="editor-toolbar-actions">
                <button class="btn btn-primary admin-pill-btn editor-btn-main" type="submit">
                  ${iconSave()} ${isCreate ? "Create &amp; save" : "Save certificate"}
                </button>
                <button class="btn btn-teal admin-pill-btn" type="button" data-action="save-preview">
                  ${iconPreview()} Save &amp; preview
                </button>
              </div>
            </div>
            <div class="editor-toolbar-section">
              <p class="editor-toolbar-title">Form</p>
              <div class="editor-toolbar-actions">
                <button class="btn btn-ghost admin-pill-btn btn-compact" type="button" data-action="load-cert">
                  ${iconLoad()} Reload
                </button>
                <button class="btn btn-ghost admin-pill-btn btn-compact" type="button" data-action="reset-form">
                  ${iconReset()} Reset
                </button>
              </div>
            </div>
            <div class="editor-toolbar-section editor-toolbar-section-danger">
              <button class="btn btn-danger admin-pill-btn btn-compact" type="button" data-action="delete-cert">
                ${iconTrash()} Delete
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function isCreateMode() {
  return new URLSearchParams(window.location.search).get("create") === "1";
}

function renderHealthBadge(health) {
  return `<span class="fitness-badge fitness-badge-${health.tone}">${escapeHtml(health.label)}</span>`;
}

function renderActivityChart(buckets) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const bars = buckets
    .map(
      (b) => `
        <div class="analytics-bar-col" title="${escapeHtml(b.label)}: ${b.total} events">
          <div class="analytics-bar-stack" style="height: ${Math.round((b.total / max) * 100)}%">
            <span class="analytics-bar-seg analytics-bar-views" style="flex-grow: ${b.views || 0.001}"></span>
            <span class="analytics-bar-seg analytics-bar-prints" style="flex-grow: ${b.prints || 0.001}"></span>
            <span class="analytics-bar-seg analytics-bar-lookups" style="flex-grow: ${b.lookups || 0.001}"></span>
          </div>
          <span class="analytics-bar-label">${escapeHtml(b.key.slice(5))}</span>
        </div>
      `
    )
    .join("");
  return `
    <div class="analytics-chart card">
      <div class="analytics-chart-head">
        <div>
          <h3 class="analytics-panel-title">${iconActivity()} Activity (7 days)</h3>
          <p class="analytics-panel-desc">Preview views, print opens, and public lookups</p>
        </div>
        <ul class="analytics-legend">
          <li><span class="analytics-legend-dot analytics-bar-views"></span> Views</li>
          <li><span class="analytics-legend-dot analytics-bar-prints"></span> Prints</li>
          <li><span class="analytics-legend-dot analytics-bar-lookups"></span> Lookups</li>
        </ul>
      </div>
      <div class="analytics-bars">${bars}</div>
    </div>
  `;
}

function renderAnalyticsDashboard() {
  const tokens = listSavedTokens();
  const rows = buildFitnessTrackingRows(tokens, getCertificateForEdit, isCertificateSaved).sort((a, b) => {
    const aExp = a.daysLeft ?? 9999;
    const bExp = b.daysLeft ?? 9999;
    if (aExp !== bExp) return aExp - bExp;
    return a.applicant.localeCompare(b.applicant);
  });
  const events7d = eventsSince(7);
  const metrics = computeOverviewMetrics(rows, events7d);
  const buckets = dailyActivityBuckets(7);
  const recent = getAnalyticsEvents(12);

  const kpi = (label, value, hint) => `
    <article class="analytics-kpi card">
      <p class="analytics-kpi-label">${label}</p>
      <p class="analytics-kpi-value">${value}</p>
      ${hint ? `<p class="analytics-kpi-hint">${hint}</p>` : ""}
    </article>
  `;

  const districtList = metrics.topDistricts
    .map(
      ([name, count]) =>
        `<li><span>${escapeHtml(name)}</span><strong>${count}</strong></li>`
    )
    .join("");

  const trackingRows = rows
    .map((row) => {
      const daysLabel =
        row.daysLeft == null ? "—" : row.daysLeft < 0 ? `${Math.abs(row.daysLeft)}d ago` : `${row.daysLeft}d`;
      return `
        <tr class="analytics-track-row" data-token="${escapeHtml(row.token)}" data-days-left="${row.daysLeft ?? ""}">
          <td><code class="analytics-code">${escapeHtml(row.trackingId)}</code></td>
          <td>${escapeHtml(row.applicant)}</td>
          <td>${escapeHtml(row.district)}</td>
          <td>${renderHealthBadge(row.health)}</td>
          <td class="analytics-muted">${escapeHtml(row.appStatus.slice(0, 48))}${row.appStatus.length > 48 ? "…" : ""}</td>
          <td>${escapeHtml(row.expiry || "—")}<span class="analytics-sub">${daysLabel}</span></td>
          <td class="analytics-num">${row.views}</td>
          <td class="analytics-num">${row.prints}</td>
          <td class="analytics-muted">${formatRelativeTime(row.lastAt)}</td>
          <td>
            <a class="btn btn-ghost btn-sm admin-pill-btn" href="/admin/dashboard?token=${encodeURIComponent(row.token)}">Edit</a>
          </td>
        </tr>
      `;
    })
    .join("");

  const activityItems = recent
    .map((event) => {
      const meta = [event.trackingId, event.token].filter(Boolean).join(" · ");
      return `
        <li class="analytics-activity-item">
          <div>
            <p class="analytics-activity-title">${escapeHtml(formatEventLabel(event))}</p>
            ${meta ? `<p class="analytics-activity-meta">${escapeHtml(meta)}</p>` : ""}
          </div>
          <time class="analytics-activity-time" datetime="${escapeHtml(event.at)}">${formatRelativeTime(event.at)}</time>
        </li>
      `;
    })
    .join("");

  return `
    <div class="analytics-page">
      <div class="analytics-page-head">
        <div>
          <p class="admin-breadcrumb">Dashboard · Analytics</p>
          <h2 class="admin-main-title">Vehicle fitness tracking</h2>
          <p class="admin-main-meta analytics-page-lead">Monitor certificate lifecycle, expiry risk, and how citizens use verify &amp; track on this device.</p>
        </div>
        <div class="analytics-page-actions">
          <label class="analytics-search-wrap">
            <span class="visually-hidden">Filter tracking table</span>
            <input id="analytics-track-filter" class="form-control" type="search" placeholder="Search tracking ID, name, district…" autocomplete="off" />
          </label>
          <button class="btn btn-ghost admin-pill-btn btn-compact" type="button" data-action="analytics-clear">Clear activity log</button>
        </div>
      </div>

      <div class="analytics-kpi-grid">
        ${kpi("Certificates", metrics.total, `${metrics.saved} saved locally`)}
        ${kpi("Expiring ≤ 30 days", metrics.expiringSoon, `${metrics.expired} expired`)}
        ${kpi("Preview views (7d)", metrics.views7d, "Public certificate pages")}
        ${kpi("Track / verify (7d)", metrics.lookups7d, `${metrics.successfulLookups7d} matched`)}
      </div>

      <div class="analytics-grid-main">
        ${renderActivityChart(buckets)}
        <aside class="analytics-side card">
          <h3 class="analytics-panel-title">By district</h3>
          <ul class="analytics-district-list">${districtList || "<li><span>—</span><strong>0</strong></li>"}</ul>
          <h3 class="analytics-panel-title analytics-panel-title-spaced">Recent activity</h3>
          <ul class="analytics-activity-list">${activityItems || '<li class="analytics-muted">No events yet — open a certificate or use Track on the home page.</li>'}</ul>
        </aside>
      </div>

      <section class="analytics-table-wrap card">
        <div class="analytics-table-head">
          <div>
            <h3 class="analytics-panel-title">${iconTrack()} Fitness applications</h3>
            <p class="analytics-panel-desc">${rows.length} records · click a row to open the editor</p>
          </div>
        </div>
        <div class="analytics-table-scroll">
          <table class="analytics-table">
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Applicant</th>
                <th>District</th>
                <th>Fitness</th>
                <th>Application status</th>
                <th>Expiry</th>
                <th>Views</th>
                <th>Prints</th>
                <th>Last activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="analytics-track-body">${trackingRows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function adminDashboardPage() {
  const view = getAdminView();
  if (view === "analytics") {
    return adminDashboardShell(renderAnalyticsDashboard(), "analytics");
  }
  const isCreate = isCreateMode();
  const token = isCreate ? generateLinkId() : getEditorToken();
  const data = isCreate ? newCertificateTemplate() : getCertificateForEdit(token);
  return adminDashboardShell(renderCertEditor(token, data, isCreate), "certificates");
}

function certificatePage(token) {
  const cert = getCertificate(token);
  if (!cert) {
    return layout(`
      <h1 class="page-title">${t("certTitle")}</h1>
      <div class="not-found">
        <p class="alert">Certificate Status: <strong>Not Found</strong></p>
        <a class="btn btn-primary" href="/">${t("backHome")}</a>
      </div>
    `);
  }

  const values = Object.fromEntries(cert.fields);
  const fields = FIELD_LABELS.map(
    (label) => `
        <div class="field">
          <dt>${label}</dt>
          <dd>${escapeHtml(values[label] ?? "")}</dd>
        </div>
      `
  ).join("");

  return layout(`
    <h1 class="page-title">${t("certTitle")}</h1>
    ${expiryReminderHtml(values["Expiry Date"])}
    <div class="card">
      <div class="card-body">
        <p class="alert">${t("certStatus")}: <strong>${escapeHtml(cert.status)}</strong></p>
        <dl class="fields">${fields}</dl>
      </div>
    </div>
    <a class="btn btn-primary" href="/">${t("backHome")}</a>
    <div id="cert-expiry-reminder" hidden data-token="${escapeHtml(token)}" data-expiry="${escapeHtml(values["Expiry Date"] ?? "")}"></div>
  `);
}

async function mountPrintQr() {
  const img = document.getElementById("cert-qr");
  if (!img) return;
  const url = img.getAttribute("data-url");
  if (!url) return;
  try {
    img.src = await qrDataUrlWithLogo(url, { size: 240 });
  } catch {
    /* QR render failed */
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function saveFromEditor(previewAfter) {
  const form = document.getElementById("cert-editor");
  if (!form) return;
  const tokenInput = form.querySelector('[name="linkToken"]');
  const token = tokenInput?.value?.trim();
  if (!token) {
    showToast("Follow link ID is required");
    return;
  }
  const before = getCertificateForEdit(token);
  const payload = readFormValues(form);
  saveCertificate(token, payload);
  sessionStorage.setItem("dastak:editor-token", token);
  const valueChanges = diffCertificateValues(before.values, payload.values);
  const statusChanged = before.status !== payload.status;
  recordCertificateAudit(token, {
    action: isCreateMode() ? "create" : "save",
    role: "admin",
    summary: isCreateMode() ? "Certificate created" : "Certificate updated",
    changes: [
      ...(statusChanged ? [{ field: "status", from: before.status, to: payload.status }] : []),
      ...valueChanges,
    ],
  });
  recordAnalyticsEvent(EVENT_TYPES.ADMIN_SAVE, { token, trackingId: payload.values["Tracking ID"] });
  showToast(isCreateMode() ? "Certificate created" : "Certificate saved");
  if (previewAfter) {
    window.open(followPath(token), "_blank", "noopener,noreferrer");
  }
  navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`);
}

function updateFollowLinkPreview() {
  const form = document.getElementById("cert-editor");
  if (!form) return;
  const token = form.querySelector('[name="linkToken"]')?.value?.trim() || FOLLOW_TOKEN;
  const path = followPath(token);
  const openLink = document.getElementById("open-cert-link");
  const printLink = document.getElementById("open-print-link");
  if (openLink) openLink.setAttribute("href", path);
  if (printLink) printLink.setAttribute("href", printPath(token));
}

function navigate(path) {
  window.history.pushState({}, "", path);
  render();
}

function bindActions() {
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", async () => {
      const action = el.getAttribute("data-action");
      if (action === "copy") {
        const token =
          document.querySelector('[name="linkToken"]')?.value?.trim() ||
          getEditorToken();
        const link = followLink(window.location.origin, token);
        try {
          await navigator.clipboard.writeText(link);
          showToast("Follow link copied");
        } catch {
          showToast(link);
        }
      }
      if (action === "load-cert") {
        const form = document.getElementById("cert-editor");
        if (!form) return;
        const token = form.querySelector('[name="linkToken"]')?.value?.trim();
        if (!token) {
          showToast("Enter a link ID to load");
          return;
        }
        fillForm(form, getCertificateForEdit(token));
        updateFollowLinkPreview();
        showToast("Certificate loaded from storage");
      }
      if (action === "reset-form") {
        const form = document.getElementById("cert-editor");
        if (!form) return;
        fillForm(form, isCreateMode() ? newCertificateTemplate() : defaultCertificate());
        updateFollowLinkPreview();
        showToast(isCreateMode() ? "New IDs generated (not saved)" : "Form reset (not saved)");
      }
      if (action === "save-preview") saveFromEditor(true);
      if (action === "download-pdf") {
        const pdfToken =
          el.getAttribute("data-token") ||
          document.querySelector('[name="linkToken"]')?.value?.trim();
        if (!pdfToken) return;
        showToast("Preparing PDF…");
        try {
          const { downloadCertificatePdf } = await import("./pdf-download.js");
          await downloadCertificatePdf(pdfToken);
          showToast("PDF downloaded");
        } catch {
          showToast("PDF download failed");
        }
      }
      if (action === "toggle-lang") {
        setLang(getLang() === "ur" ? "en" : "ur");
        render();
      }
      if (action === "scroll-verify") {
        document.getElementById("home-verify")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (action === "scroll-track") {
        document.getElementById("home-track")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (action === "export-json") {
        downloadTextFile(`dastak-certificates-${Date.now()}.json`, exportCertificatesJson());
        showToast("JSON exported");
      }
      if (action === "export-csv") {
        downloadTextFile(`dastak-certificates-${Date.now()}.csv`, exportCertificatesCsv(), "text/csv");
        showToast("CSV exported");
      }
      if (action === "delete-cert") {
        const token = document.querySelector('[name="linkToken"]')?.value?.trim();
        if (!token) return;
        if (!window.confirm(`Delete saved data for link ID "${token}"?`)) return;
        deleteCertificate(token);
        recordCertificateAudit(token, {
          action: "delete",
          role: "admin",
          summary: "Certificate deleted from storage",
          changes: [],
        });
        showToast(
          token === FOLLOW_TOKEN
            ? "Default link reset to built-in values"
            : "Certificate deleted"
        );
        navigate(`/admin/dashboard?token=${encodeURIComponent(FOLLOW_TOKEN)}`);
      }
      if (action === "admin-create-new") {
        navigate("/admin/dashboard?create=1");
      }
      if (action === "analytics-clear") {
        if (!window.confirm("Clear all locally stored analytics events? Certificate data is not affected.")) return;
        clearAnalyticsEvents();
        showToast("Activity log cleared");
        navigate("/admin/dashboard?view=analytics");
      }
      if (action === "admin-logout") {
        logoutAdmin();
        navigate("/admin");
      }
      if (action === "print-a4") window.print();
      if (action === "feedback") showToast("Feedback is not enabled in this app.");
      if (action === "help") showToast("Use /admin to manage certificate data.");
      if (action === "toggle-theme") {
        toggleTheme();
        showToast(document.documentElement.getAttribute("data-theme") === "dark" ? "Dark mode on" : "Light mode on");
      }
    });
  });

  const trackForm = document.getElementById("track-application-form");
  if (trackForm) {
    trackForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleTrackApplication(trackForm);
    });
  }

  const verifyForm = document.getElementById("verify-license-form");
  if (verifyForm) {
    verifyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleVerifyLicense(verifyForm);
    });
  }

  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const password = loginForm.querySelector('[name="password"]')?.value ?? "";
      if (!loginAdmin(password)) {
        showToast("Incorrect password");
        return;
      }
      navigate("/admin/dashboard");
    });
  }

  const form = document.getElementById("cert-editor");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveFromEditor(false);
    });
    form.addEventListener("input", () => updateFollowLinkPreview());
    form.addEventListener("change", (event) => {
      if (event.target.getAttribute("name") !== "Issue Date") return;
      const expiryInput = form.querySelector(`[name="${cssEscape("Expiry Date")}"]`);
      if (expiryInput) {
        expiryInput.value = expiryFromIssueDate(event.target.value);
      }
    });
  }

  document.querySelectorAll(".cert-list-item").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const url = new URL(link.href);
      sessionStorage.setItem("dastak:editor-token", url.searchParams.get("token") || FOLLOW_TOKEN);
      navigate(`${url.pathname}${url.search}`);
    });
  });

  const trackFilter = document.getElementById("analytics-track-filter");
  const trackBody = document.getElementById("analytics-track-body");
  if (trackFilter && trackBody) {
    trackFilter.addEventListener("input", () => {
      const q = trackFilter.value.trim().toLowerCase();
      trackBody.querySelectorAll(".analytics-track-row").forEach((row) => {
        const text = row.textContent?.toLowerCase() ?? "";
        row.hidden = q.length > 0 && !text.includes(q);
      });
    });
  }

  document.querySelectorAll(".analytics-track-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      const token = row.getAttribute("data-token");
      if (!token) return;
      sessionStorage.setItem("dastak:editor-token", token);
      navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`);
    });
  });

  const expiringFilter = new URLSearchParams(window.location.search).get("filter");
  if (expiringFilter === "expiring" && trackBody) {
    trackBody.querySelectorAll(".analytics-track-row").forEach((row) => {
      const left = Number(row.getAttribute("data-days-left"));
      row.hidden = !(Number.isFinite(left) && left >= 0 && left <= 30);
    });
    if (trackFilter) trackFilter.placeholder = "Showing expiring within 30 days…";
  }

  document.querySelectorAll("[data-import]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const kind = input.getAttribute("data-import");
        const count =
          kind === "csv" ? importCertificatesCsv(text) : importCertificatesJson(text);
        showToast(`Imported ${count} certificate(s)`);
        input.value = "";
        render();
      } catch {
        showToast("Import failed — check file format");
        input.value = "";
      }
    });
  });
}

function render() {
  let path = window.location.pathname.replace(/\/$/, "") || "/";

  const redirect = requireAdmin(path);
  if (redirect) {
    navigate(redirect);
    return;
  }

  if (path === "/edit") {
    navigate(isAdminLoggedIn() ? "/admin/dashboard" : "/admin");
    return;
  }

  const printMatch = path.match(/^\/vehiclefitness\/([^/]+)\/print$/);
  if (printMatch) {
    const printToken = printMatch[1];
    if (!getCertificate(printToken)) {
      recordAnalyticsEvent(EVENT_TYPES.CERT_PRINT, { token: printToken, success: false });
      app.innerHTML = layout(`
        <h1 class="page-title">Print certificate</h1>
        <div class="not-found">
          <p class="alert">Certificate Status: <strong>Not Found</strong></p>
          <a class="btn btn-primary" href="/">Back to Home</a>
        </div>
      `);
      bindActions();
      return;
    }
    recordAnalyticsEvent(EVENT_TYPES.CERT_PRINT, { token: printToken, success: true });
    app.innerHTML = renderA4PrintPage(printToken);
    bindActions();
    mountPrintQr();
    return;
  }

  const certMatch = path.match(/^\/vehiclefitness\/([^/]+)$/);
  if (certMatch) {
    const certToken = certMatch[1];
    const cert = getCertificate(certToken);
    recordAnalyticsEvent(EVENT_TYPES.CERT_VIEW, {
      token: certToken,
      success: !!cert,
    });
    app.innerHTML = certificatePage(certToken);
  } else if (path === "/admin/dashboard") {
    app.innerHTML = adminDashboardPage();
  } else if (path === "/admin") {
    app.innerHTML = isAdminLoggedIn() ? adminDashboardPage() : adminLoginPage();
  } else if (path === "/") {
    app.innerHTML = homePage();
  } else {
    app.innerHTML = homePage();
  }
  bindActions();
  syncThemeToggleUI();
  applyDocumentLang();

  const certReminder = document.getElementById("cert-expiry-reminder");
  if (certReminder) {
    maybeShowPublicExpiryReminder(
      certReminder.getAttribute("data-token") || "",
      certReminder.getAttribute("data-expiry") || ""
    );
  }

  if (path === "/admin/dashboard" && isAdminLoggedIn()) {
    window.setTimeout(() => maybeShowAdminExpiryReminder(), 300);
  }
}

window.addEventListener("popstate", render);
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='/']");
  if (!link || link.getAttribute("target") === "_blank") return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.getAttribute("href"));
  render();
});

applyTheme();
render();
