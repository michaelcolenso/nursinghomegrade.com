import type { Env } from "../types";
import type { Facility } from "../types";
import { comparePage } from "../templates/compare";

export async function handleCompare(request: Request, env: Env): Promise<Response> {
  const html = comparePage();
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}

const MAX_COMPARE_FACILITIES = 8;

function requestedFacilityIds(request: Request): string[] {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids") ?? "";
  const seen = new Set<string>();
  const validIds: string[] = [];

  for (const id of ids.split(",")) {
    const normalized = id.trim();
    if (!/^[A-Za-z0-9]+$/.test(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    validIds.push(normalized);
    if (validIds.length >= MAX_COMPARE_FACILITIES) break;
  }

  return validIds;
}

export async function handleCompareApi(request: Request, env: Env): Promise<Response> {
  const ids = requestedFacilityIds(request);
  if (ids.length === 0) {
    return Response.json({ error: "No valid facility ids provided" }, { status: 400 });
  }

  const placeholders = ids.map(() => "?").join(",");
  const results = await env.DB.prepare(
    `SELECT cms_id, name, address, city, state, zip, rn_hours_per_resident_day, total_deficiencies, grade_score, grade_letter, grade_summary, slug
     FROM facilities WHERE cms_id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<Facility>();

  const byId = new Map((results.results ?? []).map((facility) => [facility.cms_id, facility]));
  const facilities = ids
    .map((id) => byId.get(id))
    .filter((facility): facility is Facility => facility !== undefined)
    .map((facility) => ({
      cms_id: facility.cms_id,
      name: facility.name,
      address: facility.address,
      city: facility.city,
      state: facility.state,
      zip: facility.zip,
      rn_hours_per_resident_day: facility.rn_hours_per_resident_day,
      total_deficiencies: facility.total_deficiencies,
      grade_score: facility.grade_score,
      grade_letter: facility.grade_letter,
      grade_summary: facility.grade_summary,
      report_path: `/facility/${facility.cms_id}-${facility.slug}`,
    }));

  return Response.json(facilities);
}
