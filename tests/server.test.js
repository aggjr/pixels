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
