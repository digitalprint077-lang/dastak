const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const YEAR_MIN = 1950;
const YEAR_MAX = 2080;

const ICON_PREV =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_NEXT =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseIsoDate(value) {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return { y, m, d };
}

function todayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function clampYear(y) {
  return Math.min(YEAR_MAX, Math.max(YEAR_MIN, y));
}

let pop = null;
let state = {
  input: null,
  viewY: todayParts().y,
  viewM: todayParts().m,
  mode: "days",
};
let outsideBound = false;

function ensurePop() {
  if (pop) return pop;
  pop = document.createElement("div");
  pop.className = "dastak-datepicker";
  pop.hidden = true;
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-modal", "false");
  pop.setAttribute("aria-label", "Choose date");
  pop.addEventListener("mousedown", (event) => event.preventDefault());
  pop.addEventListener("click", onPopClick);
  document.body.appendChild(pop);
  return pop;
}

function bindOutside() {
  if (outsideBound) return;
  outsideBound = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", reposition);
  document.addEventListener("scroll", reposition, true);
}

function unbindOutside() {
  if (!outsideBound) return;
  outsideBound = false;
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("resize", reposition);
  document.removeEventListener("scroll", reposition, true);
}

function onPointerDown(event) {
  if (!state.input) return;
  const target = event.target;
  if (pop?.contains(target) || state.input === target || state.input.contains?.(target)) return;
  closeDatePicker();
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    closeDatePicker();
    state.input?.focus();
  }
}

function onPopClick(event) {
  const btn = event.target.closest("[data-dp]");
  if (!btn) return;
  const action = btn.getAttribute("data-dp");
  if (action === "prev") shiftView(-1);
  else if (action === "next") shiftView(1);
  else if (action === "title") cycleMode();
  else if (action === "today") {
    const today = todayParts();
    commitDate(today.y, today.m, today.d);
  } else if (action === "day") {
    commitDate(Number(btn.dataset.y), Number(btn.dataset.m), Number(btn.dataset.d));
  } else if (action === "month") {
    state.viewM = Number(btn.dataset.m);
    state.mode = "days";
    renderPop();
  } else if (action === "year") {
    state.viewY = Number(btn.dataset.y);
    state.mode = "months";
    renderPop();
  }
}

function shiftView(dir) {
  if (state.mode === "days") {
    const date = new Date(state.viewY, state.viewM - 1 + dir, 1);
    state.viewY = clampYear(date.getFullYear());
    state.viewM = date.getMonth() + 1;
  } else if (state.mode === "months") {
    state.viewY = clampYear(state.viewY + dir);
  } else {
    state.viewY = clampYear(state.viewY + dir * 12);
  }
  renderPop();
}

function cycleMode() {
  state.mode = state.mode === "days" ? "months" : state.mode === "months" ? "years" : "days";
  renderPop();
}

function commitDate(y, m, d) {
  const input = state.input;
  if (!input) return;
  const iso = toIsoDate(y, m, d);
  const changed = input.value !== iso;
  input.value = iso;
  if (changed) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  closeDatePicker();
  input.focus();
}

function yearBlockStart(y) {
  return YEAR_MIN + Math.floor((clampYear(y) - YEAR_MIN) / 12) * 12;
}

function titleLabel() {
  if (state.mode === "days") return `${MONTHS[state.viewM - 1]} ${state.viewY}`;
  if (state.mode === "months") return String(state.viewY);
  const start = yearBlockStart(state.viewY);
  return `${start} – ${start + 11}`;
}

function weekdayRow() {
  return WEEKDAYS.map((day) => `<span class="dastak-datepicker-weekday">${day}</span>`).join("");
}

