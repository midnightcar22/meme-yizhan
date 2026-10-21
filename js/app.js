/* ============================================================
 * 文件名：js/app.js
 * 项目：MEME·译站 / MemeBridge —— 中国梗的跨文化转译平台
 * 版本：v3.4
 * 最后更新：2026-10-17
 * ------------------------------------------------------------
 * 内容：Hash 路由 + 传播学 UI 组件 + 创作工厂 Canvas + 发现页筛选
 *       + 合规前端（Cookie 同意 / UGC 举报 / XSS 防御）
 *       + 静态详情页水合（memes/*.html，SEO/OG 入口）
 *       + 国际化（js/i18n.js：默认英文，右上角切换，langchange 即时重渲染）
 * 依赖：js/data.js（window.MEME_DATA）、js/i18n.js（t/getLang/setLang）、
 *       js/wiki-template.js（共享模板）、css/style.css
 * ============================================================ */

const $app = document.getElementById("app");
const $wrap = document.getElementById("page-wrap");

/* sanitizeInput / fb / stars / miniDiscount / TEMP / LINEAGE_TYPE / wikiPageBody
 * 已抽取到 js/wiki-template.js（浏览器 SPA 与 Node 构建脚本共用），此处经全局引用 */

/* ---------- 防御性工具：DOM 空值检查 ---------- */
function $(sel) {
  const el = document.querySelector(sel);
  if (!el) console.warn("[MemeBridge] Missing element:", sel);
  return el;
}

/* fb（数据字段 fallback）已移至 js/wiki-template.js */

/* ---------- 用户状态（参与式文化：积分 / 投票 / 点赞持久化） ---------- */
const store = {
  get() {
    try { return JSON.parse(localStorage.getItem("meme-user")) || {}; } catch { return {}; }
  },
  set(patch) {
    try { localStorage.setItem("meme-user", JSON.stringify({ ...this.get(), ...patch })); } catch {}
  }
};
const user = () => ({ points: 320, liked: [], voted: {}, tags: {}, ...(store.get()) });

/* stars / miniDiscount / TEMP / LINEAGE_TYPE 已移至 js/wiki-template.js（浏览器 + Node 共用） */

/* LADDER 名称/描述经 t("ladder.lX.name/desc") 取（js/i18n.js） */
const LADDER = [
  { lv: "L1", nameKey: "ladder.l1.name", descKey: "ladder.l1.desc", pts: 0 },
  { lv: "L2", nameKey: "ladder.l2.name", descKey: "ladder.l2.desc", pts: 100 },
  { lv: "L3", nameKey: "ladder.l3.name", descKey: "ladder.l3.desc", pts: 300 },
  { lv: "L4", nameKey: "ladder.l4.name", descKey: "ladder.l4.desc", pts: 600 },
  { lv: "L5", nameKey: "ladder.l5.name", descKey: "ladder.l5.desc", pts: 1000 }
];
const currentLevel = (pts) => LADDER.reduce((acc, l, i) => (pts >= l.pts ? i : acc), 0);
// 折扣平均分（发现页"最易懂"排序与难度筛选用）
const avgDiscount = (m) => {
  const s = m.accessibilityScore || { language: 3, context: 3, adaptability: 3 };
  return (s.language + s.context + s.adaptability) / 3;
};

/* ---------- 组件：梗卡片（首页/发现页瀑布流共用；词条/拼音不变，其余随语言） ---------- */
function memeCard(m) {
  if (!m) return "";
  const tp = TEMP[m.mediaTemperature] || TEMP.warm;
  const liked = user().liked.includes(m.id);
  const isZh = getLang() === "zh";
  const title = isZh ? fb.name(m) : (m.nameEN || fb.name(m));
  const sub = isZh ? (m.nameEN || "") : fb.name(m);
  const emotion = isZh ? (m.emotionEquivalent || "") : (m.emotionEquivalentEn || m.emotionEquivalent || "");
  return `
    <a href="memes/${m.id}.html" class="meme-card card block overflow-hidden border border-white/5">
      <div class="relative">
        <span class="temp-badge ${tp.cls}" title="${t("temp." + (m.mediaTemperature || "warm"))}">${tp.icon}</span>
        <img src="${m.image}" alt="${t("meme.alt", { name: fb.name(m) })}" class="w-full object-cover" loading="lazy" ${fb.imgErr} />
      </div>
      <div class="p-3">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="font-bold text-base">${sanitizeInput(title)}</h3>
          <span class="text-[10px] text-muted">${sanitizeInput(m.pinyin || "")}</span>
        </div>
        <p class="text-xs text-muted mt-0.5">${sanitizeInput(sub)}</p>
        <p class="text-xs text-primary mt-1">≈ “${sanitizeInput(emotion)}”</p>
        <div class="flex items-end justify-between mt-2">
          <span class="text-xs ${liked ? "text-primary" : "text-muted"}">❤️ ${(m.likes || 0) + (liked ? 1 : 0)}</span>
          ${miniDiscount(m.accessibilityScore)}
        </div>
      </div>
    </a>`;
}

/* ---------- 页面：首页 #/home ---------- */
function renderHome() {
  // 今日热梗 = 点赞最高（梗库扩容后，字母序首位不再是编辑推荐位）
  const hot = MEME_DATA.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0))[0] || {};
  return `
    <section class="relative rounded-2xl overflow-hidden mb-4 card">
      <img src="${hot.image || ""}" alt="${t("meme.alt", { name: fb.name(hot) })}" class="w-full h-44 object-cover opacity-70" ${fb.imgErr} />
      <div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent p-4 flex flex-col justify-end">
        <span class="text-[10px] uppercase tracking-widest text-accentGreen">${t("home.hero.badge")}</span>
        <h1 class="text-2xl font-extrabold mt-1">${sanitizeInput(fb.name(hot))} <span class="text-sm font-normal text-muted">${sanitizeInput(hot.nameEN || "")}</span></h1>
        <p class="text-xs text-muted mt-1">${sanitizeInput(getLang() === "zh" ? fb.usage(hot) : (hot.usageEn || fb.usage(hot)))}</p>
        <a href="memes/${hot.id}.html" class="btn mt-3 self-start bg-primary text-white text-xs font-bold px-4 py-2">${t("home.hero.cta")}</a>
      </div>
    </section>
    <h2 class="text-sm font-bold text-muted mb-3">${t("home.wiki.title")}</h2>
    <div class="masonry">${MEME_DATA.map(memeCard).join("")}</div>`;
}

