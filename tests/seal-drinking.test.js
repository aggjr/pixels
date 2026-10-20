const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SPECIES, spriteArt } = require('../catalog');
test('seal drinks with an integrated bowl and age-specific resting poses', () => {
  const seal = SPECIES.find(s=>s.id==='seal');
  const arts = new Set();
  for (let stage=1;stage<=4;stage++) {
    const art=seal.drinkArt[seal.stages[stage]];
    assert.ok(fs.existsSync(path.join(__dirname,'..',art)));
    assert.notEqual(art,spriteArt(seal,stage));
    assert.match(art,/seal-drink-(newborn|child|adult)\.png$/);
    arts.add(art);
  }
  assert.equal(arts.size,3);
  assert.ok(SPECIES.filter(s=>s.id!=='seal').every(s=>!s.drinkArt));
});
