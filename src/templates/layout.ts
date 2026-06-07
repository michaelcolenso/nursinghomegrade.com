export interface LayoutOptions {
  canonicalPath?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object[];
  extraHead?: string;
  extraScripts?: string;
}

export function layout(
  title: string,
  description: string,
  body: string,
  options: LayoutOptions = {},
): string {
  const { canonicalPath, noindex, ogType = "website", ogImage, jsonLd, extraHead, extraScripts } = options;
  const canonicalUrl = canonicalPath
    ? `https://nursinghomegrade.com${canonicalPath}`
    : undefined;

  const canonicalTag = canonicalUrl
    ? `<link rel="canonical" href="${escHtml(canonicalUrl)}">`
    : "";
  const robotsMeta = noindex
    ? `<meta name="robots" content="noindex, follow">`
    : `<meta name="robots" content="max-snippet:-1, max-image-preview:large, max-video-preview:-1">`;
  const hreflangTags = canonicalUrl
    ? `<link rel="alternate" hreflang="en-US" href="${escHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escHtml(canonicalUrl)}">`
    : "";
  const resolvedOgImage = ogImage ?? "https://nursinghomegrade.com/og.svg";
  const ogUrl = canonicalUrl ?? "https://nursinghomegrade.com";
  const ogTags = `
    <meta property="og:title" content="${escHtml(title)}">
    <meta property="og:description" content="${escHtml(description)}">
    <meta property="og:url" content="${escHtml(ogUrl)}">
    <meta property="og:type" content="${escHtml(ogType)}">
    <meta property="og:image" content="${escHtml(resolvedOgImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="NursingHomeGrade">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escHtml(title)}">
    <meta name="twitter:description" content="${escHtml(description)}">
    <meta name="twitter:image" content="${escHtml(resolvedOgImage)}">
  `;
  const jsonLdTags = jsonLd?.length
    ? jsonLd
        .map(
          (obj) =>
            `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`,
        )
        .join("\n")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  ${canonicalTag}
  ${robotsMeta}
  ${hreflangTags}
  ${ogTags}
  ${jsonLdTags}
  ${extraHead || ""}
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 48'%3E%3Crect width='60' height='48' rx='3' fill='%230B1D33'/%3E%3Crect x='8' y='8' width='10' height='28' fill='%23E6EBEF' rx='1'/%3E%3Crect x='28' y='8' width='10' height='28' fill='%23E6EBEF' rx='1'/%3E%3Cline x1='8' y1='36' x2='38' y2='8' stroke='%2316897A' stroke-width='3.5' stroke-linecap='round'/%3E%3Cline x1='14' y1='36' x2='44' y2='8' stroke='%2316897A' stroke-width='3.5' stroke-linecap='round'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@400;500;600;700;800&display=swap">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Brand Colors */
      --bg: #F7F9FA;
      --ink: #0B1D33;
      --muted: #4A6272;
      --rule: #E6EBEF;
      --accent: #9f1239;
      --accent-hover: #7c0f2d;
      --accent-positive: #0e6b60;

      /* Grade Palette */
      --grade-A: #12805D;
      --grade-B: #1FA38C;
      --grade-C: #F5B23D;
      --grade-D: #E4573D;
      --grade-F: #B91C1C;

      /* Severity Colors */
      --sev-low: var(--muted);
      --sev-med: var(--grade-C);
      --sev-high: var(--grade-F);

      /* Spacing Scale */
      --space-3xs: 0.25rem;
      --space-2xs: 0.5rem;
      --space-xs: 0.75rem;
      --space-s: 1rem;
      --space-m: 1.5rem;
      --space-l: 2rem;
      --space-xl: 3.5rem;
      --space-2xl: 5rem;
      --space-3xl: 7.5rem;

      --space-page: clamp(var(--space-l), 8vw, var(--space-3xl));
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.6;
      font-size: 1.125rem;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1040px; margin: 0 auto; padding: 0 var(--space-m); }

    /* Accessibility */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Skip link */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--ink);
      color: #fff;
      padding: 0.5rem 1rem;
      text-decoration: none;
      z-index: 1001;
      font-weight: 700;
      font-size: 0.9rem;
      border: none;
      transition: top 0.2s ease;
    }
    .skip-link:focus { top: 0; outline: 2px solid var(--accent); outline-offset: 2px; }

    /* Masthead */
    header { border-bottom: 1px solid var(--rule); padding: var(--space-s) 0; background: #fff; }
    .masthead { display: flex; align-items: center; justify-content: space-between; gap: var(--space-m); }
    .masthead-lockup {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      border: none;
    }
    .masthead-lockup:hover { border: none; }
    .masthead-icon { flex-shrink: 0; }
    .masthead-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.1rem, 4vw, 1.35rem);
      font-weight: 700;
      color: var(--ink);
      letter-spacing: -0.02em;
      line-height: 1;
      display: inline-flex;
      min-height: 44px;
      align-items: center;
    }
    .masthead-nav {
      display: flex;
      align-items: center;
      gap: var(--space-m);
    }
    .masthead-nav-link {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ink);
      text-decoration: none;
      border: none;
      transition: color 0.2s ease;
    }
    .masthead-nav-link:hover { color: var(--accent); border: none; }
    .masthead-search-btn {
      min-height: 44px;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      background: var(--accent);
      padding: 0.4rem 1rem;
      border-radius: 4px;
      text-decoration: none;
      border: none;
      transition: background 0.2s ease;
      white-space: nowrap;
    }
    .masthead-search-btn:hover { background: var(--accent-hover); border: none; }
    @media (max-width: 640px) {
      .masthead-nav-link { display: none; }
      .masthead-search-btn { min-height: 44px; padding: 0.45rem 1rem; font-size: 0.9rem; }
    }

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

    /* Footer */
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
    .search-bar button:focus-visible,
    .search-bar .geo-btn:focus-visible,
    .btn:focus-visible,
    .btn-secondary:focus-visible,
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
      header nav a {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        padding: 0 var(--space-xs);
        border: 1px solid var(--rule) !important;
        background: #fff;
      }
      main.container { padding-top: var(--space-l) !important; }
      .facility-header { flex-direction: column-reverse; gap: var(--space-s); }
      .facility-grade-hero { font-size: 6rem; }
      .search-bar { flex-direction: column; }
      .search-bar input { border-bottom: none; }
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
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header>
    <div class="container">
      <div class="masthead">
        <a href="/" class="masthead-lockup" aria-label="NursingHomeGrade home">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 48" width="36" height="29" aria-hidden="true" class="masthead-icon">
            <rect width="60" height="48" rx="3" fill="#0B1D33"/>
            <rect x="8" y="8" width="10" height="28" fill="#E6EBEF" rx="1"/>
            <rect x="28" y="8" width="10" height="28" fill="#E6EBEF" rx="1"/>
            <line x1="8" y1="36" x2="38" y2="8" stroke="#16897A" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="14" y1="36" x2="44" y2="8" stroke="#16897A" stroke-width="3.5" stroke-linecap="round"/>
          </svg>
          <span class="masthead-name">NursingHomeGrade</span>
        </a>
        <nav class="masthead-nav" aria-label="Main navigation">
          <a href="/explore" class="masthead-nav-link">Find Facilities</a>
          <a href="/states" class="masthead-nav-link">Ratings</a>
          <a href="/compare" class="masthead-nav-link">Compare</a>
          <a href="/about" class="masthead-nav-link">About</a>
          <a href="/search" class="masthead-search-btn">Search</a>
        </nav>
      </div>
    </div>
  </header>
  <main id="main-content" class="container" style="padding-top: var(--space-xl); padding-bottom: var(--space-xl);">
    ${body}
  </main>
  <footer>
    <div class="container">
      <div class="footer-upper">
        <div class="footer-brand">
          <a href="/" class="footer-lockup" aria-label="NursingHomeGrade home">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 48" width="32" height="26" aria-hidden="true">
              <rect width="60" height="48" rx="3" fill="#0B1D33"/>
              <rect x="8" y="8" width="10" height="28" fill="#E6EBEF" rx="1"/>
              <rect x="28" y="8" width="10" height="28" fill="#E6EBEF" rx="1"/>
              <line x1="8" y1="36" x2="38" y2="8" stroke="#16897A" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="14" y1="36" x2="44" y2="8" stroke="#16897A" stroke-width="3.5" stroke-linecap="round"/>
            </svg>
            <span class="footer-wordmark">NursingHomeGrade</span>
          </a>
          <p class="footer-tagline">Independent ratings of nursing homes<br>using official CMS data. No facility<br>payments. No conflicts of interest.</p>
        </div>

        <nav class="footer-col" aria-label="Explore">
          <div class="footer-col-head">Explore</div>
          <a href="/explore" class="footer-link">Find Facilities</a>
          <a href="/states" class="footer-link">Browse by State</a>
          <a href="/search" class="footer-link">Search</a>
        </nav>

        <nav class="footer-col" aria-label="Resources">
          <div class="footer-col-head">Resources</div>
          <a href="/about" class="footer-link">How We Grade</a>
          <a href="/about" class="footer-link">FAQ</a>
          <a href="/about" class="footer-link">Glossary</a>
        </nav>

        <nav class="footer-col" aria-label="Company">
          <div class="footer-col-head">Company</div>
          <a href="/about" class="footer-link">About Us</a>
          <a href="/about" class="footer-link">Methodology</a>
          <a href="/about" class="footer-link">Contact</a>
        </nav>

        <div class="footer-col">
          <div class="footer-col-head">Stay Informed</div>
          <p class="footer-newsletter-desc">Get updates on ratings, data releases, and important news.</p>
          <form action="/subscribe" method="POST" class="footer-newsletter-form">
            <input type="hidden" name="facility_name" value="newsletter">
            <input type="email" name="email" placeholder="Enter your email" required autocomplete="email" class="footer-newsletter-input">
            <button type="submit" class="footer-newsletter-btn">Subscribe</button>
          </form>
          <div class="footer-social">
            <a href="https://twitter.com/nursinghomegrade" rel="noopener" aria-label="Twitter/X" class="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L2.1 2.25h6.944l4.262 5.638 4.938-5.638zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://linkedin.com/company/nursinghomegrade" rel="noopener" aria-label="LinkedIn" class="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="mailto:info@nursinghomegrade.com" aria-label="Email" class="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} NursingHomeGrade.com. All rights reserved.</span>
        <nav class="footer-bottom-links" aria-label="Legal">
          <a href="/about" class="footer-bottom-link">Terms of Use</a>
          <a href="/about" class="footer-bottom-link">Privacy Policy</a>
          <a href="/about" class="footer-bottom-link">Data Sources</a>
        </nav>
      </div>
    </div>
  </footer>
  <script>
    (function() {
      // Basic interactivity
      document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function() {
          var btn = form.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.textContent = btn.getAttribute('data-loading-text') || 'Loading...';
          }
        });
      });
      
      // Location logic
      var geoBtn = document.getElementById('geo-btn');
      if (geoBtn && navigator.geolocation) {
        geoBtn.addEventListener('click', function() {
          geoBtn.disabled = true;
          geoBtn.textContent = 'Locating...';
          navigator.geolocation.getCurrentPosition(function(pos) {
            fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + pos.coords.latitude + '&longitude=' + pos.coords.longitude + '&localityLanguage=en')
              .then(function(r) { return r.json(); })
              .then(function(data) {
                var zip = data.postcode || '';
                if (zip) {
                  var input = document.querySelector('input[name="zip"]');
                  if (input) { input.value = zip; input.form.submit(); }
                } else {
                  geoBtn.textContent = 'Error';
                  setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use location'; }, 2000);
                }
              })
              .catch(function() {
                geoBtn.textContent = 'Failed';
                setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use location'; }, 2000);
              });
          }, function() {
            geoBtn.textContent = 'Denied';
            setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use location'; }, 2000);
          });
        });
      }

      window.toggleSave = function(id, name, grade, score) {
        var data = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
        var idx = data.findIndex(function(f) { return f.cms_id === id; });
        var btn = document.getElementById('save-' + id);
        if (idx > -1) {
          data.splice(idx, 1);
          if (btn) {
            btn.setAttribute('aria-pressed', 'false');
            var label = btn.querySelector('.compare-toggle-label');
            if (label) label.textContent = 'Compare';
          }
        } else {
          data.push({ cms_id: id, name: name, grade_letter: grade, grade_score: score });
          if (btn) {
            btn.setAttribute('aria-pressed', 'true');
            var label = btn.querySelector('.compare-toggle-label');
            if (label) label.textContent = 'Added';
          }
        }
        localStorage.setItem('nhg_saved_facilities', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
      };

      (function() {
        var saved = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
        saved.forEach(function(f) {
          var btn = document.getElementById('save-' + f.cms_id);
          if (btn) {
            btn.setAttribute('aria-pressed', 'true');
            var label = btn.querySelector('.compare-toggle-label');
            if (label) label.textContent = 'Added';
          }
        });
      })();
    })();
  </script>
  ${extraScripts || ""}
  <div id="comparison-bar" style="display:none; position:fixed; bottom:0; left:0; width:100%; background:var(--ink); color:#fff; padding:var(--space-s) var(--space-m); justify-content:space-between; align-items:center; z-index:1000; border-top: 4px solid var(--accent); box-shadow: 0 -4px 12px rgba(0,0,0,0.15);">
    <div id="comparison-count" style="font-weight:700;"></div>
    <a href="/compare" class="btn" style="background:#fff; color:var(--ink); border:none;">Compare <span id="compare-btn-count"></span> →</a>
  </div>
  <script>
    (function() {
      var bar = document.getElementById('comparison-bar');
      var count = document.getElementById('comparison-count');
      var btnCount = document.getElementById('compare-btn-count');
      function update() {
        var data = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
        if (data.length > 0 && window.location.pathname !== '/compare') {
          bar.style.display = 'flex';
          count.textContent = data.length + ' facility' + (data.length !== 1 ? 'ies' : 'y') + ' selected';
          if (btnCount) btnCount.textContent = '(' + data.length + ')';
        } else {
          bar.style.display = 'none';
        }
      }
      window.addEventListener('storage', update);
      update();
    })();
  </script>
  <script>
    (function() {
      if (!navigator.modelContext || typeof navigator.modelContext.provideContext !== "function") return;
      navigator.modelContext.provideContext({
        tools: [
          {
            name: "search_facilities",
            description: "Search for nursing home facilities by ZIP code. Returns facilities with grades, distances, and links.",
            inputSchema: {
              type: "object",
              properties: {
                zip: { type: "string", description: "5-digit US ZIP code" }
              },
              required: ["zip"]
            },
            execute: async function(input) {
              try {
                const res = await fetch("/search?zip=" + encodeURIComponent(input.zip));
                const html = await res.text();
                return { content: [{ type: "text", text: html }] };
              } catch (e) {
                return { content: [{ type: "text", text: "Error: " + (e instanceof Error ? e.message : String(e)) }] };
              }
            }
          },
          {
            name: "get_facility",
            description: "Get detailed information about a specific nursing home facility by its CMS ID.",
            inputSchema: {
              type: "object",
              properties: {
                cms_id: { type: "string", description: "CMS certification number (e.g., 015001)" }
              },
              required: ["cms_id"]
            },
            execute: async function(input) {
              try {
                const res = await fetch("/facility/" + encodeURIComponent(input.cms_id));
                const html = await res.text();
                return { content: [{ type: "text", text: html }] };
              } catch (e) {
                return { content: [{ type: "text", text: "Error: " + (e instanceof Error ? e.message : String(e)) }] };
              }
            }
          },
          {
            name: "compare_facilities",
            description: "Compare multiple nursing home facilities side by side by CMS ID.",
            inputSchema: {
              type: "object",
              properties: {
                ids: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of CMS facility IDs to compare"
                }
              },
              required: ["ids"]
            },
            execute: async function(input) {
              try {
                const res = await fetch("/api/compare?ids=" + input.ids.map(encodeURIComponent).join(","));
                const data = await res.json();
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
              } catch (e) {
                return { content: [{ type: "text", text: "Error: " + (e instanceof Error ? e.message : String(e)) }] };
              }
            }
          }
        ]
      });
    })();
  </script>
</body>
</html>`;
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
