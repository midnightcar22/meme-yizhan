/**
 * tests/i18n-smoke.mjs —— jsdom 冒烟测试（npm run smoke，需先 npm run build）
 * 验证：
 *  1. SPA 默认英文渲染（导航/首页无中文界面文案残留）
 *  2. 点右上角切换 → 全站中文、document.title / html lang 即时更新
 *  3. localStorage 持久化：预置 zh 的新实例直接以中文渲染（等价于刷新后保持选择）
 *  4. 切语言后交互正常：发现页筛选胶囊仍可用
 *  5. 静态详情页：html lang=en、英文 H1（titleEn）、og/JSON-LD 英文、中文正文在 Original 分区、点赞落库
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, ResourceLoader } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost/";

/* 从磁盘读取站点文件（相对 http://localhost 路径），保证 localStorage 可用（http 源） */
class FSLoader extends ResourceLoader {
  fetch(url, options) {
    try {
      const u = new URL(url);
      if (u.origin === "http://localhost") {
        const rel = decodeURIComponent(u.pathname).replace(/^\//, "");
        const p = path.join(root, rel);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return Promise.resolve(Buffer.from(fs.readFileSync(p)));
        }
      }
    } catch {}
    return super.fetch(url, options);
  }
}

const makeOpts = (seedLang) => ({
  url: BASE,
  runScripts: "dangerously",
  resources: new FSLoader(),
  pretendToBeVisual: true,
  beforeParse(window) {
    window.scrollTo = () => {};
    if (seedLang) window.localStorage.setItem("meme-lang", seedLang);
  }
});

const loadPage = async (relPath, seedLang) => {
  const html = fs.readFileSync(path.join(root, relPath), "utf8");
  return new JSDOM(html, makeOpts(seedLang));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
};

/* ---------- 1-4. SPA：默认英文 → 切中文 → 刷新保持 → 交互 ---------- */
{
  const dom = await loadPage("index.html");
  await sleep(60);
  const doc = dom.window.document;

  check("默认语言为 en（html lang）", doc.documentElement.lang === "en");
  check("默认英文界面：导航含 Home", doc.body.textContent.includes("Home"));
  check("默认英文界面：无「首页」残留", !doc.body.textContent.includes("首页"));
  check("首页英文 Hero 按钮：Decode Now", doc.body.textContent.includes("Decode Now"));
  check("首页英文标题：Meme Wiki", doc.body.textContent.includes("Meme Wiki"));
  check("切换按钮显示目标语言「中文」", (doc.getElementById("lang-toggle")?.textContent || "").includes("中文"));
  check("MEME_DATA 已加载且含 titleEn", (dom.window.MEME_DATA?.[0]?.titleEn || "").length > 0);

  /* 2. 切中文：即时全站重渲染 */
  doc.getElementById("lang-toggle").click();
  await sleep(100);
  check("切中文后导航为「首页」", doc.body.textContent.includes("首页"));
  check("切中文后无英文「Home」残留", !doc.body.textContent.includes("Home"));
  check("切中文后 html lang=zh-CN", doc.documentElement.lang === "zh-CN");
  check("切中文后 document.title 更新", doc.title.includes("跨文化转译"));
  check("切中文后 localStorage 持久化", dom.window.localStorage.getItem("meme-lang") === "zh");

  /* 3. 刷新保持：预置 zh 的新实例直接中文渲染 */
  const dom2 = await loadPage("index.html", "zh");
  await sleep(60);
  const doc2 = dom2.window.document;
  check("刷新后保持中文（新实例直接中文渲染）", doc2.body.textContent.includes("首页") && doc2.documentElement.lang === "zh-CN");
  dom2.window.close();

  /* 4. 切语言后交互正常：发现页筛选 */
  dom.window.location.hash = "#/discover";
  await sleep(100);
  check("发现页渲染（中文标题）", doc.body.textContent.includes("发现"));
  check("发现页中文排序项（最热）", doc.body.textContent.includes("最热"));
  const pill = doc.querySelector('[data-filter-key="temp"][data-filter-val="cold"]');
  pill.click();
  await sleep(100);
  check("筛选点击生效（hash 更新）", dom.window.location.hash.includes("temp=cold"));
  check("筛选计数行中文（匹配当前筛选）", doc.body.textContent.includes("匹配当前筛选"));
  dom.window.close();
}

/* ---------- 5. 静态详情页：英文首屏 + 中文正文 + 互动 ---------- */
{
  const dom = await loadPage("memes/city-bu-city.html");
  await sleep(80);
  const doc = dom.window.document;

  check("详情页 html lang=en", doc.documentElement.lang === "en");
  check("详情页 H1 为英文标题（titleEn）", (doc.querySelector("h1")?.textContent || "").includes("City or Not City?"));
  check("详情页含英文摘要（summaryEn）", doc.body.textContent.includes("Chinglish catchphrase"));
  check("Original 分区标题在（🌏 Original · 中文原文）", doc.body.textContent.includes("Original · 中文原文"));
  check("中文正文内容仍在（起源：保保熊）", doc.body.textContent.includes("保保熊"));
  check("中文正文内容仍在（中式英语结构说明）", doc.body.textContent.includes("中式英语"));
  check("og:title 为英文", (doc.querySelector('meta[property="og:title"]')?.content || "").includes("City or Not City?"));
  check("og:description 为英文摘要", (doc.querySelector('meta[property="og:description"]')?.content || "").includes("Chinglish"));
  check("JSON-LD headline 为英文", (doc.querySelector('script[type="application/ld+json"]')?.textContent || "").includes("City or Not City?"));

  const likeBtn = doc.querySelector(".like-btn");
  likeBtn.click();
  await sleep(40);
  const stored = JSON.parse(dom.window.localStorage.getItem("meme-user") || "{}");
  check("静态页点赞交互正常（liked 落库）", (stored.liked || []).includes("city-bu-city"));
  dom.window.close();

  /* 静态页 + 已选中文：水合后界面为中文，H1 仍为英文标题（双语分区设计） */
  const domZh = await loadPage("memes/city-bu-city.html", "zh");
  await sleep(80);
  const docZh = domZh.window.document;
  check("静态页切中文后界面为中文（三层解码器）", docZh.body.textContent.includes("三层解码器"));
  check("静态页切中文后 H1 仍为英文标题（titleEn）", (docZh.querySelector("h1")?.textContent || "").includes("City or Not City?"));
  check("静态页切中文后中文标题区（常见误读）", docZh.body.textContent.includes("常见误读"));
  domZh.window.close();
}

console.log(failures ? `\n✗ ${failures} 项未通过` : "\n✓ 全部通过");
process.exit(failures ? 1 : 0);
