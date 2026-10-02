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

/** Form-I body for browser print, PDF capture, etc. */
export function renderA4CertificateArticle(token, { qrElementId = "cert-qr" } = {}) {
  const d = getPrintData(token);

  return `
    <article class="a4-cert">
      <img class="a4-cert-bg" src="${A4_CERT_BACKGROUND}" alt="" />
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
          <div class="a4-meta-stacked">
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
            <div class="a4-spec-row"><dt>Engine Number:</dt><dd>${escapeHtml(d.engine)}</dd></div>
            <div class="a4-spec-row"><dt>Chassis No :</dt><dd>${escapeHtml(d.chassis)}</dd></div>
            <div class="a4-spec-row"><dt>Certificate Type:</dt><dd>${escapeHtml(d.certType)}</dd></div>
            <div class="a4-spec-row"><dt>Type of Vehicle:</dt><dd>${escapeHtml(d.vehicleType)}</dd></div>
            <div class="a4-spec-row"><dt>Vehicle Model:</dt><dd>${escapeHtml(d.model)}</dd></div>
            <div class="a4-spec-row"><dt>Registered Laden Weight:</dt><dd>${escapeHtml(d.ladenWeight)}</dd></div>
            <div class="a4-spec-row"><dt>Seating Capacity :</dt><dd>${escapeHtml(d.seating)}</dd></div>
            <div class="a4-spec-row"><dt>Vehicle Fuel Type:</dt><dd>${escapeHtml(d.fuel)}</dd></div>
            <div class="a4-spec-row a4-spec-row-amount"><dt>Amount In Words:</dt><dd class="a4-amount-value">${
              d.amountPrintLine2
                ? `${escapeHtml(d.amountPrintLine1)}<br />${escapeHtml(d.amountPrintLine2)})`
                : escapeHtml(d.amountPrintLine1)
            }</dd></div>
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

  return `
    <div class="print-shell">
      <div class="print-toolbar no-print">
        <button class="btn btn-primary" type="button" data-action="print-a4">Print A4</button>
        <a class="btn btn-outline" href="${d.previewPath}">Online preview</a>
        <a class="btn btn-outline" href="/admin/dashboard?token=${encodeURIComponent(token)}">Admin</a>
      </div>

      ${renderA4CertificateArticle(token)}
    </div>
  `;
}

export function preloadA4Background() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = A4_CERT_BACKGROUND;
  });
}
