# NursingHomeGrade.com — Comprehensive Implementation Plan

## Document Purpose

This plan translates the strategic analysis into **executable tasks** that can be handed to a frontend developer, content writer, SEO specialist, or product manager. Every task includes: what to do, why it matters, where it lives, how to verify it's done, and what depends on it.

**Estimated total effort**: 8–12 weeks for P0–P1 items; P2 items are ongoing.

---

## Phase Overview

| Phase | Focus | Duration | Owner |
|---|---|---|---|
| **Phase 0** | Foundation & Technical SEO | Weeks 1–2 | Developer |
| **Phase 1** | Content Core (Guides, FAQ, Glossary) | Weeks 2–4 | Content + Developer |
| **Phase 2** | State Page Expansion & Local SEO | Weeks 3–5 | Content + SEO |
| **Phase 3** | Product Features & UX | Weeks 4–7 | Developer |
| **Phase 4** | Content Engine & Blog | Weeks 5–10 | Content (ongoing) |
| **Phase 5** | Outreach & Distribution | Weeks 6–12 | Marketing/PR |

*Note: Phases 1–3 can run in parallel. Phase 4 depends on Phase 1 completion. Phase 5 depends on Phases 1–2 having shipped content.*

---

## Phase 0: Foundation & Technical SEO (Weeks 1–2)

These are blocking fixes that must be completed before any content or SEO work can be fully effective.

### P0-FIX-01: Fix Broken Footer Links

| Attribute | Detail |
|---|---|
| **What** | The footer currently links to FAQ, Glossary, Methodology, and Contact pages that do not exist or redirect generically to `/about`. Create standalone, properly routed pages for each. |
| **Why** | Footer links to 404s or wrong destinations hurt crawlability, user trust, and SEO. These pages are also high-intent content destinations. |
| **Where** | New files: `/faq`, `/glossary`, `/methodology`, `/contact` |
| **How** | Create four new route/page files. Do NOT redirect them all to `/about`. Each should be a dedicated page with unique content (see content tasks below for what goes on each). |
| **Acceptance** | Each footer link navigates to a unique URL with unique `<title>` and `<h1>` content. No redirect chains. |
| **Effort** | 2–4 hours |
| **Depends on** | None |

### P0-FIX-02: Implement XML Sitemap

| Attribute | Detail |
|---|---|
| **What** | Generate and serve a dynamic XML sitemap at `/sitemap.xml` that includes: homepage, all state pages, all city/metro pages, all facility pages, and all static content pages (about, FAQ, glossary, methodology, contact, blog posts, guides). |
| **Why** | 15,000+ facility pages will never rank if Google can't discover them. Current site has no sitemap. |
| **Where** | `/sitemap.xml` (or `/sitemap-index.xml` with split sitemaps if >50,000 URLs) |
| **How** | If using a static site generator, generate at build time. If dynamic, create a sitemap endpoint that queries the facility database and outputs XML. Include `<lastmod>` dates (use CMS data update date for facility pages). Set `<changefreq>` to `monthly` for facility pages, `weekly` for blog posts. |
| **Acceptance** | Sitemap passes validation at `https://validator.w3.org/` (XML well-formedness). Sitemap is referenced in `robots.txt`. Sitemap submitted to Google Search Console. |
| **Effort** | 3–6 hours |
| **Depends on** | None |

### P0-FIX-03: Add Sitemap Reference to robots.txt

| Attribute | Detail |
|---|---|
| **What** | Ensure `robots.txt` includes `Sitemap: https://nursinghomegrade.com/sitemap.xml` |
| **Why** | Tells crawlers where to find the sitemap. Basic SEO hygiene. |
| **Where** | `/robots.txt` |
| **How** | Single line addition. Ensure no `Disallow: /` rules block facility pages or state pages. |
| **Acceptance** | `curl https://nursinghomegrade.com/robots.txt` returns sitemap reference. Google Search Console "robots.txt" report shows no blocked critical paths. |
| **Effort** | 15 minutes |
| **Depends on** | P0-FIX-02 |

### P0-FIX-04: Implement Schema.org Structured Data on Facility Pages

