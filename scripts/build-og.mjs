/**
 * scripts/build-og.mjs —— 为每条梗生成 1200×630 社交分享图（OG image，自托管）
 * 输出：assets/og/<id>.png
 * 方案：纯 SVG → PNG（@resvg/resvg-js 预编译二进制，零本地编译、零外部图片依赖）
 * 图面：梗主题色背景 + 英文标题（titleEn，主文案）+ 英文摘要（summaryEn，截断约两行）
 *       + 左上/右下角站点名 MemeBridge
 * 接入：npm run build 链（build:og 位于 build:memes 之前）；产物由 build-memes 的
 *       og:image 以 SITE_URL 绝对路径引用，并纳入 sw.js 预缓存清单
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const W = 1200;
const H = 630;
const MARGIN = 64;

// 主题色：从梗图 URL（placehold.co/…/HEX/…）提取，缺省用品牌紫
const ogColor = (m) => ((m.image || "").match(/placehold\.co\/\d+x\d+\/([0-9A-Fa-f]{6})\//) || [])[1] || "8B5CF6";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// 按词断行（无字体度量，按保守字符数估算；超出 maxLines 截断并加省略号）
function wrapWords(text, maxChars, maxLines, ellipsis = "…") {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last.length + ellipsis.length > maxChars) last = last.slice(0, -1);
    cut[maxLines - 1] = (last + ellipsis).trim();
    return cut;
  }
  return lines;
}

function renderLines(x, y, fontSize, weight, fill, opacity, lines, lineHeight) {
  return lines
    .map(
      (ln, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ""}>${esc(ln)}</text>`
    )
    .join("\n");
}

function buildSvg(m) {
  const color = "#" + ogColor(m);
  const title = m.titleEn || m.nameEN || m.nameCN || m.id;
  const summary = m.summaryEn || "";

  const titleLines = wrapWords(title, 32, 3);
  const summaryLines = wrapWords(summary.slice(0, 150), 62, 2);
  const titleStartY = 200;
  const titleLineHeight = 76;
  const summaryStartY = titleStartY + titleLines.length * titleLineHeight + 20;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${color}"/>
  <rect width="${W}" height="12" fill="rgba(255,255,255,0.22)"/>
  <circle cx="${W - 130}" cy="120" r="230" fill="rgba(255,255,255,0.12)"/>
  <text x="${MARGIN}" y="88" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="30" font-weight="600" fill="#FFFFFF" opacity="0.9">MemeBridge</text>
${renderLines(MARGIN, titleStartY, 58, "700", "#FFFFFF", null, titleLines, titleLineHeight)}
${renderLines(MARGIN, summaryStartY, 27, "400", "#FFFFFF", 0.9, summaryLines, 40)}
  <text x="${W - MARGIN}" y="${H - 40}" font-family="Arial, 'Helvetica Neue', sans-serif" font-size="26" font-weight="600" fill="#FFFFFF" text-anchor="end" opacity="0.85">MemeBridge</text>
</svg>
`;
}

const contentDir = path.join(root, "content", "memes");
const outDir = path.join(root, "assets", "og");
fs.mkdirSync(outDir, { recursive: true });

const { Resvg } = require("@resvg/resvg-js");
const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json")).sort();
for (const f of files) {
  const m = JSON.parse(fs.readFileSync(path.join(contentDir, f), "utf8"));
  const png = new Resvg(buildSvg(m), { fitTo: { mode: "width", value: W } }).render().asPng();
  const out = path.join(outDir, `${m.id}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ assets/og/${m.id}.png（${(png.length / 1024).toFixed(1)} KB · 主题色 #${ogColor(m)}）`);
}
console.log(`共生成 ${files.length} 张 OG 图`);
