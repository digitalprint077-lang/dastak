let indeterminateTimer = null;

function els() {
  return {
    root: document.getElementById("admin-save-progress"),
    bar: document.getElementById("admin-save-progress-bar"),
    label: document.getElementById("admin-save-progress-label"),
  };
}

export function showSaveProgress(label, percent = 0, { indeterminate = false } = {}) {
  const { root, bar, label: labelEl } = els();
  if (!root || !bar || !labelEl) return;
  window.clearInterval(indeterminateTimer);
  indeterminateTimer = null;

  root.hidden = false;
  labelEl.textContent = label;
  bar.classList.toggle("is-indeterminate", indeterminate);
  if (indeterminate) {
    bar.style.width = "";
  } else {
    const p = Math.min(100, Math.max(0, percent));
    bar.style.width = `${p}%`;
  }
}

export function hideSaveProgress() {
  const { root, bar } = els();
  window.clearInterval(indeterminateTimer);
  indeterminateTimer = null;
  if (bar) {
    bar.classList.remove("is-indeterminate");
    bar.style.width = "0%";
  }
  if (root) root.hidden = true;
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
