import "./style.css";
import "./print-a4.css";
import "./permit-print.css";
import { hideAppLoader, showAppLoader } from "./loader.js";
import { showSaveProgress, showAdminProgress, hideSaveProgress, setSaveFormBusy } from "./save-progress.js";
import { applyTheme, syncThemeToggleUI, themeToggleButton, toggleTheme } from "./theme.js";
import { isAdminLoggedIn, loginAdmin, logoutAdmin, requireAdmin } from "./admin.js";
import {
  FIELD_LABELS,
  FOLLOW_TOKEN,
  defaultCertificate,
  deleteCertificate,
  fillForm,
  followLinkPublic,
  followPath,
  followPathPublic,
  publicSiteOrigin,
  generateLinkId,
  newCertificateTemplate,
  getCertificate,
  getPublicCertificate,
  getCertificateForEdit,
  getCertificateSummary,
  findTokenByField,
  listSavedTokens,
  isCertificateSaved,
  isDefaultDemoLocalSave,
  findDeployedPublishedEntry,
  findPublishedEntry,
  findPublishedEntryPublic,
  isPublishedSuppressed,
  ensurePublishedLoaded,
  refreshPublishedCertificates,
  resetPublishedLoadCache,
  hydrateCertificateFromApi,
  hydratePublicCertificate,
  waitForCertificateLive,
  resolvePublicCertificateToken,
  findDuplicateRegistration,
  renewCertificateTemplateFrom,
  printPath,
  readFormValues,
  UPPERCASE_VEHICLE_ID_FIELDS,
  saveCertificate,
  DATE_FIELD_LABELS,
  toDateInputValue,
  CERTIFICATE_STATUS_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  FUEL_TYPE_OPTIONS,
  SEATING_CAPACITY_OPTIONS,
  DEFAULT_SEATING_CAPACITY,
  VEHICLE_MODEL_OPTIONS,
  REGISTERED_LADEN_WEIGHT_OPTIONS,
  LADEN_WEIGHT_CUSTOM_VALUE,
  LADEN_WEIGHT_CUSTOM_FIELD,
  SERVICE_TYPE_OPTIONS,
  CERTIFICATE_TYPE_OPTIONS,
  normalizeServiceType,
  normalizeCertificateType,
  serviceToCertificateType,
  expiryFromIssueDate,
  compareCertsNewestFirst,
  preferNewerUpdatedAt,
  formatCertListDate,
  cssEscape,
  validateAdminRequiredFields,
  ADMIN_REQUIRED_FIELD_LABELS,
} from "./certificates.js";
import {
  readRegistryCollapsed,
  writeRegistryCollapsed,
  recordCertLastSaved,
  readCertLastSavedIso,
  formatCertLastSaved,
  formSectionSlug,
  renderCertListSkeleton,
  sortCertListItems,
  applyCertQuickFilter,
  serializeFormSnapshot,
  isFormSnapshotDirty,
} from "./admin-dashboard-ui.js";
import {
  buildLocalOverviewRows,
  renderAdminOverviewPage,
  fetchOverviewRowsMerged,
} from "./admin-overview.js";
import { amountToWords } from "./amount-words.js";
import { renderA4PrintPage, renderA4PrintMissing } from "./print-a4.js";
import { renderPermitPrintPage, renderPermitPrintMissing } from "./permit-print.js";
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
  eventTypeMix,
  mergeAnalyticsRows,
  exportAnalyticsCsv,
  aggregateTokenStats,
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
  downloadTextFile,
  exportCertificatesCsv,
  exportCertificatesJson,
  importCertificatesCsv,
  importCertificatesJson,
} from "./bulk-data.js";
import {
  fetchAdminCertificateList,
  readCertListFilters,
  writeCertListFilters,
  readCertListPage,
  writeCertListPage,
  districtFilterOptionsHtml,
  statusFilterOptionsHtml,
} from "./admin-cert-api.js";
import {
  generatePermitLinkId,
  getPermitForEdit,
  getPublicPermit,
  hydratePublicPermit,
  newPermitTemplate,
  publicPermitPath,
  readPermitFormValues,
  resolvePermitToken,
  savePermit,
  deletePermit,
  fetchPermitList,
  findPermitTokenByField,
  validatePermitRequired,
} from "./permits.js";
import {
  bindPermitPhotoInput,
  bindPermitChoiceSelects,
  renderPermitEditor,
  renderPermitNotFound,
  renderPermitPreview,
  renderPermitRegistry,
} from "./permit-ui.js";

const ECITIZEN_HOME = "https://ecitizen.kp.gov.pk/";

