"""Read-only image analysis. Writes metadata, never edits image pixels."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import numpy as np

root = Path(__file__).resolve().parent.parent
rows = []
for path in sorted((root / 'assets').rglob('*')):
    if path.suffix.lower() not in ('.png', '.webp'):
        continue
    relative = path.relative_to(root).as_posix()
    row = {'path': relative, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    directory = path.parent.relative_to(root / 'assets').as_posix()
    if directory == 'pets':
        stem = path.stem
        key = '_'.join(stem.split('_')[:2]) if stem.startswith('slime_') else stem.split('_')[0].split('-')[0]
        row['group'] = 'pets/' + key
    else:
        row['group'] = directory if directory != '.' else 'source-exports'
    try:
        with Image.open(path) as image:
            image.load()
            row.update(width=image.width, height=image.height, mode=image.mode)
            rgba = np.asarray(image.convert('RGBA'))
            r, g, b, alpha = (rgba[:, :, i] for i in range(4))
            magenta = (r > 140) & (b > 90) & (g < 85) & (alpha > 96)
            border = np.zeros(alpha.shape, dtype=bool)
            border[:8, :] = border[-8:, :] = True
            border[:, :8] = border[:, -8:] = True
            row.update(transparentFraction=round(float((alpha < 16).mean()), 4),
                       magentaPixels=int(magenta.sum()),
                       magentaBorderPixels=int((magenta & border).sum()),
                       empty=bool(alpha.max() == 0))
            row['reviewFlags'] = []
            if path.stem.startswith('slime_green_') and row['magentaPixels'] > 200:
                row['reviewFlags'].append('magenta_contamination')
            if row['empty']:
                row['reviewFlags'].append('empty_image')
            row['decoded'] = True
    except Exception as error:
        row.update(decoded=False, error=str(error), reviewFlags=['decode_error'])
    rows.append(row)
output = {'date': '2026-10-20', 'count': len(rows), 'files': rows}
target = root / 'docs/qa/image-inventory.json'
target.write_text(json.dumps(output, indent=2) + '\n', encoding='utf8')
print(json.dumps({'images': len(rows), 'decodeErrors': sum(not r['decoded'] for r in rows),
                  'flagged': [r['path'] for r in rows if r['reviewFlags']]}, indent=2))
