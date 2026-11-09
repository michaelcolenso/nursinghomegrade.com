// Buttons, forms, cards, grade badge, tables, CTA, metrics, breadcrumb.
export const COMPONENTS_CSS = `
    /* Buttons. .btn is the primary (navy) button; modifiers pick the variant. */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 44px;
      padding: 0 1.25rem;
      background: var(--navy-900);
      color: #fff;
      border: 1px solid var(--navy-900);
      border-radius: var(--radius-sm);
      font-family: var(--font-ui);
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.2;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out;
    }
    .btn:visited { color: #fff; }
    .btn:hover { background: var(--navy-800); border-color: var(--navy-800); color: #fff; text-decoration: none; }
    .btn--primary { background: var(--navy-900); border-color: var(--navy-900); color: #fff; }
    .btn--action { background: var(--teal-700); border-color: var(--teal-700); color: #fff; }
    .btn--action:hover { background: var(--teal-800); border-color: var(--teal-800); }
    .btn--secondary, .btn--ghost { background: var(--surface); color: var(--navy-900); border-color: var(--line-strong); }
    .btn--secondary:visited, .btn--ghost:visited { color: var(--navy-900); }
    .btn--secondary:hover, .btn--ghost:hover { background: var(--bg); border-color: var(--navy-900); color: var(--navy-900); }
    .btn--ghost { background: transparent; border-color: transparent; color: var(--teal-700); }
    .btn--sm { padding: 0 0.875rem; font-size: 0.875rem; }
    .btn--ghost:hover { background: var(--teal-50); border-color: transparent; color: var(--teal-800); }

    /* Legacy text-style secondary action, e.g. "View all →" */
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 44px;
      color: var(--teal-700);
      font-family: var(--font-ui);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      background: none;
      border: 0;
      cursor: pointer;
      transition: color 0.15s ease-out;
    }
    .btn-secondary:visited { color: var(--teal-700); }
    .btn-secondary:hover { color: var(--teal-800); text-decoration: underline; text-underline-offset: 3px; }

    .btn-on-dark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 1.25rem;
      background: #fff;
      color: var(--navy-900);
      border: 1px solid #fff;
      border-radius: var(--radius-sm);
      font-family: var(--font-ui);
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s ease-out, color 0.15s ease-out;
    }
    .btn-on-dark:visited { color: var(--navy-900); }
    .btn-on-dark:hover { background: var(--line); border-color: var(--line); color: var(--navy-900); }

    /* Forms */
    .input, .select, .search-bar input, .city-zip-form input {
      min-height: 44px;
      padding: 0 var(--space-xs);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-family: var(--font-ui);
      font-size: 1rem;
      color: var(--navy-900);
      background: var(--surface);
    }
    .select { padding-right: var(--space-xs); font-weight: 500; }
    .input:focus-visible, .select:focus-visible, .search-bar input:focus-visible { outline: 2px solid var(--focus); outline-offset: 0; border-color: var(--focus); }

    /* ZIP search bar: input + attached teal action + secondary geolocate button */
    .search-bar { display: flex; gap: 0; flex-wrap: wrap; max-width: 640px; margin-bottom: var(--space-xl); }
    .search-bar input { flex: 1; min-width: 200px; padding: 0 var(--space-s); border-radius: var(--radius-sm) 0 0 var(--radius-sm); font-size: 1.0625rem; }
    .search-bar button {
      min-height: 44px;
      background: var(--teal-700);
      color: #fff;
      padding: 0 var(--space-m);
      border: 1px solid var(--teal-700);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      font-family: var(--font-ui);
      transition: background 0.15s ease-out;
    }
    .search-bar button:hover { background: var(--teal-800); border-color: var(--teal-800); }
    .search-bar .geo-btn {
      background: var(--surface);
      color: var(--navy-900);
      border: 1px solid var(--line-strong);
      border-left: 0;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      padding: 0 var(--space-s);
    }
    .search-bar .geo-btn:hover { background: var(--bg); border-color: var(--line-strong); }
    .search-bar button:not(.geo-btn) + .geo-btn { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
    .search-bar:has(.geo-btn) button:not(.geo-btn) { border-radius: 0; }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-1);
      transition: box-shadow 0.15s ease-out, border-color 0.15s ease-out;
    }
    .card:hover { box-shadow: var(--shadow-2); }

    /* Compare toggle. Element ids / aria-pressed / .compare-toggle-label are a contract with the layout script. */
    .compare-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 44px;
      padding: 0 0.875rem;
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-family: var(--font-ui);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--navy-900);
      transition: background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out;
    }
    .compare-toggle:hover { border-color: var(--navy-900); }
    .compare-toggle[aria-pressed="true"] { border-color: var(--navy-900); background: var(--navy-900); color: #fff; }
    .compare-toggle-box { width: 16px; height: 16px; border: 2px solid currentColor; border-radius: 3px; display: inline-block; position: relative; flex-shrink: 0; }
    .compare-toggle[aria-pressed="true"] .compare-toggle-box::after { content: '✓'; position: absolute; top: -3px; left: 1px; font-size: 14px; font-weight: 700; }

    /* Grade text colours (AA-safe inks) */
    .grade-A { color: var(--grade-A-ink); }
    .grade-B { color: var(--grade-B-ink); }
    .grade-C { color: var(--grade-C-ink); }
    .grade-D { color: var(--grade-D-ink); }
    .grade-F { color: var(--grade-F-ink); }
    .grade-NR { color: var(--grade-NR-ink); }

    /* Grade badge (legacy square badge; replaced by .chip in Phase 2) */
    .grade-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: var(--radius-md);
      background: var(--surface);
      border: 1px solid var(--line);
    }
    .grade-badge-letter { font-size: 2.5rem; font-weight: 700; line-height: 1; }
    .grade-badge-score { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-600); margin-top: 0.15rem; }

    /* Tables */
    .table-container { position: relative; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: var(--space-l); max-width: 100%; }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }

    /* CTA box (dark) */
    .cta-box { background: var(--navy-900); color: #fff; padding: var(--space-xl); margin: var(--space-xl) 0; border-radius: var(--radius-lg); }
    .cta-box h3 { color: #fff; margin-top: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 700; }
    .cta-box p { color: #D3DEE7; margin-bottom: var(--space-m); }
    .cta-box a { color: #fff; }
    .cta-box .btn { background: #fff; color: var(--navy-900); border-color: #fff; margin-right: var(--space-s); }
    .cta-box .btn:hover { background: var(--line); border-color: var(--line); color: var(--navy-900); }
    .cta-box .btn-secondary { color: #fff; }
    .cta-box :focus-visible { outline-color: #fff; }

    /* Metrics */
    .metric-row { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-s) 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; gap: var(--space-xs); }
    .metric-label { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.06em; color: var(--slate-600); }
    .metric-value { font-size: 1.25rem; font-weight: 700; font-variant-numeric: tabular-nums; }

    /* Breadcrumb */
    .breadcrumb { font-size: 0.875rem; color: var(--slate-600); margin-bottom: var(--space-m); font-weight: 500; }
    .breadcrumb a { border: 0; display: inline-flex; min-height: 44px; min-width: 44px; align-items: center; justify-content: center; color: var(--slate-600); text-decoration: none; }
    .breadcrumb a:visited { color: var(--slate-600); }
    .breadcrumb a:hover { color: var(--teal-700); text-decoration: underline; }
    .breadcrumb-sep { margin: 0 var(--space-3xs); color: var(--line-strong); }

    /* Utilities */
    [hidden] { display: none !important; }
    .muted { color: var(--slate-600); font-weight: 500; }
    .list-plain { list-style: none; padding: 0; margin: 0; }
    .nowrap { white-space: nowrap; }

    /* Meter: ten 10-point segments, decorative (the number is always text) */
    .meter { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; height: 6px; }
    .meter i { background: var(--line); border-radius: 1px; }
    .meter--A i.on { background: var(--grade-A-fill); }
    .meter--B i.on { background: var(--grade-B-fill); }
    .meter--C i.on { background: var(--grade-C-fill); }
    .meter--D i.on { background: var(--grade-D-fill); }
    .meter--F i.on { background: var(--grade-F-fill); }

    /* Score chip */
    .chip {
      display: inline-flex;
      flex-direction: column;
      gap: 8px;
      min-width: 148px;
      padding: 10px 14px 12px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-top: 3px solid var(--grade-NR-fill);
      border-radius: var(--radius-md);
    }
    .chip--A { border-top-color: var(--grade-A-fill); }
    .chip--B { border-top-color: var(--grade-B-fill); }
    .chip--C { border-top-color: var(--grade-C-fill); }
    .chip--D { border-top-color: var(--grade-D-fill); }
    .chip--F { border-top-color: var(--grade-F-fill); }
    .chip-body { display: flex; align-items: center; gap: 12px; }
    .chip-score { display: inline-flex; align-items: baseline; gap: 2px; font-variant-numeric: tabular-nums; }
    .chip-num { font-size: 2.25rem; font-weight: 700; line-height: 1; }
    .chip-max { font-size: 0.75rem; font-weight: 500; color: var(--slate-600); }
    .chip-rule { align-self: stretch; width: 1px; background: var(--line); }
    .chip-grade { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; }
    .chip-letter { font-size: 1.25rem; font-weight: 700; }
    .chip-desc { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    a.chip-desc { text-decoration: underline; text-underline-offset: 2px; }
    a.chip-desc:visited { color: var(--slate-600); }
    .chip-tag { align-self: flex-start; padding: 2px 6px; font-size: 0.6875rem; font-weight: 600; color: var(--grade-C-ink); background: var(--grade-C-tint); border-radius: var(--radius-sm); }
    .chip--sm { min-width: 132px; padding: 8px 12px 10px; gap: 6px; }
    .chip--sm .chip-num { font-size: 1.625rem; }
    .chip--sm .chip-letter { font-size: 1.0625rem; }
    .chip--lg { min-width: 200px; padding: 14px 18px 16px; gap: 10px; }
    .chip--lg .chip-num { font-size: 3.5rem; }
    .chip--lg .chip-letter { font-size: 2rem; }
    .chip--lg .chip-desc { font-size: 0.75rem; }

    /* Inline grade pill for tables */
    .pill { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.875rem; font-weight: 700; background: var(--grade-NR-tint); color: var(--grade-NR-ink); }
    .pill--A { background: var(--grade-A-tint); color: var(--grade-A-ink); }
    .pill--B { background: var(--grade-B-tint); color: var(--grade-B-ink); }
    .pill--C { background: var(--grade-C-tint); color: var(--grade-C-ink); }
    .pill--D { background: var(--grade-D-tint); color: var(--grade-D-ink); }
    .pill--F { background: var(--grade-F-tint); color: var(--grade-F-ink); }

    /* Stars, benchmark marks, stat tiles */
    .stars { white-space: nowrap; }
    .stars-off { color: var(--line-strong); opacity: 0.55; }
    .bench--ok { color: var(--grade-A-ink); font-weight: 700; }
    .bench--low { color: var(--alarm); font-weight: 700; }
    .stat-tile { padding: var(--space-s) var(--space-m); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
    .stat-tile-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .stat-tile-value { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
    .stat-tile-sub { font-size: 0.8125rem; color: var(--slate-600); }

    /* Grade distribution */
    .dist-bar { display: flex; gap: 2px; height: 40px; border-radius: var(--radius-sm); overflow: hidden; background: var(--line); }
    .dist--sm .dist-bar { height: 28px; }
    .dist-seg { display: block; width: var(--pct); min-width: 4px; }
    .dist-seg--A, .dist-dot--A { background: var(--grade-A-fill); }
    .dist-seg--B, .dist-dot--B { background: var(--grade-B-fill); }
    .dist-seg--C, .dist-dot--C { background: var(--grade-C-fill); }
    .dist-seg--D, .dist-dot--D { background: var(--grade-D-fill); }
    .dist-seg--F, .dist-dot--F { background: var(--grade-F-fill); }
    .dist-legend { display: flex; flex-wrap: wrap; gap: var(--space-2xs) var(--space-m); list-style: none; margin: var(--space-s) 0 0; padding: 0; }
    .dist-key { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; }
    .dist-dot { width: 12px; height: 12px; border-radius: 3px; }
    .dist-key-label { font-weight: 600; }
    .dist-key-count { color: var(--slate-600); font-variant-numeric: tabular-nums; }
    .dist-note { margin-top: var(--space-xs); font-size: 0.875rem; color: var(--slate-600); }

    /* Operator score bar */
    .scorebar { display: flex; flex-direction: column; gap: 6px; min-width: 88px; }
    .scorebar-num { font-size: 1.5rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
    .scorebar--lg .scorebar-num { font-size: 2rem; }
    .scorebar--sm .scorebar-num { font-size: 1.125rem; }
    .scorebar-track { display: block; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
    .scorebar-fill { display: block; height: 100%; width: var(--pct); border-radius: 3px; }
    .scorebar--A .scorebar-fill { background: var(--grade-A-fill); }
    .scorebar--B .scorebar-fill { background: var(--grade-B-fill); }
    .scorebar--C .scorebar-fill { background: var(--grade-C-fill); }
    .scorebar--D .scorebar-fill { background: var(--grade-D-fill); }
    .scorebar--F .scorebar-fill { background: var(--grade-F-fill); }

    /* Facility card: the one list item for search, city, state, operator, nearby, top rated */
    .fcard {
      display: grid;
      grid-template-columns: 1fr 172px;
      gap: var(--space-m);
      align-items: start;
      padding: var(--space-m);
      background: var(--surface);
      border: 1px solid var(--line);
      border-left: 4px solid var(--grade-NR-fill);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-1);
      transition: box-shadow 0.15s ease-out;
    }
    .fcard:hover { box-shadow: var(--shadow-2); }
    .fcard--A, .fcard--best { border-left-color: var(--grade-A-fill); }
    .fcard--B { border-left-color: var(--grade-B-fill); }
    .fcard--C { border-left-color: var(--grade-C-fill); }
    .fcard--D { border-left-color: var(--grade-D-fill); }
    .fcard--F, .fcard--worst { border-left-color: var(--grade-F-fill); }
    .fcard-main { min-width: 0; }
    .fcard-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-s); }
    .fcard-title { min-width: 0; }
    .fcard-rank { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--teal-700); margin-bottom: 2px; }
    .fcard-name { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 700; line-height: 1.2; }
    .fcard-name a { color: var(--navy-900); text-decoration: none; border: 0; }
    .fcard-name a:visited { color: var(--navy-900); }
    .fcard-name a:hover { color: var(--teal-700); text-decoration: underline; text-underline-offset: 3px; }
    .fcard-meta { margin: 4px 0 0; font-size: 0.875rem; color: var(--slate-600); }
    .fcard-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--space-xs); margin: var(--space-s) 0 0; }
    .fcard-stat { padding: 8px 12px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-sm); }
    .fcard-stat dt { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .fcard-stat dd { margin: 0; font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .fcard-distance { color: var(--teal-700); }
    .fcard-summary { margin: var(--space-s) 0 0; font-size: 0.9375rem; line-height: 1.5; }
    .fcard-chip { align-self: center; }
    .fcard-chip .chip, .fcard-chip .scorebar { width: 100%; }
    .fcard--tile { grid-template-columns: 1fr; gap: var(--space-s); }
    .fcard--tile .fcard-chip .chip { width: auto; }
    .fcard--tile .fcard-chip { order: -1; align-self: start; }
    @media (max-width: 700px) {
      .fcard--row { grid-template-columns: 1fr; gap: var(--space-s); padding: var(--space-s) var(--space-m); }
      .fcard--row .fcard-chip { order: -1; align-self: start; width: 172px; }
      .fcard-head { flex-direction: column; }
    }

    /* Layout building blocks shared by listing pages */
    .page-header { margin-bottom: var(--space-xl); }
    .page-header h1 { margin-bottom: var(--space-s); }
    .card-list { display: grid; gap: var(--space-s); }
    .link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-s); }
    .link-grid--wide { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-m); }
    .link-card { display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs); padding: var(--space-s) var(--space-m); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-1); color: var(--navy-900); font-weight: 600; text-decoration: none; transition: box-shadow 0.15s ease-out, border-color 0.15s ease-out; }
    .link-card:visited { color: var(--navy-900); }
    .link-card:hover { box-shadow: var(--shadow-2); border-color: var(--teal-700); color: var(--navy-900); }
    .link-card-count { font-size: 0.875rem; font-weight: 500; color: var(--slate-600); }
    .panel { padding: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
    .panel--tint { background: var(--bg); }
    .panel--dark { background: var(--navy-900); color: #fff; border-color: var(--navy-900); border-radius: var(--radius-lg); padding: var(--space-l); }
    .panel--dark h2, .panel--dark h3 { color: #fff; margin-top: 0; }
    .panel--dark p { color: #D3DEE7; }
    .panel--dark :focus-visible { outline-color: #fff; }
    .callout { padding: var(--space-m); border-radius: var(--radius-md); border: 1px solid var(--line-strong); background: var(--surface); }
    .callout--alarm { background: var(--grade-F-tint); border-color: var(--grade-F-ink); }
    .callout--alarm p { margin: 0; font-weight: 600; color: var(--alarm); }
    .toolbar { display: flex; gap: var(--space-m); flex-wrap: wrap; align-items: flex-end; padding: var(--space-s) var(--space-m); margin-bottom: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
    .toolbar label { display: grid; gap: var(--space-3xs); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .toolbar-note { margin: 0 0 0 auto; font-size: 0.9375rem; color: var(--slate-600); }
    .inline-form { display: flex; gap: var(--space-xs); max-width: 500px; }
    .inline-form .input { flex: 1; min-width: 0; }
    .stack-form { display: flex; flex-direction: column; gap: var(--space-xs); }
    .search-bar--narrow { max-width: 420px; }
    .btn-row { display: flex; gap: var(--space-m); flex-wrap: wrap; align-items: center; margin-top: var(--space-l); }
    .section-gap { margin-bottom: var(--space-xl); }
    .center { text-align: center; }

    /* Ranking tables (best/worst, operators) */
    .rank-table { min-width: 680px; }
    .rank-table th { padding: var(--space-xs) var(--space-xs); text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); border-bottom: 2px solid var(--navy-900); }
    .rank-table td { padding: var(--space-xs) var(--space-xs); border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; vertical-align: middle; }
    .rank-table .num { text-align: right; }
    .rank-table .rank-n { width: 3rem; font-weight: 600; color: var(--slate-600); }
    .rank-table .name { font-weight: 600; }
    .rank-table .center { text-align: center; }
    .rank-table--ops { min-width: 640px; }

    /* Related-pages nav (city page) */
    .related { margin-top: var(--space-xl); padding-top: var(--space-l); border-top: 1px solid var(--line); }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-l); }
    .related h3 { margin-top: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--slate-600); }
    .related ul { display: flex; flex-direction: column; gap: var(--space-2xs); }
    .related a { color: var(--navy-900); font-weight: 600; font-size: 0.9375rem; text-decoration: none; }
    .related a:visited { color: var(--navy-900); }
    .related a:hover { color: var(--teal-700); text-decoration: underline; }

    /* Data freshness box */
    .freshness { margin: var(--space-m) 0; padding: var(--space-s) var(--space-m); background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--teal-600); border-radius: var(--radius-md); font-size: 0.875rem; }
    .freshness-head { margin: 0 0 var(--space-xs); }
    .freshness-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-s); }
`;
