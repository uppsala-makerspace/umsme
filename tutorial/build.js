import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const dist = resolve(root, "dist");

// Tutorials grouped by tag. Adding a new tag is "add another key with its
// slug list"; new slugs need matching {lang}/{slug}.md files.
const TUTORIALS = {
  app: ["installApp", "existingMembers", "newMembers", "renewMembership", "manageFamily"],
};

// Always pull these specific files from screens-manual/, even when a
// generated counterpart exists. Used for screens where the live runtime
// (e.g. browser geolocation taking time to settle into an accurate
// distance) makes the Storybook capture unreliable.
const FORCE_MANUAL = ["doors-en.png", "doors-sv.png"];

const LANGS = {
  en: {
    switcherLabel: "SV",
    siteTitle: "Tutorials",
    tocTitle: "Contents",
    tagsTitle: "Tags",
    allLabel: "All",
    tagLabels: { app: "App" },
  },
  sv: {
    switcherLabel: "EN",
    siteTitle: "Guider",
    tocTitle: "Innehåll",
    tagsTitle: "Etiketter",
    allLabel: "Alla",
    tagLabels: { app: "App" },
  },
};

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

// Open external links in a new tab.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href") ?? "";
  if (/^https?:\/\//.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Tutorials live at dist/{lang}/tutorials/{tag}/<slug>.html while screens
// stay at dist/screens/, so rewrite "../screens/foo.png" in each tutorial's
// source up two extra levels to reach the screens root.
const defaultImage =
  md.renderer.rules.image ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const src = tokens[idx].attrGet("src") ?? "";
  if (src.startsWith("../screens/")) {
    tokens[idx].attrSet("src", "../../" + src);
  }
  return defaultImage(tokens, idx, options, env, self);
};

md.core.ruler.push("add_heading_ids", (state) => {
  for (let i = 0; i < state.tokens.length; i++) {
    const t = state.tokens[i];
    if (t.type !== "heading_open") continue;
    if (t.tag !== "h2" && t.tag !== "h3") continue;
    const inline = state.tokens[i + 1];
    if (inline?.type === "inline") t.attrSet("id", slugify(inline.content));
  }
});

const template = readFileSync(resolve(root, "template.html"), "utf8");

const fillTemplate = (vars) =>
  Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );

const otherLang = (lang) => (lang === "en" ? "sv" : "en");

const parseMarkdown = (source) => {
  const tokens = md.parse(source, {});
  let title = "";
  let summary = "";
  const tocItems = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!title && t.type === "heading_open" && t.tag === "h1") {
      title = tokens[i + 1].content;
    } else if (
      !summary &&
      title &&
      t.type === "paragraph_open" &&
      tokens[i + 1].type === "inline"
    ) {
      summary = tokens[i + 1].content;
    }
    if (t.type === "heading_open" && (t.tag === "h2" || t.tag === "h3")) {
      const inline = tokens[i + 1];
      if (inline?.type === "inline") {
        tocItems.push({
          level: t.tag === "h2" ? 2 : 3,
          text: inline.content,
          id: slugify(inline.content),
        });
      }
    }
  }
  const html = md.render(source);
  return { title, summary, html, tocItems };
};

const renderToc = (items, title) => {
  if (!items.length) return { tocButton: "", aside: "" };
  const lis = items
    .map(
      (i) =>
        `<li class="toc-h${i.level}"><a href="#${i.id}">${escapeHtml(i.text)}</a></li>`,
    )
    .join("\n        ");
  return renderSidebar(title, lis);
};

