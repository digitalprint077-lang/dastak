function els() {
  return {
    root: document.getElementById("admin-save-progress"),
    bar: document.getElementById("admin-save-progress-bar"),
    label: document.getElementById("admin-save-progress-label"),
    pct: document.getElementById("admin-save-progress-pct"),
  };
}

function clampPercent(percent) {
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function showSaveProgress(label, percent = 0) {
  const { root, bar, label: labelEl, pct } = els();
  if (!root || !bar || !labelEl) return;
  const p = clampPercent(percent);

  root.hidden = false;
  root.dataset.mode = root.dataset.mode || "save";
  labelEl.textContent = label;
  bar.style.width = `${p}%`;
  bar.classList.remove("is-indeterminate");
  if (pct) pct.textContent = `${p}%`;
  root.setAttribute("aria-valuenow", String(p));
}

export function showAdminProgress(mode, label, percent = 0) {
  const { root } = els();
  if (root) root.dataset.mode = mode;
  showSaveProgress(label, percent);
}

export function hideSaveProgress() {
  const { root, bar, pct } = els();
  if (bar) {
    bar.classList.remove("is-indeterminate");
    bar.style.width = "0%";
  }
  if (pct) pct.textContent = "0%";
  if (root) {
    root.hidden = true;
    root.removeAttribute("aria-valuenow");
  }
}

export function setSaveFormBusy(busy) {
  const form = document.getElementById("cert-editor");
  if (!form) return;
  form.classList.toggle("is-saving", busy);
  form.querySelectorAll("input, select, textarea, button").forEach((el) => {
    if (busy) el.setAttribute("data-was-disabled", el.disabled ? "1" : "0");
    if (busy) el.disabled = true;
    else if (el.getAttribute("data-was-disabled") === "0") el.disabled = false;
  });
}
