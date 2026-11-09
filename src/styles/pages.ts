// Page-specific leftovers: search results, facility, snapshot/deficiency, nearby, responsive.
// These shrink as pages move to the component library (PLAN Phases 2–5).
export const PAGES_CSS = `
    /* Search results */
    .results-header { display: grid; gap: var(--space-s); margin-bottom: var(--space-xl); padding-bottom: var(--space-m); border-bottom: 1px solid var(--line); }
    .results-kicker { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--teal-700); font-weight: 600; }
    .results-count { font-size: clamp(2.25rem, 6vw, 3.5rem); font-weight: 700; color: var(--navy-900); line-height: 1; font-variant-numeric: tabular-nums; }
    .results-intro { font-size: 1.125rem; line-height: 1.5; max-width: 62ch; }
    .results-controls {
      display: flex;
      gap: var(--space-m);
      flex-wrap: wrap;
      align-items: flex-end;
      padding: var(--space-s) var(--space-m);
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
    }
    .results-controls label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); display: grid; gap: var(--space-3xs); }
    .results-controls select {
      min-height: 44px;
      padding: 0 var(--space-xs);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-size: 1rem;
      background: var(--surface);
      color: var(--navy-900);
      font-family: var(--font-ui);
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
    }
    .results-list { display: grid; gap: var(--space-s); }
    .result-item {
      border: 1px solid var(--line);
      border-left: 4px solid var(--grade-NR-fill);
      border-radius: var(--radius-md);
      padding: var(--space-m);
      background: var(--surface);
      box-shadow: var(--shadow-1);
      transition: box-shadow 0.15s ease-out;
      display: grid;
    }
    .result-item:hover { box-shadow: var(--shadow-2); }
    .result-item-A { border-left-color: var(--grade-A-fill); }
    .result-item-B { border-left-color: var(--grade-B-fill); }
    .result-item-C { border-left-color: var(--grade-C-fill); }
    .result-item-D { border-left-color: var(--grade-D-fill); }
    .result-item-F { border-left-color: var(--grade-F-fill); }
    .result-main { display: grid; grid-template-columns: 96px 1fr; gap: var(--space-l); align-items: start; }
    .result-grade { text-align: center; }
    .result-grade-letter { font-size: 4rem; font-weight: 700; line-height: 0.9; display: block; margin-bottom: var(--space-2xs); }
    .result-grade-score { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--slate-600); font-variant-numeric: tabular-nums; }
    .result-rank { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--teal-700); display: block; margin-bottom: var(--space-2xs); }
    .result-name { font-family: var(--font-display); font-size: 1.625rem; font-weight: 700; color: var(--navy-900); text-decoration: none; line-height: 1.15; margin-bottom: var(--space-3xs); display: block; }
    .result-name:visited { color: var(--navy-900); }
    .result-name:hover { color: var(--teal-700); }
    .result-meta { font-size: 0.875rem; font-weight: 500; color: var(--slate-600); margin-bottom: var(--space-s); }
    .result-distance { font-weight: 600; color: var(--teal-700); font-size: 0.875rem; }
    .result-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-xs); margin-bottom: var(--space-s); }
    .result-stat { padding: var(--space-xs) var(--space-s); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-sm); }
    .result-stat-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); display: block; margin-bottom: var(--space-3xs); }
    .result-stat-value { font-size: 1.125rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .result-summary { font-size: 1rem; line-height: 1.5; color: var(--navy-900); }

    /* Facility */
    .facility-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-l); gap: var(--space-l); padding-bottom: var(--space-m); border-bottom: 1px solid var(--line); }
    .facility-grade-hero { font-size: clamp(5rem, 14vw, 8rem); line-height: 0.85; font-weight: 700; letter-spacing: -0.02em; }

    /* Deficiency & snapshot */
    .snapshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-s); margin-bottom: var(--space-xl); }
    .snapshot-card { padding: var(--space-m); border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface); box-shadow: var(--shadow-1); }
    .snapshot-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); font-weight: 600; margin-bottom: var(--space-3xs); }
    .snapshot-value { font-size: 1.25rem; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
    .deficiency-item { padding: var(--space-m); margin-bottom: var(--space-s); border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface); }

    /* Nearby */
    .nearby-section { margin: var(--space-xl) 0; padding-top: var(--space-l); border-top: 1px solid var(--line); }
    .nearby-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-l); margin-bottom: var(--space-m); }
    .nearby-header h2 { margin-top: 0; margin-bottom: var(--space-2xs); }
    .nearby-header p { margin: 0; color: var(--slate-600); font-size: 1rem; }
    .nearby-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-s); }
    .nearby-card { display: grid; grid-template-columns: auto 1fr; gap: var(--space-s); padding: var(--space-m); border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface); box-shadow: var(--shadow-1); }
    .nearby-grade { font-size: 2.5rem; font-weight: 700; line-height: 0.95; min-width: 2.25rem; }
    .nearby-name { font-size: 1.125rem; line-height: 1.2; margin-top: 0; margin-bottom: var(--space-2xs); }
    .nearby-name a { border: 0; }
    .nearby-meta { margin-bottom: var(--space-s); color: var(--slate-600); font-size: 0.875rem; font-weight: 500; }
    .nearby-stats { display: flex; flex-wrap: wrap; gap: var(--space-2xs); color: var(--slate-600); font-size: 0.8125rem; }
    .nearby-stats span { padding: 0.2rem 0.5rem; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg); }
    .nearby-stats strong { color: var(--navy-900); font-size: 0.9375rem; font-variant-numeric: tabular-nums; }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    @media (max-width: 768px) {
      :root { --space-page: var(--space-m); }
      main.container { padding-top: var(--space-l) !important; }
      .facility-header { flex-direction: column-reverse; gap: var(--space-s); }
      .facility-grade-hero { font-size: 5rem; }
      .search-bar { flex-direction: column; }
      .search-bar input { width: 100%; min-width: 0; border-radius: var(--radius-sm); }
      .search-bar button, .search-bar button:not(.geo-btn) { border-radius: var(--radius-sm); margin-top: var(--space-2xs); }
      .search-bar .geo-btn { border-left: 1px solid var(--line-strong); }
      .search-bar:has(.geo-btn) button:not(.geo-btn) { border-radius: var(--radius-sm); }
      .cta-box { padding: var(--space-m); }
      .results-controls { gap: var(--space-s); padding: var(--space-s); }
      .results-controls label { width: 100%; }
      .results-controls select { width: 100%; }
      .result-item { padding: var(--space-s) var(--space-m); }
      .result-main { grid-template-columns: 1fr; gap: var(--space-s); }
      .result-grade { text-align: left; display: flex; align-items: baseline; gap: var(--space-s); }
      .result-grade-letter { font-size: 3.5rem; margin-bottom: 0; }
      .result-rank { margin-bottom: 0; }
      .result-info > div:first-child { flex-direction: column; gap: var(--space-s); }
      .result-info button { min-height: 44px; padding: 0.55rem 0.8rem !important; align-self: flex-start; }
      .quality-breakdown { overflow-x: visible; }
      .quality-table { min-width: 0; width: 100%; }
      .quality-table tbody, .quality-table tr, .quality-table td { display: block; width: 100%; }
      .quality-row { padding: var(--space-m) 0; }
      .quality-table td { padding: 0 !important; }
      .quality-label-cell { margin-bottom: var(--space-xs); }
      .quality-value-cell { text-align: left !important; font-size: 1.35rem !important; line-height: 1.25; overflow-wrap: anywhere; }
      .quality-value-cell div { margin-bottom: var(--space-3xs); }
      .nearby-header { display: block; }
      .nearby-header .btn-secondary { margin-top: var(--space-s); }
      .nearby-grid { grid-template-columns: 1fr; }
      .nearby-card { grid-template-columns: 1fr; gap: var(--space-s); }
      .pull-quote a, main > p a, .card a[href="/about"], footer a { display: inline-flex !important; min-height: 44px; align-items: center; }
      .city-result-card { padding: var(--space-m) !important; }
      .city-result-grid { grid-template-columns: 1fr !important; gap: var(--space-m) !important; }
      .city-result-metrics { flex-wrap: wrap; gap: var(--space-m) !important; }
      .city-result-card a:not(.btn) { min-height: 44px; display: flex !important; align-items: center; }
      .city-result-card .grade-badge { width: 72px; }
      .city-zip-cta { padding: var(--space-l) var(--space-m) !important; text-align: left !important; }
      .city-zip-form { flex-direction: column; }
      .city-zip-form input, .city-zip-form button { width: 100%; min-height: 44px; }
      .comparison-table { min-width: 560px !important; }
      .leaflet-control-zoom a { width: 44px !important; height: 44px !important; line-height: 44px !important; }
    }
`;
