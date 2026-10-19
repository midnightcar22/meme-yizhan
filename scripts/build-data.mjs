/**
 * scripts/build-data.mjs —— 合并 content/memes/*.json 生成 js/data.js（构建产物）
 * 内容唯一来源是 content/memes/*.json；本脚本生成的 js/data.js 勿手改（已加入 .gitignore）。
 * 导出格式与历史手写版本一致：const MEME_DATA = [...] + window.MEME_DATA = MEME_DATA。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content", "memes");

const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) {
  console.error("[build-data] content/memes/ 下没有任何 JSON，生成中止");
  process.exit(1);
}

const memes = files.map((f) => JSON.parse(fs.readFileSync(path.join(contentDir, f), "utf8")));

const header = `/* ============================================================
 * 文件名：js/data.js
 * 项目：MEME·译站 / MemeBridge
 * 说明：构建产物（勿手改）。由 scripts/build-data.mjs 根据
 *       content/memes/*.json 自动生成，字段规范见 content/schema.md
 * 生成时间：${new Date().toISOString()}
 * 内容源：${files.join("、")}
 * ============================================================ */

`;

const body = `const MEME_DATA = ${JSON.stringify(memes, null, 2)};

// 挂载到全局，供 index.html 的路由与渲染逻辑使用
window.MEME_DATA = MEME_DATA;
`;

fs.writeFileSync(path.join(root, "js", "data.js"), header + body, "utf8");
console.log(`✓ js/data.js（由 ${files.length} 个内容文件生成）`);
