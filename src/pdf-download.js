import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getPrintData } from "./certificates.js";
import { qrDataUrlWithLogo } from "./qr-with-logo.js";
import { preloadA4Background, renderA4CertificateArticle } from "./print-a4.js";

export async function downloadCertificatePdf(token) {
  await preloadA4Background();

  const shell = document.createElement("div");
  shell.className = "print-shell pdf-capture-root";
  shell.setAttribute("aria-hidden", "true");
  shell.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;";
  shell.innerHTML = renderA4CertificateArticle(token, { qrElementId: "pdf-cert-qr" });
  document.body.appendChild(shell);

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
