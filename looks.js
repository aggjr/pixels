/* Integrated outfits use complete character art, with matching dressed states. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelsLooks = api;
})(typeof globalThis === "object" ? globalThis : this, () => {
  const id = "look_lili_complete";
  const art = {
    happy: "assets/pets/lili-dressed-photo.png",
    sleep: "assets/pets/lili-dressed-sleep.png",
    sad: "assets/pets/lili-dressed-sad.png",
    eat: "assets/pets/lili-dressed-eat.png",
    chew: "assets/pets/lili-dressed-chew.png",
  };
  function active(species, outfit) { return species === "kitty" && outfit?.body === id; }
  function chooseArt(state) {
    if (!active(state.species?.id, state.outfit)) return null;
    if (state.sleeping) return art.sleep;
    if (state.pose === "eat") return state.careFrame === "chew" ? art.chew : art.eat;
    const n = state.needs || {};
    if (["sad", "sick", "mad"].includes(state.mood) || Object.values(n).some(v => v < 30)) return art.sad;
    return art.happy;
  }
  function migrate(outfit = {}) {
    const aliases = { studio_glasses: "face_glasses_ocean", studio_bow: "hat_bow_pink", studio_bag: "bag_lavender_3d" };
    return Object.fromEntries(Object.entries(outfit).map(([slot, value]) => [slot, aliases[value] || value]));
  }
  return { id, art, active, chooseArt, migrate };
});
