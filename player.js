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
    function finish(profile) {
      window.pixelsPlayer = Object.freeze(profile);
      welcome.hidden = true;
      app.inert = false;
      resolve(window.pixelsPlayer);
    }

    if (valid) {
      finish({ version: 2, id: saved.id, nickname, createdAt: saved.createdAt, metricsConsent: saved.metricsConsent });
      return;
    }

    app.inert = true;
    welcome.hidden = false;
    input.focus();
    if (nickname) input.value = nickname.slice(0, 30);
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
        const profile = { version: 2, id: uuidPattern.test(saved?.id) ? saved.id : newId(), nickname: name,
          createdAt: saved?.createdAt || new Date().toISOString(), metricsConsent: consent.checked };
        localStorage.setItem(KEY, JSON.stringify(profile));
        finish(profile);
      } catch (_) {
        error.textContent = "Não foi possível salvar seu apelido. Libere o armazenamento deste navegador e tente novamente.";
      }
    });
  });
})();
