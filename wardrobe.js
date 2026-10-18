/* Anatomy rules shared by the wardrobe, saved pets and visual audit. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelsWardrobe = api;
})(globalThis, () => {
  const families = {
    unicorn: "hoof", dino: "paws", kitty: "paws", duck: "bird", pig: "hoof",
    mole: "paws", bat: "winged", seal: "aquatic", monkey: "paws", axolotl: "aquatic",
    bee: "insect", butterfly: "insect", nini: "insect", floide: "paws", tini: "paws",
    elephant: "paws", lion: "paws", racer: "car", botcar: "car", rocket: "rocket",
    heli: "aircraft", train: "rail", tractor: "tractor", boat: "boat", plane: "aircraft",
    slime: "slime", lilica: "paws",
  };
  const machines = new Set(["car", "rocket", "aircraft", "rail", "tractor", "boat"]);
  function compatible(speciesId, item) {
    const family = families[speciesId];
    if (!family || !item || (item.species && item.species !== speciesId)) return false;
    if (item.tab === "toys") return true;
    if (item.completeLook) return item.species === speciesId;
    if (item.tab === "powers") return speciesId === "unicorn";
    if (item.tab === "tuning") {
      if (item.id.includes("spoiler") || item.id.includes("nitro") || item.id.includes("exhaust")) return family === "car";
      if (item.id === "tune_wheels_gold") return ["car", "tractor"].includes(family);
      return machines.has(family);
    }
    if (item.slot === "hat" || item.slot === "face") return true;
    if (machines.has(family)) return false;
    if (item.slot === "feet") return family === "paws" || family === "bird";
    if (item.slot === "body") return family === "paws" || family === "bird";
    if (item.slot === "held") return family === "paws" || family === "bird";
    return item.slot === "neck" && family !== "slime";
  }
  function sanitize(speciesId, outfit, items) {
    return Object.fromEntries(Object.entries(outfit || {}).map(([slot, id]) => {
      const item = items.find(i => i.id === id);
      return [slot, item?.slot === slot && compatible(speciesId, item) ? id : null];
    }));
  }
  function tabs(speciesId, catalog, items) {
    return catalog.filter(tab => items.some(item => item.tab === tab.id && compatible(speciesId, item)));
  }
  function anchorsFor({ src = "", species, variant, stage = 3 }, anchors) {
    const key = species.variants ? `${species.id}_${variant || "blue"}` : species.id;
    const sprite = src.match(/\/([a-z0-9_]+)\.webp(?:$|\?)/i)?.[1];
    // Never borrow a cat's face/body for a missing species or colour.
    return anchors[sprite] || anchors[`${key}_${species.stages[stage]}`] || null;
  }
  function fit(anchors, item) {
    if (!anchors || !item?.slot) return null;
    let a = anchors[item.slot];
    if (item.id.includes("spoiler")) a = anchors.spoiler;
    if (["hat_cap_3d", "hat_crown_3d", "tune_siren_3d"].includes(item.id)) a = anchors.crown;
    if (item.id === "unicorn_saddle_3d") a = anchors.saddle;
    if (!a) return null;
    a = [...a];
    if (item.id === "hat_cap_3d") { a[1] += .01; a[2] *= 1.24; }
    return a;
  }
  return { families, compatible, sanitize, tabs, anchorsFor, fit };
});
