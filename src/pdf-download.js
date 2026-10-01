import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getPrintData } from "./certificates.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function u(text) {
  return `<u>${escapeHtml(text)}</u>`;
}

function buildA4Html(token) {
  const d = getPrintData(token);
  return `
    <article class="a4-cert">
      <header class="a4-header">
        <h1>Transport &amp; Mass Transit Department</h1>
        <h2>Govt. of Khyber Pakhtunkhwa</h2>
        <p class="office">DISTRICT TRANSPORT OFFICE</p>
        <p class="city">${escapeHtml(d.districtOffice.toUpperCase())}</p>
      </header>
      <div class="a4-meta">
        <div><strong>Application ID</strong> ${escapeHtml(d.applicationId)}</div>
        <div><strong>Certificate No.</strong> ${escapeHtml(d.certificateNo)}</div>
      </div>
      <div class="a4-title-block">
        <h3>FORM-I</h3>
        <p>[ See Section 39(1) &amp; 40(2) ]</p>
        <p class="a4-title-main">CERTIFICATE OF FITNESS</p>
        <p>(APPLICABLE IN THE CASE OF TRANSPORT VEHICLES)</p>
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
          <img id="pdf-cert-qr" width="120" height="120" alt="" data-url="${escapeHtml(d.previewUrl)}" />
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
    </article>
  `;
}

export async function downloadCertificatePdf(token) {
  const shell = document.createElement("div");
  shell.className = "print-shell pdf-capture-root";
  shell.setAttribute("aria-hidden", "true");
  shell.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;";
  shell.innerHTML = buildA4Html(token);
  document.body.appendChild(shell);

  const qrImg = shell.querySelector("#pdf-cert-qr");
  const url = qrImg?.getAttribute("data-url");
  if (qrImg && url) {
    try {
      qrImg.src = await qrDataUrlWithLogo(url, { size: 240 });
    } catch {
      /* optional QR */
    }
  }

  const article = shell.querySelector(".a4-cert");
  const canvas = await html2canvas(article, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgData = canvas.toDataURL("image/png");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
  const tracking = getPrintData(token).applicationId.replace(/[^\w-]+/g, "_");
  pdf.save(`vehicle-fitness-${tracking || token}.pdf`);

  shell.remove();
}
