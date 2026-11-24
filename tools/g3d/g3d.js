import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const L = 105, WD = 68, RW = 368, RH = 224;
const G = { ok: false, err: null }; let EV = {};
window.G3D = G;
let R, SC, CAM, BASE, CLIPS = {}, PITCH, PCV, PKEY = '', CROWD = [], CRT = [], NETS = [], BALL, BSH, ADS = [], ADKEY = '';
const ENT = new Map(); let SUN, FANKEY = '', LASTOWN = null, BPH = 0; const BOFF = { x: 0, z: 0 }; let FRAME = 0, LASTPASS = null, HEADED = null, CAMX = 0, CAMZ = 0, CAMT = null, LT = 0;
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);

function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
const lam = (o) => new THREE.MeshLambertMaterial(Object.assign({ flatShading: true }, o));
function box(w, h, d, m, x, y, z, par) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); (par || SC).add(b); return b; }

// ---------- pitch texture ----------
const PX = 16, MX = 9, MZ = 7; // px per metre, margins
function drawPitch(S) {
  const W = Math.round((L + 2 * MX) * PX), H = Math.round((WD + 2 * MZ) * PX);
  if (!PCV) PCV = cvs(W, H);
  const g = PCV.getContext('2d');
  for (let i = -2; i < 16; i++) { g.fillStyle = i % 2 ? '#2f8f43' : '#3da552'; g.fillRect((MX + i * L / 14) * PX, 0, L / 14 * PX + 1, H); }
  g.fillStyle = 'rgba(255,255,230,.035)'; for (let j = -1; j < 10; j += 2) g.fillRect(0, (MZ + j * WD / 9) * PX, W, WD / 9 * PX);
  const wear = (x, z, rx, rz, a) => { const gr = g.createRadialGradient((MX + x) * PX, (MZ + z) * PX, 0, (MX + x) * PX, (MZ + z) * PX, rx * PX); gr.addColorStop(0, 'rgba(150,140,80,' + a + ')'); gr.addColorStop(1, 'rgba(150,140,80,0)'); g.save(); g.translate((MX + x) * PX, (MZ + z) * PX); g.scale(1, rz / rx); g.translate(-(MX + x) * PX, -(MZ + z) * PX); g.fillStyle = gr; g.fillRect((MX + x - rx) * PX, (MZ + z - rx) * PX, 2 * rx * PX, 2 * rx * PX); g.restore(); };
  [0, 1].forEach(sd => { const X = sd ? L - 1.2 : 1.2; wear(X, WD / 2, 3.2, 4.2, 0.28); wear(sd ? L - 11 : 11, WD / 2, 1.4, 1.4, 0.22); wear(sd ? L - 6 : 6, WD / 2, 5, 7, 0.1); });
  wear(L / 2, WD / 2, 6, 6, 0.08);
  const eg = g.createLinearGradient(0, 0, 0, H); eg.addColorStop(0, 'rgba(0,20,0,.22)'); eg.addColorStop(0.08, 'rgba(0,20,0,0)'); eg.addColorStop(0.92, 'rgba(0,20,0,0)'); eg.addColorStop(1, 'rgba(0,20,0,.18)'); g.fillStyle = eg; g.fillRect(0, 0, W, H);
  let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < W * H / 14; i++) { const v = r(); g.fillStyle = v < .5 ? 'rgba(20,70,30,' + (.08 + v * .18) + ')' : 'rgba(200,245,170,' + ((v - .5) * .14) + ')'; g.fillRect(r() * W, r() * H, 2, 2); }
  // turf wear (game's own painted wear images)
  if (S && S.tf !== undefined && S.tf < 92 && EV.turfImg) {
    const wv = 1 - S.tf / 100, TA = [0.08, 0.30, 0.60, 0.85], lo = wv >= TA[3] ? 3 : wv >= TA[2] ? 2 : wv >= TA[1] ? 1 : 0, hi = Math.min(3, lo + 1), tt = lo === 3 ? 1 : Math.max(0, (wv - TA[lo]) / (TA[hi] - TA[lo]));
    const dT = (q, al) => { const im = EV.turfImg(q); if (!im || !im.complete || !im.naturalWidth) return; g.globalAlpha = al; g.drawImage(im, MX * PX, MZ * PX, L * PX, WD * PX); g.globalAlpha = 1; };
    if (lo > 0) dT(lo, 1); if (hi > lo) dT(hi, tt);
  }
  g.strokeStyle = 'rgba(248,252,244,.97)'; g.lineWidth = 0.13 * PX; g.lineCap = 'round';
  const X = v => (MX + v) * PX, Z = v => (MZ + v) * PX, ln = f => { g.beginPath(); f(); g.stroke(); };
  ln(() => { g.rect(X(0), Z(0), L * PX, WD * PX); g.moveTo(X(L / 2), Z(0)); g.lineTo(X(L / 2), Z(WD)); g.moveTo(X(L / 2 + 9.15), Z(WD / 2)); g.arc(X(L / 2), Z(WD / 2), 9.15 * PX, 0, 6.2832); });
  [0, 1].forEach(sd => {
    const x = v => X(sd ? L - v : v), bz0 = WD / 2 - 20.16, bz1 = WD / 2 + 20.16, az0 = WD / 2 - 9.16, az1 = WD / 2 + 9.16;
    ln(() => { g.moveTo(x(0), Z(bz0)); g.lineTo(x(16.5), Z(bz0)); g.lineTo(x(16.5), Z(bz1)); g.lineTo(x(0), Z(bz1)); g.moveTo(x(0), Z(az0)); g.lineTo(x(5.5), Z(az0)); g.lineTo(x(5.5), Z(az1)); g.lineTo(x(0), Z(az1)); });
    const cx = x(11), a = Math.acos(5.5 / 9.15);
    ln(() => { if (sd) g.arc(cx, Z(WD / 2), 9.15 * PX, Math.PI - a, Math.PI + a); else g.arc(cx, Z(WD / 2), 9.15 * PX, -a, a); });
    g.fillStyle = '#f6faf2'; g.beginPath(); g.arc(cx, Z(WD / 2), 0.13 * PX, 0, 6.2832); g.fill();
  });
  g.beginPath(); g.arc(X(L / 2), Z(WD / 2), 0.3 * PX, 0, 6.2832); g.fill();
  if (PITCH) PITCH.material.map.needsUpdate = true;
}

// ---------- crowd texture ----------
const CRC = ['#c8402f', '#e8c84a', '#3d6fcf', '#e9e4d6', '#5a6472', '#8a5a2b', '#2f9a45', '#7a3d8f', '#d9d2c2'];
function crowdCanvas(jump, home, away) {
  const c = cvs(256, 128), g = c.getContext('2d'); g.fillStyle = '#2a3039'; g.fillRect(0, 0, 256, 128);
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 128; y += 8) { g.fillStyle = '#3a424d'; g.fillRect(0, y + 6, 256, 2);
    for (let x = 0; x < 256; x += 8) { const v = r(); if (v < 0.06) continue; const up = jump && r() < 0.65 ? 2 : 0, col = v < 0.34 ? home : v < 0.42 ? away : CRC[Math.floor(r() * CRC.length)];
      const sk = ['#f0c8a0', '#d9a77c', '#a8714a', '#6e4a30'][Math.floor(r() * 4)], ox = x + Math.floor(r() * 2);
      g.fillStyle = col; g.fillRect(ox + 1, y + 3 - up, 5, 4); g.fillStyle = sk; g.fillRect(ox + 2, y - up, 3, 3);
      if (jump && up) { g.fillStyle = col; g.fillRect(ox, y - 2 - up, 1, 4); g.fillRect(ox + 6, y - 2 - up, 1, 4); } } }
  return c;
}
function stand(x, z, w, depth, rise, rows, rot, roof) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot; SC.add(grp);
  const conc = lam({ color: '#8d939b' }), dark = lam({ color: '#4a525c' });
  box(w, 1.2, 0.4, conc, 0, 0.6, 0, grp);
  const sl = Math.hypot(depth, rise), geo = new THREE.PlaneGeometry(w, sl);
  const m = new THREE.MeshLambertMaterial({ map: CRT[0] }); CROWD.push({ m, w, rows });
  const q = new THREE.Mesh(geo, m); q.position.set(0, 1.2 + rise / 2, -depth / 2 - 0.2); q.rotation.x = -Math.PI / 2 + Math.atan2(rise, depth); grp.add(q);
  box(w, rise + 1.2, 0.6, dark, 0, (rise + 1.2) / 2, -depth - 0.5, grp);
  if (roof) {
    const rm = lam({ color: '#c9ced4' }); const rf = box(w + 2, 0.5, depth + 4, rm, 0, rise + 7, -depth / 2 + 0.5, grp); rf.rotation.x = -0.06;
    for (let i = 0; i <= 6; i++) box(0.5, rise + 6.5, 0.5, lam({ color: '#6b7380' }), -w / 2 + i * w / 6, (rise + 6.5) / 2, -depth - 0.4, grp);
    box(w + 2, 1.2, 0.3, lam({ color: '#12356f' }), 0, rise + 6.2, 2.5, grp);
  }
  return grp;
}
function boardTex(img, i) {
  const c = cvs(128, 24), g = c.getContext('2d'); g.fillStyle = ['#0b1622', '#12356f', '#f4efe1', '#b3241a', '#1e7a38'][i % 5]; g.fillRect(0, 0, 128, 24);
  if (img && img.complete && img.naturalWidth) { const k = Math.min(124 / img.naturalWidth, 22 / img.naturalHeight); const w = img.naturalWidth * k, h = img.naturalHeight * k; g.fillStyle = '#f4efe1'; g.fillRect(0, 0, 128, 24); g.drawImage(img, 64 - w / 2, 12 - h / 2, w, h); }
  else { g.fillStyle = i % 5 === 2 ? '#12356f' : '#f4efe1'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TRAINERBANK', 64, 13); }
  return tex(c);
}
function buildBoards() {
  ADS.forEach(b => SC.remove(b)); ADS = [];
  const ims = (EV.adBoards ? EV.adBoards() : []) || [];
  const mats = []; for (let i = 0; i < Math.max(5, ims.length); i++) mats.push(new THREE.MeshLambertMaterial({ map: boardTex(ims[i % Math.max(1, ims.length)], i) }));
  const side = lam({ color: '#0b1622' }); let k = 0;
  const put = (x, z, ry, w) => { const m = [side, side, side, side, mats[k++ % mats.length], side]; const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.15), m); b.position.set(x, 0.45, z); b.rotation.y = ry; SC.add(b); ADS.push(b); };
  for (let x = -54; x < 54; x += 6) put(x + 3, -WD / 2 - 4, 0, 6);
  for (let x = -54; x < 54; x += 6) put(x + 3, WD / 2 + 4, Math.PI, 6);
  for (let z = -30; z < 30; z += 6) { if (Math.abs(z + 3) < 6) continue; put(-L / 2 - 5, z + 3, Math.PI / 2, 6); put(L / 2 + 5, z + 3, -Math.PI / 2, 6); }
}
let NETT = null;
function netTex() {
  if (NETT) return NETT;
  const c = cvs(32, 32), g = c.getContext('2d'); g.clearRect(0, 0, 32, 32); g.fillStyle = 'rgba(248,250,252,0.95)';
  g.fillRect(0, 0, 32, 3); g.fillRect(0, 0, 3, 32); g.fillStyle = 'rgba(200,206,214,0.6)'; g.fillRect(0, 3, 32, 1); g.fillRect(3, 0, 1, 32);
  NETT = new THREE.CanvasTexture(c); NETT.colorSpace = THREE.SRGBColorSpace; NETT.wrapS = NETT.wrapT = THREE.RepeatWrapping;
  NETT.magFilter = THREE.NearestFilter; NETT.minFilter = THREE.LinearMipmapLinearFilter; NETT.anisotropy = 4; return NETT;
}
function netMat(rx, ry) { const t = netTex().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }); }
function quad(a, b, c, d, rx, ry) { // corners in order, uv 0..1
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); return new THREE.Mesh(g, netMat(rx, ry));
}
function rod(a, b, r, m, par) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L2 = A.distanceTo(B); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L2, 8), m); c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); c.castShadow = true; par.add(c); return c; }
function goal(sd) {
  const s = sd ? 1 : -1, x0 = s * L / 2, w = 7.32, h = 2.44, dt = 0.9, db = 2.2, M = 0.2;
  const white = lam({ color: '#ffffff' }), grey = lam({ color: '#9aa3ad' });
  const grp = new THREE.Group(); SC.add(grp);
  rod([x0, 0, -w / 2], [x0, h, -w / 2], 0.065, white, grp); rod([x0, 0, w / 2], [x0, h, w / 2], 0.065, white, grp); rod([x0, h, -w / 2 - 0.06], [x0, h, w / 2 + 0.06], 0.065, white, grp);
  const xt = x0 + s * dt, xb = x0 + s * db;
  [-1, 1].forEach(e => { rod([x0, h, e * w / 2], [xt, h, e * w / 2], 0.03, grey, grp); rod([xt, h, e * w / 2], [xb, 0, e * w / 2], 0.03, grey, grp); rod([x0, 0.02, e * w / 2], [xb, 0.02, e * w / 2], 0.03, grey, grp); });
  rod([xt, h, -w / 2], [xt, h, w / 2], 0.03, grey, grp); rod([xb, 0.02, -w / 2], [xb, 0.02, w / 2], 0.03, grey, grp);
  const net = new THREE.Group(); grp.add(net);
  const sl = Math.hypot(db - dt, h);
  net.add(quad([x0, h, -w / 2], [x0, h, w / 2], [xt, h, w / 2], [xt, h, -w / 2], w / M, dt / M));
  net.add(quad([xt, h, -w / 2], [xt, h, w / 2], [xb, 0, w / 2], [xb, 0, -w / 2], w / M, sl / M));
  [-1, 1].forEach(e => { const z = e * w / 2;
    net.add(quad([x0, 0, z], [xb, 0, z], [xt, h, z], [x0, h, z], db / M, h / M)); });
  NETS[sd] = net;
}
function mast(x, z) {
  const m = lam({ color: '#5b636e' }); box(0.8, 34, 0.8, m, x, 17, z);
  const p = box(6, 3, 0.6, lam({ color: '#2a3038' }), x, 34, z); p.lookAt(0, 0, 0);
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.4), new THREE.MeshBasicMaterial({ color: '#fffbe0' })); lt.position.copy(p.position); lt.lookAt(0, 0, 0); lt.translateZ(0.35); SC.add(lt);
}

