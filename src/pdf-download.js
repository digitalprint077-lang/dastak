import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getPrintData } from "./certificates.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import { preloadA4Background, renderA4CertificateArticle } from "./print-a4.js";

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

    const qrImg = shell.querySelector("#pdf-cert-qr");
    const url = qrImg?.getAttribute("data-url");
    if (qrImg && url) {
      try {
        qrImg.src = await qrDataUrlWithLogo(url, { size: 240 });
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

    await waitForNextFrames(2);

    const article = shell.querySelector(".a4-cert");
    if (!article) throw new Error("Certificate layout missing");

    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvas = await html2canvas(article, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("PDF capture produced an empty canvas");
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    let imgData;
    let format = "PNG";
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.92);
      format = "JPEG";
    } catch {
      imgData = canvas.toDataURL("image/png");
    }

    pdf.addImage(imgData, format, 0, 0, pageW, pageH);
    const tracking = getPrintData(token).applicationId.replace(/[^\w-]+/g, "_");
    pdf.save(`vehicle-fitness-${tracking || token}.pdf`);
  } finally {
    shell.remove();
  }
}
