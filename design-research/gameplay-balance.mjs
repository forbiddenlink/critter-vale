import {createServer} from 'vite';
import fs from 'node:fs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {makeCritter,movesFor,moveDamage,xpReward,xpToNext}=await server.ssrLoadModule('/src/game/battle.ts');
 const {SPECIES,WILD_POOL}=await server.ssrLoadModule('/src/game/critters.ts');
 const {wildLevel}=await server.ssrLoadModule('/src/game/battleFlow.ts');
 const {rollCustom,fuseSpecies}=await server.ssrLoadModule('/src/game/customSpecies.ts');
 const progression=[7,8,10,12,14,18,20].map(target=>{
  const xp=Array.from({length:target-6},(_,i)=>xpToNext(i+6)).reduce((a,b)=>a+b,0);
  const rewards=WILD_POOL.flatMap(id=>[8,9,10,11].map(lv=>xpReward(makeCritter(id,lv,'none'))));
  const average=rewards.reduce((a,b)=>a+b,0)/rewards.length;
  return {targetLevel:target,xpFromFreshStarter:xp,estimatedWildWinsAtCappedBand:Math.ceil(xp/average),assumptions:'Neutral XP quirk, active critter earns all XP, uniform Lv8-11 wilds. Optimistic for early levels; excludes trainer XP and captures.'};
 });
 const choices=[];
 for(const id of Object.keys(SPECIES))for(const target of ['emberpup','tadmite','leaflet']){
  const attacker=makeCritter(id,12,'none'),defender=makeCritter(target,12,'none');
  const damage=movesFor(id).map(m=>({move:m.name,element:m.element,power:m.power,damage:moveDamage(attacker,defender,m)}));
  choices.push({species:id,targetElement:defender.species.element,damage,bestMove:damage[0].damage>=damage[1].damage?0:1});
 }
 const custom=rollCustom('custom-audit','Audit','Leaf','/sprites/leaflet.png');
 const fusion=fuseSpecies(makeCritter('emberwulf',12,'none'),makeCritter('torretoad',12,'none'),'/sprites/emberpup.png');
 const results={method:'Source-backed calculations, not browser playthrough claims. No paid service calls.',progression,wildTopAtParty20:[wildLevel(20,()=>0),wildLevel(20,()=>.999)],moveChoices:choices,generated:{summonHasEvolution:'evolvesTo' in custom,summonMoveKinds:custom.moves.map(m=>m.element),fusionMoveKinds:fusion.moves.map(m=>m.element),fusionElement:fusion.element},content:{builtInSpecies:Object.keys(SPECIES).length,wildSpecies:WILD_POOL.length,moveSlotsPerSpecies:2}};
 fs.writeFileSync('design-research/gameplay-balance.json',JSON.stringify(results,null,2));console.log(JSON.stringify({...results,moveChoices:{cases:choices.length,neutralChosen:choices.filter(x=>x.bestMove===1).length,elementChosen:choices.filter(x=>x.bestMove===0).length}},null,2));
}finally{await server.close()}