/* renderWiki（梗详情视图）已迁移到 js/wiki-template.js 的 wikiPageBody：
 * 详情页静态化为 memes/<id>.html（SEO/OG），#/wiki/<id> 入口由 wikiRedirect 跳转 */

/* ============================================================
 * 【创作工具】创作工厂 #/create —— 梗工厂 Meme Lab
 * 左侧素材/温度调节 + 右侧 Canvas 编辑区 + 跨文化改编器
 * ============================================================ */

/* 【创作工具】创作工厂当前状态（模块级，跨重绘保持） */
const lab = {
  template: "panda",   // panda / duck / doge / blank / custom
  text: "",
  pos: "bottom",       // top / middle / bottom
  color: "#FFFFFF",
  size: 36,            // 24 / 36 / 48
  img: null,           // 自定义上传图片对象
  baseMeme: null       // 温度调节器关联的源梗
};

/* 【创作工具】模板元数据：emoji 占位 + 背景色（名称经 t(labelKey) 翻译） */
const LAB_TEMPLATES = [
  { id: "panda",  labelKey: "lab.tpl.panda",  emoji: "🐼", bg: "#FFFFFF", fg: "#111111" },
  { id: "duck",   labelKey: "lab.tpl.duck",   emoji: "🦆", bg: "#FFD34D", fg: "#7A5200" },
  { id: "doge",   labelKey: "lab.tpl.doge",   emoji: "🐕", bg: "#E8C07D", fg: "#5C3A00" },
  { id: "blank",  labelKey: "lab.tpl.blank",  emoji: "⬛", bg: "#1a1a1a", fg: "#FFFFFF" },
  { id: "custom", labelKey: "lab.tpl.custom", emoji: "📷", bg: "#2a2a2a", fg: "#FFFFFF" }
];

/* 【传播学设计】媒介温度调节器：基于麦克卢汉冷热媒介理论，提示跨媒介改编方向 */
function labTempHint() {
  const m = lab.baseMeme;
  if (!m) return "";
  const temp = m.mediaTemperature;
  const border = { cold: "border-[#3B82F6]/60", warm: "border-[#F4A261]/60", hot: "border-[#EF4444]/60" }[temp] || "border-white/10";
  return `
    <div class="card border ${border} p-3 mt-3 text-xs leading-relaxed">
      <p class="font-bold mb-1">${TEMP[temp].icon} ${t("lab.tempHintTitle", { temp: t("temp." + temp) })}</p>
      <p class="text-muted">${t("lab.hint." + temp)}</p>
    </div>`;
}

