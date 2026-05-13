import type { Env } from "../types";
import { getFacilitiesByBounds } from "../db";
import { explorePage } from "../templates/explore";

export async function handleExplore(_request: Request, _env: Env): Promise<Response> {
  const html = explorePage();
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}

export async function handleMapApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const minLat = parseFloat(url.searchParams.get("minLat") || "0");
  const maxLat = parseFloat(url.searchParams.get("maxLat") || "0");
  const minLng = parseFloat(url.searchParams.get("minLng") || "0");
  const maxLng = parseFloat(url.searchParams.get("maxLng") || "0");

  if (!minLat || !maxLat || !minLng || !maxLng) {
    return new Response(JSON.stringify({ error: "Invalid bounds" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const facilities = await getFacilitiesByBounds(env, {
    minLat,
    maxLat,
    minLng,
    maxLatLng: maxLng,
  }, 2000);

  // Return only essential data for the map
  const data = facilities.map((f) => ({
    id: f.cms_id,
    n: f.name,
    lt: f.latitude,
    lg: f.longitude,
    g: f.grade_letter,
    s: f.grade_score,
    sl: f.slug,
  }));

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
