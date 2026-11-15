import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MONSTER_PACK, ATTACK_MODULES } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { ACTOR_PRESENTATION, nativeCreatureCoverage, packActionPresentation } from '../src/actor-presentation.ts';
import {
  IMPORTED_CREATURE, MODEL_FLOATS, decodeCreatureAsset, registerCreatureAsset, loadCloseViewCreatureAssets, closeViewCreatureAssetStatus,
  closeViewCreatureAsset, closeViewCreatureAssetUrl, creatureAssetClip, creatureRootPose, modelSupported, modelSupportsAttachments,
  modelTriangleCount, writeCloseViewModel,
} from '../src/close-view-models.ts';

const dir = new URL('../assets/creatures/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir));
const buffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const KINDS = IMPORTED_CREATURE.kinds;
const ATTACK = { crystalCrab: 'clawSweep', strataEel: 'bite', groveStag: 'stagGore' };
const decoded = Object.fromEntries(KINDS.map((kind) => {
  const meta = JSON.parse(read(`${kind}.json`).toString('utf8'));
  return [kind, { meta, asset: decodeCreatureAsset(meta, buffer(read(meta.binary))) }];
}));
const OUT = new Float32Array(256 * 3 * MODEL_FLOATS);
const draw = (actor) => { const end = writeCloseViewModel(OUT, 0, actor); return OUT.slice(0, end); };
const base = (kind, extra = {}) => ({ kind, x: 3, y: 4, z: 0, yaw: .4, phase: 0, pace: 0, amount: 0, pose: 'idle', effectTime: 1234, scale: 1.1, reduceMotion: false, ...extra });
// The actor record close-view.ts builds from a pack creature's live attack clock (closeViewMonsterAction -> packActionPresentation).
function packActor(kind, phase, t, extra = {}) {
  const attack = ATTACK[kind], e = { kind, pack: { attack, phase, t, data: {} } }, s = packActionPresentation(e, ATTACK_MODULES);
  return base(kind, { pose: 'semantic', action: s.action, actionFamily: s.family, actionPhase: s.phase, actionProgress: s.progress, rootAttack: attack, ...extra });
}
const forwardReach = (v, yaw) => { let best = -Infinity; for (let i = 0; i < v.length; i += MODEL_FLOATS) best = Math.max(best, (v[i] - 3) * Math.cos(yaw) + (v[i + 1] - 4) * Math.sin(yaw)); return best; };

test('each imported creature decodes within the batched model budget, recoloured to its monster-pack palette', () => {
  for (const kind of KINDS) {
    const { meta, asset } = decoded[kind];
    assert.equal(asset.kind, kind);
    assert.ok(asset.triangles <= IMPORTED_CREATURE.triangles && asset.triangles + 3 * 8 <= 256, `${kind} ${asset.triangles}`);
    assert.equal(createHash('sha256').update(read(meta.binary)).digest('hex'), meta.binarySha256, kind);
    assert.deepEqual(meta.palette, MONSTER_PACK[kind].palette, kind);
    for (const key of ['idle', 'walk', 'attack']) assert.ok(asset.clips[key], `${kind} ${key}`);
    for (const [key, clip] of Object.entries(asset.clips)) if (key.startsWith('attack')) assert.ok(clip.coil < clip.strike, `${kind} ${key}`);
    assert.throws(() => decodeCreatureAsset({ ...meta, triangles: 300 }, buffer(read(meta.binary))));
    assert.throws(() => decodeCreatureAsset({ ...meta, palette: ['#000000'] }, buffer(read(meta.binary))));
  }
});

test('the loader fetches each kind once from assets/creatures and only then admits the body', async () => {
  for (const kind of KINDS) assert.equal(modelSupported(kind), false, `${kind} is a card until loaded`);
  const urls = [];
  const fetcher = async (url) => { urls.push(String(url)); const name = String(url).split('/').pop(); return { ok: true, status: 200, json: async () => JSON.parse(read(name).toString('utf8')), arrayBuffer: async () => buffer(read(name)) }; };
  assert.equal(await loadCloseViewCreatureAssets(fetcher), KINDS.length);
  assert.equal(await loadCloseViewCreatureAssets(fetcher), KINDS.length);
  assert.equal(urls.length, KINDS.length * 2, 'one header and one binary per kind, once');
  assert.equal(closeViewCreatureAssetStatus(), 'ready');
  assert.match(String(closeViewCreatureAssetUrl('groveStag', 'https://example.test/game/src/close-view-models.js?v=1')), /\/game\/assets\/creatures\/groveStag\.json$/);
  for (const kind of KINDS) {
    assert.ok(modelSupported(kind) && modelSupportsAttachments(kind, 3), kind);
    assert.equal(modelTriangleCount(kind), closeViewCreatureAsset(kind).triangles);
    assert.equal(draw(base(kind)).length, closeViewCreatureAsset(kind).triangles * 3 * MODEL_FLOATS);
    const e = createCombatant(kind, 5, 5, true), capture = { enemy: e, nativeFloor() {}, nativeDecorations() {}, nativePackEffects() {} };
    assert.ok(ACTOR_PRESENTATION[kind], kind);
    assert.equal(nativeCreatureCoverage(e, capture, { mesh: modelSupported(kind), attachments: modelSupportsAttachments(kind, 3) }), null, kind);
    e.pack = { attack: ATTACK[kind], phase: 'windup', t: .2, data: {} };
    assert.equal(nativeCreatureCoverage(e, capture, { mesh: true, attachments: true }), null, `${kind} keeps its body through its attack`);
  }
});

test('the attack clip plays on the real pack clock: coil through the windup, strike at its end, recover after contact', () => {
  for (const kind of KINDS) {
    const asset = closeViewCreatureAsset(kind) || registerCreatureAsset(decoded[kind].asset);
    const W = ATTACK_MODULES[ATTACK[kind]].windup, R = ATTACK_MODULES[ATTACK[kind]].recover;
    const times = [];
    for (const [phase, t] of [['windup', W * .99], ['windup', W * .5], ['windup', W * .1], ['windup', .001], ['recover', R * .7], ['recover', R * .2], ['recover', .001]]) {
      const actor = packActor(kind, phase, t), root = creatureRootPose(actor);
      assert.ok(root.stage > 0, `${kind} ${phase} ${t}`);
      const c = creatureAssetClip(asset, actor, root);
      assert.ok(c.attack, `${kind} ${phase}`);
      times.push(c.attackTime / c.attack.duration);
    }
    for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1] - 1e-9, `${kind} clip time runs forward ${times}`);
    const clip = Object.hasOwn(asset.clips, 'attack.' + ATTACK[kind]) ? asset.clips['attack.' + ATTACK[kind]] : asset.clips.attack;
    assert.ok(times[0] < clip.coil + 1e-9 && times[3] >= clip.coil - 1e-9 && times[3] <= clip.strike + 1e-9, `${kind} windup spans coil..strike ${times}`);
    assert.ok(times[6] > .99, `${kind} recover ends the clip`);
    const idle = draw(base(kind)), strike = draw(packActor(kind, 'windup', .001)), coil = draw(packActor(kind, 'windup', W * .9));
    assert.notDeepEqual(strike, idle, `${kind} strike pose differs from idle`);
    assert.ok(forwardReach(strike, .4) > forwardReach(coil, .4) + .03, `${kind} strikes forward of its coil`);
  }
});

