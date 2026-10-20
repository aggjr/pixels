/* First-party metrics and cloud saves. No IP, geolocation or user-agent stored. */
(() => {
  "use strict";
  let sessionId, serverPlayerId, ready = false, queue = [], activeMs = 0, lastTick = performance.now();
  let lastInput = performance.now(), busy = false, collectionDirty = false, collectionTimer;
  const api = async (url, method = "GET", data) => {
    const response = await fetch(`/api/${url}`, { method, credentials: "same-origin", cache: "no-store",
      headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(serverPlayerId ? { "X-Pixels-Player": serverPlayerId } : {}) }, body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Object.assign(Error(`API ${response.status}`), { status: response.status });
    return response.json();
  };
  const permitted = () => window.pixelsPlayer?.metricsConsent === true;
  const collectionKey = () => window.pixelsStorageKey?.("bichinho-collection-v1") || "bichinho-collection-v1";
  function event(type, detail = {}) {
    if (!permitted()) return;
    queue.push({ id: crypto.randomUUID(), type, ...detail });
    if (queue.length > 500) queue.shift();
  }
  window.PixelsMetrics = {
    event,
    flushCollection: flush,
    collectionChanged() {
      collectionDirty = true;
      clearTimeout(collectionTimer);
      collectionTimer = setTimeout(flush, 2000);
    },
  };
  for (const name of ["pointerdown", "keydown", "touchstart"]) document.addEventListener(name, () => { lastInput = performance.now(); }, { passive: true });
  async function connect() {
    if (!permitted() || ready) return;
    const profile = window.pixelsPlayer;
    const registered = await api("register", "POST", { nickname: profile.nickname, profileId: profile.id, consent: true });
    serverPlayerId = registered.id;
    // A cookie proves device ownership. Never restore another player's data by nickname or local UUID.
    const cloud = await api("collection");
    let local;
    try { local = JSON.parse(localStorage.getItem(collectionKey())); } catch (_) {}
    const pets = new Map((cloud.pets || []).map(pet => [pet.id, pet]));
    for (const pet of local?.pets || []) pets.set(pet.id, pet);
    if (pets.size) {
      const activePetId = pets.has(local?.activePetId) ? local.activePetId : cloud.activePetId;
      localStorage.setItem(collectionKey(), JSON.stringify({ version: 1, activePetId, pets: [...pets.values()] }));
    }
    collectionDirty = true;
    sessionId = (await api("sessions", "POST", {})).id;
    ready = true;
  }
  async function flush() {
    if (busy || !permitted()) return;
    busy = true;
    try {
      if (!ready) await connect();
      if (!ready) return;
      if (collectionDirty) {
        const value = localStorage.getItem(collectionKey());
        if (value) {
          await api("collection", "PUT", JSON.parse(value));
          collectionDirty = value !== localStorage.getItem(collectionKey());
        }
      }
      const batch = queue.slice(0, 100);
      await api("activity", "POST", { sessionId, activeMs: Math.floor(activeMs), events: batch });
      queue.splice(0, batch.length);
    } catch (error) {
      if (error.status === 401) { ready = false; serverPlayerId = undefined; }
      // Offline: keep local saves and retry on reconnection.
    }
    finally { busy = false; }
  }
  function accountTime() {
    const now = performance.now();
    if (document.visibilityState === "visible" && now - lastInput < 60000 && permitted()) activeMs += Math.min(2000, now - lastTick);
    lastTick = now;
  }
  document.addEventListener("visibilitychange", () => { accountTime(); flush(); });
  window.addEventListener("online", flush);
  window.addEventListener("pagehide", () => {
    accountTime();
    if (!ready || !permitted()) return;
    // Keepalive sends the final cumulative duration. Repeated events are deduplicated by ID.
    fetch("/api/activity", { method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json", "X-Pixels-Player": serverPlayerId },
      body: JSON.stringify({ sessionId, activeMs: Math.floor(activeMs), events: queue.slice(0, 100) }) }).catch(() => {});
    const value = localStorage.getItem(collectionKey());
    if (collectionDirty && value && new Blob([value]).size < 40000) {
      fetch("/api/collection", { method: "PUT", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json", "X-Pixels-Player": serverPlayerId }, body: value }).catch(() => {});
    }
  });
  window.pixelsCloudReady = window.pixelsProfileReady.then(async () => {
    if (!permitted()) return;
    try { await connect(); } catch (_) { /* Play locally if the server is unavailable. */ }
    lastTick = performance.now();
    lastInput = performance.now();
    setInterval(accountTime, 1000);
    setInterval(flush, 15000);
  });
})();
