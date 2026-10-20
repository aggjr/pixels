const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const htmlPath = path.join(root, "index.html");
const swPath = path.join(root, "sw.js");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !/^--version=\d+\.\d+\.\d+$/.test(args[0]))) {
  throw new Error("Uso: npm run bump -- [--version=0.1.65]");
}
const parts = pkg.version.split(".").map(Number);
parts[2] = (parts[2] || 0) + 1;
pkg.version = args[0] ? args[0].slice("--version=".length) : parts.join(".");
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const label = `V${pkg.version}`;
let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/((?:styles\.css|game\.js|looks\.js|catalog\.js|wardrobe\.js|player\.js|telemetry\.js|audio\.js)\?v=)[\d.]+/g, `$1${pkg.version}`);
html = html.replace(
  /(<span id="appVersion">)V[\d.]+(<\/span>)/,
  `$1${label}$2`
);
fs.writeFileSync(htmlPath, html);

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, "utf8");
  sw = sw.replace(/const CACHE = "bichinho-v[\d.]+"/, `const CACHE = "bichinho-v${pkg.version}"`);
  fs.writeFileSync(swPath, sw);
}

console.log(label);