// `prefix` is the relative path from the calling page back up to the
// tutorials root. The all-listing sits at the root (prefix ""); per-tag
// listings and tutorials sit one level deeper inside a tag dir (prefix "../").
const renderTagFilter = (lang, currentTag, prefix) => {
  const tagsTitle = LANGS[lang].tagsTitle;
  const tags = Object.keys(TUTORIALS);
  const items = [
    { href: `${prefix}index.html`, text: LANGS[lang].allLabel, active: currentTag === null },
    ...tags.map((t) => ({
      href: `${prefix}${t}/index.html`,
      text: LANGS[lang].tagLabels[t] ?? t,
      active: currentTag === t,
    })),
  ];
  const lis = items
    .map(
      (i) =>
        `<li class="toc-h2"><a href="${escapeHtml(i.href)}"${i.active ? ' class="active"' : ""}>${escapeHtml(i.text)}</a></li>`,
    )
    .join("\n        ");
  return renderSidebar(tagsTitle, lis);
};

const renderSidebar = (title, listItemsHtml) => {
  const tocButton = `<label for="toc-toggle" class="toc-button" aria-label="${escapeHtml(title)}">
      <span class="toc-icon" aria-hidden="true"></span><span class="toc-button-text">${escapeHtml(title)}</span>
    </label>`;
  const aside = `<input type="checkbox" id="toc-toggle" class="toc-checkbox" hidden>
    <aside class="toc">
      <div class="toc-title">${escapeHtml(title)}</div>
      <ol class="toc-list">
        ${listItemsHtml}
      </ol>
    </aside>`;
  return { tocButton, aside };
};

// Build the breadcrumb HTML for the header. `items` is an ordered list of
// `{ text, href? }`. The last item is rendered as plain text (current page);
// earlier items become links if they carry an href.
const renderBreadcrumb = (items) =>
  items
    .map((item, i) => {
      const last = i === items.length - 1;
      const sep =
        i > 0
          ? '<span class="breadcrumb-sep" aria-hidden="true">›</span>'
          : "";
      const inner = escapeHtml(item.text);
      const content =
        !last && item.href
          ? `<a href="${escapeHtml(item.href)}">${inner}</a>`
          : `<span${last ? ' class="breadcrumb-current"' : ""}>${inner}</span>`;
      return sep + content;
    })
    .join("");

// Locate the tag that owns a tutorial slug, or null if unknown.
const tagOf = (slug) => {
  for (const [tag, slugs] of Object.entries(TUTORIALS)) {
    if (slugs.includes(slug)) return tag;
  }
  return null;
};

