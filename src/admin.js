const SESSION_KEY = "dastak:admin-session";
const SESSION_MS = 8 * 60 * 60 * 1000;

function adminPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || "dastak-admin";
}

export function isAdminLoggedIn() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function loginAdmin(password) {
  if (password !== adminPassword()) return false;
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ expiresAt: Date.now() + SESSION_MS })
  );
  return true;
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