const FORM_SECTIONS = [
  {
    title: "Applicant",
    desc: "Owner name and district for this record",
    nav: "Applicant",
    fields: ["Applicant Name", "Father Name", "District"],
  },
  {
    title: "Vehicle",
    desc: "Identity numbers, kind, and service type",
    nav: "Vehicle",
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
    desc: "Numbers, dates, and application workflow",
    nav: "Certificate",
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
    desc: "Fields that appear on the printed Form-I",
    nav: "A4 print",
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

function iconPlus() {
  return iconSvg(`<path d="M12 5v14"/><path d="M5 12h14"/>`);
}

function iconTrash() {
  return iconSvg(
    `<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>`
  );
}

function iconPreview() {
  return iconSvg(`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`);
}

function iconEyeOff() {
  return iconSvg(
    `<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a18.5 18.5 0 0 1-4.2 4.6"/><path d="M6.1 6.1C3.3 8.2 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 4.4-1"/>`
  );
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

function iconArrowLeft() {
  return iconSvg(`<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>`);
}

function iconChart() {
  return iconSvg(`<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/>`);
}

function iconAlert() {
  return iconSvg(
    `<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`
  );
}

function iconActivity() {
  return iconSvg(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`);
}

function iconMap() {
  return iconSvg(`<polygon points="1 6 9 2 15 6 23 2 23 18 15 22 9 18 1 22"/><line x1="9" x2="9" y1="2" y2="18"/><line x1="15" x2="15" y1="6" y2="22"/>`);
}

function iconSearch() {
  return iconSvg(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`, 16);
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
  "Serial Number": `<path d="M4 7h16"/><path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 11h16"/><path d="M8 15h2"/><path d="M12 15h4"/>`,
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
  const { showWelcome = true, shellClass = "" } = options;
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
    <div class="app-shell${shellClass ? ` ${shellClass}` : ""}">
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
  if (view === "analytics") return "analytics";
  if (view === "registry") return "registry";
  if (view === "permits") return "permits";
  return "overview";
}

function iconGlobe() {
  return iconSvg(`<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`);
}

function adminRailLinkContent(icon, label) {
  return `<span class="admin-rail-link-icon">${icon}</span><span class="admin-rail-link-label">${label}</span>`;
}

function adminRailNav(activeView) {
  const editorOpen = activeView === "certificates";

  const link = (href, label, icon, active, tone = "") =>
    `<a class="admin-rail-link${active ? " is-active" : ""}${tone ? ` admin-rail-tone-${tone}` : ""}" href="${href}">${adminRailLinkContent(icon, label)}</a>`;

  return `
    <div class="admin-rail-body">
      <div class="admin-rail-primary">
        ${link("/admin/dashboard", "Dashboard", iconActivity(), activeView === "overview", "teal")}
        <button type="button" class="admin-rail-link admin-rail-link-btn admin-rail-tone-teal" data-action="admin-create-new">
          ${adminRailLinkContent(iconPlus(), "New certificate")}
        </button>
      </div>

      <p class="admin-rail-section-label">Workspace</p>
      <details class="admin-rail-menu" open>
        <summary class="admin-rail-menu-summary">
          <span class="admin-rail-link-icon">${iconSave()}</span>
          <span class="admin-rail-menu-title">Certificates</span>
          <span class="admin-rail-chevron" aria-hidden="true"></span>
        </summary>
        <nav class="admin-rail-subnav" aria-label="Certificate workspace">
          ${link("/admin/dashboard?view=registry", "Registry", iconSave(), activeView === "registry")}
          ${link("/admin/dashboard?view=analytics", "Analytics & reports", iconChart(), activeView === "analytics")}
          ${
            editorOpen
              ? `<span class="admin-rail-link admin-rail-sublink is-active admin-rail-link-static admin-rail-tone-teal">${adminRailLinkContent(iconPreview(), "Edit certificate")}</span>`
              : ""
          }
        </nav>
      </details>
      <details class="admin-rail-menu" ${activeView === "permits" || activeView === "permit-editor" ? "open" : ""}>
        <summary class="admin-rail-menu-summary">
          <span class="admin-rail-link-icon">${iconMap()}</span>
          <span class="admin-rail-menu-title">Route Permits</span>
          <span class="admin-rail-chevron" aria-hidden="true"></span>
        </summary>
        <nav class="admin-rail-subnav" aria-label="Route permit workspace">
          ${link("/admin/dashboard?view=permits", "Permit registry", iconMap(), activeView === "permits" || activeView === "permit-editor")}
          <button type="button" class="admin-rail-link admin-rail-sublink admin-rail-link-btn" data-action="admin-create-permit">
            ${adminRailLinkContent(iconPlus(), "New permit")}
          </button>
        </nav>
      </details>
    </div>
  `;
}

function adminDashboardShell(mainHtml, activeView = "overview") {
  const pageTitle =
    activeView === "analytics"
      ? "Analytics & reports"
      : activeView === "registry"
        ? "Certificate registry"
        : activeView === "certificates"
          ? "Edit certificate"
          : activeView === "permits" || activeView === "permit-editor"
            ? "Route permits"
            : "Dashboard";
  const editorOpen = activeView === "certificates" && isAdminEditorOpen();
  const pageLead =
    activeView === "analytics"
      ? "Views, prints, expiry risk, and activity counted on this browser."
      : activeView === "registry"
        ? "Search, filter, and open a record to edit or save."
        : activeView === "permits"
          ? "Issue and manage route permits separately from vehicle fitness certificates."
          : activeView === "permit-editor"
            ? "Edit permit fields and save. Public preview uses /routepermits."
            : editorOpen
              ? "Edit fields and save. Registry stays on its own screen."
              : "Registry health, fitness expiry, and recent public activity.";
  return `
    <div class="app-shell admin-shell admin-ui-v2">
      <aside class="admin-rail admin-rail-light" aria-label="Admin navigation">
        <div class="admin-rail-brand-block">
          <div class="admin-rail-brand">
            <img class="admin-rail-logo" src="/images/logo-dastak.png" alt="Dastak" />
            <strong class="admin-rail-wordmark">DASTAK</strong>
            <span class="admin-rail-brand-dot" aria-hidden="true"></span>
          </div>
          <p class="admin-rail-tagline">Vehicle fitness admin</p>
        </div>
        ${adminRailNav(activeView)}
        <div class="admin-rail-foot">
          <p class="admin-rail-section-label">Account</p>
          <div class="admin-rail-theme">${themeToggleButton()}</div>
          <button class="admin-rail-link admin-rail-link-btn admin-rail-logout" type="button" data-action="admin-logout">
            ${adminRailLinkContent(iconLogout(), "Log out")}
          </button>
        </div>
      </aside>
      <div class="admin-frame">
        <header class="admin-context-bar">
          <div class="admin-context-text">
            <h1 class="admin-context-title">${pageTitle}</h1>
            <p class="admin-context-lead">${pageLead}</p>
          </div>
          <div class="admin-context-aside">
            ${
              activeView === "overview" || activeView === "registry" || activeView === "certificates"
                ? `<span id="admin-publish-health-dot" class="admin-publish-dot admin-publish-dot-pending" title="Checking publish status…" aria-label="Publish status"></span>`
                : ""
            }
            ${
              activeView === "overview" || activeView === "registry" || activeView === "certificates"
                ? `<button class="btn btn-primary admin-context-cta" type="button" data-action="admin-create-new">${iconPlus()} New certificate</button>`
                : activeView === "permits" || activeView === "permit-editor"
                  ? `<button class="btn btn-primary admin-context-cta" type="button" data-action="admin-create-permit">${iconPlus()} New permit</button>`
                  : ""
            }
          </div>
        </header>
        <div
          id="admin-save-progress"
          class="admin-save-progress"
          hidden
          role="progressbar"
          aria-live="polite"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
        >
          <div class="admin-save-progress-head">
            <p class="admin-save-progress-label" id="admin-save-progress-label">Saving…</p>
            <span class="admin-save-progress-pct" id="admin-save-progress-pct">0%</span>
          </div>
          <div class="admin-save-progress-track">
            <div class="admin-save-progress-bar" id="admin-save-progress-bar"></div>
          </div>
        </div>
        <main class="admin-frame-body">
          <div id="publish-health-banner" class="admin-alert-banner" hidden role="status"></div>
          ${mainHtml}
        </main>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

function fieldControl({ id, name, value, multiline = false, inputType = "text", readonly = false, required = false }) {
  const ro = readonly ? " readonly disabled" : "";
  const req = required && !readonly ? " required" : "";
  if (multiline) {
    return `<textarea id="${id}" class="form-control" name="${name}" rows="2"${ro}${req}>${escapeHtml(value)}</textarea>`;
  }
  return `<input id="${id}" class="form-control${inputType === "date" ? " form-control-date" : ""}" type="${inputType}" name="${name}" value="${escapeHtml(value)}"${ro}${req} />`;
}

function fieldSelect({ id, name, value, options, readonly = false, required = true, placeholder = "" }) {
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
  const placeholderOpt =
    placeholder && !value
      ? `<option value="" selected disabled hidden>${escapeHtml(placeholder)}</option>`
      : "";
  const req = required ? " required" : "";
  return `<select id="${id}" class="form-control" name="${name}" ${readonly ? "disabled" : ""}${req}>${placeholderOpt}${customOpt}${opts}</select>`;
}

function adminFieldLabel(label) {
  const req = ADMIN_REQUIRED_FIELD_LABELS.includes(label)
    ? `<span class="form-label-required" aria-hidden="true">*</span>`
    : "";
  return `<span class="form-label">${escapeHtml(label)}${req}</span>`;
}

function fieldInput(label, value, iconKey = label, readonly = false) {
  const name = label.replace(/"/g, "&quot;");
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const isDate = DATE_FIELD_LABELS.includes(label);
  const isRequired = ADMIN_REQUIRED_FIELD_LABELS.includes(label);
  const displayValue = isDate ? toDateInputValue(value) : value;
  if (label === "Application Status") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
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
  if (label === "District") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: displayValue || DISTRICT_OPTIONS[0],
            options: DISTRICT_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  if (label === "Vehicle Fuel Type") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: (displayValue || FUEL_TYPE_OPTIONS[0]).toUpperCase(),
            options: FUEL_TYPE_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  if (label === "Seating Capacity") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: displayValue || DEFAULT_SEATING_CAPACITY,
            options: SEATING_CAPACITY_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  if (label === "Service") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: normalizeServiceType(displayValue),
            options: SERVICE_TYPE_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  if (label === "Certificate Type") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: normalizeCertificateType(displayValue),
            options: CERTIFICATE_TYPE_OPTIONS,
            readonly,
          })}
        </div>
      </label>
    `;
  }
  if (label === "Vehicle Model") {
    return `
      <label class="form-field" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          ${fieldSelect({
            id,
            name,
            value: displayValue || VEHICLE_MODEL_OPTIONS[0] || "",
            options: VEHICLE_MODEL_OPTIONS,
            readonly,
            placeholder: "Select model year",
          })}
        </div>
      </label>
    `;
  }
  if (label === "Registered Laden Weight") {
    const raw = String(displayValue ?? "").trim();
    const isPreset = REGISTERED_LADEN_WEIGHT_OPTIONS.includes(raw);
    const selectValue = isPreset ? raw : raw ? LADEN_WEIGHT_CUSTOM_VALUE : REGISTERED_LADEN_WEIGHT_OPTIONS[0];
    const presetOpts = REGISTERED_LADEN_WEIGHT_OPTIONS.map((opt) => {
      const sel = opt === selectValue ? " selected" : "";
      return `<option value="${escapeHtml(opt)}"${sel}>${escapeHtml(opt)}</option>`;
    }).join("");
    const customSelected = selectValue === LADEN_WEIGHT_CUSTOM_VALUE ? " selected" : "";
    const customHidden = selectValue === LADEN_WEIGHT_CUSTOM_VALUE ? "" : " hidden";
    const customVal = !isPreset ? escapeHtml(raw) : "";
    const customId = `${id}-custom`;
    return `
      <label class="form-field form-field-laden-weight" for="${id}">
        ${adminFieldLabel(label)}
        <div class="form-input-wrap">
          <span class="form-field-icon">${fieldIcon(iconKey)}</span>
          <select id="${id}" class="form-control" name="${name}" data-laden-weight-select ${readonly ? "disabled" : ""} required>
            ${presetOpts}
            <option value="${LADEN_WEIGHT_CUSTOM_VALUE}"${customSelected}>Custom…</option>
          </select>
        </div>
        <div class="form-input-wrap form-laden-weight-custom-wrap"${customHidden}>
          <input
            id="${customId}"
            class="form-control form-laden-weight-custom"
            type="text"
            name="${LADEN_WEIGHT_CUSTOM_FIELD.replace(/"/g, "&quot;")}"
            value="${customVal}"
            placeholder="Enter custom weight (e.g. 30000.00)"
            inputmode="decimal"
            ${readonly ? "readonly disabled" : ""}
          />
        </div>
      </label>
    `;
  }
  if (label === "Expiry Date") {
    return `
    <label class="form-field" for="${id}">
      ${adminFieldLabel(label)}
      <div class="form-input-wrap form-input-wrap-date">
        <span class="form-field-icon">${fieldIcon(iconKey)}</span>
        ${fieldControl({
          id,
          name,
          value: displayValue,
          multiline: false,
          inputType: "date",
          readonly,
          required: isRequired,
        })}
      </div>
      <p class="form-field-hint" id="admin-expiry-hint">Valid for six months from issue date when auto-filled.</p>
    </label>
  `;
  }
  const upperValue =
    UPPERCASE_VEHICLE_ID_FIELDS.includes(label) && displayValue
      ? String(displayValue).toUpperCase()
      : displayValue;
  return `
    <label class="form-field" for="${id}">
      ${adminFieldLabel(label)}
      <div class="form-input-wrap${isDate ? " form-input-wrap-date" : ""}">
        <span class="form-field-icon">${fieldIcon(iconKey)}</span>
        ${fieldControl({
          id,
          name,
          value: upperValue,
          multiline: false,
          inputType: isDate ? "date" : "text",
          readonly,
          required: isRequired,
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
  const permitToken =
    findPermitTokenByField("Tracking ID", trackingId) ||
    findPermitTokenByField("Route Permit No", trackingId);
  if (!token && permitToken) {
    recordLookupAttempt();
    navigate(publicPermitPath(permitToken));
    return;
  }
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
  if (licenseType === "routepermits") {
    recordLookupAttempt();
    const permitToken =
      findPermitTokenByField("Route Permit No", documentNumber) ||
      findPermitTokenByField("Vehicle Registration No", documentNumber) ||
      findPermitTokenByField("Tracking ID", documentNumber) ||
      resolvePermitToken(documentNumber);
    const permit = permitToken ? getPublicPermit(permitToken) : null;
    if (!permit) {
      showToast("No route permit found for this document number");
      return;
    }
    navigate(publicPermitPath(permit.token));
    return;
  }
  if (licenseType !== "vehicle_fitness") {
    showToast("This demo supports Vehicle Fitness Certificate and Route Permit verification");
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

function loginArtSvg() {
  return `
    <svg class="admin-login-art-svg" viewBox="0 0 640 560" fill="none" aria-hidden="true">
      <ellipse cx="320" cy="486" rx="196" ry="24" fill="#d5e4dc"/>
      <path d="M86 176c52-92 178-132 286-94 88 32 188 22 230 92 46 76 12 174-78 218-88 42-228 64-330 18-90-42-156-138-108-234Z" fill="#e8f3ee"/>
      <rect x="214" y="72" width="236" height="304" rx="16" fill="#fff" stroke="#d4e0d8"/>
      <rect x="238" y="98" width="188" height="16" rx="8" fill="#6398a9"/>
      <rect x="238" y="130" width="132" height="8" rx="4" fill="#d5e0d8"/>
      <rect x="238" y="148" width="168" height="8" rx="4" fill="#e4eee8"/>
      <rect x="238" y="166" width="110" height="8" rx="4" fill="#e4eee8"/>
      <rect x="238" y="202" width="72" height="7" rx="3" fill="#c5d8cf"/>
      <rect x="324" y="202" width="102" height="7" rx="3" fill="#eef4f1"/>
      <rect x="238" y="220" width="72" height="7" rx="3" fill="#c5d8cf"/>
      <rect x="324" y="220" width="102" height="7" rx="3" fill="#eef4f1"/>
      <rect x="238" y="238" width="72" height="7" rx="3" fill="#c5d8cf"/>
      <rect x="324" y="238" width="102" height="7" rx="3" fill="#eef4f1"/>
      <rect x="348" y="268" width="70" height="70" rx="8" fill="#f7f4ee" stroke="#96c7b3"/>
      <path d="M364 284h8v8h-8zm14 0h8v8h-8zm14 0h8v8h-8zm-28 14h8v8h-8zm28 0h8v8h-8zm-28 14h8v8h-8zm14 0h8v8h-8zm14 0h8v8h-8z" fill="#2d3436"/>
      <circle cx="278" cy="302" r="20" fill="#eef6f2" stroke="#96c7b3" stroke-width="3"/>
      <path d="M270 302l6 6 12-12" stroke="#4e7a8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M96 360h36l22-30h58l20 30h28v22H96z" fill="#6398a9"/>
      <path d="M140 356l16-22h46l14 22z" fill="#f9b95c"/>
      <rect x="96" y="360" width="170" height="22" rx="6" fill="#4e7a8a"/>
      <circle cx="132" cy="386" r="15" fill="#2d3436"/>
      <circle cx="132" cy="386" r="6" fill="#d9e4dc"/>
      <circle cx="226" cy="386" r="15" fill="#2d3436"/>
      <circle cx="226" cy="386" r="6" fill="#d9e4dc"/>
      <circle cx="486" cy="368" r="48" fill="#fff" stroke="#d4e4dc"/>
      <circle cx="486" cy="368" r="32" fill="none" stroke="#d7897f" stroke-width="8"/>
      <circle cx="486" cy="368" r="5" fill="#d7897f"/>
    </svg>
  `;
}

function adminLoginPage() {
  return `
    <div class="admin-login-page">
      <div class="admin-login-stage">
        <aside class="admin-login-art" aria-hidden="true">
          ${loginArtSvg()}
        </aside>
        <main class="admin-login-panel">
          <div class="admin-login-panel-top">
            <a class="admin-login-back-link" href="/">${iconGlobe()} Public site</a>
            <div class="admin-login-theme">${themeToggleButton()}</div>
          </div>
          <div class="admin-login-panel-body">
            <img class="admin-login-mark" src="/images/logo-dastak.png" alt="Dastak" />
            <p class="admin-login-welcome">Welcome — sign in to vehicle fitness admin</p>
            <h1 class="admin-login-heading">Login</h1>
            <form id="admin-login-form" class="admin-login-form" autocomplete="off">
              <label class="form-field" for="admin-password">
                <span class="form-label">Password</span>
                <div class="form-input-wrap admin-login-pw-wrap">
                  <input
                    id="admin-password"
                    class="form-control"
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    autocomplete="current-password"
                    required
                  />
                  <button class="admin-login-pw-toggle" type="button" data-action="admin-login-toggle-pw" aria-label="Show password">
                    ${iconPreview()}
                  </button>
                </div>
              </label>
              <div class="admin-login-submit-row">
                <button class="btn btn-primary admin-login-submit" type="submit">
                  Sign in ${iconArrowRight()}
                </button>
              </div>
            </form>
            <p class="admin-login-footnote">${iconLock()} Authorized staff only</p>
          </div>
        </main>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

const RENEW_DRAFT_KEY = "dastak:renew-draft";
const ANALYTICS_PERIOD_KEY = "dastak:analytics-period";
const ANALYTICS_ROWS_CACHE_KEY = "dastak:analytics-rows-cache";

function readAnalyticsPeriodDays() {
  const fromUrl = new URLSearchParams(window.location.search).get("period");
  if (fromUrl === "30") return 30;
  if (fromUrl === "7") return 7;
  const stored = parseInt(sessionStorage.getItem(ANALYTICS_PERIOD_KEY) || "7", 10);
  return stored === 30 ? 30 : 7;
}
let certListSearchTimer = null;

function readRenewDraft() {
  try {
    const raw = sessionStorage.getItem(RENEW_DRAFT_KEY);
    sessionStorage.removeItem(RENEW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.values) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeSearchKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s.\-_/]/g, "");
}

function certSearchTermMatches(term, hay, regNorm) {
  const needle = term.toLowerCase().trim();
  if (!needle) return true;
  if (hay.includes(needle)) return true;
  const compact = normalizeSearchKey(needle);
  if (!compact) return true;
  if (normalizeSearchKey(hay).includes(compact)) return true;
  if (regNorm && regNorm.includes(compact)) return true;
  return false;
}

function isRecentlySaved(token, maxAgeMs = 24 * 60 * 60 * 1000) {
  const iso = readCertLastSavedIso(token);
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t >= 0 && Date.now() - t < maxAgeMs;
}

function localOnlyCertRows(filters) {
  const q = String(filters.q ?? "").trim();
  const district = String(filters.district ?? "").trim();
  const status = String(filters.status ?? "").trim();
  const expiringDays = filters.expiring === "30" ? 30 : 0;

  return listSavedTokens()
    .filter((token) => token !== FOLLOW_TOKEN)
    .filter((token) => !isDefaultDemoLocalSave(token))
    .filter((token) => {
      if (!isCertificateSaved(token)) return false;
      const tracking = getCertificateForEdit(token).values["Tracking ID"];
      if (!certificateLiveOnSite(token, tracking)) return true;
      return isRecentlySaved(token);
    })
    .map((token) => {
      const summary = getCertificateSummary(token);
      const { values, status: certStatus } = getCertificateForEdit(token);
      return {
        token,
        applicant: summary.applicant,
        registrationNumber: String(values["Registration Number"] ?? "").trim(),
        trackingId: String(values["Tracking ID"] ?? "").trim(),
        certificateNumber: summary.certificateNumber,
        district: String(values["District"] ?? "").trim(),
        service: String(values["Service"] ?? "").trim(),
        issueDate: String(values["Issue Date"] ?? "").trim(),
        expiryDate: String(values["Expiry Date"] ?? "").trim(),
        status: certStatus,
        daysLeft: daysUntilExpiry(values["Expiry Date"]),
        updatedAt: readCertLastSavedIso(token),
        localOnly: true,
      };
    })
    .filter((row) => {
      if (district && row.district !== district) return false;
      if (status && row.status !== status) return false;
      if (expiringDays > 0) {
        if (row.daysLeft == null || row.daysLeft < 0 || row.daysLeft > expiringDays) return false;
      }
      if (!q) return true;
      const hay = [row.applicant, row.registrationNumber, row.trackingId, row.certificateNumber, row.token]
        .join(" ")
        .toLowerCase();
      const regNorm = normalizeSearchKey(row.registrationNumber);
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      return terms.every((term) => certSearchTermMatches(term, hay, regNorm));
    })
    .sort(compareCertsNewestFirst);
}

function certListInitials(name) {
  const parts = String(name ?? "—")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function certificateLiveOnSite(token, trackingId) {
  const tracking = String(trackingId ?? "").trim();
  const id = String(token ?? "").trim();
  return (
    !!(tracking && findPublishedEntry(tracking)) ||
    !!(id && findPublishedEntry(id)) ||
    !!(tracking && findDeployedPublishedEntry(tracking)) ||
    !!(id && findDeployedPublishedEntry(id))
  );
}

function registryStatusBadge(item) {
  if (item.localOnly) {
    return `<span class="cert-badge cert-badge-local" title="On this device only — not on the website yet">Draft</span>`;
  }
  if (item.serverPublished || certificateLiveOnSite(item.token, item.trackingId)) {
    return `<span class="cert-badge cert-badge-live" title="On the live site (database / API)">Live</span>`;
  }
  return `<span class="cert-badge cert-badge-default" title="In registry but not published yet">Pending</span>`;
}

const registrySelectedTokens = new Set();

function renderCertListItemHtml(item, activeToken) {
  const daysLeft = item.daysLeft ?? daysUntilExpiry(item.expiryDate);
  const localBadge = registryStatusBadge(item);
  const issueLabel = formatCertListDate(item.issueDate);
  const service = String(item.service ?? "").trim();
  const district = String(item.district ?? "").trim();
  const registration = item.registrationNumber || "No registration";
  const selected = registrySelectedTokens.has(item.token);
  return `
    <div class="cert-list-item-row${selected ? " is-selected" : ""}" data-registry-token="${escapeHtml(item.token)}">
      <label class="cert-list-select" data-action="registry-select" data-token="${escapeHtml(item.token)}">
        <input type="checkbox" ${selected ? "checked" : ""} />
        <span class="visually-hidden">Select ${escapeHtml(item.applicant || "certificate")}</span>
      </label>
      <a
        class="cert-list-item${item.token === activeToken ? " active" : ""}${item.localOnly ? " cert-list-item-local" : ""}"
        href="/admin/dashboard?token=${encodeURIComponent(item.token)}"
      >
        <span class="cert-list-avatar" aria-hidden="true">${escapeHtml(certListInitials(item.applicant))}</span>
        <span class="cert-list-body">
          <span class="cert-list-top">
            <strong class="cert-list-name">${escapeHtml(item.applicant || "—")}</strong>
            <span class="cert-list-badges">
              ${certSidebarExpiryBadge(daysLeft)}
              ${localBadge}
            </span>
          </span>
          <span class="cert-list-reg">${escapeHtml(registration)}</span>
          <span class="cert-list-meta">
            ${district ? `<span class="cert-list-district">${escapeHtml(district)}</span>` : ""}
            ${service ? `<span class="cert-list-service">${escapeHtml(service)}</span>` : ""}
            ${issueLabel ? `<span class="cert-list-date">Issued ${escapeHtml(issueLabel)}</span>` : ""}
            <span class="cert-list-id">${escapeHtml(item.trackingId || item.token)}</span>
          </span>
        </span>
        <span class="cert-list-open">${iconArrowRight()} Open</span>
      </a>
      <div class="cert-list-row-actions">
        <button
          type="button"
          class="cert-list-action-btn"
          data-action="download-pdf"
          data-token="${escapeHtml(item.token)}"
          title="Download PDF"
          aria-label="Download PDF for ${escapeHtml(item.applicant || "certificate")}"
        >${iconDownload()}</button>
        <button
          type="button"
          class="cert-list-action-btn cert-list-renew-btn"
          data-action="renew-cert-registry"
          data-token="${escapeHtml(item.token)}"
          title="Renew certificate"
          aria-label="Renew ${escapeHtml(item.applicant || "certificate")}"
        >${iconPlus()}</button>
      </div>
    </div>
  `;
}

function certQuickFilterChip(id, label, activeQuick) {
  const active = activeQuick === id ? " is-active" : "";
  return `<button type="button" class="admin-filter-chip${active}" data-action="cert-quick-filter" data-quick="${id}">${label}</button>`;
}

function renderRegistryBulkBar() {
  const count = registrySelectedTokens.size;
  return `
    <div class="registry-bulk-bar" id="registry-bulk-bar"${count ? "" : " data-empty=1"}>
      <label class="registry-bulk-select-all" data-action="registry-select-page">
        <input type="checkbox" />
        Select page
      </label>
      <p class="registry-bulk-count" id="registry-bulk-count">${count} selected</p>
      <div class="registry-bulk-actions">
        <button class="registry-bulk-btn" type="button" data-action="registry-bulk-download" ${count ? "" : "disabled"}>
          ${iconDownload()} Download PDF
        </button>
        <button class="registry-bulk-btn registry-bulk-btn-danger" type="button" data-action="registry-bulk-delete" ${count ? "" : "disabled"}>
          ${iconTrash()} Delete
        </button>
        <button class="registry-bulk-btn registry-bulk-btn-ghost" type="button" data-action="registry-clear-selection" ${count ? "" : "disabled"}>
          Clear
        </button>
      </div>
    </div>
  `;
}

function visibleRegistryTokens() {
  return [...document.querySelectorAll("#cert-list [data-registry-token]")]
    .map((row) => row.getAttribute("data-registry-token"))
    .filter(Boolean);
}

function updateRegistryBulkBar() {
  const bar = document.getElementById("registry-bulk-bar");
  const countEl = document.getElementById("registry-bulk-count");
  const count = registrySelectedTokens.size;
  if (countEl) countEl.textContent = `${count} selected`;
  if (bar) bar.toggleAttribute("data-empty", count === 0);
  bar?.querySelectorAll("[data-action='registry-bulk-download'], [data-action='registry-bulk-delete'], [data-action='registry-clear-selection']").forEach((btn) => {
    btn.disabled = count === 0;
  });
  const visible = visibleRegistryTokens();
  const pageBox = bar?.querySelector(".registry-bulk-select-all input");
  if (pageBox) {
    pageBox.checked = visible.length > 0 && visible.every((token) => registrySelectedTokens.has(token));
    pageBox.indeterminate = visible.some((token) => registrySelectedTokens.has(token)) && !pageBox.checked;
  }
  document.querySelectorAll("#cert-list [data-registry-token]").forEach((row) => {
    const token = row.getAttribute("data-registry-token");
    const on = registrySelectedTokens.has(token);
    row.classList.toggle("is-selected", on);
    const box = row.querySelector(".cert-list-select input");
    if (box) box.checked = on;
  });
}

function renderRegistryTools() {
  return `
    <div class="admin-registry-tools-body">
      <button class="admin-list-tool" type="button" data-action="export-json">Export JSON</button>
      <button class="admin-list-tool" type="button" data-action="export-csv">Export CSV</button>
      <label class="admin-list-tool import-label">
        Import JSON
        <input type="file" accept="application/json,.json" data-import="json" hidden />
      </label>
      <label class="admin-list-tool import-label">
        Import CSV
        <input type="file" accept=".csv,text/csv" data-import="csv" hidden />
      </label>
    </div>
  `;
}

function renderCertListMessage({ title, body, action = "" }) {
  return `
    <div class="admin-registry-empty">
      <p class="admin-registry-empty-title">${escapeHtml(title)}</p>
      <p class="admin-registry-empty-body">${escapeHtml(body)}</p>
      ${action}
    </div>
  `;
}

function renderCertSidebar(activeToken, { fullPage = false } = {}) {
  const filters = readCertListFilters();
  const collapsed = !fullPage && readRegistryCollapsed();
  const sort = filters.sort || "issue-desc";
  const panelClass = fullPage ? " admin-list-panel-full" : collapsed ? " is-collapsed" : "";

  return `
    <aside class="admin-list-panel${panelClass}" id="admin-registry-panel">
      <div class="admin-list-panel-head">
        <div>
          <h2 class="admin-list-panel-title">${fullPage ? "Certificates" : "Registry"}</h2>
          <p class="admin-list-panel-count" id="cert-list-count">Loading…</p>
        </div>
        ${
          fullPage
            ? `<div class="admin-registry-head-aside">
                <div id="admin-context-kpis" class="admin-context-kpis" hidden aria-live="polite"></div>
                ${renderRegistryTools()}
              </div>`
            : `<button
          type="button"
          class="admin-registry-collapse-btn"
          data-action="toggle-registry-panel"
          aria-expanded="${collapsed ? "false" : "true"}"
          aria-controls="admin-registry-panel-body"
          title="${collapsed ? "Show registry" : "Hide registry"}"
        >${collapsed ? "Show" : "Hide"}</button>`
        }
      </div>
      <div class="admin-registry-panel-body" id="admin-registry-panel-body"${collapsed ? " hidden" : ""}>
        <div class="admin-registry-toolbar">
          <div class="admin-list-search">
            <span class="admin-list-search-icon">${iconSearch()}</span>
            <input
              id="cert-list-search"
              class="form-control admin-list-search-input"
              type="search"
              placeholder="Search name, registration, or tracking ID…"
              autocomplete="off"
              value="${escapeHtml(filters.q)}"
            />
          </div>
          <div class="admin-list-quick-filters" role="group" aria-label="Quick filters">
            ${certQuickFilterChip("", "All", filters.quick || "")}
            ${certQuickFilterChip("live", "Live", filters.quick || "")}
            ${certQuickFilterChip("local", "Local", filters.quick || "")}
            ${certQuickFilterChip("pending", "Pending", filters.quick || "")}
            ${certQuickFilterChip("expiring", "Expiring ≤30d", filters.quick || "")}
          </div>
          <div class="admin-list-filters">
            <select id="cert-list-district" class="form-control form-control-sm" aria-label="District filter">
              ${districtFilterOptionsHtml(filters.district)}
            </select>
            <select id="cert-list-status" class="form-control form-control-sm" aria-label="Status filter">
              ${statusFilterOptionsHtml(filters.status)}
            </select>
            <select id="cert-list-expiring" class="form-control form-control-sm" aria-label="Expiry filter">
              <option value=""${filters.expiring === "" ? " selected" : ""}>Any expiry</option>
              <option value="30"${filters.expiring === "30" ? " selected" : ""}>Expiring ≤ 30 days</option>
            </select>
            <select id="cert-list-sort" class="form-control form-control-sm" aria-label="Sort order">
              <option value="issue-desc"${sort === "issue-desc" ? " selected" : ""}>Newest first</option>
              <option value="expiry-asc"${sort === "expiry-asc" ? " selected" : ""}>Expiry soonest</option>
              <option value="name-asc"${sort === "name-asc" ? " selected" : ""}>Name A–Z</option>
            </select>
          </div>
        </div>
        ${renderRegistryBulkBar()}
        ${
          fullPage
            ? ""
            : `<details class="admin-registry-tools">
          <summary class="admin-registry-tools-summary">Registry tools</summary>
          ${renderRegistryTools()}
        </details>`
        }
        <div class="cert-list" id="cert-list">${renderCertListSkeleton(fullPage ? 8 : 6)}</div>
        <div class="cert-list-pager" id="cert-list-pager" hidden></div>
      </div>
    </aside>
  `;
}

async function populateAdminCertList(activeToken) {
  const listEl = document.getElementById("cert-list");
  const countEl = document.getElementById("cert-list-count");
  const pagerEl = document.getElementById("cert-list-pager");
  if (!listEl) return;

  listEl.innerHTML = renderCertListSkeleton();

  const filters = readCertListFilters();
  const page = readCertListPage();

  let data = null;
  try {
    data = await fetchAdminCertificateList({ page, limit: 25, filters });
  } catch {
    data = null;
  }

  const serverItems = (data?.items ?? [])
    .filter(
      (item) =>
        item.token !== FOLLOW_TOKEN &&
        !isPublishedSuppressed(item.token) &&
        !isPublishedSuppressed(item.trackingId)
    )
    .map((item) => ({
      ...item,
      serverPublished: true,
      updatedAt: preferNewerUpdatedAt(item.updatedAt, readCertLastSavedIso(item.token)),
    }));
  const deployedTracking = new Set(
    serverItems.map((item) => String(item.trackingId ?? "").trim()).filter(Boolean)
  );
  const localRows =
    page === 1
      ? localOnlyCertRows(filters).filter((row) => !deployedTracking.has(String(row.trackingId ?? "").trim()))
      : [];

  if (!data && !localRows.length) {
    listEl.innerHTML = renderCertListMessage({
      title: "Registry is offline",
      body: "Could not load the live list. Start the Worker APIs, or open a certificate by link ID.",
    });
    if (countEl) countEl.textContent = "Unavailable";
    if (pagerEl) pagerEl.hidden = true;
    return;
  }

  let mergedItems = [...localRows, ...serverItems];
  mergedItems = applyCertQuickFilter(mergedItems, filters.quick, (item) =>
    Boolean(item.serverPublished || certificateLiveOnSite(item.token, item.trackingId))
  );
  mergedItems = sortCertListItems(mergedItems, filters.sort || "issue-desc");
  const itemsHtml = mergedItems.map((item) => renderCertListItemHtml(item, activeToken)).join("");

  listEl.innerHTML =
    itemsHtml ||
    renderCertListMessage({
      title: "No certificates match",
      body: "Try another search, or clear filters to see the full registry.",
      action: `<button class="btn btn-ghost" type="button" data-action="cert-clear-filters">Clear filters</button>`,
    });

  if (countEl) {
    const total = (data?.total ?? 0) + (page === 1 ? localRows.length : 0);
    const totalPages = data?.totalPages ?? 1;
    countEl.textContent =
      data != null
        ? totalPages > 1
          ? `${total} certificates · page ${page} of ${totalPages}`
          : `${total} certificate${total === 1 ? "" : "s"}`
        : `${localRows.length} on this device`;
  }

  if (pagerEl && data && data.totalPages > 1) {
    pagerEl.hidden = false;
    pagerEl.innerHTML = `
      <button class="btn btn-ghost btn-sm" type="button" id="cert-list-prev" ${page <= 1 ? "disabled" : ""}>Previous</button>
      <span class="cert-list-pager-label">Page ${page} / ${data.totalPages}</span>
      <button class="btn btn-ghost btn-sm" type="button" id="cert-list-next" ${page >= data.totalPages ? "disabled" : ""}>Next</button>
    `;
  } else if (pagerEl) {
    pagerEl.hidden = true;
    pagerEl.innerHTML = "";
  }

  document.getElementById("cert-list-prev")?.addEventListener("click", () => {
    writeCertListPage(Math.max(1, readCertListPage() - 1));
    void populateAdminCertList(activeToken);
  });
  document.getElementById("cert-list-next")?.addEventListener("click", () => {
    writeCertListPage(readCertListPage() + 1);
    void populateAdminCertList(activeToken);
  });

  updateRegistryBulkBar();

  listEl.querySelectorAll(".cert-list-item").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (!confirmLeaveDirtyEditor()) return;
      const url = new URL(link.href);
      sessionStorage.setItem("dastak:editor-token", url.searchParams.get("token") || FOLLOW_TOKEN);
      navigate(`${url.pathname}${url.search}`, { skipDirtyCheck: true });
    });
  });
}

