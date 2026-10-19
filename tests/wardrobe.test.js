const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SPECIES, SPECIES_ANCHORS, CLOSET_ITEMS, CLOSET_TABS, spriteArt } = require('../catalog');
const rig = require('../wardrobe');

test('every released PIXEL, colour and growth stage has its own existing sprite and anchors', () => {
  for (const species of SPECIES.filter(s => s.ready)) {
    assert.ok(rig.families[species.id], species.id);
    for (const variant of Object.keys(species.variants || { default: {} })) {
      for (let stage = 1; stage <= 4; stage++) {
        const key = species.id + (species.variants ? '_' + variant : '') + '_' + species.stages[stage];
        assert.ok(fs.existsSync(path.join(__dirname, '..', spriteArt(species, stage, variant))), key);
        const anchors = rig.anchorsFor({ species, variant, stage }, SPECIES_ANCHORS);
        assert.equal(anchors, SPECIES_ANCHORS[key], key);
        for (const item of CLOSET_ITEMS.filter(i => i.slot && !i.completeLook && rig.compatible(species.id, i))) {
          const point = rig.fit(anchors, item);
          assert.equal(point?.length, 4, key + '/' + item.id);
          assert.ok(point.every(Number.isFinite), key + '/' + item.id);
          assert.ok(point[0] >= 0 && point[0] <= 1 && point[1] >= 0 && point[1] <= 1 && point[2] > 0 && point[2] <= 1);
          const mounts = rig.mounts(species, stage, anchors, item);
          assert.ok(mounts.length > 0, key + '/' + item.id);
          for (const mount of mounts) {
            assert.equal(mount.length, 5);
            assert.ok(mount.every(Number.isFinite));
            assert.ok(mount[0] >= 0 && mount[0] <= 1 && mount[1] >= 0 && mount[1] <= 1 && mount[4] > 0);
          }
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
  for (const id of ['tune_wheels_gold', 'tune_spoiler_gt', 'tune_nitro_3d', 'tune_exhaust_flame']) assert.equal(rig.compatible('botcar', item(id)), false);
  assert.deepEqual(rig.sanitize('boat', { body: 'body_dress_lilac', hat: 'hat_crown_3d', feet: 'tune_wheels_gold', face: 'unknown' }, CLOSET_ITEMS),
    { body: null, hat: 'hat_crown_3d', feet: null, face: null });
  assert.equal(rig.anchorsFor({ species: { id: 'unknown', stages: { 1: 'newborn' } }, stage: 1 }, SPECIES_ANCHORS), null);
});

test('wheel hubs differ by life stage and medal ribbon stays below its neck anchor', () => {
  const car = SPECIES.find(s => s.id === 'racer');
  const wheel = CLOSET_ITEMS.find(i => i.id === 'tune_wheels_gold');
  const baby = rig.mounts(car, 1, SPECIES_ANCHORS.racer_newborn, wheel);
  const adult = rig.mounts(car, 4, SPECIES_ANCHORS.racer_adult, wheel);
  assert.equal(baby.length, 2);
  assert.notDeepEqual(baby, adult);
  const medal = CLOSET_ITEMS.find(i => i.id === 'neck_medal_3d');
  const source = SPECIES_ANCHORS.kitty_child;
  const fitted = rig.fit(source, medal);
  assert.ok(fitted[1] > source.neck[1]);
  assert.ok(fitted[2] < source.neck[2]);
});