| Attribute | Detail |
|---|---|
| **What** | Add JSON-LD structured data to every facility detail page including: `LocalBusiness` (or `MedicalBusiness`), `AggregateRating` (for the NursingHomeGrade Score), and `BreadcrumbList`. |
| **Why** | Enables rich snippets (star ratings, review counts) in Google search results. Dramatically improves click-through rate. Currently zero structured data on the site. |
| **Where** | `<script type="application/ld+json">` in `<head>` of every facility page template |
| **How** | Implement the following schemas (example for facility "White Oak Manor"): |

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalBusiness",
      "name": "White Oak Manor",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "jest_mp_gutter_7217",
        "addressLocality": "Charlotte",
        "addressRegion": "NC",
        "postalCode": "jest_mp_gutter_5128",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "35.2087",
        "longitude": "-80.8308"
      },
      "telephone": "+1-704-333-9699",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "59",
        "bestRating": "100",
        "worstRating": "0",
        "ratingCount": "1",
        "reviewCount": "1"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://nursinghomegrade.com/"},
        {"@type": "ListItem", "position": 2, "name": "North Carolina", "item": "https://nursinghomegrade.com/state/north-carolina"},
        {"@type": "ListItem", "position": 3, "name": "Charlotte", "item": "https://nursinghomegrade.com/state/north-carolina/charlotte"},
        {"@type": "ListItem", "position": 4, "name": "White Oak Manor"}
      ]
    }
  ]
}
```

| **Acceptance** | Google Rich Results Test (https://search.google.com/test/rich-results) passes for a sample facility page with zero errors. `AggregateRating` schema is detected. BreadcrumbList renders correctly. |
| **Effort** | 4–6 hours |
| **Depends on** | None |

### P0-FIX-05: Implement Schema.org on Content Pages

| Attribute | Detail |
|---|---|
| **What** | Add `FAQPage` schema to `/faq`, `Article` or `HowTo` schema to blog posts and guides, and `BreadcrumbList` to all content pages. |
| **Why** | FAQ schema can produce rich accordion snippets in search results. HowTo schema enables step-by-step rich snippets. These capture more SERP real estate. |
| **Where** | All static content page templates |
| **How** | FAQPage schema wraps each Q&A pair. Article schema includes `headline`, `author`, `datePublished`, `dateModified`. |
| **Acceptance** | Rich Results Test passes for `/faq` with FAQPage schema detected. Article schema passes on first blog post. |
| **Effort** | 3–4 hours |
| **Depends on** | P1-CONTENT-01 (FAQ page content exists) |

### P0-FIX-06: Optimize Title Tags Across All Page Types

| Attribute | Detail |
|---|---|
| **What** | Implement a `<title>` tag template system for each page type. |
| **Why** | Current titles may be generic or auto-generated. Optimized titles are the #1 on-page SEO factor for click-through rate. |
| **Where** | Global `<title>` template in page/head component |
| **How** | Use these templates: |

| Page Type | Title Template | Example |
|---|---|---|
| Homepage | `NursingHomeGrade — Independent Nursing Home Ratings (No Commissions)` | — |
| Facility | `[Facility Name] — [City], [State] — NursingHomeGrade Score [Score]/100` | `White Oak Manor — Charlotte, NC — NursingHomeGrade Score 59/100` |
| State | `Nursing Home Ratings in [State] — Find the Best Facilities` | `Nursing Home Ratings in Texas — Find the Best Facilities` |
| City/Metro | `Best Nursing Homes in [City], [State] — Ratings & Grades` | `Best Nursing Homes in Charlotte, NC — Ratings & Grades` |
| About | `About NursingHomeGrade — How We Rate Facilities` | — |
| FAQ | `Nursing Home Ratings FAQ — NursingHomeGrade` | — |
| Blog Post | `[Post Title] — NursingHomeGrade` | `How to Choose a Nursing Home: A Complete Guide — NursingHomeGrade` |

| **Acceptance** | Screaming Frog or manual check of 10 random facility pages, 3 state pages, and homepage shows correct title format. Titles are under 60 characters (or truncated gracefully). |
| **Effort** | 2–3 hours |
| **Depends on** | None |

### P0-FIX-07: Optimize Meta Descriptions

| Attribute | Detail |
|---|---|
| **What** | Implement dynamic `<meta name="description">` tags for all page types. Facility pages should highlight the most salient finding. |
| **Why** | Meta descriptions directly influence click-through rate from SERPs. NursingHomeGrade currently may not have optimized descriptions. |
| **Where** | Global meta tag template |
| **How** | Use these templates: |

| Page Type | Description Template | Max Length |
|---|---|---|
| Homepage | `Independent nursing home grades for 15,000+ U.S. facilities. No facility payments, no commissions — just honest data from CMS. Search by ZIP code or state.` | 155 |
| Facility (passing) | `[Facility Name] scores [Score]/100 ([Grade]) — exceeds staffing minimum with [Deficiency Count] deficiencies over 3 years. Compare with nearby facilities.` | 155 |
| Facility (failing) | `[Facility Name] scores [Score]/100 ([Grade]) — fails the RN staffing minimum with [Deficiency Count] deficiencies over 3 years. See alternatives nearby.` | 155 |
| State | `Find nursing home grades for all [Count] facilities in [State]. Independent ratings based on CMS data — staffing, inspections, and quality measures.` | 155 |
| Blog/Guide | `[First 140 chars of post summary]... — NursingHomeGrade.` | 155 |

| **Acceptance** | 10 random facility pages have unique, compelling meta descriptions under 155 characters. Descriptions for failing facilities include a warning/cautionary framing. |
| **Effort** | 2–3 hours |
| **Depends on** | P0-FIX-06 |

### P0-FIX-08: Add Canonical Tags

| Attribute | Detail |
|---|---|
| **What** | Add `<link rel="canonical">` to every page pointing to its preferred URL. |
| **Why** | Prevents duplicate content issues from URL parameters (e.g., `?sort=score`, `?page=2`). |
| **Where** | All page templates |
| **How** | Self-referencing canonical on every page. Strip query parameters. |
| **Acceptance** | Canonical tag present on homepage, facility pages, and state pages. Points to clean URL without parameters. |
| **Effort** | 1 hour |
| **Depends on** | None |

### P0-FIX-09: Methodology Page Redesign

| Attribute | Detail |
|---|---|
| **What** | The current `/about` page combines About + Methodology. Extract methodology content into a dedicated `/methodology` page with clearer visual hierarchy, a scoring breakdown table, and a downloadable PDF version. |
| **Why** | The methodology is the site's credibility backbone. It deserves its own page with better formatting. The PDF is a trust signal and linkable asset. |
| **Where** | New file: `/methodology` + downloadable PDF |
| **How** | Create a page with: scoring formula visualization (35/30/20/15 pie chart), plain-language explanation of each component, data source citation, update frequency disclosure, and a "Download as PDF" button. The PDF should be 1–2 pages, professionally formatted, with NursingHomeGrade branding. |
| **Acceptance** | `/methodology` has unique content not duplicated on `/about`. PDF downloads successfully. Page has its own `<title>` and `<h1>`. |
| **Effort** | 6–8 hours |
| **Depends on** | P0-FIX-01 |

---

## Phase 1: Content Core (Weeks 2–4)

These content assets establish NursingHomeGrade as an authority and capture upper-funnel search traffic.

### P1-CONTENT-01: Create FAQ Page

| Attribute | Detail |
|---|---|
| **What** | Build a comprehensive FAQ page with 15–20 questions organized into 4 categories. |
| **Why** | Currently linked in footer but does not exist. FAQ pages capture featured snippets and address common objections. |
| **Where** | `/faq` |
| **Content** | **Category: About Our Ratings** (5 questions): How is the NursingHomeGrade Score calculated? What's the difference between NursingHomeGrade and CMS star ratings? How often is your data updated? Where does your data come from? Does NursingHomeGrade accept payments from nursing homes? **Category: Understanding the Data** (5 questions): What does "immediate jeopardy" mean? What are health inspection deficiencies? What is RN hours per resident day (HPRD)? What happened to the CMS staffing rule? Why does a facility with 5 CMS stars have a low NursingHomeGrade score? **Category: Using the Site** (4 questions): How do I compare multiple facilities? Can I get alerts when a facility's score changes? How do I search for facilities near me? What's the difference between the map and the list view? **Category: For Families** (4 questions): Should I visit a facility before deciding? What questions should I ask during a visit? Does NursingHomeGrade recommend specific facilities? How can I file a complaint about a nursing home? |
| **Format** | Each Q should be an `<h3>` or accordion component. Implement `FAQPage` schema (see P0-FIX-05). |
| **Acceptance** | All 18+ questions answered in 40–80 words each. FAQPage schema validates. Page ranks for "nursing home ratings FAQ" within 60 days. |
| **Effort** | 6–8 hours (writing + page creation) |
| **Depends on** | P0-FIX-01 (page route exists) |

### P1-CONTENT-02: Create Glossary Page

| Attribute | Detail |
|---|---|
| **What** | Build a glossary of 25–30 CMS and nursing home terms that confuse families. |
| **Why** | CMS jargon is a major barrier for families. A glossary page captures featured snippets for definition queries and establishes authority. |
| **Where** | `/glossary` |
| **Content** | Terms to define: Hours Per Resident Day (HPRD), Registered Nurse (RN), Licensed Practical Nurse (LPN), Certified Nursing Assistant (CNA), Deficiency (F-tag), Scope and Severity, Immediate Jeopardy, Actual Harm, Potential for Harm, No Harm, Isolated, Pattern, Widespread, Special Focus Facility (SFF), Skilled Nursing Facility (SNF), Long-Term Care, Short-Stay Rehabilitation, Quality Measures, Minimum Data Set (MDS), Payroll-Based Journal (PBJ), Five-Star Quality Rating System, Health Inspection, Staffing Rating, Quality Measure Rating, Overall Rating, For-Profit vs Non-Profit, Chain-Affiliated, Medicaid, Medicare Part A, Ombudsman. |
| **Format** | Alphabetical list with jump links (A–Z anchor navigation). Each term is an `<h3>` with a 2–4 sentence definition in plain language. |
| **Acceptance** | All 25+ terms defined. Average definition length 30–50 words. A–Z navigation works. Page ranks for "nursing home terms glossary" within 60 days. |
| **Effort** | 6–8 hours |
| **Depends on** | P0-FIX-01 |

### P1-CONTENT-03: Create "How to Choose a Nursing Home" Guide

| Attribute | Detail |
|---|---|
| **What** | A comprehensive, step-by-step guide (2,500–3,500 words) for families in the awareness/research phase. |
| **Why** | This is one of the highest-volume informational queries in the nursing home space. NursingHomeGrade currently captures zero upper-funnel traffic. Competitors (A Place for Mom, U.S. News) dominate this query. |
| **Where** | `/guides/how-to-choose-a-nursing-home` |
| **Structure** | **H1**: How to Choose a Nursing Home: A Complete Guide for Families **H2**: When Is It Time to Consider a Nursing Home? **H2**: Understanding Your Options (SNF vs. assisted living vs. memory care) **H2**: How to Use Nursing Home Ratings **H3**: Understanding CMS Five-Star Ratings **H3**: How NursingHomeGrade's Independent Grades Work **H2**: Step-by-Step: Finding and Evaluating Facilities **H3**: Step 1: Search by Location **H3**: Step 2: Check the Grade and Score **H3**: Step 3: Review Inspection Deficiencies **H3**: Step 4: Compare Staffing Levels **H3**: Step 5: Visit the Facility (downloadable checklist) **H2**: Red Flags to Watch For **H2**: Understanding Costs and Payment Options **H2**: Next Steps: Making Your Decision **CTA**: Search for nursing homes in your area |
| **SEO** | Target primary keyword: "how to choose a nursing home". Include related terms: "nursing home selection guide", "finding a nursing home", "nursing home checklist". Implement `HowTo` schema on the step-by-step section. |
| **Acceptance** | Word count 2,500+. HowTo schema validates. Internal links to 3–5 state pages and the FAQ. Includes one downloadable PDF checklist. Ranks on page 1 for "how to choose a nursing home" within 90 days. |
| **Effort** | 10–12 hours (research, writing, editing, page creation) |
| **Depends on** | P0-FIX-05 (HowTo schema) |

### P1-CONTENT-04: Create "Understanding CMS Nursing Home Ratings" Guide

| Attribute | Detail |
|---|---|
| **What** | A definitive explainer (2,000–2,500 words) on how the CMS Five-Star system works, its limitations, and how NursingHomeGrade adds value on top of it. |
| **Why** | Families constantly encounter CMS star ratings and don't understand them. This guide positions NursingHomeGrade as the translator of government data. |
| **Where** | `/guides/understanding-cms-nursing-home-ratings` |
| **Structure** | **H1**: Understanding CMS Nursing Home Ratings: What Families Need to Know **H2**: What Is the CMS Five-Star Quality Rating System? **H2**: The Three Domains Explained **H3**: Health Inspections **H3**: Staffing **H3**: Quality Measures **H2**: How the Overall Star Rating Is Calculated **H2**: Important Limitations of the Five-Star System **H3**: Star ratings vary by state **H3**: Staffing data is self-reported **H3**: Inspection data can be 9–15 months old **H3**: A 5-star facility can still have serious problems **H2**: How NursingHomeGrade Makes CMS Data More Useful **H3**: From stars to letter grades **H3**: Plain-language deficiency explanations **H3**: The staffing compliance difference **H2**: How to Read a Facility's Full Report |
| **SEO** | Target: "CMS nursing home ratings explained", "what do nursing home star ratings mean", "CMS five star rating system". |
| **Acceptance** | 2,000+ words. Explains the three-domain system clearly. Includes a comparison table: CMS star rating vs. NursingHomeGrade score. Ranks on page 1 for target query within 90 days. |
| **Effort** | 8–10 hours |
| **Depends on** | None |

### P1-CONTENT-05: Create "What Happened to the CMS Staffing Rule" Guide

| Attribute | Detail |
|---|---|
| **What** | A timely, authoritative explainer (1,500–2,000 words) on the 2024 staffing rule, its December 2025 repeal, and what it means for families. This is NursingHomeGrade's most important content opportunity. |
| **Why** | No competitor has published a comprehensive guide on the repeal. This is a first-mover content opportunity. It also addresses the strategic question of how NursingHomeGrade maintains credibility now that its core threshold is no longer law. |
| **Where** | `/guides/cms-staffing-rule-repeal` |
| **Structure** | **H1**: The CMS Nursing Home Staffing Rule: What Happened and What It Means for Your Family **H2**: What Was the 2024 Staffing Rule? **H2**: Why Did CMS Repeal It? **H3**: The 10-year moratorium **H3**: Federal court decisions **H3**: Industry lobbying **H2**: What Changed on February 2, 2026? **H2**: What This Means for Families **H3**: "There is no longer a federal staffing minimum" **H3**: "State rules vary widely" **H3**: "Our grades still hold facilities accountable" **H2**: How NursingHomeGrade Is Responding **H3**: Why we still use 0.55 RN HPRD as a benchmark **H3**: Research showing safe staffing levels **H2**: Which States Had the Most Facilities That Would Have Failed? [data visualization] **H2**: What You Can Do **CTA**: Search facilities in your state |
| **SEO** | Target: "CMS staffing rule repealed", "nursing home staffing minimum 2026", "what happened to nursing home staffing rule". |
| **Acceptance** | Includes a data table or chart showing top 10 states by % of facilities that would have failed the repealed standard. Positions 0.55 HPRD as a quality benchmark, not a legal requirement. Ranks on page 1 within 60 days. Generates at least 2 backlinks from healthcare/policy sites within 90 days. |
| **Effort** | 8–10 hours |
| **Depends on** | None (can run parallel to other content) |

### P1-CONTENT-06: Create "Nursing Home Costs & Payment Options" Guide

| Attribute | Detail |
|---|---|
| **What** | A practical guide (2,000–2,500 words) on nursing home costs, Medicare/Medicaid coverage, private pay, long-term care insurance, and veterans benefits. |
| **Why** | Cost is the #1 concern for families and one of the highest-volume search topics. NursingHomeGrade has no cost content. |
| **Where** | `/guides/nursing-home-costs-payment-options` |
| **Structure** | **H1**: Nursing Home Costs in 2026: What Families Pay and How to Afford It **H2**: Average Nursing Home Costs by State [table] **H2**: Medicare Coverage for Nursing Homes **H3**: What Medicare Part A covers **H3**: What Medicare does NOT cover **H2**: Medicaid Coverage for Long-Term Care **H3**: Medicaid eligibility requirements **H3**: Medicaid vs. Medicare: Key differences **H2**: Private Pay and Other Options **H3**: Long-term care insurance **H3**: Veterans benefits (VA) **H3**: Life insurance conversions **H2**: How to Find Facilities That Accept Medicaid **H2**: Reducing Costs Without Reducing Care **CTA**: Find nursing homes in your area |
| **SEO** | Target: "nursing home cost per month", "how much does a nursing home cost", "Medicare nursing home coverage", "Medicaid nursing home eligibility". |
| **Acceptance** | Includes a cost-by-state table (source: Genworth Cost of Care survey or similar). Clearly distinguishes Medicare vs. Medicaid. Ranks on page 1 for at least one cost-related query within 90 days. |
| **Effort** | 10–12 hours |
| **Depends on** | None |

### P1-CONTENT-07: Create "Nursing Home Inspections: What Families Need to Know" Guide

| Attribute | Detail |
|---|---|
| **What** | A guide (1,500–2,000 words) demystifying the inspection process, deficiency categories, and how families can use inspection data. |
| **Why** | Families don't understand what inspection deficiencies mean. This guide bridges the gap and drives usage of the deficiency data on facility pages. |
| **Where** | `/guides/nursing-home-inspections-explained` |
| **Structure** | **H1**: Nursing Home Inspections: What Families Need to Know **H2**: How Nursing Home Inspections Work **H3**: Who conducts inspections? **H3**: How often do inspections happen? **H3**: What triggers a complaint inspection? **H2**: Understanding Deficiency Categories **H3**: Resident rights **H3**: Quality of care **H3**: Infection control **H3**: Medication management **H3**: Nutrition and hydration **H3**: Physical environment **H2**: Understanding Severity and Scope **H3**: The A–L scale explained [visual] **H3**: What "immediate jeopardy" really means **H2**: How to Read a Facility's Inspection History on NursingHomeGrade **H2**: What to Do If You Find Serious Violations **CTA**: Check inspection records for facilities near you |
| **SEO** | Target: "nursing home inspections explained", "what are nursing home deficiencies", "nursing home inspection report". |
| **Acceptance** | Includes a visual explanation of the severity/scope grid. Links to 3–5 example facility pages with notable deficiency records. Ranks on page 1 within 90 days. |
| **Effort** | 8–10 hours |
| **Depends on** | None |

### P1-CONTENT-08: Create Contact Page

| Attribute | Detail |
|---|---|
| **What** | A simple contact page with a form and alternative contact methods. |
| **Why** | Footer links to a non-existent contact page. Basic trust signal. Also needed for media inquiries. |
| **Where** | `/contact` |
| **Content** | Contact form (name, email, subject dropdown: General Question / Data Correction / Media Inquiry / Partnership / Report a Bug / Other, message). Alternative: email address (hello@nursinghomegrade.com). Response time expectation ("We typically respond within 2 business days"). |
| **Acceptance** | Form submits successfully. Confirmation message displays. Email is delivered to the correct inbox. Page has unique title and h1. |
| **Effort** | 2–3 hours |
| **Depends on** | P0-FIX-01 |

---

## Phase 2: State Page Expansion & Local SEO (Weeks 3–5)

### P2-LOCAL-01: Enrich Top 20 State Pages

| Attribute | Detail |
|---|---|
| **What** | Add 300–500 words of unique introductory content to each of the top 20 states by facility count (Texas through Virginia per Table 9 in the analysis). |
| **Why** | Current state pages are just facility lists. Rich introductory content captures state-specific search queries ("nursing home costs in Texas", "best nursing homes in Ohio") and signals topical authority to Google. |
| **Where** | Top of each state page: `/state/[state-slug]` |
| **Content template** | For each state, include: **Paragraph 1**: Overview ("[State] has [Count] Medicare-certified nursing homes. Of these, [X]% meet the NursingHomeGrade staffing benchmark, [Y]% earn a B or higher, and [Z]% score a D or F.") **Paragraph 2**: Key statistics (average score, best and worst metro areas, most common deficiency categories). **Paragraph 3**: State-specific context (Medicaid expansion status, state staffing requirements if any, notable policy developments). **Paragraph 4**: How to use this page ("Browse facilities below, or use our interactive map to see quality trends across [State].") |
| **Acceptance** | Each of the 20 state pages has 300+ words of unique content. No duplicate text across states. State name appears in first 100 words. At least one data point specific to that state. |
| **Effort** | 15–20 hours (can be parallelized across writers) |
| **Depends on** | None |

### P2-LOCAL-02: Create Top 50 Metro Area Pages

| Attribute | Detail |
|---|---|
| **What** | Create landing pages for the 50 largest U.S. metro areas by nursing home count, each with aggregated data and a list of facilities. |
| **Why** | Captures high-volume local searches like "best nursing homes in Dallas" or "nursing home ratings Atlanta." These are among the highest-intent queries in the space. |
| **Where** | `/metro/[metro-slug]` (e.g., `/metro/dallas-tx`, `/metro/atlanta-ga`) |
| **Content template** | **H1**: Nursing Home Ratings in [Metro Area] **Intro paragraph**: "[Metro] is home to [Count] nursing facilities serving [Population] residents. The average NursingHomeGrade Score in [Metro] is [X]/100, compared to the national average of [Y]." **Data summary**: Table showing top 5 highest-rated facilities, bottom 5 lowest-rated, average staffing hours, % failing staffing benchmark. **Map embed**: Zoomed-in interactive map for the metro area. **Facility list**: All facilities in the metro, sortable by score. **CTA**: "Compare facilities" + "Get score alerts" |
| **Acceptance** | 50 pages created. Each has unique content. Internal links from corresponding state pages. Map is zoomed to metro boundaries. |
| **Effort** | 20–25 hours (data aggregation can be scripted; writing needs human review) |
| **Depends on** | P2-LOCAL-01 (state pages template established) |

### P2-LOCAL-03: Internal Linking Optimization

| Attribute | Detail |
|---|---|
| **What** | Implement a structured internal linking strategy: state pages link to metro pages, facility pages link to parent state/metro pages, blog posts link to relevant state/facility pages, and "nearby facilities" cards are enhanced. |
| **Why** | Internal linking distributes PageRank, helps Google discover deep pages, and keeps users engaged longer. |
| **Where** | All page templates |
| **How** | Add breadcrumb navigation with schema (already in P0-FIX-04). On facility pages, ensure "nearby facilities" cards include links. On state pages, add a "Top Metro Areas" section with links to metro pages. On blog posts, add 3–5 contextual internal links. |
| **Acceptance** | Every facility page has links to its state page and at least 3 nearby facilities. Every state page links to its top 5 metro pages. Average internal links per page increases from current baseline to 5+. |
| **Effort** | 4–6 hours |
| **Depends on** | P2-LOCAL-02 (metro pages exist to link to) |

---

## Phase 3: Product Features & UX (Weeks 4–7)

### P3-FEAT-01: Comparison Tool Enhancement

| Attribute | Detail |
|---|---|
| **What** | Upgrade the basic `/compare` page with delta highlighting, risk analysis, export functionality, and shareable links. |
| **Why** | Current comparison page is a placeholder. A robust comparison tool is a key differentiator and increases time-on-site. |
| **Where** | `/compare` |
| **Feature breakdown** | **Delta highlighting**: When comparing 2+ facilities, show `+0.22` or `-7` next to each metric with color coding (green = better, red = worse). **Risk flags**: Auto-generate a "Key Differences" summary at the top (e.g., "Facility A has 4 fewer deficiencies and 0.18 more RN hours per resident day."). **Export to PDF**: Button generates a printable comparison PDF (1 page, branded). **Shareable link**: Generate a unique URL for each comparison set (e.g., `/compare?facilities=345238,445331,123456`) so families can share or bookmark. |
| **Acceptance** | Comparing 3 facilities shows delta values for all metrics. PDF export works on desktop and mobile. Shareable URL loads the same comparison on a different device. |
| **Effort** | 12–16 hours |
| **Depends on** | None |

### P3-FEAT-02: Score Alert System Upgrade

| Attribute | Detail |
|---|---|
| **What** | Expand the current single-facility email alert into a multi-facility watchlist with state digests and richer alert content. |
| **Why** | Score alerts are a unique feature with no competitor equivalent. Expanding it increases engagement and gives NursingHomeGrade a recurring touchpoint with users. |
| **Where** | Alert signup on facility pages + new `/alerts` management page |
| **Feature breakdown** | **Multi-facility watchlist**: Users can save 5–10 facilities to a personal watchlist and receive a single weekly digest covering all watched facilities. **State digest option**: Users can subscribe to a monthly email summarizing all score changes in their state. **Richer alert content**: When a score changes, explain WHY (e.g., "Downgraded from 72 to 58: Q2 2026 staffing data shows RN hours dropped from 0.61 to 0.47 HPRD."). **Alert management page**: `/alerts` where users can view their watchlist, add/remove facilities, and change email preferences. |
| **Acceptance** | User can save 5 facilities and receive one combined digest email. Alert explains the specific data change causing the score shift. Management page allows full CRUD operations on watchlist. |
| **Effort** | 16–20 hours |
| **Depends on** | Database/storage for user watchlists (if not already present) |

### P3-FEAT-03: Deficiency Keyword Search

| Attribute | Detail |
|---|---|
| **What** | Add a searchable database of deficiencies that lets users find facilities cited for specific issues. |
| **Why** | This is the one feature where ProPublica leads significantly. A family-friendly version within NursingHomeGrade would capture users researching specific concerns ("Has this home been cited for falls?"). |
| **Where** | New page: `/deficiency-search` + integration on facility pages |
| **Feature breakdown** | **Global search**: Search bar on `/deficiency-search` that accepts keywords ("falls", "medication errors", "pressure ulcers", "elopement") and returns all facilities with matching deficiencies. **Filters**: By state, by severity (Immediate Jeopardy only, all levels), by date range (last 1 year, 3 years, 5 years). **Facility-page integration**: On each facility page, add a "Search deficiencies at this facility" box that searches within that facility's inspection history. **Results format**: Facility name, grade, matching deficiency count, most recent matching citation date, and a link to the facility page. |
| **Acceptance** | Search for "falls" returns facilities with fall-related deficiencies. Filter by "Immediate Jeopardy" narrows results. Results are sortable by date and severity. Search completes in <2 seconds for common terms. |
| **Effort** | 20–24 hours (requires indexing deficiency descriptions for full-text search) |
| **Depends on** | None (can run in parallel) |

### P3-FEAT-04: Homepage Messaging Update

| Attribute | Detail |
|---|---|
| **What** | Update the homepage headline and messaging to reflect the post-repeal reality while maintaining the staffing accountability narrative. |
| **Why** | The current headline ("44.2% of U.S. nursing homes fail the federal staffing minimum") references a standard that was repealed in December 2025. This must be addressed. |
| **Where** | Homepage hero section |
| **Current** | "Find honest nursing home grades. 44.2% of U.S. nursing homes fail the federal staffing minimum." |
| **Proposed Option A** (Defend the benchmark): "Find honest nursing home grades. 44.2% of U.S. nursing homes fall below safe RN staffing levels — even after CMS abandoned the minimum." |
| **Proposed Option B** (Research-based): "Find honest nursing home grades. Independent scores based on staffing, inspections, and quality data — because your family deserves the truth." |
| **Proposed Option C** (Hybrid): "Find honest nursing home grades. We hold 15,000+ facilities to the staffing standards CMS just repealed. See how yours measures up." |
| **Acceptance** | New headline maintains the striking statistic while accurately reflecting the post-repeal landscape. "Why this site exists" section is updated to reference the repeal and NursingHomeGrade's decision to maintain the benchmark. A/B test if possible. |
| **Effort** | 2–3 hours |
| **Depends on** | P1-CONTENT-05 (staffing rule guide should be live first for context) |

### P3-FEAT-05: Methodology Scoring Update

| Attribute | Detail |
|---|---|
| **What** | Update the methodology explanation on `/methodology` and facility pages to clarify that the 0.55 RN HPRD threshold is now a quality benchmark, not a legal requirement. |
| **Why** | Transparency about the scoring methodology is core to the brand. After the repeal, families will rightly ask "What does 'fails the federal minimum' mean if there's no federal minimum?" |
| **Where** | `/methodology`, facility page assessment banners, About page |
| **How** | Replace "fails the federal staffing minimum of 0.55" with "falls below the evidence-based RN staffing benchmark of 0.55 hours per resident day." Add a footnote or tooltip: "CMS repealed the federal staffing minimum in December 2025. NursingHomeGrade continues to use 0.55 HPRD as a quality benchmark based on research linking this threshold to better resident outcomes. [Link to methodology]" |
| **Acceptance** | Zero references to "federal staffing minimum" remain on facility pages. All staffing references use "benchmark" or "quality threshold" language. Tooltip/footnote is present on every facility page with a staffing assessment. |
| **Effort** | 3–4 hours |
| **Depends on** | P0-FIX-09 (methodology page exists) |

### P3-FEAT-06: Promote Score Alerts More Prominently

| Attribute | Detail |
|---|---|
| **What** | Move score alert signups from the bottom of facility pages to a more prominent position. Add alert CTAs to state pages and the homepage. |
| **Why** | Score alerts are a unique engagement feature but are buried on facility pages. Most users never scroll far enough to see them. |
| **Where** | Facility pages (move above the fold), state pages (new), homepage (new module) |
| **How** | On facility pages: Add a sticky or inline alert CTA below the Quality Breakdown table. On state pages: Add "Get monthly updates for [State]" email signup. On homepage: Add a module: "Stay informed — Get alerts when facilities in your area are downgraded." |
| **Acceptance** | Alert signup is visible without scrolling on facility pages. State pages have a state-specific alert CTA. Homepage has a general alert module. Alert signup rate increases by 50%+ from baseline. |
| **Effort** | 3–4 hours |
| **Depends on** | P3-FEAT-02 (alert system backend must be ready) |

---

## Phase 4: Content Engine & Blog (Weeks 5–10, Ongoing)

### P4-BLOG-01: Set Up Blog Infrastructure

| Attribute | Detail |
|---|---|
| **What** | Create a blog listing page, individual post template, and category/tag system. |
| **Why** | All ongoing content (Phase 4) lives here. A proper blog structure is prerequisite. |
| **Where** | `/blog` (listing), `/blog/[post-slug]` (individual posts) |
| **How** | Blog listing shows posts in reverse chronological order with excerpts, publish date, and estimated read time. Categories: Guides, Data & Policy, Facility Spotlights, Family Resources. Individual post template includes: hero H1, author byline ("NursingHomeGrade Team"), publish date, share buttons (Twitter/X, Facebook, LinkedIn, email), article body, related posts, and CTA box at bottom. |
| **Acceptance** | `/blog` renders a list of all published posts. Post template has clean typography, mobile-responsive layout, and social share buttons. RSS feed available at `/blog/rss.xml`. |
| **Effort** | 6–8 hours |
| **Depends on** | P0-FIX-05 (Article schema) |

### P4-BLOG-02: Publish "Top 10 Nursing Homes in [State]" Series

| Attribute | Detail |
|---|---|
| **What** | Publish a rolling series of posts ranking the top 10 highest-scoring facilities in each state. Start with the 10 most populous states. |
| **Why** | These are high-volume local search queries with moderate competition. Each post drives local traffic and links to facility pages. |
| **Where** | `/blog/top-nursing-homes-[state]` |
| **Content template** | **H1**: Top 10 Nursing Homes in [State] (2026 Rankings) **Intro**: "Based on independent analysis of CMS data, these are the highest-rated nursing homes in [State]. Rankings consider staffing levels, inspection records, and quality measures." **The List**: Each facility gets a numbered entry with: facility name (linked to facility page), city, NursingHomeGrade Score and letter grade, RN staffing hours, deficiency count (3-year), CMS star rating, and one-sentence assessment. **Methodology note**: Brief explanation of how rankings were determined. **CTA**: "See all [Count] facilities in [State]" (links to state page). |
| **Acceptance** | Each post links to all 10 facility pages and the state page. Posts are data-driven with no editorial favoritism. Publish 2 posts per week. Target: rank in top 3 for "best nursing homes [state]" within 90 days. |
| **Effort** | 3–4 hours per post (data is automated; writing is template-driven) |
| **Depends on** | P4-BLOG-01 |

### P4-BLOG-03: Publish "Worst-Rated Nursing Homes in [State]" Series

| Attribute | Detail |
|---|---|
| **What** | Same format as P4-BLOG-02 but for the 10 lowest-scoring facilities. Frame responsibly as "facilities families should review carefully." |
| **Why** | While sensitive, these posts serve a genuine consumer protection function. Families searching for a specific facility by name will find this data. ProPublica and other investigative outlets publish similar accountability journalism. |
| **Where** | `/blog/nursing-homes-to-review-[state]` |
| **Content template** | Same structure as top 10 but with a careful framing: "These facilities score lowest on our independent rating system. A low score does not mean a facility provides poor care in all areas — it means families should review inspection records carefully and ask questions during visits." |
| **Acceptance** | Same as P4-BLOG-02. Frame is journalistic, not sensationalist. Every claim is tied to specific CMS data. |
| **Effort** | 3–4 hours per post |
| **Depends on** | P4-BLOG-01 |

### P4-BLOG-04: Publish Monthly "State of Nursing Home Quality" Data Posts

| Attribute | Detail |
|---|---|
| **What** | A monthly blog post analyzing a specific data angle: state comparisons, chain performance, staffing trends, deficiency patterns. |
| **Why** | Data journalism builds authority, earns backlinks, and gives NursingHomeGrade a consistent publishing cadence. Each post is a potential PR pitch. |
| **Where** | `/blog/[data-analysis-slug]` |
| **Post ideas** (first 6 months) | **Month 1**: "Which States Have the Worst Nursing Home Staffing?" (rank states by % below 0.55 HPRD) **Month 2**: "The 20 Nursing Home Chains with the Most Deficiencies" (aggregate by ownership) **Month 3**: "Nursing Home Inspection Delays: Which States Are Behind?" (data from delayed inspection rates) **Month 4**: "Immediate Jeopardy: The Nursing Homes with the Most Serious Violations" **Month 5**: "Rural vs. Urban Nursing Home Quality: The Data Tells a Story" **Month 6**: "Staffing Consistency Matters More Than Total Hours: What the Data Shows" |
| **Acceptance** | Each post includes at least one data visualization (chart or table). Each post is pitched to 3–5 healthcare journalists. Target: 1 media mention per month. |
| **Effort** | 6–8 hours per post (data analysis + writing + visualization) |
| **Depends on** | P4-BLOG-01 |

### P4-BLOG-05: Publish Family Resource Posts

| Attribute | Detail |
|---|---|
| **What** | A series of practical posts for families in the research/decision phase. |
| **Why** | Captures upper-funnel traffic, builds trust, and establishes NursingHomeGrade as a helpful resource rather than just a data tool. |
| **Where** | `/blog/[post-slug]` |
| **Post ideas** | "Questions to Ask on a Nursing Home Tour" (checklist format) "Understanding Nursing Home Contracts: Red Flags" "What Is a Special Focus Facility and Why Should Families Care?" "Memory Care vs. Nursing Home: Which Does Your Parent Need?" "How to File a Complaint About a Nursing Home" "Nursing Home Evictions: What Families Need to Know" "The Difference Between Non-Profit and For-Profit Nursing Homes" "What Happens During a Nursing Home Inspection?" |
| **Acceptance** | Each post is 1,200–1,800 words. Includes a downloadable PDF checklist or summary where applicable. Ranks on page 1–2 for target query within 90 days. |
| **Effort** | 4–6 hours per post |
| **Depends on** | P4-BLOG-01 |

### P4-BLOG-06: Create Annual Report as Linkable Asset

| Attribute | Detail |
|---|---|
| **What** | Produce a comprehensive "State of Nursing Home Quality 2026" annual report as a downloadable PDF and interactive web page. |
| **Why** | Annual reports are powerful link magnets. They generate media coverage, backlinks from .gov and .edu sites, and establish NursingHomeGrade as the definitive data source. |
| **Where** | `/reports/state-of-nursing-home-quality-2026` + PDF download |
| **Content** | **Executive Summary**: Key findings in 5 bullet points **National Overview**: Score distribution, staffing trends, deficiency trends **State Rankings**: All 50 states ranked by average NursingHomeGrade Score **Spotlight Sections**: Staffing rule repeal impact, chain analysis, rural/urban divide **Methodology**: How the analysis was conducted **Data Tables**: Appendix with full state-by-state data |
| **Design** | Professional, data-dense layout with charts and infographics. Branded with NursingHomeGrade colors. PDF should be 8–12 pages. |
| **Acceptance** | Report is cited by at least 3 external sites (media, advocacy, or government) within 90 days of publication. Generates 10+ backlinks. PDF downloaded 500+ times in first month. |
| **Effort** | 20–25 hours (analysis + writing + design) |
| **Depends on** | P4-BLOG-01, P2-LOCAL-01 (state data ready) |

---

## Phase 5: Outreach & Distribution (Weeks 6–12)

### P5-OUTREACH-01: Media Pitch — Independence Story

| Attribute | Detail |
|---|---|
| **What** | Pitch a feature story about NursingHomeGrade's independence model to consumer and healthcare journalists. |
| **Why** | The A Place for Mom Senate investigation created a media environment hungry for stories about unbiased senior care information. NursingHomeGrade is the perfect counter-example. |
| **Target outlets** | Tier 1: Wall Street Journal (personal finance), KFF Health News, Consumer Reports. Tier 2: McKnight's Long-Term Care News, Skilled Nursing News, AgingCare.com. Tier 3: State newspaper health reporters (target top 10 states). |
| **Pitch angle** | "As the Senate investigates commission-based nursing home referrals, one website refuses to take facility payments — and the data shows why that matters." Include: the Senate investigation context, a specific data finding (e.g., "facilities rated by commission-based services are X% more likely to have recent deficiencies"), and access to the founder for interview. |
| **Acceptance** | Pitch sent to 15+ journalists. At least 1 published article or interview within 60 days. |
| **Effort** | 6–8 hours (research targets, write pitch, follow up) |
| **Depends on** | P1-CONTENT-05 (staffing rule guide shows the site has substance) |

### P5-OUTREACH-02: Media Pitch — Staffing Rule Repeal Analysis

| Attribute | Detail |
|---|---|
| **What** | Pitch exclusive data analysis on the staffing rule repeal to healthcare policy reporters. |
| **Why** | The repeal is undercovered in consumer media. A data-driven exclusive from NursingHomeGrade would be genuinely newsworthy. |
| **Target outlets** | Tier 1: Politico (healthcare), Modern Healthcare, The Hill. Tier 2: McKnight's, Skilled Nursing News, Fierce Healthcare. Tier 3: Statehouse reporters in states with highest repeal impact. |
| **Pitch angle** | "Exclusive data: After CMS repealed nursing home staffing standards, X% of facilities in [State] no longer have any federal accountability for RN hours. We have the only database tracking what happens next." |
| **Acceptance** | Exclusive data shared with 2–3 tier-1 outlets. At least 1 story published within 30 days of pitch. |
| **Effort** | 4–6 hours |
| **Depends on** | P4-BLOG-06 (annual report data) or P4-BLOG-04 Month 1 post |

### P5-OUTREACH-03: Partnership — State Ombudsman Programs

| Attribute | Detail |
|---|---|
| **What** | Reach out to Long-Term Care Ombudsman programs in all 50 states to propose NursingHomeGrade as a listed resource. |
| **Why** | Ombudsman websites are .gov or .org domains with high authority. A backlink and listing from even 10 state ombudsman sites would dramatically improve domain authority. |
| **Approach** | Email the state ombudsman coordinator in each state. Offer: a brief explanation of NursingHomeGrade's independence model, a one-page PDF fact sheet about the tool, and a request to be listed on their "Resources for Families" page. |
| **Acceptance** | Outreach to all 50 states. 10+ states add NursingHomeGrade to their resource pages within 90 days. |
| **Effort** | 10–12 hours (template email + personalization + follow-up) |
| **Depends on** | None |

### P5-OUTREACH-04: Partnership — Consumer Advocacy Organizations

| Attribute | Detail |
|---|---|
| **What** | Build relationships with national consumer advocacy organizations for mutual content promotion and backlink exchange. |
| **Why** | These organizations have established audiences of exactly the families NursingHomeGrade wants to reach. Their endorsements carry significant trust weight. |
| **Target organizations** | Consumer Voice (National Consumer Voice for Quality Long-Term Care), LTCCC, AARP (long shot but worth trying), Center for Medicare Advocacy, Justice in Aging. |
| **Approach** | Propose content co-creation: "We have the data, you have the advocacy voice. Let's collaborate on a report about nursing home quality in [specific area]." Offer to share data visualizations they can use in their own reports. |
| **Acceptance** | At least 1 organization agrees to co-publish or link to NursingHomeGrade content within 90 days. |
| **Effort** | 6–8 hours |
| **Depends on** | P4-BLOG-06 (annual report demonstrates data credibility) |

### P5-OUTREACH-05: Social Media Content Calendar

| Attribute | Detail |
|---|---|
| **What** | Create and execute a consistent social media posting schedule on Twitter/X and LinkedIn. |
| **Why** | Social distribution drives referral traffic, builds brand awareness, and creates engagement signals that indirectly support SEO. |
| **Twitter/X strategy** | **Daily**: "Facility spotlight" — one facility (best or worst) in a random state with score and key stat. **Weekly**: Thread explaining a data finding or policy change. **Bi-weekly**: State-level ranking snippet ("Texas has 1,177 nursing homes. Only 38% meet the staffing benchmark."). **As needed**: Commentary on CMS data releases or policy news. |
| **LinkedIn strategy** | **Weekly**: Data analysis article or chart (target healthcare professionals, journalists, policy makers). **Monthly**: "State of Nursing Home Quality" data highlight. **As needed**: Methodology explainers, partnership announcements. |
| **Acceptance** | Twitter: 1 post per day minimum. LinkedIn: 2 posts per week minimum. Follower growth of 20%+ per month on each platform for first 3 months. |
| **Effort** | 4–5 hours per week ongoing |
| **Depends on** | P4-BLOG-04 (data posts provide content) |

### P5-OUTREACH-06: Google Business Profile & Local Pack Strategy

| Attribute | Detail |
|---|---|
| **What** | Create a Google Business Profile for NursingHomeGrade and optimize for local search visibility. |
| **Why** | "Nursing home ratings near me" and similar local queries trigger the local pack. While NursingHomeGrade is a website (not a physical location), a properly configured GBP can appear for service-area searches. |
| **How** | Register at business.google.com. Category: "Medical Information Service" or similar. Service area: All U.S. states. Website: nursinghomegrade.com. Add posts linking to new blog content and state pages weekly. |
| **Acceptance** | GBP verified and published. Weekly posts added. Profile appears for "nursing home ratings" + location queries within 60 days. |
| **Effort** | 2–3 hours setup + 30 min/week ongoing |
| **Depends on** | None |

---

## Dependency Map

```
Phase 0 (Weeks 1–2)
├── P0-FIX-01: Fix footer links ──┬──► Phase 1 content pages
├── P0-FIX-02: XML sitemap ───────┼──► All SEO benefits
├── P0-FIX-04: Schema markup ─────┼──► Rich snippets
├── P0-FIX-06: Title tags ─────────┘
├── P0-FIX-07: Meta descriptions
├── P0-FIX-09: Methodology page ──►► P3-FEAT-05

