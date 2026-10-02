function encodeBase64Url(text) {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(encoded) {
  let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeCertificateUrlHash({ token, status, values }) {
  const payload = JSON.stringify({ t: token, s: status || "Issued", v: values || {} });
  return `d=${encodeBase64Url(payload)}`;
}

export function decodeCertificateUrlHash() {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const encoded = params.get("d");
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(encoded));
    if (!parsed || typeof parsed !== "object" || !parsed.v) return null;
    return {
      token: String(parsed.t ?? "").trim(),
      status: String(parsed.s ?? "Issued").trim() || "Issued",
      values: parsed.v && typeof parsed.v === "object" ? parsed.v : {},
    };
  } catch {
    return null;
  }
}

export function certificatePayloadMatchesSlug(payload, slug) {
  if (!payload || !slug) return false;
  const id = decodeURIComponent(String(slug).trim());
  if (!id) return false;
  if (payload.token && payload.token === id) return true;
  const values = payload.values || {};
  if (String(values["Tracking ID"] ?? "").trim() === id) return true;
  if (String(values["Certificate Number"] ?? "").trim() === id) return true;
  return false;
}
