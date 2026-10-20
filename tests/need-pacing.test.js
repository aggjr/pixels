const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SPECIES, NEED_DRAIN_FACTOR, needDecayRates } = require('../catalog');

test('all six needs drain four times slower for every released species and age', () => {
  const base = {hunger:0.38,thirst:0.42,hygiene:0.18,love:0.3,energy:0.24,health:0.16};
  assert.equal(NEED_DRAIN_FACTOR,0.25);
  for (const species of SPECIES.filter(s=>s.ready)) for(let stage=1;stage<=4;stage++) {
    for (const boosts of [{},{hunger:2,thirst:2,hygiene:2,love:2,energy:2,health:2}]) {
      const rates=needDecayRates(stage,species.profile,boosts);
      for (const [key,value] of Object.entries(base)) {
        const oldRate=value/2.1*(0.75+stage*0.3)*(species.profile?.[key]||1)*(boosts[key]||1);
        assert.ok(Math.abs(rates[key]-oldRate/4)<1e-12,species.id+'/'+stage+'/'+key);
        assert.ok(rates[key]>0);
      }
    }
  }
});
test('slower drain preserves sleep recovery and species-specific needs', () => {
  const awake=needDecayRates(4,{thirst:1.5},{thirst:2});
  const asleep=needDecayRates(4,{thirst:1.5},{thirst:2},true);
  assert.equal(asleep.energy,-6.75/2.1);
  assert.equal(asleep.health,0);
  for(const key of ['hunger','thirst','hygiene','love']) assert.equal(asleep[key],awake[key]);
  assert.equal(awake.thirst,needDecayRates(4).thirst*3);
});
