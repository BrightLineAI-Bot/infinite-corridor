import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SKY_SUMMIT, skySummitLanding } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { skylandAdmission, beginSkyland } from '../src/skylands.ts';
import { canopyGateDestination } from '../src/trees.ts';
import { createLabFixture, scenariosForLab, labReport } from '../src/proving-ground-labs.ts';

function start() {
  const s = freshSave(); s.seed = 'SKYTREE';
  const g = new Game(s, 0); g.rx = 38; g.ry = 18; g.loadArea('overworld');
  assert.ok(skySummitLanding(g.map)); return g;
}
function enter(g) {
  const gate = g.map.objects.find((o) => o.kind === 'canopyGate');
  Object.assign(g.player, { x: gate.x, y: gate.y - .2 });
  const r = g.interact('enter', gate.id); assert.ok(r.ok, g.message); assert.equal(g.area, 'dungeon');
  return g.save.consequences.dungeons[g.areaId()].skySummitRoute;
}
function clear(g) {
  const h = g.save.consequences.dungeons[g.areaId()];
  for (let wave = 0; wave < 10 && !h.resolved; wave++) {
    for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); }
    g.tickSkyland(10);
  }
  assert.ok(h.resolved); assert.ok(h.skyHop);
}
function exit(g) {
  const door = g.map.objects.find((o) => o.kind === 'exit');
  Object.assign(g.player, { x: door.x, y: door.y });
  const r = g.interact('exit', door.id); assert.ok(r.ok, g.message);
}
function reload(g) { return new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1000)))), 1000); }

test('three ordinary cloud holds continue to distinct actual summits, through mid-run and summit reloads', () => {
  let g = start(); const visited = new Set([`${g.rx},${g.ry}`]);
  g.save.future = { keep: 42 }; g.save.session.future = ['untouched'];
  for (let hop = 0; hop < 3; hop++) {
    const route = enter(g); assert.equal(route.v, 1);
    assert.equal(g.save.atlas[`${route.to.rx},${route.to.ry}`], undefined, 'a probe does not discover the destination');
    route.future = { keep: true }; g = reload(g);
    assert.deepEqual(g.save.consequences.dungeons[g.areaId()].skySummitRoute, route, 'exact route including unknown fields survives');
    clear(g); const rewards = structuredClone(g.save.skylands); g = reload(g); exit(g);
    assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [route.to.rx, route.to.ry, route.x, route.y]);
    const key = `${g.rx},${g.ry}`; assert.ok(!visited.has(key), 'never bounces to an earlier summit'); visited.add(key);
    assert.ok(skySummitLanding(g.map)); assert.deepEqual(g.save.skylands, rewards, 'exit and reload never repeat rewards');
    assert.deepEqual(g.save.future, { keep: 42 }); assert.deepEqual(g.save.session.future, ['untouched']);
    g = reload(g); assert.deepEqual([g.player.x, g.player.y], [route.x, route.y]); assert.ok(skySummitLanding(g.map));
  }
});

test('admission probes are deterministic, bounded and leave the source save untouched', () => {
  const g = start(), before = structuredClone(g.save);
  const load = Game.prototype.loadArea; let loads = 0, a, b;
  try {
    Game.prototype.loadArea = function (...args) {
      loads++; assert.equal(canopyGateDestination(this.save.seed, this.rx, this.ry), 'cloud', 'known Starfield candidates never construct a Game');
      return load.apply(this, args);
    };
    a = g.planSkySummit(); b = g.planSkySummit();
  } finally { Game.prototype.loadArea = load; }
  assert.ok(loads <= 2 * SKY_SUMMIT.loads, `${loads} candidate loads`);
  assert.equal(loads, 2, 'SKYTREE 38,18 needs one actual candidate per admission, previously six');
  assert.ok(a); assert.deepEqual(a, b); assert.deepEqual(g.save, before);
  assert.deepEqual(reload(g).planSkySummit(), a, 'admission is identical after a save reload');
  const limit = SKY_SUMMIT.loads;
  try {
    SKY_SUMMIT.loads = 0;
    const gate = g.map.objects.find((o) => o.kind === 'canopyGate'); Object.assign(g.player, { x: gate.x, y: gate.y - .2 }); g.sync();
    const runs = g.save.skylands.runs, atlas = structuredClone(g.save.atlas);
    assert.equal(g.interact('enter', gate.id).ok, false); assert.equal(g.area, 'overworld');
    assert.equal(g.save.skylands.runs, runs); assert.deepEqual(g.save.atlas, atlas);
  } finally { SKY_SUMMIT.loads = limit; }
});

test('previously pinned cloud doors retain the legacy route and run history', () => {
  const g = start(); delete g.save.atlas[`${g.rx},${g.ry}`].skySummitVersion;
  g.loadArea('overworld'); assert.equal(enter(g), undefined);
});

test('landing validation rejects missing, blocked, non-cloud and detached summit gates', () => {
  const g = start(), map = g.map, gate = map.objects.find((o) => o.kind === 'canopyGate');
  for (const change of [
    (m) => { m.objects = m.objects.filter((o) => o.kind !== 'canopyGate'); },
    (m) => { m.tiles[gate.y * 32 + gate.x].blocked = true; },
    (m) => { m.objects.find((o) => o.kind === 'canopyGate').dest = 'starfield'; },
    (m) => { m.canopy.x0 = 0; m.canopy.y0 = 0; },
  ]) { const copy = structuredClone(map); change(copy); assert.equal(skySummitLanding(copy), null); }
});

