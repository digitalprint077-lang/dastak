import { getPermitPrintData, getPublicPermit } from "./permits.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function dash(value) {
  const v = String(value ?? "").trim();
  return v || "—";
}

function routeHtml(value) {
  const text = dash(value);
  const match = text.match(/^(.*?)(\s*-\s*\(\s*Divisions?\s*\))\s*$/i);
  if (!match) return escapeHtml(text);
  return `${escapeHtml(match[1])}<strong>${escapeHtml(match[2])}</strong>`;
}

function secretaryHtml(value) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const use = lines.length
    ? lines
    : ["Secretary", "Provincial Transport Authority", "Khyber Pakhtunkhwa"];
  return use.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function rowWide(label, value) {
  return `
    <tr>
      <th>${label}</th>
      <td colspan="3">${escapeHtml(dash(value))}</td>
    </tr>
  `;
}

function rowPair(label1, value1, label2, value2) {
  return `
    <tr>
      <th>${label1}</th>
      <td>${escapeHtml(dash(value1))}</td>
      <th>${label2}</th>
      <td>${escapeHtml(dash(value2))}</td>
    </tr>
  `;
}

function renderToolbar(d) {
  return `
    <header class="print-toolbar no-print">
      <div class="print-toolbar-brand">
        <a class="print-lockup" href="/" aria-label="Dastak">
          <img class="print-lockup-logo" src="/images/logo-dastak.png" alt="" />
          <strong class="print-lockup-wordmark">DASTAK</strong>
          <span class="print-lockup-dot" aria-hidden="true"></span>
        </a>
        <div class="print-toolbar-copy">
          <p class="print-toolbar-kicker">Route Permit · Part A &amp; B</p>
          <h1 class="print-toolbar-title">Print preview</h1>
          <p class="print-toolbar-ids">
            <span>${escapeHtml(d.registration)}</span>
            <span>${escapeHtml(d.permitNo)}</span>
          </p>
        </div>
      </div>
      <div class="print-toolbar-actions">
        <button class="print-btn print-btn-primary" type="button" data-action="print-a4">Print A4</button>
        <button class="print-btn print-btn-teal" type="button" data-action="download-permit-pdf" data-token="${escapeHtml(d.token)}">PDF</button>
        <a class="print-btn print-btn-ghost" href="${escapeHtml(d.previewPath)}">Preview</a>
        <a class="print-btn print-btn-ghost" href="/admin/dashboard?view=permits&token=${encodeURIComponent(d.token)}">Admin</a>
      </div>
    </header>
    <p class="print-hint no-print">Use A4 paper and set printer margins to None so the permit fills the page.</p>
  `;
}

export function renderPermitPrintArticle(token, { qrElementId = "permit-qr" } = {}) {
  const d = getPermitPrintData(token);
  return `
    <article class="pta-sheet">
      <div class="pta-sheet-inner">
        <header class="pta-title">
          <h1>SUMMARY TO BE CARRIED ON THE VEHICLE</h1>
          <h2>PART 'A' &amp; 'B'</h2>
          <p>(Section-66, MVO 1965, Rule 65(v) MVR 1969)</p>
        </header>

        <p class="pta-type">${escapeHtml(d.permitType)}</p>

        <div class="pta-flow">
          <div class="pta-qr">
            <img id="${escapeHtml(qrElementId)}" class="pta-qr-img" width="112" height="112" alt="Scan for Verification" data-url="${escapeHtml(d.previewUrl)}" />
            <p>Scan for Verification</p>
          </div>
          <table class="pta-table">
            ${rowWide(`${escapeHtml(d.permitNoLabel)}:`, d.permitNo)}
            ${rowWide("Name of Permit Holder:", d.holderLine)}
            ${rowWide("Address:", d.addressLine1 || d.addressLine2)}
            ${rowWide("Vehicle Registration No:", d.registration)}
            ${rowPair("Chassis No:", d.chassis, "Date of 1st<br>Registration:", d.firstReg)}
            ${rowPair("Seating Capacity:", d.seating, "Laden Weight:", d.ladenWeight)}
            ${rowPair("Maker:", d.maker, "Make:", d.make)}
            ${rowWide("Model:", d.model)}
          </table>
        </div>

        <section class="pta-section">
          <h3>Route/Area</h3>
          <p>${routeHtml(d.route)}</p>
        </section>

        <p class="pta-renew"><strong>Renewed Upto:</strong> ${escapeHtml(dash(d.renewedUpto))}</p>
        <p class="pta-note">Date of application for further renewal is: ${escapeHtml(dash(d.renewalApplication))}.</p>
        <p class="pta-note"><strong>Conditions:</strong> ${escapeHtml(d.conditions)}</p>

        <footer class="pta-foot">
          <p>Dated: ${escapeHtml(dash(d.dated))}</p>
          <div class="pta-sign">
            ${secretaryHtml(d.secretary)}
          </div>
        </footer>
      </div>
    </article>
  `;
}