function bindAdminCertListControls(activeToken) {
  const applyFilters = () => {
    const search = document.getElementById("cert-list-search");
    const district = document.getElementById("cert-list-district");
    const status = document.getElementById("cert-list-status");
    const expiring = document.getElementById("cert-list-expiring");
    const sortEl = document.getElementById("cert-list-sort");
    const prev = readCertListFilters();
    writeCertListFilters({
      q: search?.value ?? "",
      district: district?.value ?? "",
      status: status?.value ?? "",
      expiring: expiring?.value ?? "",
      sort: sortEl?.value ?? prev.sort ?? "issue-desc",
      quick: prev.quick ?? "",
    });
    writeCertListPage(1);
    void populateAdminCertList(activeToken);
  };

  const search = document.getElementById("cert-list-search");
  if (search) {
    search.addEventListener("input", () => {
      window.clearTimeout(certListSearchTimer);
      certListSearchTimer = window.setTimeout(applyFilters, 350);
    });
    search.addEventListener("search", applyFilters);
  }

  for (const id of ["cert-list-district", "cert-list-status", "cert-list-expiring", "cert-list-sort"]) {
    document.getElementById(id)?.addEventListener("change", applyFilters);
  }
}

function isRegistryLiveItem(item) {
  return Boolean(item.serverPublished || certificateLiveOnSite(item.token, item.trackingId));
}

