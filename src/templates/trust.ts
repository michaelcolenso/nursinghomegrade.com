export function renderTrustModule(): string {
  return `
    <aside class="panel trust-module" aria-labelledby="trust-heading">
      <h3 id="trust-heading">How We Stay Independent</h3>
      <p class="muted">
        NursingHomeGrade is strictly independent. We do not accept payments from facilities. Our grades are calculated solely from federal CMS datasets.
      </p>
      <a class="link-arrow" href="/about">Learn about our data methodology →</a>
    </aside>
  `;
}
