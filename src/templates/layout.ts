export function layout(title: string, description: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231c1917'/%3E%3Ctext x='50' y='68' font-family='Georgia,serif' font-size='55' fill='%23f7f5f2' text-anchor='middle' font-weight='700'%3EN%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f7f5f2;
      --ink: #1c1917;
      --muted: #78716c;
      --rule: #e7e5e4;
      --accent: #9f1239;
      --accent-hover: #7f1d1d;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Source Sans 3', system-ui, sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.7;
      font-size: 1.0625rem;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 980px; margin: 0 auto; padding: 0 1.5rem; }

    /* Masthead */
    header { border-bottom: 1px solid var(--rule); padding: 1.25rem 0; }
    .masthead { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .masthead-name {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--ink);
      text-decoration: none;
      letter-spacing: -0.01em;
    }
    .masthead-tagline { font-size: 0.8rem; color: var(--muted); font-weight: 400; }

    /* Typography */
    .display {
      font-family: 'Newsreader', Georgia, serif;
      font-size: clamp(2.25rem, 5vw, 3.5rem);
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: 1.25rem;
    }
    h1, h2, h3 {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    h1 { font-size: clamp(1.75rem, 3.5vw, 2.5rem); margin-bottom: 1rem; }
    h2 { font-size: clamp(1.4rem, 2.5vw, 1.85rem); margin-bottom: 0.75rem; margin-top: 2rem; }
    h3 { font-size: clamp(1.15rem, 2vw, 1.35rem); margin-bottom: 0.5rem; margin-top: 1.5rem; }
    p { margin-bottom: 1rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Editorial components */
    .lede {
      font-family: 'Newsreader', Georgia, serif;
      font-size: clamp(1.15rem, 2vw, 1.35rem);
      line-height: 1.5;
      color: var(--ink);
      margin-bottom: 1.5rem;
      max-width: 640px;
    }
    .lede strong { font-weight: 700; }

    .pull-quote {
      border-left: 3px solid var(--accent);
      padding-left: 1.25rem;
      margin: 2rem 0;
      font-family: 'Newsreader', Georgia, serif;
      font-style: italic;
      font-size: 1.15rem;
      line-height: 1.5;
      color: var(--muted);
      max-width: 600px;
    }
    .pull-quote strong { font-style: normal; font-weight: 700; color: var(--ink); }

    /* Search bar */
    .search-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      max-width: 520px;
      margin-bottom: 2rem;
    }
    .search-bar input {
      flex: 1;
      min-width: 200px;
      padding: 0.85rem 1rem;
      border: 1px solid var(--rule);
      border-radius: 0;
      font-size: 1rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      background: #fff;
    }
    .search-bar input:focus { outline: 2px solid var(--accent); outline-offset: -2px; }
    .search-bar button {
      background: var(--ink);
      color: #fff;
      padding: 0.85rem 1.5rem;
      border: none;
      border-radius: 0;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      font-family: 'Source Sans 3', system-ui, sans-serif;
    }
    .search-bar button:hover { background: var(--accent); }

    /* Buttons */
    .btn {
      display: inline-block;
      background: var(--ink);
      color: #fff;
      padding: 0.6rem 1.25rem;
      border-radius: 0;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      border: none;
      cursor: pointer;
    }
    .btn:hover { background: var(--accent); color: #fff; text-decoration: none; }
    .btn-secondary {
      display: inline-block;
      color: var(--muted);
      padding: 0.6rem 0;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      background: none;
      border: none;
      cursor: pointer;
    }
    .btn-secondary:hover { color: var(--accent); text-decoration: underline; }
    .btn:disabled, .btn-loading { opacity: 0.7; cursor: wait; }

    /* Geolocation button */
    .geo-btn {
      background: #fff;
      color: var(--ink);
      border: 1px solid var(--rule);
      padding: 0.85rem 1rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .geo-btn:hover { background: var(--bg); }
    .geo-btn:disabled { opacity: 0.6; cursor: wait; }

    /* Grade colors */
    .grade-A { color: #2d5a3d; }
    .grade-B { color: #3d5a80; }
    .grade-C { color: #b48a3e; }
    .grade-D { color: #a65e3e; }
    .grade-F { color: #9e3a3a; }

    /* CTA box */
    .cta-box {
      background: #fff;
      border: 1px solid var(--rule);
      padding: 1.5rem;
      margin: 1.5rem 0;
    }

    /* Metrics */
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--rule);
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .metric-label { color: var(--muted); font-size: 0.95rem; }
    .metric-value { font-weight: 600; color: var(--ink); }

    /* Footer */
    footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding: 1.5rem 0; font-size: 0.875rem; color: var(--muted); }
    footer a { color: var(--muted); text-decoration: underline; }
    footer a:hover { color: var(--ink); }
    .footer-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem 1.5rem; }

    /* Breadcrumb */
    .breadcrumb { font-size: 0.875rem; color: var(--muted); margin-bottom: 1.5rem; }
    .breadcrumb a { color: var(--muted); }
    .breadcrumb a:hover { color: var(--ink); }
    .breadcrumb-sep { color: var(--rule); margin: 0 0.35rem; }

    /* Search results */
    .results-header { margin-bottom: 2rem; }
    .results-count { font-family: 'Newsreader', Georgia, serif; font-size: 1.25rem; font-weight: 600; color: var(--ink); margin-bottom: 0.75rem; }
    .results-controls { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
    .results-controls label { font-size: 0.875rem; color: var(--muted); display: flex; align-items: center; gap: 0.4rem; }
    .results-controls select {
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--rule);
      border-radius: 0;
      font-size: 0.875rem;
      background: #fff;
      cursor: pointer;
      font-family: 'Source Sans 3', system-ui, sans-serif;
    }

    .result-item {
      border-left: 3px solid var(--rule);
      padding: 1.25rem 1.25rem;
      margin-bottom: 0.75rem;
      background: #fff;
      transition: background 0.15s;
    }
    .result-item:hover { background: #fafafa; }
    .result-item-A { border-left-color: #2d5a3d; }
    .result-item-B { border-left-color: #3d5a80; }
    .result-item-C { border-left-color: #b48a3e; }
    .result-item-D { border-left-color: #a65e3e; }
    .result-item-F { border-left-color: #9e3a3a; }

    .result-main { display: flex; gap: 1.25rem; align-items: flex-start; }
    .result-grade { flex-shrink: 0; text-align: center; min-width: 3rem; }
    .result-grade-letter { font-size: 2rem; font-weight: 800; line-height: 1; display: block; }
    .result-grade-score { font-size: 0.75rem; color: var(--muted); font-weight: 600; margin-top: 0.25rem; display: block; }

    .result-info { flex: 1; min-width: 0; }
    .result-name {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--ink);
      text-decoration: none;
      display: block;
      margin-bottom: 0.25rem;
      line-height: 1.3;
    }
    .result-name:hover { text-decoration: underline; color: var(--accent); }
    .result-meta { font-size: 0.875rem; color: var(--muted); margin-bottom: 0.5rem; }
    .result-distance { font-size: 0.875rem; color: var(--accent); font-weight: 600; white-space: nowrap; }
    .result-stats { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.5rem; }
    .result-stat { display: flex; align-items: center; gap: 0.35rem; }
    .result-summary { font-size: 0.95rem; color: var(--ink); line-height: 1.5; font-family: 'Newsreader', Georgia, serif; font-style: italic; }

    @media (max-width: 768px) {
      .display { font-size: 2rem; }
      .result-main { gap: 1rem; }
      .cta-box { padding: 1.25rem; }
      .search-bar { max-width: 100%; }
    }
    @media (max-width: 480px) {
      .result-main { flex-direction: column; gap: 0.5rem; }
      .result-grade { display: flex; align-items: baseline; gap: 0.5rem; text-align: left; }
      .result-grade-score { margin-top: 0; }
      .result-distance { margin-top: 0.25rem; display: block; margin-left: 0 !important; }
      .results-controls { flex-direction: column; align-items: flex-start; }
      .masthead { flex-direction: column; align-items: flex-start; }
      .search-bar button, .search-bar .geo-btn { width: 100%; justify-content: center; }
      .footer-inner { flex-direction: column; }
    }

    @media print {
      header, footer, .search-bar, .cta-box, .breadcrumb, .btn, .btn-secondary, .geo-btn { display: none !important; }
      body { font-size: 11pt; line-height: 1.5; color: #000; background: #fff; }
      .result-item, .metric-row { break-inside: avoid; }
      a { text-decoration: none; color: #000; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="masthead">
        <a href="/" class="masthead-name">NursingHomeGrade</a>
        <span class="masthead-tagline">Independent ratings from CMS data</span>
      </div>
    </div>
  </header>
  <main class="container" style="padding-top:2.5rem; padding-bottom:2.5rem;">
    ${body}
  </main>
  <footer>
    <div class="container">
      <div class="footer-inner">
        <span>Data sourced from CMS Nursing Home Compare. Updated monthly.</span>
        <span>We do not accept commissions from facilities or referral networks. <a href="/about">About</a></span>
      </div>
    </div>
  </footer>
<script>
(function() {
  document.querySelectorAll('form').forEach(function(form) {
    form.addEventListener('submit', function() {
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = btn.dataset.loadingText || 'Loading...';
      }
    });
  });
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
              geoBtn.textContent = 'ZIP not found';
              setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use my location'; }, 2000);
            }
          })
          .catch(function() {
            geoBtn.textContent = 'Failed';
            setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use my location'; }, 2000);
          });
      }, function() {
        geoBtn.textContent = 'Denied';
        setTimeout(function() { geoBtn.disabled = false; geoBtn.textContent = 'Use my location'; }, 2000);
      });
    });
  }
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