async function refreshAdminContextKpis() {
  const el = document.getElementById("admin-context-kpis");
  if (!el) return;
  let live = 0;
  let pending = 0;
  let local = 0;
  let expiring = 0;
  try {
    const data = await fetchAdminCertificateList({ page: 1, limit: 100, filters: readCertListFilters() });
    for (const item of data?.items ?? []) {
      if (isRegistryLiveItem(item)) live += 1;
      else pending += 1;
      const d = item.daysLeft ?? daysUntilExpiry(item.expiryDate);
      if (d != null && d >= 0 && d <= 30) expiring += 1;
    }
  } catch {
    /* offline */
  }
  local = localOnlyCertRows({ q: "", district: "", status: "", expiring: "", sort: "issue-desc", quick: "" }).length;
  el.hidden = false;
  el.innerHTML = `
    <span class="admin-kpi-chip admin-kpi-live"><strong>${live}</strong> live</span>
    <span class="admin-kpi-chip admin-kpi-warn"><strong>${expiring}</strong> expiring</span>
    <span class="admin-kpi-chip"><strong>${pending}</strong> pending</span>
    <span class="admin-kpi-chip"><strong>${local}</strong> local</span>
  `;
}

function isAdminEditorOpen() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "permits") return false;
  if (params.get("create") === "1") return true;
  return Boolean(params.get("token")?.trim());
}

function isPermitSectionOpen() {
  return new URLSearchParams(window.location.search).get("view") === "permits";
}

function isPermitEditorOpen() {
  if (!isPermitSectionOpen()) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("create") === "1" || Boolean(params.get("token")?.trim());
}

function renderRegistryPage() {
  return `
    <div class="admin-registry-page">
      ${renderCertSidebar("", { fullPage: true })}
    </div>
  `;
}

function isA4PrintSectionCollapsed(values) {
  try {
    const collapsedPref = sessionStorage.getItem("dastak:admin-a4-panel-collapsed");
    if (collapsedPref === "0") return false;
    if (collapsedPref === "1") return true;
  } catch {
    /* ignore */
  }
  const tmpl = newCertificateTemplate().values;
  const keys = FORM_SECTIONS.find((s) => s.title === "A4 print certificate")?.fields ?? [];
  return keys.every((k) => String(values[k] ?? "").trim() === String(tmpl[k] ?? "").trim());
}

function renderFormSectionHead(step, title, desc, extra = "") {
  return `
    <div class="admin-form-panel-head">
      <span class="admin-form-step">${step}</span>
      <div class="admin-form-panel-head-text">
        <h3 class="admin-form-panel-title">${escapeHtml(title)}</h3>
        ${desc ? `<p class="admin-form-panel-desc">${escapeHtml(desc)}</p>` : ""}
      </div>
      ${extra}
    </div>
  `;
}

function renderFormSections(data) {
  return FORM_SECTIONS.map((section, index) => {
    const slug = formSectionSlug(section.title);
    const isA4 = section.title === "A4 print certificate";
    const collapsed = isA4 && isA4PrintSectionCollapsed(data.values);
    const panelClass = isA4 ? " admin-form-panel-collapsible" : "";
    const bodyHidden = collapsed ? " hidden" : "";
    const toggleBtn = isA4
      ? `<button type="button" class="admin-form-panel-toggle" data-action="toggle-a4-panel" aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "Show" : "Hide"}</button>`
      : "";
    const fields = section.fields
      .map((label) => {
        const html = fieldInput(label, data.values[label] ?? "");
        return label === "Amount In Words" ? html.replace('class="form-field"', 'class="form-field form-field-span"') : html;
      })
      .join("");
    return `
      <section class="admin-form-panel${panelClass}" id="admin-section-${slug}" data-form-section="${slug}">
        ${renderFormSectionHead(index + 2, section.title, section.desc, toggleBtn)}
        <div class="form-grid admin-form-panel-body"${bodyHidden}>${fields}</div>
      </section>
    `;
  }).join("");
}

function renderEditorSectionNav() {
  const items = [
    { title: "Link", slug: "link-status" },
    ...FORM_SECTIONS.map((section) => ({
      title: section.nav || section.title,
      slug: formSectionSlug(section.title),
    })),
  ];
  const links = items
    .map(
      (item) =>
        `<button type="button" class="admin-section-nav-link" data-action="scroll-form-section" data-section="${item.slug}">${escapeHtml(item.title)}</button>`
    )
    .join("");
  return `<nav class="admin-section-nav" aria-label="Form sections">${links}</nav>`;
}

function renderEditorStickyActions() {
  return `
    <div class="admin-editor-sticky-bar" id="admin-editor-sticky-bar">
      ${renderEditorSectionNav()}
    </div>
  `;
}

