// Reset, body, container, accessibility helpers, skip link.
export const BASE_CSS = `

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

`;
