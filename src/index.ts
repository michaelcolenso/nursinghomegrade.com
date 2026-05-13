import type { Env } from "./types";
import { handleFacility } from "./handlers/facility";
import { handleHome, handleSearch } from "./handlers/home";
import { handleAbout } from "./handlers/about";
import { handleState, handleStatesHub } from "./handlers/state";
import { handleCity } from "./handlers/city";
import { handleExplore, handleMapApi } from "./handlers/map";
import { subscribePage, notFoundPage, errorPage } from "./templates/subscribe";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/") return handleHome(request, env);
    if (path === "/about") return handleAbout(request, env);
    if (path === "/states") return handleStatesHub(request, env);
    if (path === "/search") return handleSearch(request, env);
    if (path === "/explore") return handleExplore(request, env);
    if (path === "/api/map/facilities") return handleMapApi(request, env);

    if (path === "/subscribe" && request.method === "POST") {
      try {
        const form = await request.formData();
        const facilityName = form.get("facility_name")?.toString() ?? "this facility";
        const returnPath = form.get("return_path")?.toString();
        const html = subscribePage(facilityName, returnPath);
        return new Response(html, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      } catch {
        const html = errorPage(
          "Invalid submission",
          "We couldn't process your subscription. Please try again.",
          "If the problem persists, you can search for a facility and try subscribing again.",
        );
        return new Response(html, { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
    }

    if (path === "/sitemap.xml") {
      const sitemap = await env.CACHE.get("sitemap");
      if (sitemap)
        return new Response(sitemap, {
          headers: { "Content-Type": "application/xml" },
        });
      const html = errorPage("Sitemap not found", "The sitemap could not be found. It may still be generating.");
      return new Response(html, { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    if (path === "/robots.txt")
      return new Response("User-agent: *\nAllow: /\nSitemap: https://nursinghomegrade.com/sitemap.xml\n", {
        headers: { "Content-Type": "text/plain" },
      });

    const facilityMatch = path.match(/^\/facility\/([a-z0-9-]+)$/);
    if (facilityMatch?.[1]) return handleFacility(request, env, facilityMatch[1]);

    const cityMatch = path.match(/^\/state\/([a-z-]+)\/([a-z-]+)$/);
    if (cityMatch?.[1] && cityMatch?.[2]) return handleCity(request, env, cityMatch[1], cityMatch[2]);

    const stateMatch = path.match(/^\/state\/([a-z-]+)$/);
    if (stateMatch?.[1]) return handleState(request, env, stateMatch[1]);

    const html = notFoundPage(path);
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Weekly: invalidate cached pages so stats refresh
    await env.CACHE.delete("page:home");
    await env.CACHE.delete("page:states");
    console.log("Scheduled: home and states cache cleared");
  },
} satisfies ExportedHandler<Env>;