test('an attack with its own clip uses it, and a multi-blow attack replays its strike through the active phase', () => {
  const stag = closeViewCreatureAsset('groveStag');
  const stomp = packActor('groveStag', 'windup', .01, { action: 'stagStomp', rootAttack: 'stagStomp' }), gore = packActor('groveStag', 'windup', .01);
  assert.equal(creatureAssetClip(stag, stomp).attack, stag.clips['attack.stagStomp']);
  assert.equal(creatureAssetClip(stag, gore).attack, stag.clips['attack.stagGore']);
  const active = (p) => creatureAssetClip(stag, base('groveStag', { pose: 'semantic', action: 'stagGore', actionFamily: 'sweep', actionPhase: 'active', actionProgress: p, rootAttack: 'stagGore' })).attackTime;
  assert.ok(active(.2) > active(.05) && active(.4) < active(.3), 'three hooks, each from strike to the end of the clip');
});

test('walk follows movement, idle the presentation clock, and the same input always draws the same body', () => {
  for (const kind of KINDS) {
    assert.deepEqual(draw(base(kind)), draw(base(kind)), `${kind} deterministic`);
    assert.deepEqual(draw(packActor(kind, 'recover', .1)), draw(packActor(kind, 'recover', .1)), `${kind} deterministic attack`);
    assert.notDeepEqual(draw(base(kind, { effectTime: 1234 })), draw(base(kind, { effectTime: 1834 })), `${kind} idles`);
    const walkA = draw(base(kind, { pose: 'walk', pace: 1, phase: .3 })), walkB = draw(base(kind, { pose: 'walk', pace: 1, phase: 2.3 }));
    assert.notDeepEqual(walkA, walkB, `${kind} walks with its gait phase`);
    for (let i = 0; i < walkA.length; i++) assert.ok(Number.isFinite(walkA[i]), `${kind} finite`);
  }
});

test('Reduced Motion holds the idle still but keeps the walk and the full attack readable', () => {
  for (const kind of KINDS) {
    assert.deepEqual(draw(base(kind, { reduceMotion: true, effectTime: 100 })), draw(base(kind, { reduceMotion: true, effectTime: 2900 })), `${kind} still idle`);
    const idle = draw(base(kind, { reduceMotion: true })), strike = draw(packActor(kind, 'windup', .001, { reduceMotion: true }));
    assert.notDeepEqual(strike, idle, `${kind} attack still plays`);
    const full = creatureRootPose(packActor(kind, 'recover', .2)), reduced = creatureRootPose(packActor(kind, 'recover', .2, { reduceMotion: true }));
    assert.ok(Math.abs(reduced.lean) <= Math.abs(full.lean) + 1e-9, `${kind} reduced lean`);
  }
});

test('the credits list every imported asset file with its source, licence and checksum, and both workers precache them', () => {
  const credits = read('CREDITS.md').toString('utf8'), files = readdirSync(dir).filter((f) => f !== 'CREDITS.md');
  assert.equal(files.length, KINDS.length * 2);
  for (const f of files) assert.ok(credits.includes(f), `CREDITS.md lists ${f}`);
  for (const kind of KINDS) {
    const { meta } = decoded[kind];
    assert.ok(credits.includes(meta.source.sha256) && credits.includes(meta.source.url) && credits.includes(meta.binarySha256), kind);
    assert.match(credits, /CC0/);
  }
  const main = readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), lab = readFileSync(new URL('../proving-ground/sw.js', import.meta.url), 'utf8');
  for (const f of files) { assert.ok(main.includes(`"./assets/creatures/${f}"`), `sw.js ${f}`); assert.ok(lab.includes(`"../assets/creatures/${f}"`), `proving-ground/sw.js ${f}`); }
});
