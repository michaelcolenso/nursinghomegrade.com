import type { Env } from "../types";
import type { Facility } from "../types";
import { htmlCacheKey } from "../cache";
import { getNationalPctFailing, searchByZipExact, searchNearby, getStatesWithCounts, getTopRatedFacilities } from "../db";
import { homePage, searchResultsPage } from "../templates/home";
import { errorPage } from "../templates/subscribe";
import { HOME_LINK_HEADERS } from "../agent-readiness";

export async function handleHome(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = htmlCacheKey("page:home");
    const cached = await env.CACHE.get(cacheKey);
    const homeHeaders = {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=3600",
      Link: HOME_LINK_HEADERS.join(", "),
    };

    if (cached)
      return new Response(cached, {
        headers: homeHeaders,
      });

    const pctFailing = await getNationalPctFailing(env);
    const topFacilities = await getTopRatedFacilities(env, 8);
    const html = homePage(pctFailing, topFacilities);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });
    return new Response(html, {
      headers: homeHeaders,
    });
  } catch (err) {
    console.error("handleHome error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeZip(env: Env, zip: string): Promise<{ lat: number; lng: number; state: string } | null> {
  const cached = await env.CACHE.get(`zip:latlng:${zip}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{ latitude: string; longitude: string; "state abbreviation": string }>;
    };
    const place = data.places?.[0];
    if (!place) return null;
    const result = {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      state: place["state abbreviation"],
    };
    await env.CACHE.put(`zip:latlng:${zip}`, JSON.stringify(result), {
      expirationTtl: 86400 * 30,
    });
    return result;
  } catch {
    return null;
  }
}

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const zip = (url.searchParams.get("zip") ?? "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) return Response.redirect(new URL("/", request.url).toString(), 302);

  const sort = url.searchParams.get("sort") ?? "grade";
  const minGrade = url.searchParams.get("min_grade") ?? "";

  try {
    let facilities: Array<Facility & { distance?: number }> = [];
    const geo = await geocodeZip(env, zip);

    if (geo) {
      const candidates = await searchNearby(env, geo.state, 200);
      facilities = candidates
        .filter((f): f is Facility & { latitude: number; longitude: number } =>
          f.latitude !== null && f.longitude !== null,
        )
        .map((f) => ({
          ...f,
          distance: haversine(geo.lat, geo.lng, f.latitude, f.longitude),
        }))
        .filter((f) => f.distance <= 25);
      if (facilities.length === 0) {
        facilities = await searchByZipExact(env, zip, 25);
      }
    } else {
      facilities = await searchByZipExact(env, zip, 25);
    }

    if (minGrade) {
      const order = ["A", "B", "C", "D", "F"];
      const minIdx = order.indexOf(minGrade.toUpperCase());
      if (minIdx !== -1) {
        facilities = facilities.filter((f) => order.indexOf(f.grade_letter) <= minIdx);
      }
    }

    if (sort === "distance" && facilities.some((f) => f.distance !== undefined)) {
      facilities.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sort === "name") {
      facilities.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      facilities.sort((a, b) => b.grade_score - a.grade_score);
    }

    facilities = facilities.slice(0, 25);

    let states: Array<{ state: string; count: number }> | undefined;
    if (facilities.length === 0) {
      states = await getStatesWithCounts(env);
    }

    const html = searchResultsPage(zip, facilities, {
      sort,
      minGrade,
      geoState: geo?.state,
      states,
    });
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  } catch (err) {
    console.error("handleSearch error", err);
    const html = errorPage("Service unavailable", "We're experiencing a temporary issue. Please try again in a moment.");
    return new Response(html, { status: 503, headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }
}
