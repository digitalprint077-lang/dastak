import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getPrintData } from "./certificates.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import { preloadA4Background, renderA4CertificateArticle } from "./print-a4.js";

/** Target ~300 DPI when rasterizing A4 for PDF (210 mm wide). */
const PDF_TARGET_DPI = 300;
const PDF_A4_WIDTH_MM = 210;
const PDF_MAX_CAPTURE_SCALE = 4;
const MM_PER_INCH = 25.4;

function pdfCaptureScale(articleEl) {
  const cssWidth = articleEl.getBoundingClientRect().width;
  if (!cssWidth || cssWidth < 1) return PDF_MAX_CAPTURE_SCALE;
  const targetPx = (PDF_A4_WIDTH_MM / MM_PER_INCH) * PDF_TARGET_DPI;
  const scale = Math.ceil(targetPx / cssWidth);
  return Math.min(PDF_MAX_CAPTURE_SCALE, Math.max(2, scale));
}

function waitForNextFrames(count = 2) {
  return new Promise((resolve) => {
    let done = 0;
    const step = () => {
      done += 1;
      if (done >= count) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** In-viewport but invisible — html2canvas often fails on far off-screen nodes. */
function attachCaptureShell(token) {
  const shell = document.createElement("div");
  shell.className = "print-shell pdf-capture-root";
  shell.setAttribute("aria-hidden", "true");
  shell.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:210mm",
    "min-height:297mm",
    "z-index:-1",
    "opacity:0",
    "pointer-events:none",
    "overflow:hidden",
    "background:#fff",
  ].join(";");
  shell.innerHTML = renderA4CertificateArticle(token, { qrElementId: "pdf-cert-qr" });
  document.body.appendChild(shell);
  return shell;
}

export async function downloadCertificatePdf(token) {
  await preloadA4Background();

  const shell = attachCaptureShell(token);

  try {
    const bgImg = shell.querySelector(".a4-cert-bg");
    if (bgImg && !bgImg.complete) {
      await new Promise((resolve) => {
        bgImg.onload = resolve;
        bgImg.onerror = resolve;
      });
    }

    const article = shell.querySelector(".a4-cert");
    if (!article) throw new Error("Certificate layout missing");

    const captureScale = pdfCaptureScale(article);
    const qrPixelSize = Math.min(640, Math.max(320, Math.round(240 * (captureScale / 2))));

    const qrImg = shell.querySelector("#pdf-cert-qr");
    const url = qrImg?.getAttribute("data-url");
    if (qrImg && url) {
      try {
        qrImg.src = await qrDataUrlWithLogo(url, { size: qrPixelSize });
        qrImg.classList.add("is-ready");
        await new Promise((resolve) => {
          if (qrImg.complete) resolve();
          else {
            qrImg.onload = resolve;
            qrImg.onerror = resolve;
          }
        });
      } catch {
        qrImg.classList.add("is-ready");
      }
    }

    await waitForNextFrames(3);

    const canvas = await html2canvas(article, {
      scale: captureScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      removeContainer: false,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("PDF capture produced an empty canvas");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
    const tracking = getPrintData(token).applicationId.replace(/[^\w-]+/g, "_");
    pdf.save(`vehicle-fitness-${tracking || token}.pdf`);
  } finally {
    shell.remove();
  }
}
