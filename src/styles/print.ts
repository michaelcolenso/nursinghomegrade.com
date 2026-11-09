// Print styles.
export const PRINT_CSS = `
    @media print {
      header, footer, .search-bar, .cta-box, .breadcrumb, .btn, .btn-secondary, .geo-btn { display: none !important; }
      body { font-size: 11pt; line-height: 1.4; color: #000; background: #fff; }
      .container { max-width: 100%; padding: 0; }
      h1 { font-size: 2.5rem; margin-top: 2rem; }
      .display { font-size: 3rem; }
      .result-item, .metric-row, .deficiency-item, .snapshot-card { break-inside: avoid; border-color: #000; }
      a { text-decoration: none; color: #000; }
      .grade-A, .grade-B, .grade-C, .grade-D, .grade-F { color: #000 !important; border-color: #000 !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
`;
