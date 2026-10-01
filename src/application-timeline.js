const STEPS = [
  { id: "submitted", en: "Submitted", ur: "جمع" },
  { id: "review", en: "Under review", ur: "زیرِ جائزہ" },
  { id: "exam", en: "Exam scheduled", ur: "معائنہ طے شدہ" },
  { id: "ready", en: "Certificate ready", ur: "سرٹیفکیٹ تیار" },
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

/** Map free-text Application Status to active step index (0–3). */
export function resolveTimelineStep(applicationStatus) {
  const s = String(applicationStatus ?? "").toLowerCase();
  if (!s) return 0;
  if (/ready|download|available|issued|complete|approved|collected/.test(s)) return 3;
  if (/exam|inspection|schedule|fitness test|vehicle test/.test(s)) return 2;
  if (/review|process|pending|verification|scrutin|under/.test(s)) return 1;
  if (/submit|received|registered|filed/.test(s)) return 0;
  if (/reject|cancel|hold/.test(s)) return 1;
  return 2;
}

export function renderApplicationTimeline(applicationStatus, lang = "en") {
  const active = resolveTimelineStep(applicationStatus);
  const items = STEPS.map((step, index) => {
    let state = "upcoming";
    if (index < active) state = "done";
    if (index === active) state = "current";
    const label = lang === "ur" ? step.ur : step.en;
    return `
      <li class="app-step app-step-${state}" aria-current="${index === active ? "step" : "false"}">
        <span class="app-step-marker" aria-hidden="true">${index < active ? "✓" : index + 1}</span>
        <span class="app-step-label">${escapeHtml(label)}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="app-timeline" aria-label="Application progress">
      <h2 class="app-timeline-title">${lang === "ur" ? "درخواست کی پیش رفت" : "Application progress"}</h2>
      <p class="app-timeline-status">${escapeHtml(applicationStatus || "—")}</p>
      <ol class="app-stepper">${items}</ol>
    </section>
  `;
}
