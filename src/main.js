import "./style.css";
import { certificates, followLink, followPath } from "./certificates.js";

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

function layout(mainHtml) {
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

function homePage() {
  const localLink = followLink();
  return layout(`
    <h1 class="page-title">Vehicle Fitness Certificate</h1>
    <div class="follow-box">
      <div class="follow-label">Follow link</div>
      <div class="follow-row">
        <div class="follow-url" id="follow-url">${localLink}</div>
        <button class="btn btn-primary" type="button" data-action="copy">Copy link</button>
        <a class="btn btn-primary" href="${followPath()}">Open certificate</a>
      </div>
    </div>
  `);
}

function certificatePage(token) {
  const cert = certificates[token];
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
          <dd>${value}</dd>
        </div>
      `
    )
    .join("");

  return layout(`
    <h1 class="page-title">Vehicle Fitness Certificate</h1>
    <div class="card">
      <div class="card-body">
        <p class="alert">Certificate Status: <strong>${cert.status}</strong></p>
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
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function bindActions() {
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", async () => {
      const action = el.getAttribute("data-action");
      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(followLink());
          showToast("Follow link copied");
        } catch {
          showToast(followLink());
        }
      }
      if (action === "feedback") showToast("Feedback is not enabled in this local app.");
      if (action === "help") showToast("Open the follow link to view the issued certificate.");
    });
  });
}

function render() {
  const match = window.location.pathname.match(/^\/vehiclefitness\/([^/]+)\/?$/);
  app.innerHTML = match ? certificatePage(match[1]) : homePage();
  bindActions();
}

window.addEventListener("popstate", render);
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='/']");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.getAttribute("href"));
  render();
});

render();
