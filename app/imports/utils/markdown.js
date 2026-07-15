/**
 * Plain-text excerpt of a markdown string for list views: markdown syntax is
 * stripped and the text is cut at a word boundary with a trailing ellipsis.
 * @param {string} markdown
 * @param {number} maxLength  Maximum excerpt length (excluding the ellipsis).
 * @returns {string}
 */
export const markdownExcerpt = (markdown, maxLength = 120) => {
  if (!markdown) return "";
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "") // list markers
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/(\*\*|__|\*|_|~~)/g, "") // emphasis markers
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Cut at the last word boundary unless that would leave almost nothing.
  return `${cut.slice(0, lastSpace > maxLength / 3 ? lastSpace : maxLength).trimEnd()}…`;
};
