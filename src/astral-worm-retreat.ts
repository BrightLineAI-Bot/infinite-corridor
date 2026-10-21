// Serialized Dijkstra search over the host's physical graph. A memory/work limit is not
// evidence of disconnection and never permits a guessed destination or teleport.
export const ASTRAL_RETREAT = Object.freeze({ workPerStep:625, maxNodes:65536, arrival:.18, speed:2.8 });
const before = (a,b) => a.cost < b.cost || a.cost === b.cost && a.key < b.key;
function push(heap, item) { let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(!before(item,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=item; }
function pop(heap) { const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&before(heap[c+1],heap[c]))c++;if(!before(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return first; }
export function createAstralWayglassSearch(start) {
  if(!start?.key)throw new Error('Retreat start must have a stable graph key');
  return {v:1,heapVersion:1,nodeCount:1,start:{...start},open:[{...start,cost:0}],costs:{[start.key]:0},parents:{},nodes:{[start.key]:{...start}},closed:{},status:'searching',route:null,visited:0};
}
export function isAstralWayglass(node) { return node?.kind==='checkpoint' && (node.semanticRole==null||node.semanticRole==='wayglass'); }
export function stepAstralWayglassSearch(s,graph,{paused=false,budget=ASTRAL_RETREAT.workPerStep}={}) {
  if(paused||s.status!=='searching')return s;
  if(!s.heapVersion){const prior=s.open;s.open=[];for(const q of prior)push(s.open,q);s.heapVersion=1;}
  s.nodeCount??=Object.keys(s.nodes).length;
  const work=Math.max(0,Math.min(ASTRAL_RETREAT.workPerStep,Math.floor(budget)));let expanded=0,popped=0;
  graph.beginStep?.();s.lastStepWork=0;
  while(s.open.length&&expanded<work&&popped<work){
    const current=pop(s.open);popped++;
    if(s.closed[current.key]||current.cost!==s.costs[current.key])continue;
    const node=s.nodes[current.key],description=graph.describe(node);
    if(description==null){push(s.open,current);break;}
    if(isAstralWayglass(description)){
      const path=[];let key=current.key;while(key!=null){path.push({...s.nodes[key]});key=s.parents[key];}
      s.route=path.reverse();s.goal={...description};s.distance=current.cost;s.status='ready';s.closed[current.key]=true;s.visited++;expanded++;break;
    }
    const edges=graph.neighbors(node);
    // A lazy native graph can defer an expansion until the next active frame, retaining
    // its exact queue position/cost. No incomplete neighborhood can produce a false minimum.
    if(edges==null){push(s.open,current);break;}
    s.closed[current.key]=true;s.visited++;expanded++;
    for(const edge of edges){
      const to=edge.node,cost=Number(edge.cost);
      if(!to?.key||!Number.isFinite(cost)||cost<=0||s.closed[to.key])continue;
      const next=current.cost+cost;if(next>=(s.costs[to.key]??Infinity))continue;
      if(!s.nodes[to.key]&&s.nodeCount>=ASTRAL_RETREAT.maxNodes){s.status='budget-blocked';s.reason='Reachability search storage budget exhausted; no destination is assumed';s.lastStepWork=popped;return s;}
      if(!s.nodes[to.key])s.nodeCount++;
      s.nodes[to.key]={...to};s.costs[to.key]=next;s.parents[to.key]=current.key;push(s.open,{key:to.key,cost:next});
    }
  }
  s.lastStepWork=popped;
  if(graph.blockedReason){s.status='budget-blocked';s.reason=graph.blockedReason;}
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
    if(host.crossPhysicalTransition?.(actor,to,journey.route[journey.index-1])===true){journey.index++;journey.blocked=false;if(journey.index>=journey.route.length)journey.complete=true;}else journey.blocked=true;
    return;
  }
  const dx=to.x-actor.x,dy=to.y-actor.y,d=Math.hypot(dx,dy);
  if(d<1e-8){journey.index++;journey.blocked=false;if(journey.index>=journey.route.length)journey.complete=true;return;}
  const step=Math.min(d,ASTRAL_RETREAT.speed*Math.min(dt,.25));
  journey.blocked=host.move(actor,dx/d*step,dy/d*step)!==true;
  // Finish on the actual waypoint. Arrival tolerance must not cut a corner through a wall
  // or leave the final Wayglass untouched merely because it is visually close.
  if(!journey.blocked&&Math.hypot(to.x-actor.x,to.y-actor.y)<1e-8){journey.index++;if(journey.index>=journey.route.length)journey.complete=true;}
}
