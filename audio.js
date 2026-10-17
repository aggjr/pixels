/**
 * PIXELS — áudio com samples reais (Mixkit) + fallback procedural.
 * Bebês: soluço e pum no nascimento · carros: escapamento.
 */
(() => {
  "use strict";

  const STORAGE_MUTE = "pixelplay-muted";
  const SFX = "assets/sfx/";

  let ctx = null;
  let master = null;
  let ambientBus = null;
  let voiceBus = null;
  let sfxBus = null;
  let muted = false;
  let unlocked = false;
  let currentBiome = null;
  let ambientHandles = [];
  let ambientTimer = null;
  let lastVoiceAt = 0;
  let lastMoodKey = "";
  const bufferCache = new Map();
  const loading = new Map();

  try {
    muted = localStorage.getItem(STORAGE_MUTE) === "1";
  } catch (_) { /* ignore */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    ambientBus = ctx.createGain();
    ambientBus.gain.value = 0.28;
    ambientBus.connect(master);

    voiceBus = ctx.createGain();
    voiceBus.gain.value = 0.62;
    voiceBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(master);
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    unlocked = true;
    warmSamples();
    if (currentBiome) startAmbient(currentBiome, true);
  }

  function setMuted(on) {
    muted = !!on;
    try { localStorage.setItem(STORAGE_MUTE, muted ? "1" : "0"); } catch (_) {}
    const c = ensure();
    if (master) {
      const t = c.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, t + 0.12);
    }
    if (!muted && unlocked && currentBiome) startAmbient(currentBiome, true);
    if (muted) stopAmbient();
    document.documentElement.dataset.sound = muted ? "off" : "on";
    const btn = document.getElementById("btnMute");
    if (btn) {
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.title = muted ? "Som desligado (ligar)" : "Som ligado (desligar)";
      btn.querySelector(".i").textContent = muted ? "🔇" : "🔊";
    }
  }

  function toggleMute() {
    unlock();
    setMuted(!muted);
  }

  // ---------- Samples ----------
  function loadBuffer(file) {
    if (!file) return Promise.resolve(null);
    if (bufferCache.has(file)) return Promise.resolve(bufferCache.get(file));
    if (loading.has(file)) return loading.get(file);
    const p = (async () => {
      try {
        ensure();
        const res = await fetch(SFX + file);
        if (!res.ok) throw new Error(res.status);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr.slice(0));
        bufferCache.set(file, buf);
        return buf;
      } catch (_) {
        bufferCache.set(file, null);
        return null;
      } finally {
        loading.delete(file);
      }
    })();
    loading.set(file, p);
    return p;
  }

  function playBuffer(buf, bus, {
    gain = 0.55, rate = 1, offset = 0, duration = null, when = 0,
  } = {}) {
    if (!ctx || !buf || muted) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(bus);
    const t0 = ctx.currentTime + when;
    const dur = duration != null ? Math.min(duration, buf.duration - offset) : undefined;
    try {
      if (dur != null && dur > 0) src.start(t0, offset, dur);
      else src.start(t0, offset);
    } catch (_) { return null; }
    return src;
  }

  async function playSample(file, bus, opts = {}) {
    const buf = await loadBuffer(file);
    if (!buf) return false;
    playBuffer(buf, bus, opts);
    return true;
  }

  function playSampleSync(file, bus, opts = {}) {
    const buf = bufferCache.get(file);
    if (buf) {
      playBuffer(buf, bus, opts);
      return true;
    }
    playSample(file, bus, opts);
    return false;
  }

  const WARM = [
    "dog_happy.mp3", "dog_mad.mp3", "dog_sad.mp3",
    "cat_happy.mp3", "cat_neutral.mp3", "cat_sad.mp3",
    "lion_mad.mp3", "monkey_happy.mp3", "pig_happy.mp3",
    "bird_happy.mp3", "insect.mp3", "dino_mad.mp3", "beast.mp3",
    "bubble.mp3", "bubble2.mp3", "bubbles_deep.mp3", "splash.mp3", "underwater.mp3",
    "car_horn.mp3", "car_horn2.mp3", "car_putt.mp3", "car_start.mp3", "car_exhaust.mp3",
    "truck_horn.mp3", "heli.mp3", "propeller.mp3", "tram.mp3", "moto.mp3",
    "fart.mp3", "fart2.mp3", "hiccup.wav", "sneeze.mp3", "pop.mp3", "boing.mp3",
    "kiss.mp3", "sip.mp3", "squeak.mp3", "splat.mp3", "goat.mp3", "cow.mp3", "horse.mp3",
  ];

  function warmSamples() {
    WARM.forEach((f) => loadBuffer(f));
  }

  // ---------- Procedural helpers (fallback) ----------
  function noiseBuffer(seconds = 1.5) {
    const c = ensure();
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function envGain(bus, t0, a, hold, r, peak = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t0 + a);
    g.gain.setValueAtTime(Math.max(0.001, peak), t0 + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + r);
    g.connect(bus);
    return g;
  }

  function tone(freq, dur, type, bus, peak = 0.2, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const g = envGain(bus, t0, 0.02, Math.max(0.01, dur * 0.55), dur * 0.4, peak);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(bus, dur, peak, filterFreq, type = "bandpass", q = 1) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(Math.max(0.2, dur + 0.1));
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    f.Q.value = q;
    const g = envGain(bus, t0, 0.01, dur * 0.3, dur * 0.7, peak);
    src.connect(f);
    f.connect(g);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function stopAmbient() {
    if (ambientTimer) {
      clearInterval(ambientTimer);
      ambientTimer = null;
    }
    ambientHandles.forEach((stop) => {
      try { stop(); } catch (_) {}
    });
    ambientHandles = [];
  }

  const BIOME_SAMPLE = {
    meadow: ["bird_happy.mp3", "insect.mp3"],
    forest: ["bird_happy.mp3", "insect.mp3"],
    garden: ["bird_happy.mp3", "insect.mp3"],
    savanna: ["bird_flock.mp3", "beast.mp3"],
    water: ["bubble.mp3", "bubbles_deep.mp3", "splash.mp3"],
    marina: ["splash.mp3", "bubble2.mp3"],
    garage: ["car_putt.mp3", "moto.mp3"],
    station: ["tram.mp3", "train_amb.mp3"],
    airfield: ["heli.mp3", "propeller.mp3"],
    space: ["underwater.mp3", "boing.mp3"],
    lab: ["pop_click.mp3", "squeak.mp3"],
    cozy: ["kiss.mp3", "pop.mp3"],
  };

  function startAmbient(biome, force = false) {
    const c = ensure();
    if (!c || muted) {
      currentBiome = biome;
      return;
    }
    if (!force && biome === currentBiome && ambientTimer) return;
    stopAmbient();
    currentBiome = biome;
    if (!unlocked) return;

    const files = BIOME_SAMPLE[biome] || BIOME_SAMPLE.meadow;
    const tick = () => {
      if (muted || !unlocked) return;
      const f = files[Math.floor(Math.random() * files.length)];
      playSample(f, ambientBus, {
        gain: 0.12 + Math.random() * 0.1,
        rate: 0.92 + Math.random() * 0.16,
        duration: 1.8 + Math.random() * 1.2,
        offset: Math.random() * 0.2,
      });
    };
    tick();
    ambientTimer = setInterval(tick, 2800 + Math.random() * 1800);
  }

  function setBiome(biome) {
    startAmbient(biome || "meadow");
  }

  // ---------- Famílias ----------
  const FAMILY = {
    unicorn: "magic",
    dino: "dino",
    kitty: "cat",
    floide: "cat",
    tini: "dog",
    duck: "bird",
    pig: "pig",
    mole: "critter",
    bat: "bat",
    seal: "seal",
    monkey: "monkey",
    axolotl: "aqua",
    bee: "insect",
    butterfly: "insect",
    nini: "insect",
    lilica: "critter",
    elephant: "elephant",
    lion: "lion",
    racer: "car",
    botcar: "car",
    rocket: "rocket",
    heli: "heli",
    plane: "plane",
    train: "train",
    tractor: "tractor",
    boat: "boat",
    slime: "slime",
  };

  const VEHICLE = new Set(["car", "boat", "train", "plane", "heli", "rocket", "tractor"]);

  /** Sample por família + humor (primeiro que existir) */
  const VOICE_SAMPLES = {
    dog: {
      happy: ["dog_happy.mp3"],
      mad: ["dog_mad.mp3"],
      sad: ["dog_sad.mp3"],
      sick: ["dog_sad.mp3"],
      sleep: ["dog_sad.mp3"],
      neutral: ["dog_happy.mp3"],
    },
    cat: {
      happy: ["cat_happy.mp3", "cat_neutral.mp3"],
      mad: ["cat_sad.mp3"],
      sad: ["cat_sad.mp3"],
      sick: ["cat_sad.mp3"],
      sleep: ["cat_neutral.mp3"],
      neutral: ["cat_neutral.mp3"],
    },
    lion: {
      happy: ["lion_mad.mp3"],
      mad: ["lion_mad.mp3", "beast.mp3"],
      sad: ["beast.mp3"],
      sick: ["beast.mp3"],
      sleep: ["lion_mad.mp3"],
      neutral: ["lion_mad.mp3"],
    },
    monkey: {
      happy: ["monkey_happy.mp3"],
      mad: ["monkey_happy.mp3"],
      sad: ["squeak.mp3"],
      neutral: ["monkey_happy.mp3"],
    },
    pig: {
      happy: ["pig_happy.mp3"],
      mad: ["pig_happy.mp3"],
      sad: ["pig_happy.mp3"],
      neutral: ["pig_happy.mp3"],
    },
    bird: {
      happy: ["bird_happy.mp3", "bird_flock.mp3"],
      mad: ["bird_happy.mp3"],
      sad: ["bird_happy.mp3"],
      neutral: ["bird_happy.mp3"],
    },
    insect: {
      happy: ["insect.mp3"],
      mad: ["insect.mp3"],
      sad: ["insect.mp3"],
      neutral: ["insect.mp3"],
    },
    aqua: {
      happy: ["bubble.mp3", "bubble2.mp3", "bubbles_deep.mp3"],
      mad: ["splash.mp3", "bubbles_deep.mp3"],
      sad: ["underwater.mp3", "bubble2.mp3"],
      sick: ["underwater.mp3"],
      sleep: ["underwater.mp3"],
      neutral: ["bubble.mp3", "fish.mp3"],
    },
    seal: {
      happy: ["bubble2.mp3", "splash.mp3"],
      mad: ["splash.mp3"],
      sad: ["underwater.mp3"],
      neutral: ["bubble.mp3"],
    },
    slime: {
      happy: ["splat.mp3", "pop.mp3"],
      mad: ["splat.mp3"],
      sad: ["squeak.mp3"],
      neutral: ["pop_cluster.mp3", "splat.mp3"],
    },
    dino: {
      happy: ["dino_mad.mp3", "beast.mp3"],
      mad: ["dino_mad.mp3", "beast.mp3"],
      sad: ["beast.mp3"],
      neutral: ["dino_mad.mp3"],
    },
    elephant: {
      happy: ["horse.mp3", "beast.mp3"],
      mad: ["beast.mp3"],
      sad: ["cow.mp3"],
      neutral: ["horse.mp3"],
    },
    critter: {
      happy: ["squeak.mp3", "goat.mp3"],
      mad: ["squeak.mp3"],
      sad: ["squeak.mp3"],
      neutral: ["squeak.mp3", "boing.mp3"],
    },
    bat: {
      happy: ["squeak.mp3", "whistle.mp3"],
      mad: ["squeak.mp3"],
      neutral: ["whistle.mp3"],
    },
    magic: {
      happy: ["boing.mp3", "kiss.mp3", "whistle.mp3"],
      mad: ["whistle.mp3"],
      sad: ["sneeze.mp3"],
      neutral: ["boing.mp3"],
    },
    car: {
      happy: ["car_horn.mp3", "car_horn2.mp3"],
      mad: ["car_putt.mp3", "car_exhaust.mp3"],
      sad: ["car_putt.mp3"],
      sick: ["car_putt.mp3"],
      sleep: ["car_start.mp3"],
      neutral: ["car_horn.mp3", "car_start.mp3"],
    },
    boat: {
      happy: ["truck_horn.mp3", "splash.mp3"],
      mad: ["car_exhaust.mp3", "splash.mp3"],
      sad: ["underwater.mp3"],
      neutral: ["splash.mp3", "car_horn2.mp3"],
    },
    train: {
      happy: ["tram.mp3", "truck_horn.mp3"],
      mad: ["train_amb.mp3"],
      sad: ["tram.mp3"],
      neutral: ["tram.mp3"],
    },
    plane: {
      happy: ["propeller.mp3", "heli.mp3"],
      mad: ["propeller.mp3"],
      neutral: ["propeller.mp3"],
    },
    heli: {
      happy: ["heli.mp3", "propeller.mp3"],
      mad: ["heli2.mp3", "heli.mp3"],
      neutral: ["heli.mp3"],
    },
    rocket: {
      happy: ["car_exhaust.mp3", "boing.mp3"],
      mad: ["car_exhaust.mp3", "dino_mad.mp3"],
      neutral: ["car_start.mp3", "boing.mp3"],
    },
    tractor: {
      happy: ["truck_horn.mp3", "moto.mp3"],
      mad: ["car_exhaust.mp3", "moto.mp3"],
      sad: ["car_putt.mp3"],
      neutral: ["moto.mp3", "car_putt.mp3"],
    },
  };

  function pickFile(list) {
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function speakWithSample(family, mood) {
    const pack = VOICE_SAMPLES[family];
    if (!pack) return false;
    const files = pack[mood] || pack.neutral;
    const file = pickFile(files);
    if (!file) return false;
    const rate = family === "insect" ? 1.15 + Math.random() * 0.2
      : family === "bat" ? 1.25
      : family === "elephant" ? 0.78
      : family === "dino" ? 0.85
      : 0.92 + Math.random() * 0.18;
    const gain = VEHICLE.has(family) ? 0.48 : 0.58;
    const duration = VEHICLE.has(family) ? 1.6 : 1.4;
    return playSampleSync(file, voiceBus, { gain, rate, duration, offset: 0 });
  }

  function softChirp(base, count, up = true) {
    for (let i = 0; i < count; i++) {
      const f = up ? base * (1 + i * 0.12) : base * (1 - i * 0.08);
      setTimeout(() => tone(f, 0.09, "sine", voiceBus, 0.18), i * 90);
    }
  }

  function growl(base = 90) {
    tone(base, 0.45, "sawtooth", voiceBus, 0.16, base * 0.7);
    noiseBurst(voiceBus, 0.35, 0.06, base * 2, "lowpass", 1);
  }

  function whimper(base = 320) {
    tone(base, 0.35, "triangle", voiceBus, 0.14, base * 0.75);
    setTimeout(() => tone(base * 0.9, 0.3, "sine", voiceBus, 0.1, base * 0.65), 160);
  }

  function blub() {
    if (!playSampleSync("bubble.mp3", voiceBus, { gain: 0.5, rate: 1.1 })) {
      noiseBurst(voiceBus, 0.15, 0.1, 700, "bandpass", 2);
      tone(240, 0.2, "sine", voiceBus, 0.12, 120);
    }
  }

  function proceduralVoice(family, mood) {
    switch (family) {
      case "car":
      case "tractor":
        if (mood === "happy") return playSampleSync("car_horn.mp3", voiceBus, { gain: 0.5 }) || softChirp(400, 2);
        if (mood === "mad") return playSampleSync("car_putt.mp3", voiceBus, { gain: 0.45, duration: 1.2 }) || growl(80);
        return playSampleSync("car_start.mp3", voiceBus, { gain: 0.4, duration: 1 }) || tone(90, 0.4, "sawtooth", voiceBus, 0.1);
      case "aqua":
      case "seal":
        return blub();
      case "lion":
        if (mood === "mad") return growl(75);
        if (mood === "sad" || mood === "sick") return whimper(200);
        return softChirp(280, 3, true);
      case "dog":
        return softChirp(420, 2, true);
      case "cat":
        return softChirp(600, 2, mood !== "mad");
      default:
        if (mood === "sad" || mood === "sick") return whimper(300);
        if (mood === "mad") return growl(140);
        return softChirp(480, 3, true);
    }
  }

  function speak(speciesId, mood, { force = false } = {}) {
    const c = ensure();
    if (!c || muted || !unlocked) return;
    const now = performance.now();
    const key = `${speciesId}:${mood}`;
    if (!force && key === lastMoodKey && now - lastVoiceAt < 2200) return;
    if (!force && now - lastVoiceAt < 450) return;
    lastVoiceAt = now;
    lastMoodKey = key;
    const family = FAMILY[speciesId] || "critter";
    const m = mood || "neutral";
    if (!speakWithSample(family, m)) {
      try { proceduralVoice(family, m); } catch (_) {}
    }
  }

  /** Soluço de bebê — normalzinho 🍼 */
  function babyHiccup() {
    if (playSampleSync("hiccup.wav", sfxBus, { gain: 0.55, rate: 0.95 + Math.random() * 0.12 })) return;
    // fallback: três pios glotais
    [0, 220, 480].forEach((d, i) => {
      setTimeout(() => {
        tone(380 - i * 30, 0.07, "sine", sfxBus, 0.16, 280);
        noiseBurst(sfxBus, 0.04, 0.06, 900, "bandpass", 3);
      }, d);
    });
  }

  /** Pum fofo de bebê (ou escapamento se for veículo) */
  function babyToot(family) {
    if (VEHICLE.has(family)) {
      const file = pickFile(["car_putt.mp3", "car_exhaust.mp3", "fart.mp3"]);
      playSampleSync(file, sfxBus, { gain: 0.42, rate: 1.05, duration: 1.1 });
      return;
    }
    const file = pickFile(["fart.mp3", "fart2.mp3"]);
    playSampleSync(file, sfxBus, { gain: 0.38, rate: 1.15 + Math.random() * 0.2, duration: 0.9 });
  }

  function cue(name, speciesId) {
    const c = ensure();
    if (!c || muted || !unlocked) return;
    const family = FAMILY[speciesId] || "critter";
    switch (name) {
      case "hatch": {
        playSampleSync("boing.mp3", sfxBus, { gain: 0.45 });
        setTimeout(() => playSampleSync("pop.mp3", sfxBus, { gain: 0.4, rate: 1.2 }), 120);
        setTimeout(() => playSampleSync("pop_cluster.mp3", sfxBus, { gain: 0.35 }), 280);
        // Bebê: soluço é normal; às vezes um pumzinho (ou escapamento)
        setTimeout(() => {
          if (Math.random() < 0.72) babyHiccup();
        }, 520);
        setTimeout(() => {
          if (Math.random() < 0.55) babyToot(family);
        }, 900);
        // fallback tonal se samples ainda não carregaram
        if (!bufferCache.get("boing.mp3")) {
          tone(400, 0.15, "sine", sfxBus, 0.2);
          setTimeout(() => tone(600, 0.15, "sine", sfxBus, 0.18), 100);
          setTimeout(() => tone(800, 0.25, "triangle", sfxBus, 0.2), 200);
        }
        break;
      }
      case "crack":
        playSampleSync("pop_click.mp3", sfxBus, { gain: 0.4, rate: 0.9 })
          || noiseBurst(sfxBus, 0.12, 0.12, 2000, "bandpass", 3);
        break;
      case "feed":
        playSampleSync("pop.mp3", sfxBus, { gain: 0.35, rate: 1.3 })
          || (() => {
            tone(320, 0.08, "sine", sfxBus, 0.12);
            setTimeout(() => tone(360, 0.1, "sine", sfxBus, 0.1), 100);
          })();
        break;
      case "drink":
        playSampleSync("sip.mp3", sfxBus, { gain: 0.45, duration: 0.8 })
          || playSampleSync("bubble.mp3", sfxBus, { gain: 0.4 })
          || noiseBurst(sfxBus, 0.2, 0.08, 900, "bandpass", 2);
        break;
      case "bath":
        playSampleSync("splash.mp3", sfxBus, { gain: 0.4, duration: 1 })
          || playSampleSync("bubbles_deep.mp3", sfxBus, { gain: 0.35, duration: 1.2 });
        break;
      case "pet":
        playSampleSync("kiss.mp3", sfxBus, { gain: 0.4 })
          || (() => {
            tone(660, 0.12, "sine", sfxBus, 0.12);
            setTimeout(() => tone(880, 0.15, "sine", sfxBus, 0.1), 100);
          })();
        break;
      case "play":
        playSampleSync("boing.mp3", sfxBus, { gain: 0.4 })
          || playSampleSync("squeak.mp3", sfxBus, { gain: 0.4 });
        break;
      case "sleep":
        playSampleSync("underwater.mp3", sfxBus, { gain: 0.25, duration: 1.2, rate: 0.7 })
          || (() => {
            tone(220, 0.4, "sine", sfxBus, 0.08, 160);
            setTimeout(() => tone(180, 0.5, "sine", sfxBus, 0.06, 120), 300);
          })();
        break;
      case "wake":
        if (VEHICLE.has(family)) {
          playSampleSync("car_start.mp3", sfxBus, { gain: 0.45, duration: 1.2 });
          setTimeout(() => babyToot(family), 400);
        } else {
          playSampleSync("sneeze.mp3", sfxBus, { gain: 0.4 })
            || playSampleSync("boing.mp3", sfxBus, { gain: 0.4 });
          if (Math.random() < 0.4) setTimeout(babyHiccup, 350);
        }
        break;
      case "heal":
        playSampleSync("boing.mp3", sfxBus, { gain: 0.35, rate: 1.2 })
          || (() => {
            tone(400, 0.12, "sine", sfxBus, 0.1);
            setTimeout(() => tone(800, 0.18, "sine", sfxBus, 0.12), 160);
          })();
        break;
      case "urgency":
        speak(speciesId, "sad", { force: true });
        break;
      case "ui":
        playSampleSync("pop_click.mp3", sfxBus, { gain: 0.25, rate: 1.4 })
          || tone(700, 0.05, "sine", sfxBus, 0.06);
        break;
      case "hiccup":
        babyHiccup();
        break;
      case "toot":
        babyToot(family);
        break;
      default:
        break;
    }
  }

  function tickNeeds(speciesId, needs) {
    if (!needs || !speciesId || muted || !unlocked) return;
    const now = performance.now();
    if (now - lastVoiceAt < 5000) return;
    const lows = ["hunger", "thirst", "love", "energy", "hygiene", "health"].filter((k) => needs[k] < 28);
    if (!lows.length) {
      // Bebê tranquilo: soluço espontâneo de vez em quando
      if (Math.random() < 0.08) {
        lastVoiceAt = now;
        babyHiccup();
      }
      return;
    }
    if (needs.health < 28) speak(speciesId, "sick", { force: true });
    else if (needs.love < 22 || needs.hunger < 22) speak(speciesId, "sad", { force: true });
    else speak(speciesId, "neutral", { force: true });
  }

  function bindUI() {
    document.documentElement.dataset.sound = muted ? "off" : "on";
    const unlockOnce = () => unlock();
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => {
      window.addEventListener(ev, unlockOnce, { once: true, passive: true });
    });
    const btn = document.getElementById("btnMute");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleMute();
      });
      btn.querySelector(".i").textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUI);
  } else {
    bindUI();
  }

  window.PixelAudio = {
    unlock,
    setMuted,
    toggleMute,
    isMuted: () => muted,
    setBiome,
    speak,
    cue,
    tickNeeds,
    babyHiccup,
    babyToot,
  };
})();
