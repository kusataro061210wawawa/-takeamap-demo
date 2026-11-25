/* Take A Map デモ用のデータ。
   - チームの記録フォーム（2026-11-23〜24 の回答）から入れた記事：くさたろ（図書館・富山のルート）、ゆう（広島・熱海・大宮のラーメン）。
     文章はフォームの「ひとこと」を記事向けに整えて書き足したもの。営業時間・休み・住所は書き手が入力した値（来店前に公式サイトで確認すること）。
     写真は images/ にある（位置情報は消してあり、人の顔と車のナンバーはぼかしてある）。
   - それ以外（煮干しそば 灯 などのラーメン屋・カフェ・公式のスタンプラリー）は架空。評価・ひとことも仮。 */
(function () {
  const TAGS = ["図書館建築", "旅行", "グルメ", "ラーメン", "歴史", "カフェ", "古着", "聖地巡礼", "自然", "美術館"];

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
      bio: "週末は1日かけて街を歩きます。海と船、それから昼ごはんで選ぶ旅。大宮のラーメンも食べ歩き中。",
      mainTag: "旅行",
      stats: { records: { "旅行": 41, "ラーメン": 14, "カフェ": 7 }, favorites: 860, retention: 88, wentFromArticles: 214 },
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

  /* 場所
     indoor: 屋内か（雨の組み直しに使う）。io: 画面に出す「屋内／屋外／屋内・屋外」
     hours: 組み直し・つくるで使う営業時間（1日の中の開く〜閉まる。null = 時間の制約なし）。rest: 中休み
     hoursText / closed / priceText / addr: 記事に出す、書き手が入力した値
     groupLikes: 同じ趣味の記録が多い人たちのうち「また行きたい」の人数（仮） */
  const spots = [
    // 大宮（デモの舞台）
    { id: "omiya-lib", name: "さいたま市大宮図書館", lat: 35.9050, lng: 139.6293, tags: ["図書館建築", "旅行"], kind: "建築", indoor: true, hours: { open: "09:00", close: "20:00" }, price: 0, groupLikes: { "図書館建築": 9 } },
    { id: "hikawa", name: "武蔵一宮 氷川神社", lat: 35.9165, lng: 139.6300, tags: ["旅行", "歴史"], kind: "名所", indoor: false, hours: { open: "06:00", close: "17:30" }, price: 0, groupLikes: { "旅行": 21 } },
    { id: "omiya-park", name: "大宮公園", lat: 35.9212, lng: 139.6345, tags: ["自然", "旅行"], kind: "公園", indoor: false, hours: null, price: 0, groupLikes: { "自然": 11 } },
    { id: "railway", name: "鉄道博物館", lat: 35.9213, lng: 139.6176, tags: ["旅行", "美術館"], kind: "博物館", indoor: true, hours: { open: "10:00", close: "17:00" }, price: 1600, groupLikes: { "旅行": 18 } },
    { id: "bonsai", name: "大宮盆栽美術館", lat: 35.9302, lng: 139.6392, tags: ["美術館", "旅行"], kind: "美術館", indoor: true, hours: { open: "09:00", close: "16:30" }, price: 310, groupLikes: { "美術館": 7 } },
    // ラーメン（架空の店）
    { id: "r-akari", name: "煮干しそば 灯", lat: 35.9071, lng: 139.6262, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:00", close: "21:00" }, price: 1000, groupLikes: { "ラーメン": 14 } },
    { id: "r-nagi", name: "中華そば 凪草", lat: 35.9098, lng: 139.6276, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:00", close: "15:00" }, price: 950, groupLikes: { "ラーメン": 12 } },
    { id: "r-shirogane", name: "麺処 しろがね", lat: 35.9150, lng: 139.6180, tags: ["ラーメン"], kind: "ラーメン", style: "煮干し", indoor: true, hours: { open: "11:30", close: "20:00" }, price: 1050, groupLikes: { "ラーメン": 9 } },
    { id: "r-ikkaku", name: "家系ラーメン 一角家", lat: 35.9060, lng: 139.6228, tags: ["ラーメン"], kind: "ラーメン", style: "家系", indoor: true, hours: { open: "11:00", close: "24:00" }, price: 900, groupLikes: { "ラーメン": 17 } },
    { id: "r-kotori", name: "鶏白湯 ことり", lat: 35.9043, lng: 139.6252, tags: ["ラーメン"], kind: "ラーメン", style: "鶏白湯", indoor: true, hours: { open: "11:00", close: "22:00" }, price: 980, groupLikes: { "ラーメン": 8 } },
    // ラーメン（実在の店。ゆうの記録フォームから）
    { id: "r-noroshi", name: "狼煙 大宮店", lat: 35.90375, lng: 139.62683, tags: ["ラーメン", "グルメ"], kind: "ラーメン", style: "つけ麺", indoor: true, hours: { open: "11:00", close: "22:00" }, closed: "なし", price: 1000, priceText: "〜1,000円", addr: "埼玉県さいたま市大宮区下町1丁目25" },
    { id: "r-nagi-e", name: "ラーメン凪 大宮東口店", lat: 35.90679, lng: 139.62601, tags: ["ラーメン", "グルメ"], kind: "ラーメン", style: "煮干し", indoor: true, hours: null, hoursText: "記録では24時間（来店前に確認を）", closed: "なし", price: 1000, priceText: "〜1,000円", addr: "埼玉県さいたま市大宮区大門町1丁目24-1" },
    { id: "r-musashiya", name: "武蔵家", lat: 35.90667, lng: 139.62503, tags: ["ラーメン", "グルメ"], kind: "ラーメン", style: "家系", indoor: true, hours: { open: "10:00", close: "22:00" }, closed: "なし", price: 1000, addr: "埼玉県さいたま市大宮区大門町1-92" },
    { id: "r-junk", name: "ジャンクガレッジ", lat: 35.90655, lng: 139.62521, tags: ["ラーメン", "グルメ"], kind: "ラーメン", style: "まぜそば", indoor: true, hours: { open: "11:00", close: "23:00" }, hoursText: "月〜木 11:00〜23:15／金・土 11:00〜23:00／日・祝 11:00〜24:00", closed: "なし", price: 1000, priceText: "〜1,000円", addr: "埼玉県さいたま市大宮区大門町1-92" },
    { id: "r-negijiro", name: "葱次郎 大宮西口店", lat: 35.90760, lng: 139.61900, tags: ["ラーメン", "グルメ"], kind: "ラーメン", indoor: true, hours: { open: "11:00", close: "23:00", rest: ["15:00", "17:00"] }, hoursText: "11:00〜15:00／17:00〜23:00", closed: "なし", price: 1000, priceText: "〜1,000円", addr: "埼玉県さいたま市大宮区桜木町2丁目331" },
    // カフェ（架空）
    { id: "c-hidamari", name: "ブックカフェ ひだまり", lat: 35.9102, lng: 139.6290, tags: ["カフェ", "図書館建築"], kind: "カフェ", indoor: true, hours: { open: "10:00", close: "19:00" }, price: 700, groupLikes: { "カフェ": 10 } },
    { id: "c-madobe", name: "喫茶 まどべ", lat: 35.9082, lng: 139.6243, tags: ["カフェ"], kind: "カフェ", indoor: true, hours: { open: "08:00", close: "18:00" }, price: 600, groupLikes: { "カフェ": 6 } },

    // 全国の図書館（くさたろ）
    { id: "lib-gifu", name: "みんなの森 ぎふメディアコスモス", lat: 35.4229, lng: 136.7604, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 24 } },
    { id: "lib-ishikawa", name: "石川県立図書館", lat: 36.54867, lng: 136.68033, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "09:00", close: "19:00" }, hoursText: "火〜金 9:00〜19:00／土・日・祝 9:00〜18:00", closed: "月曜（祝日のときは翌平日）、年末年始、特別整理期間", price: 0, priceText: "0円", addr: "石川県金沢市小立野2丁目43-1", groupLikes: { "図書館建築": 27 } },
    { id: "lib-umimirai", name: "金沢海みらい図書館", lat: 36.59459, lng: 136.60420, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "10:00", close: "19:00" }, hoursText: "月・火・木・金 10:00〜19:00／土・日・祝 10:00〜17:00", closed: "水曜（祝日・振替休日は開館）、特別整理期間（6月第1月曜〜翌々日、11月最終月曜〜翌週金曜）、年末年始（12/29〜1/4）", price: 0, priceText: "0円", addr: "石川県金沢市寺中町イ1-1", groupLikes: { "図書館建築": 19 } },
    { id: "lib-ota", name: "太田市美術館・図書館", lat: 36.2937, lng: 139.3770, tags: ["図書館建築", "美術館"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 15 } },
    { id: "lib-tsuchiura", name: "土浦市立図書館", lat: 36.0786, lng: 140.2046, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 8 } },
    { id: "lib-takeo", name: "武雄市図書館", lat: 33.1930, lng: 130.0160, tags: ["図書館建築"], kind: "建築", indoor: true, hours: null, price: 0, groupLikes: { "図書館建築": 13 } },
    { id: "lib-hibiya", name: "千代田区立日比谷図書文化館", lat: 35.67276, lng: 139.75409, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "10:00", close: "22:00" }, hoursText: "月〜金 10:00〜22:00／土 10:00〜19:00／日・祝 10:00〜17:00", closed: "第3月曜、12/29〜1/3、特別整理期間", price: 0, priceText: "0円", addr: "東京都千代田区日比谷公園1-4", groupLikes: { "図書館建築": 6 } },
    { id: "lib-itabashi", name: "板橋区立中央図書館", lat: 35.76311, lng: 139.68114, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "09:00", close: "20:00" }, hoursText: "9:00〜20:00", closed: "第2月曜・月末日（土日祝と重なる日は開館し、そのあとの平日が休館。3月31日は休館）、年末年始（12/29〜1/4）、特別整理期間", price: 0, priceText: "0円", addr: "東京都板橋区常盤台4丁目3-1", groupLikes: { "図書館建築": 11 } },
    { id: "lib-kanagawa", name: "神奈川県立図書館", lat: 35.45207, lng: 139.62604, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "09:00", close: "19:00" }, hoursText: "火〜金 9:00〜19:00／土・日・祝 9:00〜17:00", closed: "月曜（祝日は開館）、第2木曜（祝休日のときは翌金曜）、年末年始、資料総点検期間", price: 0, priceText: "0円", addr: "神奈川県横浜市西区紅葉ケ丘9-2", groupLikes: { "図書館建築": 10 } },
    { id: "lib-musashino", name: "武蔵野プレイス", lat: 35.70084, lng: 139.54366, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "09:30", close: "22:00" }, hoursText: "9:30〜22:00", closed: "水曜（祝日と重なるときは開館し、翌日が休館）、年末年始、図書特別整理期間", price: 0, priceText: "0円", addr: "東京都武蔵野市境南町2丁目3-18", groupLikes: { "図書館建築": 16 } },
    { id: "lib-sentpure", name: "せんとぴゅあⅡ", lat: 43.70029, lng: 142.50873, tags: ["図書館建築"], kind: "建築", indoor: true, hours: { open: "09:00", close: "21:00" }, hoursText: "9:00〜21:00", closed: "年末年始（12/31〜1/5）", price: 0, priceText: "0円", addr: "北海道上川郡東川町北町1丁目1-2", groupLikes: { "図書館建築": 7 } },

    // 富山の中心部（くさたろのルート）
    { id: "toyama-st", name: "富山駅", lat: 36.70137, lng: 137.21181, tags: ["旅行"], kind: "駅", indoor: true, hours: null, hoursText: "改札 5:00〜23:40／窓口 6:30〜21:00", price: 0, priceText: "0円", addr: "富山県富山市明輪町1-225" },
    { id: "kansui", name: "富岩運河環水公園", lat: 36.71133, lng: 137.21283, tags: ["自然", "旅行"], kind: "公園", indoor: false, hours: null, hoursText: "24時間", closed: "なし", price: 0, priceText: "0円", addr: "富山県富山市湊入船町1", groupLikes: { "自然": 9 } },
    { id: "yonekyu", name: "鱒の寿し 米久", lat: 36.71474, lng: 137.22049, tags: ["グルメ"], kind: "グルメ", indoor: true, hours: { open: "07:00", close: "18:00" }, hoursText: "7:00〜18:00", closed: "不定休", price: 2000, priceText: "1,000〜3,000円", addr: "富山県富山市下新本町5-14" },
    { id: "toyama-castle", name: "富山城（富山市郷土博物館）", lat: 36.69203, lng: 137.21228, tags: ["歴史", "旅行"], kind: "博物館", indoor: true, io: "屋内・屋外", hours: { open: "09:00", close: "17:00" }, hoursText: "9:00〜17:00", closed: "年末年始（12/28〜1/4）、展示替えなどの臨時休館日", price: 1000, priceText: "〜1,000円", addr: "富山県富山市本丸1-62", groupLikes: { "旅行": 6 } },
    { id: "itosho", name: "糸庄", lat: 36.67742, lng: 137.21130, tags: ["グルメ"], kind: "グルメ", indoor: true, hours: { open: "11:00", close: "22:30", rest: ["15:30", "17:00"] }, hoursText: "昼 11:00〜15:00（L.O.）・15:30閉店／夜 17:00〜22:00（L.O.）・22:30閉店", closed: "火曜（祝日のときは営業し、翌水曜が休み）", price: 1200, priceText: "1,000〜3,000円", addr: "富山県富山市太郎丸本町1丁目7-6" },
    { id: "lib-toyama", name: "富山市立図書館 本館（TOYAMAキラリ）", lat: 36.68871, lng: 137.21471, tags: ["図書館建築", "美術館"], kind: "建築", indoor: true, hours: { open: "09:30", close: "19:00" }, hoursText: "9:30〜19:00（3階の児童図書・5階の特別コレクション室は18:00まで）", closed: "第1・第3水曜（館内整理日）、年末年始", price: 0, priceText: "0円", addr: "富山県富山市西町5-1 TOYAMAキラリ", groupLikes: { "図書館建築": 21 } },

    // 広島（ゆうのルート）
    { id: "kure-yamato", name: "大和ミュージアム", lat: 34.24162, lng: 132.55478, tags: ["歴史", "旅行"], kind: "博物館", indoor: true, hours: { open: "10:00", close: "19:00" }, hoursText: "10:00〜19:00", closed: "火曜", price: 1000, priceText: "〜1,000円", addr: "広島県呉市宝町5-20", groupLikes: { "旅行": 12 } },
    { id: "kure-kujira", name: "てつのくじら館（海上自衛隊呉史料館）", lat: 34.24260, lng: 132.55244, tags: ["歴史", "旅行"], kind: "博物館", indoor: true, hours: null, hoursText: "記録なし（来館前に確認を）", price: 1000, priceText: "〜1,000円", addr: "広島県呉市宝町5-32", groupLikes: { "旅行": 9 } },
    { id: "kure-chinraiken", name: "元祖 呉冷麺 珍来軒", lat: 34.24546, lng: 132.56735, tags: ["グルメ"], kind: "グルメ", indoor: true, hours: { open: "10:00", close: "19:00" }, hoursText: "10:00〜19:00", price: 950, priceText: "〜1,000円", addr: "広島県呉市本通4丁目10-1 藤盛ビル" },
    { id: "itsukushima", name: "厳島神社", lat: 34.29600, lng: 132.31980, tags: ["旅行", "歴史"], kind: "名所", indoor: false, hours: null, hoursText: "大鳥居のまわりはいつでも（社殿の参拝は時間あり）", closed: "なし", price: 0, priceText: "0円", addr: "広島県廿日市市宮島町1-1", groupLikes: { "旅行": 25 } },

    // 熱海（ゆうのルート）
    { id: "atami-beach", name: "熱海の海辺（東海岸町）", lat: 35.10027, lng: 139.07849, tags: ["旅行", "自然"], kind: "海", indoor: false, hours: null, hoursText: "いつでも", closed: "なし", price: 1000, priceText: "〜1,000円", addr: "静岡県熱海市東海岸町" },
    { id: "hatsushima", name: "初島のレモンのオブジェ", lat: 35.04000, lng: 139.17154, tags: ["旅行"], kind: "名所", indoor: false, hours: null, hoursText: "いつでも", closed: "なし", price: 0, priceText: "0円", addr: "静岡県熱海市初島" },

    // ほかのタグ（AIで作った仮の記録用）
    { id: "shimokita-1", name: "下北沢の古着屋通り", lat: 35.6614, lng: 139.6680, tags: ["古着"], kind: "店", indoor: true, hours: null, price: 3000, groupLikes: { "古着": 13 } },
    { id: "shimokita-2", name: "喫茶 しもきた（架空）", lat: 35.6605, lng: 139.6695, tags: ["カフェ"], kind: "カフェ", indoor: true, hours: null, price: 700, groupLikes: { "カフェ": 5 } },
    { id: "takao", name: "高尾山", lat: 35.6251, lng: 139.2436, tags: ["自然"], kind: "山", indoor: false, hours: null, price: 0, groupLikes: { "自然": 30 } },
    { id: "kamakura", name: "鎌倉の海沿いの踏切", lat: 35.3069, lng: 139.5004, tags: ["聖地巡礼"], kind: "名所", indoor: false, hours: null, price: 0, groupLikes: { "聖地巡礼": 26 } },
  ];

  /* 記事（記録）
     rating: 3=また行きたい 2=よかった 1=合わなかった
     spots[]: note = 一行のひとこと（カードや一覧に出す）、head = 場所ごとの見出し、text = 記事の本文（段落）、
              photos = [{ src: images/ の名前, cap: 説明 }]、stay = 滞在（分）
     lead: 記事の書き出し。member: メンバー限定の部分 */
  const P = (src, cap) => ({ src, cap });
  const records = [
    /* ===== くさたろ：記録フォームから ===== */
    {
      id: "k13", writer: "kusataro", type: "route", title: "コンパクトシティの成功例、富山。その中心部を1日歩く", mainTag: "旅行", tags: ["旅行", "図書館建築", "グルメ", "歴史"], date: "2026-05-07", start: "06:30", cover: "kansui-1",
      lead: "富山市は、路面電車を軸に、暮らしに必要なものを街の中心に集める「コンパクトシティ」のまちづくりで知られています。その中心部は、実際に歩いてみるとどうなっているのか。朝の富山駅から、隈研吾さんが設計した図書館まで、6か所を1日かけて回りました。",
      spots: [
        {
          spot: "toyama-st", stay: 20, rating: 2, head: "路面電車が街へ走り出す、コンパクトシティの入口",
          note: "路面電車が駅から街へ走っていく。コンパクトシティの入口。",
          text: [
            "駅のまわりはきれいに整っていて、規模は思っていたより小さめ。路面電車（LRT）が駅から市街へ向かって走っていく様子が珍しくて、思わず立ち止まって眺めてしまいました。",
            "富山駅は、コンパクトシティ構想の中核として、ここ10年ほどで大きく姿を変えた場所です。駅に着いたら、まずは電車が街へ出ていく様子を見てから歩き始めるのがおすすめです。",
          ],
          photos: [P("toyama-st-1", "朝の富山駅"), P("toyama-st-2", "駅から市街へ向かう路面電車")],
        },
        {
          spot: "kansui", stay: 45, rating: 3, head: "運河をまたぐ橋の上から、立山連峰をのぞく。散歩が最高",
          note: "天門橋の上から立山連峰。朝の散歩が最高。",
          text: [
            "富岩運河を囲むように広がる、大きく開けた公園です。運河をまたぐ天門橋の上からは、晴れていれば立山連峰がはっきり見えます。朝の澄んだ空気の中で見る山並みは格別でした。",
            "園内には「世界一美しいスタバ」とも言われる、スターバックス コーヒー 富山環水公園店が併設されています。散歩の途中にひと休みするのにぴったりです。",
          ],
          photos: [P("kansui-1", "天門橋の上から。奥に立山連峰"), P("kansui-2", "運河沿いの遊歩道"), P("kansui-3", "スターバックス コーヒー 富山環水公園店")],
        },
        {
          spot: "yonekyu", stay: 45, rating: 3, head: "鱒寿しはここで決まり。日本庭園を前に、緑茶で一息",
          note: "一段2,000円の鱒寿し。日本庭園を前に緑茶で一息。",
          text: [
            "環水公園から歩いてすぐのところにあります。平日の朝9時に店内に入りましたが、この時間でも5分に1人くらいのペースで、持ち帰り用の鱒寿しを買いに来るお客さんが続いていました。",
            "注文したのは、2,000円の鱒寿しを一段。ご飯も鱒もぎっしり詰まっていて、一人で食べるとお腹いっぱいになります。店内から日本庭園を眺めながら緑茶を飲んでいると、旅の途中なのを忘れるくらい落ち着きます。",
            "本当においしかったので、富山で鱒寿しを食べるなら、ここをすすめたいです。",
          ],
          photos: [P("yonekyu-1", "鱒寿しと緑茶"), P("yonekyu-2", "店内から見える日本庭園"), P("yonekyu-3", "店の外観")],
        },
        {
          spot: "toyama-castle", stay: 90, rating: 3, head: "戦後復興の象徴として建てられた城",
          note: "1954年、戦後復興の象徴として建てられた城。中は郷土博物館。",
          text: [
            "富山駅から南へ500mほど。この城は1954年、戦後復興の象徴として建てられました。",
            "中は富山市郷土博物館になっていて、戦国時代から戦後、この城が建つまでの富山の歴史を、順を追って学ぶことができます。",
            "まわりの城址公園には、赤い橋の架かる池や庭園もあります。展示を見たあとに、庭をひと回りしていくのがおすすめです。",
          ],
          photos: [P("castle-1", "正面から見た富山城"), P("castle-2", "城址公園の赤い橋"), P("castle-3", "庭園の池"), P("castle-4", "「AMAZING TOYAMA」のフレーム越しに")],
        },
        {
          spot: "itosho", stay: 45, rating: 3, head: "地元に愛されてきた、もつ煮込みうどんの店",
          note: "54年続く富山のソウルフード、もつ煮込みうどん。",
          text: [
            "糸庄は、富山のソウルフードとして54年間愛され続けている、もつ煮込みうどんの店です。富山駅からは少し離れていますが、平日の昼でも数十人のお客さんが訪れていました。",
            "注文したのは、もつ煮込みうどん（1,200円）。ガスの火でしっかり煮込まれていて、運ばれてきたところで蓋を開けて出してくれます。",
            "厨房では、80歳くらいのおばあちゃんが野菜やかまぼこをどんどん切っていました。長く愛されてきた理由が、少しわかった気がします。",
          ],
          photos: [P("itosho-1", "もつ煮込みうどん"), P("itosho-2", "店の外観")],
        },
        {
          spot: "lib-toyama", stay: 90, rating: 3, head: "木材×鏡×大きな吹き抜け。隈研吾さん設計の美しい空間",
          note: "隈研吾さん設計。杉の吹き抜けを、エスカレーターで上りながら。",
          text: [
            "富山で図書館建築を見るなら、ここは外せません。TOYAMAキラリの中にあり、設計は隈研吾さん。立山連峰を思わせる御影石・ガラス・アルミの外観と、富山県産の杉材を生かした大きな吹き抜けが特徴です。",
            "おすすめは、館内のエスカレーターで上りながら撮影すること。上がるにつれて、斜めに走る木のルーバー越しの景色が少しずつ変わっていきます。",
            "図書館と美術館（ガラス美術館）の機能を兼ね備えているのもポイントです。ガラス美術館では特別展をひんぱんに開いていて、とても満足度の高い時間になりました。",
          ],
          photos: [P("kirari-1", "杉のルーバーが走る大きな吹き抜け"), P("kirari-2", "TOYAMAキラリの外観"), P("kirari-3", "書架のフロア")],
        },
      ],
      went: 86,
    },
    {
      id: "k10", writer: "kusataro", type: "spot", title: "板橋区民がうらやましくなる、生まれ変わった中央図書館", mainTag: "図書館建築", tags: ["図書館建築"], date: "2025-11-16",
      spots: [{
        spot: "lib-itabashi", stay: 90, rating: 3,
        note: "3階の窓ぎわの個別席は、夜に間接照明をつけると格別。",
        text: [
          "リニューアルで生まれ変わった板橋区立中央図書館。内装も外装も新しく、となりには大きな公園が広がっています。",
          "1階には開架の児童書がたくさん並んでいて、子ども連れでも気兼ねなく使える雰囲気です。学生向けの勉強スペースはエリアを分けて用意されていて、静かに集中したい人と、にぎやかな親子とが、うまくすみ分けられています。",
          "おすすめは3階の窓ぎわ。一人ずつ座れるチェアとテーブルが並んでいて、天気のいい日はテラスにも出られます。",
          "わたしが行ったのは夜。個別席の間接照明をつけると手元だけがふわっと明るくなって、とても落ち着いた時間を過ごせました。日が暮れてから行くのも、ぜひ試してほしい使い方です。",
        ],
        photos: [P("itabashi-1", "夕方の外観。となりは大きな公園"), P("itabashi-2", "3階の窓ぎわの個別席。間接照明つき")],
      }],
      went: 27,
    },
    {
      id: "k11", writer: "kusataro", type: "spot", title: "スタイリッシュで気持ちいい図書館。勉強も仕事もはかどる", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-03-11",
      spots: [{
        spot: "lib-kanagawa", stay: 90, rating: 3,
        note: "1階はカフェと雑誌で気軽に。上の階は静かに集中できる。",
        text: [
          "最近リニューアルされた神奈川県立図書館。桜木町駅から歩いて行ける距離ですが、紅葉坂を上りきった先にあるので、ちょっとした坂道散歩になります。",
          "外観は、縦にまっすぐ貫く柱のラインと、そのあいだにわたる大きなガラス面が印象的。夜は館内の明かりが透けて、建物ごと灯りのように見えます。",
          "1階は雑誌や新聞を読むスペース、リラックスして座れるエリア、館内のカフェがあって、ふらっと立ち寄るだけでも使いやすい階です。",
        ],
        photos: [P("kanagawa-1", "夜の外観。縦の柱と大きなガラス面")],
      }],
      member: { teaser: "勉強・仕事に向く2・3階の席と、集中できる過ごし方", body: "2・3階は書架と机が中心で、十分な蔵書と、学習や仕事に使える席がそろっています。館内のモダンな色合いと静かな環境は、集中力が大事な作業にうってつけでした。" },
      went: 19,
    },
    {
      id: "k12", writer: "kusataro", type: "spot", title: "駅近のおもしろ空間。かわいい見た目に、つい通いたくなる", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-03-23",
      spots: [{
        spot: "lib-musashino", stay: 150, rating: 3,
        note: "窓ひとつ分の大きさが、館内を区切るユニットになっている。",
        text: [
          "武蔵境駅の南口から歩いて2分。改札を出ると公園が目の前に広がり、その先に、白くて丸っこい、大きな口を開けたような建物が見えてきます。",
          "壁には、角の丸い窓が縦3つ×横4つ。電卓のボタンのようにも見えるこの窓に惹かれて中に入ってみると、そのつくりにまた驚かされます。外から見た窓ひとつ分の大きさが、そのまま館内を区切る単位（ユニット）になっていて、直方体の館内を、ユニットをつなげて用途ごとに分けているのです。",
          "1階には人の集まるカフェと、雑誌・新聞のコーナー。ここから地下と2階へ階段が続いています。",
        ],
        photos: [P("musashino-1", "公園側から見た外観。丸い窓が並ぶ"), P("musashino-2", "入口。建物が大きな口を開けているよう")],
      }],
      member: { teaser: "地下と2階のユニットの使われ方と、長居できる席", body: "地下と2階も、窓ひとつ分のユニットが部屋のように連なっていて、ユニットごとに雰囲気が変わります。気づけば2時間以上いました。夜は22時まで開いているので、仕事帰りに寄れるのもうれしいところです。" },
      went: 23,
    },
    {
      id: "k7", writer: "kusataro", type: "spot", title: "チーズケーキ図書館。窓ぎわが快適で、眠ってしまいそう", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-04-06",
      spots: [{
        spot: "lib-hibiya", stay: 90, rating: 3,
        note: "ピザをひと切れ切り出したような形。窓ぎわの席が快適。",
        text: [
          "場所は皇居のすぐとなり。まさに日本の中枢です。日比谷ミッドタウンへ向かう人、霞が関の官庁へ向かう人、虎ノ門の高層ビル街で働く人たち……そんな人の流れを横目に、わたしはこの図書館のためだけにここへ来ます。",
          "「チーズケーキ図書館」こと千代田区立日比谷図書文化館は、わたしにとって第二の居場所と言っていい場所です。まず形がおもしろい。ピザをひと切れ切り出したような形の図書館は、わたしの知る限り、東京科学大学の大岡山キャンパスにあるもの以外にありません。",
          "「文化館」という名前のとおり、ミュージアム、カフェ（PRONTO）、図書館、貸しイベントスペースの機能がひとつの建物にそろっています。日比谷公園の木々に囲まれていて、夜は木立のあいだから窓の明かりが透けて見えます。",
        ],
        photos: [P("hibiya-1", "夜の外観。三角形の建物に明かりが並ぶ"), P("hibiya-2", "日比谷公園の木立のあいだから")],
      }],
      member: { teaser: "眠ってしまいそうなほど快適な、窓ぎわの席", body: "おすすめは窓ぎわの席。公園の緑を見ながら座っていると、本当に眠ってしまいそうになります。平日は22時まで開いているので、仕事帰りの夜に寄るのが好きです。" },
      went: 31,
    },
    {
      id: "k14", writer: "kusataro", type: "spot", title: "移住先として人気の東川町。その理由がここに詰まっている", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-08-13",
      spots: [{
        spot: "lib-sentpure", stay: 90, rating: 3,
        note: "町の魅力の紹介と図書館がひとつに。東川家具の展示も多い。",
        text: [
          "せんとぴゅあⅡは、北海道の旭川市から南東へ10kmほどの小さな町、東川町にあります。",
          "とてもモダンな建物で、おしゃれな町として知られる東川の雰囲気によく合っていると思います。複合交流施設として使われていて、町の魅力を紹介するスペースが広くとられているのが印象的でした。",
          "蔵書は75,000冊。館内には地元の東川家具の展示も多く、本と一緒に家具を見て回るのも楽しい時間です。近くには、ディアルガのポケふた（ポケモンのデザインのマンホールのふた）もあります。",
          "訪れたのは夏の夕暮れ。暗くなっていく空の下で、ガラス越しに館内の明かりが一列に並ぶ姿がきれいでした。",
        ],
        photos: [P("sentpure-1", "夕暮れの外観"), P("sentpure-2", "明かりが並ぶ、横からの眺め")],
      }],
      went: 12,
    },
    {
      id: "k2", writer: "kusataro", type: "spot", title: "図書館建築を見るならここ。金沢市民がうらやましい", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-09-13",
      spots: [{
        spot: "lib-ishikawa", stay: 150, rating: 3,
        note: "本のページをめくる瞬間がモチーフ。円形ドームの内装は圧巻。",
        text: [
          "2022年7月に移転開館した石川県立図書館。地上4階・地下1階の大きな建物で、設計は建築家の仙田満さん。蔵書は約110万冊（開架は約30万冊、書庫には200万冊まで収められる）にのぼります。",
          "図書館建築をネットで調べていくと、必ずここにたどり着くほど有名な場所です。本のページをめくる瞬間をモチーフにした外観と、広大な円形のドームからなる圧巻の内装で、日本でも指折りの人気を誇ります。金沢の旅行プランにここを入れる観光客も多いそうです。",
          "木のトーンでつくられた円形の空間、という点では、国際教養大学の中嶋記念図書館にかなり似ています。どちらも華やかで、日本を代表する図書館と言えるでしょう。",
        ],
        photos: [P("ishikawa-1", "円形ドームの吹き抜け"), P("ishikawa-2", "本のページをめくる瞬間がモチーフの外観"), P("ishikawa-3", "上の階から見下ろした閲覧エリア")],
      }],
      member: { teaser: "円形ドームを見下ろす、いちばんの撮影場所", body: "上の階の手すりぎわから見下ろすと、放射状に広がる木の梁と、円を描く本棚をいっしょに写せます（3枚目の写真の場所）。" },
      went: 61,
    },
    {
      id: "k3", writer: "kusataro", type: "spot", title: "金沢の図書館はここも外せない。SFのような、異質な空間", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-09-13",
      spots: [{
        spot: "lib-umimirai", stay: 90, rating: 3,
        note: "6,000の穴から光が差し込む、白い箱の図書館。",
        text: [
          "金沢海みらい図書館は、石川県立図書館の陰に隠れた、もう一つの名作図書館建築です。金沢駅からバスで20分ほど。",
          "バス停を降りるとすぐ、向かいに、小さな穴がたくさん空いた巨大な白い建物が見えます。直方体に、規則正しく穴が空いているだけ。正直、何の建物なのか想像がつきません。",
          "中に入ってみると、内側まで白で統一されています。明るさを抑えた館内には、外壁に空いた6,000もの穴から日の光が差し込んでいて、SFの世界に入り込んだような、ほかでは味わえない空間でした。",
        ],
        photos: [P("umimirai-1", "小さな穴がたくさん空いた白い外壁"), P("umimirai-2", "バス停の側からの眺め")],
      }],
      went: 35,
    },

    /* ===== くさたろ：ほかの記録（仮） ===== */
    { id: "k1", writer: "kusataro", type: "spot", title: "波打つ木の天井の下で読む", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-10-12", spots: [{ spot: "lib-gifu", rating: 3, note: "大きな傘のような照明の下に、席がゆるく集まっている。一日いられる。" }], went: 48 },
    { id: "k4", writer: "kusataro", type: "spot", title: "美術館と図書館がらせんでつながる", mainTag: "図書館建築", tags: ["図書館建築", "美術館"], date: "2026-07-14", spots: [{ spot: "lib-ota", rating: 3, note: "スロープを上がるうちに、展示と本棚が入れ替わる。" }], member: { teaser: "建物の見どころを順番に回るルート図", body: "入口→スロープ→屋上の順で。" }, went: 22 },
    { id: "k5", writer: "kusataro", type: "spot", title: "駅前の図書館は広くて静か", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-06-01", spots: [{ spot: "lib-tsuchiura", rating: 2, note: "駅から濡れずに行ける。窓際の席が多い。" }], went: 12 },
    { id: "k6", writer: "kusataro", type: "spot", title: "本棚の壁に囲まれる", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-05-05", spots: [{ spot: "lib-takeo", rating: 2, note: "高い本棚が壁になっていて圧倒される。休日は混む。" }], went: 30 },
    { id: "k8", writer: "kusataro", type: "spot", title: "駅近の新しい図書館", mainTag: "図書館建築", tags: ["図書館建築"], date: "2026-11-02", spots: [{ spot: "omiya-lib", rating: 3, note: "大宮駅から歩いてすぐ。明るい閲覧席が多い。" }], went: 17 },
    { id: "k9", writer: "kusataro", type: "spot", title: "本が読めるカフェ", mainTag: "カフェ", tags: ["カフェ", "図書館建築"], date: "2026-10-28", spots: [{ spot: "c-hidamari", rating: 3, note: "壁一面の本棚。雨の日の避難先にいい。" }], went: 14 },

    /* ===== ゆう：記録フォームから ===== */
    {
      id: "y3", writer: "yu", type: "route", title: "広島の旅：呉で船を見て、冷麺を食べて、宮島へ", mainTag: "旅行", tags: ["旅行", "歴史", "グルメ"], date: "2026-09-03", start: "10:00", cover: "itsukushima-1",
      lead: "海軍の街・呉で船の博物館を2つ回り、元祖の呉冷麺を食べてから、宮島の厳島神社へ。広島の海を1日で味わうルートです。",
      spots: [
        {
          spot: "kure-yamato", stay: 60, rating: 3, head: "戦艦「大和」の模型は圧巻",
          note: "10分の1の戦艦「大和」の模型は圧巻。",
          text: [
            "まずは呉駅から歩いてすぐの大和ミュージアムへ。館内に入って最初に目に飛び込んでくるのが、10分の1サイズの戦艦「大和」の模型です。その大きさと細かさは、まさに圧巻のひと言。",
            "大きな窓の向こうには呉の港が広がっていて、展示を見たあとに海を眺めるのも楽しみのひとつです。",
          ],
          photos: [P("kure-yamato-1", "10分の1サイズの戦艦「大和」")],
        },
        {
          spot: "kure-kujira", stay: 45, rating: 3, head: "本物の潜水艦の中に入れる",
          note: "本物の潜水艦の中に入れる。",
          text: [
            "大和ミュージアムのすぐ近くにある、海上自衛隊呉史料館。愛称の「てつのくじら館」のとおり、本物の潜水艦が丸ごと陸に置かれていて、その中に実際に入ることができます。",
            "艦内を歩くと、潜水艦の中がどれだけ狭いかを体で感じられます。大和ミュージアムとセットで回るのがおすすめです。",
          ],
          photos: [P("kure-kujira-1", "陸に置かれた潜水艦")],
        },
        {
          spot: "kure-chinraiken", stay: 20, rating: 3, head: "ここの冷麺は絶品",
          note: "呉冷麺の元祖。ここの冷麺は絶品。",
          text: [
            "昼は、呉のご当地グルメ「呉冷麺」の元祖の店へ。店先には「SINCE 1955」の文字があり、長く続く老舗です。",
            "ここの冷麺は、本当に絶品。メニューは呉冷麺の小（950円）と大（1,100円）。昼どきには店の前に行列ができていたので、少し早めに行くのがおすすめです。",
          ],
          photos: [P("kure-chinraiken-1", "呉冷麺"), P("kure-chinraiken-2", "店の入口とメニュー")],
        },
        {
          spot: "itsukushima", stay: 30, rating: 3, head: "干潮の時間に行きましょう",
          note: "干潮の時間に行くと、大鳥居の足もとまで歩ける。",
          text: [
            "最後は宮島の厳島神社へ。呉からは電車とフェリーを乗り継いで向かいます。",
            "海の中に立つ大鳥居で知られていますが、ぜひ干潮の時間に合わせて行ってください。潮が引くと、大鳥居の足もとまで歩いて近づけます。満潮なら海に浮かぶ姿、干潮なら足もとから見上げる姿。潮の時刻を調べてから出かけるのがおすすめです。",
          ],
          photos: [P("itsukushima-1", "干潮の大鳥居")],
        },
      ],
      went: 52,
    },
    {
      id: "y4", writer: "yu", type: "route", title: "熱海旅行：海辺でのんびりしてから、船で初島へ", mainTag: "旅行", tags: ["旅行", "自然"], date: "2026-09-14", start: "10:00", cover: "hatsushima-1",
      lead: "熱海の海辺でのんびり過ごしてから、船で初島へ渡る、海づくしの日帰りルートです。",
      spots: [
        {
          spot: "atami-beach", stay: 90, rating: 3, head: "海はいいぞ",
          note: "海はいいぞ。何もしない時間を過ごす海辺。",
          text: [
            "まずは熱海の海辺へ。駅から坂を下っていくと、目の前に海が広がります。",
            "特に何をするでもなく、海を眺めて、潮風に当たって、1〜2時間。海はいいぞ、のひと言に尽きます。",
          ],
        },
        {
          spot: "hatsushima", stay: 45, rating: 3, head: "撮影スポットがたくさん",
          note: "海を背に吊り下がる、大きなレモン。撮影スポットがたくさん。",
          text: [
            "熱海港から船で初島へ。島の遊歩道沿いに、大きなレモンのオブジェが吊り下がっています。",
            "海を背にした黄色いレモンはよく目立ち、島にはほかにも撮影スポットがたくさんあります。のんびり歩きながら、お気に入りの1枚を探してみてください。",
          ],
          photos: [P("hatsushima-1", "海を背に吊り下がるレモンのオブジェ")],
        },
      ],
      went: 24,
    },
    // 大宮のラーメン（実在の店）
    {
      id: "y5", writer: "yu", type: "spot", title: "大宮ラーメン：迷ったら、まず狼煙", mainTag: "ラーメン", tags: ["ラーメン", "グルメ"], date: "2026-11-24",
      spots: [{ spot: "r-noroshi", stay: 45, rating: 3, note: "大宮で迷ったらまずここ。11時〜22時の通し営業。",
        text: ["大宮駅の東口から歩いて行ける、狼煙の大宮店。濃厚なつけ麺で知られる埼玉の人気店です。", "ひとことで言うなら、おいしいよ。大宮でラーメンに迷ったら、まずここをすすめます。11時から22時まで通しで開いているので、昼でも夜でも寄りやすいのもうれしいところです。"] }],
      went: 15,
    },
    {
      id: "y6", writer: "yu", type: "spot", title: "大宮ラーメン：凪は煮干しがうまい", mainTag: "ラーメン", tags: ["ラーメン", "グルメ"], date: "2026-11-24",
      spots: [{ spot: "r-nagi-e", stay: 45, rating: 3, note: "煮干しがうまい。煮干し好きならここ。",
        text: ["大宮駅東口の一番街にある、ラーメン凪。", "とにかく煮干しがうまい。スープを口にした瞬間に煮干しの香りが広がる、煮干し好きにはたまらない一杯です。"] }],
      went: 11,
    },
    {
      id: "y7", writer: "yu", type: "spot", title: "大宮ラーメン：朝10時から開いている家系、武蔵家", mainTag: "ラーメン", tags: ["ラーメン", "グルメ"], date: "2026-11-24",
      spots: [{ spot: "r-musashiya", stay: 40, rating: 2, note: "朝10時から開いている家系。",
        text: ["大宮駅東口の大門町にある、家系ラーメンの武蔵家。", "朝10時から夜22時まで開いているので、早めの昼ごはんにも使えます。家系の気分の日に。"] }],
      went: 8,
    },
    {
      id: "y8", writer: "yu", type: "spot", title: "大宮ラーメン：夜遅くまで開いているジャンクガレッジ", mainTag: "ラーメン", tags: ["ラーメン", "グルメ"], date: "2026-11-24",
      spots: [{ spot: "r-junk", stay: 45, rating: 2, note: "夜遅くまで開いている、がっつりまぜそば。",
        text: ["まぜそばで知られるジャンクガレッジ。武蔵家と同じ、大門町にあります。", "夜遅くまで開いていて、日曜・祝日は24時まで。遅い時間にがっつり食べたい日に。"] }],
      went: 9,
    },
    {
      id: "y9", writer: "yu", type: "spot", title: "大宮ラーメン：葱次郎はチャーハンが美味い", mainTag: "ラーメン", tags: ["ラーメン", "グルメ"], date: "2026-11-24",
      spots: [{ spot: "r-negijiro", stay: 45, rating: 3, note: "ラーメンと一緒に、チャーハンを。",
        text: ["大宮駅の西口側、桜木町にある葱次郎。", "ラーメンはもちろんですが、ここで推したいのはチャーハン。ラーメンと一緒に、ぜひ頼んでほしい一品です。昼と夜で営業時間が分かれているので（15時〜17時は中休み）、時間に気をつけて。"] }],
      went: 10,
    },

    /* ===== ゆう：ほかの記録（仮） ===== */
    {
      id: "y1", writer: "yu", type: "route", title: "大宮で、建築と煮干しラーメンの1日", mainTag: "旅行", tags: ["旅行", "ラーメン", "図書館建築"], date: "2026-11-08", start: "10:00",
      spots: [
        { spot: "omiya-lib", stay: 60, rating: 3, note: "朝いちばんに。明るい閲覧席で今日の予定を確認。" },
        { spot: "hikawa", stay: 45, rating: 3, note: "長い参道を歩くだけで気持ちが切り替わる。" },
        { spot: "r-akari", stay: 40, rating: 3, note: "昼はここ。澄んだ煮干しのスープ。" },
        { spot: "railway", stay: 120, rating: 3, note: "午後はじっくり。閉館は早めなので注意。" },
        { spot: "omiya-park", stay: 40, rating: 2, note: "夕方の散歩で締める。" },
      ],
      went: 41,
    },
    { id: "y2", writer: "yu", type: "route", title: "金沢、図書館と海の1日", mainTag: "旅行", tags: ["旅行", "図書館建築"], date: "2026-09-21", start: "09:30", spots: [{ spot: "lib-umimirai", stay: 60, rating: 3, note: "朝の光がきれい。" }, { spot: "lib-ishikawa", stay: 90, rating: 3, note: "午後はここで長居。" }], went: 19 },

    // みなみ：大宮のラーメン（架空の店・1か所の記録）
    { id: "m1", writer: "minami", type: "spot", title: "凪草：やさしい煮干し", mainTag: "ラーメン", tags: ["ラーメン"], date: "2026-11-01", spots: [{ spot: "r-nagi", rating: 3, note: "煮干しが好きなら一度は。昼だけの営業なので早めに。" }], went: 33 },
    { id: "m2", writer: "minami", type: "spot", title: "しろがね：濃い煮干し", mainTag: "ラーメン", tags: ["ラーメン"], date: "2026-10-15", spots: [{ spot: "r-shirogane", rating: 2, note: "濃いめ。駅から少し歩く。" }], went: 21 },
    { id: "m3", writer: "minami", type: "spot", title: "一角家：王道の家系", mainTag: "ラーメン", tags: ["ラーメン"], date: "2026-09-30", spots: [{ spot: "r-ikkaku", rating: 2, note: "家系の気分のときに。" }], went: 40 },
    { id: "m4", writer: "minami", type: "spot", title: "灯：澄んだ煮干し", mainTag: "ラーメン", tags: ["ラーメン"], date: "2026-09-02", spots: [{ spot: "r-akari", rating: 3, note: "駅からすぐ。澄んだスープ。" }], went: 52 },
    { id: "m5", writer: "minami", type: "spot", title: "ことり：鶏白湯", mainTag: "ラーメン", tags: ["ラーメン"], date: "2026-08-20", spots: [{ spot: "r-kotori", rating: 2, note: "煮干しが苦手な友だちと行くなら。" }], went: 11 },

    // 公式：スタンプラリー（架空）
    { id: "o1", writer: "official", type: "route", official: true, stamp: true, title: "大宮 歴史と鉄道のスタンプラリー（架空の企画）", mainTag: "旅行", tags: ["旅行", "歴史"], date: "2026-11-01", start: "10:00", spots: [{ spot: "hikawa", stay: 40, rating: 3, note: "スタンプ1：参道の入口" }, { spot: "omiya-park", stay: 30, rating: 3, note: "スタンプ2：公園の池のほとり" }, { spot: "bonsai", stay: 50, rating: 3, note: "スタンプ3：盆栽の庭" }, { spot: "railway", stay: 90, rating: 3, note: "スタンプ4：ゴール" }], went: 310 },

    // その他のタグ（AIで作った仮の記録）
    { id: "h1", writer: "haru", type: "route", title: "下北沢、古着と喫茶のはしご", mainTag: "古着", tags: ["古着", "カフェ"], date: "2026-10-05", start: "13:00", spots: [{ spot: "shimokita-1", stay: 90, rating: 3, note: "細い路地ほど掘り出し物がある。" }, { spot: "shimokita-2", stay: 45, rating: 2, note: "歩き疲れたらここ。" }], went: 18 },
    { id: "s1", writer: "sora", type: "spot", title: "夕方の踏切", mainTag: "聖地巡礼", tags: ["聖地巡礼"], date: "2026-08-15", spots: [{ spot: "kamakura", rating: 3, note: "作品と同じ時間帯に。人が多いので譲り合って。" }], went: 64 },
    { id: "a1", writer: "aoi", type: "spot", title: "朝いちばんの高尾山", mainTag: "自然", tags: ["自然"], date: "2026-10-26", spots: [{ spot: "takao", rating: 3, note: "朝7時台なら静か。" }], went: 25 },
    { id: "a2", writer: "aoi", type: "spot", title: "盆栽の小宇宙", mainTag: "美術館", tags: ["美術館"], date: "2026-07-07", spots: [{ spot: "bonsai", rating: 3, note: "庭の盆栽は撮影できる。" }], went: 8 },
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
      { spot: "lib-toyama", memo: "エスカレーターで上りながら撮る" },
    ],
  };

  const data = { TAGS, writers, spots, records, viewer };
  if (typeof module !== "undefined") module.exports = data;
  if (typeof window !== "undefined") window.TAM_DATA = data;
})();