const renderTutorial = (lang, slug, parsed) => {
  const ol = otherLang(lang);
  const tag = tagOf(slug);
  const { tocButton, aside } = renderToc(parsed.tocItems, LANGS[lang].tocTitle);
  const breadcrumb = renderBreadcrumb([
    { text: LANGS[lang].siteTitle, href: "../index.html" },
    tag && { text: LANGS[lang].tagLabels[tag] ?? tag, href: "index.html" },
    { text: parsed.title },
  ].filter(Boolean));
  const html = fillTemplate({
    lang,
    bodyClass: "page-tutorial",
    title: parsed.title,
    breadcrumb,
    cssUrl: "../../../site.css",
    otherLang: ol,
    otherLangLabel: LANGS[lang].switcherLabel,
    otherLangUrl: `../../../${ol}/tutorials/${tag}/${slug}.html`,
    tocButton,
    aside,
    content: parsed.html,
  });
  const out = resolve(dist, lang, "tutorials", tag, `${slug}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
};

// `prefix` is prepended to each card's href so the all-listing can link
// into `{tag}/{slug}.html` while a per-tag listing links to siblings
// `{slug}.html` in its own directory.
const cardsHtml = (items, prefix) =>
  items
    .map(
      ({ slug, title, summary, tag }) => `
      <a class="tutorial-card" href="${prefix === "" ? `${tag}/` : ""}${slug}.html">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(summary)}</p>
      </a>`,
    )
    .join("\n");

const renderTagsListing = (lang, items, currentTag) => {
  const ol = otherLang(lang);
  const isAll = currentTag === null;
  const tagLabel = isAll ? null : LANGS[lang].tagLabels[currentTag] ?? currentTag;
  // The all-listing sits at tutorials/index.html (prefix ""), per-tag
  // listings at tutorials/{tag}/index.html (prefix "../" to climb back out).
  const prefix = isAll ? "" : "../";
  const breadcrumb = isAll
    ? renderBreadcrumb([{ text: LANGS[lang].siteTitle }])
    : renderBreadcrumb([
        { text: LANGS[lang].siteTitle, href: "../index.html" },
        { text: tagLabel },
      ]);
  const { tocButton, aside } = renderTagFilter(lang, currentTag, prefix);
  const heading = isAll
    ? LANGS[lang].siteTitle
    : tagLabel;
  const content = `<h1>${escapeHtml(heading)}</h1>\n<div class="tutorial-grid">${cardsHtml(items, prefix)}\n</div>`;
  const html = fillTemplate({
    lang,
    bodyClass: "page-landing",
    title: isAll
      ? LANGS[lang].siteTitle
      : `${LANGS[lang].siteTitle} · ${tagLabel}`,
    breadcrumb,
    cssUrl: isAll ? "../../site.css" : "../../../site.css",
    otherLang: ol,
    otherLangLabel: LANGS[lang].switcherLabel,
    otherLangUrl: isAll
      ? `../../${ol}/tutorials/index.html`
      : `../../../${ol}/tutorials/${currentTag}/index.html`,
    tocButton,
    aside,
    content,
  });
  const out = isAll
    ? resolve(dist, lang, "tutorials", "index.html")
    : resolve(dist, lang, "tutorials", currentTag, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
};

const writeRedirect = (path, target) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${target}">
  <title>Tutorials</title>
</head>
<body>
  <p>Redirecting to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
};

// --- build ---

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const allTutorialsBuilt = { en: [], sv: [] };
const tutorialsByTag = { en: {}, sv: {} };

for (const [tag, slugs] of Object.entries(TUTORIALS)) {
  tutorialsByTag.en[tag] = [];
  tutorialsByTag.sv[tag] = [];
  for (const slug of slugs) {
    const enPath = resolve(root, "en", `${slug}.md`);
    const svPath = resolve(root, "sv", `${slug}.md`);
    if (!existsSync(enPath) || !existsSync(svPath)) {
      console.warn(`skip ${slug} — missing one of the languages`);
      continue;
    }
    for (const lang of ["en", "sv"]) {
      const source = readFileSync(resolve(root, lang, `${slug}.md`), "utf8");
      const parsed = parseMarkdown(source);
      renderTutorial(lang, slug, parsed);
      const entry = { slug, title: parsed.title, summary: parsed.summary, tag };
      allTutorialsBuilt[lang].push(entry);
      tutorialsByTag[lang][tag].push(entry);
    }
  }
}

for (const lang of ["en", "sv"]) {
  renderTagsListing(lang, allTutorialsBuilt[lang], null);
  for (const tag of Object.keys(TUTORIALS)) {
    renderTagsListing(lang, tutorialsByTag[lang][tag] ?? [], tag);
  }
  // Bare-lang URL (/{lang}/) — redirect into the new tutorials/ home.
  writeRedirect(resolve(dist, lang, "index.html"), "tutorials/index.html");
}

writeRedirect(resolve(dist, "index.html"), "en/tutorials/index.html");

// Lay manual captures down first so any frame not yet covered by Storybook
// stories falls through to the original PNG; then overlay the symlinked
// screens-generated dir which wins on name collisions; finally re-overlay
// the FORCE_MANUAL files so they always come from screens-manual.
cpSync(resolve(root, "screens-manual"), resolve(dist, "screens"), { recursive: true });
cpSync(resolve(root, "screens"), resolve(dist, "screens"), { recursive: true, dereference: true });
for (const f of FORCE_MANUAL) {
  cpSync(resolve(root, "screens-manual", f), resolve(dist, "screens", f));
}
cpSync(resolve(root, "site.css"), resolve(dist, "site.css"));

console.log(
  `built ${allTutorialsBuilt.en.length} tutorial(s) × 2 langs → ${resolve(dist)}`,
);
