"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const code = fs.readFileSync(path.join(__dirname,"..","player.js"),"utf8");
function boot(stored=null, blocked=false, extra={}) {
  const elements={};
  const element = () => ({hidden:true,value:"",checked:false,events:{},children:[],focus(){},addEventListener(type,fn){this.events[type]=fn},setCustomValidity(value){this.validation=value},reportValidity(){},replaceChildren(){this.children=[]},appendChild(child){this.children.push(child)}});
  for(const id of ["playerWelcome","playerForm","playerNickname","playerError","app","playerMetricsConsent","playerProfiles","playerEnter","playerNew","playerNewFields","playerNewCancel"]) elements[id]=element();
  const storage = new Map(Object.entries(extra));
  if (stored !== null) storage.set("pixels-player-v1", stored);
  const session = new Map();
  const context={window:{location:{reload(){context.reloaded=true}}},document:{getElementById:id=>elements[id],createElement:element},crypto:webcrypto,Date,Uint8Array,sessionStorage:{getItem:key=>session.get(key)??null,setItem:(key,text)=>session.set(key,text),removeItem:key=>session.delete(key)},localStorage:{getItem(key){return storage.get(key)??null},setItem(key,text){if(blocked)throw Error("storage blocked");storage.set(key,text)}}};
  vm.runInNewContext(code,context);
  return {context,elements,storage,stored:()=>storage.get("pixels-player-v1"),enter(id){elements.playerProfiles.value=id;elements.playerProfiles.events.change();elements.playerEnter.events.click()},submit(name,consent=false){elements.playerNew.events.click();elements.playerNickname.value=name;elements.playerMetricsConsent.checked=consent;elements.playerForm.events.submit({preventDefault(){}})}};
}
test("nickname gate, device ID, explicit consent, persistence and blocked storage",async()=>{
  const first=boot();assert.equal(first.elements.app.inert,true);
  first.submit("  ");assert(first.elements.playerNickname.validation);assert.equal(first.context.window.pixelsPlayer,undefined);
  first.submit("  Luna  azul  ",true);
  const profile=await first.context.window.pixelsProfileReady;
  assert.equal(profile.nickname,"Luna azul");assert.equal(profile.metricsConsent,true);assert.equal(first.elements.app.inert,false);
  const returning=boot(first.stored());assert.equal(returning.elements.playerWelcome.hidden,false);returning.enter(profile.id);
  const returned=await returning.context.window.pixelsProfileReady;assert.equal(returned.id,profile.id);
  const other=boot();other.submit("Luna azul");const second=await other.context.window.pixelsProfileReady;
  assert.notEqual(second.id,profile.id);assert.equal(second.metricsConsent,false);
  const blocked=boot(null,true);blocked.submit("Luna");assert(blocked.elements.playerError.textContent);assert.equal(blocked.elements.app.inert,true);
  const corrupt=boot("{broken");assert.equal(corrupt.elements.playerWelcome.hidden,false);
});
test("legacy profile asks for consent without changing the device ID",async()=>{
  const legacy={version:1,id:webcrypto.randomUUID(),nickname:"Luna",createdAt:new Date().toISOString()};
  const updated=boot(JSON.stringify(legacy));assert.equal(updated.elements.playerWelcome.hidden,false);
  updated.submit("Luna",true);assert.equal((await updated.context.window.pixelsProfileReady).id,legacy.id);
});

test("profiles on one installation have separate local saves and legacy data migrates only once", async () => {
  const oldCollection = JSON.stringify({ pets: [{ id: "old-pet", outfit: { hat: "hat_bow_pink" } }], activePetId: "old-pet" });
  const first = boot(null, false, { "bichinho-collection-v1": oldCollection });
  first.submit("Bia", true);
  const bia = await first.context.window.pixelsProfileReady;
  assert.equal(first.storage.get(`bichinho-collection-v1:${bia.id}`), oldCollection);
  first.submit("Juju", true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(first.context.reloaded, true);
  const second = boot(first.stored(), false, Object.fromEntries(first.storage));
  second.enter(JSON.parse(first.stored()).id);
  const juju = await second.context.window.pixelsProfileReady;
  assert.notEqual(juju.id, bia.id);
  assert.equal(second.context.window.pixelsStorageKey("bichinho-collection-v1"), `bichinho-collection-v1:${juju.id}`);
  assert.equal(second.storage.get(`bichinho-collection-v1:${juju.id}`), undefined);
  assert.equal(second.storage.get(`bichinho-collection-v1:${bia.id}`), oldCollection);
  second.enter(bia.id);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.parse(second.stored()).id, bia.id);
});

test("entry offers an empty combo and explicit new-user form, then lists registered names on return", async () => {
  const first = boot();
  assert.equal(first.elements.playerProfiles.children.length, 1);
  assert.equal(first.elements.playerProfiles.disabled, true);
  assert.equal(first.elements.playerNewFields.hidden, true);
  first.elements.playerNew.events.click();
  assert.equal(first.elements.playerNewFields.hidden, false);
  first.submit("Alice", true);
  const alice = await first.context.window.pixelsProfileReady;
  const returning = boot(first.stored(), false, Object.fromEntries(first.storage));
  assert.equal(returning.context.window.pixelsPlayer, undefined);
  assert.equal(returning.elements.playerWelcome.hidden, false);
  assert.deepEqual(returning.elements.playerProfiles.children.map(option => option.textContent), ["Selecione seu nome", "Alice"]);
  assert.equal(returning.elements.playerNewFields.hidden, true);
  returning.enter(alice.id);
  assert.equal((await returning.context.window.pixelsProfileReady).id, alice.id);
});

test("creating a user before entering an old profile never takes the old user's pets", async () => {
  const old = { version: 2, id: webcrypto.randomUUID(), nickname: "Alice", createdAt: new Date().toISOString(), metricsConsent: true };
  const collection = JSON.stringify({ pets: [{ id: "alice-pet" }] });
  const entry = boot(JSON.stringify(old), false, { "bichinho-collection-v1": collection });
  entry.submit("Pedro", true);
  const pedro = await entry.context.window.pixelsProfileReady;
  assert.equal(entry.storage.get(`bichinho-collection-v1:${old.id}`), collection);
  assert.equal(entry.storage.get(`bichinho-collection-v1:${pedro.id}`), undefined);
});