function build() {
  R = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  R.setPixelRatio(1); R.setSize(RW, RH, false); R.outputColorSpace = THREE.SRGBColorSpace;
  SC = new THREE.Scene(); SC.background = new THREE.Color('#86b9e6'); SC.fog = new THREE.Fog('#a9c9e6', 160, 340);
  CAM = new THREE.PerspectiveCamera(26, RW / RH, 2, 400);
  SC.add(new THREE.HemisphereLight('#e6eeff', '#41613a', 1.55));
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
  SUN = new THREE.DirectionalLight('#fff4dc', 2.0); SUN.position.set(-30, 60, 40); SUN.castShadow = true; SUN.shadow.mapSize.set(1024, 1024);
  const sc0 = SUN.shadow.camera; sc0.left = -34; sc0.right = 34; sc0.top = 26; sc0.bottom = -26; sc0.near = 5; sc0.far = 140; SUN.shadow.bias = -0.0015; SUN.shadow.normalBias = 0.02;
  SC.add(SUN); SC.add(SUN.target); sky();
  drawPitch(null);
  PITCH = new THREE.Mesh(new THREE.PlaneGeometry(L + 2 * MX, WD + 2 * MZ), new THREE.MeshLambertMaterial({ map: tex(PCV) }));
  PITCH.rotation.x = -Math.PI / 2; PITCH.receiveShadow = true; SC.add(PITCH);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(220, 180), lam({ color: '#2f7d3f' })); apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02; SC.add(apron);
  const track = lam({ color: '#5d6670' });
  CRT = [tex(crowdCanvas(0, '#ffd84d', '#e0402f'), true), tex(crowdCanvas(1, '#ffd84d', '#e0402f'), true)];
  stand(0, -WD / 2 - 9, L + 20, 22, 13, 20, 0, true);
  stand(0, WD / 2 + 9, L + 20, 16, 9, 14, Math.PI, false);
  stand(-L / 2 - 11, 0, WD + 10, 18, 10, 16, Math.PI / 2, false);
  stand(L / 2 + 11, 0, WD + 10, 18, 10, 16, -Math.PI / 2, false);
  [[-1, -1, Math.PI / 4], [1, -1, -Math.PI / 4], [-1, 1, 3 * Math.PI / 4], [1, 1, -3 * Math.PI / 4]].forEach(([a, b, r]) => stand(a * (L / 2 + 13.5), b * (WD / 2 + 11.5), 17, 16, 10, 14, r, false));
  cornerFlags(); scoreboard();
  CROWD.forEach(c => { c.m.map = CRT[0].clone(); c.m.map.repeat.set(c.w / 30, c.rows / 16); c.m.map.needsUpdate = true; c.alt = CRT[1].clone(); c.alt.repeat.copy(c.m.map.repeat); c.alt.needsUpdate = true; c.base = c.m.map; });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => mast(a * (L / 2 + 14), b * (WD / 2 + 16)));
  goal(0); goal(1);
  // benches
  [-1, 1].forEach(s => { box(7, 1.6, 1.6, lam({ color: '#c9d3dc', transparent: true, opacity: 0.85 }), s * 9, 0.8, -WD / 2 - 6.6); });
  BALL = makeBall(0.19); SC.add(BALL);
  BSH = blob(0.5); SC.add(BSH);
}
const BLOBT = (() => { const c = cvs(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 2, 16, 16, 16); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); return t; })();
function makeBall(r) {
  const g = new THREE.IcosahedronGeometry(r, 2), base = new THREE.IcosahedronGeometry(1, 0).attributes.position, P = g.attributes.position, vs = [];
  for (let i = 0; i < base.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(base, i).normalize(); if (!vs.some(w => w.distanceTo(v) < 1e-3)) vs.push(v); }
  g.clearGroups(); const a = new THREE.Vector3();
  for (let t = 0; t < P.count / 3; t++) { let blk = 0; for (let k = 0; k < 3; k++) { a.fromBufferAttribute(P, t * 3 + k).normalize(); if (vs.some(w => w.distanceTo(a) < 1e-3)) blk = 1; } g.addGroup(t * 3, 3, blk); }
  return new THREE.Mesh(g, [lam({ color: '#f6f6f2' }), lam({ color: '#17181c' })]);
}
function blob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: BLOBT, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1; return m; }

