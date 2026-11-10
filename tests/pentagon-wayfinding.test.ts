import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { Game } from '../src/game.ts';
import { pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { pentagonWayfinding } from '../src/atlas-view.ts';

const setup = (version = 10, node = 'o0') => {
  const save = freshSave(); save.seed = 'TIM1';
  const plan = pentagonPlan(save.seed, 0, 0, version), g = new Game(save, 0);
  save.session.activeDungeonId = id(plan, node); save.session.dungeonReturn = { rx: 0, ry: 0, x: 16, y: 16 };
  g.loadArea('dungeon', false); g.player.x = g.map.entry.x; g.player.y = g.map.entry.y; g.noteFloorEntry(); g.labyrinthProgress();
  return { g, plan };
};
const id = (p, node) => `${p.base}:f${p.nodes.find(n => n.id === node).n + 1}`;
const view = g => pentagonWayfinding(g.save, g.map, g.player, g.pentagonPrevious);
const act = (g, o) => { assert.ok(o); g.player.x = o.x; g.player.y = o.y; const result = g.interact(o.kind === 'pentShortcut' ? 'use' : o.dir === 'down' ? 'descend' : 'climb', o.id); assert.equal(result.ok, true, result.message); g.noteFloorEntry(); };

test('Pentagon Atlas reads only discovered chambers and conceals secret destinations without mutating save or map', () => {
  for (const version of [1, 8, 9, 10]) {
    const { g, plan } = setup(version), before = JSON.stringify([g.save, g.map]);
    const result = view(g); assert.equal(result.rooms.length, 1); assert.equal(result.rooms[0].current, true);
    for (const door of result.doors) if (door.direction !== 'OUT') assert.equal(door.target, 'Unexplored');
    assert.equal(JSON.stringify([g.save, g.map]), before);
    const secret = plan.edges.find(e => e.secret);
    if (secret) {
      const source = plan.nodes.find(n => n.id === secret.a), map = generatePentagonChamber(g.save.seed, `${plan.base}:f${source.n+1}`);
      const output = pentagonWayfinding(g.save, map, map.entry);
      assert.ok(!output.doors.some(d => map.objects.find(o => o.id === d.id)?.secretDoor));
    }
  }
});

test('real door transitions and repeated long backtracking retain exact previous chamber and known destination labels', () => {
  for (const version of [8, 9, 10]) {
    const { g, plan } = setup(version);
    // Twenty accepted transitions, including repeated returns, using actual generated doors.
    for (const node of Array(5).fill(['o1','o2','o1','o0']).flat()) {
      const from = g.areaId(), target = id(plan, node), door = g.map.objects.find(o => o.kind === 'buildingStair' && o.toId === target);
      act(g, door); const result = view(g);
      assert.equal(g.areaId(), target); assert.ok(result.previous);
      assert.ok(result.doors.some(d => d.back && g.map.objects.find(o => o.id === d.id).toId === from));
      assert.equal(result.rooms.filter(r => r.current).length, 1);
    }
    assert.equal(view(g).rooms.length, 3);
    g.loadArea('overworld', false); assert.equal(g.pentagonPrevious, null);
    assert.equal(view(g), null);
  }
});

test('Heart up/down and opened shortcuts report current connection and previous route through actual transitions', () => {
  const { g, plan } = setup(10, 'h0');
  const down = g.map.objects.find(o => o.kind === 'buildingStair' && o.dir === 'down'); assert.ok(down);
  assert.ok(view(g).doors.find(d => d.id === down.id).blocked);
  for (const enemy of g.enemies) if (enemy.pentBoss) { enemy.dead = true; enemy.hp = 0; }
  g.update(0, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1);
  assert.equal(view(g).doors.find(d => d.id === down.id).blocked, false);
  act(g, down); assert.ok(view(g).doors.some(d => d.direction === 'UP' && d.back));
  const shortcut = g.map.objects.find(o => o.kind === 'pentShortcut' && o.end === 'deep'); assert.ok(shortcut);
  const from = g.areaId(), link = shortcut.link;
  act(g, shortcut); assert.ok(view(g).doors.some(d => d.direction === 'SHORTCUT' && d.back && !d.blocked));
  act(g, g.map.objects.find(o => o.kind === 'pentShortcut' && o.link === link)); assert.equal(g.areaId(), from);
  assert.ok(view(g).doors.some(d => d.direction === 'SHORTCUT' && d.back));
});

test('canonical reload keeps discovery, saved arrival, unknown fields and pinned layout without inventing previous route', () => {
  const { g, plan } = setup(9); act(g, g.map.objects.find(o => o.toId === id(plan, 'o1')));
  g.save.futureWayfindingField = { untouched: true }; g.save.session.floorEntry.future = 'keep';
  g.sync(); const before = view(g), tiles = JSON.stringify(g.map.tiles);
  const save = deserializeSave(serializeSave(g.save)), reloaded = new Game(save, 0), after = view(reloaded);
  assert.deepEqual(after.rooms, before.rooms); assert.deepEqual(after.arrival, before.arrival); assert.equal(after.previous, null);
  assert.deepEqual(save.futureWayfindingField, { untouched: true }); assert.equal(save.session.floorEntry.future, 'keep');
  assert.equal(JSON.stringify(reloaded.map.tiles), tiles); assert.equal(reloaded.map.building.V, 9); assert.equal(save.version, 14);
});

test('route status follows durable key/bolt state and a live weighted pressure plate', () => {
  const { g, plan } = setup(10, 'o8'), history = g.save.consequences.dungeons[`${plan.base}:f1`];
  const plateDoor = g.map.objects.find(o => o.plateLock), plate = g.map.tiles.find(t => t.plate);
  assert.ok(plateDoor && plate); assert.equal(view(g).doors.find(d => d.id === plateDoor.id).blocked, true);
  plate.build = 'stone'; assert.equal(view(g).doors.find(d => d.id === plateDoor.id).blocked, false);
  delete plate.build; history.labOpen = [`plate:${g.map.building.node}`];
  assert.equal(view(g).doors.find(d => d.id === plateDoor.id).blocked, false);
  const door = g.map.objects.find(o => o.kind === 'buildingStair');
  door.lock = 'test-key'; door.barred = true; door.shortcutKey = 'test-bolt';
  assert.equal(view(g).doors.find(d => d.id === door.id).blocked, true);
  history.labKeys = ['test-key']; history.labOpen.push('test-bolt');
  assert.equal(view(g).doors.find(d => d.id === door.id).blocked, false);
});


