// The Earth Apatosaurus (Tim, 2026-11-25): Earth Resolve lowered to 15% damage reduction and 8% lifesteal (its heal still its own,
// outside the shared heal-on-hit cap); the beast itself gated to Infinite IV (Aperture tier 14) in both progression modes, both as
// the roaming world beast (BEAST_APERTURE) and in big rooms (APATO_ROOMS version 2, pinned per floor when it is first generated).
// Floors and sections generated before keep what they had; Wayfarers who own Earth Resolve keep it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { generatePinnedDungeon } from '../src/game.ts';
import { APERTURE_THRESHOLDS, apertureTier } from '../src/world.ts';
import { APATO_ROOMS, apatoRoomsPin, apatoRoomSpawn } from '../src/earth-apato.ts';
import { APATO_ECHO, ECHOES } from '../src/echoes.ts';
import { BEAST_APERTURE, beastUnlocked, worldBeastFor, ensureWorldBeasts, WORLD_BEAST_IDS } from '../src/world-beasts.ts';
import { switchProgression } from '../src/progression.ts';
import { progressionMode } from '../src/journey-start.ts';

const INF4 = 14;
const atTier = (s, t) => { s.perception.aperture = t ? APERTURE_THRESHOLDS[t - 1] : 0; return s; };
const open = () => ({ width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'floor', blocked: false })), objects: [] });
const floorId = (i) => `building:APATO-GATE:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`;
const apatoIn = (m) => (m.enemySpawns || []).some((e) => e.kind === 'earthApato');

test('Earth Resolve: 15% less damage and 8% lifesteal; its text follows the numbers; the rest of it unchanged', () => {
  assert.equal(APATO_ECHO.guard, .15); assert.equal(APATO_ECHO.lifesteal, .08);
  assert.deepEqual({ ...APATO_ECHO, guard: 0, lifesteal: 0 }, { still: .25, radius: 1.6, maxRadius: 4, grow: .2, seconds: 4, extend: .6, cap: 10, guard: 0, lifesteal: 0, cooldown: 4000 });
  assert.match(ECHOES.earthApato.text, /15% less damage and heal 8% of the damage you deal/);
});

test('Infinite IV is Aperture tier 14, the same tier the other Infinite IV gates use', () => {
  assert.equal(APATO_ROOMS.tier, INF4); assert.equal(BEAST_APERTURE.earthApato, INF4);
  assert.equal(apertureTier(APERTURE_THRESHOLDS[INF4 - 1]), INF4); assert.equal(apertureTier(APERTURE_THRESHOLDS[INF4 - 1] - 1), INF4 - 1);
});

test('the roaming beast: no new meeting below Infinite IV, in either mode; from it, it can claim a section; one already met keeps its ground', () => {
  const others = (s) => { for (const id of WORLD_BEAST_IDS) if (id !== 'earthApato') s.worldBeasts[id].cooldown = 1e6; return s; };
  const seek = (s) => { for (let rx = 6; rx < 4000; rx++) { s.beastGap.fresh = 6; const m = worldBeastFor(s, open(), rx, 7); if (m) return m; } return null; };
  for (const mode of [0, 1]) {
    const low = atTier(freshSave(), INF4 - 1); low.seed = 'APATO-ROAM'; if (mode) switchProgression(low, 1); assert.equal(progressionMode(low), mode); ensureWorldBeasts(low); others(low);
    assert.equal(beastUnlocked(low, 'earthApato'), false); assert.equal(seek(low), null, `mode ${mode}: tier 13, never`);
    const high = atTier(freshSave(), INF4); high.seed = 'APATO-ROAM'; if (mode) switchProgression(high, 1); ensureWorldBeasts(high); others(high);
    assert.equal(beastUnlocked(high, 'earthApato'), true); assert.equal(seek(high)?.worldBeast, 'earthApato', `mode ${mode}: tier 14, met`);
  }
  const held = atTier(freshSave(), 6); ensureWorldBeasts(held); held.worldBeasts.earthApato.active = { rx: 9, ry: 9, tries: 0 };
  assert.equal(worldBeastFor(held, open(), 9, 9)?.worldBeast, 'earthApato', 'one that claimed its section before the gate still holds it');
});

