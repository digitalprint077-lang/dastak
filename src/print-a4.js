import { getPrintData } from "./certificates.js";

export const A4_CERT_BACKGROUND = "/images/a4-certificate-background.jpg";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function u(text) {
  return `<u>${escapeHtml(text)}</u>`;
}

function glyph(paths) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function specRow(label, value) {
  return `<div class="a4-spec-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderPrintLockup() {
  return `
    <a class="print-lockup" href="/" aria-label="Dastak">
      <img class="print-lockup-logo" src="/images/logo-dastak.png" alt="" />
      <strong class="print-lockup-wordmark">DASTAK</strong>
      <span class="print-lockup-dot" aria-hidden="true"></span>
    </a>
  `;
}

function renderPrintToolbar(token, d) {
  const adminHref = `/admin/dashboard?token=${encodeURIComponent(token)}`;
  return `
    <header class="print-toolbar no-print">
      <div class="print-toolbar-brand">
        ${renderPrintLockup()}
        <div class="print-toolbar-copy">
          <p class="print-toolbar-kicker">Form-I · Certificate of Fitness</p>
          <h1 class="print-toolbar-title">Print preview</h1>
          <p class="print-toolbar-ids">
            <span>${escapeHtml(d.vehicleNo)}</span>
            <span>${escapeHtml(d.applicant)}</span>
            <span>${escapeHtml(d.certificateNo)}</span>
          </p>
        </div>
      </div>
      <div class="print-toolbar-actions">
        <button class="print-btn print-btn-primary" type="button" data-action="print-a4">
          ${glyph(`<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`)}
          Print A4
        </button>
        <button class="print-btn print-btn-teal" type="button" data-action="download-pdf" data-token="${escapeHtml(token)}">
          ${glyph(`<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>`)}
          PDF
        </button>
        <a class="print-btn print-btn-ghost" href="${d.previewPath}">
          ${glyph(`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>`)}
          Preview
        </a>
        <a class="print-btn print-btn-ghost" href="${adminHref}">
          ${glyph(`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8"/><path d="M8 14h5"/>`)}
          Admin
        </a>
      </div>
    </header>
    <p class="print-hint no-print">Use A4 paper and set printer margins to None so the certificate fills the page.</p>
  `;
}

/** Form-I body for browser print, PDF capture, etc. */
export function renderA4CertificateArticle(token, { qrElementId = "cert-qr" } = {}) {
  const d = getPrintData(token);
  const amountHtml = d.amountPrintLine2
    ? `${escapeHtml(d.amountPrintLine1)}<br />${escapeHtml(d.amountPrintLine2)})`
    : escapeHtml(d.amountPrintLine1);

  return `
    <article class="a4-cert">
      <img class="a4-cert-bg" src="${A4_CERT_BACKGROUND}" alt="" crossorigin="anonymous" />
      <div class="a4-cert-content">
        <header class="a4-header">
          <h1>Transport &amp; Mass Transit Department</h1>
          <h2>Govt. of Khyber Pakhtunkhwa</h2>
          <p class="office">DISTRICT TRANSPORT OFFICE</p>
          <p class="city">${escapeHtml(d.districtOffice.toUpperCase())}</p>
        </header>

        <div class="a4-meta">
          <div class="a4-meta-stacked">
            <strong class="a4-meta-label">Application ID</strong>
            <span class="a4-meta-value">${escapeHtml(d.applicationId)}</span>
          </div>
          <div class="a4-meta-stacked a4-meta-end">
            <strong class="a4-meta-label">Certificate No.</strong>
            <span class="a4-meta-value">${escapeHtml(d.certificateNo)}</span>
          </div>
        </div>

        <div class="a4-title-block">
          <h3>FORM-I</h3>
          <p>[ See Section 39(1) &amp; 40(2) ]</p>
          <p class="a4-title-main">CERTIFICATE OF FITNESS</p>
          <p class="a4-title-applicable">(APPLICABLE IN THE CASE OF TRANSPORT VEHICLES)</p>
        </div>

        <p class="a4-statement">
          Vehicle no. ${u(d.vehicleNo)} is certified as complying with the Provision of Chapter VI of the
          Provincial Motor Vehicle Ordinance, 1965, and the Rules made thereunder. The Certificate will expire on
          ${u(d.expiry)}.
        </p>
        <p class="a4-statement">
          The Certificate is hereby renewed from ${u(d.renewalFrom)} to ${u(d.renewalTo)}.
        </p>

        <div class="a4-body">
          <dl class="a4-specs">
            ${specRow("Engine Number", d.engine)}
            ${specRow("Chassis No.", d.chassis)}
            ${specRow("Certificate Type", d.certType)}
            ${specRow("Type of Vehicle", d.vehicleType)}
            ${specRow("Vehicle Model", d.model)}
            ${specRow("Registered Laden Weight", d.ladenWeight)}
            ${specRow("Seating Capacity", d.seating)}
            ${specRow("Vehicle Fuel Type", d.fuel)}
            <div class="a4-spec-row a4-spec-row-amount">
              <dt>Amount In Words</dt>
              <dd class="a4-amount-value">${amountHtml}</dd>
            </div>
          </dl>

          <div class="a4-qr-wrap">
            <img id="${escapeHtml(qrElementId)}" width="120" height="120" alt="" data-url="${escapeHtml(d.previewUrl)}" />
            <p class="a4-qr-caption">Scan for Verification</p>
          </div>
        </div>

        <footer class="a4-footer">
          <div>Printed Date : ${escapeHtml(d.printedDate)}</div>
          <div class="a4-sign">
            <p class="a4-sign-title">Motor Vehicle Examiner</p>
            <p class="a4-sign-district">District ${escapeHtml(d.district)}</p>
          </div>
        </footer>
      </div>
    </article>
  `;
}

export function renderA4PrintPage(token) {
  const d = getPrintData(token);
  if (typeof document !== "undefined") {
    document.title = `${d.vehicleNo} · Form-I · Dastak`;
    document.documentElement.classList.add("is-print-route");
  }

  return `
    <div class="print-shell">
      ${renderPrintToolbar(token, d)}
      <div class="print-stage">
        <div class="print-page-frame">
          ${renderA4CertificateArticle(token)}
        </div>
      </div>
      <div class="toast print-toast no-print" id="toast"></div>
    </div>
  `;
}

export function renderA4PrintMissing(ref = "") {
  if (typeof document !== "undefined") {
    document.title = "Print certificate · Dastak";
    document.documentElement.classList.add("is-print-route");
  }
  const reference = String(ref ?? "").trim();

  return `
    <div class="print-shell print-shell-missing">
      <header class="print-toolbar no-print">
        <div class="print-toolbar-brand">
          ${renderPrintLockup()}
          <div class="print-toolbar-copy">
            <p class="print-toolbar-kicker">Form-I · Certificate of Fitness</p>
            <h1 class="print-toolbar-title">Print certificate</h1>
          </div>
        </div>
        <div class="print-toolbar-actions">
          <a class="print-btn print-btn-primary" href="/">Back to Home</a>
        </div>
      </header>
      <div class="print-missing-card">
        <p class="print-missing-kicker">Certificate status</p>
        <h2>Not found</h2>
        <p>This Form-I is not available for print. Ask the issuer to publish it, then open the print link again.</p>
        ${reference ? `<p class="print-missing-ref">Reference: ${escapeHtml(reference)}</p>` : ""}
        <a class="print-btn print-btn-primary" href="/">Back to Home</a>
      </div>
    </div>
  `;
}

let a4BackgroundPromise = null;

export function preloadA4Background() {
  if (!a4BackgroundPromise) {
    a4BackgroundPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = A4_CERT_BACKGROUND;
    });
  }
  return a4BackgroundPromise;
}
