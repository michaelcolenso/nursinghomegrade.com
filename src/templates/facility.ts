import type { FacilityPageData, Deficiency, Facility } from "../types";
import { citySlug, getStateInfo } from "../states";
import { layout, escHtml } from "./layout";
import { renderTrustModule } from "./trust";

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
    return `<p style="color:var(--muted);margin-bottom:var(--space-l);">No deficiencies reported for this facility.</p>`;
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
          const statusLabel = d.correction_date ? "Status: Corrected" : "Status: Outstanding";

          return `
            <div class="deficiency-item" style="border-left: 8px solid ${sevColor}">
              <div style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-2xs);">
                <span style="display:inline-block;padding:0.15rem 0.5rem;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;background:${sevColor};color:#fff;border-radius:0;">${escHtml(d.scope_severity_code ?? "?")}</span>
                <span style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);">${escHtml(sevLabel)}</span>
                ${tag ? `<span style="font-size:0.8rem;color:var(--ink);font-weight:800;">${escHtml(tag)}</span>` : ""}
                <span style="font-size:0.8rem;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:0.05em;margin-left:auto;">${escHtml(statusLabel)}</span>
              </div>
              <p style="font-weight:800;font-family:'Newsreader',serif;font-size:1.4rem;line-height:1.2;margin-bottom:var(--space-2xs);">${escHtml(d.deficiency_description ?? "Unknown deficiency")}</p>
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

export function facilityPage(f: FacilityPageData, deficiencies: Deficiency[] = [], nearby: Facility[] = []): string {
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

  const deficiencySection = `
    <h2 id="inspections">Inspection Deficiencies</h2>
    <p class="lede" style="font-size:1.125rem;margin-bottom:var(--space-l);">
      Health inspections identify violations of federal standards. Severity ranges from no actual harm (A–F) to immediate jeopardy (J–L).
    </p>
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
        <div style="display:inline-block; margin-bottom:var(--space-m); padding: 0.5rem; background: var(--bg); border: 1px solid var(--rule); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted);">
          Independent ratings: No payments from facilities
        </div>
        ${f.latitude && f.longitude ? `
          <div id="facility-map" style="height:200px; width:100%; max-width:400px; border:2px solid var(--ink); margin-bottom:var(--space-m);"></div>
        ` : ""}
      </div>
      <div class="grade-${f.grade_letter} facility-grade-hero" aria-label="Grade ${f.grade_letter}">
        ${escHtml(f.grade_letter)}
      </div>
    </div>

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
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Newsreader',serif;font-size:1.5rem;text-align:right;color:${meetsMinimum ? "var(--grade-A)" : "var(--grade-F)"}">
            ${escHtml(rnDisplay)}
          </td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">Health Deficiencies</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Violations found during federal inspections over the last 3 years.</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Newsreader',serif;font-size:1.5rem;text-align:right;">${f.total_deficiencies ?? "Not reported"}</td>
        </tr>
        <tr class="quality-row" style="border-bottom:1px solid var(--rule);">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">CMS Ratings</div>
            <div style="font-size:0.95rem;color:var(--muted);font-weight:400;line-height:1.4;">Overall and Staffing quality ratings from CMS (1-5 stars).</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Newsreader',serif;font-size:1.25rem;text-align:right;">
            <div style="margin-bottom:var(--space-3xs);">Quality: ${qualityStars}</div>
            <div>Staffing: ${staffingStars}</div>
          </td>
        </tr>
        <tr class="quality-row">
          <td class="quality-label-cell" style="padding:var(--space-m) 0;">
            <div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);margin-bottom:var(--space-3xs);">NursingHomeGrade Score</div>
          </td>
          <td class="quality-value-cell" style="padding:var(--space-m) 0;font-weight:700;font-family:'Newsreader',serif;font-size:2.5rem;text-align:right;">${f.grade_score}/100</td>
        </tr>
      </table>
    </div>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:var(--space-xl);">Data last updated: ${new Date(f.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

    ${deficiencySection}
    ${renderTrustModule()}
    ${renderNearbyFacilities(f, nearby)}

    <div class="cta-box">
      <h3>Need help choosing a facility?</h3>
      <p>Get free guidance from senior living advisors. We may earn a referral fee from comparison services, but never from nursing facilities and never in ways that affect grades.</p>
      ${primaryCta}
      ${secondaryCta}
    </div>

    <div style="margin-top:var(--space-2xl);">
      <h3 style="margin-bottom:var(--space-xs);">Get score alerts for this facility</h3>
      <p style="margin-bottom:var(--space-m);font-size:1rem;color:var(--muted);">We'll email you when ${escHtml(f.name)}'s staffing score changes.</p>
      <form action="/subscribe" method="POST" class="search-bar" style="margin-bottom:0;">
        <input type="hidden" name="cms_id" value="${escHtml(f.cms_id)}">
        <input type="hidden" name="facility_name" value="${escHtml(f.name)}">
        <input type="hidden" name="return_path" value="/facility/${escHtml(f.cms_id)}-${escHtml(f.slug)}">
        <label for="sub-email" class="visually-hidden">Email address</label>
        <input type="email" id="sub-email" name="email" placeholder="your@email.com" required>
        <button type="submit">Notify me</button>
      </form>
    </div>
  `;
  const canonicalPath = `/facility/${f.cms_id}-${f.slug}`;
  const extraHead = f.latitude && f.longitude ? `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  ` : "";

  const extraScripts = f.latitude && f.longitude ? `
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      (function() {
        const map = L.map('facility-map', { zoomControl: false, attributionControl: false }).setView([${f.latitude}, ${f.longitude}], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--grade-${f.grade_letter}').trim() || '#78716c';
        L.circleMarker([${f.latitude}, ${f.longitude}], {
          radius: 8,
          fillColor: color,
          color: '#1c1917',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);
      })();
    </script>
  ` : "";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "NursingHome",
      "name": f.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": f.address,
        "addressLocality": f.city,
        "addressRegion": f.state,
        "postalCode": f.zip,
        "addressCountry": "US"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": f.grade_score,
        "bestRating": "100",
        "worstRating": "0",
        "ratingCount": 1
      }
    },
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

  return layout(
    `${f.name} — NursingHomeGrade ${f.grade_letter} | ${f.city}, ${f.state}`,
    `${f.name} in ${f.city}, ${f.state} earns a grade of ${f.grade_letter} (${f.grade_score}/100). ${f.grade_summary}`,
    body,
    {
      canonicalPath,
      extraHead,
      extraScripts,
      jsonLd
    },
  );
}
