const { test } = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("../catalog");

test("existing PIXELs and items credit Bia e Juju across every life stage", () => {
  for (const creation of [...catalog.SPECIES.filter(s => s.id !== "panda"), ...catalog.CLOSET_ITEMS.filter(i => !i.id.startsWith("intermediate_"))]) {
    assert.equal(catalog.creatorCredit(creation), "por Bia e Juju", creation.id);
  }
});

test("new generated intermediate artwork does not claim the children's authorship", () => {
  for (const item of catalog.CLOSET_ITEMS.filter(i => i.id.startsWith("intermediate_"))) {
    assert.equal(catalog.creatorCredit(item), "");
  }
});

test("approved pet creation credits Carol Oliveira and new creators have their own credit", () => {
  const panda = catalog.SPECIES.find(s => s.id === "panda");
  assert.equal(catalog.creatorCredit(panda), "por Carol Oliveira");

  catalog.CREATORS["test-artist"] = { displayName: "Nova artista" };
  try {
    assert.equal(catalog.creatorCredit({ creatorId: "test-artist" }), "por Nova artista");
    assert.equal(catalog.creatorCredit({ id: "new-pixel" }), "");
    assert.equal(catalog.creatorCredit({ creatorId: "unknown" }), "");
  } finally { delete catalog.CREATORS["test-artist"]; }
});