/* 【创作工具】创作工厂页面渲染（全文案 t()；工具栏状态对象为 lab，顺带修复原 labState 未定义的 bug） */
function renderCreate() {
  return `
    <h1 class="text-xl font-extrabold mb-1">${t("lab.title")}</h1>
    <p class="text-xs text-muted mb-4">${t("lab.subtitle")}</p>

    <div class="flex flex-col md:flex-row gap-4">
      <!-- 左：素材选择区（移动端全宽，桌面 40%） -->
      <div class="md:w-2/5">
        <p class="text-sm font-bold mb-2">${t("lab.step1")}</p>
        <div class="grid grid-cols-3 md:grid-cols-2 gap-2" id="tpl-grid">
          ${LAB_TEMPLATES.map(tp => `
            <button class="tpl-btn card border p-3 flex flex-col items-center gap-1 min-h-[56px] ${lab.template === tp.id ? "border-primary" : "border-white/10"}"
                    style="background:${tp.bg}" aria-label="${t("lab.tpl.aria", { label: t(tp.labelKey) })}" data-tpl="${tp.id}"
                    onclick="labSetTemplate('${tp.id}')">
              <span class="text-2xl">${tp.emoji}</span>
              <span class="text-[10px]" style="color:${tp.fg}">${t(tp.labelKey)}</span>
            </button>`).join("")}
        </div>
        <input type="file" id="lab-file" accept="image/jpeg,image/png" class="hidden" aria-label="${t("lab.fileAria")}" />

        <p class="text-sm font-bold mt-4 mb-2">${t("lab.step2")}</p>
        <select id="lab-meme" class="btn w-full bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                aria-label="${t("lab.memeAria")}" onchange="labSetBaseMeme(this.value)">
          <option value="">${t("lab.noMeme")}</option>
          ${MEME_DATA.map(m => `<option value="${m.id}" ${lab.baseMeme && lab.baseMeme.id === m.id ? "selected" : ""}>${sanitizeInput(fb.name(m))}（${t("temp." + m.mediaTemperature)}）</option>`).join("")}
        </select>
        <div id="lab-temp-hint">${labTempHint()}</div>
      </div>

      <!-- 右：Canvas 编辑区（移动端堆叠到底部，桌面 60%） -->
      <div class="md:w-3/5">
        <div class="card border border-white/10 p-3">
          <canvas id="lab-canvas" width="400" height="400"
                  class="w-full rounded-xl" style="max-width:min(100vw-32px,400px)" aria-label="${t("lab.canvasAria")}"></canvas>

          <!-- 文字工具栏 -->
          <input id="lab-text" placeholder="${t("lab.textPlaceholder")}" maxlength="40"
                 value="${sanitizeInput(lab.text)}" aria-label="${t("lab.textAria")}"
                 class="btn w-full bg-white/5 border border-white/10 px-3 py-2.5 text-sm mt-3 outline-none focus:border-primary"
                 oninput="lab.text=this.value;labDraw()" />

          <div class="flex flex-wrap items-center gap-2 mt-2">
            ${[["top", "lab.pos.top"], ["middle", "lab.pos.middle"], ["bottom", "lab.pos.bottom"]].map(([v, k]) => `
              <button class="pill text-xs px-4 py-2 min-h-[36px] border ${lab.pos === v ? "bg-primary text-white border-primary" : "border-white/10 bg-white/5"}"
                      aria-label="${t("lab.posAria", { pos: t(k) })}" onclick="lab.pos='${v}';labDraw();labSyncToolbar()">${t(k)}</button>`).join("")}
            <span class="w-px h-5 bg-white/10 mx-1"></span>
            ${[["#FFFFFF", "lab.color.white"], ["#000000", "lab.color.black"], ["#8B5CF6", "lab.color.purple"], ["#F4A261", "lab.color.orange"]].map(([c, k]) => `
              <button class="w-9 h-9 rounded-full ${lab.color === c ? "ring-2 ring-white" : ""}" style="background:${c}"
                      aria-label="${t("lab.colorAria", { color: t(k) })}" onclick="lab.color='${c}';labDraw();labSyncToolbar()"></button>`).join("")}
          </div>
          <div class="flex gap-2 mt-2">
            ${[[24, "lab.size.small"], [36, "lab.size.medium"], [48, "lab.size.large"]].map(([v, k]) => `
              <button class="pill text-xs px-4 py-2 min-h-[36px] border ${lab.size === v ? "bg-primary text-white border-primary" : "border-white/10 bg-white/5"}"
                      aria-label="${t("lab.sizeAria", { size: v })}" onclick="lab.size=${v};labDraw();labSyncToolbar()">${t(k)} ${v}px</button>`).join("")}
          </div>

          <!-- 操作按钮（≥48px，移动端可点） -->
          <div class="flex gap-2 mt-3">
            <button class="btn flex-1 min-h-[48px] bg-white/5 border border-white/10 text-sm font-bold" aria-label="${t("lab.randomAria")}" onclick="labRandom()">${t("lab.random")}</button>
            <button class="btn flex-1 min-h-[48px] bg-primary text-sm font-bold" aria-label="${t("lab.downloadAria")}" onclick="labDownload()">${t("lab.download")}</button>
            <button class="btn flex-1 min-h-[48px] bg-accentGreen/80 text-sm font-bold" aria-label="${t("lab.shareAria")}" onclick="labShare()">${t("lab.shareBtn")}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 【传播学设计】跨文化改编器（L4 跨文化改编：源梗 × 目标场景的语义迁移） -->
    <section class="card border border-white/5 p-4 mt-4">
      <h2 class="text-sm font-bold mb-2">${t("adapt.title")}</h2>
      <div class="flex flex-col gap-2">
        <select id="adapt-meme" class="btn bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none" aria-label="${t("lab.memeAria")}">
          ${MEME_DATA.map(m => `<option value="${m.id}">${sanitizeInput(fb.name(m))}</option>`).join("")}
        </select>
        <input id="adapt-scene" placeholder="${t("adapt.scenePlaceholder")}" maxlength="30"
               aria-label="${t("adapt.sceneAria")}" class="btn bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <button class="btn bg-primary py-2.5 text-sm font-bold min-h-[48px]" aria-label="${t("adapt.generateAria")}" onclick="labAdapt()">${t("adapt.generate")}</button>
      </div>
      <div id="adapt-result" class="hidden mt-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
        <p id="adapt-text" class="text-lg font-extrabold text-center"></p>
        <p id="adapt-en" class="text-xs text-muted text-center mt-1"></p>
        <div class="flex gap-2 mt-3">
          <button class="btn flex-1 min-h-[44px] bg-white/5 border border-white/10 text-xs" aria-label="${t("adapt.copyAria")}" onclick="labAdaptCopy()">${t("adapt.copy")}</button>
          <button class="btn flex-1 min-h-[44px] bg-white/5 border border-white/10 text-xs" aria-label="${t("adapt.againAria")}" onclick="labAdapt(true)">${t("adapt.again")}</button>
        </div>
      </div>
    </section>`;
}

/* 【创作工具】选择模板：custom 触发文件选择，其余直接重绘 */
function labSetTemplate(id) {
  lab.template = id;
  if (id === "custom") {
    const file = $("#lab-file");
    if (file) file.click();
    return;
  }
  document.querySelectorAll(".tpl-btn").forEach(b =>
    b.classList.toggle("border-primary", b.dataset.tpl === id));
  labDraw();
}

/* 【创作工具】关联源梗并刷新温度提示 */
function labSetBaseMeme(id) {
  lab.baseMeme = MEME_DATA.find(m => m.id === id) || null;
  const hint = $("#lab-temp-hint");
  if (hint) hint.innerHTML = labTempHint();
}

/* 【创作工具】工具栏选中态同步（不重绘整页，仅更新按钮样式） */
function labSyncToolbar() {
  rerender();
  requestAnimationFrame(() => labDraw());
}

/* 【创作工具】自定义图片上传：类型/大小校验，失败红框抖动 + 双语提示 */
function labHandleFile(fileInput) {
  const grid = $("#tpl-grid");
  const err = t("toast.uploadError");
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
  const f = fileInput.files[0];
  const ok = ["image/jpeg", "image/png"].includes(f.type) && f.size <= 5 * 1024 * 1024;
  if (!ok) {
    if (grid) {
      grid.classList.add("upload-error");
      setTimeout(() => grid.classList.remove("upload-error"), 450);
    }
    toast(err, true);
    fileInput.value = "";
    return;
  }
  const img = new Image();
  img.onload = () => {
    lab.img = img;
    lab.template = "custom";
    labDraw();
    toast(t("toast.imgLoaded"));
  };
  img.onerror = () => toast(err, true);
  img.src = URL.createObjectURL(f);
}

