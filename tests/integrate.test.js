const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const source = path.resolve(__dirname, "..");
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "pixels-integration-test-"));
  const root = path.join(base, "repo"), remote = path.join(base, "remote.git");
  fs.mkdirSync(root);
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "--bare", remote);
  git("init", "-b", "main");
  git("config", "user.email", "integration@example.test");
  git("config", "user.name", "Integration Test");
  git("config", "commit.gpgsign", "false");
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "tests"));
  fs.copyFileSync(path.join(source, "scripts/bump-app-version.js"), path.join(root, "scripts/bump-app-version.js"));
  fs.copyFileSync(path.join(source, "scripts/git-machines.json"), path.join(root, "scripts/git-machines.json"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
  fs.writeFileSync(path.join(root, "index.html"), '<span id="appVersion">V1.0.0</span><script src="game.js?v=1.0.0"></script>');
  fs.writeFileSync(path.join(root, "sw.js"), 'const CACHE = "bichinho-v1.0.0";');
  fs.writeFileSync(path.join(root, "shared.txt"), "base\n");
  fs.writeFileSync(path.join(root, "tests/check.test.js"), 'require("node:assert/strict").ok(true);');
  git("add", ".");
  git("commit", "-m", "initial");
  git("remote", "add", "origin", remote);
  git("push", "-u", "origin", "main");
  t.after(() => {
    const worktrees = git("worktree", "list", "--porcelain").split("\n")
      .filter(line => line.startsWith("worktree ")).map(line => line.slice(9));
    for (const entry of worktrees) {
      const normalized = path.resolve(entry);
      if (normalized === path.resolve(root)) continue;
      const parent = path.dirname(normalized);
      assert.equal(path.dirname(parent).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase());
      assert.ok(path.basename(parent).startsWith("pixels-integrate-"));
      git("worktree", "remove", "--force", normalized);
      fs.rmdirSync(parent);
    }
    assert.ok(path.resolve(base).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(base, { recursive: true, force: true });
  });
  const run = (...args) => spawnSync(process.execPath, ["-e",
    'require(process.argv[1]).integrate(process.argv[2], process.argv.slice(3))',
    path.join(source, "scripts/git-integrate.js"), root, ...args
  ], { cwd: root, encoding: "utf8" });
  const branch = (name, file, content) => {
    git("switch", "-c", name, "main");
    fs.writeFileSync(path.join(root, file), content);
    git("add", "."); git("commit", "-m", name);
    git("push", "origin", name);
    git("switch", "main");
  };
  return { root, git, run, branch };
}

test("integrate combines local and remote AI commits, previews, bumps once and publishes only with --push", t => {
  const { root, git, run, branch } = fixture(t);
  branch("codex-gamer", "gamer.txt", "gamer");
  branch("codex/peer", "peer.txt", "peer");
  git("branch", "-D", "codex/peer");
  git("switch", "codex-gamer");
  fs.writeFileSync(path.join(root, "local.txt"), "local commit");
  git("add", "."); git("commit", "-m", "local only"); git("switch", "main");
  const before = git("rev-parse", "HEAD");
  const preview = run("--dry-run");
  assert.equal(preview.status, 0, preview.stdout + preview.stderr);
  assert.equal(git("rev-parse", "HEAD"), before);
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const file of ["gamer.txt", "peer.txt", "local.txt"]) assert.ok(fs.existsSync(path.join(root, file)));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "package.json"))).version, "1.0.1");
  assert.equal(git("rev-parse", "origin/main"), before);
  const integrated = git("rev-parse", "HEAD");
  assert.equal(run().status, 0);
  assert.equal(git("rev-parse", "HEAD"), integrated);
  const published = run("--push");
  assert.equal(published.status, 0, published.stdout + published.stderr);
  assert.equal(git("rev-parse", "origin/main"), integrated);
});

test("conflicting AI branches leave main and origin unchanged", t => {
  const { git, run, branch } = fixture(t);
  branch("codex-gamer", "shared.txt", "gamer\n");
  branch("codex-guto", "shared.txt", "guto\n");
  const before = git("rev-parse", "HEAD");
  const result = run("--push");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Conflitos/);
  assert.equal(git("rev-parse", "HEAD"), before);
  assert.equal(git("rev-parse", "origin/main"), before);
  assert.equal(git("status", "--porcelain"), "");
});

test("failing merged tests and uncommitted files block integration", t => {
  const { root, git, run, branch } = fixture(t);
  branch("codex-gamer", "tests/failure.test.js", 'throw new Error("blocked");');
  const before = git("rev-parse", "HEAD");
  const result = run("--push");
  assert.notEqual(result.status, 0);
  assert.equal(git("rev-parse", "HEAD"), before);
  assert.equal(git("rev-parse", "origin/main"), before);
  fs.writeFileSync(path.join(root, "uncommitted.txt"), "pending");
  const dirty = run();
  assert.notEqual(dirty.status, 0);
  assert.match(dirty.stderr, /Faca commit/);
});
