/* Take A Map 試作：オフラインでも画面が開くようにするサービスワーカー
 * - アプリ本体（HTML/CSS/JS/アイコン）は最初に保存しておく
 * - 地図は Google Maps。Google の地図・タイル・場所の情報は保存しない（Google へのリクエストは横取りせず、そのままネットへ）
 *   オフラインのときは、地図の所にだけ「地図を表示できません」と出る（js/gmap.js）
 * ファイルを変えたら VERSION の数字を上げる（古い保存が入れ替わる）
 */
const VERSION = "v17";
const APP_CACHE = "tam-app-" + VERSION;
const IMG_CACHE = "tam-img-v1"; // 記事の写真（名前を変えない限り中身は変わらないので、保存を先に使う）
const OLD_CACHES = ["tam-tiles-v1"]; // 前の版で保存していた国土地理院の地図タイル（もう使わないので消す）

// Google のサーバー（地図の部品・タイル・画像）。ここへのリクエストはサービスワーカーで扱わない
const isGoogle = (host) =>
  /(^|\.)(googleapis\.com|gstatic\.com|googleusercontent\.com|google\.com|ggpht\.com)$/.test(host);

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/gmap.js",
  "./js/data.js",
  "./js/rebuild.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
// 記事の写真の小さい版（カード・吹き出し用）は最初に保存。大きい版は一度見たものだけ保存
const IMG_FILES = [
  "./images/castle-1-s.jpg",
  "./images/castle-2-s.jpg",
  "./images/castle-3-s.jpg",
  "./images/castle-4-s.jpg",
  "./images/hatsushima-1-s.jpg",
  "./images/hibiya-1-s.jpg",
  "./images/hibiya-2-s.jpg",
  "./images/ishikawa-1-s.jpg",
  "./images/ishikawa-2-s.jpg",
  "./images/ishikawa-3-s.jpg",
  "./images/itabashi-1-s.jpg",
  "./images/itabashi-2-s.jpg",
  "./images/itosho-1-s.jpg",
  "./images/itosho-2-s.jpg",
  "./images/itsukushima-1-s.jpg",
  "./images/kanagawa-1-s.jpg",
  "./images/kansui-1-s.jpg",
  "./images/kansui-2-s.jpg",
  "./images/kansui-3-s.jpg",
  "./images/kirari-1-s.jpg",
  "./images/kirari-2-s.jpg",
  "./images/kirari-3-s.jpg",
  "./images/kure-chinraiken-1-s.jpg",
  "./images/kure-chinraiken-2-s.jpg",
  "./images/kure-kujira-1-s.jpg",
  "./images/kure-yamato-1-s.jpg",
  "./images/musashino-1-s.jpg",
  "./images/musashino-2-s.jpg",
  "./images/sentpure-1-s.jpg",
  "./images/sentpure-2-s.jpg",
  "./images/toyama-st-1-s.jpg",
  "./images/toyama-st-2-s.jpg",
  "./images/umimirai-1-s.jpg",
  "./images/umimirai-2-s.jpg",
  "./images/yonekyu-1-s.jpg",
  "./images/yonekyu-2-s.jpg",
  "./images/yonekyu-3-s.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    Promise.all([
      // ブラウザの保存（GitHub Pages は10分）を使わずに、サーバーから新しく取る
      caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES.map((f) => new Request(f, { cache: "reload" })))),
      // 写真は1枚失敗しても入れられるように1枚ずつ
      caches.open(IMG_CACHE).then((c) => Promise.all(IMG_FILES.map((f) => c.match(f).then((hit) => hit || c.add(f).catch(() => {}))))),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith("tam-app-") && k !== APP_CACHE) || OLD_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Google（地図・タイル・場所の情報）：横取りも保存もしない。ブラウザがそのままネットから取る
  if (isGoogle(url.hostname)) return;
  if (req.method !== "GET") return;

  // 記事の写真：保存があればそれを使い、なければ取りに行って保存
  if (url.origin === self.location.origin && url.pathname.includes("/images/")) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) c.put(req, res.clone());
          return res;
        } catch (err) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // アプリ本体：ネットにつながれば最新を使い、つながらなければ保存したものを使う
  // 最新かどうかは、いつもサーバーに確かめる（cache: "no-cache"。ブラウザに10分残る古い版を使わない）
  // （ほかのサイト、たとえば場所を名前で探すときの OpenStreetMap は、ここに来ない＝横取りも保存もしない）
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(APP_CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
    );
  }
});
