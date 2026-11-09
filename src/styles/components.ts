// Typography, buttons, forms, grade chips, tables, CTA, metrics.
export const COMPONENTS_CSS = `
    /* Typography */
    .display {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(3rem, 10vw, 5.5rem);
      font-weight: 800;
      line-height: 1.0;
      letter-spacing: 0;
      margin-bottom: var(--space-l);
      color: var(--ink);
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: 0;
      overflow-wrap: break-word;
    }
    h1 { font-size: clamp(1.75rem, 6vw, 3.5rem); margin-bottom: var(--space-m); }
    h2 { font-size: clamp(1.6rem, 4vw, 2.25rem); margin-bottom: var(--space-s); margin-top: var(--space-2xl); border-top: 1px solid var(--rule); padding-top: var(--space-m); }
    h3 { font-size: clamp(1.25rem, 3vw, 1.5rem); margin-bottom: var(--space-xs); margin-top: var(--space-l); }
    p { margin-bottom: var(--space-s); }
    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s ease; }
    a:hover { border-bottom-color: var(--accent); text-decoration: none; }
    a:visited { color: var(--accent-hover); }

    /* Editorial components */
    .lede {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.35rem, 3vw, 1.75rem);
      line-height: 1.4;
      color: var(--ink);
      margin-bottom: var(--space-xl);
      max-width: 720px;
      font-weight: 400;
    }
    .lede strong { font-weight: 700; color: var(--accent); }

    .pull-quote {
      border-top: 4px solid var(--ink);
      border-bottom: 1px solid var(--rule);
      padding: var(--space-xl) 0;
      margin: var(--space-2xl) 0;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.25rem, 3vw, 1.6rem);
      line-height: 1.4;
      color: var(--ink);
      max-width: 800px;
    }
    .pull-quote strong { font-weight: 800; display: block; margin-bottom: var(--space-2xs); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em; color: var(--muted); }

    /* Search bar */
    .search-bar {
      display: flex;
      gap: 0;
      flex-wrap: wrap;
      max-width: 600px;
      margin-bottom: var(--space-xl);
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
    }

    .card {
      background: #fff;
      border: 1px solid var(--rule);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05);
    }

    .search-bar input {
      flex: 1;
      min-width: 240px;
      padding: var(--space-s) var(--space-m);
      border: 2px solid var(--ink);
      border-radius: 0;
      font-size: 1.125rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      background: #fff;
    }
    .search-bar input:focus { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--bg); }
    .search-bar button {
      min-height: 44px;
      background: var(--accent);
      color: #fff;
      padding: var(--space-s) var(--space-l);
      border: 2px solid var(--accent);
      border-radius: 0;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.125rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      transition: background 0.2s ease-out, color 0.2s ease-out;
    }
    .search-bar button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    .search-bar .geo-btn {
      min-height: 44px;
      background: #fff;
      color: var(--ink);
      border: 2px solid var(--ink);
      border-left: none;
      padding: var(--space-s) var(--space-m);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--ink);
      color: #fff;
      padding: var(--space-xs) var(--space-l);
      border-radius: 0;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      border: 2px solid var(--ink);
      cursor: pointer;
      transition: all 0.2s ease-out;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      min-height: 44px;
    }
    .btn:hover { background: transparent; color: var(--ink); text-decoration: none; }
    
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      color: var(--ink);
      padding: var(--space-xs) 0;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      background: none;
      border: none;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transition: color 0.2s ease-out;
      min-height: 44px;
    }
    .btn-secondary:hover { color: var(--accent); text-decoration: underline; }

    .compare-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: 2px solid var(--rule);
      padding: 0.4rem 0.75rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 44px;
      color: var(--ink);
    }
    .compare-toggle:hover { border-color: var(--accent); }
    .compare-toggle[aria-pressed="true"] { border-color: var(--accent); background: var(--accent); color: #fff; }
    .compare-toggle-box {
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      display: inline-block;
      position: relative;
      flex-shrink: 0;
    }
    .compare-toggle[aria-pressed="true"] .compare-toggle-box::after {
      content: '✓';
      position: absolute;
      top: -3px;
      left: 1px;
      font-size: 14px;
      font-weight: 800;
    }

    /* Grade colors */
    .grade-A { color: var(--grade-A); }
    .grade-B { color: var(--grade-B); }
    .grade-C { color: var(--grade-C); }
    .grade-D { color: var(--grade-D); }
    .grade-F { color: var(--grade-F); }

    /* Grade badge */
    .grade-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 0;
      background: var(--bg);
      border: 2px solid var(--ink);
    }
    .grade-badge-letter {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
    }
    .grade-badge-score {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-top: 0.15rem;
    }

    /* Button on dark background */
    .btn-on-dark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xs) var(--space-l);
      background: #fff;
      color: var(--ink);
      border: 2px solid #fff;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s ease-out;
      min-height: 44px;
    }
    .btn-on-dark:hover { background: transparent; color: #fff; }
    .btn-on-dark:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    /* Responsive Tables */
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: var(--space-l);
      max-width: 100%;
    }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }

    /* CTA box */
    .cta-box {
      background: var(--ink);
      color: #fff;
      padding: var(--space-xl);
      margin: var(--space-2xl) 0;
    }
    .cta-box h3 { color: #fff; margin-top: 0; border: none; padding: 0; font-size: 2rem; }
    .cta-box p { color: #c8d6e0; margin-bottom: var(--space-m); }
    .cta-box .btn { background: #fff; color: var(--ink); border-color: #fff; margin-right: var(--space-s); }
    .cta-box .btn:hover { background: transparent; color: #fff; }
    .cta-box .btn-secondary { color: #fff; }

    /* Metrics */
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: var(--space-s) 0;
      border-bottom: 1px solid var(--rule);
      flex-wrap: wrap;
      gap: var(--space-xs);
    }
    .metric-label { font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }
    .metric-value { font-family: 'Playfair Display', Georgia, serif; font-size: 1.25rem; font-weight: 700; }

`;
