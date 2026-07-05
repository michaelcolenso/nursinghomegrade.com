import type { FacilityPageData, Deficiency, Facility, Trajectory, Operator } from "../types";
import { citySlug, getStateInfo } from "../states";
import { layout, escHtml } from "./layout";
import { renderTrustModule } from "./trust";

// Number of same-city facilities shown as rich cards. The related-links block
// skips these so the same facility isn't linked twice on one page.
const NEARBY_CARD_COUNT = 5;

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
  if (!code) return "#607D8B";
  if (code >= "A" && code <= "F") return "#607D8B";
  if (code >= "G" && code <= "I") return "#b48a3e";
  if (code >= "J" && code <= "L") return "#9e3a3a";
  return "#607D8B";
}

function isUncorrectedDeficiency(d: Deficiency): boolean {
  return d.deficiency_corrected === "Deficient, Provider has no plan of correction"
      || d.deficiency_corrected === "Deficient, Provider has plan of correction";
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

function renderTrajectory(trajectory: Trajectory | null): string {
  if (!trajectory) return "";

  const statusStyles: Record<string, { bg: string; color: string; icon: string }> = {
    improving: { bg: "#e6f4f1", color: "#12805D", icon: "▲" },
    declining: { bg: "#fdecea", color: "#B91C1C", icon: "▼" },
    stable: { bg: "#f0f4f8", color: "#4A6272", icon: "●" },
    volatile: { bg: "#fff8e6", color: "#b48a3e", icon: "◆" },
    insufficient_history: { bg: "#f0f4f8", color: "#4A6272", icon: "○" },
  };

  const style = statusStyles[trajectory.status] ?? { bg: "#f0f4f8", color: "#4A6272", icon: "●" };
  const parts: string[] = [];
  if (trajectory.staffing_change_pct !== null) {
    const sign = trajectory.staffing_change_pct > 0 ? "+" : "";
    parts.push(`Staffing ${sign}${trajectory.staffing_change_pct}%`);
  }
  if (trajectory.deficiency_change_pct !== null) {
    const sign = trajectory.deficiency_change_pct > 0 ? "+" : "";
    parts.push(`Deficiencies ${sign}${trajectory.deficiency_change_pct}%`);
  }

  const detail = parts.length > 0 ? parts.join(" · ") : "Trend data available";

  return `
    <div style="background:${style.bg};border:2px solid ${style.color};padding:var(--space-l);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-m);flex-wrap:wrap;">
      <span style="font-size:1.5rem;font-weight:800;color:${style.color};">${style.icon}</span>
      <div>
        <span style="font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${style.color};font-size:0.9rem;">${trajectory.status.replace("_", " ")}</span>
        <p style="margin:0;color:var(--muted);font-size:0.95rem;">${escHtml(detail)} over tracking period</p>
      </div>
    </div>
  `;
}

function renderAssessment(assessment: string): string {
  if (!assessment) return "";
  return `
    <div class="pull-quote" style="margin:var(--space-xl) 0;">
      <strong>Facility Assessment</strong>
      ${escHtml(assessment)}
    </div>
  `;
}

function renderOperatorLink(operator: Operator | null): string {
  if (!operator) return "";
  return `
    <div style="margin-bottom:var(--space-l);">
      <span style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);">Operator</span>
      <p style="margin:0;"><a href="/operator/${escHtml(operator.slug)}">${escHtml(operator.normalized_name)}</a> · ${operator.facility_count} facilities</p>
    </div>
  `;
}

function renderDeficiencySummary(deficiencies: Deficiency[]): string {
  if (deficiencies.length === 0) return "";
  const harmCount = deficiencies.filter(d => d.scope_severity_code && d.scope_severity_code >= "G" && d.scope_severity_code < "J").length;
  const jeopardyCount = deficiencies.filter(d => d.scope_severity_code && d.scope_severity_code >= "J").length;
  const correctedCount = deficiencies.filter(d => !isUncorrectedDeficiency(d)).length;
  const uncorrectedCount = deficiencies.filter(d => isUncorrectedDeficiency(d)).length;
  const alerts: string[] = [];
  if (jeopardyCount > 0) alerts.push(`<span style="color:var(--grade-F);font-weight:800;">${jeopardyCount} immediate jeopardy</span>`);
  if (harmCount > 0) alerts.push(`<span style="color:var(--grade-D);font-weight:800;">${harmCount} actual harm</span>`);
  const uncorrectedAlert = uncorrectedCount > 0
    ? ` <span style="color:var(--grade-F);font-weight:800;">— ${uncorrectedCount} still outstanding</span>`
    : "";
  const summaryText = alerts.length > 0
    ? `${alerts.join(", ")} issue${(harmCount + jeopardyCount) !== 1 ? "s" : ""} found among ${deficiencies.length} total deficiency${deficiencies.length !== 1 ? "ies" : "y"}. ${correctedCount} corrected.${uncorrectedAlert}`
    : `${deficiencies.length} deficiency${deficiencies.length !== 1 ? "ies" : "y"} found. ${correctedCount} corrected. None involved actual harm.${uncorrectedAlert}`;
  return `<div style="background:var(--bg);border:2px solid var(--ink);padding:var(--space-l);margin-bottom:var(--space-xl);">
    <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.4;">${summaryText}</p>
  </div>`;
}

function renderDeficiencies(deficiencies: Deficiency[]): string {
  if (deficiencies.length === 0) {
    return `<p style="color:var(--muted);margin-bottom:var(--space-l);">No deficiencies reported for this facility.</p>`;
  }

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

      // Sort: uncorrected first, then corrected — surface outstanding issues
      const sorted = [...defs].sort((a, b) => {
        const aUncorrected = isUncorrectedDeficiency(a) ? 0 : 1;
        const bUncorrected = isUncorrectedDeficiency(b) ? 0 : 1;
        return aUncorrected - bUncorrected;
      });

      const items = sorted
        .map((d) => {
          const sevColor = severityColor(d.scope_severity_code);
          const sevLabel = severityLabel(d.scope_severity_code);
          const tag = d.deficiency_tag_number ? `F${d.deficiency_tag_number}` : "";
          const corrected = d.deficiency_corrected ? ` — ${d.deficiency_corrected}` : "";
          const correctionDate = d.correction_date ? `, corrected ${formatDate(d.correction_date)}` : "";
          const statusLabel = isUncorrectedDeficiency(d)
            ? (d.deficiency_corrected === "Deficient, Provider has no plan of correction"
                ? "Status: Outstanding — No Plan"
                : "Status: Outstanding — Plan Filed")
            : "Status: Corrected";

          return `
            <div class="deficiency-item" style="border-left: 8px solid ${sevColor}">
              <div style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-2xs);">
                <span style="display:inline-block;padding:0.15rem 0.5rem;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;background:${sevColor};color:#fff;border-radius:0;">${escHtml(d.scope_severity_code ?? "?")}</span>
                <span style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">${escHtml(sevLabel)}</span>
                ${tag ? `<span style="font-size:0.8rem;color:var(--ink);font-weight:800;">${escHtml(tag)}</span>` : ""}
                <span style="font-size:0.8rem;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:0.05em;margin-left:auto;">${escHtml(statusLabel)}</span>
              </div>
              <p style="font-weight:800;font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;line-height:1.2;margin-bottom:var(--space-2xs);">${escHtml(d.deficiency_description ?? "Unknown deficiency")}</p>
              <p style="font-size:0.95rem;color:var(--muted);margin-bottom:0;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${escHtml(d.deficiency_category ?? "")}${corrected ? escHtml(corrected + correctionDate) : ""}</p>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom:var(--space-xl);">
          <h3 style="margin-bottom:var(--space-s);">${escHtml(cycleLabel)}${escHtml(dateLabel)}</h3>
          <div class="results-list">${items}</div>
        </div>
      `;
    })
    .join("");
}

function renderNearbyFacilities(current: FacilityPageData, nearby: Facility[]): string {
  if (nearby.length === 0) return "";

  const compareIds = [current.cms_id, ...nearby.map((f) => f.cms_id)].slice(0, 5).join(",");
  const cards = nearby
    .map((f) => {
      const rnText =
        f.rn_hours_per_resident_day !== null
          ? `${f.rn_hours_per_resident_day.toFixed(2)} hrs`
          : "Not reported";
      const deficiencyText = f.total_deficiencies !== null ? `${f.total_deficiencies}` : "Not reported";

      return `
        <article class="nearby-card">
          <div class="nearby-grade grade-${f.grade_letter}" aria-label="Grade ${f.grade_letter}">${escHtml(f.grade_letter)}</div>
          <div class="nearby-body">
            <h3 class="nearby-name"><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">${escHtml(f.name)}</a></h3>
            <p class="nearby-meta">${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}</p>
            <div class="nearby-stats" aria-label="Nearby facility quality metrics">
              <span><strong>${f.grade_score}/100</strong> score</span>
              <span><strong>${escHtml(rnText)}</strong> RN staffing</span>
              <span><strong>${escHtml(deficiencyText)}</strong> deficiencies</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="nearby-section" aria-labelledby="nearby-heading">
      <div class="nearby-header">
        <div>
          <h2 id="nearby-heading">Nearby facilities in ${escHtml(current.city)}</h2>
          <p>Compare local nursing homes using the same CMS-backed grading method.</p>
        </div>
        <a class="btn-secondary" href="/compare?ids=${encodeURIComponent(compareIds)}">Compare nearby →</a>
      </div>
      <div class="nearby-grid">
        ${cards}
      </div>
    </section>
  `;
}

function renderRelatedLinks(
  current: FacilityPageData,
  cityFacilities: Facility[],
  stateTopRated: Facility[],
  cardCount = 0,
): string {
  const stateInfo = getStateInfo(current.state);
  const stateSlug = stateInfo?.slug ?? current.state.toLowerCase();
  const stateName = stateInfo?.name ?? current.state;
  const cSlug = citySlug(current.city);

  // Skip the same-city facilities already rendered as cards by renderNearbyFacilities
  // so we don't link the same URLs twice on one page (keeps link count under ~20).
  const extraCityFacilities = cityFacilities.slice(cardCount);

  const cityIds = new Set(cityFacilities.map(f => f.cms_id));
  cityIds.add(current.cms_id);
  const stateFiltered = stateTopRated.filter(f => !cityIds.has(f.cms_id)).slice(0, 4);

  const cityLinks = extraCityFacilities.map(f =>
    `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">${escHtml(f.name)} (Grade ${escHtml(f.grade_letter)})</a></li>`
  ).join("");

  // Cross-city links: include the city in the anchor text so it stays descriptive.
  const stateLinks = stateFiltered.map(f =>
    `<li><a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" style="color:var(--ink);text-decoration:none;font-weight:600;font-size:0.95rem;">${escHtml(f.name)} — ${escHtml(f.city)} (Grade ${escHtml(f.grade_letter)})</a></li>`
  ).join("");

  return `
    <div style="margin-top:var(--space-2xl);padding-top:var(--space-xl);border-top:2px solid var(--ink);">
      <h2>More Facilities</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-l);margin-top:var(--space-m);">
        <div>
          <h3 style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">More in ${escHtml(current.city)}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-xs);">
            ${cityLinks}
            <li><a href="/state/${stateSlug}/${cSlug}" style="color:var(--accent);font-weight:700;">View all ${escHtml(current.city)} facilities →</a></li>
          </ul>
        </div>
        <div>
          <h3 style="font-size:1.1rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-s);">Top Rated in ${escHtml(stateName)}</h3>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:var(--space-xs);">
            ${stateLinks}
            <li><a href="/state/${stateSlug}" style="color:var(--accent);font-weight:700;">View all ${escHtml(stateName)} facilities →</a></li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

export function facilityPage(
  f: FacilityPageData,
  deficiencies: Deficiency[] = [],
  nearby: Facility[] = [],
  stateTopRated: Facility[] = [],
  trajectory: Trajectory | null = null,
  assessment: string = "",
  summary: string = "",
  operator: Operator | null = null,
): string {
  const stateInfo = getStateInfo(f.state);
  const stateSlug = stateInfo?.slug ?? f.state.toLowerCase();
  const statePath = `/state/${stateSlug}`;
  const cityPath = `${statePath}/${citySlug(f.city)}`;
  const rnHours = f.rn_hours_per_resident_day;
  const meetsMinimum = rnHours !== null && rnHours >= 0.55;
  const rnDisplay =
    rnHours !== null
      ? `${rnHours.toFixed(2)} ${meetsMinimum ? "✓ Meets federal minimum" : "✗ Below federal minimum (0.55)"}`
      : "Not reported";

  const qualityStars =
    f.quality_rating !== null
      ? `<span role="img" aria-label="${f.quality_rating} out of 5 stars">${"★".repeat(f.quality_rating)}${"☆".repeat(5 - f.quality_rating)}</span> (${f.quality_rating}/5)`
      : "Not rated";
  const staffingStars =
    f.staffing_rating !== null
      ? `<span role="img" aria-label="${f.staffing_rating} out of 5 stars">${"★".repeat(f.staffing_rating)}${"☆".repeat(5 - f.staffing_rating)}</span> (${f.staffing_rating}/5)`
      : "Not rated";

  const isPoorGrade = f.grade_letter === "D" || f.grade_letter === "F";
  const primaryCta = isPoorGrade
    ? `<a class="btn" href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank">Get help finding alternatives ↗</a>`
    : `<a class="btn" href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank">Compare nearby options ↗</a>`;
  const secondaryCta = isPoorGrade
    ? `<a href="https://www.senioradvisor.com/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Compare nearby ↗</a>`
    : `<a href="https://www.caring.com/local/nursing-homes" rel="nofollow noopener" target="_blank" class="btn-secondary">Get free help ↗</a>`;

  const deficiencySection = `
    <h2 id="inspections">Inspection Deficiencies</h2>
    <p class="lede" style="font-size:1.125rem;margin-bottom:var(--space-l);">
      Health inspections identify violations of federal standards. Severity ranges from no actual harm (A–F) to immediate jeopardy (J–L).
    </p>
    ${renderDeficiencySummary(deficiencies)}
    ${renderDeficiencies(deficiencies)}
  `;

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href="${statePath}">${escHtml(f.state)}</a>
      <span class="breadcrumb-sep">›</span>
      <a href="${cityPath}">${escHtml(f.city)}</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">${escHtml(f.name)}</span>
    </nav>

    <div class="facility-header">
      <div>
        <h1>${escHtml(f.name)}</h1>
        <p style="color:var(--muted);margin-bottom:var(--space-s);font-size:1.1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
          ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)} ${escHtml(f.zip)}
        </p>
        ${renderOperatorLink(operator)}
        <div style="display:flex;gap:var(--space-s);flex-wrap:wrap;margin-bottom:var(--space-m);">
          <button onclick="window.print()" class="btn-secondary" title="Print this report">Print Report</button>
          <button onclick="toggleSave('${escHtml(f.cms_id)}', '${escHtml(f.name.replace(/'/g, "\\'"))}', '${f.grade_letter}', ${f.grade_score})" id="save-${escHtml(f.cms_id)}" class="compare-toggle" aria-pressed="false" title="Add to compare">
            <span class="compare-toggle-box" aria-hidden="true"></span>
            <span class="compare-toggle-label">Compare</span>
          </button>
        </div>
        ${f.latitude && f.longitude ? `
          <div id="facility-map" style="height:200px; width:100%; max-width:400px; border:2px solid var(--ink); margin-bottom:var(--space-m);"></div>
        ` : ""}
      </div>
      <div class="grade-${f.grade_letter} facility-grade-hero" aria-label="Grade ${f.grade_letter}">
        ${escHtml(f.grade_letter)}
      </div>
    </div>

    ${renderTrajectory(trajectory)}
    ${renderAssessment(assessment)}

    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      ${escHtml(f.grade_summary)}
    </p>

    <h2 id="quality">Quality Breakdown</h2>
    <div class="table-container quality-breakdown">
      <table class="quality-table">
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">RN Staffing</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Registered nurse time each resident receives daily. Federal minimum: 0.55 hrs.</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.5rem;text-align:right;color:${meetsMinimum ? "var(--accent-positive)" : "var(--grade-F)"}">
            ${escHtml(rnDisplay)}
          </td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">Health Deficiencies</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Violations found during federal inspections over the last 3 years.</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.5rem;text-align:right;">${f.total_deficiencies ?? "Not reported"}</td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">CMS Ratings</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Overall and Staffing quality ratings from CMS (1-5 stars).</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.25rem;text-align:right;">
            <div style="margin-bottom:var(--space-3xs);">Quality: ${qualityStars}</div>
            <div>Staffing: ${staffingStars}</div>
          </td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">NursingHomeGrade Score</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Source Sans 3',system-ui,sans-serif;font-size:2.5rem;text-align:right;">${f.grade_score}/100</td>
        </tr>
      </table>
    </div>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:var(--space-xl);">Data last updated: ${new Date(f.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

    ${deficiencySection}
    ${renderTrustModule()}
    ${renderNearbyFacilities(f, nearby.slice(0, NEARBY_CARD_COUNT))}

    <div class="cta-box">
      <h3>Need help choosing a facility?</h3>
      <p>Get free guidance from senior living advisors. We may earn a referral fee from comparison services, but never from nursing facilities and never in ways that affect grades.</p>
      ${primaryCta}
      ${secondaryCta}
      <p style="font-size:0.75rem;color:#c8d6e0;margin-top:var(--space-s);opacity:0.8;">↗ Links open independent third-party sites in a new tab.</p>
    </div>

    <div style="margin-top:var(--space-2xl);">
      <h3 style="margin-bottom:var(--space-xs);">Get score alerts for this facility</h3>
      <p style="margin-bottom:var(--space-m);font-size:1rem;color:var(--muted);">We'll email you when ${escHtml(f.name)}'s staffing score changes.</p>
      <form action="/subscribe" method="POST" class="search-bar" style="margin-bottom:0;">
        <input type="hidden" name="cms_id" value="${escHtml(f.cms_id)}">
        <input type="hidden" name="facility_name" value="${escHtml(f.name)}">
        <input type="hidden" name="return_path" value="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">
        <label for="sub-email" class="visually-hidden">Email address</label>
        <input type="email" id="sub-email" name="email" placeholder="your@email.com" required autocomplete="email">
        <button type="submit">Notify me</button>
      </form>
    </div>

    ${renderRelatedLinks(f, nearby, stateTopRated, NEARBY_CARD_COUNT)}
  `;
  const canonicalPath = `/facility/${f.cms_id}-${f.slug}`;
  const extraHead = f.latitude && f.longitude ? `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  ` : "";

  const extraScripts = f.latitude && f.longitude ? `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      (function() {
        const map = L.map('facility-map', { zoomControl: false }).setView([${f.latitude}, ${f.longitude}], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-${f.grade_letter}').trim() || '#607D8B';
        L.circleMarker([${f.latitude}, ${f.longitude}], {
          radius: 8,
          fillColor: color,
          color: '#0B1D33',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);
      })();
    </script>
  ` : "";

  const nursingHomeSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NursingHome",
    "name": f.name,
    "url": `https://nursinghomegrade.com${canonicalPath}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": f.address,
      "addressLocality": f.city,
      "addressRegion": f.state,
      "postalCode": f.zip,
      "addressCountry": "US"
    }
  };

  if (f.latitude !== null && f.longitude !== null) {
    nursingHomeSchema.geo = {
      "@type": "GeoCoordinates",
      "latitude": f.latitude,
      "longitude": f.longitude
    };
  }

  const jsonLd = [
    nursingHomeSchema,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://nursinghomegrade.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": f.state,
          "item": `https://nursinghomegrade.com${statePath}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": f.city,
          "item": `https://nursinghomegrade.com${cityPath}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": f.name,
          "item": `https://nursinghomegrade.com${canonicalPath}`
        }
      ]
    }
  ];

  const title = `${f.name} Nursing Home Report | ${f.city}, ${f.state}`;
  
  const metaIntro = f.grade_score >= 80
    ? `See the full quality report for ${f.name}: ${f.grade_score}/100 grade, staffing levels, deficiency history, and nearby alternatives.`
    : `See the full quality report for ${f.name}: staffing levels, inspection history, deficiency records, and nearby nursing home alternatives.`;
  
  const metaDesc = metaIntro.length > 160 
    ? metaIntro.substring(0, 157) + '...' 
    : metaIntro;

  return layout(
    title,
    metaDesc,
    body,
    {
      canonicalPath,
      ogType: "article",
      extraHead,
      extraScripts,
      jsonLd
    },
  );
}
