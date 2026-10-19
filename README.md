# MEME·译站 / MemeBridge

中国梗的跨文化转译平台（纯静态站点，无后端）。**界面默认英文（出海定位），右上角按钮可即时切换中文**，选择持久化到 localStorage。

## 目录结构

- `index.html` —— SPA 入口（首页 / 发现 / 创作 / 挑战 / 我的，hash 路由）
- `memes/*.html` —— **每梗独立详情页（构建产物，SEO/OG 入口，勿手改）**：英文 H1 + 摘要首屏，中文正文在「Original 中文原文」分区
- `assets/og/*.png` —— **每梗 1200×630 社交分享图（构建产物，自托管）**
- `content/memes/*.json` —— **梗内容唯一来源**（每条梗一个文件，手改只改这里；含英文 titleEn/summaryEn）
- `content/schema.md` —— 投稿字段规范（类型/必填/约束），投稿人的唯一参考文档
- `content/templates/new-meme.json` —— 投稿空白模板（复制改名即可开始写）
- `js/data.js` —— **构建产物**：由 `content/memes/*.json` 生成，已加入 .gitignore，勿手改
- `js/i18n.js` —— 中英双语字典（UMD，`t()` / `setLang()` / `getLang()`，默认 en）
- `js/wiki-template.js` —— 详情页共享模板（浏览器 + Node 共用）；`js/app.js` —— 应用逻辑
- `css/tailwind.css` —— Tailwind 编译产物；`css/style.css` —— 设计规范样式层
- `src/meme-page.template.html` —— 详情页壳模板；`src/input.css` —— Tailwind 入口
- `scripts/validate-content.mjs` —— 内容校验门卫；`scripts/check-workflows.mjs` —— Actions YAML 语法校验
- `scripts/build-data.mjs` / `build-css`（Tailwind）/ `build-og.mjs`（OG 图）/ `build-memes.mjs`（详情页）—— 构建链
- `scripts/serve.mjs` —— 本地预览服务器；`tests/i18n-smoke.mjs` —— jsdom 冒烟测试
- `.github/workflows/ci.yml` —— push/PR 自动校验 + 构建；`.github/workflows/deploy.yml` —— push main 自动发布 Pages

## 常用命令

```bash
npm install                       # 安装依赖
npm run validate                  # 校验 content/memes/ 全部 JSON（投稿自检）
npm run check:workflows           # 校验 GitHub Actions YAML 语法
npm run build                     # 全量构建：校验 → data.js → Tailwind → OG 图 → 详情页 + sitemap/robots
npm run build:deploy              # 同上（部署专用入口，CI 用）
npm run build:og                  # 仅重建 5 张 OG 分享图
npm run smoke                     # i18n/交互冒烟测试（jsdom，需先 build）
npm run preview                   # 本地预览 http://localhost:8080
```

## 如何投稿新梗（内容贡献工作流）

内容源是 `content/memes/*.json`，通过 Git 工作流贡献，无需后端：

1. **Fork 本仓库**，从 main 拉一个分支（如 `meme/e-ren-zhi-xin`）；
2. **复制模板**：把 `content/templates/new-meme.json` 复制为 `content/memes/<梗id>.json`（id 用小写字母/数字/连字符，即详情页 URL 的 slug）；按 `content/schema.md` 的字段表逐项填写——中文 wiki 正文（符号层/语境层/立场层）、模因谱系、拼音发音、场景标签、投票项、点赞数，**以及英文 titleEn（含英文关键词）和 summaryEn（80~160 字符，给海外读者和搜索引擎）**，一个都不能少；**填写完删除模板里所有 `_说明` 字段**；
3. **本地自检**：运行 `npm run validate`，按输出的中文错误逐条修复，直到出现「内容校验通过」；
4. **提交并提 Pull Request**；PR 会触发 CI（校验 + 构建），维护者复核内容质量后合并，合并到 main 后 Actions 自动重建并发布到 GitHub Pages。

> 原则：内容只在 `content/memes/*.json` 里手改；`js/data.js` 永远由脚本生成，不要直接改它。
> 校验器挂在 `npm run build` 最前面，内容不合法时构建会直接失败，因此坏内容进不了主分支发布。

## 国际化约定

- 界面文案全部走 `js/i18n.js` 的 `t(key)`；新增界面文案时 en / zh 两个字典都要补；
- 梗内容（nameCN、origin、usage、谱系事件等）是内容不是界面，不翻译；英文读者看 titleEn/summaryEn + 详情页英文首屏；
- 语言选择存 `localStorage["meme-lang"]`，默认 `en`；切换时 `setLang` 派发 `langchange` 事件，app.js 监听后即时重渲染 + 水合详情页。

## 上线部署（GitHub Pages + Actions，零配置静态托管）

1. **Fork 本仓库** 到你的 GitHub 账号，默认分支保持 `main`；
2. **开启 Pages**：仓库 Settings → Pages → Source 选 **GitHub Actions**（无需手动建 gh-pages 分支）；
3. **推送代码**：向你的 fork 的 `main` 分支 push（或直接启用后手动触发 Actions 里的 Deploy workflow）；
4. **等待自动发布**：`.github/workflows/deploy.yml` 会跑 `npm ci → build:deploy → 部署`，完成后 Pages 环境的 URL 就是你的站点：`https://<你的用户名>.github.io/<仓库名>/`。

细节说明：

- **子路径自动适配**：构建时 `SITE_URL` 自动推导为 `https://<owner>.github.io/<repo>`，canonical / og:url / og:image / sitemap 全部使用该值；站内资源链接本来就是相对路径，子路径部署无需任何改动；
- 若仓库是用户页（`<username>.github.io`，无子路径），把 deploy.yml 里 `SITE_URL` 环境变量改为 `https://<username>.github.io`（去掉 `/<repo>`）即可；
- 每次 push / PR，`ci.yml` 自动跑 `npm ci → validate → build`，内容或构建坏了会直接红叉；
- 部署后到 **Google Search Console** 提交 `https://<owner>.github.io/<repo>/sitemap.xml`（或用户页根路径的 sitemap.xml），用 Facebook Sharing Debugger / LinkedIn Post Inspector 抓任一 `memes/*.html` 检查社交卡片。

## 上线前清单（自托管域名时）

1. 自托管域名：改 `SITE_URL`（deploy.yml 环境变量或本地 `SITE_URL=https://your.domain npm run build:memes`）；
2. 每次发版：`sw.js` 的 `CACHE_NAME` 版本号 +1（当前 v8），旧缓存自动清理；
3. OG 图已自托管于 `assets/og/`（`scripts/build-og.mjs` 生成），新增梗后 `npm run build` 会自动补图，无需再依赖 placehold.co。
