import { TOKENS_CSS } from "./tokens";
import { BASE_CSS } from "./base";
import { LAYOUT_CSS } from "./layout";
import { COMPONENTS_CSS } from "./components";
import { PAGES_CSS } from "./pages";
import { HOME_CSS } from "./home";
import { FACILITY_CSS } from "./facility";
import { PRINT_CSS } from "./print";

/** The full site stylesheet. Order matters (cascade): tokens, base, layout, components, pages, home, facility, print. */
export const SITE_CSS = [TOKENS_CSS, BASE_CSS, LAYOUT_CSS, COMPONENTS_CSS, PAGES_CSS, HOME_CSS, FACILITY_CSS, PRINT_CSS].join("\n");

// Sync FNV-1a (32-bit) over the CSS text. Workers has no sync crypto digest and
// no bundler to hash assets for us; this only needs to change when the CSS does.
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const SITE_CSS_HASH = fnv1a(SITE_CSS);
export const SITE_CSS_HREF = `/assets/site.${SITE_CSS_HASH}.css`;
