import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { closeViewCueSegmentOpen } from '../src/close-view.ts';
import { drawToolForms } from '../src/tool-forms.ts';
import { drawOrbit, ORBIT } from '../src/orbit-volley.ts';

const context = (calls:any[]) => new Proxy({ canvas:{width:800,height:600}, globalAlpha:1 }, { get(o:any,k:any) { if (k in o) return o[k]; return (...a:any[]) => { calls.push([k,...a]); return k === 'createRadialGradient' ? { addColorStop(){} } : undefined; }; }, set(o:any,k:any,v:any){o[k]=v;return true;} });
const openMap = (w=6,h=6) => ({width:w,height:h,tiles:Array.from({length:w*h},()=>({blocked:false,seen:true,discovered:true}))});

test('exact source masks only the admitted Fire shell and Orbit flight body', () => {
  const fireA:any={id:'a',x:2,y:2,dx:1,dy:0,age:.02,fireBomb:true},fireB:any={...fireA,id:'b'};
  const flight:any={x:3,y:2,tx:4,ty:2,radius:ORBIT.radius,perfect:false};
  const game:any={lastUpdateNow:1000,presentation:{},effects:[],projectiles:[fireA,fireB],orbit:{flight}};
  const owned:any=new Set([fireA]);owned.orbit=flight;
  const masked:any[]=[];drawToolForms(context(masked),game,(q:any)=>[q.x*40,q.y*40],40,0,owned);drawOrbit(context(masked),game,(q:any)=>[q.x*40,q.y*40],40,0,owned);
  const ordinary:any[]=[];drawToolForms(context(ordinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);drawOrbit(context(ordinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);
  assert.ok(masked.filter(q=>q[0]==='arc').length<ordinary.filter(q=>q[0]==='arc').length,'one Fire and one Orbit body are exclusively owned');
  const equal:any[]=[];drawToolForms(context(equal),game,(q:any)=>[q.x*40,q.y*40],40,0,new Set([{...fireA}]));
  const fireOnlyOrdinary:any[]=[];drawToolForms(context(fireOnlyOrdinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);
  assert.equal(equal.filter(q=>q[0]==='arc').length,fireOnlyOrdinary.filter(q=>q[0]==='arc').length,'equal coordinates do not mask a distinct source reference');
});

test('bounded supercover rejects walls, corners, map wrap and over-eight-cell segments', () => {
  const map:any=openMap();
  assert.equal(closeViewCueSegmentOpen(map,.2,.2,2.8,.2),true);
  map.tiles[1].blocked=true;assert.equal(closeViewCueSegmentOpen(map,.2,.2,2.8,.2),false);
  map.tiles[1].blocked=false;map.tiles[1*6+0].blocked=true;assert.equal(closeViewCueSegmentOpen(map,.2,.2,1.8,1.8),false,'corner-touch side cell is covered');
  assert.equal(closeViewCueSegmentOpen(map,-.1,.2,.2,.2),false);
  assert.equal(closeViewCueSegmentOpen(openMap(20,2),.1,.2,10.1,.2),false);
});

test('Fire survives JSON while Orbit gather and flight remain intentionally absent', () => {
  const g:any=new Game(freshSave(77),1000);g.save.lastAim={x:1,y:0};g.lastUpdateNow=1000;
  assert.equal(g.castSpell('fire-burst'),true);const fire=g.projectiles.filter((p:any)=>p.fireBomb);assert.equal(fire.length,5);
  g.orbit={start:900,flight:{x:10.5,y:10.45,tx:14,y2:10.45,radius:ORBIT.radius,perfect:false,damage:1}};
  g.setPaused(true,1010);const back:any=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1010)))),9000);
  assert.equal(back.projectiles.filter((p:any)=>p.fireBomb).length,5);assert.equal(back.orbit==null,true);
});
