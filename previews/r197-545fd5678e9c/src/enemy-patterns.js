const TAU=Math.PI*2;
export const ENEMY_PROJECTILE_CAP=64;
export const DUNGEON_THREAT_TUNING_VERSION=1;

function normalize(v){const m=Math.hypot(Number(v?.x)||0,Number(v?.y)||0)||1;return{x:(Number(v?.x)||0)/m,y:(Number(v?.y)||0)/m}}
function rotate(v,a){return{x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)}}
function scaledDamage(shooter,factor=1){return Math.max(1,Math.ceil((Number(shooter?.damage)||1)*factor))}
function projectile(shooter,now,id,direction,extra={}){const d=normalize(direction);return{x:(Number(shooter.x)||0)+.5,y:(Number(shooter.y)||0)+.42,id:`enemy-shot-${shooter.id}-${now}-${id}`,dx:d.x,dy:d.y,speed:4.2,life:2.4,damage:scaledDamage(shooter),hostile:true,hits:{},path:'straight',...extra}}
function bounded(shots,activeCount,cap){return shots.slice(0,Math.max(0,Math.min(cap,ENEMY_PROJECTILE_CAP)-Math.max(0,activeCount)))}

export function enemyPatternWindup(shooter){if(shooter?.kind==='gravitantBell'||shooter?.kind==='riftColossus')return 1.15;if(shooter?.kind==='knifeChoir'||shooter?.kind==='vesperwing')return 1;return .9}

export function tuneDungeonThreat(enemy,{damageScale=1.25,cooldownScale=.85,minimumWindup=.62}={}){
 if(!enemy||enemy.dungeonThreatTuningVersion===DUNGEON_THREAT_TUNING_VERSION)return enemy;
 const originalDamage=Math.max(1,Number(enemy.damage)||1),originalMaxHp=Number(enemy.maxHp)||Number(enemy.hp)||1;
 enemy.damage=Math.max(originalDamage,Math.ceil(originalDamage*Math.min(1.35,Math.max(1.2,damageScale))));
 enemy.attackCooldownScale=(Number(enemy.attackCooldownScale)||1)*Math.min(.9,Math.max(.8,cooldownScale));
 enemy.minimumAttackWindup=Math.max(Number(enemy.minimumAttackWindup)||0,Math.min(.75,Math.max(.55,minimumWindup)));
 enemy.dungeonThreatTuningVersion=DUNGEON_THREAT_TUNING_VERSION;
 enemy.dungeonThreatBaseline={damage:originalDamage,maxHp:originalMaxHp};
 return enemy;
}

export function buildEnemyProjectilePattern(shooter,aim,now=0,{activeCount=0,cap=ENEMY_PROJECTILE_CAP}={}){
 const d=normalize(aim),sequence=(shooter.shotSequence=(shooter.shotSequence||0)+1);let shots;
 if(shooter.foundryAttack==='threeShotCone')shots=[-.2,0,.2].map((a,i)=>projectile(shooter,now,`foundry-cone-${i}`,rotate(d,a),{damage:scaledDamage(shooter,.62)}));
 else if(shooter.foundryAttack==='arcBurst')shots=[-.14,.14].map((a,i)=>projectile(shooter,now,`foundry-arc-${i}`,rotate(d,a),{path:'arc',jumpable:true,speed:3.4,life:2.7,damage:scaledDamage(shooter,.72)}));
 else if(shooter.foundryAttack==='sweepingBeam')shots=[-.28,-.14,0,.14,.28].map((a,i)=>projectile(shooter,now,`foundry-sweep-${i}`,rotate(d,a),{speed:5.2,life:1.5,damage:scaledDamage(shooter,.34)}));
 else if((shooter.kind==='gravitantBell'||shooter.kind==='riftColossus')&&sequence%3===0)shots=Array.from({length:8},(_,i)=>projectile(shooter,now,`ring-${i}`,rotate(d,i*TAU/8),{speed:2.75,life:2.25,damage:scaledDamage(shooter,.32)}));
 else if(shooter.kind==='knifeChoir'&&sequence%2===0)shots=[projectile(shooter,now,'split',d,{speed:3.2,life:2.5,damage:scaledDamage(shooter,.48),splitAfter:.7,splitCount:3,splitSpread:.55})];
 else if(shooter.kind==='vesperwing'||shooter.kind==='mireApostle')shots=[projectile(shooter,now,'seeker',d,{speed:3.35,life:2.8,damage:scaledDamage(shooter,.55),homingTurnRate:shooter.boss?1.25:.9,homingUntil:1.35})];
 else if(shooter.kind==='voidSentinel'&&sequence%4===0)shots=[projectile(shooter,now,'blast',d,{path:'grenade',speed:3.15,life:1.25,damage:scaledDamage(shooter,.8),blastRadius:1.65})];
 else if(shooter.kind==='voidSentinel')shots=[-.13,0,.13].map((a,i)=>projectile(shooter,now,`fan-${i}`,rotate(d,a),{damage:scaledDamage(shooter,.58),speed:4.8}));
 else if(shooter.kind==='cinderWisp')shots=[-.18,0,.18].map((a,i)=>projectile(shooter,now,`cone-${i}`,rotate(d,a),{damage:scaledDamage(shooter,.62)}));
 else if(shooter.kind==='sparkWarden'&&sequence%3===0)shots=[projectile(shooter,now,'arc',d,{path:'arc',jumpable:true,speed:3.35,life:2.8,damage:scaledDamage(shooter,1.15)})];
 else if(shooter.kind==='coilStalker'&&sequence%3===0)shots=[-.11,.11].map((a,i)=>projectile(shooter,now,`fork-${i}`,rotate(d,a),{damage:scaledDamage(shooter,.72)}));
 else shots=[projectile(shooter,now,'single',d)];
 return bounded(shots,activeCount,cap);
}

export function advanceEnemyProjectileBehaviors(projectiles,target,dt,{cap=ENEMY_PROJECTILE_CAP}={}){
 const additions=[];
 for(const shot of projectiles){if(shot.dead||!shot.hostile||!(Number(shot.life)>0))continue;const age=Number(shot.age)||0;
  if(shot.homingTurnRate&&age<(shot.homingUntil??Infinity)&&target){const current=Math.atan2(shot.dy,shot.dx),desired=Math.atan2(target.y+.52-shot.y,target.x+.5-shot.x),delta=Math.atan2(Math.sin(desired-current),Math.cos(desired-current)),turn=Math.max(-shot.homingTurnRate*dt,Math.min(shot.homingTurnRate*dt,delta)),next=current+turn;shot.dx=Math.cos(next);shot.dy=Math.sin(next)}
  if(shot.splitAfter!=null&&!shot.splitDone&&age>=shot.splitAfter){shot.splitDone=true;const count=Math.max(2,Math.min(5,shot.splitCount||3)),spread=Math.min(.8,Math.max(.15,shot.splitSpread||.5)),base={x:shot.dx,y:shot.dy};for(let i=0;i<count;i++){const angle=count===1?0:-spread/2+spread*i/(count-1),d=rotate(base,angle);additions.push({...shot,id:`${shot.id}-split-${i}`,dx:d.x,dy:d.y,life:Math.min(1.6,shot.life),damage:Math.max(1,Math.ceil(shot.damage*.65)),age:0,splitAfter:null,splitDone:true})}shot.dead=true}
 }
 const live=projectiles.filter(p=>!p.dead),room=Math.max(0,Math.min(cap,ENEMY_PROJECTILE_CAP)-live.length);
 return [...live,...additions.slice(0,room)];
}
