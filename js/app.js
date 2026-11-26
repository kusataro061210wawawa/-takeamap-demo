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
  const OMIYA = [35.9115, 139.6265];
  const KIND_BG = {
    "建築": ["#56859C", "#123D2B"], "ラーメン": ["#E86B45", "#8E3A1E"], "カフェ": ["#B08968", "#6F4E37"], "名所": ["#7F8C84", "#123D2B"],
    "公園": ["#97BC62", "#2C5F2D"], "博物館": ["#56859C", "#21295C"], "美術館": ["#A26769", "#6D2E46"], "店": ["#A7BEAE", "#626E66"], "山": ["#97BC62", "#2C5F2D"],
    "グルメ": ["#D9963A", "#7A3E12"], "海": ["#5AA6C8", "#1D4E6B"], "駅": ["#8A9AA6", "#2F3E48"],
  };
  // つくるで場所を押したときの滞在時間のめやす（分）
  const STAY_BY_KIND = { "ラーメン": 40, "カフェ": 45, "博物館": 90, "美術館": 60, "公園": 40, "名所": 45, "建築": 60, "店": 60, "山": 150, "グルメ": 45, "海": 60, "駅": 20 };
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
    grip: '<svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  };
  // 文字の代わりに使う小さなアイコン（色は まわりの文字の色）
  const ic = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = {
    walk: ic('<circle cx="13" cy="4.5" r="2"/><path d="M9.5 21l2.2-6.5 3 3V21M8 12l1.5-4 3.5-1 2.5 3.5 3 1M11.7 14.5L13 7"/>'),
    train: ic('<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 19l-2 2.5M15 19l2 2.5M9 13h.01M15 13h.01"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    x: ic('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    warn: ic('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    closed: ic('<path d="M3.5 9.5L5.5 4h13l2 5.5"/><path d="M4.5 9.5V20h15V9.5"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/>'),
    rain: ic('<path d="M3 12a9 9 0 0118 0z"/><path d="M12 12v6.5a2 2 0 01-4 0"/>'),
    delay: ic('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M10 2.5h4"/>'),
    reset: ic('<path d="M4.5 12a7.5 7.5 0 102.2-5.3"/><path d="M4.5 4v4h4"/>'),
    spark: ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    pin: ic('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    flag: ic('<path d="M5.5 21V4M5.5 4.5h11l-2.2 4 2.2 4h-11"/>'),
    edit: ic('<path d="M4 20l1.2-4.6L15.5 5.1a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z"/><path d="M14 6.5l3.5 3.5"/>'),
    image: ic('<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.8"/><path d="M21 15.5l-5-4.5-8.5 8"/>'),
    quote: ic('<path d="M10 7H6.5v4.5H10c0 2.5-1 4-3.5 5M18 7h-3.5v4.5H18c0 2.5-1 4-3.5 5"/>'),
    hr: ic('<path d="M3.5 12h17"/><path d="M7 7.5h10M7 16.5h10" opacity=".35"/>'),
    save: ic('<path d="M5 4h11l3 3v13H5z"/><path d="M8.5 4v4.5h6V4M8 20v-6h8v6"/>'),
    trash: ic('<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/>'),
    route: ic('<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 000-6h-4a3 3 0 010-6h6"/>'),
    cal: ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M12 12.5v5M9.5 15h5"/>'),
    list: ic('<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>'),
    gps: ic('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>'),
    ext: ic('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>'),
    back: ic('<path d="M15 5l-7 7 7 7"/>'),
    heart: ic('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>'),
    home: ic('<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>'),
    tree: ic('<path d="M12 3l5.5 8h-3l4 6h-13l4-6h-3z"/><path d="M12 17v4"/>'),
    yen: ic('<path d="M7 4l5 7.5L17 4M12 11.5V20M8 13h8M8 16.5h8"/>'),
    sun: ic('<path d="M3 18h18M7.5 18a4.5 4.5 0 019 0"/><path d="M12 8.5V10.5M5.6 11.6l1.4 1.4M18.4 11.6L17 13M3.5 15h2M18.5 15h2"/>'),
  };
  const VIS = [["public", "公開"], ["member", "メンバー限定"], ["private", "非公開"]];
  const visLabel = (k) => (VIS.find((v) => v[0] === k) || VIS[0])[1];

  // つくっている途中の予定。stops は { spot, stay }。start は分（600 = 10:00）
  const newDraft = (o = {}) => ({ id: null, name: "", start: 600, stops: [], from: null, dirty: false, ...o });

  const state = {
    tag: null, mode: "fav", view: "read",
    readTag: null,           // 読む：選んでいるタグ（null = おすすめ）
    planMode: "make",        // 予定：make（つくる）/ follow（たどる）/ redo（組み直しで、行く場所を自分で選ぶ）
    followList: true,        // たどる：保存した予定の一覧を出しているか
    sheetBy: { explore: "peek", make: "peek", follow: "half", redo: "half" }, // 下のシートの高さ（画面ごとに覚える）
    redo: null,              // 組み直しを自分で選んでいる途中 { d（つくると同じ形）, kind, closed, closedName, keep, done, skip, auto }
    fitNext: false,          // 次に地図を出すとき、予定の場所に合わせて動かすか
    myMapFilter: "all",      // 自分のマップ：all / rec / saved
    myMapSel: null,          // 自分のマップ：選んでいる場所（"ms-記録-番号" / "sv-場所"）
    myMapSheet: "peek",      // 自分のマップ：下のシートの高さ
    myMapView: null,         // 自分のマップ：地図の位置（記事を開いて戻ったときにそのままにする）
    myMapEdit: false,        // 自分のマップ：選んだ場所を「見る」か「直す」か
    draft: newDraft(),       // つくる
    plans: [],               // 保存した予定 { id, name, start, stops, from }
    plan: null,              // たどっている予定 { planId, title, stops（時刻つき）, cur, phase, from }
                             //   phase：at（cur に ついた）／go（cur へ移動中。from を でた）／end（全部まわった）
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
  // 写真がない場所は、場所の種類の色で埋める
  function photoStyle(spot) {
    const [a, b] = KIND_BG[spot.kind] || ["#7F8C84", "#123D2B"];
    return `background:linear-gradient(135deg, ${a}, ${b})`;
  }

  /* 写真：images/ の名前（src）から。small = カードや吹き出し用の小さい版 */
  const img = (src, small) => `images/${src}${small ? "-s" : ""}.jpg`;
  /* 自分で入れる写真：長い辺を max まで小さくして JPEG にし直す（描き直すので、位置情報などの Exif は残らない）。
     試作なので端末の中（メモリ）だけに置き、どこにも送らない */
  function shrinkPhoto(file, max = 1280) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像を読めませんでした")); };
      im.src = url;
    });
  }
  const stopOf = (r, spotId) => r && r.spots.find((s) => s.spot === spotId);
  const stopPhotos = (r, spotId) => { const s = stopOf(r, spotId); return (s && s.photos) || []; };
  function coverSrc(r) {
    if (r.cover) return r.cover;
    const s = r.spots.find((x) => x.photos && x.photos.length);
    return s ? s.photos[0].src : null;
  }

  /* 場所の情報（書き手が入力した営業時間・休み・住所） */
  const ioText = (sp) => sp.io || (sp.indoor ? "屋内" : "屋外");
  const hoursText = (sp) => sp.hoursText || (sp.hours ? `${sp.hours.open}〜${sp.hours.close}${sp.addr ? "" : "（仮）"}` : "");
  // 移動：歩き（2kmまで）か、電車・バスなど
  const moveText = (s) => (s.mode === "ride" ? `約${s.walk}分` : `${s.walk}分`); // 横に移動手段の札（modeTag）を出す

  /* Google マップ（APIキーなしで開ける URL） */
  const llq = (sp) => `${sp.lat},${sp.lng}`;
  const gmapPlace = (sp) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(sp.addr ? `${sp.name} ${sp.addr}` : llq(sp));
  function gmapRoute(spots, mode) {
    const pts = spots.slice(0, 11);
    let u = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(llq(pts[0]))}&destination=${encodeURIComponent(llq(pts[pts.length - 1]))}`;
    if (pts.length > 2) u += "&waypoints=" + encodeURIComponent(pts.slice(1, -1).map(llq).join("|"));
    if (mode) u += "&travelmode=" + mode;
    return u;
  }
  // 2か所のあいだの行き方（歩きなら徒歩、遠ければ電車・バス）
  const gmapLeg = (a, b, mode) => gmapRoute([a, b], mode === "ride" ? "transit" : "walking");
  const GICON = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const gLink = (href, label, cls = "") => `<a class="gmap-link ${cls}" href="${href}" target="_blank" rel="noopener">${GICON}${esc(label)}</a>`;

  /* 地図の下地：Google Maps（js/gmap.js）。Google の地図や店の情報は保存しない。
     前の版でこの端末に入れた Map Tiles API のキーが残っていれば消す */
  try { localStorage.removeItem("tam-google-key"); } catch (e) { /* なくてもよい */ }
  // ピンの見た目：{ html, size, anchor }（anchor：地図の位置に合わせる、ピンの中の点）
  const PIN_SIZE = { fav: 26, official: 26, mine: 22, saved: 20, other: 16, num: 28 };
  function divPin(cls, inner, extra = "") {
    const n = PIN_SIZE[cls.split(" ")[0]] || 22;
    return { html: `<div class="pin ${cls}" style="${extra}">${inner || ""}</div>`, size: [n, n], anchor: [n / 2, n / 2] };
  }
  // 大きな地図は、Google のロゴと出典が下のシートに隠れないよう、下をシートの一番低い高さ（132px）だけあけてある（css の --map-b と同じ）
  const MAP_B = 132;
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
  // おまかせで選んだ場所は、選んだ理由（pickWhy）と、何の代わりか（replacedFrom）を時刻を計算し直しても残す
  const schedule = (start, stops) => (stops.length ? R.buildSchedule(D, { start: R.fmt(start), spots: stops })
    .map((s, i) => (stops[i].pickWhy ? { ...s, pickWhy: stops[i].pickWhy, replacedFrom: stops[i].replacedFrom || null } : s)) : []);

  /* ---------- 地図（探す・つくる・たどる で同じ地図を使う） ---------- */
  let map, layer, bubbleLayer, pinInfo = [];
  const stage = () => (state.view === "plan" ? state.planMode : "explore");
  // いま地図で直している予定：つくる＝state.draft、組み直しで自分で選ぶ＝state.redo.d（先頭の lockN か所は「いまいる場所」で動かせない）
  const ed = () => (stage() === "redo" && state.redo ? state.redo.d : state.draft);
  const lockN = (d) => d.lockN || 0;
  // 画面に出す番号。組み直しは、たどっている予定の番号のまま（nums：動かせない行の番号、first：そのあとの最初の番号）
  const numOf = (d, i) => (d.nums ? (i < lockN(d) ? d.nums[i] : d.first + i - lockN(d)) : i + 1);
  const editing = () => stage() === "make" || stage() === "redo";
  // 組み直しで候補に出さない場所（もう行った場所・スキップする場所）
  const redoUsed = () => (state.redo ? [...state.redo.done.map((x) => x.spot), ...(state.redo.skip ? [state.redo.skip.spot] : [])] : []);

  /* たどる：場所ごとの「ついた／でた」。
     cur は「いる場所」か「向かっている場所」。休業・雨・遅れのアイコンは cur に当てはめる（移動中なら次に行く場所） */
  const live = (s) => !!s && s.status !== "dropped";
  function nextLive(pl, i) { for (let k = i + 1; k < pl.stops.length; k++) if (live(pl.stops[k])) return k; return -1; }
  function prevLive(pl, i) { for (let k = i - 1; k >= 0; k--) if (live(pl.stops[k])) return k; return -1; }
  // 場所 i の見え方：skip（行けなかった）/ done（でた）/ at（いまここ）/ go（ここに行く）/ todo（このあと）
  function flState(pl, i) {
    const s = pl.stops[i];
    if (!live(s)) return "skip";
    if (i < pl.cur || (i === pl.cur && pl.phase === "end")) return "done";
    if (i === pl.cur) return pl.phase === "at" ? "at" : "go";
    return "todo";
  }
  // cur が行けない場所になったら、その次の場所へ向かうことにする
  function fixCur(pl) {
    if (live(pl.stops[pl.cur])) return;
    const n = nextLive(pl, pl.cur);
    if (n >= 0) { pl.cur = n; if (pl.phase !== "go") pl.phase = "go"; }
    else { const p = prevLive(pl, pl.cur); pl.cur = p >= 0 ? p : 0; pl.phase = "end"; }
  }
  // 地図は最初に開いたときに Google から読み込んで作る。読み込み中にもう一度呼ばれても、作るのは1回だけ
  let mapLoading = null;
  function initMap() {
    if (map) return Promise.resolve(map);
    if (!mapLoading) {
      mapLoading = GM.create($("#map"), { center: OMIYA, zoom: 14 }).then((m) => {
        mapLoading = null;
        if (!m) return null; // オフラインなど：地図の所にだけお知らせが出る
        map = m;
        layer = m.group();
        bubbleLayer = m.group();
        m.on("zoomstart", () => bubbleLayer.clear());
        // 探す：動かしている間は一覧を薄くし、止まって少したってから、映っている範囲の記事に入れ替える
        m.on("movestart", () => { if (stage() === "explore") { clearTimeout(areaTimer); $("#sheet-body").classList.add("waiting"); } });
        m.on("moveend", () => { refreshBubbles(); if (stage() === "explore") scheduleArea(); });
        return m;
      });
    }
    return mapLoading;
  }
  const topInset = () => $(".map-top").offsetHeight;
  function sheetPx() {
    const el = $("#sheet"), h = $("#view-map").clientHeight;
    return el.classList.contains("peek") ? 132 : el.classList.contains("half") ? h * 0.52 : h - 100;
  }
  // 下のシートが地図に重なっている高さ（地図は下を MAP_B だけあけてある）
  const sheetOver = () => Math.max(0, sheetPx() - MAP_B);

  /* 探す：地図に映っている範囲（上の検索・タグと、下のシートに隠れていない所） */
  let areaTimer = null, areaBounds = null;
  function computeArea() {
    if (!map) return null;
    const size = map.getSize();
    if (!size.x || !size.y) return null;
    const top = Math.min(topInset(), size.y * 0.4);
    const bottom = Math.max(top + 40, size.y - sheetOver());
    const [n, w] = map.toLatLng({ x: 0, y: top }), [s, e] = map.toLatLng({ x: size.x, y: bottom });
    return { contains: ([lat, lng]) => lat <= n && lat >= s && lng >= w && lng <= e };
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
    const m = layer.marker(ll, { ...icon, z, onClick });
    if (info) pinInfo.push({ ll, ...info });
    return m;
  }
  function drawMap(fit) {
    if (!map) return;
    layer.clear(); pinInfo = [];
    const st = stage();
    let pts = [];
    if (st === "explore") pts = drawRecords(false);
    if (st === "make" || st === "redo") { const rp = drawRecords(true), dp = drawDraft(); pts = dp.length ? dp : rp; }
    if (st === "follow") pts = drawFollow();
    if (fit && pts.length) fitTo(pts);
    refreshBubbles();
  }
  function fitTo(pts) {
    map.fit(pts, { pad: pts.length > 1 ? 0.12 : 0, maxZoom: 16, top: topInset() + 16, left: 24, right: 24, bottom: sheetOver() + 16 });
  }

  // 記事のピンとルート（探す・つくる）
  function drawRecords(make) {
    const recs = visibleRecords();
    const seen = {}, pts = [];
    const inDraft = new Set(make ? ed().stops.map((s) => s.spot) : []);
    if (make && stage() === "redo") redoUsed().forEach((id) => inDraft.add(id)); // もう行った場所・スキップする場所は候補に出さない
    recs.forEach((r) => {
      const w = writerById[r.writer], fk = favKind(r.writer, r);
      const color = r.official ? "#E86B45" : fk ? w.color : "#A9B2AC";
      if (r.type === "route") {
        const strong = fk || r.official;
        layer.line(r.spots.map((s) => [spotById[s.spot].lat, spotById[s.spot].lng]), {
          color, weight: make ? 2.5 : strong ? 4 : 2.5, opacity: make ? 0.28 : strong ? 0.85 : 0.6, dash: r.official ? "6 6" : null,
          onClick: make ? null : () => openArticle(r.id),
        });
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
      if (!make) icon.title = sp.name;
      addPin([sp.lat, sp.lng], icon, { half: PIN_SIZE[kind] / 2, prio: rank, sp, r, s }, () => (make ? toggleDraftSpot(sp.id) : openArticle(r.id)));
      if (!make && state.mode === "group") {
        const t = state.tag || Object.keys(sp.groupLikes || {})[0];
        const n = sp.groupLikes && sp.groupLikes[t];
        if (n) layer.marker([sp.lat, sp.lng], { html: `<div class="pin-count">また行きたい ${n}人</div>`, size: [0, 0], anchor: [0, 0], interactive: false });
      }
    });
    return pts;
  }

  // 番号のピン。下に着く時刻を出す（warn = 着く時刻に開いていない）
  const TIME_H = 18; // 時刻のラベルの高さ（吹き出しと重ならないように使う）
  function numPin(n, time, cls = "", warn = false, tcls = "") {
    return {
      size: [28, 28], anchor: [14, 14],
      html: `<div class="pin-num-wrap"><div class="pin num ${cls}">${n}</div>${time ? `<span class="pin-time ${warn ? "warn" : ""} ${tcls}">${time}着</span>` : ""}</div>`,
    };
  }
  const spotLL = (id) => [spotById[id].lat, spotById[id].lng];

  // 長押し（指でもマウスでも）。動いたら長押しにしない。長押しのあとに来るクリックは無視する
  const LONG_MS = 480;
  let longFired = false;
  function onLongPress(el, fn) {
    if (!el) return;
    let t = null, x0 = 0, y0 = 0;
    const cancel = () => { if (t) { clearTimeout(t); t = null; } el.classList.remove("pressing"); };
    el.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      longFired = false; x0 = e.clientX; y0 = e.clientY;
      el.classList.add("pressing");
      t = setTimeout(() => {
        t = null; el.classList.remove("pressing"); longFired = true;
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* なくてもよい */ } }
        fn();
      }, LONG_MS);
    });
    el.addEventListener("pointermove", (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) cancel(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => el.addEventListener(ev, cancel));
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // つくる・組み直し：選んだ順に 1, 2, 3… と番号をつけ、線でつなぐ。番号の下に着く時刻。長押しで順番を入れ替える
  function drawDraft() {
    const d = ed(), lk = lockN(d), stops = d.stops, sch = schedule(d.start, stops);
    const ll = stops.map((x) => [spotById[x.spot].lat, spotById[x.spot].lng]);
    // 組み直し：もう行った場所は薄く、行けなかった（スキップする）場所は灰色で出す
    const rd = stage() === "redo" ? state.redo : null;
    if (rd) {
      const dl = rd.done.map((x) => spotLL(x.spot));
      if (dl.length && ll.length) layer.line([...dl, ll[0]], { color: "#8A968E", weight: 3, dash: "2 7", opacity: 0.8 });
      rd.done.forEach((x, k) => addPin(dl[k], numPin(x.num, "", "fl done"), { half: 14, prio: 1, sp: spotById[x.spot], num: x.num, fl: true }, null, 200));
      if (rd.skip) addPin(spotLL(rd.skip.spot), numPin(rd.skip.num, "", "fl dropped"), { half: 14, prio: 2, sp: spotById[rd.skip.spot], num: rd.skip.num, fl: true }, null, 300);
    }
    if (ll.length > 1) layer.line(ll, { color: "#E86B45", weight: 4.5, opacity: 0.9 });
    stops.forEach((x, i) => {
      const b = bestRecordFor(x.spot), sp = spotById[x.spot], a = sch[i];
      const info = { half: 14, below: TIME_H, prio: 10, sp, r: b && b.r, s: b && b.s, num: numOf(d, i) };
      if (i < lk) { // いまいる場所・出てきた場所（動かせない）
        const skipHere = rd && rd.kind === "at" && rd.closed, left = rd && rd.kind !== "at";
        const cls = left ? "fl done" : skipHere ? "fl dropped now" : "fl now";
        addPin(ll[i], numPin(numOf(d, i), skipHere || left ? "" : R.fmt(a.arrive), cls), { ...info, fl: true }, () => b && openArticle(b.r.id), 900);
        return;
      }
      const warn = !!stopWarn(sp, a);
      const m = addPin(ll[i], numPin(numOf(d, i), R.fmt(a.arrive), "", warn), info, () => {
        if (longFired) { longFired = false; return; }
        toggleDraftSpot(x.spot);
      }, 1000);
      onLongPress(m.getElement(), () => openOrderPicker(i));
    });
    return ll;
  }

  /* 並べ替え：行をつかんで上下にスライドすると、ほかの行がよけて入れ替わる（指でもマウスでも）
     item：行のセレクタ。handle：つかむ所（null なら行のどこでも。少し動かしてから並べ替えになる）
     lock：先頭の動かせない行の数。scroller：端まで来たら自動でスクロールする要素。onDrop(from, to) */
  let sortDropped = 0; // 並べ替えた直後に来るクリックを無視するため
  const justSorted = () => Date.now() - sortDropped < 450;
  function makeSortable(list, { item, handle = null, lock = 0, scroller = null, onDrop }) {
    let s = null, raf = 0;
    const scrollY = () => (scroller ? scroller.scrollTop : 0);
    const begin = () => {
      const rects = s.items.map((x) => x.getBoundingClientRect());
      s.tops = rects.map((r) => r.top); s.mids = rects.map((r) => r.top + r.height / 2);
      s.on = true; s.sc0 = scrollY();
      list.classList.add("sorting"); s.el.classList.add("sort-drag");
      s.items.forEach((x) => { if (x !== s.el) x.classList.add("sort-shift"); });
      try { s.grab.setPointerCapture(s.id); } catch (err) { /* そのままでも動く */ }
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* なくてもよい */ } }
      const tick = () => { // 端まで来たら少しずつスクロール
        if (!s || !s.on) return;
        if (scroller) {
          const r = scroller.getBoundingClientRect();
          if (s.y < r.top + 36) scroller.scrollTop -= 7; else if (s.y > r.bottom - 36) scroller.scrollTop += 7;
        }
        follow();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const follow = () => {
      const dy = s.y - s.y0 + (scrollY() - s.sc0), c = s.mids[s.i] + dy;
      s.el.style.transform = `translateY(${dy}px)`;
      let to = s.items.reduce((n, x, k) => (k !== s.i && s.mids[k] < c ? n + 1 : n), 0);
      to = Math.max(lock, Math.min(s.items.length - 1, to));
      s.to = to;
      s.items.forEach((x, k) => {
        if (k === s.i) return;
        let t = 0;
        if (s.i < to && k > s.i && k <= to) t = s.tops[k - 1] - s.tops[k];
        if (to < s.i && k >= to && k < s.i) t = s.tops[k + 1] - s.tops[k];
        x.style.transform = t ? `translateY(${t}px)` : "";
      });
    };
    const finish = (drop) => {
      if (!s) return;
      cancelAnimationFrame(raf);
      const { i, to, on } = s;
      s.items.forEach((x) => { x.style.transform = ""; x.classList.remove("sort-shift", "sort-drag"); });
      list.classList.remove("sorting");
      s = null;
      if (on) { sortDropped = Date.now(); if (drop && to !== i) onDrop(i, to); }
    };
    list.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || s) return;
      const grab = e.target.closest(handle || item);
      if (!grab || !list.contains(grab)) return;
      const el = grab.closest(item), items = $$(item, list), i = items.indexOf(el);
      if (i < lock) return;
      s = { el, items, i, to: i, grab, id: e.pointerId, x0: e.clientX, y0: e.clientY, y: e.clientY, on: false };
      if (handle) { e.preventDefault(); begin(); }
    });
    list.addEventListener("pointermove", (e) => {
      if (!s || e.pointerId !== s.id) return;
      s.y = e.clientY;
      if (!s.on) {
        if (Math.abs(e.clientX - s.x0) > 12) { s = null; return; }
        if (Math.abs(e.clientY - s.y0) < 6) return;
        begin();
      }
      follow();
    });
    list.addEventListener("pointerup", (e) => { if (s && e.pointerId === s.id) finish(true); });
    list.addEventListener("pointercancel", (e) => { if (s && e.pointerId === s.id) finish(false); });
  }

  // 順番を入れ替える：行を上下にスライドして入れ替える。番号を押すと、長押しした場所をその番号にする
  function openOrderPicker(i) {
    closePicker();
    const d = ed(), lk = lockN(d);
    if (i < lk || !d.stops[i]) return;
    const focus = d.stops[i].spot; // 長押しした場所
    const box = document.createElement("div");
    box.className = "picker-back"; box.id = "picker";
    $("#app").appendChild(box);
    const changed = () => { d.dirty = true; drawMap(false); renderSheet(); };
    const draw = () => {
      const sch = schedule(d.start, d.stops), fi = d.stops.findIndex((s) => s.spot === focus), sp = spotById[focus];
      box.innerHTML = `<div class="picker" role="dialog" aria-label="順番を入れ替える">
        <div class="picker-head"><span class="mk-num">${numOf(d, fi)}</span><div><b>${esc(sp.name)}</b><div class="small">行を上下にスライドすると入れ替わります。番号を押すと、この場所がその番号になります</div></div></div>
        <div class="picker-list">${d.stops.map((s, k) => {
          const name = esc(spotById[s.spot].name), warn = k >= lk && stopWarn(spotById[s.spot], sch[k]);
          if (k < lk) return `<div class="picker-row locked"><span class="mk-num">${numOf(d, k)}</span><span class="pr-name">${name}</span><span class="pr-now">${lockLabel()}</span></div>`;
          return `<button class="picker-row ${k === fi ? "on" : ""}" data-to="${k}"><span class="mk-num">${numOf(d, k)}</span><span class="pr-name">${k === fi ? `<b>${name}</b>` : name}</span><span class="pr-time ${warn ? "warn" : ""}">${R.fmt(sch[k].arrive)}着</span><span class="grip" aria-hidden="true">${ICON.grip}</span></button>`;
        }).join("")}</div>
        <div class="picker-foot"><button class="mini-btn danger" data-pk="del">${esc(sp.name)}を外す</button><button class="btn primary small" data-pk="close">閉じる</button></div>
      </div>`;
      const list = $(".picker-list", box);
      makeSortable(list, { item: ".picker-row", lock: lk, scroller: list, onDrop: (from, to) => {
        const [it] = d.stops.splice(from, 1); d.stops.splice(to, 0, it);
        changed(); draw();
        toast(`${spotById[it.spot].name}を${numOf(d, to)}番にしました`);
      } });
    };
    draw();
    requestAnimationFrame(() => box.classList.add("show"));
    box.addEventListener("click", (e) => {
      if (justSorted()) return;
      const to = e.target.closest("[data-to]"), pk = e.target.closest("[data-pk]");
      if (to) {
        const k = Number(to.dataset.to), fi = d.stops.findIndex((s) => s.spot === focus);
        closePicker();
        if (k === fi) return;
        const [it] = d.stops.splice(fi, 1); d.stops.splice(k, 0, it);
        changed();
        toast(`${spotById[focus].name}を${numOf(d, k)}番にしました`);
      } else if (pk && pk.dataset.pk === "del") { closePicker(); toggleDraftSpot(focus); }
      else if (pk || e.target === box) closePicker();
    });
  }
  function closePicker() { const p = $("#picker"); if (p) p.remove(); }
  // 組み直しの、動かせない行の呼び方
  function lockLabel() {
    const rd = state.redo;
    if (rd && rd.kind !== "at") return "出た場所";
    return rd && rd.closed ? "スキップ" : "いまいる場所";
  }

  // たどる：選んだ予定のルート。一覧を出しているときは、保存した予定を薄く出す
  function drawFollow() {
    const ll = (stops) => stops.map((s) => spotLL(s.spot));
    if (state.followList || !state.plan) {
      const pts = [];
      state.plans.forEach((p) => {
        const l = ll(p.stops); pts.push(...l);
        if (l.length > 1) layer.line(l, { color: "#123D2B", weight: 3, opacity: 0.4, dash: "4 6" });
        l.forEach((x) => layer.marker(x, { html: '<div class="map-dot"></div>', size: [10, 10], anchor: [5, 5], interactive: false }));
      });
      return pts;
    }
    const pl = state.plan, cur = pl.cur, ph = pl.phase;
    // 通ってきた道（灰色の点線）・これからの道（青の点線）
    const passed = ll(pl.stops.filter((s, i) => i < cur && (live(s) || s.spot === pl.from)));
    if (ph !== "go") passed.push(spotLL(pl.stops[cur].spot));
    if (passed.length > 1) layer.line(passed, { color: "#8A968E", weight: 3, dash: "2 7", opacity: 0.8 });
    const ahead = ph === "end" ? [] : ll(pl.stops.filter((s, i) => i >= cur && live(s)));
    if (ahead.length > 1) layer.line(ahead, { color: "#2B7DE9", weight: 4, dash: "2 8", opacity: 0.9 });
    // でたあと、次の場所に「ついた」を押すまで：いま歩いている道を太い線で強調する
    if (ph === "go" && pl.from) {
      const a = spotLL(pl.from), b = spotLL(pl.stops[cur].spot);
      layer.line([a, b], { color: "#FFFFFF", weight: 11, opacity: 0.95, z: 5 });
      layer.line([a, b], { color: "#2B7DE9", weight: 6, opacity: 1, z: 6 });
      layer.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { html: `<div class="leg-tag">${IC.walk}移動中</div>`, size: [0, 0], anchor: [0, 0], interactive: false, z: 950 });
    }
    const all = pl.stops.map((s, i) => {
      const sp = spotById[s.spot], b = bestRecordFor(s.spot), st = flState(pl, i);
      const cls = { skip: "fl dropped", done: "fl done", at: "fl now", go: "fl go", todo: "fl" }[st];
      const time = (st === "at" || st === "go" || st === "todo") && s.arrive != null ? R.fmt(s.arrive) : "";
      const hot = st === "at" || st === "go";
      addPin([sp.lat, sp.lng], numPin(i + 1, time, cls, false, st === "go" ? "go" : ""), { half: 14, below: time ? TIME_H : 0, prio: hot ? 10 : 5, sp, r: b && b.r, s: b && b.s, num: i + 1, fl: true }, () => b && openArticle(b.r.id), hot ? 900 : 500);
      return [sp.lat, sp.lng];
    });
    // 移動中は、いま歩いている道が大きく見えるように、その2か所に合わせる
    return ph === "go" && pl.from ? [spotLL(pl.from), spotLL(pl.stops[cur].spot)] : all;
  }

  /* 吹き出し：ある程度拡大して、まわりに余白があるピンだけに、場所名・記事名・評価を出す。押すと記事へ */
  const BW = 196, BH = 62, BGAP = 9, BUBBLE_ZOOM = 15;
  function refreshBubbles() {
    if (!map || !bubbleLayer) return;
    bubbleLayer.clear();
    if (!$("#view-map").classList.contains("active")) return;
    placeBubbles(map, bubbleLayer, pinInfo.map((p) => ({ ...p, b: mainBubble(p) })), topInset() + 4, map.getSize().y - sheetOver() - 4);
  }
  // 探す・つくる・たどる の吹き出しの中身
  function mainBubble(p) {
    const w = p.r && writerById[p.r.writer], ph = p.r && stopPhotos(p.r, p.sp.id)[0];
    return {
      cls: `${p.num ? (p.fl ? "is-fl" : "is-num") : ""} ${p.r ? "" : "no-rec"}`, num: p.num, name: p.sp.name,
      title: p.r ? "「" + p.r.title + "」" : p.sp.kind + "（記事はまだありません）",
      rating: p.r && p.s.rating, who: w && w.name, go: p.r ? "記事 ›" : "", photo: ph && ph.src,
      onClick: p.r ? () => openArticle(p.r.id) : null,
    };
  }
  /* 吹き出しを置く（どの地図でも使う）。pins: { ll, half, below?, prio, b: 中身 }
     top / bottom：吹き出しを出してよい縦の範囲（上の検索や下のシートに重ねない） */
  function placeBubbles(m, lyr, list, top, bottom, minZoom = BUBBLE_ZOOM) {
    if (m.getZoom() < minZoom) return;
    const size = m.getSize();
    const hit = (a, b, mg = 0) => a.x < b.x + b.w + mg && b.x < a.x + a.w + mg && a.y < b.y + b.h + mg && b.y < a.y + a.h + mg;
    const pins = list.map((p) => {
      const pt = m.toPoint(p.ll), h = p.half + 2;
      return { ...p, pt, box: { x: pt.x - h, y: pt.y - h, w: h * 2, h: h * 2 + (p.below || 0) } };
    }).filter((p) => p.pt.x > -40 && p.pt.x < size.x + 40 && p.pt.y > top - 40 && p.pt.y < bottom + 40);
    const placed = [];
    pins.filter((p) => p.pt.x >= 0 && p.pt.x <= size.x && p.pt.y >= top && p.pt.y <= bottom)
      .sort((a, b) => b.prio - a.prio)
      .forEach((p) => {
        const o = p.half + BGAP, ob = o + (p.below || 0);
        const cand = {
          top: { x: p.pt.x - BW / 2, y: p.pt.y - o - BH }, bottom: { x: p.pt.x - BW / 2, y: p.pt.y + ob },
          right: { x: p.pt.x + o, y: p.pt.y - BH / 2 }, left: { x: p.pt.x - o - BW, y: p.pt.y - BH / 2 },
        };
        for (const pos of ["top", "bottom", "right", "left"]) {
          const r = { ...cand[pos], w: BW, h: BH };
          if (r.x < 6 || r.x + BW > size.x - 6 || r.y < top || r.y + BH > bottom) continue;
          if (placed.some((q) => hit(q, r, 6))) continue;
          if (pins.some((q) => q !== p && hit(q.box, r))) continue;
          placed.push(r); addBubble(lyr, p, pos, o, ob); break;
        }
      });
  }
  function addBubble(lyr, p, pos, o, ob) {
    const anchor = { top: [BW / 2, o + BH], bottom: [BW / 2, -ob], right: [-o, BH / 2], left: [BW + o, BH / 2] }[pos];
    const b = p.b, src = b.photoUrl || (b.photo && img(b.photo, true)); // photoUrl：自分で入れた写真（そのまま使う）
    const html = `<div class="bubble b-${pos} ${b.cls || ""} ${src ? "has-ph" : ""}">
      ${src ? `<img class="bph" src="${src}" alt="" loading="lazy">` : ""}
      <span class="btx">
        <span class="bn">${b.num ? `<i>${b.num}</i>` : ""}${esc(b.name)}</span>
        <span class="bt">${esc(b.title)}</span>
        ${b.rating || b.who ? `<span class="bm">${b.rating ? ratingTag(b.rating) : ""}<span class="bw">${esc(b.who || "")}</span>${b.go ? `<span class="bgo">${esc(b.go)}</span>` : ""}</span>` : ""}
      </span>
    </div>`;
    lyr.marker(p.ll, { cls: "bubble-icon", html, size: [BW, BH], anchor, z: 3000 + (b.z || 0), onClick: b.onClick || null });
  }

  /* 地図の上：探すは検索、つくる・たどるは切り替え */
  function renderTop() {
    const st = stage();
    $("#top-search").hidden = st !== "explore";
    $("#stage-bar").hidden = st === "explore";
    $("#chips").hidden = st === "follow";
    $("#modes").hidden = st === "follow";
    if (st === "redo") {
      $("#stage-bar").innerHTML = `<div class="stage-title"><b>組み直す</b><span>行く場所を地図で選ぶ</span></div><span class="demo-badge">試作・データは仮</span>`;
    } else if (st !== "explore") {
      $("#stage-bar").innerHTML = `<div class="seg stage-seg">${[["make", IC.cal, "つくる"], ["follow", IC.route, "たどる"]].map(([k, i, l]) => `<button data-stage="${k}" class="${st === k ? "on" : ""}">${i}${l}</button>`).join("")}</div><span class="demo-badge">試作・データは仮</span>`;
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
    else if (st === "redo") renderRedoSheet();
    else renderFollowSheet();
    body.dataset.stage = st; body.scrollTop = keep;
  }

  function recordCard(r) {
    const w = writerById[r.writer], fk = favKind(r.writer, r);
    const best = Math.max(...r.spots.map((s) => s.rating));
    const kind = r.type === "route" ? `ルート ${r.spots.length}か所` : "1か所の記録";
    const lock = r.member ? `<span class="badge member">${ICON.lock.replace('width="16" height="16"', 'width="11" height="11"')} メンバー限定あり</span>` : "";
    const ph = coverSrc(r);
    return `<button class="card ${r.official ? "official" : fk ? "fav" : ""} ${ph ? "has-thumb" : ""}" data-rec="${r.id}">
      ${ph ? `<img class="card-thumb" src="${img(ph, true)}" alt="" loading="lazy">` : ""}
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
    $("#sheet-head").innerHTML = `<b>${esc(state.tag || "すべて")}の記事</b><small>${areaBounds ? "この範囲 " : ""}${recs.length}件・${label}</small>`;
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
    const o = R.toMin(sp.hours.open), c = R.toMin(sp.hours.close), rest = sp.hours.rest;
    if (a >= c) return `着く時間（${R.fmt(a)}）には閉まっています`;
    if (a < o) return `着く時間（${R.fmt(a)}）はまだ開いていません（${sp.hours.open}から）`;
    if (rest && a < R.toMin(rest[1]) && d > R.toMin(rest[0])) return `${rest[0]}〜${rest[1]}は中休みです。時間をずらしてください`;
    if (d > c) return `${sp.hours.close}に閉まります。滞在を短くするか、順番を変えてください`;
    return "";
  }
  // 予定の1か所の注意（営業時間。組み直しのときは、臨時休業・雨の日の屋外も）
  function stopWarn(sp, a) {
    const h = hoursWarn(sp, a.arrive, a.depart);
    if (h) return h;
    if (stage() === "redo") {
      if (state.closed.includes(sp.id)) return "臨時休業です。ほかの場所にしてください";
      if (state.rain && !sp.indoor) return "雨です。屋外の場所です";
    }
    return sunsetWarn(sp, a); // 自然・景色の場所に、日の入りより後に着くとき
  }
  const stayText = (m) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`);
  const moveIcon = (s) => (s.mode === "ride" ? IC.train : IC.walk);
  // 移動の分数の横に出す、小さな移動手段の札（歩き／電車＋歩き）
  const modeName = (s) => (s.mode === "ride" ? "電車＋歩き" : "歩き");
  const modeTag = (s) => `<small class="mv-mode ${s.mode === "ride" ? "ride" : ""}">${modeName(s)}</small>`;
  // おまかせで選んだ理由（誰の「また行きたい」か・屋内／屋外・歩く分数）を小さな札で
  function whyChips(pw) {
    if (!pw) return "";
    const c = [];
    if (pw.who) c.push(`<span class="why-chip like">${IC.heart}${esc(pw.who)}さんが「${esc(pw.liked)}」</span>`);
    else if (pw.group) c.push(`<span class="why-chip like">${IC.heart}${esc(pw.group.tag)}好き${pw.group.n}人が「また行きたい」</span>`);
    if (pw.style) c.push(`<span class="why-chip">同じ${esc(pw.style)}系</span>`);
    c.push(`<span class="why-chip">${pw.io === "屋外" ? IC.tree : IC.home}${esc(pw.io)}</span>`);
    c.push(`<span class="why-chip">${IC.walk}歩いて${pw.walk}分</span>`);
    return `<div class="why-box"><small>${IC.spark}おまかせで選んだ理由</small><div class="why-chips">${c.join("")}</div></div>`;
  }
  // 自然・景色を見に行く場所（日の入りのあとに着くと、景色が見えにくい）
  const isScenic = (sp) => sp.tags.includes("自然") || (!sp.indoor && ["公園", "海", "山", "名所"].includes(sp.kind));
  const sunsetOf = (sp) => R.sunsetMin(sp.lat, sp.lng, new Date());
  function sunsetWarn(sp, a) {
    if (!isScenic(sp) || a.arrive == null) return "";
    const ss = sunsetOf(sp);
    return ss != null && a.arrive >= ss ? `日の入り（${R.fmt(ss)}ごろ）より後に着きます。景色が見えにくい時間です` : "";
  }
  // 予算の目安：記事の値段（場所ごとの目安の金額）を足して、100円単位にまるめる。交通費は入れない
  function budgetOf(stops) {
    let sum = 0, none = 0;
    stops.forEach((s) => { const p = spotById[s.spot].price; if (p == null) none++; else sum += p; });
    return { yen: Math.round(sum / 100) * 100, none, n: stops.length };
  }
  const budgetText = (b) => (b.yen ? `予算の目安 約${b.yen.toLocaleString()}円` : "予算の目安 0円（無料の場所だけ）");
  // 保存の下に出す予算の目安。電車などに乗るときは、交通費が別にかかることも書く
  function budgetLine(b, sch) {
    const ride = sch.some((s) => s.mode === "ride");
    const note = `記事の値段（入場・食事など）の合計${b.none ? `。${b.none}か所は値段の記録なし` : ""}${ride ? "。電車などの運賃は別" : ""}`;
    return `<div class="mk-budget">${IC.yen}<span><b>${budgetText(b)}</b><small>${note}</small></span></div>`;
  }
  // Google マップを開く小さなボタン（アイコン＋短い言葉）
  const gIcon = (href, label) => `<a class="g-ic" href="${href}" target="_blank" rel="noopener" title="Google マップで${esc(label)}を見る">${IC.pin}<span>${esc(label)}</span></a>`;
  // 予定表の行（つくる・組み直しで同じ）。≡ をつかんで上下にスライドすると入れ替わる。文字は減らしてアイコンで見せる
  function stopItems(d, sch) {
    const lk = lockN(d), rd = stage() === "redo" ? state.redo : null;
    // 組み直し：行けなかった場所（スキップ）は、動かせない行のすぐあとに出す
    const skipRow = rd && rd.skip ? `<div class="mk-stop skipped"><span class="mk-num">${rd.skip.num}</span><div class="mk-main"><b class="mk-name">${esc(spotById[rd.skip.spot].name)}</b><div class="mk-sub">${IC.closed}臨時休業のためスキップ</div></div></div>` : "";
    const rows = sch.map((s, i) => {
      const sp = spotById[s.spot];
      const prev = i > 0 && spotById[sch[i - 1].spot];
      const move = i > 0 ? `<div class="mk-move">${moveIcon(s)}<b>${s.walk}分</b>${modeTag(s)}<span>${R.fmt(sch[i - 1].depart)} → ${R.fmt(s.arrive)}</span>${gIcon(gmapLeg(prev, sp, s.mode), "経路")}</div>` : "";
      if (i < lk) { // いまいる場所・出てきた場所（動かせない）
        const left = rd && rd.kind !== "at", closed = rd && rd.kind === "at" && rd.closed;
        const sub = left ? `${IC.walk}${R.fmt(s.arrive)}に出た・ここから向かっています` : closed ? `${IC.closed}臨時休業でスキップ・ここから次へ` : `${IC.gps}${R.fmt(s.arrive)}–${R.fmt(s.depart)}・いまいる場所`;
        return `${move}<div class="mk-stop locked ${closed ? "skipped" : ""}"><span class="mk-num now">${numOf(d, i)}</span>
          <div class="mk-main"><b class="mk-name">${esc(sp.name)}</b><div class="mk-sub">${sub}</div></div></div>`;
      }
      const warn = stopWarn(sp, s);
      return `${i === lk ? skipRow : ""}${move}<div class="mk-stop ${warn ? "has-warn" : ""}">
        <button class="mk-num" data-mk="order" data-i="${i}" aria-label="順番を選ぶ">${numOf(d, i)}</button>
        <div class="mk-main">
          <b class="mk-name">${esc(sp.name)}</b>
          <div class="mk-line"><span class="mk-time">${R.fmt(s.arrive)}–${R.fmt(s.depart)}</span>
            <span class="mk-stay" title="滞在する時間">${IC.clock}<button data-mk="stay" data-i="${i}" data-d="-15" aria-label="15分短く">−</button><b>${stayText(s.stay)}</b><button data-mk="stay" data-i="${i}" data-d="15" aria-label="15分長く">＋</button></span></div>
          ${warn ? `<div class="mk-warn ${warn.startsWith("日の入り") ? "sunset" : ""}">${warn.startsWith("日の入り") ? IC.sun : IC.warn}<span>${esc(warn)}</span></div>` : ""}
          ${rd && s.pickWhy ? whyChips(s.pickWhy) : ""}
        </div>
        <div class="mk-side">
          <span class="mk-grip" aria-label="つかんで上下に動かすと順番が入れ替わります" title="つかんで上下に動かす">${ICON.grip}</span>
          <button data-mk="del" data-i="${i}" aria-label="外す" title="外す">${IC.x}</button>
        </div>
      </div>`;
    });
    return rows.join("") + (sch.length <= lk ? skipRow : "");
  }
  // いまの状況（臨時休業・雨・遅れ）をアイコンの小さな札で
  const condChips = () => [state.closed.length && [IC.closed, "休業"], state.rain && [IC.rain, "雨"], state.delay && [IC.delay, `${state.delay}分遅れ`]]
    .filter(Boolean).map(([i, l]) => `<span class="cond-chip">${i}${l}</span>`).join("");
  // 予定表の ≡ をつかんで並べ替えられるようにする
  function sortableStops(d) {
    const list = $("#sheet-body .mk-list");
    if (!list) return;
    makeSortable(list, { item: ".mk-stop", handle: ".mk-grip", lock: lockN(d), scroller: $("#sheet-body"), onDrop: (from, to) => {
      const [it] = d.stops.splice(from, 1); d.stops.splice(to, 0, it); d.dirty = true;
      renderSheet(); drawMap(false);
      toast(`${spotById[it.spot].name}を${numOf(d, to)}番にしました`);
    } });
  }
  function renderMakeSheet() {
    const d = state.draft, sch = schedule(d.start, d.stops), n = sch.length;
    const span = n ? `${R.fmt(sch[0].arrive)}–${R.fmt(sch[n - 1].depart)}` : "";
    $("#sheet-head").innerHTML = `<b>予定をつくる</b><small>${n ? `${n}か所・${span}` : "地図の場所を押して始める"}</small>`;
    if (!n) {
      $("#sheet-body").innerHTML = `<div class="mk-steps">
          <span>${IC.pin}<b>場所を押す</b></span><span class="arr">›</span><span><i class="mk-num">1</i><b>順に入る</b></span><span class="arr">›</span><span>${IC.save}<b>名前を付けて保存</b></span>
        </div>
        <div class="small mk-steps-note">もう一度押すと外れます。「読む」の記事の「つくる」から、書いた人のルートを入れることもできます。</div>`;
      return;
    }
    const chain = sch.map((s, i) => `<span class="chain-stop"><i>${i + 1}</i>${R.fmt(s.arrive)} ${esc(spotById[s.spot].name)}</span>`).join('<span class="chain-arrow">›</span>');
    const route = gmapRoute(sch.map((x) => spotById[x.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking");
    $("#sheet-body").innerHTML = `<div class="chain">${chain}</div>
      <div class="mk-bar">
        <label class="mk-start" title="出発の時刻">${IC.clock}<span>出発</span><input type="time" class="time-in" id="mk-start" value="${R.fmt(d.start)}" step="300"></label>
        <a class="tool-btn" href="${route}" target="_blank" rel="noopener" title="この順番で Google マップを開く">${IC.pin}<span>Google</span></a>
        <button class="tool-btn" data-mk="new" title="新しくつくる（空にする）">${IC.trash}<span>空にする</span></button>
      </div>
      <div class="mk-list">${stopItems(d, sch)}</div>
      <div class="mk-tip">${ICON.grip}をつかむか、地図の番号を長押しで並べ替え</div>
      ${d.from ? `<div class="mk-tip">元の記事：${esc(recById[d.from].title)}</div>` : ""}
      <div class="mk-save"><input class="field" id="mk-name" placeholder="予定の名前" value="${esc(d.name)}" aria-label="予定の名前"><button class="btn primary" data-mk="save">${IC.save}${d.id ? "上書き" : "保存"}</button></div>
      ${budgetLine(budgetOf(d.stops), sch)}
      ${d.id && !d.dirty ? `<div class="saved-note">${IC.check}<span>保存しました</span><button class="link-btn" data-mk="follow">${IC.route}この予定をたどる</button></div>` : ""}`;
    sortableStops(d);
  }

  /* 組み直し（自分で選ぶ）：いまいる場所のあとを、つくると同じように地図で選び直す */
  function renderRedoSheet() {
    const rd = state.redo, d = rd.d, lk = lockN(d), sch = schedule(d.start, d.stops), n = sch.length - lk;
    const left = state.premium ? "無制限" : `残り${V.rebuildsLeft}回`;
    const canAuto = state.premium || V.rebuildsLeft > 0;
    const note = rd.auto
      ? (state.premium ? "有料会員：おまかせは無制限" : `おまかせを使ったので、この予定にすると今月の残りは${V.rebuildsLeft - 1}回（無料は月5回）`)
      : "自分で選ぶ組み直しは、回数に数えません";
    // 次に押した場所が入る番号（いまの場所のすぐあと。続けて押すと、その次）
    const ins = Math.min(Math.max(d.ins == null ? lk : d.ins, lk), d.stops.length);
    $("#sheet-head").innerHTML = `<b>組み直す</b><small>${n ? `このあと${n}か所・〜${R.fmt(sch[sch.length - 1].depart)}` : "このあとの予定がありません"}</small>`;
    $("#sheet-body").innerHTML = `<div class="redo-hint">${IC.pin}<span>地図の場所を押すと <i class="mk-num">${numOf(d, ins)}</i> に入ります</span>${condChips()}</div>
      <div class="redo-act">
        <button class="btn accent" data-mk="redo-apply" ${n ? "" : "disabled"}>${IC.check}この予定にする</button>
        <button class="btn ghost small" data-mk="redo-auto" ${canAuto ? "" : "disabled"} title="趣味の合う人の記録で並べ直す">${IC.spark}おまかせ<small>${left}</small></button>
        <button class="btn ghost small only-ic" data-mk="redo-cancel" aria-label="やめる" title="やめる">${IC.x}</button>
      </div>
      <div class="redo-note">${note}</div>
      <div class="mk-list">${stopItems(d, sch)}</div>
      ${n ? `<div class="mk-gmap">${gLink(gmapRoute(sch.map((x) => spotById[x.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking"), "この順番で Google マップを開く")}</div>` : `<div class="empty" style="padding:14px 0">地図の場所を押して、このあと行く場所を入れてください。</div>`}`;
    sortableStops(d);
  }

  /* たどる：保存した予定の一覧 → 選ぶと、その予定の時間割・組み直し */
  function renderFollowSheet() {
    if (state.followList || !state.plan) {
      $("#sheet-head").innerHTML = `<b>たどる</b><small>保存した予定 ${state.plans.length}件</small>`;
      if (!state.plans.length) {
        $("#sheet-body").innerHTML = `<div class="empty">まだ保存した予定がありません。<br>「つくる」で場所をつなげて、名前を付けて保存すると、ここから選べます。<br><br><button class="btn primary" data-fl="make">つくるへ</button></div>`;
        return;
      }
      $("#sheet-body").innerHTML = `<div class="section-label">たどる予定を選んでください</div>` + state.plans.map((p) => {
        const sch = schedule(p.start, p.stops), on = state.plan && state.plan.planId === p.id;
        return `<div class="plan-card ${on ? "on" : ""}" data-fl="pick" data-id="${p.id}">
          <div class="row-between"><b class="pn">${esc(p.name)}</b>${on ? '<span class="badge fav">たどっている途中</span>' : ""}</div>
          <div class="meta"><span>${IC.pin}${p.stops.length}か所</span><span>${IC.clock}${R.fmt(sch[0].arrive)}–${R.fmt(sch[sch.length - 1].depart)}</span><span title="記事の値段の合計（交通費は別）">${IC.yen}${budgetText(p.budget || budgetOf(p.stops)).replace("予算の目安 ", "")}</span></div>
          <div class="small chain-text">${p.stops.map((s, i) => `${i + 1} ${esc(spotById[s.spot].name)}`).join(" › ")}</div>
          <div class="row"><button class="btn small accent" data-fl="pick" data-id="${p.id}">${IC.route}${on ? "続きから" : "たどる"}</button><button class="mini-btn" data-fl="edit" data-id="${p.id}" title="つくるで直す">${IC.edit}直す</button><button class="mini-btn danger only-ic" data-fl="del" data-id="${p.id}" aria-label="消す" title="消す">${IC.trash}</button></div>
        </div>`;
      }).join("");
      return;
    }
    const pl = state.plan, ph = pl.phase, cur = pl.stops[pl.cur], curSp = spotById[cur.spot];
    const fromSp = pl.from && spotById[pl.from];
    // いまの状態：いる（ついた）／移動中（でた〜次の ついた）／全部まわった
    let status;
    if (ph === "at") status = `<div class="fl-status at">${IC.gps}<span><small>いまここ</small><b><i>${pl.cur + 1}</i>${esc(curSp.name)}</b></span><em>〜${R.fmt(cur.depart)}</em></div>`;
    else if (ph === "go") status = `<div class="fl-status go">${moveIcon(cur)}<span><small>移動中${fromSp ? `（${modeName(cur)}）・${esc(fromSp.name)}から` : ""}</small><b><i>${pl.cur + 1}</i>${esc(curSp.name)}</b></span><em>${R.fmt(cur.arrive)}着</em>${gIcon(fromSp ? gmapLeg(fromSp, curSp, cur.mode) : gmapPlace(curSp), "経路")}</div>`;
    else status = `<div class="fl-status end">${IC.flag}<span><small>おつかれさまでした</small><b>予定の場所をすべてまわりました</b></span><button class="btn small primary" data-act="write">${IC.edit}記事を書く</button></div>`;
    // 起きたこと（アイコンで押したもの）。移動中なら、次に行く場所のこととして出す
    const alerts = [];
    if (ph !== "end" && state.closed.includes(cur.spot)) alerts.push([IC.closed, `<b>${pl.cur + 1} ${esc(curSp.name)}は臨時休業</b>組み直すと、ここはスキップして次の場所を選べます`]);
    const outdoor = pl.stops.filter((s, i) => i >= pl.cur && live(s) && !spotById[s.spot].indoor).length;
    if (state.rain && !state.rainHandled) alerts.push([IC.rain, `<b>雨が降り出しました</b>${outdoor ? `このあと屋外の場所が${outdoor}か所あります` : "このあとの場所は屋内です"}`]);
    if (state.delay) alerts.push([IC.delay, `<b>${state.delay}分遅れています</b>閉まる時間に間に合うように並べ直せます`]);
    const left = state.premium ? "無制限" : `残り${V.rebuildsLeft}回`;
    const canRebuild = state.premium || V.rebuildsLeft > 0;
    const redo = ph === "end" ? "" : `<div class="fl-redo ${alerts.length ? "hot" : ""}">
        ${canRebuild ? `<button class="fl-rb auto" data-act="rebuild">${IC.spark}<span><b>おまかせ</b><small>${left}</small></span></button>` : `<button class="fl-rb auto" data-act="premium">${IC.spark}<span><b>有料会員に</b><small>無制限・初月無料</small></span></button>`}
        <button class="fl-rb self" data-fl="redo">${IC.pin}<span><b>自分で選ぶ</b><small>いつでも無料</small></span></button>
      </div>`;
    // 時間割。場所ごとに「ついた」「でた」。でたあと次の場所に ついた を押すまでは、そのあいだを「移動中」で強調する
    const items = pl.stops.map((s, i) => {
      const sp = spotById[s.spot], st = flState(pl, i);
      const moving = st === "go" && !!fromSp;
      let leg = "";
      if (i > 0 && st !== "skip" && s.arrive != null) {
        const a = moving ? fromSp : spotById[pl.stops[i - 1].spot];
        const fromName = moving ? fromSp.name : s.walkFrom;
        leg = `<div class="tl-item tl-leg ${moving ? "moving" : st === "done" || st === "at" ? "past" : ""}"><div class="tl-time"></div><div class="tl-line"></div>
          <div class="tl-walk">${moveIcon(s)}${moving ? "<b>移動中</b>" : ""}<b class="tl-min">${s.walk}分</b>${modeTag(s)}${fromName ? `<span>${esc(fromName)}から</span>` : ""}${gIcon(gmapLeg(a, sp, s.mode), "経路")}</div></div>`;
      }
      const ch = { replaced: "組み直し", shifted: "時間がずれた", shortened: "短く" }[s.status];
      const badge = { at: '<span class="tl-badge at">いまここ</span>', go: '<span class="tl-badge go">ここに行く</span>', skip: `<span class="tl-badge skip">スキップ${s.reason ? "・" + esc(s.reason) : ""}</span>` }[st] || "";
      const open = st === "at" || st === "go" || st === "todo";
      const flags = (open && state.closed.includes(s.spot) ? `<span class="tl-flag">${IC.closed}休業</span>` : "")
        + (open && state.rain && !state.rainHandled && !sp.indoor ? `<span class="tl-flag">${IC.rain}屋外</span>` : "");
      const arrived = st === "done" || st === "at", left2 = st === "done";
      const ad = st === "skip" ? "" : `<div class="tl-ad" role="group" aria-label="${i + 1} ${esc(sp.name)}">
          <button data-fl="arrive" data-i="${i}" class="${arrived ? "on" : ""} ${st === "go" ? "next" : ""}" aria-pressed="${arrived}">${arrived ? IC.check : ""}ついた</button>
          <button data-fl="leave" data-i="${i}" class="${left2 ? "on" : ""} ${st === "at" ? "next" : ""}" aria-pressed="${left2}">${left2 ? IC.check : ""}でた</button>
        </div>`;
      return `${leg}<div class="tl-item"><div class="tl-time">${s.arrive != null ? R.fmt(s.arrive) : "—"}</div><div class="tl-line"><span class="tl-dot ${st}"></span></div>
        <div class="tl-card ${st} ${s.status === "replaced" ? "replaced" : ""}">
          <div class="tl-head"><b><i class="tl-no">${i + 1}</i><span>${esc(sp.name)}</span></b>${badge}</div>
          <div class="tl-sub">${ioText(sp)}・${stayText(s.stay)}${ch ? `<span class="change ${s.status}">${ch}</span>` : ""}${flags}</div>
          ${s.replacedFrom ? `<div class="tl-sub">${esc(spotById[s.replacedFrom].name)}の代わり</div>` : ""}
          ${s.pickWhy && st !== "skip" ? whyChips(s.pickWhy) : ""}
          ${ad}
        </div></div>`;
    }).join("");
    // 右に縦に並べたアイコン：押すと「いま選んでいる場所（移動中なら次に行く場所）で、それが起きた」ことにする（デモ。本番は位置情報と天気で自動）
    const rail = `<div class="fl-rail" role="group" aria-label="デモ：${ph === "end" ? "" : pl.cur + 1 + "で"}起きたこと">
        <div class="rail-head"><small>デモ</small>${ph === "end" ? "" : `<i title="${esc(curSp.name)}">${pl.cur + 1}</i><small>で</small>`}</div>
        <button class="rail-btn ${ph !== "end" && state.closed.includes(cur.spot) ? "on" : ""}" data-act="d-closed" ${ph === "end" ? "disabled" : ""} title="臨時休業だった">${IC.closed}<small>休業</small></button>
        <button class="rail-btn ${state.rain ? "on" : ""}" data-act="d-rain" title="雨が降り出した">${IC.rain}<small>雨</small></button>
        <button class="rail-btn ${state.delay ? "on" : ""}" data-act="d-delay" title="30分遅れている">${IC.delay}<small>遅れ</small></button>
        <button class="rail-btn" data-act="d-reset" title="最初に戻す">${IC.reset}<small>最初</small></button>
      </div>`;
    $("#sheet-head").innerHTML = `<b>${esc(pl.title)}</b><button class="head-btn" data-fl="list" title="ほかの予定を選ぶ">${IC.list}<span>一覧</span></button>`;
    $("#sheet-body").innerHTML = `<div class="fl-wrap"><div class="fl-main">
        ${status}
        ${alerts.map(([i, t]) => `<div class="fl-alert">${i}<span>${t}</span></div>`).join("")}
        ${redo}
        <div class="timeline">${items}</div>
        <div class="fl-gps">${IC.gps}<span>ついた・でたは、本番では位置情報で自動で切り替わります</span></div>
      </div>${rail}</div>`;
  }

  function setSheet(s, remember = true) {
    const el = $("#sheet"); el.classList.remove("peek", "half", "full"); el.classList.add(s);
    if (remember) state.sheetBy[stage()] = s;
    clearTimeout(setSheet._t); setSheet._t = setTimeout(refreshBubbles, 320);
  }
  /* 下のシートを指で動かす：引っぱっている間は指についてきて、離すと近い高さ（勢いがあればその向き）に止まる
     - つまみ・見出し：どの高さでも引っぱれる（軽く押すだけなら、つまみは高さを切り替え、見出しは半分まで開く）
     - 中身：いちばん上までスクロールしているときの下向きと、全部開いていないときの上向きは、シートが動く */
  function initSheet() {
    sheetDrag({
      el: $("#sheet"), handle: $("#sheet-handle"), head: $("#sheet-head"), body: $("#sheet-body"),
      snaps: () => { const h = $("#view-map").clientHeight; return { peek: 132, half: h * 0.52, full: h - 100 }; },
      onSnap: (next) => { setSheet(next); if (stage() === "explore") scheduleArea(350); },
    });
  }
  // 引き出すシートの動き（探す・予定の地図と、自分のマップで同じものを使う）。onSnap(高さ) で止める高さを決める
  function sheetDrag({ el, handle, head, body, snaps, onSnap }) {
    const order = ["peek", "half", "full"];
    const cur = () => order.find((s) => el.classList.contains(s));
    let drag = null, raf = 0;
    // 引っぱっている間は、ページのどこの文字も選択されないようにする（マウスで引っぱったとき、通った所が選択されてしまうため）
    const noSelect = (on) => {
      document.documentElement.classList.toggle("sheet-dragging", on);
      if (on) { const s = window.getSelection && window.getSelection(); if (s && s.rangeCount) s.removeAllRanges(); }
    };
    const begin = (y) => { drag = { y0: y, h0: el.getBoundingClientRect().height, y: y, t: performance.now(), v: 0, moved: false }; };
    const follow = (y) => {
      if (!drag) return false;
      if (!drag.moved) {
        if (Math.abs(y - drag.y0) < 6) return false;
        drag.moved = true; drag.y0 = y; el.classList.add("dragging"); noSelect(true);
      }
      const now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.v = 0.7 * ((drag.y - y) / dt) + 0.3 * drag.v; // 上向きが正（px/ms）
      drag.y = y; drag.t = now;
      const s = snaps();
      let h = drag.h0 + (drag.y0 - y);
      if (h < s.peek) h = s.peek - (s.peek - h) * 0.3; // 端では少しだけ動く
      if (h > s.full) h = s.full + (h - s.full) * 0.3;
      drag.h = h;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.height = h + "px"; });
      return true;
    };
    const finish = () => {
      if (!drag) return null;
      const d = drag; drag = null;
      if (!d.moved) return "tap";
      noSelect(false);
      cancelAnimationFrame(raf);
      const s = snaps(), h = d.h != null ? d.h : el.getBoundingClientRect().height; // 画面に出る前の最後の位置も使う
      if (performance.now() - d.t > 120) d.v = 0; // 止めてから離したときは勢いなし
      const aim = h + d.v * 220;
      const next = order.reduce((a, b) => (Math.abs(s[b] - aim) < Math.abs(s[a] - aim) ? b : a), "peek");
      el.classList.remove("dragging");
      el.style.height = "";
      onSnap(next);
      return "drag";
    };

    // つまみ・見出し（マウスでも指でも）
    [handle, head].forEach((zone) => {
      zone.addEventListener("pointerdown", (e) => {
        if (e.button > 0 || e.target.closest("a,button,input")) return;
        if (e.pointerType === "mouse") e.preventDefault(); // マウスで押したところから文字の選択が始まらないように
        begin(e.clientY); zone._pid = e.pointerId;
      });
      zone.addEventListener("pointermove", (e) => {
        if (!drag || zone._pid !== e.pointerId) return;
        if (follow(e.clientY) && !zone.hasPointerCapture(e.pointerId)) { try { zone.setPointerCapture(e.pointerId); } catch (err) { /* そのままでも動く */ } }
      });
      const up = (e) => {
        if (zone._pid !== e.pointerId) return;
        zone._pid = null;
        const r = finish();
        if (r === "tap" && e.type === "pointerup") {
          if (zone === handle) onSnap(order[(order.indexOf(cur()) + 1) % 3]);
          else if (cur() === "peek") onSnap("half");
        }
      };
      zone.addEventListener("pointerup", up);
      zone.addEventListener("pointercancel", up);
    });

    // 中身（指だけ）。スクロールとシートの移動を、動かし始めの向きで決める
    let tb = null;
    body.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1 || e.target.closest("input,textarea,select,.mk-grip,.mm-photos,.mv-gal")) { tb = null; return; } // ≡ は並べ替え、写真の列は横に流す
      tb = { y: e.touches[0].clientY, mode: null };
    }, { passive: true });
    body.addEventListener("touchmove", (e) => {
      if (!tb) return;
      const y = e.touches[0].clientY, dy = y - tb.y;
      if (!tb.mode) {
        if (Math.abs(dy) < 6) return;
        const up = dy < 0;
        tb.mode = (up && cur() !== "full") || (!up && body.scrollTop <= 0) ? "sheet" : "scroll";
        if (tb.mode === "sheet") begin(tb.y);
      }
      if (tb.mode === "sheet") { e.preventDefault(); follow(y); }
    }, { passive: false });
    const tend = () => { if (tb && tb.mode === "sheet") finish(); tb = null; };
    body.addEventListener("touchend", tend);
    body.addEventListener("touchcancel", tend);

    // 中身（マウス）。指と同じ決め方で、シートを引っぱれるようにする（文字は選択しない）
    const skipSel = "a,button,input,textarea,select,label,[contenteditable],.mk-grip,.mm-photos,.mv-gal";
    let mb = null;
    body.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest(skipSel)) { mb = null; return; }
      e.preventDefault();
      mb = { y: e.clientY, id: e.pointerId, mode: null };
    });
    body.addEventListener("pointermove", (e) => {
      if (!mb || e.pointerId !== mb.id) return;
      const dy = e.clientY - mb.y;
      if (!mb.mode) {
        if (Math.abs(dy) < 6) return;
        const up = dy < 0;
        mb.mode = (up && cur() !== "full") || (!up && body.scrollTop <= 0) ? "sheet" : "none";
        if (mb.mode === "sheet") { begin(mb.y); try { body.setPointerCapture(e.pointerId); } catch (err) { /* そのままでも動く */ } }
      }
      if (mb.mode === "sheet") follow(e.clientY);
    });
    const mend = (e) => {
      if (!mb || e.pointerId !== mb.id) return;
      if (mb.mode === "sheet") {
        finish();
        // 引っぱり終わりのクリックで、カードなどが開かないように
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
      }
      mb = null;
    };
    body.addEventListener("pointerup", mend);
    body.addEventListener("pointercancel", mend);
  }

  /* ---------- つくる ---------- */
  function toggleDraftSpot(spotId) {
    const d = ed(), i = d.stops.findIndex((s) => s.spot === spotId), sp = spotById[spotId];
    if (i >= 0 && i < lockN(d)) { toast(`${lockLabel()}は外せません`); return; }
    const redo = stage() === "redo";
    if (i >= 0) {
      d.stops.splice(i, 1);
      if (redo && d.ins != null && i < d.ins) d.ins--;
      toast(`${sp.name}を予定から外しました`);
    } else if (redo) {
      // 組み直し：いまの場所のすぐあとに入れる（あとの予定の番号は1つずつ増える）。続けて押すと、その次に入る
      const at = Math.min(Math.max(d.ins == null ? lockN(d) : d.ins, lockN(d)), d.stops.length);
      d.stops.splice(at, 0, { spot: spotId, stay: defaultStay(sp) });
      d.ins = at + 1;
      toast(`${numOf(d, at)} に入れました：${sp.name}`);
    } else {
      d.stops.push({ spot: spotId, stay: defaultStay(sp) });
      toast(`${numOf(d, d.stops.length - 1)}　${sp.name}を予定に入れました`);
    }
    d.dirty = true;
    drawMap(false); renderSheet();
  }
  // 記事から予定をつくる。how = "replace"（書いた人のルートで始める）/ "append"（つくっている予定の後ろに足す）
  function useRecord(recId, how) {
    const r = recById[recId], w = writerById[r.writer];
    const add = r.spots.map((s) => ({ spot: s.spot, stay: s.stay || defaultStay(spotById[s.spot]) }));
    const d = ed();
    if (how === "append") {
      const have = new Set(d.stops.map((s) => s.spot));
      if (stage() === "redo") redoUsed().forEach((id) => have.add(id));
      const fresh = add.filter((a) => !have.has(a.spot));
      if (!fresh.length) { toast("もう予定に入っています"); return; }
      d.stops.push(...fresh); d.dirty = true;
      toast(`${fresh.length}か所を予定の後ろに足しました`);
    } else {
      if (d.stops.length && d.dirty && !confirm("つくりかけの予定を、この記事のルートで置き換えますか？")) return;
      state.draft = newDraft({ name: r.type === "route" ? r.title : "", start: R.toMin(r.start || "10:00"), stops: add, from: r.id });
      toast(`${w.name}さんの${r.type === "route" ? "ルート" : "場所"}を入れました`);
    }
    if (!(how === "append" && stage() === "redo")) state.planMode = "make";
    state.fitNext = true;
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
    // 保存するときに、記事の値段から予算の目安を出して、予定といっしょに残す
    const budget = budgetOf(d.stops);
    const plan = { id: d.id || "p" + Date.now(), name: d.name.trim(), start: d.start, stops: d.stops.map((s) => ({ ...s })), from: d.from, budget };
    const i = state.plans.findIndex((p) => p.id === plan.id);
    if (i >= 0) state.plans[i] = plan; else state.plans.unshift(plan);
    // たどっている途中の予定を直したときは、たどる側も新しい予定にする
    if (state.plan && state.plan.planId === plan.id) state.plan = null;
    d.id = plan.id; d.dirty = false;
    toast(`${i >= 0 ? "上書き保存しました" : "保存しました"}。${budgetText(budget)}`);
    renderSheet();
  }
  function onMake(t) {
    const d = ed(), mk = t.dataset.mk, i = Number(t.dataset.i);
    if (mk === "redo-apply") return applyRedo();
    if (mk === "redo-cancel") return closeRedo("組み直しをやめました");
    if (mk === "redo-auto") return autoRedo();
    if (i < lockN(d)) return; // いまいる場所は動かせない
    if (mk === "save") return saveDraft();
    if (mk === "expand") return setSheet("full");
    if (mk === "order") return openOrderPicker(i);
    if (mk === "follow") return startFollow(d.id);
    if (mk === "new") {
      if (d.dirty && d.stops.length && !confirm("つくりかけの予定を消して、新しくつくりますか？")) return;
      state.draft = newDraft(); renderSheet(); drawMap(false); return;
    }
    if (mk === "stay") d.stops[i].stay = Math.min(360, Math.max(15, d.stops[i].stay + Number(t.dataset.d)));
    if (mk === "up" && i > 0) [d.stops[i - 1], d.stops[i]] = [d.stops[i], d.stops[i - 1]];
    if (mk === "down" && i < d.stops.length - 1) [d.stops[i + 1], d.stops[i]] = [d.stops[i], d.stops[i + 1]];
    if (mk === "del") {
      toast(`${spotById[d.stops[i].spot].name}を予定から外しました`); d.stops.splice(i, 1);
      if (d.ins != null && i < d.ins) d.ins--;
    }
    d.dirty = true;
    renderSheet();
    if (mk !== "stay") drawMap(false);
  }

  /* ---------- たどる ---------- */
  function startFollow(planId, reset) {
    const p = state.plans.find((x) => x.id === planId);
    if (!p) return;
    if (reset || !state.plan || state.plan.planId !== planId) {
      // はじめは 1 に向かっているところから（着いたら「ついた」を押す。本番は位置情報で自動）
      state.plan = { planId, title: p.name, stops: schedule(p.start, p.stops), cur: 0, phase: "go", from: null };
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
    if (fl === "arrive") flArrive(Number(t.dataset.i));
    if (fl === "leave") flLeave(Number(t.dataset.i));
    if (fl === "redo") openRedo(null);
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
    if (act === "write") return openWrite(true);
    if (act === "d-reset") return startFollow(pl.planId, true);
    if (act === "rebuild") return doRebuild();
    if (act === "premium") { state.premium = true; toast("デモ：有料会員（初月無料）になりました"); renderSheet(); return; }
    // デモのアイコン：いま選んでいる場所（移動中なら次に行く場所）で起きたことにする。もう一度押すと取り消す
    const where = `${pl.cur + 1} ${spotById[cur.spot].name}`;
    if (act === "d-closed") {
      if (pl.phase === "end") return;
      const i = state.closed.indexOf(cur.spot);
      if (i >= 0) { state.closed.splice(i, 1); toast(`${where}：休業を取り消しました`); }
      else { state.closed.push(cur.spot); toast(`${where}：臨時休業にしました`); }
    }
    if (act === "d-rain") { state.rain = !state.rain; state.rainHandled = false; toast(state.rain ? `${where}で雨が降り出しました` : "雨をやめました"); }
    if (act === "d-delay") { state.delay = state.delay ? 0 : 30; toast(state.delay ? `${where}：30分遅れにしました` : "遅れをなくしました"); }
    renderSheet(); drawMap(false);
    // 起きたことと組み直しのボタンが見えるように
    if ($("#sheet").classList.contains("peek")) setSheet("half");
    $("#sheet-body").scrollTo({ top: 0, behavior: "smooth" });
  }
  // ついた：その場所にいることにする（本番は位置情報で自動）
  function flArrive(i) {
    const pl = state.plan, s = pl && pl.stops[i];
    if (!live(s)) return;
    if (pl.cur === i && pl.phase === "at") { toast("いまここにいます"); return; }
    pl.cur = i; pl.phase = "at";
    renderSheet(); drawMap(false);
    toast(`${i + 1}　${spotById[s.spot].name}に着きました`);
  }
  // でた：次の場所へ向かっていることにする。次の場所に「ついた」を押すまで、そのあいだの道を強調する
  function flLeave(i) {
    const pl = state.plan, s = pl && pl.stops[i];
    if (!live(s)) return;
    const n = nextLive(pl, i);
    if (pl.from === s.spot && (n >= 0 ? pl.cur === n && pl.phase === "go" : pl.phase === "end")) { toast("もう出ています"); return; }
    pl.from = s.spot;
    if (n < 0) { pl.cur = i; pl.phase = "end"; toast("最後の場所を出ました。おつかれさまでした"); }
    else { pl.cur = n; pl.phase = "go"; toast(`${i + 1} を出ました。${n + 1}　${spotById[pl.stops[n].spot].name}へ`); }
    renderSheet(); drawMap(false);
    if (map && n >= 0) fitTo([spotLL(s.spot), spotLL(pl.stops[n].spot)]); // いま歩いている道が見えるように
  }

  /* 組み直し（自分で選ぶ）：いまの場所のあとを、つくると同じ地図で選び直す。押した場所は「いまの場所のすぐあと」に入る
     - at（ついた）：いる場所を先頭に固定。臨時休業なら、そこはスキップして（番号はそのまま）次の番号から選ぶ
     - go（移動中）：出てきた場所を先頭に固定し、向かっている場所から選び直す。向かっている場所が臨時休業ならスキップ
     - end（全部まわった）：最後の場所のあとに足す
     prefill：おまかせの結果から始めるときは { stops, fromIndex }。null なら、いまの予定の残りから始める */
  function openRedo(prefill) {
    const pl = state.plan;
    if (!pl) return;
    const kind = pl.phase, cur = pl.stops[pl.cur], delay = state.delay || 0;
    const closed = kind !== "end" && state.closed.includes(cur.spot);
    let lock = [], nums = [], start, restFrom, keep, first, doneTo, skip = null;
    if (kind === "at") {
      const stay = cur.depart != null && cur.arrive != null ? cur.depart - cur.arrive : cur.stay;
      lock = [{ spot: cur.spot, stay: closed ? 0 : stay }]; nums = [pl.cur + 1];
      start = (cur.arrive != null ? cur.arrive : 600) + delay;
      restFrom = pl.cur + 1; keep = pl.cur; first = pl.cur + 2; doneTo = pl.cur;
    } else if (kind === "go") {
      const p = prevLive(pl, pl.cur);
      if (p >= 0) { lock = [{ spot: pl.stops[p].spot, stay: 0 }]; nums = [p + 1]; start = pl.stops[p].depart + delay; doneTo = p; }
      else { start = (cur.arrive != null ? cur.arrive : 600) + delay; doneTo = 0; }
      keep = pl.cur;
      if (closed) { skip = { spot: cur.spot, num: pl.cur + 1 }; restFrom = pl.cur + 1; first = pl.cur + 2; }
      else { restFrom = pl.cur; first = pl.cur + 1; }
    } else {
      const last = pl.stops[pl.cur];
      lock = [{ spot: last.spot, stay: 0 }]; nums = [pl.cur + 1];
      start = last.depart + delay; restFrom = keep = pl.stops.length; first = pl.stops.length + 1; doneTo = pl.cur;
    }
    const not = new Set([...lock.map((l) => l.spot), ...(skip ? [skip.spot] : [])]);
    const picked = (prefill ? prefill.stops.slice(prefill.fromIndex) : pl.stops.slice(restFrom)).filter((s) => live(s) && !not.has(s.spot));
    const rest = picked.map((s) => (s.pickWhy ? { spot: s.spot, stay: s.stay, pickWhy: s.pickWhy, replacedFrom: s.replacedFrom } : { spot: s.spot, stay: s.stay }));
    // おまかせの結果は「開くまで待つ」時間を含む。待つ分は、ひとつ前の場所に長くいることにする
    if (prefill) {
      let prevDepart = start + lock.reduce((a, l) => a + l.stay, 0);
      picked.forEach((s, k) => {
        const gap = s.arrive != null ? s.arrive - s.walk - prevDepart : 0;
        if (gap > 0) { const t = k === 0 ? lock[lock.length - 1] : rest[k - 1]; if (t) t.stay += gap; else start += gap; }
        if (s.depart != null) prevDepart = s.depart;
      });
    }
    state.redo = {
      d: { start, stops: [...lock, ...rest], lockN: lock.length, nums, first, ins: lock.length, dirty: false },
      kind, closed, closedName: closed ? spotById[cur.spot].name : null, keep, skip, auto: !!prefill,
      done: pl.stops.slice(0, doneTo).map((s, i) => ({ spot: s.spot, num: i + 1, ok: live(s) })).filter((x) => x.ok),
    };
    state.planMode = "redo"; state.fitNext = true; state.sheetBy.redo = "half";
    switchView("plan");
    if (!prefill) toast(closed ? `${pl.cur + 1} はスキップします。地図の場所を押すと ${first} に入ります` : `地図の場所を押すと ${first} に入ります`);
  }
  // おまかせ：いま選んでいる場所を、趣味の合う人の記録で直した結果を入れる（臨時休業・雨・営業時間）
  function autoRedo() {
    if (!state.premium && V.rebuildsLeft <= 0) { toast("今月のおまかせは使い切りました"); return; }
    const pl = state.plan, rd = state.redo, d = rd.d, sch = schedule(d.start, d.stops), lk = lockN(d);
    let base;
    if (rd.kind === "at") base = [...pl.stops.slice(0, pl.cur + 1), ...sch.slice(1)];
    else if (rd.kind === "go") base = [...pl.stops.slice(0, pl.cur), ...(rd.closed ? [pl.stops[pl.cur]] : []), ...sch.slice(lk)];
    else { toast("おまかせは、まわっている途中で使えます"); return; }
    const pd = rebuildResult(base);
    if (!pd) return;
    openRedo({ stops: pd.result, fromIndex: pd.fromIndex });
    toast("趣味の合う人の記録で並べ直しました。ここからさらに直せます");
  }
  function closeRedo(msg) {
    state.redo = null; state.planMode = "follow"; state.followList = false;
    switchView("plan");
    if (msg) toast(msg);
  }
  // 選んだ予定にする：いまの場所までは残し、そのあとを入れ替える。行けなかった場所は消さずに「スキップ」で残す
  function applyRedo() {
    const pl = state.plan, rd = state.redo;
    if (!pl || !rd) return;
    const d = rd.d, lk = lockN(d), sch = schedule(d.start, d.stops), picks = sch.slice(lk);
    if (!picks.length) { toast("このあと行く場所を入れてください"); return; }
    const before = {};
    pl.stops.slice(rd.keep).forEach((s) => { if (live(s) && s.arrive != null) before[s.spot] = s.arrive; });
    const stops = pl.stops.slice(0, rd.keep).map((s) => ({ ...s }));
    const cur = pl.stops[pl.cur], skippedNum = rd.closed ? pl.cur + 1 : null;
    const drop = () => stops.push({ ...cur, status: "dropped", reason: "臨時休業", arrive: null, depart: null });
    if (rd.kind === "at") {
      if (rd.closed) drop();
      else stops.push({ ...cur, arrive: sch[0].arrive, depart: sch[0].depart, stay: sch[0].stay, status: sch[0].arrive !== cur.arrive ? "shifted" : cur.status });
    } else if (rd.kind === "go" && rd.closed) drop();
    const firstNew = stops.length;
    picks.forEach((s, k) => {
      const was = before[s.spot];
      const status = was == null ? "replaced" : Math.abs(was - s.arrive) >= 5 ? "shifted" : "planned";
      stops.push({ ...s, status, walkFrom: k === 0 && rd.kind === "at" && rd.closed ? rd.closedName : null, before: was != null ? { arrive: was } : null });
    });
    pl.stops = stops;
    // いる場所がそのままなら「いまここ」のまま。スキップしたとき・全部まわったあとに足したときは、次の場所へ向かっていることにする
    if (!(rd.kind === "at" && !rd.closed)) {
      if (rd.kind !== "go") pl.from = cur.spot;
      pl.cur = firstNew; pl.phase = "go";
    }
    if (rd.auto && !state.premium) V.rebuildsLeft = Math.max(0, V.rebuildsLeft - 1);
    if (state.rain) state.rainHandled = true;
    state.delay = 0; state.pending = null;
    closeRedo(skippedNum ? `${skippedNum} はスキップ。${firstNew + 1} ${spotById[stops[firstNew].spot].name}へ向かいます` : "新しい予定にしました");
  }

  /* ---------- 重なる画面（記事・書き手・組み直し） ---------- */
  const stack = [];
  let panelMaps = [];
  function showPanel(render) { stack.push(render); paint(); }
  function paint() {
    panelMaps.forEach((m) => m.remove()); panelMaps = [];
    const p = $("#panel");
    if (!stack.length) { p.classList.remove("open"); setTimeout(() => { if (!stack.length) { p.innerHTML = ""; p.classList.remove("cover-tabs"); } }, 260); return; }
    const top = stack[stack.length - 1];
    p.classList.toggle("cover-tabs", !!top.coverTabs); // 書く画面は、下のタブも隠して画面いっぱいに
    top(p);
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

  // 記事・書き手の小さな地図（2本指で動かせる）。オフラインのときは、この地図の所にだけお知らせが出る
  function miniMap(id, spots, numbered, color) {
    const el = document.getElementById(id);
    const pts = spots.map((s) => [s.lat, s.lng]);
    GM.create(el, { center: pts[0] || OMIYA, zoom: pts.length ? 15 : 12, gesture: "cooperative" }).then((m) => {
      if (!m) return;
      panelMaps.push(m);
      const g = m.group();
      if (numbered && pts.length > 1) g.line(pts, { color: color || "#E86B45", weight: 4, opacity: 0.85 });
      spots.forEach((s, i) => g.marker([s.lat, s.lng], { ...divPin(s.mine ? "mine" : "fav", numbered ? String(i + 1) : "", s.mine ? "" : `background:${color || "#123D2B"}`), title: s.name }));
      if (pts.length > 1) m.fit(pts, { pad: 0.2, maxZoom: 17 });
    });
  }

  function openArticle(id) { showPanel((p) => renderArticle(p, id)); }
  function renderArticle(p, id) {
    const r = recById[id], w = writerById[r.writer], fk = favKind(w.id, r);
    const isMember = V.memberships.includes(w.id);
    const favBtn = w.official ? "" : `<button class="btn small ${fk === "fav" ? "lime" : "ghost"}" id="fav-btn">${fk === "fav" ? "お気に入り中" : "お気に入りに入れる"}</button>`;
    // ルートの記事は、場所のあいだの移動も出す
    const sch = r.type === "route" ? R.buildSchedule(D, { start: r.start, spots: r.spots.map((s) => ({ spot: s.spot, stay: s.stay || defaultStay(spotById[s.spot]) })) }) : [];
    const stops = r.spots.map((s, i) => {
      const sp = spotById[s.spot];
      const hours = hoursText(sp);
      const saved = V.saved.some((x) => x.spot === sp.id);
      const photos = s.photos || [];
      const gallery = photos.length
        ? `<div class="gallery ${photos.length > 1 ? "many" : ""}">${photos.map((ph, k) => `<figure><img src="${img(ph.src, photos.length > 1)}" alt="${esc(ph.cap || sp.name)}" loading="${i === 0 && k === 0 ? "eager" : "lazy"}" data-full="${ph.src}" data-cap="${esc(ph.cap || "")}">${ph.cap ? `<figcaption>${esc(ph.cap)}</figcaption>` : ""}</figure>`).join("")}</div>${photos.length > 1 ? `<div class="gallery-hint">${photos.length}枚・横にずらすと次の写真</div>` : ""}`
        : `<div class="photo" style="${photoStyle(sp)}">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}（写真はまだありません）</div>`;
      const text = s.text && s.text.length ? s.text.map((t) => `<p>${esc(t)}</p>`).join("") : `<p>${esc(s.note)}</p>`;
      const mv = i > 0 && sch[i] ? `<div class="stop-move">${sch[i].mode === "ride" ? IC.train : ICON.walk}${esc(spotById[r.spots[i - 1].spot].name)}から${moveText(sch[i])}${modeTag(sch[i])}${gLink(gmapLeg(spotById[r.spots[i - 1].spot], sp, sch[i].mode), "行き方", "inline")}</div>` : "";
      const info = [
        hours ? `<div><dt>営業</dt><dd>${esc(hours)}</dd></div>` : "",
        sp.closed ? `<div><dt>休み</dt><dd>${esc(sp.closed)}</dd></div>` : "",
        sp.addr ? `<div><dt>住所</dt><dd>${esc(sp.addr)}</dd></div>` : "",
      ].join("");
      return `${mv}<div class="stop"><div class="stop-no">${i + 1}</div><div class="stop-main">
        <div class="stop-title"><b>${esc(sp.name)}</b> ${ratingTag(s.rating)}<button class="save-btn ${saved ? "on" : ""}" data-save="${sp.id}">${saved ? "登録済み" : "＋ 登録"}</button></div>
        ${s.head ? `<div class="stop-head">${esc(s.head)}</div>` : ""}
        ${gallery}
        <div class="stop-text">${text}</div>
        <div class="kv"><span>${ioText(sp)}</span>${sp.priceText ? `<span>${esc(sp.priceText)}</span>` : sp.price ? `<span>目安 ${sp.price.toLocaleString()}円</span>` : ""}${s.stay ? `<span>滞在 ${s.stay >= 60 ? (s.stay / 60).toFixed(s.stay % 60 ? 1 : 0) + "時間" : s.stay + "分"}</span>` : ""}${sp.style ? `<span>${esc(sp.style)}</span>` : ""}</div>
        ${info ? `<dl class="stop-info">${info}</dl>` : ""}
        ${gLink(gmapPlace(sp), "Google マップで開く")}
      </div></div>`;
    }).join("");
    const routeLink = r.type === "route" ? `<div class="route-gmap">${gLink(gmapRoute(r.spots.map((s) => spotById[s.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking"), `このルートを Google マップで開く（${r.spots.length}か所）`)}</div>` : "";
    const lock = r.member ? (isMember
      ? `<div class="lock"><b>メンバー限定</b><div>${esc(r.member.body)}</div></div>`
      : `<div class="lock"><b>${ICON.lock} メンバー限定</b><div style="margin:4px 0 10px">${esc(r.member.teaser)}</div>
          <button class="btn primary small" id="join-btn">メンバーになって読む（月${w.membership.price}円）</button></div>`) : "";
    // つくるの途中で開いたときは「足す」、それ以外は書いた人のルートで「つくる」
    const n = r.spots.length;
    const redoing = stage() === "redo";
    const appending = editing() && (redoing || state.draft.stops.length > 0);
    const have = appending ? new Set([...ed().stops.map((x) => x.spot), ...(redoing ? redoUsed() : [])]) : new Set();
    const fresh = appending ? r.spots.filter((s) => !have.has(s.spot)).length : n;
    const ctaLabel = appending ? (!fresh ? "この記事の場所は、もう予定に入っています" : n > 1 ? `このルートを予定の後ろに足す（${fresh}か所）` : "この場所を予定に足す") : (n > 1 ? "このルートで予定をつくる（無料）" : "この場所から予定をつくる");
    const cta = `<div class="sticky-cta"><button class="btn accent block" id="make-btn" ${appending && !fresh ? "disabled" : ""}>${ICON.calplus}${ctaLabel}</button>${appending ? `<div class="small" style="text-align:center;margin-top:6px">${redoing ? "組み直している予定" : `つくっている予定（${state.draft.stops.length}か所）`}の後ろに足します</div>` : ""}</div>`;
    p.innerHTML = bar(w.official ? "公式の特集" : "記事") + `<div class="pad">
      <div class="writer-row"><button data-writer="${w.id}" style="display:flex;align-items:center;gap:10px">${avatar(w)}<span class="name">${esc(w.name)}</span></button>${badges(w, r)}<span style="margin-left:auto">${favBtn}</span></div>
      <div class="h1">${esc(r.title)}</div>
      <div class="meta"><span>${esc(r.date)}</span><span>${r.type === "route" ? `ルート ${r.spots.length}か所` : "1か所の記録"}</span><span>記事を見て「行った」${r.went}人</span></div>
      <div class="kv" style="margin-top:6px">${r.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}${r.stamp ? "<span>スタンプラリー（架空の企画）</span>" : ""}</div>
      ${r.lead ? `<p class="lead">${esc(r.lead)}</p>` : ""}
      <div class="minimap" id="mm-art"></div>
      ${routeLink}
      ${stops}${lock}
    </div>${cta}`;
    // 写真を押すと大きく見る
    $$("[data-full]", p).forEach((im) => im.addEventListener("click", () => openPhoto(img(im.dataset.full), im.dataset.cap)));
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

  // 写真を画面いっぱいに出す（url：画像のアドレス。自分で入れた写真もそのまま使う）。どこを押しても閉じる
  function openPhoto(url, cap) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML = `<img src="${esc(url)}" alt="${esc(cap || "")}">${cap ? `<div class="lb-cap">${esc(cap)}</div>` : ""}<button class="lb-close" aria-label="閉じる">×</button>`;
    box.addEventListener("click", () => box.remove());
    $("#app").appendChild(box);
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
  // おまかせの計算。stops：組み直す前の予定（たどっている予定、または自分で選んでいる途中の予定）
  // いる場所（at）なら、そこを出る時刻から。移動中（go）なら、出てきた場所から、向かっている場所を含めて組み直す
  function rebuildResult(stops) {
    const pl = state.plan, cur = pl.stops[pl.cur];
    if (pl.phase === "end") { toast("予定の場所はすべてまわりました"); return null; }
    const focusClosed = state.closed.includes(cur.spot);
    let fromIndex, nowMin, position;
    if (pl.phase === "at") {
      fromIndex = focusClosed ? pl.cur : pl.cur + 1; nowMin = focusClosed ? cur.arrive : cur.depart; position = cur.spot;
    } else {
      const p = prevLive(pl, pl.cur);
      fromIndex = pl.cur; nowMin = p >= 0 ? pl.stops[p].depart : cur.arrive; position = p >= 0 ? pl.stops[p].spot : cur.spot;
    }
    if (fromIndex >= stops.length) { toast("組み直す予定が残っていません"); return null; }
    const opts = { fromIndex, nowMin, position, closedIds: state.closed, rain: state.rain, delayMin: state.delay, maxWalk: 30, prefer: {} };
    return { result: R.rebuild(D, stops, opts), base: stops, fromIndex, focusClosed, phase: pl.phase, opts, closedSpot: focusClosed ? cur.spot : null, closedName: focusClosed ? spotById[cur.spot].name : null };
  }
  function doRebuild() {
    const pd = rebuildResult(state.plan.stops);
    if (!pd) return;
    state.pending = pd;
    showPanel(renderRebuild);
  }

  function chooseAlt(fromSpot, altId) {
    const pd = state.pending;
    pd.opts.prefer[fromSpot] = altId;
    pd.result = R.rebuild(D, pd.base, pd.opts);
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
        html += s.pickWhy ? whyChips(s.pickWhy) : `<div class="why" style="margin-top:4px">選んだ理由：${esc(mine.why.join("、"))}</div>`;
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
      <button class="btn ghost block redo-btn" id="redo-map-btn" style="margin-top:8px">${ICON.pin}地図で行く場所を自分で直す</button>
      <button class="btn ghost block back" style="margin-top:8px">やめる</button>
    </div>`;
    $$("[data-alt]", p).forEach((b) => b.addEventListener("click", () => chooseAlt(b.dataset.from, b.dataset.alt)));
    $("#redo-map-btn", p).addEventListener("click", () => { const pd = state.pending; openRedo({ stops: pd.result, fromIndex: pd.fromIndex }); });
    $("#apply-btn", p).addEventListener("click", () => {
      const pl = state.plan, pd = state.pending, out = [];
      pd.result.forEach((s, i) => {
        if (i < pd.fromIndex) { out.push({ ...pl.stops[i] }); return; }
        const ns = { ...s, walkFrom: null };
        if (i === pd.fromIndex && pd.focusClosed) {
          // 行けなかった場所は消さずに「スキップ」で残す（番号はそのまま。代わりの場所は次の番号になり、あとは1つずつ増える）
          out.push({ ...pd.base[i], status: "dropped", reason: "臨時休業", arrive: null, depart: null, alternatives: null });
          if (s.status === "dropped") return;
          if (pd.phase === "at") ns.walkFrom = pd.closedName;
        }
        out.push(ns);
      });
      pl.stops = out;
      if (pd.focusClosed) { pl.cur = pd.fromIndex + 1; pl.phase = "go"; if (pd.phase === "at") pl.from = pd.closedSpot; }
      fixCur(pl);
      if (!state.premium) V.rebuildsLeft = Math.max(0, V.rebuildsLeft - 1);
      if (state.rain) state.rainHandled = true;
      state.delay = 0; state.pending = null;
      closePanels(); renderSheet(); drawMap(true);
      const nx = pl.stops[pl.cur];
      toast(pd.focusClosed && pl.phase === "go" ? `${pd.fromIndex + 1} はスキップ。${pl.cur + 1} ${spotById[nx.spot].name}へ向かいます` : "新しい予定にしました");
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
        shrinkPhoto(f).then((src) => { d.photo = src; renderRecord(); }).catch((err) => toast(err.message));
      });
    });
    $("#publish-btn").addEventListener("click", () => {
      const spots = cands.map((s) => s.spot).filter((id) => draft.items[id] && draft.items[id].on).map((id) => {
        const sp = spotById[id], d = draft.items[id];
        return { name: sp.name, lat: sp.lat, lng: sp.lng, rating: d.rating, note: d.note || "（ひとことなし）", vis: d.vis, photos: d.photo ? [d.photo] : [] };
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

  // 記事のメインタグ（書き手が1つ決める）
  const mainTag = (r) => r.mainTag || r.tags[0];
  // 読むのタグで出すか：複数の場所の記事（ルート）はメインタグだけで出す。1か所の記事は、付いているタグのどれでも出す
  const isMulti = (r) => r.type === "route" || r.spots.length > 1;
  const readHit = (r, tag) => !tag || (isMulti(r) ? mainTag(r) === tag : r.tags.includes(tag));
  // 並べる順番：写真のある記事を先に。その中で お気に入りの書き手 → タグだけお気に入り → 公式 → ほか。同じならルートを先に、「行った」人が多い順
  function readFeed() {
    const score = (r) => { if (r.official) return 1; const k = favKind(r.writer, r); return k === "fav" ? 3 : k ? 2 : 0; };
    return D.records
      .filter((r) => readHit(r, state.readTag))
      .sort((a, b) => !!coverSrc(b) - !!coverSrc(a) || score(b) - score(a) || (b.type === "route") - (a.type === "route") || b.went - a.went);
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
  // 表紙：写真があれば写真、なければ場所の種類の色で作る
  function coverStyle(r, big) {
    const sp = spotById[r.spots[0].spot], ph = coverSrc(r);
    if (ph) return `background-image:url('${img(ph, !big)}')`;
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
    const tag = state.readTag || mainTag(r);
    const pcls = coverSrc(r) ? "photo" : "";
    const head = `${pcls ? "" : `<span class="cover-word">${esc(spotById[r.spots[0].spot].kind)}</span>`}
      <span class="tag-label" style="background:${tagColor(tag)}">#${esc(tag)}</span>
      <span class="thumb-map">${routeThumb(r)}</span>`;
    // 記事ごとの「つくる」：書いた人のルートを先に入れて、つくるを開く
    const make = `<button class="make-btn" data-make="${r.id}" aria-label="この記事から予定をつくる">${ICON.calplus}つくる</button>`;
    if (!big) {
      return `<div class="tile cover ${pcls}" role="button" tabindex="0" data-rec="${r.id}" style="${coverStyle(r, false)}">${head}
        <span class="cover-body"><span class="cover-title">${esc(r.title)}</span>
        <span class="cover-who">${avatar(w, "sm")}<b>${esc(w.name)}</b>${make}</span></span></div>`;
    }
    const lock = r.member ? `<span>${ICON.lock.replace('width="16" height="16"', 'width="13" height="13"')} メンバー限定あり</span>` : "";
    const mark = w.official ? '<span class="badge official">公式</span>' : fk === "fav" ? '<span class="badge fav">お気に入り</span>' : "";
    return `<div class="hero cover ${pcls}" role="button" tabindex="0" data-rec="${r.id}" style="${coverStyle(r, true)}">${head}
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
  /* 自分のマップに出す点：自分の記録（黄緑）と、登録した場所（白）。infos を渡すと吹き出しの中身もためる。
     sel：選んでいる場所（大きく出して、吹き出しもいちばん先に置く）。吹き出しの写真は、自分で入れた写真を先に使う */
  function myPins(lyr, filter, onPick, infos, sel) {
    const pts = [];
    const pin = (cls, ll, key, on, title) => lyr.marker(ll, { ...divPin(cls + (on ? " sel" : ""), ""), z: on ? 1000 : 0, title: infos ? "" : title, onClick: onPick ? () => onPick(key) : null });
    if (filter !== "saved") state.myRecords.forEach((r) => r.spots.forEach((s, i) => {
      const ll = [s.lat, s.lng], key = `ms-${r.id}-${i}`, on = key === sel;
      pts.push(ll);
      pin("mine", ll, key, on, s.name);
      if (infos) infos.push({ ll, half: PIN_SIZE.mine / 2, prio: on ? 99 : 6, b: {
        cls: "is-mine" + (on ? " is-sel" : ""), z: on ? 500 : 0, name: s.name, title: "「" + r.title + "」", rating: s.rating,
        who: "自分の記録・" + visLabel(s.vis), go: on ? "" : "見る ›", photoUrl: (s.photos || [])[0], onClick: () => onPick && onPick(key),
      } });
    }));
    if (filter !== "rec") V.saved.forEach((x) => {
      const sp = spotById[x.spot], ll = [sp.lat, sp.lng], key = `sv-${x.spot}`, on = key === sel;
      pts.push(ll);
      pin("saved", ll, key, on, sp.name);
      if (!infos) return;
      const best = bestRecordFor(x.spot), w = best && writerById[best.r.writer], ph = best && stopPhotos(best.r, x.spot)[0];
      infos.push({ ll, half: PIN_SIZE.saved / 2, prio: on ? 99 : 5, b: {
        cls: "is-saved" + (on ? " is-sel" : ""), z: on ? 500 : 0, name: sp.name, title: x.memo ? "メモ：" + x.memo : best ? "「" + best.r.title + "」" : sp.kind,
        rating: best && best.s.rating, who: best ? w.name : "登録した場所", go: on ? "" : "見る ›",
        photoUrl: (x.photos || [])[0], photo: ph && ph.src, onClick: () => onPick && onPick(key),
      } });
    });
    return pts;
  }
  const legend = `<div class="legend"><span><i class="lgd mine"></i>自分の記録</span><span><i class="lgd saved"></i>登録した場所</span></div>`;

  let meMap = null, meTurn = 0;
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
          ${r.spots.map((s, i) => `<button class="me-spot" data-mm="ms-${r.id}-${i}">${(s.photos || []).length ? `<img class="thumb" src="${s.photos[0]}" alt="" style="width:100%;height:120px">` : ""}<span class="me-spot-top"><b>${esc(s.name)}</b><span class="me-spot-go">地図で見る ›</span></span><span>${ratingTag(s.rating)} <span class="small">${visLabel(s.vis)}${(s.photos || []).length ? `・写真${s.photos.length}枚` : ""}</span></span><span class="small">${esc(s.note)}</span></button>`).join("")}</div>`).join("")}
        <div class="section-label">お気に入りの書き手</div>
        ${favs.map((w) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge fav">お気に入り</span></div><div class="small" style="margin-top:4px">${esc(w.bio)}</div></button>`).join("")}
        ${tagFavs.map(({ w, t }) => `<button class="card" data-writer="${w.id}"><div class="card-top">${avatar(w)}<b>${esc(w.name)}</b><span class="badge tagfav">${esc(t.join("・"))}だけお気に入り</span></div></button>`).join("")}
      </div>`;
    // 見るだけの小さな地図。押すと自分のマップが開く（オフラインのときは、この地図の所にだけお知らせが出る）
    const meEl = $("#mm-me", el), myTurn = ++meTurn;
    GM.create(meEl, { center: OMIYA, zoom: 12, gesture: "none" }).then((m) => {
      if (!m) return;
      if (myTurn !== meTurn) { m.remove(); return; } // 読み込んでいる間に描き直された
      meMap = m;
      const pts = myPins(m.group(), "all");
      if (pts.length) m.fit(pts, { pad: 0.3, maxZoom: 14 });
    });
    $("#open-mymap").addEventListener("click", () => openMyMap());
    $$("[data-mm]", el).forEach((b) => b.addEventListener("click", () => openMyMap(b.dataset.mm)));
    $$("[data-writer]", el).forEach((b) => b.addEventListener("click", () => openWriter(b.dataset.writer)));
  }

  /* ---------- 自分のマップ（探すと同じ大きな地図。場所を押すと、下から引き出すシートでその場所を直す） ---------- */
  function openMyMap(key = null) {
    state.myMapSel = key; state.myMapView = null; state.myMapSheet = key ? "half" : "peek"; state.myMapEdit = false;
    if (key) state.myMapFilter = "all";
    showPanel(renderMyMap);
  }
  function renderMyMap(p) {
    p.innerHTML = `<div class="mm-full">
      <div class="mm-map" id="mm-mine"></div>
      <div class="map-top mm-top">
        <div class="mm-bar"><button class="back mm-backbtn" aria-label="戻る">${ICON.back}</button><div class="stage-title"><b>自分のマップ</b><span>場所を押すと、写真とひとことが見られます</span></div><span class="demo-badge">試作・データは仮</span></div>
        <div class="seg mm-seg" id="mm-seg"></div>
      </div>
      <div class="sheet ${state.myMapSheet}" id="mm-sheet">
        <div class="sheet-handle" id="mm-handle"><span></span></div>
        <div class="sheet-head" id="mm-head"></div>
        <div class="sheet-body" id="mm-body"></div>
      </div>
    </div>`;
    const sheet = $("#mm-sheet", p), head = $("#mm-head", p), body = $("#mm-body", p), seg = $("#mm-seg", p), top = $(".mm-top", p);
    const snaps = () => { const h = p.clientHeight; return { peek: 132, half: h * 0.52, full: h - 100 }; };
    const sheetH = () => snaps()[state.myMapSheet];
    const sheetOverMm = (h) => Math.max(0, h - MAP_B); // シートが地図に重なる高さ（地図は下を MAP_B だけあけてある）
    const topH = () => top.offsetHeight;
    let m = null, lyr = null, blyr = null, infos = [];

    // 選んでいる場所：{ kind: "mine", r, i, s } か { kind: "saved", x, sp }
    function target(key) {
      if (!key) return null;
      for (const r of state.myRecords) for (let i = 0; i < r.spots.length; i++) if (`ms-${r.id}-${i}` === key) return { kind: "mine", key, r, i, s: r.spots[i] };
      const x = V.saved.find((v) => `sv-${v.spot}` === key);
      return x ? { kind: "saved", key, x, sp: spotById[x.spot] } : null;
    }
    const shown = (t) => state.myMapFilter === "all" || (state.myMapFilter === "rec") === (t.kind === "mine");
    const photosOf = (t) => (t.kind === "mine" ? t.s.photos || (t.s.photos = []) : t.x.photos || (t.x.photos = []));

    /* 地図（Google から読み込んでから作る。オフラインのときは、地図の所にだけお知らせが出て、下のシートはそのまま使える） */
    function bubbles() {
      if (!m) return;
      blyr.clear();
      placeBubbles(m, blyr, infos, topH() + 4, m.getSize().y - sheetOverMm(sheetH()) - 4, 0);
    }
    function pins() {
      if (!m) return [];
      lyr.clear(); infos = [];
      const pts = myPins(lyr, state.myMapFilter, select, infos, state.myMapSel);
      bubbles();
      return pts;
    }
    // 全部の点が、上の帯と下のシートのあいだに入るように合わせる
    function fitAll(pts) {
      if (!pts.length) { m.setView(OMIYA, 12); return; }
      m.fit(pts, { top: topH() + 70, left: 30, right: 30, bottom: sheetOverMm(sheetH()) + 20, maxZoom: 15 });
    }
    // 選んだ場所を、シートを半分開いたときに見えるところのまん中へ（遠くから見ているときは、まわりがわかるくらいまで寄る）
    function reveal(t, animate = true) {
      if (!m || !t) return;
      const ll = t.kind === "mine" ? [t.s.lat, t.s.lng] : [t.sp.lat, t.sp.lng];
      const z = Math.max(m.getZoom(), 13), size = m.getSize(), y0 = topH(), y1 = size.y - sheetOverMm(snaps().half);
      m.centerOn(ll, z, (y0 + y1) / 2 - size.y / 2, animate); // 見せたいところを、地図のまん中からこれだけ下に出す
    }

    /* シート */
    function setMm(s) {
      state.myMapSheet = s;
      sheet.classList.remove("peek", "half", "full"); sheet.classList.add(s);
      clearTimeout(setMm.t); setMm.t = setTimeout(bubbles, 320);
    }
    sheetDrag({ el: sheet, handle: $("#mm-handle", p), head, body, snaps, onSnap: setMm });

    function select(key) {
      const t = target(key);
      state.myMapSel = t ? key : null;
      state.myMapEdit = false; // 選んだら、まず「見る」
      if (t && !shown(t)) state.myMapFilter = "all";
      if (t) setMm("half");
      drawSeg(); pins(); renderBody();
      body.scrollTop = 0;
      if (t) reveal(t);
    }
    function drawSeg() {
      const f = state.myMapFilter, n = state.myRecords.reduce((a, r) => a + r.spots.length, 0);
      seg.innerHTML = [["all", "すべて"], ["rec", `自分の記録 ${n}`], ["saved", `登録した場所 ${V.saved.length}`]].map(([k, l]) => `<button data-f="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("");
    }
    function renderBody() {
      const t = target(state.myMapSel);
      head.classList.toggle("mm-head-sel", !!t);
      if (!t) listView();
      else if (!state.myMapEdit) (t.kind === "mine" ? mineShow : savedShow)(t);
      else (t.kind === "mine" ? mineView : savedView)(t);
    }
    const row = (key, src, cls, name, sub, go) => `<button class="mm-row" data-pick="${esc(key)}">
        ${src ? `<img src="${src}" alt="" loading="lazy">` : `<i class="lgd ${cls}"></i>`}
        <span class="mm-row-tx"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="mm-row-go">${go} ›</span></button>`;
    // 何も選んでいないとき：場所の一覧（押すと選ぶ）
    function listView() {
      const f = state.myMapFilter;
      head.innerHTML = `<b>${f === "saved" ? "登録した場所" : f === "rec" ? "自分の記録" : "自分のマップ"}</b><small>場所を押すと、写真とひとことが見られます</small>`;
      let html = legend;
      if (f !== "saved") {
        html += `<div class="section-label">自分の記録</div>`;
        const rows = state.myRecords.flatMap((r) => r.spots.map((s, i) => row(`ms-${r.id}-${i}`, (s.photos || [])[0], "mine", s.name, `「${r.title}」・${RATING[s.rating]}`, "見る")));
        html += rows.length ? rows.join("") : '<div class="small">まだ記録がありません。「書く」で記録すると、ここにたまります。</div>';
      }
      if (f !== "rec") {
        html += `<div class="section-label">登録した場所</div>`;
        html += V.saved.length ? V.saved.map((x) => {
          const sp = spotById[x.spot], best = bestRecordFor(x.spot), ph = best && stopPhotos(best.r, x.spot)[0];
          return row(`sv-${x.spot}`, (x.photos || [])[0] || (ph && img(ph.src, true)), "saved", sp.name, x.memo ? "メモ：" + x.memo : sp.kind, "見る");
        }).join("") : '<div class="small">記事の場所の「＋ 登録」を押すと、ここにたまります。</div>';
      }
      body.innerHTML = html;
    }
    const listBtn = `<button class="mm-list-btn" data-list aria-label="一覧に戻る">${ICON.back}</button>`;
    const editBtn = `<button class="mm-edit-btn" data-edit>${IC.edit}直す</button>`;
    const doneBtn = `<button class="mm-edit-btn on" data-done>${IC.check}完了</button>`;
    /* 見る：写真とひとことを大きく、きれいに（直すときは見出しの「直す」） */
    const viewGallery = (list, alt) => `<div class="mv-gal ${list.length > 1 ? "many" : ""}">${list.map((ph, k) => `<figure>
        <img src="${esc(ph.url)}" alt="${esc(ph.cap || alt)}" data-zoom="${esc(ph.full || ph.url)}" data-cap="${esc(ph.cap || "")}" loading="${k ? "lazy" : "eager"}">
        ${list.length > 1 ? `<span class="mv-n">${k + 1}/${list.length}</span>` : ""}${ph.cap ? `<figcaption>${esc(ph.cap)}</figcaption>` : ""}</figure>`).join("")}</div>`;
    function mineShow(t) {
      const { r, i, s } = t, photos = (s.photos || []).map((u) => ({ url: u }));
      head.innerHTML = `${listBtn}<b>${esc(s.name)}</b>${editBtn}`;
      const sibs = r.spots.length > 1 ? `<div class="mm-sibs"><span>同じ記録の場所</span>${r.spots.map((x, j) => `<button data-pick="ms-${esc(r.id)}-${j}" class="${j === i ? "on" : ""}">${esc(x.name)}</button>`).join("")}</div>` : "";
      body.innerHTML = `<div class="mv">
        ${photos.length ? viewGallery(photos, s.name) : `<div class="mv-noph mine">${IC.image}<span>写真はまだありません</span><button class="mini-btn" data-edit>写真を足す</button></div>`}
        <div class="mv-title"><b>${esc(s.name)}</b>${ratingTag(s.rating)}</div>
        <div class="mv-meta"><span>${IC.cal}${esc(r.date)}</span><span>${visLabel(s.vis)}</span></div>
        ${s.note ? `<blockquote class="mv-note">${esc(s.note)}</blockquote>` : '<div class="mv-empty">ひとことはまだありません</div>'}
        <div class="mv-from">${IC.list}<span>記録「${esc(r.title)}」${r.spots.length > 1 ? `の${i + 1}か所目` : ""}</span></div>
        ${sibs}
      </div>`;
    }
    function savedShow(t) {
      const { x, sp } = t;
      const arts = D.records.filter((r) => r.spots.some((s) => s.spot === x.spot));
      const own = (x.photos || []).map((u) => ({ url: u, cap: "自分の写真" }));
      const theirs = arts.flatMap((r) => stopPhotos(r, x.spot).map((ph) => ({ url: img(ph.src, true), full: img(ph.src), cap: ph.cap || `${writerById[r.writer].name}さんの写真` })));
      const photos = [...own, ...theirs].slice(0, 10);
      head.innerHTML = `${listBtn}<b>${esc(sp.name)}</b>${editBtn}`;
      body.innerHTML = `<div class="mv">
        ${photos.length ? viewGallery(photos, sp.name) : `<div class="mv-noph" style="${photoStyle(sp)}"><b>${esc(sp.kind)}</b><span>写真はまだありません</span></div>`}
        <div class="mv-title"><b>${esc(sp.name)}</b></div>
        <div class="mv-meta"><span>${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}</span>${hoursText(sp) ? `<span>${IC.clock}${esc(hoursText(sp))}</span>` : ""}</div>
        ${x.memo ? `<div class="mv-memo"><small>${IC.edit}自分のメモ</small>${esc(x.memo)}</div>` : ""}
        ${arts.length ? '<div class="mv-lb">みんなのひとこと</div>' + arts.slice(0, 5).map((r) => {
          const s = r.spots.find((y) => y.spot === x.spot), w = writerById[r.writer];
          return `<div class="mv-cm">${avatar(w)}<div class="mv-cm-tx"><div class="mv-cm-top"><b>${esc(w.name)}</b>${ratingTag(s.rating)}</div>
            <p>${esc(s.note)}</p><button class="mv-cm-go" data-open-rec="${r.id}">「${esc(r.title)}」を読む${ICON.chev}</button></div></div>`;
        }).join("") : ""}
      </div>`;
    }
    const photosBlock = (photos) => `<div class="mm-lb">写真 <span>${photos.length ? photos.length + "枚・はじめの1枚が地図の吹き出しに出ます" : "まだありません"}</span></div>
      <div class="mm-photos">
        ${photos.map((src, j) => `<div class="mm-ph"><img src="${src}" alt="写真${j + 1}"><button class="mm-ph-del" data-del-photo="${j}" aria-label="写真${j + 1}を外す">×</button></div>`).join("")}
        <label class="mm-ph-add"><b>＋</b><span>写真を足す</span><input type="file" accept="image/*" multiple hidden data-add-photo></label>
      </div>
      <div class="small mm-ph-note">位置情報（Exif）を消して小さくしてから入れます。試作なので、この端末の中だけに置き、開き直すと消えます。</div>`;
    // 自分の記録の場所を直す
    function mineView(t) {
      const { r, i, s } = t;
      head.innerHTML = `${listBtn}<b>${esc(s.name)}</b>${doneBtn}`;
      const sibs = r.spots.length > 1 ? `<div class="mm-sibs"><span>同じ記録の場所</span>${r.spots.map((x, j) => `<button data-pick="ms-${esc(r.id)}-${j}" class="${j === i ? "on" : ""}">${esc(x.name)}</button>`).join("")}</div>` : "";
      body.innerHTML = `<div class="mm-ed">
        <label class="mm-lb" for="mm-title">記録のタイトル <span>${esc(r.date)}・${r.spots.length}か所</span></label>
        <input class="field title-in" id="mm-title" data-title value="${esc(r.title)}">
        ${sibs}
        ${photosBlock(photosOf(t))}
        <div class="mm-lb">評価</div>
        <div class="rate-btns">${[3, 2, 1].map((n) => `<button class="r${n} ${s.rating === n ? "on" : ""}" data-rate="${n}">${RATING[n]}</button>`).join("")}</div>
        <label class="mm-lb" for="mm-note">ひとこと</label>
        <input class="field" id="mm-note" data-note value="${esc(s.note)}" placeholder="ひとこと（1〜2文）">
        <div class="mm-lb">公開範囲</div>
        <div class="vis">${VIS.map(([k, l]) => `<button data-vis="${k}" class="${s.vis === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <div class="mm-acts"><button class="mini-btn" data-del-spot>この場所を記録から外す</button><button class="mini-btn danger" data-del-rec>記録ごと消す</button></div>
      </div>`;
    }
    // 登録した場所を見る・直す
    function savedView(t) {
      const { x, sp } = t, best = bestRecordFor(x.spot);
      head.innerHTML = `${listBtn}<b>${esc(sp.name)}</b>${doneBtn}`;
      const arts = D.records.filter((r) => r.spots.some((s) => s.spot === x.spot)).sort((a, b) => (best && b === best.r) - (best && a === best.r));
      body.innerHTML = `<div class="mm-ed">
        <div class="small">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}</div>
        <label class="mm-lb" for="mm-memo">メモ</label>
        <input class="field" id="mm-memo" data-memo value="${esc(x.memo)}" placeholder="メモ（いつ行きたいか など）">
        ${photosBlock(photosOf(t))}
        <div class="mm-lb">この場所の記事 <span>${arts.length}件</span></div>
        ${arts.length ? arts.slice(0, 4).map((r) => {
          const s = r.spots.find((y) => y.spot === x.spot), w = writerById[r.writer], ph = stopPhotos(r, x.spot)[0];
          return `<button class="mm-art" data-open-rec="${r.id}">${ph ? `<img src="${img(ph.src, true)}" alt="" loading="lazy">` : ""}<span><b>${esc(r.title)}</b><small>${esc(w ? w.name : "")}${s ? "・" + RATING[s.rating] : ""}</small></span>${ICON.chev}</button>`;
        }).join("") : '<div class="small">まだ記事はありません。</div>'}
        <div class="mm-acts"><a class="mini-btn" href="${esc(gmapPlace(sp))}" target="_blank" rel="noopener">Google マップで開く</a><button class="mini-btn danger" data-unsave>登録を外す</button></div>
      </div>`;
    }

    /* 操作 */
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]"); if (!b) return;
      state.myMapFilter = b.dataset.f;
      const t = target(state.myMapSel);
      if (t && !shown(t)) state.myMapSel = null;
      drawSeg(); renderBody();
      const pts = pins(); if (m) fitAll(pts);
    });
    const setEdit = (on) => { state.myMapEdit = on; renderBody(); body.scrollTop = 0; if (!on) pins(); };
    head.addEventListener("click", (e) => {
      if (e.target.closest("[data-list]")) select(null);
      else if (e.target.closest("[data-edit]")) setEdit(true);
      else if (e.target.closest("[data-done]")) setEdit(false);
    });
    // 文字は、入れるたびに描き直すと打ちにくいので、値だけ直して吹き出しは少し待ってから直す
    body.addEventListener("input", (e) => {
      const el = e.target, t = target(state.myMapSel); if (!t) return;
      if (el.matches("[data-title]")) t.r.title = el.value;
      else if (el.matches("[data-note]")) t.s.note = el.value;
      else if (el.matches("[data-memo]")) t.x.memo = el.value;
      else return;
      clearTimeout(body.t); body.t = setTimeout(pins, 400);
    });
    body.addEventListener("change", async (e) => {
      const inp = e.target.closest("[data-add-photo]"); if (!inp) return;
      const t = target(state.myMapSel), files = [...(inp.files || [])];
      inp.value = "";
      if (!t || !files.length) return;
      const list = photosOf(t);
      let n = 0;
      for (const f of files) { try { list.push(await shrinkPhoto(f)); n++; } catch (err) { /* 読めない画像はとばす */ } }
      if (state.myMapSel === t.key) { renderBody(); pins(); }
      toast(n ? `写真を${n}枚入れました（位置情報は消してあります）` : "写真を読めませんでした");
    });
    body.addEventListener("click", (e) => {
      const z = e.target.closest("[data-zoom]");
      if (z) { openPhoto(z.dataset.zoom, z.dataset.cap); return; } // 写真を大きく
      const b = e.target.closest("button"); if (!b) return;
      const d = b.dataset, t = target(state.myMapSel);
      if (d.pick) { select(d.pick); return; }
      if (d.openRec) { openArticle(d.openRec); return; }
      if ("edit" in d) { setEdit(true); return; }
      if (!t) return;
      if (d.rate) { t.s.rating = Number(d.rate); renderBody(); pins(); }
      else if (d.vis) { t.s.vis = d.vis; renderBody(); pins(); toast(`公開範囲を「${visLabel(d.vis)}」にしました`); }
      else if (d.delPhoto != null) { photosOf(t).splice(Number(d.delPhoto), 1); renderBody(); pins(); toast("写真を外しました"); }
      else if ("delSpot" in d) {
        t.r.spots.splice(t.i, 1);
        if (!t.r.spots.length) state.myRecords.splice(state.myRecords.indexOf(t.r), 1);
        toast("記録から外しました"); select(null);
      }
      else if ("delRec" in d) {
        if (!confirm(`「${t.r.title}」を消しますか？（試作なので、開き直すと元に戻ります）`)) return;
        state.myRecords.splice(state.myRecords.indexOf(t.r), 1);
        toast("記録を消しました"); select(null);
      }
      else if ("unsave" in d) { toggleSaved(t.x.spot); select(null); }
    });

    drawSeg(); renderBody();
    GM.create($("#mm-mine", p), { center: OMIYA, zoom: 12 }).then((gm) => { // 位置はあとで合わせる
      if (!gm) return;
      m = gm;
      lyr = m.group();
      blyr = m.group(); // 吹き出し（どの拡大でも、重ならないものを出す）
      panelMaps.push(m);
      m.on("zoomstart", () => blyr.clear());
      m.on("moveend", () => { state.myMapView = { c: m.getCenter(), z: m.getZoom() }; bubbles(); });
      m.on("click", () => { if (state.myMapSel) select(null); }); // 何もないところを押すと一覧に戻る
      const pts = pins(), v = state.myMapView;
      const t = target(state.myMapSel);
      if (v) m.setView(v.c, v.z);
      else if (t) { m.setView(t.kind === "mine" ? [t.s.lat, t.s.lng] : [t.sp.lat, t.sp.lng], 15); reveal(t, false); } // マイページの記録から開いたとき（15まで寄る）
      else fitAll(pts);
      setTimeout(bubbles, 280); // 重なる画面が出てくる動きが終わってから
    });
  }

  /* ---------- 書く（真ん中の緑の丸）：note の記事の編集画面を参考にした、記事を書く画面 ----------
     見出し画像・タイトル・本文（見出し・引用・太字・区切り線・画像）に、Take A Map らしく「行った場所」のカードを入れられる。
     試作なので公開はしない。書いた中身はこの端末のメモリにだけ置き（どこにも送らない）、閉じても残るが、開き直すと消える */
  const wr = { title: "", body: "", cover: null, tag: null, savedAt: null };
  const WR_EMPTY = "<p><br></p>";
  // 本文の文字（数えるため）。DOMParser は画像を読み込まず、スクリプトも動かさない
  const htmlText = (html) => new DOMParser().parseFromString(html || "", "text/html").body.textContent;
  const wrCount = (bodyText) => (wr.title + bodyText).replace(/\s/g, "").length;
  function spotBlock(sp, rating = 0) {
    return `<div class="wr-spot" contenteditable="false" data-spot="${sp.id}">
      <div class="wr-spot-top"><span class="wr-spot-ic">${IC.pin}</span><span class="wr-spot-tx"><b>${esc(sp.name)}</b><small>${esc(sp.kind)}${hoursText(sp) ? "・" + esc(hoursText(sp)) : ""}</small></span></div>
      <div class="wr-rate">${[3, 2, 1].map((n) => `<button class="r${n} ${n === rating ? "on" : ""}" data-wr-rate="${n}">${RATING[n]}</button>`).join("")}</div>
      <button class="wr-x" data-wr-del aria-label="この場所を外す">${IC.x}</button>
    </div>`;
  }
  // fromPlan：たどった予定の場所を、本文に入れてから開く（たどり終わったときの「記事を書く」）
  function openWrite(fromPlan) {
    const pl = state.plan;
    if (fromPlan && pl) {
      const ids = pl.stops.filter(live).map((s) => s.spot);
      const blank = !wr.title.trim() && !htmlText(wr.body).trim() && !/wr-spot|<img|<hr/.test(wr.body);
      if (blank || confirm("書きかけの記事の最後に、たどった場所を足しますか？")) {
        if (!wr.title.trim()) wr.title = pl.title;
        wr.body = (blank ? "" : wr.body) + ids.map((id) => spotBlock(spotById[id]) + WR_EMPTY).join("");
        toast(`たどった${ids.length}か所を本文に入れました`);
      }
    }
    const render = (p) => renderWrite(p);
    render.coverTabs = true;
    showPanel(render);
  }
  function renderWrite(p) {
    p.innerHTML = `<div class="wr">
      <div class="wr-head">
        <div class="wr-bar">
          <button class="back wr-close" aria-label="閉じる（書いた中身は残ります）">${IC.x}</button>
          <span class="wr-state" id="wr-state">${wr.savedAt ? `下書き保存 ${wr.savedAt}` : "下書き"}</span>
          <button class="wr-save" id="wr-save">下書き保存</button>
          <button class="wr-pub" id="wr-pub">公開に進む</button>
        </div>
        <div class="wr-tools" id="wr-tools" role="toolbar" aria-label="本文に入れる">
          <button data-wt="img" title="画像">${IC.image}<span>画像</span></button>
          <button data-wt="spot" title="行った場所">${IC.pin}<span>場所</span></button>
          <button data-wt="h" title="見出し"><b class="wt-t">H</b><span>見出し</span></button>
          <button data-wt="quote" title="引用">${IC.quote}<span>引用</span></button>
          <button data-wt="bold" title="太字"><b class="wt-t">B</b><span>太字</span></button>
          <button data-wt="hr" title="区切り線">${IC.hr}<span>区切り</span></button>
        </div>
      </div>
      <div class="wr-page">
        <label class="wr-cover ${wr.cover ? "has" : ""}" title="見出し画像">
          ${wr.cover ? `<img src="${wr.cover}" alt="見出し画像">` : `${IC.image}<span>見出し画像を追加</span>`}
          <input type="file" accept="image/*" hidden id="wr-cover-in">
        </label>
        ${wr.cover ? `<button class="wr-cover-del" id="wr-cover-del">${IC.x}画像を外す</button>` : ""}
        <textarea class="wr-title" id="wr-title" rows="1" placeholder="記事タイトル" aria-label="記事タイトル">${esc(wr.title)}</textarea>
        <div class="wr-tags" id="wr-tags"><span>タグ</span>${D.TAGS.map((t) => `<button class="${wr.tag === t ? "on" : ""}" data-wtag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>
        <div class="wr-body" id="wr-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="本文" data-ph="ご自由にお書きください。行った場所は、上の「場所」から入れられます。">${wr.body || WR_EMPTY}</div>
      </div>
      <div class="wr-foot"><span id="wr-count"></span><span>試作：この端末の中だけに置き、開き直すと消えます</span></div>
      <input type="file" accept="image/*" hidden id="wr-img-in">
    </div>`;
    const body = $("#wr-body", p), title = $("#wr-title", p), count = $("#wr-count", p);
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (err) { /* なくてもよい */ }
    const fitTitle = () => { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; };
    const isEmpty = () => !body.textContent.trim() && !body.querySelector("img,hr,.wr-spot,h2,blockquote");
    const changed = () => {
      if (!body.firstElementChild && !body.textContent.trim()) body.innerHTML = WR_EMPTY; // 全部消したときも段落を残す
      wr.body = body.innerHTML;
      body.classList.toggle("is-empty", isEmpty());
      const c = body.cloneNode(true); c.querySelectorAll('[contenteditable="false"]').forEach((x) => x.remove()); // 場所のカードは数えない
      count.textContent = `${wrCount(c.textContent)}文字`;
    };
    requestAnimationFrame(fitTitle);
    changed();

    // 本文のカーソルの位置を覚えておく（ツールのボタンを押しても、その位置に入れる）
    let range = null;
    const blockOf = (n) => { while (n && n.parentNode !== body) n = n.parentNode; return n || null; };
    const placeAt = (el, end) => {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); range = r.cloneRange();
    };
    const onSel = () => {
      if (!body.isConnected) { document.removeEventListener("selectionchange", onSel); return; } // 閉じたら外す
      const s = getSelection();
      if (s.rangeCount && body.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    const restore = () => {
      body.focus();
      if (range && body.contains(range.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
      else placeAt(body.lastElementChild || body, true);
    };
    // カーソルのある段落のあとにブロック（画像・場所・区切り線）を入れ、そのあとに書き続けられる段落を置く
    function insertBlock(html) {
      const tpl = document.createElement("template"); tpl.innerHTML = html.trim();
      const frag = tpl.content, after = document.createElement("p");
      after.innerHTML = "<br>"; frag.appendChild(after);
      const blk = range && body.contains(range.startContainer) ? blockOf(range.startContainer) : null;
      const emptyP = blk && blk.tagName === "P" && !blk.textContent.trim();
      if (emptyP) blk.replaceWith(frag); else if (blk) blk.after(frag); else body.appendChild(frag);
      body.focus(); placeAt(after);
      changed();
    }

    title.addEventListener("input", () => { wr.title = title.value; fitTitle(); changed(); });
    title.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); body.focus(); placeAt(body.firstElementChild || body); } });
    body.addEventListener("input", changed);
    // 貼り付けは文字だけ（ほかのページの見た目やスクリプトを持ち込まない）
    body.addEventListener("paste", (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
    body.addEventListener("drop", (e) => e.preventDefault());
    body.addEventListener("click", (e) => {
      const del = e.target.closest("[data-wr-del]");
      if (del) { const b = del.closest(".wr-spot,.wr-fig"); if (b) { b.remove(); changed(); } return; }
      const rt = e.target.closest("[data-wr-rate]");
      if (rt) { $$("button", rt.parentNode).forEach((b) => b.classList.toggle("on", b === rt)); changed(); }
    });
    const tools = $("#wr-tools", p);
    tools.addEventListener("mousedown", (e) => e.preventDefault()); // 押しても本文のカーソルが消えないように
    tools.addEventListener("click", (e) => {
      const b = e.target.closest("[data-wt]"); if (!b) return;
      const k = b.dataset.wt;
      if (k === "img") { $("#wr-img-in", p).click(); return; }
      if (k === "spot") { openSpotPicker(insertBlock); return; }
      if (k === "hr") { insertBlock("<hr>"); return; }
      restore();
      if (k === "bold") { document.execCommand("bold"); changed(); return; }
      const blk = range && blockOf(range.startContainer);
      if (blk && !/^(P|H2|BLOCKQUOTE|DIV)$/.test(blk.tagName) || (blk && blk.classList.contains("wr-spot"))) { toast("文字の段落にカーソルを置いてから押してください"); return; }
      const tag = k === "h" ? "H2" : "BLOCKQUOTE";
      document.execCommand("formatBlock", false, blk && blk.tagName === tag ? "<p>" : `<${tag.toLowerCase()}>`);
      changed();
    });
    $("#wr-img-in", p).addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = "";
      if (!f) return;
      try {
        const src = await shrinkPhoto(f, 1600);
        insertBlock(`<figure class="wr-fig" contenteditable="false"><img src="${src}" alt=""><figcaption contenteditable="true" data-ph="キャプションを入力（なくてもよい）"></figcaption><button class="wr-x" data-wr-del aria-label="画像を外す">${IC.x}</button></figure>`);
        toast("画像を入れました（位置情報は消してあります）");
      } catch (err) { toast(err.message); }
    });
    $("#wr-cover-in", p).addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = "";
      if (!f) return;
      try { wr.cover = await shrinkPhoto(f, 1600); paint(); } catch (err) { toast(err.message); }
    });
    const cd = $("#wr-cover-del", p);
    if (cd) cd.addEventListener("click", () => { wr.cover = null; paint(); });
    $("#wr-tags", p).addEventListener("click", (e) => {
      const b = e.target.closest("[data-wtag]"); if (!b) return;
      wr.tag = wr.tag === b.dataset.wtag ? null : b.dataset.wtag;
      $$("[data-wtag]", p).forEach((x) => x.classList.toggle("on", x.dataset.wtag === wr.tag));
    });
    $("#wr-save", p).addEventListener("click", () => {
      const d = new Date();
      wr.savedAt = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      $("#wr-state", p).textContent = `下書き保存 ${wr.savedAt}`;
      toast("下書きを保存しました（試作：この端末の中だけ）");
    });
    $("#wr-pub", p).addEventListener("click", () => {
      if (!wr.title.trim()) { title.focus(); toast("タイトルを入れてください"); return; }
      toast("試作なので、公開はまだできません（書く画面だけ）");
    });
  }
  // 本文に入れる場所を選ぶ（たどっている予定・つくっている予定・登録した場所）
  function openSpotPicker(onPick) {
    closePicker();
    const groups = [];
    if (state.plan) groups.push([`たどっている予定「${state.plan.title}」`, state.plan.stops.filter(live).map((s) => s.spot), true]);
    if (state.draft.stops.length) groups.push(["つくっている予定", state.draft.stops.map((s) => s.spot), true]);
    if (V.saved.length) groups.push(["登録した場所", V.saved.map((x) => x.spot), false]);
    const box = document.createElement("div");
    box.className = "picker-back"; box.id = "picker";
    box.innerHTML = `<div class="picker" role="dialog" aria-label="本文に入れる場所">
      <div class="picker-head">${IC.pin}<div><b>本文に入れる場所</b><div class="small">押すと、カーソルのところに場所のカードが入ります</div></div></div>
      <div class="picker-list">${groups.map(([label, ids, all]) => `<div class="pk-label"><span>${esc(label)}</span>${all && ids.length > 1 ? `<button class="mini-btn" data-pk-all="${ids.join(",")}">まとめて入れる（${ids.length}か所）</button>` : ""}</div>`
        + ids.map((id) => `<button class="picker-row pk-plain" data-pk-spot="${id}"><span class="pr-name">${esc(spotById[id].name)}</span><span class="pr-time">${esc(spotById[id].kind)}</span></button>`).join("")).join("")
        || '<div class="small">まだ場所がありません。予定をつくるか、記事の場所を「＋ 登録」してください。</div>'}</div>
      <div class="picker-foot"><span></span><button class="btn primary small" data-pk="close">閉じる</button></div>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    box.addEventListener("click", (e) => {
      const one = e.target.closest("[data-pk-spot]"), all = e.target.closest("[data-pk-all]");
      if (one) { closePicker(); onPick(spotBlock(spotById[one.dataset.pkSpot])); }
      else if (all) { closePicker(); onPick(all.dataset.pkAll.split(",").map((id) => spotBlock(spotById[id])).join(WR_EMPTY)); }
      else if (e.target.closest("[data-pk]") || e.target === box) closePicker();
    });
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
    renderTop();
    setSheet(state.sheetBy[stage()], false);
    renderSheet();
    const fit = state.fitNext; state.fitNext = false;
    const go = () => {
      if (!map || (state.view !== "map" && state.view !== "plan")) return;
      drawMap(fit);
      if (stage() === "explore") updateArea();
    };
    // 地図は最初に開いたときに Google から読み込んで作る。オフラインなら地図の所にだけお知らせが出て、下のシートはそのまま使える
    if (map) setTimeout(go, 30); else initMap().then(go);
  }
  function openPlan(mode) {
    if (mode !== "redo" && state.redo) state.redo = null; // 組み直しの途中でほかへ行ったら、組み直しはやめる
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
    // オフラインで地図が出せなかったあと、つながったら、いま見ている地図を作り直す
    window.addEventListener("online", () => {
      if (!map && (state.view === "map" || state.view === "plan")) enterStage();
      if (state.view === "me" && !stack.length) renderMe();
    });
    const refilter = () => { renderChips(); drawMap(stage() === "explore"); if (stage() === "explore") scheduleArea(); else renderSheet(); };
    $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-tag]"); if (!b) return; state.tag = b.dataset.tag || null; refilter(); });
    $("#modes").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; state.mode = b.dataset.mode; refilter(); });
    $("#stage-bar").addEventListener("click", (e) => { const b = e.target.closest("[data-stage]"); if (b) openPlan(b.dataset.stage); });

    // 下のシート（探す・つくる・たどる）
    const sb = $("#sheet-body");
    const onSheetClick = (e) => {
      if (justSorted()) return; // 並べ替えた直後のクリックは無視
      const t = e.target.closest("[data-mk],[data-fl],[data-act],[data-rec]");
      if (!t || t.disabled) return;
      if (t.dataset.mk) onMake(t);
      else if (t.dataset.fl) onFollow(t);
      else if (t.dataset.act === "fit-all") drawMap(true);
      else if (t.dataset.act) onFollowAct(t.dataset.act);
      else if (t.dataset.rec) openArticle(t.dataset.rec);
    };
    sb.addEventListener("click", onSheetClick);
    $("#sheet-head").addEventListener("click", onSheetClick); // 見出しのボタン（たどる：一覧へ）
    sb.addEventListener("input", (e) => { if (e.target.id === "mk-name") { state.draft.name = e.target.value; state.draft.dirty = true; } });
    sb.addEventListener("change", (e) => {
      if (e.target.id === "mk-start" && e.target.value) { state.draft.start = R.toMin(e.target.value); state.draft.dirty = true; renderSheet(); drawMap(false); } // 地図の着く時刻と注意も直す
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
      if (b.id === "write-btn") { openWrite(false); return; }
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