Phase 1 (Weeks 2–4) ── PARALLEL with Phase 0 & 2
├── P1-CONTENT-01: FAQ ───────────►► P0-FIX-05 (FAQ schema)
├── P1-CONTENT-02: Glossary
├── P1-CONTENT-03: Choose Guide
├── P1-CONTENT-04: CMS Ratings Guide
├── P1-CONTENT-05: Staffing Rule Guide ──►► P3-FEAT-04 (homepage)
├── P1-CONTENT-06: Costs Guide
├── P1-CONTENT-07: Inspections Guide
├── P1-CONTENT-08: Contact

Phase 2 (Weeks 3–5) ── PARALLEL
├── P2-LOCAL-01: State pages ─────►► P2-LOCAL-03 (internal links)
├── P2-LOCAL-02: Metro pages ─────┘

Phase 3 (Weeks 4–7) ── PARALLEL
├── P3-FEAT-01: Comparison tool
├── P3-FEAT-02: Alert system ─────►► P3-FEAT-06 (promote alerts)
├── P3-FEAT-03: Deficiency search
├── P3-FEAT-04: Homepage update
├── P3-FEAT-05: Scoring reframe

Phase 4 (Weeks 5–10, ONGOING) ── DEPENDS on Phase 1
├── P4-BLOG-01: Blog infra
├── P4-BLOG-02: Top 10 series
├── P4-BLOG-03: Bottom 10 series
├── P4-BLOG-04: Data posts ───────►► P5-OUTREACH-01, -02
├── P4-BLOG-05: Family resources
├── P4-BLOG-06: Annual report ────►► P5-OUTREACH-03, -04

