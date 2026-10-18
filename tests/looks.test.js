const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const looks = require("../looks");
const state = () => ({ species: { id: "kitty" }, outfit: { body: looks.id }, needs: { health: 100, energy: 80, love: 80 }, mood: "happy" });
test("integrated clothes preserve character identity across awake, asleep and needs-care states", () => {
  const s = state();
  assert.equal(looks.chooseArt(s), looks.art.happy);
  s.sleeping = true; assert.equal(looks.chooseArt(s), looks.art.sleep);
  s.sleeping = false; s.pose = "eat"; assert.equal(looks.chooseArt(s), looks.art.eat);
  s.pose = null;
  s.sleeping = false; s.needs.health = 20; assert.equal(looks.chooseArt(s), looks.art.sad);
  s.needs.health = 100; s.mood = "mad"; assert.equal(looks.chooseArt(s), looks.art.sad);
  s.mood = "happy"; assert.equal(looks.chooseArt(s), looks.art.happy);
  s.species.id = "racer"; assert.equal(looks.chooseArt(s), null);
  s.species.id = "kitty"; s.outfit.body = null; assert.equal(looks.chooseArt(s), null);
  for (const art of Object.values(looks.art)) assert(fs.existsSync(path.join(__dirname, "..", art)), art);
});
test("legacy accessory IDs migrate without dropping other equipped items", () => {
  const saved = { hat: "studio_bow", face: "studio_glasses", held: "studio_bag", neck: "neck_medal_3d" };
  assert.deepEqual(looks.migrate(saved), { hat: "hat_bow_pink", face: "face_glasses_ocean", held: "bag_lavender_3d", neck: "neck_medal_3d" });
  assert.equal(saved.hat, "studio_bow");
});
