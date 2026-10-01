const ATTEMPTS_KEY = "dastak:lookup-attempts";
const CAPTCHA_KEY = "dastak:captcha-pass";
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;
const CAPTCHA_VALID_MS = 30 * 60 * 1000;

function loadAttempts() {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveAttempts(list) {
  sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list.slice(-40)));
}

function pruneAttempts(list) {
  const cutoff = Date.now() - WINDOW_MS;
  return list.filter((t) => t >= cutoff);
}

export function isCaptchaPassed() {
  try {
    const raw = sessionStorage.getItem(CAPTCHA_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    return Date.now() < until;
  } catch {
    return false;
  }
}

export function markCaptchaPassed() {
  sessionStorage.setItem(
    CAPTCHA_KEY,
    JSON.stringify({ until: Date.now() + CAPTCHA_VALID_MS })
  );
}

export function createCaptchaChallenge() {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const challenge = { id, a, b, answer: a + b };
  sessionStorage.setItem("dastak:captcha-challenge", JSON.stringify(challenge));
  return { id, a, b };
}

export function verifyCaptchaAnswer(id, value) {
  try {
    const raw = sessionStorage.getItem("dastak:captcha-challenge");
    if (!raw) return false;
    const challenge = JSON.parse(raw);
    if (challenge.id !== id) return false;
    const n = Number(String(value).trim());
    if (!Number.isFinite(n) || n !== challenge.answer) return false;
    markCaptchaPassed();
    sessionStorage.removeItem("dastak:captcha-challenge");
    return true;
  } catch {
    return false;
  }
}

/** @returns {{ allowed: boolean, needCaptcha: boolean }} */
export function checkLookupRateLimit() {
  if (isCaptchaPassed()) return { allowed: true, needCaptcha: false };
  const recent = pruneAttempts(loadAttempts());
  saveAttempts(recent);
  if (recent.length >= MAX_ATTEMPTS) {
    return { allowed: false, needCaptcha: true };
  }
  return { allowed: true, needCaptcha: false };
}

export function recordLookupAttempt() {
  const recent = pruneAttempts(loadAttempts());
  recent.push(Date.now());
  saveAttempts(recent);
}
