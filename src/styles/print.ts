// Print styles: chrome hidden, content in black, grade letters preserved. Facility pages are shared and printed.
export const PRINT_CSS = `
    @media print {
      .site-header, footer, .search-bar, .cta-box, .breadcrumb, .btn, .btn-secondary, .geo-btn, #comparison-bar, .skip-link,
      .fac-nav, .fac-actions, .fac-map, .fac-alerts, .trust-module, .related, .tile-grid, .nearby-section, .compare-toggle { display: none !important; }
      .print-only { display: block !important; }
      .print-url { margin: 0 0 8pt; font-size: 9pt; color: #000; overflow-wrap: anywhere; }
      body { font-size: 11pt; line-height: 1.4; color: #000; background: #fff; }
      .container { max-width: 100%; padding: 0; }
      .site-main { padding: 0; }
      h1 { font-size: 2.25rem; margin-top: 1rem; }
      .display { font-size: 3rem; }
      .fac-head { grid-template-columns: 1fr auto; grid-template-areas: "title chip"; }
      .fac-summary, .def, .fact-grid, .stat-tile, .quality-row, .result-item, .metric-row, .snapshot-card, .fcard { break-inside: avoid; border-color: #000; box-shadow: none; }
      .fac-summary { padding: 0; border: 0; }
      h2, h3 { break-after: avoid; }
      a { text-decoration: none; color: #000; }
      .grade-A, .grade-B, .grade-C, .grade-D, .grade-F, .grade-NR { color: #000 !important; border-color: #000 !important; }
      /* Grade chip: black outline, letter and score in black, filled meter segments solid black */
      .chip { border: 1px solid #000; border-top-width: 3px; }
      .chip-num, .chip-letter, .chip-desc, .chip-max { color: #000 !important; }
      .meter i { background: #ccc; }
      .meter i.on { background: #000; }
      .sev-pill { border: 1px solid #000; background: #fff !important; color: #000 !important; }
      .def { border-left-color: #000 !important; }
      .def-status, .def-status.is-open, .is-open, .is-alarm, .is-harm, .is-jeopardy, .quality-value-cell.is-ok, .quality-value-cell.is-low { color: #000 !important; }
      .hbar { border: 1px solid #000; background: #fff; }
      .hbar-fill { background: #000 !important; }
      .trend, .notice { background: #fff !important; border: 1px solid #000 !important; color: #000 !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
`;
