export function renderTrustModule(): string {
  return `
    <div class="card" style="margin-top: var(--space-xl); padding: var(--space-m); border-top: 4px solid var(--accent);">
      <h3 style="margin-top: 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent);">How We Stay Independent</h3>
      <p style="font-size: 0.95rem; margin-bottom: var(--space-s); color: var(--muted);">
        NursingHomeGrade is strictly independent. We do not accept payments from facilities. Our grades are calculated solely from federal CMS datasets.
      </p>
      <a href="/about" style="font-weight: 700; font-size: 0.9rem; text-decoration: underline;">Learn about our data methodology →</a>
    </div>
  `;
}
