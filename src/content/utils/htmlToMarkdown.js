export function convertHtmlToMarkdown(html) {
  return html
    .replace(/<h2[^>]*>/g, "\n## ")
    .replace(/<\/h2>/g, "\n\n")
    .replace(/<ul[^>]*>/g, "")
    .replace(/<\/ul>/g, "\n")
    .replace(/<li[^>]*>/g, "* ")
    .replace(/<\/li>/g, "\n")
    .replace(/<p[^>]*>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<strong[^>]*>/g, "**")
    .replace(/<\/strong>/g, "**")
    .replace(/&nbsp;/g, " ")
    .replace(/<!--.*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}
