import{hashSeed}from'./random.js?v=r447-f934e2770310';
export const CREATURE_FOUNDRY_SCHEMA='creature-foundry/1.0.0';
const bodies=['quadruped','floating','segmented','tentacled','geometric','biomechanical'],movements=['stalking','hopping','hovering','orbiting','retreating'],attacks=['meleeSwipe','straightBolt','threeShotCone','arcBurst','sweepingBeam'],weaknesses=['turnLock','postAttackCore','breakableArmor','closeRangeBlindspot','interruptibleWindup'],ecologies=['relayScavenger','breachMigrant','ruinNester','lumenGrazer','archiveGuardian'],prefix=['Pale','Canting','Riven','Lantern','Hollow','Violet'],suffix=['Strider','Bell','Maw','Pilgrim','Lattice','Witness'];
export function foundryCandidate(seed,rx,ry,generation=1){const n=hashSeed(`${seed}:foundry:v1:g${generation}:${rx}:${ry}`),boss=n%17===0,passive=!boss&&n%5===0,role=boss?'boss':passive?'passive':'hostile',baseKind=boss?'archiveBehemoth':passive?'riftGrazer':'latticeHunter',id=`foundry-v1-${(n>>>0).toString(36)}-${rx}-${ry}`,attack=passive?'none':attacks[(n>>>7)%attacks.length],body=bodies[(n>>>3)%bodies.length],movement=movements[(n>>>5)%movements.length],weakness=weaknesses[(n>>>11)%weaknesses.length],ecology=ecologies[(n>>>13)%ecologies.length],name=`${prefix[(n>>>17)%prefix.length]} ${suffix[(n>>>21)%suffix.length]}`;return{schema:CREATURE_FOUNDRY_SCHEMA,id,name,role,baseKind,body,movement,attack,weakness,ecology,visualSeed:n>>>0,palette:(n>>>9)%5,retirable:true,stable:true}}
export function foundryEncounter(seed,rx,ry,generation=1){const depth=Math.abs(rx)+Math.abs(ry),roll=hashSeed(`${seed}:foundry-channel:v1:g${generation}:${rx}:${ry}`)%10000;if(depth<5||roll>=85)return null;const c=foundryCandidate(seed,rx,ry,generation),x=6+hashSeed(c.id+':x')%20,y=6+hashSeed(c.id+':y')%20;return{...c,x,y,kind:c.baseKind,boss:c.role==='boss',ambient:c.role==='passive',passiveBehavior:c.role==='passive'?'graze':null,foundryId:c.id,foundryName:c.name,foundryRole:c.role,foundryModules:[c.body,c.movement,c.attack,c.weakness,c.ecology]}}
export function validateFoundryCandidate(c){if(!c||c.schema!==CREATURE_FOUNDRY_SCHEMA||!['passive','hostile','boss'].includes(c.role))return{ok:false,reason:'schema'};if(c.role==='passive'&&c.attack!=='none')return{ok:false,reason:'passive-attack'};if(c.role!=='passive'&&c.attack==='none')return{ok:false,reason:'missing-counterplay'};if(!weaknesses.includes(c.weakness)||!bodies.includes(c.body)||!movements.includes(c.movement))return{ok:false,reason:'unsupported-module'};return{ok:true,threatBudget:c.role==='boss'?38:c.role==='hostile'?10:0}}

