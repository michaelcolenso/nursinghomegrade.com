// Shared HTML components (pure functions returning strings). Escape every
// interpolated value with escHtml. Grows through PLAN Phase 2.
import { WORDMARK_SVG_INNER, WORDMARK_SVG_INNER_REVERSED, WORDMARK_VIEWBOX } from "../brand.generated";

/** The NursingHomeGrade.com wordmark as an outlined inline SVG. Size it with CSS height. */
export function wordmark(opts: { reversed?: boolean } = {}): string {
  const inner = opts.reversed ? WORDMARK_SVG_INNER_REVERSED : WORDMARK_SVG_INNER;
  return `<svg class="brand-wordmark" viewBox="${WORDMARK_VIEWBOX}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
