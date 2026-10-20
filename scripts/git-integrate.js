// Adapted from CO-CEO scripts/git-publish-to-main.ps1 for PIXELS.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function integrate(root, args = []) {
  if (args.some(arg => !["--push", "--dry-run"].includes(arg))) {
    throw new Error("Uso: npm run git:integrate -- [--dry-run | --push]");
  }
  if (args.includes("--push") && args.includes("--dry-run")) {
    throw new Error("Use --push ou --dry-run, separadamente.");
  }
  const git = (argv, cwd = root) => execFileSync("git", argv, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  const config = JSON.parse(fs.readFileSync(path.join(root, "scripts/git-machines.json"), "utf8"));
  const main = config.integrationBranch;
  if (main !== "main") throw new Error("A branch de integracao do PIXELS deve ser main.");
  const cleanMain = () => {
    if (git(["branch", "--show-current"]) !== main) throw new Error("Execute na branch main.");
    if (git(["status", "--porcelain"])) throw new Error("Faca commit das alteracoes antes de integrar (incluindo arquivos novos).");
  };
  cleanMain();
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "rebase-merge", "rebase-apply"]) {
    if (fs.existsSync(path.resolve(root, git(["rev-parse", "--git-path", marker])))) {
      throw new Error("Finalize a operacao Git pendente antes de integrar.");
    }
  }
  console.log("Atualizando branches do origin...");
  git(["fetch", "--prune", "origin"]);
  const start = git(["rev-parse", "HEAD"]);
  const remoteMain = git(["rev-parse", `refs/remotes/origin/${main}`]);
  const names = new Set(config.machineBranches);
  const prefixes = config.machineBranchPrefixes || [];
  const refs = git(["for-each-ref", "--format=%(refname)", "refs/heads/", "refs/remotes/origin/"])
    .split("\n").filter(ref => {
      const name = ref.replace(/^refs\/(?:heads\/|remotes\/origin\/)/, "");
      return name !== main && name !== "HEAD" && (names.has(name) || prefixes.some(prefix => name.startsWith(prefix)));
    }).sort();
  // Freeze commit IDs so another agent cannot change a branch during validation.
  const candidates = [{ ref: `origin/${main}`, sha: remoteMain }, ...refs.map(ref => ({ ref, sha: git(["rev-parse", ref]) }))];
  const pending = candidates.filter(({ sha }) => git(["rev-list", "--count", `${start}..${sha}`]) !== "0");
  const unpublished = git(["rev-list", "--count", `${remoteMain}..${start}`]) !== "0";
  const alreadyReleased = /^chore\(release\): V\d+\.\d+\.\d+ - integracao main$/.test(
    git(["log", "-1", "--format=%s", start])
  );
  const releaseMain = unpublished && !alreadyReleased;
  for (const { ref, sha } of pending) console.log(`Integrar ${ref}: ${sha.slice(0, 12)}`);
  if (releaseMain) console.log("Preparando versao dos commits novos feitos diretamente em main.");
  if (!pending.length && !releaseMain) {
    console.log("main ja contem todos os commits das branches configuradas.");
    if (args.includes("--push")) git(["push", "origin", `${main}:${main}`]);
    return;
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pixels-integrate-"));
  const checkout = path.join(temp, "checkout");
  let added = false;
  let complete = false;
  try {
    git(["worktree", "add", "--detach", checkout, start]);
    added = true;
    const merge = (sha, ref) => {
      try {
        git(["merge", "--no-edit", "-m", `merge(main): integrar ${ref}`, sha], checkout);
      } catch (error) {
        const conflicts = git(["diff", "--name-only", "--diff-filter=U"], checkout);
        throw new Error(`Falha ao integrar ${ref}. ${conflicts ? `Conflitos:\n${conflicts}` : error.message}`);
      }
    };
    for (const { ref, sha } of pending) merge(sha, ref);
    // A branch with an older version must never lower the published version.
    const versions = [start, ...candidates.map(({ sha }) => sha)].map(sha =>
      JSON.parse(git(["show", `${sha}:package.json`])).version
    );
    if (versions.some(version => !/^\d+\.\d+\.\d+$/.test(version))) throw new Error("Versao invalida em uma das branches.");
    versions.sort((a, b) => {
      const left = a.split(".").map(Number), right = b.split(".").map(Number);
      return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
    });
    const pkgPath = path.join(checkout, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.version = versions.at(-1);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    execFileSync(process.execPath, ["scripts/bump-app-version.js"], { cwd: checkout, stdio: "inherit" });
    const version = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
    const html = fs.readFileSync(path.join(checkout, "index.html"), "utf8");
    const sw = fs.readFileSync(path.join(checkout, "sw.js"), "utf8");
    const assetVersions = [...html.matchAll(/(?:src|href)="[^"?]+\.(?:js|css)\?v=([^"&]+)/g)];
    if (!html.includes(`<span id="appVersion">V${version}</span>`) ||
        !sw.includes(`const CACHE = "bichinho-v${version}"`) ||
        !assetVersions.length || assetVersions.some(match => match[1] !== version)) {
      throw new Error("Versao divergente entre package.json, jogo, assets ou cache offline.");
    }
    console.log("Validando o codigo integrado...");
    const testEnv = { ...process.env };
    delete testEnv.NODE_TEST_CONTEXT;
    execFileSync(process.execPath, ["--test", "tests/*.test.js"], { cwd: checkout, stdio: "inherit", env: testEnv });
    git(["add", "package.json", "index.html", "sw.js"], checkout);
    git(["commit", "-m", `chore(release): V${version} - integracao main`], checkout);
    const result = git(["rev-parse", "HEAD"], checkout);
    if (args.includes("--dry-run")) {
      console.log(`Simulacao validada: V${version}. main e origin preservados.`);
    } else {
      cleanMain();
      if (git(["rev-parse", "HEAD"]) !== start) throw new Error("main mudou durante a integracao. Execute novamente.");
      git(["merge", "--ff-only", result]);
      console.log(`main integrada: V${version} (${result.slice(0, 12)}).`);
      if (args.includes("--push")) {
        git(["push", "origin", `${main}:${main}`]);
        console.log("main publicada no GitHub. Confira o deploy e /healthz no EasyPanel.");
      } else {
        console.log("Para publicar: git push origin main");
      }
    }
    complete = true;
  } finally {
    if (added && complete) git(["worktree", "remove", checkout]);
    if (!added || complete) fs.rmdirSync(temp);
    else console.error(`Integracao interrompida; main preserva as alteracoes locais. Diagnostico em: ${checkout}`);
  }
}

if (require.main === module) {
  try { integrate(path.resolve(__dirname, ".."), process.argv.slice(2)); }
  catch (error) {
    console.error(error.stderr?.toString() || error.message);
    process.exitCode = 1;
  }
}
module.exports = { integrate };
