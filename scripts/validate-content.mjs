/**
 * scripts/validate-content.mjs —— 内容校验门卫（投稿进主分支前的自动关卡）
 * 校验 content/memes/*.json：
 *   JSON 可解析、根节点为对象、必填字段、类型、枚举值、
 *   id 与文件名一致且全局唯一、数值范围、谱系节点、引用目标存在、未知字段。
 * 任一失败：打印中文错误并 exit 1；npm run build 前置执行本脚本。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content", "memes");

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TEMP_ENUM = ["cold", "warm", "hot"];
const LINEAGE_TYPE_ENUM = ["origin", "copy", "mutation", "crossover", "reimport"];
const DATE_RE = /^\d{4}-\d{2}$/;

const KNOWN_FIELDS = new Set([
  "id", "nameCN", "nameEN", "titleEn", "summaryEn", "pinyin", "emotionEquivalent",
  "symbolLayer", "origin", "usage", "commonMisreading",
  "accessibilityScore", "mediaTemperature", "tags", "memeLineage",
  "likes", "shares", "image", "related"
]);
const SYMBOL_FIELDS = new Set(["literalTranslation", "explanation"]);
const SCORE_FIELDS = new Set(["language", "context", "adaptability"]);
const LINEAGE_NODE_FIELDS = new Set(["date", "event", "type"]);

const errors = [];
const err = (file, msg) => errors.push(`✗ ${file}: ${msg}`);
const isNonEmptyStr = (v) => typeof v === "string" && v.trim() !== "";
const isNonNegNum = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) {
  console.error("✗ content/memes/ 下没有任何 JSON 内容文件");
  process.exit(1);
}

const parsed = [];
for (const f of files) {
  const fp = path.join(contentDir, f);
  let m;
  try {
    m = JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch (e) {
    err(f, `JSON 无法解析：${e.message}`);
    continue;
  }
  if (!m || typeof m !== "object" || Array.isArray(m)) {
    err(f, "根节点必须是对象");
    continue;
  }
  parsed.push({ file: f, m });

  // 未知字段（模板 _说明 未删除、拼写错误）
  for (const k of Object.keys(m)) {
    if (!KNOWN_FIELDS.has(k)) err(f, `未知字段 "${k}"（投稿模板中的 "_说明" 字段提交前要删除）`);
  }

  // id：必填 + 格式 + 与文件名一致
  const base = f.replace(/\.json$/, "");
  if (!isNonEmptyStr(m.id)) {
    err(f, `缺少必填字段 "id"`);
  } else {
    if (!ID_RE.test(m.id)) err(f, `id "${m.id}" 不合法：只允许小写字母、数字、连字符`);
    if (m.id !== base) err(f, `id "${m.id}" 与文件名 "${base}" 不一致（id 即文件名即 URL slug）`);
  }

  // 必填字符串字段
  for (const k of ["nameCN", "nameEN", "pinyin", "emotionEquivalent", "origin", "usage", "commonMisreading"]) {
    if (!isNonEmptyStr(m[k])) err(f, `缺少必填字符串字段 "${k}"`);
  }

  // 英文字段（SEO）：titleEn 必填；summaryEn 必填且 80~160 字符
  if (!isNonEmptyStr(m.titleEn)) {
    err(f, `缺少必填字符串字段 "titleEn"（英文标题，用于详情页 H1 / og:title / JSON-LD headline）`);
  }
  if (!isNonEmptyStr(m.summaryEn)) {
    err(f, `缺少必填字符串字段 "summaryEn"（英文摘要，80~160 字符）`);
  } else if (m.summaryEn.length < 80 || m.summaryEn.length > 160) {
    err(f, `summaryEn 长度必须在 80~160 字符之间（当前 ${m.summaryEn.length} 字符）`);
  }

  // symbolLayer
  if (!m.symbolLayer || typeof m.symbolLayer !== "object" || Array.isArray(m.symbolLayer)) {
    err(f, `缺少必填对象字段 "symbolLayer"`);
  } else {
    for (const k of Object.keys(m.symbolLayer)) {
      if (!SYMBOL_FIELDS.has(k)) err(f, `symbolLayer 存在未知字段 "${k}"`);
    }
    for (const k of ["literalTranslation", "explanation"]) {
      if (!isNonEmptyStr(m.symbolLayer[k])) err(f, `symbolLayer 缺少必填字符串字段 "${k}"`);
    }
  }

  // accessibilityScore
  if (!m.accessibilityScore || typeof m.accessibilityScore !== "object" || Array.isArray(m.accessibilityScore)) {
    err(f, `缺少必填对象字段 "accessibilityScore"`);
  } else {
    for (const k of Object.keys(m.accessibilityScore)) {
      if (!SCORE_FIELDS.has(k)) err(f, `accessibilityScore 存在未知字段 "${k}"`);
    }
    for (const k of ["language", "context", "adaptability"]) {
      const v = m.accessibilityScore[k];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
        err(f, `accessibilityScore.${k} 必须是 1-5 的整数（当前：${JSON.stringify(v)}）`);
      }
    }
  }

  // mediaTemperature 枚举
  if (!TEMP_ENUM.includes(m.mediaTemperature)) {
    err(f, `mediaTemperature 枚举非法（当前：${JSON.stringify(m.mediaTemperature)}，允许：${TEMP_ENUM.join("/")}）`);
  }

  // tags
  if (!Array.isArray(m.tags) || !m.tags.length || !m.tags.every((t) => isNonEmptyStr(t))) {
    err(f, `tags 必须是非空字符串数组`);
  }

  // memeLineage
  if (!Array.isArray(m.memeLineage) || !m.memeLineage.length) {
    err(f, `memeLineage 必须是非空数组`);
  } else {
    m.memeLineage.forEach((n, i) => {
      if (!n || typeof n !== "object") { err(f, `memeLineage[${i}] 必须是对象`); return; }
      for (const k of Object.keys(n)) {
        if (!LINEAGE_NODE_FIELDS.has(k)) err(f, `memeLineage[${i}] 存在未知字段 "${k}"`);
      }
      if (!isNonEmptyStr(n.date) || !DATE_RE.test(n.date)) {
        err(f, `memeLineage[${i}].date 必须为 YYYY-MM 格式（当前：${JSON.stringify(n.date)}）`);
      }
      if (!isNonEmptyStr(n.event)) err(f, `memeLineage[${i}] 缺少必填字符串字段 "event"`);
      if (!LINEAGE_TYPE_ENUM.includes(n.type)) {
        err(f, `memeLineage[${i}].type 枚举非法（当前：${JSON.stringify(n.type)}，允许：${LINEAGE_TYPE_ENUM.join("/")}）`);
      }
    });
  }

  // 计数
  if (!isNonNegNum(m.likes)) err(f, `likes 必须是非负数字（当前：${JSON.stringify(m.likes)}）`);
  if (!isNonNegNum(m.shares)) err(f, `shares 必须是非负数字（当前：${JSON.stringify(m.shares)}）`);

  // image
  if (!isNonEmptyStr(m.image) || !/^https?:\/\//.test(m.image)) {
    err(f, `image 必须是 http(s):// 开头的图片 URL（当前：${JSON.stringify(m.image)}）`);
  }
}

// 跨文件检查：id 全局唯一
const seen = new Map();
for (const { file, m } of parsed) {
  if (typeof m.id !== "string") continue;
  if (seen.has(m.id)) err(file, `id "${m.id}" 与 ${seen.get(m.id)} 重复（id 必须全局唯一）`);
  else seen.set(m.id, file);
}

// 跨文件检查：related 引用的梗必须存在
for (const { file, m } of parsed) {
  if (m.related === undefined) continue;
  if (!Array.isArray(m.related) || !m.related.every((r) => isNonEmptyStr(r))) {
    err(file, `related 必须是字符串数组`);
    continue;
  }
  for (const r of m.related) {
    if (!seen.has(r)) err(file, `related 引用了不存在的梗 id "${r}"`);
  }
}

if (errors.length) {
  console.error(`内容校验失败，共 ${errors.length} 处错误：\n` + errors.join("\n"));
  console.error(`\n修复后重跑：npm run validate`);
  process.exit(1);
}
console.log(`✓ 内容校验通过：${parsed.length} 条梗全部合法`);
