#!/usr/bin/env -S npx tsx

/**
 * 超軽量 TypeScript 静的ブログジェネレーター
 *
 * - Markdown → HTML (ビルド時のみ)
 * - PrismJS シンタックスハイライト (ビルド時のみ)
 * - RSS 2.0 フィード
 * - タグ別ページ
 * - ブラウザ側 JS ゼロ
 * - OS ネイティブダークモード (prefers-color-scheme)
 */

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import Prism from "prismjs";

// Prism 言語コンポーネント (side-effect import で globalThis.Prism に登録)
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-markdown.js";

// ---------- 設定 ----------

const SITE = {
  title: "sysnote8's blog",
  description: "Awesome Box",
  url: "https://sysnote8.com",
  author: "sysnote8main",
};

const CONTENT_DIR = "./content";
const DIST_DIR = "./dist";
const TAGS_DIR = `${DIST_DIR}/tags`;

// ---------- 型 ----------

interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  html: string;
}

// ---------- Markdown 処理 ----------

const md = new Marked(
  markedHighlight({
    langPrefix: "language-",
    highlight(code: string, lang: string) {
      const language = lang && Prism.languages[lang] ? lang : "plaintext";
      const grammar = Prism.languages[language];
      return grammar
        ? Prism.highlight(code, grammar, language)
        : escapeHtml(code);
    },
  }),
);

// ---------- Frontmatter 解析 ----------

function parseFrontmatter(raw: string): {
  data: Record<string, string>;
  body: string;
} {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2] };
}

// ---------- ユーティリティ ----------

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- CSS ----------

const SITE_CSS = `
:root {
  --bg: #ffffff;
  --fg: #1a1a1a;
  --muted: #666;
  --link: #0366d6;
  --border: #eaeaea;
  --code-bg: #f6f8fa;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #8b949e;
    --link: #58a6ff;
    --border: #30363d;
    --code-bg: #161b22;
  }
}
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
}
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
header h1 { font-size: 1.25rem; margin: 0; }
nav { font-size: 0.9rem; margin-top: 0.5rem; color: var(--muted); }
nav a { margin-right: 1rem; }
article h1 { margin-top: 0; }
.meta { color: var(--muted); font-size: 0.9em; margin-bottom: 1.5rem; }
.meta a { margin-right: 0.5em; }
pre { background: var(--code-bg); padding: 1rem; overflow-x: auto; border-radius: 6px; border: 1px solid var(--border); }
code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; font-size: 0.9em; }
:not(pre) > code { background: var(--code-bg); padding: 0.15em 0.4em; border-radius: 3px; }
img { max-width: 100%; height: auto; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
ul li { margin-bottom: 0.25em; }
`.trim();

// ---------- HTML テンプレート ----------

function pageHtml({
  title,
  content,
}: {
  title: string;
  content: string;
}): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${escapeHtml(SITE.title)}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/prism.css">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.title)}" href="/feed.xml">
</head>
<body>
  <header>
    <h1><a href="/">${escapeHtml(SITE.title)}</a></h1>
    <nav><a href="/">Home</a><a href="/tags/">Tags</a><a href="/feed.xml">RSS</a></nav>
  </header>
  <main>${content}</main>
