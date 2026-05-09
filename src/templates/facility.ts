import type { FacilityPageData, Deficiency } from "../types";
import { layout, escHtml } from "./layout";

function severityLabel(code: string | null): string {
  if (!code) return "Unknown";
  const map: Record<string, string> = {
    A: "No harm — isolated",
    B: "No harm — pattern",
    C: "No harm — widespread",
    D: "Potential harm — isolated",
    E: "Potential harm — pattern",
    F: "Potential harm — widespread",
    G: "Actual harm — isolated",
    H: "Actual harm — pattern",
    I: "Actual harm — widespread",
    J: "Immediate jeopardy — isolated",
    K: "Immediate jeopardy — pattern",
    L: "Immediate jeopardy — widespread",
  };
  return map[code] ?? `Severity ${code}`;
}

function severityColor(code: string | null): string {
  if (!code) return "#78716c";
  if (code >= "A" && code <= "F") return "#78716c";
  if (code >= "G" && code <= "I") return "#b48a3e";
  if (code >= "J" && code <= "L") return "#9e3a3a";
  return "#78716c";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function renderDeficiencies(deficiencies: Deficiency[]): string {
  if (deficiencies.length === 0) {
    return `<p style="color:var(--muted);margin-bottom:2rem;">No detailed deficiency records available for this facility.</p>`;
  }

  // Group by inspection cycle
  const byCycle = new Map<number, Deficiency[]>();
  for (const d of deficiencies) {
    const cycle = d.inspection_cycle ?? 0;
    const list = byCycle.get(cycle) ?? [];
    list.push(d);
    byCycle.set(cycle, list);
  }

  const cycles = Array.from(byCycle.keys()).sort((a, b) => a - b);

  return cycles
    .map((cycle) => {
      const defs = byCycle.get(cycle) ?? [];
      const cycleLabel = cycle === 1 ? "Most recent inspection" : `Inspection cycle ${cycle}`;
      const surveyDate = defs[0]?.survey_date ? formatDate(defs[0].survey_date) : "";
      const dateLabel = surveyDate ? ` (${surveyDate})` : "";

      const items = defs
        .map((d) => {
          const sevColor = severityColor(d.scope_severity_code);
          const sevLabel = severityLabel(d.scope_severity_code);
          const tag = d.deficiency_tag_number ? `F${d.deficiency_tag_number}` : "";
          const corrected = d.deficiency_corrected ? ` — ${d.deficiency_corrected}` : "";
          const correctionDate = d.correction_date ? `, corrected ${formatDate(d.correction_date)}` : "";
          const source = d.complaint_deficiency === "Y" ? "Complaint inspection" : d.standard_deficiency === "Y" ? "Standard inspection" : "";

          return `
            <div style="border-left:3px solid ${sevColor};padding:0.75rem 1rem;margin-bottom:0.75rem;background:#fff;">
              <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.35rem;">
                <span style="display:inline-block;padding:0.15rem 0.5rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;background:${sevColor};color:#fff;border-radius:0;">${escHtml(d.scope_severity_code ?? "?")}</span>
                <span style="font-size:0.8rem;color:var(--muted);">${escHtml(sevLabel)}</span>
                ${tag ? `<span style="font-size:0.8rem;color:var(--muted);font-weight:600;">${escHtml(tag)}</span>` : ""}
                ${source ? `<span style="font-size:0.8rem;color:var(--muted);">${escHtml(source)}</span>` : ""}
              </div>
              <p style="font-weight:600;margin-bottom:0.25rem;line-height:1.4;">${escHtml(d.deficiency_description ?? "Unknown deficiency")}</p>
              <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0;">${escHtml(d.deficiency_category ?? "")}${corrected ? escHtml(corrected + correctionDate) : ""}</p>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom:1.5rem;">
          <h3 style="font-size:1rem;margin-bottom:0.75rem;color:var(--muted);font-weight:600;">${escHtml(cycleLabel)}${escHtml(dateLabel)}</h3>
          ${items}
        </div>
      `;
    })
    .join("");
}

export function facilityPage(f: FacilityPageData, deficiencies: Deficiency[] = []): string {
  const rnHours = f.rn_hours_per_resident_day;
  const meetsMinimum = rnHours !== null && rnHours >= 0.55;
  const rnDisplay =
    rnHours !== null
      ? `${rnHours.toFixed(2)} ${meetsMinimum ? "✓ Meets federal minimum" : "✗ Below federal minimum (0.55)"}`
      : "Not reported";

  const qualityStars =
    f.quality_rating !== null
      ? `${"★".repeat(f.quality_rating)}${"☆".repeat(5 - f.quality_rating)} (${f.quality_rating}/5)`
      : "Not rated";
  const staffingStars =
    f.staffing_rating !== null
      ? `${"★".repeat(f.staffing_rating)}${"☆".repeat(5 - f.staffing_rating)} (${f.staffing_rating}/5)`
      : "Not rated";

  // Contextual CTA based on grade
  const isPoorGrade = f.grade_letter === "D" || f.grade_letter === "F";
  const primaryCta = isPoorGrade
    ? `<a class="btn" href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank">Get help finding alternatives →</a>`
    : `<a class="btn" href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank">Compare nearby options →</a>`;
  const secondaryCta = isPoorGrade
    ? `<a href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Compare nearby →</a>`
    : `<a href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Get free help →</a>`;

  const complaintDeficienciesCycle1 =
    f.complaint_deficiencies_cycle_1 !== null ? String(f.complaint_deficiencies_cycle_1) : "Not reported";

  const deficiencySection = `
    <h2 style="font-size:1.1rem;margin-bottom:1rem;margin-top:2.5rem;">Inspection Deficiencies</h2>
    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1.25rem;">
      Health inspections identify violations of federal standards. Severity ranges from no actual harm (A–F) to immediate jeopardy (J–L).
      <a href="/about" style="font-size:0.9rem;">How we grade →</a>
    </p>
    ${renderDeficiencies(deficiencies)}
  `;

  const body = `
    <nav class="breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      ${escHtml(f.state)}
      <span class="breadcrumb-sep">›</span>
      ${escHtml(f.city)}
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(f.name)}</span>
    </nav>

    <div style="display:flex;align-items:baseline;gap:1rem;margin-bottom:0.5rem;">
      <h1>${escHtml(f.name)}</h1>
      <span class="grade-${f.grade_letter}" style="font-size:3rem;font-weight:800;line-height:1;">${escHtml(f.grade_letter)}</span>
    </div>

    <p style="color:var(--muted);margin-bottom:1.5rem;font-size:0.95rem;">
      ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}
    </p>

    <p style="font-size:1.15rem;line-height:1.6;margin-bottom:2rem;font-family:'Newsreader',Georgia,serif;">
      ${escHtml(f.grade_summary)}
    </p>

    <h2 style="font-size:1.1rem;margin-bottom:1rem;">Quality Breakdown</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:0.6rem 0;">RN Staffing <span style="font-size:0.8rem;color:var(--muted);font-weight:400;">— registered nurse time each resident receives daily. Federal minimum: 0.55 hrs.</span></td>
        <td style="padding:0.6rem 0;font-weight:600;color:${meetsMinimum ? "#2d5a3d" : "#9e3a3a"}">
          ${escHtml(rnDisplay)}
        </td>
      </tr>
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:0.6rem 0;">Health Inspection Deficiencies</td>
        <td style="padding:0.6rem 0;font-weight:600;">${f.total_deficiencies ?? "Not reported"}</td>
      </tr>
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:0.6rem 0;">Complaint-based Deficiencies <span style="font-size:0.8rem;color:var(--muted);font-weight:400;">— violations found during the most recent inspection cycle</span></td>
        <td style="padding:0.6rem 0;font-weight:600;">${complaintDeficienciesCycle1}</td>
      </tr>
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:0.6rem 0;">CMS Quality Rating</td>
        <td style="padding:0.6rem 0;font-weight:600;">${qualityStars}</td>
      </tr>
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:0.6rem 0;">CMS Staffing Rating</td>
        <td style="padding:0.6rem 0;font-weight:600;">${staffingStars}</td>
      </tr>
      <tr>
        <td style="padding:0.6rem 0;">NursingHomeGrade Score</td>
        <td style="padding:0.6rem 0;font-weight:600;">${f.grade_score}/100 (${f.grade_letter})</td>
      </tr>
    </table>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:2rem;">Data last updated: ${new Date(f.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

    ${deficiencySection}

    <div class="cta-box" style="margin-top:2.5rem;">
      <h3 style="margin-bottom:0.5rem;">Need help choosing a facility?</h3>
      <p style="margin-bottom:1rem;color:var(--muted);">Get free, unbiased guidance from senior living advisors. We earn nothing from this referral.</p>
      ${primaryCta}
      ${secondaryCta}
    </div>

    <div style="margin-top:2rem;">
      <h3 style="margin-bottom:0.5rem;">Get score alerts for this facility</h3>
      <p style="margin-bottom:0.75rem;font-size:0.9rem;color:var(--muted);">We'll email you when ${escHtml(f.name)}'s staffing score changes.</p>
      <form action="/subscribe" method="POST" class="search-bar" style="margin-bottom:0;">
        <input type="hidden" name="cms_id" value="${escHtml(f.cms_id)}">
        <input type="hidden" name="facility_name" value="${escHtml(f.name)}">
        <input type="hidden" name="return_path" value="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">
        <input type="email" name="email" placeholder="your@email.com" required style="min-width:200px;">
        <button type="submit" data-loading-text="Subscribing…">Notify me</button>
      </form>
    </div>
  `;
  return layout(
    `${f.name} — NursingHomeGrade ${f.grade_letter} | ${f.city}, ${f.state}`,
    `${f.name} in ${f.city}, ${f.state} earns a grade of ${f.grade_letter} (${f.grade_score}/100). ${f.grade_summary}`,
    body,
  );
}
