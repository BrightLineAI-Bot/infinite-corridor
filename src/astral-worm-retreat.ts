// Nearest REACHABLE Wayglass, by traversable path cost. Host graph supplies final-r251 terrain
// and physical section/dungeon transitions. No straight-line target fallback or teleport.
export const ASTRAL_RETREAT = Object.freeze({ workPerStep:625, maxNodes:4096, arrival:.18, speed:2.8 });
export function createAstralWayglassSearch(start) {
  if(!start?.key)throw new Error('Retreat start must have a stable graph key');
  return {v:1,start:{...start},open:[{...start,cost:0}],costs:{[start.key]:0},parents:{},nodes:{[start.key]:{...start}},closed:{},status:'searching',route:null,visited:0};
}
export function isAstralWayglass(node) { return node?.kind==='checkpoint' && (node.semanticRole==null||node.semanticRole==='wayglass'); }
export function stepAstralWayglassSearch(s,graph,{paused=false,budget=ASTRAL_RETREAT.workPerStep}={}) {
  if(paused||s.status!=='searching')return s;
  const work=Math.max(0,Math.min(ASTRAL_RETREAT.workPerStep,Math.floor(budget)));let expanded=0;
  while(s.open.length&&expanded<work){
    s.open.sort((a,b)=>a.cost-b.cost||a.key.localeCompare(b.key));const current=s.open.shift();
    if(s.closed[current.key]||current.cost!==s.costs[current.key])continue;
    s.closed[current.key]=true;s.visited++;expanded++;
    const node=s.nodes[current.key];
    if(isAstralWayglass(graph.describe(node))){const path=[];let key=current.key;while(key!=null){path.push({...s.nodes[key]});key=s.parents[key];}s.route=path.reverse();s.goal={...graph.describe(node)};s.distance=current.cost;s.status='ready';break;}
    for(const edge of graph.neighbors(node)||[]){
      const to=edge.node,cost=Number(edge.cost);
      if(!to?.key||!Number.isFinite(cost)||cost<=0||s.closed[to.key])continue;
      const next=current.cost+cost;if(next>=(s.costs[to.key]??Infinity))continue;
      if(!s.nodes[to.key]&&Object.keys(s.nodes).length>=ASTRAL_RETREAT.maxNodes){s.status='budget-blocked';s.reason='Reachability search storage budget exhausted';return s;}
      s.nodes[to.key]={...to};s.costs[to.key]=next;s.parents[to.key]=current.key;s.open.push({...to,cost:next});
    }
  }
  if(!s.open.length&&s.status==='searching'){s.status='no-route';s.reason='No reachable Wayglass in the supplied physical graph';}
  return s;
}
export function createAstralRetreatJourney(search) {
  if(search.status!=='ready'||!search.route?.length)return null;
  return {v:1,route:search.route.map(q=>({...q})),index:1,goal:{...search.goal},complete:false,blocked:false};
}
export function stepAstralRetreat(actor,journey,dt,host) {
  if(host.paused||host.unloaded||journey.complete||!(dt>0))return;
  const to=journey.route[journey.index];
  if(!to){journey.complete=true;return;}
  if(to.sceneKey!==host.sceneKey){
    // Cross only through an actual verified transition reached by the previous waypoint.
    if(host.crossPhysicalTransition?.(actor,to)===true){journey.index++;journey.blocked=false;}else journey.blocked=true;
    return;
  }
  const dx=to.x-actor.x,dy=to.y-actor.y,d=Math.hypot(dx,dy);
  if(d<=ASTRAL_RETREAT.arrival){journey.index++;journey.blocked=false;if(journey.index>=journey.route.length)journey.complete=true;return;}
  const step=Math.min(d,ASTRAL_RETREAT.speed*Math.min(dt,.25));
  journey.blocked=host.move(actor,dx/d*step,dy/d*step)!==true;
}
