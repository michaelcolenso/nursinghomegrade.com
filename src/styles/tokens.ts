// Design tokens (:root custom properties).
export const TOKENS_CSS = `
    :root {
      /* Brand Colors */
      --bg: #F7F9FA;
      --ink: #0B1D33;
      --muted: #4A6272;
      --rule: #E6EBEF;
      --accent: #9f1239;
      --accent-hover: #7c0f2d;
      --accent-positive: #0e6b60;

      /* Grade Palette */
      --grade-A: #12805D;
      --grade-B: #177968;
      --grade-C: #946108;
      --grade-D: #C6361C;
      --grade-F: #B91C1C;

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
`;
