/**
 * scripts/build-memes.mjs —— 梗详情页 SSG 构建
 * 数据源 content/memes/*.json → 模板 js/wiki-template.js → 壳 src/meme-page.template.html
 * 产物：memes/<id>.html（含 OG/Twitter/JSON-LD/canonical）+ sitemap.xml + robots.txt
 * 注意：
 *   - 内容唯一来源是 content/memes/*.json（js/data.js 是构建产物，不从这里读）
 *   - 页面 OG/title/JSON-LD 使用英文 titleEn/summaryEn（SEO 面向海外）；
 *     HTML lang=en；中文正文保留在页内「Original 中文原文」分区
 *
 * 用法：
 *   node scripts/build-memes.mjs
 *   SITE_URL=https://your.domain node scripts/build-memes.mjs   # 上线时设置真实域名
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 上线前替换：canonical / og:url / sitemap 使用的绝对域名
const SITE_URL = (process.env.SITE_URL || "https://memebridge.example.com").replace(/\/+$/, "");

// 0) i18n：Node 侧按英文渲染（构建产物面向海外/爬虫）
const i18n = require(path.join(root, "js", "i18n.js"));
globalThis.t = i18n.t;

// 1) 内容源：content/memes/*.json（与 build-data.mjs 同源、同排序）
const contentDir = path.join(root, "content", "memes");
const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json")).sort();
const MEMES = files.map((f) => JSON.parse(fs.readFileSync(path.join(contentDir, f), "utf8")));
if (!MEMES.length) {
  console.error("[build-memes] content/memes/ 下没有任何 JSON，构建中止");
  process.exit(1);
}

// 2) 共享模板（浏览器 + Node 共用）
const tpl = require(path.join(root, "js", "wiki-template.js"));

// 3) 页面壳模板
const shell = fs.readFileSync(path.join(root, "src", "meme-page.template.html"), "utf8");

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 从梗图 URL（placehold.co/…/HEX/…）提取主色（build-og.mjs 用它生成自托管 OG 图）
const ogColor = (m) => ((m.image || "").match(/placehold\.co\/\d+x\d+\/([0-9A-Fa-f]{6})\//) || [])[1] || "8B5CF6";
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

const outDir = path.join(root, "memes");
fs.mkdirSync(outDir, { recursive: true });

const urls = [];
for (const m of MEMES) {
  const name = m.nameCN || m.id;
  // SEO 英文字段：titleEn 为标题，summaryEn 为描述（validate 已保证 80~160 字符）
  const title = m.titleEn || m.nameEN || name;
  const desc = clip(m.summaryEn || "", 160);
  const url = `${SITE_URL}/memes/${m.id}.html`;
  // OG 图已自托管（scripts/build-og.mjs → assets/og/<id>.png），不再引用 placehold.co
  const image = `${SITE_URL}/assets/og/${m.id}.png`;

  const lineage = m.memeLineage || [];
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    image,
    inLanguage: "en",
    author: { "@type": "Organization", name: "MemeBridge" },
    publisher: { "@type": "Organization", name: "MemeBridge" },
    datePublished: lineage[0] ? lineage[0].date + "-01" : undefined,
    dateModified: lineage.length ? lineage[lineage.length - 1].date + "-01" : undefined,
    mainEntityOfPage: url
  }).replace(/</g, "\\u003c"); // 防 </script> 提前闭合

  const html = shell
    .replaceAll("{{TITLE}}", esc(title))
    .replaceAll("{{DESC}}", esc(desc))
    .replaceAll("{{URL}}", esc(url))
    .replaceAll("{{IMAGE}}", esc(image))
    .replaceAll("{{JSONLD}}", jsonld)
    .replaceAll("{{BODY}}", tpl.wikiPageBody(m))
    .replaceAll("{{ID}}", String(m.id));

  fs.writeFileSync(path.join(outDir, `${m.id}.html`), html, "utf8");
  urls.push(url);
  console.log(`✓ memes/${m.id}.html`);
}

// 4) sitemap.xml + robots.txt
const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod></url>\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(
  path.join(root, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8"
);
console.log(`✓ sitemap.xml（${urls.length + 1} 个 URL）+ robots.txt`);
console.log(`  站点域名（SITE_URL）：${SITE_URL}  ← 上线前记得替换`);