// ---------- figures ----------
const SKIN = ['#f1cba4', '#e4b38a', '#cf9668', '#a36c45', '#71492c'];
const HAIRC = ['#3b2a1a', '#1b1b1b', '#c9a24b', '#7a4a22', '#5a3a22', '#2a2a2a', '#d8c28a'];
const BOOTS = ['#141414', '#141414', '#f4f4f4', '#c8302a', '#1e4fa8', '#141414'];
function nhash(p) { if (p._nh !== undefined) return p._nh; let nh = 7; const nm = (p.n || '') + (p.key || '') + (p.n ? '' : (p.T || 0)); for (let i = 0; i < nm.length; i++) nh = (Math.imul(nh, 31) + nm.charCodeAt(i)) >>> 0; if (!p.n && !p.key) nh = (nh + (p.l || 0) * 977 + Math.round((p.fy || 0) * 1000)) >>> 0; p._nh = nh; return nh; }
function looks(p) {
  const K = EV.KIT || [{ s: '#ffd84d', h: '#12356f', k: '#8fd0ff' }, { s: '#e0402f', h: '#f4efe1', k: '#c3ccd6' }];
  const nh = nhash(p), sk = SKIN[(nh >>> 3) % 7 < 4 ? (nh >>> 3) % 3 : (nh >>> 3) % 5], hair = HAIRC[(nh >>> 6) % (sk === SKIN[0] ? 7 : 3)];
  const base = { skin: sk, face: '#2a1a12', hair, leg: sk, arm: sk, glove: sk, boot: BOOTS[(nh >>> 9) % 6], pole: '#f4f4f4', flag: '#ffd21f', hs: [0, 0, 2, 2, 0, 1, 3, 0, 2, 1, 4, 0][(nh >>> 12) % 12], nh, beard: [0, 0, 0, 0, 1, 0, 2, 0, 3, 0, 0, 1][(nh >>> 21) % 12], sc: 0.95 + ((nh >>> 15) % 11) / 100, num: 0, pat: 0 };
  if (p.key === 'td_r' || p.key === 'lin') { const c0 = new THREE.Color(K[0].s), c1 = new THREE.Color(K[1].s), dist = h => { const c = new THREE.Color(h); return Math.min(Math.abs(c.r - c0.r) + Math.abs(c.g - c0.g) + Math.abs(c.b - c0.b), Math.abs(c.r - c1.r) + Math.abs(c.g - c1.g) + Math.abs(c.b - c1.b)); };
    const rs = ['#1d1f24', '#2fa84f', '#e0402f', '#7a3d8f', '#f2c400'].sort((a, b) => dist(b) - dist(a))[0]; return Object.assign(base, { shirt: rs, shorts: '#1d1f24', socks: rs, trim: '#1d1f24', boot: '#0d0d0d', flagOn: p.key === 'lin' }); }
  if (p.key === 'coach' && p.tee) return Object.assign(base, { shirt: '#f4f4f4', shorts: '#262b33', socks: '#262b33', trim: '#f4f4f4', leg: '#262b33', arm: base.skin, boot: '#101010', tee: p.tee });
  if (p.key === 'coach') return Object.assign(base, { shirt: p.col || '#262b33', shorts: '#262b33', socks: '#262b33', trim: '#f4efe1', leg: '#262b33', arm: p.col || '#262b33', boot: '#101010' });
  if (p.key === 'fan') return Object.assign(base, { shirt: p.col || '#ffd84d', shorts: '#2a3340', socks: '#2a3340', trim: p.col2 || '#12356f', leg: '#2a3340', arm: base.skin, boot: '#f4f4f4' });
  if (p.key === 'foto') return Object.assign(base, { shirt: '#3a4048', shorts: '#2a2f36', socks: '#2a2f36', trim: '#3a4048', leg: '#2a2f36', arm: '#3a4048', boot: '#101010' });
  if (p.key === 'td_m') return Object.assign(base, { shirt: '#f4efe1', shorts: '#c8302a', socks: '#f4efe1', trim: '#c8302a', leg: '#c8302a', arm: '#f4efe1', boot: '#222' });
  if (p.key === 'td_ord') return Object.assign(base, { shirt: '#ff8a1c', shorts: '#2c3440', socks: '#2c3440', trim: '#ffe14d', leg: '#2c3440', arm: '#2c3440', boot: '#222' });
  if (p.key === 'td_flz') return Object.assign(base, { shirt: sk, shorts: '#e0402f', socks: sk, trim: sk, boot: '#f4efe1' });
  const k = K[p.kit] || K[0];
  if (p.l === 0) { const kc = k.k || '#8fd0ff', spI = EV.spon ? EV.spon[p.kit === 0 ? 0 : 1] : null; return Object.assign(base, { shirt: kc, shorts: '#1d1f24', socks: kc, trim: '#1d1f24', arm: kc, glove: '#f4f4f4', num: p._no || 1, sp: spI, spk: spI && spI.complete ? spI.src.length : 0, hs: base.hs === 1 ? 0 : base.hs }); }
  if (p.tee) return Object.assign(base, { shirt: '#f4f4f4', shorts: k.h, socks: k.s, trim: k.s, tee: p.tee, num: 0 });
  const spI = EV.spon ? EV.spon[p.kit === 0 ? 0 : 1] : null; return Object.assign(base, { shirt: k.s, shorts: k.h, socks: k.s, trim: k.h, num: p._no || 0, pat: p.kit === 0 ? (k.p || 0) : 0, pc: k.pc || '#f4efe1', sp: spI, spk: spI && spI.complete ? spI.src.length : 0 });
}
const SHT = new Map();
function shirtTex(col, num, pat, pc, numCol, sp) {
  const spOk = sp && sp.complete && sp.naturalWidth;
  const key = col + num + pat + pc + numCol + (spOk ? sp.src.length + sp.src.slice(-40) : ''); if (SHT.has(key)) return SHT.get(key);
  const c = cvs(128, 128), g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 128, 128);
  g.fillStyle = pc;
  if (pat === 1) for (let x = 0; x < 128; x += 12) g.fillRect(x, 0, 6, 128);
  else if (pat === 2) for (let y = 6; y < 128; y += 20) g.fillRect(0, y, 128, 10);
  else if (pat === 3) for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 2, 128);
  else if (pat === 4) for (let x = 0; x < 128; x += 12) for (let y = 0; y < 128; y += 16) if (((x / 12) + (y / 16)) % 2) g.fillRect(x, y, 12, 16);
  if (num) { g.save(); g.translate(72, 52); g.scale(0.62, 1.15); g.font = 'bold 42px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.3)'; g.strokeText(String(num), 0, 0); g.fillStyle = numCol; g.fillText(String(num), 0, 0); g.restore(); }
  if (spOk) { const bw = 40, bh = 30, k = Math.min(bw / sp.naturalWidth, bh / sp.naturalHeight * 0.38); const w = sp.naturalWidth * k, h = sp.naturalHeight * k / 0.38;
    g.save(); g.translate(24, 47); g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3); g.drawImage(sp, -w / 2, -h / 2, w, h); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  SHT.set(key, t); return t;
}
function teeTex(txt, col) {
  const key = 'tee' + txt + col; if (SHT.has(key)) return SHT.get(key);
  const c = cvs(128, 128), g = c.getContext('2d'); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = col; g.fillRect(0, 0, 128, 10);
  [24, 72].forEach(x => { g.save(); g.translate(x, 46); g.scale(0.4, 1.6); g.font = '900 21px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; String(txt).split('\n').forEach((l, i, A) => g.fillText(l, 0, (i - (A.length - 1) / 2) * 20)); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = THREE.RepeatWrapping; SHT.set(key, t); return t;
}
const FTX = new Map();
function shade(h, k) { const c = new THREE.Color(h); c.multiplyScalar(k); return '#' + c.getHexString(); }
function faceTex(skin, hair, hs, eye, beard) {
  const key = skin + hair + hs + eye + beard; if (FTX.has(key)) return FTX.get(key);
  const c = cvs(64, 64), g = c.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 64, 64);
  const side = g.createLinearGradient(0, 0, 64, 0); side.addColorStop(0, 'rgba(60,30,15,.28)'); side.addColorStop(0.22, 'rgba(60,30,15,0)'); side.addColorStop(0.78, 'rgba(60,30,15,0)'); side.addColorStop(1, 'rgba(60,30,15,.28)'); g.fillStyle = side; g.fillRect(0, 0, 64, 64);
  const ch = g.createLinearGradient(0, 44, 0, 64); ch.addColorStop(0, 'rgba(60,30,15,0)'); ch.addColorStop(1, 'rgba(60,30,15,.16)'); g.fillStyle = ch; g.fillRect(0, 44, 64, 20);
  if (hs !== 4) { g.fillStyle = hair; g.fillRect(0, 0, 64, hs === 2 ? 7 : 9); g.fillRect(0, 0, 6, 20); g.fillRect(58, 0, 6, 20); }
  // cheeks
  g.fillStyle = 'rgba(215,80,60,.10)'; g.beginPath(); g.ellipse(17, 40, 6, 4, 0, 0, 6.3); g.ellipse(47, 40, 6, 4, 0, 0, 6.3); g.fill();
  // eye sockets
  g.fillStyle = 'rgba(70,35,20,.16)'; g.beginPath(); g.ellipse(20, 26, 8, 5, 0, 0, 6.3); g.ellipse(44, 26, 8, 5, 0, 0, 6.3); g.fill();
  // brows
  g.fillStyle = shade(hs === 4 ? '#3a2a1e' : hair, 0.8); g.save(); g.translate(20, 18); g.rotate(0.08); g.fillRect(-7, -1.5, 14, 3); g.restore(); g.save(); g.translate(44, 18); g.rotate(-0.08); g.fillRect(-7, -1.5, 14, 3); g.restore();
  // eyes
  [20, 44].forEach(x => {
    g.fillStyle = '#f3efe6'; g.beginPath(); g.ellipse(x, 26, 5.2, 3, 0, 0, 6.3); g.fill();
    g.fillStyle = eye; g.beginPath(); g.arc(x + (x < 32 ? 0.6 : -0.6), 26, 2.6, 0, 6.3); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x + (x < 32 ? 0.6 : -0.6), 26, 1.2, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 0.4 + (x < 32 ? 0.6 : -0.6), 24.6, 1, 1);
    g.strokeStyle = 'rgba(40,20,10,.85)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, 26.4, 5.4, 3.3, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  });
  // nose
  g.fillStyle = 'rgba(70,35,20,.18)'; g.beginPath(); g.moveTo(31, 27); g.lineTo(35, 40); g.lineTo(29, 40); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(31, 28, 2, 9);
  g.fillStyle = 'rgba(50,20,10,.45)'; g.fillRect(28, 40, 2, 1.5); g.fillRect(34, 40, 2, 1.5);
  // beard
  if (beard === 1) { g.fillStyle = 'rgba(' + new THREE.Color(hair).toArray().map(v => Math.round(v * 255)).join(',') + ',.35)'; g.beginPath(); g.ellipse(32, 54, 22, 12, 0, 0, 6.3); g.fill(); }
  if (beard === 2) { g.fillStyle = shade(hair, 1); g.beginPath(); g.ellipse(32, 56, 21, 11, 0, 0, 6.3); g.fill(); g.fillRect(25, 45, 14, 3); g.fillStyle = skin; g.beginPath(); g.ellipse(32, 51, 7, 3, 0, 0, 6.3); g.fill(); }
  if (beard === 3) { g.fillStyle = shade(hair, 1); g.fillRect(24, 45, 16, 3); }
  // mouth
  g.fillStyle = shade(skin, 0.72); g.beginPath(); g.ellipse(32, 51, 7, 2.4, 0, 0, 6.3); g.fill();
  g.strokeStyle = 'rgba(60,20,15,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(25.5, 50.6); g.quadraticCurveTo(32, 52.6, 38.5, 50.6); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  FTX.set(key, t); return t;
}
function lum(h) { const c = new THREE.Color(h); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; }
function makeEnt(p) {
  const o = SkeletonUtils.clone(BASE); const mats = {}, hairs = [];
  o.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.castShadow = true; const arr = Array.isArray(m.material) ? m.material : [m.material]; const nw = arr.map(x => { if (mats[x.name]) return mats[x.name]; const nm = lam({ color: x.color }); nm.name = x.name; mats[x.name] = nm; return nm; }); m.material = Array.isArray(m.material) ? nw : nw[0]; if (/^hair_/.test(m.name)) hairs.push(m); } if (/^flag/.test(m.name)) (o.userData.flags = o.userData.flags || []).push(m); });
  SC.add(o); const sh = blob(0.55); sh.material.opacity = 0.7; SC.add(sh);
  const mx = new THREE.AnimationMixer(o), acts = {};
  Object.keys(CLIPS).forEach(n => { const a = mx.clipAction(CLIPS[n]); if (!/^(idle|run|walk|cheer|hurt|hurtf|keeper|carry|miss)$/.test(n)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } acts[n] = a; });
  const e = { o, sh, mx, acts, mats, hairs, cur: null, rot: 0, px: null, pz: null, sp: 0, lk: '', one: null };
  e.acts.idle.play(); e.cur = 'idle';
  return e;
}
function paint(e, p) {
  const lk = looks(p), key = JSON.stringify(lk); if (key === e.lk) return; e.lk = key;
  ['shirt', 'shorts', 'socks', 'skin', 'hair', 'boot', 'trim', 'glove', 'face', 'pole', 'flag', 'leg', 'arm'].forEach(n => { if (e.mats[n] && lk[n]) e.mats[n].color.set(lk[n]); });
  if (e.mats.lip) e.mats.lip.color.set(lk.skin).multiplyScalar(0.78);
  if (e.mats.shirt && lk.tee) { e.mats.shirt.map = teeTex(lk.tee, lk.trim); e.mats.shirt.color.set('#ffffff'); e.mats.shirt.needsUpdate = true; }
  else if (e.mats.shirt) { e.mats.shirt.map = shirtTex(lk.shirt, lk.num, lk.pat, lk.pc || '#fff', lum(lk.shirt) > 0.55 ? '#16181d' : '#f6f6f2', lk.sp); e.mats.shirt.color.set('#ffffff'); e.mats.shirt.needsUpdate = true; }
  if (e.mats.facepl) { const nh2 = lk.nh || 0; e.mats.facepl.map = faceTex(lk.skin, lk.hair, lk.hs, ['#5a3a1e', '#3d2716', '#4f7bb0', '#5c7a3e', '#2a1a10'][(nh2 >>> 18) % 5], lk.beard || 0); e.mats.facepl.color.set('#ffffff'); e.mats.facepl.needsUpdate = true; }
  e.hairs.forEach(m => { m.visible = m.name === 'hair_' + lk.hs; });
  (e.o.userData.flags || []).forEach(m => { m.visible = !!lk.flagOn; });
  e.o.scale.setScalar(lk.sc);
}
function play(e, n, opt) {
  opt = opt || {}; const a = e.acts[n]; if (!a) return;
  if (e.cur === n && !opt.restart) { if (opt.ts !== undefined) a.timeScale = opt.ts; return; }
  const prev = e.acts[e.cur]; a.reset(); a.timeScale = opt.ts !== undefined ? opt.ts : 1;
  if (opt.rev) { a.time = a.getClip().duration; a.timeScale = -Math.abs(a.timeScale); }
  if (opt.off !== undefined) a.time = (opt.off % 1) * a.getClip().duration;
  a.play(); if (prev && prev !== a) prev.crossFadeTo(a, opt.fade !== undefined ? opt.fade : 0.12, false);
  e.cur = n;
}
const ACTMAP = { push: 'push', elbow: 'push', pull: 'push', kick: 'kick', slide: 'slide', fall: 'fall', fallf: 'fallf', hurt: 'hurt', hurtf: 'hurtf', up: 'fall', upf: 'fallf', cheer: 'cheer' };
function W2(x, y, flip) { return [(flip ? -1 : 1) * (x - 0.5) * L, (y - 0.5) * WD]; }

