// Release 465 (Tim: "those teleportation shrines... in the symbol for the watcher... should be marked as a location on the
// map... one of the things that are identified on the map"): a Watcher's shrine is an Atlas site with its own mark and is
// listed in Go to….
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { atlasPlaces } from '../src/atlas-view.ts';

test('a Watcher\'s shrine is recorded on the Atlas, marked and listed', () => {
  const s = freshSave(); s.seed = 'WATCH465'; const g = new Game(s, 0); let found = null;
  for (let rx = 1; rx <= 30 && !found; rx++) for (let ry = -15; ry <= 15 && !found; ry++) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); if (g.map.objects.some((o) => o.kind === 'watcherTomb' && o.where === 'shrine')) found = [rx, ry]; }
  assert.ok(found, 'a shrine exists in the scan');
  const sites = s.atlas[`${found[0]},${found[1]}`].sites; assert.ok(sites.some((q) => q.kind === 'watcherTomb' && q.name === "Watcher's Shrine"));
  s.explored[`${found[0]},${found[1]}`] = true;
  assert.ok(atlasPlaces(s).some((gr) => gr.places.some((p) => p.kind === 'watcherTomb' && p.rx === found[0] && p.ry === found[1])), 'in Go to…');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /kind:"watcherTomb",label:"Watcher's shrine"/); assert.match(main, /kind==="watcherTomb"\?"watcher"/); assert.match(main, /signal==="watcher"/);
});
