import "./style.css";
import "./print-a4.css";
import QRCode from "qrcode";
import { isAdminLoggedIn, loginAdmin, logoutAdmin, requireAdmin } from "./admin.js";
import {
  FOLLOW_TOKEN,
  defaultCertificate,
  deleteCertificate,
  fillForm,
  followLink,
  followPath,
  generateLinkId,
  getCertificate,
  getCertificateForEdit,
  getCertificateSummary,
  listSavedTokens,
  printPath,
  readFormValues,
  saveCertificate,
} from "./certificates.js";
import { renderA4PrintPage } from "./print-a4.js";

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
              <a class="nav-link" href="/" aria-label="Home">
                <img class="kp-logo" src="/images/kp-logo.png" alt="KP Logo" height="64" />
              </a>
            </div>
            <div class="navbar-brand-wrapper">
              <a class="navbar-brand" href="/" aria-label="Dastak">
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
            <a class="btn btn-outline" href="/" target="_blank" rel="noreferrer">Public site</a>
            <button class="btn btn-outline" type="button" data-action="admin-logout">Log out</button>
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

function fieldInput(label, value) {
  const name = label.replace(/"/g, "&quot;");
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const isLong = label === "Application Status";
  return `
    <label class="form-field" for="${id}">
      <span class="form-label">${label}</span>
      ${
        isLong
          ? `<textarea id="${id}" name="${name}" rows="2">${escapeHtml(value)}</textarea>`
          : `<input id="${id}" type="text" name="${name}" value="${escapeHtml(value)}" />`
      }
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
  const token = getEditorToken();
  const localLink = followLink(window.location.origin, token);

  return layout(`
    <h1 class="page-title">Vehicle Fitness Certificate</h1>
    <div class="follow-box">
      <div class="follow-label">Follow link</div>
      <div class="follow-row">
        <div class="follow-url">${localLink}</div>
        <button class="btn btn-primary" type="button" data-action="copy">Copy link</button>
        <a class="btn btn-primary" href="${followPath(token)}">Open certificate</a>
      </div>
    </div>
  `);
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
        <button class="btn btn-primary btn-sm" type="button" data-action="admin-create-new">+ New</button>
      </div>
      <div class="cert-list">${items}</div>
    </aside>
  `;
}

function renderFormSections(data) {
  return FORM_SECTIONS.map(
    (section) => `
      <section class="form-section">
        <h3 class="form-section-title">${section.title}</h3>
        <div class="form-grid">${section.fields.map((label) => fieldInput(label, data.values[label] ?? "")).join("")}</div>
      </section>
    `
  ).join("");
}

function renderCertEditor(token, data, isCreate) {
  const localLink = followLink(window.location.origin, token);

  return `
    <div class="admin-layout">
      ${renderCertSidebar(token)}
      <div class="admin-main">
        <div class="admin-main-head">
          <div>
            <p class="admin-breadcrumb">Dashboard / ${isCreate ? "New certificate" : "Edit certificate"}</p>
            <h2 class="admin-main-title">${isCreate ? "Create certificate" : escapeHtml(data.values["Applicant Name"] || "Certificate")}</h2>
          </div>
          <div class="admin-head-actions">
            <button class="btn btn-outline" type="button" data-action="copy">Copy link</button>
            <a class="btn btn-outline" id="open-cert-link" href="${followPath(token)}" target="_blank" rel="noreferrer">Preview</a>
            <a class="btn btn-outline" href="${printPath(token)}" target="_blank" rel="noreferrer">Print A4</a>
          </div>
        </div>

        ${isCreate ? `<div class="admin-banner">New certificate — complete the form and save to publish the follow link.</div>` : ""}

        <form id="cert-editor" class="card editor-card" autocomplete="off">
          <div class="card-body">
            <section class="form-section">
              <h3 class="form-section-title">Follow link</h3>
              <div class="form-row form-row-token">
                <label class="form-field" for="link-token">
                  <span class="form-label">Link ID (URL slug)</span>
                  <input id="link-token" name="linkToken" type="text" value="${escapeHtml(token)}" ${isCreate ? "" : ""} />
                </label>
                <label class="form-field" for="cert-status">
                  <span class="form-label">Certificate status</span>
                  <input id="cert-status" name="status" type="text" value="${escapeHtml(data.status)}" />
                </label>
              </div>
              <div class="link-preview-box">
                <span class="form-label">Public URL</span>
                <code class="link-preview-url" id="follow-url">${localLink}</code>
              </div>
            </section>

            ${renderFormSections(data)}

            <div class="editor-actions editor-actions-sticky">
              <button class="btn btn-primary" type="submit">${isCreate ? "Create & save" : "Save changes"}</button>
              <button class="btn btn-primary" type="button" data-action="save-preview">Save &amp; preview</button>
              <button class="btn btn-outline" type="button" data-action="reset-form">Reset fields</button>
              <button class="btn btn-danger" type="button" data-action="delete-cert">Delete</button>
            </div>
          </div>
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
  const data = isCreate ? defaultCertificate() : getCertificateForEdit(token);
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

  const fields = cert.fields
    .map(
      ([label, value]) => `
        <div class="field">
          <dt>${label}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `
    )
    .join("");

  return layout(`
    <h1 class="page-title">Vehicle Fitness Certificate</h1>
    <div class="card">
      <div class="card-body">
        <p class="alert">Certificate Status: <strong>${escapeHtml(cert.status)}</strong></p>
        <dl class="fields">${fields}</dl>
      </div>
    </div>
    <a class="btn btn-primary" href="/">Back to Home</a>
    <a class="btn btn-outline" href="${printPath(token)}" target="_blank" rel="noreferrer" style="margin-left:8px">Print A4 certificate</a>
  `);
}

async function mountPrintQr() {
  const img = document.getElementById("cert-qr");
  if (!img) return;
  const url = img.getAttribute("data-url");
  if (!url) return;
  try {
    img.src = await QRCode.toDataURL(url, { width: 180, margin: 0, errorCorrectionLevel: "M" });
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
  const urlEl = document.getElementById("follow-url");
  const openLink = document.getElementById("open-cert-link");
  const link = followLink(window.location.origin, token);
  if (urlEl) urlEl.textContent = link;
  if (openLink) openLink.setAttribute("href", followPath(token));
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
      if (action === "reset-form") {
        const form = document.getElementById("cert-editor");
        if (!form) return;
        fillForm(form, defaultCertificate());
        updateFollowLinkPreview();
        showToast("Form reset (not saved)");
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
    });
  });

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
  } else {
    app.innerHTML = homePage();
  }
  bindActions();
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

render();
