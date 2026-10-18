const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lionMood, SPECIES } = require('../catalog');
const ordinary = { hunger: 55, thirst: 50, hygiene: 48, love: 52, energy: 46, health: 80 };

test('lion is happy with ordinary care, including immediately after birth', () => {
  assert.equal(lionMood(ordinary), 'happy');
  assert.equal(lionMood({ hunger: 70, thirst: 72, hygiene: 75, love: 58, energy: 72, health: 95 }), 'happy');
  // Old accumulated neglect must not keep a recovered pet angry.
  assert.equal(lionMood(ordinary, 120_000), 'happy');
  const profile = SPECIES.find(s => s.id === 'lion').profile;
  assert.ok(profile.love <= 1 && profile.hunger <= 1 && profile.energy <= 1);
});

test('one unmet need asks for help; anger needs several critical needs over time', () => {
  assert.equal(lionMood({ ...ordinary, love: 32 }), 'neutral');
  assert.equal(lionMood({ ...ordinary, hunger: 15 }, 120_000), 'sad');
  const struggling = { ...ordinary, hunger: 10, love: 10 };
  assert.equal(lionMood(struggling, 12_000), 'sad');
  assert.equal(lionMood(struggling, 45_000), 'mad');
  assert.equal(lionMood(struggling, 0), 'sad');
  assert.equal(lionMood({ ...ordinary, health: 20 }), 'sick');
});
