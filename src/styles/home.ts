// Homepage: hero, national overview card, histogram, grading weights, top-rated tiles, facts band, CTA.
// Generic bands (.section*) and .pillars live here too because the homepage is their first user.
export const HOME_CSS = `
    .site-main--bare { padding: 0; }
    .site-main--bare + footer { margin-top: 0; }

    /* Full-width bands */
    .section { padding-block: var(--space-xl); }
    .section--plain { background: var(--surface); }
    .section--tint { background: var(--teal-50); }
    .section--dark { background: var(--navy-900); color: #fff; }
    .section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-m); flex-wrap: wrap; margin-bottom: var(--space-l); }
    .section-title { margin: 0 0 4px; font-size: clamp(1.5rem, 3vw, 2rem); }
    .section-intro { margin: 0; color: var(--slate-600); max-width: 62ch; }
    .section--dark .section-title { color: #fff; }
    .section--dark .section-intro { color: #D3DEE7; }
    .section--dark a, .section--dark .link-arrow { color: #fff; }
    .section--dark a:visited { color: #fff; }

    /* Pillars (trustPillars + hero) */
    .pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--space-m); }
    .pillar, .hero-pillar { display: flex; gap: 12px; align-items: flex-start; }
    .pillar-icon { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--teal-700); color: #fff; }
    .pillar-text { display: flex; flex-direction: column; gap: 2px; font-size: 0.8125rem; line-height: 1.4; }
    .pillar-text strong { font-size: 0.9375rem; font-weight: 600; }
    .pillar-text span { color: var(--slate-600); }
    .section--dark .pillars { padding-top: var(--space-m); border-top: 1px solid rgba(255, 255, 255, 0.2); }
    .section--dark .pillar-icon { background: var(--teal-600); }
    .section--dark .pillar-text span { color: #D3DEE7; }

    /* Hero */
    .home-hero { padding-block: var(--space-xl) var(--space-l); background: var(--bg); }
    .home-hero-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-xl); align-items: center; }
    .home-hero-grid > * { min-width: 0; }
    .home-tagline { font-family: var(--font-display); font-size: clamp(1.25rem, 2.4vw, 1.6rem); font-weight: 600; line-height: 1.3; margin-bottom: var(--space-s); }
    .hero-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--space-s); margin: var(--space-m) 0; }
    .home-search { margin-top: var(--space-m); max-width: 560px; }
    .field-label { display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 600; }
    .search-field { display: flex; align-items: stretch; background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); overflow: hidden; }
    .search-field:focus-within { outline: 2px solid var(--focus); outline-offset: 2px; }
    .search-field-icon { display: flex; align-items: center; padding: 0 12px; color: var(--slate-600); }
    .search-field input { flex: 1; min-width: 0; min-height: 52px; padding: 0 12px 0 0; border: 0; background: transparent; font-family: var(--font-ui); font-size: 1.0625rem; color: var(--navy-900); }
    .search-field input:focus-visible { outline: none; }
    .search-field .btn { min-height: 52px; border-radius: 0; }
    .home-search .geo-btn { margin-top: var(--space-xs); }
    .hero-links { display: flex; flex-wrap: wrap; gap: 0 var(--space-m); margin: var(--space-s) 0 0; }
    @media (min-width: 960px) { .home-hero-grid { grid-template-columns: 1.1fr 0.9fr; } }

    /* National overview card */
    .overview { padding: var(--space-l); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); min-height: 340px; }
    .overview-label { margin: 0; font-weight: 600; }
    .overview-score { display: flex; align-items: baseline; gap: 6px; margin: 0 0 var(--space-xs); }
    .overview-score-num { font-size: clamp(3.5rem, 8vw, 5rem); font-weight: 700; line-height: 1; color: var(--teal-600); font-variant-numeric: tabular-nums; }
    .overview-score-max { font-size: 1.125rem; color: var(--slate-600); }
    .hist { display: block; width: 100%; height: auto; margin: var(--space-s) 0; }
    .hist-bar--A { fill: var(--grade-A-fill); }
    .hist-bar--B { fill: var(--grade-B-fill); }
    .hist-bar--C { fill: var(--grade-C-fill); }
    .hist-bar--D { fill: var(--grade-D-fill); }
    .hist-bar--F { fill: var(--grade-F-fill); }
    .hist-axis { font: 600 10px var(--font-ui); fill: var(--slate-600); }
    .hist-base { stroke: var(--line-strong); stroke-width: 1; }
    .overview-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-xs); }
    .overview .stat-tile { padding: 10px 12px; }
    .overview .stat-tile-value { font-size: 1.5rem; }
    .overview-note, .overview-asof { margin: var(--space-xs) 0 0; font-size: 0.8125rem; color: var(--slate-600); }
    .overview-asof { margin-top: 2px; }

    /* Staffing evidence callout */
    .home-alert { padding-block: var(--space-m); }
    .alert-card { display: flex; gap: var(--space-m); align-items: center; padding: var(--space-m); background: var(--grade-F-tint); border: 1px solid var(--grade-F-ink); border-left-width: 6px; border-radius: var(--radius-md); }
    .alert-num { margin: 0; font-size: clamp(2.5rem, 6vw, 3.5rem); font-weight: 700; line-height: 1; color: var(--alarm); font-variant-numeric: tabular-nums; }
    .alert-text { margin: 0 0 4px; max-width: 70ch; }
    .alert-card .repeal-disclosure { color: var(--navy-900); }

    /* How we grade */
    .weights { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0; }
    .weight { padding: var(--space-s) var(--space-m); text-align: center; border-left: 1px solid var(--line); }
    .weight:first-child { border-left: 0; }
    .weight-icon { display: block; color: var(--teal-700); }
    .weight-icon .icon { margin: 0 auto; }
    .weight-pct { display: block; margin-top: 6px; font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .weight-label { margin: 2px 0 6px; font-size: 1rem; }
    .weight-text { margin: 0 auto; max-width: 28ch; font-size: 0.875rem; color: var(--slate-600); }
    .weights-note { margin-top: var(--space-m); font-size: 0.9375rem; color: var(--slate-600); }

    /* Top rated */
    /* position: relative contains the .visually-hidden (absolute) spans inside chips, so they cannot widen the page past the scroller */
    .tile-scroller { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: var(--space-s); }
    .tile-scroller .fcard-stats { grid-template-columns: 1fr 1fr; gap: var(--space-2xs); }
    .tile-scroller .fcard-stat { min-width: 0; padding: 6px 8px; }
    .tile-scroller .fcard-stat dd { font-size: 0.9375rem; }
    .tile-scroller .stars { font-size: 0.8125rem; }

    /* Facts band */
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-m); margin-bottom: var(--space-l); }
    .fact-value { display: block; font-size: 2rem; font-weight: 700; line-height: 1.2; color: #fff; font-variant-numeric: tabular-nums; }
    .fact-label { display: block; font-size: 0.9375rem; color: #D3DEE7; }
    .facts-link { margin: var(--space-m) 0 0; }

    /* CTA + why */
    .cta-panel { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-m); align-items: center; padding: var(--space-l); background: var(--teal-50); border-radius: var(--radius-lg); }
    .cta-icon { color: var(--teal-700); }
    .cta-copy p { margin: 0; max-width: 56ch; }
    .cta-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .home-why { padding-block: var(--space-l) var(--space-xl); background: var(--surface); }
    .home-why .pull-quote { margin: 0; }

    @media (max-width: 700px) {
      .home-hero { padding-top: var(--space-l); }
      .overview { padding: var(--space-m); }
      .alert-card { flex-direction: column; align-items: flex-start; gap: var(--space-xs); }
      .weight { border-left: 0; border-top: 1px solid var(--line); text-align: left; display: grid; grid-template-columns: auto 1fr; column-gap: var(--space-s); align-items: center; }
      .weight:first-child { border-top: 0; }
      .weight-icon { grid-row: 1 / span 3; }
      .weight-pct, .weight-label, .weight-text { margin: 0; text-align: left; }
      .weight-text { max-width: none; }
      .tile-scroller { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: var(--space-xs); }
      .tile-scroller .fcard { flex: 0 0 82%; scroll-snap-align: start; }
      .cta-panel { grid-template-columns: 1fr; padding: var(--space-m); }
    }
`;
