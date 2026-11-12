const SESSION_KEY = "dastak:admin-session";
const IDLE_LOGOUT_FLAG = "dastak:idle-logout";
const IDLE_MS = 2 * 60 * 1000;
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
const IDLE_CHECK_MS = 1000;
const TOUCH_THROTTLE_MS = 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click", "wheel"];

function adminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || "dastak-admin";
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function sessionIdleExpired(session, now = Date.now()) {
  if (!session?.sessionId) return true;
  const last = Number(session.lastActivityAt || session.createdAt || 0);
  if (last && now - last > IDLE_MS) return true;
  if (session.expiresAt && now > session.expiresAt) return true;
  const created = Number(session.createdAt || 0);
  if (created && now - created > MAX_SESSION_MS) return true;
  return false;
}

export function isAdminLoggedIn() {
  const session = readSession();
  if (!session?.sessionId) return false;
  if (!session.lastActivityAt) {
    session.lastActivityAt = Date.now();
    session.expiresAt = Date.now() + IDLE_MS;
    writeSession(session);
  }
  if (sessionIdleExpired(session)) {
    const last = Number(session.lastActivityAt || session.createdAt || 0);
    if (last && Date.now() - last > IDLE_MS) markIdleLogout();
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function touchAdminSession() {
  const session = readSession();
  if (!session?.sessionId || sessionIdleExpired(session)) return;
  const now = Date.now();
  if (session.lastActivityAt && now - Number(session.lastActivityAt) < TOUCH_THROTTLE_MS) return;
  const created = Number(session.createdAt || now);
  session.lastActivityAt = now;
  session.expiresAt = Math.min(now + IDLE_MS, created + MAX_SESSION_MS);
  writeSession(session);
}

export function loginAdmin(password) {
  if (password !== adminPassword()) return false;

  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  const now = Date.now();
  writeSession({
    sessionId,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + IDLE_MS,
    syncKey: password,
  });
  return true;
}

export function getAdminSyncKey() {
  const session = readSession();
  if (session?.syncKey) return session.syncKey;
  return adminPassword();
}

export function logoutAdmin() {
  stopAdminIdleGuard();
  sessionStorage.removeItem(SESSION_KEY);
}

export function markIdleLogout() {
  try {
    sessionStorage.setItem(IDLE_LOGOUT_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function consumeIdleLogoutNotice() {
  try {
    if (sessionStorage.getItem(IDLE_LOGOUT_FLAG) !== "1") return false;
    sessionStorage.removeItem(IDLE_LOGOUT_FLAG);
    return true;
  } catch {
    return false;
  }
}

let idleTimer = 0;
let idleCallback = null;
let activityBound = false;
let idleArmed = false;

function onAdminActivity() {
  if (!idleArmed || document.visibilityState === "hidden") return;
  touchAdminSession();
}

function onAdminVisibility() {
  if (!idleArmed || document.visibilityState !== "visible") return;
  if (!isAdminLoggedIn()) {
    const cb = idleCallback;
    stopAdminIdleGuard();
    cb?.();
  }
}

function bindAdminActivity() {
  if (activityBound) return;
  activityBound = true;
  ACTIVITY_EVENTS.forEach((type) => {
    window.addEventListener(type, onAdminActivity, { passive: true });
  });
  document.addEventListener("visibilitychange", onAdminVisibility);
}

function unbindAdminActivity() {
  if (!activityBound) return;
  activityBound = false;
  ACTIVITY_EVENTS.forEach((type) => {
    window.removeEventListener(type, onAdminActivity);
  });
  document.removeEventListener("visibilitychange", onAdminVisibility);
}

function checkAdminIdle() {
  if (!idleArmed) return;
  if (isAdminLoggedIn()) return;
  const cb = idleCallback;
  stopAdminIdleGuard();
  cb?.();
}

export function startAdminIdleGuard(onIdleLogout) {
  idleCallback = onIdleLogout;
  idleArmed = true;
  bindAdminActivity();
  const session = readSession();
  if (session?.sessionId && !session.lastActivityAt) {
    session.lastActivityAt = Date.now();
    session.expiresAt = Date.now() + IDLE_MS;
    writeSession(session);
  }
  if (!idleTimer) idleTimer = window.setInterval(checkAdminIdle, IDLE_CHECK_MS);
}

export function stopAdminIdleGuard() {
  idleArmed = false;
  idleCallback = null;
  if (idleTimer) {
    window.clearInterval(idleTimer);
    idleTimer = 0;
  }
  unbindAdminActivity();
}

export function requireAdmin(path) {
  if (path.startsWith("/admin/dashboard") && !isAdminLoggedIn()) {
    return "/admin";
  }
  if (path === "/admin" && isAdminLoggedIn()) {
    return "/admin/dashboard";
  }
  return null;
}