function dayGrid() {
  const selected = parseIsoDate(state.input?.value);
  const today = todayParts();
  const first = new Date(state.viewY, state.viewM - 1, 1);
  const start = new Date(state.viewY, state.viewM - 1, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const y = cell.getFullYear();
    const m = cell.getMonth() + 1;
    const d = cell.getDate();
    const iso = toIsoDate(y, m, d);
    const inMonth = m === state.viewM && y === state.viewY;
    const isSel = selected && selected.y === y && selected.m === m && selected.d === d;
    const isToday = today.y === y && today.m === m && today.d === d;
    const classes = [
      "dastak-datepicker-day",
      inMonth ? "" : "is-outside",
      isSel ? "is-selected" : "",
      isToday ? "is-today" : "",
    ]
      .filter(Boolean)
      .join(" ");
    cells.push(
      `<button type="button" class="${classes}" data-dp="day" data-y="${y}" data-m="${m}" data-d="${d}" aria-label="${iso}"${
        isSel ? ' aria-selected="true"' : ""
      }${isToday ? ' aria-current="date"' : ""}>${d}</button>`
    );
  }
  return `<div class="dastak-datepicker-weekdays">${weekdayRow()}</div><div class="dastak-datepicker-grid">${cells.join(
    ""
  )}</div>`;
}

function monthGrid() {
  const selected = parseIsoDate(state.input?.value);
  return `<div class="dastak-datepicker-months">${MONTHS_SHORT.map((label, idx) => {
    const m = idx + 1;
    const sel = selected && selected.y === state.viewY && selected.m === m ? " is-selected" : "";
    return `<button type="button" class="dastak-datepicker-chip${sel}" data-dp="month" data-m="${m}">${label}</button>`;
  }).join("")}</div>`;
}

function yearGrid() {
  const start = yearBlockStart(state.viewY);
  const selected = parseIsoDate(state.input?.value);
  const buttons = [];
  for (let y = start; y < start + 12; y += 1) {
    const disabled = y < YEAR_MIN || y > YEAR_MAX;
    const sel = selected && selected.y === y ? " is-selected" : "";
    buttons.push(
      `<button type="button" class="dastak-datepicker-chip${sel}" data-dp="year" data-y="${y}" ${
        disabled ? "disabled" : ""
      }>${y}</button>`
    );
  }
  return `<div class="dastak-datepicker-months">${buttons.join("")}</div>`;
}

function renderPop() {
  const el = ensurePop();
  const body = state.mode === "days" ? dayGrid() : state.mode === "months" ? monthGrid() : yearGrid();
  el.innerHTML = `
    <div class="dastak-datepicker-card">
      <div class="dastak-datepicker-head">
        <button type="button" class="dastak-datepicker-nav" data-dp="prev" aria-label="Previous">${ICON_PREV}</button>
        <button type="button" class="dastak-datepicker-title" data-dp="title">${titleLabel()}</button>
        <button type="button" class="dastak-datepicker-nav" data-dp="next" aria-label="Next">${ICON_NEXT}</button>
      </div>
      ${body}
      <div class="dastak-datepicker-foot">
        <button type="button" class="dastak-datepicker-today" data-dp="today">Today</button>
      </div>
    </div>
  `;
  el.hidden = false;
  reposition();
}

function reposition() {
  if (!pop || pop.hidden || !state.input) return;
  const rect = state.input.getBoundingClientRect();
  const width = pop.offsetWidth || 308;
  const height = pop.offsetHeight || 340;
  const gap = 8;
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
  if (left < 8) left = 8;
  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - 8 && rect.top - gap - height > 8) {
    top = rect.top - gap - height;
  }
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

export function closeDatePicker() {
  if (state.input) state.input.setAttribute("aria-expanded", "false");
  state.input = null;
  state.mode = "days";
  if (pop) pop.hidden = true;
  unbindOutside();
}

function openDatePicker(input) {
  if (!input || input.disabled || input.readOnly) return;
  ensurePop();
  const parsed = parseIsoDate(input.value) || todayParts();
  state.input = input;
  state.viewY = clampYear(parsed.y);
  state.viewM = parsed.m;
  state.mode = "days";
  input.setAttribute("aria-expanded", "true");
  bindOutside();
  renderPop();
}

export function bindDatePickers(root = document) {
  closeDatePicker();
  root.querySelectorAll("input.form-control-date").forEach((input) => {
    if (input.dataset.datePickerBound === "1") return;
    input.dataset.datePickerBound = "1";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
    if (!input.placeholder) input.placeholder = "YYYY-MM-DD";
    if (input.disabled || input.readOnly) return;
    input.addEventListener("click", () => openDatePicker(input));
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "F4") {
        event.preventDefault();
        openDatePicker(input);
      }
    });
  });
}
