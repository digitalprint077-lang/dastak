import {
  PERMIT_FORM_SECTIONS,
  PERMIT_TYPE_OPTIONS,
  PERMIT_DISTRICT_OPTIONS,
  PERMIT_STATUS_OPTIONS,
  PERMIT_DATE_FIELDS,
  PERMIT_MAKER_OPTIONS,
  PERMIT_MAKE_OPTIONS,
  PERMIT_MODEL_OPTIONS,
  PERMIT_LADEN_WEIGHT_OPTIONS,
  PERMIT_CUSTOM_VALUE,
  publicPermitLink,
  publicPermitPath,
  printPermitPath,
} from "./permits.js";

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
      <span class="form-label">${escapeHtml(label)}</span>
      <select class="form-control" id="${id}" name="${name}" data-permit-choice-select>
        <option value=""${selectValue === "" ? " selected" : ""}>Select ${escapeHtml(label.toLowerCase())}</option>
        ${optionList(options, selectValue)}
        <option value="${PERMIT_CUSTOM_VALUE}"${selectValue === PERMIT_CUSTOM_VALUE ? " selected" : ""}>Custom…</option>
      </select>
      <div class="permit-choice-custom-wrap"${customHidden}>
        <input class="form-control" id="${id}-custom" name="${escapeHtml(`${label} custom`)}" type="text" value="${customVal}" placeholder="Enter custom ${escapeHtml(label.toLowerCase())}" autocomplete="off" />
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
      <span class="form-label">${escapeHtml(label)}</span>
      <select class="form-control" id="${id}" name="${name}">
        <option value=""${raw ? "" : " selected"}>Select ${escapeHtml(label.toLowerCase())}</option>
        ${extra}
        ${optionList(options, raw)}
      </select>
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
    control = `<input class="form-control" id="${id}" name="${name}" type="${isDate ? "date" : "text"}" value="${escapeHtml(value)}" autocomplete="off" />`;
  }
  return `
    <label class="form-field${isMultiline ? " form-field-span" : ""}" for="${id}">
      <span class="form-label">${escapeHtml(label)}</span>
      ${control}
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
  const tracking = escapeHtml(values["Tracking ID"] || "—");
  const publicUrl = publicPermitLink(token);
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
                <span class="form-label">Status</span>
                <select class="form-control" id="permit-status" name="status">${optionList(PERMIT_STATUS_OPTIONS, data.status || "Issued")}</select>
              </label>
              <label class="form-field" for="permit-photo-file">
                <span class="form-label">Holder photo</span>
                <input class="form-control" id="permit-photo-file" type="file" accept="image/*" />
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
