import { SITE_CSS_HREF } from "../styles";
import { wordmark } from "./components";
import { icon } from "./icons";
export { escHtml } from "./escape";
import { escHtml } from "./escape";

export interface LayoutOptions {
  canonicalPath?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object[];
  extraHead?: string;
  extraScripts?: string;
  /** Render <main> without the centred container so the page can supply full-width bands (each band brings its own .container). */
  bare?: boolean;
}

export function layout(
  title: string,
  description: string,
  body: string,
  options: LayoutOptions = {},
): string {
  const { canonicalPath, noindex, ogType = "website", ogImage, jsonLd, extraHead, extraScripts, bare } = options;
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
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#0B1D33">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" onload="this.rel='stylesheet'">
  <noscript>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  </noscript>
  <link rel="stylesheet" href="${SITE_CSS_HREF}">
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="site-header">
    <div class="container">
      <div class="masthead">
        <a href="/" class="brand" aria-label="NursingHomeGrade.com — home">
          ${wordmark()}
        </a>
        <nav class="masthead-nav" aria-label="Main navigation">
          <button class="masthead-toggle" type="button" aria-label="Toggle menu" aria-expanded="false" aria-controls="masthead-panel">
            <span class="masthead-toggle-bar"></span>
            <span class="masthead-toggle-bar"></span>
            <span class="masthead-toggle-bar"></span>
          </button>
          <div class="masthead-panel" id="masthead-panel">
            <a href="/explore" class="masthead-nav-link">Find Facilities</a>
            <a href="/states" class="masthead-nav-link">States</a>
            <a href="/best" class="masthead-nav-link">Best</a>
            <a href="/worst" class="masthead-nav-link">Worst</a>
            <a href="/compare" class="masthead-nav-link">Compare</a>
            <a href="/how-we-grade" class="masthead-nav-link">How We Grade</a>
            <a href="/search" class="masthead-search-btn">Search</a>
          </div>
        </nav>
      </div>
    </div>
  </header>
  <main id="main-content" class="${bare ? "site-main site-main--bare" : "container site-main"}">
    ${body}
  </main>
  <footer>
    <div class="container">
      <div class="footer-upper">
        <div class="footer-brand">
          <a href="/" class="footer-lockup" aria-label="NursingHomeGrade.com — home">
            ${wordmark()}
          </a>
          <p class="footer-tagline">Independent ratings of nursing homes using official CMS data. No facility payments. No conflicts of interest.</p>
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

        <div class="footer-col footer-newsletter">
          <div class="footer-col-head">Stay Informed</div>
          <p class="footer-newsletter-desc">Get updates on ratings, data releases, and important news.</p>
          <form action="/subscribe" method="POST" class="footer-newsletter-form">
            <input type="hidden" name="facility_name" value="newsletter">
            <label for="footer-email" class="visually-hidden">Email address</label>
            <input type="email" id="footer-email" name="email" placeholder="Enter your email" required autocomplete="email" class="footer-newsletter-input">
            <button type="submit" class="footer-newsletter-btn">Subscribe</button>
          </form>
          <div class="footer-social">
            <a href="https://twitter.com/nursinghomegrade" rel="noopener" aria-label="Twitter/X" class="footer-social-link">${icon("twitter-x", { size: 18 })}</a>
            <a href="https://linkedin.com/company/nursinghomegrade" rel="noopener" aria-label="LinkedIn" class="footer-social-link">${icon("linkedin", { size: 18 })}</a>
            <a href="mailto:info@nursinghomegrade.com" aria-label="Email" class="footer-social-link">${icon("mail", { size: 18 })}</a>
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
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
          }
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
  <div id="comparison-bar">
    <div class="comparison-bar-info">
      <div id="comparison-count"></div>
      <button id="comparison-clear" type="button">Clear all</button>
    </div>
    <a href="/compare" class="btn">Compare <span id="compare-btn-count"></span> →</a>
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
          count.textContent = data.length + (data.length === 1 ? ' facility' : ' facilities') + ' selected';
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
