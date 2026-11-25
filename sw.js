/* Take A Map 試作：オフラインでも画面が開くようにするサービスワーカー
 * - アプリ本体（HTML/CSS/JS/アイコン）は最初に保存しておく
 * - 地図タイル（国土地理院）は一度表示した範囲だけ保存し、件数に上限をつける
 * ファイルを変えたら VERSION の数字を上げる（古い保存が入れ替わる）
 */
const VERSION = "v1";
const APP_CACHE = "tam-app-" + VERSION;
const TILE_CACHE = "tam-tiles-v1";
const TILE_MAX = 1500; // 保存するタイルの上限（1枚 数KB〜十数KB）

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/data.js",
  "./js/rebuild.js",
  "./js/app.js",
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet/leaflet.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tam-app-") && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - TILE_MAX; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 地図タイル：保存があればそれを使い、なければ取りに行って保存
  if (url.hostname === "cyberjapandata.gsi.go.jp") {
    e.respondWith(
      caches.open(TILE_CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trimTiles(); }
          return res;
        } catch (err) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // アプリ本体：ネットにつながれば最新を使い、つながらなければ保存したものを使う
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(APP_CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
    );
  }
});