function stepEnt(p, S, dt, flip, onePass) {
  let e = ENT.get(p); if (!e) { e = makeEnt(p); ENT.set(p, e); if (p.key === 'foto') { const hb = e.o.getObjectByName('head'); if (hb) { const cb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), lam({ color: '#15171a' })); cb.position.set(0, 0.17, -0.14); hb.add(cb); const ln = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.3), lam({ color: '#2b2f35' })); ln.position.set(0, 0.17, -0.38); hb.add(ln); } } }
  e.seen = FRAME; paint(e, p);
  const vis = !p.hide && p.key !== 'str'; e.o.visible = vis; e.sh.visible = vis;
  if (!vis) return e;
  const [x, z] = W2(p.x, p.y, flip);
  let vx = 0, vz = 0; if (e.px !== null && dt > 0) { vx = (x - e.px) / dt; vz = (z - e.pz) / dt; }
  e.px = x; e.pz = z; const spd = Math.hypot(vx, vz); e.sp += (spd - e.sp) * Math.min(1, dt * 8);
  e.o.position.set(x, 0, z); e.sh.position.set(x, 0.03, z);
  // facing
  let want = e.rot;
  const ac = p.act || (p.down ? { a: 'hurt' } : null);
  if (ac && ac.flip !== undefined && ACTMAP[ac.a]) want = (ac.flip ? -1 : 1) * (flip ? -1 : 1) * Math.PI / 2;
  else if (spd > 1.5) want = Math.atan2(vx, vz);
  else if (p.face !== undefined) want = p.face;
  else { const [bx, bz] = W2(S.bx, S.by, flip); if (Math.hypot(bx - x, bz - z) > 1) want = Math.atan2(bx - x, bz - z); }
  let d = want - e.rot; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  e.rot += d * Math.min(1, dt * (ac ? 30 : 9)); e.o.rotation.y = e.rot;
  // animation choice
  if (ac && ACTMAP[ac.a]) { const rv = ac.a === 'up' || ac.a === 'upf'; play(e, ACTMAP[ac.a], { rev: rv, ts: rv ? 1.4 : 1 }); e.one = null; }
  else if (p.card) play(e, 'card');
  else if (p.cel) play(e, 'cheer');
  else if (e.one && e.acts[e.one].isRunning()) { }
  else if (p.key === 'str' || p.carry) play(e, 'carry');
  else if (e.sp > 2.2) { const ts = Math.min(2.0, 0.55 + e.sp / 9); if (e.sp > 6) play(e, 'run', { ts }); else play(e, 'walk', { ts: 0.6 + e.sp / 5 }); }
  else if (p.pose) play(e, p.pose, { ts: p.pts || 1 });
  else play(e, p.l === 0 && !p.key ? 'keeper' : 'idle');
  return e;
}
function oneShot(e, n) { if (!e) return; e.one = n; play(e, n, { restart: true, fade: 0.06, ts: 1.3 }); }

function nearestTo(S, x, y) { let b = null, bd = 1e9; S.pl.forEach(p => { const d = Math.hypot((p.x - x) * L, (p.y - y) * WD); if (d < bd) { bd = d; b = p; } }); return bd < 6 ? b : null; }

G._portrait = function (list, W, H, ev) {
  if (ev) EV = ev;
  R.setSize(W, H, false); CAM.aspect = W / H; CAM.fov = 20; CAM.updateProjectionMatrix();
  const ents = list.map((p, i) => { const e = makeEnt(p); paint(e, p); e.o.position.set((i - (list.length - 1) / 2) * 0.62, 0, 0); e.o.rotation.y = p.ry !== undefined ? p.ry : 0.35; e.sh.visible = false; play(e, p.anim || 'idle'); e.mx.update(0.3); return e; });
  CAM.position.set(0, 1.4, (ev && ev.near) || 5.6); CAM.lookAt(0, 1.3, 0); SUN.position.set(-3, 8, 8); SUN.target.position.set(0, 0, 0); SUN.target.updateMatrixWorld();
  R.render(SC, CAM); ents.forEach(e => { SC.remove(e.o); SC.remove(e.sh); }); return R.domElement.toDataURL('image/png');
};
G.init = function (buf) {
  try {
    build();
    return new Promise((res, rej) => new GLTFLoader().parse(buf, '', gl => {
      BASE = gl.scene; gl.animations.forEach(a => CLIPS[a.name] = a); G.ok = true; res();
    }, e => { G.err = e; rej(e); }));
  } catch (e) { G.err = e; return Promise.reject(e); }
};
// ---------- extra people & props ----------
const XTRA = [];
function initExtras() {
  XTRA.length = 0;
  XTRA.push({ key: 'lin', n: 'lin1', x: 0.75, y: -0.018, side: 1, l: 9 }, { key: 'lin', n: 'lin2', x: 0.25, y: 1.018, side: 0, l: 9 });
  XTRA.push({ key: 'coach', n: 'coachA', x: 0.41, y: -0.075, l: 9, col: '#20242b' }, { key: 'coach', n: 'coachB', x: 0.59, y: -0.075, l: 9, col: '#3a2a22' });
  [0, 1].forEach(sd => [0.3, 0.37, 0.64, 0.71].forEach((y, k) => XTRA.push({ key: 'foto', n: 'foto' + sd + k, x: sd ? 1.064 : -0.064, y, l: 9, pose: 'keeper', pts: 0.15, sd })));
}
function stepExtras(S, dt, flip) {
  const off = S.cap && /ABSEITS/.test(S.cap.title || '');
  XTRA.forEach(p => {
    if (p.key === 'lin') {
      const half = (S.bx > 0.5) === !!p.side, tx = half ? Math.max(p.side ? 0.5 : 0.03, Math.min(p.side ? 0.97 : 0.5, S.bx + (p.side ? 0.04 : -0.04))) : p.side ? 0.6 : 0.4;
      const mv = Math.max(-dt * 0.13, Math.min(dt * 0.13, tx - p.x)); p.x += mv;
      p.card = off && half; p.face = p.side ? Math.PI : 0;
      if (Math.abs(mv) < 1e-4) p.face = p.side ^ flip ? 0 : Math.PI; else p.face = undefined;
      if (!p.card) p.face = Math.abs(mv) < 2e-4 ? (p.y < 0.5 ? 0 : Math.PI) : undefined;
    } else if (p.key === 'coach') { p.face = 0; p.pose = S.banner > 0 ? 'cheer' : undefined; }
    else if (p.key === 'foto') { p.face = (p.sd ^ flip) ? -Math.PI / 2 : Math.PI / 2; }
    stepEnt(p, S, dt, p.key === 'foto' || p.key === 'coach' ? false : flip);
  });
}
const FLAGS = [];
function cornerFlags() {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
    const x = a * L / 2, z = b * WD / 2; box(0.04, 1.5, 0.04, lam({ color: '#f4f4f4' }), x, 0.75, z);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.32), new THREE.MeshLambertMaterial({ color: b < 0 ? '#ffd21f' : '#e0402f', side: THREE.DoubleSide }));
    f.geometry.translate(0.225, 0, 0); f.position.set(x, 1.33, z); SC.add(f); FLAGS.push(f);
  });
}
const FANF = [];
function fanFlags(home, away) {
  FANF.forEach(f => SC.remove(f)); FANF.length = 0;
  const mk = (x, z, ry, c1, c2, w, h, y) => { const c = cvs(32, 16), g = c.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, 32, 16); g.fillStyle = c2; g.fillRect(0, 5, 32, 6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 8, 1), new THREE.MeshLambertMaterial({ map: tex(c), side: THREE.DoubleSide })); m.geometry.translate(w / 2, h / 2, 0); m.position.set(x, y, z); m.rotation.y = ry; m.userData.ph = Math.random() * 6; m.userData.w = w; m.userData.base = m.geometry.attributes.position.array.slice(); SC.add(m); FANF.push(m);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h + 3.2, 5), lam({ color: '#d8d8d8' })); pole.position.set(x, y + (h - 3.2) / 2 + 0.0, z); SC.add(pole); FANF.push(pole); return m; };
  for (let k = 0; k < 7; k++) mk(-L / 2 - 14 - (k % 2) * 5, -24 + k * 8, Math.PI / 2, home.s, home.h, 2.6, 1.6, 7 + (k % 2) * 3.5);
  for (let k = 0; k < 3; k++) mk(L / 2 + 15 + (k % 2) * 4, -18 + k * 18, -Math.PI / 2, away.s, away.h, 2.2, 1.4, 7 + (k % 2) * 3);
  // banners on the curve wall
  for (let k = 0; k < 4; k++) { const c = cvs(64, 12), g = c.getContext('2d'); g.fillStyle = k % 2 ? home.h : home.s; g.fillRect(0, 0, 64, 12); g.fillStyle = k % 2 ? home.s : home.h; g.fillRect(0, 4, 64, 4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshLambertMaterial({ map: tex(c) })); m.position.set(-L / 2 - 10.75, 1.25, -21 + k * 14); m.rotation.y = Math.PI / 2; SC.add(m); FANF.push(m); }
}
function waveFlags(t, fast) {
  FANF.forEach(f => { const u = f.userData; if (!u.base) return; const P = f.geometry.attributes.position, b = u.base, sp = fast ? 9 : 4;
    for (let i = 0; i < P.count; i++) { const x = b[i * 3]; P.array[i * 3 + 2] = Math.sin(t * sp + x * 2.2 + u.ph) * 0.28 * (x / u.w); } P.needsUpdate = true; f.geometry.computeVertexNormals(); });
}
let SB = null, SBKEY = '';
function scoreboard() {
  const grp = new THREE.Group(); grp.position.set(-L / 2 - 33, 14, 0); grp.rotation.y = Math.PI / 2; SC.add(grp);
  box(16.5, 5.2, 0.8, lam({ color: '#14181d' }), 0, 0, -0.5, grp);
  [-6, 6].forEach(x => box(0.6, 14, 0.6, lam({ color: '#5b636e' }), x, -7, -0.8, grp));
  const c = cvs(256, 80); const t = tex(c); t.minFilter = THREE.LinearFilter;
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 4.6), new THREE.MeshBasicMaterial({ map: t })); sc.position.z = -0.05; grp.add(sc);
  SB = { c, t };
}
function abbr(n) { n = (n || '').replace(/^(1\.\s*)?(FC|SV|TSV|VfB|VfL|SC|SpVgg|FSV|TuS|SG|BSC|SSV|Sportfreunde|Borussia|Eintracht|Fortuna|Union|Rot-Weiß|Blau-Weiß|Alemannia|Arminia|Dynamo|Hertha|Hansa|Kickers|Stuttgarter|Werder)\s+/i, ''); return n.replace(/[^A-Za-zÄÖÜäöü]/g, '').slice(0, 3).toUpperCase() || '???'; }
function updScoreboard(sc) {
  if (!SB || !sc) return; const key = sc.h + sc.hg + sc.ag + sc.a + sc.min; if (key === SBKEY) return; SBKEY = key;
  const g = SB.c.getContext('2d'); g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 80);
  g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < 80; y += 3) g.fillRect(0, y, 256, 1);
  g.font = 'bold 26px monospace'; g.textBaseline = 'middle'; g.fillStyle = '#ffd84d'; g.textAlign = 'left'; g.fillText(abbr(sc.h), 10, 30); g.textAlign = 'right'; g.fillText(abbr(sc.a), 246, 30);
  g.textAlign = 'center'; g.fillStyle = '#f4efe1'; g.font = 'bold 34px monospace'; g.fillText(sc.hg + ':' + sc.ag, 128, 30);
  g.font = 'bold 18px monospace'; g.fillStyle = '#6df09a'; g.fillText(sc.min + ".'", 128, 64);
  g.fillStyle = '#8fa0b4'; g.font = '14px monospace'; g.fillText('TRAINERBANK', 128, 64 - 0) ; g.fillStyle = '#05070a'; g.fillRect(96, 54, 64, 20); g.fillStyle = '#6df09a'; g.font = 'bold 18px monospace'; g.fillText(sc.min + "'", 128, 64);
  SB.t.needsUpdate = true;
}
function sky() {
  const c = cvs(256, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4f86c9'); gr.addColorStop(0.55, '#8fbbe6'); gr.addColorStop(1, '#d7e7f4'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 26; k++) { const x = r() * 256, y = 20 + r() * 60, w = 14 + r() * 34; g.fillStyle = 'rgba(255,255,255,' + (0.35 + r() * 0.4) + ')'; for (let q = 0; q < 5; q++) { g.beginPath(); g.ellipse(x + (q - 2) * w * 0.3, y + r() * 4, w * 0.35, w * 0.16, 0, 0, 6.3); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2;
  const m = new THREE.Mesh(new THREE.SphereGeometry(330, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })); SC.add(m);
}

