import {
  PERMIT_FORM_SECTIONS,
  PERMIT_TYPE_OPTIONS,
  PERMIT_DISTRICT_OPTIONS,
  PERMIT_STATUS_OPTIONS,
  PERMIT_DATE_FIELDS,
  PERMIT_REQUIRED_FIELDS,
  PERMIT_MAKER_OPTIONS,
  PERMIT_MAKE_OPTIONS,
  PERMIT_MODEL_OPTIONS,
  PERMIT_LADEN_WEIGHT_OPTIONS,
  PERMIT_CUSTOM_VALUE,
  publicPermitLink,
  publicPermitPath,
  printPermitPath,
} from "./permits.js";
import { aggregateTokenStats, getAnalyticsEvents } from "./analytics.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function formatPreviewDate(value) {
  const raw = String(value ?? "").trim();
  return raw || "—";
}

function previewRow(label, value, html = false) {
  const display = html ? value : escapeHtml(formatPreviewDate(value));
  return `
    <div class="info-row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${display || "—"}</div>
    </div>
  `;
}

const PERMIT_PHOTO_FALLBACK = "/images/permit-photo-missing.png";

function permitPhotoImg(src, alt) {
  const url = String(src ?? "").trim() || PERMIT_PHOTO_FALLBACK;
  const isFallback = url === PERMIT_PHOTO_FALLBACK;
  return `<img class="permit-photo${isFallback ? " is-placeholder" : ""}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" onerror="this.onerror=null;this.src='${PERMIT_PHOTO_FALLBACK}';this.classList.add('is-placeholder')">`;
}

export function renderPermitPreview(mainLayout, { token, status, values }) {
  const restricted = status === "Revoked" || status === "Expired";
  const photo = String(values.Photo ?? "").trim();
  const currentLine2 = String(values["Current Address Line 2"] ?? "").trim();
  const permanentLine2 = String(values["Permanent Address Line 2"] ?? "").trim();
  const currentHtml = `${escapeHtml(values["Current Address"] || "—")}${
    currentLine2 ? `<br>${escapeHtml(currentLine2)}` : ""
  }`;
  const permanentHtml = `${escapeHtml(values["Permanent Address"] || "—")}${
    permanentLine2 ? `<br>${escapeHtml(permanentLine2)}` : ""
  }`;

  const body = restricted
    ? `
      <a class="btn btn-success permit-back-btn" href="/">Back</a>
      <div class="permit-preview-main">
        <h2 class="permit-preview-title">Route Permit Details</h2>
        <div class="permit-card">
          <p class="alert">Permit Status: <strong>${escapeHtml(status)}</strong></p>
          <p class="muted">This permit is not valid for verification. Contact the issuing authority if you have questions.</p>
        </div>
      </div>
    `
    : `
      <a class="btn btn-success permit-back-btn" href="/">Back</a>
      <div class="permit-preview-main">
        <h2 class="permit-preview-title">Route Permit Details</h2>
        <div class="permit-card">
          <div class="columns-container">
            <div class="photo-column">
              ${permitPhotoImg(photo, photo ? "Permit Holder Photo" : "IMAGE NOT FOUND")}
            </div>
            <div class="column">
              ${previewRow("Route Permit No", values["Route Permit No"])}
              ${previewRow("Permit Holder", values["Permit Holder"])}
              ${previewRow("Father Name", values["Father Name"])}
              ${previewRow("CNIC", values.CNIC)}
              ${previewRow("Contact", values.Contact)}
            </div>
            <div class="column">
              ${previewRow("Issue Date", values["Issue Date"])}
              ${previewRow("Expiry Date", values["Expiry Date"])}
              ${previewRow("Permit Type", values["Permit Type"])}
              ${previewRow("Vehicle Registration No", values["Vehicle Registration No"])}
              ${previewRow("District", values.District)}
            </div>
          </div>
          <div class="route-box">
            <div class="permit-address-row">
              <div>
                <div class="label">Current Address</div>
                <div class="value">${currentHtml}</div>
              </div>
              <div>
                <div class="label">Permanent Address</div>
                <div class="value">${permanentHtml}</div>
              </div>
            </div>
            <div class="permit-route-row">
              <div class="label">Route</div>
              <div class="value">${escapeHtml(values.Route || "—")}</div>
            </div>
          </div>
        </div>
      </div>
    `;

  return mainLayout(body, { shellClass: "permit-preview-page" });
}

