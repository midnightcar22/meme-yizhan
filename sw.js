/* 文件名：sw.js
 * 项目：MEME·译站 / MemeBridge
 * 版本：v3.5
 * 最后更新：2026-10-17
 * Service Worker：离线缓存（PWA 核心）
 * 策略：
 *  - 页面导航（HTML）：网络优先，失败回退缓存 —— 保证发版后用户能拿到新页面
 *  - 静态资源：缓存优先，未命中联网回写 —— 仅缓存成功响应，绝不缓存失败结果
 *  - 非 GET 请求（POST 等）与非 http(s) 协议一律直连，不缓存
 *  - 缓存名带版本号，发版时递增 CACHE_NAME 即自动清理旧缓存
 */
const CACHE_NAME = "meme-yizhan-v8";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/tailwind.css",
  "./js/data.js",
  "./js/i18n.js",
  "./js/wiki-template.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/og/city-bu-city.png",
  "./assets/og/da-gong-ren.png",
  "./assets/og/jue-jue-zi.png",
  "./assets/og/nei-juan.png",
  "./assets/og/tang-ping.png"
];

// 安装：预缓存核心资源
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // 仅处理 GET 请求（POST 等直连，不缓存）
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // 页面导航：网络优先（避免发版后长期命中旧 HTML），离线时回退缓存
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  // 静态资源：缓存优先，未命中联网并回写（仅缓存 ok 或跨域 opaque 响应）
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
    ).catch(() => Response.error()) // 离线且未命中：子资源静默失败，不用 index.html 顶替
  );
});
