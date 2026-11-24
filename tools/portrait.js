// Trainerbank – pixel portraits v2 (64x80 grid, rounded shapes, shading, outline).
// PORTRAIT.draw(ctx, x, y, scale, name, mood, opts) – deterministic from name.
// moods: neutral | block | think | happy | angry | nervous | laugh
(function () {
  const GW = 64, GH = 80;
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; }; }
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const SKIN = ['#f6d3b3', '#ecbd96', '#d6a072', '#ad7550', '#7a4b2e', '#5a3520'];
  const HAIR = ['#211915', '#3e2717', '#62401f', '#8a4a22', '#cfa24c', '#e2c27a', '#a7a29a', '#e4e0d8'];
  const SUIT = ['#1f2a44', '#2e3138', '#4a3424', '#2d4a3a', '#5a2430', '#3c4f6e', '#6b6f78'];
  const ACC = ['#c8302a', '#e8c04a', '#2f6fb0', '#2f9a45', '#7a3d8f', '#e07a2f', '#d9d2c2'];
  const BG = ['#21334f', '#2b2440', '#1f3a36', '#3a2a22', '#283246', '#33263a', '#22403f'];
  const EYEC = ['#3b2414', '#5a3a1e', '#3f6c9c', '#4f6e3a', '#2a1a10'];
  function look(name, o) {
    const r = rng(hash(name || 'x')); o = o || {};
    const fem = o.fem !== undefined ? o.fem : r() < 0.35; r();
    const age = o.age !== undefined ? o.age : (r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2);
    const sk = o.skin !== undefined ? o.skin : (r() < 0.6 ? Math.floor(r() * 3) : Math.floor(r() * 6));
    let hc = o.hair !== undefined ? o.hair : (sk >= 3 ? Math.floor(r() * 2) : Math.floor(r() * 6)); if (o.hair === undefined && age === 2) hc = r() < 0.5 ? 6 : 7; else if (o.hair === undefined && age === 1 && r() < 0.25) hc = 6;
    const hs = o.hs || (fem ? ['bob', 'long', 'bun', 'pony', 'curly', 'pixie'][Math.floor(r() * 6)] : ['short', 'side', 'bald', 'curly', 'buzz', 'slick', 'receding'][Math.floor(r() * (age === 0 ? 6 : 7))]);
    const beard = o.beard !== undefined ? o.beard : (!fem && r() < 0.45 ? ['mous', 'full', 'stub', 'goatee'][Math.floor(r() * 4)] : '');
    const glasses = o.glasses !== undefined ? o.glasses : (r() < (age === 2 ? 0.5 : 0.25) ? (r() < 0.5 ? 'sq' : 'rd') : '');
    const wear = o.wear || (r() < 0.55 ? 'suit' : ['polo', 'track', 'turtle', 'blouse'][Math.floor(r() * (fem ? 4 : 3))]);
    return { fem, age, sk, hc, hs, beard, glasses, wear, su: SUIT[Math.floor(r() * SUIT.length)], acc: ACC[Math.floor(r() * ACC.length)], bg: BG[Math.floor(r() * BG.length)], eye: EYEC[Math.floor(r() * EYEC.length)], wide: !fem && r() < 0.45, ear: fem && r() < 0.55, lip: fem && r() < 0.7 };
  }
  const CACHE = new Map();
  function render(name, mood, o) {
    const L = look(name, o);
    const key = name + '|' + mood + '|' + JSON.stringify(o || {}); if (CACHE.has(key)) return CACHE.get(key);
    const c = document.createElement('canvas'); c.width = GW; c.height = GH; const g = c.getContext('2d');
    const F = new Array(GW * GH).fill(null);
    const set = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (col && x >= 0 && y >= 0 && x < GW && y < GH) F[y * GW + x] = col; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < GW && y < GH) ? F[y * GW + x] : null;
    const rect = (x, y, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, col); };
    const ell = (cx, cy, rx, ry, fn) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, fn(x, y, dx, dy)); } };
    const SK = hx(SKIN[L.sk]), SKD = mix(SK, [60, 25, 15], 0.26), SKDD = mix(SK, [40, 15, 10], 0.42), SKL = mix(SK, [255, 245, 230], 0.2);
    const HC = hx(HAIR[L.hc]), HCD = mix(HC, [0, 0, 0], 0.35), HCL = mix(HC, [255, 250, 235], 0.28);
    const OL = [22, 14, 10];
    const cx = 32, cy = 34, rx = L.fem ? 13.2 : (L.wide ? 14.6 : 13.8), ry = 17.5;
    const isHair = p => p === HC || p === HCD || p === HCL;
    // back hair
    if (L.hs === 'long' || (L.hs === 'curly' && L.fem)) ell(cx, cy + 5, rx + 3.5, ry + 7, (x, y, dx) => y < cy + 20 ? (Math.abs(dx) > 0.75 ? HCD : HC) : null);
    if (L.hs === 'bob') ell(cx, cy + 1, rx + 3, ry + 2, (x, y, dx) => y < cy + 12 ? (dx > 0.6 ? HCD : HC) : null);
    if (L.hs === 'pony') ell(cx + 14, cy - 1, 3.5, 10, (x, y, dx) => dx > 0.3 ? HCD : HC);
    if (L.hs === 'bun') ell(cx, cy - ry - 2, 6, 5, (x, y, dx, dy) => (dx * dx + dy * dy < 0.25 && dx < 0) ? HCL : (dx > 0.4 ? HCD : HC));
    // body
    const SUc = hx(L.su), SUd = mix(SUc, [0, 0, 0], 0.3), SUl = mix(SUc, [255, 255, 255], 0.15), AC = hx(L.acc), SH = [242, 238, 228];
    const sw = L.wide ? 31 : (L.fem ? 26 : 29);
    ell(cx, GH + 2, sw, 27, (x, y, dx) => { const ax = Math.abs(x + 0.5 - cx);
      if (L.wear === 'suit') { if (ax < 3.5 && y >= 55) return L.fem ? (y < 60 ? SK : AC) : (ax < 2 && y >= 56 ? (y === 56 ? mix(AC, [0, 0, 0], 0.3) : AC) : SH); if (ax < 10 - (y - 56) * 0.5 && y >= 55) return ax < 6.5 - (y - 56) * 0.35 ? SH : SUd; return dx < -0.55 ? SUl : (dx > 0.5 ? SUd : SUc); }
      if (L.wear === 'polo') { if (ax < 2 && y < 63) return (y % 3 === 0 && y > 56) ? SH : SKD; if (y < 57 && ax < 9) return SH; return dx > 0.5 ? mix(AC, [0, 0, 0], 0.25) : AC; }
      if (L.wear === 'track') { if (ax < 1) return [200, 204, 210]; if (y > 61 && y < 64) return AC; if (y < 57 && ax < 8) return SUd; return dx > 0.5 ? SUd : SUc; }
      if (L.wear === 'blouse') { if (y < 61 && ax < 6 - (y - 55)) return SK; return dx > 0.5 ? mix(AC, [0, 0, 0], 0.2) : mix(AC, [255, 255, 255], 0.3); }
      return dx > 0.5 ? [20, 21, 25] : [32, 33, 38]; });
    // neck
    if (L.wear === 'turtle') { rect(25, 47, 14, 5, SKD); rect(23, 52, 18, 9, [32, 33, 38]); rect(23, 52, 18, 1, [52, 53, 60]); }
    else { rect(25, 47, 14, 14, SKD); rect(25, 47, 14, 3, SKDD); rect(37, 50, 2, 11, SKDD); }
    // ears
    [-1, 1].forEach(s => ell(cx + s * (rx + 0.3), cy + 1, 2.6, 4, (x, y, dx) => (s * dx > 0.2 ? SKD : SK)));
    // head
    const jaw = L.fem ? 0.42 : (L.wide ? 0.2 : 0.3);
    for (let y = Math.floor(cy - ry); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dy = (y + 0.5 - cy) / ry; let rxe = rx; if (dy > 0) rxe = rx * (1 - jaw * dy * dy * 1.1); const dx = (x + 0.5 - cx) / rxe; if (dx * dx + dy * dy > 1) continue;
      let col = SK; if (dx > 0.62 || dy > 0.84) col = SKD; if (dx > 0.82 || dy > 0.93) col = SKDD; if (dx < -0.5 && dx > -0.8 && dy < 0.1 && dy > -0.5) col = SKL; set(x, y, col); }
    if (L.ear) [-1, 1].forEach(s => { const ex = s > 0 ? Math.floor(cx + rx + 1) : Math.floor(cx - rx - 2); set(ex, cy + 5, [232, 192, 74]); set(ex, cy + 6, [250, 214, 100]); });
    // age
    if (L.age >= 1) { set(25, cy + 6, SKD); set(25, cy + 7, SKD); set(39, cy + 6, SKD); set(39, cy + 7, SKD); }
    if (L.age === 2) { rect(27, cy - 11, 4, 1, SKD); rect(33, cy - 11, 4, 1, SKD); rect(29, cy - 13, 6, 1, SKD); set(22, cy - 2, SKD); set(22, cy - 1, SKD); set(42, cy - 2, SKD); set(42, cy - 1, SKD); rect(25, cy + 9, 1, 3, SKD); rect(39, cy + 9, 1, 3, SKD); }
    // beard
    const BH = L.hc >= 6 ? hx('#cfcac2') : HC, BHD = mix(BH, [0, 0, 0], 0.3);
    if (L.beard === 'full') for (let y = cy + 3; y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const p = get(x, y); if (!p || isHair(p)) continue; if (p !== SK && p !== SKD && p !== SKDD && p !== SKL) continue; const dy = (y - cy) / ry; if (dy > 0.2 && Math.abs(x + 0.5 - cx) > (dy < 0.5 ? 8.5 : -1)) set(x, y, (x + y) % 3 ? BH : BHD); }
    if (L.beard === 'stub') for (let y = cy + 6; y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const p = get(x, y); if ((p === SK || p === SKD) && (x * 3 + y * 5) % 4 === 0) set(x, y, mix(SKD, BH, 0.4)); }
    if (L.beard === 'goatee') ell(cx, cy + 14, 3.5, 3.2, (x, y, dx) => dx > 0.4 ? BHD : BH);
    // eyes
    const EY = hx(L.eye), WH = [246, 242, 234], ey = cy, exL = 25, exR = 35;
    const openEye = (x0, look) => { rect(x0, ey, 4, 3, WH); rect(x0 + 1 + look, ey, 2, 3, EY); rect(x0 + 1 + look, ey + 1, 2, 1, [20, 12, 8]); set(x0 + 1 + look, ey, [255, 255, 255]); rect(x0 - 1, ey - 1, 6, 1, OL); set(x0 - 1, ey, OL); set(x0 + 4, ey, OL); if (L.fem) { set(x0 - 2, ey - 2, OL); set(x0 + 5, ey - 2, OL); } rect(x0, ey + 3, 4, 1, SKD); };
    const closedEye = x0 => { rect(x0, ey + 1, 4, 1, OL); set(x0 - 1, ey + 2, OL); set(x0 + 4, ey + 2, OL); };
    const flatEye = x0 => { rect(x0 - 1, ey + 1, 6, 1, OL); rect(x0, ey, 4, 1, SKD); };
    if (o && o.blink && mood !== 'laugh') { flatEye(exL); flatEye(exR); }
    else if (mood === 'laugh') { closedEye(exL); closedEye(exR); }
    else if (mood === 'block') { openEye(exL, 0); openEye(exR, 0); rect(exL - 1, ey, 6, 1, OL); rect(exR - 1, ey, 6, 1, OL); }
    else if (mood === 'nervous') { openEye(exL, 1); openEye(exR, 1); }
    else if (mood === 'think') { openEye(exL, -1); openEye(exR, -1); rect(exR - 1, ey, 6, 1, OL); }
    else if (mood === 'angry') { openEye(exL, 0); openEye(exR, 0); set(exL + 3, ey, OL); set(exL + 2, ey, OL); set(exR, ey, OL); set(exR + 1, ey, OL); }
    else { openEye(exL, 1); openEye(exR, 0); }
    // brows
    const BR = L.age === 2 ? hx('#d8d3cb') : (L.hc >= 6 ? hx('#8d877f') : mix(HC, [0, 0, 0], L.hc >= 4 ? 0.35 : 0.1));
    const brow = (x0, tilt, up) => { for (let i = 0; i < 6; i++) { const yy = Math.round(ey - 3 - up + tilt * (i - 2.5) / 2.5); set(x0 + i, yy, BR); if (!L.fem && i > 0 && i < 5) set(x0 + i, yy - 1, BR); } };
    const bL = exL - 1, bR = exR - 1;
    if (mood === 'block') { brow(bL, 1, -0.4); brow(bR, -1, -0.4); }
    else if (mood === 'angry') { brow(bL, 2, 0); brow(bR, -2, 0); }
    else if (mood === 'think') { brow(bL, 0, 2); brow(bR, 1, 0); }
    else if (mood === 'nervous') { brow(bL, -1.5, 1); brow(bR, 1.5, 1); }
    else if (mood === 'happy' || mood === 'laugh') { brow(bL, -0.6, 1); brow(bR, 0.6, 1); }
    else { brow(bL, -0.4, 0); brow(bR, 0.4, 0); }
    // glasses
    if (L.glasses) { const GC = [24, 24, 26]; [exL - 1, exR - 1].forEach(x0 => { if (L.glasses === 'sq') { rect(x0, ey - 2, 6, 1, GC); rect(x0, ey + 4, 6, 1, GC); rect(x0, ey - 2, 1, 7, GC); rect(x0 + 5, ey - 2, 1, 7, GC); } else { rect(x0 + 1, ey - 2, 4, 1, GC); rect(x0 + 1, ey + 4, 4, 1, GC); rect(x0, ey - 1, 1, 5, GC); rect(x0 + 5, ey - 1, 1, 5, GC); } set(x0 + 1, ey - 1, [210, 230, 255]); }); rect(30, ey - 1, 4, 1, GC); rect(Math.floor(cx - rx), ey - 1, 3, 1, GC); rect(Math.floor(cx + rx) - 2, ey - 1, 3, 1, GC); }
    // nose
    rect(32, ey + 2, 1, 6, SKD); set(31, ey + 8, SKDD); set(32, ey + 8, SKD); set(29, ey + 8, SKD); set(33, ey + 8, SKDD); set(31, ey + 6, SKL); set(31, ey + 5, SKL);
    // cheeks
    if (mood === 'angry' || L.fem || mood === 'laugh' || mood === 'happy') { const BL = mix(SK, [220, 70, 60], mood === 'angry' ? 0.45 : 0.22); rect(22, ey + 6, 3, 2, BL); rect(39, ey + 6, 3, 2, BL); }
    // mouth
    const M = [96, 32, 24], MD = [52, 12, 10], TE = [246, 242, 234], LIP = L.lip ? [176, 64, 72] : null, my = cy + 9;
    if (o && o.talk && mood !== 'laugh') { rect(29, my - 1, 6, 3, MD); rect(29, my - 1, 6, 1, TE); set(28, my, M); set(35, my, M); }
    else if (mood === 'happy') { rect(28, my, 8, 1, M); set(27, my - 1, M); set(36, my - 1, M); rect(29, my, 6, 1, TE); rect(29, my + 1, 6, 1, LIP || M); }
    else if (mood === 'laugh') { rect(27, my - 1, 10, 1, M); rect(27, my, 10, 3, MD); rect(28, my, 8, 1, TE); rect(29, my + 2, 6, 1, [200, 80, 76]); set(26, my - 2, M); set(37, my - 2, M); }
    else if (mood === 'block') { rect(28, my, 8, 1, M); if (LIP) rect(29, my + 1, 6, 1, LIP); }
    else if (mood === 'angry') { rect(28, my, 8, 1, M); set(27, my + 1, M); set(36, my + 1, M); }
    else if (mood === 'nervous') { [0, 1, 0, 1, 0, 1, 0, 1].forEach((d, i) => set(28 + i, my + d, M)); ell(cx + rx - 1, cy - 9, 1.6, 2.6, () => [143, 208, 255]); set(cx + rx - 2, cy - 10, [255, 255, 255]); }
    else if (mood === 'think') { rect(30, my, 6, 1, M); set(36, my - 1, M); }
    else { rect(29, my, 6, 1, M); set(28, my - 1, M); set(35, my - 1, M); if (LIP) rect(29, my + 1, 6, 1, LIP); }
    if (L.beard === 'mous' || L.beard === 'full') { rect(27, my - 2, 10, 2, BH); set(26, my - 1, BH); set(37, my - 1, BH); rect(28, my - 2, 8, 1, mix(BH, [255, 255, 255], 0.15)); }
    // hair on top
    const top = Math.floor(cy - ry);
    const cap = (hairline, sideDrop) => { for (let y = top - 4; y <= cy + sideDrop; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) { const dx = (x + 0.5 - cx) / (rx + 1.5), dy = (y + 0.5 - (cy - 1)) / (ry + 1.8); if (dx * dx + dy * dy > 1) continue; const side = Math.abs(x + 0.5 - cx) > rx - 2.2; if (y < hairline || (side && y < cy - 4 + sideDrop)) { let col = HC; if (dx > 0.45) col = HCD; if (dx < -0.15 && dx > -0.7 && dy < -0.6) col = HCL; set(x, y, col); } } };
    if (L.hs === 'short') { cap(top + 7, 0); for (let i = 0; i < 6; i++) set(27 + i, top + 7, HC); }
    else if (L.hs === 'side') { cap(top + 6, 2); for (let x = 29; x < cx + rx; x++) set(x, top + 6 + (x > 37 ? 1 : 0), HC); for (let y = top - 1; y < top + 6; y++) set(26, y, HCD); }
    else if (L.hs === 'slick') { cap(top + 6, -1); for (let x = Math.floor(cx - rx) + 2; x < cx + rx - 1; x += 3) for (let y = top - 2; y < top + 5; y++) if (isHair(get(x, y))) set(x, y, HCL); }
    else if (L.hs === 'buzz') { cap(top + 6, -2); for (let y = top - 3; y < top + 6; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) if ((x + y) % 2 && isHair(get(x, y))) set(x, y, HCD); }
    else if (L.hs === 'receding') { cap(top + 3, 3); ell(cx, top + 3, 6.5, 4.5, (x, y) => isHair(get(x, y)) ? SKL : null); }
    else if (L.hs === 'bald') { for (let y = cy - 7; y < cy + 1; y++) { set(cx - rx, y, HC); set(cx - rx + 1, y, HCD); set(cx + rx - 1, y, HCD); set(cx + rx - 2, y, HC); } [[26, top + 3], [27, top + 3], [26, top + 4]].forEach(([x, y]) => set(x, y, [255, 248, 236])); }
    else if (L.hs === 'curly') { for (let k = 0; k < 22; k++) { const a = Math.PI + (k / 21) * Math.PI; ell(cx + Math.cos(a) * (rx + 1.2), cy - 3 + Math.sin(a) * (ry + 0.5), 3.3, 3.3, (x, y, dx, dy) => (dx * dx + dy * dy < 0.3 && dx < 0) ? HCL : (dx > 0.3 ? HCD : HC)); } cap(top + 5, L.fem ? 6 : 1); for (let k = 0; k < 5; k++) ell(cx - 8 + k * 4, top + 5, 2.4, 2, (x, y, dx) => dx > 0.3 ? HCD : HC); }
    else if (L.hs === 'bob' || L.hs === 'long') { cap(top + 8, 11); for (let y = top + 5; y < top + 11; y++) for (let x = Math.floor(cx - rx); x < cx + 3; x++) if (y - top - 5 < (cx + 3 - x) * 0.45) set(x, y, HC); }
    else if (L.hs === 'pony' || L.hs === 'bun') { cap(top + 6, 2); }
    else if (L.hs === 'pixie') { cap(top + 7, 3); for (let x = Math.floor(cx - rx) + 1; x < cx + 4; x++) set(x, top + 7 + ((x * 7) % 3 === 0 ? 1 : 0), HC); }
    // outline + background
    const img = g.createImageData(GW, GH), d = img.data, bg = hx(L.bg);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = (y * GW + x) * 4; let col = F[y * GW + x];
      if (!col) { const nb = get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1); col = nb ? OL : (o && o.clear ? null : mix(bg, [255, 255, 255], (y % 4 === 0 ? 0.035 : 0) + (1 - y / GH) * 0.07)); }
      if (!col) { d[i + 3] = 0; continue; } d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); CACHE.set(key, c); return c;
  }
  function draw(g, X, Y, S, name, mood, o) { const c = render(name, mood || 'neutral', o); const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(c, X, Y, GW * S, GH * S); g.imageSmoothingEnabled = sm; return c; }
  const api = { draw, render, look, hash, GW, GH, SKIN, SUIT, MOODS: ['neutral', 'block', 'think', 'happy', 'angry', 'nervous', 'laugh'] };
  if (typeof window !== 'undefined') window.PORTRAIT = api; if (typeof module !== 'undefined') module.exports = api;
})();
