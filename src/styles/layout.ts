import { WORDMARK_ASPECT } from "../brand.generated";

// Masthead (sticky), mobile menu panel, footer.
export const LAYOUT_CSS = `
    /* Masthead */
    .site-header { position: sticky; top: 0; z-index: 100; background: var(--surface); border-bottom: 1px solid var(--line); }
    .masthead { display: flex; align-items: center; justify-content: space-between; gap: var(--space-s); height: var(--header-h); }
    .brand { display: inline-flex; align-items: center; min-height: 44px; min-width: 0; text-decoration: none; border: 0; flex: 0 1 auto; }
    .brand:hover { border: 0; }
    .brand-wordmark { display: block; height: 34px; width: auto; aspect-ratio: ${WORDMARK_ASPECT}; max-width: 100%; }
    .masthead-nav { display: flex; align-items: center; gap: var(--space-m); }
    .masthead-panel { display: flex; align-items: center; gap: var(--space-m); }
    .masthead-nav-link {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--navy-900);
      text-decoration: none;
      border: 0;
      white-space: nowrap;
      transition: color 0.15s ease-out;
    }
    .masthead-nav-link:visited { color: var(--navy-900); }
    .masthead-nav-link:hover { color: var(--teal-700); border: 0; text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; }
    .masthead-search-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 1.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1;
      color: #fff;
      background: var(--navy-900);
      border: 1px solid var(--navy-900);
      border-radius: var(--radius-sm);
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease-out;
    }
    .masthead-search-btn:visited { color: #fff; }
    .masthead-search-btn:hover { background: var(--navy-800); border-color: var(--navy-800); color: #fff; }

    /* Menu toggle: visible below 900px */
    .masthead-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 4px;
      width: 44px;
      height: 44px;
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .masthead-toggle-bar { display: block; width: 18px; height: 2px; background: var(--navy-900); border-radius: 1px; transition: transform 0.15s ease-out, opacity 0.15s ease-out; }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(2) { opacity: 0; }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

    @media (max-width: 900px) {
      .brand-wordmark { height: 30px; }
      .masthead-toggle { display: inline-flex; }
      .masthead-nav { gap: 0; }
      .masthead-panel {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: var(--space-2xs) var(--gutter) var(--space-s);
        background: var(--surface);
        border-bottom: 1px solid var(--line);
        box-shadow: var(--shadow-2);
        max-height: calc(100vh - var(--header-h));
        overflow-y: auto;
      }
      .masthead-nav.is-open .masthead-panel { display: flex; }
      .masthead-nav-link { min-height: 48px; font-size: 1rem; border-bottom: 1px solid var(--line); }
      .masthead-search-btn { margin-top: var(--space-s); min-height: 48px; font-size: 1rem; }
    }
    @media (max-width: 400px) {
      .brand-wordmark { height: 26px; }
    }

    /* Footer */
    .repeal-disclosure {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--slate-600);
      margin: var(--space-2xs) 0 0;
      max-width: 60ch;
    }
    .repeal-disclosure a { color: inherit; font-weight: 600; }
    footer {
      border-top: 1px solid var(--line);
      margin-top: var(--space-2xl);
      background: var(--surface);
      padding: var(--space-xl) 0 var(--space-l);
      font-size: 0.875rem;
    }
    .footer-upper {
      display: grid;
      grid-template-columns: 1.3fr 0.9fr 1fr 0.8fr 1.7fr;
      gap: var(--space-l);
      margin-bottom: var(--space-xl);
    }
    .footer-upper > * { min-width: 0; }
    .footer-brand { display: flex; flex-direction: column; gap: var(--space-s); }
    .footer-lockup { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; border: 0; }
    .footer-lockup:hover { border: 0; }
    .footer-lockup .brand-wordmark { height: 30px; }
    .footer-tagline { font-size: 0.875rem; color: var(--slate-600); line-height: 1.6; margin: 0; max-width: 32ch; }
    .footer-col { display: flex; flex-direction: column; gap: 2px; }
    .footer-col-head { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--navy-900); margin-bottom: var(--space-2xs); }
    .footer-link { color: var(--slate-600); text-decoration: none; border: 0; font-size: 0.9375rem; line-height: 1.9; transition: color 0.15s ease-out; }
    .footer-link:visited { color: var(--slate-600); }
    .footer-link:hover { color: var(--teal-700); border: 0; text-decoration: underline; text-underline-offset: 3px; }
    .footer-newsletter-desc { font-size: 0.875rem; color: var(--slate-600); line-height: 1.5; margin: 0 0 var(--space-xs); }
    .footer-newsletter-form { display: flex; gap: 0; }
    .footer-newsletter-input {
      flex: 1;
      min-width: 0;
      min-height: 44px;
      padding: 0 0.75rem;
      border: 1px solid var(--line-strong);
      border-right: 0;
      border-radius: var(--radius-sm) 0 0 var(--radius-sm);
      font-size: 0.9375rem;
      font-family: var(--font-ui);
      background: var(--surface);
      color: var(--navy-900);
    }
    .footer-newsletter-btn {
      min-height: 44px;
      background: var(--teal-700);
      color: #fff;
      border: 1px solid var(--teal-700);
      padding: 0 1rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: var(--font-ui);
      cursor: pointer;
      transition: background 0.15s ease-out;
    }
    .footer-newsletter-btn:hover { background: var(--teal-800); border-color: var(--teal-800); }
    .footer-social { display: flex; gap: var(--space-xs); margin-top: var(--space-s); }
    .footer-social-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      color: var(--navy-900);
      background: var(--surface);
      border: 1px solid var(--line-strong);
      border-radius: 50%;
      transition: color 0.15s ease-out, border-color 0.15s ease-out;
    }
    .footer-social-link:hover { color: var(--teal-700); border-color: var(--teal-700); }
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-s);
      padding-top: var(--space-m);
      border-top: 1px solid var(--line);
      font-size: 0.8125rem;
      color: var(--slate-600);
    }
    .footer-bottom-links { display: flex; gap: var(--space-m); flex-wrap: wrap; }
    .footer-bottom-link { display: inline-flex; align-items: center; min-height: 44px; color: var(--slate-600); text-decoration: none; border: 0; font-size: 0.8125rem; }
    .footer-bottom-link:visited { color: var(--slate-600); }
    .footer-bottom-link:hover { color: var(--teal-700); text-decoration: underline; }
    @media (max-width: 1000px) {
      .footer-upper { grid-template-columns: 1fr 1fr 1fr; gap: var(--space-l); }
      .footer-brand { grid-column: 1 / -1; }
      .footer-newsletter { grid-column: 1 / -1; max-width: 420px; }
    }
    @media (max-width: 600px) {
      .footer-upper { grid-template-columns: 1fr 1fr; }
      .footer-bottom { flex-direction: column; align-items: flex-start; }
    }
    @media (max-width: 380px) {
      .footer-upper { grid-template-columns: 1fr; }
    }

    /* Comparison bar (element IDs are a contract with the layout script) */
    #comparison-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      z-index: 1000;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-s);
      padding: var(--space-xs) var(--gutter);
      background: var(--navy-900);
      color: #fff;
      border-top: 4px solid var(--teal-600);
      box-shadow: 0 -4px 16px rgba(11,29,51,0.18);
    }
    .comparison-bar-info { display: flex; align-items: center; gap: var(--space-s); flex-wrap: wrap; }
    #comparison-count { font-weight: 600; }
    #comparison-clear { background: none; border: 0; color: rgba(255,255,255,0.8); font: inherit; font-size: 0.875rem; cursor: pointer; padding: 0 var(--space-2xs); min-height: 44px; text-decoration: underline; }
    #comparison-clear:hover { color: #fff; }
    #comparison-bar :focus-visible { outline-color: #fff; }
    #comparison-bar .btn { background: #fff; color: var(--navy-900); border-color: #fff; }
    #comparison-bar .btn:hover { background: var(--line); border-color: var(--line); color: var(--navy-900); }
    @media (max-width: 640px) {
      #comparison-bar { flex-direction: column; align-items: stretch; }
      #comparison-bar .btn { width: 100%; }
    }
`;