function renderCertEditor(token, data, isCreate) {
  const serialRaw = String(data.values["Serial Number"] ?? "").trim();
  const serialDisplay = escapeHtml(serialRaw ? `#${serialRaw}` : "—");
  const certNo = escapeHtml(data.values["Certificate Number"] || "—");
  const trackingRaw = String(data.values["Tracking ID"] ?? "").trim();
  const tracking = escapeHtml(trackingRaw || "—");
  const publicVerifyUrl = followLinkPublic(publicSiteOrigin(), token);
  const onLiveSite = !isCreate && certificateLiveOnSite(token, trackingRaw);
  const savedLocally = !isCreate && isCertificateSaved(token);
  const statusChip = isCreate
    ? `<span class="admin-hero-chip admin-hero-chip-draft">Draft</span>`
    : onLiveSite
      ? `<span class="admin-hero-chip admin-hero-chip-live">Live on site</span>`
      : savedLocally
        ? `<span class="admin-hero-chip admin-hero-chip-local">Saved locally</span>`
        : `<span class="admin-hero-chip admin-hero-chip-draft">Not published</span>`;
  const statusDetail = isCreate
    ? "Complete the form and save to generate a public follow link."
    : onLiveSite
      ? `<span class="admin-hero-url">${escapeHtml(publicVerifyUrl)}</span>`
      : savedLocally
        ? "Saved on this device — use Save to publish to the live database."
        : "Save this record to push it to the live website.";
  const lastSaved = !isCreate ? formatCertLastSaved(token) : "";
  const tokenStats = !isCreate ? aggregateTokenStats(getAnalyticsEvents(), token) : { views: 0, prints: 0 };
  const analyticsHref = `/admin/dashboard?view=analytics${trackingRaw ? `&track=${encodeURIComponent(trackingRaw)}` : ""}`;
  const syncBits = [];
  if (lastSaved) syncBits.push(`Last saved ${escapeHtml(lastSaved)}`);
  if (onLiveSite) syncBits.push("Live on site / database");
  else if (savedLocally) syncBits.push("Saved on this device — publish with Save");
  else if (!isCreate) syncBits.push("Not published yet");
  const syncLine = syncBits.length ? `<p class="admin-editor-sync-line">${syncBits.join(" · ")}</p>` : "";
  return `
    <div class="admin-editor-page">
      <div class="admin-editor-pane">
        <a class="admin-back-registry" href="/admin/dashboard?view=registry" data-action="back-registry">${iconArrowLeft()} Back to registry</a>
        <section class="admin-editor-hero">
          <div class="admin-editor-hero-main">
            <p class="admin-editor-kicker">${isCreate ? "New record" : "Editing"}</p>
            <h2 class="admin-editor-title">${isCreate ? "New certificate" : escapeHtml(data.values["Applicant Name"] || "Certificate")}</h2>
            <div class="admin-editor-tags">
              ${statusChip}
              <span class="admin-editor-tag">${certNo}</span>
              <span class="admin-editor-tag">${tracking}</span>
            </div>
            <p class="admin-editor-status-detail">${statusDetail}</p>
            ${syncLine}
            ${
              isCreate
                ? ""
                : `<a class="admin-editor-analytics-link" href="${escapeHtml(analyticsHref)}">${iconChart()} Views &amp; prints (${tokenStats.views} / ${tokenStats.prints})</a>`
            }
          </div>
          <div class="admin-action-bar">
            <button class="admin-btn-pill" type="button" data-action="copy">${iconCopy()} Copy link</button>
            <a class="admin-btn-pill" id="open-cert-link" href="${followLinkPublic(publicSiteOrigin(), token)}" target="_blank" rel="noreferrer">${iconPreview()} Preview</a>
            <a class="admin-btn-pill" id="open-print-link" href="${printPath(token)}" target="_blank" rel="noreferrer">${iconPrint()} Print A4</a>
            <button class="admin-btn-pill admin-btn-pill-teal" type="button" data-action="download-pdf" data-token="${escapeHtml(token)}">${iconDownload()} PDF</button>
            ${
              isCreate
                ? ""
                : `<button class="admin-btn-pill" type="button" data-action="renew-cert">${iconPlus()} Renew</button>`
            }
          </div>
        </section>

        ${renderEditorStickyActions()}

        <form id="cert-editor" class="admin-editor-card" autocomplete="off">
          <div id="admin-duplicate-reg-alert" class="admin-inline-alert" hidden role="alert"></div>
          <section class="admin-form-panel admin-form-panel-accent" id="admin-section-link-status" data-form-section="link-status">
            ${renderFormSectionHead(1, "Link & status", "Public URL slug and certificate status")}
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

          <footer class="admin-editor-footer">
            <div class="editor-save-serial">
              <span class="editor-save-serial-label">Save record</span>
              <strong class="editor-save-serial-value">${serialDisplay}</strong>
              <span class="editor-save-serial-hint">${serialRaw ? "Internal ordering on this device" : "Assigned when you save"}</span>
            </div>
            <div class="admin-editor-footer-actions">
              <button class="admin-btn-pill admin-btn-pill-primary" type="submit">
                ${iconSave()} ${isCreate ? "Create certificate" : "Save changes"}
              </button>
              ${
                isCreate
                  ? ""
                  : `<button class="admin-btn-pill admin-btn-pill-danger" type="button" data-action="delete-cert" data-delete-token="${escapeHtml(token)}">
                ${iconTrash()} Delete certificate
              </button>`
              }
            </div>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function isCreateMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "permits") return false;
  return params.get("create") === "1";
}

function renderHealthBadge(health) {
  return `<span class="fitness-badge fitness-badge-${health.tone}">${escapeHtml(health.label)}</span>`;
}

function analyticsChartDayParts(key, compact) {
  const day = new Date(`${key}T12:00:00`);
  if (Number.isNaN(day.getTime())) {
    return { weekday: key.slice(5), date: "" };
  }
  if (compact) {
    return { weekday: String(day.getDate()), date: "" };
  }
  return {
    weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
    date: String(day.getDate()),
  };
}

function renderActivityChart(buckets, periodDays) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const compact = periodDays > 14;
  const bars = buckets
    .map((b) => {
      const parts = analyticsChartDayParts(b.key, compact);
      const stackH = Math.round((b.total / max) * 100);
      return `
        <div class="analytics-bar-col" title="${escapeHtml(b.label)}: ${b.total} events">
          <span class="analytics-bar-count">${b.total && !compact ? b.total : ""}</span>
          <div class="analytics-bar-stack${b.total ? "" : " is-empty"}" style="height: ${b.total ? Math.max(stackH, 8) : 6}%">
            <span class="analytics-bar-seg analytics-bar-views" style="flex-grow: ${b.views || 0.001}"></span>
            <span class="analytics-bar-seg analytics-bar-prints" style="flex-grow: ${b.prints || 0.001}"></span>
            <span class="analytics-bar-seg analytics-bar-lookups" style="flex-grow: ${b.lookups || 0.001}"></span>
            <span class="analytics-bar-seg analytics-bar-saves" style="flex-grow: ${b.saves || 0.001}"></span>
          </div>
          <span class="analytics-bar-label"><strong>${escapeHtml(parts.weekday)}</strong>${escapeHtml(parts.date)}</span>
        </div>
      `;
    })
    .join("");
  const hasData = buckets.some((b) => b.total > 0);
  return `
    <section class="analytics-panel analytics-chart">
      <div class="analytics-chart-head">
        <div>
          <h3 class="analytics-panel-title">Daily activity</h3>
          <p class="analytics-panel-desc">Last ${periodDays} days on this browser</p>
        </div>
        <ul class="analytics-legend">
          <li><span class="analytics-legend-dot analytics-bar-views"></span> Views</li>
          <li><span class="analytics-legend-dot analytics-bar-prints"></span> Prints</li>
          <li><span class="analytics-legend-dot analytics-bar-lookups"></span> Lookups</li>
          <li><span class="analytics-legend-dot analytics-bar-saves"></span> Saves</li>
        </ul>
      </div>
      ${
        hasData
          ? `<div class="analytics-bars${compact ? " analytics-bars-compact" : ""}">${bars}</div>`
          : `<div class="analytics-empty"><span class="analytics-empty-icon">${iconChart()}</span><p>No views, prints, or lookups in this window.</p></div>`
      }
    </section>
  `;
}

function renderEventMixPanel(mix) {
  const total = Math.max(1, mix.total);
  const rows = [
    { key: "views", label: "Certificate views", value: mix.views, cls: "analytics-bar-views" },
    { key: "prints", label: "Print / PDF opens", value: mix.prints, cls: "analytics-bar-prints" },
    { key: "lookups", label: "Track & verify", value: mix.lookups, cls: "analytics-bar-lookups" },
    { key: "saves", label: "Admin saves", value: mix.saves, cls: "analytics-bar-saves" },
  ];
  const bars = rows
    .filter((r) => r.value > 0)
    .map((r) => {
      const p = Math.round((r.value / total) * 100);
      return `
      <div class="analytics-mix-row">
        <span class="analytics-mix-label">${escapeHtml(r.label)}</span>
        <div class="analytics-mix-track">
          <span class="analytics-mix-fill ${r.cls}" style="width: ${Math.max(p, 4)}%"></span>
        </div>
        <span class="analytics-mix-val">${r.value}<em>${p}%</em></span>
      </div>
    `;
    })
    .join("");
  return `
    <section class="analytics-panel analytics-mix">
      <h3 class="analytics-panel-title">Event mix</h3>
      <p class="analytics-panel-desc">${mix.total} event${mix.total === 1 ? "" : "s"} in this window</p>
      ${
        mix.total
          ? `<div class="analytics-mix-list">${bars}</div>`
          : `<div class="analytics-empty"><p>No events in this window yet.</p></div>`
      }
    </section>
  `;
}

function sortAnalyticsRows(rows) {
  return [...rows].sort((a, b) => {
    const aExp = a.daysLeft ?? 9999;
    const bExp = b.daysLeft ?? 9999;
    if (aExp !== bExp) return aExp - bExp;
    return a.applicant.localeCompare(b.applicant);
  });
}

function renderAnalyticsTrackingRows(rows) {
  return rows
    .map((row) => {
      const daysLabel =
        row.daysLeft == null ? "—" : row.daysLeft < 0 ? `${Math.abs(row.daysLeft)}d ago` : `${row.daysLeft}d`;
      const filterTags = [
        row.daysLeft != null && row.daysLeft < 0 ? "expired" : "",
        row.daysLeft != null && row.daysLeft >= 0 && row.daysLeft <= 30 ? "expiring" : "",
        row.views + row.prints + row.lookups > 0 ? "active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <tr class="analytics-track-row" data-token="${escapeHtml(row.token)}" data-days-left="${row.daysLeft ?? ""}" data-analytics-tags="${filterTags}">
          <td><code class="analytics-code">${escapeHtml(row.trackingId)}</code></td>
          <td>${escapeHtml(row.applicant)}</td>
          <td>${escapeHtml(row.district)}</td>
          <td>${renderHealthBadge(row.health)}</td>
          <td><span class="analytics-status-pill">${escapeHtml(row.certStatus || "—")}</span></td>
          <td>${escapeHtml(row.expiry || "—")}<span class="analytics-sub">${daysLabel}</span></td>
          <td class="analytics-num">${row.views}</td>
          <td class="analytics-num">${row.prints}</td>
          <td class="analytics-num">${row.lookups}</td>
          <td class="analytics-muted">${formatRelativeTime(row.lastAt)}</td>
          <td>
            <a class="analytics-open-link" href="/admin/dashboard?token=${encodeURIComponent(row.token)}">Open</a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function cacheAnalyticsRows(rows) {
  try {
    sessionStorage.setItem(ANALYTICS_ROWS_CACHE_KEY, JSON.stringify(rows.slice(0, 500)));
  } catch {
    /* quota */
  }
}

async function populateAnalyticsFromServer() {
  const body = document.getElementById("analytics-track-body");
  const countEl = document.getElementById("analytics-table-count");
  if (!body) return;
  try {
    const data = await fetchAdminCertificateList({ page: 1, limit: 100, filters: {} });
    const localRows = sortAnalyticsRows(
      buildFitnessTrackingRows(listSavedTokens(), getCertificateForEdit, isCertificateSaved)
    );
    const merged = sortAnalyticsRows(mergeAnalyticsRows(localRows, data?.items ?? []));
    body.innerHTML =
      renderAnalyticsTrackingRows(merged) ||
      `<tr><td colspan="11" class="analytics-muted">No certificates match.</td></tr>`;
    cacheAnalyticsRows(merged);
    if (countEl) {
      countEl.textContent = `${merged.length} record${merged.length === 1 ? "" : "s"}${data?.total > merged.length ? ` (${data.total} on server)` : ""} · click a row to open`;
    }
    bindAnalyticsTableInteractions();
  } catch {
    /* offline / no API */
  }
}

function renderAnalyticsDashboard() {
  const periodDays = readAnalyticsPeriodDays();
  sessionStorage.setItem(ANALYTICS_PERIOD_KEY, String(periodDays));

  const tokens = listSavedTokens();
  const rows = sortAnalyticsRows(buildFitnessTrackingRows(tokens, getCertificateForEdit, isCertificateSaved));
  cacheAnalyticsRows(rows);

  const eventsWindow = eventsSince(periodDays);
  const metrics = computeOverviewMetrics(rows, eventsWindow);
  const buckets = dailyActivityBuckets(periodDays);
  const mix = eventTypeMix(eventsWindow);
  const recent = getAnalyticsEvents(15);

  const maxDistrict = Math.max(1, ...metrics.topDistricts.map(([, count]) => count));
  const districtList = metrics.topDistricts
    .map(([name, count]) => {
      const width = Math.round((count / maxDistrict) * 100);
      return `
        <li class="analytics-district-row">
          <span class="analytics-district-name">${escapeHtml(name)}</span>
          <div class="analytics-district-track"><span style="width: ${Math.max(width, count ? 4 : 0)}%"></span></div>
          <strong>${count}</strong>
        </li>`;
    })
    .join("");

  const trackingRows = renderAnalyticsTrackingRows(rows);

  const activityItems = recent
    .map((event) => {
      const meta = [event.trackingId, event.token].filter(Boolean).join(" · ");
      return `
        <li class="analytics-activity-item">
          <span class="analytics-activity-dot" aria-hidden="true"></span>
          <div>
            <p class="analytics-activity-title">${escapeHtml(formatEventLabel(event))}</p>
            ${meta ? `<p class="analytics-activity-meta">${escapeHtml(meta)}</p>` : ""}
          </div>
          <time class="analytics-activity-time" datetime="${escapeHtml(event.at)}">${formatRelativeTime(event.at)}</time>
        </li>
      `;
    })
    .join("");

  const periodBtn = (days, label) =>
    `<button type="button" class="analytics-period-btn${periodDays === days ? " is-active" : ""}" data-action="analytics-period" data-days="${days}">${label}</button>`;

  const lookupHint =
    metrics.lookupSuccessRate != null
      ? `${metrics.successfulLookups7d} matched · ${metrics.lookupSuccessRate}% hit`
      : `${metrics.successfulLookups7d} matched`;
  const activeCount = Math.max(0, metrics.total - metrics.expired - metrics.expiringSoon);
  const attentionHtml =
    metrics.expiringSoon || metrics.expired
      ? `
      <button type="button" class="analytics-attention" data-action="analytics-filter" data-filter="${metrics.expiringSoon ? "expiring" : "expired"}">
        <span class="analytics-attention-icon">${iconAlert()}</span>
        <span class="analytics-attention-copy"><strong>Fitness needs attention.</strong> ${metrics.expiringSoon} expiring within 30 days · ${metrics.expired} expired.</span>
        <span class="analytics-attention-go">Filter table</span>
      </button>`
      : "";

  return `
    <div id="analytics-page" class="analytics-page admin-analytics-page analytics-v3">
      <div class="analytics-toolbar">
        <div class="analytics-toolbar-left">
          <div class="analytics-period-toggle" role="group" aria-label="Activity period">
            ${periodBtn(7, "7 days")}
            ${periodBtn(30, "30 days")}
          </div>
          <p class="analytics-toolbar-hint">Counted on this browser</p>
        </div>
        <div class="analytics-toolbar-actions">
          <button class="analytics-tool-btn" type="button" data-action="analytics-export">${iconDownload()} Export CSV</button>
          <button class="analytics-tool-btn analytics-tool-btn-muted" type="button" data-action="analytics-clear">Clear log</button>
        </div>
      </div>

      ${attentionHtml}

      <div class="analytics-summary-grid">
        <article class="analytics-summary-card analytics-card-teal">
          <div class="analytics-summary-top">
            <span class="analytics-summary-icon">${iconSave()}</span>
            <p class="analytics-summary-label">Registry</p>
          </div>
          <p class="analytics-summary-value">${metrics.total}</p>
          <p class="analytics-summary-sub">${metrics.saved} saved on this device</p>
          <div class="analytics-summary-pills">
            <span class="analytics-summary-pill">Active <strong>${activeCount}</strong></span>
            <span class="analytics-summary-pill analytics-summary-pill-info">90-day window <strong>${metrics.renewalWindow}</strong></span>
            <span class="analytics-summary-pill">Saves <strong>${metrics.adminSaves}</strong></span>
          </div>
        </article>
        <button type="button" class="analytics-summary-card analytics-card-warn" data-action="analytics-filter" data-filter="expiring">
          <div class="analytics-summary-top">
            <span class="analytics-summary-icon">${iconAlert()}</span>
            <p class="analytics-summary-label">Fitness risk</p>
          </div>
          <p class="analytics-summary-value">${metrics.expiringSoon}</p>
          <p class="analytics-summary-sub">Expiring within 30 days</p>
          <div class="analytics-summary-pills">
            <span class="analytics-summary-pill analytics-summary-pill-danger">Expired <strong>${metrics.expired}</strong></span>
          </div>
        </button>
        <button type="button" class="analytics-summary-card analytics-card-activity" data-action="analytics-filter" data-filter="active">
          <div class="analytics-summary-top">
            <span class="analytics-summary-icon">${iconActivity()}</span>
            <p class="analytics-summary-label">Public activity</p>
          </div>
          <p class="analytics-summary-value">${metrics.views7d + metrics.prints7d}</p>
          <p class="analytics-summary-sub">Views and prints · last ${periodDays} days · ${lookupHint}</p>
          <div class="analytics-summary-pills">
            <span class="analytics-summary-pill">Views <strong>${metrics.views7d}</strong></span>
            <span class="analytics-summary-pill">Prints <strong>${metrics.prints7d}</strong></span>
            <span class="analytics-summary-pill analytics-summary-pill-info">Lookups <strong>${metrics.lookups7d}</strong></span>
          </div>
        </button>
      </div>

      <div class="analytics-grid-2">
        ${renderActivityChart(buckets, periodDays)}
        ${renderEventMixPanel(mix)}
      </div>

      <div class="analytics-grid-2 analytics-grid-split">
        <section class="analytics-panel">
          <div class="analytics-panel-head">
            <div>
              <h3 class="analytics-panel-title">By district</h3>
              <p class="analytics-panel-desc">Certificates in the current list</p>
            </div>
          </div>
          <ul class="analytics-district-list">${districtList || '<li class="analytics-empty-row">No district counts yet.</li>'}</ul>
        </section>
        <section class="analytics-panel">
          <div class="analytics-panel-head">
            <div>
              <h3 class="analytics-panel-title">Recent activity</h3>
              <p class="analytics-panel-desc">Latest events on this device</p>
            </div>
          </div>
          <ul class="analytics-activity-list">${activityItems || '<li class="analytics-empty-row">No events yet — previews, prints, and lookups appear here.</li>'}</ul>
        </section>
      </div>

      <section class="analytics-table-wrap analytics-panel" id="analytics-table-wrap">
        <div class="analytics-table-head">
          <div>
            <h3 class="analytics-panel-title">Certificate activity</h3>
            <p class="analytics-panel-desc" id="analytics-table-count">${rows.length} record${rows.length === 1 ? "" : "s"} · click a row to open</p>
          </div>
        </div>
        <div class="analytics-table-tools">
          <label class="analytics-search-wrap analytics-table-search">
            <span class="admin-list-search-icon">${iconSearch()}</span>
            <span class="visually-hidden">Filter tracking table</span>
            <input id="analytics-track-filter" class="form-control analytics-search-input" type="search" placeholder="Search tracking ID, name, district…" autocomplete="off" />
          </label>
          <div class="analytics-table-filters" role="group" aria-label="Table filters">
            <button type="button" class="analytics-filter-chip is-active" data-action="analytics-filter" data-filter="all">All</button>
            <button type="button" class="analytics-filter-chip" data-action="analytics-filter" data-filter="expiring">Expiring</button>
            <button type="button" class="analytics-filter-chip" data-action="analytics-filter" data-filter="expired">Expired</button>
            <button type="button" class="analytics-filter-chip" data-action="analytics-filter" data-filter="active">With activity</button>
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
                <th>Status</th>
                <th>Expiry</th>
                <th>Views</th>
                <th>Prints</th>
                <th>Lookups</th>
                <th>Last activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="analytics-track-body">${trackingRows || `<tr><td colspan="11" class="analytics-muted">No certificates yet.</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function bindAdminOverviewLinks() {
  document.querySelectorAll(".admin-overview-page a[href^='/admin']").forEach((link) => {
    if (link.dataset.ovBound === "1") return;
    link.dataset.ovBound = "1";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const href = link.getAttribute("href");
      if (href) navigate(href);
    });
  });
}

function bindAnalyticsTableInteractions() {
  const trackBody = document.getElementById("analytics-track-body");
  if (!trackBody) return;

  trackBody.querySelectorAll(".analytics-track-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      const token = row.getAttribute("data-token");
      if (!token) return;
      sessionStorage.setItem("dastak:editor-token", token);
      navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`);
    });
  });
}

