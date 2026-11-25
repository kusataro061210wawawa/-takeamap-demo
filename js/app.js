/* Take A Map 試作：画面の動き */
(function () {
  const D = window.TAM_DATA, R = window.TAM_REBUILD;
  const V = D.viewer;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const spotById = Object.fromEntries(D.spots.map((s) => [s.id, s]));
  const writerById = Object.fromEntries(D.writers.map((w) => [w.id, w]));
  const recById = Object.fromEntries(D.records.map((r) => [r.id, r]));
  const RATING = { 3: "また行きたい", 2: "よかった", 1: "合わなかった" };
  const TILE = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";
  const ATTR = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>';
  const CREDIT = `<small class="credit">地図：${ATTR}</small>`;
  const OMIYA = [35.9115, 139.6265];
  const KIND_BG = {
    "建築": ["#56859C", "#123D2B"], "ラーメン": ["#E86B45", "#8E3A1E"], "カフェ": ["#B08968", "#6F4E37"], "名所": ["#7F8C84", "#123D2B"],
    "公園": ["#97BC62", "#2C5F2D"], "博物館": ["#56859C", "#21295C"], "美術館": ["#A26769", "#6D2E46"], "店": ["#A7BEAE", "#626E66"], "山": ["#97BC62", "#2C5F2D"],
  };
  // つくるで場所を押したときの滞在時間のめやす（分）
  const STAY_BY_KIND = { "ラーメン": 40, "カフェ": 45, "博物館": 90, "美術館": 60, "公園": 40, "名所": 45, "建築": 60, "店": 60, "山": 150 };
  const defaultStay = (sp) => STAY_BY_KIND[sp.kind] || 45;
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/></svg>',
    search: '<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    walk: '<svg viewBox="0 0 24 24"><circle cx="13" cy="4.5" r="2"/><path d="M9.5 21l2.2-6.5 3 3V21M8 12l1.5-4 3.5-1 2.5 3.5 3 1M11.7 14.5L13 7"/></svg>',
    calplus: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M12 12.5v5M9.5 15h5"/></svg>',
  };
  const VIS = [["public", "公開"], ["member", "メンバー限定"], ["private", "非公開"]];
  const visLabel = (k) => (VIS.find((v) => v[0] === k) || VIS[0])[1];

  // つくっている途中の予定。stops は { spot, stay }。start は分（600 = 10:00）
  const newDraft = (o = {}) => ({ id: null, name: "", start: 600, stops: [], from: null, dirty: false, ...o });

  const state = {
    tag: null, mode: "fav", view: "read",
    readTag: null,           // 読む：選んでいるタグ（null = おすすめ）
    planMode: "make",        // 予定：make（つくる）/ follow（たどる）
    followList: true,        // たどる：保存した予定の一覧を出しているか
    sheetBy: { explore: "peek", make: "peek", follow: "half" }, // 下のシートの高さ（画面ごとに覚える）
    fitNext: false,          // 次に地図を出すとき、予定の場所に合わせて動かすか
    myMapFilter: "all",      // 自分のマップ：all / rec / saved
    draft: newDraft(),       // つくる
    plans: [],               // 保存した予定 { id, name, start, stops, from }
    plan: null,              // たどっている予定 { planId, title, stops（時刻つき）, cur }
    rain: false, delay: 0, closed: [],
    pending: null,           // 組み直しの結果（まだ決めていない）
    myRecords: [
      { id: "my1", title: "神保町で古本と喫茶", date: "2026-10-04", spots: [{ name: "神保町の古書店街", lat: 35.6960, lng: 139.7580, rating: 3, note: "棚を見ているだけで一日終わる。", vis: "public" }] },
      { id: "my2", title: "上野の美術館で雨宿り", date: "2026-09-13", spots: [{ name: "上野公園の美術館", lat: 35.7188, lng: 139.7765, rating: 2, note: "雨の日でも楽しめた。", vis: "public" }] },
    ],
  };

  /* ---------- 共通 ---------- */
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function favKind(wid, rec) {
    if (V.favorites.includes(wid)) return "fav";
    const t = V.tagFavorites[wid];
    if (t && t.length && (!rec || rec.tags.some((x) => t.includes(x)))) return "tagfav";
    return null;
  }
  function badges(w, rec) {
    if (w.official) return '<span class="badge official">公式</span>';
    const k = favKind(w.id, rec);
    if (k === "fav") return '<span class="badge fav">お気に入り</span>';
    if (k === "tagfav") return `<span class="badge tagfav">${esc(V.tagFavorites[w.id].join("・"))}だけお気に入り</span>`;
    return "";
  }
  // 「く」1文字だと戻る矢印に見えるので、くさたろは2文字にする
  const initial = (w) => w.initial || w.name[0];
  const avatar = (w, cls = "") => { const t = initial(w); return `<span class="avatar ${cls} ${t.length > 1 ? "two" : ""}" style="background:${w.color}">${esc(t)}</span>`; };
  const ratingTag = (n) => `<span class="rating r${n}">${RATING[n]}</span>`;
  function photoStyle(spot) {
    if (spot.photo) return `background-image:url('${spot.photo}')`;
    const [a, b] = KIND_BG[spot.kind] || ["#7F8C84", "#123D2B"];
    return `background:linear-gradient(135deg, ${a}, ${b})`;
  }
  function tileLayer() { return L.tileLayer(TILE, { attribution: ATTR, maxZoom: 18, minZoom: 5 }); }
  const PIN_SIZE = { fav: 26, official: 26, mine: 22, saved: 20, other: 16, num: 28 };
  function divPin(cls, inner, extra = "") {
    const n = PIN_SIZE[cls.split(" ")[0]] || 22;
    return L.divIcon({ className: "", html: `<div class="pin ${cls}" style="${extra}">${inner || ""}</div>`, iconSize: [n, n], iconAnchor: [n / 2, n / 2], tooltipAnchor: [0, -n / 2] });
  }
  // その場所について、いちばん読んでほしい記事（お気に入りの書き手 → 公式 → ほか、評価が高い順）
  function bestRecordFor(spotId) {
    let best = null;
    D.records.forEach((r) => r.spots.forEach((s) => {
      if (s.spot !== spotId) return;
      const fk = favKind(r.writer, r);
      const score = (fk === "fav" ? 30 : fk ? 20 : r.official ? 10 : 0) + s.rating;
      if (!best || score > best.score) best = { r, s, score };
    }));
    return best;
  }
  const schedule = (start, stops) => (stops.length ? R.buildSchedule(D, { start: R.fmt(start), spots: stops }) : []);

  /* ---------- 地図（探す・つくる・たどる で同じ地図を使う） ---------- */
  let map, layer, bubbleLayer, pinInfo = [];
  const stage = () => (state.view === "plan" ? state.planMode : "explore");
  function initMap() {
    if (typeof L === "undefined") { $("#map").innerHTML = '<div class="empty">地図を読み込めませんでした。インターネットにつながっているか確認してください。</div>'; return; }
    // 出典は下のシートに表示する（シートで隠れないように）
    map = L.map("map", { zoomControl: false, attributionControl: false }).setView(OMIYA, 14);
    tileLayer().addTo(map);
    layer = L.layerGroup().addTo(map);
    bubbleLayer = L.layerGroup().addTo(map);
    map.on("zoomstart", () => bubbleLayer.clearLayers());
    // 探す：動かしている間は一覧を薄くし、止まって少したってから、映っている範囲の記事に入れ替える
    map.on("movestart", () => { if (stage() === "explore") { clearTimeout(areaTimer); $("#sheet-body").classList.add("waiting"); } });
    map.on("moveend", () => { refreshBubbles(); if (stage() === "explore") scheduleArea(); });
  }
  const topInset = () => $(".map-top").offsetHeight;
  function sheetPx() {
    const el = $("#sheet"), h = $("#view-map").clientHeight;
    return el.classList.contains("peek") ? 132 : el.classList.contains("half") ? h * 0.52 : h - 100;
  }

  /* 探す：地図に映っている範囲（上の検索・タグと、下のシートに隠れていない所） */
  let areaTimer = null, areaBounds = null;
  function computeArea() {
    if (!map) return null;
    const size = map.getSize();
    if (!size.x || !size.y) return null;
    const top = Math.min(topInset(), size.y * 0.4);
    const sheetH = $("#sheet").classList.contains("peek") ? 132 : size.y * 0.52;
    const bottom = Math.max(top + 40, size.y - sheetH);
    return L.latLngBounds(map.containerPointToLatLng([0, top]), map.containerPointToLatLng([size.x, bottom]));
  }
  function updateArea() {
    if (stage() !== "explore") return;
    areaBounds = computeArea();
    renderSheet();
    const body = $("#sheet-body");
    body.classList.remove("waiting", "fresh"); void body.offsetWidth; body.classList.add("fresh");
  }
  function scheduleArea(delay = 450) {
    clearTimeout(areaTimer);
    $("#sheet-body").classList.add("waiting");
    areaTimer = setTimeout(updateArea, delay);
  }
  const inArea = (r) => !areaBounds || r.spots.some((s) => areaBounds.contains([spotById[s.spot].lat, spotById[s.spot].lng]));

  function visibleRecords() {
    return D.records.filter((r) => {
      if (state.tag && !r.tags.includes(state.tag)) return false;
      if (r.official) return true;
      if (state.mode === "fav") return !!favKind(r.writer, r);
      if (state.mode === "group") {
        const rec = writerById[r.writer].stats.records;
        return state.tag ? (rec[state.tag] || 0) >= 10 : Object.values(rec).some((n) => n >= 10);
      }
      return true;
    });
  }

  // ピンを置き、吹き出しに使う情報を覚えておく
  function addPin(ll, icon, info, onClick, z = 0) {
    const m = L.marker(ll, { icon, zIndexOffset: z }).addTo(layer);
    if (onClick) m.on("click", onClick);
    if (info) pinInfo.push({ ll, ...info });
    return m;
  }
  function drawMap(fit) {
    if (!map) return;
    layer.clearLayers(); pinInfo = [];
    const st = stage();
    let pts = [];
    if (st === "explore") pts = drawRecords(false);
    if (st === "make") { const rp = drawRecords(true), dp = drawDraft(); pts = dp.length ? dp : rp; }
    if (st === "follow") pts = drawFollow();
    if (fit && pts.length) fitTo(pts);
    refreshBubbles();
  }
  function fitTo(pts) {
    map.fitBounds(L.latLngBounds(pts).pad(pts.length > 1 ? 0.12 : 0), { maxZoom: 16, paddingTopLeft: [24, topInset() + 16], paddingBottomRight: [24, sheetPx() + 16] });
  }

  // 記事のピンとルート（探す・つくる）
  function drawRecords(make) {
    const recs = visibleRecords();
    const seen = {}, pts = [];
    const inDraft = new Set(make ? state.draft.stops.map((s) => s.spot) : []);
    recs.forEach((r) => {
      const w = writerById[r.writer], fk = favKind(r.writer, r);
      const color = r.official ? "#E86B45" : fk ? w.color : "#A9B2AC";
      if (r.type === "route") {
        const strong = fk || r.official;
        const line = L.polyline(r.spots.map((s) => [spotById[s.spot].lat, spotById[s.spot].lng]), {
          color, weight: make ? 2.5 : strong ? 4 : 2.5, opacity: make ? 0.28 : strong ? 0.85 : 0.6, dashArray: r.official ? "6 6" : null, interactive: !make,
        }).addTo(layer);
        if (!make) line.on("click", () => openArticle(r.id));
      }
      r.spots.forEach((s) => {
        const sp = spotById[s.spot];
        pts.push([sp.lat, sp.lng]);
        const rank = r.official ? 2 : fk ? 3 : 1;
        if (seen[sp.id] && seen[sp.id].rank >= rank) return;
        seen[sp.id] = { rank, r, s, sp, color, fk };
      });
    });
    // つくる：登録した場所も予定に入れられるように出す
    if (make) V.saved.forEach((x) => {
      if (seen[x.spot]) return;
      const b = bestRecordFor(x.spot);
      seen[x.spot] = { rank: 0, r: b && b.r, s: b && b.s, sp: spotById[x.spot], saved: true };
    });
    Object.values(seen).forEach(({ rank, r, s, sp, color, fk, saved }) => {
      if (inDraft.has(sp.id)) return; // 予定に入れた場所は番号のピンで出す
      const kind = saved ? "saved" : r.official ? "official" : fk ? "fav" : "other";
      const icon = kind === "saved" ? divPin("saved", "") : kind === "official" ? divPin("official", "公式") : kind === "fav" ? divPin("fav", esc(writerById[r.writer].name[0]), `background:${color}`) : divPin("other", "");
      const m = addPin([sp.lat, sp.lng], icon, { half: PIN_SIZE[kind] / 2, prio: rank, sp, r, s }, () => (make ? toggleDraftSpot(sp.id) : openArticle(r.id)));
      if (!make) m.bindTooltip(esc(sp.name), { direction: "top" });
      if (!make && state.mode === "group") {
        const t = state.tag || Object.keys(sp.groupLikes || {})[0];
        const n = sp.groupLikes && sp.groupLikes[t];
        if (n) L.marker([sp.lat, sp.lng], { icon: L.divIcon({ className: "", html: `<div class="pin-count">また行きたい ${n}人</div>`, iconSize: [0, 0], iconAnchor: [0, 0] }), interactive: false }).addTo(layer);
      }
    });
    return pts;
  }

  // つくる：選んだ順に 1, 2, 3… と番号をつけ、線でつなぐ
  function drawDraft() {
    const stops = state.draft.stops;
    const ll = stops.map((x) => [spotById[x.spot].lat, spotById[x.spot].lng]);
    if (ll.length > 1) L.polyline(ll, { color: "#E86B45", weight: 4.5, opacity: 0.9, interactive: false }).addTo(layer);
    stops.forEach((x, i) => {
      const b = bestRecordFor(x.spot);
      addPin(ll[i], divPin("num", String(i + 1)), { half: 14, prio: 10, sp: spotById[x.spot], r: b && b.r, s: b && b.s, num: i + 1 }, () => toggleDraftSpot(x.spot), 1000);
    });
    return ll;
  }

  // たどる：選んだ予定のルート。一覧を出しているときは、保存した予定を薄く出す
  function drawFollow() {
    const ll = (stops) => stops.map((s) => [spotById[s.spot].lat, spotById[s.spot].lng]);
    if (state.followList || !state.plan) {
      const pts = [];
      state.plans.forEach((p) => {
        const l = ll(p.stops); pts.push(...l);
        if (l.length > 1) L.polyline(l, { color: "#123D2B", weight: 3, opacity: 0.4, dashArray: "4 6", interactive: false }).addTo(layer);
        l.forEach((x) => L.circleMarker(x, { radius: 4, color: "#123D2B", weight: 2, fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(layer));
      });
      return pts;
    }
    const pl = state.plan;
    const live = pl.stops.filter((s) => s.status !== "dropped");
    if (live.length > 1) L.polyline(ll(live), { color: "#2B7DE9", weight: 4, dashArray: "2 8", opacity: 0.9, interactive: false }).addTo(layer);
    return pl.stops.map((s, i) => {
      const sp = spotById[s.spot], b = bestRecordFor(s.spot);
      const cls = s.status === "dropped" ? "num fl dropped" : i < pl.cur ? "num fl done" : i === pl.cur ? "num fl now" : "num fl";
      addPin([sp.lat, sp.lng], divPin(cls, String(i + 1)), { half: 14, prio: i === pl.cur ? 10 : 5, sp, r: b && b.r, s: b && b.s, num: i + 1, fl: true }, () => b && openArticle(b.r.id), i === pl.cur ? 900 : 500);
      return [sp.lat, sp.lng];
    });
  }

  /* 吹き出し：ある程度拡大して、まわりに余白があるピンだけに、場所名・記事名・評価を出す。押すと記事へ */
  const BW = 176, BH = 62, BGAP = 9, BUBBLE_ZOOM = 15;
  function refreshBubbles() {
    if (!map || !bubbleLayer) return;
    bubbleLayer.clearLayers();
    if (map.getZoom() < BUBBLE_ZOOM || !$("#view-map").classList.contains("active")) return;
    const size = map.getSize(), top = topInset() + 4, bottom = size.y - sheetPx() - 4;
    const hit = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
    const pins = pinInfo.map((p) => {
      const pt = map.latLngToContainerPoint(p.ll), h = p.half + 2;
      return { ...p, pt, box: { x: pt.x - h, y: pt.y - h, w: h * 2, h: h * 2 } };
    }).filter((p) => p.pt.x > -40 && p.pt.x < size.x + 40 && p.pt.y > top - 40 && p.pt.y < bottom + 40);
    const placed = [];
    pins.filter((p) => p.pt.x >= 0 && p.pt.x <= size.x && p.pt.y >= top && p.pt.y <= bottom)
      .sort((a, b) => b.prio - a.prio)
      .forEach((p) => {
        const o = p.half + BGAP;
        const cand = {
          top: { x: p.pt.x - BW / 2, y: p.pt.y - o - BH }, bottom: { x: p.pt.x - BW / 2, y: p.pt.y + o },
          right: { x: p.pt.x + o, y: p.pt.y - BH / 2 }, left: { x: p.pt.x - o - BW, y: p.pt.y - BH / 2 },
        };
        for (const pos of ["top", "bottom", "right", "left"]) {
          const r = { ...cand[pos], w: BW, h: BH };
          if (r.x < 6 || r.x + BW > size.x - 6 || r.y < top || r.y + BH > bottom) continue;
          if (placed.some((q) => hit(q, r, 6))) continue;
          if (pins.some((q) => q !== p && hit(q.box, r))) continue;
          placed.push(r); addBubble(p, pos, o); break;
        }
      });
  }
  function addBubble(p, pos, o) {
    const anchor = { top: [BW / 2, o + BH], bottom: [BW / 2, -o], right: [-o, BH / 2], left: [BW + o, BH / 2] }[pos];
    const w = p.r && writerById[p.r.writer];
    const html = `<div class="bubble b-${pos} ${p.num ? (p.fl ? "is-fl" : "is-num") : ""} ${p.r ? "" : "no-rec"}">
      <span class="bn">${p.num ? `<i>${p.num}</i>` : ""}${esc(p.sp.name)}</span>
      <span class="bt">${p.r ? "「" + esc(p.r.title) + "」" : esc(p.sp.kind) + "（記事はまだありません）"}</span>
      ${p.r ? `<span class="bm">${ratingTag(p.s.rating)}<span class="bw">${esc(w.name)}</span><span class="bgo">記事 ›</span></span>` : ""}
    </div>`;
    const m = L.marker(p.ll, { icon: L.divIcon({ className: "bubble-icon", html, iconSize: [BW, BH], iconAnchor: anchor }), zIndexOffset: 3000, keyboard: false }).addTo(bubbleLayer);
    if (p.r) m.on("click", () => openArticle(p.r.id));
  }

  /* 地図の上：探すは検索、つくる・たどるは切り替え */
  function renderTop() {
    const st = stage();
    $("#top-search").hidden = st !== "explore";
    $("#stage-bar").hidden = st === "explore";
    $("#chips").hidden = st === "follow";
    $("#modes").hidden = st === "follow";
    if (st !== "explore") {
      $("#stage-bar").innerHTML = `<div class="seg stage-seg">${[["make", "つくる"], ["follow", "たどる"]].map(([k, l]) => `<button data-stage="${k}" class="${st === k ? "on" : ""}">${l}</button>`).join("")}</div><span class="demo-badge">試作・データは仮</span>`;
    }
  }
  function renderChips() {
    const tags = [null, ...D.TAGS];
    $("#chips").innerHTML = tags.map((t) => `<button class="chip ${state.tag === t ? "on" : ""}" data-tag="${t || ""}">${t || "すべて"}</button>`).join("");
    const modes = [["fav", "お気に入り"], ["group", "同じ趣味の人たち"], ["all", "すべての人"]];
    $("#modes").innerHTML = modes.map(([k, l]) => `<button class="${state.mode === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("");
  }

  /* ---------- 下のシート（探す：記事／つくる：予定表／たどる：予定） ---------- */
  function renderSheet() {
    const st = stage(), body = $("#sheet-body");
    const keep = body.dataset.stage === st ? body.scrollTop : 0;
    if (st !== "explore") body.classList.remove("waiting", "fresh");
    if (st === "explore") renderExploreSheet();
    else if (st === "make") renderMakeSheet();
    else renderFollowSheet();
    body.dataset.stage = st; body.scrollTop = keep;
  }

  function recordCard(r) {
    const w = writerById[r.writer], fk = favKind(r.writer, r);
    const best = Math.max(...r.spots.map((s) => s.rating));
    const kind = r.type === "route" ? `ルート ${r.spots.length}か所` : "1か所の記録";
    const lock = r.member ? `<span class="badge member">${ICON.lock.replace('width="16" height="16"', 'width="11" height="11"')} メンバー限定あり</span>` : "";
    return `<button class="card ${r.official ? "official" : fk ? "fav" : ""}" data-rec="${r.id}">
      <div class="card-top">${avatar(w)}<b>${esc(w.name)}</b>${badges(w, r)}</div>
      <h3>${esc(r.title)}</h3>
      <div class="meta"><span>${kind}</span><span>${esc(r.tags.join("・"))}</span><span>「行った」${r.went}人</span></div>
      <div class="meta" style="margin-top:4px">${ratingTag(best)}${r.stamp ? '<span class="badge official">スタンプラリー</span>' : ""}${lock}</div>
    </button>`;
  }

  function renderExploreSheet() {
    const all = visibleRecords();
    const recs = all.filter(inArea);
    const off = recs.filter((r) => r.official);
    const favs = recs.filter((r) => !r.official && favKind(r.writer, r));
    const others = recs.filter((r) => !r.official && !favKind(r.writer, r));
    const label = state.mode === "fav" ? "お気に入り" : state.mode === "group" ? "同じ趣味の人たち" : "すべての人";
    $("#sheet-head").innerHTML = `<b>${esc(state.tag || "すべて")}の記事</b><small>${areaBounds ? "この範囲 " : ""}${recs.length}件・${label}</small>${CREDIT}`;
    let html = "";
    if (favs.length) html += `<div class="section-label">お気に入りの書き手</div>` + favs.map(recordCard).join("");
    if (others.length) html += `<div class="section-label">${state.mode === "group" ? "同じ趣味の記録が多い人たち" : "ほかの書き手"}</div>` + others.map(recordCard).join("");
    if (off.length) html += `<div class="section-label">公式（自治体・企業）</div>` + off.map(recordCard).join("");
    if (!all.length) html = `<div class="empty">この条件の記事はまだありません。<br>「同じ趣味の人たち」に切り替えてみてください。</div>`;
    else if (!recs.length) html = `<div class="empty">地図に映っている範囲には、記事がありません。<br>地図を縮小するか、動かしてみてください。<br><br><button class="btn ghost small" data-act="fit-all">記事のある場所を表示する（${all.length}件）</button></div>`;
    $("#sheet-body").innerHTML = html;
  }

  /* つくる：予定表。縮めているときは順番だけ、引き上げると時間の調整と保存 */
  function hoursWarn(sp, a, d) {
    if (!sp.hours) return "";
    const o = R.toMin(sp.hours.open), c = R.toMin(sp.hours.close);
    if (a >= c) return `着く時間（${R.fmt(a)}）には閉まっています`;
    if (a < o) return `着く時間（${R.fmt(a)}）はまだ開いていません（${sp.hours.open}から）`;
    if (d > c) return `${sp.hours.close}に閉まります。滞在を短くするか、順番を変えてください`;
    return "";
  }
  function renderMakeSheet() {
    const d = state.draft, sch = schedule(d.start, d.stops), n = sch.length;
    const span = n ? `${R.fmt(sch[0].arrive)}〜${R.fmt(sch[n - 1].depart)}` : "";
    $("#sheet-head").innerHTML = `<b>予定をつくる</b><small>${n ? `${n}か所・${span}` : "場所を押して始める"}</small>${CREDIT}`;
    if (!n) {
      $("#sheet-body").innerHTML = `<div class="mk-hint"><b>地図の場所を押すと、1、2、3…の順に予定に入ります</b>もう一度押すと外れます。地図を拡大すると吹き出しが出て、記事を読めます。「読む」の記事の「つくる」からは、書いた人のルートを先に入れられます。</div>`;
      return;
    }
    const chain = sch.map((s, i) => `<span class="chain-stop"><i>${i + 1}</i>${R.fmt(s.arrive)} ${esc(spotById[s.spot].name)}</span>`).join('<span class="chain-arrow">›</span>');
    const items = sch.map((s, i) => {
      const sp = spotById[s.spot], warn = hoursWarn(sp, s.arrive, s.depart);
      const move = i > 0 ? `<div class="mk-move">${ICON.walk}<span><b>${R.fmt(sch[i - 1].depart)}〜${R.fmt(s.arrive)}</b>　${esc(spotById[sch[i - 1].spot].name)} → ${esc(sp.name)}（歩いて${s.walk}分）</span></div>` : "";
      return `${move}<div class="mk-stop">
        <span class="mk-num">${i + 1}</span>
        <div class="mk-main">
          <div class="mk-time">${R.fmt(s.arrive)}〜${R.fmt(s.depart)}</div>
          <b>${esc(sp.name)}</b>
          <div class="small">${sp.hours ? `営業 ${sp.hours.open}〜${sp.hours.close}（仮）` : "営業時間の制約なし（仮）"}</div>
          ${warn ? `<div class="mk-warn">${esc(warn)}</div>` : ""}
          <div class="mk-ctrl"><span class="small">滞在</span><button data-mk="stay" data-i="${i}" data-d="-15">−15分</button><b>${s.stay}分</b><button data-mk="stay" data-i="${i}" data-d="15">＋15分</button></div>
        </div>
        <div class="mk-side">
          <button data-mk="up" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="前へ">↑</button>
          <button data-mk="down" data-i="${i}" ${i === n - 1 ? "disabled" : ""} aria-label="後ろへ">↓</button>
          <button data-mk="del" data-i="${i}" aria-label="外す">×</button>
        </div>
      </div>`;
    }).join("");
    $("#sheet-body").innerHTML = `<div class="chain">${chain}</div>
      <button class="pull-hint" data-mk="expand">引き上げると、時間を調整して名前を付けて保存できます</button>
      <div class="mk-section">
        <div class="mk-row"><label>出発 <input type="time" class="field time-in" id="mk-start" value="${R.fmt(d.start)}" step="300"></label>${d.from ? `<span class="small">元の記事：${esc(recById[d.from].title)}</span>` : ""}</div>
        <div class="mk-list">${items}</div>
        <div class="mk-save"><input class="field" id="mk-name" placeholder="予定の名前（例：大宮で建築とラーメン）" value="${esc(d.name)}" aria-label="予定の名前"><button class="btn primary" data-mk="save">${d.id ? "上書き保存" : "保存"}</button></div>
        ${d.id && !d.dirty ? `<div class="saved-note">保存しました。「たどる」から選べます<button class="link-btn" data-mk="follow">この予定をたどる${ICON.chev}</button></div>` : ""}
        <div class="mk-foot"><button class="mini-btn" data-mk="new">新しくつくる（空にする）</button></div>
      </div>`;
  }

  /* たどる：保存した予定の一覧 → 選ぶと、その予定の時間割・組み直し */
  function renderFollowSheet() {
    if (state.followList || !state.plan) {
      $("#sheet-head").innerHTML = `<b>たどる</b><small>保存した予定 ${state.plans.length}件</small>${CREDIT}`;
      if (!state.plans.length) {
        $("#sheet-body").innerHTML = `<div class="empty">まだ保存した予定がありません。<br>「つくる」で場所をつなげて、名前を付けて保存すると、ここから選べます。<br><br><button class="btn primary" data-fl="make">つくるへ</button></div>`;
        return;
      }
      $("#sheet-body").innerHTML = `<div class="section-label">たどる予定を選んでください</div>` + state.plans.map((p) => {
        const sch = schedule(p.start, p.stops), on = state.plan && state.plan.planId === p.id;
        return `<div class="plan-card ${on ? "on" : ""}" data-fl="pick" data-id="${p.id}">
          <div class="row-between"><b class="pn">${esc(p.name)}</b>${on ? '<span class="badge fav">たどっている途中</span>' : ""}</div>
          <div class="meta"><span>${p.stops.length}か所</span><span>${R.fmt(sch[0].arrive)}〜${R.fmt(sch[sch.length - 1].depart)}</span>${p.from ? `<span>元の記事：${esc(recById[p.from].title)}</span>` : ""}</div>
          <div class="small chain-text">${p.stops.map((s, i) => `${i + 1} ${esc(spotById[s.spot].name)}`).join(" › ")}</div>
          <div class="row"><button class="btn small accent" data-fl="pick" data-id="${p.id}">${on ? "続きをたどる" : "この予定をたどる"}</button><button class="mini-btn" data-fl="edit" data-id="${p.id}">つくるで直す</button><button class="mini-btn danger" data-fl="del" data-id="${p.id}">消す</button></div>
        </div>`;
      }).join("");
      return;
    }
    const pl = state.plan, cur = pl.stops[pl.cur], curSpot = spotById[cur.spot];
    const next = pl.stops.slice(pl.cur + 1).find((s) => s.status !== "dropped");
    const items = pl.stops.map((s, i) => {
      const sp = spotById[s.spot];
      const st = i < pl.cur ? "done" : i === pl.cur ? "now" : "";
      const ch = s.status === "replaced" ? '<span class="change replaced">組み直し</span>' : s.status === "shifted" ? '<span class="change shifted">時間がずれた</span>' : s.status === "shortened" ? '<span class="change shortened">短く</span>' : s.status === "dropped" ? '<span class="change dropped">中止</span>' : "";
      const closedNow = state.closed.includes(s.spot) ? '<span class="change replaced">臨時休業</span>' : "";
      const walk = s.walk && s.arrive != null ? `<div class="tl-walk">${s.walkFrom ? esc(s.walkFrom) + "から" : ""}歩いて${s.walk}分</div>` : "";
      const from = s.replacedFrom ? `<div class="small">${esc(spotById[s.replacedFrom].name)}の代わり</div>` : "";
      return `${i > 0 ? `<div class="tl-item"><div></div><div class="tl-line"></div><div>${walk}</div></div>` : ""}
        <div class="tl-item"><div class="tl-time">${s.arrive != null ? R.fmt(s.arrive) : "—"}</div><div class="tl-line"><span class="tl-dot ${st}"></span></div>
        <div class="tl-card ${st} ${s.status === "replaced" ? "replaced" : ""} ${s.status === "dropped" ? "dropped" : ""}">
          <b>${i + 1}　${esc(sp.name)}</b>${ch}${closedNow}
          <div class="small">${sp.indoor ? "屋内" : "屋外"}・${s.stay}分${sp.hours ? `・${sp.hours.open}〜${sp.hours.close}` : ""}</div>${from}
        </div></div>`;
    }).join("");
    const alert = [];
    if (state.closed.includes(cur.spot)) alert.push(`<b>${esc(curSpot.name)}が臨時休業でした</b>同じ系統で、歩いて行ける店を探せます。`);
    if (state.rain && !state.rainHandled) alert.push(`<b>雨が降り出しました</b>屋外の予定を、屋内の場所に替えられます。`);
    if (state.delay) alert.push(`<b>予定より${state.delay}分遅れています</b>閉まる時間に間に合うように並べ直せます。`);
    const left = state.premium ? "無制限" : `今月の残り${V.rebuildsLeft}回`;
    const canRebuild = state.premium || V.rebuildsLeft > 0;
    $("#sheet-head").innerHTML = `<b>${esc(pl.title)}</b><small>たどっています</small>${CREDIT}`;
    $("#sheet-body").innerHTML = `<button class="link-btn back-list" data-fl="list">‹ ほかの予定を選ぶ</button>
      ${alert.map((a) => `<div class="alert">${a}</div>`).join("")}
      <div class="fl-now">いま：<b>${pl.cur + 1}　${esc(curSpot.name)}</b>（${cur.arrive != null ? `${R.fmt(cur.arrive)}〜${R.fmt(cur.depart)}` : "—"}）${next ? `<br>つぎ：${pl.stops.indexOf(next) + 1}　${esc(spotById[next.spot].name)}（${R.fmt(next.arrive)}）` : "<br>この場所で最後です"}</div>
      ${canRebuild ? `<button class="btn accent block" data-act="rebuild">組み直す（${left}）</button>` : `<button class="btn primary block" data-act="premium">有料会員で無制限に（初月無料）</button>`}
      <div class="small" style="text-align:center;margin:6px 0 4px">無料でも条件はすべて使えます。有料会員は回数無制限と通知つき。</div>
      <div class="demo-panel"><div class="small"><b>デモ操作</b>（本番では位置情報と天気で自動）</div>
        <div class="row">
          <button class="toggle" data-act="d-next">次の場所へ進む</button>
          <button class="toggle ${state.closed.includes(cur.spot) ? "on" : ""}" data-act="d-closed">ここが閉まっていた</button>
          <button class="toggle ${state.rain ? "on" : ""}" data-act="d-rain">雨にする</button>
          <button class="toggle ${state.delay ? "on" : ""}" data-act="d-delay">30分遅らせる</button>
          <button class="toggle" data-act="d-reset">最初に戻す</button>
        </div></div>
      <div class="cond"><span>営業中</span><span>天気</span><span>予算</span><span>歩く距離 30分まで</span><span>遅れ</span><span>お気に入りの記録を優先</span></div>
      <div class="timeline">${items}</div>`;
  }

  function setSheet(s, remember = true) {
    const el = $("#sheet"); el.classList.remove("peek", "half", "full"); el.classList.add(s);
    if (remember) state.sheetBy[stage()] = s;
    clearTimeout(setSheet._t); setSheet._t = setTimeout(refreshBubbles, 320);
  }
  function initSheet() {
    const el = $("#sheet"), handle = $("#sheet-handle");
    let y0 = null;
    const order = ["peek", "half", "full"];
    const cur = () => order.find((s) => el.classList.contains(s));
    handle.addEventListener("pointerdown", (e) => { y0 = e.clientY; handle.setPointerCapture(e.pointerId); });
    handle.addEventListener("pointerup", (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0; y0 = null;
      const i = order.indexOf(cur());
      if (Math.abs(dy) < 8) setSheet(order[(i + 1) % 3]);
      else if (dy < 0) setSheet(order[Math.min(2, i + 1)]);
      else setSheet(order[Math.max(0, i - 1)]);
    });
    $("#sheet-head").addEventListener("click", (e) => { if (!e.target.closest("a") && cur() === "peek") setSheet("half"); });
  }

  /* ---------- つくる ---------- */
  function toggleDraftSpot(spotId) {
    const d = state.draft, i = d.stops.findIndex((s) => s.spot === spotId), sp = spotById[spotId];
    if (i >= 0) { d.stops.splice(i, 1); toast(`${sp.name}を予定から外しました`); }
    else { d.stops.push({ spot: spotId, stay: defaultStay(sp) }); toast(`${d.stops.length}　${sp.name}を予定に入れました`); }
    d.dirty = true;
    drawMap(false); renderSheet();
  }
  // 記事から予定をつくる。how = "replace"（書いた人のルートで始める）/ "append"（つくっている予定の後ろに足す）
  function useRecord(recId, how) {
    const r = recById[recId], w = writerById[r.writer];
    const add = r.spots.map((s) => ({ spot: s.spot, stay: s.stay || defaultStay(spotById[s.spot]) }));
    const d = state.draft;
    if (how === "append") {
      const have = new Set(d.stops.map((s) => s.spot));
      const fresh = add.filter((a) => !have.has(a.spot));
      if (!fresh.length) { toast("もう予定に入っています"); return; }
      d.stops.push(...fresh); d.dirty = true;
      toast(`${fresh.length}か所を予定の後ろに足しました`);
    } else {
      if (d.stops.length && d.dirty && !confirm("つくりかけの予定を、この記事のルートで置き換えますか？")) return;
      state.draft = newDraft({ name: r.type === "route" ? r.title : "", start: R.toMin(r.start || "10:00"), stops: add, from: r.id });
      toast(`${w.name}さんの${r.type === "route" ? "ルート" : "場所"}を入れました`);
    }
    state.planMode = "make"; state.fitNext = true;
    switchView("plan");
  }
  function saveDraft() {
    const d = state.draft;
    if (!d.stops.length) { toast("場所を1つ以上入れてください"); return; }
    if (!d.name.trim()) {
      setSheet("full"); toast("予定の名前を入れてください");
      setTimeout(() => { const f = $("#mk-name"); if (f) f.focus(); }, 300);
      return;
    }
    const plan = { id: d.id || "p" + Date.now(), name: d.name.trim(), start: d.start, stops: d.stops.map((s) => ({ ...s })), from: d.from };
    const i = state.plans.findIndex((p) => p.id === plan.id);
    if (i >= 0) state.plans[i] = plan; else state.plans.unshift(plan);
    // たどっている途中の予定を直したときは、たどる側も新しい予定にする
    if (state.plan && state.plan.planId === plan.id) state.plan = null;
    d.id = plan.id; d.dirty = false;
    toast(i >= 0 ? "上書き保存しました" : "保存しました。「たどる」から選べます");
    renderSheet();
  }
  function onMake(t) {
    const d = state.draft, mk = t.dataset.mk, i = Number(t.dataset.i);
    if (mk === "save") return saveDraft();
    if (mk === "expand") return setSheet("full");
    if (mk === "follow") return startFollow(d.id);
    if (mk === "new") {
      if (d.dirty && d.stops.length && !confirm("つくりかけの予定を消して、新しくつくりますか？")) return;
      state.draft = newDraft(); renderSheet(); drawMap(false); return;
    }
    if (mk === "stay") d.stops[i].stay = Math.min(360, Math.max(15, d.stops[i].stay + Number(t.dataset.d)));
    if (mk === "up" && i > 0) [d.stops[i - 1], d.stops[i]] = [d.stops[i], d.stops[i - 1]];
    if (mk === "down" && i < d.stops.length - 1) [d.stops[i + 1], d.stops[i]] = [d.stops[i], d.stops[i + 1]];
    if (mk === "del") { toast(`${spotById[d.stops[i].spot].name}を予定から外しました`); d.stops.splice(i, 1); }
    d.dirty = true;
    renderSheet();
    if (mk !== "stay") drawMap(false);
  }

  /* ---------- たどる ---------- */
  function startFollow(planId, reset) {
    const p = state.plans.find((x) => x.id === planId);
    if (!p) return;
    if (reset || !state.plan || state.plan.planId !== planId) {
      state.plan = { planId, title: p.name, stops: schedule(p.start, p.stops), cur: 0 };
      state.rain = false; state.rainHandled = false; state.delay = 0; state.closed = []; state.pending = null;
    }
    state.planMode = "follow"; state.followList = false; state.fitNext = true; state.sheetBy.follow = "half";
    switchView("plan");
  }
  function editPlan(planId) {
    const p = state.plans.find((x) => x.id === planId);
    if (!p) return;
    const d = state.draft;
    if (d.dirty && d.stops.length && d.id !== planId && !confirm("つくりかけの予定を、この予定で置き換えますか？")) return;
    state.draft = newDraft({ id: p.id, name: p.name, start: p.start, stops: p.stops.map((s) => ({ ...s })), from: p.from });
    state.planMode = "make"; state.fitNext = true;
    switchView("plan");
  }
  function onFollow(t) {
    const fl = t.dataset.fl, id = t.dataset.id;
    if (fl === "pick") startFollow(id);
    if (fl === "edit") editPlan(id);
    if (fl === "make") openPlan("make");
    if (fl === "list") { state.followList = true; renderSheet(); drawMap(true); }
    if (fl === "del") {
      const p = state.plans.find((x) => x.id === id);
      if (!p || !confirm(`「${p.name}」を消しますか？（試作なので、開き直すと元に戻ります）`)) return;
      state.plans.splice(state.plans.indexOf(p), 1);
      if (state.plan && state.plan.planId === id) state.plan = null;
      if (state.draft.id === id) state.draft.id = null;
      renderSheet(); drawMap(false); toast("予定を消しました");
    }
  }
  function onFollowAct(act) {
    const pl = state.plan, cur = pl && pl.stops[pl.cur];
    if (!pl) return;
    if (act === "d-next") {
      if (pl.cur < pl.stops.length - 1) { pl.cur++; while (pl.stops[pl.cur] && pl.stops[pl.cur].status === "dropped" && pl.cur < pl.stops.length - 1) pl.cur++; }
      else toast("最後の場所に着きました");
      renderSheet(); drawMap(false); return;
    }
    if (act === "d-closed") { const i = state.closed.indexOf(cur.spot); if (i >= 0) state.closed.splice(i, 1); else state.closed.push(cur.spot); }
    if (act === "d-rain") { state.rain = !state.rain; state.rainHandled = false; }
    if (act === "d-delay") state.delay = state.delay ? 0 : 30;
    if (act === "d-reset") return startFollow(pl.planId, true);
    if (act === "rebuild") return doRebuild();
    if (act === "premium") { state.premium = true; toast("デモ：有料会員（初月無料）になりました"); }
    renderSheet();
  }

  /* ---------- 重なる画面（記事・書き手・組み直し） ---------- */
  const stack = [];
  let panelMaps = [];
  function showPanel(render) { stack.push(render); paint(); }
  function paint() {
    panelMaps.forEach((m) => m.remove()); panelMaps = [];
    const p = $("#panel");
    if (!stack.length) { p.classList.remove("open"); setTimeout(() => { if (!stack.length) p.innerHTML = ""; }, 260); return; }
    stack[stack.length - 1](p);
    p.classList.add("open"); p.scrollTop = 0;
    $$(".back", p).forEach((b) => b.addEventListener("click", () => { stack.pop(); paint(); if (!stack.length) refreshView(); }));
  }
  // 重なる画面を閉じたとき、下の画面に変更（お気に入り・登録・記録の編集）を映す
  function refreshView() {
    const v = state.view;
    if (v === "read") renderRead();
    if (v === "map" || v === "plan") { renderSheet(); drawMap(false); }
    if (v === "me") renderMe();
  }
  function closePanels() { stack.length = 0; paint(); }
  const bar = (title) => `<div class="bar"><button class="back" aria-label="戻る">${ICON.back}</button><div class="title">${esc(title)}</div></div>`;

  function miniMap(id, spots, numbered, color) {
    if (typeof L === "undefined") return;
    const m = L.map(id, { zoomControl: false, attributionControl: true, dragging: true, scrollWheelZoom: false });
    tileLayer().addTo(m);
    const pts = spots.map((s) => [s.lat, s.lng]);
    if (numbered && pts.length > 1) L.polyline(pts, { color: color || "#E86B45", weight: 4, opacity: 0.85 }).addTo(m);
    spots.forEach((s, i) => L.marker([s.lat, s.lng], { icon: divPin(s.mine ? "mine" : "fav", numbered ? String(i + 1) : "", s.mine ? "" : `background:${color || "#123D2B"}`) }).addTo(m));
    if (pts.length === 1) m.setView(pts[0], 15); else m.fitBounds(L.latLngBounds(pts).pad(0.2));
    panelMaps.push(m);
    setTimeout(() => m.invalidateSize(), 280);
  }

  function openArticle(id) { showPanel((p) => renderArticle(p, id)); }
  function renderArticle(p, id) {
    const r = recById[id], w = writerById[r.writer], fk = favKind(w.id, r);
    const isMember = V.memberships.includes(w.id);
    const favBtn = w.official ? "" : `<button class="btn small ${fk === "fav" ? "lime" : "ghost"}" id="fav-btn">${fk === "fav" ? "お気に入り中" : "お気に入りに入れる"}</button>`;
    const stops = r.spots.map((s, i) => {
      const sp = spotById[s.spot];
      const hours = sp.hours ? `${sp.hours.open}〜${sp.hours.close}（仮）` : "";
      const saved = V.saved.some((x) => x.spot === sp.id);
      return `<div class="stop"><div class="stop-no">${i + 1}</div><div>
        <b>${esc(sp.name)}</b> ${ratingTag(s.rating)}<button class="save-btn ${saved ? "on" : ""}" data-save="${sp.id}">${saved ? "登録済み" : "＋ 登録"}</button>
        <div class="photo" style="${photoStyle(sp)}">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}</div>
        <div>${esc(s.note)}</div>
        <div class="kv"><span>${sp.indoor ? "屋内" : "屋外"}</span>${hours ? `<span>${hours}</span>` : ""}${sp.price ? `<span>目安 ${sp.price.toLocaleString()}円</span>` : ""}${s.stay ? `<span>滞在 ${s.stay}分</span>` : ""}</div>
      </div></div>`;
    }).join("");
    const lock = r.member ? (isMember
      ? `<div class="lock"><b>メンバー限定</b><div>${esc(r.member.body)}</div></div>`
      : `<div class="lock"><b>${ICON.lock} メンバー限定</b><div style="margin:4px 0 10px">${esc(r.member.teaser)}</div>
          <button class="btn primary small" id="join-btn">メンバーになって読む（月${w.membership.price}円）</button></div>`) : "";
    // つくるの途中で開いたときは「足す」、それ以外は書いた人のルートで「つくる」
    const n = r.spots.length;
    const appending = state.view === "plan" && state.planMode === "make" && state.draft.stops.length > 0;
    const fresh = appending ? r.spots.filter((s) => !state.draft.stops.some((x) => x.spot === s.spot)).length : n;
    const ctaLabel = appending ? (!fresh ? "この記事の場所は、もう予定に入っています" : n > 1 ? `このルートを予定の後ろに足す（${fresh}か所）` : "この場所を予定に足す") : (n > 1 ? "このルートで予定をつくる（無料）" : "この場所から予定をつくる");
    const cta = `<div class="sticky-cta"><button class="btn accent block" id="make-btn" ${appending && !fresh ? "disabled" : ""}>${ICON.calplus}${ctaLabel}</button>${appending ? `<div class="small" style="text-align:center;margin-top:6px">つくっている予定（${state.draft.stops.length}か所）の後ろに足します</div>` : ""}</div>`;
    p.innerHTML = bar(w.official ? "公式の特集" : "記事") + `<div class="pad">
      <div class="writer-row"><button data-writer="${w.id}" style="display:flex;align-items:center;gap:10px">${avatar(w)}<span class="name">${esc(w.name)}</span></button>${badges(w, r)}<span style="margin-left:auto">${favBtn}</span></div>
      <div class="h1">${esc(r.title)}</div>
      <div class="meta"><span>${esc(r.date)}</span><span>${r.type === "route" ? `ルート ${r.spots.length}か所` : "1か所の記録"}</span><span>記事を見て「行った」${r.went}人</span></div>
      <div class="kv" style="margin-top:6px">${r.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}${r.stamp ? "<span>スタンプラリー（架空の企画）</span>" : ""}</div>
      <div class="minimap" id="mm-art"></div>
      ${stops}${lock}
    </div>${cta}`;
    miniMap("mm-art", r.spots.map((s) => spotById[s.spot]), r.type === "route", r.official ? "#E86B45" : w.color);
    $("[data-writer]", p).addEventListener("click", () => openWriter(w.id));
    const fb = $("#fav-btn", p);
    if (fb) fb.addEventListener("click", () => { toggleFav(w.id); paint(); });
    const jb = $("#join-btn", p);
    if (jb) jb.addEventListener("click", () => { V.memberships.push(w.id); toast("デモ：メンバーになりました"); paint(); });
    $("#make-btn", p).addEventListener("click", () => useRecord(r.id, appending ? "append" : "replace"));
    // 場所の登録（自分のマップに出る）。画面を描き直さず、ボタンだけ変える
    $$("[data-save]", p).forEach((b) => b.addEventListener("click", () => {
      const on = toggleSaved(b.dataset.save);
      b.classList.toggle("on", on); b.textContent = on ? "登録済み" : "＋ 登録";
    }));
  }

  function toggleSaved(spotId) {
    const i = V.saved.findIndex((x) => x.spot === spotId);
    if (i >= 0) { V.saved.splice(i, 1); toast("登録を外しました"); return false; }
    V.saved.unshift({ spot: spotId, memo: "" }); toast("自分のマップに登録しました"); return true;
  }

  function toggleFav(wid) {
    const i = V.favorites.indexOf(wid);
    if (i >= 0) { V.favorites.splice(i, 1); toast("お気に入りから外しました"); }
    else { V.favorites.push(wid); toast("お気に入りに入れました"); }
    if (map) { renderSheet(); drawMap(false); }
  }

  function openWriter(id) { showPanel((p) => renderWriter(p, id)); }
  function renderWriter(p, id) {
    const w = writerById[id], fk = favKind(id);
    const recs = D.records.filter((r) => r.writer === id);
    const spots = []; const seen = new Set();
    recs.forEach((r) => r.spots.forEach((s) => { if (!seen.has(s.spot)) { seen.add(s.spot); spots.push(spotById[s.spot]); } }));
    const tagCounts = Object.entries(w.stats.records).map(([t, n]) => `<span>${esc(t)}の記録 ${n}件</span>`).join("");
    p.innerHTML = bar(w.name) + `<div class="pad">
      <div class="writer-row">${avatar(w, "lg")}<div><div class="h1" style="margin:0">${esc(w.name)}</div>${badges(w)}</div></div>
      <p>${esc(w.bio)}</p>
      ${w.official ? "" : `<button class="btn ${fk === "fav" ? "lime" : "primary"} small" id="wfav">${fk === "fav" ? "お気に入り中" : "お気に入りに入れる"}</button>`}
      <div class="stats">
        <div class="stat"><b>${w.stats.favorites.toLocaleString()}</b><span>お気に入り</span></div>
        <div class="stat"><b>${w.stats.retention}%</b><span>継続率</span></div>
        <div class="stat"><b>${w.stats.wentFromArticles}</b><span>記事で行った人</span></div>
      </div>
      <div class="kv">${tagCounts}</div>
      ${w.membership ? `<div class="lock"><b>${ICON.lock} メンバーシップ「${esc(w.membership.name)}」</b><div class="small">月${w.membership.price}円。限定の記事と、撮影の場所や空いている時間のメモが読めます。</div></div>` : ""}
      <div class="section-label">${esc(w.name)}さんの地図</div>
      <div class="minimap" id="mm-writer"></div>
      <div class="section-label">記録</div>
      ${recs.map(recordCard).join("")}
    </div>`;
    miniMap("mm-writer", spots, false, w.color);
    const b = $("#wfav", p);
    if (b) b.addEventListener("click", () => { toggleFav(id); paint(); });
    $$("[data-rec]", p).forEach((c) => c.addEventListener("click", () => openArticle(c.dataset.rec)));
  }

  /* ---------- 組み直し ---------- */
  function doRebuild() {
    const pl = state.plan, cur = pl.stops[pl.cur];
    const atClosed = state.closed.includes(cur.spot);
    const fromIndex = atClosed ? pl.cur : pl.cur + 1;
    if (fromIndex >= pl.stops.length) { toast("組み直す予定が残っていません"); return; }
    const nowMin = atClosed ? cur.arrive : cur.depart;
    const opts = { fromIndex, nowMin, position: cur.spot, closedIds: state.closed, rain: state.rain, delayMin: state.delay, maxWalk: 30, prefer: {} };
    const result = R.rebuild(D, pl.stops, opts);
    state.pending = { result, fromIndex, atClosed, opts, closedName: atClosed ? spotById[cur.spot].name : null };
    showPanel(renderRebuild);
  }

  function chooseAlt(fromSpot, altId) {
    const pd = state.pending;
    pd.opts.prefer[fromSpot] = altId;
    pd.result = R.rebuild(D, state.plan.stops, pd.opts);
    paint();
    toast("候補を入れ替えました");
  }

  function renderRebuild(p) {
    const { result, fromIndex } = state.pending;
    const changed = result.slice(fromIndex);
    const blocks = changed.map((s) => {
      const sp = spotById[s.spot];
      if (s.status === "dropped") return `<div class="alt"><b>${esc(sp.name)}</b><span class="change dropped">中止</span><div class="why">${esc(s.reason)}</div></div>`;
      let html = `<div class="alt ${s.status === "replaced" ? "chosen" : ""}"><b>${R.fmt(s.arrive)}　${esc(sp.name)}</b>${s.status === "replaced" ? '<span class="change replaced">組み直し</span>' : s.status === "shifted" ? `<span class="change shifted">${R.fmt(s.before.arrive)}から変更</span>` : s.status === "shortened" ? '<span class="change shortened">短く</span>' : ""}`;
      const mine = s.status === "replaced" ? (s.alternatives.find((a) => a.id === s.spot) || s.alternatives[0]) : null;
      if (mine) {
        html += `<div class="why">${esc(spotById[s.replacedFrom].name)}：${esc(s.reason)}</div>`;
        html += `<div class="why" style="margin-top:4px">選んだ理由：${esc(mine.why.join("、"))}</div>`;
      }
      html += "</div>";
      const others = mine ? s.alternatives.filter((a) => a.id !== s.spot) : [];
      if (others.length) {
        html += `<div class="section-label">ほかの候補（タップで入れ替え）</div>` + others.map((a) => `<button class="alt" style="display:block;width:100%;text-align:left" data-alt="${a.id}" data-from="${s.replacedFrom}"><b>${esc(spotById[a.id].name)}</b><div class="why">${esc(a.why.join("、"))}</div></button>`).join("");
      }
      return html;
    }).join("");
    const left = state.premium ? "有料会員：組み直しは無制限" : `この予定にすると、今月の残りは${V.rebuildsLeft - 1}回（無料は月5回）`;
    p.innerHTML = bar("組み直しました") + `<div class="pad">
      <div class="small">条件：${state.closed.length ? "臨時休業・" : ""}${state.rain ? "雨・" : ""}${state.delay ? state.delay + "分の遅れ・" : ""}営業時間・歩く距離</div>
      <div class="h1">趣味の合う人の記録から、午後の予定を並べ直しました</div>
      ${blocks}
      <div class="small" style="margin:8px 0 16px">${left}</div>
      <button class="btn accent block" id="apply-btn">この予定にする</button>
      <button class="btn ghost block back" style="margin-top:8px">やめる</button>
    </div>`;
    $$("[data-alt]", p).forEach((b) => b.addEventListener("click", () => chooseAlt(b.dataset.from, b.dataset.alt)));
    $("#apply-btn", p).addEventListener("click", () => {
      const pl = state.plan, pd = state.pending;
      pl.stops = pd.result.map((s, i) => {
        if (i < pd.fromIndex) return { ...pl.stops[i] };
        const ns = { ...s, walkFrom: null };
        if (i === pd.fromIndex && pd.closedName) ns.walkFrom = pd.closedName;
        return ns;
      });
      if (!state.premium) V.rebuildsLeft = Math.max(0, V.rebuildsLeft - 1);
      if (state.rain) state.rainHandled = true;
      state.delay = 0; state.pending = null;
      closePanels(); renderSheet(); drawMap(false);
      toast("新しい予定にしました");
    });
  }

  /* ---------- 記録（いまはタブから外している） ---------- */
  const draft = { items: {}, title: "", vis: {} };
  function recordCandidates() {
    if (!state.plan) return ["omiya-lib", "r-nagi", "c-hidamari"].map((id) => ({ spot: id }));
    return state.plan.stops.filter((s) => s.status !== "dropped");
  }
  function renderRecord() {
    const el = $("#view-record");
    const cands = recordCandidates();
    if (!draft.title) draft.title = state.plan ? state.plan.title + "（記録）" : "大宮で寄った場所";
    const items = cands.map((s) => {
      const sp = spotById[s.spot], d = draft.items[sp.id] || (draft.items[sp.id] = { on: true, rating: 3, note: "", vis: "public", photo: null });
      return `<div class="rec-item" data-spot="${sp.id}">
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="r-on" ${d.on ? "checked" : ""}><b>${esc(sp.name)}</b></label>
        <div class="rate-btns">${[3, 2, 1].map((n) => `<button class="r${n} ${d.rating === n ? "on" : ""}" data-rate="${n}">${RATING[n]}</button>`).join("")}</div>
        <input class="field r-note" placeholder="ひとこと（1〜2文）" value="${esc(d.note)}">
        <div style="display:flex;align-items:center;margin-top:8px">${d.photo ? `<img class="thumb" src="${d.photo}" alt="">` : ""}<label class="file-btn">写真を選ぶ<input type="file" accept="image/*" class="r-photo" hidden></label></div>
        <div class="vis">${VIS.map(([k, l]) => `<button data-vis="${k}" class="${d.vis === k ? "on" : ""}">${l}</button>`).join("")}</div>
      </div>`;
    }).join("");
    el.innerHTML = `<div class="plan-head"><div class="small">今日の記録</div><div class="h1" style="margin-top:0">行った場所を記録する</div></div>
      <div class="pad" style="padding-top:4px">
        <input class="field" id="r-title" value="${esc(draft.title)}" style="margin-bottom:10px">
        ${items}
        <button class="btn primary block" id="publish-btn">記録を公開する</button>
        <div class="small" style="margin-top:8px;text-align:center">公開範囲は場所ごとに選べます。自宅の近くなどは非公開に。</div>
      </div>`;
    $("#r-title").addEventListener("input", (e) => { draft.title = e.target.value; });
    $$(".rec-item", el).forEach((box) => {
      const d = draft.items[box.dataset.spot];
      $(".r-on", box).addEventListener("change", (e) => { d.on = e.target.checked; });
      $$("[data-rate]", box).forEach((b) => b.addEventListener("click", () => { d.rating = Number(b.dataset.rate); renderRecord(); }));
      $(".r-note", box).addEventListener("input", (e) => { d.note = e.target.value; });
      $$("[data-vis]", box).forEach((b) => b.addEventListener("click", () => { d.vis = b.dataset.vis; renderRecord(); }));
      $(".r-photo", box).addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const rd = new FileReader(); rd.onload = () => { d.photo = rd.result; renderRecord(); }; rd.readAsDataURL(f);
      });
    });
    $("#publish-btn").addEventListener("click", () => {
      const spots = cands.map((s) => s.spot).filter((id) => draft.items[id] && draft.items[id].on).map((id) => {
        const sp = spotById[id], d = draft.items[id];
        return { name: sp.name, lat: sp.lat, lng: sp.lng, rating: d.rating, note: d.note || "（ひとことなし）", vis: d.vis, photo: d.photo };
      });
      if (!spots.length) { toast("場所を1つ以上選んでください"); return; }
      state.myRecords.unshift({ id: "my" + Date.now(), title: draft.title, date: "今日", spots });
      draft.items = {}; draft.title = "";
      toast("公開しました。自分の地図にたまりました");
      switchView("me");
    });
  }

  /* ---------- 読む ---------- */
  const TAG_COLOR = {
    "図書館建築": "#2F6E7E", "旅行": "#4E8A46", "ラーメン": "#C4502F", "カフェ": "#8A6A4F",
    "古着": "#6D4C8A", "聖地巡礼": "#B23A5A", "自然": "#3E7C4A", "美術館": "#2E3A8C",
  };
  const tagColor = (t) => TAG_COLOR[t] || "#626E66";

  // おすすめの順番：お気に入りの書き手 → タグだけお気に入り → 公式 → ほか。同じならルートを先に、「行った」人が多い順
  function readFeed() {
    const score = (r) => { if (r.official) return 1; const k = favKind(r.writer, r); return k === "fav" ? 3 : k ? 2 : 0; };
    return D.records
      .filter((r) => !state.readTag || r.tags.includes(state.readTag))
      .sort((a, b) => score(b) - score(a) || (b.type === "route") - (a.type === "route") || b.went - a.went);
  }
  function routeSummary(r) {
    const n = r.spots.length;
    if (r.type !== "route") return `${n}スポット`;
    const s = R.buildSchedule(D, r);
    const min = s[s.length - 1].depart - s[0].arrive;
    return `${n}スポット・約${min >= 60 ? Math.round(min / 60) + "時間" : min + "分"}`;
  }
  // カードの右上に出す小さなルートの図（地図は読み込まず、場所の位置関係だけを描く）
  function routeThumb(r) {
    const W = 120, H = 78, P = 15;
    const pts = r.spots.map((s) => spotById[s.spot]);
    const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p.lng * k), ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const dx = Math.max(...xs) - minX, dy = Math.max(...ys) - minY;
    const sc = Math.min((W - 2 * P) / (dx || 1e-9), (H - 2 * P) / (dy || 1e-9));
    const ox = (W - dx * sc) / 2, oy = (H - dy * sc) / 2;
    const xy = pts.map((p, i) => [ox + (xs[i] - minX) * sc, oy + (ys[i] - minY) * sc].map((v) => v.toFixed(1)));
    const line = xy.length > 1 ? `<polyline points="${xy.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#E86B45" stroke-width="2.4" stroke-dasharray="4 3" stroke-linecap="round"/>` : `<circle cx="${xy[0][0]}" cy="${xy[0][1]}" r="11" fill="rgba(60,141,63,.18)"/>`;
    const dots = xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#5FA94A" stroke="#123D2B" stroke-width="1.6"/>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="${W}" height="${H}" fill="#EEF1E8"/>
      <rect x="64" y="6" width="26" height="16" rx="4" fill="#DCE8C9"/><rect x="8" y="50" width="22" height="20" rx="4" fill="#DCE8C9"/>
      <path d="M0 24L120 32M0 60L120 50M40 0L32 78M88 0L94 78" stroke="#fff" stroke-width="4" fill="none"/>
      ${line}${dots}</svg>`;
  }
  // 写真がないので、場所の種類の色で表紙を作る
  function coverStyle(r) {
    const sp = spotById[r.spots[0].spot];
    if (sp.photo) return `background-image:url('${sp.photo}')`;
    const [a] = KIND_BG[sp.kind] || ["#7F8C84"];
    // 同じ種類の場所が並んでも見分けられるように、下地の色と光の位置を記事ごとに変える（場所の種類の色は光に使う）
    const BASE = [["#3F7F8C", "#123D2B"], ["#6C7FB0", "#21295C"], ["#8A9A5B", "#2C3E1F"], ["#B07C7E", "#4A2A3A"], ["#C09A72", "#3E2C1C"], ["#5E9C56", "#163A20"]];
    const h = [...r.id].reduce((n, c) => n + c.charCodeAt(0), 0);
    const [b1, b2] = BASE[h % BASE.length];
    const [x, y] = [[85, 0], [10, 8], [75, 35], [25, 0], [95, 45]][h % 5];
    return `background:radial-gradient(110% 75% at ${x}% ${y}%, ${a}, transparent 66%), linear-gradient(${130 + (h % 5) * 14}deg, ${b1}, ${b2})`;
  }
  function feedCard(r, big) {
    const w = writerById[r.writer], fk = favKind(r.writer, r);
    const tag = state.readTag || r.tags[0];
    const head = `<span class="cover-word">${esc(spotById[r.spots[0].spot].kind)}</span>
      <span class="tag-label" style="background:${tagColor(tag)}">#${esc(tag)}</span>
      <span class="thumb-map">${routeThumb(r)}</span>`;
    // 記事ごとの「つくる」：書いた人のルートを先に入れて、つくるを開く
    const make = `<button class="make-btn" data-make="${r.id}" aria-label="この記事から予定をつくる">${ICON.calplus}つくる</button>`;
    if (!big) {
      return `<div class="tile cover" role="button" tabindex="0" data-rec="${r.id}" style="${coverStyle(r)}">${head}
        <span class="cover-body"><span class="cover-title">${esc(r.title)}</span>
        <span class="cover-who">${avatar(w, "sm")}<b>${esc(w.name)}</b>${make}</span></span></div>`;
    }
    const lock = r.member ? `<span>${ICON.lock.replace('width="16" height="16"', 'width="13" height="13"')} メンバー限定あり</span>` : "";
    const mark = w.official ? '<span class="badge official">公式</span>' : fk === "fav" ? '<span class="badge fav">お気に入り</span>' : "";
    return `<div class="hero cover" role="button" tabindex="0" data-rec="${r.id}" style="${coverStyle(r)}">${head}
      <span class="cover-body">
        <span class="cover-title">${esc(r.title)}</span>
        <span class="cover-note">${esc(r.spots[0].note)}</span>
        <span class="cover-who">${avatar(w, "sm")}<b>${esc(w.name)}</b>${mark}<small>${routeSummary(r)}</small></span>
        <span class="cover-stats"><span>${ICON.walk} 行った ${r.went.toLocaleString()}</span>${lock}${make}</span>
      </span></div>`;
  }
  function renderRead() {
    const el = $("#view-read");
    const chipsEl = $(".read-chips", el), keepX = chipsEl ? chipsEl.scrollLeft : 0;
    const [hero, ...rest] = readFeed();
    const chips = [[null, "おすすめ"], ...D.TAGS.map((t) => [t, "#" + t])];
    el.innerHTML = `<header class="read-head">
        <div class="logo">${ICON.pin}Take A Map</div>
        <span class="demo-badge">試作・データは仮</span>
        <button class="icon-btn" id="bell" aria-label="お知らせ">${ICON.bell}</button>
      </header>
      <button class="search read-search" id="read-search">${ICON.search}<span>街・作品名・書き手でさがす</span></button>
      <div class="read-chips ${state.readTag ? "has-on" : ""}">${chips.map(([t, l]) => `<button class="tchip ${t ? "" : "rec"} ${state.readTag === t ? "on" : ""}" data-rtag="${t || ""}" ${t ? `style="background:${tagColor(t)}"` : ""}>${esc(l)}</button>`).join("")}</div>
      <button class="today" id="today-btn"><span class="orb">${ICON.spark}</span><span class="today-text"><b>今日どうする？</b><small>お気に入りのマップから、今から行ける所で予定を作る</small></span><span class="chev">${ICON.chev}</span></button>
      <div class="feed">
        ${hero ? feedCard(hero, true) : '<div class="empty">このタグの記事はまだありません。</div>'}
        ${rest.length ? `<div class="grid">${rest.map((r) => feedCard(r, false)).join("")}</div>` : ""}
      </div>`;
    $(".read-chips", el).scrollLeft = keepX;
  }

  /* ---------- マイページ ---------- */
  // 自分のマップに出す点：自分の記録（黄緑）と、登録した場所（白）
  function myPins(lyr, filter, onPick) {
    const pts = [];
    if (filter !== "saved") state.myRecords.forEach((r) => r.spots.forEach((s, i) => {
      pts.push([s.lat, s.lng]);
      L.marker([s.lat, s.lng], { icon: divPin("mine", "") }).addTo(lyr).bindTooltip(esc(s.name)).on("click", () => onPick && onPick(`ms-${r.id}-${i}`));
    }));
    if (filter !== "rec") V.saved.forEach((x) => {
      const sp = spotById[x.spot];
      pts.push([sp.lat, sp.lng]);
      L.marker([sp.lat, sp.lng], { icon: divPin("saved", "") }).addTo(lyr).bindTooltip(esc(sp.name)).on("click", () => onPick && onPick(`sv-${x.spot}`));
    });
    return pts;
  }
  const legend = `<div class="legend"><span><i class="lgd mine"></i>自分の記録</span><span><i class="lgd saved"></i>登録した場所</span></div>`;

  let meMap = null;
  function renderMe() {
    const el = $("#view-me");
    if (meMap) { meMap.remove(); meMap = null; }
    const allSpots = state.myRecords.flatMap((r) => r.spots);
    const favs = V.favorites.map((id) => writerById[id]);
    const tagFavs = Object.entries(V.tagFavorites).filter(([, t]) => t.length).map(([id, t]) => ({ w: writerById[id], t }));
    el.innerHTML = `<div class="plan-head"><div class="small">マイページ</div><div class="writer-row" style="margin-top:4px"><span class="avatar lg" style="background:#56859C">A</span><div><div class="h1" style="margin:0">${esc(V.name)}</div><div class="small">建築とラーメンが好きな大学生</div></div></div></div>
      <div class="pad" style="padding-top:6px">
        <div class="stats">
          <div class="stat"><b>${state.myRecords.length}</b><span>記録</span></div>
          <div class="stat"><b>${allSpots.length}</b><span>行った場所</span></div>
          <div class="stat"><b>${V.saved.length}</b><span>登録した場所</span></div>
        </div>
        <div class="small">組み直し：${state.premium ? "有料会員（無制限）" : `今月の残り${V.rebuildsLeft}回（無料は月5回）`}・保存した予定 ${state.plans.length}件</div>
        <div class="section-label">自分の地図</div>
        <div class="mymap-preview">
          <div class="minimap" id="mm-me"></div>
          <button class="map-open" id="open-mymap" aria-label="自分のマップを開く"><span>自分のマップを開く（見る・直す）${ICON.chev}</span></button>
        </div>
        ${legend}
        <div class="section-label">記録</div>
        ${state.myRecords.length ? "" : '<div class="small">まだ記録がありません。</div>'}
        ${state.myRecords.map((r) => `<div class="card"><h3 style="margin-top:0">${esc(r.title)}</h3><div class="meta"><span>${esc(r.date)}</span><span>${r.spots.length}か所</span></div>
          ${r.spots.map((s) => `<div style="margin-top:6px">${s.photo ? `<img class="thumb" src="${s.photo}" alt="" style="width:100%;height:120px">` : ""}<b>${esc(s.name)}</b> ${ratingTag(s.rating)} <span class="small">${visLabel(s.vis)}</span><div class="small">${esc(s.note)}</div></div>`).join("")}</div>`).join("")}
        <div class="section-label">お気に入りの書き手</div>
        ${favs.map((w) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge fav">お気に入り</span></div><div class="small" style="margin-top:4px">${esc(w.bio)}</div></button>`).join("")}
        ${tagFavs.map(({ w, t }) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge tagfav">${esc(t.join("・"))}だけお気に入り</span></div></button>`).join("")}
      </div>`;
    if (typeof L !== "undefined") {
      // 見るだけの小さな地図。押すと自分のマップが開く
      const m = L.map("mm-me", { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false });
      tileLayer().addTo(m);
      const pts = myPins(L.layerGroup().addTo(m), "all");
      if (pts.length) m.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 14 }); else m.setView(OMIYA, 12);
      meMap = m; setTimeout(() => m.invalidateSize(), 50);
    }
    $("#open-mymap").addEventListener("click", openMyMap);
    $$("[data-writer]", el).forEach((b) => b.addEventListener("click", () => openWriter(b.dataset.writer)));
  }

  /* ---------- 自分のマップ（登録した場所と自分の記録を見る・直す） ---------- */
  function openMyMap() { showPanel(renderMyMap); }
  function renderMyMap(p) {
    p.innerHTML = bar("自分のマップ") + `<div class="mymap-wrap"><div class="mymap" id="mm-mine"></div></div>
      <div class="seg" id="mm-seg"></div>
      <div class="pad" id="mm-list" style="padding-top:6px"></div>`;
    let m = null, lyr = null;
    if (typeof L !== "undefined") {
      m = L.map("mm-mine", { zoomControl: false });
      tileLayer().addTo(m);
      lyr = L.layerGroup().addTo(m);
      panelMaps.push(m);
    }
    const list = $("#mm-list", p), seg = $("#mm-seg", p);

    function pick(key) {
      const box = document.getElementById(key);
      if (!box) return;
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash");
    }
    function draw(fit) {
      const f = state.myMapFilter;
      seg.innerHTML = [["all", "すべて"], ["rec", `自分の記録 ${state.myRecords.length}`], ["saved", `登録した場所 ${V.saved.length}`]].map(([k, l]) => `<button data-f="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("");
      if (m) {
        lyr.clearLayers();
        const pts = myPins(lyr, f, pick);
        if (fit) { if (pts.length) m.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15 }); else m.setView(OMIYA, 12); }
      }
      let html = legend;
      if (f !== "saved") {
        html += `<div class="section-label">自分の記録</div>`;
        html += state.myRecords.length ? state.myRecords.map((r) => `<div class="card my-rec">
            <div class="row-between"><input class="field title-in" data-title="${r.id}" value="${esc(r.title)}" aria-label="記録のタイトル"><button class="mini-btn danger" data-del-rec="${r.id}">記録を消す</button></div>
            <div class="meta" style="margin-top:6px"><span>${esc(r.date)}</span><span>${r.spots.length}か所</span></div>
            ${r.spots.map((s, i) => `<div class="my-spot" id="ms-${r.id}-${i}">
              <div class="row-between"><b>${esc(s.name)}</b><button class="mini-btn" data-del-spot="${r.id}:${i}">この場所を外す</button></div>
              ${s.photo ? `<img class="thumb" src="${s.photo}" alt="" style="width:100%;height:120px;margin-top:6px">` : ""}
              <div class="rate-btns">${[3, 2, 1].map((n) => `<button class="r${n} ${s.rating === n ? "on" : ""}" data-rate="${r.id}:${i}:${n}">${RATING[n]}</button>`).join("")}</div>
              <input class="field" data-note="${r.id}:${i}" value="${esc(s.note)}" placeholder="ひとこと（1〜2文）" aria-label="ひとこと">
              <div class="vis">${VIS.map(([k, l]) => `<button data-vis="${r.id}:${i}:${k}" class="${s.vis === k ? "on" : ""}">${l}</button>`).join("")}</div>
            </div>`).join("")}
          </div>`).join("") : '<div class="small">まだ記録がありません。</div>';
      }
      if (f !== "rec") {
        html += `<div class="section-label">登録した場所</div>`;
        html += V.saved.length ? V.saved.map((x) => {
          const sp = spotById[x.spot];
          const arts = D.records.filter((r) => r.spots.some((s) => s.spot === x.spot));
          return `<div class="card saved-item" id="sv-${x.spot}">
            <div class="row-between"><div><b>${esc(sp.name)}</b><div class="small">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}</div></div><button class="mini-btn" data-unsave="${x.spot}">登録を外す</button></div>
            <input class="field" style="margin-top:8px" data-memo="${x.spot}" value="${esc(x.memo)}" placeholder="メモ（いつ行きたいか など）" aria-label="メモ">
            ${arts.length ? `<button class="link-btn" data-open-rec="${arts[0].id}">この場所の記事を読む（${arts.length}件）${ICON.chev}</button>` : ""}
          </div>`;
        }).join("") : '<div class="small">記事の場所の「＋ 登録」を押すと、ここにたまります。</div>';
      }
      list.innerHTML = html;
    }

    seg.addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { state.myMapFilter = b.dataset.f; draw(true); } });
    // 文字の入力は、入れるたびに描き直すと打ちにくいので、値だけ直す
    list.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.title) { const r = state.myRecords.find((x) => x.id === t.dataset.title); if (r) r.title = t.value; }
      if (t.dataset.note) { const [rid, i] = t.dataset.note.split(":"); const r = state.myRecords.find((x) => x.id === rid); if (r) r.spots[i].note = t.value; }
      if (t.dataset.memo) { const x = V.saved.find((s) => s.spot === t.dataset.memo); if (x) x.memo = t.value; }
    });
    list.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.rate) { const [rid, i, n] = d.rate.split(":"); state.myRecords.find((x) => x.id === rid).spots[i].rating = Number(n); draw(false); }
      else if (d.vis) { const [rid, i, k] = d.vis.split(":"); state.myRecords.find((x) => x.id === rid).spots[i].vis = k; draw(false); toast(`公開範囲を「${visLabel(k)}」にしました`); }
      else if (d.delSpot) {
        const [rid, i] = d.delSpot.split(":"); const r = state.myRecords.find((x) => x.id === rid);
        r.spots.splice(Number(i), 1);
        if (!r.spots.length) state.myRecords.splice(state.myRecords.indexOf(r), 1);
        draw(false); toast("記録から外しました");
      }
      else if (d.delRec) {
        const r = state.myRecords.find((x) => x.id === d.delRec);
        if (r && confirm(`「${r.title}」を消しますか？（試作なので、開き直すと元に戻ります）`)) { state.myRecords.splice(state.myRecords.indexOf(r), 1); draw(false); toast("記録を消しました"); }
      }
      else if (d.unsave) { toggleSaved(d.unsave); draw(false); }
      else if (d.openRec) openArticle(d.openRec);
    });
    draw(true);
    if (m) setTimeout(() => m.invalidateSize(), 280);
  }

  /* ---------- 画面の切り替え ---------- */
  const planTab = () => $("#tab-plan");
  function closePlanMenu() { planTab().classList.remove("open"); }
  function switchView(v) {
    state.view = v; closePanels(); closePlanMenu();
    const sec = v === "plan" ? "map" : v; // 予定（つくる／たどる）は探すと同じ地図の画面を使う
    $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + sec));
    $$("#tabbar [data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    if (v === "read") renderRead();
    if (v === "map" || v === "plan") enterStage();
    if (v === "record") renderRecord();
    if (v === "me") renderMe();
  }
  // 探す／つくる／たどる に入る。地図はそのままにして、上と下の中身を入れ替える
  function enterStage() {
    // 地図は最初に開いたときに作る（隠れたまま作ると大きさがずれるため）
    if (!map) initMap();
    renderTop();
    setSheet(state.sheetBy[stage()], false);
    renderSheet();
    const fit = state.fitNext; state.fitNext = false;
    setTimeout(() => {
      if (!map) return;
      map.invalidateSize();
      drawMap(fit);
      if (stage() === "explore") updateArea();
    }, 30);
  }
  function openPlan(mode) {
    state.planMode = mode;
    if (mode === "follow") state.followList = true; // たどるを押したら、まず保存した予定を選ぶ
    // マウスで選んだあとも、ポインタが離れるまでメニューが出たままにならないようにする
    // （指で操作するときは mouseleave が来ないので付けない）
    const t = planTab();
    if (matchMedia("(hover: hover)").matches && t.matches(":hover")) {
      t.classList.add("picked");
      t.addEventListener("mouseleave", () => t.classList.remove("picked"), { once: true });
    }
    switchView("plan");
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderRead(); renderChips(); renderSheet(); initSheet();
    const refilter = () => { renderChips(); drawMap(stage() === "explore"); if (stage() === "explore") scheduleArea(); else renderSheet(); };
    $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-tag]"); if (!b) return; state.tag = b.dataset.tag || null; refilter(); });
    $("#modes").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; state.mode = b.dataset.mode; refilter(); });
    $("#stage-bar").addEventListener("click", (e) => { const b = e.target.closest("[data-stage]"); if (b) openPlan(b.dataset.stage); });

    // 下のシート（探す・つくる・たどる）
    const sb = $("#sheet-body");
    sb.addEventListener("click", (e) => {
      const t = e.target.closest("[data-mk],[data-fl],[data-act],[data-rec]");
      if (!t) return;
      if (t.dataset.mk) onMake(t);
      else if (t.dataset.fl) onFollow(t);
      else if (t.dataset.act === "fit-all") drawMap(true);
      else if (t.dataset.act) onFollowAct(t.dataset.act);
      else if (t.dataset.rec) openArticle(t.dataset.rec);
    });
    sb.addEventListener("input", (e) => { if (e.target.id === "mk-name") { state.draft.name = e.target.value; state.draft.dirty = true; } });
    sb.addEventListener("change", (e) => {
      if (e.target.id === "mk-start" && e.target.value) { state.draft.start = R.toMin(e.target.value); state.draft.dirty = true; renderSheet(); }
    });

    // 読む
    const rv = $("#view-read");
    rv.addEventListener("click", (e) => {
      const mk = e.target.closest("[data-make]");
      if (mk) { useRecord(mk.dataset.make, "replace"); return; }
      const card = e.target.closest("[data-rec]");
      if (card) { openArticle(card.dataset.rec); return; }
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.rtag !== undefined) { state.readTag = t.dataset.rtag || null; renderRead(); }
      else if (t.id === "today-btn") openPlan("make");
      else if (t.id === "read-search") switchView("map");
      else if (t.id === "bell") toast("お知らせはまだありません（試作）");
    });
    rv.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-rec]")) { e.preventDefault(); openArticle(e.target.dataset.rec); }
    });

    // 下のタブ
    $("#tabbar").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "write-btn") { toast("記事を書く画面はこれから作ります（試作）"); return; }
      if (b.dataset.plan) { openPlan(b.dataset.plan); return; }
      if (b.id === "plan-tab") {
        // マウスならホバーでメニューが出ているので、そのまま前回の予定へ。指ならメニューを開け閉めする
        if (matchMedia("(hover: hover)").matches) switchView("plan");
        else planTab().classList.toggle("open");
        return;
      }
      if (b.dataset.view) switchView(b.dataset.view);
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#tab-plan")) closePlanMenu(); });
    // 右に隠れている重なる画面のせいで、画面全体が横にずれないようにする
    $("#app").addEventListener("scroll", (e) => { e.target.scrollLeft = 0; e.target.scrollTop = 0; });
  });
})();
