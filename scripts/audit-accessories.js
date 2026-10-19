const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const catalog = require('../catalog');
const rig = require('../wardrobe');
const review = require('../docs/qa/accessory-review.json');
const root = path.resolve(__dirname, '..');
const rows = [], errors = [], hashes = {};
const exists = relative => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) { errors.push('Missing ' + relative); return false; }
  if (!hashes[relative]) hashes[relative] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return true;
};
for (const species of catalog.SPECIES.filter(s => s.ready)) {
  for (const variant of Object.keys(species.variants || { default: {} })) {
    for (let stage = 1; stage <= 4; stage++) {
      const sprite = catalog.spriteArt(species, stage, variant);
      exists(sprite);
      const anchors = rig.anchorsFor({ species, variant, stage }, catalog.SPECIES_ANCHORS);
      for (const item of catalog.CLOSET_ITEMS.filter(i => i.slot && rig.compatible(species.id, i))) {
        exists(item.art);
        const group = review.groups.find(g => g.items.includes(item.id));
        if (!group) errors.push('Unreviewed item ' + item.id);
        const mounts = item.completeLook ? [] : rig.mounts(species, stage, anchors, item);
        if (!item.completeLook && (!mounts.length || mounts.some(m => m.length !== 5 || !m.every(Number.isFinite)))) errors.push('Invalid mounts ' + species.id + '/' + stage + '/' + item.id);
        rows.push({ species: species.id, variant, stage, sprite, item: item.id, mounts, visualStatus: group?.status || 'unreviewed', evidence: 'accessories/' + item.id + '.png' });
      }
    }
  }
}
for (const item of catalog.CLOSET_ITEMS) if (!review.groups.some(g => g.items.includes(item.id))) errors.push('Unreviewed catalog item ' + item.id);
const captures = JSON.parse(fs.readFileSync(path.join(root, 'docs/qa/browser-capture.json'), 'utf8'));
for (const item of catalog.CLOSET_ITEMS.filter(i => i.slot)) {
  const expected = rows.filter(r => r.item === item.id).length;
  const capture = captures.find(c => c.id === item.id);
  if (!capture || capture.cards !== expected || capture.broken || capture.missingFits) errors.push('Incomplete browser coverage: ' + item.id);
  if (!fs.existsSync(path.join(root, 'docs/qa/accessories', item.id + '.png'))) errors.push('Missing screenshot: ' + item.id);
}
for (const file of ['catalog.js', 'wardrobe.js', 'game.js', 'styles.css', 'looks.js']) exists(file);
const result = {
  schema: 1, date: review.date, scope: 'Static wearable fits; toys separately reviewed as inventory art',
  appearancesAndStages: 120, separateFits: rows.filter(r => r.item !== 'look_lili_complete').length,
  completeLookFits: rows.filter(r => r.item === 'look_lili_complete').length,
  technicalErrors: errors,
  releaseReady: errors.length === 0 && review.groups.every(g => g.status === 'approved') && review.source_issues.every(i => i.status === 'closed'),
  sourceHashes: hashes, combinations: rows,
};
fs.writeFileSync(path.join(root, 'docs/qa/accessory-matrix.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ separateFits: result.separateFits, completeLookFits: result.completeLookFits, technicalErrors: errors, releaseReady: result.releaseReady }, null, 2));
if (errors.length || (process.argv.includes('--release') && !result.releaseReady)) process.exitCode = 1;
