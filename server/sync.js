#!/usr/bin/env node
// Trainerbank – Online-Sicherung der Spielstände.
// Ein Spielstand gehört zu einem zufälligen Code (z. B. 7K4M-Q2XH). Kein Konto, keine E-Mail,
// keine persönlichen Daten: gespeichert werden nur der Spielstand und ein paar Angaben dazu
// (Verein, Saison, Spieltag, Zeitpunkt). Codes, die ein Jahr lang nicht benutzt wurden, werden gelöscht.
//
// Start:  PORT=8787 DATA=/var/lib/trainerbank node sync.js
// Läuft ohne zusätzliche Pakete (nur Node.js 18 oder neuer).

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const DATA = process.env.DATA || path.join(__dirname, 'data');
const MAX_BODY = 6 * 1024 * 1024;              // ein Spielstand darf höchstens 6 MB groß sein
const KEEP_MS = 365 * 24 * 3600 * 1000;         // unbenutzte Codes nach einem Jahr löschen
const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';  // ohne 0/O, 1/I/L – gut abzutippen
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

fs.mkdirSync(DATA, { recursive: true });

// ---------- Hilfen ----------
function newCode() {
  for (;;) {
    const b = crypto.randomBytes(8);
    let c = '';
    for (let i = 0; i < 8; i++) c += ABC[b[i] % ABC.length];
    if (!fs.existsSync(file(c))) return c;
  }
}
function norm(c) {
  c = String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (c.length !== 8) return null;
  for (const ch of c) if (ABC.indexOf(ch) < 0) return null;
  return c;
}
function file(c) { return path.join(DATA, c.slice(0, 2), c + '.json'); }
function read(c) { try { return JSON.parse(fs.readFileSync(file(c), 'utf8')); } catch (e) { return null; } }
function write(c, rec) {
  const f = file(c);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rec));
  fs.renameSync(tmp, f);
}
function cleanMeta(m) {
  m = m && typeof m === 'object' ? m : {};
  const s = (v, n) => String(v == null ? '' : v).slice(0, n);
  return { team: s(m.team, 60), season: s(m.season, 12), round: +m.round || 0, lg: s(m.lg, 40), dev: s(m.dev, 30) };
}
function send(res, code, obj) {
  const body = obj === undefined ? '' : JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  res.end(body);
}

// ---------- Schutz gegen Durchprobieren von Codes ----------
const hits = new Map();   // ip -> {t, n, miss, made}
function ipOf(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || '?';
}
function limit(ip, kind) {
  const now = Date.now();
  let h = hits.get(ip);
  if (!h || now - h.t > 3600 * 1000) { h = { t: now, n: 0, miss: 0, made: 0 }; hits.set(ip, h); }
  h[kind]++;
  return (kind === 'n' && h.n > 600) || (kind === 'miss' && h.miss > 30) || (kind === 'made' && h.made > 20);
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (now - h.t > 3600 * 1000) hits.delete(k); }, 600 * 1000).unref();

// ---------- Alte Codes löschen ----------
function sweep() {
  const now = Date.now();
  let n = 0;
  for (const d of fs.readdirSync(DATA)) {
    const dir = path.join(DATA, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try {
        if (f.endsWith('.tmp')) { if (now - fs.statSync(p).mtimeMs > 3600 * 1000) fs.unlinkSync(p); continue; }
        const r = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (now - (r.seen || r.ts || 0) > KEEP_MS) { fs.unlinkSync(p); n++; }
      } catch (e) { }
    }
  }
  if (n) console.log(new Date().toISOString(), 'gelöscht (ein Jahr unbenutzt):', n);
}
sweep();
setInterval(sweep, 24 * 3600 * 1000).unref();

// ---------- Anfragen ----------
function body(req) {
  return new Promise((ok, no) => {
    let n = 0; const parts = [];
    req.on('data', d => { n += d.length; if (n > MAX_BODY) { no(413); req.destroy(); } else parts.push(d); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { no(400); } });
    req.on('error', () => no(400));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    const ip = ipOf(req);
    if (limit(ip, 'n')) return send(res, 429, { err: 'zu viele Anfragen' });
    const u = new URL(req.url, 'http://x');
    const p = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);   // v1 saves CODE [meta]

    if (p[0] !== 'v1') return send(res, 404, { err: 'unbekannt' });
    if (p[1] === 'health' && req.method === 'GET') return send(res, 200, { ok: true });

    if (p[1] === 'codes' && p.length === 2 && req.method === 'POST') {
      if (limit(ip, 'made')) return send(res, 429, { err: 'zu viele neue Codes' });
      const c = newCode(), now = Date.now();
      write(c, { rev: 0, ts: now, seen: now, meta: cleanMeta(), enc: '', data: '' });
      return send(res, 201, { code: c });
    }

    if (p[1] !== 'saves' || p.length < 3 || p.length > 4) return send(res, 404, { err: 'unbekannt' });
    const c = norm(p[2]);
    const rec = c && read(c);
    if (!rec) { if (limit(ip, 'miss')) return send(res, 429, { err: 'zu viele falsche Codes' }); return send(res, 404, { err: 'Code nicht gefunden' }); }
    const now = Date.now();

    if (p[3] === 'meta' && req.method === 'GET') {
      rec.seen = now; write(c, rec);
      return send(res, 200, { rev: rec.rev, ts: rec.ts, meta: rec.meta, size: rec.data.length });
    }
    if (p.length !== 3) return send(res, 404, { err: 'unbekannt' });

    if (req.method === 'GET') {
      rec.seen = now; write(c, rec);
      return send(res, 200, rec.rev ? { rev: rec.rev, ts: rec.ts, meta: rec.meta, enc: rec.enc, data: rec.data } : { rev: 0, ts: rec.ts, meta: rec.meta });
    }
    if (req.method === 'PUT') {
      let b;
      try { b = await body(req); } catch (e) { return send(res, e === 413 ? 413 : 400, { err: e === 413 ? 'Spielstand zu groß' : 'ungültig' }); }
      if (typeof b.data !== 'string' || !b.data || (b.enc !== 'gz64' && b.enc !== 'json')) return send(res, 400, { err: 'ungültig' });
      // Wurde inzwischen auf einem anderen Gerät gesichert? Dann nicht still überschreiben.
      if (!b.force && rec.rev && +b.base !== rec.rev) return send(res, 409, { rev: rec.rev, ts: rec.ts, meta: rec.meta });
      const next = { rev: rec.rev + 1, ts: now, seen: now, meta: cleanMeta(b.meta), enc: b.enc, data: b.data };
      write(c, next);
      return send(res, 200, { rev: next.rev, ts: next.ts });
    }
    if (req.method === 'DELETE') {
      try { fs.unlinkSync(file(c)); } catch (e) { }
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { err: 'nicht erlaubt' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { err: 'Serverfehler' });
  }
});
server.listen(PORT, HOST, () => console.log('Trainerbank-Sync läuft auf', HOST + ':' + PORT, 'Daten in', DATA));
