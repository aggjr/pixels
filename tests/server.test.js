"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const secret = "test-only-admin-password-12345";
const root = path.resolve(__dirname, "..");
async function start(dbPath) {
  const child = spawn(process.execPath, [path.join(root,"server.js")], { env: { ...process.env, PORT:"0", NODE_ENV:"test", DB_PATH:dbPath, ADMIN_PASSWORD:secret }, stdio:["ignore","pipe","pipe"], windowsHide:true });
  const port = await new Promise((resolve,reject) => {
    let output=""; const timer=setTimeout(()=>reject(Error("server startup timeout")),10000);
    child.stdout.on("data",chunk=>{output+=chunk;const found=output.match(/PIXELS server ready (\d+)/);if(found){clearTimeout(timer);resolve(found[1]);}});
    child.once("exit",code=>{clearTimeout(timer);reject(Error(`server exited ${code}`));});
  });
  return { child, url:`http://127.0.0.1:${port}` };
}
async function stop(child) { if(child.exitCode!==null)return; await new Promise(resolve=>{child.once("exit",resolve);child.kill();}); }
test("persistent metrics, ownership, retries, static isolation and admin authorization", async(t)=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"pixels-test-"));
  const dbPath=path.join(temp,"pixels.sqlite");
  let running=await start(dbPath);
  t.after(async()=>{await stop(running.child);fs.rmSync(temp,{recursive:true,force:true});});
  async function request(route,method="GET",data,cookie,admin=false,extra={}) {
    return fetch(running.url+route,{method,headers:{ ...(data?{"Content-Type":"application/json"}:{}),...(cookie?{Cookie:cookie}:{}),...(admin?{Authorization:`Bearer ${secret}`} : {}),...extra},body:data?JSON.stringify(data):undefined});
  }
  assert.equal((await request("/healthz")).status,200);
  for(const file of ["/server.js","/package.json","/data/pixels.sqlite","/.git/config","/assets/../server.js"]) assert.equal((await request(file)).status,404,file);
  assert.equal((await request("/api/admin/summary")).status,401);
  assert.equal((await request("/api/collection")).status,401);
  assert.equal((await request("/api/register","POST",{nickname:"Luna",consent:false})).status,400);
  assert.equal((await request("/api/register","POST",{nickname:"Luna",consent:true},null,false,{Origin:"https://evil.example"})).status,403);
  const registered=await request("/api/register","POST",{nickname:"Luna",consent:true});
  const cookie=registered.headers.get("set-cookie").split(";")[0];
  const player=await registered.json();
  assert.equal((await (await request("/api/register","POST",{nickname:"Luna",consent:true},cookie)).json()).id,player.id);
  const s=await (await request("/api/sessions","POST",{},cookie)).json();
  const second=await request("/api/register","POST",{nickname:"Luna",consent:true});
  const cookie2=second.headers.get("set-cookie").split(";")[0];
  assert.notEqual((await second.json()).id,player.id);
  const event={id:randomUUID(),type:"care_blocked",action:"play",reason:"tired",species:"kitty"};
  const activity={sessionId:s.id,activeMs:100,events:[event]};
  assert.equal((await request("/api/activity","POST",activity,cookie2)).status,400);
  assert.equal((await request("/api/activity","POST",activity,cookie)).status,200);
  assert.equal((await request("/api/activity","POST",activity,cookie)).status,200);
  assert.equal((await request("/api/activity","POST",{...activity,events:[{id:randomUUID(),type:"arbitrary"}]},cookie)).status,400);
  const pet={id:randomUUID(),speciesId:"kitty",name:"Flofy",stage:4,needs:{health:100,hunger:80,thirst:80,hygiene:80,love:80,energy:80}};
  assert.equal((await request("/api/collection","PUT",{version:1,activePetId:pet.id,pets:[pet]},cookie)).status,200);
  assert.equal((await (await request("/api/collection","GET",null,cookie2)).json()).pets.length,0);
  assert.equal((await request("/api/collection","PUT",{activePetId:pet.id,pets:[{...pet,stage:99}]},cookie)).status,400);
  const summary=await (await request("/api/admin/summary","GET",null,null,true)).json();
  assert.equal(summary.totals.players,2);assert.equal(summary.totals.sessions,1);assert.equal(summary.totals.pets,1);
  assert.equal(summary.actions[0].count,1);
  assert(!JSON.stringify(summary).includes("token_hash"));
  const details=await (await request(`/api/admin/player?id=${player.id}`,"GET",null,null,true)).json();
  assert.equal(details.pets[0].name,"Flofy");assert.equal(details.sessions.length,1);
  assert.equal(details.player.token_hash,undefined);
  assert.equal((await request("/admin")).status,200);
  assert.equal((await request("/telemetry.js")).status,200);
  await stop(running.child);running=await start(dbPath);
  const restored=await (await request("/api/collection","GET",null,cookie)).json();
  assert.equal(restored.pets[0].id,pet.id);
});