G.draw = function (M, c2, cv, ev) {
  EV = ev || {};
  const S = M.sim; FRAME++;
  const now = performance.now(), dt = LT ? Math.min(0.1, (now - LT) / 1000) : 0.016; LT = now;
  const flip = !!M.flipX;
  if (!XTRA.length) initExtras();
  const pk = S.tf === undefined ? '' : String(Math.round(S.tf / 4));
  if (pk !== PKEY) { PKEY = pk; drawPitch(S); }
  const ak = (EV.adNamesNow ? EV.adNamesNow().join('|') : '') + (EV.adBoards ? EV.adBoards() : []).filter(i => i && i.complete && i.naturalWidth).length;
  if (ak !== ADKEY) { ADKEY = ak; buildBoards(); }
  const K = EV.KIT || []; const fk = K.length ? K[0].s + K[0].h + K[1].s + K[1].h : '';
  if (fk && fk !== FANKEY) { FANKEY = fk; fanFlags(K[0], K[1]); }
  updScoreboard(EV.score);
  const jump = S.banner > 0 && Math.floor(S.t * 7) % 2;
  CROWD.forEach(c => { c.m.map = jump ? c.alt : c.base; });
  waveFlags(S.t, S.banner > 0);
  FLAGS.forEach((f, i) => { f.rotation.y = Math.sin(S.t * 2.3 + i) * 0.5 + 0.6; });
  // shirt numbers
  [0, 1].forEach(T => { let n = 2; S.pl.forEach(p => { if (p.T === T && p.l > 0) { if (!p._no) { while (S['_used' + T] && S['_used' + T][n]) n++; p._no = n; (S['_used' + T] = S['_used' + T] || {})[n] = 1; } } }); });
  S.pl.concat(S.ex).forEach(p => stepEnt(p, S, dt, flip));
  stepExtras(S, dt, flip);
  // kicks & headers
  if (S.pass && S.pass !== LASTPASS) { LASTPASS = S.pass; HEADED = null; const k = LASTOWN && Math.hypot((LASTOWN.x - S.pass.x0) * L, (LASTOWN.y - S.pass.y0) * WD) < 5 ? LASTOWN : nearestTo(S, S.pass.x0, S.pass.y0); if (k) oneShot(ENT.get(k), S.bz > 3 ? 'header' : 'kick'); }
  if (S.pass && S.pass.h >= 9 && HEADED !== S.pass) { const q = S.pass.t / S.pass.dur; if (q > 0.78) { HEADED = S.pass; const h = nearestTo(S, S.pass.x1, S.pass.y1); if (h && h.l !== 0) oneShot(ENT.get(h), 'header'); else if (h) oneShot(ENT.get(h), 'jump'); } }
  if (!S.pass) LASTPASS = null;
  if (S.own) LASTOWN = S.own;
  ENT.forEach((e, p) => { if (e.seen !== FRAME) { SC.remove(e.o); SC.remove(e.sh); ENT.delete(p); } else e.mx.update(dt); });
  // ball: always in front of the player who has it
  let [bx, bz] = W2(S.bx, S.by, flip), by = 0.19 + Math.max(0, S.bz) * 0.32;
  const oe = S.own && !S.pass ? ENT.get(S.own) : null;
  if (oe && oe.o.visible && !S.own.act && !S.own.down) {
    BPH += dt * (oe.sp > 2 ? 2.2 + oe.sp * 0.12 : 0);
    const d = oe.sp > 2 ? 0.62 + 0.38 * Math.abs(Math.sin(BPH * Math.PI)) : 0.42, r = oe.rot;
    bx = oe.o.position.x + Math.sin(r) * d + Math.cos(r) * 0.08; bz = oe.o.position.z + Math.cos(r) * d - Math.sin(r) * 0.08; by = 0.19;
    BOFF.x = bx - W2(S.bx, S.by, flip)[0]; BOFF.z = bz - W2(S.bx, S.by, flip)[1];
  } else {
    BOFF.x *= Math.exp(-dt * 7); BOFF.z *= Math.exp(-dt * 7); bx += BOFF.x; bz += BOFF.z;
  }
  if (BALL.userData.px !== undefined) { const dd = Math.hypot(bx - BALL.userData.px, bz - BALL.userData.pz); if (dd > 1e-4) { const ax = new THREE.Vector3(bz - BALL.userData.pz, 0, -(bx - BALL.userData.px)).normalize(); BALL.rotateOnWorldAxis(ax, dd / 0.19); } }
  BALL.userData.px = bx; BALL.userData.pz = bz; BALL.position.set(bx, by, bz); BSH.position.set(bx, 0.035, bz); BSH.scale.setScalar(Math.max(0.35, 0.6 - by * 0.05));
  BALL.visible = S.mode !== 'cam';
  NETS.forEach((n, i) => { const side = flip ? 1 - i : i; n.position.x = S.shake > 0 && S.shakeSide !== side ? Math.sin(S.t * 50) * 0.18 * (i ? 1 : -1) : 0; });
  // TV camera
  const f = S.focus || { x: S.bx, y: S.by }; const [fx, fz] = W2(f.x, f.y, flip);
  const tx = Math.max(-45, Math.min(45, fx)), tz = Math.max(-24, Math.min(26, fz));
  CAMX += (tx - CAMX) * Math.min(1, dt * 2.2); CAMZ += (tz - CAMZ) * Math.min(1, dt * 1.6);
  const zoom = S.focus ? 0.86 : 1;
  if (CAM.fov !== 26) { CAM.fov = 26; CAM.updateProjectionMatrix(); }
  CAM.position.set(CAMX, 12.2 * zoom, CAMZ * 0.75 + 30.5 * zoom);
  CAM.lookAt(CAMX, 0, CAMZ * 0.85 - 3.5);
  SUN.target.position.set(CAMX, 0, CAMZ * 0.8); SUN.position.set(CAMX - 22, 48, CAMZ * 0.8 + 30); SUN.target.updateMatrixWorld();
  R.render(SC, CAM);
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.imageSmoothingEnabled = false; c2.drawImage(R.domElement, 0, 0, cv.width, cv.height); c2.restore();
  if (EV.names !== false) nameTags(S, c2, cv);
};
const V3 = new THREE.Vector3();
function shortName(n) { const p = String(n || '').trim().split(/\s+/); if (p.length < 2) return p[0] || ''; return p[0].charAt(0) + '. ' + p.slice(1).join(' '); }
function nameTags(S, c2, cv) {
  const cw = cv.clientWidth || cv.width, k = cv.width / cw, fs = Math.round(Math.max(9.5, Math.min(12, cw / 62)) * k);
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.font = '700 ' + fs + "px 'Space Grotesk', system-ui, sans-serif"; c2.textAlign = 'center'; c2.textBaseline = 'top'; c2.lineJoin = 'round';
  const tags = [];
  S.pl.forEach(p => { const e = ENT.get(p); if (!e || !e.o.visible || p.hide || !p.n) return;
    V3.set(e.o.position.x, 0, e.o.position.z).project(CAM); if (V3.z > 1 || V3.x < -1.1 || V3.x > 1.1 || V3.y < -1.2 || V3.y > 1.1) return;
    tags.push({ x: (V3.x + 1) / 2 * cv.width, y: (1 - V3.y) / 2 * cv.height + fs * 0.25, t: shortName(p.n), mine: p.kit === 0 }); });
  tags.sort((a, b) => a.y - b.y);
  for (let i = 0; i < tags.length; i++) for (let j = 0; j < i; j++) { const a = tags[i], b = tags[j]; if (Math.abs(a.y - b.y) < fs * 1.05 && Math.abs(a.x - b.x) < (c2.measureText(a.t).width + c2.measureText(b.t).width) / 2 + 2) a.y = b.y + fs * 1.05; }
  tags.forEach(t => { c2.lineWidth = Math.max(2, fs * 0.28); c2.strokeStyle = 'rgba(8,14,22,.85)'; c2.strokeText(t.t, t.x, t.y); c2.fillStyle = t.mine ? '#ffd84d' : '#f4efe1'; c2.fillText(t.t, t.x, t.y); });
  c2.restore();
}
// ---------- goal close-up scenes (camera behind the shooter) ----------
const PXM = 0.0333; // 2D cam pixel -> metres on the goal plane
function scr(e, name, time) {
  const a = e.acts[name]; if (!a) return;
  Object.keys(e.acts).forEach(n => { if (n !== name) { e.acts[n].stop(); } });
  if (!a.isRunning()) { a.reset(); a.play(); }
  a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(1); a.paused = false;
  const d = a.getClip().duration, loop = a.loop === THREE.LoopRepeat;
  a.time = loop ? ((time % d) + d) % d : Math.max(0, Math.min(d - 0.001, time));
  e.mx.update(0); e.cur = name;
}
function camEnt(C, key, p) { C._g3 = C._g3 || {}; if (!C._g3[key]) C._g3[key] = p; const o = C._g3[key]; let e = ENT.get(o); if (!e) { e = makeEnt(o); ENT.set(o, e); } e.seen = FRAME; paint(e, o); e.o.visible = true; e.sh.visible = true; return e; }
G.drawCam = function (M, c2, cv, ev) {
  EV = ev || {}; const S = M.sim, C = S.camSc; FRAME++;
  const now = performance.now(); LT = now;
  const AA = EV.AA, KA = EV.KA;
  // hide match players
  ENT.forEach(e => { e.o.visible = false; e.sh.visible = false; e.seen = FRAME; });
  const t = Math.max(0, C.t - (C.pre || 0)), tc = C.tc, fly = C.fly, gx = L / 2;
  const q = Math.max(0, Math.min(1.2, (t - tc) / fly)), qe = Math.min(1, q), hit = t >= tc + fly, goal = C.kind === 0 && hit;
  const left = C.side > 0, dir = left ? 1 : -1, dead = C.pen || C.fk;
  const air = C.shot === 'header' || C.shot === 'volley' || C.bike;
  // positions (x toward goal, z lateral = screen right)
  const dist = C.pen ? 11 : C.fk ? 19 : 14, runD0 = C.fk ? 2.6 : 0, lat = C.pen ? -dir * 0.4 : -dir * 1.6;
  const cpx = gx - dist, cpz = lat + (air ? dir * 0.8 : 0), cpy = C.shot === 'header' ? 2.25 : C.bike ? 2.1 : C.shot === 'volley' ? 0.85 : 0.19;
  const tz = (C.tx - 184) * PXM, ty = Math.max(0.19, (C.GL - C.ty) * PXM);
  // attacker
  const ap = { n: 'att', kit: C.ka, l: C.gk ? 0 : 3, _no: 9 };
  const A = camEnt(C, 'att', ap);
  const appr = Math.min(1, t / Math.max(0.2, tc - 0.12)), runD = C.fk ? 2.6 : dead ? 5 : 4;
  let axp = cpx - 0.55 - (1 - appr) * runD, azp = cpz - dir * 0.25 - (1 - appr) * dir * (dead ? 1.0 : 1.1);
  A.o.position.set(axp, 0, azp); A.sh.position.set(axp, 0.03, azp);
  A.o.rotation.y = appr < 1 ? Math.atan2(runD, dir * (dead ? 1.0 : 1.1)) : Math.PI / 2 - dir * 0.12;
  const kickT = C.shot === 'header' || C.bike ? 0.43 : 0.3;
  if (t < tc - kickT) scr(A, dead && t < 0.25 ? 'idle' : 'run', t * 1.3);
  else if (!hit || t < tc + 0.6) scr(A, C.shot === 'header' || C.bike ? 'header' : 'kick', t - (tc - kickT));
  else scr(A, goal ? 'cheer' : 'miss', t - tc - 0.6);
  // keeper
  const K = camEnt(C, 'kp', { n: 'kp', kit: C.kd, l: 0 });
  const kt = t - C.kt, kz0 = 0, kx = gx - 0.6;
  let kz = kz0 + (kt < 0 ? Math.sin(S.t * 4) * 0.08 : 0);
  if (kt >= 0 && (C.kp === 'high' || C.kp === 'low')) { const dv = C.kdir > 0 ? 'dive_l' : 'dive_r'; scr(K, dv, kt * 1.05); const KD = KA[C.kp]; const reach = KD[3] * PXM; kz = C.kdir * Math.max(0, Math.min(1, kt / 0.4)) * Math.max(0, reach - 1.5); }
  else if (kt >= 0 && C.kp === 'catch') scr(K, 'catch', kt);
  else if (kt >= 0 && C.kp === 'jump') scr(K, 'jump', kt);
  else scr(K, 'keeper', S.t);
  K.o.position.set(kx, 0, kz); K.o.rotation.y = -Math.PI / 2; K.sh.position.set(kx, 0.03, kz);
  // wall / defenders
  if (C.fk) { for (let i = 0; i < 4; i++) { const D = camEnt(C, 'w' + i, { n: 'w' + i, kit: C.kd, l: 2, _no: [4, 5, 6, 8][i] }); const wx = cpx + 9.15, wz = cpz + dir * 1.6 + (i - 1.5) * 0.62; D.o.position.set(wx, 0, wz); D.o.rotation.y = -Math.PI / 2 - dir * 0.15; D.sh.position.set(wx, 0.03, wz); const jt = t - (tc - 0.06); scr(D, jt > 0 ? 'jump' : 'idle', jt > 0 ? jt * 1.4 : S.t + i * 0.3); } }
  else if (!C.pen) { [[gx - 9, -3.6], [gx - 7.5, 3.4]].forEach((pp, i) => { const D = camEnt(C, 'd' + i, { n: 'd' + i, kit: C.kd, l: 2, _no: 3 + i * 2 }); D.o.position.set(pp[0], 0, pp[1]); D.o.rotation.y = -Math.PI / 2 + (i ? -0.5 : 0.5); D.sh.position.set(pp[0], 0.03, pp[1]); scr(D, 'idle', S.t + i); }); }
  // referee watching from the side in open play
  ENT.forEach(e => e.mx && e.cur && 0);
  // ball
  let bx, by, bz;
  if (t < tc) {
    if (air) { const u = Math.max(0, 1 - (tc - t) / 0.75), sx = gx - 6, sz = dir * -12; bx = sx + (cpx - sx) * u; bz = sz + (cpz - sz) * u; by = 1.2 + (cpy - 1.2) * u + Math.sin(Math.PI * u) * 3; }
    else if (dead) { bx = cpx; bz = cpz; by = 0.19; }
    else { bx = axp + 0.9; bz = azp + dir * 0.3; by = 0.19; }
  } else {
    const arc = (C.arc || 4) * PXM * 3, cur = (C.curve || 0) * PXM;
    bx = cpx + (gx - cpx) * q; bz = cpz + (tz - cpz) * q + Math.sin(Math.PI * qe) * cur; by = cpy + (ty - cpy) * q + Math.sin(Math.PI * qe) * arc;
  }
  if (C.kind === 1 && hit) { const lf = Math.min(1, (t - tc - fly) / 0.3); if (C.kp === 'catch' || C.kp === 'jump') { bx = kx - 0.35; bz = kz; by = C.kp === 'jump' ? 2.1 : 1.0; } else { bx = kx - 0.2 - lf * 1.5; bz = kz + C.kdir * (0.7 + lf * 1.2); by = Math.max(0.19, 1 - lf * 0.8); } }
  if (goal) { const gt = t - tc - fly; bx = Math.min(gx + 1.9, gx + gt * 9); bz = tz + dir * Math.min(0.3, gt); by = Math.max(0.19, ty - gt * gt * 12); }
  if ((C.kind === 2 || C.kind === 3) && q > 1) { const ot = (q - 1) * fly; if (C.kind === 2) { bx = gx - ot * 10; bz = tz + Math.sign(tz || 1) * ot * 6; by = Math.max(0.19, ty + ot * 2 - ot * ot * 10); } else { bx = gx + ot * 12; bz = tz; by = ty + ot * 4; } }
  BALL.visible = true; BALL.position.set(bx, by, bz); if (!hit || C.kind === 0) { BALL.rotation.x += 0.18; BALL.rotation.z += 0.06; } BSH.position.set(bx, 0.035, bz);
  NETS.forEach((n, i) => { n.position.x = goal && i === 1 && t < tc + fly + 0.6 ? Math.sin(S.t * 48) * 0.2 : 0; });
  const jump = goal && Math.floor(S.t * 7) % 2; CROWD.forEach(c => { c.m.map = jump ? c.alt : c.base; }); waveFlags(S.t, goal);
  // camera behind the shooter, slight follow of the ball
  const fz = hit ? tz * 0.35 : bz * 0.25;
  CAM.fov = 21; CAM.updateProjectionMatrix(); SUN.target.position.set(gx - 10, 0, 0); SUN.position.set(gx - 32, 48, 30); SUN.target.updateMatrixWorld();
  CAM.position.set(gx - (C.fk ? 33 : 26), 2.9, lat * 0.3 + fz * 0.3); CAM.lookAt(gx, 1.2, fz * 0.6);
  R.render(SC, CAM);
  c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.imageSmoothingEnabled = false; c2.drawImage(R.domElement, 0, 0, cv.width, cv.height); c2.restore();
  return { goal, left, t, tc, fly };
};

