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
  // 自分（この端末で見ている人）。自分で公開した記事の書き手になる
  const ME = { id: "me", name: V.name, initial: "A", color: "#56859C", art: "me", self: true, bio: "建築とラーメンが好きな大学生", mainTag: "旅行", stats: { records: {}, favorites: 0, retention: 0, wentFromArticles: 0 } };
  D.writers.push(ME); writerById.me = ME;
  const RATING = { 3: "また行きたい", 2: "よかった", 1: "合わなかった" };
  const OMIYA = [35.9115, 139.6265];
  const KIND_BG = {
    "建築": ["#56859C", "#123D2B"], "ラーメン": ["#E86B45", "#8E3A1E"], "カフェ": ["#B08968", "#6F4E37"], "名所": ["#7F8C84", "#123D2B"],
    "公園": ["#97BC62", "#2C5F2D"], "博物館": ["#56859C", "#21295C"], "美術館": ["#A26769", "#6D2E46"], "店": ["#A7BEAE", "#626E66"], "山": ["#97BC62", "#2C5F2D"],
    "グルメ": ["#D9963A", "#7A3E12"], "海": ["#5AA6C8", "#1D4E6B"], "駅": ["#8A9AA6", "#2F3E48"],
    "図書館": ["#56859C", "#123D2B"], "コンビニ": ["#7FB4A2", "#2F5E52"], "ホテル": ["#A99BC4", "#4A3E6B"], "場所": ["#9AA89E", "#3E4A42"],
  };
  // つくるで場所を押したときの滞在時間のめやす（分）
  const STAY_BY_KIND = { "ラーメン": 40, "カフェ": 45, "博物館": 90, "美術館": 60, "公園": 40, "名所": 45, "建築": 60, "店": 60, "山": 150, "グルメ": 45, "海": 60, "駅": 20, "コンビニ": 10, "ホテル": 30, "図書館": 60, "場所": 45 };
  const defaultStay = (sp) => sp.stay || STAY_BY_KIND[sp.kind] || 45; // stay：記事の「いた時間」から入れた値
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
  const icf = (d) => `<svg class="i if" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`; // 塗りつぶしのアイコン
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
    images: ic('<rect x="7" y="7" width="14" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/><circle cx="11.5" cy="11" r="1.5"/><path d="M21 16l-4-3.5-6 5.5"/>'),
    link: ic('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    up: ic('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    down: ic('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    globe: ic('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>'),
    search: ic('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    eye: ic('<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    info: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>'),
    next: ic('<path d="M9 5l7 7-7 7"/>'),
    prev: ic('<path d="M15 5l-7 7 7 7"/>'),
    // 吹き出しの数：足あと＝その記事から行った人、上半身＝最近読んだ人、紙＝記事
    foot: icf('<ellipse cx="8.2" cy="12.4" rx="2.7" ry="4.3" transform="rotate(-14 8.2 12.4)"/><ellipse cx="7.2" cy="19.3" rx="1.9" ry="1.7"/><ellipse cx="15.8" cy="6.6" rx="2.7" ry="4.3" transform="rotate(14 15.8 6.6)"/><ellipse cx="16.8" cy="13.5" rx="1.9" ry="1.7"/>'),
    reader: icf('<circle cx="12" cy="7.4" r="4.1"/><path d="M3.8 21.5c0-4.9 3.7-8.4 8.2-8.4s8.2 3.5 8.2 8.4z"/>'),
    doc: ic('<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M13.5 3.5v4.5h4.5M9.5 12.5h5M9.5 16h5"/>'),
    heartf: icf('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>'), // いいね（塗り）
  };
  const VIS = [["public", "公開"], ["member", "メンバー限定"], ["private", "非公開"]];
  const visLabel = (k) => (VIS.find((v) => v[0] === k) || VIS[0])[1];

  // つくっている途中の予定。stops は { spot, stay }。start は分（600 = 10:00）
  /* simple：記事から予定をつくったときの、回る順番だけの画面（時間は出さない。「詳しく調整」でいつもの画面へ）
     decide：たどるで、時間をまだ決めていない予定を選んだとき。いつもの画面のいちばん下に「決定」（押すと、そのままたどり始める） */
  const newDraft = (o = {}) => ({ id: null, name: "", start: 600, stops: [], from: null, dirty: false, simple: false, decide: false, ...o });

  const state = {
    tag: null, mode: "fav", likedOnly: false, view: "read",
    readTag: null,           // 読む：選んでいるタグ（null = おすすめ）
    readScope: "all",        // 読む：記事の出どころ all（すべての人）/ fav（お気に入りの書き手）
    place: null,             // 探す：地図で押した場所。下のシートをその場所の記事だけにする
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
    // 自分の記録。場所ごとに mine（わたしの記録：自分だけ。本文は書く画面と同じ形）と、
    // pub（同じ場所の公開する記事 { title, vis: public / member, tags, info, html, recId }。書いたときだけ）を持つ。note は本文のはじめの文
    found: null,             // 探す・つくる：名前で探して見つけた場所（地図に印を出す）
    myRecords: [
      { id: "my1", title: "神保町で古本と喫茶", date: "2026-10-04", spots: [{ name: "神保町の古書店街", lat: 35.6960, lng: 139.7580, rating: 3, note: "棚を見ているだけで一日終わる。", mine: "<p>棚を見ているだけで一日終わる。</p>", pub: null }] },
      { id: "my2", title: "上野の美術館で雨宿り", date: "2026-09-13", spots: [{ name: "上野公園の美術館", lat: 35.7188, lng: 139.7765, rating: 2, note: "雨の日でも楽しめた。", mine: "<p>雨の日でも楽しめた。</p>", pub: null }] },
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
    if (w.self) return '<span class="badge self">自分の記事</span>';
    if (w.official) return `<span class="badge official">${w.shop ? "店の公式" : "公式"}</span>`;
    const k = favKind(w.id, rec);
    if (k === "fav") return '<span class="badge fav">お気に入り</span>';
    if (k === "tagfav") return `<span class="badge tagfav">${esc(V.tagFavorites[w.id].join("・"))}だけお気に入り</span>`;
    return "";
  }
  /* アカウントの絵（本番は、その人が選んだ写真やアイコンになる）。記事のカード・書き手・地図のピンで同じ絵を出す。
     背景はその人の色。絵のない人は名前の1文字目（initial） */
  const AW = "#FFFDF7", AL = "#D8EE72", AO = "#F2A27E", AY = "#F2C94C", AK = "rgba(0,0,0,.28)", AS = "#9CC9E0";
  const ART = {
    books: `<path d="M5 25.5h22" stroke="${AW}" stroke-width="2" stroke-linecap="round"/><rect x="7.5" y="9" width="5" height="15.5" rx="1" fill="${AW}"/><rect x="13.5" y="6.5" width="5" height="18" rx="1" fill="${AL}"/><rect x="20.2" y="10" width="5" height="14.5" rx="1" fill="${AO}" transform="rotate(12 22.7 17.2)"/><path d="M8.5 12.5h3M14.5 10h3" stroke="${AK}" stroke-width="1.2"/>`,
    boat: `<path d="M3 26.5c2.2 0 2.2-1.6 4.4-1.6s2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6" fill="none" stroke="${AW}" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 20h17l-2.8 3.8H10.3z" fill="${AO}"/><path d="M16 5.5v14.5" stroke="${AW}" stroke-width="1.5"/><path d="M16.8 6.5l7 12.5h-7z" fill="${AW}"/><path d="M15.2 9.5l-5.6 9.5h5.6z" fill="${AL}"/>`,
    ramen: `<path d="M11 4.5l4.5 10M15 4l2.5 10.5" stroke="${AW}" stroke-width="1.6" stroke-linecap="round"/><path d="M5.5 15.5h21a10.5 9 0 01-21 0z" fill="${AW}"/><path d="M8.5 15.5c1.4-2 2.8-2 4.2 0s2.8 2 4.2 0 2.8-2 4.2 0" fill="none" stroke="${AY}" stroke-width="1.7"/><circle cx="22.6" cy="13.3" r="2.3" fill="${AY}" stroke="${AW}" stroke-width="1"/><rect x="12" y="24.8" width="8" height="2" rx="1" fill="${AW}"/>`,
    flag: `<path d="M10 5.5v21" stroke="${AW}" stroke-width="2" stroke-linecap="round"/><path d="M11 6.5h12l-2.6 4 2.6 4H11z" fill="${AW}"/><circle cx="16.3" cy="10.5" r="2" fill="${AK}"/><path d="M6 26.5h14" stroke="${AW}" stroke-width="2" stroke-linecap="round"/>`,
    cityhall: `<path d="M16 4.5v5" stroke="${AW}" stroke-width="1.4"/><path d="M16.6 4.8h5.2l-1.4 1.8 1.4 1.8h-5.2z" fill="${AL}"/><path d="M6.5 14L16 9.5l9.5 4.5z" fill="${AW}"/><rect x="8" y="15" width="16" height="9" fill="${AW}"/><path d="M11.2 17v5M14.4 17v5M17.6 17v5M20.8 17v5" stroke="${AK}" stroke-width="1.5"/><rect x="5.5" y="24.5" width="21" height="2.2" rx="1.1" fill="${AW}"/>`,
    tram: `<path d="M12 6.5h8M16 6.5v3" stroke="${AW}" stroke-width="1.4" stroke-linecap="round"/><rect x="6.5" y="9.5" width="19" height="13" rx="3.5" fill="${AW}"/><rect x="9" y="12" width="6" height="4.5" rx="1" fill="${AS}"/><rect x="17" y="12" width="6" height="4.5" rx="1" fill="${AS}"/><path d="M6.5 19h19" stroke="${AL}" stroke-width="1.6"/><circle cx="11" cy="23.6" r="1.4" fill="${AW}"/><circle cx="21" cy="23.6" r="1.4" fill="${AW}"/><path d="M4 26h24" stroke="${AW}" stroke-width="1.5" stroke-linecap="round"/>`,
    bowl: `<path d="M5 7h22" stroke="${AW}" stroke-width="2" stroke-linecap="round"/><path d="M6.5 8h5.6v8.5l-2.8 1.5-2.8-1.5zM13.2 8h5.6v8.5L16 18l-2.8-1.5zM19.9 8h5.6v8.5l-2.8 1.5-2.8-1.5z" fill="${AW}"/><path d="M9.5 21.5c.9 1 .9 2.2 0 3.3M16 21.5c.9 1 .9 2.2 0 3.3M22.5 21.5c.9 1 .9 2.2 0 3.3" stroke="${AO}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    shirt: `<path d="M11.5 6.5L5.5 10l2.6 4.6 2.4-1.3V26h11V13.3l2.4 1.3 2.6-4.6-6-3.5c-.8 1.8-2.5 2.8-4.5 2.8s-3.7-1-4.5-2.8z" fill="${AW}"/><rect x="17.4" y="15" width="3.2" height="3.4" rx=".7" fill="${AL}"/>`,
    camera: `<rect x="5.5" y="10.5" width="21" height="14" rx="3" fill="${AW}"/><path d="M11 10.5l1.5-3h7l1.5 3z" fill="${AW}"/><circle cx="16" cy="17.5" r="4.6" fill="#3B3355"/><circle cx="16" cy="17.5" r="2.4" fill="${AS}"/><circle cx="22.6" cy="13.4" r="1" fill="${AO}"/>`,
    mountain: `<circle cx="23.5" cy="9.5" r="3" fill="${AY}"/><path d="M2.5 27l9.5-14 5 7 3.2-4.2L29.5 27z" fill="${AW}"/><path d="M12 13l2.4 3.4-1.3-.4-1.1 1-1.1-1-1.3.4z" fill="${AL}"/>`,
    me: `<circle cx="16" cy="13" r="5.6" fill="${AW}"/><path d="M5.5 28.5c1.3-6 5.3-8.5 10.5-8.5s9.2 2.5 10.5 8.5z" fill="${AW}"/><path d="M10.4 12.6c.4-4.2 3-6.4 6.3-6.1 3 .3 4.8 2.4 5 5.4-2.6-.3-5-1.4-6.6-3.2-1 1.8-2.6 3.2-4.7 3.9z" fill="#2F3E48"/>`,
  };
  const initial = (w) => w.initial || w.name[0];
  const artSvg = (w) => (w && ART[w.art] ? `<svg viewBox="0 0 32 32" aria-hidden="true">${ART[w.art]}</svg>` : "");
  const avatar = (w, cls = "") => {
    const a = artSvg(w);
    if (a) return `<span class="avatar art ${cls}" style="background:${w.color}" role="img" aria-label="${esc(w.name)}">${a}</span>`;
    const t = initial(w);
    return `<span class="avatar ${cls} ${t.length > 1 ? "two" : ""}" style="background:${w.color}">${esc(t)}</span>`;
  };
  const ratingTag = (n) => `<span class="rating r${n}">${RATING[n]}</span>`;
  // 写真がない場所は、場所の種類の色で埋める
  function photoStyle(spot) {
    const [a, b] = KIND_BG[spot.kind] || ["#7F8C84", "#123D2B"];
    return `background:linear-gradient(135deg, ${a}, ${b})`;
  }

  /* 写真：images/ の名前（src）から。small = カードや吹き出し用の小さい版 */
  // 自分で入れた写真（data: の URL）は、そのまま使う
  const img = (src, small) => (/^(data:|blob:|https?:)/.test(src) ? src : `images/${src}${small ? "-s" : ""}.jpg`);
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
    const lp = r.leadBlocks && photosOfBlocks(r.leadBlocks)[0]; // 書く画面の「はじめに」に入れた写真
    if (lp) return lp.src;
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
  const PIN_SIZE = { fav: 26, official: 26, mine: 22, saved: 20, other: 16, num: 28, found: 32, off: 12 }; // off：タグに関係のない、ルートの途中の場所
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
  // 最近（3か月）その記事を読んだ人の数。試作のデータには無いので、記事ごとに決まった仮の数にする（自分で公開した記事は 0）
  const hashOf = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function readsOf(r) {
    if (r.reads != null) return r.reads;
    if (r.writer === "me") return 0;
    const h = hashOf(r.id);
    return Math.round((r.went || 0) * (1.8 + (h % 23) / 10)) + 12 + (h % 47);
  }
  /* いいね：読んだ人が「行ってみたい」と思った記事に付ける、その人だけの印（V.liked：記事の id）。
     いいねの数は読む人には見せない。書いた人だけが、自分の記事の「行った」と「いいね」の数を見られる。
     地図では、いいねした記事の場所のピンのふちをピンクにし、まだいいねしていない場所のピンは色をうすくする */
  const isLiked = (r) => !!r && V.liked.includes(r.id);
  const likesOf = (r) => r.likes || 0; // 書いた人にだけ見せる数
  function likedSpots() {
    const set = new Set();
    D.records.forEach((r) => { if (isLiked(r)) r.spots.forEach((x) => set.add(x.spot)); });
    return set;
  }
  function toggleLike(r) {
    const i = V.liked.indexOf(r.id), on = i < 0;
    if (on) V.liked.push(r.id); else V.liked.splice(i, 1);
    r.likes = Math.max(0, likesOf(r) + (on ? 1 : -1));
    toast(on ? "いいねしました。地図で、この記事の場所のピンのふちがピンクになります" : "いいねを外しました");
    return on;
  }
  // 上の切り替え：お気に入り／エキスパート／すべての人 から1つ。♡（いいねした記事だけ）は、それと重ねて使う
  const MODE_NAMES = { fav: "お気に入り", group: "エキスパート", all: "すべての人" };
  const modeLabel = () => MODE_NAMES[state.mode] + (state.likedOnly ? "・いいね" : "");
  // 数を短く書く（1万をこえたら「1.2万」）
  const nfmt = (n) => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "万" : n.toLocaleString());
  // その場所の記事の数と、その場所の記事から「行った」人の累計（絞り込みに関係なく、その場所のすべて）
  function placeStats(id) {
    const recs = D.records.filter((r) => r.spots.some((x) => x.spot === id));
    return { n: recs.length, went: recs.reduce((a, r) => a + (r.went || 0), 0) };
  }
  // おまかせで選んだ場所は、選んだ理由（pickWhy）と、何の代わりか（replacedFrom）を時刻を計算し直しても残す
  const schedule = (start, stops) => (stops.length ? R.buildSchedule(D, { start: R.fmt(start), spots: stops })
    .map((s, i) => (stops[i].pickWhy ? { ...s, pickWhy: stops[i].pickWhy, replacedFrom: stops[i].replacedFrom || null } : s)) : []);

  /* ---------- 地図（探す・つくる・たどる で同じ地図を使う） ---------- */
  let map, layer, bubbleLayer, pinInfo = [], drawnZoom = null; // drawnZoom：ピンを置いたときの拡大の度合い（変わったら、まとめ方を数え直す）
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
        // （場所を選んでいるときは、一覧はその場所の記事のままなので薄くしない）
        m.on("movestart", () => { if (stage() === "explore") { clearTimeout(areaTimer); if (!state.place) $("#sheet-body").classList.add("waiting"); } });
        m.on("moveend", () => {
          // 拡大・縮小したら、近くの場所のまとめ方が変わるので描き直す（吹き出しも置き直す）
          if (m.getZoom() !== drawnZoom && stage() !== "follow") drawMap(false); else refreshBubbles();
          if (stage() === "explore") scheduleArea();
        });
        // 探す：地図の何もない所を押すと、場所の絞り込みをやめる
        m.on("click", () => { if (stage() === "explore" && state.place) clearPlace(); });
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
  // areaOver：範囲を決めたときにシートが地図に重なっていた高さ。シートを引き上げただけ（地図は動いていない）なら範囲は変えない
  let areaTimer = null, areaBounds = null, areaOver = 0;
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
    areaBounds = computeArea(); areaOver = sheetOver();
    renderSheet();
    const body = $("#sheet-body");
    body.classList.remove("waiting", "fresh");
    if (state.place) return; // 場所を選んでいるときは一覧が変わらないので、入れ替わりの動きは出さない（範囲だけ覚えておく）
    void body.offsetWidth; body.classList.add("fresh");
  }
  function scheduleArea(delay = 450) {
    clearTimeout(areaTimer);
    if (!state.place) $("#sheet-body").classList.add("waiting");
    areaTimer = setTimeout(updateArea, delay);
  }
  /* タグで絞ったとき、その記事の中でタグに合う場所。ルートの記事は、タグと関係のない場所（例：ラーメンで探したときの神社）を外す。
     旅行・聖地巡礼のように出かけ方全体につくタグは全部の場所。1か所の記事と、場所ごとに合う所がひとつもないルートも全部の場所 */
  const WHOLE_TAGS = ["旅行", "聖地巡礼"];
  function tagSpots(r, tag) {
    if (!tag || r.spots.length < 2 || WHOLE_TAGS.includes(tag)) return r.spots;
    const hit = r.spots.filter((x) => (x.tags || []).includes(tag) || ((spotById[x.spot] || {}).tags || []).includes(tag));
    return hit.length ? hit : r.spots;
  }
  // 地図に映っている範囲の記事か（タグで絞っているときは、タグに合う場所で見る）
  const inArea = (r) => !areaBounds || tagSpots(r, state.tag).some((s) => areaBounds.contains([spotById[s.spot].lat, spotById[s.spot].lng]));

  function visibleRecords() {
    return D.records.filter((r) => {
      if (state.tag && !r.tags.includes(state.tag)) return false;
      if (state.likedOnly && !isLiked(r)) return false; // ♡：いいねした記事（の場所）だけ。お気に入り・エキスパート・すべての人と重ねる
      if (r.official || r.writer === "me") return true; // 自分で公開した記事も出す
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
    layer.clear(); pinInfo = []; drawnZoom = map.getZoom();
    const st = stage();
    let pts = [];
    if (st === "explore") pts = drawRecords(false);
    if (st === "make" || st === "redo") { const rp = drawRecords(true), dp = drawDraft(); pts = dp.length ? dp : rp; }
    if (st === "follow") pts = drawFollow();
    drawFound(st);
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
      // on：タグに合う場所（タグで絞っていなければ全部）。ほかの記事でタグに合うなら、そちらを使う
      const onSet = new Set(tagSpots(r, state.tag).map((x) => x.spot));
      if (r.type === "route") {
        const strong = fk || r.official;
        const base = { dash: r.official ? "6 6" : null, onClick: make ? null : () => openArticle(r.id) }; // 線は1つの記事なので、押すとその記事へ
        const onLine = { ...base, color, weight: make ? 2.5 : strong ? 4 : 2.5, opacity: make ? 0.28 : strong ? 0.85 : 0.6 };
        // タグに関係のない場所につながる区間は、その場所の点と同じうすい灰色（続いている区間は1本の線にまとめる）
        const offLine = { ...base, color: OFF_GRAY, weight: make ? 2.5 : strong ? 3 : 2.5, opacity: make ? 0.5 : 1, z: -1 };
        let run = null;
        const flush = () => { if (run) layer.line(run.ll, run.on ? onLine : offLine); };
        r.spots.forEach((x, i) => {
          if (!i) return;
          const a = r.spots[i - 1].spot, on = onSet.has(a) && onSet.has(x.spot);
          if (!run || run.on !== on) { flush(); run = { on, ll: [spotLL(a)] }; }
          run.ll.push(spotLL(x.spot));
        });
        flush();
      }
      r.spots.forEach((s) => {
        const sp = spotById[s.spot], on = onSet.has(s.spot);
        if (on) pts.push([sp.lat, sp.lng]); // 地図を合わせるのは、タグに合う場所だけ
        const rank = r.official ? 2 : fk ? 3 : 1, cur = seen[sp.id];
        if (cur && (cur.on > on || (cur.on === on && cur.rank >= rank))) return;
        seen[sp.id] = { rank, r, s, sp, color, fk, on };
      });
    });
    // つくる：登録した場所も予定に入れられるように出す
    if (make) V.saved.forEach((x) => {
      if (seen[x.spot]) return;
      const b = bestRecordFor(x.spot);
      seen[x.spot] = { rank: 0, r: b && b.r, s: b && b.s, sp: spotById[x.spot], saved: true, on: true };
    });
    // 探す：選んでいる場所は、絞り込みでその場所の記事が隠れても出しておく
    if (!make && state.place && !seen[state.place] && spotById[state.place]) {
      const b = bestRecordFor(state.place);
      if (b) seen[state.place] = { rank: 0, r: b.r, s: b.s, sp: spotById[state.place], color: "#A9B2AC", fk: null, on: true };
    }
    // 引きの地図では、近い場所をまとめて「場所の数」の丸にする（記事がいくつあっても、1つの場所は1と数える）
    const lks = likedSpots();
    const places = Object.values(seen).filter((x) => !inDraft.has(x.sp.id));
    // タグに関係のない、ルートの途中の場所：うすい灰色の小さな点（数の丸にはまとめず、吹き出しも出さない。押せば、その場所の記事）
    places.filter((x) => !x.on).forEach(({ r, s, sp }) => {
      const sel = !make && sp.id === state.place;
      const icon = { ...divPin(sel ? "off sel" : "off", ""), title: `${sp.name}（「${state.tag}」とは関係のない、ルートの途中の場所）` };
      addPin([sp.lat, sp.lng], icon, { half: (PIN_SIZE.off / 2) * (sel ? 1.35 : 1), prio: -1, sp, r, s, off: true }, () => (make ? toggleDraftSpot(sp.id) : selectPlace(sp.id)), sel ? 800 : -20);
    });
    const { singles, groups } = clusterPlaces(places.filter((x) => x.on), (x) => !make && x.sp.id === state.place);
    groups.forEach((g) => addCluster(g, g.some((x) => lks.has(x.sp.id))));
    singles.forEach(({ rank, r, s, sp, color, fk, saved }) => {
      const kind = saved ? "saved" : r.official ? "official" : fk ? "fav" : "other";
      // いいねした場所：ふちがピンク（lk）。まだの場所：ふちは白のまま、中の色をうすく（nl）。登録した場所の白いピンはそのまま
      const lk = lks.has(sp.id), sel = !make && sp.id === state.place;
      const cls = kind + (kind === "saved" ? "" : lk ? " lk" : " nl") + (sel ? " sel" : "");
      const icon = kind === "saved" ? divPin(cls, "") : kind === "official" ? divPin(cls, "公式") : kind === "fav" ? divPin(cls, artSvg(writerById[r.writer]) || esc(initial(writerById[r.writer])[0]), `background:${color}`) : divPin(cls, "");
      if (!make) icon.title = sp.name;
      // 探す：押すと、下のシートをその場所の記事だけにする（1つの場所に記事がいくつもあることがあるので、記事へは直接飛ばない）
      addPin([sp.lat, sp.lng], icon, { half: (PIN_SIZE[kind] / 2) * (sel ? 1.35 : 1), prio: sel ? 99 : rank, sp, r, s, sel, lk }, () => (make ? toggleDraftSpot(sp.id) : selectPlace(sp.id)), sel ? 800 : 0);
      if (!make && state.mode === "group") {
        const t = state.tag || Object.keys(sp.groupLikes || {})[0];
        const n = sp.groupLikes && sp.groupLikes[t];
        if (n) layer.marker([sp.lat, sp.lng], { html: `<div class="pin-count">また行きたい ${n}人</div>`, size: [0, 0], anchor: [0, 0], interactive: false });
      }
    });
    return pts;
  }

  /* 近い場所をまとめる（大島てるの引きの地図のように、数の丸にする）。十分に拡大したら（CLUSTER_Z 以上）まとめない。
     keep(x) が true の場所（選んでいる場所）はまとめない。返す値：singles（そのまま出す場所）、groups（まとめた場所の組） */
  const CLUSTER_Z = 17;
  function clusterPlaces(list, keep) {
    const z = map.getZoom();
    if (z >= CLUSTER_Z || list.length < 2) return { singles: list, groups: [] };
    const R = z >= BUBBLE_ZOOM ? 26 : 40; // 最初の場所からこの距離（px）までの場所を1つの丸にまとめる
    // 地図を動かしてもまとめ方が変わらないよう、決まった順（目立つピン → 場所の id）で数える
    const items = list.map((x) => ({ x, pt: map.toPoint([x.sp.lat, x.sp.lng]), k: keep(x) }))
      .sort((a, b) => b.x.rank - a.x.rank || (a.x.sp.id < b.x.sp.id ? -1 : 1));
    const gs = [];
    items.forEach((it) => {
      const g = !it.k && gs.find((q) => !q.k && Math.hypot(q.pt.x - it.pt.x, q.pt.y - it.pt.y) < R);
      if (g) g.items.push(it.x); else gs.push({ pt: it.pt, k: it.k, items: [it.x] });
    });
    return { singles: gs.filter((g) => g.items.length === 1).map((g) => g.items[0]), groups: gs.filter((g) => g.items.length > 1).map((g) => g.items) };
  }
  // まとめた場所の丸（中の数は場所の数）。押すと、その場所が全部見えるところまで拡大する
  function addCluster(list, lk) {
    const lls = list.map((x) => [x.sp.lat, x.sp.lng]);
    const ll = [lls.reduce((a, q) => a + q[0], 0) / lls.length, lls.reduce((a, q) => a + q[1], 0) / lls.length];
    const n = list.length, d = n >= 100 ? 44 : n >= 10 ? 38 : 32;
    pinInfo.push({ ll, half: d / 2, prio: -1, block: true }); // 吹き出しが丸に重ならないように（丸には吹き出しを出さない）
    layer.marker(ll, {
      html: `<div class="pin-cluster ${lk ? "lk" : ""}" style="width:${d}px;height:${d}px">${n}</div>`, size: [d, d], anchor: [d / 2, d / 2], z: 700,
      title: `${n}か所${lk ? "（いいねした場所あり）" : ""}（押すと拡大）`,
      onClick: () => map.fit(lls, { pad: 0.25, maxZoom: CLUSTER_Z + 1, top: topInset() + 40, left: 40, right: 40, bottom: sheetOver() + 40 }),
    });
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
  const OFF_GRAY = "#C9CFCB"; // タグに関係のない、ルートの途中の場所につながる線（点は css の .pin.off）

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
      const info = { half: 14, below: d.simple ? 0 : TIME_H, prio: 10, sp, r: b && b.r, s: b && b.s, num: numOf(d, i) };
      if (i < lk) { // いまいる場所・出てきた場所（動かせない）
        const skipHere = rd && rd.kind === "at" && rd.closed, left = rd && rd.kind !== "at";
        const cls = left ? "fl done" : skipHere ? "fl dropped now" : "fl now";
        addPin(ll[i], numPin(numOf(d, i), skipHere || left ? "" : R.fmt(a.arrive), cls), { ...info, fl: true }, () => b && openArticle(b.r.id), 900);
        return;
      }
      const warn = !!stopWarn(sp, a);
      const m = addPin(ll[i], numPin(numOf(d, i), d.simple ? "" : R.fmt(a.arrive), "", !d.simple && warn), info, () => {
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
          return `<button class="picker-row ${k === fi ? "on" : ""}" data-to="${k}"><span class="mk-num">${numOf(d, k)}</span><span class="pr-name">${k === fi ? `<b>${name}</b>` : name}</span>${d.simple ? "" : `<span class="pr-time ${warn ? "warn" : ""}">${R.fmt(sch[k].arrive)}着</span>`}<span class="grip" aria-hidden="true">${ICON.grip}</span></button>`;
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

  /* 吹き出し：ある程度拡大して、まわりに余白があるピンだけに、場所の概要（場所名・記事名・評価・行った人・読んだ人）を出す。
     探すでは押すとその場所の記事だけにする。つくる・たどるでは記事へ */
  const BW = 196, BH = 62, BGAP = 9, BUBBLE_ZOOM = 15, BOUT = 21; // BOUT：吹き出しの外に出す数の帯の高さ（すきまを含む）
  function refreshBubbles() {
    if (!map || !bubbleLayer) return;
    bubbleLayer.clear();
    if (!$("#view-map").classList.contains("active")) return;
    placeBubbles(map, bubbleLayer, pinInfo.map((p) => ({ ...p, b: p.block || p.off ? null : mainBubble(p) })), topInset() + 4, map.getSize().y - sheetOver() - 4);
  }
  // 探す・つくる・たどる の吹き出しの中身
  function mainBubble(p) {
    const w = p.r && writerById[p.r.writer], ph = p.r && stopPhotos(p.r, p.sp.id)[0];
    const st = stage(), ex = st === "explore";
    // 吹き出しの外：その場所のほかの記事の数と、その場所に行った人の累計（記事が2つ以上ある場所だけ。たどるでは出さない）
    const ps = p.r && st !== "follow" ? placeStats(p.sp.id) : null;
    return {
      cls: `${p.num ? (p.fl ? "is-fl" : "is-num") : ""} ${p.r ? "" : "no-rec"} ${p.sel ? "is-sel" : ""}`, num: p.num, name: p.sp.name,
      title: p.r ? "「" + p.r.title + "」" : p.sp.kind + "（記事はまだありません）",
      rating: p.r && p.s.rating, who: w && w.name, go: p.r && !ex ? "記事 ›" : "", photo: ph && ph.src, lk: !!p.lk,
      stats: p.r ? { went: p.r.went || 0, reads: readsOf(p.r) } : null, // 右上：この記事から行った人・最近読んだ人
      out: ps && ps.n > 1 ? { more: ps.n - 1, went: ps.went } : null,
      onClick: !p.r ? null : ex ? () => selectPlace(p.sp.id) : () => openArticle(p.r.id),
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
    pins.filter((p) => p.b && p.pt.x >= 0 && p.pt.x <= size.x && p.pt.y >= top && p.pt.y <= bottom) // b がない点（まとめた丸）は、よけるだけ
      .sort((a, b) => b.prio - a.prio)
      .forEach((p) => {
        const o = p.half + BGAP, ob = o + (p.below || 0);
        const cand = {
          top: { x: p.pt.x - BW / 2, y: p.pt.y - o - BH }, bottom: { x: p.pt.x - BW / 2, y: p.pt.y + ob },
          right: { x: p.pt.x + o, y: p.pt.y - BH / 2 }, left: { x: p.pt.x - o - BW, y: p.pt.y - BH / 2 },
        };
        const out = p.b.out ? BOUT : 0; // 外の数の帯：上に出す吹き出しは上、ほかは下につく
        for (const pos of ["top", "bottom", "right", "left"]) {
          const r = { x: cand[pos].x, y: cand[pos].y - (pos === "top" ? out : 0), w: BW, h: BH + out };
          if (r.x < 6 || r.x + BW > size.x - 6 || r.y < top || r.y + r.h > bottom) continue;
          if (placed.some((q) => hit(q, r, 6))) continue;
          if (pins.some((q) => q !== p && hit(q.box, r))) continue;
          placed.push(r); addBubble(lyr, p, pos, o, ob); break;
        }
      });
  }
  function addBubble(lyr, p, pos, o, ob) {
    const anchor = { top: [BW / 2, o + BH], bottom: [BW / 2, -ob], right: [-o, BH / 2], left: [BW + o, BH / 2] }[pos];
    const b = p.b, src = b.photoUrl || (b.photo && img(b.photo, true)); // photoUrl：自分で入れた写真（そのまま使う）
    // 右上の数（期間は吹き出しには書かない。マウスを重ねたときだけ出す）
    const bst = b.stats ? `<span class="bst" title="この記事から行った人 ${b.stats.went.toLocaleString()}人・最近3か月で読んだ人 ${b.stats.reads.toLocaleString()}人"><span>${IC.foot}${nfmt(b.stats.went)}</span><span>${IC.reader}${nfmt(b.stats.reads)}</span></span>` : "";
    const bout = b.out ? `<span class="bout ${pos === "top" ? "up" : "down"}" title="この場所のほかの記事 ${b.out.more}件・この場所の記事から行った人 累計${b.out.went.toLocaleString()}人"><span>${IC.doc}ほか${b.out.more}</span><span>${IC.foot}累計${nfmt(b.out.went)}</span></span>` : "";
    const html = `<div class="bubble b-${pos} ${b.cls || ""} ${src ? "has-ph" : ""}">
      ${src ? `<img class="bph" src="${src}" alt="" loading="lazy">` : ""}
      <span class="btx">
        <span class="brow"><span class="bn">${b.num ? `<i>${b.num}</i>` : ""}${b.lk ? `<span class="blk" title="いいねした場所">${IC.heartf}</span>` : ""}${esc(b.name)}</span>${bst}</span>
        <span class="bt">${esc(b.title)}</span>
        ${b.rating || b.who ? `<span class="bm">${b.rating ? ratingTag(b.rating) : ""}<span class="bw">${esc(b.who || "")}</span>${b.go ? `<span class="bgo">${esc(b.go)}</span>` : ""}</span>` : ""}
      </span>${bout}
    </div>`;
    lyr.marker(p.ll, { cls: "bubble-icon", html, size: [BW, BH], anchor, z: 3000 + (b.z || 0), onClick: b.onClick || null });
  }

  /* 地図の上：探すは検索、つくる・たどるは切り替え */
  // 名前で場所を探すボタン（つくる・組み直す）。探すは上の検索の帯から
  const searchBtn = `<button class="stage-search" data-act="search" aria-label="場所を名前で探す">${IC.search}<span>探す</span></button>`;
  function renderTop() {
    const st = stage();
    $("#top-search").hidden = st !== "explore";
    $("#stage-bar").hidden = st === "explore";
    $("#chips").hidden = st === "follow";
    $("#mode-row").hidden = st === "follow";
    if (st === "redo") {
      $("#stage-bar").innerHTML = `<div class="stage-title"><b>組み直す</b><span>行く場所を地図で選ぶ</span></div>${searchBtn}`;
    } else if (st !== "explore") {
      $("#stage-bar").innerHTML = `<div class="seg stage-seg">${[["make", IC.cal, "つくる"], ["follow", IC.route, "たどる"]].map(([k, i, l]) => `<button data-stage="${k}" class="${st === k ? "on" : ""}">${i}${l}</button>`).join("")}</div>${st === "make" ? searchBtn : '<span class="demo-badge">試作・データは仮</span>'}`;
    }
  }
  function renderChips() {
    const tags = [null, ...D.TAGS];
    $("#chips").innerHTML = tags.map((t) => `<button class="chip ${state.tag === t ? "on" : ""}" data-tag="${t || ""}">${t || "すべて"}</button>`).join("");
    $("#modes").innerHTML = Object.entries(MODE_NAMES).map(([k, l]) => `<button class="${state.mode === k ? "on" : ""}" data-mode="${k}">${l}</button>`).join("");
    // ♡：押すと、いいねした記事の場所だけ（中が塗られる）。もう一度押すと戻る
    const lf = $("#like-filter"), on = state.likedOnly;
    lf.classList.toggle("on", on);
    lf.setAttribute("aria-pressed", on ? "true" : "false");
    lf.title = on ? "いいねした場所だけを出しています（押すと戻す）" : "いいねした場所だけを出す";
    lf.innerHTML = on ? IC.heartf : IC.heart;
  }

  /* ---------- 下のシート（探す：記事／つくる：予定表／たどる：予定） ---------- */
  function renderSheet() {
    const st = stage(), body = $("#sheet-body");
    const keep = body.dataset.stage === st ? body.scrollTop : 0;
    if (st !== "explore") body.classList.remove("waiting", "fresh");
    // たどっている途中は、シートのふちを色つきの光で光らせて「いま進んでいる予定」だとわかるようにする
    $("#sheet").classList.toggle("live", st === "follow" && !!state.plan && !state.followList && state.plan.phase !== "end");
    $("#sheet-head").classList.toggle("pl-head", st === "explore" && !!spotById[state.place]);
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
      <div class="meta"><span>${kind}</span><span>${esc(r.tags.join("・"))}</span><span>「行った」${r.went}人</span>${w.self ? `<span>いいね ${likesOf(r)}人</span>` : ""}</div>
      <div class="meta" style="margin-top:4px">${ratingTag(best)}${isLiked(r) ? `<span class="badge liked">${IC.heartf}いいね済み</span>` : ""}${r.stamp ? '<span class="badge official">スタンプラリー</span>' : ""}${lock}</div>
    </button>`;
  }

  function renderExploreSheet() {
    if (spotById[state.place]) { renderPlaceSheet(); return; }
    const all = visibleRecords();
    const recs = all.filter(inArea);
    const off = recs.filter((r) => r.official);
    const favs = recs.filter((r) => !r.official && favKind(r.writer, r));
    const others = recs.filter((r) => !r.official && !favKind(r.writer, r));
    const label = modeLabel();
    $("#sheet-head").innerHTML = `<b>${esc(state.tag || "すべて")}の記事</b><small>${areaBounds ? "この範囲 " : ""}${recs.length}件・${label}</small>`;
    let html = "";
    if (favs.length) html += `<div class="section-label">お気に入りの書き手</div>` + favs.map(recordCard).join("");
    if (others.length) html += `<div class="section-label">${state.mode === "group" ? "エキスパート（このタグの記録が多い人たち）" : "ほかの書き手"}</div>` + others.map(recordCard).join("");
    if (off.length) html += `<div class="section-label">公式（自治体・企業）</div>` + off.map(recordCard).join("");
    const within = [state.tag && `「${esc(state.tag)}」`, state.mode !== "all" && MODE_NAMES[state.mode]].filter(Boolean).join("・");
    if (!all.length) html = state.likedOnly
      ? `<div class="empty">${within ? `${within}の記事で、いいねしたものはまだありません。` : "いいねした記事はまだありません。"}<br>記事を読んで、行ってみたいと思ったら ♡ いいね を押すと、その場所がここと地図に出ます。${state.mode !== "all" ? "<br>「すべての人」にすると、ほかの人の記事でいいねしたものも出ます。" : ""}</div>`
      : `<div class="empty">この条件の記事はまだありません。<br>「エキスパート」に切り替えてみてください。</div>`;
    else if (!recs.length) html = `<div class="empty">地図に映っている範囲には、記事がありません。<br>地図を縮小するか、動かしてみてください。<br><br><button class="btn ghost small" data-act="fit-all">記事のある場所を表示する（${all.length}件）</button></div>`;
    $("#sheet-body").innerHTML = foundCard() + html;
  }

  /* 探す：地図で選んだ場所の記事だけを出す。いまの絞り込み（タグ・お気に入りなど）に合う記事を先に、合わない記事もその下に出す */
  function renderPlaceSheet() {
    const sp = spotById[state.place], all = recsAt(sp.id), vis = new Set(visibleRecords().map((r) => r.id));
    const score = (r) => { const k = favKind(r.writer, r); return k === "fav" ? 3 : k ? 2 : r.official ? 1 : 0; };
    const order = (a, b) => score(b) - score(a) || (b.went || 0) - (a.went || 0);
    const hit = all.filter((r) => vis.has(r.id)).sort(order), rest = all.filter((r) => !vis.has(r.id)).sort(order);
    const ps = placeStats(sp.id);
    const label = modeLabel(), liked = all.some(isLiked);
    $("#sheet-head").innerHTML = `<button class="pl-back" data-act="place-clear" aria-label="この範囲の記事に戻る">${IC.back}</button><b>${esc(sp.name)}</b><small>記事${all.length}件・${IC.foot}累計${nfmt(ps.went)}人</small>`;
    let html = `<div class="pl-sub">${esc(sp.kind)}${sp.addr ? "・" + esc(sp.addr) : ""}<span>この場所の記事だけを出しています</span>${liked ? `<span class="pl-lk">${IC.heartf}いいねした記事あり</span>` : ""}</div>`;
    html += hit.map(recordCard).join("");
    if (rest.length) html += `<div class="section-label">いまの絞り込み（${esc(state.tag || "すべて")}・${label}）には入らない記事</div>` + rest.map(recordCard).join("");
    if (!all.length) html += `<div class="empty">この場所の記事はまだありません。</div>`;
    $("#sheet-body").innerHTML = html;
  }
  // 地図で場所を押したとき（ピン・吹き出し）。シートが下がっていたら半分まで上げ、ピンが隠れていたら見える所まで地図を動かす
  function selectPlace(id) {
    const sp = spotById[id];
    if (!sp) return;
    state.place = id;
    if ($("#sheet").classList.contains("peek")) setSheet("half");
    renderSheet(); $("#sheet-body").scrollTop = 0;
    drawMap(false);
    if (!map) return;
    const size = map.getSize(), pt = map.toPoint([sp.lat, sp.lng]), y0 = topInset(), y1 = size.y - sheetOver();
    if (pt.y < y0 + 24 || pt.y > y1 - 24 || pt.x < 24 || pt.x > size.x - 24) map.centerOn([sp.lat, sp.lng], map.getZoom(), (y0 + y1) / 2 - size.y / 2, true);
  }
  // 場所の絞り込みをやめて、地図に映っている範囲の記事に戻す（見出しの ‹、地図の何もない所を押す）
  function clearPlace() {
    if (!state.place) return;
    state.place = null;
    renderSheet(); drawMap(false);
    const body = $("#sheet-body");
    body.classList.remove("fresh"); void body.offsetWidth; body.classList.add("fresh");
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
  // 記事から予定をつくったとき：どの順でどこを回るかだけ（時間は出さない）。すぐに保存でき、「詳しく調整」でいつもの画面へ
  function renderSimpleMake(d) {
    $("#sheet-head").innerHTML = `<b>予定をつくる</b><small>${d.stops.length}か所・回る順番</small>`;
    const list = d.stops.map((s, i) => { const sp = spotById[s.spot]; return `<li><i class="mk-num">${i + 1}</i><span><b>${esc(sp.name)}</b>${sp.kind ? `<small>${esc(sp.kind)}</small>` : ""}</span></li>`; }).join("");
    const saved = d.id && !d.dirty;
    $("#sheet-body").innerHTML = foundCard() + `<ol class="sm-list">${list}</ol>
      ${d.from ? `<div class="mk-tip">元の記事：${esc(recById[d.from].title)}</div>` : ""}
      <div class="mk-save"><input class="field" id="mk-name" placeholder="予定の名前" value="${esc(d.name)}" aria-label="予定の名前"><button class="btn primary" data-mk="save">${IC.save}${d.id ? "上書き" : "保存"}</button></div>
      ${saved ? `<div class="saved-note">${IC.check}<span>保存しました。時間は、たどる前に決めます</span><button class="link-btn" data-mk="follow">${IC.clock}時間を決めてたどる</button></div>` : `<div class="small sm-note">順番だけで保存できます。時間は、たどるときに決められます</div>`}
      <button class="btn ghost block sm-detail" data-mk="detail">${IC.clock}詳しく調整</button>`;
  }
  function renderMakeSheet() {
    const d = state.draft, sch = schedule(d.start, d.stops), n = sch.length;
    if (d.simple && n) { renderSimpleMake(d); return; }
    const decide = d.decide && !!d.id; // たどるで、時間をまだ決めていない予定を選んで開いたとき
    const span = n ? `${R.fmt(sch[0].arrive)}–${R.fmt(sch[n - 1].depart)}` : "";
    $("#sheet-head").innerHTML = `<b>${decide ? "時間を決める" : "予定をつくる"}</b><small>${n ? `${n}か所・${span}` : "地図の場所を押して始める"}</small>`;
    if (!n) {
      $("#sheet-body").innerHTML = foundCard() + `<div class="mk-steps">
          <span>${IC.pin}<b>場所を押す</b></span><span class="arr">›</span><span><i class="mk-num">1</i><b>順に入る</b></span><span class="arr">›</span><span>${IC.save}<b>名前を付けて保存</b></span>
        </div>
        <div class="small mk-steps-note">もう一度押すと外れます。記事のない場所は、上の「探す」で名前から。「読む」の記事の「つくる」から、書いた人のルートを入れることもできます。</div>`;
      return;
    }
    const chain = sch.map((s, i) => `<span class="chain-stop"><i>${i + 1}</i>${R.fmt(s.arrive)} ${esc(spotById[s.spot].name)}</span>`).join('<span class="chain-arrow">›</span>');
    const route = gmapRoute(sch.map((x) => spotById[x.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking");
    $("#sheet-body").innerHTML = foundCard() + `${decide ? `<div class="mk-decide-hint">${IC.clock}<span>時間を決めて、いちばん下の「決定」を押すと、そのままたどり始めます</span></div>` : ""}<div class="chain">${chain}</div>
      <div class="mk-bar">
        <label class="mk-start" title="出発の時刻">${IC.clock}<span>出発</span><input type="time" class="time-in" id="mk-start" value="${R.fmt(d.start)}" step="300"></label>
        <a class="tool-btn" href="${route}" target="_blank" rel="noopener" title="この順番で Google マップを開く">${IC.pin}<span>Google</span></a>
        <button class="tool-btn" data-mk="new" title="新しくつくる（空にする）">${IC.trash}<span>空にする</span></button>
      </div>
      <div class="mk-list">${stopItems(d, sch)}</div>
      <div class="mk-tip">${ICON.grip}をつかむか、地図の番号を長押しで並べ替え</div>
      ${d.from ? `<div class="mk-tip">元の記事：${esc(recById[d.from].title)}</div>` : ""}
      <div class="mk-save"><input class="field" id="mk-name" placeholder="予定の名前" value="${esc(d.name)}" aria-label="予定の名前">${decide ? "" : `<button class="btn primary" data-mk="save">${IC.save}${d.id ? "上書き" : "保存"}</button>`}</div>
      ${budgetLine(budgetOf(d.stops), sch)}
      ${!decide && d.id && !d.dirty ? `<div class="saved-note">${IC.check}<span>保存しました</span><button class="link-btn" data-mk="follow">${IC.route}この予定をたどる</button></div>` : ""}
      ${decide ? `<button class="btn accent block mk-decide" data-mk="decide">${IC.check}決定</button>` : ""}`;
    sortableStops(d);
  }

  /* 組み直し（自分で選ぶ）：いまいる場所のあとを、つくると同じように地図で選び直す */
  function renderRedoSheet() {
    const rd = state.redo, d = rd.d, lk = lockN(d), sch = schedule(d.start, d.stops), n = sch.length - lk;
    // 方針（SPEC.md）：自分で選ぶ組み直しは何回でも。回数があるのは「おまかせ」だけ（月5回まで。有料会員は何回でも）
    const left = state.premium ? "何回でも" : `残り${V.rebuildsLeft}回`;
    const canAuto = state.premium || V.rebuildsLeft > 0;
    const note = rd.auto
      ? (state.premium ? "有料会員：おまかせは何回でも使えます" : `おまかせを使ったので、この予定にすると今月のおまかせは残り${V.rebuildsLeft - 1}回（月5回まで）`)
      : "自分で選ぶ組み直しは、何回でも使えます（回数に数えません）";
    // 次に押した場所が入る番号（いまの場所のすぐあと。続けて押すと、その次）
    const ins = Math.min(Math.max(d.ins == null ? lk : d.ins, lk), d.stops.length);
    $("#sheet-head").innerHTML = `<b>組み直す</b><small>${n ? `このあと${n}か所・〜${R.fmt(sch[sch.length - 1].depart)}` : "このあとの予定がありません"}</small>`;
    $("#sheet-body").innerHTML = foundCard() + `<div class="redo-hint">${IC.pin}<span>地図の場所を押すと <i class="mk-num">${numOf(d, ins)}</i> に入ります</span>${condChips()}</div>
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
        const timed = p.timed !== false; // false：順番だけで保存した予定（押すと、時間を決める画面）
        return `<div class="plan-card ${on ? "on" : ""} ${timed ? "" : "untimed"}" data-fl="pick" data-id="${p.id}">
          <div class="row-between"><b class="pn">${esc(p.name)}</b>${!timed ? `<span class="badge untimed">${IC.clock}時間未調整</span>` : on ? '<span class="badge fav">たどっている途中</span>' : ""}</div>
          <div class="meta"><span>${IC.pin}${p.stops.length}か所</span>${timed ? `<span>${IC.clock}${R.fmt(sch[0].arrive)}–${R.fmt(sch[sch.length - 1].depart)}</span>` : `<span>時間はまだ決めていません</span>`}<span title="記事の値段の合計（交通費は別）">${IC.yen}${budgetText(p.budget || budgetOf(p.stops)).replace("予算の目安 ", "")}</span></div>
          <div class="small chain-text">${p.stops.map((s, i) => `${i + 1} ${esc(spotById[s.spot].name)}`).join(" › ")}</div>
          <div class="row"><button class="btn small accent" data-fl="pick" data-id="${p.id}">${timed ? `${IC.route}${on ? "続きから" : "たどる"}` : `${IC.clock}時間を決める`}</button><button class="mini-btn" data-fl="edit" data-id="${p.id}" title="つくるで直す">${IC.edit}直す</button><button class="mini-btn danger only-ic" data-fl="del" data-id="${p.id}" aria-label="消す" title="消す">${IC.trash}</button></div>
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
    const left = state.premium ? "何回でも" : `残り${V.rebuildsLeft}回`;
    const canRebuild = state.premium || V.rebuildsLeft > 0;
    const redo = ph === "end" ? "" : `<div class="fl-redo ${alerts.length ? "hot" : ""}">
        ${canRebuild ? `<button class="fl-rb auto" data-act="rebuild">${IC.spark}<span><b>おまかせ</b><small>${left}</small></span></button>` : `<button class="fl-rb auto" data-act="premium" title="有料会員（月500円・初月無料）：おまかせが何回でも使え、予定の店の臨時休業・雨・路線の遅延を見張って通知します">${IC.spark}<span><b>有料会員</b><small>おまかせ何回でも・通知</small></span></button>`}
        <button class="fl-rb self" data-fl="redo">${IC.pin}<span><b>自分で選ぶ</b><small>何回でも</small></span></button>
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
    $("#sheet-head").innerHTML = `${ph !== "end" ? '<span class="live-tag"><i></i>進行中</span>' : ""}<b>${esc(pl.title)}</b><button class="head-btn" data-fl="list" title="ほかの予定を選ぶ">${IC.list}<span>一覧</span></button>`;
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
      // 探す：シートを引き上げても地図は動いていないので、それまでの範囲の記事をそのまま出す。下げて地図が広く見えたときだけ範囲を広げる
      onSnap: (next) => { setSheet(next); if (stage() === "explore" && sheetOver() < areaOver) scheduleArea(350); },
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
      state.draft = newDraft({ name: r.type === "route" ? r.title : "", start: R.toMin(r.start || "10:00"), stops: add, from: r.id, simple: true }); // まずは回る順番だけ
      toast(`${w.name}さんの${r.type === "route" ? "ルート" : "場所"}を入れました`);
    }
    if (!(how === "append" && stage() === "redo")) state.planMode = "make";
    state.fitNext = true;
    switchView("plan");
  }
  function saveDraft(quiet) {
    const d = state.draft;
    if (!d.stops.length) { toast("場所を1つ以上入れてください"); return false; }
    if (!d.name.trim()) {
      setSheet("full"); toast("予定の名前を入れてください");
      setTimeout(() => { const f = $("#mk-name"); if (f) f.focus(); }, 300);
      return false;
    }
    // 保存するときに、記事の値段から予算の目安を出して、予定といっしょに残す
    const budget = budgetOf(d.stops);
    // timed：時間の画面（いつもの つくる）で決めたか。順番だけの画面で保存したら false で、たどる前に時間を決める
    const plan = { id: d.id || "p" + Date.now(), name: d.name.trim(), start: d.start, stops: d.stops.map((s) => ({ ...s })), from: d.from, budget, timed: !d.simple };
    const i = state.plans.findIndex((p) => p.id === plan.id);
    if (i >= 0) state.plans[i] = plan; else state.plans.unshift(plan);
    // たどっている途中の予定を直したときは、たどる側も新しい予定にする
    if (state.plan && state.plan.planId === plan.id) state.plan = null;
    d.id = plan.id; d.dirty = false;
    if (quiet) return true;
    toast(d.simple ? `${i >= 0 ? "上書き保存しました" : "保存しました"}（時間は、たどる前に決めます）` : `${i >= 0 ? "上書き保存しました" : "保存しました"}。${budgetText(budget)}`);
    renderSheet();
    return true;
  }
  // 時間を決めた予定を保存して、そのままたどり始める（たどるで、時間をまだ決めていない予定を選んだときの「決定」）
  function decideDraft() {
    const d = state.draft;
    d.simple = false;
    if (!saveDraft(true)) return;
    d.decide = false;
    startFollow(d.id, true);
    toast("この時間で、たどり始めます");
  }
  function onMake(t) {
    const d = ed(), mk = t.dataset.mk, i = Number(t.dataset.i);
    if (mk === "redo-apply") return applyRedo();
    if (mk === "redo-cancel") return closeRedo("組み直しをやめました");
    if (mk === "redo-auto") return autoRedo();
    if (i < lockN(d)) return; // いまいる場所は動かせない
    if (mk === "save") return saveDraft();
    if (mk === "detail") { d.simple = false; renderSheet(); drawMap(false); return; } // 順番だけの画面 → 時間・滞在まで決める画面
    if (mk === "decide") return decideDraft();
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
    if (p.timed === false) { editPlan(planId, true); return; } // 時間をまだ決めていない → 時間を決める画面（最後の「決定」でたどり始める）
    if (reset || !state.plan || state.plan.planId !== planId) {
      // はじめは 1 に向かっているところから（着いたら「ついた」を押す。本番は位置情報で自動）
      state.plan = { planId, title: p.name, stops: schedule(p.start, p.stops), cur: 0, phase: "go", from: null };
      state.rain = false; state.rainHandled = false; state.delay = 0; state.closed = []; state.pending = null;
    }
    state.planMode = "follow"; state.followList = false; state.fitNext = true; state.sheetBy.follow = "half";
    switchView("plan");
  }
  function editPlan(planId, decide) {
    const p = state.plans.find((x) => x.id === planId);
    if (!p) return;
    const d = state.draft;
    if (d.dirty && d.stops.length && d.id !== planId && !confirm("つくりかけの予定を、この予定で置き換えますか？")) return;
    state.draft = newDraft({ id: p.id, name: p.name, start: p.start, stops: p.stops.map((s) => ({ ...s })), from: p.from, decide: !!decide });
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
    if (act === "premium") { state.premium = true; toast("デモ：有料会員（月500円・初月無料）になりました。おまかせが何回でも使えます。本番では、休業・雨・遅延を見張って知らせます"); renderSheet(); return; }
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
    if (!state.premium && V.rebuildsLeft <= 0) { toast("今月のおまかせは使い切りました。自分で選ぶ組み直しは何回でも使えます"); return; }
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
    return GM.create(el, { center: pts[0] || OMIYA, zoom: pts.length ? 15 : 12, gesture: "cooperative" }).then((m) => {
      if (!m) return null;
      panelMaps.push(m);
      const g = m.group();
      if (numbered && pts.length > 1) g.line(pts, { color: color || "#E86B45", weight: 4, opacity: 0.85 });
      spots.forEach((s, i) => g.marker([s.lat, s.lng], { ...divPin(s.mine ? "mine" : "fav", numbered ? String(i + 1) : "", s.mine ? "" : `background:${color || "#123D2B"}`), title: s.name }));
      if (pts.length > 1) m.fit(pts, { pad: 0.2, maxZoom: 17 });
      return m;
    });
  }

  function openArticle(id) { showPanel((p) => renderArticle(p, id)); }
  // 記事の写真をすべて（見出し画像を1枚目に）。記事を開いたときのいちばん上で、横にずらして見る
  function articlePhotos(r) {
    const out = [], seen = new Set();
    const all = [...(r.leadBlocks ? photosOfBlocks(r.leadBlocks) : []), ...r.spots.flatMap((s) => s.photos || [])];
    const add = (src, cap) => { if (src && !seen.has(src)) { seen.add(src); out.push({ src, cap: cap || "" }); } };
    if (r.cover) add(r.cover, (all.find((x) => x.src === r.cover) || {}).cap);
    all.forEach((x) => add(x.src, x.cap));
    return out;
  }
  function carouselHTML(list) {
    if (!list.length) return "";
    const many = list.length > 1;
    return `<div class="art-car ${many ? "many" : ""}">
      <div class="art-car-row">${list.map((ph, k) => `<figure><img src="${esc(img(ph.src))}" alt="${esc(ph.cap || "")}" loading="${k ? "lazy" : "eager"}" data-zoom="${esc(img(ph.src))}" data-cap="${esc(ph.cap || "")}">${ph.cap ? `<figcaption>${esc(ph.cap)}</figcaption>` : ""}</figure>`).join("")}</div>
      ${many ? `<span class="art-car-n" data-car-n>1 / ${list.length}</span>
        <button class="art-car-btn prev" data-car="-1" aria-label="前の写真">${IC.prev}</button><button class="art-car-btn next" data-car="1" aria-label="次の写真">${IC.next}</button>
        ${list.length <= 12 ? `<div class="art-car-dots">${list.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>` : ""}` : ""}
    </div>`;
  }
  function bindCarousel(root) {
    $$(".art-car.many", root).forEach((c) => {
      const row = $(".art-car-row", c), n = $("[data-car-n]", c), dots = $$(".art-car-dots i", c), total = $$("figure", row).length;
      const at = () => Math.round(row.scrollLeft / Math.max(1, row.clientWidth));
      row.addEventListener("scroll", () => { const k = at(); n.textContent = `${k + 1} / ${total}`; dots.forEach((d, j) => d.classList.toggle("on", j === k)); }, { passive: true });
      $$("[data-car]", c).forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = Math.max(0, Math.min(total - 1, at() + Number(b.dataset.car)));
        row.scrollTo({ left: k * row.clientWidth, behavior: "smooth" });
      }));
    });
  }
  const routeSchedule = (r) => (r.type === "route" ? R.buildSchedule(D, { start: r.start || "10:00", spots: r.spots.map((s) => ({ spot: s.spot, stay: s.stay || defaultStay(spotById[s.spot]) })) }) : []);
  /* 場所の情報（営業時間・休み・住所・屋内／屋外・費用・滞在・行き方）。記事の本文には入れず、
     場所の「詳しく」から、記事の場所をすべて順番にまとめて出す（押した場所のところを開く） */
  function openSpotDetails(r, at = 0, pv = false, onClose = null) {
    const old = $("#sd"); if (old) old.remove();
    const sch = routeSchedule(r), n = r.spots.length;
    const items = r.spots.map((s, i) => {
      const sp = spotById[s.spot], v = infoView(s.info || {}, sp), saved = V.saved.some((x) => x.spot === sp.id);
      if (s.stay) v.stay = stayText(s.stay);
      const kv = [v.io, v.price, v.stay ? "滞在 " + v.stay : "", sp.style].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("");
      const dl = [["営業", v.hours], ["休み", v.closed], ["住所", v.addr]].filter(([, x]) => x).map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join("");
      const prev = i > 0 && sch[i] ? spotById[r.spots[i - 1].spot] : null;
      const mv = prev ? `<div class="sd-move">${moveIcon(sch[i])}<span>${esc(prev.name)}から${moveText(sch[i])}</span>${modeTag(sch[i])}${gLink(gmapLeg(prev, sp, sch[i].mode), "行き方", "inline")}</div>` : "";
      return `${mv}<section class="sd-item" data-sd="${i}">
        <div class="sd-head">${n > 1 ? `<i>${i + 1}</i>` : ""}<b>${esc(sp.name)}</b><small>${esc(sp.kind)}</small></div>
        ${kv ? `<div class="kv">${kv}</div>` : ""}
        ${dl ? `<dl class="stop-info">${dl}</dl>` : '<div class="small sd-none">営業時間や住所は、まだ書かれていません</div>'}
        <div class="sd-links">${gLink(gmapPlace(sp), "Google マップで開く")}${pv ? "" : `<button class="save-btn ${saved ? "on" : ""}" data-save="${sp.id}">${saved ? "登録済み" : "＋ 登録"}</button>`}</div>
      </section>`;
    }).join("");
    const route = n > 1 ? `<div class="sd-route">${gLink(gmapRoute(r.spots.map((s) => spotById[s.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking"), `${n}か所を順番に Google マップで開く`)}</div>` : "";
    const box = document.createElement("div");
    box.className = "picker-back sd-back"; box.id = "sd";
    box.innerHTML = `<div class="picker sd-sheet" role="dialog" aria-label="場所の情報">
      <div class="picker-head">${IC.info}<div><b>場所の情報</b><div class="small">${n > 1 ? `「${esc(r.title)}」の${n}か所を、記事の順番に。` : ""}行く前に、お店や施設の公式の案内でも確かめてください</div></div></div>
      <div class="picker-list sd-list">${items}${route}</div>
      <div class="picker-foot"><span></span><button class="btn primary small" data-sd-close>閉じる</button></div>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => {
      box.classList.add("show");
      const el = $(`[data-sd="${at}"]`, box), list = $(".sd-list", box);
      if (!el) return;
      if (at > 0) list.scrollTop += el.getBoundingClientRect().top - list.getBoundingClientRect().top - 6;
      if (n > 1) { el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 1800); }
    });
    box.addEventListener("click", (e) => {
      const sv = e.target.closest("[data-save]");
      if (sv) { const on = toggleSaved(sv.dataset.save); sv.classList.toggle("on", on); sv.textContent = on ? "登録済み" : "＋ 登録"; return; }
      if (e.target.closest("[data-sd-close]") || e.target === box) { box.remove(); if (onClose) onClose(); }
    });
  }
  /* 記事を読む画面。opt：{ rec：まだ公開していない記事（プレビュー）, preview：true なら登録・つくるなどのボタンを出さない, onMap(地図) } */
  function renderArticle(p, id, opt = {}) {
    const r = opt.rec || recById[id], w = writerById[r.writer], fk = favKind(w.id, r), pv = !!opt.preview;
    const isMember = V.memberships.includes(w.id);
    const favBtn = pv || w.official || w.self ? "" : `<button class="btn small ${fk === "fav" ? "lime" : "ghost"}" id="fav-btn">${fk === "fav" ? "お気に入り中" : "お気に入りに入れる"}</button>`;
    // ルートの記事は、場所のあいだの移動も出す
    const sch = routeSchedule(r);
    const stops = r.spots.map((s, i) => {
      const sp = spotById[s.spot];
      const saved = V.saved.some((x) => x.spot === sp.id);
      const photos = s.photos || [];
      const gallery = photos.length
        ? `<div class="gallery ${photos.length > 1 ? "many" : ""}">${photos.map((ph, k) => `<figure><img src="${img(ph.src, photos.length > 1)}" alt="${esc(ph.cap || sp.name)}" loading="lazy" data-full="${ph.src}" data-cap="${esc(ph.cap || "")}">${ph.cap ? `<figcaption>${esc(ph.cap)}</figcaption>` : ""}</figure>`).join("")}</div>${photos.length > 1 ? `<div class="gallery-hint">${photos.length}枚・横にずらすと次の写真</div>` : ""}`
        : `<div class="photo" style="${photoStyle(sp)}">${esc(sp.kind)}${sp.style ? "・" + esc(sp.style) : ""}（写真はまだありません）</div>`;
      const text = s.text && s.text.length ? s.text.map((t) => `<p>${esc(t)}</p>`).join("") : `<p>${esc(s.note)}</p>`;
      // 書く画面で書いた記事：本文（画像・写真の列・見出し…）を書いた順に出す
      const rich = !!s.blocks;
      const mv = i > 0 && sch[i] ? `<div class="stop-move">${sch[i].mode === "ride" ? IC.train : ICON.walk}${esc(spotById[r.spots[i - 1].spot].name)}から${moveText(sch[i])}${modeTag(sch[i])}${gLink(gmapLeg(spotById[r.spots[i - 1].spot], sp, sch[i].mode), "行き方", "inline")}</div>` : "";
      // 場所ごとのタグ（駅・自然・グルメなど）
      const stags = (s.tags || []).map((t) => `<span class="stop-tag">#${esc(t)}</span>`).join("");
      return `${mv}<div class="stop"><div class="stop-no">${i + 1}</div><div class="stop-main">
        <div class="stop-title"><b>${esc(sp.name)}</b> ${ratingTag(s.rating)}${stags}${pv ? "" : `<button class="save-btn ${saved ? "on" : ""}" data-save="${sp.id}">${saved ? "登録済み" : "＋ 登録"}</button>`}<button class="more-btn" data-more="${i}">${IC.info}詳しく</button></div>
        ${s.head ? `<div class="stop-head">${esc(s.head)}</div>` : ""}
        ${rich ? `<div class="stop-text ab">${flowHTML(s.blocks)}</div>` : `${gallery}
        <div class="stop-text">${text}</div>`}
      </div></div>`;
    }).join("");
    const n = r.spots.length;
    const routeLink = r.type === "route" ? `<div class="route-gmap">${gLink(gmapRoute(r.spots.map((s) => spotById[s.spot]), sch.some((x) => x.mode === "ride") ? "" : "walking"), `このルートを Google マップで開く（${n}か所）`)}</div>` : "";
    const infoAll = `<button class="art-info-all" data-more="0">${IC.info}<span><b>${n > 1 ? `${n}か所の` : ""}場所の情報</b><small>営業時間・休み・住所・${n > 1 ? "行き方" : "Google マップ"}</small></span>${ICON.chev}</button>`;
    const lock = r.member ? (isMember
      ? `<div class="lock"><b>メンバー限定</b><div>${esc(r.member.body)}</div></div>`
      : `<div class="lock"><b>${ICON.lock} メンバー限定</b><div style="margin:4px 0 10px">${esc(r.member.teaser)}</div>
          <button class="btn primary small" id="join-btn">メンバーになって読む（月${w.membership.price}円）</button></div>`) : "";
    // 公式の特集で、書き手と組んだもの
    const cw = r.collab && writerById[r.collab];
    const collab = cw ? `<button class="collab" data-writer="${cw.id}">${avatar(cw, "sm")}<span>書き手 <b>${esc(cw.name)}</b> さんと組んだ特集</span>${ICON.chev}</button>` : "";
    // つくるの途中で開いたときは「足す」、それ以外は書いた人のルートで「つくる」
    const redoing = stage() === "redo";
    const appending = editing() && (redoing || state.draft.stops.length > 0);
    const have = appending ? new Set([...ed().stops.map((x) => x.spot), ...(redoing ? redoUsed() : [])]) : new Set();
    const fresh = appending ? r.spots.filter((s) => !have.has(s.spot)).length : n;
    const ctaLabel = appending ? (!fresh ? "この記事の場所は、もう予定に入っています" : n > 1 ? `このルートを予定の後ろに足す（${fresh}か所）` : "この場所を予定に足す") : (n > 1 ? "このルートで予定をつくる" : "この場所から予定をつくる");
    const cta = pv ? "" : `<div class="sticky-cta"><button class="btn accent block" id="make-btn" ${appending && !fresh ? "disabled" : ""}>${ICON.calplus}${ctaLabel}</button>${appending ? `<div class="small" style="text-align:center;margin-top:6px">${redoing ? "組み直している予定" : `つくっている予定（${state.draft.stops.length}か所）`}の後ろに足します</div>` : ""}</div>`;
    const mmId = pv ? "mm-art-pv" : "mm-art";
    // いいね：読む人には数を出さず、その人が付けたかどうかだけ。書いた人には「行った」と「いいね」の数
    const likeBtn = (big) => `<button class="like-btn ${big ? "big" : ""} ${isLiked(r) ? "on" : ""}" data-like aria-pressed="${isLiked(r)}">${isLiked(r) ? IC.heartf : IC.heart}<span>${isLiked(r) ? "いいね済み" : "いいね"}</span></button>`;
    const likeTop = pv ? "" : w.self
      ? `<div class="own-st">${IC.foot}<span>行った <b>${r.went}</b>人</span>${IC.heartf}<span>いいね <b>${likesOf(r)}</b>人</span><small>いいねの数は、書いたあなただけに見えます</small></div>`
      : `<div class="like-row">${likeBtn(false)}<small>行ってみたいと思ったら。いいねした記事の場所は、地図のピンのふちがピンクになります（数はほかの人には見えません）</small></div>`;
    const likeEnd = pv || w.self ? "" : `<div class="like-end"><b>この記事を読んで、行ってみたくなりましたか？</b>${likeBtn(true)}</div>`;
    p.innerHTML = (pv ? "" : bar(w.official ? (w.shop ? "店の公式" : "公式の特集") : "記事")) + `${carouselHTML(articlePhotos(r))}<div class="pad">
      <div class="writer-row"><button data-writer="${w.id}" style="display:flex;align-items:center;gap:10px">${avatar(w)}<span class="name">${esc(w.name)}</span></button>${badges(w, r)}<span style="margin-left:auto">${favBtn}</span></div>
      ${collab}
      <div class="h1">${esc(r.title)}</div>
      <div class="meta"><span>${esc(r.date)}</span><span>${n > 1 ? `ルート ${n}か所` : "1か所の記録"}</span><span>記事を見て「行った」${r.went}人</span></div>
      ${likeTop}
      <div class="kv" style="margin-top:6px">${r.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}${r.stamp ? "<span>スタンプラリー（架空の企画）</span>" : ""}${r.vis === "member" ? `<span class="kv-member">${IC.lock}メンバー限定</span>` : ""}</div>
      ${r.leadBlocks && r.leadBlocks.length ? `<div class="ab lead-ab">${flowHTML(r.leadBlocks)}</div>` : r.lead ? `<p class="lead">${esc(r.lead)}</p>` : ""}
      <div class="minimap" id="${mmId}"></div>
      ${routeLink}
      ${infoAll}
      ${stops}${lock}${likeEnd}
    </div>${cta}`;
    // 写真を押すと大きく見る
    $$("[data-full]", p).forEach((im) => im.addEventListener("click", () => openPhoto(img(im.dataset.full), im.dataset.cap)));
    $$("[data-zoom]", p).forEach((im) => im.addEventListener("click", () => openPhoto(im.dataset.zoom, im.dataset.cap)));
    bindCarousel(p);
    const mm = miniMap(mmId, r.spots.map((s) => spotById[s.spot]), r.type === "route", r.official ? "#E86B45" : w.color);
    if (opt.onMap) opt.onMap(mm);
    // 詳しく：記事の場所をすべて、順番に（閉じたら、登録のボタンをそろえる）
    const syncSaves = () => $$("[data-save]", p).forEach((b) => { const on = V.saved.some((x) => x.spot === b.dataset.save); b.classList.toggle("on", on); b.textContent = on ? "登録済み" : "＋ 登録"; });
    $$("[data-more]", p).forEach((b) => b.addEventListener("click", () => openSpotDetails(r, Number(b.dataset.more), pv, syncSaves)));
    if (pv) return;
    $$("[data-writer]", p).forEach((b) => b.addEventListener("click", () => openWriter(b.dataset.writer)));
    const fb = $("#fav-btn", p);
    if (fb) fb.addEventListener("click", () => { toggleFav(w.id); paint(); });
    // いいね（上と下のボタンをそろえる。地図・一覧は、記事を閉じたときに描き直す）
    $$("[data-like]", p).forEach((b) => b.addEventListener("click", () => {
      const on = toggleLike(r);
      $$("[data-like]", p).forEach((x) => {
        x.classList.toggle("on", on); x.setAttribute("aria-pressed", on);
        x.innerHTML = `${on ? IC.heartf : IC.heart}<span>${on ? "いいね済み" : "いいね"}</span>`;
      });
    }));
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
    const left = state.premium ? "有料会員：おまかせは何回でも使えます" : `この予定にすると、今月のおまかせは残り${V.rebuildsLeft - 1}回（月5回まで）`;
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
  // 並べる順番：写真のある記事を先に。その中で お気に入りの書き手 → タグだけお気に入り → ほか。同じならルートを先に、「行った」人が多い順。
  // 公式（自治体・観光局・店）の記事は先頭にしないで、4番目と、そのあと7つおきに1つずつ混ぜる（残りは最後に）
  function readFeed() {
    const score = (r) => { const k = favKind(r.writer, r); return k === "fav" ? 3 : k ? 2 : 0; };
    // お気に入り：お気に入りの書き手（タグだけお気に入りの人は、そのタグの記事）の記事だけ。公式も、お気に入りにしたものだけ
    const list = D.records
      .filter((r) => readHit(r, state.readTag) && (state.readScope !== "fav" || !!favKind(r.writer, r)))
      .sort((a, b) => !!coverSrc(b) - !!coverSrc(a) || score(b) - score(a) || (b.type === "route") - (a.type === "route") || b.went - a.went);
    const off = list.filter((r) => r.official), out = [];
    let k = 0;
    list.filter((r) => !r.official).forEach((r, i) => { out.push(r); if (k < off.length && i >= 3 && (i - 3) % 7 === 0) out.push(off[k++]); });
    return out.concat(off.slice(k));
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
    const off = w.official ? `<span class="off-label">${IC.flag}${w.shop ? "店の公式" : "公式"}</span>` : "";
    const head = `${pcls ? "" : `<span class="cover-word">${esc(spotById[r.spots[0].spot].kind)}</span>`}
      <span class="tag-label" style="background:${tagColor(tag)}">#${esc(tag)}</span>${off}
      <span class="thumb-map">${routeThumb(r)}</span>`;
    // 記事ごとの「つくる」：書いた人のルートを先に入れて、つくるを開く
    const make = `<button class="make-btn" data-make="${r.id}" aria-label="この記事から予定をつくる">${ICON.calplus}つくる</button>`;
    if (!big) {
      return `<div class="tile cover ${pcls}" role="button" tabindex="0" data-rec="${r.id}" style="${coverStyle(r, false)}">${head}
        <span class="cover-body"><span class="cover-title">${esc(r.title)}</span>
        <span class="cover-who">${avatar(w, "sm")}<b>${esc(w.name)}</b>${isLiked(r) ? `<span class="lk-dot" title="いいね済み">${IC.heartf}</span>` : ""}${make}</span></span></div>`;
    }
    const lock = r.member || r.vis === "member" ? `<span>${ICON.lock.replace('width="16" height="16"', 'width="13" height="13"')} メンバー限定${r.member ? "あり" : ""}</span>` : "";
    const mark = (!w.official && fk === "fav" ? '<span class="badge fav">お気に入り</span>' : "") + (isLiked(r) ? `<span class="lk-dot" title="いいね済み">${IC.heartf}</span>` : ""); // 公式は表紙の左上に印
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
    const scopes = [["all", "すべての人"], ["fav", "お気に入り"]];
    const none = state.readScope === "fav"
      ? `<div class="empty">${state.readTag ? "お気に入りの書き手の、このタグの記事はまだありません。" : "お気に入りの書き手の記事はまだありません。"}<br>書き手を「お気に入り」にすると、ここに出ます。</div>`
      : '<div class="empty">このタグの記事はまだありません。</div>';
    el.innerHTML = `<header class="read-head">
        <div class="logo">${ICON.pin}Take A Map</div>
        <span class="demo-badge">試作・データは仮</span>
        <button class="icon-btn" id="bell" aria-label="お知らせ">${ICON.bell}</button>
      </header>
      <button class="search read-search" id="read-search">${ICON.search}<span>街・作品名・書き手でさがす</span></button>
      <div class="read-chips ${state.readTag ? "has-on" : ""}">${chips.map(([t, l]) => `<button class="tchip ${t ? "" : "rec"} ${state.readTag === t ? "on" : ""}" data-rtag="${t || ""}" ${t ? `style="background:${tagColor(t)}"` : ""}>${esc(l)}</button>`).join("")}</div>
      <div class="read-tabs" role="tablist" aria-label="記事の出どころ">${scopes.map(([k, l]) => `<button role="tab" aria-selected="${state.readScope === k}" class="${state.readScope === k ? "on" : ""}" data-rscope="${k}"><span>${l}</span></button>`).join("")}</div>
      <div class="feed">
        ${hero ? feedCard(hero, true) : none}
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
        who: s.pub && s.pub.recId ? "自分の記録・記事も公開中" : "自分の記録", go: on ? "" : "見る ›", photoUrl: (s.photos || [])[0], onClick: () => onPick && onPick(key),
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
        <div class="small">${state.premium ? "有料会員：おまかせが何回でも・休業や雨、遅延の通知" : `おまかせ：今月の残り${V.rebuildsLeft}回（月5回まで）。自分で選ぶ組み直しは何回でも`}<br>保存した予定 ${state.plans.length}件</div>
        <div class="section-label">自分の地図</div>
        <div class="mymap-preview">
          <div class="minimap" id="mm-me"></div>
          <button class="map-open" id="open-mymap" aria-label="自分のマップを開く"><span>自分のマップを開く（見る・直す）${ICON.chev}</span></button>
        </div>
        ${legend}
        <div class="section-label">記録</div>
        ${state.myRecords.length ? "" : '<div class="small">まだ記録がありません。</div>'}
        ${state.myRecords.map((r) => `<div class="card"><h3 style="margin-top:0">${esc(r.title)}</h3><div class="meta"><span>${esc(r.date)}</span><span>${r.spots.length}か所</span></div>
          ${r.spots.map((s, i) => `<button class="me-spot" data-mm="ms-${r.id}-${i}">${(s.photos || []).length ? `<img class="thumb" src="${s.photos[0]}" alt="" style="width:100%;height:120px">` : ""}<span class="me-spot-top"><b>${esc(s.name)}</b><span class="me-spot-go">地図で見る ›</span></span><span>${ratingTag(s.rating)} <span class="small">${s.pub && s.pub.recId ? `記事も公開中${recById[s.pub.recId] ? `（行った ${recById[s.pub.recId].went}人・いいね ${likesOf(recById[s.pub.recId])}人）` : ""}` : "自分だけ"}${(s.photos || []).length ? `・写真${s.photos.length}枚` : ""}</span></span><span class="small">${esc(s.note || "")}</span></button>`).join("")}</div>`).join("")}
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
        <div class="mm-bar"><button class="back mm-backbtn" aria-label="戻る">${ICON.back}</button><div class="stage-title"><b>自分のマップ</b><span>場所を押すと、写真と記録が見られます</span></div><span class="demo-badge">試作・データは仮</span></div>
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
      head.innerHTML = `<b>${f === "saved" ? "登録した場所" : f === "rec" ? "自分の記録" : "自分のマップ"}</b><small>場所を押すと、写真と記録が見られます</small>`;
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
    /* 自分の記録を見る：記事と同じ並び（場所 → 写真 → 本文）。上の地図はない（地図から開いているので）。
       上が「わたしの記録」（自分だけ）、下が「公開する記事」（書いたときだけ） */
    function mineShow(t) {
      const { r, i, s } = t;
      head.innerHTML = `${listBtn}<b>${esc(s.name)}</b>${editBtn}`;
      const sibs = r.spots.length > 1 ? `<div class="mm-sibs"><span>同じ記録の場所</span>${r.spots.map((x, j) => `<button data-pick="ms-${esc(r.id)}-${j}" class="${j === i ? "on" : ""}">${esc(x.name)}</button>`).join("")}</div>` : "";
      const mine = blocksOf(mineHTML(s)), pub = s.pub, prec = pub && pub.recId && recById[pub.recId];
      const pblocks = pub ? blocksOf(pub.html) : [];
      // 写真：見出し画像を1枚めに、記録の写真、わたしの記録の本文の写真（同じものは1回だけ）
      const seen = new Set(), photos = [];
      [s.cover, ...(s.photos || []), ...photosOfBlocks(mine).map((x) => x.src)].forEach((u) => { if (u && !seen.has(u)) { seen.add(u); photos.push({ url: img(u) }); } });
      body.innerHTML = `<div class="mv">
        <div class="mv-title"><b>${esc(s.name)}</b>${ratingTag(s.rating)}</div>
        <div class="mv-meta"><span>${IC.cal}${esc(r.date)}</span><span>${IC.list}記録「${esc(r.title)}」${r.spots.length > 1 ? `の${i + 1}か所目` : ""}</span></div>
        ${photos.length ? viewGallery(photos, s.name) : `<div class="mv-noph mine">${IC.image}<span>写真はまだありません</span><button class="mini-btn" data-edit>写真を足す</button></div>`}
        <section class="mv-sec mine">
          <div class="mv-band mine">${IC.lock}<b>わたしの記録</b><small>自分だけ</small><button class="mini-btn" data-rw-open="mine">${IC.edit}書く</button></div>
          ${mine.length ? `<div class="ab mv-ab">${flowHTML(mine)}</div>` : '<div class="mv-empty">まだ書いていません。「書く」から、写真や見出しも入れて記録できます。</div>'}
        </section>
        ${pub ? `<section class="mv-sec pub">
          <div class="mv-band pub">${IC.globe}<b>公開する記事</b><small>${prec ? `公開中・${visLabel(pub.vis)}` : "下書き（まだ公開していません）"}</small><button class="mini-btn" data-rw-open="pub">${IC.edit}直す</button></div>
          ${pub.cover ? `<img class="mv-pcover" src="${esc(img(pub.cover))}" alt="公開する記事の見出し画像" data-zoom="${esc(img(pub.cover))}">` : ""}
          <div class="mv-ptitle">${esc(pub.title || "（タイトルなし）")}</div>
          ${pblocks.length ? `<div class="ab mv-ab">${flowHTML(pblocks)}</div>` : '<div class="mv-empty">本文はまだありません。</div>'}
          ${infoBoxHTML(infoView(pub.info || {}, spotFor(s, false) || { name: s.name }))}
          ${prec ? `<button class="mv-cm-go" data-open-rec="${prec.id}">記事として見る（みんなに見える形）${ICON.chev}</button>` : ""}
        </section>` : `<button class="mv-pubadd" data-rw-open="pub"><span class="mini-pen">${IC.edit}</span><span class="mv-pubadd-tx"><b>公開する記事も書く</b><small>同じ画面の下に、みんなに見せる記事を書けます。わたしの記録はそのまま自分だけ</small></span></button>`}
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
      const mb = blocksOf(mineHTML(s)), mph = photosOfBlocks(mb).slice(0, 3), mtx = plainOf(mb).slice(0, 90);
      head.innerHTML = `${listBtn}<b>${esc(s.name)}</b>${doneBtn}`;
      const sibs = r.spots.length > 1 ? `<div class="mm-sibs"><span>同じ記録の場所</span>${r.spots.map((x, j) => `<button data-pick="ms-${esc(r.id)}-${j}" class="${j === i ? "on" : ""}">${esc(x.name)}</button>`).join("")}</div>` : "";
      body.innerHTML = `<div class="mm-ed">
        <label class="mm-lb" for="mm-title">記録のタイトル <span>${esc(r.date)}・${r.spots.length}か所</span></label>
        <input class="field title-in" id="mm-title" data-title value="${esc(r.title)}">
        ${sibs}
        ${photosBlock(photosOf(t))}
        <div class="mm-lb">評価</div>
        <div class="rate-btns">${[3, 2, 1].map((n) => `<button class="r${n} ${s.rating === n ? "on" : ""}" data-rate="${n}">${RATING[n]}</button>`).join("")}</div>
        <div class="mm-lb">わたしの記録 <span class="mm-lock">${IC.lock}自分だけ（非公開）</span></div>
        <div class="myrec">
          <button class="myrec-card" data-rw-open="mine">
            ${mph.length ? `<span class="myrec-ph">${mph.map((x) => `<img src="${esc(img(x.src))}" alt="">`).join("")}</span>` : ""}
            <span class="myrec-tx ${mtx ? "" : "ph"}">${esc(mtx || "押して書く。写真・見出し・リンクも、記事と同じように入れられます")}</span>
            <span class="myrec-go">${IC.edit}${mtx || mph.length ? "続きを書く" : "書く"}</span>
          </button>
          <button class="mini-pen" data-rw-open="pub" aria-label="公開する記事も書く" title="公開する記事も書く">${IC.edit}<small>公開用</small></button>
        </div>
        <div class="myrec-pub">${s.pub ? `${IC.globe}<span>公開する記事「${esc(s.pub.title || "タイトルなし")}」・${s.pub.recId && recById[s.pub.recId] ? `公開中（${visLabel(s.pub.vis)}）` : "下書き"}</span>` : `<span>右の小さな書くボタンを押すと、同じ画面の下に、みんなに見せる記事も書けます</span>`}</div>
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
      if (d.rwOpen && t.kind === "mine") { openRecWindow(t.r, t.s, d.rwOpen, () => { renderBody(); pins(); }); return; }
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

  /* ---------- 記事の中身（ブロック） ----------
     書く画面・自分の記録で書いた本文を、読む画面で出すための形にする（貼り付けは文字だけなので、中身はこのアプリで作ったものだけ）。
     { t: "p" | "h" | "q", h：太字・リンク・改行だけ残した文字 } / { t: "ul", items } / { t: "hr" } /
     { t: "img", src, cap } / { t: "gal", items: [{ src, cap }] } / { t: "spot", id, rating, info } */
  const WR_EMPTY = "<p><br></p>";
  // 本文の文字（数えるため）。DOMParser は画像を読み込まず、スクリプトも動かさない
  const htmlText = (html) => new DOMParser().parseFromString(html || "", "text/html").body.textContent;
  const safeHref = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(u || "") ? u : "");
  // 文字の中の飾りは、太字・リンク・改行だけ残す（ほかのタグは中の文字だけにする）
  function inlineHTML(node) {
    let out = "";
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { out += esc(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName, inner = inlineHTML(n);
      if (tag === "BR") out += "<br>";
      else if (tag === "B" || tag === "STRONG" || (tag === "SPAN" && /bold|[6-9]00/.test(n.style.fontWeight))) out += inner ? `<b>${inner}</b>` : "";
      else if (tag === "A" && safeHref(n.getAttribute("href"))) out += `<a href="${esc(n.getAttribute("href"))}" target="_blank" rel="noopener">${inner}</a>`;
      else out += inner;
    });
    return out;
  }
  const trimInline = (h) => h.replace(/^(\s|<br>)+|(\s|<br>)+$/g, "");
  const parseInfo = (s) => { try { return JSON.parse(s || "{}") || {}; } catch (e) { return {}; } };
  const capOf = (f) => { const c = f.querySelector("figcaption"); return c ? c.textContent.trim() : ""; };
  function readBlocks(root) {
    const out = [];
    root.childNodes.forEach((el) => {
      if (el.nodeType === 3) { const t = el.nodeValue.trim(); if (t) out.push({ t: "p", h: esc(t) }); return; }
      if (el.nodeType !== 1) return;
      const cls = el.classList, tag = el.tagName;
      if (cls.contains("wr-fig")) { const im = el.querySelector("img"); if (im) out.push({ t: "img", src: im.getAttribute("src"), cap: capOf(el) }); return; }
      if (cls.contains("wr-gal")) {
        const items = [...el.querySelectorAll("figure")].map((f) => ({ src: f.querySelector("img").getAttribute("src"), cap: capOf(f) }));
        if (items.length) out.push({ t: "gal", items });
        return;
      }
      if (cls.contains("wr-spot")) { out.push({ t: "spot", id: el.dataset.spot, rating: Number(el.dataset.rating) || 0, info: parseInfo(el.dataset.info) }); return; }
      if (tag === "HR") { out.push({ t: "hr" }); return; }
      if (tag === "UL" || tag === "OL") {
        const items = [...el.querySelectorAll("li")].map((li) => trimInline(inlineHTML(li))).filter(Boolean);
        if (items.length) out.push({ t: "ul", items });
        return;
      }
      const h = trimInline(inlineHTML(el));
      if (h) out.push({ t: /^H[1-6]$/.test(tag) ? "h" : tag === "BLOCKQUOTE" ? "q" : "p", h });
    });
    return out;
  }
  // 保存してある本文（書く画面の HTML）を読む形に
  const blocksOf = (html) => readBlocks(new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html").body.firstChild);
  const plainOf = (blocks) => blocks.map((b) => (b.t === "ul" ? b.items.join(" ") : b.h || "")).map(htmlText).join(" ").replace(/\s+/g, " ").trim();
  const photosOfBlocks = (blocks) => blocks.flatMap((b) => (b.t === "img" ? [{ src: b.src, cap: b.cap }] : b.t === "gal" ? b.items : []));
  // 自分の記録の本文（前の版の「ひとこと」だけのものは、1段落の本文にする）
  const mineHTML = (s) => (s.mine != null ? s.mine : s.note ? `<p>${esc(s.note)}</p>` : "");

  // 写真（読む画面）。1枚なら大きく、2枚からは横にずらす列。押すと大きく見る
  function galleryHTML(items) {
    const fig = (it, small) => `<figure><img src="${esc(img(it.src, small))}" alt="${esc(it.cap || "")}" loading="lazy" data-zoom="${esc(img(it.src))}" data-cap="${esc(it.cap || "")}">${it.cap ? `<figcaption>${esc(it.cap)}</figcaption>` : ""}</figure>`;
    if (items.length === 1) return `<div class="gallery">${fig(items[0], false)}</div>`;
    return `<div class="gallery many">${items.map((it) => fig(it, true)).join("")}</div><div class="gallery-hint">${items.length}枚・横にずらすと次の写真</div>`;
  }
  // 本文を、書いた順に読む形で出す（h・items の中身は inlineHTML で作った、飾りだけ残した文字）
  function flowHTML(list) {
    return list.map((b) => {
      switch (b.t) {
        case "p": return `<p>${b.h}</p>`;
        case "h": return `<h3 class="ab-h">${b.h}</h3>`;
        case "q": return `<blockquote class="ab-q">${b.h}</blockquote>`;
        case "ul": return `<ul class="ab-ul">${b.items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
        case "hr": return '<hr class="ab-hr">';
        case "img": return galleryHTML([b]);
        case "gal": return galleryHTML(b.items);
        case "spot": { const sp = spotById[b.id]; return sp ? `<div class="ab-spot">${IC.pin}<b>${esc(sp.name)}</b>${b.rating ? ratingTag(b.rating) : ""}</div>` : ""; }
        default: return "";
      }
    }).join("");
  }

  /* ---------- 場所の情報（記事を書くときに、押して選ぶか、文字で入れる） ----------
     info：{ hrs: [{ d: 曜日（0=月〜6=日、7=祝）, o: 開く, c: 閉まる }], hoursX: 文字で書いた営業時間, off: 休みの曜日, closedX: 文字で書いた休み,
             io: 屋内／屋外／屋内・屋外, stay: いた時間（分）, price: 1人の目安（円）, priceText, addr }
     記事の場所の下に出て、まだ記事のない場所は、公開したときにこの値で登録される（予定をつくるときの営業時間・予算にも使う） */
  const DAYS = ["月", "火", "水", "木", "金", "土", "日", "祝"];
  // [0,1,2,3,4] → 「月〜金」、[5,6,7] → 「土・日・祝」
  function daysText(list) {
    const d = [...new Set(list)].sort((a, b) => a - b), wk = d.filter((x) => x < 7), parts = [];
    if (wk.length === 7) parts.push("毎日");
    else for (let i = 0; i < wk.length;) {
      let j = i;
      while (j + 1 < wk.length && wk[j + 1] === wk[j] + 1) j++;
      if (j - i >= 2) parts.push(`${DAYS[wk[i]]}〜${DAYS[wk[j]]}`); else for (let k = i; k <= j; k++) parts.push(DAYS[wk[k]]);
      i = j + 1;
    }
    if (d.includes(7)) parts.push("祝");
    return parts.join("・");
  }
  // 押して選んだ曜日・時刻と、文字で書いたものをつないで、記事に出す文にする
  function infoTexts(info) {
    const hm = (x) => x.replace(/^0(\d)/, "$1"); // 09:00 → 9:00
    const rows = (info.hrs || []).filter((r) => r.d.length && r.o && r.c).map((r) => `${daysText(r.d)} ${hm(r.o)}〜${hm(r.c)}`);
    const off = info.off || [], wk = off.filter((x) => x < 7);
    const offT = [wk.length ? (wk.length === 7 ? "毎日" : daysText(wk) + "曜") : "", off.includes(7) ? "祝日" : ""].filter(Boolean).join("・");
    return { hours: [...rows, info.hoursX].filter((x) => x && x.trim()).join("／"), closed: [offT, info.closedX].filter((x) => x && x.trim()).join("、") };
  }
  const IO_OPTS = ["屋内", "屋外", "屋内・屋外"];
  const STAY_OPTS = [[30, "30分"], [60, "1時間"], [90, "1.5時間"], [120, "2時間"], [180, "3時間〜"]];
  const PRICE_OPTS = [[0, "無料"], [500, "〜500円"], [1000, "〜1,000円"], [2000, "〜2,000円"], [3000, "〜3,000円"], [5000, "〜5,000円"], [8000, "5,000円〜"]];
  const stayLabel = (m) => (STAY_OPTS.find(([v]) => v === m) || [0, stayText(m)])[1];
  const priceLabel = (info) => info.priceText || (info.price === 0 ? "無料" : info.price != null ? `${info.price.toLocaleString()}円` : "");
  const newPlace = (sp) => !!(sp.temp || sp.user || !sp.id); // まだ記事のない場所（屋内か屋外かなど、わからないことが多い）
  // 場所にもう入っている値から始める（書き手が入れた値・地図で探したときの住所）
  function infoFrom(sp) {
    return {
      hrs: [{ d: [], o: "10:00", c: "18:00" }],
      hoursX: sp.hoursText || (sp.hours ? `${sp.hours.open}〜${sp.hours.close}` : ""),
      off: [], closedX: sp.closed || "",
      io: sp.io || (newPlace(sp) ? "" : sp.indoor ? "屋内" : "屋外"),
      stay: sp.stay || null, price: sp.price == null ? null : sp.price, priceText: sp.priceText || "", addr: sp.addr || "",
    };
  }
  const dayBtns = (on, attr) => `<div class="pi-days">${DAYS.map((d, i) => `<button type="button" class="${on.includes(i) ? "on" : ""} ${i > 4 ? "we" : ""}" ${attr}="${i}">${d}</button>`).join("")}</div>`;
  const piChips = (opts, cur, attr) => `<div class="pi-chips">${opts.map(([v, l]) => `<button type="button" class="${cur === v ? "on" : ""}" ${attr}="${esc(v)}">${esc(l)}</button>`).join("")}</div>`;
  const PI_PH = { hours: "記事には「営業」として出ます", closed: "記事には「休み」として出ます" };
  function infoFormInner(info) {
    const t = infoTexts(info), chip = PRICE_OPTS.some(([, l]) => l === info.priceText);
    return `<div class="pi-sec">
        <div class="pi-k">${IC.clock}営業時間<small>曜日を押して、時刻を選ぶ</small></div>
        ${info.hrs.map((r, k) => `<div class="pi-hrow" data-hrow="${k}">${dayBtns(r.d, "data-pi-day")}
          <div class="pi-times"><input type="time" step="900" value="${esc(r.o)}" data-pi-o aria-label="開く時刻"><span>〜</span><input type="time" step="900" value="${esc(r.c)}" data-pi-c aria-label="閉まる時刻">${k ? `<button type="button" class="pi-rowx" data-pi-rowx aria-label="この行を消す">${IC.x}</button>` : ""}</div></div>`).join("")}
        ${info.hrs.length < 4 ? `<button type="button" class="pi-add" data-pi-addrow>${IC.plus}曜日ごとに時間を変える</button>` : ""}
        <label class="pi-line"><span>文字で</span><input data-pi-t="hoursX" value="${esc(info.hoursX || "")}" placeholder="例：ラストオーダー 21:30／夏は19時まで"></label>
        <div class="pi-out ${t.hours ? "" : "empty"}" data-pi-out="hours">${esc(t.hours || PI_PH.hours)}</div>
      </div>
      <div class="pi-sec">
        <div class="pi-k">${IC.closed}定休日<small>休みの曜日を押す</small></div>
        ${dayBtns(info.off || [], "data-pi-off")}
        <label class="pi-line"><span>文字で</span><input data-pi-t="closedX" value="${esc(info.closedX || "")}" placeholder="例：第3水曜、年末年始"></label>
        <div class="pi-out ${t.closed ? "" : "empty"}" data-pi-out="closed">${esc(t.closed || PI_PH.closed)}</div>
      </div>
      <div class="pi-sec"><div class="pi-k">${IC.home}屋内・屋外</div>${piChips(IO_OPTS.map((x) => [x, x]), info.io, "data-pi-io")}</div>
      <div class="pi-sec"><div class="pi-k">${IC.clock}いた時間</div>${piChips(STAY_OPTS, info.stay, "data-pi-stay")}</div>
      <div class="pi-sec"><div class="pi-k">${IC.yen}かかったお金<small>1人分</small></div>${piChips(PRICE_OPTS.map(([, l]) => [l, l]), info.priceText, "data-pi-price")}
        <label class="pi-line"><span>ちょうど</span><input type="number" inputmode="numeric" min="0" step="10" data-pi-yen value="${!chip && info.price != null ? info.price : ""}" placeholder="例：1200"><span>円</span></label></div>
      <div class="pi-sec"><div class="pi-k">${IC.pin}住所</div><input class="field" data-pi-t="addr" value="${esc(info.addr || "")}" placeholder="住所（わかれば）"></div>`;
  }
  // 場所の情報の入力欄を動かす（info をそのまま直す）
  function bindInfoForm(el, info, onChange) {
    const out = () => {
      const t = infoTexts(info);
      ["hours", "closed"].forEach((k) => { const o = $(`[data-pi-out="${k}"]`, el); if (o) { o.textContent = t[k] || PI_PH[k]; o.classList.toggle("empty", !t[k]); } });
      if (onChange) onChange(info);
    };
    const redraw = () => { el.innerHTML = infoFormInner(info); out(); };
    const pick = (b, on) => $$("button", b.parentNode).forEach((x) => x.classList.toggle("on", on && x === b));
    const tog = (list, v) => { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); else list.push(v); };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
      const d = b.dataset, row = b.closest("[data-hrow]"), r = row && info.hrs[Number(row.dataset.hrow)];
      if (d.piDay != null && r) { tog(r.d, Number(d.piDay)); b.classList.toggle("on"); }
      else if (d.piOff != null) { info.off = info.off || []; tog(info.off, Number(d.piOff)); b.classList.toggle("on"); }
      else if ("piAddrow" in d) { info.hrs.push({ d: [], o: info.hrs[0] ? info.hrs[0].o : "10:00", c: info.hrs[0] ? info.hrs[0].c : "18:00" }); redraw(); return; }
      else if ("piRowx" in d && row) { info.hrs.splice(Number(row.dataset.hrow), 1); redraw(); return; }
      else if (d.piIo != null) { info.io = info.io === d.piIo ? "" : d.piIo; pick(b, !!info.io); }
      else if (d.piStay != null) { const v = Number(d.piStay); info.stay = info.stay === v ? null : v; pick(b, info.stay != null); }
      else if (d.piPrice != null) {
        const o = PRICE_OPTS.find(([, l]) => l === d.piPrice);
        if (info.priceText === d.piPrice) { info.priceText = ""; info.price = null; } else { info.priceText = o[1]; info.price = o[0]; }
        pick(b, !!info.priceText);
        const y = $("[data-pi-yen]", el); if (y) y.value = "";
      } else return;
      out();
    });
    const onInput = (e) => {
      const t = e.target, d = t.dataset;
      if (d.piT) info[d.piT] = t.value;
      else if ("piO" in d || "piC" in d) { const row = t.closest("[data-hrow]"), r = row && info.hrs[Number(row.dataset.hrow)]; if (r && t.value) r["piO" in d ? "o" : "c"] = t.value; }
      else if ("piYen" in d) {
        const n = parseInt(t.value, 10);
        info.price = Number.isFinite(n) && n >= 0 ? n : null;
        info.priceText = info.price != null ? `${info.price.toLocaleString()}円` : "";
        $$("[data-pi-price]", el).forEach((x) => x.classList.remove("on"));
      } else return;
      out();
    };
    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput); // 時刻の欄は change しか来ないブラウザがある
  }
  // 記事・自分の記録で出す場所の情報（記事に入れた値。なければ場所にもう入っている値）
  function infoView(info, sp) {
    const t = infoTexts(info);
    return {
      hours: t.hours || hoursText(sp), closed: t.closed || sp.closed || "", addr: info.addr || sp.addr || "",
      io: info.io || (newPlace(sp) ? "" : ioText(sp)), stay: info.stay ? stayLabel(info.stay) : "",
      price: priceLabel(info) || sp.priceText || (sp.price ? `目安 ${sp.price.toLocaleString()}円` : ""),
    };
  }
  function infoBoxHTML(v) {
    const kv = [v.io, v.price, v.stay ? "滞在 " + v.stay : ""].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("");
    const dl = [["営業", v.hours], ["休み", v.closed], ["住所", v.addr]].filter(([, x]) => x).map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join("");
    return `${kv ? `<div class="kv">${kv}</div>` : ""}${dl ? `<dl class="stop-info">${dl}</dl>` : ""}`;
  }
  // 書く画面の場所のカードに出す、うすい枠（まだ入れていない所は「押して入れる」）
  function infoSummary(info) {
    const t = infoTexts(info);
    const row = (k, v) => `<span class="ws-row"><i>${k}：</i><span class="${v ? "" : "ph"}">${esc(v || "押して入れる")}</span></span>`;
    return `${row("営業時間", t.hours)}${row("定休日", t.closed)}${row("屋内・屋外", info.io)}${row("いた時間", info.stay ? stayLabel(info.stay) : "")}${row("費用", priceLabel(info))}${row("住所", info.addr)}`;
  }
  // 公開した記事の値を場所に入れる。まだ記事のなかった場所は、記事の値でそのまま登録する。もともとある場所は、空いている所だけ埋める
  function applyInfo(sp, info) {
    const t = infoTexts(info), fresh = newPlace(sp);
    const set = (k, v) => { if (v !== "" && v != null && (fresh || sp[k] == null || sp[k] === "")) sp[k] = v; };
    set("hoursText", t.hours); set("closed", t.closed); set("addr", info.addr); set("priceText", info.priceText);
    if (info.price != null) set("price", info.price);
    if (info.io) { set("io", info.io); if (fresh) sp.indoor = info.io !== "屋外"; }
    if (info.stay) set("stay", info.stay);
    const rows = (info.hrs || []).filter((r) => r.d.length && r.o && r.c);
    if (rows.length && (fresh || !sp.hours)) sp.hours = { open: rows.map((r) => r.o).sort()[0], close: rows.map((r) => r.c).sort().slice(-1)[0] };
  }
  // 場所の情報を入れる小さな画面（書く画面の場所のカードから）
  function openInfoSheet(sp, info, onSave) {
    closePicker();
    const work = JSON.parse(JSON.stringify(info));
    if (!work.hrs || !work.hrs.length) work.hrs = [{ d: [], o: "10:00", c: "18:00" }];
    const box = document.createElement("div");
    box.className = "picker-back"; box.id = "picker";
    box.innerHTML = `<div class="picker pi-sheet" role="dialog" aria-label="場所の情報">
      <div class="picker-head">${IC.pin}<div><b>${esc(sp ? sp.name : "場所")}の情報</b><div class="small">わかるところだけ。記事の場所の下に出て、予定をつくるときにも使われます</div></div></div>
      <div class="picker-list"><div class="pi" data-pi>${infoFormInner(work)}</div></div>
      <div class="picker-foot"><button class="mini-btn" data-pk="close">やめる</button><button class="btn primary small" data-pk="ok">${IC.check}入れる</button></div>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    bindInfoForm($("[data-pi]", box), work);
    box.addEventListener("click", (e) => {
      const k = e.target.closest("[data-pk]");
      if (k && k.dataset.pk === "ok") { closePicker(); onSave(work); toast("場所の情報を入れました"); }
      else if ((k && k.dataset.pk === "close") || e.target === box) closePicker();
    });
  }

  /* ---------- note 風の本文エディタ（書く画面と、自分の記録で同じものを使う） ----------
     ・カーソルのある所に入れる。文の途中なら、そこで段落を2つに分けて、そのあいだに入れる
     ・空の行の右に「＋」が出る。押すと、入れられるもののメニュー（note の「＋」と同じ使い方）
     ・画像・写真の列・場所のカードは、↑↓で動かし、×で外す。写真の列は横にずらして見る
     ・貼り付けは文字だけ（ほかのページの見た目やスクリプトを持ち込まない）。中身はこの端末のメモリだけ */
  const RT = {
    img: [IC.image, "画像"], gal: [IC.images, "写真を並べる"], recph: [IC.images, "記録の写真"], spot: [IC.pin, "場所"],
    h: ['<b class="wt-t">H</b>', "見出し"], quote: [IC.quote, "引用"], ul: [IC.list, "箇条書き"],
    bold: ['<b class="wt-t">B</b>', "太字"], link: [IC.link, "リンク"], hr: [IC.hr, "区切り線"],
  };
  const rtBtn = (k) => `<button type="button" data-rt="${k}" title="${RT[k][1]}">${RT[k][0]}<span>${RT[k][1]}</span></button>`;
  const BLK_TOOLS = `<span class="blk-tools"><button type="button" data-bt="up" aria-label="上へ">${IC.up}</button><button type="button" data-bt="down" aria-label="下へ">${IC.down}</button><button type="button" data-bt="del" aria-label="外す">${IC.x}</button></span>`;
  const figHTML = (src, cap = "") => `<figure class="wr-fig" contenteditable="false"><img src="${esc(src)}" alt=""><figcaption contenteditable="true" data-ph="キャプション（なくてもよい）">${esc(cap)}</figcaption>${BLK_TOOLS}</figure>`;
  const galItem = (it) => `<figure><img src="${esc(it.src)}" alt=""><figcaption contenteditable="true" data-ph="説明">${esc(it.cap || "")}</figcaption><button type="button" class="wr-gal-x" data-gal-del aria-label="この写真を外す">${IC.x}</button></figure>`;
  const galHTML = (items) => `<div class="wr-gal" contenteditable="false"><div class="wr-gal-row">${items.map(galItem).join("")}<label class="wr-gal-add">${IC.plus}<span>足す</span><input type="file" accept="image/*" multiple hidden data-gal-add></label></div><div class="wr-gal-foot"><span class="wr-gal-note" data-gal-n>${items.length}枚・横にずらして見る</span>${BLK_TOOLS}</div></div>`;
  const photoBlock = (list) => (list.length > 1 ? galHTML(list.map((src) => ({ src }))) : figHTML(list[0]));
  // 本文に入れる「行った場所」のカード。評価と、場所の情報（営業時間・定休日など）のうすい枠つき
  function spotBlock(sp, rating = 0, info = null) {
    const inf = info || infoFrom(sp);
    return `<div class="wr-spot" contenteditable="false" data-spot="${sp.id}" data-rating="${rating}" data-info="${esc(JSON.stringify(inf))}">
      <div class="wr-spot-top"><span class="wr-spot-ic">${IC.pin}</span><span class="wr-spot-tx"><b>${esc(sp.name)}</b><small>${esc(sp.kind)}${sp.temp ? "・まだ記事のない場所" : ""}</small></span></div>
      <div class="wr-rate">${[3, 2, 1].map((n) => `<button type="button" class="r${n} ${n === rating ? "on" : ""}" data-wr-rate="${n}">${RATING[n]}</button>`).join("")}</div>
      <button type="button" class="wr-info" data-wr-info>${infoSummary(inf)}</button>
      ${BLK_TOOLS}
    </div>`;
  }
  /* wrap にエディタを作る。o：{ html, tools, ph, label, onChange(html), recPhotos()（記録の写真）, toolsHost（道具の帯を置く所）,
     bar: false（道具の帯を作らない。書く画面は、上の帯をいま書いている本文に使う）, onFocus(エディタ) } */
  function mountEditor(wrap, o) {
    const btn = rtBtn;
    const bar = o.bar === false ? "" : `<div class="rt-tools" role="toolbar" aria-label="本文に入れる">${o.tools.map(btn).join("")}</div>`;
    wrap.innerHTML = `${o.toolsHost ? "" : bar}<div class="rt-area">
        <div class="wr-body rt" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(o.label || "本文")}" data-ph="${esc(o.ph || "")}">${o.html || WR_EMPTY}</div>
        <button type="button" class="rt-plus" hidden aria-label="画像などを入れる">${IC.plus}</button>
        <div class="rt-menu" hidden>${o.tools.filter((k) => k !== "bold" && k !== "link").map(btn).join("")}</div>
      </div>
      <input type="file" accept="image/*" hidden data-rt-file><input type="file" accept="image/*" multiple hidden data-rt-files>`;
    if (o.toolsHost) o.toolsHost.innerHTML = bar;
    const toolsEl = o.bar === false ? null : $(".rt-tools", o.toolsHost || wrap), area = $(".rt-area", wrap), rt = $(".rt", wrap), plus = $(".rt-plus", wrap), menu = $(".rt-menu", wrap);
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (err) { /* なくてもよい */ }
    const isBlank = (el) => !el.textContent.trim() && !el.querySelector("img");
    const isText = (el) => !!el && el.nodeType === 1 && /^(P|H2|H3|BLOCKQUOTE|DIV)$/.test(el.tagName) && !el.classList.contains("wr-spot") && !el.classList.contains("wr-gal");
    const isEmpty = () => !rt.textContent.trim() && !rt.querySelector("img,hr,.wr-spot,ul,h2,h3,blockquote");
    const newP = () => { const p = document.createElement("p"); p.innerHTML = "<br>"; return p; };
    const changed = () => {
      if (!rt.firstElementChild && !rt.textContent.trim()) rt.innerHTML = WR_EMPTY; // 全部消したときも段落を残す
      const last = rt.lastElementChild;
      if (last && !isText(last)) last.after(newP()); // 最後は、書き続けられる段落にしておく
      rt.classList.toggle("is-empty", isEmpty());
      if (o.onChange) o.onChange(rt.innerHTML);
    };
    // 本文のカーソルの位置を覚えておく（道具のボタンを押しても、その位置に入れる）
    let range = null;
    const blockOf = (n) => { while (n && n.parentNode !== rt) n = n.parentNode; return n || null; };
    const placeAt = (el, end) => {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); range = r.cloneRange();
    };
    // 空の行にカーソルがあるときだけ、その行の右に「＋」を出す
    function updatePlus() {
      const s = getSelection();
      const blk = s.rangeCount && s.isCollapsed && rt.contains(s.anchorNode) ? blockOf(s.anchorNode) : null;
      const show = !!blk && blk.tagName === "P" && isBlank(blk);
      plus.hidden = !show;
      if (!show) { menu.hidden = true; return; }
      const top = blk.getBoundingClientRect().top - area.getBoundingClientRect().top;
      plus.style.top = Math.max(0, top + (blk.offsetHeight - 30) / 2) + "px";
      menu.style.top = Math.max(0, top + blk.offsetHeight / 2 + 20) + "px";
    }
    const onSel = () => {
      if (!rt.isConnected) { document.removeEventListener("selectionchange", onSel); return; } // 閉じたら外す
      const s = getSelection();
      if (s.rangeCount && rt.contains(s.anchorNode)) { range = s.getRangeAt(0).cloneRange(); updatePlus(); }
    };
    document.addEventListener("selectionchange", onSel);
    const restore = () => {
      rt.focus({ preventScroll: true });
      if (range && rt.contains(range.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
      else placeAt(rt.lastElementChild || rt, true);
    };
    // カーソルの所にブロック（画像・写真の列・場所・区切り線）を入れ、そのあとに書き続けられる段落を置く
    function insertBlock(html) {
      const tpl = document.createElement("template"); tpl.innerHTML = html.trim();
      const nodes = [...tpl.content.children], after = newP();
      if (!nodes.length) return;
      let next = after;
      const r = range && rt.contains(range.startContainer) ? range : null;
      const blk = r ? blockOf(r.startContainer) : null;
      if (blk && isText(blk)) {
        if (isBlank(blk)) blk.replaceWith(...nodes, after);
        else {
          // 文の途中：カーソルの所で段落を2つに分け、そのあいだに入れる
          const tail = document.createRange();
          tail.setStart(r.startContainer, r.startOffset); tail.setEnd(blk, blk.childNodes.length);
          const rest = document.createElement(/^H/.test(blk.tagName) ? "p" : blk.tagName.toLowerCase());
          rest.appendChild(tail.extractContents());
          if (isBlank(rest)) blk.after(...nodes, after);
          else { blk.after(...nodes, rest); next = rest; }
          if (isBlank(blk)) blk.remove();
        }
      } else if (blk) blk.after(...nodes, after);
      else rt.append(...nodes, after);
      rt.focus({ preventScroll: true }); placeAt(next, false);
      nodes[0].scrollIntoView({ block: "nearest" });
      changed(); updatePlus();
    }
    const galCount = (g) => {
      const n = $$("figure", g).length;
      if (!n) { g.remove(); return; }
      const t = $("[data-gal-n]", g); if (t) t.textContent = `${n}枚・横にずらして見る`;
    };
    rt.addEventListener("click", (e) => {
      menu.hidden = true;
      const bt = e.target.closest("[data-bt]");
      if (bt) {
        const b = blockOf(bt), k = bt.dataset.bt;
        if (k === "del") b.remove();
        else if (k === "up" && b.previousElementSibling) b.previousElementSibling.before(b);
        else if (k === "down" && b.nextElementSibling) b.nextElementSibling.after(b);
        changed();
        if (k !== "del") b.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      const gx = e.target.closest("[data-gal-del]");
      if (gx) { const g = gx.closest(".wr-gal"); gx.closest("figure").remove(); galCount(g); changed(); return; }
      const rate = e.target.closest("[data-wr-rate]");
      if (rate) {
        const c = rate.closest(".wr-spot"); c.dataset.rating = rate.dataset.wrRate;
        $$("[data-wr-rate]", c).forEach((x) => x.classList.toggle("on", x === rate)); changed(); return;
      }
      const inf = e.target.closest("[data-wr-info]");
      if (inf) {
        const c = inf.closest(".wr-spot");
        openInfoSheet(spotById[c.dataset.spot], parseInfo(c.dataset.info), (info) => { c.dataset.info = JSON.stringify(info); inf.innerHTML = infoSummary(info); changed(); });
      }
    });
    // 写真の列に写真を足す
    rt.addEventListener("change", async (e) => {
      const inp = e.target.closest("[data-gal-add]"); if (!inp) return;
      const files = [...(inp.files || [])]; inp.value = "";
      const g = inp.closest(".wr-gal"), add = inp.closest(".wr-gal-add");
      for (const f of files) { try { add.insertAdjacentHTML("beforebegin", galItem({ src: await shrinkPhoto(f, 1600) })); } catch (err) { /* 読めない画像はとばす */ } }
      galCount(g); changed();
    });
    rt.addEventListener("input", () => { changed(); updatePlus(); });
    rt.addEventListener("keydown", (e) => {
      // キャプションは1行
      const n = getSelection().anchorNode, el = n && (n.nodeType === 1 ? n : n.parentNode);
      if (e.key === "Enter" && el && el.closest && el.closest("figcaption")) e.preventDefault();
    });
    // 貼り付けは文字だけ（ほかのページの見た目やスクリプトを持ち込まない）
    rt.addEventListener("paste", (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
    rt.addEventListener("drop", (e) => e.preventDefault());
    rt.addEventListener("focusout", () => setTimeout(() => { if (!rt.contains(document.activeElement) && menu.hidden) plus.hidden = true; }, 250));

    const file1 = $("[data-rt-file]", wrap), fileN = $("[data-rt-files]", wrap);
    async function addFiles(list, many) {
      const srcs = [];
      for (const f of list) { try { srcs.push(await shrinkPhoto(f, 1600)); } catch (err) { /* 読めない画像はとばす */ } }
      if (!srcs.length) { toast("画像を読めませんでした"); return; }
      insertBlock(many && srcs.length > 1 ? galHTML(srcs.map((src) => ({ src }))) : srcs.map((x) => figHTML(x)).join(""));
      toast(`写真を${srcs.length}枚入れました（位置情報は消してあります）`);
    }
    file1.addEventListener("change", (e) => { const l = [...(e.target.files || [])]; e.target.value = ""; if (l.length) addFiles(l, false); });
    fileN.addEventListener("change", (e) => { const l = [...(e.target.files || [])]; e.target.value = ""; if (l.length) addFiles(l, true); });
    function act(k) {
      menu.hidden = true;
      if (k === "img") { file1.click(); return; }
      if (k === "gal") { fileN.click(); return; }
      if (k === "recph") {
        const l = o.recPhotos ? o.recPhotos() : [];
        if (!l.length) { toast("記録の写真がまだありません（「写真」で足せます）"); return; }
        insertBlock(photoBlock(l)); return;
      }
      if (k === "spot") { openSpotPicker((list) => insertBlock(list.map((sp) => spotBlock(sp)).join(WR_EMPTY))); return; }
      if (k === "hr") { insertBlock("<hr>"); return; }
      restore();
      if (k === "bold") { document.execCommand("bold"); changed(); return; }
      if (k === "ul") { document.execCommand("insertUnorderedList"); changed(); return; }
      if (k === "link") {
        const s = getSelection();
        if (!s.rangeCount || s.isCollapsed) { toast("リンクにしたい文字を選んでから押してください"); return; }
        const keep = s.getRangeAt(0).cloneRange();
        const u = (prompt("リンクのアドレス（https:// から）", "https://") || "").trim();
        if (!safeHref(u)) { if (u && u !== "https://") toast("https:// か http:// から始まるアドレスを入れてください"); return; }
        rt.focus({ preventScroll: true }); s.removeAllRanges(); s.addRange(keep);
        document.execCommand("createLink", false, u); changed(); return;
      }
      const blk = range && blockOf(range.startContainer);
      if (!isText(blk)) { toast("文字の段落にカーソルを置いてから押してください"); return; }
      const tag = k === "h" ? "H2" : "BLOCKQUOTE";
      document.execCommand("formatBlock", false, blk.tagName === tag ? "<p>" : `<${tag.toLowerCase()}>`);
      changed();
    }
    [toolsEl, menu, plus].filter(Boolean).forEach((el) => el.addEventListener("mousedown", (e) => e.preventDefault())); // 押しても本文のカーソルが消えないように
    if (toolsEl) toolsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-rt]"); if (b) act(b.dataset.rt); });
    menu.addEventListener("click", (e) => { const b = e.target.closest("[data-rt]"); if (b) act(b.dataset.rt); });
    plus.addEventListener("click", () => { menu.hidden = !menu.hidden; });
    changed();
    const api = {
      rt, act, insert: insertBlock, isEmpty, blocks: () => readBlocks(rt),
      setHTML: (h) => { rt.innerHTML = h || WR_EMPTY; changed(); },
    };
    if (o.onFocus) rt.addEventListener("focusin", () => o.onFocus(api));
    return api;
  }

  /* ---------- 記事を公開する（試作：この端末のメモリの中だけ） ----------
     makeRecord：書いた中身から記事の形を作る（プレビューにも使う。まだどこにも入れない）
       o：{ id, title, mode（one：1か所 / route：複数の場所）, tag（ルートのメインのタグ）, tags（1か所の記事のタグ）, cover（見出し画像）, vis, leadBlocks,
            secs: [{ spot, rating, head（小見出し）, tags（その場所のタグ）, info（場所の情報）, blocks（本文） }] }
     publishRecord：記事を「読む」と地図に出す。まだ記事のなかった場所は、ここで登録されて、ほかの人も地図で使えるようになる */
  const todayText = () => { const d = new Date(), p2 = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const recsAt = (id) => D.records.filter((r) => r.spots.some((s) => s.spot === id));
  function makeRecord(o) {
    const secs = (o.secs || []).filter((x) => spotById[x.spot]);
    if (!secs.length) return null;
    const route = o.mode === "route";
    const spots = secs.map((x) => {
      const sp = spotById[x.spot], info = x.info && Object.keys(x.info).length ? x.info : infoFrom(sp), blocks = x.blocks || [];
      return {
        spot: sp.id, rating: x.rating || 2, stay: info.stay || defaultStay(sp), head: x.head || "", tags: x.tags || [],
        note: plainOf(blocks).slice(0, 60) || x.head || "（本文なし）", photos: photosOfBlocks(blocks), blocks, info,
      };
    });
    const one = (o.tags || []).filter(Boolean);
    const main = route ? o.tag || "旅行" : one[0] || "旅行";
    // 記事のタグ：ルートはメインのタグ＋場所ごとのタグ（読むのタグにあるものだけ）。読むでは、ルートはメインのタグだけで出る
    const tags = route ? [...new Set([main, ...spots.flatMap((s) => s.tags.filter((t) => D.TAGS.includes(t)))])] : one.length ? one : ["旅行"];
    return {
      id: o.id || "me" + Date.now().toString(36), writer: "me", type: spots.length > 1 ? "route" : "spot", title: o.title, mainTag: main, tags,
      date: todayText(), start: "10:00", spots, went: 0, lead: "", leadBlocks: o.leadBlocks || [], cover: o.cover || null, vis: o.vis || "public", rich: true,
    };
  }
  function publishRecord(r) {
    if (!r) return null;
    r.spots.forEach((s) => {
      const sp = spotById[s.spot];
      applyInfo(sp, s.info);
      if (sp.temp) { sp.user = true; delete sp.temp; } // 登録された（ほかの人も地図で使える）
      if (sp.user) sp.tags = [...new Set([...(sp.tags || []), ...(s.tags.length ? s.tags : r.tags).filter((t) => D.TAGS.includes(t))])];
    });
    const i = D.records.findIndex((x) => x.id === r.id);
    if (i >= 0) { r.went = D.records[i].went || 0; r.likes = D.records[i].likes || 0; D.records[i] = r; } else D.records.unshift(r);
    recById[r.id] = r;
    if (map) { drawMap(false); if (stage() === "explore") renderSheet(); }
    return r;
  }
  function unpublish(id) {
    const i = D.records.findIndex((x) => x.id === id);
    if (i >= 0) D.records.splice(i, 1);
    delete recById[id];
    if (map) { drawMap(false); if (stage() === "explore") renderSheet(); }
  }
  // プレビュー：公開したときの記事の見え方（まだ公開していない。登録・つくるなどのボタンは出さない）
  function openPreview(r) {
    const old = $("#pv"); if (old) old.remove();
    const box = document.createElement("div");
    box.className = "pv-back"; box.id = "pv";
    box.innerHTML = `<div class="pv-bar"><span class="pv-ttl">${IC.eye}<b>プレビュー</b><small>公開したときの見え方です（まだ公開していません）</small></span><button class="btn primary small" data-pv-close>${IC.edit}書く画面に戻る</button></div><div class="pv-page" id="pv-page"></div>`;
    $("#app").appendChild(box);
    let mm = null;
    renderArticle($("#pv-page", box), null, { rec: r, preview: true, onMap: (x) => { mm = x; } });
    requestAnimationFrame(() => box.classList.add("show"));
    box.addEventListener("click", (e) => {
      if (!e.target.closest("[data-pv-close]")) return;
      box.remove();
      if (mm) mm.then((m) => { if (m) m.remove(); });
    });
  }

  /* ---------- 書く（真ん中の緑の丸）：note の記事の編集画面を参考にした、記事を書く画面 ----------
     いちばん上で、記事の形を選ぶ。
       1か所：見出し画像・タイトル・場所・評価・タグ・本文・場所の情報
       複数の場所（ルート）：見出し画像・タイトル・メインのタグ・はじめに。そのあと場所ごとに、
         場所・小見出し・評価・その場所のタグ（駅・自然・グルメ…）・本文・場所の情報。「他の場所も続けて書く」で次の場所を足す
     場所の情報（営業時間・定休日・住所など）は本文に入れない。記事では、場所の「詳しく」から見る。
     「プレビュー」で公開したときの見え方を確かめ、「公開に進む」で、この端末の中だけで記事として出す（開き直すと消える） */
  const newSec = (id = null) => ({ spot: id, rating: 0, head: "", tags: [], info: id ? infoFrom(spotById[id]) : null, html: "" });
  const wr = { mode: "one", title: "", cover: null, tags: [], tag: null, lead: "", secs: [newSec()], savedAt: null, recId: null };
  const SPOT_TAGS = [...new Set(["駅", ...D.TAGS.filter((t) => t !== "旅行"), "買い物", "宿"])];
  const WR_TOOLS = ["img", "gal", "h", "quote", "ul", "bold", "link", "hr"];
  const htmlBlank = (h) => !htmlText(h || "").trim() && !/<img|<hr|wr-spot/.test(h || "");
  const wrBlank = () => !wr.title.trim() && htmlBlank(wr.lead) && wr.secs.every((x) => !x.spot && htmlBlank(x.html));
  // 場所を書く画面に入れる（空いている場所の欄から埋め、足りなければ後ろに足す）。2か所以上になったらルートにする
  function addSecs(ids) {
    const have = new Set(wr.secs.map((x) => x.spot).filter(Boolean));
    const fresh = [...new Set(ids)].filter((id) => spotById[id] && !have.has(id));
    fresh.forEach((id) => {
      const empty = wr.secs.find((x) => !x.spot);
      if (empty) { empty.spot = id; empty.info = infoFrom(spotById[id]); } else wr.secs.push(newSec(id));
    });
    const toRoute = wr.mode !== "route" && wr.secs.filter((x) => x.spot).length > 1;
    if (toRoute) { wr.mode = "route"; if (!wr.tag) wr.tag = wr.tags[0] || null; }
    return { n: fresh.length, toRoute };
  }
  // fromPlan：たどった予定の場所を、場所ごとに書けるようにしてから開く（たどり終わったときの「記事を書く」）
  function openWrite(fromPlan) {
    const pl = state.plan;
    if (fromPlan && pl) {
      const ids = pl.stops.filter(live).map((s) => s.spot);
      if (wrBlank() || confirm("書きかけの記事の後ろに、たどった場所を足しますか？")) {
        if (!wr.title.trim()) wr.title = pl.title;
        const a = addSecs(ids);
        toast(a.n ? `たどった${a.n}か所を、場所ごとに書けるようにしました` : "たどった場所は、もう入っています");
      }
    }
    const render = (p) => renderWrite(p);
    render.coverTabs = true;
    showPanel(render);
  }
  // 地図で見つけた場所から書く
  function openWriteAt(sp) {
    const a = addSecs([sp.id]);
    toast(a.n ? `${sp.name}を入れました${a.toRoute ? "（複数の場所の記事にしました）" : ""}` : `${sp.name}は、もう入っています`);
    openWrite(false);
  }
  let wrActive = null; // いま書いている本文。上の道具の帯は、ここに入れる
  function renderWrite(p) {
    const route = wr.mode === "route";
    if (!wr.secs.length) wr.secs.push(newSec());
    const tagBtns = (list, on, attr) => list.map((t) => `<button type="button" class="${on(t) ? "on" : ""}" ${attr}="${esc(t)}">#${esc(t)}</button>`).join("");
    const secHTML = (x, k) => {
      const sp = x.spot && spotById[x.spot], n = wr.secs.length;
      const place = sp
        ? `<button type="button" class="ws-place has" data-ws="place" data-k="${k}">${IC.pin}<span class="ws-place-tx"><b>${esc(sp.name)}</b><small>${esc(sp.kind)}${sp.temp ? "・まだ記事のない場所（公開すると登録されます）" : ""}</small></span><em>変える</em></button>`
        : `<button type="button" class="ws-place" data-ws="place" data-k="${k}">${IC.pin}<span class="ws-place-tx"><b>${route ? `${k + 1}か所めの場所を選ぶ` : "行った場所を選ぶ"}</b><small>予定・登録した場所から。名前で探せば、記事のない場所も</small></span>${ICON.chev}</button>`;
      const tools = `<span class="ws-tools"><button type="button" data-ws="up" data-k="${k}" aria-label="前へ" ${k ? "" : "disabled"}>${IC.up}</button><button type="button" data-ws="down" data-k="${k}" aria-label="後ろへ" ${k < n - 1 ? "" : "disabled"}>${IC.down}</button><button type="button" data-ws="del" data-k="${k}" aria-label="この場所を外す">${IC.x}<span>外す</span></button></span>`;
      return `<section class="ws-sec ${route ? "route" : "one"}" data-sec="${k}">
        ${route ? `<div class="ws-top"><span class="ws-no">${k + 1}</span><b>${k + 1}か所め</b>${tools}</div>` : ""}
        ${place}
        ${route ? `<input class="ws-sub" data-ws-sub="${k}" value="${esc(x.head)}" placeholder="小見出し（例：運河をまたぐ橋の上から）" aria-label="${k + 1}か所めの小見出し">` : ""}
        ${sp ? `<div class="ws-line"><span class="ws-k">評価</span><div class="wr-rate">${[3, 2, 1].map((v) => `<button type="button" class="r${v} ${v === x.rating ? "on" : ""}" data-ws-rate="${v}" data-k="${k}">${RATING[v]}</button>`).join("")}</div></div>` : ""}
        <div class="ws-line"><span class="ws-k">${route ? "この場所のタグ" : "タグ"}</span><div class="wr-tags ws-tags">${route ? tagBtns(SPOT_TAGS, (t) => x.tags.includes(t), `data-k="${k}" data-ws-stag`) : tagBtns(D.TAGS, (t) => wr.tags.includes(t), "data-wtag")}</div></div>
        <div class="ws-ed" data-ws-ed="${k}"></div>
        ${sp ? `<button type="button" class="wr-info ws-info" data-ws="info" data-k="${k}"><span class="ws-info-h">${IC.info}<b>場所の情報</b><small>本文には入りません。記事の「詳しく」に出ます</small></span><span class="ws-info-v">${infoSummary(x.info || infoFrom(sp))}</span></button>` : ""}
      </section>`;
    };
    const st = wr.recId ? "公開中・直したら「更新する」" : wr.savedAt ? `下書き保存 ${wr.savedAt}` : "下書き";
    p.innerHTML = `<div class="wr ${route ? "is-route" : ""}">
      <div class="wr-head">
        <div class="wr-bar">
          <button class="wr-close" aria-label="閉じる（書いた中身は残ります）">${IC.x}</button>
          <span class="wr-state" id="wr-state">${st}</span>
          <button class="wr-save" id="wr-save">下書き保存</button>
          <button class="wr-pub" id="wr-pub" data-ws="pub">${wr.recId ? "更新する" : "公開に進む"}</button>
        </div>
        <div class="rt-tools" id="wr-tools" role="toolbar" aria-label="いま書いている本文に入れる">${WR_TOOLS.map(rtBtn).join("")}</div>
      </div>
      <div class="wr-page">
        <div class="wr-mode" role="radiogroup" aria-label="記事の形">
          <button type="button" role="radio" aria-checked="${!route}" class="${route ? "" : "on"}" data-ws-mode="one">${IC.pin}<span><b>1か所</b><small>ひとつの場所の記事</small></span></button>
          <button type="button" role="radio" aria-checked="${route}" class="${route ? "on" : ""}" data-ws-mode="route">${IC.route}<span><b>複数の場所（ルート）</b><small>回った順に、場所ごとに書く</small></span></button>
        </div>
        <label class="wr-cover ${wr.cover ? "has" : ""}" title="見出し画像">
          ${wr.cover ? `<img src="${esc(img(wr.cover))}" alt="見出し画像">` : `${IC.image}<span>${route ? "ルートの" : ""}見出し画像を追加</span>`}
          <input type="file" accept="image/*" hidden id="wr-cover-in">
        </label>
        ${wr.cover ? `<button type="button" class="wr-cover-del" id="wr-cover-del">${IC.x}画像を外す</button>` : ""}
        <textarea class="wr-title" id="wr-title" rows="1" placeholder="${route ? "ルートのタイトル" : "記事タイトル"}" aria-label="記事タイトル">${esc(wr.title)}</textarea>
        ${route ? `<div class="ws-line ws-main"><span class="ws-k">メインのタグ<small>読むでは、このタグで出ます</small></span><div class="wr-tags ws-tags">${tagBtns(D.TAGS, (t) => wr.tag === t, "data-wmain")}</div></div>
        <div class="ws-lead"><div class="ws-k">はじめに<small>ルート全体のこと（なくてもよい）</small></div><div class="ws-ed" data-ws-ed="lead"></div></div>` : ""}
        ${wr.secs.map(secHTML).join("")}
        ${route ? `<button type="button" class="ws-more" data-ws="more">${IC.route}<span><b>他の場所も続けて書く</b><small>${wr.secs.length + 1}か所めの場所を選んで、その続きを書きます</small></span></button>` : ""}
        <div class="wr-end">
          <button type="button" class="btn ghost" data-ws="preview">${IC.eye}プレビュー</button>
          <button type="button" class="btn accent" data-ws="pub">${IC.globe}${wr.recId ? "更新する" : "公開に進む"}</button>
        </div>
      </div>
      <div class="wr-foot"><span id="wr-count"></span><span>試作：この端末の中だけに置き、開き直すと消えます</span></div>
    </div>`;
    const root = $(".wr", p), title = $("#wr-title", p), count = $("#wr-count", p);
    const fitTitle = () => { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; };
    const countNow = () => {
      let n = wr.title.replace(/\s/g, "").length + $$(".ws-sub", p).reduce((a, x) => a + x.value.replace(/\s/g, "").length, 0);
      $$(".ws-ed .rt", p).forEach((rt) => { const c = rt.cloneNode(true); c.querySelectorAll('[contenteditable="false"]').forEach((x) => x.remove()); n += c.textContent.replace(/\s/g, "").length; });
      count.textContent = `${n}文字`;
    };
    // 描き直す（スクロールの位置はそのまま）。書いた中身は、打つたびに wr に入っている
    const redraw = (after) => { const sc = p.scrollTop; renderWrite(p); p.scrollTop = sc; if (after) after(); };
    // 本文（はじめに・場所ごと）。上の道具の帯は、最後に書いていた本文に入れる
    const eds = [];
    const mark = (api) => { wrActive = api; $$(".ws-sec, .ws-lead", p).forEach((x) => x.classList.toggle("act", x.contains(api.rt))); };
    const mk = (key, html, ph, label, set) => {
      const api = mountEditor($(`[data-ws-ed="${key}"]`, p), { html, tools: WR_TOOLS, bar: false, ph, label, onChange: (h) => { set(h); countNow(); }, onFocus: mark });
      eds.push(api); return api;
    };
    if (route) mk("lead", wr.lead, "ルート全体のこと。どんな日に、どう回ったか、どんな人に向いているか。", "はじめに", (h) => { wr.lead = h; });
    wr.secs.forEach((x, k) => mk(k, x.html,
      route ? `${k + 1}か所めのこと。見どころ、おすすめの時間など。上の道具で、画像や写真の列も入れられます。` : "ご自由にお書きください。上の道具や、空の行の「＋」から、画像・写真の列・見出しを、書いている途中のどこにでも入れられます。",
      route ? `${k + 1}か所めの本文` : "本文", (h) => { x.html = h; }));
    wrActive = eds[route ? 1 : 0] || eds[0];
    countNow();
    const tb = $("#wr-tools", p);
    tb.addEventListener("mousedown", (e) => e.preventDefault()); // 押しても本文のカーソルが消えないように
    tb.addEventListener("click", (e) => { const b = e.target.closest("[data-rt]"); if (!b) return; (wrActive && wrActive.rt.isConnected ? wrActive : eds[0]).act(b.dataset.rt); });
    requestAnimationFrame(fitTitle);
    title.addEventListener("input", () => { wr.title = title.value; fitTitle(); countNow(); });
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        const sub = $(".ws-sub", p);
        if (route && !$(".ws-ed", p)) { if (sub) sub.focus(); return; }
        const rt = eds[0].rt; rt.focus();
        const r = document.createRange(); r.selectNodeContents(rt.firstElementChild || rt); r.collapse(true);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
    });
    root.addEventListener("input", (e) => { const sb = e.target.closest("[data-ws-sub]"); if (sb && wr.secs[Number(sb.dataset.wsSub)]) { wr.secs[Number(sb.dataset.wsSub)].head = sb.value; countNow(); } });
    $("#wr-cover-in", p).addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = "";
      if (!f) return;
      try { wr.cover = await shrinkPhoto(f, 1600); redraw(); } catch (err) { toast(err.message); }
    });
    const cd = $("#wr-cover-del", p);
    if (cd) cd.addEventListener("click", () => { wr.cover = null; redraw(); });
    $(".wr-close", p).addEventListener("click", () => { stack.pop(); paint(); if (!stack.length) refreshView(); });
    $("#wr-save", p).addEventListener("click", () => {
      const d = new Date();
      wr.savedAt = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      $("#wr-state", p).textContent = `下書き保存 ${wr.savedAt}`;
      toast("下書きを保存しました（試作：この端末の中だけ）");
    });
    const focusSec = (k) => { const x = $(`[data-sec="${k}"]`, p); if (x) x.scrollIntoView({ block: "center", behavior: "smooth" }); };
    // 場所を選ぶ。ルートで何か所かまとめて選んだら、そのあとに場所の欄を足す
    const pickPlace = (k) => {
      const have = new Set(wr.secs.filter((y, j) => j !== k && y.spot).map((y) => y.spot));
      openSpotPicker((list) => {
        const x = wr.secs[k]; if (!x) return;
        const ok = list.filter((sp) => sp && !have.has(sp.id)), [first, ...rest] = ok;
        if (!first) { toast("その場所は、もう入っています"); return; }
        if (x.spot !== first.id) { x.spot = first.id; x.info = infoFrom(first); }
        let msg = `${first.name}を${wr.mode === "route" ? `${k + 1}か所めに` : ""}入れました`;
        if (rest.length) {
          wr.secs.splice(k + 1, 0, ...rest.map((sp) => newSec(sp.id)));
          msg = `${ok.length}か所を、場所ごとに書けるようにしました`;
          if (wr.mode !== "route") { wr.mode = "route"; if (!wr.tag) wr.tag = wr.tags[0] || null; msg += "（複数の場所の記事にしました）"; }
        }
        toast(msg);
        redraw();
      }, have, { multi: route, title: route ? `${k + 1}か所めの場所` : "行った場所" });
    };
    const setMode = (m) => {
      if (m === wr.mode) return;
      if (m === "one") {
        const used = wr.secs.filter((x) => x.spot || !htmlBlank(x.html) || x.head.trim());
        if (used.length > 1 && !confirm(`1か所の記事にすると、2か所め以降の${used.length - 1}か所（その本文も）を外します。よいですか？`)) return;
        const first = used[0] || newSec();
        if (!htmlBlank(wr.lead)) first.html = wr.lead + (htmlBlank(first.html) ? "" : first.html); // はじめには、本文の前に入れる
        wr.tags = [...new Set([...wr.tags, ...(wr.tag ? [wr.tag] : []), ...first.tags.filter((t) => D.TAGS.includes(t))])];
        wr.lead = ""; wr.secs = [first];
      } else if (!wr.tag) wr.tag = wr.tags[0] || null;
      wr.mode = m;
      redraw();
    };
    // 公開・プレビューの前の確かめ。記事の形を作って返す（まだどこにも入れない）
    const wrCheck = (preview) => {
      const rt = wr.mode === "route", secs = wr.secs.filter((x) => x.spot && spotById[x.spot]);
      if (!preview && !wr.title.trim()) { title.focus(); title.scrollIntoView({ block: "center" }); toast("タイトルを入れてください"); return null; }
      if (!secs.length) { focusSec(0); toast(rt ? "場所を1つ以上選んでください（記事のない場所も、名前で探せます）" : "行った場所を選んでください（記事のない場所も、名前で探せます）"); return null; }
      const lost = wr.secs.findIndex((x) => !x.spot && (!htmlBlank(x.html) || x.head.trim()));
      if (lost >= 0) { focusSec(lost); toast(`${lost + 1}か所めの場所を選んでください（いらなければ「外す」）`); return null; }
      return makeRecord({
        id: wr.recId, title: wr.title.trim() || "（タイトルなし）", mode: wr.mode, tag: wr.tag, tags: wr.tags, cover: wr.cover,
        vis: (wr.recId && recById[wr.recId] && recById[wr.recId].vis) || "public", leadBlocks: rt ? blocksOf(wr.lead) : [],
        secs: secs.map((x) => ({ spot: x.spot, rating: x.rating, head: rt ? x.head.trim() : "", tags: rt ? x.tags : [], info: x.info, blocks: blocksOf(x.html) })),
      });
    };
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !root.contains(b) || b.closest(".ws-ed")) return; // 本文の中は、エディタが受け持つ
      const d = b.dataset, k = d.k != null ? Number(d.k) : -1, x = wr.secs[k];
      if (d.wsMode) { setMode(d.wsMode); return; }
      if (d.wtag != null) { const i = wr.tags.indexOf(d.wtag); if (i >= 0) wr.tags.splice(i, 1); else wr.tags.push(d.wtag); b.classList.toggle("on", i < 0); return; }
      if (d.wmain != null) { wr.tag = wr.tag === d.wmain ? null : d.wmain; $$("[data-wmain]", p).forEach((y) => y.classList.toggle("on", y.dataset.wmain === wr.tag)); return; }
      if (d.wsStag != null && x) { const i = x.tags.indexOf(d.wsStag); if (i >= 0) x.tags.splice(i, 1); else x.tags.push(d.wsStag); b.classList.toggle("on", i < 0); return; }
      if (d.wsRate && x) { const v = Number(d.wsRate); x.rating = x.rating === v ? 0 : v; $$(`[data-ws-rate][data-k="${k}"]`, p).forEach((y) => y.classList.toggle("on", Number(y.dataset.wsRate) === x.rating)); return; }
      if (d.ws === "place" && x) { pickPlace(k); return; }
      if (d.ws === "info" && x && spotById[x.spot]) {
        const sp = spotById[x.spot];
        openInfoSheet(sp, x.info || infoFrom(sp), (info) => { x.info = info; const v = $(`[data-sec="${k}"] .ws-info-v`, p); if (v) v.innerHTML = infoSummary(info); });
        return;
      }
      if ((d.ws === "up" || d.ws === "down") && x) {
        const j = d.ws === "up" ? k - 1 : k + 1;
        if (j < 0 || j >= wr.secs.length) return;
        [wr.secs[k], wr.secs[j]] = [wr.secs[j], wr.secs[k]];
        redraw(() => { const y = $(`[data-sec="${j}"]`, p); if (y) y.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
        return;
      }
      if (d.ws === "del" && x) {
        const sp = x.spot && spotById[x.spot];
        if ((sp || !htmlBlank(x.html) || x.head.trim()) && !confirm(`${sp ? `「${sp.name}」` : `${k + 1}か所め`}を記事から外しますか？（この場所に書いた本文も消えます）`)) return;
        wr.secs.splice(k, 1);
        if (!wr.secs.length) wr.secs.push(newSec());
        redraw(); return;
      }
      if (d.ws === "more") {
        const empty = wr.secs.findIndex((y) => !y.spot);
        if (empty >= 0) { focusSec(empty); pickPlace(empty); return; }
        wr.secs.push(newSec());
        const k2 = wr.secs.length - 1;
        redraw(() => { const y = $(`[data-sec="${k2}"]`, p); if (y) y.scrollIntoView({ block: "start", behavior: "smooth" }); pickPlace(k2); });
        return;
      }
      if (d.ws === "preview") { const r = wrCheck(true); if (r) openPreview(r); return; }
      if (d.ws === "pub") { const r = wrCheck(false); if (r) openPublishSheet(r, (rec) => { wr.recId = rec.id; paint(); openArticle(rec.id); }); }
    });
  }
  // 公開する前の確かめ（形・場所・タグ・見出し画像・公開範囲）。ここからもプレビューできる
  function openPublishSheet(r, onDone) {
    closePicker();
    const again = !!recById[r.id], sp = (x) => spotById[x.spot];
    let vis = (again && recById[r.id].vis) || r.vis || "public";
    const fresh = r.spots.filter((x) => sp(x).temp).length;
    const box = document.createElement("div");
    box.className = "picker-back"; box.id = "picker";
    box.innerHTML = `<div class="picker pub-sheet" role="dialog" aria-label="公開する">
      <div class="picker-head">${IC.globe}<div><b>${again ? "記事を更新する" : "記事を公開する"}</b><div class="small">試作：この端末の中だけで「読む」と地図に出ます（開き直すと消えます）</div></div></div>
      <div class="picker-list">
        <div class="pub-row"><span>タイトル</span><b>${esc(r.title)}</b></div>
        <div class="pub-row"><span>形</span><div>${r.spots.length > 1 ? `複数の場所（ルート・${r.spots.length}か所）` : "1か所の記事"}</div></div>
        <div class="pub-row"><span>場所</span><div>${r.spots.map((x, i) => `<div class="pub-spot"><i>${i + 1}</i><span>${esc(sp(x).name)}${x.head ? `<small>${esc(x.head)}</small>` : ""}${x.tags.length ? `<small>${x.tags.map((t) => "#" + esc(t)).join(" ")}</small>` : ""}</span>${sp(x).temp ? "<em>新しく登録されます</em>" : ""}</div>`).join("")}</div></div>
        <div class="pub-row"><span>タグ</span><div>${r.type === "route" ? `メイン #${esc(r.mainTag)}` : r.tags.map((t) => "#" + esc(t)).join(" ")}</div></div>
        <div class="pub-row"><span>見出し画像</span><div>${r.cover ? `<img class="pub-cover" src="${esc(img(r.cover))}" alt="">` : "<small>なし（本文に写真があれば、その1枚め）</small>"}</div></div>
        <div class="pub-row"><span>公開範囲</span><div class="vis">${VIS.filter(([k]) => k !== "private").map(([k, l]) => `<button data-pv="${k}" class="${vis === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
        ${fresh ? `<div class="pub-note">${IC.pin}<span>まだ記事のない場所は、公開すると登録されて、ほかの人も地図で探したり、予定に入れたりできるようになります。</span></div>` : ""}
      </div>
      <div class="picker-foot pub-foot"><button class="mini-btn" data-pk="close">やめる</button><span class="pk-gap"></span><button class="btn ghost small" data-pk="pv">${IC.eye}プレビュー</button><button class="btn accent small" data-pk="go">${IC.globe}${again ? "更新する" : "公開する"}</button></div>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    box.addEventListener("click", (e) => {
      const v = e.target.closest("[data-pv]");
      if (v) { vis = v.dataset.pv; $$("[data-pv]", box).forEach((x) => x.classList.toggle("on", x === v)); return; }
      const k = e.target.closest("[data-pk]");
      if (k && k.dataset.pk === "pv") { r.vis = vis; openPreview(r); return; }
      if (k && k.dataset.pk === "go") {
        r.vis = vis;
        publishRecord(r);
        closePicker();
        toast(again ? "記事を更新しました" : fresh ? `公開しました。${fresh}か所が新しく登録されました` : "公開しました。「読む」と地図に出ます");
        onDone(r);
      } else if ((k && k.dataset.pk === "close") || e.target === box) closePicker();
    });
  }
  /* 記事に入れる場所を選ぶ（たどっている予定・つくっている予定・登録した場所。名前で探せば、記事のない場所も）
     onPick(場所の一覧)。have：もう入っている場所（選べない）。opt：{ title, multi（まとめて選べる） } */
  function openSpotPicker(onPick, have = new Set(), opt = {}) {
    closePicker();
    const groups = [];
    if (state.plan) groups.push([`たどっている予定「${state.plan.title}」`, state.plan.stops.filter(live).map((s) => s.spot), true]);
    if (state.draft.stops.length) groups.push(["つくっている予定", state.draft.stops.map((s) => s.spot), true]);
    if (V.saved.length) groups.push(["登録した場所", V.saved.map((x) => x.spot), false]);
    const multi = opt.multi !== false, ttl = opt.title || "場所を選ぶ";
    const row = (id) => { const sp = spotById[id], dis = have.has(id); return `<button class="picker-row pk-plain" data-pk-spot="${id}" ${dis ? "disabled" : ""}><span class="pr-name">${esc(sp.name)}</span><span class="pr-time">${dis ? "もう入っています" : esc(sp.kind)}</span></button>`; };
    const box = document.createElement("div");
    box.className = "picker-back"; box.id = "picker";
    box.innerHTML = `<div class="picker" role="dialog" aria-label="${esc(ttl)}">
      <div class="picker-head">${IC.pin}<div><b>${esc(ttl)}</b><div class="small">予定や登録した場所から選ぶか、名前で探します</div></div></div>
      <button class="picker-row pk-search" data-pk-search>${IC.search}<span class="pr-name">名前で探す（記事のない場所も）</span>${ICON.chev}</button>
      <div class="picker-list">${groups.map(([label, ids, all]) => {
        const free = ids.filter((id) => !have.has(id) && spotById[id]);
        return `<div class="pk-label"><span>${esc(label)}</span>${multi && all && free.length > 1 ? `<button class="mini-btn" data-pk-all="${free.join(",")}">まとめて入れる（${free.length}か所）</button>` : ""}</div>` + ids.filter((id) => spotById[id]).map(row).join("");
      }).join("") || '<div class="small">予定や登録した場所がまだありません。上の「名前で探す」から入れられます。</div>'}</div>
      <div class="picker-foot"><span></span><button class="btn primary small" data-pk="close">閉じる</button></div>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    box.addEventListener("click", (e) => {
      const one = e.target.closest("[data-pk-spot]"), all = e.target.closest("[data-pk-all]");
      if (e.target.closest("[data-pk-search]")) { closePicker(); openPlaceSearch({ title: `見つけた場所を、記事の「${ttl}」に入れます`, onPick: (sp) => onPick([sp]) }); }
      else if (one && !one.disabled) { closePicker(); onPick([spotById[one.dataset.pkSpot]]); }
      else if (all) { closePicker(); onPick(all.dataset.pkAll.split(",").map((id) => spotById[id])); }
      else if (e.target.closest("[data-pk]") || e.target === box) closePicker();
    });
  }

  /* ---------- 自分の記録の窓：上は「わたしの記録」（自分だけ）、下は「公開する記事」 ----------
     窓の右下の小さな書くボタン（✎）を押すと、切り取り線の下に、公開用の記事を書く場所がのびる。
     場所・評価・写真は記録と同じものを使い、タイトル・公開範囲（公開／メンバー限定）・場所の情報・本文は公開用に別に書く */
  // 自分の記録の場所と、地図の場所（D.spots）をつなぐ。公開するときに、まだなければ新しく登録する
  // create が "temp" のときはプレビュー用（まだ登録しない。公開したときに登録される）
  function spotFor(s, create) {
    if (s.spot && spotById[s.spot]) return spotById[s.spot];
    const near = D.spots.find((sp) => sp.name === s.name && R.distM(sp, s) < 150);
    if (near) { s.spot = near.id; return near; }
    if (!create) return null;
    const sp = { id: "u" + Date.now().toString(36), name: s.name, lat: s.lat, lng: s.lng, kind: "場所", tags: [], indoor: true, hours: null, price: null };
    if (create === "temp") sp.temp = true; else sp.user = true;
    D.spots.push(sp); spotById[sp.id] = sp; s.spot = sp.id;
    return sp;
  }
  const EDIT_TOOLS = ["recph", "img", "gal", "h", "quote", "ul", "bold", "link", "hr"];
  // 見出し画像を選ぶ（わたしの記録・公開用）。新しく入れるか、記録の写真から選ぶ
  function coverPickHTML(key, src, photos) {
    return `<div class="cv-pick">
      ${src ? `<div class="cv-has"><img src="${esc(img(src))}" alt="見出し画像"><button type="button" class="cv-del" data-cv-del="${key}">${IC.x}外す</button></div>` : ""}
      <div class="cv-row">
        <label class="cv-add">${IC.image}<span>${src ? "変える" : "画像を入れる"}</span><input type="file" accept="image/*" hidden data-cv-in="${key}"></label>
        ${photos.length ? `<span class="cv-or">記録の写真から</span>${photos.map((u, j) => `<button type="button" class="cv-ph ${u === src ? "on" : ""}" data-cv-ph="${key}" data-j="${j}" aria-label="記録の写真${j + 1}を見出し画像にする"><img src="${esc(img(u))}" alt=""></button>`).join("")}` : ""}
      </div>
    </div>`;
  }
  function openRecWindow(r, s, part, onDone) {
    closePicker();
    const box = document.createElement("div");
    box.className = "picker-back rw-back"; box.id = "picker";
    const recPhotos = () => s.photos || [];
    box.innerHTML = `<div class="rw" role="dialog" aria-label="${esc(s.name)}の記録">
      <div class="rw-head"><div class="rw-ttl"><b>${esc(s.name)}</b><small>${esc(r.date)}・${RATING[s.rating] || ""}</small></div><button class="btn primary small" data-rw="done">${IC.check}完了</button></div>
      <div class="rw-scroll">
        <section class="rw-sec mine">
          <div class="rw-band mine">${IC.lock}<b>わたしの記録</b><small>自分だけが見られます（非公開）</small></div>
          <div class="mm-lb">見出し画像 <span>記録を開いたとき、いちばん上に出ます</span></div>
          <div data-cv-wrap="mine">${coverPickHTML("mine", s.cover, recPhotos())}</div>
          <label class="mm-lb" for="rw-title">記録のタイトル</label>
          <input class="field" id="rw-title" value="${esc(r.title)}">
          <div class="mm-lb">本文 <span>写真・見出し・リンクも、記事と同じように</span></div>
          <div class="rw-ed" id="rw-mine"></div>
        </section>
        <div id="rw-pubwrap"></div>
      </div>
      <button class="rw-pen" data-rw="pub" aria-label="公開する記事も書く">${IC.edit}<span>公開用も書く</span></button>
    </div>`;
    $("#app").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    const pen = $(".rw-pen", box), wrapPub = $("#rw-pubwrap", box);
    let pubEd = null;
    mountEditor($("#rw-mine", box), {
      html: mineHTML(s), tools: EDIT_TOOLS, label: "わたしの記録", recPhotos,
      ph: "ここは自分だけの記録です。思ったこと、次に行くときのメモ、写真などを自由に。",
      onChange: (h) => { s.mine = h; },
    });
    $("#rw-title", box).addEventListener("input", (e) => { r.title = e.target.value; });
    // 見出し画像
    const coverOf = (key) => (key === "mine" ? s.cover : s.pub && s.pub.cover) || null;
    const setCover = (key, src) => {
      if (key === "mine") s.cover = src; else if (s.pub) s.pub.cover = src;
      const w = $(`[data-cv-wrap="${key}"]`, box); if (w) w.innerHTML = coverPickHTML(key, src, recPhotos());
    };
    box.addEventListener("change", async (e) => {
      const inp = e.target.closest("[data-cv-in]"); if (!inp) return;
      const f = inp.files && inp.files[0], key = inp.dataset.cvIn; inp.value = "";
      if (!f) return;
      try { setCover(key, await shrinkPhoto(f, 1600)); toast("見出し画像を入れました（位置情報は消してあります）"); } catch (err) { toast(err.message); }
    });
    // 公開する記事の形（プレビューにも使う）
    const pubRecord = (create) => {
      const pub = s.pub, sp = spotFor(s, create);
      return makeRecord({ id: pub.recId, title: pub.title.trim() || "（タイトルなし）", mode: "one", tags: pub.tags, cover: pub.cover, vis: pub.vis, secs: [{ spot: sp.id, rating: s.rating, info: pub.info, blocks: pubEd.blocks() }] });
    };
    function showPub(scroll) {
      if (!s.pub) s.pub = { title: "", vis: "public", tags: [], info: null, html: "", recId: null, cover: null };
      const pub = s.pub;
      if (!pub.info) pub.info = infoFrom(spotFor(s, false) || { name: s.name });
      pen.hidden = true;
      // 並び：見出し画像 → タイトル → 場所 → タグ → 本文 → 場所の情報 → 公開範囲 → 公開する
      wrapPub.innerHTML = `<div class="rw-cut"><span>${IC.globe}ここから下は、公開する記事</span></div>
        <section class="rw-sec pub">
          <div class="rw-band pub">${IC.globe}<b>公開する記事</b><small data-rw-st>${pub.recId ? `公開中（${visLabel(pub.vis)}）` : "まだ公開していません"}</small></div>
          <div class="mm-lb">見出し画像 <span>記事のカードと、記事のいちばん上に出ます</span></div>
          <div data-cv-wrap="pub">${coverPickHTML("pub", pub.cover, recPhotos())}</div>
          <label class="mm-lb" for="rw-ptitle">記事のタイトル <span>記録のタイトルとは別</span></label>
          <input class="field" id="rw-ptitle" value="${esc(pub.title)}" placeholder="例：${esc(s.name)}で過ごす午後">
          <div class="rw-same">${IC.pin}<b>${esc(s.name)}</b>${ratingTag(s.rating)}<small>場所・評価は記録と同じ</small></div>
          <div class="mm-lb">タグ</div>
          <div class="wr-tags rw-tags">${D.TAGS.map((t) => `<button class="${pub.tags.includes(t) ? "on" : ""}" data-ptag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>
          <div class="mm-lb rw-lb2">本文 <button class="mini-btn" data-rw="copy">${IC.list}わたしの記録を写す</button></div>
          <div class="rw-ed" id="rw-pub"></div>
          <details class="rw-info">
            <summary>${IC.info}<span class="rw-info-h"><b>場所の情報</b><small>営業時間・定休日・屋内／屋外・いた時間・費用・住所。本文には入らず、記事の「詳しく」に出ます</small></span><span class="rw-info-v" data-pi-sum>${infoSummary(pub.info)}</span></summary>
            <div class="pi" data-pi>${infoFormInner(pub.info)}</div>
          </details>
          <div class="mm-lb">公開範囲</div>
          <div class="vis">${VIS.filter(([k]) => k !== "private").map(([k, l]) => `<button data-pvis="${k}" class="${pub.vis === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <div class="rw-acts"><button class="mini-btn danger" data-rw="drop">${pub.recId ? "公開をやめる" : "公開用を消す"}</button><span class="rw-gap"></span><button class="btn ghost" data-rw="preview">${IC.eye}プレビュー</button><button class="btn accent" data-rw="publish">${IC.globe}${pub.recId ? "更新する" : "公開する"}</button></div>
        </section>`;
      bindInfoForm($("[data-pi]", wrapPub), pub.info, (info) => { const v = $("[data-pi-sum]", wrapPub); if (v) v.innerHTML = infoSummary(info); });
      pubEd = mountEditor($("#rw-pub", wrapPub), {
        html: pub.html, tools: EDIT_TOOLS, label: "公開する記事の本文", recPhotos,
        ph: "みんなに向けた本文。おすすめの時間・行き方・気をつけることなど。「記録の写真」で、記録と同じ写真を入れられます。",
        onChange: (h) => { pub.html = h; },
      });
      $("#rw-ptitle", wrapPub).addEventListener("input", (e) => { pub.title = e.target.value; });
      if (scroll) setTimeout(() => wrapPub.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
    function close() {
      s.note = plainOf(blocksOf(s.mine)).slice(0, 80);
      const p = s.pub; // 公開用を開いただけで何も書いていなければ、下書きを残さない
      if (p && !p.recId && !p.title.trim() && !p.cover && !htmlText(p.html || "").trim() && !/<img|wr-spot|<hr/.test(p.html || "")) s.pub = null;
      closePicker(); if (onDone) onDone();
    }
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || !box.contains(b)) return;
      const d = b.dataset, pub = s.pub;
      if (d.rw === "done") { close(); return; }
      if (d.rw === "pub") { showPub(true); return; }
      if (d.cvDel) { setCover(d.cvDel, null); return; }
      if (d.cvPh) { const u = recPhotos()[Number(d.j)]; setCover(d.cvPh, coverOf(d.cvPh) === u ? null : u); return; }
      if (!pub) return;
      if (d.pvis) { pub.vis = d.pvis; $$("[data-pvis]", box).forEach((x) => x.classList.toggle("on", x === b)); return; }
      if (d.ptag) { const i = pub.tags.indexOf(d.ptag); if (i >= 0) pub.tags.splice(i, 1); else pub.tags.push(d.ptag); b.classList.toggle("on", i < 0); return; }
      if (d.rw === "copy" && pubEd) {
        if (!pubEd.isEmpty() && !confirm("公開用の本文を、わたしの記録で置き換えますか？")) return;
        pubEd.setHTML(mineHTML(s)); toast("わたしの記録を写しました。見せたくないところは消してください"); return;
      }
      if (d.rw === "drop") {
        // 公開中なら、公開だけやめて下書きに戻す（書いた記事は残す）。下書きなら、公開用を消す
        if (pub.recId) {
          if (!confirm("公開をやめますか？（書いた記事は下書きとして残ります。わたしの記録もそのまま）")) return;
          unpublish(pub.recId); pub.recId = null; showPub(false);
          toast("公開をやめました。記事は下書きとして残っています"); return;
        }
        if (!confirm("公開用の記事を消しますか？（わたしの記録は残ります）")) return;
        s.pub = null; pubEd = null; wrapPub.innerHTML = ""; pen.hidden = false;
        toast("公開用の記事を消しました"); return;
      }
      if (d.rw === "preview" && pubEd) { const rec = pubRecord("temp"); if (rec) openPreview(rec); return; }
      if (d.rw === "publish" && pubEd) {
        if (!pub.title.trim()) { $("#rw-ptitle", box).focus(); toast("記事のタイトルを入れてください"); return; }
        const sp = spotFor(s, true), again = !!pub.recId, fresh = !recsAt(sp.id).some((x) => x.id !== pub.recId);
        const rec = publishRecord(pubRecord(true));
        if (!rec) return;
        pub.recId = rec.id;
        $("[data-rw-st]", box).textContent = `公開中（${visLabel(pub.vis)}）`;
        b.innerHTML = `${IC.globe}更新する`;
        $('[data-rw="drop"]', box).textContent = "公開をやめる";
        toast(again ? "記事を更新しました" : fresh ? "公開しました。この場所は登録され、ほかの人も地図で使えます" : "公開しました。「読む」と地図に出ます");
      }
    });
    if (s.pub || part === "pub") showPub(part === "pub");
  }

  /* ---------- 場所を名前で探す（探す・つくる・組み直す・書く画面の「場所」で使う） ----------
     1) 記事のある場所（このアプリに登録済み）：打つとすぐ出る・無料
     2) 地図の場所（OpenStreetMap の Nominatim）：「探す」を押したときだけ・無料。1秒に1回まで、という決まりを守る
     3) Google（Places API (New)）：「Google で探す」を押したときだけ。回数で料金がかかるので、ほかで見つからないときに使う
     見つけた場所は、この端末のメモリにだけ置く（localStorage・サービスワーカーには入れない）。
     公開する記事を書くと、その場所は登録されて、ほかの人も地図で使えるようになる */
  const kana = (s) => String(s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, "");
  const OSM_KIND = [
    [/^shop:convenience$/, "コンビニ", true], [/^tourism:(hotel|hostel|guest_house|motel|apartment)$/, "ホテル", true],
    [/^(railway|public_transport):(station|halt|stop_position|platform)$/, "駅", true], [/^amenity:cafe$/, "カフェ", true],
    [/^amenity:(restaurant|fast_food|food_court|pub|bar|izakaya)$/, "グルメ", true], [/^amenity:library$/, "図書館", true],
    [/^tourism:museum$/, "博物館", true], [/^(tourism:gallery|amenity:arts_centre)$/, "美術館", true],
    [/^leisure:(park|garden)$/, "公園", false], [/^natural:(peak|volcano)$/, "山", false], [/^natural:(beach|bay)$/, "海", false],
    [/^(amenity:place_of_worship|historic:.*|tourism:(attraction|viewpoint|artwork))$/, "名所", false], [/^shop:/, "店", true],
  ];
  const kindOf = (table, key) => { const hit = table.find(([re]) => re.test(key)); return hit ? { kind: hit[1], indoor: hit[2] } : { kind: "場所", indoor: true }; };
  const G_KIND = [
    [/convenience_store/, "コンビニ", true], [/lodging|hotel/, "ホテル", true], [/(train|subway|transit|light_rail)_station|bus_station/, "駅", true],
    [/ramen/, "ラーメン", true], [/cafe|coffee/, "カフェ", true], [/restaurant|food|bakery|bar/, "グルメ", true], [/library/, "図書館", true],
    [/museum/, "博物館", true], [/art_gallery/, "美術館", true], [/park|garden/, "公園", false],
    [/tourist_attraction|shrine|temple|church|place_of_worship|historical/, "名所", false], [/store|shop/, "店", true],
  ];
  // 住所（OpenStreetMap の住所の部品を、日本の順に並べる）
  function jpAddr(a, full) {
    // 道路の名前（〇〇通り・国道〇号）は日本の住所には入れない
    const parts = a ? [...new Set([a.province || a.state, a.city || a.town || a.village || a.county, a.city_district || a.suburb, a.quarter || a.neighbourhood].filter(Boolean))] : [];
    if (parts.length >= 2) return parts.join("") + (a.house_number && parts.length >= 3 ? a.house_number : ""); // 番地は町名まであるときだけ
    return String(full || "").split(",").slice(1).reverse().map((x) => x.trim()).filter((x) => x && x !== "日本" && !/^\d{3}-?\d{4}$/.test(x)).join("");
  }
  let osmAt = 0;
  async function osmFetch(params, retry = 1) {
    const wait = osmAt + 1100 - Date.now(); // Nominatim の決まり：1秒に1回まで
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    osmAt = Date.now();
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 9000); // 返事が来ないときは待ちすぎない
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ format: "jsonv2", addressdetails: "1", namedetails: "1", "accept-language": "ja", countrycodes: "jp", limit: "10", ...params }), { signal: ac.signal });
      if (!res.ok) throw new Error("osm " + res.status);
      return await res.json();
    } catch (e) {
      if (retry > 0) { await new Promise((r) => setTimeout(r, 1200)); return osmFetch(params, retry - 1); } // たまに失敗するので、1回だけ自動でやり直す
      throw e;
    } finally { clearTimeout(tm); }
  }
  // 名前に支店名をつける（「ファミリーマート」→「ファミリーマート 大宮上小町店」）
  function osmName(x) {
    const nd = x.namedetails || {}, base = x.name || nd.name || String(x.display_name || "").split(",")[0];
    const br = nd["branch:ja"] || nd.branch || "";
    return br && !base.includes(br) ? `${base} ${br}` : base;
  }
  async function osmSearch(q, c) {
    const d = 0.12; // まず地図のまわり（10km ほど）で。なければ日本全体で
    let list = await osmFetch({ q, viewbox: [c[1] - d, c[0] + d, c[1] + d, c[0] - d].map((v) => v.toFixed(4)).join(","), bounded: "1" });
    if (!list.length) list = await osmFetch({ q });
    const at = { lat: c[0], lng: c[1] };
    return list.map((x) => ({
      src: "osm", name: osmName(x), lat: Number(x.lat), lng: Number(x.lon),
      addr: jpAddr(x.address, x.display_name), ...kindOf(OSM_KIND, `${x.category}:${x.type}`),
    })).filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({ ...p, name: p.kind === "駅" && !/駅$/.test(p.name) ? p.name + "駅" : p.name, dist: R.distM(p, at) })) // 「大宮」→「大宮駅」
      .sort((a, b) => a.dist - b.dist); // 地図の真ん中から近い順

  }
  let gLib = null;
  async function googleSearch(q, c) {
    gLib = gLib || await GM.places();
    const token = new gLib.AutocompleteSessionToken(); // 候補を出して、選んだ場所を取りに行くまでを1回として数える（そのほうが安い）
    const { suggestions } = await gLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: q, sessionToken: token, language: "ja", region: "jp", includedRegionCodes: ["jp"],
      locationBias: { center: { lat: c[0], lng: c[1] }, radius: 30000 },
    });
    return (suggestions || []).filter((x) => x.placePrediction).slice(0, 6).map((x) => {
      const pp = x.placePrediction;
      return { src: "google", name: pp.mainText ? pp.mainText.text : pp.text.text, sub: pp.secondaryText ? pp.secondaryText.text : "", pp, ...kindOf(G_KIND, (pp.types || []).join(" ")) };
    });
  }
  // 選んだときだけ、位置と住所を取りに行く（名前は候補の文字を使う。取る項目をしぼって安くする）
  async function googleResolve(p) {
    const place = p.pp.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress"] });
    return { ...p, lat: place.location.lat(), lng: place.location.lng(), addr: String(place.formattedAddress || "").replace(/^日本、\s*/, "").replace(/^〒\d{3}-\d{4}\s*/, "") };
  }
  // 見つけた場所を、この端末の中の場所の一覧に足す（同じ名前で近くにあれば、それを使う）
  function foundSpot(p) {
    const same = D.spots.find((sp) => kana(sp.name) === kana(p.name) && R.distM(sp, p) < 120);
    if (same) return same;
    const sp = { id: "f" + Date.now().toString(36), name: p.name, lat: p.lat, lng: p.lng, kind: p.kind || "場所", tags: [], indoor: p.indoor !== false, hours: null, price: null, addr: p.addr || "", temp: true, src: p.src, gid: p.src === "google" && p.pp ? p.pp.placeId : null };
    // gid：Google の place_id。方針（SPEC.md）で、Google の場所の情報は保存せず、残してよいのは place_id だけ。
    // 試作ではこの端末のメモリの中だけに置く。本番で記事に入れて登録するときは、place_id と書き手が入れた場所の情報だけを残す
    D.spots.push(sp); spotById[sp.id] = sp;
    return sp;
  }
  function localMatches(q, c) {
    const k = kana(q);
    if (!k) return [];
    const at = { lat: c[0], lng: c[1] };
    return D.spots.filter((sp) => !sp.temp && [sp.name, sp.kind, sp.style, sp.addr, ...(sp.tags || [])].some((x) => x && kana(x).includes(k)))
      .sort((a, b) => R.distM(a, at) - R.distM(b, at)).slice(0, 8);
  }
  /* 探す画面。o：{ title（何に使うか）, onPick(場所), onMap }
     onMap（探すの上の検索）：探すの地図の上に重ねて出す。上のタグ・お気に入りなどの絞り込みは隠し、その所に検索と案内（結果）を出す。
     下のシートはいちばん小さくし、下のタブ（読む・探す・予定…）はそのまま。地図の何もない所を押すと閉じる */
  let psClose = null; // いま開いている探す画面を閉じる（下のタブで画面を移ったときにも閉じる）
  function openPlaceSearch(o) {
    if (psClose) psClose(true);
    const old = $("#ps"); if (old) old.remove();
    const c = map ? map.getCenter() : OMIYA;
    const onMap = !!o.onMap && !!$("#view-map");
    const box = document.createElement("div");
    box.className = "ps-back" + (onMap ? " on-map" : ""); box.id = "ps";
    box.innerHTML = `<div class="ps" role="dialog" aria-label="場所を名前で探す">
      <form class="ps-bar" autocomplete="off">
        <button type="button" class="ps-x" data-ps="close" aria-label="閉じる">${IC.back}</button>
        <input type="search" id="ps-in" placeholder="場所の名前（例：大宮駅、ローソン 大宮）" enterkeyhint="search" aria-label="場所の名前">
        <button class="ps-go" type="submit">探す</button>
      </form>
      ${o.title ? `<div class="ps-for">${esc(o.title)}</div>` : ""}
      <div class="ps-body" id="ps-body"></div>
    </div>`;
    (onMap ? $("#view-map") : $("#app")).appendChild(box);
    const inp = $("#ps-in", box), out = $("#ps-body", box);
    const st = { q: "", osm: null, osmBusy: false, osmErr: "", g: null, gBusy: false, gErr: "" };
    let local = [];
    // 地図の上に出すとき：上の絞り込みを隠し、シートをいちばん小さく。閉じたら元の高さに戻す（場所を選んだときは、見つけた場所のカードを出すので戻さない）
    const sheetBefore = onMap ? ["peek", "half", "full"].find((k) => $("#sheet").classList.contains(k)) : null;
    if (onMap) { $("#view-map").classList.add("searching"); setSheet("peek", false); }
    const close = (keepSheet) => {
      box.remove();
      if (psClose === close) psClose = null;
      if (!onMap) return;
      $("#view-map").classList.remove("searching");
      if (!keepSheet && sheetBefore && sheetBefore !== "peek") setSheet(sheetBefore, false);
    };
    psClose = close;
    const distText = (m) => (m == null ? "" : m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`);
    const row = (key, src, name, sub, tag) => `<button class="ps-row" data-pick="${key}"><span class="ps-ic ${src}">${src === "app" ? IC.pin : IC.search}</span><span class="ps-tx"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${tag ? `<span class="ps-tag">${esc(tag)}</span>` : ""}</button>`;
    function draw() {
      const q = st.q.trim();
      local = localMatches(q, c);
      out.classList.toggle("has-res", !!q); // 地図の上に出すとき、結果は白い板の上に
      if (!q) {
        out.innerHTML = `<div class="ps-hint">${IC.pin}<div><b>記事のある場所</b>は、打つとすぐ出ます。<br><b>記事のない場所</b>（初めて行く所・コンビニ・ホテルなど）は「探す」で地図から探します。<br>それでも見つからないときは、Google でも探せます。</div></div>`;
        return;
      }
      let h = `<div class="ps-lb">記事のある場所 <span>${local.length}件</span></div>`;
      h += local.length ? local.map((sp, i) => row(`app:${i}`, "app", sp.name, `${sp.kind}${sp.addr ? "・" + sp.addr : ""}`, `記事${recsAt(sp.id).length}`)).join("") : '<div class="ps-none">ありません</div>';
      h += '<div class="ps-lb">地図の場所 <span>OpenStreetMap</span></div>';
      if (st.osmBusy) h += '<div class="ps-none">探しています…</div>';
      else if (st.osmErr) h += `<div class="ps-none">${esc(st.osmErr)}</div>`;
      else if (st.osm) h += st.osm.length ? st.osm.map((p, i) => row(`osm:${i}`, "osm", p.name, `${p.kind}${p.addr ? "・" + p.addr : ""}`, distText(p.dist))).join("") + '<div class="ps-attr">© OpenStreetMap contributors</div>' : '<div class="ps-none">見つかりませんでした。名前を短くするか、Google で探してください</div>';
      else h += `<button class="ps-more" data-ps="osm">${IC.search}<span>「${esc(q)}」を地図で探す<small>OpenStreetMap で探します</small></span></button>`;
      h += '<div class="ps-lb">Google <span>見つからないときだけ</span></div>';
      if (st.gBusy) h += '<div class="ps-none">探しています…</div>';
      else if (st.gErr) h += `<div class="ps-none">${esc(st.gErr)}</div>`;
      else if (st.g) h += st.g.length ? st.g.map((p, i) => row(`g:${i}`, "g", p.name, `${p.kind}${p.sub ? "・" + p.sub : ""}`, "")).join("") + '<div class="ps-attr">powered by Google</div>' : '<div class="ps-none">見つかりませんでした</div>';
      else h += `<button class="ps-more g" data-ps="google">${IC.search}<span>Google で探す<small>押したときだけ Google の検索を使います</small></span></button>`;
      out.innerHTML = h;
    }
    async function runOsm() {
      const q = st.q.trim();
      if (!q || st.osmBusy) return;
      if (navigator.onLine === false) { st.osmErr = "オフラインのため、地図の場所は探せません"; draw(); return; }
      st.osmBusy = true; st.osmErr = ""; draw();
      try { const res = await osmSearch(q, c); if (st.q.trim() === q) st.osm = res; }
      catch (e) { st.osmErr = "地図の場所を探せませんでした。少し待ってから、もう一度押してください"; }
      st.osmBusy = false;
      if (box.isConnected) draw();
    }
    async function runGoogle() {
      const q = st.q.trim();
      if (!q || st.gBusy) return;
      st.gBusy = true; st.gErr = ""; draw();
      try { const res = await googleSearch(q, c); if (st.q.trim() === q) st.g = res; }
      catch (e) { st.gErr = "Google の場所検索を使えませんでした（この試作の APIキーでは、Places API (New) がまだ使えないようです）"; }
      st.gBusy = false;
      if (box.isConnected) draw();
    }
    async function pick(key) {
      const [src, n] = key.split(":"), i = Number(n);
      let sp = null;
      if (src === "app") sp = local[i];
      else if (src === "osm") sp = st.osm && st.osm[i] ? foundSpot(st.osm[i]) : null;
      else if (src === "g" && st.g && st.g[i]) {
        try { sp = foundSpot(await googleResolve(st.g[i])); } catch (e) { toast("Google から場所を取れませんでした"); return; }
      }
      if (!sp) return;
      close(true); o.onPick(sp);
    }
    $("form", box).addEventListener("submit", (e) => { e.preventDefault(); inp.blur(); runOsm(); });
    inp.addEventListener("input", () => { st.q = inp.value; st.osm = null; st.g = null; st.osmErr = ""; st.gErr = ""; draw(); });
    box.addEventListener("click", (e) => {
      if (onMap && (e.target === box || e.target.classList.contains("ps"))) { close(); return; } // 地図の何もない所を押したら閉じる
      const b = e.target.closest("[data-ps],[data-pick]"); if (!b) return;
      if (b.dataset.pick) pick(b.dataset.pick);
      else if (b.dataset.ps === "close") close();
      else if (b.dataset.ps === "osm") runOsm();
      else if (b.dataset.ps === "google") runGoogle();
    });
    draw();
    requestAnimationFrame(() => { box.classList.add("show"); inp.focus(); });
  }
  // 見つけた場所を地図に出す（探す・つくる・組み直す）。下のシートの上にカードを出し、地図をそこへ動かす
  function showFound(sp) {
    state.found = sp.id; state.place = null;
    if (stage() === "follow") return;
    setSheet("half"); renderSheet(); drawMap(false);
    if (!map) return;
    const size = map.getSize(), y0 = topInset(), y1 = size.y - sheetOver();
    map.centerOn([sp.lat, sp.lng], Math.max(map.getZoom(), 16), (y0 + y1) / 2 - size.y / 2);
  }
  function drawFound(st) {
    const sp = state.found && spotById[state.found];
    if (!sp || st === "follow") return;
    if ((st === "make" || st === "redo") && ed().stops.some((x) => x.spot === sp.id)) return; // 予定に入れたら番号のピンで出す
    const b = bestRecordFor(sp.id);
    addPin([sp.lat, sp.lng], { ...divPin("found", IC.flag), title: sp.name }, { half: 16, prio: 60, sp, r: b && b.r, s: b && b.s }, () => {
      if (state.place) { state.place = null; renderSheet(); drawMap(false); } // 見つけた場所のカードに戻す
      setSheet("half"); $("#sheet-body").scrollTop = 0;
    }, 2500);
  }
  function foundCard() {
    const sp = state.found && spotById[state.found];
    const st = stage();
    if (!sp || st === "follow") return "";
    const recs = recsAt(sp.id), d = ed(), inPlan = (st === "make" || st === "redo") && d.stops.some((x) => x.spot === sp.id);
    const src = sp.src === "google" ? "Google で見つけた場所" : sp.src === "osm" ? "OpenStreetMap で見つけた場所" : "登録済みの場所";
    let acts;
    if (inPlan) acts = `<span class="found-in">${IC.check}予定に入っています</span>`;
    else if (st === "make") acts = `${d.stops.length ? `<button class="btn ghost small" data-act="found-first">${IC.flag}最初（出発）にする</button>` : ""}<button class="btn primary small" data-act="found-add">${IC.cal}${d.stops.length ? `${d.stops.length + 1}番に足す` : "1番（出発）にする"}</button>`;
    else if (st === "redo") acts = `<button class="btn primary small" data-act="found-add">${IC.cal}次に行く場所にする</button>`;
    else acts = `<button class="btn primary small" data-act="found-make">${IC.cal}予定に入れる</button><button class="btn ghost small" data-act="found-write">${IC.edit}記事を書く</button><button class="btn ghost small" data-act="found-save">${V.saved.some((x) => x.spot === sp.id) ? "登録済み" : "＋ 登録"}</button>`;
    return `<div class="found">
      <div class="found-top"><span class="found-ic">${IC.flag}</span><span class="found-tx"><b>${esc(sp.name)}</b><small>${esc(sp.kind)}${sp.addr ? "・" + esc(sp.addr) : ""}</small></span><button class="found-x" data-act="found-close" aria-label="閉じる">${IC.x}</button></div>
      <div class="found-st">${recs.length ? `<button class="link-btn" data-rec="${recs[0].id}">記事${recs.length}件・「${esc(recs[0].title)}」を読む</button>` : "<span>まだ記事がありません。公開する記事を書くと登録されて、ほかの人も使えるようになります</span>"}<em>${src}</em></div>
      <div class="found-acts">${acts}</div>
    </div>`;
  }
  function onFound(act) {
    const sp = state.found && spotById[state.found];
    if (!sp) return;
    if (act === "found-close") { state.found = null; renderSheet(); drawMap(false); return; }
    if (act === "found-save") { toggleSaved(sp.id); renderSheet(); return; }
    if (act === "found-write") { openWriteAt(sp); return; }
    if (act === "found-make") {
      const d = state.draft;
      if (!d.stops.some((x) => x.spot === sp.id)) { d.stops.push({ spot: sp.id, stay: defaultStay(sp) }); d.dirty = true; }
      state.found = null; state.fitNext = true;
      openPlan("make");
      toast(`${d.stops.length}　${sp.name}を予定に入れました`);
      return;
    }
    const d = ed();
    if (d.stops.some((x) => x.spot === sp.id)) { toast("もう予定に入っています"); return; }
    state.found = null;
    if (act === "found-first") {
      d.stops.unshift({ spot: sp.id, stay: defaultStay(sp) }); d.dirty = true;
      toast(`1　${sp.name}を最初（出発の場所）にしました`);
      drawMap(false); renderSheet(); return;
    }
    toggleDraftSpot(sp.id);
  }

  /* ---------- 画面の切り替え ---------- */
  const planTab = () => $("#tab-plan");
  function closePlanMenu() { planTab().classList.remove("open"); }
  function switchView(v) {
    if (psClose) psClose(true);
    state.view = v; closePanels(); closePlanMenu();
    if (v !== "map") state.place = null; // 探すを離れたら、場所の絞り込みはやめる
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
    const refilter = () => { renderChips(); drawMap(stage() === "explore" && !state.place); if (stage() === "explore") scheduleArea(); else renderSheet(); };
    $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-tag]"); if (!b) return; state.tag = b.dataset.tag || null; refilter(); });
    $("#modes").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; state.mode = b.dataset.mode; refilter(); });
    $("#like-filter").addEventListener("click", () => { state.likedOnly = !state.likedOnly; refilter(); });
    $("#stage-bar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-stage]"); if (b) openPlan(b.dataset.stage);
      if (e.target.closest('[data-act="search"]')) openPlaceSearch({ title: "見つけた場所は、予定に入れられます", onPick: showFound });
    });
    // 探す：上の検索の帯で、場所を名前で探す（記事のない場所も）
    const ts = $("#top-search");
    ts.addEventListener("click", () => openPlaceSearch({ onPick: showFound, onMap: true }));
    ts.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlaceSearch({ onPick: showFound, onMap: true }); } });

    // 下のシート（探す・つくる・たどる）
    const sb = $("#sheet-body");
    const onSheetClick = (e) => {
      if (justSorted()) return; // 並べ替えた直後のクリックは無視
      const t = e.target.closest("[data-mk],[data-fl],[data-act],[data-rec]");
      if (!t || t.disabled) return;
      const act = t.dataset.act || ""; // 記事のカード（data-rec）には act がない
      if (t.dataset.mk) onMake(t);
      else if (t.dataset.fl) onFollow(t);
      else if (act === "fit-all") drawMap(true);
      else if (act === "place-clear") clearPlace();
      else if (act.startsWith("found")) onFound(act);
      else if (act) onFollowAct(act);
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
      else if (t.dataset.rscope) {
        // 上に固定されているときに切り替えたら、切り替えの帯が上にある所から見せる（X のおすすめ／フォロー中と同じ）
        const tabsTop = () => { const c = $(".read-chips", rv); return c.offsetTop + c.offsetHeight; };
        const stuck = rv.scrollTop > tabsTop();
        state.readScope = t.dataset.rscope; renderRead();
        if (stuck) rv.scrollTop = tabsTop();
      }
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