export const VIEWPORT_SCHEMA='viewport/2.0.0',DOMAIN_SCHEMA='hostile-domains/1.0.0',HUNT_INSTANCE_SCHEMA='hunt-instance/1.0.0';
const copy=(value)=>JSON.parse(JSON.stringify(value));
export function viewportContracts(seed='CINDER-VERGE-47'){
 const n=hashSeed(`${seed}:viewport:v2`),sx=n&1?1:-1,sy=n&2?1:-1,frontier={rx:sx*(6+n%3),ry:sy*(5+(n>>>3)%3)},rootbound={rx:-sx*(8+(n>>>5)%3),ry:-sy*(6+(n>>>8)%3)},trial={rx:-sx*(7+(n>>>6)%2),ry:sy*(6+(n>>>8)%2)};
 return[
  {id:'viewport-direct-vesperwing',kind:'direct',title:'The Ashen Meridian',summary:'A Vesperwing circles an exposed crossing five sections east and two north.',status:'available',target:{rx:5,ry:-2},targetKind:'vesperwing',reward:{marks:35,weaponSphere:1},lifecycle:'persistent'},
  {id:'viewport-tracking-lattice',kind:'tracking',title:'Tracks in the Lattice',summary:'Three traces can reconcile into the route of a plated hunter.',status:'available',target:{rx:frontier.rx,ry:frontier.ry},targetKind:'latticeHunter',stages:['range','hunt','guardian'],reward:{marks:30,draughts:2},lifecycle:'persistent'},
  {id:'viewport-frontier-manufactory',kind:'frontier',title:'Sentinel Manufactory',summary:'Repeated Sentinel signals describe a production field beyond the charted Verge.',status:'available',target:frontier,targetKind:'voidSentinel',domain:'sentinel-manufactory',reward:{marks:55,armorSphere:1},lifecycle:'transformed-after-completion'},
  {id:'viewport-frontier-rootbound',kind:'frontier',title:'The Rootbound Crown',summary:'A migrating root system has occupied several connected sections around a buried heart.',status:'available',target:rootbound,targetKind:'rootBrute',domain:'rootbound-crown',reward:{marks:58,weaponSphere:1},lifecycle:'transformed-after-completion'},
  {id:'viewport-foundry-trial',kind:'trial',title:'Uncatalogued Manifestation',summary:'Viewport can hold one consequential Foundry lifeform inside a recoverable aperture.',status:'available',target:trial,targetKind:'archiveBehemoth',reward:{marks:45,weaponSphere:1},lifecycle:'temporary-instance-scar'}
 ];
}
export function freshViewportState(seed){return{schema:VIEWPORT_SCHEMA,read:false,activeHuntId:null,contracts:Object.fromEntries(viewportContracts(seed).map(q=>[q.id,copy(q)])),recent:[],archive:[],domains:{},instances:{}}}
export function ensureViewportState(save){const base=freshViewportState(save?.seed),old=save.viewport||{};save.viewport={...base,...old,schema:VIEWPORT_SCHEMA,contracts:{...base.contracts,...old.contracts},recent:[...(old.recent||[])].slice(-24),archive:[...(old.archive||[])].slice(-24),domains:{...(old.domains||{})},instances:{...(old.instances||{})}};for(const q of Object.values(save.viewport.contracts)){if(q.domainSpec&&q.domain)DOMAIN_BLUEPRINTS[q.domain]=q.domainSpec;q.status||='available';q.progress||={};q.lifecycle||='persistent';if(q.destination)q.destination={version:1,...q.destination,target:{...(q.destination.target||q.target)}}}return save.viewport}
export function viewportContract(save,id){return ensureViewportState(save).contracts[id]||null}
export function activeViewportHunt(save){const v=ensureViewportState(save);return v.activeHuntId?v.contracts[v.activeHuntId]||null:null}
export function selectHuntDestination(save,id){const q=viewportContract(save,id);if(!q)return null;if(q.destination)return q.destination;const kind=q.domain?'persistent-domain':q.kind==='trial'?'temporary-arena':q.kind==='tracking'?'existing-dungeon':'ordinary-overworld';return q.destination={version:1,kind,target:{...q.target},selectionSeed:hashSeed(`${save.seed}:hunt-destination:v1:${q.id}`),arenaId:kind==='temporary-arena'?huntInstanceId(save,q.id):null,status:'selected',fallbackReason:null}}
export function ordinaryHuntSuitability(map,contract){if(!map||!contract)return{ok:false,reason:'missing-region'};if(map.settlement)return{ok:false,reason:'protected-settlement'};const width=map.width||32,height=map.height||Math.floor(map.tiles.length/width),objects=map.objects||[],critical=objects.filter(o=>['checkpoint','shrine','viewport','npc','dungeon'].includes(o.kind));for(let n=0;n<width*height;n++){const i=(hashSeed(`${contract.id}:ordinary-site`)+n*17)%(width*height),x=i%width,y=Math.floor(i/width);if(x<4||y<4||x>=width-4||y>=height-4)continue;let clear=true;for(let dy=-2;dy<=2&&clear;dy++)for(let dx=-2;dx<=2;dx++){const t=map.tiles[(y+dy)*width+x+dx];if(!t||t.blocked||['water','dungeonWater','canyon','void'].includes(t.kind)){clear=false;break}}if(clear&&!critical.some(o=>Math.hypot(o.x-x,o.y-y)<4))return{ok:true,x,y,clearance:2}}return{ok:false,reason:'no-safe-combat-clearing'}}
export function resolveHuntDestination(save,id,map){const q=viewportContract(save,id),d=selectHuntDestination(save,id);if(!q||!d)return null;if(d.status==='resolved')return d;if(d.kind==='ordinary-overworld'&&q.targetKind==='vesperwing'&&map?.settlement){Object.assign(d,{status:'resolved',site:{x:23,y:16}});return d}/* release 132: the Vesperwing is a fixed elite at 5,-2; a town standing there no longer trades it for an arena */if(d.kind==='ordinary-overworld'){const site=ordinaryHuntSuitability(map,q);if(site.ok)Object.assign(d,{status:'resolved',site});else Object.assign(d,{kind:'temporary-arena',arenaId:huntInstanceId(save,q.id),status:'resolved',fallbackReason:site.reason})}else if(d.kind==='existing-dungeon'){const entrance=(map?.objects||[]).filter(o=>o.kind==='dungeon').sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];if(entrance)Object.assign(d,{status:'resolved',entranceId:entrance.id});else Object.assign(d,{kind:'temporary-arena',arenaId:huntInstanceId(save,q.id),status:'resolved',fallbackReason:'no-existing-dungeon'})}else d.status='resolved';return d}
export function huntIntegrationDiagnostics(save){const v=ensureViewportState(save),destinations=Object.values(v.contracts).filter(q=>q.destination).map(q=>({id:q.id,kind:q.destination.kind,status:q.destination.status,fallbackReason:q.destination.fallbackReason||null}));return{destinations,temporaryInstances:Object.values(v.instances).filter(i=>!i.completed).length,completedInstances:Object.values(v.instances).filter(i=>i.completed).length,persistentDomains:Object.keys(v.domains).length}}
export function acceptViewportHunt(save,id){const v=ensureViewportState(save),q=v.contracts[id];if(!q||!['available','deferred','accepted','tracking','target-located'].includes(q.status))return{ok:false,message:'That Viewport record cannot be accepted.'};if(v.activeHuntId&&v.activeHuntId!==id){const prior=v.contracts[v.activeHuntId];if(prior&&['accepted','tracking','target-located'].includes(prior.status))prior.status='deferred'}v.activeHuntId=id;q.status=q.kind==='tracking'?'tracking':'accepted';q.acceptedAt=Object.keys(save.explored||{}).length;selectHuntDestination(save,id);return{ok:true,message:`${q.title} accepted. Viewport guidance marks the ${q.kind==='tracking'?'first search region':'known approach'} without disturbing your manual waypoint.`,contract:q}}
export function deferViewportHunt(save,id){const v=ensureViewportState(save),q=v.contracts[id];if(!q)return false;q.status='deferred';if(v.activeHuntId===id)v.activeHuntId=null;return true}
export function archiveViewportHunt(save,id){const v=ensureViewportState(save),q=v.contracts[id];if(!q||q.status==='completed')return false;if(q.destination?.kind==='temporary-arena'){const instanceId=huntInstanceId(save,id);cleanupHuntInstance(save,instanceId);delete v.instances[instanceId]}q.status='archived';if(!v.archive.includes(id))v.archive.push(id);if(v.activeHuntId===id)v.activeHuntId=null;return true}
export function completeViewportHunt(save,id){const v=ensureViewportState(save),q=v.contracts[id];if(!q||q.status==='completed')return false;q.status='completed';q.completedAt=Object.keys(save.explored||{}).length;if(v.activeHuntId===id)v.activeHuntId=null;save.currency+=(q.reward?.marks||0);save.materials.weaponSphere=(save.materials.weaponSphere||0)+(q.reward?.weaponSphere||0);save.materials.armorSphere=(save.materials.armorSphere||0)+(q.reward?.armorSphere||0);save.consumables.restorativeDraught=(save.consumables.restorativeDraught||0)+(q.reward?.draughts||0);v.recent.push({id:`complete:${id}`,title:q.title,text:'Hunt completed and recorded by Viewport.',kind:'hunt'});return true}
export function recordViewportArrival(save,entry){const v=ensureViewportState(save);if(v.recent.some(q=>q.id===entry.id))return false;v.recent.push({...entry});v.recent=v.recent.slice(-24);return true}
export function foundryTrialDecision(save,id,decision){const q=viewportContract(save,id);if(!q||q.kind!=='trial'||q.status!=='completed')return false;q.decision=decision;if(decision==='corridor')save.worldFlags[`foundry-admitted:${id}`]=true;else if(decision==='rare')save.worldFlags[`foundry-rare:${id}`]=true;else if(decision==='dungeon')save.worldFlags[`foundry-dungeon:${id}`]=true;else if(decision==='rework')q.status='deferred';else if(decision==='archive')archiveViewportHunt(save,id);return true}