Phase 5 (Weeks 6–12, ONGOING) ── DEPENDS on Phases 1–2
├── P5-OUTREACH-01: Independence pitch
├── P5-OUTREACH-02: Repeal pitch
├── P5-OUTREACH-03: Ombudsman outreach
├── P5-OUTREACH-04: Advocacy partners
├── P5-OUTREACH-05: Social calendar
├── P5-OUTREACH-06: GBP setup
```

---

## Success Metrics & KPIs

### Month 1–2 Targets (Phase 0–1 Completion)

| Metric | Baseline (est.) | Target |
|---|---|---|
| Indexed pages in Google Search Console | Unknown | 15,000+ (all facility pages) |
| Rich snippet appearances | 0 | 10+ facility pages showing star ratings |
| FAQ page organic sessions | 0 | 50+/month |
| Core guide pages published | 0 | 5+ live |
| Broken footer links | 4 | 0 |

### Month 3–4 Targets (Phase 2–3 Completion)

| Metric | Baseline (est.) | Target |
|---|---|---|
| State pages with unique content | 0 | 20 |
| Metro pages live | 0 | 50 |
| Organic sessions (monthly) | Unknown | +50% from baseline |
| Average session duration | Unknown | +30% (better content engagement) |
| Score alert subscribers | Unknown | 200+ |
| Comparison tool usage | Unknown | 100+ comparisons/month |

### Month 6 Targets (Phase 4–5 Momentum)

| Metric | Baseline (est.) | Target |
|---|---|---|
| Blog posts published | 0 | 20+ |
| Organic sessions (monthly) | Unknown | +150% from baseline |
| Referring domains (new) | Unknown | 25+ |
| Media mentions | 0 | 3+ |
| Social followers (combined) | Unknown | 1,000+ |
| State ombudsman listings | 0 | 10+ |

### Month 12 Targets

| Metric | Baseline (est.) | Target |
|---|---|---|
| Organic sessions (monthly) | Unknown | +300% from baseline |
| Referring domains | Unknown | 100+ |
| Domain Authority (Moz) | Unknown | 40+ |
| "NursingHomeGrade" branded searches | Unknown | 500+/month |
| Score alert subscribers | Unknown | 2,000+ |
| Annual report downloads | 0 | 2,000+ |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **CMS changes data format** | Medium | High | Build data pipeline with validation alerts. Monitor CMS data releases monthly. Have 2-week buffer for schema changes. |
| **Facility disputes a grade publicly** | Medium | Medium | Have a clear dispute process documented. Never change grades without data verification. Respond transparently on the methodology page. |
| **Competitor replicates A–F grading** | High | Medium | Move fast on content and brand building. The independence narrative is harder to replicate than the grading system. |
| **A Place for Mom legal threat** | Low | High | Ensure all claims are data-backed and cited. The Senate investigation provides journalistic shield. Consult defamation counsel if needed. |
| **Google algorithm update hurts niche sites** | Medium | Medium | Focus on E-E-A-T signals: authorship, citations, .gov backlinks, and transparent methodology. Diversify traffic via email and social. |
| **Team bandwidth constraints** | High | High | Prioritize P0 and P1 items. Defer P2 items if needed. Batch similar tasks (e.g., write all 20 state intros in one session). |

---

## Definition of "Done" for This Plan

This implementation plan is complete when:

1. **All P0 items** (P0-FIX-01 through P0-FIX-09) are live in production.
2. **All P1 content items** (P1-CONTENT-01 through P1-CONTENT-08) are published and indexed by Google.
3. **Top 20 state pages** (P2-LOCAL-01) have unique introductory content.
4. **At least 3 product features** from Phase 3 are shipped (comparison enhancement, alert upgrade, and either deficiency search or homepage update).
5. **Blog infrastructure** (P4-BLOG-01) is live with at least 8 posts published.
6. **First media pitch** (P5-OUTREACH-01 or P5-OUTREACH-02) has been sent to 10+ journalists.
7. **Google Search Console** is configured and showing 15,000+ indexed pages with rich snippet appearances for facility pages.

**Estimated timeline to completion**: 10–12 weeks for core deliverables. Content engine (Phase 4) and outreach (Phase 5) continue indefinitely.