function applyAnalyticsTableFilter(mode) {
  const trackBody = document.getElementById("analytics-track-body");
  const trackFilter = document.getElementById("analytics-track-filter");
  if (!trackBody) return;
  const q = trackFilter?.value.trim().toLowerCase() ?? "";
  trackBody.querySelectorAll(".analytics-track-row").forEach((row) => {
    const tags = row.getAttribute("data-analytics-tags") || "";
    let tagOk = true;
    if (mode === "expiring") tagOk = tags.includes("expiring");
    if (mode === "expired") tagOk = tags.includes("expired");
    if (mode === "active") tagOk = tags.includes("active");
    const text = row.textContent?.toLowerCase() ?? "";
    const searchOk = !q || text.includes(q);
    row.hidden = !(tagOk && searchOk);
  });
  document.querySelectorAll(".analytics-filter-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.getAttribute("data-filter") === mode);
  });
}

function adminDashboardPage() {
  const view = getAdminView();
  if (view === "analytics") {
    return adminDashboardShell(renderAnalyticsDashboard(), "analytics");
  }
  if (view === "permits") {
    if (isPermitEditorOpen()) {
      const params = new URLSearchParams(window.location.search);
      const isCreate = params.get("create") === "1";
      const token = isCreate ? generatePermitLinkId() : params.get("token")?.trim();
      const data = isCreate ? newPermitTemplate() : getPermitForEdit(token);
      return adminDashboardShell(renderPermitEditor(token, data, isCreate), "permit-editor");
    }
    return adminDashboardShell(renderPermitRegistry(listPermitRegistryCache), "permits");
  }
  if (isAdminEditorOpen()) {
    const isCreate = isCreateMode();
    const token = isCreate ? generateLinkId() : getEditorToken();
    const data = isCreate ? readRenewDraft() || newCertificateTemplate() : getCertificateForEdit(token);
    return adminDashboardShell(renderCertEditor(token, data, isCreate), "certificates");
  }
  if (view === "registry") {
    return adminDashboardShell(renderRegistryPage(), "registry");
  }
  return adminDashboardShell(renderAdminOverviewPage(buildLocalOverviewRows()), "overview");
}