// ---------- celebrations (team photo, promotion party) ----------
function trophyMesh(plate) {
  const gold = new THREE.MeshLambertMaterial({ color: '#e8c04a', emissive: '#3a2a00' }), silver = new THREE.MeshLambertMaterial({ color: '#d8dde4', emissive: '#22262c' });
  const g = new THREE.Group();
  if (plate) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.31, 0.035, 18), silver); g.add(p); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), gold); c.position.y = 0.005; g.add(c); g.rotation.x = 1.3; }
  else { const pts = [[0.0, 0], [0.11, 0], [0.11, 0.03], [0.05, 0.06], [0.04, 0.16], [0.07, 0.2], [0.16, 0.3], [0.19, 0.45], [0.18, 0.5], [0.0, 0.5]].map(v => new THREE.Vector2(v[0], v[1]));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), gold); g.add(cup);
    [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 10, Math.PI), gold); h.position.set(s * 0.19, 0.36, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
function handPoint(e, bn) { const b = e.o.getObjectByName(bn); if (!b) return null; if (!b.userData.hand) { const h = new THREE.Object3D(); h.position.set(0, 0.27, 0); b.add(h); b.userData.hand = h; } return b.userData.hand; }
let CERS = null;
G.cerStop = function () { if (CERS) CERS.stop(); };
G.cer = function (cv, C, ev, H) {
  if (CERS) CERS.stop();
  EV = ev || {}; H = H || {};
  const c2 = cv.getContext('2d');
  // night look
  const save = { bg: SC.background, fog: SC.fog, vis: [] };
  SC.background = new THREE.Color('#0a1222'); SC.fog = new THREE.Fog('#0a1222', 150, 330);
  SC.children.forEach(o => { if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.material.side === THREE.BackSide) { save.vis.push([o, o.visible]); o.visible = false; } });
  ENT.forEach(e => { save.vis.push([e.o, e.o.visible], [e.sh, e.sh.visible]); e.o.visible = false; e.sh.visible = false; });
  save.vis.push([BALL, BALL.visible], [BSH, BSH.visible]); BALL.visible = false; BSH.visible = false;
  const hemi = SC.children.find(o => o.isHemisphereLight); const hemiI = hemi ? hemi.intensity : 1, hemiC = hemi ? hemi.color.clone() : null; if (hemi) { hemi.intensity = 0.75; hemi.color.set('#a9bcff'); }
  const sunI = SUN.intensity, sunC = SUN.color.clone(); SUN.intensity = 2.7; SUN.color.set('#ffe6bf');
  const rim = new THREE.DirectionalLight('#8fb0ff', 1.4); rim.position.set(0, 18, -40); SC.add(rim);
  const fl = new THREE.PointLight('#ffffff', 0, 30, 1.6); SC.add(fl);
  // stars
  const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 400; i++) { const a = Math.random() * Math.PI * 2, el = 0.12 + Math.random() * 0.9; sp.push(Math.cos(a) * Math.cos(el) * 300, Math.sin(el) * 300, Math.sin(a) * Math.cos(el) * 300); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 1.2, sizeAttenuation: false, fog: false })); SC.add(stars);
  const own = [stars, rim, fl];
  const add = o => { SC.add(o); own.push(o); return o; };
  const T = C.team || {}, K = EV.KIT || [], K0 = T.k1 || T.c1 || (K[0] && K[0].s) || '#ffd84d', K1 = T.k2 || T.c2 || T.k1 || (K[0] && K[0].h) || '#12356f';
  EV.KIT = [{ s: K0, h: K1, k: '#59667a', p: T.kp || 0, pc: T.kc || '#f4efe1' }, K[1] || { s: '#e0402f', h: '#f4efe1', k: '#c3ccd6' }];
  const ents = []; const mk = p => { p.kit = p.kit === undefined ? 0 : p.kit; const e = makeEnt(p); paint(e, p); ents.push([p, e]); e.p = p; return e; };
  // confetti
  const CN = 520, cg = new THREE.PlaneGeometry(0.12, 0.08), cm = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: false }), conf = new THREE.InstancedMesh(cg, cm, CN);
  const cd = [], col = new THREE.Color(), dm = new THREE.Object3D(), pal = [K0, K1, '#ffffff', '#ffd84d'];
  for (let i = 0; i < CN; i++) { const st = i % 9 === 0; cd.push({ st, x: (Math.random() - 0.5) * 22, y: 8 + Math.random() * 12, z: -9 + (Math.random() - 0.5) * 14, vy: 0.8 + Math.random() * 1.2, r: Math.random() * 6, rs: 2 + Math.random() * 5, ph: Math.random() * 6 }); conf.setColorAt(i, col.set(pal[i % 4])); }
  conf.visible = false; add(conf);
  // fireworks
  const FW = []; const fwg = new THREE.BufferGeometry(); const FWN = 900; fwg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(FWN * 3), 3)); fwg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(FWN * 3), 3));
  const fwp = add(new THREE.Points(fwg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  function burst(x, y, z) { const cc = new THREE.Color(['#ffd84d', '#ff5a3c', '#6df09a', '#8fd0ff', K0, '#ffffff'][Math.floor(Math.random() * 6)]); for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1), v = 7 + Math.random() * 5; FW.push({ x, y, z, vx: Math.sin(b) * Math.cos(a) * v, vy: Math.cos(b) * v, vz: Math.sin(b) * Math.sin(a) * v, l: 1.6 + Math.random() * 0.6, c: cc }); } if (FW.length > FWN) FW.splice(0, FW.length - FWN); }
  function fwStep(dt) { const P = fwg.attributes.position.array, Cc = fwg.attributes.color.array; let n = 0; for (let i = FW.length - 1; i >= 0; i--) { const f = FW[i]; f.l -= dt; if (f.l <= 0) { FW.splice(i, 1); continue; } f.vy -= 6 * dt; f.vx *= 0.985; f.vz *= 0.985; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; } FW.forEach((f, i) => { P[i * 3] = f.x; P[i * 3 + 1] = f.y; P[i * 3 + 2] = f.z; const k = Math.min(1, f.l); Cc[i * 3] = f.c.r * k; Cc[i * 3 + 1] = f.c.g * k; Cc[i * 3 + 2] = f.c.b * k; n = i + 1; }); fwg.setDrawRange(0, n); fwg.attributes.position.needsUpdate = true; fwg.attributes.color.needsUpdate = true; }
  // water / smoke particles
  const PN = 400, pg2 = new THREE.BufferGeometry(); pg2.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(PN * 3), 3)); pg2.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(PN * 3), 3));
  const parts = add(new THREE.Points(pg2, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }))); const PS = [];
  function pStep(dt) { const P = pg2.attributes.position.array, Cc = pg2.attributes.color.array; for (let i = PS.length - 1; i >= 0; i--) { const q = PS[i]; q.l -= dt; if (q.l <= 0) { PS.splice(i, 1); continue; } q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; } PS.slice(0, PN).forEach((q, i) => { P[i * 3] = q.x; P[i * 3 + 1] = q.y; P[i * 3 + 2] = q.z; Cc[i * 3] = q.c.r; Cc[i * 3 + 1] = q.c.g; Cc[i * 3 + 2] = q.c.b; }); pg2.setDrawRange(0, Math.min(PN, PS.length)); pg2.attributes.position.needsUpdate = true; pg2.attributes.color.needsUpdate = true; }
  let flash = 0, t = 0, last = performance.now(), alive = true, shown = false, shot = false;
  const reveal = () => { if (!shown) { shown = true; H.reveal && H.reveal(); } };
  const party = C.mode === 'party';
  const sq = (party ? C.squad : [].concat(...(C.rows || []))) || [];
  // ---------- team photo ----------
  let photo = null, P = null;
  if (!party) {
    const plate = /MEISTER/.test(C.title || '') && !/EUROPA|WELT/.test(C.title || ''), tro = add(trophyMesh(plate)); tro.scale.setScalar(1.5);
    const stage = add(box(14, 0.5, 1.6, lam({ color: '#20283a' }), 0, 0.25, -9.4)); stage.receiveShadow = true;
    const bc = cvs(256, 32), bg = bc.getContext('2d'); bg.fillStyle = K1; bg.fillRect(0, 0, 256, 32); bg.fillStyle = K0; bg.fillRect(0, 26, 256, 6); bg.font = 'bold 18px Arial'; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.fillStyle = '#ffffff'; bg.fillText(String(C.title || '').slice(0, 26), 128, 14);
    const ban = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 0.5), new THREE.MeshBasicMaterial({ map: tex(bc) }))); ban.position.set(0, 0.25, -8.59);
    const RZ = [-9.4, -8.3, -7.3], RY = [0.5, 0, 0];
    (C.rows || []).forEach((r, k) => { const m = r.length + (k === 1 && C.coach ? 1 : 0), spc = Math.min(0.72, 13 / Math.max(1, m));
      r.forEach((pl, j) => { const x = (j - (m - 1) / 2) * spc, p = { n: pl.n, l: pl.p === 0 ? 0 : 2, _no: pl.sn || 0, kit: 0, T: 0 }; const e = mk(p); p.tx = x; p.tz = RZ[k]; p.ty = RY[k]; p.row = k; p.sx = x < 0 ? -8.5 - j * 0.6 : 8.5 + (r.length - j) * 0.6; p.del = k * 0.2 + Math.random() * 0.25; p.ph = Math.random(); e.o.position.set(p.sx, 0, p.tz + 3); });
      if (k === 1 && C.coach) { const p = { n: C.coach, key: 'coach', l: 9, col: '#1f2530' }; const e = mk(p); p.tx = (r.length - (m - 1) / 2) * spc; p.tz = RZ[1]; p.ty = 0; p.row = 1; p.sx = 16; p.del = 1.0; e.o.position.set(16, 0, p.tz + 3); } });
    const cap = ents.find(([p]) => p.row === 1 && Math.abs(p.tx) < 0.5) || ents.find(([p]) => p.row === 1) || ents[0];
    for (let i = 0; i < 7; i++) { const p = { key: 'foto', n: 'f' + i, l: 9 }; const e = mk(p); const x = -6 + i * 2 + (Math.random() - 0.5); e.o.position.set(x * 0.75, 0, -0.9 + Math.random() * 0.5); e.o.rotation.y = Math.PI; p.fl = 0; p.x3 = x; }
    photo = { tro, cap: cap && cap[1] };
  } else {
    // ---------- promotion party ----------
    const fans = []; for (let i = 0; i < 44; i++) { const p = { key: 'fan', n: 'fan' + i, l: 9, col: [K0, K0, K1, '#f4f4f4', K0][i % 5], col2: K1, ph: Math.random() }; const e = mk(p); const a = Math.random() * 6.28; p.sx = Math.cos(a) * 30; p.sz = -36 + Math.random() * 4; p.tx = Math.cos(a) * (4.5 + Math.random() * 6); p.tz = 0.9 + Math.sin(a) * (3.5 + Math.random() * 4); e.o.position.set(p.sx, 0, p.sz); fans.push(p); }
    const pl = sq.slice(0, 16).map((x, j) => { const p = { n: x.n, l: 2, _no: x.sn || 0, kit: 0, T: 0, ph: Math.random(), inner: j < 8 }; const e = mk(p); const a = (j < 8 ? j / 8 : (j - 8) / 8 + 0.06) * 6.28, r = j < 8 ? 0.78 : 1.7; p.cx = Math.cos(a) * r * 1.15; p.cz = 0.9 + Math.sin(a) * r * 0.8; e.o.position.set(-6 + Math.random() * 12, 0, -3 + Math.random() * 6); p.ox = e.o.position.x; p.oz = e.o.position.z; p.j = j; return p; });
    const co = { n: C.coach || 'Trainer', key: 'coach', l: 9, col: '#1f2530' }; const ce = mk(co); ce.o.position.set(8, 0, 4);
    P = { fans, pl, co, ce, ph3: false };
  }
  const BOARD = { x: 0, y: 0 };
  function mv(e, p, tx, tz, dt, spd) { const x = e.o.position.x, z = e.o.position.z, dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz); if (d < 0.05) { return false; } const st = Math.min(d, spd * dt); e.o.position.x += dx / d * st; e.o.position.z += dz / d * st; e.o.rotation.y = Math.atan2(dx, dz); return true; }
  function step() {
    if (!alive) return;
    if (H.alive && !H.alive()) { stop(); return; }
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!party) {
      // walk in, then pose
      ents.forEach(([p, e]) => {
        if (p.key === 'foto') { p.fl = Math.max(0, p.fl - dt); const busy = t > 3.0 && (t > 4.6 && t < 5.2 ? 0.5 : shot ? 0.06 : 0.03); if (busy && Math.random() < busy * 60 * dt) { p.fl = 0.12; flash = Math.max(flash, 0.05); fl.position.set(e.o.position.x, 1.4, e.o.position.z - 0.4); fl.intensity = 60; H.shutter && Math.random() < 0.4 && H.shutter(); } play(e, 'kneel'); e.sh.position.set(e.o.position.x, 0.03, e.o.position.z); return; }
        const moving = t > p.del && mv(e, p, p.tx, p.tz, dt, 5.2);
        e.o.position.y += ((t > 2.4 ? p.ty : 0) - e.o.position.y) * Math.min(1, dt * 6);
        e.sh.position.set(e.o.position.x, e.o.position.y + 0.03, e.o.position.z);
        if (moving) play(e, 'run', { ts: 1.4 });
        else { let want = 0, d = want - e.o.rotation.y; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; e.o.rotation.y += d * Math.min(1, dt * 8);
          if (photo.cap === e && t > 3.0) play(e, 'lift');
          else if (t < 3.4) play(e, 'cheer', { ts: 0.75 + (p.ph || 0) * 0.5, off: p.ph || 0 });
          else if (t < 6.2) play(e, p.row === 2 ? 'kneel' : p.key === 'coach' ? 'armsx' : 'armsx');
          else play(e, p.row === 2 ? 'kneel' : (p.ph > 0.5 ? 'cheer' : 'lift'), { ts: 0.7 + (p.ph || 0) * 0.6, off: p.ph || 0 }); }
        e.mx.update(dt);
      });
      ents.forEach(([p, e]) => { if (p.key === 'foto') e.mx.update(dt); });
      if (t > 5.0 && !shot) { shot = true; flash = 1; H.shutter && H.shutter(6); H.cheer && H.cheer(); reveal(); }
      if (t > 0.6) conf.visible = true;
      if (t > 5.2 && Math.random() < dt * 2.2) burst((Math.random() - 0.5) * 70, 28 + Math.random() * 18, -44 - Math.random() * 10);
      // trophy in the captain's hands
      if (photo.cap) { const hl = handPoint(photo.cap, 'farm.L'), hr = handPoint(photo.cap, 'farm.R'); if (hl && hr) { const a = new THREE.Vector3(), b = new THREE.Vector3(); hl.getWorldPosition(a); hr.getWorldPosition(b); photo.tro.position.copy(a.add(b).multiplyScalar(0.5)); photo.tro.position.y += photo.tro.children.length > 2 ? 0.02 : 0.08; } photo.tro.visible = t > 2.6; }
      const push = Math.min(1, t / 6);
      CAM.fov = 27 - push * 3; CAM.updateProjectionMatrix(); CAM.position.set(Math.sin(t * 0.25) * 0.6, 2.9, 4.6 - push * 0.8); CAM.lookAt(0, 1.45, -8.6);
    } else {
      const { fans, pl, co, ce } = P;
      if (t > 0.5) reveal();
      fans.forEach(p => { const e = ents.find(x => x[0] === p)[1]; const m = mv(e, p, p.tx, p.tz, dt, 6 + (p.n.length % 3)); if (!m) { e.o.rotation.y = Math.atan2(-e.o.position.x, -e.o.position.z); play(e, p.ph > 0.7 ? 'wave' : 'cheer', { ts: 0.75 + p.ph * 0.6, off: p.ph }); } else play(e, 'run', { ts: 1.3 + p.ph * 0.4 }); e.sh.position.set(e.o.position.x, 0.03, e.o.position.z); e.o.visible = !P.ph3; e.sh.visible = !P.ph3; e.mx.update(dt); });
      if (!P.ph3) {
        const ring = t > 2.6, TS = [[3.3, 1.05], [4.35, 0.85], [5.3, 0.65]]; let toss = 0, push = 0; const held = t > 2.95 && t < 6.25;
        TS.forEach(([s0, h], j) => { const u = (t - s0) / 0.85; if (u > 0 && u < 1) toss = h * 4 * u * (1 - u); if (u > -0.18 && u < 0.12) push = 1; if (t > s0 && !P['h' + j]) { P['h' + j] = 1; H.hey && H.hey(); } });
        pl.forEach(p => { const e = ents.find(x => x[0] === p)[1]; const m = ring ? mv(e, p, p.cx, p.cz, dt, 4) : false;
          if (!m) { if (ring) e.o.rotation.y = Math.atan2(-e.o.position.x, -e.o.position.z); play(e, ring && held && p.inner ? (push || toss > 0.05 ? 'lift' : 'cheer') : 'cheer', { ts: 0.8 + p.ph * 0.5, off: p.ph }); } else play(e, 'run', { ts: 1.4 });
          e.sh.position.set(e.o.position.x, 0.03, e.o.position.z); e.mx.update(dt); });
        const cm2 = t > 1.8 && t < 2.95 && mv(ce, co, 0, 0.9, dt, 3.5);
        P.lie = P.lie || 0; P.lie += ((held ? 1 : 0) - P.lie) * Math.min(1, dt * 7);
        if (cm2) { play(ce, 'run', { ts: 1.2 }); ce.o.position.y = 0; }
        else { play(ce, 'cheer', { ts: 1.3 }); const lie = P.lie; ce.o.rotation.set(-Math.PI / 2 * lie + Math.sin(t * 3) * 0.08 * lie, 0, Math.sin(t * 2.2) * 0.12 * lie); ce.o.position.set(0, (1.55 + toss) * lie, 0.9 * lie); }
        ce.sh.position.set(0, 0.03, 0); ce.mx.update(dt);
        if (t > 6.0 && t < 7.4) { if (!P.splash) { P.splash = 1; H.splash && H.splash(); } for (let i = 0; i < 14; i++) PS.push({ x: (Math.random() - 0.5) * 0.6, y: 2.4 + Math.random() * 0.4, z: -0.6, vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random(), vz: 2.2 + Math.random(), g: 9.8, l: 0.8, c: new THREE.Color('#9fd3ff') }); }
        const sh = 0.05; CAM.fov = 30; CAM.updateProjectionMatrix(); CAM.position.set(Math.sin(t * 0.3) * 3 + Math.sin(t * 7.1) * sh, 3.4 + Math.sin(t * 5.3) * sh, 9.5 - Math.min(2, t * 0.25)); CAM.lookAt(0, 1.6, 0.9);
        if (t > 7.4) { P.ph3 = true; H.hey && H.hey(); pl.forEach((p, j) => { p.tee = C.sl ? 'AUFSTEIGER\n' + C.sl : 'AUFSTEIGER'; const e = ents.find(x => x[0] === p)[1]; e.lk = ''; paint(e, p); const n = pl.length; e.o.position.set(-L / 2 + 4.2, 0, (j - (n - 1) / 2) * 0.75); e.o.rotation.set(0, Math.PI / 2, 0); e.o.position.y = 0; }); ce.o.visible = false; ce.sh.visible = false; }
      } else {
        pl.forEach((p, j) => { const e = ents.find(x => x[0] === p)[1]; play(e, j % 3 === 1 ? 'wave' : 'cheer', { ts: 0.75 + p.ph * 0.5, off: p.ph }); e.sh.position.set(e.o.position.x, 0.03, e.o.position.z); e.mx.update(dt); });
        if (Math.random() < dt * 30) { const z = (Math.random() - 0.5) * 50; for (let i = 0; i < 2; i++) PS.push({ x: -L / 2 - 13 - Math.random() * 6, y: 3 + Math.random() * 5, z, vx: 0.4, vy: 1.2, vz: (Math.random() - 0.5) * 0.6, g: -0.3, l: 2.5, c: new THREE.Color(Math.random() < 0.5 ? '#ff5a3c' : '#c9c9c9') }); }
        if (Math.random() < dt * 1.2) burst(-L / 2 - 25 - Math.random() * 10, 28 + Math.random() * 14, (Math.random() - 0.5) * 50);
        const tt = t - 7.4; CAM.fov = 32; CAM.updateProjectionMatrix(); CAM.position.set(-L / 2 + 12.5 - Math.min(2, tt * 0.3), 2.1, Math.sin(tt * 0.35) * 2.5); CAM.lookAt(-L / 2 + 2, 1.6, 0);
      }
      conf.visible = t > 0.6;
    }
    // confetti & crowd
    if (conf.visible) { const ox = party && P.ph3 ? -L / 2 + 6 : 0, oz = party && !P.ph3 ? 0 : party ? 0 : -6; cd.forEach((q, i) => { q.y -= q.vy * dt; if (q.y < 0) q.y = 10 + Math.random() * 4; q.r += q.rs * dt; dm.position.set(ox + q.x + Math.sin(t * 2 + q.ph) * 0.3, q.y, oz + q.z); dm.rotation.set(q.r, q.r * 0.7, q.st ? Math.sin(t * 3 + q.ph) : 0); dm.scale.set(q.st ? 0.3 : 1, q.st ? 7 : 1, 1); dm.updateMatrix(); conf.setMatrixAt(i, dm.matrix); }); conf.instanceMatrix.needsUpdate = true; }
    const jump = Math.floor(t * 7) % 2; CROWD.forEach(c => { c.m.map = jump ? c.alt : c.base; }); waveFlags(t, true);
    fl.intensity *= Math.exp(-dt * 25); if (flash > 0.6) { fl.position.set(0, 2, -3); fl.intensity = 120; }
    fwStep(dt); pStep(dt);
    SUN.target.position.set(party && P.ph3 ? -L / 2 + 3 : 0, 0, party ? 0 : -8); SUN.position.set(SUN.target.position.x - 6, 30, SUN.target.position.z + 22); SUN.target.updateMatrixWorld();
    R.render(SC, CAM);
    c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.imageSmoothingEnabled = false; c2.drawImage(R.domElement, 0, 0, cv.width, cv.height);
    if (flash > 0) { c2.fillStyle = 'rgba(255,255,255,' + Math.min(1, flash) + ')'; c2.fillRect(0, 0, cv.width, cv.height); flash = Math.max(0, flash - dt * (flash > 0.5 ? 1.6 : 6)); }
    c2.restore();
    requestAnimationFrame(step);
  }
  function stop() {
    if (!alive) return; alive = false; CERS = null;
    ents.forEach(([p, e]) => { SC.remove(e.o); SC.remove(e.sh); }); own.forEach(o => SC.remove(o));
    SC.background = save.bg; SC.fog = save.fog; save.vis.forEach(([o, v]) => { o.visible = v; }); if (hemi) { hemi.intensity = hemiI; hemi.color.copy(hemiC); } SUN.intensity = sunI; SUN.color.copy(sunC);
    CAM.fov = 26; CAM.updateProjectionMatrix(); CROWD.forEach(c => { c.m.map = c.base; });
  }
  H.whistle && H.whistle(); setTimeout(() => { if (alive) H.cheer && H.cheer(); }, 400);
  requestAnimationFrame(step);
  CERS = { stop }; return CERS;
};
