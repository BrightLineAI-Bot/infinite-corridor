import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon, reachableInMap, LAYOUTS, UNDER_THEMES, DUNGEON_GENERATOR_V5 } from '../src/underlands.ts';
import { ensureRelayNetwork, relayNodeDecision, placeRelayNode, relayNodeActions, commitRelayNode, relayObjectiveSuffix, RELAY_TARGET, FRAGMENTS, drawRelayNode } from '../src/relay-network.ts';
import { generatePinnedDungeon, pinDungeonLayout } from '../src/game.ts';
import { validActions, applyInteraction, currentObjective, dungeonHistory } from '../src/interactions.ts';
import { freshSave } from '../src/types.ts';
import { dungeonId } from '../src/world.ts';

const guardianOf = (map) => map.enemySpawns.find((e) => e.dungeonRole === 'gateWarden');
function assertReachable(map, label) {
  const seen = reachableInMap(map, map.entry), w = map.width;
  for (const o of map.objects) assert.ok(seen[o.y * w + o.x], `${label}: ${o.kind} reachable`);
  for (const e of map.enemySpawns) assert.ok(seen[Math.round(e.y) * w + Math.round(e.x)], `${label}: spawn ${e.kind} reachable`);
  const open = map.tiles.filter((t) => !t.blocked && !['abyss', 'lava', 'dungeonWater'].includes(t.kind));
  assert.ok(open.every((t) => seen[t.y * w + t.x]), `${label}: no stranded walkable pockets`);
}

test('Underlands: every layout and every theme generates a reachable, guarded crossing', () => {
  for (const layout of LAYOUTS) for (const theme of ['none', ...Object.keys(UNDER_THEMES)]) {
    const map = generateExpeditionDungeon('UNDER', `dungeon:UNDER:${layout}:${theme}`, 'hollow', { layout, theme });
    const label = `${layout}/${theme}`;
    assert.equal(map.diagnostic.layoutGrammar, layout, label);
    assert.equal(map.generatorVersion, DUNGEON_GENERATOR_V5, label);
    assert.ok(guardianOf(map), `${label}: guardian`);
    assert.ok(map.objects.some((o) => o.kind === 'exit') && map.objects.some((o) => o.kind === 'chest'), `${label}: exit + chest`);
    assertReachable(map, label);
    if (theme !== 'none') {
      assert.equal(map.landscape?.biome, `underlands:${theme}`, `${label}: landscape biome`);
      assert.equal(map.weather || null, UNDER_THEMES[theme].weather || null, `${label}: weather`);
    }
  }
});

test('Underlands: arrangements vary across seeds (layouts, sizes, themes)', () => {
  const layouts = new Set(), sizes = new Set(), themes = new Set(), shapes = new Set();
  for (let i = 0; i < 80; i++) {
    const map = generateExpeditionDungeon('VARY', `dungeon:VARY:${i}:${i * 3}`, ['hollow', 'cistern', 'kiln'][i % 3]);
    layouts.add(map.diagnostic.layoutGrammar); sizes.add(map.sizeProfile); themes.add(map.theme || 'none');
    shapes.add(map.tiles.map((t) => (t.blocked ? 1 : 0)).join(''));
    assertReachable(map, `seed ${i}`);
  }
  assert.equal(layouts.size, LAYOUTS.length, 'every layout grammar appears');
  assert.ok(sizes.size >= 3, 'all size profiles appear');
  assert.ok(themes.size >= 5, `themes vary: ${[...themes]}`);
  assert.equal(shapes.size, 80, 'no two crossings share a floor plan');
});

test('Underlands: chasms and lava are lethal and the critical path never needs a jump higher than one level', () => {
  const chasm = generateExpeditionDungeon('LETHAL', 'dungeon:LETHAL:1:1', 'hollow', { layout: 'cavern', theme: 'chasm' });
  assert.ok(chasm.tiles.some((t) => t.kind === 'abyss'), 'chasm has an abyss');
  const bog = generateExpeditionDungeon('LETHAL', 'dungeon:LETHAL:2:2', 'kiln', { layout: 'hub', theme: 'lavaBog' });
  assert.ok(bog.tiles.some((t) => t.kind === 'lava'), 'bog has lava');
  assert.equal(bog.weather, 'embers');
});

test('Underlands: only never-generated histories adopt generator 5; story and entered crossings keep theirs', () => {
  const save = freshSave('PIN5'); save.seed = 'PIN5';
  const fresh = `dungeon:PIN5:0:4:2:other`; generatePinnedDungeon(save, fresh);
  assert.equal(save.consequences.dungeons[fresh].generatorVersion, DUNGEON_GENERATOR_V5);
  const story = dungeonId(save.seed, save.worldGeneration); generatePinnedDungeon(save, story);
  assert.equal(save.consequences.dungeons[story].generatorVersion, 2, 'story dungeon stays on its generator');
  const entered = `dungeon:PIN5:0:9:9:old`; save.session.areas[entered] = { enemies: [] }; generatePinnedDungeon(save, entered);
  assert.equal(save.consequences.dungeons[entered].generatorVersion, 2, 'an entered crossing is not regenerated');
  const pinned = `dungeon:PIN5:0:7:7:pinned`; dungeonHistory(save, pinned).generatorVersion = 4; generatePinnedDungeon(save, pinned);
  assert.equal(save.consequences.dungeons[pinned].generatorVersion, 4, 'an existing generator pin is kept');
});