/* 【创作工具】Canvas 实时绘制：模板底图 + 文字（描边+阴影保证可读性） */
function labDraw() {
  const cv = $("#lab-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const t = LAB_TEMPLATES.find(x => x.id === lab.template) || LAB_TEMPLATES[3];
  const W = cv.width, H = cv.height;

  // 底图
  if (lab.template === "custom" && lab.img) {
    // cover 裁剪绘制
    const scale = Math.max(W / lab.img.width, H / lab.img.height);
    const w = lab.img.width * scale, h = lab.img.height * scale;
    ctx.drawImage(lab.img, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "120px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t.emoji, W / 2, H / 2 - 10);
  }

  // 梗文字
  const text = lab.text;
  if (text) {
    ctx.font = `bold ${lab.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const y = lab.pos === "top" ? 40 : lab.pos === "middle" ? H / 2 : H - 40;
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    ctx.lineWidth = 4; ctx.strokeStyle = lab.color === "#000000" ? "#FFFFFF" : "#000000";
    ctx.strokeText(text, W / 2, y);
    ctx.fillStyle = lab.color;
    ctx.fillText(text, W / 2, y);
    ctx.shadowBlur = 0;
  }
}

/* 【创作工具】绘制水印（下载/分享时调用，不影响画布实时预览） */
function labWithWatermark(cb) {
  const cv = $("#lab-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#8B5CF6";
  ctx.fillText("MemeBridge", cv.width - 10, cv.height - 8);
  ctx.globalAlpha = 1;
  cv.toBlob((blob) => {
    cb(blob);
    labDraw(); // 水印仅用于导出，导出后恢复无水印预览
  }, "image/png");
}

/* 【创作工具】下载梗图（PNG，带 MemeBridge 水印） */
function labDownload() {
  labWithWatermark((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meme-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    awardPts(10);
  });
}

/* 【创作工具】分享梗图：优先 navigator.share(files)，降级为下载 */
function labShare() {
  labWithWatermark(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "meme.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "My Meme · MemeBridge" }); awardPts(10); } catch {}
    } else {
      // 降级：复制链接提示 + 下载
      toast(t("toast.shareFallback"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `meme-${Date.now()}.png`;
      a.click();
    }
  });
}

/* 【创作工具】随机生成：随机梗 → 自动填充文字与推荐模板 */
function labRandom() {
  const m = MEME_DATA[Math.floor(Math.random() * MEME_DATA.length)];
  if (!m) return;
  lab.text = m.nameCN;
  lab.baseMeme = m;
  lab.template = ["panda", "duck", "doge"][Math.floor(Math.random() * 3)];
  rerender();
  requestAnimationFrame(() => labDraw());
}

/* 【传播学设计】跨文化改编器：源梗核心词 × 目标场景的前缀替换规则（L4 跨文化改编） */
const ADAPT_RULES = {
  "city-bu-city": (scene) => `${scene}不${scene}`,
  "jue-jue-zi":   (scene) => `${scene}绝绝子`,
  "da-gong-ren":  (scene) => `${scene}打工人`,
  "nei-juan":     (scene) => `${scene}内卷`,
  "tang-ping":    (scene) => `${scene}躺平`
};
let lastAdapt = "";

function labAdapt(reshuffle = false) {
  const memeSel = $("#adapt-meme"), sceneInput = $("#adapt-scene");
  if (!memeSel || !sceneInput) return;
  let scene = sanitizeInput(sceneInput.value.trim());
  if (!scene) {
    // "再改一次"或空输入时给随机场景
    const presets = ["London", "Wall Street", "Silicon Valley", "Berlin", "Paris", "Tokyo Office", "New York"];
    scene = presets[Math.floor(Math.random() * presets.length)];
    sceneInput.value = scene;
  }
  if (reshuffle) {
    const presets = ["London", "Wall Street", "Silicon Valley", "Berlin", "Paris", "Tokyo Office", "New York", "Seoul"];
    scene = presets[Math.floor(Math.random() * presets.length)];
    sceneInput.value = scene;
  }
  const rule = ADAPT_RULES[memeSel.value];
  const meme = MEME_DATA.find(m => m.id === memeSel.value);
  lastAdapt = rule ? rule(scene) : `${scene}${fb.name(meme)}`;

  const box = $("#adapt-result"), txt = $("#adapt-text"), en = $("#adapt-en");
  if (!box || !txt) return;
  txt.textContent = lastAdapt; // textContent 渲染，杜绝 XSS
  const eq = getLang() === "zh" ? (meme.emotionEquivalent || "") : (meme.emotionEquivalentEn || meme.emotionEquivalent || "");
  if (en) en.textContent = meme ? t("adapt.from", { name: fb.name(meme), eq }) : "";
  box.classList.remove("hidden");
  awardPts(10);
}

/* 【创作工具】复制改编结果 */
function labAdaptCopy() {
  if (!lastAdapt) return;
  navigator.clipboard && navigator.clipboard.writeText(lastAdapt)
    .then(() => toast(t("toast.copied")))
    .catch(() => toast(lastAdapt));
}

/* ============================================================
 * 发现页 #/discover：三层筛选 + 排序 + URL 参数同步
 * 筛选状态保存在 hash 查询参数（如 #/discover?temp=cold&tag=职场），可分享
 * ============================================================ */

/* 解析 hash 查询参数 */
function parseQuery() {
  const q = (location.hash.split("?")[1] || "");
  const o = {};
  new URLSearchParams(q).forEach((v, k) => { o[k] = v; });
  return { temp: o.temp || "all", tag: o.tag || "all", disc: o.disc || "all", sort: o.sort || "hot" };
}

/* 更新筛选条件并同步到 URL hash */
function setFilter(key, val) {
  const q = parseQuery();
  q[key] = val;
  const qs = new URLSearchParams(q).toString();
  location.hash = `#/discover?${qs}`;
}

/* 标签筛选胶囊（key 用于 hash 参数与数据匹配，label 经 t() 翻译） */
const TAG_FILTERS = [
  { key: "旅游", label: "tag.travel" },
  { key: "职场", label: "tag.workplace" },
  { key: "吐槽", label: "tag.roast" },
  { key: "恋爱", label: "tag.love" },
  { key: "校园", label: "tag.school" },
  { key: "社会", label: "tag.society" },
  { key: "情绪", label: "tag.emotion" },
  { key: "语言", label: "tag.language" }
];

/* 【传播学设计】发现页筛选：按媒介温度（冷热媒介）/标签/文化折扣（折扣理论）三维过滤 */
function filterMemes() {
  const { temp, tag, disc, sort } = parseQuery();
  let list = MEME_DATA.slice();

  // 媒介温度筛选
  if (temp !== "all") list = list.filter(m => m.mediaTemperature === temp);
  // 标签筛选（职场/社会等映射到数据 tags，吐槽映射"反讽/自嘲"语义类）
  const TAG_MAP = { "吐槽": ["反讽", "自嘲"], "职场": ["职场"], "旅游": ["旅游"], "社会": ["社会", "社会观察"], "恋爱": ["恋爱"], "校园": ["校园"], "情绪": ["情绪"], "语言": ["语言现象"] };
  if (tag !== "all") {
    const keys = TAG_MAP[tag] || [tag];
    list = list.filter(m => (m.tags || []).some(t => keys.includes(t)));
  }
  // 文化折扣筛选（平均分）：新手友好≤2 / 进阶2-3 / 挑战≥3.34
  if (disc !== "all") {
    list = list.filter(m => {
      const a = avgDiscount(m);
      if (disc === "easy") return a <= 2;
      if (disc === "mid") return a > 2 && a < 3.34;
      return a >= 3.34; // hard
    });
  }
  // 排序：最热（likes降序）/ 最新（origin 首个谱系节点日期倒序）/ 最易懂（折扣均值升序）
  if (sort === "hot") list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (sort === "new") list.sort((a, b) => {
    const da = (a.memeLineage && a.memeLineage[0] && a.memeLineage[0].date) || "";
    const db = (b.memeLineage && b.memeLineage[0] && b.memeLineage[0].date) || "";
    return db.localeCompare(da);
  });
  else if (sort === "easy") list.sort((a, b) => avgDiscount(a) - avgDiscount(b));

  return { list, q: parseQuery() };
}

/* 筛选胶囊按钮：改用 data-filter-key/val + 全局事件委托，
 * 修复原 inline onclick 单引号嵌套导致 HTML 属性被截断、点击失效的 bug */
function pillBtn(label, active, key, val, ariaLabel) {
  return `<button class="pill text-xs px-4 py-2 min-h-[36px] whitespace-nowrap border ${active ? "bg-primary text-white border-primary" : "border-white/15 text-muted bg-transparent"}"
    aria-label="${ariaLabel || label}" aria-pressed="${active}" data-filter-key="${key}" data-filter-val="${val}">${label}</button>`;
}

function renderDiscover() {
  const { list, q } = filterMemes();

  return `
    <h1 class="text-xl font-extrabold mb-3">${t("discover.title")}</h1>

    <!-- 顶部固定筛选栏（sticky，横向滚动） -->
    <div class="sticky top-0 z-40 -mx-4 px-4 py-2 bg-bg/95 backdrop-blur border-b border-white/5 space-y-2">
      <div class="flex gap-2 overflow-x-auto no-scrollbar">
        ${pillBtn(t("discover.filter.tempAll"), q.temp === "all", "temp", "all", t("filter.aria.tempAll"))}
        ${pillBtn(t("discover.filter.tempCold"), q.temp === "cold", "temp", "cold", t("filter.aria.tempCold"))}
        ${pillBtn(t("discover.filter.tempWarm"), q.temp === "warm", "temp", "warm", t("filter.aria.tempWarm"))}
        ${pillBtn(t("discover.filter.tempHot"), q.temp === "hot", "temp", "hot", t("filter.aria.tempHot"))}
      </div>
      <div class="flex gap-2 overflow-x-auto no-scrollbar">
        ${pillBtn(t("discover.filter.tagAll"), q.tag === "all", "tag", "all", t("filter.aria.tagAll"))}
        ${TAG_FILTERS.map(f =>
          pillBtn(t(f.label), q.tag === f.key, "tag", f.key, t("filter.aria.tag", { tag: t(f.label) }))).join("")}
      </div>
      <div class="flex gap-2 items-center overflow-x-auto no-scrollbar">
        ${pillBtn(t("discover.filter.discAll"), q.disc === "all", "disc", "all", t("filter.aria.discAll"))}
        ${pillBtn(t("disc.easy"), q.disc === "easy", "disc", "easy", t("filter.aria.discEasy"))}
        ${pillBtn(t("disc.mid"), q.disc === "mid", "disc", "mid", t("filter.aria.discMid"))}
        ${pillBtn(t("disc.hard"), q.disc === "hard", "disc", "hard", t("filter.aria.discHard"))}
        <select class="pill text-xs px-3 py-2 min-h-[36px] bg-white/5 border border-white/15 outline-none ml-auto"
                aria-label="${t("sort.aria")}" onchange="setFilter('sort',this.value)">
          <option value="hot" ${q.sort === "hot" ? "selected" : ""}>${t("sort.hot")}</option>
          <option value="new" ${q.sort === "new" ? "selected" : ""}>${t("sort.new")}</option>
          <option value="easy" ${q.sort === "easy" ? "selected" : ""}>${t("sort.easy")}</option>
        </select>
      </div>
    </div>

    <p class="text-[10px] text-muted mt-3 mb-2">${t("discover.count", { n: list.length })}</p>
    ${list.length === 0 ? `
      <div class="text-center py-16">
        <p class="text-5xl mb-3">🔍</p>
        <p class="text-sm font-bold">${t("discover.empty.title")}</p>
        <p class="text-xs text-muted mt-1">${t("discover.empty.hint")}</p>
      </div>` : `
      <div class="masonry">${list.map(memeCard).join("")}</div>`}`;
}

/* ============================================================
 * 社区挑战 / 我的
 * ============================================================ */

/* 【传播学设计】参与阶梯进度条（Jenkins 参与式文化 L1-L5） */
function ladderWidget() {
  const pts = user().points;
  const cur = currentLevel(pts);
  return `
    <div class="space-y-2">
      ${LADDER.map((l, i) => {
        const state = i < cur ? "done" : i === cur ? "cur" : "locked";
        return `
          <div class="card border p-3 flex items-center gap-3 ${state === "cur" ? "border-primary shadow-[0_0_16px_rgba(139,92,246,.4)]" : "border-white/5"} ${state === "locked" ? "opacity-40 grayscale" : ""}"
               style="margin-left:${i * 10}px">
            <span class="font-extrabold ${state === "cur" ? "text-primary" : "text-muted"}">${l.lv}</span>
            <div class="flex-1">
              <div class="text-sm font-bold">${t(l.nameKey)} ${state === "done" ? "✅" : state === "cur" ? t("ladder.current") : ""}</div>
              <div class="text-[10px] text-muted">${t(l.descKey)}</div>
            </div>
            <span class="text-[10px] ${pts >= l.pts ? "text-accentGreen" : "text-muted"}">${l.pts}pts</span>
          </div>`;
      }).join("")}
    </div>`;
}

/* ---------- 页面：社区挑战 #/challenge（含 UGC 举报按钮） ---------- */
function renderChallenge() {
  const themeMeme = "City不City"; // 挑战主题固定，不随梗库字母序变化
  return `
    <h1 class="text-xl font-extrabold mb-1">${t("challenge.title")}</h1>
    <div class="card bg-gradient-to-r from-primary/30 to-accentGreen/20 p-4 mb-4">
      <span class="text-[10px] text-accentGreen uppercase tracking-widest">${t("challenge.theme")}</span>
      <p class="font-bold mt-1">${t("challenge.themeCopy", { meme: themeMeme })}</p>
      <p class="text-xs text-muted mt-1">${t("challenge.meta", { n: 128 })}</p>
    </div>
    <h2 class="text-sm font-bold mb-2">${t("ladder.title")}</h2>
    ${ladderWidget()}
    <h2 class="text-sm font-bold mt-5 mb-2">${t("challenge.wall")}</h2>
    <div class="masonry">
      ${MEME_DATA.slice(0, 4).map((m, i) => `
        <div class="card overflow-hidden border border-white/5 relative">
          <img src="https://placehold.co/300x${180 + i * 40}/1A1A1A/8B5CF6?text=${encodeURIComponent(t("challenge.postAlt", { n: i + 1 }))}" alt="${t("challenge.postAlt", { n: i + 1 })}" class="w-full" loading="lazy" ${fb.imgErr} />
          <div class="p-2 flex items-center justify-between">
            <p class="text-xs text-muted">${t("challenge.post", { meme: fb.name(m), n: i + 1 })}</p>
            <!-- 【合规设计】UGC 举报入口 -->
            <button class="text-xs text-gray-500 hover:text-red-400 transition" aria-label="${t("challenge.reportAria")}" onclick="openReportSheet(${i + 1})">${t("challenge.report")}</button>
          </div>
        </div>`).join("")}
    </div>`;
}

/* ---------- 页面：我的 #/profile ---------- */
function renderProfile() {
  const pts = user().points;
  const cur = LADDER[currentLevel(pts)];
  return `
    <h1 class="text-xl font-extrabold mb-4">${t("profile.title")}</h1>
    <div class="card border border-white/5 p-4 mb-4 flex items-center gap-4">
      <div class="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center text-2xl">🐼</div>
      <div>
        <p class="font-bold">${t("profile.name")}</p>
        <p class="text-xs text-muted">${t("profile.meta", { lv: cur.lv, name: t(cur.nameKey), pts })}</p>
        <div class="w-36 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
          <div class="h-full bg-primary rounded-full" style="width:${Math.min(100, pts / 10)}%"></div>
        </div>
      </div>
    </div>
    <h2 class="text-sm font-bold mb-2">${t("profile.growth")}</h2>
    ${ladderWidget()}
    <div class="mt-5">
      ${["menu.fav", "menu.history", "menu.lang", "menu.privacy", "menu.pwa"]
        .map(k => `<div class="card border border-white/5 p-4 mb-3 text-sm">${t(k)}</div>`).join("")}
    </div>`;
}

/* ============================================================
 * 交互行为
 * ============================================================ */

/* 【传播学设计】语音发音：按当前界面语言读中文名或英文名 */
function pronounce(nameCN, nameEN) {
  if (!("speechSynthesis" in window)) return;
  const lang = getLang();
  const text = lang === "zh" ? nameCN : (nameEN || nameCN);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "zh" ? "zh-CN" : "en-US";
  u.rate = 0.9;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* 【传播学设计】点赞交互（参与式文化 L1 轻互动）：心形回弹 + 4-6 紫色粒子 */
function likeMeme(e, id) {
  const u = user();
  const idx = u.liked.indexOf(id);
  if (idx >= 0) { u.liked.splice(idx, 1); } else { u.liked.push(id); }
  store.set({ liked: u.liked });

  const btn = e.currentTarget;
  if (!btn) return;
  btn.classList.remove("liked"); void btn.offsetWidth;
  btn.classList.add("liked");
  // 静态详情页无整页重绘，直接更新点赞计数
  const m = MEME_DATA.find(x => x.id === id);
  if (m) btn.textContent = `❤️ ${(m.likes || 0) + (u.liked.includes(id) ? 1 : 0)}`;

  const r = btn.getBoundingClientRect();
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 30 + Math.random() * 30;
    p.style.left = r.left + r.width / 2 + "px";
    p.style.top = r.top + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
  setTimeout(() => rerender(), 350);
}

/* 【传播学设计】"+10pts" 掉落动画（参与式文化：即时正反馈激励），2 秒淡出 */
function awardPts(n = 10) {
  if (n <= 0) return;
  const u = user();
  store.set({ points: u.points + n });
  const el = document.createElement("div");
  el.className = "pts-float";
  el.textContent = `+${n}pts`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

/* 【传播学设计】投票（参与式文化 L1 轻互动 / L2 语义标注） */
function voteTask(el, key, val) {
  const u = user();
  if (u.voted[key]) return;
  u.voted[key] = val;
  store.set({ voted: u.voted });
  awardPts(10);
  // 静态详情页无整页重绘，直接更新按钮选中态
  if (el && el.classList) {
    el.classList.add("voted");
    if (!el.textContent.includes("✓")) el.textContent += " ✓";
  }
  setTimeout(() => rerender(), 300);
}
function vote(el, key) { voteTask(el, key, true); }

/* 【传播学设计】添加使用场景标签（参与式文化 L2 语义标注）——输入经 sanitize 后存储 */
function addSceneTag(e, id) {
  e.preventDefault();
  const input = document.getElementById(`scene-${id}`);
  if (!input) return false;
  const v = sanitizeInput(input.value.trim().slice(0, 20));
  if (!v) return false;
  const u = user();
  const list = u.tags[id] || [];
  const tag = v.startsWith("#") ? v : "#" + v;
  if (!list.includes(tag)) { list.push(tag); u.tags[id] = list; store.set({ tags: u.tags }); awardPts(10); }
  // 静态详情页无整页重绘，直接追加标签胶囊并清空输入
  const box = document.getElementById("tags-" + id);
  if (box) {
    const span = document.createElement("span");
    span.className = "pill text-[10px] bg-accentGreen/20 text-accentGreen px-2 py-1";
    span.textContent = tag;
    box.appendChild(span);
    input.value = "";
  }
  rerender();
  return false;
}

/* 站点根路径（兼容子路径部署与 memes/ 子目录页面） */
function siteBase() {
  return location.pathname.replace(/index\.html$/, "").replace(/memes\/[^/]*\.html$/, "");
}

/* 分享（L1 轻互动）：优先系统分享，降级复制链接（指向静态详情页） */
function shareMeme(id) {
  const m = MEME_DATA.find(x => x.id === id);
  if (!m) return;
  const url = location.origin + siteBase() + "memes/" + id + ".html";
  if (navigator.share) {
    navigator.share({ title: `${fb.name(m)} ${m.nameEN || ""}`, text: getLang() === "zh" ? fb.usage(m) : (m.usageEn || fb.usage(m)), url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast(t("toast.linkCopied"))).catch(() => {});
  }
}

/* 【传播学设计】谱系节点底部半屏详情（模因理论：谱系节点深读入口） */
function openLineageSheet(memeId, idx) {
  const m = MEME_DATA.find(x => x.id === memeId);
  if (!m || !m.memeLineage || !m.memeLineage[idx]) return;
  const n = m.memeLineage[idx];
  openSheet(`
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
    <div class="flex items-center gap-2 mb-2">
      <span class="dot dot-${n.type}" style="width:12px;height:12px;border-radius:9999px;display:inline-block;border:none"></span>
      <span class="text-xs font-bold">${t(LINEAGE_TYPE[n.type] || n.type)}</span>
      <span class="text-xs text-muted">${sanitizeInput(n.date || "")}</span>
    </div>
    <p class="text-sm leading-relaxed">${sanitizeInput(getLang() === "zh" ? (n.event || "") : (n.eventEn || n.event || ""))}</p>`);
}

/* ---------- 通用底部半屏 Sheet ---------- */
function openSheet(innerHTML) {
  closeSheet();
  const mask = document.createElement("div");
  mask.className = "sheet-mask"; mask.id = "sheet-mask";
  const sheet = document.createElement("div");
  sheet.className = "sheet p-5"; sheet.id = "sheet-box";
  sheet.innerHTML = innerHTML;
  mask.onclick = closeSheet;
  document.body.append(mask, sheet);
  requestAnimationFrame(() => { mask.classList.add("show"); sheet.classList.add("show"); });
}
function closeSheet() {
  const mask = document.getElementById("sheet-mask"), sheet = document.getElementById("sheet-box");
  if (!mask || !sheet) return;
  mask.classList.remove("show"); sheet.classList.remove("show");
  setTimeout(() => { mask.remove(); sheet.remove(); }, 300);
}

/* 【合规设计】UGC 举报：底部半屏四选项，选择后 Toast 确认 */
function openReportSheet(postId) {
  const options = ["report.spam", "report.copyright", "report.offensive", "report.other"];
  openSheet(`
    <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4"></div>
    <h3 class="text-sm font-bold mb-3">${t("report.title", { n: postId })}</h3>
    <div class="divide-y divide-white/5">
      ${options.map(key => `
        <button class="w-full flex items-center justify-between py-3.5 text-sm hover:text-red-400 transition"
                aria-label="${t("report.reasonAria", { reason: t(key) })}" onclick="submitReport()">${t(key)}<span class="text-muted">›</span></button>`).join("")}
    </div>`);
}
function submitReport() {
  closeSheet();
  setTimeout(() => toast(t("report.thanks")), 300);
}

/* 【合规设计】Toast：顶部紫色条，3 秒消失 */
function toast(msg, isError = false) {
  const el = document.createElement("div");
  el.className = "toast";
  el.style.borderColor = isError ? "#EF4444" : "#8B5CF6";
  el.textContent = msg; // textContent 渲染，杜绝 XSS
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

/* ============================================================
 * 【合规设计】Cookie 同意弹窗
 * 首次访问自动弹出；Footer "Cookie Settings" 可重新打开
 * ============================================================ */
const CONSENT_KEY = "memebridge_cookie_consent";

function cookieToggle(label, id, { checked = false, disabled = false, note = "" } = {}) {
  return `
    <label class="flex items-center justify-between py-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}">
      <span class="text-sm">${label}${note ? `<span class="block text-[10px] text-gray-500">${note}</span>` : ""}</span>
      <span class="cookie-toggle ${checked ? "on" : ""}" data-id="${id}" data-disabled="${disabled}"
            role="switch" aria-checked="${checked}" aria-label="${label}"><span class="knob"></span></span>
    </label>`;
}

function openCookieConsent() {
  if (document.getElementById("cookie-modal")) return;
  const existing = (() => { try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; } })();

  const overlay = document.createElement("div");
  overlay.id = "cookie-modal";
  overlay.className = "fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4";
  overlay.innerHTML = `
    <div class="max-w-md w-full rounded-2xl border border-gray-800 p-6" style="background:#1a1a1a">
      <h2 class="text-xl font-bold text-white">${t("cookie.title")}</h2>
      <p class="text-sm text-gray-400 mt-1">${t("cookie.desc")}</p>
      <div class="mt-4 divide-y divide-white/5">
        ${cookieToggle(t("cookie.necessary"), "necessary", { checked: true, disabled: true, note: t("cookie.alwaysOn") })}
        ${cookieToggle(t("cookie.analytics"), "analytics", { checked: !!(existing && existing.analytics) })}
        ${cookieToggle(t("cookie.marketing"), "marketing", { checked: !!(existing && existing.marketing) })}
      </div>
      <div class="flex gap-3 mt-6">
        <button class="flex-1 rounded-xl py-3 text-sm font-bold text-white" style="background:#8B5CF6" aria-label="${t("cookie.acceptAllAria")}" onclick="saveCookieConsent(true)">${t("cookie.acceptAll")}</button>
        <button class="flex-1 rounded-xl py-3 text-sm font-bold text-white" style="background:#333" aria-label="${t("cookie.saveAria")}" onclick="saveCookieConsent(false)">${t("cookie.save")}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Toggle 点击切换（necessary 锁定）
  overlay.querySelectorAll(".cookie-toggle").forEach(t => {
    t.addEventListener("click", () => {
      if (t.dataset.disabled === "true") return;
      t.classList.toggle("on");
      t.setAttribute("aria-checked", t.classList.contains("on"));
    });
  });
}

/* 【合规设计】保存 Cookie 偏好到 localStorage */
function saveCookieConsent(acceptAll) {
  const overlay = document.getElementById("cookie-modal");
  if (!overlay) return;
  const get = (id) => {
    const el = overlay.querySelector(`[data-id="${id}"]`);
    return acceptAll ? true : !!(el && el.classList.contains("on"));
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics: get("analytics"),
      marketing: get("marketing"),
      timestamp: Date.now()
    }));
  } catch {}
  overlay.remove();
  toast(t("cookie.saved"));
}

/* 首次访问自动弹出 */
if (!localStorage.getItem(CONSENT_KEY)) {
  window.addEventListener("load", () => setTimeout(openCookieConsent, 600));
}

/* ============================================================
 * 路由器（带左右滑动页面切换动画）
 * ============================================================ */
const VIEWS = {
  home: renderHome, discover: renderDiscover,
  wiki: wikiRedirect, create: renderCreate,
  challenge: renderChallenge, profile: renderProfile
};

/* 梗详情已静态化为 memes/<id>.html（SEO/OG），旧 #/wiki/<id> 入口重定向过去 */
function wikiRedirect(id) {
  location.replace("memes/" + encodeURIComponent(id) + ".html");
  return `<p class="text-muted p-8 text-center">${t("common.redirect")}</p>`;
}
let currentHash = "";

function router() {
  // 静态详情页（memes/*.html）没有 #page-wrap，跳过 SPA 路由（全局交互函数仍可用）
  if (!$wrap) return;
  const hash = location.hash || "#/home";
  if (hash === currentHash) return;
  const path = hash.split("?")[0];
  const [, page, param] = path.split("/");

  // Tab 高亮（选中项上方 2px 紫色指示条，颜色 200ms 过渡）
  document.querySelectorAll(".tab-item").forEach(a => {
    const active = a.dataset.tab === (page === "wiki" ? "discover" : page);
    a.classList.toggle("active", active);
    a.style.color = active ? "#8B5CF6" : "#6B7280";
  });

  const view = VIEWS[page] || renderHome;
  const html = view(param);

  const old = $wrap ? $wrap.querySelector(".page") : null;
  if (old && currentHash) {
    old.classList.add("page-exit");
    setTimeout(() => old.remove(), 300);
  } else if (old) { old.remove(); }

  const div = document.createElement("div");
  div.className = "page page-enter";
  div.innerHTML = html;
  if ($wrap) $wrap.appendChild(div);

  currentHash = hash;
  window.scrollTo(0, 0);

  // 创作工厂：渲染完成后绑定文件输入并重绘画布
  if (page === "create") {
    const file = $("#lab-file");
    if (file) file.onchange = () => labHandleFile(file);
    requestAnimationFrame(() => labDraw());
  }
}

/* 状态变化后原地刷新（不触发滑入动画）；创作页刷新后重绘画布 */
function rerender() {
  const path = (location.hash || "#/home").split("?")[0];
  const [, page, param] = path.split("/");
  const div = $wrap && $wrap.querySelector(".page");
  if (!div) return;
  // 创作页文字输入中不整页重绘，避免输入框失焦
  if (page === "create" && document.activeElement && document.activeElement.id === "lab-text") return;
  div.innerHTML = (VIEWS[page] || renderHome)(param);
  if (page === "create") {
    const file = $("#lab-file");
    if (file) file.onchange = () => labHandleFile(file);
    requestAnimationFrame(() => labDraw());
  }
}
/* 发现页筛选：全局事件委托（替代 inline onclick，规避引号嵌套与注入面） */
document.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest("[data-filter-key]") : null;
  if (!btn) return;
  setFilter(btn.dataset.filterKey, btn.dataset.filterVal);
});

window.addEventListener("hashchange", router);

/* ============================================================
 * 国际化：静态 DOM 文案更新 + 语言切换即时重渲染
 * ============================================================ */

/* 更新静态壳层（页脚 / Tab Bar / 标题 / 切换按钮）与 document 元信息 */
function applyStaticI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("app.title");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.textContent = lang === "zh" ? "EN" : "中文";
    btn.setAttribute("aria-label", t("lang.toggleAria"));
  }
}

/* 右上角语言切换按钮（index.html / 详情页壳模板中 onclick="toggleLang()"） */
function toggleLang() {
  setLang(getLang() === "zh" ? "en" : "zh"); // setLang 内部派发 langchange
}

/* 语言切换：静态壳层 + SPA 当前页 + 静态详情页全部即时重渲染，无半旧半新残留 */
window.addEventListener("langchange", () => {
  applyStaticI18n();
  rerender();
  hydrateStaticWiki();
});

/* 静态梗详情页水合：以 localStorage 用户状态重绘内容（原始 HTML 已含全文，供爬虫读取） */
function hydrateStaticWiki() {
  const host = document.querySelector("[data-static-wiki]");
  if (!host) return;
  const m = MEME_DATA.find(x => x.id === host.dataset.staticWiki);
  if (!m || typeof wikiPageBody !== "function") return;
  host.innerHTML = wikiPageBody(m, user());
}

applyStaticI18n();
router();
hydrateStaticWiki();

/* ============================================================
 * 首页下拉刷新：超过 60px 显示紫色旋转圆环，松手模拟加载 1s
 * ============================================================ */
(function pullToRefresh() {
  const ring = document.getElementById("ptr");
  if (!ring) return;
  let startY = 0, pulling = false;
  window.addEventListener("touchstart", e => {
    if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, { passive: true });
  window.addEventListener("touchmove", e => {
    if (!pulling) return;
    if (e.touches[0].clientY - startY > 60) ring.classList.add("show");
  }, { passive: true });
  window.addEventListener("touchend", () => {
    if (!pulling) return;
    pulling = false;
    if (ring.classList.contains("show")) {
      setTimeout(() => { ring.classList.remove("show"); rerender(); }, 1000);
    }
  });
})();

/* ---------- PWA：注册 Service Worker（从站点根注册，兼容 memes/ 子目录页面） ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(siteBase() + "sw.js").catch(() => {});
}
