import {
  ARMS_FORM_SECTIONS,
  ARMS_DISTRICT_OPTIONS,
  ARMS_STATUS_OPTIONS,
  ARMS_DATE_FIELDS,
  ARMS_REQUIRED_FIELDS,
  ARMS_PERSON_CATEGORY_OPTIONS,
  publicArmsLicenseLink,
  publicArmsLicensePath,
} from "./arms-licenses.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function previewRow(label, value, html = false) {
  const raw = String(value ?? "").trim();
  const display = html ? value : escapeHtml(raw || "—");
  return `
    <div class="info-row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${display || "—"}</div>
    </div>
  `;
}

function formatPreviewIso(value) {
  const iso = String(value ?? "").trim();
  const ymd = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const dmy = iso.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!dmy) return iso;
  return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
}

function formatPreviewCnic(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 13) return String(value ?? "").trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function licensePhotoImg(src) {
  const url = String(src ?? "").trim();
  if (!url) return `<span class="arms-photo-empty" role="img" aria-label="Applicant photo"></span>`;
  return `<img class="permit-photo arms-photo" src="${escapeHtml(url)}" alt="Applicant photo" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'arms-photo-empty'}))">`;
}

export function renderArmsLicensePreview(mainLayout, { token, status, values }) {
  const restricted = status === "Revoked" || status === "Expired";
  const photo = String(values.Photo ?? "").trim();
  const category = String(values["Person Category"] ?? "").trim();
  const issue = formatPreviewIso(values["Issue Date"]);
  const expiry = formatPreviewIso(values["Expiry Date"]);
  const issueExpiry =
    issue && expiry
      ? `${escapeHtml(issue)} <strong>To</strong> ${escapeHtml(expiry)}`
      : escapeHtml(issue || expiry || "—");

  const body = restricted
    ? `
      <a class="btn btn-success permit-back-btn" href="/">Back</a>
      <div class="permit-preview-main">
        <h2 class="permit-preview-title">Applicant License Details</h2>
        <div class="permit-card arms-license-card">
          <p class="alert">License Status: <strong>${escapeHtml(status)}</strong></p>
          <p class="muted">This arms license is not valid for verification. Contact the issuing authority if you have questions.</p>
        </div>
      </div>
    `
    : `
      <a class="btn btn-success permit-back-btn" href="/">Back</a>
      <div class="permit-preview-main">
        <h2 class="permit-preview-title">Applicant License Details</h2>
        <div class="permit-card arms-license-card">
          <div class="columns-container arms-columns">
            <div class="photo-column arms-photo-column">
              ${licensePhotoImg(photo)}
              ${category ? `<span class="arms-person-badge">${escapeHtml(category)}</span>` : ""}
            </div>
            <div class="column">
              ${previewRow("Name", values.Name)}
              ${previewRow("Father Name", values["Father Name"])}
              ${previewRow("CNIC", formatPreviewCnic(values.CNIC))}
              ${previewRow("Current Address", values["Current Address"])}
              ${previewRow("Permanent Address", values["Permanent Address"])}
            </div>
            <div class="column">
              ${previewRow("License No", values["License No"])}
              ${previewRow("Issue/Expiry", issueExpiry, true)}
              ${previewRow("Weapon No", values["Weapon No"])}
              ${previewRow("Weapon/Bore", values["Weapon Bore"])}
              ${previewRow("Restriction", values.Restriction)}
              ${previewRow("Coverage", values.Coverage)}
              ${previewRow("Cartridges", values.Cartridges)}
            </div>
          </div>
        </div>
      </div>
    `;

  return mainLayout(body, { shellClass: "permit-preview-page" });
}

