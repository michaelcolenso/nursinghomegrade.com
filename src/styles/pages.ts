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

    #map-toggle-btn { margin-top: var(--space-s); }
    #results-map { display: none; width: 100%; height: 400px; margin-bottom: var(--space-l); border: 1px solid var(--line-strong); border-radius: var(--radius-md); }
    .map-active #results-map { display: block; }
    .map-active .results-list { display: none; }

    /* State page */
    .state-layout { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-xl); align-items: start; }
    .state-layout h2 { margin-top: var(--space-l); }
    .state-layout h2:first-child { margin-top: 0; }
    .state-search { position: sticky; top: calc(var(--header-h) + var(--space-m)); }
    .state-search h2 { font-family: var(--font-ui); font-size: 1.25rem; font-weight: 600; margin-bottom: var(--space-xs); }
    .btn-row--center { justify-content: center; }

    /* Operator page */
    .meta-line { margin-bottom: var(--space-s); font-size: 1rem; font-weight: 500; color: var(--slate-600); }
    .operator-score { display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-2xs); min-width: 160px; }
    .eyebrow--inline { display: inline; margin-left: var(--space-2xs); }
    .insights { display: grid; gap: var(--space-s); }
    .insights li { font-family: var(--font-display); font-size: clamp(1.05rem, 2vw, 1.25rem); line-height: 1.4; max-width: none; }

    /* Compare page */
    .compare-container { overflow-x: auto; margin-bottom: var(--space-xl); }
    .compare-table th, .compare-table td { padding: var(--space-s); text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
    .compare-table thead th { border-bottom: 2px solid var(--navy-900); }
    .compare-table tbody th { font-weight: 600; color: var(--slate-600); white-space: nowrap; }
    .compare-sub { margin-top: 2px; font-size: 0.8125rem; font-weight: 500; color: var(--slate-600); }
    .compare-remove { min-height: 44px; padding: var(--space-xs) 0; background: none; border: 0; font-family: var(--font-ui); font-size: 0.9375rem; font-weight: 600; color: var(--alarm); cursor: pointer; }
    .compare-remove:hover { text-decoration: underline; }

    /* Explore map */
    #explore-map { height: calc(100vh - 200px); min-height: 360px; width: 100%; border: 1px solid var(--line-strong); border-radius: var(--radius-md); background: var(--bg); }
    .map-tooltip { font-family: var(--font-ui); padding: 0.25rem; }
    .map-tooltip-grade { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--slate-600); margin-bottom: 0.25rem; }
    .map-tooltip-name { display: block; font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; line-height: 1.2; color: var(--navy-900); text-decoration: none; margin-bottom: 0.5rem; }
    .map-tooltip .btn { color: #fff; }
    .map-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: var(--space-s); margin-top: var(--space-m); }
    .map-legend li { display: flex; align-items: center; gap: 0.5rem; }
    .map-legend-label { font-size: 0.8125rem; font-weight: 600; }
    .map-grade-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--navy-900); display: inline-block; }
    .map-grade-dot--A { background: var(--grade-A-fill); }
    .map-grade-dot--B { background: var(--grade-B-fill); }
    .map-grade-dot--C { background: var(--grade-C-fill); }
    .map-grade-dot--D { background: var(--grade-D-fill); }
    .map-grade-dot--F { background: var(--grade-F-fill); }
    .cluster-icon { background: rgba(11, 29, 51, 0.12); color: var(--navy-900); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; border: 1px solid var(--navy-900); }

    /* Facility */
    .facility-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-l); gap: var(--space-l); padding-bottom: var(--space-m); border-bottom: 1px solid var(--line); }

    /* Deficiency & snapshot */
    .snapshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-s); margin-bottom: var(--space-xl); }
    .snapshot-card { padding: var(--space-m); border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface); box-shadow: var(--shadow-1); }
    .snapshot-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); font-weight: 600; margin-bottom: var(--space-3xs); }
    .snapshot-value { font-size: 1.25rem; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }

    /* Nearby */
    .nearby-section { margin: var(--space-xl) 0; padding-top: var(--space-l); border-top: 1px solid var(--line); }
    .nearby-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-l); margin-bottom: var(--space-m); }
    .nearby-header h2 { margin-top: 0; margin-bottom: var(--space-2xs); }
    .nearby-header p { margin: 0; color: var(--slate-600); font-size: 1rem; }

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
      .state-layout { grid-template-columns: 1fr; gap: var(--space-l); }
      .state-search { position: static; order: 2; }
      .operator-score { align-items: flex-start; }
      .facility-header { flex-direction: column-reverse; gap: var(--space-s); }
        .search-bar { flex-direction: column; }
      .search-bar input { width: 100%; min-width: 0; border-radius: var(--radius-sm); }
      .search-bar button, .search-bar button:not(.geo-btn) { border-radius: var(--radius-sm); margin-top: var(--space-2xs); }
      .search-bar .geo-btn { border-left: 1px solid var(--line-strong); }
      .search-bar:has(.geo-btn) button:not(.geo-btn) { border-radius: var(--radius-sm); }
      .cta-box { padding: var(--space-m); }
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
          .pull-quote a, main > p a, .card a[href="/about"], footer a { display: inline-flex !important; min-height: 44px; align-items: center; }
      .city-result-card { padding: var(--space-m) !important; }
      .city-result-card a:not(.btn) { min-height: 44px; display: flex !important; align-items: center; }
      .city-result-card .grade-badge { width: 72px; }
      .city-zip-form { flex-direction: column; }
      .city-zip-form input, .city-zip-form button { width: 100%; min-height: 44px; }
      .comparison-table { min-width: 560px !important; }
      .leaflet-control-zoom a { width: 44px !important; height: 44px !important; line-height: 44px !important; }
    }
`;