export function renderPermitNotFound(mainLayout, slug) {
  return mainLayout(
    `
    <a class="btn btn-success permit-back-btn" href="/">Back</a>
    <div class="permit-preview-main">
      <h2 class="permit-preview-title">Route Permit Details</h2>
      <div class="permit-card">
        <p class="alert">Permit Status: <strong>Not Found</strong></p>
        <p class="muted">Reference: ${escapeHtml(String(slug ?? ""))}</p>
      </div>
    </div>
  `,
    { shellClass: "permit-preview-page" }
  );
}

function optionList(options, selected) {
  return options
    .map((opt) => `<option value="${escapeHtml(opt)}"${opt === selected ? " selected" : ""}>${escapeHtml(opt)}</option>`)
    .join("");
}

function iconSvg(paths, size = 17) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const PERMIT_FIELD_ICONS = {
  Status: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>`,
  "Holder photo": `<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="11" r="3"/><path d="M8 19c1.2-1.8 2.9-3 4-3s2.8 1.2 4 3"/>`,
  "Route Permit No": `<path d="M14 2H6a2 2 0 0 0-2 2v16l8-4 8 4V8z"/><path d="M14 2v6h6"/>`,
  "Tracking ID": `<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 9v6"/><path d="M14 9v6"/>`,
  "Permit Type": `<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>`,
  "Issue Date": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>`,
  "Expiry Date": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="m9 16 6-6"/>`,
  Dated: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M8 14h8"/>`,
  "Permit Holder": `<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/>`,
  "Father Name": `<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.5-5 6-5"/><path d="M14 19c0-2 1.5-3.5 3.5-3.5"/>`,
  CNIC: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 11h5"/><path d="M13 15h3"/>`,
  Contact: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.32 1.54.55 2.35.68A2 2 0 0 1 22 16.92z"/>`,
  District: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  "Current Address": `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>`,
  "Current Address Line 2": `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>`,
  "Permanent Address": `<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M4 14h16"/><path d="M9 10V7l3-3 3 3v3"/>`,
  "Permanent Address Line 2": `<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M4 14h16"/>`,
  "Vehicle Registration No": `<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h3"/><path d="M14 12h3"/>`,
  "Chassis No": `<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h2v4H6z"/><path d="M16 10h2v4h-2z"/>`,
  "Date of 1st Registration": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h4"/>`,
  "Seating Capacity": `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  "Laden Weight": `<path d="m12 3 7 4v10l-7 4-7-4V7z"/><path d="M12 12 19 8"/><path d="M12 12v9"/><path d="M12 12 5 8"/>`,
  Maker: `<path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M9 21v-6h6v6"/>`,
  Make: `<path d="M19 17h2c.6 0 1-.4 1-1v-3l-2-5H5L3 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>`,
  Model: `<path d="M19 17h2c.6 0 1-.4 1-1v-3l-2-5H5L3 13v3c0 .6.4 1 1 1h2"/><path d="M7 11h10"/>`,
  Route: `<polygon points="1 6 9 2 15 6 23 2 23 18 15 22 9 18 1 22"/><line x1="9" x2="9" y1="2" y2="18"/><line x1="15" x2="15" y1="6" y2="22"/>`,
  "Renewed Upto": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M7 14h4"/>`,
  "Renewal Application Date": `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="m13 16 4-4"/>`,
  Conditions: `<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>`,
};

function permitFieldIcon(label) {
  const paths =
    PERMIT_FIELD_ICONS[label] || `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10"/>`;
  return iconSvg(paths, 17);
}

function permitFieldLabel(label) {
  const req = PERMIT_REQUIRED_FIELDS.includes(label)
    ? `<span class="form-label-required" aria-hidden="true">*</span>`
    : "";
  return `<span class="form-label">${escapeHtml(label)}${req}</span>`;
}

