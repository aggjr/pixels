const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

test("cloud saves merge into the selected profile and every request carries its server owner", async () => {
  const localPet = { id: "local-pet", outfit: { hat: "hat_bow_pink" } };
  const cloudPet = { id: "cloud-pet", outfit: { held: "bag_mint_3d" } };
  const key = "bichinho-collection-v1:profile-bia";
  const otherKey = "bichinho-collection-v1:profile-juju";
  const other = JSON.stringify({ pets: [{ id: "juju-pet" }] });
  const storage = new Map([[key, JSON.stringify({ pets: [localPet], activePetId: localPet.id })], [otherKey, other]]);
  const calls = [];
  const window = { pixelsPlayer: { id: "profile-bia", nickname: "Bia", metricsConsent: true },
    pixelsProfileReady: Promise.resolve(), pixelsStorageKey: name => `${name}:profile-bia`, addEventListener() {} };
  const context = { window, document: { addEventListener() {}, visibilityState: "visible" },
    crypto: webcrypto, performance: { now: () => 0 }, AbortSignal, Blob,
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    localStorage: { getItem: name => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value) },
    fetch: async (url, options) => {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, options, body });
      let value = { ok: true };
      if (url === "/api/register") value = { id: "server-bia", deviceId: "device-1" };
      if (url === "/api/collection" && options.method === "GET") value = { pets: [cloudPet], activePetId: cloudPet.id };
      if (url === "/api/sessions") value = { id: "session-bia" };
      return { ok: true, json: async () => value };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "telemetry.js"), "utf8"), context);
  await window.pixelsCloudReady;
  const merged = JSON.parse(storage.get(key));
  assert.equal(merged.activePetId, localPet.id);
  assert.deepEqual(merged.pets, [cloudPet, localPet]);
  assert.equal(storage.get(otherKey), other);
  await window.PixelsMetrics.flushCollection();
  const save = calls.find(call => call.url === "/api/collection" && call.options.method === "PUT");
  assert.deepEqual(save.body.pets, [cloudPet, localPet]);
  assert.equal(save.options.headers["X-Pixels-Player"], "server-bia");
  const register = calls.find(call => call.url === "/api/register");
  assert.equal(register.body.profileId, "profile-bia");
  assert.ok(calls.filter(call => call.url !== "/api/register").every(call => call.options.headers["X-Pixels-Player"] === "server-bia"));
});
