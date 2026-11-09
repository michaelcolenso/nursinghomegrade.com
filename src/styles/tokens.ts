// Design tokens (:root custom properties). PLAN §3. test/design-tokens.test.ts
// parses this file and enforces WCAG contrast on the colour pairs below.
export const TOKENS_CSS = `
    :root {
      /* Brand */
      --navy-900: #0B1D33;   /* ink, primary buttons, dark bands */
      --navy-800: #1A2E4A;   /* primary button hover */
      --teal-600: #16897A;   /* brand teal: fills, marks, large numerals (4.29:1 on white: large/UI only) */
      --teal-700: #0F6E62;   /* links, teal buttons, small teal text (6.13:1) */
      --teal-800: #0B5A50;   /* teal hover */
      --teal-50:  #E8F3F1;   /* tint panels */
      --slate-600: #60717D;  /* muted text (5.05:1 on white) */
      --line: #E6EBEF;       /* rules and card borders: decorative only, never the sole edge of a control */
      --line-strong: #7F8F9B; /* input + secondary-button borders: 3.33:1 on white, 3.15:1 on --bg (WCAG 1.4.11) */
      --bg: #F7F9FA;         /* page background */
      --surface: #FFFFFF;

      /* Grades: fill = bars, chip borders, meters; ink = text-safe (AA on white) */
      --grade-A-fill: #12805D; --grade-A-ink: #12805D;
      --grade-B-fill: #1FA38C; --grade-B-ink: #177968;
      --grade-C-fill: #F5B23D; --grade-C-ink: #8A5A00;
      --grade-D-fill: #E4573D; --grade-D-ink: #B4361C;
      --grade-F-fill: #B91C1C; --grade-F-ink: #B91C1C;
      --grade-NR-fill: #C9D2D9; --grade-NR-ink: #60717D;
      --grade-A-tint: #E7F3EE; --grade-B-tint: #E8F5F2; --grade-C-tint: #FDF4E3;
      --grade-D-tint: #FCECE8; --grade-F-tint: #FBEAEA; --grade-NR-tint: #F0F3F5;

      /* Semantic */
      --alarm: var(--grade-F-ink);  /* replaces burgundy wherever it meant "bad" */
      --focus: #0F6E62;             /* 2px outline, 2px offset */

      /* Legacy aliases (Phase 1 only; deleted in Phase 6). Un-migrated templates still use these. */
      --ink: var(--navy-900);
      --muted: var(--slate-600);
      --rule: var(--line);
      --accent: var(--teal-700);
      --accent-hover: var(--teal-800);
      --accent-positive: var(--teal-700);
      --grade-A: var(--grade-A-ink);
      --grade-B: var(--grade-B-ink);
      --grade-C: var(--grade-C-ink);
      --grade-D: var(--grade-D-ink);
      --grade-F: var(--grade-F-ink);

      /* Severity colours */
      --sev-low: var(--slate-600);
      --sev-med: var(--grade-C-ink);
      --sev-high: var(--grade-F-ink);

      /* Type */
      --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
      --font-ui: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

      /* Spacing scale */
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

      /* Shape and elevation */
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-1: 0 1px 2px rgba(11,29,51,.06), 0 1px 1px rgba(11,29,51,.04);
      --shadow-2: 0 4px 16px -4px rgba(11,29,51,.10);

      /* Layout */
      --container: 1200px;
      --gutter: 16px;
      --header-h: 60px;
    }
    @media (min-width: 641px) { :root { --gutter: 24px; } }
    @media (min-width: 901px) { :root { --header-h: 72px; } }
`;
