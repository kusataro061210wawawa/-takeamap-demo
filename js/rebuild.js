/* 組み直しの計算。画面とは切り離して、node でも動かせる形にしている。 */
(function () {
  const WALK_SPEED = 80;   // 分速 m
  const DETOUR = 1.3;      // 直線距離にかける係数
  const MIN_STAY = 30;     // これより短くなるなら行かない

  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const fmt = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };

  function distM(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  const walkMin = (a, b) => Math.max(1, Math.ceil((distM(a, b) * DETOUR) / WALK_SPEED));
  // 移動：歩いて2kmまで（約33分）は歩き。それより遠いときは電車・バスなど（待ち15分＋時速30km）
  const WALK_MAX_M = 2000, RIDE_SPEED = 500, RIDE_WAIT = 15;
  function moveMin(a, b) {
    const m = distM(a, b) * DETOUR;
    if (m <= WALK_MAX_M) return { min: Math.max(1, Math.ceil(m / WALK_SPEED)), mode: "walk" };
    return { min: Math.ceil((RIDE_WAIT + m / RIDE_SPEED) / 5) * 5, mode: "ride" };
  }

  function openWindow(spot) {
    if (!spot.hours) return [0, 24 * 60];
    return [toMin(spot.hours.open), toMin(spot.hours.close)];
  }
  // 中休み（rest）にかかるか。かかるなら中休みが明ける時刻を返す
  function restEnd(spot, start, stay) {
    const r = spot.hours && spot.hours.rest;
    if (!r) return null;
    const a = toMin(r[0]), b = toMin(r[1]);
    return start < b && start + Math.min(stay, MIN_STAY) > a ? b : null;
  }

  // お気に入りの書き手（タグだけのお気に入りも含む）が付けた評価を、場所ごとにまとめる
  function favoriteRatings(data) {
    const v = data.viewer, out = {};
    for (const r of data.records) {
      const full = v.favorites.includes(r.writer);
      const tagFav = (v.tagFavorites[r.writer] || []).some((t) => r.tags.includes(t));
      if (!full && !tagFav) continue;
      for (const s of r.spots) {
        const prev = out[s.spot];
        if (!prev || s.rating > prev.rating) out[s.spot] = { rating: s.rating, writer: r.writer, record: r.id };
      }
    }
    return out;
  }

  // ルートの記録から、予定（時刻つき）を作る
  function buildSchedule(data, record) {
    const byId = Object.fromEntries(data.spots.map((s) => [s.id, s]));
    let t = toMin(record.start || "10:00"), prev = null;
    return record.spots.map((rs) => {
      const spot = byId[rs.spot];
      const mv = prev ? moveMin(prev, spot) : { min: 0, mode: "walk" };
      const walk = mv.min, arrive = t + walk, depart = arrive + rs.stay;
      prev = spot; t = depart;
      return { spot: rs.spot, stay: rs.stay, walk, mode: mv.mode, arrive, depart, status: "planned" };
    });
  }

  /* 組み直し
     schedule: buildSchedule の結果
     opts: { fromIndex, nowMin, position(spotId), closedIds[], rain, delayMin, maxWalk, maxPrice } */
  function rebuild(data, schedule, opts) {
    const byId = Object.fromEntries(data.spots.map((s) => [s.id, s]));
    const fav = favoriteRatings(data);
    const closed = new Set(opts.closedIds || []);
    const maxWalk = opts.maxWalk || 30;
    const used = new Set(schedule.map((s) => s.spot));
    const out = schedule.slice(0, opts.fromIndex).map((s) => ({ ...s, status: "done" }));
    let pos = byId[opts.position || schedule[Math.max(0, opts.fromIndex - 1)].spot];
    let t = opts.nowMin + (opts.delayMin || 0);

    const fits = (spot, arrive, stay) => {
      const [o, c] = openWindow(spot);
      if (closed.has(spot.id)) return false;
      let start = Math.max(arrive, o);
      const re = restEnd(spot, start, stay);
      if (re != null) start = re;
      return start + Math.min(stay, MIN_STAY) <= c;
    };

    for (let i = opts.fromIndex; i < schedule.length; i++) {
      const orig = schedule[i], spot = byId[orig.spot];
      const mv = moveMin(pos, spot);
      let walk = mv.min, mode = mv.mode, arrive = t + walk;
      let reason = null;
      if (closed.has(spot.id)) reason = "臨時休業";
      else if (opts.rain && !spot.indoor) reason = "雨のため屋外を避ける";
      else if (!fits(spot, arrive, orig.stay)) reason = "着く時間に開いていない";

      let chosen = spot, alternatives = [], pickWhy = null;
      if (reason) {
        const tagOf = spot.kind === "ラーメン" ? "ラーメン" : spot.tags[0];
        const cands = data.spots.filter((c) => {
          if (c.id === spot.id || used.has(c.id) || closed.has(c.id)) return false;
          if (opts.rain && !c.indoor) return false;
          if (opts.maxPrice != null && c.price > opts.maxPrice) return false;
          if (spot.kind === "ラーメン") return c.kind === "ラーメン";
          if (c.kind === "ラーメン") return false;
          return fav[c.id] || c.tags.some((tg) => spot.tags.includes(tg)) || (opts.rain && c.indoor);
        }).map((c) => {
          const w = walkMin(pos, c), a = t + w;
          const f = fav[c.id];
          const why = [];
          // 選んだ理由を、あとで予定のカードに出せる形でも残す（誰が「また行きたい」か・屋内／屋外・歩く分数）
          const io = c.io || (c.indoor ? "屋内" : "屋外");
          const pickWhy = { who: null, liked: null, group: null, style: null, io, walk: w };
          let score = 0;
          if (f && f.rating === 3) { score += 100; pickWhy.who = writerName(data, f.writer); pickWhy.liked = "また行きたい"; why.push(pickWhy.who + "さんが「また行きたい」"); }
          else if (f && f.rating === 2) { score += 40; pickWhy.who = writerName(data, f.writer); pickWhy.liked = "よかった"; why.push(pickWhy.who + "さんが「よかった」"); }
          if (spot.style && c.style === spot.style) { score += 30; pickWhy.style = c.style; why.push("同じ" + c.style + "系"); }
          const g = (c.groupLikes && c.groupLikes[tagOf]) || 0;
          if (g) { score += g * 2; pickWhy.group = { tag: tagOf, n: g }; why.push(tagOf + "好き" + g + "人が「また行きたい」"); }
          score -= w * 3; why.push(io); why.push("歩いて" + w + "分");
          return { id: c.id, walk: w, arrive: a, score, why, pickWhy, ok: w <= maxWalk && fits(c, a, orig.stay) };
        }).filter((c) => c.ok).sort((a, b) => b.score - a.score);
        alternatives = cands.slice(0, 3);
        if (!cands.length) {
          out.push({ ...orig, status: "dropped", reason, arrive: null, depart: null });
          continue;
        }
        // 利用者が「ほかの候補」から選んだときは、それを使う
        let pick = cands[0];
        const pref = opts.prefer && opts.prefer[orig.spot];
        if (pref) { const p = cands.find((x) => x.id === pref); if (p) pick = p; }
        chosen = byId[pick.id];
        walk = pick.walk; mode = "walk"; arrive = pick.arrive; pickWhy = pick.pickWhy;
        used.add(chosen.id);
      }

      const [o, c] = openWindow(chosen);
      let start = Math.max(arrive, o);
      const re = restEnd(chosen, start, orig.stay);
      if (re != null) start = re;
      let stay = orig.stay, status = reason ? "replaced" : "kept";
      if (start + stay > c) {
        stay = c - start;
        if (stay < MIN_STAY) { out.push({ ...orig, status: "dropped", reason: "閉まる時間に間に合わない", arrive: null, depart: null }); continue; }
        if (!reason) status = "shortened";
      }
      const shifted = !reason && Math.abs(start - orig.arrive) >= 5;
      out.push({
        spot: chosen.id, stay, walk, mode, arrive: start, depart: start + stay,
        status: status === "kept" && shifted ? "shifted" : status,
        reason, replacedFrom: reason ? orig.spot : null, alternatives, pickWhy,
        before: { arrive: orig.arrive, stay: orig.stay },
      });
      pos = chosen; t = start + stay;
    }
    return out;
  }

  function writerName(data, id) { const w = data.writers.find((x) => x.id === id); return w ? w.name : id; }

  /* 日の入りの時刻（日本時間の 0:00 からの分）。緯度・経度と日付から、NOAA の簡易式で計算する（誤差は数分）。
     白夜・極夜で日の入りがない日は null */
  function sunsetMin(lat, lng, date = new Date()) {
    const rad = Math.PI / 180;
    const j = new Date(date.getTime() + 9 * 3600e3); // 日本時間の日付で数える
    const y = j.getUTCFullYear();
    const n = Math.round((Date.UTC(y, j.getUTCMonth(), j.getUTCDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1; // その年の何日目か
    const days = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    const g = (2 * Math.PI / days) * (n - 1 + (7 - 12) / 24); // 日の入りのころ（世界時 7時ごろ）
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const cosH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
    if (cosH > 1 || cosH < -1) return null;
    const ha = Math.acos(cosH) / rad;               // 日の入りの時角（度）
    const utc = 720 - 4 * lng + 4 * ha - eqt;       // 世界時の分（経度は東が正）
    return Math.round(((utc + 9 * 60) % 1440 + 1440) % 1440);
  }

  const api = { toMin, fmt, distM, walkMin, moveMin, restEnd, favoriteRatings, buildSchedule, rebuild, sunsetMin };
  if (typeof module !== "undefined") module.exports = api;
  if (typeof window !== "undefined") window.TAM_REBUILD = api;
})();
