// Offline visual-verification loop for the design overhaul (PLAN §9 step 3).
// Renders every page template with fixture data to out/preview/<name>.html and
// writes the site stylesheet to out/preview/assets/site.css. No D1, no network
// (fonts and map tiles load from the internet if reachable).
//
//   npm run preview:render
//   node docs/design-overhaul/screenshots.cjs file://$PWD/out/preview out/shots/preview
//
// File names match ROUTES in docs/design-overhaul/screenshots.cjs, plus
// facility.html (A, complete), facility-d.html (D, uncorrected + jeopardy) and
// facility-nr.html (NR, withheld).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_CSS, SITE_CSS_HREF } from "../src/styles";
import { homePage } from "../src/templates/home";
import { searchFormPage, searchResultsPage } from "../src/templates/search";
import { statePage, statesHubPage } from "../src/templates/state";
import { cityPage } from "../src/templates/city";
import { operatorPage, operatorsHubPage, operatorsBestPage, operatorsWorstPage } from "../src/templates/operator";
import { bestPage, worstPage } from "../src/templates/best";
import { comparePage } from "../src/templates/compare";
import { explorePage } from "../src/templates/explore";
import { howWeGradePage } from "../src/templates/how-we-grade";
import { methodologyPage } from "../src/templates/methodology";
import { aboutPage } from "../src/templates/about";
import { faqPage } from "../src/templates/faq";
import { staffingFailuresPage } from "../src/templates/reports";
import { notFoundPage } from "../src/templates/subscribe";
import { facilityPage } from "../src/templates/facility";
import type { DataRelease } from "../src/templates/data-sources";
import type { Deficiency, Facility, FacilityPageData, Operator, Trajectory } from "../src/types";

const OUT = process.env.PREVIEW_OUT ?? "out/preview";

const releases: DataRelease[] = [
  { source_key: "provider_info", label: "Provider Information", cms_release_date: "2026-10-08", ingested_at: "2026-10-12T00:00:00Z", source_url: "https://data.cms.gov/provider-data/dataset/4pq5-n9py" },
  { source_key: "health_deficiencies", label: "Health Deficiencies", cms_release_date: "2026-10-08", ingested_at: "2026-10-12T00:00:00Z", source_url: "https://data.cms.gov/provider-data/dataset/r5ix-sfxw" },
];

const baseFacility: FacilityPageData = {
  cms_id: "335001",
  name: "Evergreen Health & Rehab Center",
  address: "123 Main St",
  city: "New York",
  state: "NY",
  zip: "10044",
  latitude: 40.7614,
  longitude: -73.9496,
  overall_rating: 4,
  quality_rating: 4,
  staffing_rating: 3,
  inspection_rating: 4,
  rn_hours_per_resident_day: 0.71,
  total_deficiencies: 2,
  grade_score: 88,
  grade_letter: "A",
  grade_summary: "Strong staffing and a clean recent inspection record.",
  grade_completeness: "complete",
  slug: "evergreen-health-and-rehab-center",
  updated_at: "2026-10-12T00:00:00.000Z",
  complaint_deficiencies_cycle_1: 0,
  phone: "(212) 555-0142",
  ownership_type: "For profit - Corporation",
  certified_beds: 120,
};

function fac(n: number, letter: string, score: number, over: Partial<FacilityPageData> = {}): FacilityPageData {
  const names = ["Riverside Nursing & Rehabilitation", "Pinecrest Care Center", "Harbor View Skilled Nursing", "Maple Grove Health Center", "Lakeshore Senior Living", "Sunrise Care Center"];
  return {
    ...baseFacility,
    cms_id: String(335000 + n),
    name: names[n % names.length] ?? "Care Center",
    slug: `care-center-${n}`,
    grade_letter: letter,
    grade_score: score,
    total_deficiencies: letter === "A" ? 1 : letter === "B" ? 3 : letter === "C" ? 7 : letter === "D" ? 12 : 21,
    rn_hours_per_resident_day: letter === "NR" ? null : Math.max(0.12, score / 140),
    ...over,
  };
}

