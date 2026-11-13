// Close View play-through of 926, bug 8: "Great Sweep held carry not seen" (medium confidence; the play-through equipped it by
// editing the save mid-run, and its probe read `player.attack.heldTool` / `player.heldTool`, which do not exist: the flag is
// `player.attackVisual.heldTool`, action-motion.ts heldToolKind). Checked here through the real way in: the brawler gear granted
// to the Pack (grantBrawlerGear), the Pack's Equip (equipInventoryItem, as main.ts equipFromInventory, with the game's
// equipment-switch cancel and a save and reload as persist does), then the Tool button through game.update. It stays drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, equipInventoryItem, grantBrawlerGear } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { heldToolKind } from '../src/action-motion.ts';

const input = (x = 0, press: string | null = null) => { let p = press; return { state: { x, y: 0 }, consume: (k: string) => k === p ? (p = null, true) : false, held: () => false }; };
function journey() {
  const s: any = freshSave(); s.seed = 'SWEEP-PACK'; s.perception.aperture = 3255; s.maxHp = 200; s.hp = 200;
  Object.assign(s.session, { area: 'overworld', rx: 3, ry: 3, x: 10, y: 10 });
  grantBrawlerGear(s); const i = s.inventory.findIndex((q: any) => q?.name === 'Great Sweep'); assert.ok(i >= 0, 'the Great Sweep is in the Pack');
  return { s, i };
}
function open(g: any) { for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, elev: 0, slope: false, environment: null, structure: null, buildingId: null }); g.map.objects = []; g.map.enemySpawns = []; g.enemies = []; Object.assign(g.player, { x: 10, y: 10, hp: 200 }); }
const run = (g: any, frames: number, t: number, inp = (_i: number) => input()) => { for (let i = 0; i < frames; i++) { t += 50; g.update(.05, inp(i), t); } return t; };

test('926 bug 8: a Great Sweep equipped from the Pack and used with the Tool button stays drawn', () => {
  const { s, i } = journey(); let g: any = new Game(s, 0); open(g); let t = 1000;
  g.setPaused(true, t); // the Pack is a menu: the journey is paused while it is open
  assert.equal(equipInventoryItem(g.save, i), true); g.cancelConsumeVisual('equipment-switch');
  g = new Game(migrateSave(structuredClone(g.exportSnapshot(t))), t); open(g); g.setPaused(false, t); // persist, as the Pack does, and play on
  assert.equal(g.save.equipment.secondary?.name, 'Great Sweep');
  g.enemies = [createCombatant('ashling', g.player.x + 1.5, g.player.y)];
  t = run(g, 1, t, () => input(0, 'tool')); assert.equal(heldToolKind(g.player), 'great-sweep', 'the use draws it');
  t = run(g, 100, t, (k) => input(k % 40 < 20 ? 1 : -1)); g.enemies = [];
  assert.equal(heldToolKind(g.player), 'great-sweep', 'still drawn after five seconds walking');
  g.setPaused(true, t); const back = new Game(migrateSave(structuredClone(g.exportSnapshot(t))), t + 60000);
  assert.equal(heldToolKind(back.player), 'great-sweep', 'and on an exact resume');
});

test('926 bug 8: equipping another tool from the Pack puts it away; equipping the Great Sweep again and using it draws it again', () => {
  const { s, i } = journey(); const g: any = new Game(s, 0); open(g); let t = 1000;
  equipInventoryItem(g.save, i); g.cancelConsumeVisual('equipment-switch');
  t = run(g, 1, t, () => input(0, 'tool')); assert.equal(heldToolKind(g.player), 'great-sweep');
  const hammer = g.save.inventory.findIndex((q: any) => q?.name === 'Hammerfall'); assert.ok(hammer >= 0);
  equipInventoryItem(g.save, hammer); g.cancelConsumeVisual('equipment-switch'); t = run(g, 2, t);
  assert.equal(heldToolKind(g.player), null, 'another tool in the slot puts it away');
  equipInventoryItem(g.save, g.save.inventory.findIndex((q: any) => q?.name === 'Great Sweep')); g.cancelConsumeVisual('equipment-switch'); t = run(g, 2, t);
  assert.equal(heldToolKind(g.player), null, 'equipping alone does not draw it');
  t = run(g, 30, t); t = run(g, 1, t, () => input(0, 'tool')); t = run(g, 60, t, () => input(1));
  assert.equal(heldToolKind(g.player), 'great-sweep', 'its next use draws it, and it stays');
});