const DOMAIN_BLUEPRINTS={ // generated territories (release 134) are registered here from their contracts' domainSpec

 'sentinel-manufactory':{name:'Sentinel Manufactory',family:'sentinel',manifestationAperture:24,roles:[['approach',0,0],['assembly',1,0],['proving',1,-1],['recovery',2,0],['command',3,0]]},
 'rootbound-crown':{name:'The Rootbound Crown',family:'rootbound',manifestationAperture:30,roles:[['verge',0,0],['thicket',0,1],['heartways',1,1],['recovery',1,2],['rootheart',2,2]]}
};
export function domainBlueprint(id){return DOMAIN_BLUEPRINTS[id]||null}
export function domainIdentity(seed,id,anchor){return`domain:v1:${seed}:${id}:${anchor.rx},${anchor.ry}`}
export function domainTopology(seed,id,anchor){const b=domainBlueprint(id);if(!b)return null;return{id:domainIdentity(seed,id,anchor),schema:DOMAIN_SCHEMA,family:b.family,name:b.name,anchor:{...anchor},manifestationAperture:b.manifestationAperture,sections:b.roles.map(([role,dx,dy],index)=>({id:`${domainIdentity(seed,id,anchor)}:${role}`,role,rx:anchor.rx+dx,ry:anchor.ry+dy,index}))}}
export function ensureDomainState(save,contract){const v=ensureViewportState(save),top=domainTopology(save.seed,contract.domain,contract.target);if(!top)return null;const old=v.domains[top.id]||{};return v.domains[top.id]={schema:DOMAIN_SCHEMA,id:top.id,contractId:contract.id,family:top.family,name:top.name,anchor:top.anchor,visitedRoles:[...(old.visitedRoles||[])].slice(-8),bossDefeated:!!old.bossDefeated,transformed:!!old.transformed,manifestations:{...(old.manifestations||{})},rewardClaims:{...(old.rewardClaims||{})}}}
export function activeDomains(save){const v=ensureViewportState(save),out=[];for(const q of Object.values(v.contracts))if(q.domain&&['accepted','target-located','completed'].includes(q.status))out.push({contract:q,topology:domainTopology(save.seed,q.domain,q.target),state:ensureDomainState(save,q)});return out}
export function domainSectionAt(save,rx,ry){for(const d of activeDomains(save)){const section=d.topology.sections.find(q=>q.rx===rx&&q.ry===ry);if(section)return{...d,section}}return null}
export function enterDomainSection(save,rx,ry){const d=domainSectionAt(save,rx,ry);if(!d)return null;if(!d.state.visitedRoles.includes(d.section.role))d.state.visitedRoles.push(d.section.role);d.state.visitedRoles=d.state.visitedRoles.slice(-8);return d}
export function domainEncounterPlan(save,rx,ry){const d=enterDomainSection(save,rx,ry);if(!d)return null;const {contract,topology,state,section}=d;if(topology.family==='pack')return packDomainPlan(d,save);const bossRole=topology.family==='sentinel'?'command':'rootheart',lieutenantRole=topology.family==='sentinel'?'proving':'heartways',cleared=state.bossDefeated,aperture=Number(save.perception?.aperture)||0,manifestation=cleared&&aperture>=topology.manifestationAperture&&!state.manifestations[1]?.defeated?1:0,spawns=[];const add=(kind,count,traits=[],extra={})=>{for(let i=0;i<count;i++){const n=hashSeed(`${topology.id}:${section.role}:${kind}:${i}`);spawns.push({id:`${topology.id}:${section.role}:${kind}:${i}`,kind,x:7+n%18,y:7+(n>>>5)%18,traits:[...traits],domainId:topology.id,domainFamily:topology.family,domainRole:section.role,domainReinforcement:true,noRewards:i>0,...extra})}};if(!cleared){if(topology.family==='sentinel')add(section.role==='assembly'?'sparkWarden':'voidSentinel',section.role==='approach'?2:section.role==='recovery'?1:3,section.role==='proving'?['swift']:[]);else add('rootBrute',section.role==='verge'?2:section.role==='recovery'?1:3,section.role==='heartways'?['vital']:[],{rootboundRegeneration:true,rootGroundAttack:section.role!=='verge'});if(section.role===lieutenantRole)add(topology.family==='sentinel'?'voidSentinel':'rootBrute',1,['vital','keen'],{domainLieutenant:true,worldBoss:false});if(section.role===bossRole)add(topology.family==='sentinel'?'voidSentinel':'rootBrute',1,['vital','farcasting'],{id:`${topology.id}:boss:0`,viewportHuntId:contract.id,worldBoss:true,domainBoss:true,rootboundRegeneration:topology.family==='rootbound',rootGroundAttack:topology.family==='rootbound'})}else{add(topology.family==='sentinel'?'sparkWarden':'rootBrute',section.role==='recovery'?0:1,[],{domainRemnant:true});if(section.role===bossRole&&manifestation)add(topology.family==='sentinel'?'voidSentinel':'rootBrute',1,['vital','swift','farcasting'],{id:`${topology.id}:manifestation:${manifestation}`,worldBoss:true,domainBoss:true,domainManifestation:manifestation,rootboundRegeneration:topology.family==='rootbound',rootGroundAttack:true})}return{...d,manifestation,spawns:spawns.slice(0,5),bossRole,lieutenantRole}}
// A generated territory held by one pack creature (release 134): outskirts, warren (a lieutenant), lair (the boss).
function packDomainPlan(d,save){const {contract,topology,state,section}=d,kind=domainBlueprint(contract.domain)?.kind||contract.targetKind,spawns=[],add=(count,extra={})=>{for(let i=0;i<count;i++){const n=hashSeed(`${topology.id}:${section.role}:${i}`);spawns.push({id:`${topology.id}:${section.role}:${i}`,kind,x:7+n%18,y:7+(n>>>5)%18,traits:[],domainId:topology.id,domainFamily:'pack',domainRole:section.role,domainReinforcement:true,noRewards:i>0,...extra})}};
 if(!state.bossDefeated){add(section.role==='outskirts'?2:3);if(section.role==='warren')add(1,{id:`${topology.id}:lieutenant`,traits:['vital'],domainLieutenant:true,noRewards:false});if(section.role==='lair')add(1,{id:`${topology.id}:boss:0`,boss:true,traits:['vital'],viewportHuntId:contract.id,worldBoss:true,domainBoss:true,noRewards:false})}else if(section.role!=='lair')add(1,{domainRemnant:true});
 return{...d,manifestation:0,spawns:spawns.slice(0,5),bossRole:'lair',lieutenantRole:'warren'}}
