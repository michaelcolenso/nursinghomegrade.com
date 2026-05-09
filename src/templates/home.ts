import type { Facility } from "../types";
import { layout, escHtml } from "./layout";

export function homePage(pctFailing: number): string {
  const body = `
    <h1 class="display">Find honest nursing home grades</h1>
    <p class="lede">
      <strong>${pctFailing}% of U.S. nursing homes</strong> fail the federal staffing minimum.
      We show you which ones — no commissions, no conflicts.
    </p>
    <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1.5rem;">
      Data from CMS Nursing Home Compare. Updated monthly.
    </p>

    <form action="/search" method="GET" class="search-bar">
      <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}">
      <button type="submit" data-loading-text="Searching…">Search</button>
      <button type="button" id="geo-btn" class="geo-btn">Use my location</button>
    </form>

    <blockquote class="pull-quote">
      <strong>Why this site exists:</strong> A Place for Mom earns up to $3,500 per family they refer to a facility —
      paid by the facility. Their incentive is placement, not quality. We take no commissions. Ever.
      <a href="/about" style="font-style:normal;font-weight:600;">Read more →</a>
    </blockquote>
  `;
  return layout(
    "NursingHomeGrade — Honest Nursing Home Ratings",
    `${pctFailing}% of U.S. nursing homes fail the federal staffing minimum. Find unbiased nursing home grades based on CMS data — no commissions.`,
    body,
  );
}

export function searchResultsPage(
  zip: string,
  facilities: Array<Facility & { distance?: number }>,
  options: {
    sort?: string;
    minGrade?: string;
    geoState?: string;
    states?: Array<{ state: string; count: number }>;
  } = {},
): string {
  const { sort = "grade", minGrade = "", states } = options;

  if (facilities.length === 0) {
    const stateList = states
      ?.slice(0, 12)
      .map((s) => `${escHtml(s.state)} (${s.count.toLocaleString()})`)
      .join(", ");

    const body = `
      <div class="results-header">
        <h1 style="margin-bottom:0.5rem;">No facilities found near ${escHtml(zip)}</h1>
        <p style="color:var(--muted);margin-bottom:1.5rem;">We search within 25 miles of the ZIP code. Try another ZIP or check that you entered it correctly.</p>

        <form action="/search" method="GET" class="search-bar" style="max-width:400px;">
          <input type="text" name="zip" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]{5}">
          <button type="submit" class="btn" data-loading-text="Searching…">Search</button>
        </form>

        ${stateList ? `<p style="color:var(--muted);font-size:0.875rem;">We have facilities in ${stateList}.</p>` : ""}
      </div>
      <p style="margin-top:1.5rem;"><a href="/">← Back to home</a></p>
    `;
    return layout(
      `No Results for ${zip} — NursingHomeGrade`,
      `No nursing homes found near ZIP code ${zip}.`,
      body,
    );
  }

  const sortOptions = [
    { value: "grade", label: "Best grade" },
    { value: "distance", label: "Closest" },
    { value: "name", label: "Name A-Z" },
  ];

  const gradeOptions = [
    { value: "", label: "Any grade" },
    { value: "A", label: "A only" },
    { value: "B", label: "B or better" },
    { value: "C", label: "C or better" },
    { value: "D", label: "D or better" },
  ];

  const controls = `
    <form action="/search" method="GET" class="results-controls">
      <input type="hidden" name="zip" value="${escHtml(zip)}">
      <label>
        Sort by
        <select name="sort" onchange="this.form.submit()">
          ${sortOptions.map((o) => `<option value="${o.value}" ${sort === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
      <label>
        Minimum grade
        <select name="min_grade" onchange="this.form.submit()">
          ${gradeOptions.map((o) => `<option value="${o.value}" ${minGrade === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
    </form>
  `;

  const items = facilities
    .map((f) => {
      const gradeClass = `result-item-${f.grade_letter}`;
      const rnText =
        f.rn_hours_per_resident_day !== null
          ? `${f.rn_hours_per_resident_day.toFixed(2)} ${f.rn_hours_per_resident_day >= 0.55 ? '<span style="color:#166534;">✓</span>' : '<span style="color:#b91c1c;">✗</span>'}`
          : "N/A";
      const stars =
        f.overall_rating !== null
          ? `${"★".repeat(f.overall_rating)}${"☆".repeat(5 - f.overall_rating)}`
          : "N/A";

      return `
        <div class="result-item ${gradeClass}">
          <div class="result-main">
            <div class="result-grade">
              <span class="grade-${f.grade_letter} result-grade-letter">${escHtml(f.grade_letter)}</span>
              <span class="result-grade-score">${f.grade_score}/100</span>
            </div>
            <div class="result-info">
              <a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}" class="result-name">${escHtml(f.name)}</a>
              <div class="result-meta">
                ${escHtml(f.address)}, ${escHtml(f.city)}, ${escHtml(f.state)}
                ${f.distance !== undefined ? `<span class="result-distance" style="margin-left:0.5rem;">${f.distance.toFixed(1)} mi</span>` : ""}
              </div>
              <div class="result-stats">
                <span class="result-stat">RN hours: ${rnText}</span>
                <span class="result-stat">Deficiencies: ${f.total_deficiencies ?? "N/A"}</span>
                <span class="result-stat">CMS: ${stars}</span>
              </div>
              <p class="result-summary">${escHtml(f.grade_summary)}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const body = `
    <div class="results-header">
      <div class="results-count">${facilities.length} facility${facilities.length === 1 ? "" : "ies"} near ${escHtml(zip)}</div>
      ${controls}
    </div>
    ${items}
    <p style="margin-top:1.5rem;"><a href="/">← New search</a></p>
  `;

  return layout(
    `Nursing Homes Near ${zip} — NursingHomeGrade`,
    `Nursing home quality grades for facilities near ZIP code ${zip}.`,
    body,
  );
}
