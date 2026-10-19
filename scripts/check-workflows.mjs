/**
 * scripts/check-workflows.mjs —— GitHub Actions workflow YAML 语法校验
 * 用法：node scripts/check-workflows.mjs（npm run check:workflows）
 * 任一文件解析失败：打印错误并 exit 1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const yaml = require("js-yaml");

const dir = path.join(root, ".github", "workflows");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")) : [];
if (!files.length) {
  console.error("✗ .github/workflows/ 下没有 workflow 文件");
  process.exit(1);
}

let fail = 0;
for (const f of files) {
  try {
    const doc = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
    if (!doc || typeof doc !== "object") throw new Error("顶层必须是映射");
    console.log(`✓ ${f} YAML 语法合法（on: ${Object.keys(doc.on || {}).join(", ")}；jobs: ${Object.keys(doc.jobs || {}).join(", ")}）`);
  } catch (e) {
    fail++;
    console.error(`✗ ${f} YAML 解析失败：${e.message}`);
  }
}
process.exit(fail ? 1 : 0);
