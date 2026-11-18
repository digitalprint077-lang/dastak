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
      ? `<span class="form-field-hint" id="arms-expiry-hint">Valid for 5 years from the issue date.</span>`
      : "";
  return `
    <label class="form-field${isMultiline ? " form-field-span" : ""}" for="${id}">
      ${fieldLabel(label)}
      ${control}
      ${expiryHint}
    </label>
  `;
}

function daysUntil(iso) {
  const raw = String(iso ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const expiry = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

function formatListDate(iso) {
  const match = String(iso ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function expiryPill(daysLeft) {
  if (daysLeft == null || daysLeft > 60) return "";
  if (daysLeft < 0) return `<span class="cert-expiry-pill cert-expiry-pill-danger">Expired</span>`;
  if (daysLeft <= 30) return `<span class="cert-expiry-pill cert-expiry-pill-warn">${daysLeft}d left</span>`;
  return `<span class="cert-expiry-pill cert-expiry-pill-info">${daysLeft}d left</span>`;
}

function armsRegistryRow(item, index) {
  const holder = String(item.holder || "Untitled license");
  const daysLeft = daysUntil(item.expiryDate);
  const district = String(item.district || "").trim();
  const issueLabel = formatListDate(item.issueDate);
  const status = String(item.status || "Issued");
  const search = [holder, item.licenseNo, item.trackingId, item.district, item.token, status]
    .map((part) => String(part || "").toLowerCase())
    .join(" ");
  return `
    <div
      class="cert-list-item-row"
      data-arms-row
      data-search="${escapeHtml(search)}"
      data-status="${escapeHtml(status)}"
      data-district="${escapeHtml(district)}"
      data-days="${daysLeft == null ? "" : String(daysLeft)}"
      data-order="${index}"
    >
      <a class="cert-list-item" href="/admin/dashboard?view=arms-licenses&token=${encodeURIComponent(item.token)}">
        <span class="cert-list-avatar" aria-hidden="true">${escapeHtml(holder.slice(0, 1).toUpperCase())}</span>
        <span class="cert-list-body">
          <span class="cert-list-top">
            <strong class="cert-list-name">${escapeHtml(holder)}</strong>
            <span class="cert-list-badges">
              ${expiryPill(daysLeft)}
              <span class="cert-badge cert-badge-default">${escapeHtml(status)}</span>
            </span>
          </span>
          <span class="cert-list-reg">${escapeHtml(item.licenseNo || "No license number")}</span>
          <span class="cert-list-meta">
            ${district ? `<span class="cert-list-district">${escapeHtml(district)}</span>` : ""}
            ${issueLabel ? `<span class="cert-list-date">Issued ${escapeHtml(issueLabel)}</span>` : ""}
            <span class="cert-list-id">${escapeHtml(item.trackingId || item.token)}</span>
          </span>
        </span>
        <span class="cert-list-open">Open</span>
      </a>
      <div class="cert-list-row-actions">
        <a class="cert-list-action-btn" href="${publicArmsLicensePath(item.token)}" target="_blank" rel="noreferrer" title="Public preview">Preview</a>
      </div>
    </div>
  `;
}

export function renderArmsLicenseRegistry(items) {
  const list = items || [];
  const districts = [...new Set(list.map((item) => String(item.district || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const districtOptions = districts
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  const statusOptions = ARMS_STATUS_OPTIONS.map(
    (name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
  ).join("");
  const rows = list.map((item, index) => armsRegistryRow(item, index)).join("");

  return `
    <div class="admin-registry-page">
      <section class="admin-list-panel admin-list-panel-full" id="arms-registry-panel">
        <div class="admin-list-panel-head">
          <div>
            <h2 class="admin-list-panel-title"><span class="admin-title-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>Arms licenses</h2>
            <p class="admin-list-panel-count" id="arms-list-count">${list.length} license${list.length === 1 ? "" : "s"}</p>
          </div>
          <button class="btn btn-primary admin-context-cta" type="button" data-action="admin-create-arms-license">+ New license</button>
        </div>
        <div class="admin-registry-toolbar">
          <div class="admin-list-search">
            <input
              id="arms-list-search"
              class="form-control admin-list-search-input"
              type="search"
              placeholder="Search name, license number, or tracking ID…"
              autocomplete="off"
            />
          </div>
          <div class="admin-list-quick-filters" role="group" aria-label="Quick filters">
            <button type="button" class="admin-filter-chip is-active" data-arms-quick="">All</button>
            <button type="button" class="admin-filter-chip" data-arms-quick="issued">Issued</button>
            <button type="button" class="admin-filter-chip" data-arms-quick="pending">Pending</button>
            <button type="button" class="admin-filter-chip" data-arms-quick="expiring">Expiring ≤30d</button>
            <button type="button" class="admin-filter-chip" data-arms-quick="expired">Expired</button>
          </div>
          <div class="admin-list-filters">
            <select id="arms-list-district" class="form-control form-control-sm" aria-label="District filter">
              <option value="">All districts</option>
              ${districtOptions}
            </select>
            <select id="arms-list-status" class="form-control form-control-sm" aria-label="Status filter">
              <option value="">Any status</option>
              ${statusOptions}
            </select>
            <select id="arms-list-sort" class="form-control form-control-sm" aria-label="Sort order">
              <option value="issue-desc">Newest first</option>
              <option value="expiry-asc">Expiry soonest</option>
              <option value="name-asc">Name A–Z</option>
            </select>
          </div>
        </div>
        <div class="cert-list" id="arms-license-list">
          ${
            rows ||
            `<p class="muted admin-empty-copy" data-arms-empty>No arms licenses yet. Create one to issue a public /armslicense link.</p>`
          }
        </div>
        <p class="muted admin-empty-copy" id="arms-list-no-match" hidden>No licenses match these filters.</p>
      </section>
    </div>
  `;
}

export function bindArmsLicenseRegistry() {
  const panel = document.getElementById("arms-registry-panel");
  if (!panel || panel.dataset.bound === "1") return;
  panel.dataset.bound = "1";
  const search = document.getElementById("arms-list-search");
  const district = document.getElementById("arms-list-district");
  const status = document.getElementById("arms-list-status");
  const sort = document.getElementById("arms-list-sort");
  const count = document.getElementById("arms-list-count");
  const noMatch = document.getElementById("arms-list-no-match");
  let quick = "";

  const apply = () => {
    const q = search?.value.trim().toLowerCase() ?? "";
    const districtValue = district?.value ?? "";
    const statusValue = status?.value ?? "";
    const rows = [...panel.querySelectorAll("[data-arms-row]")];
    const visible = [];
    rows.forEach((row) => {
      const daysRaw = row.getAttribute("data-days");
      const days = daysRaw === "" || daysRaw == null ? null : Number(daysRaw);
      const rowStatus = row.getAttribute("data-status") || "";
      let quickOk = true;
      if (quick === "issued") quickOk = rowStatus === "Issued";
      if (quick === "pending") quickOk = rowStatus === "Pending" || rowStatus === "Under Review";
      if (quick === "expiring") quickOk = days != null && days >= 0 && days <= 30;
      if (quick === "expired") quickOk = days != null && days < 0;
      const searchOk = !q || (row.getAttribute("data-search") || "").includes(q);
      const districtOk = !districtValue || row.getAttribute("data-district") === districtValue;
      const statusOk = !statusValue || rowStatus === statusValue;
      const show = quickOk && searchOk && districtOk && statusOk;
      row.hidden = !show;
      if (show) visible.push(row);
    });
    if (sort?.value === "name-asc") {
      visible.sort((a, b) => (a.querySelector(".cert-list-name")?.textContent || "").localeCompare(b.querySelector(".cert-list-name")?.textContent || ""));
    } else if (sort?.value === "expiry-asc") {
      visible.sort((a, b) => Number(a.getAttribute("data-days") || 99999) - Number(b.getAttribute("data-days") || 99999));
    } else {
      visible.sort((a, b) => Number(a.getAttribute("data-order") || 0) - Number(b.getAttribute("data-order") || 0));
    }
    const list = document.getElementById("arms-license-list");
    visible.forEach((row) => list?.appendChild(row));
    if (count) count.textContent = `${visible.length} license${visible.length === 1 ? "" : "s"}`;
    if (noMatch) noMatch.hidden = visible.length > 0 || !rows.length;
  };

  search?.addEventListener("input", apply);
  district?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  sort?.addEventListener("change", apply);
  panel.querySelectorAll("[data-arms-quick]").forEach((chip) => {
    chip.addEventListener("click", () => {
      quick = chip.getAttribute("data-arms-quick") || "";
      panel.querySelectorAll("[data-arms-quick]").forEach((node) => node.classList.toggle("is-active", node === chip));
      apply();
    });
  });
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