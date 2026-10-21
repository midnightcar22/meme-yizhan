/* ============================================================
 * 文件名：js/wiki-template.js
 * 项目：MEME·译站 / MemeBridge —— 中国梗的跨文化转译平台
 * 版本：v3.7
 * 最后更新：2026-10-21
 * ------------------------------------------------------------
 * 梗详情页共享模板：浏览器（SPA 水合）与 Node（SSG 构建）共用。
 *   - 浏览器：<script src="js/wiki-template.js"> 挂载全局
 *   - Node：scripts/build-memes.mjs 用 require() 引用
 * 语言约定：整页内容跟随当前语言渲染（en/zh），仅「词条本身 nameCN」与
 *   「拼音 pinyin」跨语言不变；界面文案经 t() 翻译，内容字段使用
 *   无后缀（zh）或 En 后缀（en）版本。
 * 注意：模板内的互动按钮引用 app.js 的全局函数
 *       （likeMeme / voteTask / vote / addSceneTag / shareMeme / openLineageSheet / pronounce）
 * ============================================================ */
(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(global, api);
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* 【合规设计】XSS 防御：所有用户输入渲染前必须经此函数转义 */
  function sanitizeInput(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
  }

  /* 数据字段 fallback（防御性编程，经 t() 翻译） */
  const fb = {
    name: (m) => (m && m.nameCN) || t("common.fallback.name"),
    origin: (m) => (m && m.origin) || t("common.fallback.origin"),
    usage: (m) => (m && m.usage) || t("common.fallback.usage"),
    imgErr: `onerror="this.onerror=null;this.src='https://placehold.co/300x200/1a1a1a/666?text=Meme+Error'"`
  };

  /* 星级（文化折扣指数可视化） */
  const stars = (n, filledCls, emptyCls = "text-white/20") =>
    Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < n ? filledCls : emptyCls}" style="font-size:8px">★</span>`).join("");

  /* 文化折扣指数微型可视化（卡片右下角三组迷你星条） */
  function miniDiscount(s) {
    if (!s) return "";
    const row = (label, v) => `
      <div class="flex items-center gap-0.5">
        <span class="text-[8px] text-muted w-3">${label}</span>
        <span class="tracking-tighter">${stars(v, "text-primary")}</span>
      </div>`;
    return `<div class="flex flex-col items-end gap-px">${row(t("mini.l"), s.language)}${row(t("mini.c"), s.context)}${row(t("mini.a"), s.adaptability)}</div>`;
  }

  /* 媒介温度（麦克卢汉冷热媒介理论）：仅存图标/配色，文案经 t("temp.*") */
  const TEMP = {
    cold: { icon: "🧊", cls: "temp-cold" },
    warm: { icon: "🌡️", cls: "temp-warm" },
    hot:  { icon: "🔥", cls: "temp-hot" }
  };

  /* 模因谱系节点类型 → i18n key（模因理论：复制-变异-传播-回传） */
  const LINEAGE_TYPE = {
    origin: "lineage.origin", copy: "lineage.copy", mutation: "lineage.mutation",
    crossover: "lineage.crossover", reimport: "lineage.reimport"
  };

  /* 语境层场景投票预设：key 用于投票持久化（保持不变），label 经 t() */
  const SCENE_TAGS = [
    { key: "#日常口语", label: "scene.daily" },
    { key: "#社交媒体", label: "scene.social" },
    { key: "#校园", label: "scene.school" },
    { key: "#职场", label: "scene.work" }
  ];

  /* 内容标签的本地化显示：中文标签经 tagword 词典翻译；用户自建标签原样显示 */
  function tagLabel(tag) {
    const key = "tagword." + tag;
    const v = t(key);
    return v.indexOf("[[") === 0 ? tag : v;
  }

  /* 三层解码器折叠面板（Stuart Hall 编码/解码理论） */
  function decoder(title, icon, body, { open = false, extraCls = "" } = {}) {
    return `
    <details class="decoder card border border-white/5 mb-3 ${extraCls}" ${open ? "open" : ""}>
      <summary class="flex items-center justify-between p-4 font-bold text-sm">
        <span>${icon} ${title}</span><span class="chevron text-muted">▾</span>
      </summary>
      <div class="px-4 pb-4 text-sm text-muted leading-relaxed">${body}</div>
    </details>`;
  }

  /* 梗详情页主体：整页按当前语言渲染（词条与拼音不变）
   * m = 梗对象；u = 用户状态（可选，默认空：{ liked, voted, tags }）
   * 静态页构建时不传 u（Node 下 getLang() 为 en，爬虫读取英文全文） */
  function wikiPageBody(m, u) {
    u = u || { liked: [], voted: {}, tags: {} };
    if (!m) return `<p class="text-muted p-8 text-center">${t("common.notFound")}</p>`;

    const isZh = getLang() === "zh";
    const tp = TEMP[m.mediaTemperature] || TEMP.warm;
    const s = m.accessibilityScore || { language: 3, context: 3, adaptability: 3 };
    const liked = (u.liked || []).includes(m.id);
    const voted = u.voted || {};
    const myTags = (u.tags || {})[m.id] || [];
    const sym = m.symbolLayer || {};

    // 语言相关内容字段：无后缀为中文，En 后缀为英文（缺失时回退到另一语言）
    const heroTitle = isZh ? fb.name(m) : (m.titleEn || m.nameEN || fb.name(m));
    const heroSub = isZh ? (m.nameEN || "") : fb.name(m); // 另一语言的词条名
    const heroSummary = isZh ? fb.usage(m) : (m.summaryEn || "");
    const emotion = isZh ? (m.emotionEquivalent || "") : (m.emotionEquivalentEn || m.emotionEquivalent || "");
    const literal = isZh ? (sym.literalTranslation || "—") : (sym.literalTranslationEn || sym.literalTranslation || "—");
    const explanation = isZh ? (sym.explanation || "—") : (sym.explanationEn || sym.explanation || "—");
    const origin = isZh ? fb.origin(m) : (m.originEn || m.origin || t("common.fallback.origin"));
    const usage = isZh ? fb.usage(m) : (m.usageEn || m.usage || t("common.fallback.usage"));
    const misreading = isZh ? (m.commonMisreading || t("common.fallback.misreading")) : (m.commonMisreadingEn || m.commonMisreading || t("common.fallback.misreading"));

    /* ---------- 首屏：标题 + 摘要（词条名 + 拼音在两种语言下都不变） ---------- */
    const hero = `
    <a href="../index.html#/home" class="text-xs text-muted">${t("wiki.back")}</a>
    <header class="mt-3 mb-4">
      <div class="relative">
        <span class="temp-badge ${tp.cls}" title="${t("temp." + (m.mediaTemperature || "warm"))}">${tp.icon}</span>
        <img src="${m.image}" alt="${t("meme.alt", { name: fb.name(m) })}" class="w-full h-40 object-cover rounded-2xl mb-3 card" ${fb.imgErr} />
      </div>
      <h1 class="text-2xl font-extrabold">${sanitizeInput(heroTitle)}</h1>
      <p class="text-sm text-muted mt-1">${sanitizeInput(heroSub)} · ${sanitizeInput(m.pinyin || "")} · ≈ “${sanitizeInput(emotion)}”</p>
      <p class="text-sm text-muted leading-relaxed mt-2">${sanitizeInput(heroSummary)}</p>
      <div class="flex flex-wrap gap-2 mt-2">
        ${(m.tags || []).map(x => `<span class="pill text-[10px] bg-primary/15 text-primary px-2 py-1">#${sanitizeInput(tagLabel(x))}</span>`).join("")}
        <span class="pill text-[10px] ${tp.cls} text-white px-2 py-1">${tp.icon} ${t("temp." + (m.mediaTemperature || "warm"))}</span>
      </div>
    </header>`;

    /* ---------- 符号层（默认展开）：词条/拼音 + 字面翻译 + 结构说明 + 情绪等价 ---------- */
    const symbolBody = `
    <div class="flex items-center justify-between">
      <div>
        <p class="text-lg font-extrabold text-txt">${sanitizeInput(fb.name(m))} <span class="text-xs font-normal text-muted">${sanitizeInput(m.pinyin || "")}</span></p>
        <p class="mt-1"><b class="text-txt">${t("symbol.literal")}</b>${sanitizeInput(literal)}</p>
      </div>
      <button class="btn bg-white/5 border border-white/10 px-3 py-1.5 text-xs" aria-label="${t("symbol.pronounceAria")}" onclick="pronounce('${sanitizeInput(fb.name(m))}','${sanitizeInput(m.nameEN || "")}')">${t("symbol.pronounce")}</button>
    </div>
    <p class="mt-2"><b class="text-txt">${t("symbol.explain")}</b>${sanitizeInput(explanation)}</p>
    <p class="mt-1"><b class="text-txt">${t("symbol.emotion")}</b><span class="text-primary">“${sanitizeInput(emotion)}”</span>${t("symbol.emotionNote")}</p>`;

    /* ---------- 语境层（默认展开）：起源迷你竖线时间线 + 可点击投票的场景标签 ---------- */
    const contextBody = `
    <div class="border-l-2 border-primary/40 pl-3 mb-3">
      <div class="relative"><span class="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary"></span>
        <p><b class="text-txt">${t("context.origin")}</b>${sanitizeInput(origin)}</p></div>
      <div class="relative mt-2"><span class="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/40"></span>
        <p><b class="text-txt">${t("context.usage")}</b>${sanitizeInput(usage)}</p></div>
    </div>
    <p class="text-[10px] mb-1.5">${t("context.votePrompt")}</p>
    <div class="flex flex-wrap gap-2">
      ${SCENE_TAGS.map(tag => {
        const key = `ctx-${m.id}-${tag.key}`;
        const v = voted[key];
        return `<button class="vote-opt pill text-xs px-3 py-1 bg-white/5 border border-white/10 ${v ? "voted" : ""}"
          aria-label="${t("context.voteAria", { tag: t(tag.label) })}" onclick="vote(this,'${key}')">${t(tag.label)}${v ? " ✓" : ""}</button>`;
      }).join("")}
    </div>`;

    /* ---------- 立场层（默认折叠 + ⚠️警告色边框）：左红"误读"右绿"正解"对比卡片 ---------- */
    const stanceBody = `
    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-xl border border-red-500/40 bg-red-500/10 p-3">
        <p class="text-[10px] font-bold text-red-400 mb-1">${t("stance.wrong")}</p>
        <p class="text-xs">${sanitizeInput(misreading)}</p>
      </div>
      <div class="rounded-xl border border-green-500/40 bg-green-500/10 p-3">
        <p class="text-[10px] font-bold text-accentGreen mb-1">${t("stance.right")}</p>
        <p class="text-xs">${t("stance.rightPrefix")}${sanitizeInput(usage)}${t("stance.rightSuffix")}</p>
      </div>
    </div>`;

    /* ---------- 模因谱系横向时间轴（模因理论） ---------- */
    const lineage = `
    <div class="lineage-track no-scrollbar -mx-4 px-4">
      ${(m.memeLineage || []).map((n, i) => `
        <div class="lnode" role="button" aria-label="${t("lineage.nodeAria", { type: t(LINEAGE_TYPE[n.type] || n.type) })}" onclick="openLineageSheet('${m.id}',${i})">
          <span class="link"></span>
          <div class="dot dot-${n.type}"></div>
          <p class="text-[10px] text-muted mt-1.5">${sanitizeInput(n.date || "")}</p>
          <p class="text-[10px] font-bold mt-0.5 leading-tight">${t(LINEAGE_TYPE[n.type] || n.type)}</p>
        </div>`).join("")}
    </div>
    <p class="text-[10px] text-muted">${t("lineage.hint")}</p>`;

    /* ---------- 微参与任务区（参与式文化 L1 轻互动 + L2 语义标注） ---------- */
    const eqOptions = emotion.split("/").map(x => x.trim()).filter(Boolean).concat([t("tasks.eqFire")]).slice(0, 3);
    const tasks = `
    <h2 class="text-sm font-bold text-muted mt-6 mb-2">${t("tasks.title")}</h2>
    <div class="card border border-white/5 p-4 mb-3">
      <p class="text-xs font-bold mb-2">${t("tasks.fire")}</p>
      <div class="flex gap-2">
        <button class="vote-opt btn flex-1 border border-white/10 bg-white/5 py-2 text-sm ${voted[`fire-${m.id}`] === "yes" ? "voted" : ""}" aria-label="${t("tasks.fireYesAria")}" onclick="voteTask(this,'fire-${m.id}','yes')">${t("tasks.fireYes")}</button>
        <button class="vote-opt btn flex-1 border border-white/10 bg-white/5 py-2 text-sm ${voted[`fire-${m.id}`] === "no" ? "voted" : ""}" aria-label="${t("tasks.fireNoAria")}" onclick="voteTask(this,'fire-${m.id}','no')">${t("tasks.fireNo")}</button>
      </div>
    </div>
    <div class="card border border-white/5 p-4 mb-3">
      <p class="text-xs font-bold mb-2">${t("tasks.eq")}</p>
      <div class="flex gap-2 flex-wrap">
        ${eqOptions.map(opt => `
          <button class="vote-opt pill text-xs px-4 py-1.5 bg-white/5 border border-white/10 ${voted[`eq-${m.id}`] === opt ? "voted" : ""}"
            aria-label="${t("tasks.eqAria", { opt: sanitizeInput(opt) })}" onclick="voteTask(this,'eq-${m.id}','${sanitizeInput(opt)}')">${sanitizeInput(opt)}</button>`).join("")}
      </div>
    </div>
    <div class="card border border-white/5 p-4 mb-3">
      <p class="text-xs font-bold mb-2">${t("tasks.tag")}</p>
      <form class="flex gap-2" onsubmit="return addSceneTag(event,'${m.id}')">
        <input id="scene-${m.id}" placeholder="${t("tasks.tagPlaceholder")}" maxlength="20" aria-label="${t("tasks.tagAria")}"
               class="btn flex-1 bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary" />
        <button class="btn bg-primary px-4 text-sm font-bold" aria-label="${t("tasks.submitAria")}">${t("tasks.submit")}</button>
      </form>
      <div class="flex flex-wrap gap-2 mt-2" id="tags-${m.id}">
        ${myTags.map(x => `<span class="pill text-[10px] bg-accentGreen/20 text-accentGreen px-2 py-1">${sanitizeInput(x)}</span>`).join("")}
      </div>
    </div>`;

    return hero + `
    <section class="card border border-white/5 p-4 mb-4">
      <h2 class="text-sm font-bold mb-2">${t("wiki.discount.title")} <span class="text-[10px] text-muted font-normal">${t("wiki.discount.note")}</span></h2>
      <div class="space-y-1.5 text-xs">
        <div class="flex justify-between items-center"><span class="text-muted">${t("wiki.discount.language")}</span><span>${stars(s.language, "text-primary")}</span></div>
        <div class="flex justify-between items-center"><span class="text-muted">${t("wiki.discount.context")}</span><span>${stars(s.context, "text-primary")}</span></div>
        <div class="flex justify-between items-center"><span class="text-muted">${t("wiki.discount.adaptability")}</span><span>${stars(s.adaptability, "text-primary")}</span></div>
      </div>
      <p class="text-[10px] text-muted mt-2">${t("wiki.tempPrefix")}${tp.icon} ${t("temp." + (m.mediaTemperature || "warm"))} — ${t("temp." + (m.mediaTemperature || "warm") + ".note")}</p>
    </section>

    <h2 class="text-sm font-bold text-muted mb-2">${t("wiki.decoder.title")}</h2>
    ${decoder(t("wiki.decoder.symbol"), "", symbolBody, { open: true })}
    ${decoder(t("wiki.decoder.context"), "", contextBody, { open: true })}
    ${decoder(t("wiki.decoder.stance"), "", stanceBody, { extraCls: "stance-warning" })}

    <h2 class="text-sm font-bold text-muted mt-5 mb-1">${t("lineage.title")}</h2>
    ${lineage}

    <div class="flex gap-3 mt-4 text-sm">
      <button class="like-btn btn flex-1 bg-surface border border-white/10 py-2 ${liked ? "text-primary" : ""}" aria-label="${t("wiki.likeAria")}" onclick="likeMeme(event,'${m.id}')">
        ❤️ ${(m.likes || 0) + (liked ? 1 : 0)}
      </button>
      <button class="btn flex-1 bg-surface border border-white/10 py-2" aria-label="${t("wiki.shareAria")}" onclick="shareMeme('${m.id}')">↗ ${t("wiki.shareAria")} ${m.shares || 0}</button>
    </div>

    ${tasks}`;
  }

  return { sanitizeInput, fb, stars, miniDiscount, TEMP, LINEAGE_TYPE, tagLabel, wikiPageBody };
});
