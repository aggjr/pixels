const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SPECIES, careMood, lionMood } = require('../catalog');
const needs = { hunger:75, thirst:75, hygiene:75, love:75, energy:75, health:75 };

test('every released species asks for ordinary care without immediate anger at every age', () => {
  for (const species of SPECIES.filter(s => s.ready)) for (let stage=1;stage<=4;stage++) {
    const mood = species.id === 'lion' ? lionMood : careMood;
    for (const key of ['hunger','thirst','hygiene','love','energy']) {
      const n = {...needs,[key]:10};
      assert.equal(mood(n, {}, 15000), 'sad', species.id+'/'+stage+'/'+key);
    }
  }
});
test('anger needs sustained distress and recovers when needs are met', () => {
  const low = {...needs,hunger:10,thirst:10};
  assert.equal(careMood(low,{},12001),'sad');
  assert.equal(careMood(low,{},60000),'sad');
  assert.equal(careMood(low,{},60001),'mad');
  assert.equal(careMood(needs,{hunger:6},120000),'happy');
  assert.equal(careMood({...needs,hunger:20},{hunger:3},120000),'sad');
  assert.equal(careMood({...needs,hunger:20},{hunger:6},30001),'mad');
});
test('gentler temperament never hides illness or tiredness', () => {
  assert.equal(careMood({...needs,health:10},{hunger:6},120000,true),'sick');
  assert.equal(careMood({...needs,health:40},{hunger:6},120000,true),'sad');
  assert.equal(careMood({...needs,energy:10},{},120000,true),'sad');
});
