import { SITE_CSS_HREF } from "../styles";

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
  const resolvedOgImage = ogImage ?? "https://nursinghomegrade.com/og.png";
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
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@400;500;600;700;800&display=swap" onload="this.rel='stylesheet'">
  <noscript>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </noscript>
  <link rel="stylesheet" href="${SITE_CSS_HREF}">
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
          <button class="masthead-toggle" aria-label="Toggle menu" aria-expanded="false">
            <span class="masthead-toggle-bar"></span>
            <span class="masthead-toggle-bar"></span>
            <span class="masthead-toggle-bar"></span>
          </button>
          <div class="masthead-nav-links">
            <a href="/explore" class="masthead-nav-link">Find Facilities</a>
            <a href="/states" class="masthead-nav-link">Ratings</a>
            <a href="/compare" class="masthead-nav-link">Compare</a>
            <a href="/best" class="masthead-nav-link">Best</a>
            <a href="/worst" class="masthead-nav-link">Worst</a>
            <a href="/about" class="masthead-nav-link">About</a>
          </div>
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
          <a href="/compare" class="footer-link">Compare</a>
          <a href="/best" class="footer-link">Best</a>
          <a href="/worst" class="footer-link">Worst</a>
          <a href="/search" class="footer-link">Search</a>
        </nav>

        <nav class="footer-col" aria-label="Resources">
          <div class="footer-col-head">Resources</div>
          <a href="/how-we-grade" class="footer-link">How We Grade</a>
          <a href="/methodology" class="footer-link">Methodology</a>
          <a href="/best" class="footer-link">Best Facilities</a>
          <a href="/worst" class="footer-link">Worst Facilities</a>
          <a href="/reports/staffing-failures" class="footer-link">Staffing Report</a>
          <a href="/reports/staffing-standard-repeal" class="footer-link">The Repealed Staffing Rule</a>
          <a href="/reports/uncorrected-deficiencies" class="footer-link">Uncorrected Deficiencies</a>
        </nav>

        <nav class="footer-col" aria-label="Company">
          <div class="footer-col-head">Company</div>
          <a href="/about" class="footer-link">About Us</a>
          <a href="/faq" class="footer-link">FAQ</a>
          <a href="/contact" class="footer-link">Contact</a>
          <a href="/glossary" class="footer-link">Glossary</a>
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
          <a href="/terms" class="footer-bottom-link">Terms of Use</a>
          <a href="/privacy" class="footer-bottom-link">Privacy Policy</a>
          <a href="/data-sources" class="footer-bottom-link">Data Sources</a>
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

      // Mobile hamburger toggle
      var toggle = document.querySelector('.masthead-toggle');
      var nav = document.querySelector('.masthead-nav');
      if (toggle && nav) {
        toggle.addEventListener('click', function() {
          var open = nav.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', open);
        });
        // Close menu when clicking a nav link
        nav.querySelectorAll('.masthead-nav-link').forEach(function(link) {
          link.addEventListener('click', function() {
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
          });
        });
      }
      
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
    <div style="display:flex; align-items:center; gap:var(--space-s);">
      <div id="comparison-count" style="font-weight:700;"></div>
      <button id="comparison-clear" style="background:none; border:none; color:rgba(255,255,255,0.6); font-family:'Inter',system-ui,sans-serif; font-size:0.8rem; cursor:pointer; padding:0; text-decoration:underline;">Clear all</button>
    </div>
    <a href="/compare" class="btn" style="background:#fff; color:var(--ink); border:none;">Compare <span id="compare-btn-count"></span> →</a>
  </div>
  <script>
    (function() {
      var bar = document.getElementById('comparison-bar');
      var count = document.getElementById('comparison-count');
      var btnCount = document.getElementById('compare-btn-count');
      var clearBtn = document.getElementById('comparison-clear');
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
      clearBtn.addEventListener('click', function() {
        localStorage.removeItem('nhg_saved_facilities');
        document.querySelectorAll('[id^="save-"]').forEach(function(btn) {
          btn.setAttribute('aria-pressed', 'false');
          var label = btn.querySelector('.compare-toggle-label');
          if (label) label.textContent = 'Compare';
        });
        update();
      });
      window.addEventListener('storage', update);
      update();
    })();
  </script>
  <script>
    // WebMCP — Expose site tools to AI agents via navigator.modelContext
    (function() {
      if (!navigator.modelContext || !navigator.modelContext.registerTool) return;

      var controller = new AbortController();
      var signal = controller.signal;

      // Search facilities by ZIP code
      if (document.querySelector('input[name="zip"]')) {
        navigator.modelContext.registerTool({
          name: "search_facilities",
          description: "Search nursing homes by ZIP code and return quality grades, staffing data, and deficiency reports.",
          inputSchema: {
            type: "object",
            properties: {
              zip: { type: "string", description: "5-digit US ZIP code" },
              sort: { type: "string", enum: ["grade", "distance", "name"], description: "Sort order (default: grade)" },
              min_grade: { type: "string", enum: ["A", "B", "C", "D", "F"], description: "Minimum grade filter" },
            },
            required: ["zip"],
          },
          execute: function(params) {
            var url = "/search?zip=" + encodeURIComponent(params.zip);
            if (params.sort) url += "&sort=" + encodeURIComponent(params.sort);
            if (params.min_grade) url += "&min_grade=" + encodeURIComponent(params.min_grade);
            window.location.href = url;
            return Promise.resolve({ navigated: url });
          },
        }, { signal: signal });
      }

      // Navigate to facility detail page
      if (window.location.pathname === "/" || window.location.pathname === "/search" || window.location.pathname === "/explore") {
        navigator.modelContext.registerTool({
          name: "get_facility",
          description: "View detailed information about a specific nursing home including grades, staffing data, and deficiency history.",
          inputSchema: {
            type: "object",
            properties: {
              facility_id: { type: "string", description: "CMS certification number (CCN) or facility slug from the URL" },
            },
            required: ["facility_id"],
          },
          execute: function(params) {
            window.location.href = "/facility/" + encodeURIComponent(params.facility_id);
            return Promise.resolve({ navigated: "/facility/" + params.facility_id });
          },
        }, { signal: signal });
      }

      // Compare facilities
      if (window.location.pathname === "/compare" || window.location.pathname === "/" || window.location.pathname === "/search") {
        navigator.modelContext.registerTool({
          name: "compare_facilities",
          description: "Compare multiple nursing homes side-by-side on grades, staffing, inspection results, and deficiency data.",
          inputSchema: {
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "string" }, description: "Array of facility CCNs to compare (max 5)" },
            },
            required: ["ids"],
          },
          execute: function(params) {
            var ids = params.ids.slice(0, 5).join(",");
            window.location.href = "/compare?ids=" + encodeURIComponent(ids);
            return Promise.resolve({ navigated: "/compare?ids=" + ids });
          },
        }, { signal: signal });
      }

      // Navigate to state rankings
      navigator.modelContext.registerTool({
        name: "get_state_rankings",
        description: "Browse nursing home quality rankings and statistics for a specific state.",
        inputSchema: {
          type: "object",
          properties: {
            state: { type: "string", description: "Two-letter US state abbreviation (e.g., CA, TX, FL)" },
          },
          required: ["state"],
        },
        execute: function(params) {
          window.location.href = "/state/" + encodeURIComponent(params.state.toLowerCase());
          return Promise.resolve({ navigated: "/state/" + params.state.toLowerCase() });
        },
      }, { signal: signal });

      // Navigate to any page
      navigator.modelContext.registerTool({
        name: "navigate",
        description: "Navigate to any page on NursingHomeGrade.com, including home, about, reports, operator pages, and search.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "URL path on nursinghomegrade.com (e.g., /about, /best, /reports/staffing-failures)" },
          },
          required: ["path"],
        },
        execute: function(params) {
          window.location.href = params.path.startsWith("/") ? params.path : "/" + params.path;
          return Promise.resolve({ navigated: params.path });
        },
      }, { signal: signal });
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
