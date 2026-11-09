// Footer, breadcrumb, search results, facility, deficiency/snapshot, focus, responsive.
export const PAGES_CSS = `
    /* Footer */
    .repeal-disclosure {
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--muted);
      margin: var(--space-2xs) 0 0;
      max-width: 60ch;
    }
    .repeal-disclosure a { color: inherit; font-weight: 700; }

    footer {
      border-top: 1px solid var(--rule);
      margin-top: var(--space-3xl);
      background: #fff;
      padding: var(--space-2xl) 0 var(--space-l);
      font-size: 0.875rem;
    }
    .footer-upper {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
      gap: var(--space-2xl);
      margin-bottom: var(--space-xl);
    }
    .footer-brand { display: flex; flex-direction: column; gap: var(--space-m); }
    .footer-lockup {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      border: none;
    }
    .footer-lockup:hover { border: none; }
    .footer-wordmark {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .footer-tagline { font-size: 0.8rem; color: var(--muted); line-height: 1.6; margin: 0; }
    .footer-col { display: flex; flex-direction: column; gap: var(--space-2xs); }
    .footer-col-head {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--ink);
      margin-bottom: var(--space-2xs);
    }
    .footer-link {
      color: var(--muted);
      text-decoration: none;
      border: none;
      font-size: 0.875rem;
      transition: color 0.2s ease;
      line-height: 1.8;
    }
    .footer-link:hover { color: var(--accent); border: none; }
    .footer-newsletter-desc { font-size: 0.8rem; color: var(--muted); line-height: 1.5; margin: 0 0 var(--space-xs); }
    .footer-newsletter-form { display: flex; flex-direction: column; gap: var(--space-2xs); }
    .footer-newsletter-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--rule);
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      background: var(--bg);
    }
    .footer-newsletter-input:focus { outline: 2px solid var(--accent); outline-offset: 0; }
    .footer-newsletter-btn {
      min-height: 44px;
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .footer-newsletter-btn:hover { background: var(--accent-hover); }
    .footer-social { display: flex; gap: var(--space-s); margin-top: var(--space-xs); }
    .footer-social-link {
      color: var(--muted);
      border: none;
      display: flex;
      align-items: center;
      transition: color 0.2s ease;
    }
    .footer-social-link:hover { color: var(--accent); border: none; }
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-s);
      padding-top: var(--space-m);
      border-top: 1px solid var(--rule);
      font-size: 0.8rem;
      color: var(--muted);
    }
    .footer-bottom-links { display: flex; gap: var(--space-m); flex-wrap: wrap; }
    .footer-bottom-link { color: var(--muted); text-decoration: none; border: none; font-size: 0.8rem; }
    .footer-bottom-link:hover { color: var(--accent); }
    @media (max-width: 900px) {
      .footer-upper { grid-template-columns: 1fr 1fr; gap: var(--space-l); }
      .footer-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 600px) {
      .footer-upper { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; align-items: flex-start; }
    }

    /* Breadcrumb */
    .breadcrumb { 
      font-size: 0.75rem; 
      color: var(--muted); 
      margin-bottom: var(--space-l); 
      text-transform: uppercase; 
      font-weight: 700; 
      letter-spacing: 0.1em;
    }
    .breadcrumb a {
      border: none;
      display: inline-flex;
      min-height: 44px;
      min-width: 44px;
      align-items: center;
      justify-content: center;
    }
    .breadcrumb-sep { margin: 0 var(--space-2xs); color: var(--rule); }

    /* Search results */
    .results-header {
      display: grid;
      gap: var(--space-m);
      margin-bottom: var(--space-2xl);
      padding-bottom: var(--space-m);
      border-bottom: 4px solid var(--ink);
    }
    .results-kicker {
      font-size: 0.9rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 800;
    }
    .results-count {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2.5rem, 8vw, 4.5rem);
      font-weight: 800;
      color: var(--ink);
      line-height: 0.9;
      letter-spacing: 0;
    }
    .results-intro {
      font-size: 1.25rem;
      line-height: 1.5;
      max-width: 720px;
    }
    .results-controls {
      display: flex;
      gap: var(--space-l);
      flex-wrap: wrap;
      align-items: flex-end;
      padding: var(--space-m);
      background: var(--bg);
      border: 2px solid var(--ink);
    }
    .results-controls label {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: grid;
      gap: var(--space-3xs);
    }
    .results-controls select {
      padding: var(--space-2xs) var(--space-xs);
      border: 2px solid var(--ink);
      border-radius: 0;
      font-size: 1rem;
      background: #fff;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-weight: 700;
    }
    .results-list { display: grid; gap: var(--space-l); }

    .result-item {
      border: 2px solid var(--ink);
      padding: var(--space-l);
      background: #fff;
      transition: transform 0.2s ease;
      display: grid;
    }
    .result-item:hover { transform: translateY(-4px); }
    .result-item-A { border-left: 12px solid var(--grade-A); }
    .result-item-B { border-left: 12px solid var(--grade-B); }
    .result-item-C { border-left: 12px solid var(--grade-C); }
    .result-item-D { border-left: 12px solid var(--grade-D); }
    .result-item-F { border-left: 12px solid var(--grade-F); }

    .result-main {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: var(--space-xl);
      align-items: start;
    }
    .result-grade { text-align: center; }
    .result-grade-letter { font-size: 5rem; font-weight: 900; line-height: 0.8; display: block; margin-bottom: var(--space-2xs); }
    .result-grade-score { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: var(--muted); }
    .result-rank { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); display: block; margin-bottom: var(--space-s); }

    .result-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2rem;
      font-weight: 800;
      color: var(--ink);
      text-decoration: none;
      line-height: 1.1;
      margin-bottom: var(--space-3xs);
      display: block;
    }
    .result-meta { font-size: 0.9rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-m); }
    .result-distance { font-weight: 800; color: var(--accent); font-size: 0.9rem; }
    
    .result-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-s); margin-bottom: var(--space-m); }
    .result-stat { padding: var(--space-s); background: var(--bg); border: 1px solid var(--rule); }
    .result-stat-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: block; margin-bottom: var(--space-3xs); }
    .result-stat-value { font-family: 'Playfair Display', Georgia, serif; font-size: 1.25rem; font-weight: 700; }
    .result-summary { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 1.25rem; line-height: 1.4; color: var(--ink); }

    /* Facility Specific */
    .facility-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-xl);
      gap: var(--space-l);
      padding-bottom: var(--space-m);
      border-bottom: 4px solid var(--ink);
    }
    .facility-grade-hero {
      font-size: clamp(6rem, 20vw, 12rem);
      line-height: 0.8;
      font-weight: 900;
      letter-spacing: 0;
    }

    /* Deficiency & Snapshot */
    .snapshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-s);
      margin-bottom: var(--space-xl);
    }
    .snapshot-card {
      padding: var(--space-m);
      border: 1px solid var(--rule);
      background: #fff;
      border-top: 4px solid var(--ink);
    }
    .snapshot-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 800;
      margin-bottom: var(--space-3xs);
    }
    .snapshot-value { font-size: 1.25rem; font-weight: 700; line-height: 1.2; font-family: 'Playfair Display', Georgia, serif; }

    .deficiency-item {
      padding: var(--space-m);
      margin-bottom: var(--space-s);
      border: 1px solid var(--rule);
    }
    .nearby-section {
      margin: var(--space-2xl) 0;
      padding-top: var(--space-l);
      border-top: 2px solid var(--ink);
    }
    .nearby-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-l);
      margin-bottom: var(--space-l);
    }
    .nearby-header h2 { margin-bottom: var(--space-2xs); }
    .nearby-header p {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
    }
    .nearby-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--space-m);
    }
    .nearby-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-m);
      padding: var(--space-m);
      border: 1px solid var(--rule);
      background: #fff;
    }
    .nearby-grade {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3rem;
      font-weight: 800;
      line-height: 0.9;
      min-width: 2.25rem;
    }
    .nearby-name {
      font-size: 1.35rem;
      line-height: 1.1;
      margin-bottom: var(--space-2xs);
    }
    .nearby-name a { border: none; }
    .nearby-meta {
      margin-bottom: var(--space-s);
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .nearby-stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      color: var(--muted);
      font-size: 0.85rem;
    }
    .nearby-stats span {
      padding: 0.25rem 0.45rem;
      border: 1px solid var(--rule);
      background: var(--bg);
    }
    .nearby-stats strong {
      color: var(--ink);
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.05rem;
    }

    /* Focus-visible for keyboard navigation */
    .masthead-nav-link:focus-visible,
    .masthead-search-btn:focus-visible,
    .masthead-toggle:focus-visible,
    .search-bar button:focus-visible,
    .search-bar .geo-btn:focus-visible,
    .btn:focus-visible,
    .btn-secondary:focus-visible,
    .compare-toggle:focus-visible,
    .footer-newsletter-btn:focus-visible,
    .footer-link:focus-visible,
    .footer-bottom-link:focus-visible,
    .results-controls select:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .search-bar input:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--bg); }
    .btn-on-dark:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    /* Active / pressed states */
    .btn:active,
    .masthead-search-btn:active,
    .search-bar button:active,
    .footer-newsletter-btn:active,
    .btn-on-dark:active {
      transform: translateY(1px);
    }

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
      header { padding: var(--space-s) 0; }
      .container { padding-left: var(--space-m); padding-right: var(--space-m); }
      .masthead { align-items: flex-start; gap: var(--space-s); }
      .masthead-tagline { display: block; line-height: 1.3; }
      header nav {
        width: 100%;
        gap: var(--space-2xs) !important;
        flex-wrap: wrap;
      }
      .masthead-toggle {
        display: inline-flex;
      }
      .masthead-nav-links {
        display: none;
        width: 100%;
        flex-direction: column;
        gap: var(--space-2xs);
      }
      .masthead-nav.is-open .masthead-nav-links {
        display: flex;
      }
      header nav .masthead-nav-link {
        display: flex;
        min-height: 44px;
        align-items: center;
        padding: var(--space-2xs) var(--space-xs);
        border: 1px solid var(--rule) !important;
        background: #fff;
        width: 100%;
      }
      header nav .masthead-search-btn {
        background: var(--accent);
        color: #fff;
        border: none !important;
        padding: 0.45rem 1rem;
      }
      main.container { padding-top: var(--space-l) !important; }
      .facility-header { flex-direction: column-reverse; gap: var(--space-s); }
      .facility-grade-hero { font-size: 6rem; }
      .search-bar { flex-direction: column; }
      .search-bar input { width: 100%; min-width: 0; border-bottom: none; }
      .search-bar button { min-height: 44px; border-top: none; }
      .search-bar .geo-btn { min-height: 44px; border-left: 2px solid var(--ink); border-top: none; }
      .cta-box { padding: var(--space-m); }
      .results-count { line-height: 1; }
      .results-controls { gap: var(--space-s); padding: var(--space-s); }
      .results-controls label { width: 100%; }
      .results-controls select { min-height: 44px; width: 100%; }
      .result-item { padding: var(--space-m); }
      .result-main { grid-template-columns: 1fr; gap: var(--space-m); }
      .result-grade { text-align: left; display: flex; align-items: baseline; gap: var(--space-s); }
      .result-grade-letter { font-size: 4rem; margin-bottom: 0; }
      .result-rank { margin-bottom: 0; }
      .result-info > div:first-child { flex-direction: column; gap: var(--space-s); }
      .result-info button { min-height: 44px; padding: 0.55rem 0.8rem !important; align-self: flex-start; }
      .quality-breakdown {
        overflow-x: visible;
      }
      .quality-table {
        min-width: 0;
        width: 100%;
      }
      .quality-table tbody,
      .quality-table tr,
      .quality-table td {
        display: block;
        width: 100%;
      }
      .quality-row {
        padding: var(--space-m) 0;
      }
      .quality-table td {
        padding: 0 !important;
      }
      .quality-label-cell {
        margin-bottom: var(--space-xs);
      }
      .quality-value-cell {
        text-align: left !important;
        font-size: 1.35rem !important;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .quality-value-cell div {
        margin-bottom: var(--space-3xs);
      }
      .nearby-header {
        display: block;
      }
      .nearby-header .btn-secondary {
        margin-top: var(--space-s);
      }
      .nearby-grid {
        grid-template-columns: 1fr;
      }
      .nearby-card {
        grid-template-columns: 1fr;
        gap: var(--space-s);
      }
      .pull-quote a, main > p a, .card a[href="/about"], footer a {
        display: inline-flex !important;
        min-height: 44px;
        align-items: center;
      }
      .city-result-card { padding: var(--space-m) !important; }
      .city-result-grid { grid-template-columns: 1fr !important; gap: var(--space-m) !important; }
      .city-result-metrics { flex-wrap: wrap; gap: var(--space-m) !important; }
      .city-result-card a:not(.btn) {
        min-height: 44px;
        display: flex !important;
        align-items: center;
      }
      .city-result-card .grade-badge { width: 72px; }
      .city-zip-cta { padding: var(--space-l) var(--space-m) !important; text-align: left !important; }
      .city-zip-form { flex-direction: column; }
      .city-zip-form input, .city-zip-form button { width: 100%; min-height: 44px; }
      #comparison-bar {
        align-items: stretch !important;
        flex-direction: column;
        gap: var(--space-xs);
      }
      #comparison-bar .btn { text-align: center; }
      .comparison-table { min-width: 560px !important; }
      .leaflet-control-zoom a {
        width: 44px !important;
        height: 44px !important;
        line-height: 44px !important;
      }
    }

`;
