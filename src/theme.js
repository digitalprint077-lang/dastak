const STORAGE_KEY = "dastak:theme";

export function getTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme = getTheme()) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  syncThemeToggleUI(theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function syncThemeToggleUI(theme = getTheme()) {
  document.querySelectorAll("[data-theme-toggle]").forEach((el) => {
    const isDark = theme === "dark";
    el.setAttribute("aria-pressed", isDark ? "true" : "false");
    el.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    const label = el.querySelector(".theme-toggle-label");
    if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
  });
}

export function themeToggleButton() {
  const isDark = getTheme() === "dark";
  return `
    <button
      type="button"
      class="theme-toggle"
      data-action="toggle-theme"
      data-theme-toggle
      aria-pressed="${isDark}"
      aria-label="${isDark ? "Switch to light mode" : "Switch to dark mode"}"
    >
      <span class="theme-toggle-track" aria-hidden="true"><span class="theme-toggle-thumb"></span></span>
      <span class="theme-toggle-label">${isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  `;
}