const list: FacilityPageData[] = [
  fac(1, "A", 88),
  fac(2, "B", 72, { city: "Brooklyn" }),
  fac(3, "C", 57, { city: "Queens" }),
  fac(4, "D", 41, { city: "Bronx" }),
  fac(5, "F", 22, { city: "Yonkers" }),
  fac(6, "NR", -1, { city: "Albany", grade_completeness: "insufficient", rn_hours_per_resident_day: null }),
];

const defs: Deficiency[] = [
  { id: 1, cms_id: "335001", survey_date: "2026-03-02", deficiency_category: "Quality of Care Deficiencies", deficiency_tag_number: "0689", deficiency_description: "Ensure a safe environment and adequate supervision to prevent accidents.", scope_severity_code: "J", deficiency_corrected: "Deficient, Provider has no plan of correction", correction_date: null, inspection_cycle: 1, standard_deficiency: "Y", complaint_deficiency: "N" },
  { id: 2, cms_id: "335001", survey_date: "2026-03-02", deficiency_category: "Infection Control Deficiencies", deficiency_tag_number: "0880", deficiency_description: "Provide and implement an infection prevention and control program.", scope_severity_code: "G", deficiency_corrected: "Deficient, Provider has plan of correction", correction_date: null, inspection_cycle: 1, standard_deficiency: "Y", complaint_deficiency: "Y" },
  { id: 3, cms_id: "335001", survey_date: "2025-04-10", deficiency_category: "Resident Rights Deficiencies", deficiency_tag_number: "0550", deficiency_description: "Honor the resident's right to a dignified existence.", scope_severity_code: "D", deficiency_corrected: "Deficient, Provider has date of correction", correction_date: "2025-05-20", inspection_cycle: 2, standard_deficiency: "Y", complaint_deficiency: "N" },
];

const trajectory: Trajectory = { cms_id: "335001", status: "improving", staffing_change_pct: 12, deficiency_change_pct: -18, grade_change: 6, rn_hours_trend: "up" };

const operator: Operator = {
  id: 1, normalized_name: "evergreen health partners", slug: "evergreen-health-partners", facility_count: 14,
  avg_grade: 71, avg_staffing_score: 66, avg_deficiency_score: 70, avg_penalty_score: null, operator_score: 70, operator_tier: "B",
} as Operator;

const rows = list.filter((f) => f.grade_letter !== "NR").map((f) => ({
  cms_id: f.cms_id, name: f.name, city: f.city, state: f.state, rn_hours_per_resident_day: f.rn_hours_per_resident_day,
  total_deficiencies: f.total_deficiencies, grade_score: f.grade_score, grade_letter: f.grade_letter, slug: f.slug,
}));

const ops: Operator[] = [
  { ...operator, id: 1, normalized_name: "EVERGREEN HEALTH PARTNERS", slug: "evergreen-health-partners", facility_count: 140, operator_score: 78, avg_grade: 76, operator_tier: "Mega" },
  { ...operator, id: 2, normalized_name: "HARBOR CARE GROUP", slug: "harbor-care-group", facility_count: 62, operator_score: 58, avg_grade: 55, operator_tier: "Large" },
  { ...operator, id: 3, normalized_name: "MAPLE SENIOR LIVING", slug: "maple-senior-living", facility_count: 9, operator_score: 31, avg_grade: 33, operator_tier: "Mid" },
] as Operator[];
const hub = { mega: [ops[0] as Operator], large: [ops[1] as Operator], mid: [ops[2] as Operator], small: [] as Operator[], tierCounts: { Mega: 18, Large: 520, Mid: 2163, Small: 4675 } };

const homeStats = {
  avgScore: 61.4,
  totalFacilities: 14712,
  distribution: {
    gradeCounts: { A: 1650, B: 3120, C: 4410, D: 3090, F: 1840, NR: 602 },
    scoreBuckets: [120, 260, 510, 930, 1480, 1960, 2450, 2840, 2380, 1180],
    computedAt: "2026-10-12 00:00:00",
  },
};

