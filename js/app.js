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
  const OMIYA = [35.9115, 139.6265];
  const KIND_BG = {
    "建築": ["#56859C", "#123D2B"], "ラーメン": ["#E86B45", "#8E3A1E"], "カフェ": ["#B08968", "#6F4E37"], "名所": ["#7F8C84", "#123D2B"],
    "公園": ["#97BC62", "#2C5F2D"], "博物館": ["#56859C", "#21295C"], "美術館": ["#A26769", "#6D2E46"], "店": ["#A7BEAE", "#626E66"], "山": ["#97BC62", "#2C5F2D"],
  };
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  };

  const state = {
    tag: null, mode: "fav", view: "map",
    plan: null,              // { recordId, title, stops, cur }
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
  const PIN_SIZE = { fav: 26, official: 26, mine: 22, other: 16 };
  function divPin(cls, inner, extra = "") {
    const n = PIN_SIZE[cls] || 22;
    return L.divIcon({ className: "", html: `<div class="pin ${cls}" style="${extra}">${inner || ""}</div>`, iconSize: [n, n], iconAnchor: [n / 2, n / 2], tooltipAnchor: [0, -n / 2] });
  }

  /* ---------- 地図（ホーム） ---------- */
  let map, layer;
  function initMap() {
    if (typeof L === "undefined") { $("#map").innerHTML = '<div class="empty">地図を読み込めませんでした。インターネットにつながっているか確認してください。</div>'; return; }
    // 出典は下のシートに表示する（シートで隠れないように）
    map = L.map("map", { zoomControl: false, attributionControl: false }).setView(OMIYA, 14);
    tileLayer().addTo(map);
    layer = L.layerGroup().addTo(map);
  }

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

  function drawMap(fit) {
    if (!map) return;
    layer.clearLayers();
    const recs = visibleRecords();
    const seen = {}, pts = [];
    recs.forEach((r) => {
      const w = writerById[r.writer], fk = favKind(r.writer, r);
      const color = r.official ? "#E86B45" : fk ? w.color : "#A9B2AC";
      if (r.type === "route") {
        L.polyline(r.spots.map((s) => [spotById[s.spot].lat, spotById[s.spot].lng]), { color, weight: fk || r.official ? 4 : 2.5, opacity: fk || r.official ? 0.85 : 0.6, dashArray: r.official ? "6 6" : null }).addTo(layer).on("click", () => openArticle(r.id));
      }
      r.spots.forEach((s) => {
        const sp = spotById[s.spot];
        pts.push([sp.lat, sp.lng]);
        const rank = r.official ? 2 : fk ? 3 : 1;
        if (seen[sp.id] && seen[sp.id].rank >= rank) return;
        seen[sp.id] = { rank, r, sp, color, fk };
      });
    });
    Object.values(seen).forEach(({ r, sp, color, fk }) => {
      let icon;
      if (r.official) icon = divPin("official", "公式");
      else if (fk) icon = divPin("fav", esc(writerById[r.writer].name[0]), `background:${color}`);
      else icon = divPin("other", "");
      const m = L.marker([sp.lat, sp.lng], { icon }).addTo(layer).on("click", () => openArticle(r.id));
      if (state.mode === "group") {
        const t = state.tag || Object.keys(sp.groupLikes || {})[0];
        const n = sp.groupLikes && sp.groupLikes[t];
        if (n) L.marker([sp.lat, sp.lng], { icon: L.divIcon({ className: "", html: `<div class="pin-count">また行きたい ${n}人</div>`, iconSize: [0, 0], iconAnchor: [0, 0] }), interactive: false }).addTo(layer);
      }
      m.bindTooltip(esc(sp.name), { direction: "top" });
    });
    // 予定のルート
    if (state.plan) {
      const live = state.plan.stops.filter((s) => s.status !== "dropped");
      L.polyline(live.map((s) => [spotById[s.spot].lat, spotById[s.spot].lng]), { color: "#2B7DE9", weight: 3, dashArray: "2 7", opacity: 0.9 }).addTo(layer);
      const cur = state.plan.stops[state.plan.cur];
      if (cur) { const sp = spotById[cur.spot]; L.marker([sp.lat, sp.lng], { icon: L.divIcon({ className: "", html: '<div class="now-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(layer); }
    }
    if (fit && pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15, paddingTopLeft: [0, 150], paddingBottomRight: [0, 140] });
  }

  function renderChips() {
    const tags = [null, ...D.TAGS];
    $("#chips").innerHTML = tags.map((t) => `<button class="chip ${state.tag === t ? "on" : ""}" data-tag="${t || ""}">${t || "すべて"}</button>`).join("");
    const modes = [["fav", "お気に入り"], ["group", "同じ趣味の人たち"], ["all", "すべての人"]];
    $("#modes").innerHTML = modes.map(([k, l]) => `<button class="${state.mode === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("");
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

  function renderSheet() {
    const recs = visibleRecords();
    const off = recs.filter((r) => r.official);
    const favs = recs.filter((r) => !r.official && favKind(r.writer, r));
    const others = recs.filter((r) => !r.official && !favKind(r.writer, r));
    const label = state.mode === "fav" ? "お気に入り" : state.mode === "group" ? "同じ趣味の人たち" : "すべての人";
    $("#sheet-head").innerHTML = `<b>${esc(state.tag || "すべて")}の記事</b><small>${recs.length}件・${label}</small><small class="credit">地図：${ATTR}</small>`;
    let html = "";
    if (favs.length) html += `<div class="section-label">お気に入りの書き手</div>` + favs.map(recordCard).join("");
    if (others.length) html += `<div class="section-label">${state.mode === "group" ? "同じ趣味の記録が多い人たち" : "ほかの書き手"}</div>` + others.map(recordCard).join("");
    if (off.length) html += `<div class="section-label">公式（自治体・企業）</div>` + off.map(recordCard).join("");
    if (!recs.length) html = `<div class="empty">この条件の記事はまだありません。<br>「同じ趣味の人たち」に切り替えてみてください。</div>`;
    $("#sheet-body").innerHTML = html;
  }

  function setSheet(s) { const el = $("#sheet"); el.classList.remove("peek", "half", "full"); el.classList.add(s); }
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
    $("#sheet-head").addEventListener("click", () => { if (cur() === "peek") setSheet("half"); });
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
    $$(".back", p).forEach((b) => b.addEventListener("click", () => { stack.pop(); paint(); }));
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
      return `<div class="stop"><div class="stop-no">${i + 1}</div><div>
        <b>${esc(sp.name)}</b> ${ratingTag(s.rating)}
        <div class="photo" style="${photoStyle(sp)}">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}</div>
        <div>${esc(s.note)}</div>
        <div class="kv"><span>${sp.indoor ? "屋内" : "屋外"}</span>${hours ? `<span>${hours}</span>` : ""}${sp.price ? `<span>目安 ${sp.price.toLocaleString()}円</span>` : ""}${s.stay ? `<span>滞在 ${s.stay}分</span>` : ""}</div>
      </div></div>`;
    }).join("");
    const lock = r.member ? (isMember
      ? `<div class="lock"><b>メンバー限定</b><div>${esc(r.member.body)}</div></div>`
      : `<div class="lock"><b>${ICON.lock} メンバー限定</b><div style="margin:4px 0 10px">${esc(r.member.teaser)}</div>
          <button class="btn primary small" id="join-btn">メンバーになって読む（月${w.membership.price}円）</button></div>`) : "";
    const cta = r.type === "route" ? `<div class="sticky-cta"><button class="btn accent block" id="import-btn">このルートを予定に取り込む（無料）</button></div>` : "";
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
    const ib = $("#import-btn", p);
    if (ib) ib.addEventListener("click", () => importRoute(r.id));
  }

  function toggleFav(wid) {
    const i = V.favorites.indexOf(wid);
    if (i >= 0) { V.favorites.splice(i, 1); toast("お気に入りから外しました"); }
    else { V.favorites.push(wid); toast("お気に入りに入れました"); }
    renderSheet(); drawMap(false);
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

  /* ---------- 予定と組み直し ---------- */
  function importRoute(recId) {
    const r = recById[recId];
    const stops = R.buildSchedule(D, r);
    state.plan = { recordId: recId, title: r.title, stops, cur: 0 };
    state.rain = false; state.delay = 0; state.closed = []; state.pending = null;
    closePanels(); switchView("plan");
    toast("予定に取り込みました");
    drawMap(false);
  }

  function renderPlan() {
    const el = $("#view-plan");
    if (!state.plan) {
      el.innerHTML = `<div class="plan-head"><div class="h1">今日の予定</div></div>
        <div class="empty">記事のルートを取り込むと、ここに予定が出ます。<br><br><button class="btn primary" id="go-route">ゆうさんの大宮のルートを見る</button></div>`;
      $("#go-route").addEventListener("click", () => openArticle("y1"));
      return;
    }
    const pl = state.plan, cur = pl.stops[pl.cur];
    const curSpot = spotById[cur.spot];
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
          <b>${esc(sp.name)}</b>${ch}${closedNow}
          <div class="small">${sp.indoor ? "屋内" : "屋外"}・${s.stay}分${sp.hours ? `・${sp.hours.open}〜${sp.hours.close}` : ""}</div>${from}
        </div></div>`;
    }).join("");
    const alert = [];
    if (state.closed.includes(cur.spot)) alert.push(`<b>${esc(curSpot.name)}が臨時休業でした</b>同じ系統で、歩いて行ける店を探せます。`);
    if (state.rain && !state.rainHandled) alert.push(`<b>雨が降り出しました</b>屋外の予定を、屋内の場所に替えられます。`);
    if (state.delay) alert.push(`<b>予定より${state.delay}分遅れています</b>閉まる時間に間に合うように並べ直せます。`);
    const left = state.premium ? "無制限" : `今月の残り${V.rebuildsLeft}回`;
    const canRebuild = state.premium || V.rebuildsLeft > 0;
    el.innerHTML = `<div class="plan-head"><div class="small">今日の予定</div><div class="h1" style="margin-top:0">${esc(pl.title)}</div></div>
      ${alert.map((a) => `<div class="alert">${a}</div>`).join("")}
      <div class="cond"><span>営業中</span><span>天気</span><span>予算</span><span>歩く距離 30分まで</span><span>遅れ</span><span>お気に入りの記録を優先</span></div>
      <div class="demo-panel"><div class="small"><b>デモ操作</b>（本番では位置情報と天気で自動）</div>
        <div class="row">
          <button class="toggle" id="d-next">次の場所へ進む</button>
          <button class="toggle ${state.closed.includes(cur.spot) ? "on" : ""}" id="d-closed">ここが閉まっていた</button>
          <button class="toggle ${state.rain ? "on" : ""}" id="d-rain">雨にする</button>
          <button class="toggle ${state.delay ? "on" : ""}" id="d-delay">30分遅らせる</button>
          <button class="toggle" id="d-reset">最初に戻す</button>
        </div></div>
      <div class="timeline">${items}</div>
      <div class="sticky-cta">
        ${canRebuild ? `<button class="btn accent block" id="rebuild-btn">組み直す（${left}）</button>` : `<button class="btn primary block" id="premium-btn">有料会員で無制限に（初月無料）</button>`}
        <div class="small" style="text-align:center;margin-top:6px">無料でも条件はすべて使えます。有料会員は回数無制限と通知つき。</div>
      </div>`;
    $("#d-next").addEventListener("click", () => { if (pl.cur < pl.stops.length - 1) { pl.cur++; while (pl.stops[pl.cur] && pl.stops[pl.cur].status === "dropped" && pl.cur < pl.stops.length - 1) pl.cur++; } else toast("最後の場所です。記録してみましょう"); renderPlan(); drawMap(false); });
    $("#d-closed").addEventListener("click", () => { const i = state.closed.indexOf(cur.spot); if (i >= 0) state.closed.splice(i, 1); else state.closed.push(cur.spot); renderPlan(); });
    $("#d-rain").addEventListener("click", () => { state.rain = !state.rain; state.rainHandled = false; renderPlan(); });
    $("#d-delay").addEventListener("click", () => { state.delay = state.delay ? 0 : 30; renderPlan(); });
    $("#d-reset").addEventListener("click", () => importRoute(pl.recordId));
    const rb = $("#rebuild-btn"); if (rb) rb.addEventListener("click", doRebuild);
    const pb = $("#premium-btn"); if (pb) pb.addEventListener("click", () => { state.premium = true; toast("デモ：有料会員（初月無料）になりました"); renderPlan(); });
  }

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
      closePanels(); renderPlan(); drawMap(false);
      toast("新しい予定にしました");
    });
  }

  /* ---------- 記録 ---------- */
  const draft = { items: {}, title: "", vis: {} };
  function recordCandidates() {
    if (!state.plan) return ["omiya-lib", "r-nagi", "c-hidamari"].map((id) => ({ spot: id }));
    return state.plan.stops.filter((s) => s.status !== "dropped");
  }
  function renderRecord() {
    const el = $("#view-record");
    const cands = recordCandidates();
    if (!draft.title) draft.title = state.plan ? state.plan.title.replace("の1日", "の1日（組み直し版）") : "大宮で寄った場所";
    const items = cands.map((s) => {
      const sp = spotById[s.spot], d = draft.items[sp.id] || (draft.items[sp.id] = { on: true, rating: 3, note: "", vis: "public", photo: null });
      return `<div class="rec-item" data-spot="${sp.id}">
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="r-on" ${d.on ? "checked" : ""}><b>${esc(sp.name)}</b></label>
        <div class="rate-btns">${[3, 2, 1].map((n) => `<button class="r${n} ${d.rating === n ? "on" : ""}" data-rate="${n}">${RATING[n]}</button>`).join("")}</div>
        <input class="field r-note" placeholder="ひとこと（1〜2文）" value="${esc(d.note)}">
        <div style="display:flex;align-items:center;margin-top:8px">${d.photo ? `<img class="thumb" src="${d.photo}" alt="">` : ""}<label class="file-btn">写真を選ぶ<input type="file" accept="image/*" class="r-photo" hidden></label></div>
        <div class="vis">${[["public", "公開"], ["member", "メンバー限定"], ["private", "非公開"]].map(([k, l]) => `<button data-vis="${k}" class="${d.vis === k ? "on" : ""}">${l}</button>`).join("")}</div>
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

  /* ---------- 自分 ---------- */
  let meMap = null;
  function renderMe() {
    const el = $("#view-me");
    if (meMap) { meMap.remove(); meMap = null; }
    const allSpots = state.myRecords.flatMap((r) => r.spots);
    const favs = V.favorites.map((id) => writerById[id]);
    const tagFavs = Object.entries(V.tagFavorites).filter(([, t]) => t.length).map(([id, t]) => ({ w: writerById[id], t }));
    el.innerHTML = `<div class="plan-head"><div class="writer-row"><span class="avatar lg" style="background:#56859C">A</span><div><div class="h1" style="margin:0">${esc(V.name)}</div><div class="small">建築とラーメンが好きな大学生</div></div></div></div>
      <div class="pad" style="padding-top:6px">
        <div class="stats">
          <div class="stat"><b>${state.myRecords.length}</b><span>記録</span></div>
          <div class="stat"><b>${allSpots.length}</b><span>行った場所</span></div>
          <div class="stat"><b>${state.premium ? "有料" : V.rebuildsLeft + "回"}</b><span>${state.premium ? "組み直し無制限" : "組み直し残り"}</span></div>
        </div>
        <div class="section-label">自分の地図</div>
        <div class="minimap" id="mm-me" style="height:240px"></div>
        <div class="section-label">記録</div>
        ${state.myRecords.map((r) => `<div class="card"><h3 style="margin-top:0">${esc(r.title)}</h3><div class="meta"><span>${esc(r.date)}</span><span>${r.spots.length}か所</span></div>
          ${r.spots.map((s) => `<div style="margin-top:6px">${s.photo ? `<img class="thumb" src="${s.photo}" alt="" style="width:100%;height:120px">` : ""}<b>${esc(s.name)}</b> ${ratingTag(s.rating)} <span class="small">${s.vis === "public" ? "公開" : s.vis === "member" ? "メンバー限定" : "非公開"}</span><div class="small">${esc(s.note)}</div></div>`).join("")}</div>`).join("")}
        <div class="section-label">お気に入りの書き手</div>
        ${favs.map((w) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge fav">お気に入り</span></div><div class="small" style="margin-top:4px">${esc(w.bio)}</div></button>`).join("")}
        ${tagFavs.map(({ w, t }) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge tagfav">${esc(t.join("・"))}だけお気に入り</span></div></button>`).join("")}
      </div>`;
    if (typeof L !== "undefined") {
      const m = L.map("mm-me", { zoomControl: false });
      tileLayer().addTo(m);
      const pts = allSpots.map((s) => [s.lat, s.lng]);
      allSpots.forEach((s) => L.marker([s.lat, s.lng], { icon: divPin("mine", "") }).addTo(m).bindTooltip(esc(s.name)));
      if (pts.length) m.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 14 });
      meMap = m; setTimeout(() => m.invalidateSize(), 50);
    }
    $$("[data-writer]", el).forEach((b) => b.addEventListener("click", () => openWriter(b.dataset.writer)));
  }

  /* ---------- 画面の切り替え ---------- */
  function switchView(v) {
    state.view = v; closePanels();
    $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
    $$("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    if (v === "map" && map) setTimeout(() => map.invalidateSize(), 30);
    if (v === "plan") renderPlan();
    if (v === "record") renderRecord();
    if (v === "me") renderMe();
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initMap(); renderChips(); renderSheet(); drawMap(false); initSheet();
    $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-tag]"); if (!b) return; state.tag = b.dataset.tag || null; renderChips(); renderSheet(); drawMap(true); });
    $("#modes").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; state.mode = b.dataset.mode; renderChips(); renderSheet(); drawMap(true); });
    $("#sheet-body").addEventListener("click", (e) => { const c = e.target.closest("[data-rec]"); if (c) openArticle(c.dataset.rec); });
    $("#tabbar").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) switchView(b.dataset.view); });
  });
})();