</body>
</html>`;
}

// ---------- ビルド ----------

async function build() {
  // 1. dist/ をクリーン
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  await mkdir(TAGS_DIR, { recursive: true });

  // 2. 全記事を読み込み
  const posts: Post[] = [];
  for (const entry of await readdir(CONTENT_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const raw = await readFile(`${CONTENT_DIR}/${entry.name}`, "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = entry.name.replace(/\.md$/, "");
    const html = await md.parse(body);
    posts.push({
      slug,
      title: data.title || slug,
      date: data.date || "",
      tags: (data.tags || "")
        .split(",")
        .map((t) => slugify(t))
        .filter(Boolean),
      html,
    });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  // 3. 個別記事ページ
  for (const p of posts) {
    const tagsHtml = p.tags.length
      ? p.tags
          .map((t) => `<a href="/tags/${t}.html">#${escapeHtml(t)}</a>`)
          .join(" ")
      : "";
    const content = `<article>
  <h1>${escapeHtml(p.title)}</h1>
  <p class="meta"><time datetime="${escapeHtml(p.date)}">${escapeHtml(p.date)}</time>${tagsHtml ? " · " + tagsHtml : ""}</p>
  ${p.html}
</article>`;
    await writeFile(
      `${DIST_DIR}/${p.slug}.html`,
      pageHtml({ title: p.title, content }),
    );
  }

  // 4. インデックスページ
  const listHtml = posts.length
    ? `<ul>${posts.map((p) => `<li><time>${escapeHtml(p.date)}</time> <a href="/${p.slug}.html">${escapeHtml(p.title)}</a></li>`).join("")}</ul>`
    : "<p>No posts yet.</p>";
  await writeFile(
    `${DIST_DIR}/index.html`,
    pageHtml({
      title: SITE.title,
      content: `<h1>${escapeHtml(SITE.title)}</h1>${listHtml}`,
    }),
  );

  // 5. タグ別ページ + タグ一覧
  const tagMap = new Map<string, Post[]>();
  for (const p of posts) {
    for (const t of p.tags) {
      if (!tagMap.has(t)) tagMap.set(t, []);
      tagMap.get(t)!.push(p);
    }
  }

  // タグ一覧ページ
  const tagsListHtml = [...tagMap.keys()]
    .sort()
    .map(
      (t) =>
        `<li><a href="/tags/${t}.html">#${escapeHtml(t)}</a> (${tagMap.get(t)!.length})</li>`,
    )
    .join("");
  await writeFile(
    `${TAGS_DIR}/index.html`,
    pageHtml({
      title: "Tags",
      content: `<h1>Tags</h1><ul>${tagsListHtml}</ul>`,
    }),
  );

  for (const [tag, list] of tagMap) {
    const items = list
      .map(
        (p) =>
          `<li><time>${escapeHtml(p.date)}</time> <a href="/${p.slug}.html">${escapeHtml(p.title)}</a></li>`,
      )
      .join("");
    await writeFile(
      `${TAGS_DIR}/${tag}.html`,
      pageHtml({
        title: `#${tag}`,
        content: `<h1>#${escapeHtml(tag)}</h1><ul>${items}</ul>`,
      }),
    );
  }

  // 6. RSS フィード (最新20件)
  await writeFile(`${DIST_DIR}/feed.xml`, generateRSS(posts));

  // 7. style.css を dist/ に書き出し
  await writeFile(`${DIST_DIR}/style.css`, SITE_CSS);

  // 8. prism.css を dist/ にコピー
  let prismCss: string;
  try {
    const cssPath = fileURLToPath(
      import.meta.resolve("prismjs/themes/prism-tomorrow.css"),
    );
    prismCss = await readFile(cssPath, "utf8");
  } catch {
    prismCss = "/* prism theme not found */";
  }
  await writeFile(`${DIST_DIR}/prism.css`, prismCss);

  console.log(`✓ Built ${posts.length} posts, ${tagMap.size} tags`);
}

function generateRSS(posts: Post[]): string {
  const items = posts
    .slice(0, 20)
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE.url}/${p.slug}.html</link>
      <guid>${SITE.url}/${p.slug}.html</guid>
      <pubDate>${p.date ? new Date(p.date).toUTCString() : ""}</pubDate>
${p.tags.map((t) => `      <category>${escapeHtml(t)}</category>`).join("\n")}
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE.title)}</title>
    <link>${SITE.url}</link>
    <description>${escapeHtml(SITE.description)}</description>
    <language>ja</language>
${items}
  </channel>
</rss>
`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
}
