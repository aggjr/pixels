(async () => {
  "use strict";

  await window.pixelsProfileReady;
  await window.pixelsCloudReady;
  const metric = (type, detail = {}) => {
    if (!state.preview) window.PixelsMetrics?.event(type, { species: state.species?.id || "", ...detail });
  };
  const lowNeedReported = new Map();

  const DEMO = {
    dayLengthMs: 176_400,       // 1 dia ≈ 2,9 min (−30% vs 4,2 min)
    growthIntervalMs: 94_500,   // ~1,6 min por fase (−30%)
    idealMin: 48,
    idealMax: 66,
    hatchSeconds: 3.36,         // ovo −30% vs 4,8s
  };

  // Ritmo geral: 1 = original; menor = mais rápido (demandas + crescimento)
  const PACE = 2.1;             // −30% vs 3

  const ART = "assets/pets/";
  const SCENE = "assets/scene/";

  // Bioma visual do fundo por espécie (compartilhado entre PIXELs do mesmo habitat)
  const SPECIES_BIOME = {
    unicorn: "meadow",
    dino: "jungle",
    kitty: "cozy",
    floide: "cozy",
    tini: "cozy",
    duck: "pond",
    pig: "farm",
    tractor: "farm",
    mole: "burrow",
    bat: "cave",
    seal: "arctic",
    monkey: "jungle",
    axolotl: "water",
    bee: "garden",
    butterfly: "garden",
    nini: "garden",
    lilica: "garden",
    elephant: "savanna",
    lion: "savanna",
    racer: "garage",
    botcar: "garage",
    rocket: "space",
    heli: "airfield",
    plane: "airfield",
    train: "station",
    boat: "marina",
    slime: "lab",
  };

  const BIOME_BG = {
    meadow: `${SCENE}bg_meadow.webp`,
    garage: `${SCENE}bg_garage.webp`,
    marina: `${SCENE}bg_marina.webp`,
    water: `${SCENE}bg_water.webp`,
    savanna: `${SCENE}bg_savanna.webp`,
    farm: `${SCENE}bg_farm.webp`,
    pond: `${SCENE}bg_pond.webp`,
    jungle: `${SCENE}bg_jungle.webp`,
    cave: `${SCENE}bg_cave.webp`,
    arctic: `${SCENE}bg_arctic.webp`,
    burrow: `${SCENE}bg_burrow.webp`,
    cozy: `${SCENE}bg_cozy.webp`,
    garden: `${SCENE}bg_garden.webp`,
    space: `${SCENE}bg_space.webp`,
    airfield: `${SCENE}bg_airfield.webp`,
    station: `${SCENE}bg_station.webp`,
    lab: `${SCENE}bg_lab.webp`,
  };
  const STAGE_LABELS = ["Ovo", "Bebê", "Criança", "Jovem", "Adulto"];
  const STAGE_SCALE = [1, 0.8, 0.87, 0.94, 1];

  // focus: necessidades candidatas a serem dobradas (1 ou 2 sorteadas ao nascer)
  // growthMs: tempo base por fase (já mais lento para a criança aproveitar)
  const SPECIES = window.PixelsCatalog.SPECIES;

  // Slow needs independently of growth, sleep recovery and the day/night clock.
  const NEED_DRAIN_FACTOR = window.PixelsCatalog.NEED_DRAIN_FACTOR;

  const SPECIES_ANCHORS = window.PixelsCatalog.SPECIES_ANCHORS;

  // Armário 3D: Acessórios e brinquedos 100% calibrados para todos os 28 PIXELs
  const CLOSET_ITEMS = window.PixelsCatalog.CLOSET_ITEMS;
  const CLOSET_TABS = window.PixelsCatalog.CLOSET_TABS;
  const profileKey = window.pixelsStorageKey || (key => key);
  const SAVE_KEY = profileKey("bichinho-collection-v1");
  const emptyOutfit = () => ({ hat: null, face: null, neck: null, body: null, held: null, feet: null, wings: null });


  const TRAIT_LINES = {
    hunger: { icon: "🍎", text: "Eu sinto muita fome!" },
    thirst: { icon: "💧", text: "Eu preciso beber muita água!" },
    hygiene: { icon: "🛁", text: "Eu me sujo muito!" },
    love: { icon: "💗", text: "Eu preciso de muito carinho!" },
    energy: { icon: "🌙", text: "Eu preciso dormir muito!" },
    health: { icon: "💊", text: "Eu fico doentinho fácil!" },
  };

  const TRAIT_LINES_MACHINE = {
    hunger: { icon: "🔧", text: "Eu preciso de muitas peças!" },
    thirst: { icon: "⛽", text: "Eu preciso de muito óleo!" },
    hygiene: { icon: "🧽", text: "Eu fico bem enlameado!" },
    love: { icon: "💗", text: "Eu preciso de muito carinho!" },
    energy: { icon: "🔋", text: "Eu preciso recarregar muito!" },
    health: { icon: "🛠️", text: "Eu quebro fácil! Preciso de conserto!" },
  };

  const NEEDS = {
    hunger: { key: "2", icon: "🍓", text: (p) => `${p} está com fome! Aperte 🍓 Comer` },
    thirst: { key: "3", icon: "💧", text: (p) => `${p} está com sede! Aperte 💧 Beber` },
    hygiene: { key: "4", icon: "🛁", text: (p) => `${p} está sujinho! Aperte 🛁 Banho` },
    love: { key: "5", icon: "💗", text: (p) => `${p} quer colo! Aperte 🤗 Carinho` },
    energy: { key: "6", icon: "🌙", text: (p) => `${p} está com soninho… Aperte 🌙 Dormir` },
    health: { key: "H", icon: "💊", text: (p) => `${p} está doente! Aperte 💊 Saúde` },
  };

  const NEEDS_MACHINE = {
    hunger: { key: "2", icon: "🔧", text: (p) => `${p} precisa de peças! Aperte 🔧 Peças` },
    thirst: { key: "3", icon: "⛽", text: (p) => `${p} precisa de óleo! Aperte ⛽ Óleo` },
    hygiene: { key: "4", icon: "🧽", text: (p) => `${p} está sujo de lama! Aperte 🛁 Banho` },
    love: { key: "5", icon: "💗", text: (p) => `${p} quer colo! Aperte 🤗 Carinho` },
    energy: { key: "6", icon: "🔋", text: (p) => `${p} precisa recarregar… Aperte 🌙 Dormir` },
    health: { key: "H", icon: "🛠️", text: (p) => `${p} quebrou! Aperte 💊 Saúde` },
  };

  function isMachine() {
    return state.species?.diet === "machine";
  }
  function toyEmoji(sp = state.species) {
    if (state.activeToyId) {
      const it = CLOSET_ITEMS.find((i) => i.id === state.activeToyId && i.tab === "toys");
      if (it?.emoji) return it.emoji;
    }
    if (!sp) return "🎾";
    if (sp.toy) return sp.toy;
    const map = {
      kitty: "🧶", floide: "🧶", lilica: "🥕", bunny: "🥕", tini: "🎾", puppy: "🎾",
      dino: "🦴", bat: "🫐", seal: "🐟", monkey: "🍌", bee: "🌸", butterfly: "🌸", nini: "🌺",
      lion: "🦴", elephant: "🍉", axolotl: "🫧", mole: "🍄", duck: "🌽", pig: "🍎",
      unicorn: "⭐", racer: "🏁", botcar: "⚡", rocket: "🚀", heli: "🪢", train: "🚂",
      tractor: "🌾", boat: "⚓", plane: "☁️", slime: "🍮",
    };
    return map[sp.id] || sp.food || "🎾";
  }
  function syncToyUI() {
    const emoji = toyEmoji();
    if (el.btnPlayIcon) el.btnPlayIcon.textContent = emoji;
    if (el.toy) {
      if (state.activeToyId === "toy_ball") {
        if (!el.toy.querySelector("img")) {
          const image = document.createElement("img"); image.src = "assets/accessories/toy-star-ball.png"; image.alt = "Bolinha de estrelinha"; image.draggable = false;
          el.toy.replaceChildren(image);
        }
      } else el.toy.textContent = emoji;
    }
    if (el.wish && !el.wish.hidden && el.wishIcon && state.playing) {
      el.wishIcon.textContent = emoji;
    }
  }
  function needsMap() {
    return isMachine() ? NEEDS_MACHINE : NEEDS;
  }
  function traitLines() {
    return isMachine() ? TRAIT_LINES_MACHINE : TRAIT_LINES;
  }

  const $ = (id) => document.getElementById(id);
  const el = {
    app: $("app"), fx: $("fx"), avatar: $("avatar"), petName: $("petName"), petStage: $("petStage"),
    traitBanner: $("traitBanner"),
    clockIcon: $("clockIcon"), clockTime: $("clockTime"),
    actor: $("actor"), actorMove: $("actorMove"), actorImg: $("actorImg"), eggPeek: $("eggPeek"), actorFx: $("actorFx"), actorGlow: $("actorGlow"),
    bubble: $("bubble"), wish: $("wish"), wishIcon: $("wishIcon"), guide: $("guide"),
    toy: $("toy"), sideCare: $("sideCare"), btnHeal: $("btnHeal"), btnPlay: $("btnPlay"), btnPlayIcon: $("btnPlayIcon"),
    btnCloset: $("btnCloset"), btnContest: $("btnContest"), btnHospital: $("btnHospital"), btnAlbum: $("btnAlbum"), btnCollection: $("btnCollection"),
    closetPanel: $("closetPanel"), closetTray: $("closetTray"), closetGrid: $("closetGrid"), closetTabs: $("closetTabs"), closetClose: $("closetClose"),
    contestPanel: $("contestPanel"), contestContent: $("contestContent"), contestClose: $("contestClose"),
    hospitalPanel: $("hospitalPanel"), hospitalContent: $("hospitalContent"), hospitalClose: $("hospitalClose"),
    albumPanel: $("albumPanel"), albumContent: $("albumContent"), albumClose: $("albumClose"),
    collectionPanel: $("collectionPanel"), collectionGrid: $("collectionGrid"), collectionClose: $("collectionClose"),
    btnNewEgg: $("btnNewEgg"), btnNewPixel: $("btnNewPixel"),
    sceneBg: $("sceneBg"),
    wearWings: $("wearWings"), wearHat: $("wearHat"), wearFace: $("wearFace"), wearNeck: $("wearNeck"), wearBody: $("wearBody"), wearHeld: $("wearHeld"), wearFeet: $("wearFeet"), powerAura: $("powerAura"),
    bathFoamLayer: $("bathFoamLayer"), bathFoamSuit: $("bathFoamSuit"), bathFoamCrown: $("bathFoamCrown"),
    stageGroundProp: $("stageGroundProp"), groundBowlImg: $("groundBowlImg"), groundBowlFx: $("groundBowlFx"),
    stageCareOverlay: $("stageCareOverlay"),
    stage: $("stage"),
    thermoLabel: $("thermoLabel"), thermoKnob: $("thermoKnob"), hatchFill: $("hatchFill"), thermoHint: $("thermoHint"),
    btn1Icon: $("btn1Icon"), btn1Text: $("btn1Text"),
    growthFill: $("growthFill"), growthSteps: $("growthSteps"), flash: $("flash"), projectiles: $("projectiles"),
  };
  const buttons = Object.fromEntries([...document.querySelectorAll(".btn")].map((b) => [b.dataset.key, b]));
  const gauges = Object.fromEntries([...document.querySelectorAll(".gauge")].map((g) => [g.dataset.need, g]));

  const state = {
    phase: "egg", stage: 0, species: null, name: "",
    temp: 22, rubbing: false, idealMs: 0, eggCrack: 0,
    needs: { hunger: 80, thirst: 80, hygiene: 85, love: 75, energy: 90, health: 100 },
    over: { hunger: 0, thirst: 0, hygiene: 0, love: 0, health: 0 },
    mood: "neutral", moodLock: 0, sleeping: false,
    pose: null, busy: false, nextSkit: Infinity,
    growthIntervalMs: DEMO.growthIntervalMs, lackMs: 0,
    boosts: { hunger: 1, thirst: 1, hygiene: 1, love: 1, energy: 1, health: 1 },
    strongTraits: [],
    hatchBag: [],
    variant: null,
    audience: null,
    forceSpecies: null,
    chosenEgg: false,
    playing: false,
    toy: { x: 58, y: 74 },
    actorOff: { x: 0, y: 0 },
    combo: 0,
    comboTimer: 0,
    tapBurst: 0,
    lastTapAt: 0,
    idleAnimAt: 0,
    petId: null,
    hatchAt: null,
    outfit: emptyOutfit(),
    activeToyId: null,
    closetTab: "toys",
    dayStart: performance.now(), lastGrowth: performance.now(), last: performance.now(),
    fxTimer: 0, preview: null, saveTimer: 0,
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function matchesAudience(sp, audience) {
    if (!audience || audience === "both") return true;
    const a = sp.audience || "both";
    return a === "both" || a === audience;
  }

  function readySpecies() {
    return SPECIES.filter((s) => s.ready && matchesAudience(s, state.audience));
  }

  function ownedSpeciesIds() {
    const ids = new Set();
    try {
      const col = loadCollection();
      for (const p of col.pets || []) {
        if (p?.speciesId) ids.add(p.speciesId);
      }
    } catch (_) { /* ignore */ }
    if (state.species?.id && (state.phase === "pet" || state.phase === "hatching")) {
      ids.add(state.species.id);
    }
    if (state.forceSpecies?.id) ids.add(state.forceSpecies.id);
    return ids;
  }

  function availableHatchSpecies() {
    const owned = ownedSpeciesIds();
    return readySpecies().filter((s) => !owned.has(s.id));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(profileKey("bichinho-hatch-bag")) || "[]");
    if (Array.isArray(saved)) state.hatchBag = saved;
  } catch (_) { /* ignore */ }

  function setAudience(audience, { resetBag = true } = {}) {
    state.audience = audience;
    try {
      localStorage.setItem(profileKey("bichinho-audience"), audience);
      if (resetBag) {
        localStorage.removeItem(profileKey("bichinho-hatch-bag"));
        state.hatchBag = [];
      }
    } catch (_) { /* ignore */ }
  }

  function loadAudience() {
    try {
      const a = localStorage.getItem(profileKey("bichinho-audience"));
      if (a === "boy" || a === "girl" || a === "both") return a;
    } catch (_) { /* ignore */ }
    return null;
  }

  function rollStrongTraits(sp) {
    const pool = [...(sp.focus || ["hunger", "love"])];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = Math.random() < 0.45 ? 1 : 2;
    const picked = pool.slice(0, Math.min(count, pool.length));
    const boosts = { hunger: 1, thirst: 1, hygiene: 1, love: 1, energy: 1 };
    picked.forEach((k) => { boosts[k] = 2; });
    const lines = traitLinesFor(sp);
    return {
      boosts,
      strongTraits: picked,
      phrases: picked.map((k) => lines[k]),
    };
  }

  function traitLinesFor(sp) {
    return sp?.diet === "machine" ? TRAIT_LINES_MACHINE : TRAIT_LINES;
  }

  function traitBannerText() {
    if (!state.strongTraits?.length) return "";
    const lines = traitLines();
    return state.strongTraits
      .map((k) => `${lines[k].icon} ${lines[k].text}`)
      .join("  ·  ");
  }

  function applyDietUI() {
    const machine = isMachine();
    const hungerIcon = machine ? "🔧" : (state.species?.food || "🍓");
    const thirstIcon = machine ? "⛽" : "💧";
    const $ih = $("iconHunger"); const $lh = $("labelHunger");
    const $it = $("iconThirst"); const $lt = $("labelThirst");
    const $b2i = $("btn2Icon"); const $b2t = $("btn2Text");
    const $b3i = $("btn3Icon"); const $b3t = $("btn3Text");
    if ($ih) $ih.textContent = hungerIcon;
    if ($lh) $lh.textContent = machine ? "Peças" : "Fome";
    if ($it) $it.textContent = thirstIcon;
    if ($lt) $lt.textContent = machine ? "Óleo" : "Sede";
    if ($b2i) $b2i.textContent = hungerIcon;
    if ($b2t) $b2t.textContent = machine ? "Peças" : "Comer";
    if ($b3i) $b3i.textContent = thirstIcon;
    if ($b3t) $b3t.textContent = machine ? "Óleo" : "Beber";
  }

  function renderTraitBanner() {
    if (!el.traitBanner) return;
    if (state.phase !== "pet" || !state.strongTraits?.length) {
      el.traitBanner.hidden = true;
      return;
    }
    el.traitBanner.hidden = false;
    el.traitBanner.textContent = traitBannerText();
  }

  // ---------- Art selection ----------
  function growthFracNow() {
    if (state.stage >= 4) return 1;
    const ms = state.growthIntervalMs || 1;
    const started = state.lastGrowth || performance.now();
    return clamp((performance.now() - started) / ms, 0, 0.999);
  }

  /** Chupeta só até o meio da barra de criança (stage 3). */
  function canUsePacifier() {
    if (state.stage <= 2) return true;
    if (state.stage === 3) return growthFracNow() < 0.5;
    return false;
  }

  function isLion(sp = state.species) {
    return sp?.id === "lion" || sp?.temperament === "grumpy";
  }

  function lionPamperedEnough() {
    return window.PixelsCatalog.lionContent(state.needs);
  }

  function hasPose(pose) {
    return !!window.PixelsCatalog.actionArt(state.species, state.stage, state.variant, pose, canUsePacifier());
  }
  function artKey(sp) {
    if (sp?.variants && state.variant) return `${sp.id}_${state.variant}`;
    return sp.id;
  }
  function baseArt(sp, stage) {
    return window.PixelsCatalog.spriteArt(sp, stage, state.variant);
  }
  function sleepArt(sp, stage) {
    return window.PixelsCatalog.sleepSprite(sp, stage, state.variant, canUsePacifier());
  }
  function wantsSomething() {
    const n = state.needs;
    return n.hunger < 40 || n.thirst < 40 || n.love < 40 || n.hygiene < 30 || n.energy < 30 || n.health < 40;
  }
  function expressionPose() {
    if (state.busy || state.sleeping || !state.species) return null;
    const n = state.needs;
    const has = (p) => state.species.poses.includes(p);
    if ((state.mood === "sick" || n.health < 35) && has("sad")) return "sad";
    // The expression follows the actual mood, including a calm neutral face.
    if (isLion()) {
      if (state.mood === "happy" && lionPamperedEnough() && has("happy")) return "happy";
      if (state.mood === "sad" && has("sad")) return "sad";
      if (state.mood === "mad" && has("mad")) return "mad";
      // Base lion sprites already show anger; use the friendly pose for neutral mood.
      return has("happy") ? "happy" : null;
    }
    if (state.mood === "mad" && has("mad")) return "mad";
    const order = ["health", "hygiene", "energy", "love", "hunger", "thirst"];
    const worst = order.slice().sort((a, b) => n[a] - n[b])[0];
    if (n[worst] < 40) {
      if (worst === "health" && has("sad")) return "sad";
      if (worst === "hygiene" && has("scratch")) return "scratch";
      // sleepy.webp quase sempre tem chupeta — só no bebê / início da criança
      if (worst === "energy" && has("sleepy") && canUsePacifier()) return "sleepy";
      if (worst === "love" && has("sad")) return "sad";
      if ((worst === "hunger" || worst === "thirst") && has("plead")) return "plead";
    }
    if (state.mood === "sad" && has("sad")) return "sad";
    if (state.playing && has("rear")) return null;
    if (wantsSomething() && has("plead")) return "plead";
    return null;
  }
  function enablePetUI() {
    Object.values(buttons).forEach((b) => (b.disabled = false));
    if (el.sideCare) {
      el.sideCare.hidden = false;
      el.sideCare.removeAttribute("hidden");
      el.sideCare.style.display = "";
    }
    if (el.btnHeal) el.btnHeal.disabled = false;
    if (el.btnPlay) el.btnPlay.disabled = false;
    if (el.btnCloset) el.btnCloset.disabled = false;
    if (el.btnContest) el.btnContest.disabled = false;
    if (el.btnHospital) el.btnHospital.disabled = false;
    if (el.btnAlbum) el.btnAlbum.disabled = false;
    if (el.btnCollection) el.btnCollection.disabled = false;
    if (el.btnNewPixel) el.btnNewPixel.disabled = !!state.preview || !canStartNewEgg();
    syncToyUI();
  }

  function loadCollection() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!raw || !Array.isArray(raw.pets)) return { version: 1, activePetId: null, pets: [] };
      return raw;
    } catch (_) {
      return { version: 1, activePetId: null, pets: [] };
    }
  }
  function writeCollection(col) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(col)); } catch (_) {}
    if (!state.preview) window.PixelsMetrics?.collectionChanged();
  }
  function snapshotPet() {
    if (state.phase !== "pet" || !state.species || state.preview) return null;
    return {
      id: state.petId || (state.petId = crypto.randomUUID?.() || `pet-${Date.now()}`),
      speciesId: state.species.id,
      variant: state.variant,
      name: state.name,
      nameChosen: state.nameChosen !== false,
      pronoun: state.pronoun || state.species.he,
      stage: state.stage,
      needs: { ...state.needs },
      sleeping: state.sleeping || !!state.sleepRequested,
      mood: state.mood,
      boosts: { ...(state.boosts || {}) },
      strongTraits: [...(state.strongTraits || [])],
      outfit: { ...state.outfit },
      activeToyId: state.activeToyId,
      hatchAt: state.hatchAt || Date.now(),
      updatedAt: Date.now(),
      growthIntervalMs: state.growthIntervalMs,
      lackMs: state.lackMs,
      growthProgress: growthFracNow(),
      frozen: false,
    };
  }
  function saveActivePet({ freeze = false } = {}) {
    const snap = snapshotPet();
    if (!snap) return;
    const col = loadCollection();
    // Não desfaz arquivo/freeze (ex.: pagehide depois de "Pegar ovo novo")
    if (!freeze) {
      const existing = col.pets.find((p) => p.id === snap.id);
      if (existing?.frozen && col.activePetId == null) return;
    }
    if (freeze) {
      snap.frozen = true;
      snap.sleeping = false;
      snap.mood = snap.mood === "sleep" ? "happy" : (snap.mood || "happy");
    }
    const i = col.pets.findIndex((p) => p.id === snap.id);
    if (i >= 0) col.pets[i] = snap; else col.pets.push(snap);
    col.activePetId = freeze ? null : snap.id;
    col.version = 1;
    writeCollection(col);
  }
  function applyPetSnapshot(snap) {
    const species = SPECIES.find((s) => s.id === snap.speciesId) || SPECIES.find((s) => s.ready) || SPECIES[0];
    if (!state.audience) state.audience = "both";
    applyVariant(species, snap.variant || pickVariant(species));
    Object.assign(state, {
      phase: "pet",
      petId: snap.id,
      species,
      name: snap.name || pick(species.names),
      nameChosen: snap.nameChosen !== false,
      pronoun: snap.pronoun || species.he,
      stage: clamp(snap.stage || 1, 1, 4),
      needs: { hunger: 80, thirst: 80, hygiene: 85, love: 75, energy: 90, health: 100, ...(snap.needs || {}) },
      sleeping: !!snap.sleeping,
      sleepRequested: false,
      boosts: snap.boosts || { hunger: 1, thirst: 1, hygiene: 1, love: 1, energy: 1, health: 1 },
      strongTraits: snap.strongTraits || [],
      outfit: { ...emptyOutfit(), ...window.PixelsWardrobe.sanitize(snap.speciesId, window.PixelsLooks.migrate(snap.outfit || {}), CLOSET_ITEMS) },
      activeToyId: snap.activeToyId || null,
      hatchAt: snap.hatchAt || Date.now(),
      growthIntervalMs: snap.growthIntervalMs || speciesGrowthMs(species),
      lackMs: snap.lackMs || 0,
      pose: null,
      busy: false,
      playing: false,
      actorOff: { x: 0, y: 0 },
      lastGrowth: performance.now() - clamp(snap.growthProgress || 0, 0, 0.999) * (snap.growthIntervalMs || speciesGrowthMs(species)),
      nextSkit: performance.now() + 8000,
    });
    // Descongela ao voltar a brincar — status continua exatamente como foi pausado
    const col = loadCollection();
    const i = col.pets.findIndex((p) => p.id === snap.id);
    if (i >= 0) {
      col.pets[i] = { ...col.pets[i], frozen: false, updatedAt: Date.now() };
      col.activePetId = snap.id;
      writeCollection(col);
    }
    el.app.dataset.phase = "pet";
    el.app.classList.remove("playing");
    if (el.toy) el.toy.hidden = true;
    enablePetUI();
    el.btn1Icon.textContent = "☀️";
    el.btn1Text.textContent = "Acordar";
    renderActor(); renderOutfit(); renderHeader(); renderNeeds(); renderGrowth();
    setMood(snap.sleeping ? "sleep" : (snap.mood || "happy"), 1200);
    if (state.nameChosen === false) {
      state.naming = true;
      say("Oi! Ainda estou esperando meu nome 💛", 2000);
      setTimeout(choosePetName, 900);
    } else say(snap.frozen ? `${state.name} acordou do pausado! 💖` : `Oi de novo! Eu sou ${state.name}! 💖`, 2400);
  }
  function tryResumeSavedPet() {
    if (state.preview) return false;
    const q = new URLSearchParams(location.search);
    if (q.get("hatch") != null || q.get("species") || q.get("egg") != null) return false;
    if (q.get("new") != null) return false;
    const col = loadCollection();
    const snap = col.pets.find((p) => p.id === col.activePetId);
    if (!snap || snap.frozen) return false;
    applyPetSnapshot(snap);
    return true;
  }
  function canStartNewEgg() {
    // Sempre pode pegar ovo novo (se ainda houver espécies ready no público)
    return readySpecies().length > 0;
  }

  // Prefere espécie nova; se já tiver todas, pode repetir
  function pickHatchSpecies() {
    let pool = availableHatchSpecies();
    if (!pool.length) pool = readySpecies();
    if (!pool.length) return null;
    const poolIds = new Set(pool.map((s) => s.id));
    state.hatchBag = (state.hatchBag || []).filter((id) => poolIds.has(id));
    if (!state.hatchBag.length) {
      state.hatchBag = pool.map((s) => s.id);
      for (let i = state.hatchBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.hatchBag[i], state.hatchBag[j]] = [state.hatchBag[j], state.hatchBag[i]];
      }
    }
    const id = state.hatchBag.pop();
    try {
      localStorage.setItem(profileKey("bichinho-hatch-bag"), JSON.stringify(state.hatchBag));
    } catch (_) { /* ignore */ }
    return pool.find((s) => s.id === id) || pool[0];
  }
  let creatingNewPixel = false;
  async function archiveAndNewEgg() {
    if (state.preview || creatingNewPixel) return;
    metric("new_egg");
    if (!canStartNewEgg()) {
      say("Ainda não tem PIXELs liberados pra esse público…", 2800);
      return;
    }
    creatingNewPixel = true;
    if (state.phase === "pet") {
      saveActivePet({ freeze: true });
    }
    try {
      // Reconstrói a bag (prioriza espécies ainda não usadas)
      state.hatchBag = [];
      localStorage.removeItem(profileKey("bichinho-hatch-bag"));
      localStorage.setItem(profileKey("bichinho-force-new-egg"), "1");
    } catch (_) {}
    state.skipAutosave = true;
    await window.PixelsMetrics?.flushCollection?.();
    try { sessionStorage.setItem("pixels-enter-profile", window.pixelsPlayer.id); } catch (_) {}
    location.href = "./?new=1";
  }

  function itemPreviewMarkup(item) {
    if (!item) return "";
    if (item.art) return `<img src="${item.art}" alt="" />`;
    if (item.svg) return item.svg;
    return item.emoji || "✨";
  }

  function creatorCreditElement(creation) {
    const credit = window.PixelsCatalog.creatorCredit(creation);
    if (!credit) return null;
    const caption = document.createElement("span");
    caption.className = "creator-credit";
    caption.textContent = credit;
    return caption;
  }

  const ECO_KEY = profileKey("pixels-ecosystem-v1");
  function loadEco() {
    try {
      const raw = JSON.parse(localStorage.getItem(ECO_KEY) || "null");
      if (raw && typeof raw === "object") return raw;
    } catch (_) {}
    return {
      angelPoints: 0,
      helpedCount: 0,
      unlockedItems: [],
      stickers: ["titanic", "kitty_star", "unicorn_pegasus"],
      contestVotes: {},
      userEntries: {},
    };
  }
  function saveEco(eco) {
    try { localStorage.setItem(ECO_KEY, JSON.stringify(eco)); } catch (_) {}
  }
  function isItemUnlocked(item) {
    return !item.locked;
  }
  function unlockClosetItem(itemId) {
    const eco = loadEco();
    if (!eco.unlockedItems.includes(itemId)) {
      eco.unlockedItems.push(itemId);
      saveEco(eco);
    }
  }

  function equippedItemsList(outfit = state.outfit, speciesId = state.species?.id) {
    const order = ["wings", "hat", "face", "neck", "body", "held", "feet"];
    return order
      .map((slot) => outfit?.[slot] && CLOSET_ITEMS.find((i) => i.id === outfit[slot]))
      .filter(item => item && window.PixelsWardrobe.compatible(speciesId, item));
  }

  function getSpriteAnchors(srcOverride, speciesIdOverride, stageOverride) {
    const species = speciesIdOverride ? SPECIES.find(s => s.id === speciesIdOverride) : state.species;
    if (!species) return null;
    const stage = stageOverride ? Object.keys(species.stages).find(n => species.stages[n] === stageOverride) : state.stage;
    return window.PixelsWardrobe.anchorsFor({ src: srcOverride ?? el.actorImg?.getAttribute("src"), species, variant: state.variant, stage }, SPECIES_ANCHORS);
  }
  function resolveAnchorForItem(anchors, slot, item) {
    return window.PixelsWardrobe.fit(anchors, item);
  }

  function renderOutfit() {
    const appearance = document.getElementById("actorAppearance");
    if (!appearance) return;
    const items = equippedItemsList();
    const fitted = items.some((i) => i.art);
    const img = el.actorImg;
    const src = img?.getAttribute("src") || "";
    const coreArt = /_(newborn|baby|child|adult)\.(?:webp|png)(?:$|\?)/i.test(src);
    const bathActive = !!(el.bathFoamLayer && !el.bathFoamLayer.hidden);
    const canShowOverlays = !!getSpriteAnchors(src) && fitted && !state.sleeping && coreArt && img.naturalWidth > 0 && img.clientWidth > 0;
    const useSharedFrame = (canShowOverlays || bathActive) && !state.sleeping && img.naturalWidth > 0 && img.clientWidth > 0;

    el.actor.classList.toggle("has-accessories", useSharedFrame);
    appearance.style.setProperty("--pet-scale", STAGE_SCALE[state.stage] || 1);

    // Powers & Unicorn Flight effects!
    const hasWings = !state.sleeping && items.some((i) => i.effect === "fly" || i.slot === "wings");
    const hasLightning = !state.sleeping && items.some((i) => i.effect === "lightning");
    const hasBeauty = !state.sleeping && items.some((i) => i.effect === "beauty");
    const unicornFlying = hasWings && (state.species?.id === "unicorn" ? state.stage >= 1 : true);
    el.actor.classList.toggle("unicorn-flying", unicornFlying);
    el.actor.classList.toggle("power-lightning", hasLightning);
    el.actor.classList.toggle("power-beauty", hasBeauty);
    if (el.powerAura) {
      el.powerAura.hidden = !(hasLightning || hasBeauty);
    }

    const anchors = getSpriteAnchors(src);
    const fit = Math.min(img.clientWidth / (img.naturalWidth || 1), img.clientHeight / (img.naturalHeight || 1));
    const w = (img.naturalWidth || 1) * fit, h = (img.naturalHeight || 1) * fit;
    const left = (img.clientWidth - w) / 2, top = img.clientHeight - h;

    const map = {
      wings: el.wearWings,
      hat: el.wearHat,
      face: el.wearFace,
      neck: el.wearNeck,
      body: el.wearBody,
      held: el.wearHeld,
      feet: el.wearFeet,
    };
    for (const [slot, node] of Object.entries(map)) {
      if (!node) continue;
      const id = state.outfit?.[slot];
      const item = id && CLOSET_ITEMS.find((i) => i.id === id);
      if (!item || item.completeLook || !window.PixelsWardrobe.compatible(state.species?.id, item) || !canShowOverlays) {
        node.hidden = true;
        continue;
      }
      node.hidden = false;
      node.classList.toggle("wear-art", !!item?.art);
      if (item?.art) {
        const mounts = window.PixelsWardrobe.mounts(state.species, state.stage, anchors, item);
        const multi = item.id === "tune_wheels_gold";
        node.classList.toggle("wear-multiple", multi);
        const cacheKey = item.id + ":" + mounts.length;
        if (node.dataset.item !== cacheKey) {
          node.replaceChildren(...mounts.map(() => {
            const art = document.createElement("img");
            art.src = item.art; art.alt = item.name; art.draggable = false;
            return art;
          }));
          node.dataset.item = cacheKey;
        }
        if (multi) {
          Object.assign(node.style, { left: left + "px", top: top + "px", width: w + "px", height: h + "px", rotate: "0deg" });
          mounts.forEach((a, i) => Object.assign(node.children[i].style, {
            position: "absolute", left: w*a[0]+"px", top: h*a[1]+"px", width: w*a[2]+"px",
            transform: "translate(-50%,-50%) scaleX("+a[4]+")", rotate: a[3]+"deg"
          }));
        } else {
          const a = mounts[0];
          if (!a) { node.hidden = true; continue; }
          Object.assign(node.style, { left: left+w*a[0]+"px", top: top+h*a[1]+"px", width: w*a[2]+"px", height: "auto", rotate: a[3]+"deg" });
        }
      } else {
        node.removeAttribute("style");
        node.dataset.item = "";
        node.textContent = item ? item.emoji : "";
      }
    }

    if (bathActive && anchors && img.naturalWidth > 0 && img.clientWidth > 0) {
      const [, fy] = anchors.face || [0.5, 0.35];
      const [bx] = anchors.body || [0.5, 0.65];
      const [cx] = anchors.crown || [0.5, 0.14];
      const suitTopFrac = clamp(fy + 0.05, 0.34, 0.56);
      const suitSizeFrac = clamp(1.04 - suitTopFrac, 0.50, 0.68);
      const suitCenterY = suitTopFrac + suitSizeFrac * 0.48;
      if (el.bathFoamSuit) {
        el.bathFoamSuit.style.left = `${left + w * bx}px`;
        el.bathFoamSuit.style.top = `${top + h * suitCenterY}px`;
        el.bathFoamSuit.style.width = `${w * suitSizeFrac * 1.05}px`;
        el.bathFoamSuit.style.height = `${w * suitSizeFrac * 1.05}px`;
      }
      if (el.bathFoamCrown) {
        const crownCenterY = clamp(fy - 0.14, 0.11, 0.34);
        el.bathFoamCrown.style.left = `${left + w * cx}px`;
        el.bathFoamCrown.style.top = `${top + h * crownCenterY}px`;
        el.bathFoamCrown.style.width = `${w * 0.50}px`;
        el.bathFoamCrown.style.height = `${h * 0.30}px`;
      }
    }
  }

  function defaultClosetTab() {
    if (state.species?.id === "kitty") return "looks";
    if (state.species?.id === "unicorn") return "powers";
    if (isMachine()) return "tuning";
    return "clothes";
  }

  function closeAllSheets() {
    if (el.closetPanel) el.closetPanel.hidden = true;
    if (el.contestPanel) el.contestPanel.hidden = true;
    if (el.hospitalPanel) el.hospitalPanel.hidden = true;
    if (el.albumPanel) el.albumPanel.hidden = true;
    if (el.collectionPanel) el.collectionPanel.hidden = true;
  }

  function openCloset(tab) {
    metric("closet_open");
    if (state.phase !== "pet") return;
    const validTabs = window.PixelsWardrobe.tabs(state.species?.id, CLOSET_TABS, CLOSET_ITEMS).map(t => t.id);
    const wanted = tab || (state.species?.id === "kitty" ? "looks" : state.closetTab);
    state.closetTab = validTabs.includes(wanted) ? wanted : defaultClosetTab();
    closeAllSheets();
    if (el.closetPanel) el.closetPanel.hidden = false;
    renderCloset();
  }
  function closeCloset() {
    if (el.closetPanel) el.closetPanel.hidden = true;
    state.nextSkit = performance.now() + 8000;
  }
  function tierBadgeMarkup(item) {
    if (item.locked) return '<span class="tier-badge">Em breve</span>';
    return ""; // No prices or future reward systems in the current wardrobe.
    if (item.tab === "toys") return "";
    if (item.tier === "grife") {
      return `<span class="tier-badge tier-grife">👑 Grife · ${isItemUnlocked(item) ? "Liberado" : item.price}</span>`;
    }
    if (item.tier === "fashion") {
      return `<span class="tier-badge tier-fashion">✨ Fashion · ${isItemUnlocked(item) ? "Liberado" : item.price}</span>`;
    }
    return `<span class="tier-badge tier-basic">Grátis</span>`;
  }
  function renderCloset() {
    if (!el.closetTabs || !el.closetGrid) return;
    const equippedList = equippedItemsList();
    const count = equippedList.length;
    const completeLook = window.PixelsLooks.active(state.species?.id, state.outfit);

    if (el.closetTray) {
      el.closetTray.innerHTML = "";
      for (let idx = 0; idx < 3; idx++) {
        if (completeLook && idx > 0) continue;
        const eq = equippedList[idx];
        const slotBtn = document.createElement("button");
        slotBtn.type = "button";
        if (eq) {
          slotBtn.className = "tray-slot filled";
          slotBtn.title = `Devolver ${eq.name}`;
          slotBtn.innerHTML = `<span class="te">${itemPreviewMarkup(eq)}</span><span class="tn">${eq.name}</span><span class="tx">✕</span>`;
          slotBtn.addEventListener("click", () => equipItem(eq));
        } else {
          slotBtn.className = "tray-slot empty";
          slotBtn.disabled = true;
          slotBtn.textContent = `${idx + 1}ª peça livre`;
        }
        el.closetTray.appendChild(slotBtn);
      }
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "tray-clear";
      clearBtn.disabled = count === 0;
      clearBtn.textContent = "Guardar tudo";
      clearBtn.addEventListener("click", () => {
        state.outfit = emptyOutfit();
        renderActor();
        saveActivePet();
        renderCloset();
        say("Devolvi tudo pro armário! ✨", 1600);
      });
      el.closetTray.appendChild(clearBtn);
    }

    el.closetTabs.innerHTML = "";
    const tabs = window.PixelsWardrobe.tabs(state.species?.id, CLOSET_TABS, CLOSET_ITEMS);
    if (!tabs.some(t => t.id === state.closetTab)) state.closetTab = tabs[0]?.id;
    if (isMachine()) {
      tabs.sort((a, b) => (a.id === "tuning" ? -1 : b.id === "tuning" ? 1 : 0));
    } else if (state.species?.id === "unicorn") {
      tabs.sort((a, b) => (a.id === "powers" ? -1 : b.id === "powers" ? 1 : 0));
    }
    tabs.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "closet-tab" + (state.closetTab === t.id ? " on" : "");
      b.textContent = t.label;
      b.addEventListener("click", () => { state.closetTab = t.id; renderCloset(); });
      el.closetTabs.appendChild(b);
    });
    el.closetGrid.innerHTML = "";
    const statusEl = document.getElementById("closetStatus");
    if (statusEl) {
      statusEl.innerHTML = completeLook
        ? "<b>Conjunto completo</b> · vestido, bolsa e acessórios combinando. Escolher uma peça avulsa troca este visual."
        : count >= 3
        ? `<b>3/3 peças equipadas</b> · toque numa peça acima para devolver e trocar!`
        : `<b>${count}/3 peças no PIXEL</b> · experimente, combine e guarde suas favoritas.`;
    }
    CLOSET_ITEMS.filter((i) => i.tab === state.closetTab && window.PixelsWardrobe.compatible(state.species?.id, i)).forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "closet-item";
      const equipped = item.tab === "toys"
        ? state.activeToyId === item.id
        : state.outfit[item.slot] === item.id;
      const unlocked = isItemUnlocked(item);
      const sameSlotOccupied = item.tab !== "toys" && !!state.outfit[item.slot] && state.outfit[item.slot] !== item.id;
      if (equipped) b.classList.add("on");
      if (!unlocked) b.classList.add("locked");
      b.disabled = !unlocked;
      if (!unlocked) b.title = "Nível intermediário · Em breve";
      if (item.tab !== "toys" && count >= 3 && !equipped && !sameSlotOccupied) {
        b.classList.add("limit-reached");
      }
      b.setAttribute("aria-pressed", String(equipped));
      b.innerHTML = `${tierBadgeMarkup(item)}<span class="ce">${itemPreviewMarkup(item)}</span><span class="cn">${item.name}</span>`;
      const credit = creatorCreditElement(item);
      if (credit) b.querySelector(".ce").after(credit);
      b.addEventListener("click", () => equipItem(item));
      el.closetGrid.appendChild(b);
    });
  }

  function equipItem(item) {
    if (!isItemUnlocked(item)) return;
    if (!window.PixelsWardrobe.compatible(state.species?.id, item)) return;
    if (item.completeLook) {
      const removing = state.outfit.body === item.id;
      state.outfit = { ...emptyOutfit(), body: removing ? null : item.id };
      renderActor(); saveActivePet(); renderCloset();
      metric("equip", { action: item.id });
      say(removing ? "Guardei o conjunto com carinho! ✨" : "Vestido, bolsinha e tudo combinando! 💖", 2400);
      return;
    }
    // Separate accessories replace the integrated outfit, rather than floating over it.
    if (item.tab !== "toys" && window.PixelsLooks.active(state.species?.id, state.outfit)) state.outfit = emptyOutfit();
    if (item.tab === "toys") {
      state.activeToyId = state.activeToyId === item.id ? null : item.id;
      syncToyUI();
      say(state.activeToyId ? `Agora vamos de ${item.emoji} ${item.name}!` : "Brinquedo guardado — volto ao padrão!", 1800);
    } else {
      const cur = state.outfit[item.slot];
      const count = equippedItemsList().length;
      if (cur !== item.id && !cur && count >= 3) {
        document.getElementById("closetStatus").textContent = "Só cabem 3 peças por PIXEL! Toque numa das 3 peças lá em cima para devolver antes de pegar outra.";
        say("Devolve uma das 3 peças primeiro pra pegar outra! ✨", 2200);
        return;
      }
      // Se for item Fashion ou Grife ainda não liberado, permite experimentar na hora E libera via Feira/Anjo do Mês!
      if (!isItemUnlocked(item)) {
        unlockClosetItem(item.id);
      }
      state.outfit[item.slot] = cur === item.id ? null : item.id;
      renderActor();
      if (state.outfit[item.slot]) {
        if (item.effect === "fly") {
          rain(["🪽", "✨", "🌈", "⭐"], 10);
          playMove("fly", 1800);
          say(state.species?.id === "unicorn" && state.stage === 4
            ? `${state.name} abriu as Asas de Pégaso e está VOANDO de verdade! 🦄🪽✨`
            : `${state.name} está voando com as Asas de Pégaso! 🪽✨`, 3000);
        } else if (item.effect === "lightning") {
          rain(["⚡", "✨", "💙", "⭐"], 12);
          stageShake();
          say(`PODER DE RAIOS ATIVADO! ⚡ ${state.name} está eletrizante!`, 2800);
        } else if (item.effect === "beauty") {
          rain(["💖", "✨", "🌸", "👑"], 12);
          say(`LÍQUIDO DA BELEZA! ✨ ${state.name} se transformou num PIXEL radiante!`, 2800);
        } else {
          rain([item.emoji || "✨", "✨", "💖"], 6);
          say(`Ficou perfeito de ${item.name}! ✨`, 1800);
        }
      } else {
        say(`Devolvi ${item.name} pro armário!`, 1600);
      }
      setMood("happy", 1400);
    }
    metric("equip", { action: item.id });
    saveActivePet();
    renderCloset();
  }

  // ---------- 1. DESFILE DO MÊS POR IDADE (Bebê, Criança, Jovem, Adulto) ----------
  let contestAgeTab = 3;
  const CONTEST_CANDIDATES = {
    1: [
      { id: "c1_lili", name: "Mimi Bebê", species: "kitty", stage: 1, art: "assets/pets/kitty_newborn.webp", accs: ["hat_bow_pink", "face_glasses_ocean", "feet_paw_shoes"], votes: 42, owner: "Sofia" },
      { id: "c1_uni", name: "Estrelinha", species: "unicorn", stage: 1, art: "assets/pets/unicorn_newborn.webp", accs: ["hat_crown_3d", "face_glasses_pink", "unicorn_wings_3d"], votes: 39, owner: "Manu" },
      { id: "c1_rac", name: "Faísca Jr", species: "racer", stage: 1, art: "assets/pets/racer_newborn.webp", accs: ["tune_spoiler_gt", "face_glasses_gold", "tune_wheels_gold"], votes: 34, owner: "Lucas" },
    ],
    2: [
      { id: "c2_flo", name: "Floide Fofo", species: "floide", stage: 2, art: "assets/pets/floide_newborn.webp", accs: ["hat_cap_3d", "face_glasses_ocean", "feet_sneakers_3d"], votes: 51, owner: "Pedro" },
      { id: "c2_lil", name: "Lilica Doce", species: "lilica", stage: 2, art: "assets/pets/lilica_newborn.webp", accs: ["hat_bow_turquoise", "body_dress_lilac", "feet_paw_shoes"], votes: 48, owner: "Clara" },
    ],
    3: [
      { id: "c3_lili", name: "Lili Fashion", species: "kitty", stage: 3, art: "assets/pets/kitty_child.webp", accs: ["hat_bow_pink", "face_glasses_ocean", "body_dress_lilac"], votes: 89, owner: "Helena" },
      { id: "c3_uni", name: "Celeste", species: "unicorn", stage: 3, art: "assets/pets/unicorn_child.webp", accs: ["hat_bow_lilac", "unicorn_saddle_3d", "unicorn_wings_3d"], votes: 84, owner: "Alice" },
      { id: "c3_rac", name: "Relâmpago", species: "racer", stage: 3, art: "assets/pets/racer_child.webp", accs: ["tune_spoiler_neon", "tune_exhaust_flame", "tune_wheels_gold"], votes: 77, owner: "Gabriel" },
    ],
    4: [
      { id: "c4_uni", name: "Pégaso Real", species: "unicorn", stage: 4, art: "assets/pets/unicorn_adult.webp", accs: ["hat_crown_3d", "unicorn_saddle_3d", "unicorn_wings_3d"], votes: 128, owner: "Valentina" },
      { id: "c4_bot", name: "Cyber Volt", species: "botcar", stage: 4, art: "assets/pets/botcar_adult.webp", accs: ["tune_siren_3d", "face_glasses_gold", "power_lightning_3d"], votes: 115, owner: "Davi" },
      { id: "c4_rac", name: "Turbo Max", species: "racer", stage: 4, art: "assets/pets/racer_adult.webp", accs: ["tune_spoiler_gt", "tune_exhaust_flame", "tune_wheels_gold"], votes: 109, owner: "Mateus" },
    ],
  };

  function renderMiniDressedPetMarkup(c) {
    const anchors = getSpriteAnchors(c.art, c.species);
    const accItems = (c.accs || []).map((id) => CLOSET_ITEMS.find((i) => i.id === id)).filter((i) => i?.art);
    const zOrder = { wings: 1, body: 3, neck: 4, feet: 4, face: 5, hat: 6, held: 6 };
    const overlays = accItems.map((item) => {
      const a = resolveAnchorForItem(anchors, item.slot, item);
      const z = zOrder[item.slot] || 4;
      return `<img src="${item.art}" alt="" style="position:absolute;left:${a[0]*100}%;top:${a[1]*100}%;width:${a[2]*100}%;height:auto;translate:-50% -50%;rotate:${a[3]}deg;z-index:${z};pointer-events:none;filter:drop-shadow(0 2px 3px rgba(40,10,60,.28))" />`;
    }).join("");
    return `<img class="base-pet" src="${c.art}" alt="${c.name}" style="position:relative;z-index:2" />${overlays}`;
  }

  function openContest() {
    return; // Future feature, outside the current care game.
    if (state.phase !== "pet") return;
    contestAgeTab = clamp(state.stage || 3, 1, 4);
    closeAllSheets();
    if (el.contestPanel) el.contestPanel.hidden = false;
    renderContest();
  }
  function closeContest() {
    if (el.contestPanel) el.contestPanel.hidden = true;
  }
  function renderContest() {
    if (!el.contestContent) return;
    const eco = loadEco();
    const ageNames = { 1: "👶 Bebê", 2: "🧒 Criança", 3: "🌟 Jovem", 4: "👑 Adulto" };
    const equipped = equippedItemsList();
    const userEntry = eco.userEntries?.[contestAgeTab];
    const candidates = [...(CONTEST_CANDIDATES[contestAgeTab] || [])];
    if (userEntry) candidates.unshift(userEntry);

    let html = `
      <div class="hub-banner">
        <div>
          <b>🏆 PIXEL Mais Estiloso do Mês (${ageNames[contestAgeTab]})</b><br/>
          <span>Candidatar e votar é 100% grátis! Os campeões do mês e do ano ganham peças Grife e Figurinha Dourada!</span>
        </div>
        <button type="button" class="hub-btn gold" id="btnEnterContest">📸 Inscrever ${state.name}</button>
      </div>
      <div class="closet-tabs" id="contestAgeTabs">
        ${[1, 2, 3, 4].map((st) => `<button type="button" class="closet-tab ${contestAgeTab === st ? "on" : ""}" data-st="${st}">${ageNames[st]}</button>`).join("")}
      </div>
      <div class="hub-grid">
        ${candidates.map((c) => {
          const vCount = (c.votes || 0) + (eco.contestVotes?.[c.id] || 0);
          const accImgs = (c.accs || []).map((id) => CLOSET_ITEMS.find((i) => i.id === id)).filter(Boolean);
          return `
            <div class="hub-card">
              <span class="tier-badge tier-grife">⭐ ${vCount} votos</span>
              <div class="hub-stage-preview">
                ${renderMiniDressedPetMarkup(c)}
              </div>
              <b>${c.name}</b>
              <span style="font-size:0.7rem;color:#7a4a9a">de ${c.owner} · ${accImgs.length} peças 3D</span>
              <div style="display:flex;gap:4px;justify-content:center;min-height:26px">
                ${accImgs.map((a) => `<img src="${a.art}" alt="" style="width:24px;height:24px;object-fit:contain"/>`).join("")}
              </div>
              <button type="button" class="hub-btn" data-vote="${c.id}">💖 Votar Grátis</button>
            </div>
          `;
        }).join("")}
      </div>
    `;
    el.contestContent.innerHTML = html;
    el.contestContent.querySelectorAll("[data-st]").forEach((btn) => {
      btn.addEventListener("click", () => {
        contestAgeTab = Number(btn.dataset.st);
        renderContest();
      });
    });
    el.contestContent.querySelector("#btnEnterContest")?.addEventListener("click", () => {
      const st = clamp(state.stage || 1, 1, 4);
      contestAgeTab = st;
      const e2 = loadEco();
      e2.userEntries = e2.userEntries || {};
      e2.userEntries[st] = {
        id: `user_${state.petId || "pet"}_${st}`,
        name: state.name || "Meu PIXEL",
        species: state.species?.id || "kitty",
        stage: st,
        art: baseArt(state.species, st),
        accs: equipped.map((i) => i.id),
        votes: 25 + equipped.length * 14,
        owner: "Você",
      };
      saveEco(e2);
      rain(["📸", "✨", "🏆", "💖"], 10);
      say(`${state.name} tirou uma foto linda e entrou no Desfile ${ageNames[st]}! 📸✨`, 2800);
      renderContest();
    });
    el.contestContent.querySelectorAll("[data-vote]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cid = btn.dataset.vote;
        const e2 = loadEco();
        e2.contestVotes = e2.contestVotes || {};
        e2.contestVotes[cid] = (e2.contestVotes[cid] || 0) + 1;
        saveEco(e2);
        rain(["💖", "🌟", "✨"], 6);
        renderContest();
      });
    });
  }

  // ---------- 2. HOSPITAL PÚBLICO VOLUNTÁRIO & ANJO DO MÊS ----------
  const VIRTUAL_PATIENTS = [
    { id: "pat_1", name: "Pipoca", species: "kitty", art: "assets/pets/kitty_sad.webp", issue: "Com muita fome e tristinha", actionLabel: "🍓 Dar Comidinha & Colo", rewardPts: 15 },
    { id: "pat_2", name: "Relâmpago", species: "racer", art: "assets/pets/racer_sad.webp", issue: "Motor sem óleo e pneu gasto", actionLabel: "🛠️ Trocar Óleo & Consertar", rewardPts: 15 },
    { id: "pat_3", name: "Estrelinha", species: "unicorn", art: "assets/pets/unicorn_sad.webp", issue: "Asinha cansada e com sede", actionLabel: "💊 Curar & Hidratar", rewardPts: 20 },
    { id: "pat_4", name: "Floide", species: "floide", art: "assets/pets/floide_sad.webp", issue: "Precisa de banho quentinho", actionLabel: "🛁 Dar Banho & Carinho", rewardPts: 15 },
  ];

  function openHospital() {
    return; // Future feature, outside the current care game.
    if (state.phase !== "pet") return;
    closeAllSheets();
    if (el.hospitalPanel) el.hospitalPanel.hidden = false;
    renderHospital();
  }
  function closeHospital() {
    if (el.hospitalPanel) el.hospitalPanel.hidden = true;
  }
  function renderHospital() {
    if (!el.hospitalContent) return;
    const eco = loadEco();
    const grifeRewards = CLOSET_ITEMS.filter((i) => i.tier === "grife");
    const nextGrife = grifeRewards.find((i) => !isItemUnlocked(i)) || grifeRewards[0];

    el.hospitalContent.innerHTML = `
      <div class="hub-banner">
        <div>
          <b>😇 Anjo do Mês · Seus Pontos de Bondade: ${eco.angelPoints} pts (${eco.helpedCount} PIXELs salvos)</b><br/>
          <span>O Hospital Público é 100% grátis! Crianças boas que cuidam de PIXELs doentinhos na fila ganham peças de <b>Alta Costura / Grife</b> e <b>Poderes</b> de presente!</span>
        </div>
        <button type="button" class="hub-btn green" id="btnHealMyPetNow">💚 Atender ${state.name} (Prioridade)</button>
      </div>
      <div class="hub-banner" style="background:linear-gradient(135deg,#fff9db,#ffe3f1)">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${nextGrife.art}" alt="" style="width:48px;height:48px;object-fit:contain"/>
          <div>
            <b>🎁 Prêmio Anjo do Mês: ${nextGrife.name}</b><br/>
            <span>Ajude PIXELs na fila (meta: 30 pts) para ganhar esta peça Grife (${nextGrife.price}) de graça por ser uma boa criança!</span>
          </div>
        </div>
        <button type="button" class="hub-btn gold" id="btnClaimAngelReward" ${eco.angelPoints < 30 ? "disabled style='opacity:0.5'" : ""}>🏆 Resgatar Prêmio</button>
      </div>
      <h3 style="margin:8px 4px 4px;font-family:var(--display);color:#6b2d8a;font-size:1rem">📋 Fila Pública Visível (Voluntariado)</h3>
      <div class="hub-grid">
        ${VIRTUAL_PATIENTS.map((p) => `
          <div class="hub-card">
            <span class="tier-badge tier-fashion">Fila Pública · +${p.rewardPts} pts</span>
            <div class="hub-stage-preview">
              <img class="base-pet" src="${p.art}" alt="${p.name}" />
            </div>
            <b>${p.name}</b>
            <span style="font-size:0.72rem;color:#9d2344">${p.issue}</span>
            <button type="button" class="hub-btn green" data-help="${p.id}" data-pts="${p.rewardPts}">${p.actionLabel}</button>
          </div>
        `).join("")}
      </div>
    `;

    el.hospitalContent.querySelector("#btnHealMyPetNow")?.addEventListener("click", () => {
      state.needs.health = 100;
      state.needs.hunger = Math.max(state.needs.hunger, 85);
      state.needs.thirst = Math.max(state.needs.thirst, 85);
      el.actor.classList.remove("sick");
      setMood("happy", 1800);
      renderNeeds();
      saveActivePet();
      rain(["💚", "💊", "✨"], 8);
      say(`${state.name} passou na frente dos PIXELs virtuais e foi curado gratuitamente no Hospital Público! 💚`, 2800);
    });

    el.hospitalContent.querySelector("#btnClaimAngelReward")?.addEventListener("click", () => {
      const e2 = loadEco();
      if (e2.angelPoints < 30) return;
      e2.angelPoints -= 30;
      if (!e2.unlockedItems.includes(nextGrife.id)) e2.unlockedItems.push(nextGrife.id);
      saveEco(e2);
      state.outfit[nextGrife.slot] = nextGrife.id;
      renderOutfit();
      saveActivePet();
      rain(["😇", "👑", "✨", "💖"], 14);
      say(`Parabéns, Anjo do Mês! Você ganhou ${nextGrife.name} por ajudar outros PIXELs! 😇🏆`, 3400);
      renderHospital();
    });

    el.hospitalContent.querySelectorAll("[data-help]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pts = Number(btn.dataset.pts) || 15;
        const e2 = loadEco();
        e2.angelPoints = (e2.angelPoints || 0) + pts;
        e2.helpedCount = (e2.helpedCount || 0) + 1;
        saveEco(e2);
        rain(["💚", "😇", "✨", "💖"], 10);
        say(`Que gesto lindo! Você cuidou de um PIXEL doente e ganhou +${pts} pontos de Anjo do Mês! 😇💚`, 2600);
        renderHospital();
      });
    });
  }

  // ---------- 3. ÁLBUM 3D DE FIGURINHAS (Titanic, Concorde & Raros do Mundo) ----------
  const ALBUM_STICKERS_3D = [
    {
      id: "titanic",
      name: "RMS Titanic (1912)",
      rarity: "legendary",
      badge: "🏆 Figurinha Premiada Dourada",
      region: "Atlântico Norte · História",
      art: "assets/accessories/acc-titanic-3d.png",
      story: "Em abril de 1912, o RMS Titanic era o maior e mais luxuoso navio a vapor do mundo, com 4 grandes chaminés douradas e pretas! Ele partiu de Southampton rumo a Nova York. Depois de colidir com um iceberg no Atlântico Norte, sua história ensinou o mundo inteiro a criar regras de segurança no mar: desde então, todo navio precisa ter botes salva-vidas para todos a bordo e rádio ligado 24 horas por dia!",
    },
    {
      id: "concorde",
      name: "Concorde Supersônico",
      rarity: "legendary",
      badge: "🏆 Figurinha Premiada Dourada",
      region: "França & Reino Unido · Aviação",
      art: "assets/accessories/acc-concorde-3d.png",
      story: "O Concorde foi o avião comercial mais rápido da história! Com suas asas em formato de delta e seu bico que se inclinava para o piloto enxergar a pista no pouso, ele voava a Mach 2 — mais que o dobro da velocidade do som (2.179 km/h)! Ele cruzava o Oceano Atlântico em menos de 3 horas e meia, tão rápido que parecia chegar antes do sol!",
    },
    {
      id: "axolotl_mexico",
      name: "Axolote Rosa de Xochimilco",
      rarity: "rare",
      badge: "💎 Raro · Em Extinção",
      region: "México · Lagos Antigos",
      art: "assets/pets/axolotl_adult.webp",
      story: "O Axolote é um anfíbio mágico dos lagos do México que mantém seu sorriso e suas brânquias em forma de coroa a vida inteira! Ele tem o superpoder real de regenerar patinhas e órgãos, mas precisa que cuidemos das águas limpas para não desaparecer da natureza.",
    },
    {
      id: "unicorn_pegasus",
      name: "Pégaso Real das Nuvens",
      rarity: "rare",
      badge: "💎 Raro · Lenda Mágica",
      region: "Monte Olimpo · Mitologia",
      art: "assets/pets/unicorn_adult.webp",
      story: "Na mitologia antiga, Pégaso era o cavalo alado que voava acima das tempestades e fazia brotar fontes cristalinas onde tocava com seus cascos dourados. No PIXELS, quando seu Unicórnio cresce e equipa as Asas de Pégaso, ele também voa!",
    },
    {
      id: "panda_china",
      name: "Leão Imperial Guardião",
      rarity: "rare",
      badge: "💎 Raro · Savana & História",
      region: "África · Grandes Felinos",
      art: "assets/pets/lion_adult.webp",
      story: "O Leão vive em grupos familiares chamados alcateias ou bandos na savana. Apesar da cara de bravo, ele adora descansar à sombra e proteger os filhotes!",
    },
    {
      id: "kitty_star",
      name: "Gatinha Lili Estrelar",
      rarity: "common",
      badge: "⭐ Clássico PIXELS",
      region: "Ateliê PIXELS",
      art: "assets/pets/lili-dressed-photo.png",
      story: "A primeira estrela do Ateliê PIXELS! Com seu vestido de tule lilás com estrelas douradas, sapatinhos de patinha e óculos oceano, ela inaugura os desfiles de moda da cidade PIXELS!",
    },
  ];
  let activeStickerStoryId = "titanic";

  function openAlbum() {
    return; // Future feature, outside the current care game.
    if (state.phase !== "pet") return;
    closeAllSheets();
    if (el.albumPanel) el.albumPanel.hidden = false;
    renderAlbum();
  }
  function closeAlbum() {
    if (el.albumPanel) el.albumPanel.hidden = true;
  }
  function renderAlbum() {
    if (!el.albumContent) return;
    const eco = loadEco();
    const owned = new Set(eco.stickers || ["titanic", "kitty_star"]);
    const selected = ALBUM_STICKERS_3D.find((s) => s.id === activeStickerStoryId) || ALBUM_STICKERS_3D[0];

    el.albumContent.innerHTML = `
      <div class="hub-banner">
        <div>
          <b>📖 Álbum 3D — Grandes PIXELs da História & Animais Raros (${owned.size}/${ALBUM_STICKERS_3D.length})</b><br/>
          <span>Toque numa figurinha 3D para ouvir e ler sua história! Abra pacotes com pontos de Bondade ou na Feira!</span>
        </div>
        <button type="button" class="hub-btn gold" id="btnOpenPack">🎁 Abrir Pacote 3D</button>
      </div>
      <div class="hub-grid">
        ${ALBUM_STICKERS_3D.map((s) => {
          const has = owned.has(s.id);
          return `
            <div class="hub-card sticker-3d ${s.rarity}" data-sticker="${s.id}" style="${has ? "" : "opacity:0.58;filter:grayscale(0.5)"}">
              <span class="tier-badge ${s.rarity === "legendary" ? "tier-grife" : "tier-fashion"}">${s.badge}</span>
              <div class="hub-stage-preview">
                <img class="base-pet" src="${s.art}" alt="${s.name}" />
              </div>
              <b>${s.name}</b>
              <span style="font-size:0.68rem;color:#6b2d8a">${s.region}</span>
              <button type="button" class="hub-btn" data-story="${s.id}">📖 Contar História</button>
            </div>
          `;
        }).join("")}
      </div>
      <div class="story-box" id="albumStoryBox">
        <b>✨ História de ${selected.name} (${selected.region}):</b>
        <p style="margin:6px 0 0">${selected.story}</p>
      </div>
    `;

    el.albumContent.querySelector("#btnOpenPack")?.addEventListener("click", () => {
      const e2 = loadEco();
      e2.stickers = e2.stickers || ["titanic", "kitty_star"];
      const missing = ALBUM_STICKERS_3D.filter((s) => !e2.stickers.includes(s.id));
      const picked = missing.length ? pick(missing) : pick(ALBUM_STICKERS_3D);
      if (!e2.stickers.includes(picked.id)) e2.stickers.push(picked.id);
      activeStickerStoryId = picked.id;
      saveEco(e2);
      rain(["🌟", "📖", "✨", "🏆"], 12);
      say(`FIGURINHA 3D PREMIADA! Você tirou ${picked.name}! 🌟`, 3000);
      renderAlbum();
    });

    el.albumContent.querySelectorAll("[data-story], [data-sticker]").forEach((node) => {
      node.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const sid = node.dataset.story || node.dataset.sticker;
        if (!sid) return;
        activeStickerStoryId = sid;
        const stObj = ALBUM_STICKERS_3D.find((s) => s.id === sid);
        if (stObj) say(`📖 ${stObj.name}: ${stObj.story.slice(0, 95)}…`, 3400);
        renderAlbum();
      });
    });
  }

  el.actorImg.addEventListener("load", renderOutfit);
  new ResizeObserver(() => { if (state.phase === "pet") renderOutfit(); }).observe(el.actorImg);

  function openCollection() {
    metric("collection_open");
    if (el.collectionPanel) el.collectionPanel.hidden = false;
    if (el.closetPanel) el.closetPanel.hidden = true;
    renderCollection();
  }
  function closeCollection() {
    if (el.collectionPanel) el.collectionPanel.hidden = true;
  }
  function renderCollection() {
    if (!el.collectionGrid) return;
    if (state.phase === "pet" && !state.preview) saveActivePet();
    const col = loadCollection();
    const left = availableHatchSpecies().length;
    const newBtn = el.btnNewEgg;
    if (newBtn) {
      newBtn.disabled = !canStartNewEgg();
      newBtn.classList.remove("done");
      const sub = newBtn.querySelector(".cne-txt i");
      if (sub) {
        sub.textContent = left > 0
          ? `Seu PIXEL atual fica pausado · ${left} novo${left === 1 ? "" : "s"} ainda`
          : "Seu PIXEL atual fica pausado · pode nascer de novo (surpresa!)";
      }
    }
    el.collectionGrid.innerHTML = "";
    if (!col.pets.length) {
      el.collectionGrid.innerHTML = `<p class="collection-empty">Ainda não tem PIXELs. Nasça um ovinho!</p>`;
      return;
    }
    col.pets.slice().reverse().forEach((p) => {
      const sp = SPECIES.find((s) => s.id === p.speciesId);
      const card = document.createElement("button");
      card.type = "button";
      const isActive = p.id === col.activePetId && !p.frozen;
      card.className = "collection-card" + (isActive ? " active" : "") + (p.frozen ? " frozen" : "");
      const prevV = state.variant;
      if (sp && p.variant) state.variant = p.variant;
      const thumb = sp ? baseArt(sp, clamp(p.stage || 1, 1, 4)) : "";
      state.variant = prevV;
      const bits = equippedItemsList(p.outfit, p.speciesId).map((i) => i.emoji || "✨").join("");
      const badge = p.frozen ? `<span class="pause-badge">⏸ pausado</span>` : (isActive ? `<span class="pause-badge live">agora</span>` : "");
      card.innerHTML = `<span class="thumb" style="background-image:url(${thumb})"></span><span class="meta"><b></b><i>${sp?.name || ""} · ${STAGE_LABELS[p.stage] || ""}</i>${badge}</span><span class="bits">${bits}</span>`;
      const photo = document.createElement("span");
      photo.className = "credited-thumb";
      card.querySelector(".thumb").replaceWith(photo);
      const image = document.createElement("img");
      image.className = "thumb";
      image.src = thumb;
      image.alt = p.name || sp?.name || "PIXEL";
      photo.appendChild(image);
      const credit = creatorCreditElement(sp);
      if (credit) photo.appendChild(credit);
      card.querySelector("b").textContent = p.name || sp?.name || "PIXEL";
      card.addEventListener("click", () => {
        if (state.phase === "pet" && !state.preview) saveActivePet({ freeze: true });
        const c = loadCollection();
        c.activePetId = p.id;
        writeCollection(c);
        applyPetSnapshot({ ...p, frozen: false });
        closeCollection();
      });
      el.collectionGrid.appendChild(card);
    });
  }

  function showCombo(n) {
    let badge = document.getElementById("comboBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "comboBadge";
      badge.className = "combo-badge";
      el.stage.appendChild(badge);
    }
    if (n < 2) { badge.hidden = true; return; }
    badge.hidden = false;
    badge.textContent = `×${n} COMBO!`;
    badge.classList.remove("pop");
    void badge.offsetWidth;
    badge.classList.add("pop");
  }
  function stageShake() {
    el.stage.classList.remove("shake");
    void el.stage.offsetWidth;
    el.stage.classList.add("shake");
    setTimeout(() => el.stage.classList.remove("shake"), 420);
    try { navigator.vibrate?.(18); } catch (_) {}
  }
  function sparkleAt(clientX, clientY, symbols = ["✨", "⭐", "💫"]) {
    const r = el.stage.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    fx("float", pick(symbols), { x, y, dx: (Math.random() - 0.5) * 80 });
  }
  function artFile(url) {
    return String(url || "").split("/").pop().split("?")[0];
  }
  function setActorSrc(src) {
    if (!src) return;
    if (artFile(el.actorImg.src) !== artFile(src)) el.actorImg.src = src;
  }
  function currentArt() {
    const sp = state.species;
    const integratedArt = window.PixelsLooks.chooseArt(state);
    if (integratedArt) return integratedArt;
    const ak = artKey(sp);
    if (state.sleeping) {
      const s = sleepArt(sp, state.stage);
      if (s) return s;
    }
    if (state.pose === "drink" && sp.drinkArt) return sp.drinkArt[sp.stages[state.stage]];
    if (state.pose && hasPose(state.pose)) return `${ART}${ak}_${state.pose}.webp`;
    const expr = expressionPose();
    if (expr) return `${ART}${ak}_${expr}.webp`;
    return baseArt(sp, state.stage);
  }
  function preload(sp) {
    const variants = sp.variants ? Object.keys(sp.variants) : [null];
    variants.forEach((v) => {
      const prev = state.variant;
      if (v) state.variant = v;
      const ak = artKey(sp);
      const list = [1, 2, 3, 4].map((s) => baseArt(sp, s))
        .concat(sp.poses.map((p) => `${ART}${ak}_${p}.webp`))
        .concat((sp.sleepStages || []).map((k) => `${ART}${ak}_${k}_sleep.webp`))
        .concat(Object.values(sp.sleepArt || {}))
        .concat(Object.values(sp.drinkArt || {}));
      list.forEach((src) => { const i = new Image(); i.src = src; });
      state.variant = prev;
    });
  }

  function pickVariant(sp) {
    if (!sp?.variants) return null;
    const q = new URLSearchParams(location.search);
    const forced = q.get("color") || q.get("variant");
    if (forced && sp.variants[forced]) return forced;
    const keys = Object.keys(sp.variants).filter((k) => {
      const va = sp.variants[k].audience || "both";
      if (!state.audience || state.audience === "both") return true;
      return va === "both" || va === state.audience;
    });
    return pick(keys.length ? keys : Object.keys(sp.variants));
  }
  function applyVariant(sp, variant) {
    state.variant = variant;
    if (!variant || !sp?.variants?.[variant]) return;
    const v = sp.variants[variant];
    sp.he = v.he || sp.he;
    if (v.glow) sp.glow = v.glow;
  }

  // ---------- Particles ----------
  const ctx = el.fx.getContext("2d");
  const motes = [];
  function resizeFx() {
    const r = el.fx.getBoundingClientRect();
    el.fx.width = r.width * devicePixelRatio;
    el.fx.height = r.height * devicePixelRatio;
  }
  function spawnMote(isBurst = false, x, y) {
    const w = el.fx.width, h = el.fx.height, d = devicePixelRatio;
    motes.push({
      x: x ?? Math.random() * w, y: y ?? h * (0.35 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * (isBurst ? 6 : 0.4) * d,
      vy: (isBurst ? -Math.random() * 6 : -Math.random() * 0.5 - 0.1) * d,
      r: (isBurst ? 2 + Math.random() * 3 : 1 + Math.random() * 2.2) * d,
      life: 0, max: isBurst ? 60 + Math.random() * 40 : 240 + Math.random() * 200,
      hue: isBurst ? 40 + Math.random() * 300 : 45 + Math.random() * 20, burst: isBurst,
    });
  }
  for (let i = 0; i < 40; i++) spawnMote();
  function drawFx() {
    ctx.clearRect(0, 0, el.fx.width, el.fx.height);
    ctx.globalCompositeOperation = "lighter";
    const night = el.app.dataset.period === "night";
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life++;
      m.x += m.vx + Math.sin((m.life + i * 20) / 40) * 0.3;
      m.y += m.vy;
      if (m.burst) m.vy += 0.08 * devicePixelRatio;
      const a = Math.sin(Math.PI * (m.life / m.max)) * (night ? 1 : 0.7);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
      g.addColorStop(0, `hsla(${m.hue},100%,85%,${a})`);
      g.addColorStop(1, `hsla(${m.hue},100%,70%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
      ctx.fill();
      if (m.life >= m.max) { motes.splice(i, 1); if (!m.burst) spawnMote(); }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function burst(n = 60, yFrac = 0.55) {
    const r = el.actor.getBoundingClientRect(), f = el.fx.getBoundingClientRect();
    const cx = (r.left + r.width / 2 - f.left) * devicePixelRatio;
    const cy = (r.top + r.height * yFrac - f.top) * devicePixelRatio;
    for (let i = 0; i < n; i++) spawnMote(true, cx, cy);
  }

  // ---------- DOM FX ----------
  function fx(cls, content, o = {}) {
    const n = document.createElement("span");
    n.className = `fx ${cls}`;
    n.textContent = content || "";
    n.style.left = `${o.x ?? 50}%`;
    n.style.top = `${o.y ?? 40}%`;
    if (o.dx != null) n.style.setProperty("--dx", `${o.dx}px`);
    if (o.rot != null) n.style.setProperty("--rot", `${o.rot}deg`);
    if (o.size) n.style.setProperty("--s", `${o.size}px`);
    if (o.font) n.style.fontSize = o.font;
    el.actorFx.appendChild(n);
    setTimeout(() => n.remove(), o.ttl ?? 2600);
  }
  function rain(symbols, count = 6, cls = "float", yMin = 30) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => fx(cls, pick(symbols), {
        x: 25 + Math.random() * 50, y: yMin + Math.random() * 30,
        dx: (Math.random() - 0.5) * 120, rot: (Math.random() - 0.5) * 40,
      }), i * 90);
    }
  }
  function say(text, ms = 2200) {
    text = genderedText(text);
    el.bubble.hidden = false;
    el.bubble.textContent = text;
    el.bubble.style.animation = "none";
    void el.bubble.offsetWidth;
    el.bubble.style.animation = "";
    clearTimeout(say.t);
    say.t = setTimeout(() => (el.bubble.hidden = true), ms);
  }
  function flash() {
    el.flash.classList.remove("go");
    void el.flash.offsetWidth;
    el.flash.classList.add("go");
  }
  let movementRevision = 0;
  function stopMove() {
    movementRevision++;
    el.actorMove.className = "actor-move";
  }
  function playMove(cls, ms) {
    stopMove();
    const revision = movementRevision;
    void el.actorMove.offsetWidth;
    el.actorMove.classList.add(cls);
    return wait(ms).then(() => {
      if (revision === movementRevision) el.actorMove.classList.remove(cls);
    });
  }

  // Emoji flies from a button to the pet's mouth.
  function throwTo(fromKey, emoji, ms = 700) {
    const dev = el.app.getBoundingClientRect();
    const b = buttons[fromKey].getBoundingClientRect();
    const a = el.actorImg.getBoundingClientRect();
    const n = document.createElement("span");
    n.className = "projectile";
    n.textContent = emoji;
    el.projectiles.appendChild(n);
    const x0 = b.left + b.width / 2 - dev.left - 24, y0 = b.top - dev.top;
    const scale = STAGE_SCALE[state.stage];
    const x1 = a.left + a.width / 2 - dev.left - 24;
    const y1 = a.bottom - dev.top - a.height * scale * 0.62;
    n.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(0.6) rotate(0deg)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 120}px) scale(1.3) rotate(180deg)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.5) rotate(340deg)`, opacity: 0.2 },
    ], { duration: ms, easing: "cubic-bezier(.3,.7,.4,1)" });
    return wait(ms - 40).then(() => n.remove());
  }

  function setMood(m, lockMs = 0) {
    const prev = state.mood;
    if (state.mood !== m) {
      state.mood = m;
      el.actor.dataset.mood = m;
      if (m === "happy") { el.actorImg.style.animation = "none"; void el.actorImg.offsetWidth; el.actorImg.style.animation = ""; }
      if (prev !== m && state.species && window.PixelAudio) {
        window.PixelAudio.setCharacter(state.species.id, state.stage, state.sleeping);
        window.PixelAudio.speak(state.species.id, m);
      }
    }
    if (lockMs) state.moodLock = performance.now() + lockMs;
  }

  // ---------- Rendering ----------
  function isChosenEgg() {
    return !!(state.chosenEgg && (state.phase === "egg" || state.phase === "hatching"));
  }
  function eggArtSrc(crack = 0) {
    if (crack <= 0) return `${ART}egg.webp`;
    if (crack === 1) return `${ART}egg_crack1.webp`;
    if (crack === 2) return `${ART}egg_crack2.webp`;
    if (crack === 3) return `${ART}egg_crack3.webp`;
    return `${ART}egg_broken.webp`;
  }
  function eggPeekArt(sp) {
    if (!sp) return null;
    if (sp.id === "axolotl") return `${ART}egg_gotinha.webp`;
    return null;
  }
  function syncEggPeekLayers() {
    const chosen = isChosenEgg();
    el.actor.classList.toggle("chosen-egg", chosen);
    if (el.eggPeek) {
      el.eggPeek.hidden = true;
      el.eggPeek.removeAttribute("src");
    }

    if (state.phase !== "egg" && state.phase !== "hatching") return;

    const t = state.temp;
    const ideal = t >= DEMO.idealMin && t <= DEMO.idealMax;
    const pct = clamp(state.idealMs / (DEMO.hatchSeconds * 1000), 0, 1);
    const hatching = state.phase === "hatching";
    const crack = state.eggCrack || 0;
    const peekArt = chosen ? eggPeekArt(state.forceSpecies) : null;
    // Revela aos poucos quando esquenta (não só no ideal exato)
    const warmEnough = t >= DEMO.idealMin - 5 && t <= DEMO.idealMax + 6;
    const peeking = !!(peekArt && (hatching || warmEnough) && crack === 0);
    const pushing = !!(chosen && (hatching || (ideal && pct >= 0.35)));

    el.actor.classList.toggle("egg-peeking", peeking);
    el.actor.classList.toggle("egg-pushing", pushing);
    el.actorImg.style.opacity = "1";

    const nextSrc = peeking ? peekArt : eggArtSrc(crack);
    setActorSrc(nextSrc);
    // Véu alto no começo → baixo quando mantém o calor / fica nervoso
    const heatReveal = clamp((t - (DEMO.idealMin - 5)) / 22, 0, 1);
    const veil = peeking
      ? clamp((pushing ? 0.12 : 0.58 - heatReveal * 0.3 - pct * 0.18), 0.1, 0.65)
      : 0;
    el.actor.style.setProperty("--egg-veil", veil.toFixed(3));
  }
  function renderActor() {
    window.PixelAudio?.setCharacter(state.species?.id, state.stage, state.sleeping);
    const credit = document.getElementById("creatorCredit");
    if (credit) {
      credit.textContent = state.phase === "pet" ? window.PixelsCatalog.creatorCredit(state.species) : "";
      credit.hidden = !credit.textContent;
    }
    el.stage?.classList.toggle("bat-roost", state.phase === "pet" && state.species?.id === "bat" && state.sleeping);
    el.stage?.classList.toggle("integrated-drink", (window.PixelsLooks.active(state.species?.id, state.outfit) || !!state.species?.drinkArt) && state.pose === "drink");
    el.stage?.classList.toggle("seal-drinking", state.species?.id === "seal" && state.pose === "drink" && !state.sleeping);
    el.stage?.classList.toggle("integrated-meal", window.PixelsLooks.active(state.species?.id, state.outfit) && state.pose === "eat");
    if (state.phase === "egg" || state.phase === "hatching") {
      el.actorImg.style.scale = "1";
      syncEggPeekLayers();
      return;
    }
    if (el.eggPeek) {
      el.eggPeek.hidden = true;
      el.eggPeek.removeAttribute("src");
    }
    el.actor.classList.remove("chosen-egg", "egg-peeking", "egg-pushing");
    el.actorImg.style.opacity = "";
    el.actorMove.style.filter = "";
    el.actor.style.removeProperty("--egg-veil");
    setActorSrc(currentArt());
    el.actorImg.style.scale = String(STAGE_SCALE[state.stage]);
    el.actorGlow.style.background = `radial-gradient(circle at 50% 80%, ${state.species.glow}, transparent 60%)`;
    el.actor.classList.toggle("sick", state.needs.health < 40 || state.mood === "sick");
    const ox = state.actorOff?.x || 0, oy = state.actorOff?.y || 0;
    el.actorMove.style.transform = `translate(${ox}px, ${oy}px)`;
    renderOutfit();
  }
  function renderChosenEggHeader(sp) {
    if (!sp) return;
    el.avatar.style.backgroundImage = `url(${ART}egg.webp)`;
    el.petName.textContent = "Quem será que vem aí?";
    el.petStage.textContent = "Aqueça o ovo para descobrir";
    syncBiome();
  }
  function renderHeader() {
    if (!state.species) return;
    el.avatar.style.backgroundImage = `url(${baseArt(state.species, 1)})`;
    el.petName.textContent = state.nameChosen === false ? "Um novo amigo!" : state.name;
    const label = state.species.id === "kitty" && isFemalePixel() ? "Gatinha" : state.species.name;
    el.petStage.textContent = `${label} · ${STAGE_LABELS[state.stage]}`;
    applyDietUI();
    renderTraitBanner();
    syncBiome();
  }
  const namingDialog = document.getElementById("petNaming");
  const namingInput = document.getElementById("petNickname");
  let namingSuggestion = "";
  let namingStarted = 0;
  const isFemalePixel = () => (state.pronoun || state.species?.he) === "ela";
  function genderedText(text) {
    if (!isFemalePixel()) return text;
    const forms = { nervoso: "nervosa", cansadinho: "cansadinha", sujinho: "sujinha", limpinho: "limpinha", cheirosinho: "cheirosinha", Cheirosinho: "Cheirosinha", acordado: "acordada", novinho: "novinha", Quebrado: "Quebrada", Consertado: "Consertada", Abastecido: "Abastecida", dele: "dela", molhado: "molhada", pausado: "pausada" };
    return text.replace(/\b(nervoso|cansadinho|sujinho|limpinho|cheirosinho|Cheirosinho|acordado|novinho|Quebrado|Consertado|Abastecido|dele|molhado|pausado)\b/g, word => forms[word]);
  }
  function choosePetName() {
    if (state.preview || state.phase !== "pet" || !namingDialog) return;
    namingStarted = performance.now();
    namingSuggestion = state.name;
    const pronounSelect = document.getElementById("petPronoun");
    if (pronounSelect) pronounSelect.value = state.pronoun || state.species.he;
    if (namingInput) {
      namingInput.value = state.nameChosen === false ? "" : namingSuggestion;
      namingInput.placeholder = "Escreva um nome para mim…";
      namingInput.setCustomValidity("");
    }
    const hintEl = document.getElementById("petNamingHint");
    if (hintEl) hintEl.textContent = state.nameChosen === false ? "Oi! Acabei de nascer 💛 Que nome você quer me dar?" : "Sou eu! Quer escolher outro nome para mim? 💛";
    const chatAvatar = document.getElementById("namingChatAvatar");
    if (chatAvatar) chatAvatar.src = currentArt();
    const suggestionButton = document.getElementById("petNameSuggestion");
    if (suggestionButton) suggestionButton.textContent = `Que tal ${namingSuggestion}?`;
    state.naming = true;
    state.rubbing = false;
    namingDialog.show();
    el.app.classList.add("naming-chat-open");
    hintEl?.focus({ preventScroll: true });
  }
  function finishPetName(value) {
    const name = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 30) {
      if (namingInput) {
        namingInput.setCustomValidity("Escolha um nome de até 30 caracteres.");
        namingInput.reportValidity();
      }
      return;
    }
    state.name = name;
    state.nameChosen = true;
    state.nextSkit = performance.now() + 12000;
    const pronounSelect = document.getElementById("petPronoun");
    if (pronounSelect) state.pronoun = pronounSelect.value;
    state.naming = false;
    // Naming time does not count toward growth or decay.
    state.lastGrowth += performance.now() - namingStarted;
    namingDialog.close();
    el.app.classList.remove("naming-chat-open");
    renderHeader();
    saveActivePet();
    say(`Oi! Eu sou ${state.name}! 💖`, 3000);
  }
  namingInput?.addEventListener("input", () => namingInput.setCustomValidity(""));
  document.getElementById("renamePet")?.addEventListener("click", choosePetName);
  document.getElementById("petNamingForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    finishPetName(namingInput.value);
  });
  document.getElementById("petNameSuggestion")?.addEventListener("click", () => finishPetName(namingSuggestion));
  namingDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    finishPetName(namingSuggestion);
  });
  function speciesBiome(sp = state.species) {
    if (!sp) return "meadow";
    return sp.biome || SPECIES_BIOME[sp.id] || "meadow";
  }
  function syncBiome() {
    const biome = state.phase === "egg" || state.phase === "hatching"
      ? (state.forceSpecies ? speciesBiome(state.forceSpecies) : "meadow")
      : speciesBiome(state.species);
    const url = BIOME_BG[biome] || BIOME_BG.meadow;
    if (el.sceneBg) {
      el.sceneBg.style.backgroundImage = `url("${url}")`;
    }
    if (el.app) el.app.dataset.biome = biome;
    if (window.PixelAudio) window.PixelAudio.setBiome(biome);
  }
  function renderGrowth(frac = 0) {
    el.growthFill.style.width = `${clamp(((state.stage + frac) / 4) * 100, 0, 100)}%`;
    el.growthSteps.querySelectorAll("li").forEach((li) => {
      const i = Number(li.dataset.i);
      li.classList.toggle("done", i < state.stage);
      li.classList.toggle("now", i === state.stage);
    });
  }
  function renderNeeds() {
    for (const [k, g] of Object.entries(gauges)) {
      const v = state.needs[k];
      g.style.setProperty("--v", (v / 100).toFixed(3));
      g.classList.toggle("low", v < 35 && v >= 18);
      g.classList.toggle("crit", v < 18);
    }
  }
  function renderEgg() {
    const t = state.temp;
    el.thermoKnob.style.left = `${t}%`;
    const heat = clamp((t - 30) / 60, 0, 1);
    const chosen = isChosenEgg();
    const ideal = t >= DEMO.idealMin && t <= DEMO.idealMax;
    const peeking = chosen && (ideal || state.phase === "hatching") && (state.eggCrack || 0) === 0;
    // Sem drop-shadow no ovo animado (causa “sombra”/rastro). Só matiz leve via glow do actor.
    el.actorMove.style.filter = "";
    el.actorImg.style.filter = "";
    if (el.actorGlow) {
      const warm = Math.round(200 - heat * 80);
      const cool = Math.round(140 - heat * 60);
      el.actorGlow.style.background = peeking
        ? `radial-gradient(circle at 50% 55%, rgba(255,230,200,${0.35 + heat * 0.25}), transparent 62%)`
        : `radial-gradient(circle at 50% 60%, rgba(255,${warm},${cool},${0.25 + heat * 0.35}), transparent 65%)`;
      el.actorGlow.style.opacity = String(0.45 + heat * 0.25);
    }
    let label, hint;
    const pct = clamp(state.idealMs / (DEMO.hatchSeconds * 1000), 0, 1);
    if (t < DEMO.idealMin - 12) { label = "Frio 🥶"; hint = "Brrr… o ovinho está gelado"; }
    else if (t < DEMO.idealMin) { label = "Morninho"; hint = chosen ? "Quase dá pra ver quem está aí…" : "Quase lá!"; }
    else if (t <= DEMO.idealMax) {
      label = "Perfeito ✨";
      if (chosen && pct >= 0.55) hint = "Nervoso! Está empurrando pra nascer! 💢";
      else if (chosen) hint = "Aparecendo aos poucos… continue aquecendo!";
      else hint = "Isso! Tem alguém se mexendo aí dentro…";
    }
    else if (t <= DEMO.idealMax + 12) { label = "Quente!"; hint = "Cuidado, está esquentando demais"; }
    else { label = "Muito quente 🔥"; hint = "Ai! Deixe esfriar um pouquinho"; }
    el.thermoLabel.textContent = label;
    el.thermoHint.textContent = hint;
    el.hatchFill.style.width = `${pct * 100}%`;
    syncEggPeekLayers();
  }

  // ---------- Guide: always tell the child what to do next ----------
  function setGuide(text, wantedKey = null, wishIcon = null, urgent = false) {
    text = genderedText(text);
    if (el.guide.textContent !== text) {
      el.guide.textContent = text;
      el.guide.style.animation = "none";
      void el.guide.offsetWidth;
      el.guide.style.animation = "";
    }
    el.guide.classList.toggle("urgent", urgent);
    Object.entries(buttons).forEach(([k, b]) => b.classList.toggle("wanted", k === wantedKey));
    el.btnHeal?.classList.toggle("wanted", wantedKey === "H");
    el.btnPlay?.classList.toggle("wanted", wantedKey === "P");
    el.wish.hidden = !wishIcon;
    if (wishIcon && el.wishIcon.textContent !== wishIcon) el.wishIcon.textContent = wishIcon;
  }

  function updateGuide() {
    if (state.phase === "pet" && state.nameChosen === false) {
      return setGuide("Seu novo amigo chegou! Vamos escolher um nome? 💛");
    }
    if (state.phase === "egg") {
      if (!state.audience) return setGuide("Primeiro escolhe: menina, menino ou tanto faz! ✨");
      const t = state.temp;
      if (t > DEMO.idealMax + 4) return setGuide("Muito quente! Pare de esfregar ✋", null, null, true);
      if (t >= DEMO.idealMin && t <= DEMO.idealMax) {
        const pct = clamp(state.idealMs / (DEMO.hatchSeconds * 1000), 0, 1);
        if (pct > 0.65) {
          return setGuide(
            isChosenEgg() ? "Está nervoso! Empurrando a casca pra nascer! 💢" : "Está rachando! Continue com cuidado… 🥚",
            "1", null, true
          );
        }
        if (pct > 0.3) {
          return setGuide(
            isChosenEgg() ? "Olha… está ficando inquieto lá dentro! ✨" : "Algo se mexe lá dentro… ✨",
            "1"
          );
        }
        return setGuide(
          isChosenEgg() ? "Perfeito! O PIXEL aparece aos pouquinhos… 💛" : "Perfeito! Continue devagarinho 💛",
          "1"
        );
      }
      if (t >= DEMO.idealMin) return setGuide("Perfeito! Continue devagarinho 💛", "1");
      return setGuide(
        isChosenEgg() ? "Aqueça o ovo pra revelar o PIXEL! 👆" : "Esfregue o ovo com o dedo para aquecer! 👆",
        "1"
      );
    }
    if (state.phase === "hatching") return setGuide("O ovo está quebrando… surpresa! ✨");
    const p = state.name;
    if (state.busy) return;
    if (state.sleeping) {
      const day = el.app.dataset.period === "day";
      return setGuide(day && state.needs.energy > 90 ? `${p} já descansou! Aperte ☀️ Acordar` : `Shhh… ${p} está dormindo 💤`, day && state.needs.energy > 90 ? "1" : null);
    }
    if (state.mood === "mad") {
      if (isLion()) {
        return setGuide(`${p} quer um pouco de carinho e atenção! 🦁💗`, "5", "💗", true);
      }
      return setGuide(`${p} precisa de um pouco de atenção e carinho.`, "5", "💗", true);
    }
    if (state.mood === "sick" || state.needs.health < 40) {
      return setGuide(isMachine() ? `${p} precisa de um mecânico!` : `${p} precisa de um veterinário!`, "H", "💊", true);
    }
    if (state.playing) {
      return setGuide(`Arraste o ${toyEmoji()} — ${p} vai atrás! ✨`, "P", toyEmoji());
    }
    if (state.mood === "sad") {
      const n = state.needs;
      const worst = ["hunger", "thirst", "hygiene", "love", "energy", "health"].sort((a, b) => n[a] - n[b])[0];
      const need = needsMap()[worst];
      const icon = worst === "hunger" ? state.species.food : need.icon;
      if (worst === "health") return setGuide(`${p} está doente… Aperte 💊 Saúde!`, "H", "💊", true);
      if (worst === "hygiene") return setGuide(`${p} está se coçando… Quer banho! 🛁`, "4", "🛁", true);
      if (worst === "love") return setGuide(`${p} está chorando… Quer carinho! 💗`, "5", "💗", true);
      if (worst === "energy") return setGuide(`${p} está com os olhinhos pesados… Aperte 🌙 Dormir`, "6", "🌙", true);
      const sadHunger = `Quer ${state.species.foodName}!`;
      return setGuide(`${p} está triste… ${worst === "hunger" ? sadHunger : need.text(p)}`, need.key, icon, true);
    }

    const n = state.needs;
    const night = el.app.dataset.period === "night";
    // Limiares um pouco mais baixos no traço forte do animal
    const pr = state.species.profile || {};
    const limits = {
      hunger: pr.hunger > 1.3 || state.boosts?.hunger > 1 ? 50 : 42,
      thirst: pr.thirst > 1.3 || state.boosts?.thirst > 1 ? 50 : 42,
      hygiene: pr.hygiene > 1.3 || state.boosts?.hygiene > 1 ? 42 : 32,
      love: pr.love > 1.3 || state.boosts?.love > 1 ? 50 : 42,
      energy: night ? 60 : (pr.energy > 1.2 || state.boosts?.energy > 1 ? 32 : 24),
    };
    let worst = null;
    for (const k of Object.keys(limits)) {
      if (n[k] < limits[k] && (!worst || n[k] - limits[k] < n[worst] - limits[worst])) worst = k;
    }
    if (worst) {
      const need = needsMap()[worst];
      const icon = worst === "hunger" ? state.species.food : need.icon;
      const text = worst === "hunger"
        ? (isMachine() ? `${p} precisa de peças! Aperte ${state.species.food} Peças` : `${p} está com fome! Aperte ${state.species.food} Comer`)
        : need.text(p);
      return setGuide(text, need.key, icon, n[worst] < 25);
    }
    if (night) return setGuide(`Está de noite… hora de nanar? 🌙`, "6", "🌙");
    if (isLion() && !lionPamperedEnough()) {
      const nL = state.needs;
      if (nL.love < 30) return setGuide(`${p} quer um chamego… Dá carinho! 💗`, "5", "💗", false);
      if (nL.hunger < 30) return setGuide(`${p} quer um petisco… Dá ${state.species.foodName}! 🥩`, "2", state.species.food, false);
      return setGuide(`${p} quer brincar com você! ${toyEmoji()}`, "P", toyEmoji(), false);
    }
    if (n.energy > 40 && n.love < 85 && Math.random() < 0.002) {
      return setGuide(`Que tal brincar? Aperte Brincar e arraste o ${toyEmoji()}!`, "P", toyEmoji());
    }
    setGuide(
      isLion()
        ? `${p} está todo feliz e radiante! 🦁💕`
        : `${p} está feliz! Faça carinho, ou aperte Brincar ${toyEmoji()}`,
      "P",
      "💕"
    );
  }

  // ---------- Clumsy baby skits ----------
  async function skit(kind) {
    if (window.PixelsLooks.active(state.species?.id, state.outfit)) {
      state.nextSkit = performance.now() + 20000;
      return;
    }
    if (state.busy || state.sleeping || state.playing || state.phase !== "pet") return;
    state.busy = true;
    const p = state.name;
    try {
      const dressedItems = equippedItemsList().filter((i) => i.art);
      if (dressedItems.length > 0) {
        const hasWings = dressedItems.some((i) => i.effect === "fly" || i.slot === "wings");
        state.pose = null;
        renderActor();
        if (hasWings) {
          say("Olha meu voo mágico! 🪽✨", 1800);
          rain(["🪽", "✨", "🌈", "⭐"], 8);
          await playMove("fly", 1600);
        } else {
          say("Olha meu look estiloso! ✨💖", 1800);
          rain(["✨", "💖", "⭐"], 6);
          await playMove("wobble", 900);
          await playMove("rear", 1100);
        }
        await wait(800);
        return;
      }
      if (kind === "fly") {
        state.pose = "fly"; renderActor();
        say(state.stage === 1 ? "Vou voaaar! 🪽" : "Agora vai!", 1600);
        await playMove("fly", 1600);
        await playMove("drop", 450);
        state.pose = "fall"; renderActor();
        playMove("splat", 600);
        burst(30, 0.9);
        rain(["⭐", "💫"], 4, "float", 20);
        say("Ops! 😵‍💫", 1800);
        await wait(2200);
      } else if (kind === "wobble") {
        say("Upa… upa…", 1400);
        await playMove("wobble", 1400);
        state.pose = "fall"; renderActor();
        playMove("splat", 600);
        rain(["⭐", "✨"], 3, "float", 20);
        say("Caí! Hihihi 🙈", 1800);
        await wait(2200);
      } else if (kind === "bed") {
        state.pose = "bed"; renderActor();
        say("Miau?", 1300);
        await playMove("wobble", 1400);
        state.pose = "fall"; renderActor();
        await playMove("tumble", 700);
        playMove("splat", 600);
        rain(["⭐", "💫"], 3, "float", 20);
        say("Miaaau! 🙃", 1800);
        await wait(2000);
      } else if (kind === "mud") {
        state.pose = "mud"; renderActor();
        say("Lama! Lama! 🐷", 1600);
        await playMove("wobble", 1400);
        rain(["🟤", "✨", "🤎"], 6);
        say("Hihihi, que gostoso!", 1800);
        await wait(2000);
        state.pose = "fall"; renderActor();
        playMove("splat", 600);
        rain(["⭐", "💫"], 3, "float", 20);
        say("Ops! Escorreguei! 🙈", 1800);
        await wait(1800);
      } else if (kind === "dig") {
        state.pose = "dig"; renderActor();
        say("Vou cavar! 🕳️", 1500);
        await playMove("wobble", 1600);
        rain(["🟤", "✨", "🍄"], 6);
        say("Achado! Hihi", 1600);
        await wait(1600);
        state.pose = "fall"; renderActor();
        playMove("splat", 600);
        rain(["⭐", "💫"], 3, "float", 20);
        say("Ops! Cavei demais! 🙈", 1800);
        await wait(1800);
      } else if (kind === "turbo") {
        state.pose = state.stage >= 3 && state.species.poses.includes("turbo") ? "turbo" : null;
        renderActor();
        say(state.stage === 1 ? "Vruum? 🍼" : "VRUUUM! 🏁", 1500);
        await playMove("wobble", 700);
        await playMove("rear", 1200);
        rain(["💨", "⭐", "🔥"], 8);
        say(state.stage >= 4 ? "Escapamento ligado! 🔥" : "Quase voei!", 1800);
        await wait(1600);
      } else if (kind === "transform") {
        say("Transformar! ⚡", 1200);
        state.pose = "car"; renderActor();
        await playMove("wobble", 900);
        rain(["⚡", "✨", "🔩"], 8);
        say("Agora sou carro! 🚗", 1400);
        await wait(1600);
        state.pose = null; renderActor();
        await playMove("rear", 1000);
        rain(["⚡", "🤖"], 5);
        say("E de volta a robô! 🤖", 1600);
        await wait(1400);
      } else if (kind === "launch") {
        state.pose = state.species.poses.includes("launch") ? "launch" : null;
        renderActor();
        say(state.stage === 1 ? "3… 2… 1…? 🍼" : "3… 2… 1… DECOLAR! 🚀", 1600);
        await playMove("rear", 1400);
        rain(["🚀", "⭐", "💨"], 10);
        say("Quase fui pra lua!", 1800);
        await wait(1600);
      } else if (kind === "hover") {
        state.pose = state.species.poses.includes("hover") ? "hover" : null;
        renderActor();
        say("Trrr trrr! 🚁", 1400);
        await playMove("wobble", 1200);
        rain(["💨", "✨"], 8);
        say("Olha eu no ar!", 1600);
        await wait(1400);
      } else if (kind === "chug") {
        state.pose = state.species.poses.includes("chug") ? "chug" : null;
        renderActor();
        say("Chuf chuf chuf! 🚂", 1500);
        await playMove("wobble", 1400);
        rain(["💨", "⭐"], 8);
        say("Expresso mágico!", 1600);
        await wait(1400);
      } else if (kind === "plough") {
        state.pose = state.species.poses.includes("plough") ? "plough" : null;
        renderActor();
        say("Vrum vrum na fazenda! 🚜", 1500);
        await playMove("wobble", 1300);
        rain(["🌾", "🟤", "✨"], 8);
        say("Terra prontinha!", 1600);
        await wait(1400);
      } else if (kind === "sail") {
        state.pose = state.species.poses.includes("sail") ? "sail" : null;
        renderActor();
        say("Vento na vela! ⛵", 1500);
        await playMove("wobble", 1300);
        rain(["🌊", "💨", "✨"], 8);
        say("Iupi, navegando!", 1600);
        await wait(1400);
      } else if (kind === "loop") {
        state.pose = state.species.poses.includes("loop") ? "loop" : null;
        renderActor();
        say("Looping! ✈️", 1400);
        await playMove("rear", 1400);
        rain(["☁️", "⭐", "💨"], 10);
        say("Uhuuuul!", 1600);
        await wait(1400);
      } else if (kind === "bounce") {
        state.pose = state.species.poses.includes("bounce") ? "bounce" : null;
        renderActor();
        say("Ploing ploing! 🍮", 1400);
        await playMove("wobble", 700);
        await playMove("rear", 900);
        rain(["✨", "💜", "💚", "💙"], 10);
        say("Sou todinho gelinho!", 1600);
        await wait(1400);
      } else if (kind === "splash") {
        state.pose = state.species.poses.includes("splash") ? "splash" : null;
        renderActor();
        say("Splash splash! 🦭", 1500);
        await playMove("wobble", 1200);
        rain(["💧", "🌊", "✨"], 10);
        say("Água geladinha! Hihi", 1600);
        await wait(1400);
      } else if (kind === "swing") {
        state.pose = state.species.poses.includes("swing") ? "swing" : null;
        renderActor();
        say("Balancinho! 🍌", 1400);
        await playMove("wobble", 700);
        await playMove("rear", 1000);
        rain(["🍌", "⭐", "✨"], 8);
        say("Uhul na cauda!", 1600);
        await wait(1400);
      } else if (kind === "swim") {
        state.pose = state.species.poses.includes("swim") ? "swim" : null;
        renderActor();
        say("Nadando… blub! 💧", 1500);
        await playMove("wobble", 1300);
        rain(["💧", "🫧", "✨"], 10);
        say("Gotinha feliz!", 1600);
        await wait(1400);
      } else if (kind === "zip") {
        state.pose = "fly"; renderActor();
        say("Zuum zuum! 🦋", 1200);
        await playMove("fly", 900);
        await playMove("wobble", 600);
        await playMove("fly", 900);
        rain(["✨", "🌸", "💨"], 10);
        say("Nini voa pra todo lado!", 1600);
        await wait(1400);
      } else if (kind === "yarn") {
        state.pose = state.species.poses.includes("yarn") ? "yarn" : null;
        renderActor();
        say("Minha lã! 🧶", 1400);
        await playMove("wobble", 1200);
        rain(["🧶", "✨", "🐾"], 8);
        say("Travessura!", 1600);
        await wait(1400);
      } else if (kind === "hide") {
        state.pose = state.species.poses.includes("hide") ? "hide" : null;
        renderActor();
        say("…escondida… 🙈", 1500);
        await playMove("wobble", 1400);
        rain(["💗", "✨"], 5);
        say("Só um pouquinho…", 1600);
        await wait(1400);
      } else if (kind === "stomp") {
        state.pose = state.species.poses.includes("stomp") ? "stomp" : null;
        renderActor();
        say("PISOTEIO! 🐘", 1200);
        await playMove("rear", 700);
        playMove("splat", 500);
        burst(40, 0.92);
        rain(["💥", "🟤", "✨"], 10);
        say("O mundo tremeu!", 1800);
        await wait(1600);
      } else if (kind === "roar") {
        state.pose = state.species.poses.includes("roar") ? "roar" : null;
        renderActor();
        say("GRRRRAWR! 🦁", 1400);
        await playMove("rear", 1200);
        rain(["🦁", "💛", "✨"], 8);
        say("Esse é meu rugido de brincadeira! Vem brincar comigo! 🦁💛", 1800);
        await wait(1600);
      } else if (kind === "hop") {
        state.pose = state.species.poses.includes("hop") ? "hop" : null;
        renderActor();
        say("Pula pula! 🐇", 1200);
        await playMove("rear", 700);
        await playMove("wobble", 500);
        await playMove("rear", 700);
        rain(["🥕", "✨", "🌱"], 8);
        say("Lilica não para!", 1600);
        await wait(1400);
      } else if (kind === "rear") {
        say("Iiiirrí! 🌈", 1600);
        rain(["✨", "🌈", "⭐"], 8);
        await playMove("rear", 1400);
      }
    } finally {
      state.pose = null;
      el.actorMove.className = "actor-move";
      state.busy = false;
      setMood("happy", 1200);
      renderActor();
      state.nextSkit = performance.now() + 14000 + Math.random() * 10000;
      applyRequestedSleep();
    }
    void p;
  }
  function skitForStage() {
    const sp = state.species;
    if (state.stage === 1 && sp.skit) return sp.skit;
    if ((state.stage === 2 || state.stage === 3) && sp.childSkit) return sp.childSkit;
    if (state.stage === 4 && sp.adultSkit) return sp.adultSkit;
    return null;
  }

  // ---------- Game flow ----------
  function setEggCrack(level, withShake = true) {
    if (state.eggCrack === level) return;
    const grew = level > (state.eggCrack || 0);
    state.eggCrack = level;
    renderActor();
    if (grew && level > 0 && window.PixelAudio) window.PixelAudio.cue("crack");
    if (withShake && level > 0) {
      el.actor.classList.remove("crack-shake");
      void el.actor.offsetWidth;
      el.actor.classList.add("crack-shake");
      burst(8 + level * 6, 0.45);
    }
  }

  async function hatch(species) {
    if (state.phase === "hatching") return;
    const wasChosenEgg = !!state.chosenEgg;
    state.phase = "hatching";
    state.rubbing = false;
    el.actor.classList.remove("rubbing");
    el.actor.classList.add("hatching");
    el.app.dataset.phase = "hatching";
    updateGuide();

    // Ovo escolhido já tinha o PIXEL; surpresa só revela no final.
    species = species || state.forceSpecies || pickHatchSpecies();
    if (!species) {
      state.phase = "egg";
      el.actor.classList.remove("hatching");
      el.app.dataset.phase = "egg";
      say("Você já tem todos os PIXELs! Abra Meus PIXELs 🏡", 3600);
      openCollection();
      return;
    }
    if (wasChosenEgg) state.forceSpecies = species;
    applyVariant(species, pickVariant(species));
    preload(species);
    syncEggPeekLayers();
    const rolled = rollStrongTraits(species);

    const steps = [
      { crack: 1, say: "Crec…", ms: 900 },
      { crack: 2, say: "Crec… crec…", ms: 1100 },
      { crack: 3, say: "Está nascendo! ✨", ms: 1300 },
      { crack: 4, say: "…", ms: 700 },
    ];
    for (const step of steps) {
      setEggCrack(step.crack, true);
      say(step.say, step.ms);
      await wait(step.ms);
    }

    el.actor.classList.remove("hatching");
    el.actor.classList.add("hatch-burst");
    flash();
    burst(140, 0.5);
    if (window.PixelAudio) window.PixelAudio.cue("hatch", species?.id);
    await wait(500);

    const knewSpecies = wasChosenEgg;
    Object.assign(state, {
      phase: "pet", stage: 1, species, pronoun: species.he, nameChosen: false, name: pick((state.variant && species.variants?.[state.variant]?.names) || species.names),
      lastGrowth: performance.now(), eggCrack: 0, pose: null, lackMs: 0,
      boosts: rolled.boosts,
      strongTraits: rolled.strongTraits,
      growthIntervalMs: Math.round(speciesGrowthMs(species) * (0.92 + Math.random() * 0.16)),
      petId: crypto.randomUUID?.() || `pet-${Date.now()}`,
      hatchAt: Date.now(),
      outfit: emptyOutfit(),
      activeToyId: null,
      playing: false,
      actorOff: { x: 0, y: 0 },
      forceSpecies: null,
      chosenEgg: false,
    });
    el.app.dataset.phase = "pet";
    el.actor.classList.remove("hatch-burst", "crack-shake", "chosen-egg", "egg-peeking", "egg-pushing", "hatching");
    if (el.eggPeek) el.eggPeek.hidden = true;
    el.actorImg.style.filter = "";
    el.actorImg.style.opacity = "";
    el.actorMove.style.filter = "";
    renderActor(); renderHeader(); renderGrowth();
    enablePetUI();
    el.btn1Icon.textContent = "☀️";
    el.btn1Text.textContent = "Acordar";
    if (isLion(species)) {
      Object.assign(state.needs, { hunger: 70, thirst: 72, hygiene: 75, love: 58, energy: 72, health: 95 });
      setMood("happy", 1400);
      rain(["✨", "🦁", "⭐"], 10);
      say("Oi… acabei de chegar! 🦁", 2200);
      if (window.PixelAudio) window.PixelAudio.speak("lion", "neutral", { force: true });
    } else {
      setMood("happy", 2000);
      rain(["✨", "💖", "⭐"], 10);
      say("Surpresa! Olha quem chegou! 💖", 2200);
      if (window.PixelAudio && species) window.PixelAudio.speak(species.id, "happy", { force: true });
      // Bebê recém-nascido: soluço (e às vezes pum / escapamento) é normal
      setTimeout(() => {
        if (state.phase !== "pet" || state.species !== species) return;
        const vehicle = ["racer", "botcar", "rocket", "heli", "plane", "train", "tractor", "boat"].includes(species.id);
        if (Math.random() < 0.65) {
          say(vehicle ? "Prrrp… o escapamento! 💨" : "Hic! …desculpa, soluço de bebê 🍼", 2200);
        }
      }, 1400);
    }
    setTimeout(() => {
      const line = rolled.phrases.map((p) => p.text).join(" ");
      say(line, 4200);
    }, 2700);
    state.nextSkit = performance.now() + 3200;
    saveActivePet();
    metric("hatched");
    updateGuide();
    state.naming = true;
    setTimeout(choosePetName, 1600);
  }

  function grow() {
    if (state.stage >= 4) return;
    state.stage++;
    metric("grew", { action: String(state.stage) });
    flash();
    burst(90);
    renderActor(); renderHeader(); renderGrowth();
    setMood("happy", 2000);
    rain(["⭐", "✨", "🌟"], 8);
    say(state.stage === 4 ? "Cresci todinho! 🌟" : "Olha como eu cresci!", 2600);
    state.needs.love = clamp(state.needs.love + 15, 0, 100);
    state.nextSkit = performance.now() + 5000;
  }

  function decayRates() {
    return window.PixelsCatalog.needDecayRates(state.stage, state.species?.profile, state.boosts, state.sleeping, PACE);
  }

  function speciesGrowthMs(sp = state.species) {
    // profile.growthMs é o valor “original”; PACE deixa 3× mais lento
    return (sp?.profile?.growthMs || 45_000) * PACE;
  }

  function isSick() {
    return state.mood === "sick" || state.needs.health < 35;
  }

  function refuseBecauseSick(kind) {
    if (!isSick()) return false;
    metric("care_blocked", { action: kind, reason: "sick" });
    setMood("sick", 2200);
    rain(["🤒", "💢", "💧"], 4);
    const request = isMachine() ? "Estou passando mal. Me leve a um mecânico!" : "Estou passando mal. Me leve a um veterinário!";
    window.PixelAudio?.words(request);
    if (kind === "play") {
      if (state.playing) setPlaying(false);
      say(request, 3500);
    } else if (kind === "feed") {
      say(request, 3500);
    } else {
      say(isMachine() ? "Preciso de conserto primeiro! 🛠️" : "Me cura primeiro… 💊", 2200);
    }
    renderActor();
    return true;
  }

  function setPlaying(on) {
    if (state.phase !== "pet" || state.sleeping) return;
    if (on && isSick()) {
      refuseBecauseSick("play");
      return;
    }
    stopMove();
    state.playing = !!on;
    el.app.classList.toggle("playing", state.playing);
    if (el.toy) {
      el.toy.hidden = !state.playing;
      if (state.playing) placeToyNearPet(14);
    }
    syncToyUI();
    if (state.playing) {
      sootheFrustration();
      say(`Pega o brinquedo! ${toyEmoji()}`, 2200);
      setMood("happy", 1800);
    } else {
      state.combo = 0;
      state.comboTimer = 0;
      showCombo(0);
      state.actorOff = { x: 0, y: 0 };
      renderActor();
      say("Brincadeira acabou!", 1600);
    }
  }

  /** Brinquedo no chão, perto das patinhas do PIXEL (não longe no cenário). */
  function placeToyNearPet(spread = 16) {
    const rect = el.stage?.getBoundingClientRect();
    let x = 56, y = 74;
    if (rect && rect.width > 0) {
      // Desloca levemente com o PIXEL se ele já correu
      x += ((state.actorOff?.x || 0) / rect.width) * 100;
      y += ((state.actorOff?.y || 0) / rect.height) * 100;
    }
    placeToy(
      x + (Math.random() - 0.5) * spread,
      y + (Math.random() - 0.5) * (spread * 0.45)
    );
  }

  function placeToy(px, py) {
    // Zona de brincar: centro-baixo do stage (perto do PIXEL)
    state.toy.x = clamp(px, 38, 72);
    state.toy.y = clamp(py, 62, 84);
    if (!el.toy) return;
    el.toy.style.left = `${state.toy.x}%`;
    el.toy.style.top = `${state.toy.y}%`;
  }

  function chaseToy(dt) {
    if (!state.playing || state.busy || !el.stage) return;
    const rect = el.stage.getBoundingClientRect();
    const tx = (state.toy.x / 100) * rect.width - rect.width / 2;
    const ty = (state.toy.y / 100) * rect.height - rect.height * 0.42;
    const cur = state.actorOff;
    const speed = 180 * dt; // px/s
    const dx = tx - cur.x, dy = ty - cur.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 42) {
      state.combo = (state.comboTimer > 0 ? state.combo : 0) + 1;
      state.comboTimer = 2.8;
      const bonus = Math.min(6, state.combo);
      state.needs.love = clamp(state.needs.love + 8 + bonus, 0, 100);
      state.needs.hunger = clamp(state.needs.hunger - 4 * NEED_DRAIN_FACTOR, 0, 100);
      state.needs.thirst = clamp(state.needs.thirst - 5 * NEED_DRAIN_FACTOR, 0, 100);
      state.needs.energy = clamp(state.needs.energy - 6 * NEED_DRAIN_FACTOR, 0, 100);
      placeToyNearPet(20);
      rain([toyEmoji(), "✨", "💗"], 5 + Math.min(4, state.combo));
      showCombo(state.combo);
      if (state.combo >= 3) stageShake();
      if (Math.random() < 0.4) say(pick(["Peguei!", "De novo!", "Hihihi!", "Mais!", `Combo ×${state.combo}!`]), 1200);
      setMood("happy", 900);
      return;
    }
    const step = Math.min(speed, dist);
    state.actorOff = { x: cur.x + (dx / dist) * step, y: cur.y + (dy / dist) * step };
    el.actorMove.style.transform = `translate(${state.actorOff.x}px, ${state.actorOff.y}px)`;
    // Correr cansa um pouquinho contínuo
    state.needs.energy = clamp(state.needs.energy - 1.8 * dt * NEED_DRAIN_FACTOR, 0, 100);
    state.needs.thirst = clamp(state.needs.thirst - 1.2 * dt * NEED_DRAIN_FACTOR, 0, 100);
    state.needs.hunger = clamp(state.needs.hunger - 0.9 * dt * NEED_DRAIN_FACTOR, 0, 100);
  }

  function foodBowlTypeForSpecies(sp = state.species) {
    if (!sp) return "berry";
    if (isMachine(sp)) return "parts";
    const id = sp.id;
    if (id === "kitty" || id === "floide" || id === "seal" || id === "axolotl") return "fish";
    if (id === "lion" || id === "tini") return "meat";
    if (id === "elephant" || id === "lilica" || id === "monkey" || id === "pig" || id === "badger") return "melon";
    if (id === "bee" || id === "butterfly" || id === "nini") return "nectar";
    return "berry";
  }

  function applyBowlCrouchTransform() {
    if (state.pose === "drink" && state.species?.drinkArt) return;
    if (!el.stage || !el.actorMove) return;
    if (window.PixelsLooks.active(state.species?.id, state.outfit)) return;
    const stageRect = el.stage.getBoundingClientRect();
    const stageH = stageRect.height || 440;
    const stageW = stageRect.width || 380;
    const s = STAGE_SCALE[state.stage] || 1;
    const anchors = getSpriteAnchors(el.actorImg?.getAttribute("src") || "", state.species?.id);
    const [nx, ny] = anchors?.neck || [0.5, 0.52];
    const [fx0] = anchors?.face || [0.5, 0.36];
    const mouthStageY = stageH * 0.87 - (1 - ny) * s * stageH * 0.68;
    const bowlH = el.stageGroundProp?.offsetHeight || stageH * 0.22;
    const bowlRimY = stageH * 0.995 - bowlH * 0.68;
    const crouchY = clamp(Math.round(bowlRimY - mouthStageY), 28, Math.round(stageH * 0.42));
    const crouchX = clamp(Math.round((0.5 - nx) * s * stageW * 0.72), -48, 48);
    const crouchRot = fx0 < 0.47 ? -5 : (fx0 > 0.53 ? 5 : 4);
    el.actorMove.style.setProperty("--crouch-x", `${crouchX}px`);
    el.actorMove.style.setProperty("--crouch-y", `${crouchY}px`);
    el.actorMove.style.setProperty("--crouch-rot", `${crouchRot}deg`);
  }

  function clearStageCareProps() {
    el.stage?.classList.remove("crouch-at-bowl");
    if (el.stageGroundProp) el.stageGroundProp.hidden = true;
    if (el.groundBowlFx) el.groundBowlFx.innerHTML = "";
    if (el.groundBowlImg) el.groundBowlImg.classList.remove("bowl-chomp");
    if (el.stageCareOverlay) {
      el.stageCareOverlay.hidden = true;
      el.stageCareOverlay.innerHTML = "";
    }
    if (el.bathFoamLayer) {
      el.bathFoamLayer.hidden = true;
      el.bathFoamLayer.classList.remove("foam-building", "foam-rinsing");
    }
  }

  function throwToGroundBowl(fromKey, emoji, ms = 520) {
    const dev = el.app.getBoundingClientRect();
    const b = buttons[fromKey]?.getBoundingClientRect() || dev;
    const sRect = el.stage.getBoundingClientRect();
    const n = document.createElement("span");
    n.className = "projectile";
    n.textContent = emoji;
    el.projectiles.appendChild(n);
    const x0 = b.left + b.width / 2 - dev.left - 24;
    const y0 = b.top - dev.top;
    const x1 = sRect.left + sRect.width / 2 - dev.left - 24;
    const y1 = sRect.bottom - dev.top - (sRect.height * 0.14);
    n.animate?.([
      { transform: `translate(${x0}px, ${y0}px) scale(0.6) rotate(0deg)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 110}px) scale(1.25) rotate(160deg)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.55) rotate(320deg)`, opacity: 0.25 },
    ], { duration: ms, easing: "cubic-bezier(.3,.7,.4,1)" });
    return wait(ms - 40).then(() => n.remove());
  }

  function pulseBowlChomp() {
    if (!el.groundBowlImg) return;
    el.groundBowlImg.classList.remove("bowl-chomp");
    void el.groundBowlImg.offsetWidth;
    el.groundBowlImg.classList.add("bowl-chomp");
  }

  function applyRequestedSleep() {
    if (state.sleepRequested && !state.busy && !state.sleeping && state.phase === "pet") {
      state.sleepRequested = false;
      void care("sleep");
    }
  }
  async function care(kind) {
    if (state.phase !== "pet") return;
    metric("care_attempt", { action: kind });
    if (state.sleeping && kind !== "wake") { metric("care_blocked", { action: kind, reason: "sleeping" }); say("Shhh… zzz", 1400); rain(["💤"], 2, "zzz"); return; }
    if (state.busy && kind !== "wake") {
      if (kind === "sleep") {
        state.sleepRequested = true;
        say("Já vou dormir… só estou terminando! 🌙", 2200);
      } else metric("care_blocked", { action: kind, reason: "busy" });
      return;
    }
    window.PixelAudio?.setCharacter(state.species?.id, state.stage, state.sleeping);
    const n = state.needs;
    // Tyton responde bem ao carinho
    const boost = 12 + state.stage * 4;
    const tooMuch = (key, limit, msg) => {
      if (n[key] <= limit) return false;
      metric("care_blocked", { action: kind, reason: "already_full" });
      if (isLion()) {
        say(key === "love" ? "Adorei o carinho! Vamos brincar um pouquinho? 💛" : "Já estou satisfeito! Obrigado por cuidar de mim! 💛", 2000);
        return true;
      }
      state.over[key] = Math.min(6, state.over[key] + 1);
      if (!isSick()) setMood("neutral", 900);
      say(msg, 2000);
      return true;
    };
    const relieve = (key) => { state.over[key] = Math.max(0, state.over[key] - 1); };

    if (kind === "feed") {
      if (refuseBecauseSick("feed")) return;
      if (tooMuch("hunger", 92, isMachine() ? "Já estou abastecido, obrigado! 🔧" : "Minha barriguinha está cheia. Obrigado!")) return;
      window.PixelAudio?.cue("feed", state.species?.id);
      state.busy = true;
      state.actorOff = { x: 0, y: 0 };
      el.actorMove.style.transform = "";
      const bowlType = foodBowlTypeForSpecies(state.species);
      if (el.groundBowlImg) el.groundBowlImg.src = `assets/care/food-bowl-${bowlType}.png`;
      if (el.groundBowlFx) el.groundBowlFx.innerHTML = "";
      if (el.stageGroundProp) el.stageGroundProp.hidden = false;

      await throwToGroundBowl("2", state.species.food, 480);
      n.hunger = clamp(n.hunger + boost + 8, 0, 100);
      relieve("hunger");
      renderNeeds();

      state.pose = "eat";
      state.careFrame = "bite";
      renderActor();
      el.actor.dataset.mood = "neutral";
      applyBowlCrouchTransform();
      el.stage?.classList.add("crouch-at-bowl");
      playMove("eat-ground-bobs", 2550);
      say(isMachine() ? `Clinc clanc! Comendo ${state.species.foodName} na bandeja! 🔧` : (isLion() ? `Grr… nham nham! Devorando ${state.species.foodName}! 🥩` : `Nham nham! Comendo ${state.species.foodName} no pratinho! 😋`), 2500);

      const biteTimes = [440, 960, 1480, 1980];
      biteTimes.forEach((ms, idx) => {
        setTimeout(() => {
          if (!state.busy) return;
          if (window.PixelsLooks.active(state.species?.id, state.outfit)) {
            state.careFrame = idx % 2 === 0 ? "chew" : "bite";
            renderActor();
          }
          pulseBowlChomp();
          if (idx === 1 && el.groundBowlImg) {
            el.groundBowlImg.src = `assets/care/food-bowl-${bowlType}-half.png`;
          } else if (idx === 3 && el.groundBowlImg) {
            el.groundBowlImg.src = `assets/care/food-bowl-empty.png`;
          }
          for (let c = 0; c < 2; c++) {
            fx("float", pick([state.species.food, "✨", "💛", "😋"]), {
              x: 42 + Math.random() * 16,
              y: 74 + Math.random() * 8,
              dx: (Math.random() - 0.5) * 95,
            });
          }
        }, ms);
      });

      await wait(2550);
      clearStageCareProps();
      state.pose = null;
      state.careFrame = null;
      state.busy = false;
    } else if (kind === "drink") {
      if (tooMuch("thirst", 92, isMachine() ? "Tanque cheio, obrigado! ⛽" : "Já matei a sede, obrigado! 💧")) return;
      window.PixelAudio?.cue("drink", state.species?.id);
      state.busy = true;
      state.actorOff = { x: 0, y: 0 };
      el.actorMove.style.transform = "";
      const machine = isMachine();
      state.pose = "drink";
      state.careFrame = "lap";
      renderActor();
      if (el.groundBowlImg) {
        el.groundBowlImg.src = machine ? "assets/care/drink-fuel-bowl.png" : "assets/care/drink-water-bowl.png";
      }
      if (el.groundBowlFx) el.groundBowlFx.innerHTML = "";
      if (el.stageGroundProp) el.stageGroundProp.hidden = false;

      await throwToGroundBowl("3", machine ? "⛽" : (canUsePacifier() ? "🍼" : "💧"), 460);
      n.thirst = clamp(n.thirst + boost + 10, 0, 100);
      relieve("thirst");
      renderNeeds();

      applyBowlCrouchTransform();
      el.stage?.classList.add("crouch-at-bowl");
      playMove("drink-ground-laps", 2350);
      say(machine ? pick(["Glup glup de turbo-óleo! ⛽", "Motor abastecido no chão! ✨", "Tanque fresquinho!"]) : pick(["Glub glub glub… água fresquinha! 💧", "Slurp slurp na tigelinha! 💦", "Ahhh, que aguinha gostosa! 😋"]), 2300);

      const lapTimes = [380, 860, 1340, 1820];
      lapTimes.forEach((ms, idx) => {
        setTimeout(() => {
          if (!state.busy) return;
          if (state.pose !== "drink") return;
          if (window.PixelsLooks.active(state.species?.id, state.outfit)) {
            state.careFrame = "lap"; renderActor();
            setTimeout(() => { if (state.pose === "drink" && state.busy) { state.careFrame = "sip"; renderActor(); } }, 240);
          }
          if (!state.species?.drinkArt) pulseBowlChomp();
          if (idx === 1 && !machine && el.groundBowlImg) {
            el.groundBowlImg.src = "assets/care/drink-water-bowl-low.png";
          }
          if (el.groundBowlFx) {
            const ring = document.createElement("span");
            ring.className = "water-ripple-ring";
            el.groundBowlFx.appendChild(ring);
            setTimeout(() => ring.remove(), 550);

          }
          fx("float", pick(machine ? ["⛽", "✨", "⚡"] : ["💧", "💦", "🫧", "✨"]), {
            x: 44 + Math.random() * 12,
            y: 74 + Math.random() * 6,
            dx: (Math.random() - 0.5) * 80,
          });
        }, ms);
      });

      await wait(2350);
      clearStageCareProps();
      state.pose = null;
      state.careFrame = null;
      state.busy = false;
    } else if (kind === "bath") {
      if (tooMuch("hygiene", 90, "Já estou limpinho!")) return;
      window.PixelAudio?.cue("bath", state.species?.id);
      state.busy = true;
      state.actorOff = { x: 0, y: 0 };
      el.actorMove.style.transform = "";
      n.hygiene = clamp(n.hygiene + 35, 0, 100);
      relieve("hygiene");
      renderNeeds();

      // Fase 1: Esponja 3D esfregando e cobrindo o corpo todo de espuma 3D + patinho na cabeça!
      if (el.bathFoamLayer) {
        el.bathFoamLayer.hidden = false;
        el.bathFoamLayer.classList.remove("foam-rinsing");
        el.bathFoamLayer.classList.add("foam-building");
      }
      renderOutfit();
      if (el.stageCareOverlay) {
        el.stageCareOverlay.hidden = false;
        el.stageCareOverlay.innerHTML = `<img class="care-sponge-prop" src="assets/care/bath-sponge.png" alt="" />`;
      }
      for (let i = 0; i < 16; i++) {
        setTimeout(() => fx("bubble-soap", "", {
          x: 20 + Math.random() * 60,
          y: 25 + Math.random() * 55,
          dx: (Math.random() - 0.5) * 90,
          size: 18 + Math.random() * 34,
        }), i * 80);
      }
      playMove("wobble", 1500);
      say(isLion() ? "Olha minha juba de espuma! 🦁🫧" : "Espuminha cheirosa pelo corpo todo! Hihihi 🫧🛁", 1550);
      await wait(1550);

      // Fase 2: Chuveirinho 3D com jatos de água morna enxaguando a espuma!
      if (el.bathFoamLayer) {
        el.bathFoamLayer.classList.remove("foam-building");
        el.bathFoamLayer.classList.add("foam-rinsing");
      }
      if (el.stageCareOverlay) {
        const streams = [36, 41, 46, 50, 54, 59, 64].map((leftPct, idx) =>
          `<span class="shower-stream-line" style="left:${leftPct}%;animation-delay:${(idx * 0.05).toFixed(2)}s"></span>`
        ).join("");
        el.stageCareOverlay.innerHTML = `${streams}<img class="care-shower-prop" src="assets/care/bath-showerhead.png" alt="" />`;
      }
      rain(["💧", "🫧", "✨"], 6);
      say(isLion() ? "Que água gostosa! Splash! 🚿💛" : "Chuveirinho quentinho! Splash splash! 🚿💧", 1250);
      await wait(1250);

      // Fase 3: Sacudida pra secar e ficar brilhando!
      clearStageCareProps();
      renderOutfit();
      playMove("bath-shake", 580);
      rain(["✨", "🌟", "🫧", "💖"], 8);
      say(isLion() ? "Pronto… limpinho e macio." : "Sacudindo… cheirosinho e brilhando! ✨💖", 1800);
      await wait(580);
      state.busy = false;
    } else if (kind === "pet") {
      if (n.love >= 95) {
        sootheFrustration();
        say("Eu te amo! Você me faz muito feliz! 💖", 2800);
        window.PixelAudio?.words("Eu te amo! Você me faz muito feliz!");
        metric("care_success", { action: kind });
        return;
      }
      // Tyton ACEITA muito carinho — é assim que ele melhora
      const loveCap = isLion() ? 98 : 94;
      if (tooMuch("love", loveCap, "Adorei o carinho! Vamos descansar um pouquinho? 💗")) return;
      window.PixelAudio?.cue("pet", state.species?.id);
      n.love = clamp(n.love + boost + (isLion() ? 2 : 0), 0, 100);
      if (n.love >= 90) window.PixelAudio?.words("Eu te amo! Obrigado por cuidar de mim!");
      relieve("love");
      if (el.stageCareOverlay) {
        el.stageCareOverlay.hidden = false;
        el.stageCareOverlay.innerHTML = `<span class="care-pet-hand" style="left:50%;top:32%">🤚</span>`;
        setTimeout(() => {
          if (!state.busy && el.stageCareOverlay) {
            el.stageCareOverlay.hidden = true;
            el.stageCareOverlay.innerHTML = "";
          }
        }, 1250);
      }
      playMove("pet-nuzzle", 1200);
      rain(["💖", "💗", "💕", "🥰"], isLion() ? 4 : 7);
      say(n.love >= 90 ? "Eu te amo! Você me faz muito feliz! 💖" : isLion()
        ? pick(["Adoro seu carinho! 🦁💛", "Mais um abraço! 💖", "Você é meu melhor amigo!", "Minha juba ama esse cafuné! 🥰"])
        : pick(["Hihihi!", "Te amo! 💖", "Mais um abraço!", "Rrrrrr… 😊"]));
    } else if (kind === "sleep") {
      state.sleepRequested = false;
      if (!state.sleeping) {
        if (state.playing) setPlaying(false);
        stopMove();
        state.sleeping = true;
        state.pose = null;
        state.busy = false;
        setMood("sleep");
        say("Boa noite… 🌙", 2200);
      }
      renderActor(); renderNeeds();
      saveActivePet();
      metric("care_success", { action: kind });
      return;
    } else if (kind === "wake") {
      state.sleepRequested = false;
      if (!state.sleeping) { metric("care_blocked", { action: kind, reason: "already_awake" }); say("Já estou acordado!", 1400); return; }
      state.sleeping = false;
      window.PixelAudio?.setCharacter(state.species?.id, state.stage, false);
      window.PixelAudio?.cue("wake", state.species?.id);
      rain(["☀️", "✨"], 4);
      say(isLion() ? "Bom dia! Vamos brincar? 🦁☀️" : "Bom dia!! ☀️", 2000);
    } else if (kind === "heal") {
      if (n.health > 92) { metric("care_blocked", { action: kind, reason: "healthy" }); say(isMachine() ? "Já estou novinho! 🛠️" : "Já estou saudável! 💚", 1600); return; }
      window.PixelAudio?.cue("heal", state.species?.id);
      state.busy = true;
      rain(isMachine() ? ["🛠️", "🔩", "✨"] : ["💊", "💚", "✨"], 10);
      playMove("wobble", 1200);
      n.health = clamp(n.health + 38, 0, 100);
      n.hygiene = clamp(n.hygiene + 6, 0, 100);
      say(isMachine() ? "Consertado! Vruum! 🛠️" : "Já estou melhor! 💚", 2200);
      await wait(1400);
      state.busy = false;
      el.actor.classList.remove("sick");
    } else if (kind === "play") {
      if (state.sleeping) { say("Shhh… zzz", 1400); return; }
      if (refuseBecauseSick("play")) return;
      if (n.energy < 12) { metric("care_blocked", { action: kind, reason: "tired" }); say("Estou cansadinho demais… 😴", 1800); return; }
      setPlaying(!state.playing);
      if (state.playing) window.PixelAudio?.cue("play", state.species?.id);
      if (state.playing && isLion()) {
        state.lackMs = 0;
        state.moodLock = 0;
        n.love = clamp(n.love + 3, 0, 100);
        say(pick(["Oba! Vamos brincar! 🦁💛", "Vem correr comigo!", "Meu rugido é de alegria! 🦁✨"]), 1800);
      }
      renderNeeds();
      evaluateMood(performance.now() + 1);
      renderActor();
      saveActivePet();
      metric("care_success", { action: kind });
      return;
    }
    // Successful care clears accumulated frustration before reassessing needs.
    if (isLion()) {
      state.lackMs = 0;
      for (const key of Object.keys(state.over)) state.over[key] = 0;
      state.moodLock = 0;
      evaluateMood(performance.now() + 1);
    } else {
      sootheFrustration();
      setMood("happy", 1600);
    }
    state.lackMs = Math.max(0, state.lackMs - 4000);
    renderActor();
    renderNeeds();
    saveActivePet();
    metric("care_success", { action: kind });
    applyRequestedSleep();
  }

  function sootheFrustration() {
    state.lackMs = Math.max(0, state.lackMs - 15000);
    for (const key of Object.keys(state.over)) state.over[key] = Math.max(0, state.over[key] - 2);
  }

  function evaluateMood(now) {
    if (now < state.moodLock || state.busy) return;
    if (state.sleeping) return setMood("sleep");
    const n = state.needs;
    if (isLion()) return setMood(window.PixelsCatalog.lionMood(n, state.lackMs));
    setMood(window.PixelsCatalog.careMood(n, state.over, state.lackMs, state.playing));
  }

  function updateClock() {
    const now = new Date();
    el.clockTime.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (state.preview?.period) el.app.dataset.period = state.preview.period;
    else {
      const p = ((performance.now() - state.dayStart) % DEMO.dayLengthMs) / DEMO.dayLengthMs;
      el.app.dataset.period = p > 0.75 || p < 0.1 ? "night" : p > 0.6 ? "dusk" : "day";
    }
    const period = el.app.dataset.period;
    el.clockIcon.textContent = period === "night" ? "🌙" : period === "dusk" ? "🌅" : "☀️";
  }

  // ---------- Loop ----------
  function tick(now) {
    const dt = Math.min(0.1, (now - state.last) / 1000);
    state.last = now;
    const browsing = (el.closetPanel && !el.closetPanel.hidden) || (el.collectionPanel && !el.collectionPanel.hidden);
    if (browsing) {
      state.lastGrowth += dt * 1000;
      requestAnimationFrame(tick);
      return;
    }
    if (state.naming) {
      requestAnimationFrame(tick);
      return;
    }
    if (!tick.c || now - tick.c > 300) { tick.c = now; updateClock(); updateGuide(); }
    if (!tick.snd || now - tick.snd > 6000) {
      tick.snd = now;
      if (state.phase === "pet" && state.species && window.PixelAudio) {
        window.PixelAudio.tickNeeds(state.species.id, state.needs);
      }
    }

    if (state.phase === "egg" && !state.preview) {
      if (!state.audience) {
        renderEgg();
      } else {
      state.temp = clamp(state.temp + (state.rubbing ? 20 : -7) * dt, 10, 100);
      const ideal = state.temp >= DEMO.idealMin && state.temp <= DEMO.idealMax;
      state.idealMs = ideal ? state.idealMs + dt * 1000 : Math.max(0, state.idealMs - dt * 600);
      if (state.rubbing && Math.random() < 0.3) burst(1);
      // Rachaduras aparecem aos poucos enquanto mantém a temperatura ideal
      const pct = state.idealMs / (DEMO.hatchSeconds * 1000);
      if (pct >= 0.85) setEggCrack(2, state.eggCrack < 2);
      else if (pct >= 0.4) setEggCrack(1, state.eggCrack < 1);
      else if (pct < 0.2) setEggCrack(0, false);
      renderEgg();
      if (state.idealMs >= DEMO.hatchSeconds * 1000) hatch(state.forceSpecies);
      }
    } else if (state.phase === "pet") {
      if (!state.preview) {
        const rates = decayRates();
        for (const [k, r] of Object.entries(rates)) state.needs[k] = clamp(state.needs[k] - r * dt, 0, 100);
        for (const k of Object.keys(state.over)) state.over[k] = Math.max(0, state.over[k] - (0.3 / PACE) * dt);

        // Saúde: acelera perda quando há necessidades baixas ou negligência (cura requer carinho/remédio)
        const n = state.needs;
        const lowCount = ["hunger", "thirst", "hygiene", "love", "energy"].filter((k) => n[k] < 45).length;
        const critCount = ["hunger", "thirst", "hygiene", "love", "energy"].filter((k) => n[k] < 25).length;
        let hDelta = 0;
        if (critCount >= 1 || lowCount >= 2) hDelta = (-3.2 / PACE) * dt * NEED_DRAIN_FACTOR;
        else if (lowCount >= 1) hDelta = (-1.5 / PACE) * dt * NEED_DRAIN_FACTOR;
        n.health = clamp(n.health + hDelta, 0, 100);

        const lacking = Object.values(state.needs).some((v) => v < 35);
        for (const [key, value] of Object.entries(state.needs)) {
          if (value < 35 && now - (lowNeedReported.get(key) ?? -Infinity) > 60000) {
            metric("need_low", { action: key });
            lowNeedReported.set(key, now);
          }
        }
        state.lackMs = lacking ? state.lackMs + dt * 1000 : Math.max(0, state.lackMs - dt * 2000);

        if (state.playing) {
          if (isSick()) {
            setPlaying(false);
            say(isMachine() ? "Quebrou no meio da brincadeira… 🛠️" : "Ai… doente demais pra brincar 🤒", 2200);
          } else {
          chaseToy(dt);
          if (state.comboTimer > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) { state.combo = 0; showCombo(0); }
          }
          if (n.energy < 8) {
            setPlaying(false);
            say("Cansou… precisa descansar! 😴", 2000);
          }
          }
        }

        state.saveTimer = (state.saveTimer || 0) + dt;
        if (state.saveTimer > 8) { state.saveTimer = 0; saveActivePet(); }

        if (state.stage < 4) {
          const frac = (now - state.lastGrowth) / state.growthIntervalMs;
          if (frac >= 1) {
            state.lastGrowth = now;
            const base = speciesGrowthMs(state.species);
            state.growthIntervalMs = Math.round(base * (0.9 + Math.random() * 0.2));
            grow();
            saveActivePet();
          } else renderGrowth(frac);
        }
        if (now > state.nextSkit) {
          const s = skitForStage();
          if (s) skit(s); else state.nextSkit = Infinity;
        }
      }
      renderNeeds();
      evaluateMood(now);
      if (!state.busy) renderActor();

      state.fxTimer -= dt;
      if (state.fxTimer <= 0) {
        state.fxTimer = state.playing ? 0.45 : 0.9;
        if (state.mood === "sick" || state.needs.health < 35) {
          fx("float", "🤒", { x: 48 + Math.random() * 10, y: 32, dx: (Math.random() - 0.5) * 40 });
          if (!state.sleeping && Math.random() < 0.12) {
            const request = isMachine() ? "Estou passando mal. Me leve a um mecânico!" : "Estou passando mal. Me leve a um veterinário!";
            say(request, 3500);
            window.PixelAudio?.words(request);
          }
        }
        if (state.mood === "sad") {
          fx("tear", "💧", { x: 40, y: 45, dx: -10 });
          fx("tear", "💧", { x: 58, y: 45, dx: 10 });
          if (Math.random() < 0.14) say(pick(["Buááá…", "Estou triste…", "Me ajuda?", "Preciso de você…"]), 1800);
        }
        if (state.mood === "mad") {
          fx("float", "💨", { x: 30, y: 40, dx: -40 });
          fx("float", "💢", { x: 65, y: 35, dx: 20 });
          if (Math.random() < 0.05) say(pick(["Preciso de um abraço…", "Vamos cuidar de mim?", "Fica um pouquinho comigo? 💗"]), 1800);
        }
        if (state.mood === "sleep") fx("zzz", "Z", { x: 58, y: 45, font: `${1.4 + Math.random()}rem` });
        if (state.playing && Math.random() < 0.5) {
          fx("float", pick(["✨", "💫", toyEmoji()]), { x: 30 + Math.random() * 40, y: 50 + Math.random() * 20, dx: (Math.random() - 0.5) * 60 });
        }
        if (state.mood === "happy" && !state.playing && Math.random() < 0.25) {
          fx("float", "💗", { x: 40 + Math.random() * 20, y: 35, dx: (Math.random() - 0.5) * 50 });
        }
        if (el.actor.classList.contains("power-lightning")) {
          fx("float", pick(["⚡", "✨", "💙"]), { x: 30 + Math.random() * 40, y: 25 + Math.random() * 45, dx: (Math.random() - 0.5) * 70 });
        }
        if (el.actor.classList.contains("power-beauty")) {
          fx("float", pick(["💖", "✨", "🌸", "👑"]), { x: 30 + Math.random() * 40, y: 25 + Math.random() * 45, dx: (Math.random() - 0.5) * 60 });
        }
        if (el.actor.classList.contains("unicorn-flying") && Math.random() < 0.65) {
          fx("float", pick(["🌈", "✨", "⭐"]), { x: 32 + Math.random() * 36, y: 35 + Math.random() * 35, dx: (Math.random() - 0.5) * 65 });
        }
      }
    }

    drawFx();
    requestAnimationFrame(tick);
  }

  // ---------- Input ----------
  const actions = { 1: () => care("wake"), 2: () => care("feed"), 3: () => care("drink"), 4: () => care("bath"), 5: () => care("pet"), 6: () => care("sleep") };
  function press(key) {
    const b = buttons[key];
    if (!b || b.disabled) return;
    b.classList.add("pressed");
    if (key === "1" && state.phase === "egg") return setRub(true);
    return actions[key]?.();
  }
  function release(key) {
    buttons[key]?.classList.remove("pressed");
    if (key === "1") setRub(false);
  }
  function setRub(on) {
    if (state.phase !== "egg") return;
    if (!state.audience) return;
    if (on && !state.rubbing) metric("egg_attempt");
    state.rubbing = on;
    el.actor.classList.toggle("rubbing", on);
  }

  addEventListener("keydown", (e) => {
    if (state.naming || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
    if (e.repeat) return;
    if (/^[1-6]$/.test(e.key)) press(e.key);
    if (e.key === "0") {
      if (state.phase === "pet" && !state.preview) {
        archiveAndNewEgg();
        return;
      }
      try {
        localStorage.removeItem(profileKey("bichinho-hatch-bag"));
        localStorage.removeItem(profileKey("bichinho-audience"));
        localStorage.setItem(profileKey("bichinho-force-new-egg"), "1");
      } catch (_) {}
      state.skipAutosave = true;
      try { sessionStorage.setItem("pixels-enter-profile", window.pixelsPlayer.id); } catch (_) {}
      location.href = "./?new=1";
      return;
    }
    if ((e.key === "h" || e.key === "H") && state.phase === "pet") care("heal");
    if ((e.key === "p" || e.key === "P") && state.phase === "pet") care("play");
    if ((e.key === "c" || e.key === "C") && state.phase === "pet") openCloset();
    if ((e.key === "v" || e.key === "V") && state.phase === "pet") openCollection();
    if (e.key === "9" && state.phase === "pet") { state.lastGrowth = performance.now(); grow(); }
    if (e.key === "8" && state.phase === "pet") { const s = skitForStage(); if (s) skit(s); }
    if (e.key === "7" && state.phase === "pet") { Object.assign(state.needs, { hunger: 15, thirst: 30, love: 25, health: 25 }); }
  });
  addEventListener("keyup", (e) => { if (/^[1-6]$/.test(e.key)) release(e.key); });
  Object.entries(buttons).forEach(([k, b]) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); press(k); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => release(k)));
  });
  el.btnHeal?.addEventListener("click", () => care("heal"));
  el.btnPlay?.addEventListener("click", () => care("play"));
  el.btnCloset?.addEventListener("click", () => openCloset());
  el.btnContest?.addEventListener("click", () => openContest());
  el.btnHospital?.addEventListener("click", () => openHospital());
  el.btnAlbum?.addEventListener("click", () => openAlbum());
  el.btnCollection?.addEventListener("click", () => openCollection());
  el.closetClose?.addEventListener("click", closeCloset);
  el.contestClose?.addEventListener("click", closeContest);
  el.hospitalClose?.addEventListener("click", closeHospital);
  el.albumClose?.addEventListener("click", closeAlbum);
  el.collectionClose?.addEventListener("click", closeCollection);
  el.btnNewEgg?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    archiveAndNewEgg();
  });
  el.btnNewPixel?.addEventListener("click", () => archiveAndNewEgg());

  // Arrastar brinquedo no stage
  let toyDrag = false;
  const moveToyFromEvent = (e) => {
    if (!state.playing || !el.stage) return;
    const r = el.stage.getBoundingClientRect();
    placeToy(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    sparkleAt(e.clientX, e.clientY, [toyEmoji(), "✨"]);
  };
  el.toy?.addEventListener("pointerdown", (e) => {
    if (!state.playing) return;
    toyDrag = true;
    el.toy.setPointerCapture(e.pointerId);
    e.stopPropagation();
    moveToyFromEvent(e);
  });
  el.toy?.addEventListener("pointermove", (e) => { if (toyDrag) moveToyFromEvent(e); });
  ["pointerup", "pointercancel"].forEach((ev) => el.toy?.addEventListener(ev, () => { toyDrag = false; }));
  el.stage?.addEventListener("pointerdown", (e) => {
    if (!state.playing || e.target.closest(".actor") || e.target.closest(".toy") || e.target.closest(".side-care")) return;
    moveToyFromEvent(e);
  });

  let dragging = false, lastPt = null, petAccum = 0;
  el.actor.addEventListener("pointerdown", (e) => {
    dragging = true; lastPt = [e.clientX, e.clientY]; el.actor.setPointerCapture(e.pointerId); setRub(true);
    if (state.phase === "pet" && !state.sleeping) {
      const now = performance.now();
      state.tapBurst = now - state.lastTapAt < 420 ? state.tapBurst + 1 : 1;
      state.lastTapAt = now;
      if (state.tapBurst >= 3) {
        state.tapBurst = 0;
        rain(["💖", "✨", "😂"], 8);
        say(pick(["Cócegas!", "Hihihihi!", "Para! Hihi!"]), 1600);
        playMove("wobble", 800);
        state.needs.love = clamp(state.needs.love + 5, 0, 100);
      }
    }
  });
  el.actor.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const d = Math.hypot(e.clientX - lastPt[0], e.clientY - lastPt[1]);
    lastPt = [e.clientX, e.clientY];
    if (state.phase === "egg") state.temp = clamp(state.temp + Math.min(d, 30) * 0.06, 10, 100);
    else if (state.phase === "pet") { petAccum += d; if (petAccum > 260) { petAccum = 0; care("pet"); } }
  });
  ["pointerup", "pointercancel"].forEach((ev) => el.actor.addEventListener(ev, () => { dragging = false; setRub(false); }));
  el.wish.addEventListener("click", () => {
    const wantedSide = el.btnHeal?.classList.contains("wanted") ? "H" : el.btnPlay?.classList.contains("wanted") ? "P" : null;
    if (wantedSide === "H") return care("heal");
    if (wantedSide === "P") return care("play");
    const k = [...Object.entries(buttons)].find(([, b]) => b.classList.contains("wanted"))?.[0];
    if (k) press(k), release(k);
  });
  addEventListener("resize", resizeFx);
  addEventListener("pagehide", () => {
    if (state.skipAutosave) return;
    saveActivePet();
  });
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !state.skipAutosave) saveActivePet();
  });

  // ---------- Preview (?species=dino&stage=1&pose=plead&period=day) ----------
  function applyPreview() {
    const q = new URLSearchParams(location.search);
    // Só gameplay (?new= / ?audience=) — não tratar como preview de pet
    const keys = [...q.keys()];
    if (!keys.length) return;
    if (keys.every((k) => k === "new" || k === "audience")) return;

    const sp = SPECIES.find((s) => s.id === q.get("species"));
    if (q.get("hatch") != null) {
      state.forceSpecies = sp || null;
      state.chosenEgg = !!sp;
      // Demo: nasce na hora o pixel pedido (sem esfregar o ovo)
      if (sp) {
        setTimeout(() => {
          if (state.phase === "egg") hatch(sp);
        }, 400);
      }
      return;
    }
    // Ovo escolhido jogável: começa opaco; no calor ideal a casca revela o PIXEL
    if (q.get("chosen") != null && sp) {
      state.forceSpecies = sp;
      state.chosenEgg = true;
      state.temp = 22;
      state.idealMs = 0;
      state.eggCrack = 0;
      renderChosenEggHeader(sp);
      renderActor();
      renderEgg();
      return;
    }
    state.preview = { period: q.get("period") || "day" };
    // Snapshot estático do peek (?species=axolotl&egg=57)
    if (q.get("egg") != null || (sp && q.get("stage") == null && q.get("pose") == null && q.get("mood") == null)) {
      if (sp) {
        state.forceSpecies = sp;
        state.chosenEgg = true;
      }
      state.temp = q.get("egg") != null ? (Number(q.get("egg")) || 57) : 55;
      state.idealMs = q.get("egg") != null ? Math.max(2600, Number(q.get("push")) || 2600) : 2600;
      if (q.get("push") != null) state.idealMs = Math.max(state.idealMs, DEMO.hatchSeconds * 1000 * 0.6);
      if (sp) renderChosenEggHeader(sp);
      renderActor();
      renderEgg();
      return;
    }
    Object.assign(state, { phase: "pet", species: sp || SPECIES[0], stage: clamp(Number(q.get("stage")) || 1, 1, 4) });
    applyVariant(state.species, pickVariant(state.species));
    state.name = q.get("name") || pick((state.variant && state.species.variants?.[state.variant]?.names) || state.species.names);
    state.nameChosen = true;
    state.pronoun = q.get("pronoun") === "ela" ? "ela" : q.get("pronoun") === "ele" ? "ele" : state.species.he;
    const rolled = rollStrongTraits(state.species);
    if (q.get("trait")) {
      const keysT = q.get("trait").split(",").filter((k) => TRAIT_LINES[k] || TRAIT_LINES_MACHINE[k]);
      if (keysT.length) {
        rolled.strongTraits = keysT;
        rolled.boosts = { hunger: 1, thirst: 1, hygiene: 1, love: 1, energy: 1 };
        keysT.forEach((k) => { rolled.boosts[k] = 2; });
      }
    }
    state.boosts = rolled.boosts;
    state.strongTraits = rolled.strongTraits;
    state.growthIntervalMs = speciesGrowthMs(state.species);
    state.lackMs = 0;
    el.app.dataset.phase = "pet";
    enablePetUI();
    el.btn1Icon.textContent = "☀️";
    el.btn1Text.textContent = "Acordar";
    Object.assign(state.needs, { hunger: Number(q.get("hunger") ?? 70), thirst: 62, hygiene: 80, love: 70, energy: 64, health: Number(q.get("health") ?? 100) });
    state.pose = q.get("pose");
    if (q.get("outfit")) {
      const outfit = emptyOutfit();
      q.get("outfit").split(",").slice(0,3).forEach(id => {
        const item = CLOSET_ITEMS.find(i => i.id === id);
        if (item?.slot && window.PixelsWardrobe.compatible(state.species.id, item)) outfit[item.slot] = id;
      });
      state.outfit = outfit;
    }
    if (state.pose === "drink") state.careFrame = q.get("frame") === "sip" ? "sip" : "lap";
    if (state.pose === "sleep") { state.sleeping = true; state.pose = null; }
    state.petId = state.petId || `preview-${Date.now()}`;
    if (q.get("photo") === "1" && state.species.id === "kitty") {
      state.outfit = { ...emptyOutfit(), face: "face_glasses_ocean", hat: "hat_bow_pink", held: "bag_lavender_3d" };
      Object.keys(state.needs).forEach(key => { state.needs[key] = 100; });
      state.sleeping = false;
      state.pose = null;
    }
    renderActor(); renderHeader(); renderNeeds(); renderGrowth(0.35);
    setMood(q.get("mood") || "neutral");
    if (q.get("photo") === "1" && q.get("scene") === "veranda" && state.species.id === "kitty") {
      el.app.classList.add("photo-veranda");
      const portrait = document.createElement("img");
      portrait.className = "veranda-portrait";
      portrait.src = "assets/pets/lili-dressed-photo.png";
      portrait.alt = "Lili feliz na varanda, com vestido lilás, laço, óculos, sapatinhos e bolsinha.";
      el.stage.appendChild(portrait);
    }
    if (q.get("say")) say(q.get("say"), 1e9);
  }

  // ---------- Audience pick ----------
  const elAudience = document.getElementById("audiencePick");
  function hideAudiencePick() {
    if (elAudience) elAudience.hidden = true;
  }
  function showAudiencePick() {
    if (elAudience) elAudience.hidden = false;
  }
  function beginGameWithAudience(audience) {
    setAudience(audience, { resetBag: true });
    hideAudiencePick();
    say(audience === "girl" ? "Um PIXEL especial pra menina! 💕" : audience === "boy" ? "Um PIXEL especial pra menino! 🚀" : "Qualquer PIXEL pode nascer! ✨", 2600);
  }
  elAudience?.querySelectorAll("[data-audience]").forEach((btn) => {
    btn.addEventListener("click", () => beginGameWithAudience(btn.dataset.audience));
  });

  resizeFx();
  ["egg", "egg_crack1", "egg_crack2", "egg_crack3", "egg_broken", "egg_gotinha"].forEach((n) => {
    const i = new Image();
    i.src = `${ART}${n}.webp`;
  });
  applyPreview();

  const qBoot = new URLSearchParams(location.search);
  const forcedAud = qBoot.get("audience");
  if (forcedAud === "boy" || forcedAud === "girl" || forcedAud === "both") {
    setAudience(forcedAud, { resetBag: false });
  } else {
    state.audience = loadAudience();
  }
  let forceNew = qBoot.get("new") != null;
  try {
    if (localStorage.getItem(profileKey("bichinho-force-new-egg")) === "1") {
      forceNew = true;
      localStorage.removeItem(profileKey("bichinho-force-new-egg"));
    }
  } catch (_) { /* ignore */ }
  // Consume the request once; later visits resume the saved PIXEL, not another egg.
  if (qBoot.has("new")) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("new");
    history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }
  if (forceNew) {
    // Garante ovo fresco para esfregar (nunca retoma PIXEL pausado)
    Object.assign(state, {
      phase: "egg", stage: 0, species: null, name: "",
      temp: 28, idealMs: 0, eggCrack: 0, pose: null,
      forceSpecies: null, chosenEgg: false, petId: null,
      sleeping: false, playing: false, busy: false, preview: null,
    });
    el.app.dataset.phase = "egg";
    if (el.sideCare) el.sideCare.hidden = true;
    if (el.btn1Icon) el.btn1Icon.textContent = "🤚";
    if (el.btn1Text) el.btn1Text.textContent = "Esfregar";
  }
  // Preview/hatch direto pula a pergunta
  if (state.preview || qBoot.get("hatch") != null || qBoot.get("species")) {
    if (!state.audience) state.audience = "both";
    hideAudiencePick();
  } else if (!forceNew && tryResumeSavedPet()) {
    hideAudiencePick();
  } else if (!state.audience) {
    showAudiencePick();
  } else {
    hideAudiencePick();
  }
  renderActor();
  if (state.phase === "egg" || state.phase === "hatching") renderEgg();
  if (!state.preview) renderGrowth();
  syncBiome();
  // Filtra bag salva pelo público atual
  state.hatchBag = (state.hatchBag || []).filter((id) => readySpecies().some((s) => s.id === id));

  if (state.phase === "pet" && !state.preview) {
    /* retomado — já falou oi */
  } else if (!state.preview && state.forceSpecies) {
    say("Tem uma surpresa aqui dentro! Aqueça o ovinho… 🥚", 3200);
  } else if (!state.preview && state.audience) say("Tem um ovinho aqui! 🥚", 3000);
  else if (!state.preview && !state.audience) say("Escolhe pra quem é o PIXEL! ✨", 4000);
  try { await el.actorImg.decode(); } catch (_) { /* The normal image error state remains visible. */ }
  el.app.removeAttribute("data-loading");
  requestAnimationFrame(tick);
})();
