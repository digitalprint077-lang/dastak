import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getPrintData } from "./certificates.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import { preloadA4Background, renderA4CertificateArticle } from "./print-a4.js";

/** ~110 DPI — readable Form-I without the multi-second scale-2 capture. */
const PDF_CAPTURE_SCALE = 1.4;
const PDF_JPEG_QUALITY = 0.86;
const PDF_QR_PIXEL_SIZE = 160;
const PDF_CAPTURE_TIMEOUT_MS = 25000;

let captureShell = null;

function waitForNextFrames(count = 1) {
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

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function getCaptureShell() {
  if (captureShell?.isConnected) return captureShell;
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
  document.body.appendChild(shell);
  captureShell = shell;
  return shell;
}

async function waitIfIncomplete(img, ms) {
  if (!img || img.complete) return;
  await withTimeout(
    new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    }),
    ms,
    "Image timed out"
  );
}

async function captureCertificateCanvas(token) {
  const shell = getCaptureShell();
  shell.innerHTML = renderA4CertificateArticle(token, { qrElementId: "pdf-cert-qr" });

  await waitIfIncomplete(shell.querySelector(".a4-cert-bg"), 8000);

  const qrImg = shell.querySelector("#pdf-cert-qr");
  const url = qrImg?.getAttribute("data-url");
  if (qrImg && url) {
    try {
      qrImg.src = await qrDataUrlWithLogo(url, { size: PDF_QR_PIXEL_SIZE });
      qrImg.classList.add("is-ready");
      await waitIfIncomplete(qrImg, 5000);
    } catch {
      qrImg.classList.add("is-ready");
    }
  }

  await waitForNextFrames(1);

  const article = shell.querySelector(".a4-cert");
  if (!article) throw new Error("Certificate layout missing");

  const canvas = await withTimeout(
    html2canvas(article, {
      scale: PDF_CAPTURE_SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 5000,
    }),
    PDF_CAPTURE_TIMEOUT_MS,
    "PDF capture timed out — try again or use Print"
  );

  if (!canvas.width || !canvas.height) {
    throw new Error("PDF capture produced an empty canvas");
  }
  return canvas;
}

function canvasToPdfImage(canvas) {
  try {
    return { data: canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY), format: "JPEG" };
  } catch {
    return { data: canvas.toDataURL("image/png"), format: "PNG" };
  }
}

function pdfFileName(token) {
  const tracking = getPrintData(token).applicationId.replace(/[^\w-]+/g, "_");
  return `vehicle-fitness-${tracking || token}.pdf`;
}

function waitMs(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function downloadCertificatePdfs(tokens, { onProgress } = {}) {
  const list = [...new Set((tokens || []).map((t) => String(t || "").trim()).filter(Boolean))];
  if (!list.length) throw new Error("No certificates to download");

  await preloadA4Background();

  try {
    for (let i = 0; i < list.length; i += 1) {
      onProgress?.({ index: i, total: list.length, token: list[i] });
      const canvas = await captureCertificateCanvas(list[i]);
      const image = canvasToPdfImage(canvas);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(image.data, image.format, 0, 0, pageW, pageH);
      pdf.save(pdfFileName(list[i]));
      if (i < list.length - 1) await waitMs(350);
    }
  } finally {
    if (captureShell?.isConnected) {
      captureShell.innerHTML = "";
    }
  }
}

export async function downloadCertificatePdf(token) {
  await downloadCertificatePdfs([token]);
}
