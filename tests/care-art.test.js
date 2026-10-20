const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { SPECIES, spriteArt, sleepSprite, actionArt } = require("../catalog");

test("every released species, colour and life stage resolves a real sleeping sprite, never its awake art", () => {
  for (const species of SPECIES.filter(s => s.ready)) {
    for (const variant of Object.keys(species.variants || { default: {} })) {
      for (let stage = 1; stage <= 4; stage++) {
        for (const babyArt of stage === 3 ? [true, false] : [stage <= 2]) {
          const art = sleepSprite(species, stage, variant, babyArt);
          const label = `${species.id}/${variant}/${stage}/${babyArt}`;
          assert.ok(art, label);
          assert.notEqual(art, spriteArt(species, stage, variant), label);
          assert.ok(fs.existsSync(path.join(__dirname, "..", art)), `${label}: ${art}`);
        }
      }
    }
  }
});

test("shared action sprites exist for every advertised action across all life stages", () => {
  for (const species of SPECIES.filter(s => s.ready)) {
    for (const variant of Object.keys(species.variants || { default: {} })) {
      for (let stage = 1; stage <= 4; stage++) {
        for (const pose of species.poses) {
          const art = actionArt(species, stage, variant, pose);
          if (species.id === "racer" && pose === "eat" && stage >= 3) {
            assert.equal(art, null);
          } else {
            assert.ok(art);
            assert.ok(fs.existsSync(path.join(__dirname, "..", art)), `${species.id}/${stage}/${pose}: ${art}`);
          }
        }
      }
    }
  }
});

test("ladybug never loses sleep art in late childhood or adulthood, and staged art respects its actual phase", () => {
  const ladybug = SPECIES.find(s => s.id === "butterfly");
  assert.equal(sleepSprite(ladybug, 3, null, false), "assets/pets/butterfly_sleep.webp");
  assert.equal(sleepSprite(ladybug, 4, null, false), "assets/pets/butterfly_sleep.webp");
  const unicorn = SPECIES.find(s => s.id === "unicorn");
  assert.equal(sleepSprite(unicorn, 3, null, false), "assets/pets/unicorn_child_sleep.webp");
  const monkey = SPECIES.find(s => s.id === "monkey");
  assert.equal(sleepSprite(monkey, 4, null, false), "assets/pets/monkey_adult_sleep.webp");
});
