/* First-party metrics and cloud saves. No IP, geolocation or user-agent stored. */
(() => {
  "use strict";
  let sessionId, ready = false, queue = [], activeMs = 0, lastTick = performance.now();
  let lastInput = performance.now(), busy = false, collectionDirty = false, collectionTimer;
  const api = async (url, method = "GET", data) => {
    const response = await fetch(`/api/${url}`, { method, credentials: "same-origin", cache: "no-store",
      headers: data ? { "Content-Type": "application/json" } : {}, body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error(`API ${response.status}`);
    return response.json();
  };
  const permitted = () => window.pixelsPlayer?.metricsConsent === true;
  function event(type, detail = {}) {
    if (!permitted()) return;
    queue.push({ id: crypto.randomUUID(), type, ...detail });
    if (queue.length > 500) queue.shift();
  }
  window.PixelsMetrics = {
    event,
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
    await api("register", "POST", { nickname: profile.nickname, consent: true });
    // A cookie proves device ownership. Never restore another player's data by nickname or local UUID.
    const cloud = await api("collection");
    let local;
    try { local = JSON.parse(localStorage.getItem("bichinho-collection-v1")); } catch (_) {}
    if ((!local?.pets?.length) && cloud.pets.length) localStorage.setItem("bichinho-collection-v1", JSON.stringify(cloud));
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
      const batch = queue.slice(0, 100);
      await api("activity", "POST", { sessionId, activeMs: Math.floor(activeMs), events: batch });
      queue.splice(0, batch.length);
      if (collectionDirty) {
        const value = localStorage.getItem("bichinho-collection-v1");
        if (value) {
          await api("collection", "PUT", JSON.parse(value));
          collectionDirty = value !== localStorage.getItem("bichinho-collection-v1");
        }
      }
    } catch (_) { /* Offline: retain unsent events in memory and retry while the page remains open. */ }
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, activeMs: Math.floor(activeMs), events: queue.slice(0, 100) }) }).catch(() => {});
    const value = localStorage.getItem("bichinho-collection-v1");
    if (collectionDirty && value && new Blob([value]).size < 40000) {
      fetch("/api/collection", { method: "PUT", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: value }).catch(() => {});
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
