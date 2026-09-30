import "./style.css";
import { isAdminLoggedIn, loginAdmin, logoutAdmin, requireAdmin } from "./admin.js";
import {
  FIELD_LABELS,
  FOLLOW_TOKEN,
  defaultCertificate,
  deleteCertificate,
  fillForm,
  followLink,
  followPath,
  getCertificate,
  getCertificateForEdit,
  listSavedTokens,
  readFormValues,
  saveCertificate,
} from "./certificates.js";

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

function adminShell(mainHtml) {
  return `
    <div class="app-shell admin-shell">
      <header class="admin-topbar">
        <div class="admin-topbar-inner">
          <div>
            <p class="admin-kicker">Dastak Admin</p>
            <h1 class="admin-title">Certificate dashboard</h1>
          </div>
          <div class="admin-topbar-actions">
            <a class="btn btn-outline" href="/">View public site</a>
            <button class="btn btn-outline" type="button" data-action="admin-logout">Log out</button>
          </div>
        </div>
      </header>
      <main class="page admin-page">
        <div class="container admin-container">
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
  return adminShell(`
    <div class="admin-login card">
      <div class="card-body">
        <h2 class="page-title">Admin sign in</h2>
        <p class="editor-intro">Sign in to edit vehicle fitness certificate data shown on follow links.</p>
        <form id="admin-login-form" class="admin-login-form" autocomplete="off">
          <label class="form-field" for="admin-password">
            <span class="form-label">Password</span>
            <input id="admin-password" name="password" type="password" required />
          </label>
          <button class="btn btn-primary" type="submit">Sign in</button>
        </form>
        <p class="admin-note">Default local password: <code>dastak-admin</code> (override with <code>VITE_ADMIN_PASSWORD</code>).</p>
      </div>
    </div>
  `);
}

function renderCertEditor(token, data) {
  const inputs = FIELD_LABELS.map((label) => fieldInput(label, data.values[label] ?? "")).join("");
  const localLink = followLink(window.location.origin, token);
  const tokens = listSavedTokens();

  const tokenOptions = tokens
    .map(
      (t) =>
        `<option value="${escapeHtml(t)}"${t === token ? " selected" : ""}>${escapeHtml(t)}</option>`
    )
    .join("");

  return `
    <div class="admin-stats card">
      <div class="card-body admin-stats-body">
        <div>
          <p class="admin-stat-label">Saved certificates</p>
          <p class="admin-stat-value">${tokens.length}</p>
        </div>
        <div>
          <p class="admin-stat-label">Active link ID</p>
          <p class="admin-stat-value admin-stat-mono">${escapeHtml(token)}</p>
        </div>
      </div>
    </div>

    <div class="card editor-card">
      <div class="card-body">
        <div class="admin-toolbar">
          <label class="form-field admin-token-picker" for="admin-token-select">
            <span class="form-label">Load certificate</span>
            <select id="admin-token-select" name="adminToken">${tokenOptions}</select>
          </label>
          <button class="btn btn-outline" type="button" data-action="admin-new-token">New link ID</button>
        </div>

        <form id="cert-editor" autocomplete="off">
          <div class="form-row form-row-token">
            <label class="form-field" for="link-token">
              <span class="form-label">Follow link ID</span>
              <input id="link-token" name="linkToken" type="text" value="${escapeHtml(token)}" />
            </label>
            <label class="form-field" for="cert-status">
              <span class="form-label">Certificate Status</span>
              <input id="cert-status" name="status" type="text" value="${escapeHtml(data.status)}" />
            </label>
          </div>
          <div class="form-grid">${inputs}</div>
          <div class="editor-actions">
            <button class="btn btn-primary" type="submit">Save changes</button>
            <button class="btn btn-primary" type="button" data-action="save-preview">Save &amp; preview</button>
            <button class="btn btn-outline" type="button" data-action="reset-form">Reset form</button>
            <button class="btn btn-outline" type="button" data-action="delete-cert">Delete saved data</button>
          </div>
        </form>
      </div>
    </div>

    <div class="follow-box">
      <div class="follow-label">Public follow link</div>
      <div class="follow-row">
        <div class="follow-url" id="follow-url">${localLink}</div>
        <button class="btn btn-primary" type="button" data-action="copy">Copy link</button>
        <a class="btn btn-primary" id="open-cert-link" href="${followPath(token)}" target="_blank" rel="noreferrer">Open certificate</a>
      </div>
    </div>
  `;
}

function adminDashboardPage() {
  const token = getEditorToken();
  const data = getCertificateForEdit(token);
  return adminShell(renderCertEditor(token, data));
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
  `);
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
  showToast("Certificate saved");
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
        if (token === FOLLOW_TOKEN) {
          deleteCertificate(token);
          showToast("Default link storage cleared; built-in defaults remain");
        } else {
          deleteCertificate(token);
          showToast("Deleted saved certificate");
        }
        navigate(`/admin/dashboard?token=${encodeURIComponent(FOLLOW_TOKEN)}`);
      }
      if (action === "admin-new-token") {
        const id = window.prompt("New follow link ID (letters, numbers, dashes):");
        if (!id?.trim()) return;
        sessionStorage.setItem("dastak:editor-token", id.trim());
        navigate(`/admin/dashboard?token=${encodeURIComponent(id.trim())}`);
      }
      if (action === "admin-logout") {
        logoutAdmin();
        navigate("/admin");
      }
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

  const tokenSelect = document.getElementById("admin-token-select");
  if (tokenSelect) {
    tokenSelect.addEventListener("change", () => {
      const token = tokenSelect.value;
      sessionStorage.setItem("dastak:editor-token", token);
      navigate(`/admin/dashboard?token=${encodeURIComponent(token)}`);
    });
  }
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