const pages: Record<string, string> = {
  home: homePage(62, releases, { stats: homeStats, topRated: list.slice(0, 4) as Facility[] }),
  "home-no-dist": homePage(62, releases, { stats: { ...homeStats, distribution: null }, topRated: [] }),
  search: searchResultsPage("10044", list as Array<Facility & { distance?: number }>, { releases, states: [{ state: "NY", count: 6 }] }),
  "search-empty": searchFormPage(releases),
  state: statePage({
    stateName: "New York", stateSlug: "new-york", facilityCount: 612, totalFacilityCount: 612, pctFailing: 58, nationalPctFailing: 62,
    gradeDistribution: { A: 120, B: 190, C: 160, D: 90, F: 52 },
    cities: [{ city: "New York", count: 48 }, { city: "Brooklyn", count: 31 }, { city: "Buffalo", count: 22 }],
    facilities: rows.slice(0, 5),
  }),
  states: statesHubPage([{ state: "New York", count: 612, slug: "new-york" }, { state: "Ohio", count: 940, slug: "ohio" }, { state: "Texas", count: 1180, slug: "texas" }, { state: "Vermont", count: 34, slug: "vermont" }]),
  city: cityPage({
    cityName: "New York", citySlug: "new-york", stateName: "New York", stateSlug: "new-york", facilityCount: 20, pctFailing: 58, nationalPctFailing: 62,
    gradeDistribution: { A: 3, B: 6, C: 5, D: 3, F: 2, NR: 1 },
    facilities: Array.from({ length: 20 }, (_, i) => list[i % list.length] as Facility).map((f, i) => ({ ...f, cms_id: `3351${i}`, slug: `care-center-${i}` })),
    siblingCities: [{ city: "Brooklyn", count: 31 }, { city: "Buffalo", count: 22 }],
    nearbyOutsideCity: [list[1] as Facility],
  }),
  operator: operatorPage({ operator: ops[0] as Operator, facilities: list.slice(0, 5) as Facility[], gradeDistribution: { A: 30, B: 50, C: 40, D: 15, F: 5 }, statesServed: 12, nationalAvg: { avgGrade: 62, avgRnHours: 0.55, avgDeficiencies: 8, totalFacilities: 14700 }, insightLines: ["Average grade is 14 points above the national average.", "RN staffing meets the repealed benchmark in 61% of its facilities."] }),
  operators: operatorsHubPage(hub),
  "operators-best": operatorsBestPage(hub),
  "operators-worst": operatorsWorstPage(hub),
  best: bestPage(rows),
  worst: worstPage([...rows].reverse()),
  compare: comparePage(),
  explore: explorePage(),
  "how-we-grade": howWeGradePage(),
  methodology: methodologyPage(),
  about: aboutPage(),
  faq: faqPage(),
  "report-staffing": staffingFailuresPage([{ stateName: "Ohio", slug: "ohio", count: 480 }, { stateName: "Texas", slug: "texas", count: 610 }], 1090),
  "not-found": notFoundPage("/this-page-does-not-exist"),
  facility: facilityPage(baseFacility, [defs[2] as Deficiency], [list[1] as Facility, list[2] as Facility], [list[0] as Facility], trajectory, "", "", operator),
  "facility-d": facilityPage(fac(9, "D", 41, { cms_id: "335009", total_deficiencies: 12 }), defs, [list[2] as Facility], [list[0] as Facility, list[1] as Facility], { ...trajectory, status: "declining", grade_change: -9, rn_hours_trend: "down" }, "", "", null),
  "facility-nr": facilityPage(fac(8, "NR", -1, { cms_id: "335008", grade_completeness: "insufficient", rn_hours_per_resident_day: null, quality_rating: null }), [], [], [], null, "", "", null),
};

mkdirSync(join(OUT, "assets"), { recursive: true });
writeFileSync(join(OUT, "assets", "site.css"), SITE_CSS);
for (const [name, html] of Object.entries(pages)) {
  writeFileSync(join(OUT, `${name}.html`), html.replace(SITE_CSS_HREF, "assets/site.css"));
}
console.log(`Rendered ${Object.keys(pages).length} pages to ${OUT}/`);
