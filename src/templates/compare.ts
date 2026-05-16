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
        const storageKey = 'nhg_saved_facilities';

        function savedFacilities() {
          try {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
          } catch {
            return [];
          }
        }

        function esc(value) {
          return String(value ?? '').replace(/[&<>"']/g, function(char) {
            return {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;'
            }[char];
          });
        }

        function formatStaffing(value) {
          return value === null || value === undefined ? 'Not reported' : Number(value).toFixed(2) + ' hrs';
        }

        function removeFacility(id) {
          const next = savedFacilities().filter(function(f) { return f.cms_id !== id; });
          localStorage.setItem(storageKey, JSON.stringify(next));
          window.location.reload();
        }

        const saved = savedFacilities();
        const ids = saved.map(function(f) { return f.cms_id; }).filter(Boolean);

        if (ids.length === 0) {
          container.innerHTML = '<p>No facilities saved for comparison yet.</p>';
          return;
        }

        fetch('/api/compare?ids=' + encodeURIComponent(ids.join(',')))
          .then(function(response) {
            if (!response.ok) throw new Error('Comparison data failed to load');
            return response.json();
          })
          .then(function(facilities) {
            if (facilities.length === 0) {
              container.innerHTML = '<p>No saved facilities could be found.</p>';
              return;
            }

            container.innerHTML = \`
          <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--ink);">
                <th style="padding: 1rem; text-align: left;">Facility</th>
                \${facilities.map(function(f) { return \`<th style="padding: 1rem; text-align: left;"><a href="\${esc(f.report_path)}">\${esc(f.name)}</a><div style="font-size:0.8rem;color:var(--muted);font-weight:600;text-transform:uppercase;">\${esc(f.city)}, \${esc(f.state)} \${esc(f.zip)}</div></th>\`; }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--rule);">
                <td style="padding: 1rem; font-weight: 700;">Grade</td>
                \${facilities.map(function(f) { return \`<td style="padding: 1rem;"><strong class="grade-\${esc(f.grade_letter)}">\${esc(f.grade_letter)}</strong> (\${esc(f.grade_score)}/100)</td>\`; }).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--rule);">
                <td style="padding: 1rem; font-weight: 700;">RN Staffing</td>
                \${facilities.map(function(f) { return \`<td style="padding: 1rem;">\${esc(formatStaffing(f.rn_hours_per_resident_day))}</td>\`; }).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--rule);">
                <td style="padding: 1rem; font-weight: 700;">Deficiencies</td>
                \${facilities.map(function(f) { return \`<td style="padding: 1rem;">\${f.total_deficiencies === null || f.total_deficiencies === undefined ? 'Not reported' : esc(f.total_deficiencies)}</td>\`; }).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--rule);">
                <td style="padding: 1rem; font-weight: 700;">Summary</td>
                \${facilities.map(function(f) { return \`<td style="padding: 1rem;">\${esc(f.grade_summary)}</td>\`; }).join('')}
              </tr>
              <tr>
                <td style="padding: 1rem;"></td>
                \${facilities.map(function(f) { return \`<td style="padding: 1rem;"><a href="\${esc(f.report_path)}" class="btn-secondary">View report</a><br><button type="button" data-remove="\${esc(f.cms_id)}" class="btn-secondary" style="color:var(--grade-F);">Remove</button></td>\`; }).join('')}
              </tr>
            </tbody>
          </table>
        \`;

            container.querySelectorAll('[data-remove]').forEach(function(button) {
              button.addEventListener('click', function() {
                removeFacility(button.getAttribute('data-remove'));
              });
            });
          })
          .catch(function() {
            container.innerHTML = '<p>Comparison data is temporarily unavailable.</p>';
          });
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
