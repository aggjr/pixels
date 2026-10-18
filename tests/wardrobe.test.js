const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SPECIES, SPECIES_ANCHORS, CLOSET_ITEMS, CLOSET_TABS } = require('../catalog');
const rig = require('../wardrobe');

test('every released PIXEL, colour and growth stage has its own existing sprite and anchors', () => {
  for (const species of SPECIES.filter(s => s.ready)) {
    assert.ok(rig.families[species.id], species.id);
    for (const variant of Object.keys(species.variants || { default: {} })) {
      for (let stage = 1; stage <= 4; stage++) {
        const key = species.id + (species.variants ? '_' + variant : '') + '_' + species.stages[stage];
        assert.ok(fs.existsSync(path.join(__dirname, '../assets/pets', key + '.webp')), key);
        const anchors = rig.anchorsFor({ species, variant, stage }, SPECIES_ANCHORS);
        assert.equal(anchors, SPECIES_ANCHORS[key], key);
        for (const item of CLOSET_ITEMS.filter(i => i.slot && !i.completeLook && rig.compatible(species.id, i))) {
          const point = rig.fit(anchors, item);
          assert.equal(point?.length, 4, key + '/' + item.id);
          assert.ok(point.every(Number.isFinite), key + '/' + item.id);
          assert.ok(point[0] >= 0 && point[0] <= 1 && point[1] >= 0 && point[1] <= 1 && point[2] > 0 && point[2] <= 1);
        }
      }
    }
    assert.ok(rig.tabs(species.id, CLOSET_TABS, CLOSET_ITEMS).length >= 2);
    assert.ok(CLOSET_ITEMS.filter(i => i.slot && rig.compatible(species.id, i)).length >= 6);
  }
});

test('anatomy rules apply to equipped and restored accessories, not just tabs', () => {
  const item = id => CLOSET_ITEMS.find(i => i.id === id);
  for (const species of ['rocket', 'boat', 'plane', 'racer', 'train', 'heli', 'tractor', 'botcar']) {
    assert.equal(rig.compatible(species, item('body_dress_lilac')), false);
    assert.equal(rig.compatible(species, item('hat_crown_3d')), true);
  }
  for (const species of ['seal', 'slime', 'bee', 'unicorn']) assert.equal(rig.compatible(species, item('feet_sneakers_3d')), false);
  assert.equal(rig.compatible('plane', item('tune_wheels_gold')), false);
  assert.equal(rig.compatible('tractor', item('tune_wheels_gold')), true);
  assert.equal(rig.compatible('boat', item('tune_spoiler_gt')), false);
  assert.equal(rig.compatible('racer', item('tune_spoiler_gt')), true);
  assert.deepEqual(rig.sanitize('boat', { body: 'body_dress_lilac', hat: 'hat_crown_3d', feet: 'tune_wheels_gold', face: 'unknown' }, CLOSET_ITEMS),
    { body: null, hat: 'hat_crown_3d', feet: null, face: null });
  assert.equal(rig.anchorsFor({ species: { id: 'unknown', stages: { 1: 'newborn' } }, stage: 1 }, SPECIES_ANCHORS), null);
});
