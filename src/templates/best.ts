import { layout, escHtml } from "./layout";

interface FacilityRow {
  cms_id: string;
  name: string;
  city: string;
  state: string;
  rn_hours_per_resident_day: number | null;
  total_deficiencies: number | null;
  grade_score: number;
  grade_letter: string;
  slug: string;
}

/**
 * Score/rating facts computed from the rows this page actually renders, so the
 * intro paragraph is real data rather than boilerplate: the top score, the
 * median score, and how many of the ranked facilities hold an A grade.
 * Returns null when there is nothing to summarise.
 */
function rankingStats(facilities: FacilityRow[]): { top: number; median: number; aCount: number; count: number } | null {
  if (facilities.length === 0) return null;
  const scores = facilities.map((f) => f.grade_score).sort((a, b) => a - b);
  const mid = Math.floor(scores.length / 2);
  const median =
    scores.length % 2 === 1 ? scores[mid]! : Math.round((scores[mid - 1]! + scores[mid]!) / 2);
  return {
    top: scores[scores.length - 1]!,
    median,
    aCount: facilities.filter((f) => f.grade_letter === "A").length,
    count: facilities.length,
  };
}

function renderTable(facilities: FacilityRow[]): string {
  if (facilities.length === 0) {
    return `<p style="color:var(--muted);">No facilities found.</p>`;
  }

  const rows = facilities.map((f, i) => {
    const rnText = f.rn_hours_per_resident_day !== null
      ? f.rn_hours_per_resident_day.toFixed(2)
      : "N/A";
    const defText = f.total_deficiencies !== null
      ? String(f.total_deficiencies)
      : "N/A";

    return `
      <tr style="border-bottom:1px solid var(--rule);">
        <td style="padding:var(--space-s) var(--space-xs);font-weight:800;color:var(--muted);font-size:0.85rem;">${i + 1}</td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:700;">
          <a href="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">${escHtml(f.name)}</a>
        </td>
        <td style="padding:var(--space-s) var(--space-xs);">${escHtml(f.city)}, ${escHtml(f.state)}</td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:800;color:var(--grade-${f.grade_letter});">${escHtml(f.grade_letter)}</td>
        <td style="padding:var(--space-s) var(--space-xs);font-weight:700;">${f.grade_score}</td>
        <td style="padding:var(--space-s) var(--space-xs);">${escHtml(rnText)}</td>
        <td style="padding:var(--space-s) var(--space-xs);">${escHtml(defText)}</td>
      </tr>`;
  }).join("");

  return `
    <div class="table-container">
      <table style="min-width:700px;">
        <thead>
          <tr style="border-bottom:2px solid var(--ink);">
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">#</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Facility</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Location</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Grade</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Score</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">RN Hours</th>
            <th style="text-align:left;padding:var(--space-s) var(--space-xs);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Deficiencies</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function bestPage(facilities: FacilityRow[], stateName?: string): string {
  const scope = stateName ? `Best Nursing Homes in ${escHtml(stateName)}` : "Best Nursing Homes in the United States";
  const description = stateName
    ? `Top-rated nursing homes in ${escHtml(stateName)} ranked by independent NursingHomeGrade scores.`
    : "The 100 highest-rated nursing homes in the U.S., ranked by independent NursingHomeGrade scores based on CMS data.";

  // Real score/rating data from the rows on this page, served in the first
  // paragraph. A rankings page that leads with 'ranked by our composite' and
  // no numbers gives a searcher nothing to act on; the top score, median and
  // A-grade share are the same figures the table below shows.
  const stats = rankingStats(facilities);
  const statsSentence = stats
    ? ` The top-rated facility scores ${stats.top}/100, the median score across the ${stats.count} ranked facilities is ${stats.median}/100, and ${stats.aCount} ${stats.aCount === 1 ? "holds" : "hold"} an A grade.`
    : "";

  const intro = stateName
    ? `The highest-rated nursing facilities in ${escHtml(stateName)}, ranked by NursingHomeGrade Score — a composite of RN staffing, health deficiencies, and CMS quality ratings.${statsSentence}`
    : `The 100 highest-rated nursing homes nationally, ranked by NursingHomeGrade Score.${statsSentence} Our grading weighs RN staffing (35%), deficiency count (30%), CMS quality ratings (20%), and staffing consistency (15%).`;

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": scope,
    "description": description,
    "itemListElement": facilities.map((f, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "MedicalBusiness",
        "name": f.name,
        "url": `https://nursinghomegrade.com/facility/${f.cms_id}-${f.slug}`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": f.city,
          "addressRegion": f.state
        }
      }
    }))
  }];

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Best Facilities</span>
    </nav>

    <h1>${escHtml(scope)}</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      ${escHtml(intro)}
    </p>

    <h2>Rankings</h2>
    ${renderTable(facilities)}

    <div style="margin-top:var(--space-xl);display:flex;gap:var(--space-m);flex-wrap:wrap;">
      <a class="btn" href="/worst${stateName ? `/${stateName.toLowerCase().replace(/\s+/g, "-")}` : ""}">See lowest-rated →</a>
      <a class="btn-secondary" href="/reports/staffing-failures">Staffing failures report →</a>
    </div>

    <div style="background:var(--bg);border:1px solid var(--rule);padding:var(--space-l);margin-top:var(--space-2xl);">
      <h3 style="margin-top:0;">Methodology</h3>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        Rankings are determined by NursingHomeGrade Score, a 0–100 composite that weights RN staffing compliance (35%), health inspection deficiencies (30%), CMS quality ratings (20%), and staffing consistency (15%). Data is sourced from the CMS Provider Data Catalog and updated regularly.
      </p>
      <p style="font-size:0.95rem;color:var(--muted);">
        <a href="/about">Learn more about our methodology →</a>
      </p>
    </div>
  `;

  return layout(
    `${scope} — NursingHomeGrade`,
    description,
    body,
    { canonicalPath: stateName ? `/best/${stateName.toLowerCase().replace(/\s+/g, "-")}` : "/best", jsonLd },
  );
}

export function worstPage(facilities: FacilityRow[], stateName?: string): string {
  const scope = stateName ? "Lowest-Rated Nursing Homes in " + escHtml(stateName) : "Lowest-Rated Nursing Homes in the United States";
  const description = stateName
    ? `The lowest-rated nursing homes in ${escHtml(stateName)}. Review inspection records carefully before choosing a facility.`
    : "The 100 lowest-rated nursing homes nationally. Review inspection records carefully before choosing a facility.";
  const intro = stateName
    ? `Facilities in ${escHtml(stateName)} with the lowest NursingHomeGrade Scores. A low score does not guarantee poor care in all areas — but families should review inspection records, staffing levels, and deficiency details carefully before choosing.`
    : "The 100 lowest-rated nursing homes nationally. These facilities warrant careful review. A low NursingHomeGrade Score does not mean a facility provides poor care in every respect — but it signals that families should examine inspection records, staffing, and deficiency history closely.";

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span style="color:var(--ink);">Lowest-Rated Facilities</span>
    </nav>

    <h1>${escHtml(scope)}</h1>
    <p class="lede" style="max-width:800px;margin-bottom:var(--space-xl);">
      ${escHtml(intro)}
    </p>

    <div style="background:var(--bg);border:2px solid var(--grade-F);padding:var(--space-l);margin-bottom:var(--space-xl);">
      <p style="margin:0;font-weight:700;color:var(--grade-F);">
        ⚠ A low score indicates significant concerns in one or more areas: staffing, inspection violations, or quality measures. Visit each facility page for the full deficiency record and comparison data.
      </p>
    </div>

    <h2>Rankings</h2>
    ${renderTable(facilities)}

    <div style="margin-top:var(--space-xl);display:flex;gap:var(--space-m);flex-wrap:wrap;">
      <a class="btn" href="/best${stateName ? `/${stateName.toLowerCase().replace(/\s+/g, "-")}` : ""}">See highest-rated →</a>
      <a class="btn-secondary" href="/reports/staffing-failures">Staffing failures report →</a>
    </div>

    <div style="background:var(--bg);border:1px solid var(--rule);padding:var(--space-l);margin-top:var(--space-2xl);">
      <h3 style="margin-top:0;">Methodology</h3>
      <p style="font-size:0.95rem;color:var(--muted);margin-bottom:var(--space-s);">
        Rankings are determined by NursingHomeGrade Score, a 0–100 composite that weights RN staffing compliance (35%), health inspection deficiencies (30%), CMS quality ratings (20%), and staffing consistency (15%). Data is sourced from the CMS Provider Data Catalog and updated regularly.
      </p>
      <p style="font-size:0.95rem;color:var(--muted);">
        <a href="/about">Learn more about our methodology →</a>
      </p>
    </div>
  `;

  return layout(
    `${scope} — NursingHomeGrade`,
    description,
    body,
    { canonicalPath: stateName ? `/worst/${stateName.toLowerCase().replace(/\s+/g, "-")}` : "/worst" },
  );
}