function permitControlWrap(label, control) {
  const dateClass = PERMIT_DATE_FIELDS.includes(label) ? " form-input-wrap-date" : "";
  return `
    <div class="form-input-wrap${dateClass}">
      <span class="form-field-icon">${permitFieldIcon(label)}</span>
      ${control}
    </div>
  `;
}

function permitChoiceField(label, value, options) {
  const id = `permit-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const name = escapeHtml(label);
  const raw = String(value ?? "").trim();
  const isPreset = options.includes(raw);
  const selectValue = isPreset ? raw : raw ? PERMIT_CUSTOM_VALUE : "";
  const customHidden = selectValue === PERMIT_CUSTOM_VALUE ? "" : " hidden";
  const customVal = !isPreset ? escapeHtml(raw) : "";
  return `
    <label class="form-field form-field-permit-choice" for="${id}">
      ${permitFieldLabel(label)}
      ${permitControlWrap(
        label,
        `<select class="form-control" id="${id}" name="${name}" data-permit-choice-select>
        <option value=""${selectValue === "" ? " selected" : ""}>Select ${escapeHtml(label.toLowerCase())}</option>
        ${optionList(options, selectValue)}
        <option value="${PERMIT_CUSTOM_VALUE}"${selectValue === PERMIT_CUSTOM_VALUE ? " selected" : ""}>Custom…</option>
      </select>`
      )}
      <div class="permit-choice-custom-wrap"${customHidden}>
        ${permitControlWrap(
          label,
          `<input class="form-control" id="${id}-custom" name="${escapeHtml(`${label} custom`)}" type="text" value="${customVal}" placeholder="Enter custom ${escapeHtml(label.toLowerCase())}" autocomplete="off" />`
        )}
      </div>
    </label>
  `;
}

function permitYearField(label, value, options) {
  const id = `permit-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const name = escapeHtml(label);
  const raw = String(value ?? "").trim();
  const extra =
    raw && !options.includes(raw)
      ? `<option value="${escapeHtml(raw)}" selected>${escapeHtml(raw)}</option>`
      : "";
  return `
    <label class="form-field" for="${id}">
      ${permitFieldLabel(label)}
      ${permitControlWrap(
        label,
        `<select class="form-control" id="${id}" name="${name}">
        <option value=""${raw ? "" : " selected"}>Select ${escapeHtml(label.toLowerCase())}</option>
        ${extra}
        ${optionList(options, raw)}
      </select>`
      )}
    </label>
  `;
}

function permitFieldInput(label, value) {
  const id = `permit-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const name = escapeHtml(label);
  const isDate = PERMIT_DATE_FIELDS.includes(label);
  const isMultiline = ["Route", "Conditions", "Current Address", "Permanent Address"].includes(label);
  if (label === "Maker") return permitChoiceField(label, value, PERMIT_MAKER_OPTIONS);
  if (label === "Make") return permitChoiceField(label, value, PERMIT_MAKE_OPTIONS);
  if (label === "Model") return permitYearField(label, value, PERMIT_MODEL_OPTIONS);
  if (label === "Laden Weight") return permitChoiceField(label, value, PERMIT_LADEN_WEIGHT_OPTIONS);
  let control;
  if (label === "Permit Type") {
    control = `<select class="form-control" id="${id}" name="${name}">${optionList(PERMIT_TYPE_OPTIONS, value || PERMIT_TYPE_OPTIONS[0])}</select>`;
  } else if (label === "District") {
    control = `<select class="form-control" id="${id}" name="${name}">${optionList(PERMIT_DISTRICT_OPTIONS, value || "Peshawar")}</select>`;
  } else if (isMultiline) {
    control = `<textarea class="form-control" id="${id}" name="${name}" rows="3">${escapeHtml(value)}</textarea>`;
  } else {
    control = isDate
      ? `<input class="form-control form-control-date" id="${id}" name="${name}" type="text" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false" placeholder="YYYY-MM-DD" />`
      : `<input class="form-control" id="${id}" name="${name}" type="text" value="${escapeHtml(value)}" autocomplete="off" />`;
  }
  const expiryHint =
    label === "Expiry Date"
      ? `<span class="form-field-hint" id="permit-expiry-hint">Valid for 3 years from issue date.</span>`
      : "";
  return `
    <label class="form-field${isMultiline ? " form-field-span" : ""}" for="${id}">
      ${permitFieldLabel(label)}
      ${permitControlWrap(label, control)}
      ${expiryHint}
    </label>
  `;
}

