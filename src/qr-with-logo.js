import QRCode from "qrcode";

/** Used only inside the print QR — navbar/admin keep `/images/logo-dastak.png`. */
const LOGO_SRC = "/images/logo-dastak-qr-only.jpg";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitRect(innerW, innerH, aspect) {
  let w = innerW;
  let h = w / aspect;
  if (h > innerH) {
    h = innerH;
    w = h * aspect;
  }
  return { w, h };
}

/**
 * QR with centered Dastak mark (white patch + full logo, high error correction).
 */
export async function qrDataUrlWithLogo(text, { size = 240, errorCorrectionLevel } = {}) {
  const ecLevel =
    errorCorrectionLevel ||
    (String(text).length > 180 ? "M" : "H");
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: ecLevel,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  let logo;
  try {
    logo = await loadImage(LOGO_SRC);
  } catch {
    return canvas.toDataURL("image/png");
  }

  const patchRatio = 0.3;
  const whiteRing = Math.max(2, Math.round(size * 0.012));
  const patchSize = Math.round(size * patchRatio);
  const totalClear = patchSize + whiteRing * 2;
  const clearX = Math.round((size - totalClear) / 2);
  const clearY = clearX;
  const pad = Math.round(patchSize * 0.1);
  const innerX = clearX + whiteRing + pad;
  const innerY = clearY + whiteRing + pad;
  const innerW = patchSize - pad * 2;
  const innerH = patchSize - pad * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(clearX, clearY, totalClear, totalClear);

  const aspect = logo.width / logo.height;
  const { w: drawW, h: drawH } = fitRect(innerW, innerH, aspect);
  const drawX = innerX + (innerW - drawW) / 2;
  const drawY = innerY + (innerH - drawH) / 2;

  ctx.drawImage(logo, 0, 0, logo.width, logo.height, drawX, drawY, drawW, drawH);

  return canvas.toDataURL("image/png");
}
