// Local inspection only. No production endpoint or player data access.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  const relative = route === '/' ? 'scripts/wardrobe-audit.html' : route.slice(1);
  if (!['catalog.js', 'wardrobe.js', 'scripts/wardrobe-audit.html'].includes(relative) && !/^assets\/[a-zA-Z0-9_./-]+\.(png|webp)$/.test(relative)) { res.writeHead(404); return res.end(); }
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png'})[path.extname(file)]);
    res.end(data);
  });
}).listen(5192, '127.0.0.1', () => console.log('Wardrobe audit: http://127.0.0.1:5192'));
