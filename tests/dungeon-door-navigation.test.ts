import test from "node:test";
import assert from "node:assert/strict";
import { freshSave } from "../src/types.ts";
import { Game, currentDungeonDoors, dungeonDoorId } from "../src/game.ts";
import { serializeSave, deserializeSave } from "../src/persistence.ts";
import { pentagonPlan } from "../src/pentagon.ts";
import { labFogLook, generateRoomMazeFloor, openRoomGate } from "../src/labyrinths.ts";
import { dungeonNavigationDoors } from "../src/atlas-view.ts";
import { closeViewCompassRotation } from "../src/close-view.ts";

const doors = g => dungeonNavigationDoors(g.save,g.map,g.areaId(),currentDungeonDoors(g.map,g.areaId()));
const act = (g, door) => {
  Object.assign(g.player,{x:door.x,y:door.y});
  assert.equal(g.interact(door.actions[0],door.id).ok,true);
  g.updateDungeonDiscovery(true);
};

test("Pentagon records the exact arrival door and remembers a different traversed door after backtracking and reload", () => {
  const save=freshSave();save.seed="TIM1";
  const plan=pentagonPlan(save.seed,0,0,10);
  const id=tag=>plan.base+":f"+(plan.nodes.find(n=>n.id===tag).n+1);
  const g=new Game(save,0);save.session.activeDungeonId=id("o0");
  save.session.dungeonReturn={rx:0,ry:0,x:16,y:16};
  g.loadArea("dungeon",false);
  const to=tag=>g.map.objects.find(o=>o.kind==="buildingStair"&&o.toId===id(tag));
  act(g,to("o1"));
  const a=to("o0"), b=to("o2"), chamber=g.areaId(), aId=dungeonDoorId(chamber,a), bId=dungeonDoorId(chamber,b);
  assert.equal(doors(g).find(o=>o.id===aId)?.mark,"arrival");
  assert.equal(doors(g).find(o=>o.id===bId),undefined,"the distant door has not been seen");
  Object.assign(g.player,{x:b.x,y:b.y});g.labFogTick();
  assert.equal(doors(g).find(o=>o.id===bId)?.mark,"known");
  assert.equal(g.toggleDungeonDoorWaypoint(aId),true);
  assert.equal(doors(g).find(o=>o.id===aId)?.slot,1);
  act(g,b);act(g,to("o1"));g.sync();
  const reload=new Game(deserializeSave(serializeSave(save)),0);
  assert.equal(reload.save.version,14);
  assert.equal(reload.areaId(),chamber);
  labFogLook(reload.map,a.x,a.y);labFogLook(reload.map,b.x,b.y);
  assert.equal(doors(reload).find(o=>o.id===aId)?.mark,"visited");
  assert.equal(doors(reload).find(o=>o.id===aId)?.slot,1);
  assert.equal(doors(reload).find(o=>o.id===bId)?.mark,"arrival");
});

test("Cube doorway needs sight and a crossing; point cap preserves the first three", () => {
  const g=new Game(freshSave(),0);
  const w=8,h=7, areaId="labyrinth:LB5:5:5:keep:f1";
  g.area="dungeon";g.save.session.activeDungeonId=areaId;
  g.map={id:areaId,width:w,height:h,building:{labyrinth:true,roomMaze:1},objects:[{kind:"exit",id:"A",x:1,y:2},{kind:"exit",id:"B",x:1,y:3},{kind:"exit",id:"C",x:1,y:4}],tiles:Array.from({length:w*h},(_,i)=>{
    const x=i%w,y=Math.floor(i/w);return {x,y,blocked:x===3&&y!==3,doorway:x===3&&y===3};
  })};
  assert.deepEqual(doors(g),[]);
  assert.equal(g.toggleDungeonDoorWaypoint(areaId+"::A"),false);
  labFogLook(g.map,2,3);
  const key=dungeonDoorId(areaId,{x:3,y:3});
  assert.equal(doors(g).find(o=>o.id===key)?.mark,"known");
  g.noteInternalDoorCrossings(2.3,3,2.9,3);
  g.noteInternalDoorCrossings(2.9,3,2.3,3);
  assert.equal(doors(g).find(o=>o.id===key)?.mark,"known");
  g.noteInternalDoorCrossings(2.3,3,3,3);
  g.noteInternalDoorCrossings(3,3,3.7,3);
  assert.equal(doors(g).find(o=>o.id===key)?.mark,"arrival");
  for(const id of [key,"A","B"].map(id=>id===key?id:areaId+"::"+id))assert.equal(g.toggleDungeonDoorWaypoint(id),true);
  assert.equal(g.toggleDungeonDoorWaypoint(areaId+"::C"),false);
  assert.equal(doors(g).find(o=>o.id===key)?.slot,1);
  assert.equal(g.toggleDungeonDoorWaypoint(key),true);
  assert.equal(doors(g).find(o=>o.id===key)?.slot,null);
});

test("An opened Cube gate has one map identity even after rebuilding candidate data",()=>{
  const areaId="labyrinth:R13:0:0:keep~r2:f2",map=generateRoomMazeFloor("R13",areaId);
  const gate=map.objects.find(o=>o.kind==="labGate");
  assert.ok(gate);
  openRoomGate(map,gate);
  const points=currentDungeonDoors(map,areaId);
  assert.deepEqual(points.filter(o=>o.x===gate.x&&o.y===gate.y).map(o=>o.id),[dungeonDoorId(areaId,gate)]);
  const exit=map.objects.find(o=>o.kind==="exit");
  assert.equal(points.filter(o=>o.x===exit.x&&o.y===exit.y).length,1);
});

test("Compass north stays in world coordinates at each cardinal Close View yaw",()=>{
  assert.equal(closeViewCompassRotation(0,-1),0);
  assert.deepEqual([-Math.PI/2,0,Math.PI/2,Math.PI].map(yaw=>((closeViewCompassRotation(0,-1,yaw)%360)+360)%360),[0,270,180,90]);
  assert.equal(closeViewCompassRotation(1,0,0),0);
});
