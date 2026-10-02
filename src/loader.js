const LOADER_ID = "app-loader";

function isPrintRoute() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return /^\/vehiclefitness\/[^/]+\/print$/i.test(path);
}

export function showAppLoader() {
  if (isPrintRoute()) return;
  const el = document.getElementById(LOADER_ID);
  if (!el) return;
  el.removeAttribute("hidden");
  el.hidden = false;
  el.style.display = "";
  el.classList.remove("is-hidden");
  el.setAttribute("aria-busy", "true");
}

export function hideAppLoader(immediate = false) {
  const el = document.getElementById(LOADER_ID);
  if (!el) return;
  el.classList.add("is-hidden");
  el.setAttribute("aria-busy", "false");
  if (immediate || isPrintRoute()) {
    el.hidden = true;
    el.style.display = "none";
    return;
  }
  window.setTimeout(() => {
    if (el.classList.contains("is-hidden")) {
      el.hidden = true;
      el.style.display = "none";
    }
  }, 450);
}
