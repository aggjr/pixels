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
  const SPECIES = [
    {
      id: "unicorn", audience: "girl", ready: true, name: "Unicórnio", he: "ela", names: ["Luna"],
      food: "🍓", foodName: "morango", glow: "rgba(230,180,255,.6)",
      stages: { 1: "newborn", 2: "baby", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "mad", "sad", "scratch", "sleepy"], skit: "wobble", adultSkit: "rear",
      sleepStages: ["child", "adult"],
      focus: ["love", "energy"],
      profile: { hunger: 0.9, thirst: 0.9, hygiene: 0.75, love: 1.2, energy: 1.05, growthMs: 80_000 },
    },
    {
      id: "dino", audience: "both", ready: true, name: "Dinossauro", he: "ele", names: ["Freely"],
      food: "🍉", foodName: "melancia", glow: "rgba(170,255,190,.55)",
      stages: { 1: "newborn", 2: "baby", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"], skit: "fly", childSkit: "fly",
      sleepStages: ["child", "adult"],
      focus: ["hunger", "thirst"],
      profile: { hunger: 1.15, thirst: 1.05, hygiene: 1.0, love: 0.95, energy: 1.0, growthMs: 70_000 },
    },
    {
      id: "kitty", audience: "both", ready: true, name: "Gatinho", he: "ele", names: ["Flofy"],
      food: "🐟", foodName: "peixinho", glow: "rgba(255,190,120,.6)",
      stages: { 1: "newborn", 2: "baby", 3: "child", 4: "child" },
      poses: ["plead", "eat", "sleep", "fall", "bed", "mad", "sad", "scratch", "sleepy"], skit: "bed",
      sleepStages: ["child"],
      focus: ["love", "energy"],
      profile: { hunger: 0.95, thirst: 0.9, hygiene: 0.85, love: 1.15, energy: 1.1, growthMs: 75_000 },
    },
    {
      id: "duck", audience: "both", ready: true, name: "Patinho", he: "ele", names: ["Tobi"],
      food: "🌽", foodName: "milhinho", glow: "rgba(255,230,100,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"], skit: "fly", childSkit: "fly",
      sleepStages: ["child", "adult"],
      focus: ["thirst", "hygiene"],
      profile: { hunger: 1.0, thirst: 1.15, hygiene: 1.1, love: 1.0, energy: 0.95, growthMs: 72_000 },
    },
    {
      id: "pig", audience: "both", ready: true, name: "Porquinho", he: "ele", names: ["Pigma"],
      food: "🍎", foodName: "maçã", glow: "rgba(255,190,170,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "mud", "mad", "sad", "scratch", "sleepy"], skit: "mud",
      sleepStages: ["child", "adult"],
      focus: ["hygiene", "hunger"],
      profile: { hunger: 1.1, thirst: 1.0, hygiene: 1.2, love: 1.0, energy: 0.9, growthMs: 74_000 },
    },
    {
      id: "mole", audience: "both", ready: true, name: "Toupeira", he: "ela", names: ["Toty"],
      food: "🍄", foodName: "cogumelinho", glow: "rgba(210,170,120,.6)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "dig", "mad", "sad", "scratch", "sleepy"], skit: "dig",
      sleepStages: ["child", "adult"],
      focus: ["hygiene", "love"],
      profile: { hunger: 1.05, thirst: 1.0, hygiene: 1.15, love: 1.05, energy: 1.0, growthMs: 76_000 },
    },
    {
      id: "bat", audience: "both", ready: true, name: "Morceguinho", he: "ele", names: ["Smytyi"],
      food: "🫐", foodName: "mirtilinho", glow: "rgba(160,140,220,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"],
      skit: "fly", childSkit: "fly", adultSkit: "fly",
      sleepStages: ["child", "adult"],
      focus: ["energy", "love"],
      profile: { hunger: 1.05, thirst: 1.0, hygiene: 0.95, love: 1.15, energy: 1.2, growthMs: 76_000 },
    },
    {
      id: "seal", audience: "girl", ready: true, name: "Foquinha", he: "ela", names: ["Flokinha"],
      food: "🐟", foodName: "peixinho", glow: "rgba(180,220,255,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "splash", "mad", "sad", "scratch", "sleepy"],
      skit: "splash", childSkit: "splash", adultSkit: "splash",
      sleepStages: ["child", "adult"],
      focus: ["love", "hygiene"],
      profile: { hunger: 1.1, thirst: 1.05, hygiene: 1.1, love: 1.2, energy: 0.95, growthMs: 74_000 },
    },
    {
      id: "monkey", audience: "both", ready: true, name: "Macaquinho", he: "ele", names: ["Rabi"],
      food: "🍌", foodName: "bananinha", glow: "rgba(255,180,100,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "swing", "mad", "sad", "scratch", "sleepy"],
      skit: "swing", childSkit: "swing", adultSkit: "swing",
      focus: ["hunger", "energy"],
      profile: { hunger: 1.15, thirst: 1.05, hygiene: 1.1, love: 1.05, energy: 1.15, growthMs: 74_000 },
    },
    {
      id: "axolotl", audience: "both", ready: true, name: "Axolote", he: "ela", names: ["Gotinha"],
      food: "🦐", foodName: "camarãozinho", glow: "rgba(120,220,210,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "swim", "mad", "sad", "scratch", "sleepy"],
      skit: "swim", childSkit: "swim", adultSkit: "swim",
      focus: ["thirst", "love"],
      profile: { hunger: 1.05, thirst: 1.2, hygiene: 0.9, love: 1.15, energy: 1.0, growthMs: 76_000 },
    },
    {
      id: "bee", audience: "both", ready: true, name: "Abelhinha", he: "ela", names: ["Biz"],
      food: "🍯", foodName: "melzinho", glow: "rgba(255,210,80,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"],
      skit: "fly", childSkit: "fly", adultSkit: "fly",
      focus: ["energy", "hunger"],
      profile: { hunger: 1.1, thirst: 1.05, hygiene: 0.95, love: 1.0, energy: 1.25, growthMs: 70_000 },
    },
    {
      id: "butterfly", audience: "girl", ready: true, name: "Joaninha", he: "ela", names: ["Ciça"],
      food: "🍃", foodName: "folhinha", glow: "rgba(255,90,90,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"],
      skit: "fly", childSkit: "fly", adultSkit: "fly",
      focus: ["love", "energy"],
      profile: { hunger: 0.95, thirst: 1.0, hygiene: 0.85, love: 1.15, energy: 1.1, growthMs: 78_000 },
    },
    {
      id: "nini", audience: "girl", ready: true, name: "Borboletinha", he: "ela", names: ["Nini"],
      food: "🌺", foodName: "florzinha", glow: "rgba(255,180,100,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "fly", "mad", "sad", "scratch", "sleepy"],
      skit: "zip", childSkit: "zip", adultSkit: "zip",
      focus: ["energy", "love"],
      profile: { hunger: 1.05, thirst: 1.0, hygiene: 0.9, love: 1.1, energy: 1.35, growthMs: 68_000 },
    },
    {
      id: "floide", audience: "both", ready: true, name: "Gatinho", he: "ele", names: ["Floide"],
      food: "🐟", foodName: "peixinho", glow: "rgba(255,200,150,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "yarn", "mad", "sad", "scratch", "sleepy"],
      skit: "yarn", childSkit: "yarn", adultSkit: "yarn",
      focus: ["love", "energy"],
      profile: { hunger: 1.05, thirst: 0.95, hygiene: 1.05, love: 1.1, energy: 1.25, growthMs: 72_000 },
    },
    {
      id: "tini", audience: "both", ready: true, name: "Cachorrinha", he: "ela", names: ["Tini"],
      food: "🦴", foodName: "ossinho", glow: "rgba(255,210,140,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "hide", "mad", "sad", "scratch", "sleepy"],
      skit: "hide", childSkit: "hide", adultSkit: "hide",
      focus: ["love", "hygiene"],
      profile: { hunger: 1.0, thirst: 1.0, hygiene: 1.05, love: 1.25, energy: 0.95, growthMs: 76_000 },
    },
    {
      id: "elephant", audience: "both", ready: true, name: "Elefantinha", he: "ela", names: ["Eli"],
      food: "🍉", foodName: "melancia", glow: "rgba(180,180,190,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "stomp", "mad", "sad", "scratch", "sleepy"],
      skit: "stomp", childSkit: "stomp", adultSkit: "stomp",
      focus: ["hunger", "energy"],
      profile: { hunger: 1.25, thirst: 1.15, hygiene: 1.1, love: 1.05, energy: 1.1, growthMs: 82_000 },
    },
    {
      id: "lion", audience: "boy", ready: true, name: "Leãozinho", he: "ele", names: ["Tyton"],
      food: "🥩", foodName: "carnezinha", glow: "rgba(255,160,80,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "roar", "mad", "sad", "scratch", "sleepy", "happy"],
      skit: "roar", childSkit: "roar", adultSkit: "roar",
      focus: ["love", "hunger", "energy"],
      // Bravo: carinho/comida caem rápido — precisa de MUITO cuidado pra sorrir
      profile: { hunger: 1.45, thirst: 1.25, hygiene: 1.15, love: 2.15, energy: 1.4, growthMs: 78_000 },
      temperament: "grumpy",
    },
    {
      id: "racer", audience: "boy", ready: true, name: "Carrinho", he: "ele", names: ["Turbo"],
      food: "🔧", foodName: "peçinhas", glow: "rgba(255,120,100,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "turbo", "mad", "sad", "scratch", "sleepy"], skit: "turbo", childSkit: "turbo", adultSkit: "turbo",
      sleepStages: ["child", "adult"],
      focus: ["hunger", "thirst"],
      profile: { hunger: 1.2, thirst: 1.25, hygiene: 1.1, love: 1.0, energy: 1.05, growthMs: 78_000 },
    },
    {
      id: "botcar", audience: "boy", ready: true, name: "Transformers", he: "ele", names: ["Bolt"],
      food: "🔩", foodName: "parafusos", glow: "rgba(120,180,255,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "car", "mad", "sad", "scratch", "sleepy"], skit: "transform", childSkit: "transform", adultSkit: "transform",
      sleepStages: ["child", "adult"],
      focus: ["hunger", "energy"],
      profile: { hunger: 1.15, thirst: 1.2, hygiene: 0.85, love: 0.95, energy: 1.15, growthMs: 82_000 },
    },
    {
      id: "rocket", audience: "boy", ready: true, name: "Foguete", he: "ele", names: ["Foguinho"],
      food: "🔧", foodName: "peçinhas", glow: "rgba(255,140,100,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "launch", "mad", "sad", "scratch", "sleepy"], skit: "launch", childSkit: "launch", adultSkit: "launch",
      sleepStages: ["adult"],
      focus: ["hunger", "energy"],
      profile: { hunger: 1.15, thirst: 1.2, hygiene: 0.9, love: 1.0, energy: 1.2, growthMs: 80_000 },
    },
    {
      id: "heli", audience: "boy", ready: true, name: "Helicóptero", he: "ele", names: ["Hélio"],
      food: "🔩", foodName: "parafusos", glow: "rgba(100,180,255,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "hover", "mad", "sad", "scratch", "sleepy"], skit: "hover", childSkit: "hover", adultSkit: "hover",
      sleepStages: ["adult"],
      focus: ["thirst", "energy"],
      profile: { hunger: 1.1, thirst: 1.2, hygiene: 1.0, love: 1.0, energy: 1.15, growthMs: 78_000 },
    },
    {
      id: "train", audience: "boy", ready: true, name: "Trem", he: "ele", names: ["Chuflinho"],
      food: "🔧", foodName: "peçinhas", glow: "rgba(255,100,100,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "chug", "mad", "sad", "scratch", "sleepy"], skit: "chug", childSkit: "chug", adultSkit: "chug",
      sleepStages: ["adult"],
      focus: ["hunger", "thirst"],
      profile: { hunger: 1.2, thirst: 1.15, hygiene: 1.05, love: 0.95, energy: 1.1, growthMs: 82_000 },
    },
    {
      id: "tractor", audience: "boy", ready: true, name: "Trator", he: "ele", names: ["Toto"],
      food: "🔩", foodName: "parafusos", glow: "rgba(255,180,80,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "plough", "mad", "sad", "scratch", "sleepy"], skit: "plough", childSkit: "plough", adultSkit: "plough",
      sleepStages: ["adult"],
      focus: ["hygiene", "hunger"],
      profile: { hunger: 1.15, thirst: 1.15, hygiene: 1.25, love: 1.0, energy: 1.05, growthMs: 80_000 },
    },
    {
      id: "boat", audience: "boy", ready: true, name: "Barco", he: "ele", names: ["Marinho"],
      food: "🔧", foodName: "peçinhas", glow: "rgba(80,200,200,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "sail", "mad", "sad", "scratch", "sleepy"], skit: "sail", childSkit: "sail", adultSkit: "sail",
      sleepStages: ["adult"],
      focus: ["thirst", "hygiene"],
      profile: { hunger: 1.05, thirst: 1.2, hygiene: 1.15, love: 1.05, energy: 1.0, growthMs: 76_000 },
    },
    {
      id: "plane", audience: "boy", ready: true, name: "Avião", he: "ele", names: ["Asinha"],
      food: "🔩", foodName: "parafusos", glow: "rgba(120,190,255,.65)",
      diet: "machine",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "loop", "mad", "sad", "scratch", "sleepy"], skit: "loop", childSkit: "loop", adultSkit: "loop",
      sleepStages: ["adult"],
      focus: ["energy", "hunger"],
      profile: { hunger: 1.1, thirst: 1.15, hygiene: 0.95, love: 1.0, energy: 1.2, growthMs: 78_000 },
    },
    {
      id: "slime", audience: "both", ready: true, name: "Slime", he: "ele", names: ["Goo"],
      food: "🍮", foodName: "geleinha", glow: "rgba(120,200,255,.65)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "bounce", "mad", "sad", "scratch", "sleepy"], skit: "bounce", childSkit: "bounce", adultSkit: "bounce",
      focus: ["hunger", "love"],
      profile: { hunger: 1.2, thirst: 1.1, hygiene: 0.7, love: 1.15, energy: 1.05, growthMs: 74_000 },
      variants: {
        blue: { he: "ele", names: ["Azulito", "Goo"], glow: "rgba(100,180,255,.65)", audience: "boy" },
        green: { he: "ele", names: ["Verde", "Blob"], glow: "rgba(90,210,120,.65)", audience: "boy" },
        pink: { he: "ela", names: ["Rosa", "Melly"], glow: "rgba(255,150,200,.65)", audience: "girl" },
        lilac: { he: "ela", names: ["Lila", "Puff"], glow: "rgba(200,160,255,.65)", audience: "girl" },
      },
    },
    {
      id: "lilica", audience: "girl", ready: true, name: "Coelhinha", he: "ela", names: ["Lilica"],
      food: "🥕", foodName: "cenourinha", glow: "rgba(255,210,230,.6)",
      stages: { 1: "newborn", 2: "newborn", 3: "child", 4: "adult" },
      poses: ["plead", "eat", "sleep", "fall", "hop", "dig", "mad", "sad", "scratch", "sleepy"],
      skit: "hop", childSkit: "dig", adultSkit: "hop",
      focus: ["hunger", "energy"],
      profile: { hunger: 1.2, thirst: 1.0, hygiene: 1.15, love: 1.1, energy: 1.3, growthMs: 70_000 },
    },
    {
      id: "robot", audience: "boy", name: "Robôzinho", he: "ele", names: ["Bip", "Chip"],
      food: "🔋", foodName: "bateria", glow: "rgba(120,240,255,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "adult" }, poses: [],
      focus: ["hunger", "energy"],
      profile: { hunger: 1.2, thirst: 0.5, hygiene: 0.4, love: 0.9, energy: 1.15, growthMs: 78_000 },
    },
    {
      id: "hamster", audience: "both", name: "Hamster", he: "ele", names: ["Bolinha", "Paçoca"],
      food: "🌻", foodName: "semente", glow: "rgba(255,210,140,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "adult" }, poses: [],
      focus: ["hunger", "energy"],
      profile: { hunger: 1.2, thirst: 1.05, hygiene: 1.0, love: 1.05, energy: 1.1, growthMs: 68_000 },
    },
    {
      id: "panda", audience: "both", name: "Panda", he: "ele", names: ["Mochi", "Bambu"],
      food: "🎋", foodName: "bambu", glow: "rgba(255,255,255,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "child" }, poses: [],
      focus: ["hunger", "energy"],
      profile: { hunger: 1.2, thirst: 1.0, hygiene: 0.9, love: 1.0, energy: 1.1, growthMs: 90_000 },
    },
    {
      id: "puppy", audience: "both", name: "Cachorrinho", he: "ele", names: ["Mel", "Toby"],
      food: "🦴", foodName: "ossinho", glow: "rgba(255,210,150,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "child" }, poses: [],
      focus: ["love", "energy"],
      profile: { hunger: 1.05, thirst: 1.05, hygiene: 1.05, love: 1.2, energy: 1.1, growthMs: 72_000 },
    },
    {
      id: "dragon", audience: "boy", name: "Dragãozinho", he: "ele", names: ["Faísca", "Draco"],
      food: "🌶️", foodName: "pimentinha", glow: "rgba(255,150,120,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "child" }, poses: [],
      focus: ["hunger", "thirst"],
      profile: { hunger: 1.25, thirst: 1.2, hygiene: 1.0, love: 1.0, energy: 1.05, growthMs: 85_000 },
    },
    {
      id: "fox", audience: "girl", name: "Raposinha", he: "ela", names: ["Canela", "Floco"],
      food: "🫐", foodName: "frutinha", glow: "rgba(255,170,90,.6)",
      stages: { 1: "baby", 2: "baby", 3: "child", 4: "child" }, poses: [],
      focus: ["energy", "hunger"],
      profile: { hunger: 1.05, thirst: 1.0, hygiene: 0.95, love: 0.9, energy: 1.15, growthMs: 74_000 },
    },
  ];

  const BASE_RATES = {
    hunger: 0.38 / PACE,
    thirst: 0.42 / PACE,
    hygiene: 0.18 / PACE,
    love: 0.3 / PACE,
    energy: 0.24 / PACE,
    health: 0.08 / PACE,
  };
  // Energia sobe ao dormir (valor negativo em decayRates); +35% vs base 5
  const SLEEP_ENERGY_GAIN = 6.75 / PACE;

  // Armário: brinquedos + roupas + fantasias (overlays emoji; tudo liberado)
  const CLOSET_ITEMS = [
    { id: "studio_glasses", tab: "studio", slot: "face", emoji: "🕶️", name: "Óculos oceano", art: "assets/accessories/kitty-glasses.png", species: "kitty" },
    { id: "studio_bow", tab: "studio", slot: "hat", emoji: "🎀", name: "Laço estrelinha", art: "assets/accessories/kitty-bow.png", species: "kitty" },
    { id: "studio_bag", tab: "studio", slot: "held", emoji: "👜", name: "Bolsa lavanda", art: "assets/accessories/kitty-bag.png", species: "kitty" },
    { id: "toy_ball", tab: "toys", emoji: "🎾", name: "Bolinha" },
    { id: "toy_yarn", tab: "toys", emoji: "🧶", name: "Novelo" },
    { id: "toy_bone", tab: "toys", emoji: "🦴", name: "Ossinho" },
    { id: "toy_carrot", tab: "toys", emoji: "🥕", name: "Cenoura" },
    { id: "toy_star", tab: "toys", emoji: "⭐", name: "Estrelinha" },
    { id: "toy_balloon", tab: "toys", emoji: "🎈", name: "Balão" },
    { id: "toy_frisbee", tab: "toys", emoji: "🥏", name: "Disco" },
    { id: "toy_robot", tab: "toys", emoji: "🤖", name: "Robôzinho" },
    { id: "toy_rocket", tab: "toys", emoji: "🚀", name: "Foguetinho" },
    { id: "toy_fish", tab: "toys", emoji: "🐟", name: "Peixinho" },
    { id: "toy_pudding", tab: "toys", emoji: "🍮", name: "Pudim" },
    { id: "toy_flag", tab: "toys", emoji: "🏁", name: "Bandeirinha" },
    { id: "hat_crown", tab: "clothes", slot: "hat", emoji: "👑", name: "Coroa" },
    { id: "hat_party", tab: "clothes", slot: "hat", emoji: "🥳", name: "Chapéu festa" },
    { id: "hat_wizard", tab: "clothes", slot: "hat", emoji: "🧙", name: "Chapéu mago" },
    { id: "hat_cap", tab: "clothes", slot: "hat", emoji: "🧢", name: "Boné" },
    { id: "hat_flower", tab: "clothes", slot: "hat", emoji: "🌸", name: "Florzinha" },
    { id: "neck_bow", tab: "clothes", slot: "neck", emoji: "🎀", name: "Laço" },
    { id: "neck_tie", tab: "clothes", slot: "neck", emoji: "👔", name: "Gravata" },
    { id: "neck_scarf", tab: "clothes", slot: "neck", emoji: "🧣", name: "Cachecol" },
    { id: "neck_medal", tab: "clothes", slot: "neck", emoji: "🏅", name: "Medalhinha" },
    { id: "body_cape", tab: "clothes", slot: "body", emoji: "🦸", name: "Capa herói" },
    { id: "body_dress", tab: "clothes", slot: "body", emoji: "👗", name: "Vestidinho" },
    { id: "body_shirt", tab: "clothes", slot: "body", emoji: "👕", name: "Camisetinha" },
    { id: "held_wand", tab: "clothes", slot: "held", emoji: "🪄", name: "Varinha" },
    { id: "held_flower", tab: "clothes", slot: "held", emoji: "🌷", name: "Flor" },
    { id: "held_mic", tab: "clothes", slot: "held", emoji: "🎤", name: "Microfone" },
    { id: "face_sunglasses", tab: "costumes", slot: "face", emoji: "🕶️", name: "Óculos escuro" },
    { id: "face_glasses", tab: "costumes", slot: "face", emoji: "👓", name: "Óculos" },
    { id: "face_mustache", tab: "costumes", slot: "face", emoji: "🥸", name: "Disfarce" },
    { id: "face_mask", tab: "costumes", slot: "face", emoji: "🎭", name: "Máscara" },
    { id: "face_heart", tab: "costumes", slot: "face", emoji: "🥰", name: "Coraçõezinhos" },
    { id: "hat_unicorn", tab: "costumes", slot: "hat", emoji: "🦄", name: "Tiara unicórnio" },
    { id: "hat_halo", tab: "costumes", slot: "hat", emoji: "😇", name: "Aureolinha" },
    { id: "hat_devil", tab: "costumes", slot: "hat", emoji: "😈", name: "Chifrinhos" },
    { id: "body_ghost", tab: "costumes", slot: "body", emoji: "👻", name: "Fantasma" },
    { id: "body_rainbow", tab: "costumes", slot: "body", emoji: "🌈", name: "Arco-íris" },
  ];
  const CLOSET_TABS = [
    { id: "studio", label: "Ateliê do gatinho", species: "kitty" },
    { id: "toys", label: "Brinquedos" },
    { id: "clothes", label: "Roupas" },
    { id: "costumes", label: "Fantasias" },
  ];
  const SAVE_KEY = "bichinho-collection-v1";
  const emptyOutfit = () => ({ hat: null, face: null, neck: null, body: null, held: null });


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
    if (el.toy) el.toy.textContent = emoji;
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
    btnCloset: $("btnCloset"), btnCollection: $("btnCollection"),
    closetPanel: $("closetPanel"), closetGrid: $("closetGrid"), closetTabs: $("closetTabs"), closetClose: $("closetClose"),
    collectionPanel: $("collectionPanel"), collectionGrid: $("collectionGrid"), collectionClose: $("collectionClose"),
    btnNewEgg: $("btnNewEgg"),
    sceneBg: $("sceneBg"),
    wearHat: $("wearHat"), wearFace: $("wearFace"), wearNeck: $("wearNeck"), wearBody: $("wearBody"), wearHeld: $("wearHeld"),
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
    const saved = JSON.parse(localStorage.getItem("bichinho-hatch-bag") || "[]");
    if (Array.isArray(saved)) state.hatchBag = saved;
  } catch (_) { /* ignore */ }

  function setAudience(audience, { resetBag = true } = {}) {
    state.audience = audience;
    try {
      localStorage.setItem("bichinho-audience", audience);
      if (resetBag) {
        localStorage.removeItem("bichinho-hatch-bag");
        state.hatchBag = [];
      }
    } catch (_) { /* ignore */ }
  }

  function loadAudience() {
    try {
      const a = localStorage.getItem("bichinho-audience");
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

  /** Tyton só fica feliz de verdade com tudo bem alto. */
  function lionPamperedEnough() {
    const n = state.needs;
    return n.love >= 88 && n.hunger >= 82 && n.thirst >= 78
      && n.hygiene >= 72 && n.energy >= 70 && n.health >= 75;
  }

  function hasPose(pose) {
    if (!state.species?.poses?.includes(pose)) return false;
    // Poses especiais de máquina / slime / humor do leão valem em qualquer fase
    if (["car", "turbo", "launch", "hover", "chug", "plough", "sail", "loop", "bounce", "splash", "swing", "swim", "zip", "yarn", "hide", "stomp", "roar", "hop", "mad", "sad", "scratch", "sleepy", "happy"].includes(pose)) return true;
    return state.stage === 1;
  }
  function artKey(sp) {
    if (sp?.variants && state.variant) return `${sp.id}_${state.variant}`;
    return sp.id;
  }
  function baseArt(sp, stage) {
    return `${ART}${artKey(sp)}_${sp.stages[stage]}.webp`;
  }
  function sleepArt(sp, stage) {
    const key = sp.stages[stage];
    const ak = artKey(sp);
    const staged = sp.sleepStages || [];
    if (canUsePacifier()) {
      // Bebê / início da criança: arte com chupeta (*_sleep.webp)
      if (sp.poses.includes("sleep")) return `${ART}${ak}_sleep.webp`;
      if (staged.includes(key)) return `${ART}${ak}_${key}_sleep.webp`;
      return null;
    }
    // Sem chupeta: nunca usar *_sleep.webp genérico (quase sempre tem chupeta)
    if (staged.includes("adult")) return `${ART}${ak}_adult_sleep.webp`;
    if (staged.includes("child")) return `${ART}${ak}_child_sleep.webp`;
    if (staged.includes(key) && key !== "newborn") return `${ART}${ak}_${key}_sleep.webp`;
    return null;
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
    // Tyton: cara fechada (mad) até estar MUITO bem cuidado; sorriso só no happy
    if (isLion()) {
      if (state.mood === "happy" && lionPamperedEnough() && has("happy")) return "happy";
      if (state.mood === "sad" && has("sad")) return "sad";
      if (has("mad")) return "mad";
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
    if (el.btnCollection) el.btnCollection.disabled = false;
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
      pronoun: state.pronoun || state.species.he,
      stage: state.stage,
      needs: { ...state.needs },
      sleeping: state.sleeping,
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
      pronoun: snap.pronoun || species.he,
      stage: clamp(snap.stage || 1, 1, 4),
      needs: { hunger: 80, thirst: 80, hygiene: 85, love: 75, energy: 90, health: 100, ...(snap.needs || {}) },
      sleeping: !!snap.sleeping,
      boosts: snap.boosts || { hunger: 1, thirst: 1, hygiene: 1, love: 1, energy: 1, health: 1 },
      strongTraits: snap.strongTraits || [],
      outfit: { ...emptyOutfit(), ...(snap.outfit || {}) },
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
    say(snap.frozen ? `${state.name} acordou do pausado! 💖` : `Oi de novo! Eu sou ${state.name}! 💖`, 2400);
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
      localStorage.setItem("bichinho-hatch-bag", JSON.stringify(state.hatchBag));
    } catch (_) { /* ignore */ }
    return pool.find((s) => s.id === id) || pool[0];
  }
  function archiveAndNewEgg() {
    if (state.preview) return;
    metric("new_egg");
    if (!canStartNewEgg()) {
      say("Ainda não tem PIXELs liberados pra esse público…", 2800);
      return;
    }
    if (state.phase === "pet") {
      saveActivePet({ freeze: true });
    }
    try {
      // Reconstrói a bag (prioriza espécies ainda não usadas)
      state.hatchBag = [];
      localStorage.removeItem("bichinho-hatch-bag");
      localStorage.setItem("bichinho-force-new-egg", "1");
    } catch (_) {}
    state.skipAutosave = true;
    location.href = "./?new=1";
  }

  function renderOutfit() {
    const appearance = document.getElementById("actorAppearance");
    const items = Object.values(state.outfit || {}).map(id => CLOSET_ITEMS.find(i => i.id === id)).filter(Boolean);
    const fitted = items.some(i => i.art && i.species === state.species?.id);
    el.actor.classList.toggle("has-accessories", fitted);
    appearance.style.setProperty("--pet-scale", STAGE_SCALE[state.stage] || 1);
    // Coordinates refer to the original transparent sprite, before object-fit and growth scaling.
    const anchors = state.stage === 1
      ? { face: [.46,.34,.62,17], hat: [.62,.12,.30,15], held: [.77,.73,.29,-8] }
      : state.stage === 2
      ? { face: [.40,.34,.57,12], hat: [.55,.11,.30,12], held: [.69,.71,.28,-8] }
      : { face: [.49,.30,.48,19], hat: [.62,.17,.27,18], held: [.69,.70,.27,-8] };
    const img = el.actorImg;
    const fit = Math.min(img.clientWidth / (img.naturalWidth || 1), img.clientHeight / (img.naturalHeight || 1));
    const w = img.naturalWidth * fit, h = img.naturalHeight * fit;
    const left = (img.clientWidth - w) / 2, top = img.clientHeight - h;
    const coreArt = /kitty_(newborn|baby|child)\.webp(?:$|\?)/.test(img.getAttribute("src") || "");
    const map = { hat: el.wearHat, face: el.wearFace, neck: el.wearNeck, body: el.wearBody, held: el.wearHeld };
    for (const [slot, node] of Object.entries(map)) {
      if (!node) continue;
      const id = state.outfit?.[slot];
      const item = id && CLOSET_ITEMS.find((i) => i.id === id);
      node.hidden = !item || (item.art && (item.species !== state.species?.id || !coreArt));
      node.classList.toggle("wear-art", !!item?.art);
      if (item?.art) {
        if (node.dataset.item !== item.id) {
          const art = document.createElement("img"); art.src = item.art; art.alt = item.name; art.draggable = false;
          node.replaceChildren(art); node.dataset.item = item.id;
        }
        const a = anchors[slot];
        node.style.left = `${left + w * a[0]}px`;
        node.style.top = `${top + h * a[1]}px`;
        node.style.width = `${w * a[2]}px`;
        node.style.rotate = `${a[3]}deg`;
      } else {
        node.removeAttribute("style"); node.dataset.item = "";
        if (item) node.textContent = item.emoji;
      }
    }
  }

  function openCloset(tab) {
    metric("closet_open");
    if (state.phase !== "pet") return;
    state.closetTab = tab || (state.species?.id === "kitty" ? "studio" : "toys");
    if (el.closetPanel) el.closetPanel.hidden = false;
    if (el.collectionPanel) el.collectionPanel.hidden = true;
    renderCloset();
  }
  function closeCloset() {
    if (el.closetPanel) el.closetPanel.hidden = true;
  }
  function renderCloset() {
    if (!el.closetTabs || !el.closetGrid) return;
    el.closetTabs.innerHTML = "";
    CLOSET_TABS.filter(t => !t.species || t.species === state.species?.id).forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "closet-tab" + (state.closetTab === t.id ? " on" : "");
      b.textContent = t.label;
      b.addEventListener("click", () => { state.closetTab = t.id; renderCloset(); });
      el.closetTabs.appendChild(b);
    });
    el.closetGrid.innerHTML = "";
    const count = Object.values(state.outfit || {}).filter(Boolean).length;
    document.getElementById("closetStatus").textContent = `${count}/3 acessórios · toque na peça para colocar ou tirar. Brinquedos não entram no limite.`;
    CLOSET_ITEMS.filter((i) => i.tab === state.closetTab && (!i.species || i.species === state.species?.id)).forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "closet-item";
      const equipped = item.tab === "toys"
        ? state.activeToyId === item.id
        : state.outfit[item.slot] === item.id;
      if (equipped) b.classList.add("on");
      b.setAttribute("aria-pressed", String(equipped));
      b.innerHTML = `<span class="ce">${item.art ? `<img src="${item.art}" alt="" />` : item.emoji}</span><span class="cn">${item.name}</span>`;
      b.addEventListener("click", () => equipItem(item));
      el.closetGrid.appendChild(b);
    });
  }
  function equipItem(item) {
    if (item.tab === "toys") {
      // Seleciona o brinquedo (clicar de novo guarda)
      state.activeToyId = state.activeToyId === item.id ? null : item.id;
      syncToyUI();
      say(state.activeToyId ? `Agora vamos de ${item.emoji} ${item.name}!` : "Brinquedo guardado — volto ao padrão!", 1800);
    } else {
      const cur = state.outfit[item.slot];
      if (cur !== item.id && !cur && Object.values(state.outfit).filter(Boolean).length >= 3) {
        document.getElementById("closetStatus").textContent = "Você já escolheu 3 acessórios! Tire uma peça para experimentar outra.";
        say("Escolhe uma peça para guardar primeiro! ✨", 2000);
        return;
      }
      state.outfit[item.slot] = cur === item.id ? null : item.id;
      renderOutfit();
      rain([item.emoji, "✨", "💖"], 6);
      say(state.outfit[item.slot] ? `Ficou lindo de ${item.name}!` : "Tirei!", 1800);
      setMood("happy", 1200);
    }
    metric("equip", { action: item.id });
    saveActivePet();
    renderCloset();
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
      const face = p.outfit?.face && CLOSET_ITEMS.find((i) => i.id === p.outfit.face)?.emoji;
      const hat = p.outfit?.hat && CLOSET_ITEMS.find((i) => i.id === p.outfit.hat)?.emoji;
      const badge = p.frozen ? `<span class="pause-badge">⏸ pausado</span>` : (isActive ? `<span class="pause-badge live">agora</span>` : "");
      card.innerHTML = `<span class="thumb" style="background-image:url(${thumb})"></span><span class="meta"><b></b><i>${sp?.name || ""} · ${STAGE_LABELS[p.stage] || ""}</i>${badge}</span><span class="bits">${hat || ""}${face || ""}</span>`;
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
    const ak = artKey(sp);
    if (state.sleeping) {
      const s = sleepArt(sp, state.stage);
      if (s) return s;
    }
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
        .concat((sp.sleepStages || []).map((k) => `${ART}${ak}_${k}_sleep.webp`));
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
  function playMove(cls, ms) {
    el.actorMove.className = "actor-move";
    void el.actorMove.offsetWidth;
    el.actorMove.classList.add(cls);
    return wait(ms);
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
    el.avatar.style.backgroundImage = `url(${baseArt(sp, 1)})`;
    el.petName.textContent = pick(sp.names);
    el.petStage.textContent = `${sp.name} · ovo escolhido`;
    syncBiome();
  }
  function renderHeader() {
    if (!state.species) return;
    el.avatar.style.backgroundImage = `url(${baseArt(state.species, 1)})`;
    el.petName.textContent = state.name;
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
    document.getElementById("petPronoun").value = state.pronoun || state.species.he;
    namingInput.value = namingSuggestion;
    namingInput.setCustomValidity("");
    document.getElementById("petNamingHint").textContent = `${state.species.name}: pode manter ${namingSuggestion} ou inventar um nome só seu.`;
    state.naming = true;
    state.rubbing = false;
    namingDialog.showModal();
    namingInput.focus();
    namingInput.select();
  }
  function finishPetName(value) {
    const name = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 30) {
      namingInput.setCustomValidity("Escolha um nome de até 30 caracteres.");
      namingInput.reportValidity();
      return;
    }
    state.name = name;
    state.pronoun = document.getElementById("petPronoun").value;
    state.naming = false;
    // Naming time does not count toward growth or decay.
    state.lastGrowth += performance.now() - namingStarted;
    namingDialog.close();
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
        return setGuide(`${p} está bravo! Dê MUITO carinho, comida e brincadeira! 🦁💢`, "5", "💗", true);
      }
      return setGuide(`${p} está nervoso! Olha a carinha dele — cuida agora! 💢`, null, "😤", true);
    }
    if (state.mood === "sick" || state.needs.health < 40) {
      return setGuide(`${p} está doente… Aperte 💊 Saúde na lateral!`, "H", "💊", true);
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
      if (nL.love < 88) return setGuide(`${p} ainda está carrancudo… Mais carinho! 💗💗💗`, "5", "💗", true);
      if (nL.hunger < 82) return setGuide(`${p} grunhe de fome… Mais ${state.species.foodName}! 🥩`, "2", state.species.food, true);
      return setGuide(`${p} quase sorri… Brinca um pouco! ${toyEmoji()}`, "P", toyEmoji(), true);
    }
    if (n.energy > 40 && n.love < 85 && Math.random() < 0.002) {
      return setGuide(`Que tal brincar? Aperte Brincar e arraste o ${toyEmoji()}!`, "P", toyEmoji());
    }
    setGuide(
      isLion()
        ? `${p} finalmente sorriu! Continue mimando 🦁💕`
        : `${p} está feliz! Faça carinho, ou aperte Brincar ${toyEmoji()}`,
      "P",
      "💕"
    );
  }

  // ---------- Clumsy baby skits ----------
  async function skit(kind) {
    if (state.busy || state.sleeping || state.phase !== "pet") return;
    state.busy = true;
    const p = state.name;
    try {
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
        rain(["💢", "💨", "✨"], 8);
        say("Não me faça carinho agora!", 1800);
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
      phase: "pet", stage: 1, species, pronoun: species.he, name: pick((state.variant && species.variants?.[state.variant]?.names) || species.names),
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
      Object.assign(state.needs, { hunger: 45, thirst: 50, hygiene: 55, love: 28, energy: 50, health: 85 });
      setMood("mad", 2800);
      rain(["✨", "💢", "⭐"], 10);
      say(`Sou ${state.name}! Grr… me conquiste com MUITO carinho! 🦁`, 3200);
      if (window.PixelAudio) window.PixelAudio.speak("lion", "mad", { force: true });
    } else {
      setMood("happy", 2000);
      rain(["✨", "💖", "⭐"], 10);
      say(knewSpecies ? `Sou eu, ${state.name}! 💖` : `Surpresa! Eu sou ${state.name}! 💖`, 2600);
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
    choosePetName();
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

  const stageNeedMult = () => 0.75 + state.stage * 0.3;

  function decayRates() {
    const stage = stageNeedMult();
    const pr = state.species?.profile || {};
    const b = state.boosts || {};
    return {
      hunger: BASE_RATES.hunger * stage * (pr.hunger || 1) * (b.hunger || 1),
      thirst: BASE_RATES.thirst * stage * (pr.thirst || 1) * (b.thirst || 1),
      hygiene: BASE_RATES.hygiene * stage * (pr.hygiene || 1) * (b.hygiene || 1),
      love: BASE_RATES.love * stage * (pr.love || 1) * (b.love || 1),
      energy: state.sleeping ? -SLEEP_ENERGY_GAIN : BASE_RATES.energy * stage * (pr.energy || 1) * (b.energy || 1),
      health: 0,
    };
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
    if (kind === "play") {
      if (state.playing) setPlaying(false);
      say(isMachine() ? "Quebrado… não dá pra brincar agora 🛠️" : "Tô doente… não quero brincar 🤒", 2400);
    } else if (kind === "feed") {
      say(isMachine() ? "Motor enjoado… sem peças agora 😣" : "Buá… barriga dói, não quero comer 🤒", 2400);
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
    state.playing = !!on;
    el.app.classList.toggle("playing", state.playing);
    if (el.toy) {
      el.toy.hidden = !state.playing;
      if (state.playing) placeToyNearPet(14);
    }
    syncToyUI();
    if (state.playing) {
      say(`Pega o brinquedo! ${toyEmoji()}`, 2200);
      setMood("happy", 1800);
    } else {
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
    if (!state.playing || !el.stage) return;
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
      state.needs.hunger = clamp(state.needs.hunger - 4, 0, 100);
      state.needs.thirst = clamp(state.needs.thirst - 5, 0, 100);
      state.needs.energy = clamp(state.needs.energy - 6, 0, 100);
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
    state.needs.energy = clamp(state.needs.energy - 1.8 * dt, 0, 100);
    state.needs.thirst = clamp(state.needs.thirst - 1.2 * dt, 0, 100);
    state.needs.hunger = clamp(state.needs.hunger - 0.9 * dt, 0, 100);
  }

  async function care(kind) {
    if (state.phase !== "pet") return;
    metric("care_attempt", { action: kind });
    if (state.sleeping && kind !== "wake") { metric("care_blocked", { action: kind, reason: "sleeping" }); say("Shhh… zzz", 1400); rain(["💤"], 2, "zzz"); return; }
    if (state.busy && kind !== "wake") { metric("care_blocked", { action: kind, reason: "busy" }); return; }
    if (window.PixelAudio) {
      const map = { feed: "feed", drink: "drink", bath: "bath", pet: "pet", play: "play", sleep: "sleep", wake: "wake", heal: "heal" };
      if (map[kind]) window.PixelAudio.cue(map[kind], state.species?.id);
    }
    const n = state.needs;
    // Tyton sobe bem mais devagar — precisa de MUITAS ações
    const boost = isLion()
      ? (4 + state.stage * 2)
      : (12 + state.stage * 4);
    const tooMuch = (key, limit, msg) => {
      if (n[key] <= limit) return false;
      metric("care_blocked", { action: kind, reason: "already_full" });
      state.over[key]++;
      setMood("mad", 1800);
      rain(["💢", "😤"], 3);
      say(msg, 2000);
      return true;
    };
    const relieve = (key) => { state.over[key] = Math.max(0, state.over[key] - 1); };

    if (kind === "feed") {
      if (refuseBecauseSick("feed")) return;
      if (tooMuch("hunger", 92, isMachine() ? "Já tenho peças demais! 🔧" : "Minha barriguinha tá cheia! 😣")) return;
      state.busy = true;
      await throwTo("2", state.species.food);
      n.hunger = clamp(n.hunger + boost + (isLion() ? 4 : 8), 0, 100);
      relieve("hunger");
      state.pose = "eat"; renderActor();
      el.actor.dataset.mood = "neutral";
      playMove("munch", 2200);
      say(isMachine() ? `Clinc clanc! Amo ${state.species.foodName}! 🔧` : (isLion() ? `Grr… nham. Quero MAIS carnezinha! 🥩` : `Nham nham! Amo ${state.species.foodName}! 😋`), 2200);
      for (let i = 0; i < 5; i++) setTimeout(() => fx("float", pick(["✨", state.species.food, "💛"]), { x: 40 + Math.random() * 20, y: 45, dx: (Math.random() - 0.5) * 90 }), i * 300);
      await wait(2300);
      state.pose = null; state.busy = false;
    } else if (kind === "drink") {
      if (tooMuch("thirst", 92, isMachine() ? "Tanque cheio! ⛽" : "Chega de água! 💦")) return;
      state.busy = true;
      await throwTo("3", isMachine() ? "⛽" : (canUsePacifier() ? "🍼" : "🥛"));
      n.thirst = clamp(n.thirst + boost + (isLion() ? 5 : 10), 0, 100);
      relieve("thirst");
      playMove("munch", 1500);
      rain(isMachine() ? ["⛽", "🛢️", "✨"] : ["💧", "💦"], 5);
      say(isMachine() ? pick(["Glup de óleo!", "Motor feliz!", "Abastecido!"]) : pick(["Glub glub glub!", "Ahhh, geladinho!", "Hmmm, que bom!"]), 2000);
      await wait(1500);
      state.busy = false;
    } else if (kind === "bath") {
      if (tooMuch("hygiene", 90, "Já estou limpinho!")) return;
      n.hygiene = clamp(n.hygiene + (isLion() ? 18 : 35), 0, 100);
      relieve("hygiene");
      for (let i = 0; i < 14; i++) setTimeout(() => fx("bubble-soap", "", { x: 15 + Math.random() * 70, y: 30 + Math.random() * 55, dx: (Math.random() - 0.5) * 80, size: 16 + Math.random() * 34 }), i * 70);
      playMove("wobble", 1400);
      say(isLion() ? pick(["Grr… molhado.", "Humf.", "Só um pouquinho…"]) : pick(["Splash! 🫧", "Cosquinha! Hihi", "Cheirosinho!"]));
    } else if (kind === "pet") {
      // Tyton ACEITA muito carinho — é assim que ele melhora
      const loveCap = isLion() ? 98 : 94;
      if (tooMuch("love", loveCap, isLion() ? "Grr! Agora chega um pouquinho… 🦁" : "Ai, chega de apertar! 😤")) return;
      n.love = clamp(n.love + boost + (isLion() ? 2 : 0), 0, 100);
      relieve("love");
      rain(["💖", "💗", "💕", "🥰"], isLion() ? 4 : 7);
      say(isLion()
        ? pick(["…humf.", "Grr… mais um?", "Tá… só mais um carinho.", "Rrr… talvez eu goste."])
        : pick(["Hihihi!", "Te amo! 💖", "Mais um abraço!", "Rrrrrr… 😊"]));
    } else if (kind === "sleep") {
      if (!state.sleeping) {
        if (state.playing) setPlaying(false);
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
      if (!state.sleeping) { metric("care_blocked", { action: kind, reason: "already_awake" }); say("Já estou acordado!", 1400); return; }
      state.sleeping = false;
      rain(["☀️", "✨"], 4);
      say(isLion() ? "Grr… dia. 🦁" : "Bom dia!! ☀️", 2000);
    } else if (kind === "heal") {
      if (n.health > 92) { metric("care_blocked", { action: kind, reason: "healthy" }); say(isMachine() ? "Já estou novinho! 🛠️" : "Já estou saudável! 💚", 1600); return; }
      state.busy = true;
      rain(isMachine() ? ["🛠️", "🔩", "✨"] : ["💊", "💚", "✨"], 10);
      playMove("wobble", 1200);
      n.health = clamp(n.health + (isLion() ? 22 : 38), 0, 100);
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
      if (state.playing && isLion()) {
        n.love = clamp(n.love + 3, 0, 100);
        say(pick(["Grr… brincar?", "…tudo bem. Vamos.", "Roar! Só um pouco."]), 1800);
      }
      renderNeeds();
      evaluateMood(performance.now() + 1);
      renderActor();
      saveActivePet();
      metric("care_success", { action: kind });
      return;
    }
    // Não força "feliz" no Tyton — ele só sorri se estiver bem cuidado
    if (isLion()) {
      state.moodLock = 0;
      evaluateMood(performance.now() + 1);
    } else {
      setMood("happy", 1600);
    }
    state.lackMs = Math.max(0, state.lackMs - (isLion() ? 1500 : 4000));
    renderActor();
    renderNeeds();
    saveActivePet();
    metric("care_success", { action: kind });
  }

  function evaluateMood(now) {
    if (now < state.moodLock || state.busy) return;
    if (state.sleeping) return setMood("sleep");
    const n = state.needs;
    if (n.health < 28) return setMood("sick");
    if (Object.values(state.over).some((v) => v > 2)) return setMood("mad");

    const lows = ["hunger", "thirst", "hygiene", "love", "energy"].filter((k) => n[k] < 35);
    const crits = ["hunger", "thirst", "hygiene", "love", "energy"].filter((k) => n[k] < 18);

    if (crits.length >= 1 || lows.length >= 2 || state.lackMs > 12_000) {
      return setMood("mad");
    }
    if (n.health < 45) return setMood("sad");
    if (lows.length >= 1 || n.hunger < 28 || n.thirst < 28 || n.love < 25 || n.energy < 22 || n.hygiene < 22) {
      return setMood("sad");
    }

    // Tyton: só sorri depois de MUITO carinho, comida, brincadeira…
    if (isLion()) {
      if (lionPamperedEnough() && (state.playing || n.love >= 92)) return setMood("happy");
      if (n.love < 70 || n.hunger < 65 || n.energy < 55) return setMood("mad");
      return setMood("neutral");
    }

    if (state.playing) return setMood("happy");
    if (n.hunger > 60 && n.thirst > 60 && n.love > 55 && n.hygiene > 50 && n.health > 55) return setMood("happy");
    setMood("neutral");
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
        for (const k of Object.keys(state.over)) state.over[k] = Math.max(0, state.over[k] - (0.15 / PACE) * dt);

        // Saúde: cai com abandono, sobe com cuidados bons
        const n = state.needs;
        const neglect = ["hunger", "thirst", "hygiene", "energy"].filter((k) => n[k] < 30).length;
        let hDelta = 0;
        if (neglect >= 2) hDelta = (-4 / PACE) * dt;
        else if (neglect >= 1) hDelta = (-1.5 / PACE) * dt;
        else if (n.hunger > 50 && n.thirst > 50 && n.hygiene > 50 && n.love > 40) hDelta = (1.2 / PACE) * dt;
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
          if (Math.random() < 0.12) say(pick(["Estou doente…", "Ai…", "Me cura? 💊"]), 1800);
        }
        if (state.mood === "sad") {
          fx("tear", "💧", { x: 40, y: 45, dx: -10 });
          fx("tear", "💧", { x: 58, y: 45, dx: 10 });
          if (Math.random() < 0.14) say(pick(["Buááá…", "Estou triste…", "Me ajuda?", "Preciso de você…"]), 1800);
        }
        if (state.mood === "mad") {
          fx("float", "💨", { x: 30, y: 40, dx: -40 });
          fx("float", "💢", { x: 65, y: 35, dx: 20 });
          if (Math.random() < 0.12) say(pick(["Humpf!", "Estou nervoso!", "Não aguento mais!", "Cuida de mim! 💢"]), 1800);
        }
        if (state.mood === "sleep") fx("zzz", "Z", { x: 58, y: 45, font: `${1.4 + Math.random()}rem` });
        if (state.playing && Math.random() < 0.5) {
          fx("float", pick(["✨", "💫", toyEmoji()]), { x: 30 + Math.random() * 40, y: 50 + Math.random() * 20, dx: (Math.random() - 0.5) * 60 });
        }
        if (state.mood === "happy" && !state.playing && Math.random() < 0.25) {
          fx("float", "💗", { x: 40 + Math.random() * 20, y: 35, dx: (Math.random() - 0.5) * 50 });
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
    actions[key]?.();
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
        localStorage.removeItem("bichinho-hatch-bag");
        localStorage.removeItem("bichinho-audience");
        localStorage.setItem("bichinho-force-new-egg", "1");
      } catch (_) {}
      state.skipAutosave = true;
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
  el.btnCollection?.addEventListener("click", () => openCollection());
  el.closetClose?.addEventListener("click", closeCloset);
  el.collectionClose?.addEventListener("click", closeCollection);
  el.btnNewEgg?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    archiveAndNewEgg();
  });

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
    if (state.pose === "sleep") { state.sleeping = true; state.pose = null; }
    state.petId = state.petId || `preview-${Date.now()}`;
    if (q.get("photo") === "1" && state.species.id === "kitty") {
      state.outfit = { ...emptyOutfit(), face: "studio_glasses", hat: "studio_bow", held: "studio_bag" };
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
  renderActor();
  renderEgg();
  renderGrowth();
  syncBiome();
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
    if (localStorage.getItem("bichinho-force-new-egg") === "1") {
      forceNew = true;
      localStorage.removeItem("bichinho-force-new-egg");
    }
  } catch (_) { /* ignore */ }
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
    renderActor();
    renderEgg();
    syncBiome();
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
  // Filtra bag salva pelo público atual
  state.hatchBag = (state.hatchBag || []).filter((id) => readySpecies().some((s) => s.id === id));

  if (state.phase === "pet" && !state.preview) {
    /* retomado — já falou oi */
  } else if (!state.preview && state.forceSpecies) {
    say(`Ovo escolhido! Aquece pra ver ${pick(state.forceSpecies.names)}… 🥚`, 3200);
  } else if (!state.preview && state.audience) say("Tem um ovinho aqui! 🥚", 3000);
  else if (!state.preview && !state.audience) say("Escolhe pra quem é o PIXEL! ✨", 4000);
  requestAnimationFrame(tick);
})();