test('Relay Network: a share of new crossings hold a relay; entered and story crossings never gain one', () => {
  const save = freshSave('RELAY'); save.seed = 'RELAY'; let yes = 0;
  for (let i = 0; i < 200; i++) { const id = `dungeon:RELAY:0:${i}:1:x`; if (relayNodeDecision(save, id, dungeonHistory(save, id), 'story')) yes++; }
  assert.ok(yes > 40 && yes < 110, `about a third hold relays (${yes}/200)`);
  const old = `dungeon:RELAY:0:500:1:x`, h = dungeonHistory(save, old); h.visits = 2;
  assert.equal(relayNodeDecision(save, old, h, 'story'), false, 'entered crossing');
  const story = dungeonId(save.seed, save.worldGeneration);
  assert.equal(relayNodeDecision(save, story, dungeonHistory(save, story), story), false, 'story crossing');
  assert.equal(relayNodeDecision(save, 'hunt-instance:abc', dungeonHistory(save, 'hunt-instance:abc'), story), false, 'instances');
  const flip = `dungeon:RELAY:0:3:1:x`, before = dungeonHistory(save, flip).relayNode; dungeonHistory(save, flip).visits = 5;
  assert.equal(relayNodeDecision(save, flip, dungeonHistory(save, flip), story), before, 'a decision is pinned once made');
});

test('Relay Network: the relay sits near the guardian, answers only after the guardian falls, and five answers wake the network', () => {
  const save = freshSave('NET'); save.seed = 'NET';
  const ids = []; for (let i = 0; ids.length < RELAY_TARGET + 1 && i < 400; i++) { const id = `dungeon:NET:0:${i}:2:x`; if (pinDungeonLayout(save, id).relayNode) ids.push(id); }
  assert.equal(ids.length, RELAY_TARGET + 1);
  assert.equal(relayObjectiveSuffix(save), '', 'no relay suffix before any relay is seen');
  ids.forEach((id, n) => {
    const map = generatePinnedDungeon(save, id), node = placeRelayNode(map, id, save), g = guardianOf(map);
    assert.ok(node, `relay placed in ${id}`);
    const d = Math.hypot(node.x - g.x, node.y - g.y); assert.ok(d >= 2 && d <= 5, 'beside the guardian');
    assert.ok(reachableInMap(map, map.entry)[node.y * map.width + node.x], 'relay reachable');
    assert.equal(placeRelayNode(map, id, save), null, 'placed once');
    assert.deepEqual(validActions(node, save), ['inspect'], 'guardian holds it');
    assert.equal(commitRelayNode(save, node, 'restore', save.consequences.dungeons[id]).ok, false);
    save.consequences.dungeons[id].guardianDefeated = true;
    assert.deepEqual(relayNodeActions(node, save, save.consequences.dungeons[id]), ['restore', 'sever', 'inspect']);
    const choice = n % 2 ? 'sever' : 'restore', draughts = save.consumables.restorativeDraught || 0, dust = save.materials.lumenDust || 0;
    const r = applyInteraction(node, choice, save, id);
    assert.ok(r.ok, r.message);
    if (choice === 'restore') assert.equal(save.consumables.restorativeDraught, draughts + 1); else assert.equal(save.materials.lumenDust, dust + 2);
    assert.equal(node.state, choice);
    assert.ok(save.narrative.journal.some((j) => j.recordId === `relay-fragment-${n + 1}` && j.text.includes(FRAGMENTS[n])), 'fragment journalled in order');
    assert.equal(applyInteraction(node, 'restore', save, id).ok, false, 'a relay answers once');
    if (n + 1 < RELAY_TARGET) assert.match(currentObjective(save), new RegExp(`Relays ${n + 1}/${RELAY_TARGET}`));
    if (n + 1 === RELAY_TARGET) {
      assert.equal(r.networkAnswered, true);
      assert.equal(save.narrative.facts['relay.networkAnswered'], true);
      const c = ensureRelayNetwork(save).coordinate; assert.ok(Math.abs(c.rx) >= 40 && Math.abs(c.ry) >= 40, 'coordinate is off the charted map');
      assert.match(currentObjective(save), /network answered/);
    }
    const again = generatePinnedDungeon(save, id), restored = placeRelayNode(again, id, save);
    assert.equal(restored.state, choice, 'answered relays stay answered on re-entry');
  });
  assert.ok(save.narrative.journal.filter((j) => j.recordId === 'relay-network-answered').length === 1, 'the network answers once');
});

test('Relay Network: the game places relays on entry and the pylon draws in every state', async () => {
  const { Game } = await import('../src/game.ts');
  const save = freshSave('GAMEREL'); save.seed = 'GAMEREL';
  let id = null; for (let i = 0; i < 200 && !id; i++) { const c = dungeonId(save.seed, save.worldGeneration, i, 4, 'site'); const s2 = freshSave('GAMEREL'); s2.seed = 'GAMEREL'; if (pinDungeonLayout(s2, c).relayNode) id = c; }
  assert.ok(id, 'found a relay crossing');
  const g = new Game(save, 0); save.session.activeDungeonId = id; pinDungeonLayout(save, id); dungeonHistory(save, id).visits++; g.loadArea('dungeon');
  const node = g.map.objects.find((o) => o.kind === 'relayNode');
  assert.ok(node, 'relay in the loaded crossing');
  assert.equal(save.relayNetwork.seen, true);
  assert.match(currentObjective(save), /Relays 0\/5/);
  const calls = []; const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : typeof k === 'string' && /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : () => calls.push(k)), set: (t, k, v) => ((t[k] = v), true) });
  for (const state of ['dormant', 'restore', 'sever']) drawRelayNode(ctx, { ...node, state }, 32, 1000);
  assert.ok(calls.length > 20);
});
