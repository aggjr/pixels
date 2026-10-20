const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const hooks = `
  window.PixelsCareAudit = {
    state, el, press, care, chaseToy, renderActor, applyPetSnapshot, skit,
    load(species, variant, stage, outfit = {}) {
      clearStageCareProps(); stopMove();
      Object.assign(state, { phase:'pet', species, variant:variant==='default'?null:variant, stage,
        name:'Auditoria', nameChosen:true, petId:'audit', naming:false, sleeping:false, busy:false,
        playing:false, sleepRequested:false, pose:null, careFrame:null, preview:{period:'day'}, audience:'both',
        outfit:{...emptyOutfit(),...outfit}, actorOff:{x:0,y:0}, activeToyId:null,
        mood:'neutral', moodLock:0, lackMs:0, strongTraits:[],
        growthIntervalMs:100000, lastGrowth:performance.now()-75000,
        needs:{hunger:50,thirst:50,hygiene:50,love:50,energy:60,health:65},
        over:{hunger:0,thirst:0,hygiene:0,love:0,energy:0,health:0} });
      el.app.dataset.phase='pet'; el.app.classList.remove('playing');
      if(el.toy)el.toy.hidden=true;
      renderActor();renderHeader();renderNeeds();renderGrowth();enablePetUI();
      el.app.removeAttribute('data-loading');
    }
  }; return;
`;
let code = fs.readFileSync(path.join(root,'game.js'),'utf8').replaceAll('\r\n','\n');
code = code.replace('  resizeFx();\n  ["egg"', hooks+'\n  resizeFx();\n  ["egg"');
if (!code.includes('window.PixelsCareAudit =')) throw Error('audit hook insertion failed');
code = code.replaceAll('setTimeout(', 'window.auditTimeout(');
code = code.replace('  function playMove(cls, ms) {', '  function playMove(cls, ms) { window.auditMoves.push(cls);');
const script = fs.readFileSync(path.join(__dirname,'audit-care-runner.js'),'utf8');
const bootstrap = `<script>window.auditMoves=[];window.auditTimeout=(fn,ms,...args)=>setTimeout(fn,ms*.01,...args);window.pixelsPlayer={id:'audit',nickname:'Auditoria',metricsConsent:false};window.pixelsStorageKey=k=>k+':audit';window.pixelsProfileReady=Promise.resolve();window.pixelsCloudReady=Promise.resolve();</script>`;
let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
html = html.replace(/<script src="(?:player|telemetry|audio)\.js[^\"]*"><\/script>/g,'');
html = html.replace(/<script src="game\.js[^\"]*"><\/script>/, bootstrap+'<script src="/audit-game.js"></script><script src="/run-care-audit.js"></script>');
html = html.replace('<body>', '<body><aside style="position:fixed;top:8px;left:8px;z-index:1000;background:white;color:black;padding:12px;max-width:300px"><button id="runAudit">Executar revisao</button><p id="auditStatus">Pronto para revisar</p><pre id="auditSummary"></pre></aside>');
http.createServer(async(req,res)=>{
  if(req.url==='/audit-results'&&req.method==='POST'){
    const chunks=[];for await(const c of req)chunks.push(c);
    const data=JSON.parse(Buffer.concat(chunks));
    fs.writeFileSync(path.join(root,'docs','qa','care-actions.json'),JSON.stringify(data,null,2)+'\n');
    res.end('saved');return;
  }
  const name = decodeURIComponent(req.url.split('?')[0]);
  let data,type;
  if(name==='/'){data=html;type='text/html';}
  else if(name==='/audit-game.js'){data=code;type='application/javascript';}
  else if(name==='/run-care-audit.js'){data=script;type='application/javascript';}
  else {
    const allowed = /^\/assets\/[a-zA-Z0-9_./-]+$/.test(name) || ['/catalog.js','/wardrobe.js','/looks.js','/styles.css','/manifest.webmanifest','/sw.js'].includes(name);
    if (!allowed || name.split('/').some(part => part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    data=fs.readFileSync(file);type=({'.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream';
  }
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
}).listen(3081,'127.0.0.1',()=>console.log('care audit http://localhost:3081'));