function safePathSlug(segment) {
  const raw = String(segment ?? "").trim();
  if (!raw) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function certificatePage(token) {
  const resolved = resolvePublicCertificateToken(token) || token;
  const cert = getPublicCertificate(resolved);
  const previewLayout = { shellClass: "cert-preview-page" };
  if (!cert) {
    return layout(
      `
      <h1 class="page-title">${t("certTitle")}</h1>
      <div class="not-found">
        <p class="alert">Certificate Status: <strong>Not Found</strong></p>
        <p class="muted cert-not-found-hint">If you opened this from a new QR code, the certificate may not be on the website yet. Ask the issuer to deploy the certificate files, or try again after redeploy.</p>
        <p class="muted cert-not-found-ref">Reference: ${escapeHtml(String(token ?? ""))}</p>
        <a class="btn btn-primary" href="/">${t("backHome")}</a>
      </div>
    `,
      previewLayout
    );
  }

  const values = Object.fromEntries(cert.fields);
  const status = String(cert.status ?? "Issued").trim();
  const restricted = status === "Revoked" || status === "Expired";

  if (restricted) {
    const summaryFields = [
      ["Registration Number", values["Registration Number"]],
      ["Certificate Number", values["Certificate Number"]],
      ["Expiry Date", values["Expiry Date"]],
    ]
      .map(
        ([label, val]) => `
        <div class="field">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(val ?? "—")}</dd>
        </div>
      `
      )
      .join("");

    return layout(
      `
      <h1 class="page-title">${t("certTitle")}</h1>
      <div class="card cert-status-card cert-status-${status.toLowerCase()}">
        <div class="card-body">
          <p class="alert cert-status-alert">${t("certStatus")}: <strong>${escapeHtml(status)}</strong></p>
          <p class="muted">This certificate is not valid for verification. Contact the issuing authority if you have questions.</p>
          <dl class="fields fields-compact">${summaryFields}</dl>
        </div>
      </div>
      <a class="btn btn-primary" href="/">${t("backHome")}</a>
    `,
      previewLayout
    );
  }

  const fields = FIELD_LABELS.map(
    (label) => `
        <div class="field">
          <dt>${label}</dt>
          <dd>${escapeHtml(values[label] ?? "")}</dd>
        </div>
      `
  ).join("");

  return layout(
    `
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
  `,
    previewLayout
  );
}

async function mountPrintQr() {
  const img = document.getElementById("cert-qr") || document.getElementById("permit-qr");
  if (!img) return;
  const url = img.getAttribute("data-url");
  if (!url) return;
  try {
    img.removeAttribute("src");
    img.src = await qrDataUrlWithLogo(url, { size: 240 });
    img.classList.add("is-ready");
  } catch {
    img.classList.add("is-ready");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setPublishHealthDot(tone, title) {
  const dot = document.getElementById("admin-publish-health-dot");
  if (!dot) return;
  dot.hidden = false;
  dot.className = `admin-publish-dot admin-publish-dot-${tone}`;
  dot.title = title;
  dot.setAttribute("aria-label", title);
}

async function refreshPublishHealthBanner() {
  const el = document.getElementById("publish-health-banner");
  if (!isAdminLoggedIn()) return;
  try {
    const res = await fetch("/api/publish-health", { cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) {
      if (el) {
        el.hidden = false;
        el.innerHTML =
          "<strong>Publish API not running.</strong> Set Cloudflare build command to <code>npm run deploy</code> and redeploy.";
      }
      setPublishHealthDot("bad", "Publish API not running");
      return;
    }
    const data = await res.json();
    if (data.d1 || data.github) {
      if (el) el.hidden = true;
      setPublishHealthDot("ok", data.d1 ? "D1 publish OK" : "GitHub publish OK");
      return;
    }
    if (el) {
      el.hidden = false;
      el.innerHTML =
        "<strong>Live publish is off.</strong> Bind D1 (<code>Dastak_binding</code>) or set <code>GITHUB_TOKEN</code> + <code>ADMIN_SYNC_KEY</code>. Build command: <code>npm run deploy</code>.";
    }
    setPublishHealthDot("warn", "Live publish not configured");
  } catch {
    if (el) {
      el.hidden = false;
      el.textContent = "Could not check publish status — try again after redeploy.";
    }
    setPublishHealthDot("bad", "Publish status unknown");
  }
}

async function savePermitFromEditor() {
  const form = document.getElementById("permit-editor");
  if (!form || saveInFlight) return;
  const token = form.querySelector('[name="linkToken"]')?.value?.trim();
  if (!token) {
    showToast("Permit link ID is required");
    return;
  }
  const payload = readPermitFormValues(form);
  const required = validatePermitRequired(payload.values);
  if (!required.ok) {
    showToast(`Required: ${required.missing.join(", ")}`);
    return;
  }
  saveInFlight = true;
  setSaveFormBusy(true);
  showAdminProgress("save", "Saving route permit…", 20);
  try {
    const result = await savePermit(token, payload);
    showAdminProgress("save", result.publishedOnline ? "Published" : "Saved on this device", 100);
    showToast(result.publishedOnline ? "Route permit saved" : "Saved locally — live publish when D1 is bound");
    window.setTimeout(hideSaveProgress, 400);
    navigate(`/admin/dashboard?view=permits&token=${encodeURIComponent(token)}`, { skipDirtyCheck: true });
  } catch (err) {
    console.error("Permit save failed", err);
    showToast("Could not save route permit");
    hideSaveProgress();
  } finally {
    setSaveFormBusy(false);
    saveInFlight = false;
  }
}

async function saveFromEditor(previewAfter) {
  const form = document.getElementById("cert-editor");
  if (!form || saveInFlight) return;
  const tokenInput = form.querySelector('[name="linkToken"]');
  const token = tokenInput?.value?.trim();
  if (!token) {
    showToast("Follow link ID is required");
    return;
  }
  const payload = readFormValues(form);
  const required = validateAdminRequiredFields(payload.values);
  if (!required.ok) {
    markRequiredFieldErrors(form, required.missing);
    showToast(`Required: ${required.missing.join(", ")}`);
    return;
  }
  markRequiredFieldErrors(form, []);
  const regNo = payload.values["Registration Number"];
  const duplicate = findDuplicateRegistration(token, regNo);
  if (duplicate) {
    const ok = window.confirm(
      `Registration "${regNo}" is already used on link ID "${duplicate.token}". Save anyway?`
    );
    if (!ok) return;
  }

  saveInFlight = true;
  setSaveFormBusy(true);
  showAdminProgress("save", "Saving on this device…", 10);

  let saveResult;
  try {
    saveResult = await saveCertificate(token, payload);
  } catch (err) {
    console.error("Save failed", err);
    showToast("Could not save certificate");
    hideSaveProgress();
    setSaveFormBusy(false);
    saveInFlight = false;
    return;
  }

  showAdminProgress("save", "Publishing to site…", 35);
  sessionStorage.setItem("dastak:editor-token", token);
  recordAnalyticsEvent(EVENT_TYPES.ADMIN_SAVE, { token, trackingId: payload.values["Tracking ID"] });
  if (saveResult?.publishedOnline) {
    const via = saveResult.publishVia;
    if (via === "github") {
      const liveSlug = String(payload.values["Tracking ID"] ?? "").trim() || token;
      showAdminProgress("save", "Waiting for deploy on live site…", 50);
      const live = await waitForCertificateLive(liveSlug, {
        onPoll: ({ elapsedMs, timeoutMs }) => {
          const ratio = Math.min(1, elapsedMs / timeoutMs);
          const pct = 50 + Math.round(ratio * 45);
          showAdminProgress("save", "Checking deploy progress…", pct);
        },
      });
      showToast(live ? "Live on site — QR is ready" : "Saved — deploy still running; QR may work in a few minutes");
    } else if (via === "local") {
      showAdminProgress("save", "Saved to project files", 85);
      showToast("Saved to public/certs — run git push to update the live site");
    } else if (via === "kv" || via === "d1") {
      showAdminProgress("save", "Published to live site", 90);
      showToast(
        via === "d1"
          ? "Live on site — saved to database (QR works immediately)"
          : "Live on site — certificate updated immediately"
      );
    } else {
      showAdminProgress("save", "Published to live site", 90);
      showToast("Live on site — certificate published");
    }
  } else if (saveResult?.saved) {
    showAdminProgress("save", "Saved on this device", 80);
    const why = saveResult.upsertResult?.reason || saveResult.syncResult?.reason;
    if (why === "no-api") {
      showToast("Saved locally — site API not active: set Cloudflare build to npm run deploy");
    } else if (why === "no-github") {
      showToast("Saved on this device — add GITHUB_TOKEN secret in Cloudflare (Worker → Variables)");
    } else if (why === "unauthorized") {
      showToast("Saved locally — log out and into admin again (sync key mismatch)");
    } else {
      showToast("Saved locally — publish failed; use npm run publish:import or fix Cloudflare deploy");
    }
  } else {
    showToast("Could not save certificate");
  }

  showAdminProgress("save", "Save complete", 100);
  window.setTimeout(hideSaveProgress, 600);
  setSaveFormBusy(false);
  saveInFlight = false;
  recordCertLastSaved(token);
  writeCertListPage(1);

  if (previewAfter) {
    window.open(followLinkPublic(publicSiteOrigin(), token), "_blank", "noopener,noreferrer");
  }
  navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`, { skipDirtyCheck: true });
}

function syncAmountInWords(form, amountRaw) {
  const wordsInput = form.querySelector(`[name="${cssEscape("Amount In Words")}"]`);
  if (!wordsInput) return;
  wordsInput.value = amountToWords(amountRaw);
}

function syncCertificateTypeFromService(form) {
  const serviceEl = form.querySelector(`[name="${cssEscape("Service")}"]`);
  const certTypeEl = form.querySelector(`[name="${cssEscape("Certificate Type")}"]`);
  if (!serviceEl || !certTypeEl) return;
  certTypeEl.value = serviceToCertificateType(serviceEl.value);
}

function syncLadenWeightCustomField(form) {
  const select = form.querySelector("[data-laden-weight-select]");
  const wrap = form.querySelector(".form-laden-weight-custom-wrap");
  if (!select || !wrap) return;
  const show = select.value === LADEN_WEIGHT_CUSTOM_VALUE;
  wrap.hidden = !show;
}

function updateFollowLinkPreview() {
  const form = document.getElementById("cert-editor");
  if (!form) return;
  const token = form.querySelector('[name="linkToken"]')?.value?.trim() || FOLLOW_TOKEN;
  const verifyLink = followLinkPublic(publicSiteOrigin(), token);
  document.getElementById("open-cert-link")?.setAttribute("href", verifyLink);
  document.getElementById("open-print-link")?.setAttribute("href", printPath(token));
  const pdfBtn = form.closest(".admin-editor-pane")?.querySelector('[data-action="download-pdf"]');
  pdfBtn?.setAttribute("data-token", token);
}

function navigate(path, { skipDirtyCheck = false } = {}) {
  if (!skipDirtyCheck && !confirmLeaveDirtyEditor()) return;
  window.history.pushState({}, "", path);
  void render();
}

let listPermitRegistryCache = [];
let dataActionClickBound = false;
let pdfDownloadInFlight = false;
let saveInFlight = false;
let deleteInFlight = false;
let editorFormBaseline = "";
let editorBeforeUnloadBound = false;
let duplicateRegTimer = 0;
let pendingDeleteUndo = null;

function certReadyForPdf(token) {
  return Boolean(
    isCertificateSaved(token) || findPublishedEntry(token) || findPublishedEntryPublic(token)
  );
}

async function ensureCertReadyForPdf(token) {
  if (certReadyForPdf(token)) return;
  await hydrateCertificateFromApi(token);
}

async function downloadRegistryPdfs(tokens) {
  const list = [...new Set(tokens.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!list.length || pdfDownloadInFlight) return;
  pdfDownloadInFlight = true;
  document.documentElement.classList.add("print-pdf-busy");
  const useAdminProgress = Boolean(document.getElementById("admin-save-progress"));
  if (useAdminProgress) showAdminProgress("save", list.length > 1 ? `PDF 1 of ${list.length}…` : "Building PDF…", 15);
  else showAppLoader();
  try {
    for (const token of list) await ensureCertReadyForPdf(token);
    const { downloadCertificatePdfs } = await import("./pdf-download.js");
    await downloadCertificatePdfs(list, {
      onProgress: ({ index, total }) => {
        if (useAdminProgress) {
          const pct = 20 + Math.round(((index + 1) / total) * 75);
          showAdminProgress("save", total > 1 ? `PDF ${index + 1} of ${total}…` : "Building PDF…", pct);
        }
      },
    });
    showToast(list.length > 1 ? `${list.length} PDFs downloaded` : "PDF downloaded");
  } catch (err) {
    console.error("PDF download failed", err);
    showToast("PDF download failed");
  } finally {
    pdfDownloadInFlight = false;
    document.documentElement.classList.remove("print-pdf-busy");
    if (useAdminProgress) window.setTimeout(hideSaveProgress, 400);
    else hideAppLoader(true);
  }
}

async function deleteSelectedRegistryCertificates() {
  const tokens = [...registrySelectedTokens];
  if (!tokens.length) {
    showToast("Select certificates first");
    return;
  }
  if (deleteInFlight || saveInFlight) return;
  if (
    !window.confirm(
      `Delete ${tokens.length} selected certificate${tokens.length === 1 ? "" : "s"}?\nThis removes local data and unpublishes from the live site when connected.`
    )
  ) {
    return;
  }
  deleteInFlight = true;
  showAdminProgress("delete", "Deleting selected certificates…", 10);
  let failed = 0;
  try {
    for (let i = 0; i < tokens.length; i += 1) {
      showAdminProgress("delete", `Deleting ${i + 1} of ${tokens.length}…`, Math.round(((i + 1) / tokens.length) * 90));
      try {
        await deleteCertificate(tokens[i]);
        registrySelectedTokens.delete(tokens[i]);
      } catch {
        failed += 1;
      }
    }
    resetPublishedLoadCache();
    await refreshPublishedCertificates();
    showAdminProgress("delete", "Delete complete", 100);
    window.setTimeout(hideSaveProgress, 500);
    showToast(failed ? `Deleted ${tokens.length - failed}. ${failed} failed.` : `Deleted ${tokens.length} certificate${tokens.length === 1 ? "" : "s"}`);
    await populateAdminCertList("");
  } catch (err) {
    console.error("Bulk delete failed", err);
    showToast("Delete failed — try again");
    hideSaveProgress();
  } finally {
    deleteInFlight = false;
  }
}

function resetEditorFormBaseline() {
  const form = document.getElementById("cert-editor");
  editorFormBaseline = form ? serializeFormSnapshot(form, readFormValues) : "";
}

function confirmLeaveDirtyEditor() {
  const form = document.getElementById("cert-editor");
  if (!form || !editorFormBaseline) return true;
  if (!isFormSnapshotDirty(form, editorFormBaseline, readFormValues)) return true;
  return window.confirm("You have unsaved changes. Leave without saving?");
}

function markRequiredFieldErrors(form, missing) {
  if (!form) return;
  form.querySelectorAll(".form-field.is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  for (const label of missing) {
    const input = form.querySelector(`[name="${cssEscape(label)}"]`);
    input?.closest(".form-field")?.classList.add("is-invalid");
  }
}

function updateDuplicateRegistrationAlert(form, token) {
  const alertEl = document.getElementById("admin-duplicate-reg-alert");
  if (!form || !alertEl) return;
  const regNo = form.querySelector(`[name="${cssEscape("Registration Number")}"]`)?.value?.trim();
  if (!regNo) {
    alertEl.hidden = true;
    alertEl.innerHTML = "";
    return;
  }
  const duplicate = findDuplicateRegistration(token, regNo);
  if (!duplicate) {
    alertEl.hidden = true;
    alertEl.innerHTML = "";
    return;
  }
  alertEl.hidden = false;
  alertEl.innerHTML = `Registration <strong>${escapeHtml(regNo)}</strong> is already used on link ID <a href="/admin/dashboard?token=${encodeURIComponent(duplicate.token)}">${escapeHtml(duplicate.token)}</a>.`;
}

function scheduleDuplicateRegistrationCheck(form, token) {
  window.clearTimeout(duplicateRegTimer);
  duplicateRegTimer = window.setTimeout(() => updateDuplicateRegistrationAlert(form, token), 280);
}

function updateExpiryHint(form) {
  const hint = document.getElementById("admin-expiry-hint");
  const issue = form?.querySelector(`[name="${cssEscape("Issue Date")}"]`)?.value;
  const expiry = form?.querySelector(`[name="${cssEscape("Expiry Date")}"]`)?.value;
  if (!hint) return;
  if (issue && expiry) {
    hint.textContent = `Certificate valid until ${expiry} (six months from issue date).`;
  } else {
    hint.textContent = "Valid for six months from issue date when auto-filled.";
  }
}

function showToastWithUndo(message, onUndo, durationMs = 9000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = `<span class="toast-text">${escapeHtml(message)}</span> <button type="button" class="toast-undo" data-action="undo-delete">Undo</button>`;
  toast.classList.add("show");
  const undoBtn = toast.querySelector(".toast-undo");
  const hideTimer = window.setTimeout(() => {
    toast.classList.remove("show");
    toast.textContent = "";
    pendingDeleteUndo = null;
  }, durationMs);
  pendingDeleteUndo = { onUndo, hideTimer };
  undoBtn?.addEventListener(
    "click",
    () => {
      window.clearTimeout(hideTimer);
      toast.classList.remove("show");
      toast.textContent = "";
      void onUndo?.();
      pendingDeleteUndo = null;
    },
    { once: true }
  );
}

function bindEditorBeforeUnload() {
  if (editorBeforeUnloadBound) return;
  editorBeforeUnloadBound = true;
  window.addEventListener("beforeunload", (event) => {
    const form = document.getElementById("cert-editor");
    if (!form || !editorFormBaseline) return;
    if (!isFormSnapshotDirty(form, editorFormBaseline, readFormValues)) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function handleDataActionClick(el, event) {
  const action = el.getAttribute("data-action");
  if (action === "delete-cert") {
    event?.preventDefault();
    event?.stopPropagation();
  }
  if (action === "copy") {
    const token =
      document.querySelector('[name="linkToken"]')?.value?.trim() ||
      getEditorToken();
    const link = followLinkPublic(publicSiteOrigin(), token);
    try {
      await navigator.clipboard.writeText(link);
      showToast("Follow link copied");
    } catch {
      showToast(link);
    }
  }
  if (action === "download-pdf") {
    const pdfToken =
      el.getAttribute("data-token") ||
      document.querySelector('[name="linkToken"]')?.value?.trim();
    if (!pdfToken) return;
    await downloadRegistryPdfs([pdfToken]);
  }
  if (action === "download-permit-pdf") {
    const pdfToken =
      el.getAttribute("data-token") ||
      document.querySelector('[name="linkToken"]')?.value?.trim();
    if (!pdfToken) return;
    showToast("Preparing permit PDF…");
    try {
      const { downloadPermitPdf } = await import("./permit-print.js");
      await downloadPermitPdf(pdfToken);
      showToast("Permit PDF downloaded");
    } catch (err) {
      console.error(err);
      showToast("Permit PDF failed — use Print A4");
    }
  }
  if (action === "registry-select") {
    const token = el.getAttribute("data-token");
    const box = el.matches("input") ? el : el.querySelector("input[type='checkbox']");
    if (!token || !box) return;
    if (box.checked) registrySelectedTokens.add(token);
    else registrySelectedTokens.delete(token);
    updateRegistryBulkBar();
  }
  if (action === "registry-select-page") {
    const visible = visibleRegistryTokens();
    const selectAll = visible.some((token) => !registrySelectedTokens.has(token));
    visible.forEach((token) => {
      if (selectAll) registrySelectedTokens.add(token);
      else registrySelectedTokens.delete(token);
    });
    updateRegistryBulkBar();
  }
  if (action === "registry-clear-selection") {
    registrySelectedTokens.clear();
    updateRegistryBulkBar();
  }
  if (action === "registry-bulk-download") {
    const tokens = [...registrySelectedTokens];
    if (!tokens.length) {
      showToast("Select certificates first");
      return;
    }
    await downloadRegistryPdfs(tokens);
  }
  if (action === "registry-bulk-delete") {
    await deleteSelectedRegistryCertificates();
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
    if (deleteInFlight || saveInFlight) return;
    const formSlug =
      el.getAttribute("data-delete-token")?.trim() ||
      document.querySelector('[name="linkToken"]')?.value?.trim();
    if (!formSlug) {
      showToast("Could not find certificate to delete");
      return;
    }
    const entry = findPublishedEntry(formSlug);
    const token = entry?.token || formSlug;
    const snapshot = getCertificateForEdit(token);
    const applicant = snapshot.values["Applicant Name"] || token;
    const reg = snapshot.values["Registration Number"] || "—";
    if (
      !window.confirm(
        `Delete certificate for ${applicant} (${reg})?\nLink ID: ${token}\n\nThis removes local data and unpublishes from the live site when connected.`
      )
    ) {
      return;
    }
    deleteInFlight = true;
    setSaveFormBusy(true);
    showAdminProgress("delete", "Removing from this device…", 15);
    try {
      showAdminProgress("delete", "Unpublishing from site…", 40);
      const result = await deleteCertificate(token);
      showAdminProgress("delete", "Updating certificate list…", 75);
      resetPublishedLoadCache();
      await refreshPublishedCertificates();
      showAdminProgress("delete", "Delete complete", 100);
      sessionStorage.removeItem("dastak:editor-token");
      window.setTimeout(hideSaveProgress, 500);
      navigate(`/admin/dashboard?view=registry`, { skipDirtyCheck: true });
      if (token === FOLLOW_TOKEN) {
        showToastWithUndo("Default link reset", async () => {
          await saveCertificate(token, snapshot);
          showToast("Restored");
          navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`, { skipDirtyCheck: true });
        });
      } else {
        showToastWithUndo("Certificate deleted", async () => {
          await saveCertificate(token, snapshot);
          resetPublishedLoadCache();
          await refreshPublishedCertificates();
          showToast("Certificate restored");
          navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`, { skipDirtyCheck: true });
        });
      }
    } catch (err) {
      console.error("Delete failed", err);
      showToast("Delete failed — try again");
      hideSaveProgress();
    } finally {
      setSaveFormBusy(false);
      deleteInFlight = false;
    }
  }
  if (action === "back-registry") {
    event?.preventDefault();
    if (!confirmLeaveDirtyEditor()) return;
    navigate("/admin/dashboard", { skipDirtyCheck: true });
  }
  if (action === "admin-create-new") {
    if (!confirmLeaveDirtyEditor()) return;
    navigate("/admin/dashboard?create=1");
  }
  if (action === "admin-create-permit") {
    if (!confirmLeaveDirtyEditor()) return;
    navigate("/admin/dashboard?view=permits&create=1");
  }
  if (action === "delete-permit") {
    const token = el.getAttribute("data-delete-token")?.trim();
    if (!token) return;
    const snapshot = getPermitForEdit(token);
    if (
      !window.confirm(
        `Delete route permit for ${snapshot.values["Permit Holder"] || token}?\nPermit no: ${snapshot.values["Route Permit No"] || "—"}\n\nThis does not change fitness certificates.`
      )
    ) {
      return;
    }
    await deletePermit(token);
    showToast("Route permit deleted");
    navigate("/admin/dashboard?view=permits", { skipDirtyCheck: true });
  }
  if (action === "renew-cert" || action === "renew-cert-registry") {
    const sourceToken =
      el.getAttribute("data-token")?.trim() ||
      document.querySelector('[name="linkToken"]')?.value?.trim();
    if (!sourceToken) return;
    if (!confirmLeaveDirtyEditor()) return;
    const draft = renewCertificateTemplateFrom(sourceToken);
    sessionStorage.setItem(RENEW_DRAFT_KEY, JSON.stringify(draft));
    showToast("Renewal draft ready — new link ID on save");
    navigate("/admin/dashboard?create=1");
  }
  if (action === "toggle-registry-panel") {
    const panel = document.getElementById("admin-registry-panel");
    const body = document.getElementById("admin-registry-panel-body");
    const willCollapse = !panel?.classList.contains("is-collapsed");
    writeRegistryCollapsed(willCollapse);
    panel?.classList.toggle("is-collapsed", willCollapse);
    body?.toggleAttribute("hidden", willCollapse);
    el.setAttribute("aria-expanded", willCollapse ? "false" : "true");
    el.textContent = willCollapse ? "Show" : "Hide";
  }
  if (action === "cert-quick-filter") {
    const quick = el.getAttribute("data-quick") || "";
    const prev = readCertListFilters();
    writeCertListFilters({ ...prev, quick: !quick || prev.quick === quick ? "" : quick });
    writeCertListPage(1);
    void populateAdminCertList(getEditorToken());
    document.querySelectorAll(".admin-filter-chip").forEach((chip) => {
      const value = chip.getAttribute("data-quick") || "";
      const current = readCertListFilters().quick || "";
      chip.classList.toggle("is-active", value === current);
    });
  }
  if (action === "cert-clear-filters") {
    writeCertListFilters({ q: "", district: "", status: "", expiring: "", sort: "issue-desc", quick: "" });
    writeCertListPage(1);
    const search = document.getElementById("cert-list-search");
    if (search) search.value = "";
    const district = document.getElementById("cert-list-district");
    if (district) district.value = "";
    const status = document.getElementById("cert-list-status");
    if (status) status.value = "";
    const expiring = document.getElementById("cert-list-expiring");
    if (expiring) expiring.value = "";
    const sortEl = document.getElementById("cert-list-sort");
    if (sortEl) sortEl.value = "issue-desc";
    document.querySelectorAll(".admin-filter-chip").forEach((chip) => {
      chip.classList.toggle("is-active", (chip.getAttribute("data-quick") || "") === "");
    });
    void populateAdminCertList(getEditorToken());
  }
  if (action === "scroll-form-section") {
    const slug = el.getAttribute("data-section");
    const target = document.getElementById(`admin-section-${slug}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "toggle-a4-panel") {
    const panel = document.querySelector(".admin-form-panel-collapsible");
    const body = panel?.querySelector(".admin-form-panel-body");
    const hidden = body?.hasAttribute("hidden");
    if (hidden) {
      body?.removeAttribute("hidden");
      el.setAttribute("aria-expanded", "true");
      el.textContent = "Hide";
      try {
        sessionStorage.setItem("dastak:admin-a4-panel-collapsed", "0");
      } catch {
        /* ignore */
      }
    } else {
      body?.setAttribute("hidden", "");
      el.setAttribute("aria-expanded", "false");
      el.textContent = "Show";
      try {
        sessionStorage.setItem("dastak:admin-a4-panel-collapsed", "1");
      } catch {
        /* ignore */
      }
    }
  }
  if (action === "analytics-clear") {
    if (!window.confirm("Clear all locally stored analytics events? Certificate data is not affected.")) return;
    clearAnalyticsEvents();
    showToast("Activity log cleared");
    navigate("/admin/dashboard?view=analytics");
  }
  if (action === "analytics-period") {
    const days = el.getAttribute("data-days") === "30" ? "30" : "7";
    sessionStorage.setItem(ANALYTICS_PERIOD_KEY, days);
    navigate(`/admin/dashboard?view=analytics&period=${days}`);
  }
  if (action === "analytics-export") {
    try {
      const raw = sessionStorage.getItem(ANALYTICS_ROWS_CACHE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(rows) || !rows.length) {
        showToast("No registry data to export");
        return;
      }
      downloadTextFile("dastak-analytics-registry.csv", exportAnalyticsCsv(rows), "text/csv");
      showToast("Analytics CSV downloaded");
    } catch {
      showToast("Export failed");
    }
  }
  if (action === "analytics-filter") {
    const mode = el.getAttribute("data-filter") || "all";
    applyAnalyticsTableFilter(mode);
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
  if (action === "admin-login-toggle-pw") {
    const input = document.getElementById("admin-password");
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    el.innerHTML = show ? iconEyeOff() : iconPreview();
    el.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }
}

function bindActions() {
  if (!dataActionClickBound) {
    dataActionClickBound = true;
    document.addEventListener("click", (event) => {
      const el = event.target.closest("[data-action]");
      if (!el) return;
      const action = el.getAttribute("data-action");
      if (
        action === "delete-cert" ||
        action === "delete-permit" ||
        action === "renew-cert" ||
        action === "renew-cert-registry" ||
        action === "download-pdf" ||
        action === "download-permit-pdf" ||
        action === "registry-select" ||
        action === "registry-select-page" ||
        action === "registry-bulk-download" ||
        action === "registry-bulk-delete" ||
        action === "registry-clear-selection"
      ) {
        event.stopPropagation();
        if (action !== "registry-select" && action !== "registry-select-page") {
          event.preventDefault();
        }
      }
      void handleDataActionClick(el, event);
    });
  }

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

  const permitForm = document.getElementById("permit-editor");
  if (permitForm) {
    bindPermitPhotoInput();
    bindPermitChoiceSelects();
    permitForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void savePermitFromEditor();
    });
  }

  const form = document.getElementById("cert-editor");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveFromEditor(false);
    });
    form.addEventListener("input", (event) => {
      updateFollowLinkPreview();
      const fieldName = event.target.getAttribute("name");
      if (UPPERCASE_VEHICLE_ID_FIELDS.includes(fieldName) && event.target.value != null) {
        const upper = event.target.value.toUpperCase();
        if (event.target.value !== upper) {
          const start = event.target.selectionStart;
          const end = event.target.selectionEnd;
          event.target.value = upper;
          if (start != null && end != null) {
            event.target.setSelectionRange(start, end);
          }
        }
      }
      if (fieldName === "Amount") {
        syncAmountInWords(form, event.target.value);
      }
      if (fieldName === "Registration Number") {
        const token = form.querySelector('[name="linkToken"]')?.value?.trim() || "";
        scheduleDuplicateRegistrationCheck(form, token);
      }
    });
    form.addEventListener("change", (event) => {
      if (event.target.getAttribute("name") === "Amount") {
        syncAmountInWords(form, event.target.value);
      }
      if (event.target.matches("[data-laden-weight-select]")) {
        syncLadenWeightCustomField(form);
      }
      if (event.target.getAttribute("name") === "Service") {
        syncCertificateTypeFromService(form);
      }
      if (event.target.getAttribute("name") === "Issue Date") {
        const expiryInput = form.querySelector(`[name="${cssEscape("Expiry Date")}"]`);
        if (expiryInput) {
          expiryInput.value = expiryFromIssueDate(event.target.value);
        }
        updateExpiryHint(form);
      }
    });
    syncLadenWeightCustomField(form);
    syncCertificateTypeFromService(form);
    updateExpiryHint(form);
    const editorToken = form.querySelector('[name="linkToken"]')?.value?.trim() || getEditorToken();
    updateDuplicateRegistrationAlert(form, editorToken);
    resetEditorFormBaseline();
    bindEditorBeforeUnload();
  }

  if (document.getElementById("cert-list")) {
    const activeToken = new URLSearchParams(window.location.search).get("token")?.trim() || "";
    bindAdminCertListControls(activeToken);
    void populateAdminCertList(activeToken);
  }

  if (document.getElementById("admin-context-kpis")) {
    void refreshAdminContextKpis();
  }

  bindAdminOverviewLinks();
  if (document.getElementById("admin-overview-page")) {
    void (async () => {
      const { rows } = await fetchOverviewRowsMerged();
      const page = document.getElementById("admin-overview-page");
      if (page) page.outerHTML = renderAdminOverviewPage(rows);
      bindAdminOverviewLinks();
    })();
  }

  if (document.getElementById("analytics-page")) {
    bindAnalyticsTableInteractions();
    void populateAnalyticsFromServer();
    const trackFilter = document.getElementById("analytics-track-filter");
    const trackParam = new URLSearchParams(window.location.search).get("track")?.trim();
    if (trackFilter && trackParam) {
      trackFilter.value = trackParam;
    }
    if (trackFilter) {
      trackFilter.addEventListener("input", () => {
        const active =
          document.querySelector(".analytics-filter-chip.is-active")?.getAttribute("data-filter") || "all";
        applyAnalyticsTableFilter(active);
      });
      if (trackParam) {
        applyAnalyticsTableFilter(
          document.querySelector(".analytics-filter-chip.is-active")?.getAttribute("data-filter") || "all"
        );
      }
    }
    const expiringFilter = new URLSearchParams(window.location.search).get("filter");
    if (expiringFilter === "expiring") {
      applyAnalyticsTableFilter("expiring");
    }
  }

  document.querySelector(".admin-editor-analytics-link")?.addEventListener("click", (event) => {
    if (!confirmLeaveDirtyEditor()) event.preventDefault();
  });

  document.querySelectorAll("[data-import]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const kind = input.getAttribute("data-import");
        const count =
          kind === "csv" ? await importCertificatesCsv(text) : await importCertificatesJson(text);
        showToast(`Imported ${count} certificate(s)`);
        input.value = "";
        void render();
      } catch {
        showToast("Import failed — check file format");
        input.value = "";
      }
    });
  });
}