export function renderArmsLicenseNotFound(mainLayout, slug) {
  return mainLayout(
    `
    <a class="btn btn-success permit-back-btn" href="/">Back</a>
    <div class="permit-preview-main">
      <h2 class="permit-preview-title">Applicant License Details</h2>
      <div class="permit-card">
        <p class="alert">License Status: <strong>Not Found</strong></p>
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

function fieldLabel(label) {
  const req = ARMS_REQUIRED_FIELDS.includes(label)
    ? `<span class="form-label-required" aria-hidden="true">*</span>`
    : "";
  return `<span class="form-label">${escapeHtml(label)}${req}</span>`;
}

function fieldInput(label, value) {
  const id = `arms-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const name = escapeHtml(label);
  const isDate = ARMS_DATE_FIELDS.includes(label);
  const isMultiline = ["Current Address", "Permanent Address", "Restriction", "Coverage"].includes(label);
  let control;
  if (label === "District") {
    control = `<select class="form-control" id="${id}" name="${name}">${optionList(ARMS_DISTRICT_OPTIONS, value || "Peshawar")}</select>`;
  } else if (label === "Person Category") {
    control = `<select class="form-control" id="${id}" name="${name}">${optionList(ARMS_PERSON_CATEGORY_OPTIONS, value || "Private")}</select>`;
  } else if (isMultiline) {
    control = `<textarea class="form-control" id="${id}" name="${name}" rows="3">${escapeHtml(value)}</textarea>`;
  } else if (isDate) {
    control = `<input class="form-control form-control-date" id="${id}" name="${name}" type="text" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false" placeholder="YYYY-MM-DD" />`;
  } else {
    control = `<input class="form-control" id="${id}" name="${name}" type="text" value="${escapeHtml(value)}" autocomplete="off" />`;
  }
  const expiryHint =
    label === "Expiry Date"
      ? `<span class="form-field-hint" id="arms-expiry-hint">Shown on the card as issue date To expiry date. Fills 3 years ahead when left empty.</span>`
      : "";
  return `
    <label class="form-field${isMultiline ? " form-field-span" : ""}" for="${id}">
      ${fieldLabel(label)}
      ${control}
      ${expiryHint}
    </label>
  `;
}

export function renderArmsLicenseRegistry(items) {
  const rows = (items || [])
    .map(
      (item) => `
      <div class="cert-list-item-row">
        <a class="cert-list-item" href="/admin/dashboard?view=arms-licenses&token=${encodeURIComponent(item.token)}">
          <span class="cert-list-avatar">${escapeHtml(String(item.holder || "?").slice(0, 1).toUpperCase())}</span>
          <span class="cert-list-body">
            <strong>${escapeHtml(item.holder || "Untitled license")}</strong>
            <span class="cert-list-meta">${escapeHtml(item.licenseNo || "—")} · Tracking ${escapeHtml(item.trackingId || "—")}</span>
            <span class="cert-list-district">${escapeHtml(item.district || "")} · ${escapeHtml(item.status || "Issued")}</span>
          </span>
        </a>
        <div class="cert-list-row-actions">
          <a class="cert-list-action-btn" href="${publicArmsLicensePath(item.token)}" target="_blank" rel="noreferrer" title="Public preview">Preview</a>
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
            <h2 class="admin-list-panel-title"><span class="admin-title-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>Arms license registry</h2>
            <p class="admin-list-lead">Issue and edit arms licenses. Public verification uses tracking ID or license number plus CNIC.</p>
          </div>
          <button class="btn btn-primary admin-context-cta" type="button" data-action="admin-create-arms-license">+ New license</button>
        </div>
        <div class="cert-list" id="arms-license-list">
          ${
            rows ||
            `<p class="muted admin-empty-copy">No arms licenses yet. Create one to issue a public /armslicense link.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

export function renderArmsLicenseEditor(token, data, isCreate) {
  const values = data.values || {};
  const licenseNo = escapeHtml(values["License No"] || "—");
  const trackingRaw = String(values["Tracking ID"] ?? "").trim();
  const tracking = escapeHtml(trackingRaw || "—");
  const publicUrl = publicArmsLicenseLink(token);
  const sections = ARMS_FORM_SECTIONS.map((section, index) => {
    const fields = section.fields.map((label) => fieldInput(label, values[label] ?? "")).join("");
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
        <a class="admin-back-registry" href="/admin/dashboard?view=arms-licenses">${escapeHtml("←")} Back to registry</a>
        <section class="admin-editor-hero">
          <div class="admin-editor-hero-main">
            <p class="admin-editor-kicker">${isCreate ? "New license" : "Editing license"}</p>
            <h2 class="admin-editor-title">${isCreate ? "New arms license" : escapeHtml(values.Name || "Arms license")}</h2>
            <div class="admin-editor-tags">
              <span class="admin-editor-tag">${licenseNo}</span>
              <span class="admin-editor-tag">${tracking}</span>
            </div>
            ${isCreate ? "" : `<p class="admin-editor-status-detail"><span class="admin-hero-url">${escapeHtml(publicUrl)}</span></p>`}
          </div>
          <div class="admin-action-bar">
            ${
              isCreate
                ? ""
                : `<a class="admin-btn-pill" href="${escapeHtml(publicArmsLicensePath(token))}" target="_blank" rel="noreferrer">Preview</a>`
            }
          </div>
        </section>
        <form id="arms-license-editor" class="admin-cert-form">
          <input type="hidden" name="linkToken" value="${escapeHtml(token)}" />
          <input type="hidden" name="Photo" id="arms-photo-data" value="${escapeHtml(values.Photo || "")}" />
          <section class="admin-form-panel">
            <div class="admin-form-panel-head">
              <span class="admin-form-step">0</span>
              <div class="admin-form-panel-head-text">
                <h3 class="admin-form-panel-title">Status &amp; photo</h3>
                <p class="admin-form-panel-desc">Issue status and optional holder photograph for the public preview.</p>
              </div>
            </div>
            <div class="form-grid admin-form-panel-body">
              <label class="form-field" for="arms-status">
                ${fieldLabel("Status")}
                <select class="form-control" id="arms-status" name="status">${optionList(ARMS_STATUS_OPTIONS, data.status || "Issued")}</select>
              </label>
              <label class="form-field" for="arms-photo-file">
                ${fieldLabel("Holder photo")}
                <input class="form-control" id="arms-photo-file" type="file" accept="image/*" />
                <span class="form-field-hint">Optional. Shown on Arms License Details preview.</span>
              </label>
            </div>
          </section>
          ${sections}
          <footer class="admin-editor-footer">
            <div class="editor-save-serial">
              <span class="editor-save-serial-label">Public link</span>
              <strong class="editor-save-serial-value">/armslicense/${escapeHtml(token)}</strong>
            </div>
            <div class="admin-editor-footer-actions">
              <button class="admin-btn-pill admin-btn-pill-primary" type="submit">${isCreate ? "Create license" : "Save changes"}</button>
              ${
                isCreate
                  ? ""
                  : `<button class="admin-btn-pill admin-btn-pill-danger" type="button" data-action="delete-arms-license" data-delete-token="${escapeHtml(token)}">Delete license</button>`
              }
            </div>
          </footer>
        </form>
      </div>
    </div>
  `;
}

export function bindArmsLicensePhotoInput() {
  const file = document.getElementById("arms-photo-file");
  const hidden = document.getElementById("arms-photo-data");
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