// Reset, body, container, typography, links, focus, accessibility helpers.
export const BASE_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-padding-top: calc(var(--header-h) + 16px); }
    body {
      font-family: var(--font-ui);
      color: var(--navy-900);
      background: var(--bg);
      line-height: 1.6;
      font-size: 1.0625rem;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: var(--container); margin: 0 auto; padding-inline: var(--gutter); }
    .site-main { padding-top: var(--space-xl); padding-bottom: var(--space-xl); }

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
    .skip-link {
      position: absolute;
      top: -48px;
      left: 8px;
      background: var(--navy-900);
      color: #fff;
      padding: 0.6rem 1rem;
      text-decoration: none;
      z-index: 1001;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: var(--radius-sm);
      transition: top 0.15s ease-out;
    }
    .skip-link:focus { top: 8px; outline: 2px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 4px var(--navy-900); }

    /* Typography */
    h1, h2, h3 { font-weight: 700; overflow-wrap: break-word; }
    h1, h2, .display { font-family: var(--font-display); }
    .display {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -0.01em;
      margin-bottom: var(--space-m);
      color: var(--navy-900);
    }
    h1 { font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.1; margin-bottom: var(--space-m); }
    /* Sections own their rhythm in migrated pages; the margin stays for un-migrated ones until Phase 5. */
    h2 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.15; margin-bottom: var(--space-s); margin-top: var(--space-xl); }
    h3 { font-family: var(--font-ui); font-size: 1.1875rem; font-weight: 600; line-height: 1.3; margin-bottom: var(--space-xs); margin-top: var(--space-l); }
    p { margin-bottom: var(--space-s); }
    main p, main li { max-width: 72ch; }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--slate-600);
      margin-bottom: var(--space-2xs);
    }

    /* Links */
    a { color: var(--teal-700); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s ease-out, color 0.15s ease-out; }
    a:hover { border-bottom-color: currentColor; }
    a:visited { color: var(--teal-800); }
    main p a, main li a, main dd a { text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; border-bottom: 0; }
    main p a:hover, main li a:hover, main dd a:hover { text-decoration-thickness: 2px; }
    .link-arrow { display: inline-flex; align-items: center; gap: 0.35rem; min-height: 44px; font-weight: 600; color: var(--teal-700); text-decoration: none; border-bottom: 0; }
    .link-arrow:hover { color: var(--teal-800); text-decoration: underline; text-underline-offset: 3px; border-bottom: 0; }

    /* Editorial */
    .lede {
      font-size: 1.25rem;
      line-height: 1.5;
      color: var(--navy-900);
      margin-bottom: var(--space-l);
      max-width: 62ch;
      font-weight: 400;
    }
    .lede strong { font-weight: 700; color: var(--alarm); }
    .pull-quote {
      border-left: 3px solid var(--teal-600);
      padding: var(--space-xs) 0 var(--space-xs) var(--space-m);
      margin: var(--space-xl) 0;
      font-family: var(--font-display);
      font-size: clamp(1.2rem, 2.5vw, 1.45rem);
      line-height: 1.45;
      color: var(--navy-900);
      max-width: 62ch;
    }
    .pull-quote strong { font-family: var(--font-ui); font-weight: 600; display: block; margin-bottom: var(--space-2xs); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.08em; color: var(--slate-600); }

    /* Focus: one visible ring everywhere; dark surfaces flip to white (see .on-dark). */
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    .on-dark :focus-visible, .btn-on-dark:focus-visible { outline-color: #fff; }
`;