export function bindPermitChoiceSelects() {
  document.querySelectorAll("[data-permit-choice-select]").forEach((select) => {
    const wrap = select.closest(".form-field")?.querySelector(".permit-choice-custom-wrap");
    const customInput = wrap?.querySelector("input");
    const sync = (focusCustom = false) => {
      const isCustom = select.value === PERMIT_CUSTOM_VALUE;
      if (wrap) wrap.hidden = !isCustom;
      if (focusCustom && isCustom) customInput?.focus();
    };
    select.addEventListener("change", () => sync(true));
    sync();
  });
}

export function renderPermitRegistry(items) {
  const rows = (items || [])
    .map(
      (item) => `
      <div class="cert-list-item-row">
        <a class="cert-list-item" href="/admin/dashboard?view=permits&token=${encodeURIComponent(item.token)}">
          <span class="cert-list-avatar">${escapeHtml(String(item.holder || "?").slice(0, 1).toUpperCase())}</span>
          <span class="cert-list-body">
            <strong>${escapeHtml(item.holder || "Untitled permit")}</strong>
            <span class="cert-list-meta">${escapeHtml(item.permitNo || "—")} · ${escapeHtml(item.registration || "—")}</span>
            <span class="cert-list-district">${escapeHtml(item.district || "")} · ${escapeHtml(item.status || "Issued")}</span>
          </span>
        </a>
        <div class="cert-list-row-actions">
          <a class="cert-list-action-btn" href="${printPermitPath(item.token)}" target="_blank" rel="noreferrer" title="Print A4">Print</a>
          <button class="cert-list-action-btn" type="button" data-action="download-permit-pdf" data-token="${escapeHtml(item.token)}" title="Download PDF">PDF</button>
        </div>
      </div>
    `
    )
    .join("");

  return `
    <div class="admin-registry-page">
      <section class="admin-list-panel admin-list-panel-full">
        <div class="admin-list-panel-head">
          <div>
            <h2 class="admin-list-title">Route permit registry</h2>
            <p class="admin-list-lead">Search and open a permit. Fitness certificates stay in their own registry.</p>
          </div>
          <button class="btn btn-primary admin-context-cta" type="button" data-action="admin-create-permit">New permit</button>
        </div>
        <div class="cert-list" id="permit-list">
          ${
            rows ||
            `<p class="muted admin-empty-copy">No route permits yet. Create one to issue a public /routepermits link.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

export function renderPermitEditor(token, data, isCreate) {
  const values = data.values || {};
  const permitNo = escapeHtml(values["Route Permit No"] || "—");
  const trackingRaw = String(values["Tracking ID"] ?? "").trim();
  const tracking = escapeHtml(trackingRaw || "—");
  const publicUrl = publicPermitLink(token);
  const tokenStats = !isCreate ? aggregateTokenStats(getAnalyticsEvents(), token) : { views: 0, prints: 0 };
  const analyticsHref = `/admin/dashboard?view=permit-analytics${trackingRaw ? `&track=${encodeURIComponent(trackingRaw)}` : ""}`;
  const sections = PERMIT_FORM_SECTIONS.map((section, index) => {
    const fields = section.fields.map((label) => permitFieldInput(label, values[label] ?? "")).join("");
    return `
      <section class="admin-form-panel">
        <div class="admin-form-panel-head">
          <span class="admin-form-step">${index + 1}</span>
          <div class="admin-form-panel-head-text">
            <h3 class="admin-form-panel-title">${escapeHtml(section.title)}</h3>
            <p class="admin-form-panel-desc">${escapeHtml(section.desc)}</p>
          </div>
        </div>
        <div class="form-grid admin-form-panel-body">${fields}</div>
      </section>
    `;
  }).join("");

  return `
    <div class="admin-editor-page">
      <div class="admin-editor-pane">
        <a class="admin-back-registry" href="/admin/dashboard?view=permits">${escapeHtml("←")} Back to permits</a>
        <section class="admin-editor-hero">
          <div class="admin-editor-hero-main">
            <p class="admin-editor-kicker">${isCreate ? "New permit" : "Editing permit"}</p>
            <h2 class="admin-editor-title">${isCreate ? "New route permit" : escapeHtml(values["Permit Holder"] || "Route permit")}</h2>
            <div class="admin-editor-tags">
              <span class="admin-editor-tag">${permitNo}</span>
              <span class="admin-editor-tag">${tracking}</span>
            </div>
            ${isCreate ? "" : `<p class="admin-editor-status-detail"><span class="admin-hero-url">${escapeHtml(publicUrl)}</span></p>`}
            ${
              isCreate
                ? ""
                : `<a class="admin-editor-analytics-link" href="${escapeHtml(analyticsHref)}">Views &amp; prints (${tokenStats.views} / ${tokenStats.prints})</a>`
            }
          </div>
          <div class="admin-action-bar">
            ${
              isCreate
                ? ""
                : `<a class="admin-btn-pill" href="${escapeHtml(publicPermitPath(token))}" target="_blank" rel="noreferrer">Preview</a>
            <a class="admin-btn-pill" href="${escapeHtml(printPermitPath(token))}" target="_blank" rel="noreferrer">Print A4</a>
            <button class="admin-btn-pill admin-btn-pill-teal" type="button" data-action="download-permit-pdf" data-token="${escapeHtml(token)}">PDF</button>`
            }
          </div>
        </section>
        <form id="permit-editor" class="admin-cert-form">
          <input type="hidden" name="linkToken" value="${escapeHtml(token)}" />
          <input type="hidden" name="Photo" id="permit-photo-data" value="${escapeHtml(values.Photo || "")}" />
          <section class="admin-form-panel">
            <div class="admin-form-panel-head">
              <span class="admin-form-step">0</span>
              <div class="admin-form-panel-head-text">
                <h3 class="admin-form-panel-title">Status &amp; photo</h3>
                <p class="admin-form-panel-desc">Issue status and optional holder photograph for the public preview.</p>
              </div>
            </div>
            <div class="form-grid admin-form-panel-body">
              <label class="form-field" for="permit-status">
                ${permitFieldLabel("Status")}
                ${permitControlWrap(
                  "Status",
                  `<select class="form-control" id="permit-status" name="status">${optionList(PERMIT_STATUS_OPTIONS, data.status || "Issued")}</select>`
                )}
              </label>
              <label class="form-field" for="permit-photo-file">
                ${permitFieldLabel("Holder photo")}
                ${permitControlWrap(
                  "Holder photo",
                  `<input class="form-control" id="permit-photo-file" type="file" accept="image/*" />`
                )}
                <span class="form-field-hint">Optional. Shown as the circular photo on Route Permit Details.</span>
              </label>
            </div>
          </section>
          ${sections}
          <footer class="admin-editor-footer">
            <div class="editor-save-serial">
              <span class="editor-save-serial-label">Public link</span>
              <strong class="editor-save-serial-value">/routepermits/${escapeHtml(token)}</strong>
            </div>
            <div class="admin-editor-footer-actions">
              <button class="admin-btn-pill admin-btn-pill-primary" type="submit">${isCreate ? "Create permit" : "Save changes"}</button>
              ${
                isCreate
                  ? ""
                  : `<button class="admin-btn-pill admin-btn-pill-danger" type="button" data-action="delete-permit" data-delete-token="${escapeHtml(token)}">Delete permit</button>`
              }
            </div>
          </footer>
        </form>
      </div>
    </div>
  `;
}

export function bindPermitPhotoInput() {
  const file = document.getElementById("permit-photo-file");
  const hidden = document.getElementById("permit-photo-data");
  if (!file || !hidden) return;
  file.addEventListener("change", () => {
    const picked = file.files?.[0];
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = () => {
      hidden.value = String(reader.result || "");
    };
    reader.readAsDataURL(picked);
  });
}