export function completeDomainBoss(save,enemy){const v=ensureViewportState(save),state=v.domains?.[enemy.domainId];if(!state)return null;if(enemy.domainManifestation){const tier=enemy.domainManifestation;if(state.manifestations[tier]?.defeated)return null;state.manifestations[tier]={defeated:true,defeatedAt:Object.keys(save.explored||{}).length,mechanics:[enemy.domainFamily==='sentinel'?'sweeping-volley':'root-eruption','reinforced-mobility','recovery-window']};const key=`manifestation:${state.id}:${tier}`;if(!state.rewardClaims[key]){state.rewardClaims[key]=true;save.materials.armorSphere=(save.materials.armorSphere||0)+1;save.materials.weaponSphere=(save.materials.weaponSphere||0)+1;save.currency+=35}return{kind:'manifestation',state,tier}}if(state.bossDefeated)return null;state.bossDefeated=true;state.transformed=true;return{kind:'first',state,tier:0}}
export function manifestationMechanics(family,tier=1){return family==='sentinel'?{phase:'overclocked',attack:'sweepingBeam',hazard:'charged-grid',mobility:1.18,recovery:.8,tier}:{phase:'deep-root',attack:'groundRoots',hazard:'root-eruption',mobility:1.08,recovery:.7,tier}}

