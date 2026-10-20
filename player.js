/* Device profile. Cloud saves and metrics require the responsible adult's opt-in. */
(() => {
  "use strict";

  const KEY = "pixels-player-v1";
  const welcome = document.getElementById("playerWelcome");
  const form = document.getElementById("playerForm");
  const input = document.getElementById("playerNickname");
  const error = document.getElementById("playerError");
  const consent = document.getElementById("playerMetricsConsent");
  const app = document.getElementById("app");
  const profileList = document.getElementById("playerProfiles");
  const switchButton = document.getElementById("btnProfiles");
  const cancelButton = document.getElementById("playerCancel");
  const PROFILES_KEY = "pixels-profiles-v1";
  let profiles = [];
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILES_KEY));
    if (Array.isArray(stored)) profiles = stored.filter(p => p && typeof p.nickname === "string" && typeof p.id === "string");
  } catch (_) {}
  const cleanNickname = (value) => typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\s+/g, " ").trim()
    : "";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function newId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY));
  } catch (_) { /* A missing or unreadable profile opens the welcome screen. */ }
  const nickname = cleanNickname(saved?.nickname);
  const valid = saved?.version === 2 && typeof saved.metricsConsent === "boolean" && uuidPattern.test(saved?.id)
    && nickname.length > 0 && nickname.length <= 30
    && typeof saved?.createdAt === "string" && Number.isFinite(Date.parse(saved.createdAt));

  window.pixelsProfileReady = new Promise((resolve) => {
    let switching = false;
    function remember(profile) {
      profiles = profiles.filter(p => p.id !== profile.id);
      profiles.push(profile);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      localStorage.setItem(KEY, JSON.stringify(profile));
    }
    function finish(profile) {
      // Only the original owner receives the old shared local save.
      const owner = localStorage.getItem("pixels-legacy-owner-v1");
      if (!owner) {
        for (const key of ["bichinho-collection-v1", "bichinho-audience", "bichinho-hatch-bag", "pixels-ecosystem-v1"]) {
          const old = localStorage.getItem(key);
          if (old !== null && localStorage.getItem(`${key}:${profile.id}`) === null) localStorage.setItem(`${key}:${profile.id}`, old);
        }
        localStorage.setItem("pixels-legacy-owner-v1", profile.id);
      }
      remember(profile);
      window.pixelsStorageKey = (key) => `${key}:${profile.id}`;
      window.pixelsPlayer = Object.freeze(profile);
      if (switchButton) switchButton.textContent = `${profile.nickname} · Trocar jogador`;
      welcome.hidden = true;
      app.inert = false;
      resolve(window.pixelsPlayer);
    }

    async function select(profile) {
      if (switching) return;
      if (!window.pixelsPlayer) { finish(profile); return; }
      switching = true;
      try {
        await window.PixelsMetrics?.flushCollection?.();
        remember(profile);
        window.location.reload();
      } catch (_) {
        switching = false;
        error.textContent = "Não foi possível trocar de jogador. Tente novamente.";
      }
    }
    function renderProfiles() {
      if (!profileList) return;
      profileList.replaceChildren();
      for (const profile of profiles) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = profile.nickname;
        button.addEventListener("click", () => select(profile));
        profileList.appendChild(button);
      }
    }
    async function showPicker() {
      app.inert = true;
      welcome.hidden = false;
      input.value = "";
      consent.checked = false;
      if (cancelButton) cancelButton.hidden = !window.pixelsPlayer;
      renderProfiles();
      input.focus();
      // The secret device cookie authorizes this list, never a typed name or UUID.
      if (typeof fetch === "function") {
        try {
          const response = await fetch("/api/profiles", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(8000) });
          if (!response.ok) return;
          const data = await response.json();
          for (const remote of data.profiles) {
            const id = remote.profileId || remote.id;
            if (!profiles.some(p => p.id === id || p.nickname.normalize("NFKC").toLocaleLowerCase("pt-BR") === remote.nickname.normalize("NFKC").toLocaleLowerCase("pt-BR"))) profiles.push({ version: 2, id, nickname: remote.nickname,
              createdAt: new Date(remote.createdAt).toISOString(), metricsConsent: true });
          }
          localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
          renderProfiles();
        } catch (_) { /* Local profiles remain available offline. */ }
      }
    }
    switchButton?.addEventListener("click", showPicker);
    cancelButton?.addEventListener("click", () => { welcome.hidden = true; app.inert = false; });

    if (valid) {
      finish({ version: 2, id: saved.id, nickname, createdAt: saved.createdAt, metricsConsent: saved.metricsConsent });
    } else {
      showPicker();
      if (nickname) input.value = nickname.slice(0, 30);
    }
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      error.textContent = "";
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = cleanNickname(input.value);
      if (!name || name.length > 30) {
        input.setCustomValidity("Escolha um apelido de até 30 caracteres.");
        input.reportValidity();
        return;
      }
      try {
        const existing = profiles.find(p => p.nickname.normalize("NFKC").toLocaleLowerCase("pt-BR") === name.normalize("NFKC").toLocaleLowerCase("pt-BR"));
        const legacy = !valid && nickname === name && uuidPattern.test(saved?.id) ? saved : null;
        const profile = existing || { version: 2, id: legacy?.id || newId(), nickname: name,
          createdAt: legacy?.createdAt || new Date().toISOString(), metricsConsent: consent.checked };
        if (window.pixelsPlayer) select(profile);
        else finish(profile);
      } catch (_) {
        error.textContent = "Não foi possível salvar seu apelido. Libere o armazenamento deste navegador e tente novamente.";
      }
    });
  });
})();
