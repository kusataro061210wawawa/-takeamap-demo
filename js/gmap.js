/* Take A Map 試作：Google Maps JavaScript API で地図を出す部品
 * - 地図は必要になったときに Google から読み込む（index.html には書かない）
 * - Google の地図画像・タイル・場所の情報は、どこにも保存しない（sw.js でも横取りしない／localStorage にも入れない）
 * - オフラインや読み込みに失敗したときは、地図の所にだけ「地図を表示できません」を出し、ほかの画面はそのまま動く
 * 使い方：GM.create(要素, { center: [緯度, 経度], zoom, gesture }) → Promise（地図。出せなければ null）
 */
(function () {
  // APIキー：Google Cloud で GitHub Pages のアドレスだけに使えるよう制限してある（localhost では使えないことがある）
  const KEY = "AIzaSyCHtLbbZIoz8zUYQziM6GKQVMfqBoDk2ek";
  const MSG = {
    offline: "オフラインのため地図を表示できません",
    load: "地図を読み込めませんでした。インターネットにつながっているか確認してください",
    auth: "地図を表示できません（Google マップの APIキーが、このアドレスでは使えません）",
  };
  // Google の店・施設のアイコンは出さない（押しても店の情報を開かない）
  const STYLES = [
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  ];

  /* ---------- 読み込み ---------- */
  let readyP = null, authFailed = false;
  const loaded = () => !!(window.google && google.maps && google.maps.Map && google.maps.OverlayView);
  function load() {
    if (authFailed) return Promise.reject(new Error("auth"));
    if (loaded()) return Promise.resolve();
    if (navigator.onLine === false) return Promise.reject(new Error("offline"));
    if (!readyP) {
      readyP = new Promise((resolve, reject) => {
        window.__tamGmapReady = () => google.maps.importLibrary("maps").then(() => resolve(), reject);
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&language=ja&region=JP&loading=async&callback=__tamGmapReady`;
        s.async = true;
        s.onerror = () => { readyP = null; s.remove(); reject(new Error(navigator.onLine === false ? "offline" : "load")); };
        document.head.appendChild(s);
      });
    }
    // 時間がかかりすぎたら、その回はあきらめる（読み込みは続け、次に地図を開いたときに使う）
    return Promise.race([readyP, new Promise((_, rej) => setTimeout(() => rej(new Error("load")), 15000))]);
  }
  // APIキーが使えないアドレス（localhost など）で開いたとき、Google から呼ばれる
  window.gm_authFailure = () => {
    authFailed = true;
    document.querySelectorAll("[data-gmap]").forEach((el) => showOff(el, "auth"));
  };
  // 地図の所にだけ出すお知らせ
  function showOff(el, why) {
    if (!el || !el.isConnected) return;
    let box = el.querySelector(":scope > .map-off");
    if (!box) { box = document.createElement("div"); box.className = "map-off"; el.appendChild(box); }
    box.innerHTML = `<span>${MSG[why] || MSG.load}</span>`;
  }

  /* ---------- 位置と画面の点（メルカトル。ズーム0で 256px の世界） ---------- */
  const T = 256;
  function world(ll) {
    const s = Math.min(Math.max(Math.sin((ll[0] * Math.PI) / 180), -0.9999), 0.9999);
    return { x: T * (0.5 + ll[1] / 360), y: T * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
  }
  function unworld(p) {
    const n = Math.PI * (1 - (2 * p.y) / T);
    return [(180 / Math.PI) * Math.atan(Math.sinh(n)), (p.x / T - 0.5) * 360];
  }
  const gLL = (ll) => new google.maps.LatLng(ll[0], ll[1]);

  /* ---------- ピン（HTMLで描く） ---------- */
  let HtmlMarker = null;
  function defineMarker() {
    if (HtmlMarker) return;
    HtmlMarker = class extends google.maps.OverlayView {
      constructor(ll, o) {
        super();
        this.ll = gLL(ll); this.o = o;
        const d = document.createElement("div");
        const live = o.interactive !== false;
        d.className = "gm-mk" + (o.cls ? " " + o.cls : "") + (live ? "" : " gm-static");
        d.style.width = o.size[0] + "px"; d.style.height = o.size[1] + "px";
        d.style.zIndex = String(1000 + (o.z || 0));
        d.innerHTML = o.html;
        if (o.title) d.title = o.title;
        if (live) {
          google.maps.OverlayView.preventMapHitsAndGesturesFrom(d); // ピンを押しても地図のクリックにしない
          if (o.onClick) d.addEventListener("click", (e) => { e.stopPropagation(); o.onClick(e); });
        }
        this.div = d;
      }
      onAdd() { this.getPanes()[this.o.interactive === false ? "overlayLayer" : "overlayMouseTarget"].appendChild(this.div); }
      draw() {
        const p = this.getProjection() && this.getProjection().fromLatLngToDivPixel(this.ll);
        if (!p) return;
        this.div.style.left = Math.round(p.x - this.o.anchor[0]) + "px";
        this.div.style.top = Math.round(p.y - this.o.anchor[1]) + "px";
      }
      onRemove() { this.div.remove(); }
      getElement() { return this.div; }
    };
  }

  /* ---------- 線（dash："6 6" のように 線の長さ と すきま。2 以下は点線） ---------- */
  function makeLine(pts, o) {
    const weight = o.weight || 3, opacity = o.opacity == null ? 1 : o.opacity;
    const opt = { path: pts.map(gLL), strokeColor: o.color, strokeOpacity: opacity, strokeWeight: weight, clickable: !!o.onClick, zIndex: o.z || 0 };
    if (o.dash) {
      const [a, b] = String(o.dash).split(/\s+/).map(Number);
      const icon = a <= 2
        ? { path: google.maps.SymbolPath.CIRCLE, scale: weight / 2, fillColor: o.color, fillOpacity: opacity, strokeOpacity: 0 }
        : { path: "M 0,-1 0,1", scale: a / 2, strokeColor: o.color, strokeOpacity: opacity, strokeWeight: weight };
      opt.icons = [{ icon, offset: "0", repeat: a + b + (a <= 2 ? weight : 0) + "px" }];
      opt.strokeOpacity = 0;
    }
    const pl = new google.maps.Polyline(opt);
    if (o.onClick) pl.addListener("click", o.onClick);
    return pl;
  }

  /* ---------- ピンや線のまとまり（まとめて消せる） ---------- */
  class Group {
    constructor(m) { this.m = m; this.items = []; m.groups.push(this); }
    add(o) { o.setMap(this.m.g); this.items.push(o); return o; }
    marker(ll, o) { return this.add(new HtmlMarker(ll, o)); }
    line(pts, o) { return this.add(makeLine(pts, o)); }
    clear() { this.items.forEach((o) => o.setMap(null)); this.items = []; }
  }

  /* ---------- 地図 ---------- */
  class TMap {
    constructor(el, o) {
      this.el = el; this.groups = []; this.ls = [];
      this.minZoom = o.minZoom || 5; this.maxZoom = o.maxZoom || 20;
      this.g = new google.maps.Map(el, {
        center: gLL(o.center), zoom: o.zoom,
        minZoom: this.minZoom, maxZoom: this.maxZoom,
        disableDefaultUI: true, clickableIcons: false, keyboardShortcuts: false,
        gestureHandling: o.gesture || "greedy", // greedy：指1本で動かせる／cooperative：2本指／none：動かさない
        styles: STYLES, backgroundColor: "#EEF0EA",
      });
    }
    group() { return new Group(this); }
    getZoom() { return this.g.getZoom(); }
    getSize() { return { x: this.el.clientWidth, y: this.el.clientHeight }; }
    getCenter() { const c = this.g.getCenter(); return [c.lat(), c.lng()]; }
    // 緯度経度 → 地図の左上からの画面の点
    toPoint(ll) {
      const k = 2 ** this.getZoom(), c = world(this.getCenter()), p = world(ll), s = this.getSize();
      return { x: (p.x - c.x) * k + s.x / 2, y: (p.y - c.y) * k + s.y / 2 };
    }
    toLatLng(pt) {
      const k = 2 ** this.getZoom(), c = world(this.getCenter()), s = this.getSize();
      return unworld({ x: c.x + (pt.x - s.x / 2) / k, y: c.y + (pt.y - s.y / 2) / k });
    }
    setView(ll, z) { this.g.moveCamera({ center: gLL(ll), zoom: z }); }
    // ll が、地図のまん中から offY だけ下に見えるようにする
    centerOn(ll, z, offY = 0, animate = false) {
      const p = world(ll), center = gLL(unworld({ x: p.x, y: p.y - offY / 2 ** z }));
      if (animate && z === this.getZoom()) this.g.panTo(center); else this.g.moveCamera({ center, zoom: z });
    }
    // 点が全部、上下左右の余白の内側に入るようにする（pad：まわりに足す割合）
    fit(pts, o = {}) {
      if (!pts.length) return;
      const top = o.top || 0, right = o.right || 0, bottom = o.bottom || 0, left = o.left || 0, pad = o.pad || 0;
      const maxZ = Math.min(o.maxZoom || this.maxZoom, this.maxZoom);
      const ws = pts.map(world);
      let x0 = Math.min(...ws.map((p) => p.x)), x1 = Math.max(...ws.map((p) => p.x));
      let y0 = Math.min(...ws.map((p) => p.y)), y1 = Math.max(...ws.map((p) => p.y));
      const dx0 = x1 - x0, dy0 = y1 - y0;
      x0 -= dx0 * pad; x1 += dx0 * pad; y0 -= dy0 * pad; y1 += dy0 * pad;
      const s = this.getSize();
      const aw = Math.max(40, s.x - left - right), ah = Math.max(40, s.y - top - bottom);
      const dx = x1 - x0, dy = y1 - y0;
      let z = dx || dy ? Math.floor(Math.log2(Math.min(dx ? aw / dx : Infinity, dy ? ah / dy : Infinity))) : maxZ;
      z = Math.max(this.minZoom, Math.min(maxZ, z));
      const k = 2 ** z;
      const cx = (x0 + x1) / 2 - (left - right) / 2 / k, cy = (y0 + y1) / 2 - (top - bottom) / 2 / k;
      this.g.moveCamera({ center: gLL(unworld({ x: cx, y: cy })), zoom: z });
    }
    // movestart：動き始め／moveend：止まった／zoomstart：拡大縮小が始まった／click：地図の何もない所を押した
    on(ev, fn) {
      const add = (name, f) => this.ls.push(this.g.addListener(name, f));
      if (ev === "moveend") add("idle", fn);
      else if (ev === "zoomstart") add("zoom_changed", fn);
      else if (ev === "click") add("click", fn);
      else if (ev === "movestart") {
        let moving = false;
        add("bounds_changed", () => { if (!moving) { moving = true; fn(); } });
        add("idle", () => { moving = false; });
      }
      return this;
    }
    remove() {
      this.groups.forEach((g) => g.clear()); this.groups = [];
      this.ls.forEach((l) => l.remove()); this.ls = [];
      google.maps.event.clearInstanceListeners(this.g);
    }
  }

  // 地図を作る。オフラインなどで出せないときは、地図の所にお知らせを出して null を返す
  function create(el, o) {
    if (!el) return Promise.resolve(null);
    el.setAttribute("data-gmap", "");
    const off = el.querySelector(":scope > .map-off"); if (off) off.remove();
    return load().then(() => {
      if (!el.isConnected) return null; // 読み込んでいる間に画面が閉じられた
      defineMarker();
      return new TMap(el, o);
    }).catch((e) => {
      showOff(el, (e && e.message) || "load");
      return null;
    });
  }

  window.GM = { create };
})();