export function huntInstanceId(save,contractId){return`hunt-instance:v1:${save.seed}:${contractId}`}
export function ensureHuntInstance(save,contractId){let v=ensureViewportState(save),q=v.contracts[contractId];if(!q)return null;const destination=q.destination||selectHuntDestination(save,contractId);if(destination?.kind!=='temporary-arena')return null;v=ensureViewportState(save);const id=huntInstanceId(save,contractId),old=v.instances[id]||{};Object.assign(old,{schema:HUNT_INSTANCE_SCHEMA,id,contractId,status:old.status||'available',attempts:Math.max(0,old.attempts||0),abandoned:Math.max(0,old.abandoned||0),completed:!!old.completed,rewardClaimed:!!old.rewardClaimed,scar:!!old.scar,returnPoint:old.returnPoint||null});v.instances[id]=old;return old}
export function beginHuntInstance(save,contractId,returnPoint){const q=viewportContract(save,contractId),instance=ensureHuntInstance(save,contractId);if(!q||!instance||instance.completed)return null;instance.status='active';instance.attempts++;instance.returnPoint={...returnPoint};return instance}
export function abandonHuntInstance(save,id){const i=ensureViewportState(save).instances[id];if(!i||i.completed)return false;i.status='available';i.abandoned++;return true}
export function completeHuntInstance(save,id){const i=ensureViewportState(save).instances[id];if(!i||i.completed)return false;i.completed=true;i.status='completed';i.scar=true;i.rewardClaimed=true;return true}
export function cleanupHuntInstance(save,id){for(const key of Object.keys(save.session?.areas||{}))if(key.startsWith(id))delete save.session.areas[key];if(save.session?.activeDungeonId===id)save.session.activeDungeonId=null;return true}

export function recordPeoplePlace(save,id,record){save.codex.peoplePlaces||={};const old=save.codex.peoplePlaces[id]||{};save.codex.peoplePlaces[id]={...old,...record,id,facts:[...new Set([...(old.facts||[]),...(record.facts||[])])].slice(-6),crossRefs:[...new Set([...(old.crossRefs||[]),...(record.crossRefs||[])])].slice(-6)};return save.codex.peoplePlaces[id]}

