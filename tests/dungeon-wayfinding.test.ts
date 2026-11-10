import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { generateUnifiedDungeon } from '../src/arenas.ts';
import { deepV2Id, generateDeepV2Dungeon } from '../src/deep-dungeons.ts';
import { generateLabyrinthChamber, labFogLook, labFogState } from '../src/labyrinths.ts';
import { applyDungeonDiscovery, revealDungeonAt, dungeonPointDiscovered } from '../src/dungeon-framework.ts';
import { dungeonWayfinding, renderDungeonWayfindingPanel } from '../src/atlas-view.ts';

test('ordinary generated dungeon route markers obey chunk discovery without changing layout or save', () => {
  const save = freshSave(), map = generateUnifiedDungeon('FOG', 'fog:kiln', 'kiln', { sizeProfile: 'extended', variant: 2 });
  applyDungeonDiscovery(map, []);
  assert.deepEqual(dungeonWayfinding(save, map, map.entry).doors, []);
  assert.equal(dungeonWayfinding(save, map, map.entry).arrival, null);
  applyDungeonDiscovery(map, revealDungeonAt(map, [], map.entry.x, map.entry.y));
  const before = JSON.stringify([save, map]), result = dungeonWayfinding(save, map, map.entry);
  assert.ok(result.doors.some(o => o.direction === 'OUT'));
  assert.equal(result.arrivalLabel, 'FLOOR ENTRY'); assert.deepEqual(result.arrival, map.entry);
  assert.ok(result.doors.every(o => dungeonPointDiscovered(map, o)));
  assert.equal(result.previous, null); assert.equal(JSON.stringify([save, map]), before);
});

test('real deep-floor transition, canonical reload and inspection keep floor identity and unknown destinations separate', () => {
  const save = freshSave(), id = deepV2Id(save.seed, 1, 4, -8, 'descent');
  save.session.activeDungeonId = id; save.session.activeDungeonLevelId = 'mouth'; save.session.dungeonReturn = { rx: 4, ry: -8, x: 8, y: 8 };
  const g = new Game(save, 0); g.loadArea('dungeon', false);
  const down = g.map.objects.find(o => o.kind === 'deepTransition' && o.toLevelId === 'pressure');
  Object.assign(g.player, { x: down.x, y: down.y }); g.updateDungeonDiscovery(true);
  const result = dungeonWayfinding(save, g.map, g.player, { areaId: id });
  assert.equal(result.doors.find(o => o.id === down.id).target, 'Unexplored level');
  assert.equal(result.doors.find(o => o.id === down.id).direction, 'DOWN');
  assert.equal(g.interact('travel', down.id).ok, true); assert.equal(g.map.levelId, 'pressure');
  g.updateDungeonDiscovery(true); g.sync();
  const reloaded = new Game(deserializeSave(serializeSave(save)), 0);
  assert.equal(reloaded.map.levelId, 'pressure');
  const inspected = generateDeepV2Dungeon(save.seed, id, { levelId: 'mouth' });
  applyDungeonDiscovery(inspected, revealDungeonAt(inspected, [], down.x, down.y));
  const other = dungeonWayfinding(reloaded.save, inspected, reloaded.player, { areaId: id, current: false });
  assert.equal(other.position, null); assert.equal(other.arrival, null); assert.equal(other.previous, null);
  assert.equal(other.doors.find(o => o.id === down.id).target, inspected.levels.find(l => l.id === 'pressure').name);
  const hidden = inspected.objects.find(o => o.state === 'hidden'); assert.ok(hidden);
  applyDungeonDiscovery(inspected, revealDungeonAt(inspected, [...inspected._dungeonRevealed], hidden.x, hidden.y));
  assert.ok(!dungeonWayfinding(save, inspected, g.player, { current: false, areaId: id }).doors.some(o => o.id === hidden.id));
});

test('actual labyrinth route list respects sight memory and never reveals concealed doors', () => {
  const map = generateLabyrinthChamber('LB5', 'labyrinth:LB5:5:5:keep:f1'), save = freshSave();
  assert.deepEqual(dungeonWayfinding(save, map, map.entry).doors, []);
  labFogLook(map, map.entry.x, map.entry.y);
  const result = dungeonWayfinding(save, map, map.entry);
  assert.ok(result.doors.length); assert.ok(result.doors.every(o => labFogState(map, o.x, o.y) > 0));
  assert.ok(!result.doors.some(o => map.objects.find(q => q.id === o.id)?.secretDoor));
});

test('the shared production/scratch panel renders known routes and keeps inspected floors free of player or entry cues', () => {
  const doc = { createElement: tag => ({ tag, ownerDocument: doc, children: [], textContent: '', classList: { add() {} }, setAttribute() {}, append(...nodes) { this.children.push(...nodes); }, replaceChildren() { this.children = []; } }) };
  const text = node => [node.textContent, ...node.children.map(text)].join(' '), panel = doc.createElement('div');
  const save = freshSave(), map = generateUnifiedDungeon('FOG', 'fog:kiln', 'kiln', { sizeProfile: 'extended', variant: 2 });
  applyDungeonDiscovery(map, revealDungeonAt(map, [], map.entry.x, map.entry.y));
  const before = JSON.stringify([save, map]);
  renderDungeonWayfindingPanel(panel, dungeonWayfinding(save, map, map.entry), map);
  assert.match(text(panel), /You are here/); assert.match(text(panel), /FLOOR ENTRY:/); assert.match(text(panel), /OUT/);
  renderDungeonWayfindingPanel(panel, dungeonWayfinding(save, map, map.entry, { current: false }), map);
  assert.match(text(panel), /Inspecting/); assert.doesNotMatch(text(panel), /You are here|FLOOR ENTRY:|ARRIVAL:/);
  assert.equal(JSON.stringify([save, map]), before);
  renderDungeonWayfindingPanel(panel, null, map); assert.equal(panel.hidden, true); assert.equal(panel.children.length, 0);
});