async function render() {
  await ensurePublishedLoaded();
  let path = window.location.pathname.replace(/\/$/, "") || "/";
  const isPrintRoute =
    /^\/vehiclefitness\/[^/]+\/print$/.test(path) || /^\/routepermits\/[^/]+\/print$/.test(path);
  if (!isPrintRoute) {
    document.documentElement.classList.remove("is-print-route");
    document.title = "Dastak - Citizens platform";
  }

  const redirect = requireAdmin(path);
  if (redirect) {
    navigate(redirect);
    scheduleHideAppLoader();
    return;
  }

  if (path === "/edit") {
    navigate(isAdminLoggedIn() ? "/admin/dashboard" : "/admin");
    scheduleHideAppLoader();
    return;
  }

  const printMatch = path.match(/^\/vehiclefitness\/([^/]+)\/print$/);
  if (printMatch) {
    const printSlug = safePathSlug(printMatch[1]);
    await hydratePublicCertificate(printSlug);
    const printToken = resolvePublicCertificateToken(printSlug) || printSlug;
    if (!getPublicCertificate(printToken)) {
      recordAnalyticsEvent(EVENT_TYPES.CERT_PRINT, { token: printToken, success: false });
      app.innerHTML = renderA4PrintMissing(printSlug);
      bindActions();
      hideAppLoader(true);
      return;
    }
    recordAnalyticsEvent(EVENT_TYPES.CERT_PRINT, { token: printToken, success: true });
    app.innerHTML = renderA4PrintPage(printToken);
    bindActions();
    mountPrintQr();
    hideAppLoader(true);
    return;
  }

  const permitPrintMatch = path.match(/^\/routepermits\/([^/]+)\/print$/);
  if (permitPrintMatch) {
    const printSlug = safePathSlug(permitPrintMatch[1]);
    await hydratePublicPermit(printSlug);
    const permit = getPublicPermit(printSlug);
    if (!permit) {
      app.innerHTML = renderPermitPrintMissing(printSlug);
      bindActions();
      hideAppLoader(true);
      return;
    }
    app.innerHTML = renderPermitPrintPage(permit.token);
    bindActions();
    mountPrintQr();
    hideAppLoader(true);
    return;
  }

  const permitMatch = path.match(/^\/routepermits\/([^/]+)$/);
  if (permitMatch) {
    const permitSlug = safePathSlug(permitMatch[1]);
    await hydratePublicPermit(permitSlug);
    const permit = getPublicPermit(permitSlug);
    app.innerHTML = permit
      ? renderPermitPreview((html, options) => layout(html, options), permit)
      : renderPermitNotFound((html, options) => layout(html, options), permitSlug);
    bindActions();
    syncThemeToggleUI();
    applyDocumentLang();
    scheduleHideAppLoader();
    return;
  }

  const certMatch = path.match(/^\/vehiclefitness\/([^/]+)$/);
  if (certMatch) {
    const verifySlug = safePathSlug(certMatch[1]);
    await hydratePublicCertificate(verifySlug);
    const certToken = resolvePublicCertificateToken(verifySlug) || verifySlug;
    const cert = getPublicCertificate(verifySlug) || getPublicCertificate(certToken);
    recordAnalyticsEvent(EVENT_TYPES.CERT_VIEW, {
      token: certToken,
      success: !!cert,
    });
    app.innerHTML = certificatePage(verifySlug);
  } else if (path === "/admin/dashboard") {
    if (isAdminLoggedIn() && isAdminEditorOpen() && !isCreateMode()) {
      const edToken = getEditorToken();
      if (edToken) await hydrateCertificateFromApi(edToken);
    }
    if (isAdminLoggedIn() && isPermitSectionOpen() && !isPermitEditorOpen()) {
      listPermitRegistryCache = await fetchPermitList();
    }
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
  if (isAdminLoggedIn() && path.startsWith("/admin")) {
    void refreshPublishHealthBanner();
  }

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

  scheduleHideAppLoader();
}

function scheduleHideAppLoader() {
  requestAnimationFrame(() => {
    window.setTimeout(hideAppLoader, 220);
  });
}

window.addEventListener("popstate", () => {
  void render();
});
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='/']");
  if (!link || link.getAttribute("target") === "_blank") return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.getAttribute("href"));
  void render();
});

applyTheme();
void ensurePublishedLoaded().then(() => render());
