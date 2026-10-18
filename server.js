"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, randomBytes, createHash, timingSafeEqual } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const root = __dirname;
const dbPath = process.env.DB_PATH || path.join(root, "data", "pixels.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,nickname TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL,created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,consent_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id),started_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,active_ms INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id),session_id TEXT NOT NULL REFERENCES sessions(id),type TEXT NOT NULL,action TEXT,species TEXT,reason TEXT,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS pets(player_id TEXT NOT NULL REFERENCES players(id),id TEXT NOT NULL,species TEXT NOT NULL,stage INTEGER NOT NULL,snapshot TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(player_id,id));
 CREATE TABLE IF NOT EXISTS collections(player_id TEXT PRIMARY KEY REFERENCES players(id),active_pet_id TEXT);
 CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player_id);
 CREATE INDEX IF NOT EXISTS events_player ON events(player_id,created_at);
 CREATE INDEX IF NOT EXISTS events_type ON events(type,action,reason);`);
const hash = (s) => createHash("sha256").update(s).digest("hex");
const adminSecret = process.env.ADMIN_PASSWORD || "";
const idOK = (s) => typeof s === "string" && /^[\w-]{1,100}$/.test(s);
const label = (s, max = 60) => typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, max) : "";
const eventTypes = new Set(["care_attempt", "care_success", "care_blocked", "hatched", "grew", "new_egg", "closet_open", "collection_open", "equip", "egg_attempt", "need_low"]);
const rates = new Map();
function limited(req, bucket, max) {
  const key = `${bucket}:${req.socket.remoteAddress}`;
  const now = Date.now();
  let slot = rates.get(key);
  if (!slot || slot.until < now) { slot = { count: 0, until: now + 60000 }; rates.set(key, slot); }
  return ++slot.count > max;
}
setInterval(() => { for (const [k, v] of rates) if (v.until < Date.now()) rates.delete(k); }, 60000).unref();
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 512000) throw Object.assign(Error("payload_too_large"), { status: 413 });
  }
  try {
    const value = JSON.parse(text || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error();
    return value;
  } catch (_) { throw Object.assign(Error("invalid_json"), { status: 400 }); }
}
function fail(message = "invalid_data") { throw Object.assign(Error(message), { status: 400 }); }
function player(req) {
  const match = (req.headers.cookie || "").match(/(?:^|;\s*)pixels_device=([a-f0-9]{64})(?:;|$)/);
  return match ? db.prepare("SELECT * FROM players WHERE token_hash=?").get(hash(match[1])) : null;
}
function sessionFor(id, user) {
  const session = idOK(id) && db.prepare("SELECT * FROM sessions WHERE id=? AND player_id=?").get(id, user.id);
  if (!session) fail("invalid_session");
  return session;
}
function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try { const value = fn(); db.exec("COMMIT"); return value; } catch (e) { db.exec("ROLLBACK"); throw e; }
}
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4" };
const publicFiles = new Set(["index.html", "styles.css", "game.js", "looks.js", "player.js", "telemetry.js", "audio.js", "sw.js", "manifest.webmanifest", "admin.html", "admin.js", "admin.css"]);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (url.pathname.startsWith("/api/")) {
      if (limited(req, "api", 240)) return send(res, 429, { error: "too_many_requests" });
      // Same-origin requests only; forwarded host/proto are deliberately not trusted.
      if (req.headers["sec-fetch-site"] === "cross-site") return send(res, 403, { error: "cross_site" });
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: "cross_origin" });
      if (url.pathname.startsWith("/api/admin/")) {
        const supplied = req.headers.authorization?.replace(/^Bearer /, "") || "";
        if (!adminSecret || adminSecret.length < 16) return send(res, 503, { error: "configure_admin_password_min_16_characters" });
        if (limited(req, "admin", 60)) return send(res, 429, { error: "too_many_requests" });
        if (!timingSafeEqual(Buffer.from(hash(supplied)), Buffer.from(hash(adminSecret)))) return send(res, 401, { error: "unauthorized" });
        if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
        if (url.pathname === "/api/admin/summary") {
          const totals = db.prepare(`SELECT (SELECT count(*) FROM players) players,(SELECT count(*) FROM sessions) sessions,(SELECT coalesce(sum(active_ms),0) FROM sessions) activeMs,(SELECT count(*) FROM pets) pets`).get();
          const players = db.prepare(`SELECT p.id,p.nickname,p.created_at,p.last_seen,
            (SELECT count(*) FROM sessions s WHERE s.player_id=p.id) sessions,
            (SELECT coalesce(sum(active_ms),0) FROM sessions s WHERE s.player_id=p.id) activeMs,
            (SELECT count(*) FROM pets t WHERE t.player_id=p.id) pets,
            (SELECT count(*) FROM pets t WHERE t.player_id=p.id AND stage=4) adults
            FROM players p ORDER BY last_seen DESC LIMIT 500`).all();
          const actions = db.prepare("SELECT type,action,reason,count(*) count FROM events GROUP BY type,action,reason ORDER BY count DESC LIMIT 100").all();
          const daily = db.prepare("SELECT date(started_at/1000,'unixepoch') day,count(*) sessions,count(DISTINCT player_id) players,sum(active_ms) activeMs FROM sessions GROUP BY day ORDER BY day DESC LIMIT 30").all();
          return send(res, 200, { totals, players, actions, daily });
        }
        if (url.pathname === "/api/admin/player") {
          const id = url.searchParams.get("id");
          const user = db.prepare("SELECT id,nickname,created_at,last_seen,consent_at FROM players WHERE id=?").get(id);
          if (!user) return send(res, 404, { error: "not_found" });
          return send(res, 200, { player: user,
            sessions: db.prepare("SELECT id,started_at,last_seen,active_ms FROM sessions WHERE player_id=? ORDER BY started_at DESC LIMIT 100").all(id),
            pets: db.prepare("SELECT snapshot FROM pets WHERE player_id=? ORDER BY updated_at DESC").all(id).map(p => JSON.parse(p.snapshot)),
            events: db.prepare("SELECT type,action,species,reason,created_at FROM events WHERE player_id=? ORDER BY created_at DESC LIMIT 100").all(id) });
        }
        return send(res, 404, { error: "not_found" });
      }
      if (req.method === "POST" && url.pathname === "/api/register") {
        const data = await body(req);
        const nickname = label(data.nickname, 31).replace(/\s+/g, " ");
        if (!nickname || nickname.length > 30 || data.consent !== true) fail("nickname_and_consent_required");
        const now = Date.now();
        let user = player(req);
        if (!user) {
          if (limited(req, "register", 10)) return send(res, 429, { error: "too_many_registrations" });
          const token = randomBytes(32).toString("hex");
          const id = randomUUID();
          db.prepare("INSERT INTO players VALUES(?,?,?,?,?,?)").run(id, nickname, hash(token), now, now, now);
          // NODE_ENV=production is set in the Docker image; localhost development remains usable.
          res.setHeader("Set-Cookie", `pixels_device=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
          user = { id, nickname };
        } else {
          db.prepare("UPDATE players SET nickname=?,last_seen=? WHERE id=?").run(nickname, now, user.id);
        }
        return send(res, 200, { id: user.id, nickname });
      }
      const user = player(req);
      if (!user) return send(res, 401, { error: "registration_required" });
      if (req.method === "POST" && url.pathname === "/api/sessions") {
        const id = randomUUID(), now = Date.now();
        db.prepare("INSERT INTO sessions(id,player_id,started_at,last_seen) VALUES(?,?,?,?)").run(id, user.id, now, now);
        return send(res, 201, { id });
      }
      if (req.method === "POST" && url.pathname === "/api/activity") {
        const data = await body(req);
        const s = sessionFor(data.sessionId, user);
        if (!Number.isSafeInteger(data.activeMs) || data.activeMs < 0 || !Array.isArray(data.events) || data.events.length > 100) fail();
        for (const event of data.events) if (!idOK(event.id) || !eventTypes.has(event.type)) fail("invalid_event");
        const now = Date.now();
        // Cumulative counters make retries idempotent. Never exceed elapsed session time.
        const activeMs = Math.max(s.active_ms, Math.min(data.activeMs, now - s.started_at));
        transaction(() => {
          db.prepare("UPDATE sessions SET active_ms=?,last_seen=? WHERE id=?").run(activeMs, now, s.id);
          db.prepare("UPDATE players SET last_seen=? WHERE id=?").run(now, user.id);
          const insert = db.prepare("INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?)");
          for (const event of data.events) insert.run(event.id, user.id, s.id, event.type, label(event.action), label(event.species), label(event.reason), now);
        });
        return send(res, 200, { ok: true });
      }
      if (url.pathname === "/api/collection" && req.method === "GET") {
        const col = db.prepare("SELECT active_pet_id FROM collections WHERE player_id=?").get(user.id);
        return send(res, 200, { version: 1, activePetId: col?.active_pet_id || null,
          pets: db.prepare("SELECT snapshot FROM pets WHERE player_id=?").all(user.id).map(p => JSON.parse(p.snapshot)) });
      }
      if (url.pathname === "/api/collection" && req.method === "PUT") {
        const data = await body(req);
        if (!Array.isArray(data.pets) || data.pets.length > 300 || (data.activePetId !== null && !idOK(data.activePetId))) fail();
        if (data.activePetId && !data.pets.some(p => p.id === data.activePetId)) fail("invalid_active_pet");
        const seen = new Set();
        for (const p of data.pets) {
          if (!idOK(p.id) || seen.has(p.id) || !idOK(p.speciesId) || typeof p.name !== "string" || p.name.length > 80 || !Number.isInteger(p.stage) || p.stage < 1 || p.stage > 4 || !p.needs) fail("invalid_pet");
          seen.add(p.id);
          for (const key of ["health", "hunger", "thirst", "hygiene", "love", "energy"]) if (!Number.isFinite(p.needs[key]) || p.needs[key] < 0 || p.needs[key] > 100) fail("invalid_needs");
          if (JSON.stringify(p).length > 8000) fail("invalid_pet_size");
        }
        transaction(() => {
          const currentIds = new Set(db.prepare("SELECT id FROM pets WHERE player_id=?").all(user.id).map(p => p.id));
          for (const p of data.pets) currentIds.add(p.id);
          if (currentIds.size > 300) fail("collection_limit");
          const put = db.prepare("INSERT INTO pets VALUES(?,?,?,?,?,?) ON CONFLICT(player_id,id) DO UPDATE SET species=excluded.species,stage=excluded.stage,snapshot=excluded.snapshot,updated_at=excluded.updated_at");
          for (const p of data.pets) put.run(user.id, p.id, p.speciesId, p.stage, JSON.stringify(p), Date.now());
          db.prepare("INSERT INTO collections VALUES(?,?) ON CONFLICT(player_id) DO UPDATE SET active_pet_id=excluded.active_pet_id").run(user.id, data.activePetId);
        });
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: "not_found" });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "method_not_allowed" });
    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname === "/admin" ? "/admin.html" : url.pathname).slice(1);
    if (!publicFiles.has(relative) && !/^assets\/[a-zA-Z0-9_./-]+$/.test(relative)) return send(res, 404, { error: "not_found" });
    if (relative.split("/").some(p => p.startsWith(".")) || relative.startsWith("assets/raw/")) return send(res, 404, { error: "not_found" });
    const file = path.join(root, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: "not_found" });
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Content-Length": fs.statSync(file).size, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" });
    if (req.method === "HEAD") return res.end();
    const stream = fs.createReadStream(file);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : "server_error" });
    else res.destroy();
  }
});
server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () => console.log(`PIXELS server ready ${server.address().port}`));
process.on("SIGTERM", () => server.close(() => { db.close(); process.exit(0); }));
