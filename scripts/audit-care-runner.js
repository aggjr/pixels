(async()=>{
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  while(!window.PixelsCareAudit)await pause(10);
  document.querySelector('#playerWelcome').hidden=true;
  const audit=window.PixelsCareAudit;
  const results=[];
  const button=document.querySelector('#runAudit');
  button.onclick=async()=>{
    button.disabled=true;
    const check=(condition,message)=>{if(!condition)throw Error(message)};
    const checkImages=async()=>{
      for(const image of [audit.el.actorImg,...document.querySelectorAll('.wear:not([hidden]) img'),audit.el.groundBowlImg]){
        if(!image?.getAttribute('src'))continue;
        await image.decode();check(image.naturalWidth>0,'imagem vazia '+image.src);
      }
    };
    const run=async(species,variant,stage,outfit={})=>{
      const record={species:species.id,variant,stage,outfit,actions:[]};
      results.push(record);
      for(const action of ['feed','drink','bath','pet','sleep','wake','play','heal']){
        audit.load(species,variant,stage,outfit);
        audit.state.naming=false;
        const entry={action,pass:false};record.actions.push(entry);
        window.auditMoves=[];
        try{
          await checkImages();
          const before={...audit.state.needs};
          if(action==='wake')await audit.press('6');
          const key={feed:'2',drink:'3',bath:'4',pet:'5',sleep:'6',wake:'1'}[action];
          if(key)await audit.press(key);else await audit.care(action);
          await checkImages();
          entry.art=audit.el.actorImg.getAttribute('src');
          entry.moves=[...window.auditMoves];
          const s=audit.state;
          const needs={feed:'hunger',drink:'thirst',bath:'hygiene',pet:'love',heal:'health'};
          if(needs[action])check(s.needs[needs[action]]>before[needs[action]],'necessidade nao melhorou');
          if(action==='feed'){check(entry.moves.includes('eat-ground-bobs'),'faltou mastigacao');check(audit.el.stageGroundProp.hidden,'prato ficou na tela');}
          if(action==='drink'){check(entry.moves.includes('drink-ground-laps'),'faltou beber');check(audit.el.stageGroundProp.hidden,'tigela ficou na tela');}
          if(action==='bath'){check(entry.moves.includes('bath-shake'),'faltou secar');check(audit.el.bathFoamLayer.hidden,'espuma ficou na tela');}
          if(action==='pet')check(entry.moves.includes('pet-nuzzle'),'faltou carinho');
          if(action==='sleep'){
            check(s.sleeping,'nao dormiu');check(/sleep|bat-roost/.test(entry.art),'imagem acordada durante sono');
            const sleepingArt=entry.art;
            for(const blocked of ['feed','drink','bath','pet','play','heal'])await audit.care(blocked);
            check(audit.el.actorImg.getAttribute('src')===sleepingArt,'cuidado trocou arte dormindo');
            check(!s.playing,'brincadeira ativa durante sono');
          }
          if(action==='wake'){check(!s.sleeping,'nao acordou');check(!/sleep|bat-roost/.test(entry.art),'imagem dormindo apos acordar');}
          if(action==='play'){
            check(s.playing,'nao iniciou brincadeira');check(!audit.el.toy.hidden,'brinquedo invisivel');
            const energy=s.needs.energy;
            audit.chaseToy(.5);
            check(s.needs.energy<energy,'brincadeira nao consumiu energia');
            check(/translate/.test(audit.el.actorMove.style.transform),'pixel nao correu');
            const matrix=new DOMMatrixReadOnly(getComputedStyle(audit.el.actorMove).transform);
            check(Math.abs(matrix.e-s.actorOff.x)<1 && Math.abs(matrix.f-s.actorOff.y)<1,'animacao antiga bloqueou corrida');
            await audit.care('play');check(!s.playing&&audit.el.toy.hidden,'nao encerrou brincadeira');
            s.needs.energy=0;await audit.care('play');check(!s.playing,'brincou sem energia');
            s.needs.energy=60;s.needs.health=10;await audit.care('play');check(!s.playing,'brincou doente');
          }
          check(!s.busy,'cuidado ficou travado');
          if(needs[action]){
            s.needs[needs[action]]=100;
            const moves=window.auditMoves.length;
            if(key)await audit.press(key);else await audit.care(action);
            check(s.needs[needs[action]]===100,'cuidado ultrapassou limite');
            check(window.auditMoves.length===moves,'cuidado excessivo iniciou movimento');
          }
          entry.pass=true;
        }catch(error){entry.error=error.message;}
        await pause(32);
      }
      const transition={action:'feed-play-sleep-wake',pass:false};record.actions.push(transition);
      try{
        audit.load(species,variant,stage,outfit);
        await audit.press('2');await audit.care('play');audit.chaseToy(.5);
        const matrix=new DOMMatrixReadOnly(getComputedStyle(audit.el.actorMove).transform);
        check(Math.abs(matrix.e-audit.state.actorOff.x)<1&&Math.abs(matrix.f-audit.state.actorOff.y)<1,'alimentacao bloqueou movimento seguinte');
        await audit.press('6');check(audit.state.sleeping&&!audit.state.playing&&audit.el.toy.hidden,'sono nao encerrou brincadeira');
        check(/sleep|bat-roost/.test(audit.el.actorImg.getAttribute('src')),'sono apos brincar usa arte acordada');
        await audit.press('1');check(!audit.state.sleeping,'nao acordou depois de brincar e dormir');
        transition.pass=true;
      }catch(error){transition.error=error.message;}
      const restored={action:'restore-sleeping',pass:false};record.actions.push(restored);
      try{
        audit.applyPetSnapshot({id:'audit',speciesId:species.id,variant:variant==='default'?null:variant,stage,
          name:'Auditoria',nameChosen:true,sleeping:true,outfit,needs:{hunger:60,thirst:60,hygiene:60,love:60,energy:60,health:70}});
        await checkImages();
        check(audit.state.sleeping,'retomada perdeu estado de sono');
        check(/sleep|bat-roost/.test(audit.el.actorImg.getAttribute('src')),'retomada de sono usa arte acordada');
        restored.art=audit.el.actorImg.getAttribute('src');restored.pass=true;
      }catch(error){restored.error=error.message;}
      const queued={action:'sleep-during-feeding',pass:false};record.actions.push(queued);
      try{
        audit.load(species,variant,stage,outfit);
        const feeding=audit.press('2');await audit.press('6');
        check(audit.state.sleepRequested,'pedido de sono foi perdido durante comida');
        await feeding;
        check(audit.state.sleeping&&!audit.state.sleepRequested,'nao dormiu apos comer');
        check(/sleep|bat-roost/.test(audit.el.actorImg.getAttribute('src')),'sono pendente usa arte acordada');
        queued.pass=true;
      }catch(error){queued.error=error.message;}
      const skitSleep={action:'sleep-during-skit',pass:false};record.actions.push(skitSleep);
      try{
        audit.load(species,variant,stage,outfit);
        const skit=audit.skit(species.skit||'wobble');await audit.press('6');await skit;
        check(audit.state.sleeping,'pedido de sono foi perdido durante animacao automatica');
        check(/sleep|bat-roost/.test(audit.el.actorImg.getAttribute('src')),'animacao sobrescreveu arte de sono');
        skitSleep.pass=true;
      }catch(error){skitSleep.error=error.message;}
      await pause(32);
    };
    for(const species of PixelsCatalog.SPECIES.filter(s=>s.ready)){
      document.querySelector('#auditStatus').textContent='Revisando '+species.id;
      for(const variant of Object.keys(species.variants||{default:{}}))for(let stage=1;stage<=4;stage++)await run(species,variant,stage);
    }
    const kitty=PixelsCatalog.SPECIES.find(s=>s.id==='kitty');
    for(let stage=1;stage<=4;stage++)await run(kitty,'default',stage,{body:'look_lili_complete'});
    for(const id of ['butterfly','unicorn','racer','bat']){
      const species=PixelsCatalog.SPECIES.find(s=>s.id===id);
      for(let stage=1;stage<=4;stage++)await run(species,'default',stage,{hat:'hat_bow_pink',face:'face_glasses_ocean'});
    }
    const checks=results.flatMap(record=>record.actions);
    const summary={date:new Date().toISOString(),timingScale:0.01,appearances:30,configurations:results.length,checks:checks.length,
      passed:checks.filter(action=>action.pass).length,failed:checks.filter(action=>!action.pass).length,
      failures:results.flatMap(record=>record.actions.filter(action=>!action.pass).map(action=>({species:record.species,variant:record.variant,stage:record.stage,outfit:record.outfit,...action}))) };
    const report={summary,results};
    await fetch('/audit-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
    document.querySelector('#auditStatus').textContent='Revisao concluida';
    document.querySelector('#auditSummary').textContent=JSON.stringify(summary,null,2);
    window.auditReport=report;
  };
})();
