// Facility page: header, sticky section nav, summary card, ratings table, deficiency cards,
// staffing bars, data tables, related links. Print rules for this page live in print.ts.
export const FACILITY_CSS = `
    .print-only { display: none; }

    /* Header: title + address, score chip, actions. Chip sits right on desktop, under the title on mobile. */
    .fac-head { display: grid; grid-template-columns: 1fr auto; grid-template-areas: "title chip" "actions chip"; gap: var(--space-s) var(--space-l); align-items: start; margin-bottom: var(--space-m); }
    .fac-title { grid-area: title; min-width: 0; }
    .fac-head-chip { grid-area: chip; }
    .fac-actions { grid-area: actions; display: flex; flex-wrap: wrap; gap: var(--space-xs); }
    .fac-title h1 { margin-bottom: var(--space-2xs); }
    .fac-address { margin: 0 0 var(--space-s); font-size: 1.0625rem; font-weight: 500; color: var(--slate-600); }
    .fac-operator p { margin: 0; }
    .fac-top { display: grid; grid-template-columns: 1fr; gap: var(--space-m); margin-bottom: var(--space-m); }
    .fac-map { min-height: 240px; border: 1px solid var(--line-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg); }
    @media (min-width: 900px) { .fac-top { grid-template-columns: 1.4fr 1fr; align-items: stretch; } .fac-map { height: 100%; } }
    @media (max-width: 700px) {
      .fac-head { grid-template-columns: 1fr; grid-template-areas: "title" "chip" "actions"; }
    }

    /* CMS warnings (abuse icon, Special Focus status, days without an RN): first thing under the header */
    .cms-warnings { margin: 0 0 var(--space-m); padding: var(--space-m); background: var(--grade-F-tint); border: 1px solid var(--grade-F-ink); border-left-width: 4px; border-radius: var(--radius-md); }
    .cms-warnings-heading { margin: 0 0 var(--space-xs); font-family: var(--font-ui); font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--alarm); }
    .cms-warning-list { display: grid; gap: var(--space-s); margin: 0; padding: 0; list-style: none; }
    .cms-warning p { margin: 0; max-width: 72ch; }
    .cms-warning-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; line-height: 1.25; color: var(--navy-900); }
    .cms-warnings-note { margin: var(--space-s) 0 0; font-size: 0.875rem; color: var(--navy-900); }
    .staffing-notes { margin: var(--space-s) 0; padding: var(--space-s) var(--space-m); background: var(--grade-NR-tint); border: 1px solid var(--line-strong); border-radius: var(--radius-md); }
    .staffing-notes-title { margin: 0 0 var(--space-2xs); font-weight: 700; }
    .staffing-notes ul { margin: 0; padding-left: 1.25rem; }
    .staffing-notes .is-urgent { color: var(--alarm); font-weight: 600; }

    /* Facts */
    .fact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-m); margin: 0; padding: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
    .fact-grid--wide { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: var(--space-xs); }
    .fact dt { margin-bottom: 2px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .fact dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }

    /* Sticky in-page navigation: top tabs on desktop, a scrolling chip row on mobile. Pure anchors. */
    .fac-nav { position: sticky; top: var(--header-h); z-index: 50; margin-bottom: var(--space-l); background: var(--bg); border-bottom: 1px solid var(--line); }
    .fac-nav ul { display: flex; gap: var(--space-2xs); overflow-x: auto; padding: 8px 0; scrollbar-width: thin; }
    .fac-nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 999px; color: var(--navy-900); font-size: 0.9375rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .fac-nav a:visited { color: var(--navy-900); }
    .fac-nav a:hover { border-color: var(--teal-700); color: var(--teal-700); }
    .fac-body [id], .fac-summary { scroll-margin-top: calc(var(--header-h) + 76px); }

    /* Summary card */
    .fac-summary { display: grid; gap: var(--space-m); margin-bottom: var(--space-l); padding: var(--space-l); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-1); }
    .fac-verdict .lede { margin: 0; }
    .h2-eyebrow { margin: 0 0 var(--space-2xs); font-family: var(--font-ui); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--slate-600); }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--space-s); }
    .stat-grid .stat-tile { background: var(--bg); }
    .stat-unit { font-size: 0.75rem; font-weight: 500; color: var(--slate-600); white-space: nowrap; }
    .notice { margin: 0; padding: var(--space-s) var(--space-m); background: var(--grade-NR-tint); border: 1px solid var(--line-strong); border-radius: var(--radius-md); }
    .notice--partial { background: var(--grade-C-tint); border-color: var(--grade-C-ink); }
    .trend { display: flex; align-items: center; gap: var(--space-s); padding: var(--space-s) var(--space-m); background: var(--grade-NR-tint); border: 1px solid var(--grade-NR-ink); border-radius: var(--radius-md); }
    .trend-icon { font-size: 1.5rem; font-weight: 700; }
    .trend-status { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .trend p { margin: 0; font-size: 0.9375rem; color: var(--slate-600); }
    .trend--improving { background: var(--grade-A-tint); border-color: var(--grade-A-ink); color: var(--grade-A-ink); }
    .trend--declining { background: var(--grade-F-tint); border-color: var(--grade-F-ink); color: var(--grade-F-ink); }
    .trend--volatile { background: var(--grade-C-tint); border-color: var(--grade-C-ink); color: var(--grade-C-ink); }
    .trend--stable, .trend--insufficient_history { color: var(--slate-600); }
    .fac-summary .pull-quote { margin: 0; }
    .lede--sm { font-size: 1.0625rem; }

    /* Ratings and grade breakdown */
    .quality-table { min-width: 0; width: 100%; }
    .quality-row { border-bottom: 1px solid var(--line); }
    .quality-label-cell { padding: var(--space-m) var(--space-m) var(--space-m) 0; vertical-align: top; }
    .quality-label { margin-bottom: 2px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .quality-desc { font-size: 0.9375rem; line-height: 1.4; color: var(--slate-600); }
    .quality-value-cell { padding: var(--space-m) 0; vertical-align: top; text-align: right; font-size: 1.25rem; font-weight: 700; }
    .quality-value-cell.is-ok { color: var(--teal-700); font-size: 1.5rem; }
    .quality-value-cell.is-low { color: var(--alarm); font-size: 1.5rem; }
    .quality-note { padding: 0 0 var(--space-s); }
    .quality-stars { margin-bottom: 4px; }
    .quality-score { font-size: 2.25rem; font-variant-numeric: tabular-nums; }
    .def-cluster-row { display: flex; justify-content: flex-end; align-items: baseline; gap: var(--space-2xs); }
    .def-cluster-label { font-size: 0.875rem; font-weight: 400; color: var(--slate-600); }
    .def-cluster-value { min-width: 2.5ch; text-align: right; font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .def-cluster-value.is-alarm { color: var(--alarm); }
    .def-cluster-value.is-harm { color: var(--grade-D-ink); }
    .def-cluster-na { font-size: 1.5rem; font-weight: 700; }

    /* Staffing comparison bars */
    .hbar-table { min-width: 0; }
    .hbar-table th { width: 11rem; padding: var(--space-xs) var(--space-s) var(--space-xs) 0; text-align: left; font-weight: 600; }
    .hbar-table th.is-ref { font-weight: 400; color: var(--slate-600); }
    .hbar-cell { width: 100%; padding: var(--space-xs) var(--space-s); }
    .hbar { display: block; height: 10px; background: var(--line); border-radius: 5px; overflow: hidden; }
    .hbar-fill { display: block; width: var(--pct); height: 100%; border-radius: 5px; }
    .hbar--self .hbar-fill { background: var(--teal-600); }
    .hbar--ref .hbar-fill { background: var(--line-strong); }
    .hbar-table td.num { padding: var(--space-xs) 0; white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
    .is-strong { font-weight: 700; }

    /* Generic data table (enforcement) and prose bits */
    .data-table { min-width: 520px; }
    .data-table th { padding-bottom: var(--space-2xs); text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); border-bottom: 2px solid var(--navy-900); }
    .data-table td { padding: var(--space-xs) 0; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
    .data-table .num { text-align: right; }
    .note { margin-top: var(--space-xs); font-size: 0.8125rem; color: var(--slate-600); }
    .bullets { margin-bottom: var(--space-s); padding-left: 1.2em; }

    /* Deficiency cards, tiered by CMS scope/severity */
    .def-summary p { margin: 0; font-size: 1.0625rem; max-width: none; }
    .def-summary .is-jeopardy { color: var(--grade-F-ink); font-weight: 700; }
    .def-summary .is-harm { color: var(--grade-D-ink); font-weight: 700; }
    .def-summary .is-open { color: var(--alarm); font-weight: 700; }
    .def-cycle { margin-bottom: var(--space-l); }
    .def-cycle h3 { margin-top: 0; }
    .def-list { display: grid; gap: var(--space-xs); }
    .def { padding: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--grade-NR-fill); border-radius: var(--radius-md); }
    .def--potential { border-left-color: var(--grade-C-fill); }
    .def--harm { border-left-color: var(--grade-D-fill); }
    .def--jeopardy { border-left-color: var(--grade-F-fill); }
    .def-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2xs); margin-bottom: var(--space-2xs); }
    .sev-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 700; background: var(--grade-NR-tint); color: var(--grade-NR-ink); }
    .sev-pill--potential { background: var(--grade-C-tint); color: var(--grade-C-ink); }
    .sev-pill--harm { background: var(--grade-D-tint); color: var(--grade-D-ink); }
    .sev-pill--jeopardy { background: var(--grade-F-tint); color: var(--grade-F-ink); }
    .def-sev { font-size: 0.8125rem; font-weight: 600; color: var(--slate-600); }
    .def-tag { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.8125rem; font-weight: 600; }
    .def-status { margin-left: auto; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .def-status.is-open { color: var(--alarm); }
    .def-desc { margin: 0 0 4px; max-width: none; font-size: 1.0625rem; font-weight: 600; line-height: 1.35; }
    .def-meta { margin: 0; max-width: none; font-size: 0.8125rem; color: var(--slate-600); }

    /* Nearby tiles, related links, trust module, CTA note, alerts */
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: var(--space-s); }
    .tile-grid .fcard-stats { grid-template-columns: 1fr 1fr; gap: var(--space-2xs); }
    .tile-grid .fcard-stat { min-width: 0; padding: 6px 8px; }
    .tile-grid .fcard-stat dd { font-size: 0.9375rem; }
    .tile-grid .stars { font-size: 0.8125rem; }
    .related .more { color: var(--teal-700); font-weight: 700; }
    .trust-module { margin-top: var(--space-l); border-top: 3px solid var(--teal-600); }
    .trust-module h3 { margin-top: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--teal-700); }
    .cta-note { margin-top: var(--space-s); font-size: 0.75rem; color: #D3DEE7; }
    .fac-alerts { margin-top: var(--space-xl); }
    .fac-alerts h3 { margin-top: 0; }
    .search-bar--flush { margin-bottom: 0; }
`;
