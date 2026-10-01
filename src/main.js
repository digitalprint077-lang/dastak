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
  printPath,
  readFormValues,
  saveCertificate,
  DATE_FIELD_LABELS,
  toDateInputValue,
} from "./certificates.js";
import { renderA4PrintPage } from "./print-a4.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";

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

function iconLogout() {
  return iconSvg(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`);
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
  return `Track your application by entering the <strong class="home-hint-em">Tracking / Application ID</strong> and your <strong class="home-hint-em">CNIC #</strong>.`;
}

function layout(mainHtml, options = {}) {
  const { showWelcome = true } = options;
  const welcome = showWelcome
    ? `
        <div class="welcome-row">
          <div class="welcome-text">
            <h3>Welcome! We're delighted to have you here!</h3>
            <h5>You are one step close to digital platform.</h5>
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
            <div class="navbar-right" aria-hidden="true"></div>
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

function adminDashboardShell(mainHtml) {
  return `
    <div class="app-shell admin-shell">
      <header class="admin-topbar">
        <div class="admin-topbar-inner">
          <div class="admin-brand-block">
            <img class="admin-brand-logo" src="/images/logo-dastak.png" alt="" height="36" />
            <div>
              <p class="admin-kicker">Dastak Admin</p>
              <h1 class="admin-title">Certificate management</h1>
            </div>
          </div>
          <div class="admin-topbar-actions">
            ${themeToggleButton()}
            <button class="btn btn-ghost admin-pill-btn" type="button" data-action="admin-logout">${iconLogout()} Log out</button>
          </div>
        </div>
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

function fieldControl({ id, name, value, multiline = false, inputType = "text" }) {
  if (multiline) {
    return `<textarea id="${id}" class="form-control" name="${name}" rows="2">${escapeHtml(value)}</textarea>`;
  }
  return `<input id="${id}" class="form-control${inputType === "date" ? " form-control-date" : ""}" type="${inputType}" name="${name}" value="${escapeHtml(value)}" />`;
}

function fieldInput(label, value, iconKey = label) {
  const name = label.replace(/"/g, "&quot;");
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const isLong = label === "Application Status";
  const isDate = DATE_FIELD_LABELS.includes(label);
  const displayValue = isDate ? toDateInputValue(value) : value;
  return `
    <label class="form-field" for="${id}">
      <span class="form-label">${label}</span>
      <div class="form-input-wrap${isDate ? " form-input-wrap-date" : ""}">
        <span class="form-field-icon">${fieldIcon(iconKey)}</span>
        ${fieldControl({
          id,
          name,
          value: displayValue,
          multiline: isLong,
          inputType: isDate ? "date" : "text",
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
      <section class="home-card">
        <h2 class="home-card-title">Verify Your License</h2>
        <form id="verify-license-form" class="home-form">
          <select class="home-input" name="licenseType" required aria-label="License type">
            ${licenseOptions}
          </select>
          <input class="home-input" name="documentNumber" type="text" placeholder="Enter Document Number" required />
          <input
            class="home-input"
            name="cnic"
            type="text"
            inputmode="numeric"
            maxlength="13"
            placeholder="Enter CNIC# without dashes (e.g. 3520212345678)"
            required
          />
          <button class="home-btn home-btn-verify" type="submit">${iconUserCheck()} Verify License</button>
        </form>
        <p class="home-card-hint">${homeCardHint()}</p>
      </section>

      <section class="home-card">
        <h2 class="home-card-title">Track Your Application</h2>
        <form id="track-application-form" class="home-form">
          <input
            class="home-input"
            name="trackingId"
            type="text"
            placeholder="Enter Application Tracking ID"
            required
          />
          <input
            class="home-input"
            name="cnic"
            type="text"
            inputmode="numeric"
            maxlength="13"
            placeholder="Enter CNIC# without dashes (e.g. 3520212345678)"
            required
          />
          <button class="home-btn home-btn-track" type="submit">${iconTrack()} Track Application</button>
        </form>
        <p class="home-card-hint">${homeCardHint()}</p>
      </section>
    </div>
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
  const token =
    findTokenByField("Tracking ID", trackingId) ||
    (listSavedTokens().includes(trackingId) ? trackingId : null);
  if (!token) {
    showToast("No application found for this Tracking ID");
    return;
  }
  navigate(followPath(token));
}

function handleVerifyLicense(form) {
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
  const token = resolveVehicleFitnessByDocument(documentNumber);
  if (!token) {
    showToast("No certificate found for this document number");
    return;
  }
  navigate(followPath(token));
}

function adminLoginPage() {
  return `
    <div class="login-shell">
      <div class="login-panel card">
        <div class="login-panel-body">
          <img class="login-logo" src="/images/logo-dastak.png" alt="Dastak" height="44" />
          <h2 class="login-title">Admin sign in</h2>
          <p class="login-subtitle">Manage vehicle fitness certificates and follow links.</p>
          <form id="admin-login-form" class="admin-login-form" autocomplete="off">
            <label class="form-field" for="admin-password">
              <span class="form-label">Password</span>
              <input id="admin-password" name="password" type="password" placeholder="Enter admin password" required />
            </label>
            <button class="btn btn-primary btn-block" type="submit">Sign in to dashboard</button>
          </form>
        </div>
      </div>
      <div class="toast" id="toast"></div>
    </div>
  `;
}

function renderCertSidebar(activeToken) {
  const summaries = listSavedTokens()
    .map(getCertificateSummary)
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
            <span class="cert-badge ${item.saved ? "cert-badge-saved" : "cert-badge-default"}">
              ${item.saved ? "Saved" : "Default"}
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

  return `
    <div class="admin-layout">
      ${renderCertSidebar(token)}
      <div class="admin-main">
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
                  <input id="cert-status" class="form-control" name="status" type="text" value="${escapeHtml(data.status)}" />
                </div>
              </label>
            </div>
          </section>

          <div class="admin-form-stack">${renderFormSections(data)}</div>

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

function adminDashboardPage() {
  const isCreate = isCreateMode();
  const token = isCreate ? generateLinkId() : getEditorToken();
  const data = isCreate ? newCertificateTemplate() : getCertificateForEdit(token);
  return adminDashboardShell(renderCertEditor(token, data, isCreate));
}

function certificatePage(token) {
  const cert = getCertificate(token);
  if (!cert) {
    return layout(`
      <h1 class="page-title">Vehicle Fitness Certificate</h1>
      <div class="not-found">
        <p class="alert">Certificate Status: <strong>Not Found</strong></p>
        <a class="btn btn-primary" href="/">Back to Home</a>
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
    <h1 class="page-title">Vehicle Fitness Certificate</h1>
    <div class="card">
      <div class="card-body">
        <p class="alert">Certificate Status: <strong>${escapeHtml(cert.status)}</strong></p>
        <dl class="fields">${fields}</dl>
      </div>
    </div>
    <a class="btn btn-primary" href="/">Back to Home</a>
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
  const payload = readFormValues(form);
  saveCertificate(token, payload);
  sessionStorage.setItem("dastak:editor-token", token);
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
      if (action === "delete-cert") {
        const token = document.querySelector('[name="linkToken"]')?.value?.trim();
        if (!token) return;
        if (!window.confirm(`Delete saved data for link ID "${token}"?`)) return;
        deleteCertificate(token);
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
  }

  document.querySelectorAll(".cert-list-item").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const url = new URL(link.href);
      sessionStorage.setItem("dastak:editor-token", url.searchParams.get("token") || FOLLOW_TOKEN);
      navigate(`${url.pathname}${url.search}`);
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
    app.innerHTML = renderA4PrintPage(printToken);
    bindActions();
    mountPrintQr();
    return;
  }

  const certMatch = path.match(/^\/vehiclefitness\/([^/]+)$/);
  if (certMatch) {
    app.innerHTML = certificatePage(certMatch[1]);
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
