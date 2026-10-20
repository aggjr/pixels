const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = require('../catalog');
const wardrobe = require('../wardrobe');

function fixture() {
  const frequencies = [], speeches = [], timers = [];
  let now = 10000;
  const param = capture => ({ value: 0, setValueAtTime(v) { if(capture) frequencies.push(v); },
    exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, start() {}, stop() {}, playbackRate: param(), gain:param(),
    frequency:param(), Q:param() });
  class Context {
    constructor() { this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={}; }
    createGain() { return node(); }
    createBufferSource() { return node(); }
    createOscillator() { return {...node(),frequency:param(true)}; }
    createBiquadFilter() { return node(); }
    createBuffer(channels,length) { return {getChannelData:()=>new Float32Array(length)}; }
  }
  const speechSynthesis = { cancel() {}, getVoices:()=>[{lang:'pt-BR'}], speak:u=>speeches.push(u) };
  const window = { AudioContext:Context, speechSynthesis, SpeechSynthesisUtterance:class {constructor(text){this.text=text;}}, addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../audio'),'utf8'), {
    window, document:{readyState:'loading',addEventListener(){},documentElement:{dataset:{}},getElementById:()=>null},
    localStorage:{getItem:()=>null,setItem(){}}, performance:{now:()=>now},
    fetch:async()=>({ok:false}), setTimeout:fn=>timers.push(fn),clearTimeout(){},setInterval(){},clearInterval(){},
  });
  const api=window.PixelAudio;api.unlock();
  return {api,frequencies,speeches,advance:()=>{now+=10000;},flush:()=>{while(timers.length)timers.shift()();}};
}

test('every released species has distinct descending cry/voice pitch through all four ages',()=>{
  for(const species of catalog.SPECIES.filter(s=>s.ready)) {
    const pitches=[];
    for(let stage=1;stage<=4;stage++) {
      const f=fixture();f.api.setCharacter(species.id,stage);f.api.speak(species.id,'sad',{force:true});
      assert.ok(f.frequencies.length, species.id+'/'+stage);
      pitches.push(f.frequencies[0]);
    }
    assert.ok(pitches.every((p,i)=>i===0||p<pitches[i-1]),species.id+': '+pitches);
  }
});
test('sleep suppresses distress and speech; adults never hiccup spontaneously',()=>{
  const f=fixture();f.api.setCharacter('butterfly',4,true);
  f.api.tickNeeds('butterfly',{health:0,love:0,hunger:0});f.api.speak('butterfly','sad',{force:true});f.api.words('Teste');
  assert.equal(f.frequencies.length,0);assert.equal(f.speeches.length,0);
  f.api.setCharacter('butterfly',4);f.api.babyHiccup();f.flush();assert.equal(f.frequencies.length,0);
});
test('Portuguese affection voice follows age and obeys mute',()=>{
  const f=fixture();f.api.setCharacter('kitty',1);f.api.words('Eu te amo!');
  f.advance();f.api.setCharacter('kitty',4);f.api.words('Eu te amo!');
  assert.ok(f.speeches[0].pitch>f.speeches[1].pitch);assert.equal(f.speeches[0].lang,'pt-BR');
  f.api.setMuted(true);f.advance();f.api.words('Não tocar');assert.equal(f.speeches.length,2);
});
test('boat whistle becomes deeper with age and car play has a skid fallback',()=>{
  const frequencies=[];
  for(let stage=1;stage<=4;stage++) {
    const f=fixture();f.api.setCharacter('boat',stage);f.api.cue('play','boat');
    frequencies.push(f.frequencies[0]);
  }
  assert.ok(frequencies.every((p,i)=>i===0||p<frequencies[i-1]));
  const f=fixture();f.api.setCharacter('racer',4);f.api.cue('play','racer');f.flush();
  assert.ok(f.frequencies.length>0);
});
test('queued laughter is cancelled when the character goes to sleep',()=>{
  const f=fixture();f.api.setCharacter('kitty',1);f.api.cue('play','kitty');
  f.api.setCharacter('kitty',1,true);f.flush();assert.equal(f.frequencies.length,0);
});
test('all species can preview three locked intermediate items, never restore them as equipped',()=>{
  const items=catalog.CLOSET_ITEMS.filter(i=>i.tier==='intermediate');assert.equal(items.length,3);
  for(const species of catalog.SPECIES.filter(s=>s.ready)) {
    assert.ok(items.every(i=>i.locked&&wardrobe.compatible(species.id,i)),species.id);
    assert.deepEqual(wardrobe.sanitize(species.id,{hat:items[0].id,face:items[1].id},items),{hat:null,face:null});
  }
});
