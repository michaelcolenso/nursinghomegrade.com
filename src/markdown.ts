/**
 * Lightweight HTML-to-Markdown converter for Accept: text/markdown support.
 * Handles the specific HTML output produced by our templates.
 */

export function htmlToMarkdown(html: string): string {
  // Extract title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch?.[1]?.trim() ?? "";

  // Remove <head> entirely
  let body = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Remove <script> and <style> blocks
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove skip-link
  body = body.replace(/<a[^>]*skip-link[^>]*>[\s\S]*?<\/a>/gi, "");

  // Remove comparison bar
  body = body.replace(/<div[^>]*id="comparison-bar"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Extract main content
  const mainMatch = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let content = mainMatch?.[1] ?? body;

  // Remove header and footer
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

  // Remove remaining inline scripts
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Handle SVG inline icons
  content = content.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");

  // Strip form feedback behaviors and utility class references
  content = content.replace(/\bonclick="[^"]*"/gi, "");
  content = content.replace(/\bonchange="[^"]*"/gi, "");
  content = content.replace(/\bdata-loading-text="[^"]*"/gi, "");

  // Convert heading elements
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n\n# ${stripTags(text).trim()}\n`);
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n\n## ${stripTags(text).trim()}\n`);
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n\n### ${stripTags(text).trim()}\n`);
  content = content.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, text) => `\n\n#### ${stripTags(text).trim()}\n`);

  // Convert block elements
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n\n${stripTags(text).trim()}\n`);
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `- ${stripTags(text).trim()}`);
  content = content.replace(/<\/ul>/gi, "\n");
  content = content.replace(/<\/ol>/gi, "\n");
  content = content.replace(/<br\s*\/?>/gi, "\n");
  content = content.replace(/<hr[^>]*>/gi, "\n---\n");

  // Convert inline formatting
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  content = content.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // Image alt text
  content = content.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "![$1]");
  content = content.replace(/<img[^>]*>/gi, "");

  // Labels and forms: extract meaning
  content = content.replace(/<label[^>]*>([\s\S]*?)<\/label>/gi, (_, text) => `\n**${stripTags(text).trim()}**: `);
  content = content.replace(/<input[^>]*placeholder="([^"]*)"[^>]*>/gi, (_: string, placeholder: string) => `[${placeholder}]`);
  content = content.replace(/<select[^>]*>[\s\S]*?<\/select>/gi, "[dropdown]");
  content = content.replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, (_: string, text: string) => `[Button: ${stripTags(text).trim()}]`);
  content = content.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "\n[Form]\n");

  // Strip remaining HTML tags
  content = stripTags(content);

  // Decode entities
  content = decodeEntities(content);

  // Collapse whitespace
  content = content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join("\n\n");

  // Add title header
  let md = "";
  if (title) {
    md += `# ${title}\n\n`;
  }

  md += content.trim();

  // Collapse excessive blank lines
  md = md.replace(/\n{4,}/g, "\n\n\n");

  return md;
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/&copy;/g, "\u00A9");
}
