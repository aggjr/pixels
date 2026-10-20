const { test } = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("../catalog");

test("existing PIXELs and items credit Bia e Juju across every life stage", () => {
  for (const creation of [...catalog.SPECIES, ...catalog.CLOSET_ITEMS]) {
    assert.equal(catalog.creatorCredit(creation), "por Bia e Juju", creation.id);
  }
});

test("new creators have their own credit and unknown submissions inherit no author", () => {
  catalog.CREATORS["test-artist"] = { displayName: "Nova artista" };
  try {
    assert.equal(catalog.creatorCredit({ creatorId: "test-artist" }), "por Nova artista");
    assert.equal(catalog.creatorCredit({ id: "new-pixel" }), "");
    assert.equal(catalog.creatorCredit({ creatorId: "unknown" }), "");
  } finally { delete catalog.CREATORS["test-artist"]; }
});
