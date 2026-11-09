// Editorial, report and utility pages: prose helpers, info cards, grade legend, report tables,
// confirmation/error pages. First used by PLAN Phase 5; shared classes, no page-specific hacks.
export const EDITORIAL_CSS = `
    .prose { max-width: 800px; }
    .back-link { margin-top: var(--space-l); }
    .aside-note { margin: var(--space-l) 0; padding: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--teal-600); border-radius: 0 var(--radius-md) var(--radius-md) 0; max-width: 72ch; }
    .section-note { margin-bottom: var(--space-s); font-size: 0.9375rem; color: var(--slate-600); }
    .muted-lg { margin-bottom: var(--space-l); color: var(--slate-600); }
    .text-alarm { color: var(--alarm); }
    .text-ok { color: var(--grade-A-ink); }
    .sev-text--jeopardy { color: var(--grade-F-ink); }
    .sev-text--harm { color: var(--grade-D-ink); }
    .sev-text--low { color: var(--slate-600); }
    .glossary dt { margin-top: var(--space-m); font-weight: 700; }
    .glossary dd { margin-left: 0; }
    .formula { margin: var(--space-m) 0; padding: var(--space-m); background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--radius-md); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9rem; overflow-x: auto; max-width: none; }
    .code-chip { padding: 0.15rem 0.4rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 0.9rem; }

    /* Info cards: label + sentence (how-we-grade, about) */
    .info-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-s); margin: var(--space-l) 0; }
    .info-card { padding: var(--space-m); background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--teal-600); border-radius: var(--radius-md); }
    .info-card-label { display: block; margin-bottom: var(--space-3xs); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); }
    .info-card-text { display: block; font-size: 0.9375rem; line-height: 1.5; }

    /* Grade legend: letter + what it means */
    .grade-legend { display: grid; gap: var(--space-xs); margin: var(--space-l) 0; }
    .grade-legend-item { display: flex; align-items: center; gap: var(--space-s); padding: var(--space-s) var(--space-m); background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--grade-NR-fill); border-radius: var(--radius-md); }
    .grade-legend-item--A { border-left-color: var(--grade-A-fill); }
    .grade-legend-item--B { border-left-color: var(--grade-B-fill); }
    .grade-legend-item--C { border-left-color: var(--grade-C-fill); }
    .grade-legend-item--D { border-left-color: var(--grade-D-fill); }
    .grade-legend-item--F { border-left-color: var(--grade-F-fill); }
    .grade-legend-letter { min-width: 2rem; font-size: 1.3rem; font-weight: 700; }
    .grade-legend-text { font-size: 0.9375rem; }

    /* Report tables: rank-table plus ordinary cell helpers */
    .report-table { min-width: 600px; }
    .report-table th { padding: var(--space-xs) var(--space-xs); text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate-600); border-bottom: 2px solid var(--navy-900); }
    .report-table td { padding: var(--space-xs) var(--space-xs); border-bottom: 1px solid var(--line); vertical-align: middle; font-variant-numeric: tabular-nums; }
    .report-table .num { text-align: right; }
    .report-table .name { font-weight: 600; }
    .report-table .strong { font-weight: 700; }
    .report-table .dim { font-weight: 600; font-size: 0.8125rem; color: var(--slate-600); }
    .report-table--narrow { min-width: 400px; }
    .report-table .row-note { padding-top: 0; font-size: 0.9rem; color: var(--slate-600); }
    .pagination { display: flex; align-items: center; gap: var(--space-s); margin: var(--space-l) 0; }
    .pagination .page-of { font-size: 0.9rem; color: var(--slate-600); }
    .panel-methodology { margin-top: var(--space-xl); }
    .panel-methodology h3 { margin-top: 0; }
    .panel-methodology p { font-size: 0.9375rem; color: var(--slate-600); }
    .cta-box .cta-fine { font-size: 0.8125rem; margin-bottom: 0; }

    /* Labelled grade bars (state report): segment width is data, passed as --w */
    .gbar { display: flex; gap: var(--space-xs); margin-bottom: var(--space-l); }
    .gbar-col { flex: var(--w) 1 0; min-width: 2rem; }
    .gbar-seg { display: flex; align-items: center; justify-content: center; height: 2rem; border-radius: var(--radius-sm); color: #fff; font-size: 0.85rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .gbar-seg--A { background: var(--grade-A-ink); }
    .gbar-seg--B { background: var(--grade-B-ink); }
    .gbar-seg--C { background: var(--grade-C-ink); }
    .gbar-seg--D { background: var(--grade-D-ink); }
    .gbar-seg--F { background: var(--grade-F-ink); }
    .gbar-label { margin-top: var(--space-3xs); text-align: center; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--slate-600); }

    /* Confirmation / error pages */
    .centered { max-width: 560px; margin: 0 auto; padding: var(--space-l) 0; text-align: center; }
    .centered .lede { margin-inline: auto; }
    .centered .btn-row { justify-content: center; }
    .success-mark { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; margin: 0 auto var(--space-m); border-radius: 50%; background: var(--teal-700); color: #fff; font-size: 2rem; font-weight: 700; }
    .search-bar--medium { max-width: 560px; }
    .ask-answer { max-width: 720px; font-size: 1.05rem; line-height: 1.6; white-space: pre-wrap; }
    .disclaimer { max-width: 72ch; margin-top: var(--space-s); font-size: 0.8125rem; color: var(--slate-600); }
`;