// ---------------------------------------------------------------- the rolling hunt board (release 132)
// Viewport keeps watch: as the Wayfarer explores, new threats enter the Corridor and are posted as hunts. Each posting
// is either a new Foundry lifeform (a creature composed from the Foundry's bodies, movements, attacks and weaknesses,
// stored whole in the contract) or a bounty on a pack creature's boss form. Up to BOARD.open generated hunts are
// offered at once; one is posted every BOARD.everySections newly explored sections; an untaken posting lapses after
// BOARD.lapseSections. State: save.viewport.board (additive).
export const HUNT_FOUNDRY = { hp: 120, hpPerLevel: 18, damage: 8, damagePerLevel: .8 };
export const BOARD = { open: 3, everySections: 15, lapseSections: 20, distance: [4, 9], firstAfter: 5,
  // what a posting is, by weight (release 134): a new lifeform to hunt directly, one to track across sections, a bounty, a new territory
  kinds: [['foundry', 40], ['tracking', 25], ['bounty', 20], ['territory', 15]], traceStages: 2 };
// Admitted Foundry lifeforms (release 134): the chance one appears in a section or dungeon level, by the player's decision.
export const BESTIARY = { corridor: .03, rare: .008, dungeon: .06 };
const BOUNTY_TITLES = ['Bounty: {name}', 'A {name} Gone Wrong', 'The {name} Problem', 'Marked: {name}'];
const TRACK_TITLES = ['Tracks of the {name}', 'Spoor: {name}', 'Following the {name}'];
const FOUNDRY_TITLES = ['Arrival: {name}', 'Something New: {name}', 'Uncharted: {name}', 'The {name} Sighting'];
export function ensureViewportBoard(save) { const v = ensureViewportState(save), b = v.board || {}; v.board = { v: 1, seq: Math.max(0, Number(b.seq) || 0), lastPostAt: Number.isFinite(b.lastPostAt) ? b.lastPostAt : null }; return v.board; }
const exploredCount = (save) => Object.keys(save.explored || {}).length;
const openStatuses = ['available', 'deferred', 'accepted', 'tracking', 'target-located'];
// `opts`: { packKinds: [{id,name}], level, avoid(rx,ry) -> true for sections that must not host a hunt (towns, origin) }.
export function refreshViewportBoard(save, rx, ry, opts = {}) {
  const b = ensureViewportBoard(save), v = save.viewport, now = exploredCount(save), posted = []; // ensureViewportState rebuilds save.viewport, so take it after
  // Lapse untaken postings.
  // An untaken posting lapses. A Foundry lifeform is never lost: it goes dormant and returns in the rotation later.
  for (const q of Object.values(v.contracts)) if (q.generated && ['available', 'deferred'].includes(q.status) && now - (q.postedAt || 0) >= BOARD.lapseSections) {
    if (q.foundry) { q.status = 'dormant'; q.dormantSince = now; }
    else { q.status = 'archived'; q.lapsed = true; if (!v.archive.includes(q.id)) v.archive.push(q.id); }
  }
  const open = Object.values(v.contracts).filter((q) => q.generated && openStatuses.includes(q.status)).length;
  if (b.lastPostAt === null) b.lastPostAt = now - BOARD.everySections + BOARD.firstAfter;
  if (open >= BOARD.open || now - b.lastPostAt < BOARD.everySections) return posted;
  const taken = new Set(Object.values(v.contracts).filter((q) => openStatuses.includes(q.status) && q.target).map((q) => `${q.target.rx},${q.target.ry}`));
  const seq = b.seq, h = hashSeed(`${save.seed}:viewport-board:v1:${seq}`);
  const pickTarget = (salt) => { for (let k = 0; k < 24; k++) { const hk = hashSeed(`${save.seed}:viewport-board:v1:${salt}:${k}`), dist = BOARD.distance[0] + hk % (BOARD.distance[1] - BOARD.distance[0] + 1), a = ((hk >>> 8) % 360) * Math.PI / 180, t = { rx: rx + Math.round(Math.cos(a) * dist), ry: ry + Math.round(Math.sin(a) * dist) }; if (Math.abs(t.rx) + Math.abs(t.ry) >= 3 && !taken.has(`${t.rx},${t.ry}`) && !(opts.avoid && opts.avoid(t.rx, t.ry))) return t; } return null; };
  // The rotation: a dormant lifeform comes back before anything new is posted.
  const dormant = Object.values(v.contracts).filter((q) => q.status === 'dormant').sort((a, b) => (a.dormantSince || 0) - (b.dormantSince || 0))[0];
  if (dormant && (seq % 2 === 0 || !opts.packKinds)) { // returns alternate with new postings, so the board keeps growing
    const t = pickTarget(`return:${dormant.id}:${seq}`); if (!t) return posted;
    Object.assign(dormant, { status: 'available', target: t, postedAt: now, destination: null, returned: (dormant.returned || 0) + 1, summary: dormant.summary.replace(/near -?\d+,-?\d+/, `near ${t.rx},${t.ry}`) });
    if (dormant.finalTarget) Object.assign(dormant, retrace(save, dormant, t, rx, ry));
    v.recent.push({ id: `return:${dormant.id}:${seq}`, title: `${dormant.foundry.name} returns`, text: `Viewport sights the ${dormant.foundry.name} again, near ${t.rx},${t.ry}.`, kind: 'arrival' });
    v.read = false; b.seq = seq + 1; b.lastPostAt = now; v.recent = v.recent.slice(-24); posted.push(dormant); return posted;
  }
  let target = null;
  for (let k = 0; k < 24 && !target; k++) {
    const hk = hashSeed(`${save.seed}:viewport-board:v1:${seq}:${k}`), dist = BOARD.distance[0] + hk % (BOARD.distance[1] - BOARD.distance[0] + 1), a = ((hk >>> 8) % 360) * Math.PI / 180;
    const t = { rx: rx + Math.round(Math.cos(a) * dist), ry: ry + Math.round(Math.sin(a) * dist) };
    if (Math.abs(t.rx) + Math.abs(t.ry) >= 3 && !taken.has(`${t.rx},${t.ry}`) && !(opts.avoid && opts.avoid(t.rx, t.ry))) target = t;
  }
  if (!target) return posted;
  const level = Math.max(1, Number(opts.level) || Number(save.level) || 1), id = `viewport-gen-${seq}`;
  const hasTerritory = Object.values(v.contracts).some((q) => q.domainSpec && openStatuses.includes(q.status));
  let kind = weighted(BOARD.kinds, h);
  if (!opts.packKinds?.length && (kind === 'bounty' || kind === 'territory')) kind = 'foundry';
  if (kind === 'territory' && hasTerritory) kind = 'bounty';
  let q;
  if (kind === 'territory') {
    const pk = opts.packKinds[(h >>> 5) % opts.packKinds.length], name = `The ${pk.name} ${['Warren', 'Hold', 'Reach', 'Nest'][(h >>> 9) % 4]}`;
    q = { id, kind: 'frontier', generated: true, title: name, summary: `${pk.name}s have taken three connected sections near ${target.rx},${target.ry}, with a boss in their lair. Clear the territory.`, targetKind: pk.id, domain: `gen-${id}`,
      domainSpec: { name, family: 'pack', kind: pk.id, manifestationAperture: 999, roles: [['outskirts', 0, 0], ['warren', 1, 0], ['lair', 1, 1]] }, lifecycle: 'transformed-after-completion' };
    DOMAIN_BLUEPRINTS[q.domain] = q.domainSpec;
  } else if (kind === 'foundry' || kind === 'tracking') {
    const c = foundryCandidate(save.seed, target.rx, target.ry, `board${seq}`);
    if (c.role === 'passive') Object.assign(c, { role: 'hostile', baseKind: 'latticeHunter', attack: attacks[(h >>> 7) % attacks.length] });
    q = { id, kind: kind === 'tracking' ? 'tracking' : 'direct', generated: true, foundry: c, title: pick(kind === 'tracking' ? TRACK_TITLES : FOUNDRY_TITLES, h).replace('{name}', c.name), summary: `A ${c.name} has entered the Corridor near ${target.rx},${target.ry}: ${c.body}, ${c.movement}, ${c.attack === 'none' ? 'unarmed' : c.attack.replace(/([A-Z])/g, ' $1').toLowerCase()}. Weak to ${c.weakness.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, targetKind: c.baseKind };
    v.recent.push({ id: `arrival:${id}`, title: `${c.name} entered the Corridor`, text: `Viewport records a new ${c.role === 'boss' ? 'apex' : ''} lifeform near ${target.rx},${target.ry}.`, kind: 'arrival' });
  } else {
    const pk = opts.packKinds[(h >>> 5) % opts.packKinds.length];
    q = { id, kind: 'direct', generated: true, title: pick(BOUNTY_TITLES, h).replace('{name}', pk.name), summary: `A swollen ${pk.name} has claimed ground near ${target.rx},${target.ry}. Hunt its boss form.`, targetKind: pk.id, packBounty: true };
  }
  if (q.kind === 'tracking') Object.assign(q, retrace(save, q, target, rx, ry));
  Object.assign(q, { status: 'available', target: q.target || target, postedAt: now, lifecycle: q.lifecycle || 'persistent', progress: {}, reward: { marks: 25 + 5 * level + (q.foundry?.role === 'boss' ? 30 : 0), ...(h & 1 ? { weaponSphere: 1 } : { armorSphere: 1 }), ...((h >>> 3) % 3 === 0 ? { draughts: 1 } : {}) } });
  v.contracts[id] = q; v.read = false; b.seq = seq + 1; b.lastPostAt = now; v.recent = v.recent.slice(-24); posted.push(q);
  return posted;
}
function pick(list, h) { return list[(h >>> 11) % list.length]; }
function weighted(table, h) { const total = table.reduce((a, [, w]) => a + w, 0); let n = (h >>> 13) % total; for (const [k, w] of table) { if ((n -= w) < 0) return k; } return table[0][0]; }
// A tracking hunt (release 134): traces in BOARD.traceStages sections lead to the lifeform. `target` is always the next
// place to go (traces first, then `finalTarget`), so guidance and arrival work unchanged.
function retrace(save, q, finalTarget, rx, ry) {
  const trail = [];
  for (let i = 1; i <= BOARD.traceStages; i++) { const f = i / (BOARD.traceStages + 1), hk = hashSeed(`${save.seed}:trace:${q.id}:${i}:${q.returned || 0}`); trail.push({ rx: Math.round(rx + (finalTarget.rx - rx) * f) + (hk % 3) - 1, ry: Math.round(ry + (finalTarget.ry - ry) * f) + ((hk >>> 3) % 3) - 1 }); }
  return { trail, stage: 0, finalTarget: { ...finalTarget }, target: { ...trail[0] }, destination: { version: 1, kind: 'ordinary-overworld', target: { ...finalTarget }, selectionSeed: hashSeed(`${save.seed}:hunt-destination:v1:${q.id}`), arenaId: null, status: 'selected', fallbackReason: null } };
}
// While a tracking hunt still has traces to find, its target section holds a trace, not the creature.
export function huntTraceStage(q) { return q?.generated && q.trail && q.stage < q.trail.length ? q.stage : -1; }
export function followHuntTrace(save, id) {
  const q = viewportContract(save, id); if (!q || huntTraceStage(q) < 0) return { ok: false, message: 'The trail here has gone cold.' };
  q.stage++; const last = q.stage >= q.trail.length;
  q.target = last ? { ...q.finalTarget } : { ...q.trail[q.stage] }; q.status = 'tracking';
  return { ok: true, message: last ? `The tracks are fresh now. The ${q.foundry?.name || 'quarry'} is near ${q.target.rx},${q.target.ry}.` : `More tracks: they lead on toward ${q.target.rx},${q.target.ry}. (${q.stage}/${q.trail.length})` };
}
// After a generated Foundry hunt (or the Foundry trial) is completed, the player decides the lifeform's place.
export function foundryAdmission(save, id, decision) {
  const v = ensureViewportState(save), q = v.contracts[id]; if (!q || q.status !== 'completed' || q.decision) return false;
  const c = q.foundry || (q.kind === 'trial' ? foundryCandidate(save.seed, q.target.rx, q.target.ry, save.worldGeneration || 1) : null); if (!c) return false;
  q.decision = decision; v.bestiary ||= {};
  if (['corridor', 'rare', 'dungeon'].includes(decision)) v.bestiary[c.id] = { candidate: { ...c, role: c.role === 'boss' ? 'boss' : 'hostile' }, mode: decision, name: c.name, from: id };
  return true;
}
// One admitted lifeform for this section or dungeon level, or null. `area`: 'overworld' or 'dungeon'.
export function admittedFoundrySpawn(save, key, area, at) {
  const list = Object.values(save.viewport?.bestiary || {}).filter((b) => area === 'dungeon' ? b.mode === 'dungeon' : b.mode !== 'dungeon');
  for (const b of list) {
    const chance = area === 'dungeon' ? BESTIARY.dungeon : BESTIARY[b.mode] || 0;
    if ((hashSeed(`${save.seed}:admitted:${b.candidate.id}:${key}`) % 10000) / 10000 < chance) { const c = b.candidate; return { ...c, id: `admitted:${c.id}:${key}`, x: at.x, y: at.y, kind: c.baseKind, boss: c.role === 'boss', foundryId: `admitted:${c.id}:${key}`, foundryName: c.name, foundryRole: c.role, foundryModules: [c.body, c.movement, c.attack, c.weakness, c.ecology], foundryAdmitted: true }; }
  }
  return null;
}
// The spawn for a generated hunt's target (overworld site or arena), tagged so its defeat completes the hunt.
export function generatedHuntSpawn(q, at, idPrefix = 'viewport-target') {
  if (q.foundry) { const c = q.foundry; return { ...c, id: `${idPrefix}:${q.id}`, x: at.x, y: at.y, kind: c.baseKind, boss: c.role === 'boss', foundryId: `${c.id}:${q.id}`, foundryName: c.name, foundryRole: c.role, foundryModules: [c.body, c.movement, c.attack, c.weakness, c.ecology], viewportHuntId: q.id, worldBoss: false }; }
  return { id: `${idPrefix}:${q.id}`, kind: q.targetKind, x: at.x, y: at.y, boss: true, traits: ['vital'], viewportHuntId: q.id, worldBoss: false };
}
