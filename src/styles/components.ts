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
    .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: var(--space-l); max-width: 100%; }
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
`;
