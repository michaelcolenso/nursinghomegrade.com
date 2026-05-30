export function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove script, style, nav, header, footer, aside
  md = md.replace(/<(script|style|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, "");

  // Convert block elements - keep content raw for inline conversion later
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `\n\n# ${c}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `\n\n## ${c}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `\n\n### ${c}\n\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `\n\n#### ${c}\n\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => `\n\n##### ${c}\n\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, c) => `\n\n###### ${c}\n\n`);

  // Convert paragraphs and divs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `\n\n${c}\n\n`);
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_, c) => `\n\n${c}\n\n`);

  // Convert lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${c.trim()}\n`);

  // Convert tables
  md = md.replace(/<table[\s\S]*?<\/table>/gi, convertTable);

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Run inline conversion on entire text
  md = inlineMd(md);

  // Decode common entities
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}

function inlineMd(html: string): string {
  let md = html;
  // Nested inline elements first
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `**${inlineMd(c)}**`);
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `**${inlineMd(c)}**`);
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `*${inlineMd(c)}*`);
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `*${inlineMd(c)}*`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${inlineMd(c)}\``);
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const t = inlineMd(text).trim();
    if (!t) return "";
    return `[${t}](${href})`;
  });
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]+>/g, "");
  return md;
}

function convertTable(html: string): string {
  const rows: string[][] = [];
  const rowMatches = html.matchAll(/<tr[\s\S]*?<\/tr>/gi);
  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (const cellMatch of cellMatches) {
      cells.push(inlineMd(cellMatch[1]).trim());
    }
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return "";

  let md = "\n\n";
  const colCount = Math.max(...rows.map((r) => r.length));

  // Header row
  md += "| " + rows[0].join(" | ") + " |\n";
  md += "|" + Array(colCount).fill(" --- ").join("|") + "|\n";

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    md += "| " + rows[i].join(" | ") + " |\n";
  }

  return md + "\n";
}

export async function maybeMarkdown(response: Response, request: Request): Promise<Response> {
  const accept = request.headers.get("Accept") || "";
  if (!accept.includes("text/markdown")) return response;

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const md = htmlToMarkdown(html);

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Content-Type", "text/markdown; charset=UTF-8");
  newHeaders.delete("Content-Length");

  return new Response(md, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
