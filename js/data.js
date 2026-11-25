/* Take A Map デモ用の仮データ。
   営業時間・評価・ひとことはすべて仮。実在の施設は公式サイトで確認した値に差し替えること。
   ラーメン屋とカフェは架空の店。 */
(function () {
  const TAGS = ["図書館建築", "旅行", "ラーメン", "カフェ", "古着", "聖地巡礼", "自然", "美術館"];

  const writers = [
    {
      id: "kusataro", name: "くさたろ", initial: "くさ", color: "#123D2B",
      bio: "全国の図書館を、建築目当てで巡っています。光の入り方と、本棚の並べ方が好き。",
      mainTag: "図書館建築",
      membership: { name: "図書館建築ノート", price: 300 },
      stats: { records: { "図書館建築": 32, "旅行": 6 }, favorites: 1240, retention: 92, wentFromArticles: 380 },
    },
    {
      id: "yu", name: "ゆう", color: "#56859C",
      bio: "週末は1日かけて街を歩きます。建物と、昼ごはんで選ぶ旅。",
      mainTag: "旅行",
      stats: { records: { "旅行": 41, "ラーメン": 9, "カフェ": 7 }, favorites: 860, retention: 88, wentFromArticles: 214 },
    },
    {
      id: "minami", name: "みなみ", color: "#B94A28",
      bio: "埼玉のラーメンを系統ごとに食べ歩き。煮干しが好き。",
      mainTag: "ラーメン",
      stats: { records: { "ラーメン": 57, "カフェ": 4 }, favorites: 2010, retention: 90, wentFromArticles: 655 },
    },
    {
      id: "official", name: "ちいき観光ナビ（架空）", color: "#E86B45", official: true,
      bio: "地域の特集とスタンプラリーをお届けする、自治体の公式アカウント（デモ用の架空のアカウントです）。",
      mainTag: "旅行",
      stats: { records: { "旅行": 12 }, favorites: 530, retention: 81, wentFromArticles: 1020 },
    },
    {
      id: "haru", name: "はる", color: "#626E66",
      bio: "古着屋と喫茶店をはしごする休日。",
      mainTag: "古着",
      stats: { records: { "古着": 23, "カフェ": 18 }, favorites: 410, retention: 85, wentFromArticles: 96 },
    },
    {
      id: "sora", name: "そら", color: "#56859C",
      bio: "映画とアニメの舞台を、同じ時間帯に歩くのが好き。",
      mainTag: "聖地巡礼",
      stats: { records: { "聖地巡礼": 29 }, favorites: 720, retention: 87, wentFromArticles: 240 },
    },
    {
      id: "aoi", name: "あおい", color: "#2C5F2D",
      bio: "低い山と、湧き水のある公園。",
      mainTag: "自然",
      stats: { records: { "自然": 19, "美術館": 5 }, favorites: 300, retention: 83, wentFromArticles: 70 },
    },
  ];

  // indoor: 屋内か。hours: 仮の営業時間（null = 時間の制約なしとして扱う）
  // groupLikes: 同じ趣味の記録が多い人たちのうち「また行きたい」の人数（仮）
  const spots = [
    // 大宮（デモの舞台）
    { id: "omiya-lib", name: "さいたま市大宮図書館", lat: 35.9050, lng: 139.6293, tags: ["図書館建築", "旅行"], kind: "建築", indoor: true, hours: { open: "09:00", close: "20:00" }, price: 0, groupLikes: { "図書館建築": 9 } },
    { id: "hikawa", name: "武蔵一宮 氷川神社", lat: 35.9165, lng: 139.6300, tags: ["旅行", "歴史"], kind: "名所", indoor: false, hours: { open: "06:00", close: "17:30" }, price: 0, groupLikes: { "旅行": 21 } },
    { id: "omiya-park", name: "大宮公園", lat: 35.9212, lng: 139.6345, tags: ["自然", "旅行"], kind: "公園", indoor: false, hours: null, price: 0, groupLikes: { "自然": 11 } },
    { id: "railway", name: "鉄道博物館", lat: 35.9213, lng: 139.6176, tags: ["旅行", "美術館"], kind: "博物館", indoor: true, hours: { open: "10:00", close: "17:00" }, price: 1600, groupLikes: { "旅行": 18 } },
    { id: "bonsai", name: "大宮盆栽美術館", lat: 35.9302, lng: 139.6392, tags: ["美術館", "旅行"], kind: "美術館", indoor: true, hours: { open: "09:00", close: "16:30" }, price: 310, groupLikes: { "美術館": 7 } },
    // ラーメン（架空）
    { id: "r-akari", name: "煮干しそば 灯", lat: 35.9071, lng: 139.6262, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:00", close: "21:00" }, price: 1000, groupLikes: { "ラーメン": 14 } },
    { id: "r-nagi", name: "中華そば 凪草", lat: 35.9098, lng: 139.6276, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:00", close: "15:00" }, price: 950, groupLikes: { "ラーメン": 12 } },
    { id: "r-shirogane", name: "麺処 しろがね", lat: 35.9150, lng: 139.6180, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:30", close: "20:00" }, price: 1050, groupLikes: { "ラーメン": 9 } },
    { id: "r-ikkaku", name: "家系ラーメン 一角家", lat: 35.9060, lng: 139.6228, tags: ["ラーメン"], kind: "ラーメン", style: "家系", indoor: true, hours: { open: "11:00", close: "24:00" }, price: 900, groupLikes: { "ラーメン": 17 } },
    { id: "r-kotori", name: "鶏白湯 ことり", lat: 35.9043, lng: 139.6252, tags: ["ラーメン"], kind: "ラーメン", style: "鶏白湯", indoor: true, hours: { open: "11:00", close: "22:00" }, price: 980, groupLikes: { "ラーメン": 8 } },
    // カフェ（架空）
    { id: "c-hidamari", name: "ブックカフェ ひだまり", lat: 35.9102, lng: 139.6290, tags: ["カフェ", "図書館建築"], kind: "カフェ", indoor: true, hours: { open: "10:00", close: "19:00" }, price: 700, groupLikes: { "カフェ": 10 } },
    { id: "c-madobe", name: "喫茶 まどべ", lat: 35.9082, lng: 139.6243, tags: ["カフェ"], kind: "カフェ", indoor: true, hours: { open: "08:00", close: "18:00" }, price: 600, groupLikes: { "カフェ": 6 } },
    // 全国の図書館（くさたろの記録。営業時間は使わない）
    { id: "lib-gifu", name: "みんなの森 ぎふメディアコスモス", lat: 35.4229, lng: 136.7604, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 24 } },
    { id: "lib-ishikawa", name: "石川県立図書館", lat: 36.5398, lng: 136.6720, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 27 } },
    { id: "lib-umimirai", name: "金沢海みらい図書館", lat: 36.6077, lng: 136.6253, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 19 } },
    { id: "lib-ota", name: "太田市美術館・図書館", lat: 36.2937, lng: 139.3770, tags: ["図書館建築", "美術館"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 15 } },
    { id: "lib-tsuchiura", name: "土浦市立図書館", lat: 36.0786, lng: 140.2046, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 8 } },
    { id: "lib-takeo", name: "武雄市図書館", lat: 33.1930, lng: 130.0160, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 13 } },
    { id: "lib-hibiya", name: "日比谷図書文化館", lat: 35.6720, lng: 139.7550, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 6 } },
    // ほかのタグ（AIで作った仮の記録用）
    { id: "shimokita-1", name: "下北沢の古着屋通り", lat: 35.6614, lng: 139.6680, tags: ["古着"], kind: "店", indoor: true, hours: null, price: 3000, groupLikes: { "古着": 13 } },
    { id: "shimokita-2", name: "喫茶 しもきた（架空）", lat: 35.6605, lng: 139.6695, tags: ["カフェ"], kind: "カフェ", indoor: true, hours: null, price: 700, groupLikes: { "カフェ": 5 } },
    { id: "takao", name: "高尾山", lat: 35.6251, lng: 139.2436, tags: ["自然"], kind: "山", indoor: false, hours: null, price: 0, groupLikes: { "自然": 30 } },
    { id: "kamakura", name: "鎌倉の海沿いの踏切", lat: 35.3069, lng: 139.5004, tags: ["聖地巡礼"], kind: "名所", indoor: false, hours: null, price: 0, groupLikes: { "聖地巡礼": 26 } },
  ];

  // rating: 3=また行きたい 2=よかった 1=合わなかった
  const records = [
    // くさたろ：全国の図書館（1か所の記録）
    { id: "k1", writer: "kusataro", type: "spot", title: "波打つ木の天井の下で読む", tags: ["図書館建築"], date: "2026-10-12", spots: [{ spot: "lib-gifu", rating: 3, note: "大きな傘のような照明の下に、席がゆるく集まっている。一日いられる。" }], went: 48 },
    { id: "k2", writer: "kusataro", type: "spot", title: "円形の吹き抜けに本が回る", tags: ["図書館建築"], date: "2026-09-20", spots: [{ spot: "lib-ishikawa", rating: 3, note: "中央の吹き抜けをぐるりと本棚が囲む。上の階から見下ろすのがいい。" }], member: { teaser: "人が少なく、光がいちばんきれいな時間帯と撮影の場所", body: "平日の午後3時ごろ、3階の西側から。" }, went: 61 },
    { id: "k3", writer: "kusataro", type: "spot", title: "白い箱に穴があいた光", tags: ["図書館建築"], date: "2026-08-03", spots: [{ spot: "lib-umimirai", rating: 3, note: "壁一面の小さな丸窓から、やわらかい光が入る。" }], went: 35 },
    { id: "k4", writer: "kusataro", type: "spot", title: "美術館と図書館がらせんでつながる", tags: ["図書館建築", "美術館"], date: "2026-07-14", spots: [{ spot: "lib-ota", rating: 3, note: "スロープを上がるうちに、展示と本棚が入れ替わる。" }], member: { teaser: "建物の見どころを順番に回るルート図", body: "入口→スロープ→屋上の順で。" }, went: 22 },
    { id: "k5", writer: "kusataro", type: "spot", title: "駅前の図書館は広くて静か", tags: ["図書館建築"], date: "2026-06-01", spots: [{ spot: "lib-tsuchiura", rating: 2, note: "駅から濡れずに行ける。窓際の席が多い。" }], went: 12 },
    { id: "k6", writer: "kusataro", type: "spot", title: "本棚の壁に囲まれる", tags: ["図書館建築"], date: "2026-05-05", spots: [{ spot: "lib-takeo", rating: 2, note: "高い本棚が壁になっていて圧倒される。休日は混む。" }], went: 30 },
    { id: "k7", writer: "kusataro", type: "spot", title: "公園の中の図書館", tags: ["図書館建築"], date: "2026-04-18", spots: [{ spot: "lib-hibiya", rating: 3, note: "日比谷公園の緑を見ながら読める。" }], went: 9 },
    { id: "k8", writer: "kusataro", type: "spot", title: "駅近の新しい図書館", tags: ["図書館建築"], date: "2026-11-02", spots: [{ spot: "omiya-lib", rating: 3, note: "大宮駅から歩いてすぐ。明るい閲覧席が多い。" }, ], went: 17 },
    { id: "k9", writer: "kusataro", type: "spot", title: "本が読めるカフェ", tags: ["カフェ", "図書館建築"], date: "2026-10-28", spots: [{ spot: "c-hidamari", rating: 3, note: "壁一面の本棚。雨の日の避難先にいい。" }], went: 14 },

    // ゆう：埼玉南部のルート（取り込むルート）
    {
      id: "y1", writer: "yu", type: "route", title: "大宮で、建築と煮干しラーメンの1日", tags: ["旅行", "ラーメン", "図書館建築"], date: "2026-11-08", start: "10:00",
      spots: [
        { spot: "omiya-lib", stay: 60, rating: 3, note: "朝いちばんに。明るい閲覧席で今日の予定を確認。" },
        { spot: "hikawa", stay: 45, rating: 3, note: "長い参道を歩くだけで気持ちが切り替わる。" },
        { spot: "r-akari", stay: 40, rating: 3, note: "昼はここ。澄んだ煮干しのスープ。" },
        { spot: "railway", stay: 120, rating: 3, note: "午後はじっくり。閉館は早めなので注意。" },
        { spot: "omiya-park", stay: 40, rating: 2, note: "夕方の散歩で締める。" },
      ],
      went: 41,
    },
    { id: "y2", writer: "yu", type: "route", title: "金沢、図書館と海の1日", tags: ["旅行", "図書館建築"], date: "2026-09-21", start: "09:30", spots: [{ spot: "lib-umimirai", stay: 60, rating: 3, note: "朝の光がきれい。" }, { spot: "lib-ishikawa", stay: 90, rating: 3, note: "午後はここで長居。" }], went: 19 },

    // みなみ：大宮のラーメン（1か所の記録）
    { id: "m1", writer: "minami", type: "spot", title: "凪草：やさしい煮干し", tags: ["ラーメン"], date: "2026-11-01", spots: [{ spot: "r-nagi", rating: 3, note: "煮干しが好きなら一度は。昼だけの営業なので早めに。" }], went: 33 },
    { id: "m2", writer: "minami", type: "spot", title: "しろがね：濃い煮干し", tags: ["ラーメン"], date: "2026-10-15", spots: [{ spot: "r-shirogane", rating: 2, note: "濃いめ。駅から少し歩く。" }], went: 21 },
    { id: "m3", writer: "minami", type: "spot", title: "一角家：王道の家系", tags: ["ラーメン"], date: "2026-09-30", spots: [{ spot: "r-ikkaku", rating: 2, note: "家系の気分のときに。" }], went: 40 },
    { id: "m4", writer: "minami", type: "spot", title: "灯：澄んだ煮干し", tags: ["ラーメン"], date: "2026-09-02", spots: [{ spot: "r-akari", rating: 3, note: "駅からすぐ。澄んだスープ。" }], went: 52 },
    { id: "m5", writer: "minami", type: "spot", title: "ことり：鶏白湯", tags: ["ラーメン"], date: "2026-08-20", spots: [{ spot: "r-kotori", rating: 2, note: "煮干しが苦手な友だちと行くなら。" }], went: 11 },

    // 公式：スタンプラリー（架空）
    { id: "o1", writer: "official", type: "route", official: true, stamp: true, title: "大宮 歴史と鉄道のスタンプラリー（架空の企画）", tags: ["旅行"], date: "2026-11-01", start: "10:00", spots: [{ spot: "hikawa", stay: 40, rating: 3, note: "スタンプ1：参道の入口" }, { spot: "omiya-park", stay: 30, rating: 3, note: "スタンプ2：公園の池のほとり" }, { spot: "bonsai", stay: 50, rating: 3, note: "スタンプ3：盆栽の庭" }, { spot: "railway", stay: 90, rating: 3, note: "スタンプ4：ゴール" }], went: 310 },

    // その他のタグ（AIで作った仮の記録）
    { id: "h1", writer: "haru", type: "route", title: "下北沢、古着と喫茶のはしご", tags: ["古着", "カフェ"], date: "2026-10-05", start: "13:00", spots: [{ spot: "shimokita-1", stay: 90, rating: 3, note: "細い路地ほど掘り出し物がある。" }, { spot: "shimokita-2", stay: 45, rating: 2, note: "歩き疲れたらここ。" }], went: 18 },
    { id: "s1", writer: "sora", type: "spot", title: "夕方の踏切", tags: ["聖地巡礼"], date: "2026-08-15", spots: [{ spot: "kamakura", rating: 3, note: "作品と同じ時間帯に。人が多いので譲り合って。" }], went: 64 },
    { id: "a1", writer: "aoi", type: "spot", title: "朝いちばんの高尾山", tags: ["自然"], date: "2026-10-26", spots: [{ spot: "takao", rating: 3, note: "朝7時台なら静か。" }], went: 25 },
    { id: "a2", writer: "aoi", type: "spot", title: "盆栽の小宇宙", tags: ["美術館"], date: "2026-07-07", spots: [{ spot: "bonsai", rating: 3, note: "庭の盆栽は撮影できる。" }], went: 8 },
  ];

  const viewer = {
    name: "Aさん",
    favorites: ["kusataro", "yu"],          // お気に入りの書き手
    tagFavorites: { minami: ["ラーメン"] }, // タグだけお気に入り
    memberships: [],                         // 入っているメンバーシップ（なし）
    plan: "free",                            // free / premium
    rebuildsLeft: 5,
    // 登録した場所（行きたい場所）。自分のマップに出る
    saved: [
      { spot: "r-nagi", memo: "昼だけの営業。土曜の昼に行く" },
      { spot: "bonsai", memo: "" },
      { spot: "c-hidamari", memo: "雨の日の避難先" },
      { spot: "lib-ishikawa", memo: "金沢に行くときに必ず" },
    ],
  };

  const data = { TAGS, writers, spots, records, viewer };
  if (typeof module !== "undefined") module.exports = data;
  if (typeof window !== "undefined") window.TAM_DATA = data;
})();