export function renderPermitPrintPage(token) {
  const d = getPermitPrintData(token);
  if (typeof document !== "undefined") {
    document.title = `${d.permitNo || "Route Permit"} · Print · Dastak`;
    document.documentElement.classList.add("is-print-route");
  }
  return `
    <div class="print-shell">
      ${renderToolbar(d)}
      <div class="print-stage">
        <div class="print-page-frame">
          ${renderPermitPrintArticle(token)}
        </div>
      </div>
      <div class="toast print-toast no-print" id="toast"></div>
    </div>
  `;
}

export function renderPermitPrintMissing(ref = "") {
  if (typeof document !== "undefined") {
    document.title = "Print route permit · Dastak";
    document.documentElement.classList.add("is-print-route");
  }
  const reference = String(ref ?? "").trim();
  return `
    <div class="print-shell print-shell-missing">
      <header class="print-toolbar no-print">
        <div class="print-toolbar-brand">
          <a class="print-lockup" href="/" aria-label="Dastak">
            <img class="print-lockup-logo" src="/images/logo-dastak.png" alt="" />
            <strong class="print-lockup-wordmark">DASTAK</strong>
          </a>
          <div class="print-toolbar-copy">
            <p class="print-toolbar-kicker">Route Permit</p>
            <h1 class="print-toolbar-title">Print permit</h1>
          </div>
        </div>
        <div class="print-toolbar-actions">
          <a class="print-btn print-btn-primary" href="/">Back to Home</a>
        </div>
      </header>
      <div class="print-missing-card">
        <p class="print-missing-kicker">Permit status</p>
        <h2>Not found</h2>
        <p>This route permit is not available for print.</p>
        ${reference ? `<p class="print-missing-ref">Reference: ${escapeHtml(reference)}</p>` : ""}
        <a class="print-btn print-btn-primary" href="/">Back to Home</a>
      </div>
    </div>
  `;
}

export function permitExistsForPrint(slug) {
  return Boolean(getPublicPermit(slug));
}

export async function downloadPermitPdf(token) {
  const id = String(token ?? "").trim();
  if (!id) throw new Error("No permit to download");

  const shell = document.createElement("div");
  shell.className = "print-shell pdf-capture-root";
  shell.setAttribute("aria-hidden", "true");
  shell.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;min-height:297mm;z-index:-1;opacity:0;pointer-events:none;overflow:hidden;background:#fff;";
  shell.innerHTML = renderPermitPrintArticle(id, { qrElementId: "pdf-permit-qr" });
  document.body.appendChild(shell);

  try {
    const qrImg = shell.querySelector("#pdf-permit-qr");
    const url = qrImg?.getAttribute("data-url");
    if (qrImg && url) {
      qrImg.src = await qrDataUrlWithLogo(url, { size: 280 });
      qrImg.classList.add("is-ready");
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const article = shell.querySelector(".pta-sheet");
    if (!article) throw new Error("Permit layout missing");
    const canvas = await html2canvas(article, {
      scale: 1.4,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 5000,
    });
    const image = canvas.toDataURL("image/jpeg", 0.86);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(image, "JPEG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    const d = getPermitPrintData(id);
    const name = `route-permit-${(d.permitNo || id).replace(/[^\w-]+/g, "_")}.pdf`;
    pdf.save(name);
  } finally {
    shell.remove();
  }
}
