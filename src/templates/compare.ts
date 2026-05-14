import { layout } from "./layout";

export function comparePage(): string {
  const body = `
    <h1 class="display">Comparison</h1>
    <p class="lede">Review your saved facilities side-by-side.</p>
    
    <div id="compare-container" style="overflow-x: auto; margin-bottom: var(--space-2xl);">
      <p>Loading your saved facilities...</p>
    </div>

    <p style="margin-top:var(--space-2xl);"><a href="/">← Return to search</a></p>
  `;

  const scripts = `
    <script>
      (function() {
        const container = document.getElementById('compare-container');
        const data = JSON.parse(localStorage.getItem('nhg_saved_facilities') || '[]');

        if (data.length === 0) {
          container.innerHTML = '<p>No facilities saved for comparison yet.</p>';
          return;
        }

        // Fetching facility data would happen here if we wanted full details, 
        // but for now we render what we saved.
        container.innerHTML = \`
          <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--ink);">
                <th style="padding: 1rem; text-align: left;">Facility</th>
                \${data.map(f => \`<th style="padding: 1rem; text-align: left;">\${f.name}</th>\`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--rule);">
                <td style="padding: 1rem; font-weight: 700;">Grade</td>
                \${data.map(f => \`<td style="padding: 1rem;">\${f.grade_letter} (\${f.grade_score}/100)</td>\`).join('')}
              </tr>
              <tr>
                <td style="padding: 1rem;"></td>
                \${data.map(f => \`<td style="padding: 1rem;"><a href="#" onclick="remove('\${f.cms_id}')" class="btn-secondary" style="color:var(--grade-F);">Remove</a></td>\`).join('')}
              </tr>
            </tbody>
          </table>
        \`;

        window.remove = function(id) {
          const newData = data.filter(f => f.cms_id !== id);
          localStorage.setItem('nhg_saved_facilities', JSON.stringify(newData));
          window.location.reload();
        }
      })();
    </script>
  `;

  return layout(
    "Compare Facilities — NursingHomeGrade",
    "Side-by-side comparison of your saved nursing home facilities.",
    body,
    { extraScripts: scripts }
  );
}
