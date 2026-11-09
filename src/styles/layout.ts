// Masthead and mobile navigation.
export const LAYOUT_CSS = `
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
      color: #fff;
      background: var(--accent);
      padding: 0.4rem 1rem;
      border-radius: 0;
      text-decoration: none;
      border: none;
      transition: background 0.2s ease;
      white-space: nowrap;
    }
    .masthead-search-btn:hover { background: var(--accent-hover); border: none; }

    /* Hamburger toggle — visible on mobile only */
    .masthead-toggle {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 4px;
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
      background: none;
      border: 1px solid var(--rule);
      cursor: pointer;
      transition: border-color 0.2s ease;
    }
    .masthead-toggle:hover { border-color: var(--ink); }
    .masthead-toggle-bar {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--ink);
      border-radius: 1px;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
    }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(2) {
      opacity: 0;
    }
    .masthead-toggle[aria-expanded="true"] .masthead-toggle-bar:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
    }

    @media (max-width: 640px) {
      .masthead-search-btn { min-height: 44px; padding: 0.45rem 1rem; font-size: 0.9rem; }
    }

`;
