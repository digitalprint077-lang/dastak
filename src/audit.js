const AUDIT_PREFIX = "dastak:audit:";

function loadLog(token) {
  try {
    const raw = localStorage.getItem(`${AUDIT_PREFIX}${token}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLog(token, entries) {
  localStorage.setItem(`${AUDIT_PREFIX}${token}`, JSON.stringify(entries.slice(0, 80)));
}

export function getCertificateAudit(token) {
  return loadLog(token);
}

export function recordCertificateAudit(token, { action, role, summary, changes }) {
  if (!token) return;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    action,
    role: role || "editor",
    summary: summary || action,
    changes: changes || [],
  };
  const log = loadLog(token);
  log.unshift(entry);
  saveLog(token, log);
}

export function diffCertificateValues(before, after) {
  const changes = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach((key) => {
    const a = String(before?.[key] ?? "").trim();
    const b = String(after?.[key] ?? "").trim();
    if (a !== b) changes.push({ field: key, from: a, to: b });
  });
  return changes;
}

export function renderAuditPanelHtml(token, escapeHtml) {
  const entries = getCertificateAudit(token);
  if (!entries.length) {
    return `<p class="audit-empty">No changes recorded yet for this certificate.</p>`;
  }
  const items = entries
    .slice(0, 12)
    .map((e) => {
      const detail =
        e.changes?.length > 0
          ? `<ul class="audit-changes">${e.changes
              .slice(0, 4)
              .map(
                (c) =>
                  `<li><strong>${escapeHtml(c.field)}</strong>: ${escapeHtml(c.from || "—")} → ${escapeHtml(c.to || "—")}</li>`
              )
              .join("")}${e.changes.length > 4 ? `<li>… +${e.changes.length - 4} more</li>` : ""}</ul>`
          : "";
      return `
        <li class="audit-item">
          <div class="audit-item-head">
            <strong>${escapeHtml(e.summary)}</strong>
            <time datetime="${escapeHtml(e.at)}">${escapeHtml(new Date(e.at).toLocaleString())}</time>
          </div>
          <p class="audit-meta">${escapeHtml(e.role)} · ${escapeHtml(e.action)}</p>
          ${detail}
        </li>
      `;
    })
    .join("");
  return `<ul class="audit-list">${items}</ul>`;
}
