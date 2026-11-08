import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshTeleportOptions, resolveTeleportTarget } from '../src/proving-ground-labs.ts';

function fakeSelect(){
  return {value:'',options:[],rebuilds:0,changes:0,replaceChildren(...options){this.rebuilds++;this.options=[...options]},add(option){this.options.push(option)}};
}
const option=(label,value)=>({label,value});

test('teleport options refresh only for id or label changes and retain valid selection',()=>{
  const select=fakeSelect(),floor1=[{id:'entry',label:'Entrance',x:1,y:1},{id:'exit',label:'Exit',x:2,y:2},{id:'building-stair-up',label:'Gallery',x:3,y:3}];
  let signature=refreshTeleportOptions(select,floor1,'',option);select.value='building-stair-up';
  signature=refreshTeleportOptions(select,floor1.map(q=>({...q,x:q.x+20,y:q.y+20})),signature,option);
  assert.equal(select.rebuilds,1,'coordinate-only movement does not rebuild the select');assert.equal(select.value,'building-stair-up');
  const floor2=[{id:'entry',label:'Entrance',x:4,y:4},{id:'building-stair-down',label:'Gallery stairs down',x:5,y:5},{id:'building-stair-up',label:'Solar stairs up',x:6,y:6}];
  signature=refreshTeleportOptions(select,floor2,signature,option);
  assert.equal(select.rebuilds,2);assert.equal(select.value,'building-stair-up','same id survives a label refresh');assert.deepEqual(select.options.map(q=>q.value),['','entry','building-stair-down','building-stair-up']);assert.equal(select.changes,0,'refresh never dispatches a selection change');
  select.value='building-stair-down';signature=refreshTeleportOptions(select,[{id:'entry',label:'Entrance',x:7,y:7}],signature,option);
  assert.equal(select.value,'','removed targets return to the placeholder without teleporting');assert.equal(select.changes,0);
});

test('selection resolves coordinates from the current target collection rather than option-time records',()=>{
  const stale=[{id:'building-stair-down',label:'Down',x:1,y:1}],live=[{id:'building-stair-down',label:'Down',x:19,y:23}],selected='building-stair-down';
  refreshTeleportOptions(fakeSelect(),stale,'',option);
  assert.deepEqual(resolveTeleportTarget(live,selected),{id:'building-stair-down',label:'Down',x:19,y:23});
  assert.equal(resolveTeleportTarget(live,'removed-exit'),null);
});