test('big rooms: version 2 pins 0 below Infinite IV (never one there) and 2 from it; the roll at version 1 is unchanged', () => {
  assert.equal(APATO_ROOMS.version, 2); assert.equal(apatoRoomsPin(0), 0); assert.equal(apatoRoomsPin(INF4 - 1), 0); assert.equal(apatoRoomsPin(INF4), 2); assert.equal(apatoRoomsPin(30), 2);
  const map = { building: { style: 'keep' }, width: 30, tiles: Array.from({ length: 900 }, (_, i) => ({ x: i % 30, y: Math.floor(i / 30), kind: 'floor' })), entry: { x: 1, y: 1 } };
  let v1 = 0; for (let i = 0; i < 400; i++) { const q = apatoRoomSpawn('S', `building:S:${i}:f1`, map, 'building', 1); if (q) { v1++; assert.equal(q.id, `building:S:${i}:f1:earth-apato`); } }
  assert.equal(v1, 49, 'version 1 rolls exactly as before (counted on main before the change)');
  assert.equal(apatoRoomSpawn('S', 'x', map, 'building', 0), null);
});

test('fresh floors: none below Infinite IV, in either mode; some from it; the pin never changes after', () => {
  let low = 0, high = 0, lowHeld = 0;
  for (let i = 0; i < 90; i++) {
    for (const mode of [0, 1]) { const s = atTier(freshSave(), INF4 - 1); s.seed = 'APATO-GATE'; if (mode) switchProgression(s, 1); const m = generatePinnedDungeon(s, floorId(i)); assert.equal(s.consequences.dungeons[floorId(i)].apatoRooms, 0); if (apatoIn(m)) lowHeld++; low++; }
    const s = atTier(freshSave(), INF4); s.seed = 'APATO-GATE'; const m = generatePinnedDungeon(s, floorId(i)); assert.equal(s.consequences.dungeons[floorId(i)].apatoRooms, 2); if (apatoIn(m)) high++;
    if (i < 12) { atTier(s, 0); assert.equal(JSON.stringify(generatePinnedDungeon(s, floorId(i))), JSON.stringify(m), 'its pin, not the Aperture now, decides'); }
  }
  assert.equal(lowHeld, 0, `none of ${low} floors first generated below Infinite IV holds one`); assert.ok(high > 0, 'from Infinite IV some do');
  // A floor first generated low never gains one later.
  const s = atTier(freshSave(), INF4 - 1); s.seed = 'APATO-GATE'; let gained = 0; for (let i = 0; i < 90; i++) generatePinnedDungeon(s, floorId(i)); atTier(s, 30);
  for (let i = 0; i < 90; i++) if (apatoIn(generatePinnedDungeon(s, floorId(i)))) gained++; assert.equal(gained, 0);
});

test('old ground: a floor pinned at version 1 regenerates byte for byte, at any Aperture, and keeps its Apatosaurus', () => {
  let kept = 0;
  for (let i = 0; i < 120; i++) {
    const s = atTier(freshSave(), INF4); s.seed = 'APATO-OLD'; const id = floorId(i); generatePinnedDungeon(s, id); s.consequences.dungeons[id].apatoRooms = 1; // as an old journey pinned it
    const raw = JSON.parse(JSON.stringify(s)), at0 = JSON.stringify(generatePinnedDungeon(atTier(s, 0), id)), at30 = JSON.stringify(generatePinnedDungeon(atTier(s, 30), id));
    assert.equal(at0, at30, `${id}: the Aperture changes nothing on old ground`);
    const back = migrateSave(raw); assert.equal(back.consequences.dungeons[id].apatoRooms, 1, 'the pin survives a load');
    assert.equal(JSON.stringify(generatePinnedDungeon(atTier(back, 0), id)), at0, 'and regenerates the same floor after it');
    if (at0.includes('"earthApato"')) kept++;
  }
  assert.ok(kept > 0, 'old floors that held one still do, below Infinite IV too');
});

test('a Wayfarer who already owns Earth Resolve keeps it through a load, below Infinite IV', () => {
  const s = atTier(freshSave(), 6); s.echoes.owned.earthApato = true; s.echoes.equipped = ['earthApato'];
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.echoes.owned.earthApato, true); assert.deepEqual(back.echoes.equipped, ['earthApato']);
});
