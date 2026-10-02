const SESSION_KEY = "dastak:admin-session";
const SESSION_MS = 8 * 60 * 60 * 1000;

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

export function isAdminLoggedIn() {
  const session = readSession();
  if (!session?.expiresAt) return false;
  if (Date.now() > session.expiresAt) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return Boolean(session.sessionId);
}

export function loginAdmin(password) {
  if (password !== adminPassword()) return false;

  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MS,
      syncKey: password,
    })
  );
  return true;
}

export function getAdminSyncKey() {
  const session = readSession();
  if (session?.syncKey) return session.syncKey;
  return adminPassword();
}

export function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
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
