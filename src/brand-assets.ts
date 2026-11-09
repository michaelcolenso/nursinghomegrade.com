import {
  FAVICON_SVG,
  FAVICON_32_PNG_BASE64,
  APPLE_TOUCH_180_PNG_BASE64,
  ICON_192_PNG_BASE64,
  ICON_512_PNG_BASE64,
} from "./brand.generated";

const IMMUTABLE = "public, max-age=31536000, immutable";

function bytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const WEB_MANIFEST = JSON.stringify({
  name: "NursingHomeGrade.com",
  short_name: "NursingHomeGrade",
  description: "Independent nursing home grades from official CMS data.",
  start_url: "/",
  display: "browser",
  theme_color: "#0B1D33",
  background_color: "#F7F9FA",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
});

const PNG_ROUTES: Record<string, string> = {
  "/favicon-32.png": FAVICON_32_PNG_BASE64,
  // Browsers still probe /favicon.ico; a 32px PNG is accepted by every modern one.
  "/favicon.ico": FAVICON_32_PNG_BASE64,
  "/apple-touch-icon.png": APPLE_TOUCH_180_PNG_BASE64,
  "/icon-192.png": ICON_192_PNG_BASE64,
  "/icon-512.png": ICON_512_PNG_BASE64,
};

/** Favicon, app-icon and manifest routes. Returns null for any other path. */
export function handleBrandAsset(path: string): Response | null {
  if (path === "/favicon.svg") {
    return new Response(FAVICON_SVG, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": IMMUTABLE },
    });
  }
  const png = PNG_ROUTES[path];
  if (png) {
    return new Response(bytes(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": IMMUTABLE },
    });
  }
  if (path === "/site.webmanifest") {
    return new Response(WEB_MANIFEST, {
      headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" },
    });
  }
  return null;
}
