import { layout } from "./layout";
import { COMPARE_CHIP_JS } from "./components";

/**
 * @param noindex set when the request carries an `ids` parameter. Those URLs are
 * combinatorial — one per selection of facilities — so they are crawlable in
 * unbounded numbers and land in the alternate-with-canonical bucket. The bare
 * /compare page stays indexable.
 */
export function comparePage(noindex = false): string {
  const body = `
    <h1 class="display">Comparison</h1>
    <p class="lede">Review your saved facilities side-by-side.</p>
    
    <div id="compare-container" class="compare-container" aria-live="polite" aria-atomic="false">
      <p>Loading your saved facilities...</p>
    </div>

    <p class="section-gap"><a class="link-arrow" href="/">← Return to search</a></p>
  `;

  const scripts = `
    <script>
      (function() {
        ${COMPARE_CHIP_JS}
        const container = document.getElementById('compare-container');
        const storageKey = 'nhg_saved_facilities';

        function savedFacilities() {
          try {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
          } catch {
            return [];
          }
        }

        function queryIds() {
          const ids = new URLSearchParams(window.location.search).get('ids');
          if (!ids) return [];
          return ids.split(',').map(function(id) { return id.trim(); }).filter(Boolean);
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

        const ids = queryIds();
        if (ids.length === 0) {
          const saved = savedFacilities();
          ids.push.apply(ids, saved.map(function(f) { return f.cms_id; }).filter(Boolean));
        }

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
          <div class="table-container"><table class="comparison-table compare-table">
            <thead>
              <tr>
                <th scope="col">Facility</th>
                \${facilities.map(function(f) { return \`<th scope="col"><a href="\${esc(f.report_path)}">\${esc(f.name)}</a><div class="compare-sub">\${esc(f.city)}, \${esc(f.state)} \${esc(f.zip)}</div></th>\`; }).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Grade</th>
                \${facilities.map(function(f) { return \`<td>\${chipHtml(f)}</td>\`; }).join('')}
              </tr>
              <tr>
                <th scope="row">RN Staffing</th>
                \${facilities.map(function(f) { return \`<td>\${esc(formatStaffing(f.rn_hours_per_resident_day))}</td>\`; }).join('')}
              </tr>
              <tr>
                <th scope="row">Deficiencies</th>
                \${facilities.map(function(f) { return \`<td>\${f.total_deficiencies === null || f.total_deficiencies === undefined ? 'Not reported' : esc(f.total_deficiencies)}</td>\`; }).join('')}
              </tr>
              <tr>
                <th scope="row">Summary</th>
                \${facilities.map(function(f) { return \`<td>\${esc(f.grade_summary)}</td>\`; }).join('')}
              </tr>
              <tr>
                <td></td>
                \${facilities.map(function(f) { return \`<td><a href="\${esc(f.report_path)}" class="btn-secondary">View report</a><br><button type="button" data-remove="\${esc(f.cms_id)}" class="compare-remove">Remove</button></td>\`; }).join('')}
              </tr>
            </tbody>
          </table></div>
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
    { extraScripts: scripts, canonicalPath: "/compare", noindex }
  );
}
