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
  const noindexTag = noindex
    ? `<meta name="robots" content="noindex, follow">`
    : "";
  const ogUrl = canonicalUrl ?? "https://nursinghomegrade.com";
  const ogImageTag = ogImage
    ? `<meta property="og:image" content="${escHtml(ogImage)}"><meta name="twitter:image" content="${escHtml(ogImage)}">`
    : "";
  const twitterCard = ogImage ? "summary_large_image" : "summary";
  const ogTags = `
    <meta property="og:title" content="${escHtml(title)}">
    <meta property="og:description" content="${escHtml(description)}">
    <meta property="og:url" content="${escHtml(ogUrl)}">
    <meta property="og:type" content="${escHtml(ogType)}">
    ${ogImageTag}
    <meta name="twitter:card" content="${twitterCard}">
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
  ${noindexTag}
  ${ogTags}
  ${jsonLdTags}
  ${extraHead || ""}
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='16' fill='%231c1917'/%3E%3Ctext x='50' y='38' font-family='Arial,system-ui,sans-serif' font-size='26' fill='%23f7f5f2' text-anchor='middle' font-weight='800' letter-spacing='-1'%3ENHG%3C/text%3E%3Crect x='14' y='48' width='72' height='7' rx='2' fill='%23f7f5f2'/%3E%3Crect x='14' y='59' width='50' height='7' rx='2' fill='%23f7f5f2' opacity='0.5'/%3E%3Crect x='14' y='70' width='62' height='7' rx='2' fill='%23f7f5f2' opacity='0.25'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Base Colors (OKLCH for perceptual uniformity) */
      --bg: oklch(97% 0.01 60);       /* Warm paper white */
      --ink: oklch(15% 0.01 60);      /* Deep ink black */
      --muted: oklch(55% 0.01 60);    /* Soft slate gray */
      --rule: oklch(92% 0.01 60);     /* Light paper rule */
      --accent: oklch(45% 0.15 25);   /* Authoritative burgundy */
      --accent-hover: oklch(35% 0.15 25);

      /* Grade Palette */
      --grade-A: oklch(50% 0.12 150); /* Credible green */
      --grade-B: oklch(50% 0.12 250); /* Stable blue */
      --grade-C: oklch(70% 0.15 80);  /* Warning gold */
      --grade-D: oklch(60% 0.15 45);  /* Danger orange */
      --grade-F: oklch(50% 0.2 25);   /* Alarm red */

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

    /* Masthead */
    header { border-bottom: 2px solid var(--ink); padding: var(--space-m) 0; }
    .masthead { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: var(--space-xs); }
    .masthead-name {
      font-family: 'Newsreader', Georgia, serif;
      font-size: clamp(1.2rem, 5vw, 1.6rem);
      font-weight: 800;
      color: var(--ink);
      text-decoration: none;
      letter-spacing: 0;
      text-transform: uppercase;
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      gap: 0.4em;
    }
    .masthead-mark {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      height: 1.1em;
      width: auto;
    }
    .masthead-tagline { 
      font-size: 0.75rem; 
      color: var(--muted); 
      font-weight: 700; 
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    /* Typography */
    .display {
      font-family: 'Newsreader', Georgia, serif;
      font-size: clamp(3rem, 10vw, 5.5rem);
      font-weight: 800;
      line-height: 0.9;
      letter-spacing: 0;
      margin-bottom: var(--space-l);
      color: var(--ink);
    }
    h1, h2, h3 {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: 0;
    }
    h1 { font-size: clamp(2.25rem, 6vw, 3.5rem); margin-bottom: var(--space-m); }
    h2 { font-size: clamp(1.6rem, 4vw, 2.25rem); margin-bottom: var(--space-s); margin-top: var(--space-2xl); border-top: 1px solid var(--rule); padding-top: var(--space-m); }
    h3 { font-size: clamp(1.25rem, 3vw, 1.5rem); margin-bottom: var(--space-xs); margin-top: var(--space-l); }
    p { margin-bottom: var(--space-s); }
    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s ease; }
    a:hover { border-bottom-color: var(--accent); text-decoration: none; }

    /* Editorial components */
    .lede {
      font-family: 'Newsreader', Georgia, serif;
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
      font-family: 'Newsreader', Georgia, serif;
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
    .search-bar input:focus { outline: none; background: var(--bg); }
    .search-bar button {
      background: var(--ink);
      color: #fff;
      padding: var(--space-s) var(--space-l);
      border: 2px solid var(--ink);
      border-radius: 0;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.125rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      transition: background 0.2s ease-out, color 0.2s ease-out;
    }
    .search-bar button:hover { background: var(--bg); color: var(--ink); }
    .search-bar .geo-btn {
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

    /* Grade colors */
    .grade-A { color: var(--grade-A); }
    .grade-B { color: var(--grade-B); }
    .grade-C { color: var(--grade-C); }
    .grade-D { color: var(--grade-D); }
    .grade-F { color: var(--grade-F); }

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
    .cta-box p { color: oklch(90% 0.01 60); margin-bottom: var(--space-m); }
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
    .metric-value { font-family: 'Newsreader', serif; font-size: 1.25rem; font-weight: 700; }

    /* Footer */
    footer { border-top: 2px solid var(--ink); margin-top: var(--space-3xl); padding: var(--space-xl) 0; font-size: 0.9rem; }
    .footer-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-l); }

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
      font-family: 'Newsreader', Georgia, serif;
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
      font-family: 'Source Sans 3', sans-serif;
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
      font-family: 'Newsreader', Georgia, serif;
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
    .result-stat-value { font-family: 'Newsreader', serif; font-size: 1.25rem; font-weight: 700; }
    .result-summary { font-family: 'Newsreader', serif; font-style: italic; font-size: 1.25rem; line-height: 1.4; color: var(--ink); }

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
    .snapshot-value { font-size: 1.25rem; font-weight: 700; line-height: 1.2; font-family: 'Newsreader', serif; }

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
      font-family: 'Newsreader', serif;
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
      font-family: 'Newsreader', serif;
      font-size: 1.05rem;
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
      .search-bar button { border-top: none; }
      .search-bar .geo-btn { border-left: 2px solid var(--ink); border-top: none; }
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
  <header>
    <div class="container">
      <div class="masthead">
        <div>
          <a href="/" class="masthead-name"><span class="masthead-mark" aria-hidden="true"><svg viewBox="0 0 44 36" height="100%" preserveAspectRatio="xMidYMid meet"><text x="0" y="14" fill="currentColor" font-family="Arial,system-ui,sans-serif" font-size="16" font-weight="800" letter-spacing="-0.5">NHG</text><rect x="0" y="19" width="32" height="4" rx="1" fill="currentColor"/><rect x="0" y="25" width="22" height="4" rx="1" fill="currentColor" opacity="0.5"/><rect x="0" y="31" width="27" height="4" rx="1" fill="currentColor" opacity="0.3"/></svg></span>NursingHomeGrade</a>
          <span class="masthead-tagline">Independent ratings from CMS data</span>
        </div>
        <nav style="display:flex; gap:var(--space-m); font-weight:700; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.05em;">
          <a href="/explore" style="color:var(--ink); border:none;">Explore Map</a>
          <a href="/states" style="color:var(--ink); border:none;">By State</a>
          <a href="/about" style="color:var(--ink); border:none;">About</a>
        </nav>
      </div>
    </div>
  </header>
  <main class="container" style="padding-top: var(--space-xl); padding-bottom: var(--space-xl);">
    ${body}
  </main>
  <footer>
    <div class="container">
      <div class="footer-inner">
        <div>
          <div style="display:flex;align-items:center;gap:0.4em;margin-bottom:var(--space-s);"><span aria-hidden="true" style="display:inline-flex;height:1.2em;width:auto;"><svg viewBox="0 0 44 36" height="100%" preserveAspectRatio="xMidYMid meet"><text x="0" y="14" fill="currentColor" font-family="Arial,system-ui,sans-serif" font-size="16" font-weight="800" letter-spacing="-0.5">NHG</text><rect x="0" y="19" width="32" height="4" rx="1" fill="currentColor"/><rect x="0" y="25" width="22" height="4" rx="1" fill="currentColor" opacity="0.5"/><rect x="0" y="31" width="27" height="4" rx="1" fill="currentColor" opacity="0.3"/></svg></span><span style="font-weight:800;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.1em;color:var(--ink);">NursingHomeGrade</span></div>
          <p style="color:var(--muted);font-size:0.95rem;line-height:1.5;">Independent ratings sourced from federal CMS Nursing Home Compare data. Updated monthly. We accept no payments from facilities.</p>
        </div>
        <div>
          <div style="font-weight:800;text-transform:uppercase;font-size:0.8rem;letter-spacing:0.1em;margin-bottom:var(--space-s);color:var(--ink);">Integrity</div>
          <p style="color:var(--muted);font-size:0.95rem;line-height:1.5;">Referral relationships never affect grades. <a href="/about">Learn more about our methodology</a>.</p>
        </div>
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
            btn.textContent = 'Loading...';
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
    })();
  </script>
  ${extraScripts || ""}
  <div id="comparison-bar" style="display:none; position:fixed; bottom:0; left:0; width:100%; background:var(--ink); color:#fff; padding:var(--space-s) var(--space-m); justify-content:space-between; align-items:center; z-index:1000;">
    <div id="comparison-count" style="font-weight:700;"></div>
    <a href="/compare" class="btn" style="background:#fff; color:var(--ink); border:none;">Compare Selected →</a>
  </div>
  <script>
    (function() {
      const bar = document.getElementById('comparison-bar');
      const count = document.getElementById('comparison-count');
      
      function update() {
        const data = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');
        if (data.length > 0) {
          bar.style.display = 'flex';
          count.textContent = data.length + ' facilities selected';
        } else {
          bar.style.display = 'none';
        }
      }
      
      window.addEventListener('storage', update);
      update();
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
