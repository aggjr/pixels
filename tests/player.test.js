"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const code = fs.readFileSync(path.join(__dirname,"..","player.js"),"utf8");
function boot(stored=null, blocked=false) {
  const elements={};
  for(const id of ["playerWelcome","playerForm","playerNickname","playerError","app","playerMetricsConsent"]) elements[id]={hidden:true,value:"",checked:false,events:{},focus(){},addEventListener(type,fn){this.events[type]=fn},setCustomValidity(value){this.validation=value},reportValidity(){}};
  let value=stored;
  const context={window:{},document:{getElementById:id=>elements[id]},crypto:webcrypto,Date,Uint8Array,localStorage:{getItem(){return value},setItem(key,text){if(blocked)throw Error("storage blocked");value=text}}};
  vm.runInNewContext(code,context);
  return {context,elements,stored:()=>value,submit(name,consent=false){elements.playerNickname.value=name;elements.playerMetricsConsent.checked=consent;elements.playerForm.events.submit({preventDefault(){}})}};
}
test("nickname gate, device ID, explicit consent, persistence and blocked storage",async()=>{
  const first=boot();assert.equal(first.elements.app.inert,true);
  first.submit("  ");assert(first.elements.playerNickname.validation);assert.equal(first.context.window.pixelsPlayer,undefined);
  first.submit("  Luna  azul  ",true);
  const profile=await first.context.window.pixelsProfileReady;
  assert.equal(profile.nickname,"Luna azul");assert.equal(profile.metricsConsent,true);assert.equal(first.elements.app.inert,false);
  const returned=await boot(first.stored()).context.window.pixelsProfileReady;assert.equal(returned.id,profile.id);
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
