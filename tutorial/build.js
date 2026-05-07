import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const dist = resolve(root, "dist");

const TUTORIALS = ["newMembers", "existingMembers", "renewMembership"];

const LANGS = {
  en: { switcherLabel: "SV", siteTitle: "Tutorials", tocTitle: "Contents" },
  sv: { switcherLabel: "EN", siteTitle: "Guider", tocTitle: "Innehåll" },
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
  const tocButton = `<label for="toc-toggle" class="toc-button" aria-label="${escapeHtml(title)}">
      <span class="toc-icon" aria-hidden="true"></span><span class="toc-button-text">${escapeHtml(title)}</span>
    </label>`;
  const aside = `<input type="checkbox" id="toc-toggle" class="toc-checkbox" hidden>
    <aside class="toc">
      <div class="toc-title">${escapeHtml(title)}</div>
      <ol class="toc-list">
        ${lis}
      </ol>
    </aside>`;
  return { tocButton, aside };
};

const renderTutorial = (lang, slug, parsed) => {
  const ol = otherLang(lang);
  const { tocButton, aside } = renderToc(parsed.tocItems, LANGS[lang].tocTitle);
  const html = fillTemplate({
    lang,
    bodyClass: "page-tutorial",
    title: parsed.title,
    siteTitle: LANGS[lang].siteTitle,
    homeUrl: "index.html",
    cssUrl: "../site.css",
    otherLang: ol,
    otherLangLabel: LANGS[lang].switcherLabel,
    otherLangUrl: `../${ol}/${slug}.html`,
    tocButton,
    aside,
    content: parsed.html,
  });
  const out = resolve(dist, lang, `${slug}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
};

const renderLanding = (lang, items) => {
  const ol = otherLang(lang);
  const cards = items
    .map(
      ({ slug, title, summary }) => `
      <a class="tutorial-card" href="${slug}.html">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(summary)}</p>
      </a>`,
    )
    .join("\n");
  const heading = lang === "sv" ? "Välj en guide" : "Pick a tutorial";
  const content = `<h1>${heading}</h1>\n<div class="tutorial-grid">${cards}\n</div>`;
  const html = fillTemplate({
    lang,
    bodyClass: "page-landing",
    title: LANGS[lang].siteTitle,
    siteTitle: LANGS[lang].siteTitle,
    homeUrl: "index.html",
    cssUrl: "../site.css",
    otherLang: ol,
    otherLangLabel: LANGS[lang].switcherLabel,
    otherLangUrl: `../${ol}/index.html`,
    tocButton: "",
    aside: "",
    content,
  });
  const out = resolve(dist, lang, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
};

const writeRootIndex = () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=en/index.html">
  <link rel="canonical" href="en/index.html">
  <title>Tutorials</title>
</head>
<body>
  <p>Redirecting to <a href="en/index.html">English tutorials</a>.</p>
</body>
</html>
`;
  writeFileSync(resolve(dist, "index.html"), html);
};

// --- build ---

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const built = { en: [], sv: [] };

for (const slug of TUTORIALS) {
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
    built[lang].push({ slug, title: parsed.title, summary: parsed.summary });
  }
}

for (const lang of ["en", "sv"]) {
  renderLanding(lang, built[lang]);
}

writeRootIndex();

cpSync(resolve(root, "screens"), resolve(dist, "screens"), { recursive: true });
cpSync(resolve(root, "site.css"), resolve(dist, "site.css"));

console.log(
  `built ${built.en.length} tutorial(s) × 2 langs → ${resolve(dist)}`,
);