test("one device owns separate profiles, wardrobes and collections across server restarts", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pixels-profiles-test-"));
  const dbPath = path.join(temp, "pixels.sqlite");
  let running = await start(dbPath);
  t.after(async () => { await stop(running.child); assert.ok(temp.startsWith(os.tmpdir())); fs.rmSync(temp, { recursive: true, force: true }); });
  const request = (route, method = "GET", data, cookie, selected) => fetch(running.url + route, {
    method, headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}),
      ...(selected ? { "X-Pixels-Player": selected } : {}) }, body: data ? JSON.stringify(data) : undefined,
  });
  const biaKey = randomUUID(), jujuKey = randomUUID();
  const biaResponse = await request("/api/register", "POST", { nickname: "Bia", consent: true, profileId: biaKey });
  const cookie = biaResponse.headers.get("set-cookie").split(";")[0];
  const bia = await biaResponse.json();
  const juju = await (await request("/api/register", "POST", { nickname: "Juju", consent: true, profileId: jujuKey }, cookie)).json();
  assert.notEqual(bia.id, juju.id);
  assert.equal(bia.deviceId, juju.deviceId);
  const repeated = await (await request("/api/register", "POST", { nickname: "BIA", consent: true, profileId: randomUUID() }, cookie)).json();
  assert.equal(repeated.id, bia.id);
  const profiles = await (await request("/api/profiles", "GET", null, cookie)).json();
  assert.equal(profiles.profiles.length, 2);
  assert(!JSON.stringify(profiles).includes("token_hash"));
  const pet = { id: randomUUID(), speciesId: "kitty", name: "Flofy", stage: 4,
    needs: { health: 100, hunger: 80, thirst: 80, hygiene: 80, love: 80, energy: 80 },
    outfit: { hat: "hat_bow_pink", held: "bag_mint_3d" }, variant: "pink", frozen: true };
  assert.equal((await request("/api/collection", "PUT", { activePetId: pet.id, pets: [pet] }, cookie, bia.id)).status, 200);
  assert.equal((await (await request("/api/collection", "GET", null, cookie, juju.id)).json()).pets.length, 0);
  const otherResponse = await request("/api/register", "POST", { nickname: "Bia", consent: true, profileId: biaKey });
  const otherCookie = otherResponse.headers.get("set-cookie").split(";")[0];
  const other = await otherResponse.json();
  assert.notEqual(other.deviceId, bia.deviceId);
  assert.notEqual(other.id, bia.id);
  assert.equal((await request("/api/collection", "GET", null, otherCookie, bia.id)).status, 401);
  assert.equal((await request("/api/profiles")).status, 401);
  await stop(running.child);
  running = await start(dbPath);
  const restored = await (await request("/api/collection", "GET", null, cookie, bia.id)).json();
  assert.deepEqual(restored.pets, [pet]);
  assert.equal(restored.activePetId, pet.id);
  assert.equal((await (await request("/api/collection", "GET", null, cookie, juju.id)).json()).pets.length, 0);
});

test("migration preserves the old device cookie, player ID and collection", async t => {
  const { DatabaseSync } = require("node:sqlite");
  const { createHash, randomBytes } = require("node:crypto");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pixels-migration-test-"));
  const dbPath = path.join(temp, "pixels.sqlite");
  const database = new DatabaseSync(dbPath);
  const oldId = randomUUID(), token = randomBytes(32).toString("hex"), now = Date.now();
  database.exec("CREATE TABLE players(id TEXT PRIMARY KEY,nickname TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL,created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,consent_at INTEGER NOT NULL)");
  database.prepare("INSERT INTO players VALUES(?,?,?,?,?,?)").run(oldId, "Bia", createHash("sha256").update(token).digest("hex"), now, now, now);
  const pet = { id: randomUUID(), speciesId: "kitty", name: "Flofy", stage: 3, outfit: { hat: "hat_bow_pink" },
    needs: { health: 90, hunger: 80, thirst: 80, hygiene: 80, love: 80, energy: 80 } };
  database.exec("CREATE TABLE pets(player_id TEXT NOT NULL,id TEXT NOT NULL,species TEXT NOT NULL,stage INTEGER NOT NULL,snapshot TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(player_id,id)); CREATE TABLE collections(player_id TEXT PRIMARY KEY,active_pet_id TEXT)");
  database.prepare("INSERT INTO pets VALUES(?,?,?,?,?,?)").run(oldId, pet.id, pet.speciesId, pet.stage, JSON.stringify(pet), now);
  database.prepare("INSERT INTO collections VALUES(?,?)").run(oldId, pet.id);
  database.close();
  const running = await start(dbPath);
  t.after(async () => { await stop(running.child); assert.ok(temp.startsWith(os.tmpdir())); fs.rmSync(temp, { recursive: true, force: true }); });
  const headers = { "Content-Type": "application/json", Cookie: `pixels_device=${token}` };
  const response = await fetch(running.url + "/api/register", { method: "POST", headers,
    body: JSON.stringify({ nickname: "Bia", profileId: randomUUID(), consent: true }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, oldId);
  const profiles = await (await fetch(running.url + "/api/profiles", { headers })).json();
  assert.equal(profiles.profiles.length, 1);
  assert.equal(profiles.profiles[0].id, oldId);
  const collection = await (await fetch(running.url + "/api/collection", { headers })).json();
  assert.equal(collection.activePetId, pet.id);
  assert.deepEqual(collection.pets, [pet]);
});