test('schema 14 keeps route unknown fields and future versions, and refuses malformed supported routes', () => {
  const g = start(), route = enter(g), id = g.areaId();
  route.atlas.future = { untouched: 7 }; route.future = ['kept'];
  const copy = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(0))));
  assert.equal(copy.version, 14); assert.deepEqual(copy.consequences.dungeons[id].skySummitRoute, route);
  copy.consequences.dungeons[id].skySummitRoute.v = 2;
  assert.deepEqual(migrateSave(copy).consequences.dungeons[id].skySummitRoute, { ...route, v: 2 });
  copy.consequences.dungeons[id].skySummitRoute = { ...route, to: { rx: 'broken', ry: 1 } };
  assert.equal(migrateSave(copy).consequences.dungeons[id].skySummitRoute, null);
});

test('arrival verifies current pins before live mutations and uses actual footing instead of saved coordinates', () => {
  const g = start(), route = enter(g); clear(g);
  const expected = { x: route.x, y: route.y }; route.x = 1; route.y = 1;
  const before = structuredClone(g.save), liveMap = g.map, snapshot = g.snapshotArea, load = Game.prototype.loadArea;
  let verified = false;
  try {
    Game.prototype.loadArea = function (...args) {
      if (this !== g && args[0] === 'overworld') { assert.deepEqual(g.save, before); assert.equal(g.map, liveMap); verified = true; }
      return load.apply(this, args);
    };
    g.snapshotArea = function (...args) { assert.ok(verified, 'actual destination check precedes the live snapshot'); return snapshot.apply(this, args); };
    assert.ok(g.finishSkySummit(route).ok);
  } finally { Game.prototype.loadArea = load; g.snapshotArea = snapshot; }
  assert.deepEqual({ x: g.player.x, y: g.player.y }, expected); assert.ok(skySummitLanding(g.map));
});

test('stale current pins and tampered routes retreat to the original crown without extra rewards or destination discovery', () => {
  for (const fault of ['current-pins', 'stored-pins', 'gate', 'origin', 'malformed']) {
    let g = start(); const from = [g.rx, g.ry], route = enter(g), toKey = `${route.to.rx},${route.to.ry}`;
    clear(g); const rewards = structuredClone(g.save.skylands);
    if (fault === 'current-pins') g.save.atlas[toKey] = { ...route.atlas, landscapeVersion: 0, future: { keep: 9 } };
    if (fault === 'stored-pins') route.atlas.landscapeVersion = 0;
    if (fault === 'gate') route.gateId = 'stale-door';
    if (fault === 'origin') route.from.rx++;
    if (fault === 'malformed') route.to.rx = 'bad';
    g = reload(g); const destinationBefore = structuredClone(g.save.atlas[toKey]); exit(g);
    assert.equal(g.area, 'overworld', fault); assert.deepEqual([g.rx, g.ry], from, fault);
    const landing = skySummitLanding(g.map); assert.ok(landing, fault);
    assert.deepEqual([g.player.x, g.player.y], [landing.x, landing.y], fault);
    assert.deepEqual(g.save.skylands, rewards, fault); assert.deepEqual(g.save.atlas[toKey], destinationBefore, fault);
    g = reload(g); assert.deepEqual(g.save.skylands, rewards, `retreat reload: ${fault}`);
  }
});

test('a stale source crown uses the existing safe return instead of locking the cleared run', () => {
  const g = start(), from = [g.rx, g.ry], route = enter(g); clear(g);
  const rewards = structuredClone(g.save.skylands);
  g.save.atlas[`${from[0]},${from[1]}`].landscapeVersion = 0; route.gateId = 'stale-door';
  exit(g); assert.deepEqual([g.rx, g.ry], from); assert.equal(g.area, 'overworld');
  assert.equal(g.map.canopy, undefined); const t = g.map.tiles[Math.floor(g.player.y + .2) * 32 + Math.floor(g.player.x)];
  assert.ok(t && !t.blocked); assert.deepEqual(g.save.skylands, rewards);
});

test('cheap canonical admission rejects locked or unaffordable tiers before any spend', () => {
  const s = freshSave(); s.skylands.best = 2;
  const before = structuredClone(s.skylands);
  for (const tier of [1, 4]) {
    const admission = skylandAdmission(s, tier); assert.equal(admission.ok, false);
    assert.deepEqual(admission, beginSkyland(s, { rx: 38, ry: 18 }, tier, 'cloud'));
    assert.deepEqual(s.skylands, before);
  }
});

test('scratch summit fixture exposes ordinary Act admission with uncleared cloud waves', () => {
  assert.ok(scenariosForLab('landscape').some((s) => s.id === 'great-tree-summit'));
  const fixture = createLabFixture({ lab: 'landscape', scenario: 'great-tree-summit', now: 1000 });
  const { game, save } = fixture, another = createLabFixture({ lab: 'landscape', scenario: 'great-tree-summit', seed: 'IGNORED-FOR-FIXED-FIXTURE', now: 1000 });
  assert.notEqual(save, another.save); assert.notEqual(save.session, another.save.session);
  assert.equal(save.seed, 'SKYTREE'); assert.deepEqual([game.rx, game.ry], [38, 18]); assert.ok(skySummitLanding(game.map));
  assert.equal(save.skylands.runs, 0); assert.equal(labReport(fixture).scratch, true);
  assert.ok(game.interact().ok, game.message);
  assert.equal(game.area, 'dungeon', 'Act uses the real single-action cloud door');
  const h = save.consequences.dungeons[game.areaId()]; assert.equal(h.skyWave, 0); assert.ok(!h.resolved); assert.ok(!h.skyHop);
  assert.ok(h.skySummitRoute); assert.ok(game.enemies.some((e) => !e.dead)); assert.equal(save.skylands.clears, 0);
  assert.equal(another.save.skylands.runs, 0, 'a separate fixture stays untouched');
});
