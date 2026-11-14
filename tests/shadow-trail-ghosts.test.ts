// Shadow trails (Tim, 2026-11-14): the Iron Fists' Shadow Boxing rush stays the instant rush it was, and now shows the
// 952 charge's after-images and speed streak so you see him cross the space; a dodge, with any weapon, shows the same ghost
// trail along its path. Both views, every quality tier, safe mode too; none with reduced motion. Presentation only
// (brawler-spells.ts SHADOW_TRAIL, markShadowTrail, shadowTrailTick; game.ts writes Game.shadowTrail and never reads it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { serializeSave } from '../src/persistence.ts';
import { SHADOW_DASH, SHADOW_TRAIL, shadowDashGhosts, shadowDashPose, shadowTrailLive } from '../src/brawler-spells.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewShadowDash } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { CLOSE_VIEW_SHADOW_FORMS as SF } from '../src/close-view-shadow-forms.ts';

const FRAME = 1000 / 60;
const LOW_SAFE = { effectiveQuality: 'low', quality: 'low', safeMode: true, reduceMotion: false };
const REDUCED = { effectiveQuality: 'low', quality: 'low', safeMode: true, reduceMotion: true };
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const press = (key: string, x = 0, y = 0) => { let used = false; return { state: { x, y }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };
const fists = () => ({ id: 'primary-trail-fists', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
const dummy = (id: string, x: number, y: number, hp = 1e9) => Object.assign(createCombatant('rootBrute', x, y), { id, hp, maxHp: hp, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, meleePatterns: [] });
const ghosts = (g: any) => shadowDashGhosts(g, new Float64Array(SHADOW_DASH.ghosts * 3));

// A flat open dungeon room; `weapon` 'fists' or the starting blade; Shadow Boxing cast.
function room(weapon = 'fists', presentation: any = LOW_SAFE, seed = 'TRAIL') {
  const s = freshSave(); s.seed = seed; s.perception.aperture = 3255; s.maxHp = 1e6; if (weapon === 'fists') s.equipment.primary = fists();
  const g: any = new Game(s, 0); g.presentation = { ...presentation };
  g.map = { ...g.map, name: 'Trail Room', width: 40, height: 40, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1600 }, (_, i) => ({ x: i % 40, y: Math.floor(i / 40), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 20, y: 20, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = []; g.update(.016, calm, 1000); g.castSpell('shadow-boxing'); return g;
}

test('the trail table is data; its ghosts are SHADOW_DASH\'s pool', () => {
  assert.deepEqual({ ...SHADOW_TRAIL }, { minJump: .6, maxJump: 12, carryMs: 220 }); assert.ok(Object.isFrozen(SHADOW_TRAIL));
  assert.ok(SHADOW_DASH.ghosts <= SF.trail.max, 'Close View\'s afterimage pool holds them all');
});

test('the Iron Fists\' Shadow Boxing rush: still one update, now drawn with after-images and a streak at low quality in safe mode', () => {
  const g = room(), foe = dummy('rush-foe', 26, 20); g.enemies = [foe]; const x0 = g.player.x;
  g.update(.016, press('attack'), 1084); assert.equal(g.player.x, x0, 'the press winds the cross'); g.update(.016, calm, 1100); // let go: the rush
  assert.ok(g.player.x - x0 > 4, `the rush still moves him in one update (${(g.player.x - x0).toFixed(2)} tiles)`); assert.equal(g.shadowDash, null, 'no timed charge for the fists');
  const out = new Float64Array(SHADOW_DASH.ghosts * 3), n = shadowDashGhosts(g, out);
  assert.ok(n >= 3 && n <= SHADOW_DASH.ghosts, `ghosts (${n})`);
  for (let k = 0; k < n; k++) { assert.ok(out[k * 3] > x0 && out[k * 3] < g.player.x, 'on the path he crossed'); assert.ok(Math.abs(out[k * 3 + 1] - 20) < 1e-6); assert.ok(out[k * 3 + 2] > 0 && out[k * 3 + 2] < 1); }
  for (let k = 1; k < n; k++) assert.ok(out[k * 3] < out[(k - 1) * 3], 'nearest first');
  const pose = shadowDashPose(g, {} as any); assert.equal(pose.live, true); assert.ok(pose.wraith > .9 && pose.charge > .9, 'the 952 lean and wraith, settling');
  // Standard View: streak and ghost bodies
  const log: any[] = []; drawRangedEffects(ctx(log), g, 390, 844);
  assert.ok(log.filter((l) => l[0] === 'ellipse').length >= n, 'ghost bodies drawn'); assert.ok(log.some((l) => l[0] === 'lineTo'), 'a speed streak');
  // they close in and are gone after the fade
  let t = 1100, last = n; for (let i = 0; i < 20; i++) { t += 16; g.update(.016, calm, t); const m = ghosts(g); assert.ok(m <= last + 0, 'never more as they close in'); last = m; }
  assert.equal(ghosts(g), 0, 'gone after the fade'); assert.equal(g.shadowTrail.live, false, 'the record retires itself');
});

test('a dodge (any weapon) leaves the same trail in safe mode at low quality, behind him as he goes and fading after', () => {
  for (const weapon of ['fists', 'blade']) {
    const g = room(weapon), x0 = g.player.x; let t = 1100, most = 0, during = 0;
    g.update(.016, press('dodge', 1, 0), t);
    assert.ok(g.player.dodgeUntil > t);
    while (t < 1100 + 600) { t += 16; g.update(.016, calm, t); const out = new Float64Array(SHADOW_DASH.ghosts * 3), n = shadowDashGhosts(g, out); most = Math.max(most, n);
      if (t < g.player.dodgeUntil && n) { during++; for (let k = 0; k < n; k++) assert.ok(out[k * 3] >= x0 - 1e-9 && out[k * 3] < g.player.x, `${weapon}: behind him on the dodge path`); }
      const pose = shadowDashPose(g, {} as any); assert.equal(pose.charge, 0, 'no lean'); assert.equal(pose.wraith, 0, 'no wraith tint on the roll'); }
    assert.ok(most >= 2 && most <= SHADOW_DASH.ghosts, `${weapon}: ghosts (${most})`); assert.ok(during >= 3, `${weapon}: drawn while the dodge runs (${during} frames)`);
    assert.equal(ghosts(g), 0, `${weapon}: gone after`);
  }
  // Standard View draws the trail and, while it shows, not the older single dodge ghost
  const g = room('blade'); g.update(.016, press('dodge', 1, 0), 1100); for (let t = 1116; t <= 1180; t += 16) g.update(.016, calm, t);
  assert.ok(shadowTrailLive(g)); const log: any[] = []; drawRangedEffects(ctx(log), g, 390, 844); assert.ok(log.filter((l) => l[0] === 'ellipse').length >= 2);
});

test('reduced motion: no trail for the rush or the dodge (the older dodge ghost stays)', () => {
  const g = room('fists', REDUCED); g.enemies = [dummy('f', 26, 20)]; g.update(.016, press('attack'), 1084); g.update(.016, calm, 1100); assert.ok(g.player.x > 24);
  assert.equal(ghosts(g), 0); assert.equal(shadowDashPose(g, {} as any).live, false);
  const d = room('blade', REDUCED); d.update(.016, press('dodge', 1, 0), 1100); for (let t = 1116; t < 1400; t += 16) { d.update(.016, calm, t); assert.equal(ghosts(d), 0); assert.equal(shadowTrailLive(d), false); }
});

test('Close View at low quality in safe mode: rush and dodge ghosts drawn on the true place; none with reduced motion', () => {
  for (const reduceMotion of [false, true]) gpu(({ screen }) => {
    for (const kind of ['rush', 'dodge']) {
      const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'shadow-clone', now: 100000 }) as any;
      g.shadowClone = null; g.presentation = { ...LOW_SAFE, reduceMotion }; g.save.equipment.primary = fists(); g.boxingUntil = 1e9; g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right';
      g.enemies = kind === 'rush' ? [dummy('cv-foe', g.player.x + 3.5, g.player.y)] : []; g.lastUpdateNow = 100000;
      resetCloseViewCamera(); const D = closeViewShadowDash(); let t = 100000, most = 0, tris = 0;
      layer(g, () => render(screen, g, 390, 844, t)); const still = closeViewGLStats.modelTriangles, x0 = g.player.x;
      layer(g, () => { for (let i = 0; i < 16; i++) { t += FRAME; g.update(FRAME / 1000, i === 0 ? press(kind === 'rush' ? 'attack' : 'dodge', 1, 0) : calm, t); render(screen, g, 390, 844, t);
        assert.equal(D.x, g.player.x, `${kind}: drawn on its true place (no lag)`); assert.ok(D.trailCount <= SHADOW_DASH.ghosts); most = Math.max(most, D.trailCount); if (D.trailCount) tris = Math.max(tris, closeViewGLStats.modelTriangles - still); } });
      assert.ok(g.player.x - x0 > .6, `${kind}: he moved (${(g.player.x - x0).toFixed(2)})`);
      if (reduceMotion) assert.equal(most, 0, `${kind}: none with reduced motion`);
      else { assert.ok(most >= 2, `${kind}: Close View afterimages (${most})`); assert.ok(tris > 0, `${kind}: their bodies are drawn`); }
    }
  });
});

// Gameplay twins. Each tick: positions, health, stamina, the clocks a dodge and a punch set, the fists' chain, every foe and
// every effect. Same inputs to: a game rendered every frame (Standard View and Close View), one never rendered, and one whose
// shadow trail can never be stored (Game.shadowTrail pinned empty: exactly release 952's code path for these moves).
function scenario(g: any, renderer: ((g: any, t: number) => void) | null) {
  const digest: string[] = []; let t = 1000;
  g.enemies = [dummy('a', 26, 20, 1e7), dummy('b', 20, 27, 1e7), dummy('c', 14, 21, 1e7)];
  for (let i = 0; i < 900; i++) {
    t += FRAME; g.boxingUntil = t + 5000; g.player.invulnerableUntil = t + 1e6;
    if (i % 120 === 0) g.enemies.forEach((e: any, k: number) => { const a = i * .37 + k * 2.1; e.x = Math.max(3, Math.min(36, g.player.x + Math.cos(a) * (3 + k * 1.5))); e.y = Math.max(3, Math.min(36, g.player.y + Math.sin(a) * (3 + k * 1.5))); });
    const input = i % 53 === 7 ? press('dodge', Math.cos(i), Math.sin(i)) : i % 9 === 0 ? press('attack') : calm;
    g.update(1 / 60, input, t); if (renderer) renderer(g, t);
    const p = g.player; digest.push(JSON.stringify([p.x, p.y, p.hp, p.stamina, p.dodgeUntil, p.attackUntil, p.attackReadyAt, p.facing, g.fistCombo?.step ?? null, g.shadowDash ? [g.shadowDash.elapsedMs, g.shadowDash.travelled] : null,
      g.enemies.map((e: any) => [e.id, e.x, e.y, e.hp]), g.effects.map((e: any) => [e.id, e.kind, e.x, e.y, e.damage])]));
  }
  const save = JSON.parse(serializeSave(g.exportSnapshot(t))); delete save.updatedAt; delete save.session.savedAt; // wall-clock stamps
  return { digest, save: JSON.stringify(save) };
}
test('twin games: gameplay is identical with and without rendering and with the trail never stored (release 952)', () => {
  for (const weapon of ['fists', 'blade']) {
    const plain = scenario(room(weapon, LOW_SAFE, 'TWIN'), null);
    const pinned: any = room(weapon, LOW_SAFE, 'TWIN'); Object.defineProperty(pinned, 'shadowTrail', { get: () => undefined, set: () => {}, configurable: true });
    const r952 = scenario(pinned, null);
    let drawn = 0; const screen = ctx(); screen.canvas = { width: 390, height: 844 };
    const shown = scenario(room(weapon, LOW_SAFE, 'TWIN'), (g, t) => { render(screen, g, 390, 844, t); if (ghosts(g)) drawn++; });
    assert.ok(drawn > 20, `${weapon}: the rendered twin really drew trails (${drawn} frames)`);
    assert.equal(plain.digest.length, 900);
    for (let i = 0; i < plain.digest.length; i++) { assert.equal(shown.digest[i], plain.digest[i], `${weapon}: rendered vs plain at tick ${i}`); assert.equal(r952.digest[i], plain.digest[i], `${weapon}: 952 vs now at tick ${i}`); }
    assert.equal(r952.save, plain.save, `${weapon}: the saved journey matches release 952's`); assert.equal(shown.save, plain.save, `${weapon}: and is untouched by rendering`); assert.ok(!plain.save.includes('shadowTrail'), 'never saved');
  }
  // Close View twin, fists: rendered through the real Close View vs never rendered
  gpu(({ screen }) => {
    const make = () => { const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'shadow-clone', now: 100000 }) as any; g.shadowClone = null; g.presentation = { ...LOW_SAFE }; g.save.equipment.primary = fists(); g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right'; g.enemies = [dummy('cv', g.player.x + 3.5, g.player.y)]; g.boxingUntil = 1e9; return g; };
    const a = make(), b = make(); resetCloseViewCamera(); let t = 100000;
    const fact = (g: any) => JSON.stringify([g.player.x, g.player.y, g.player.stamina, g.player.dodgeUntil, g.player.attackUntil, g.enemies.map((e: any) => [e.x, e.y, e.hp]), g.effects.map((e: any) => [e.id, e.x, e.y]), g.pendingMeleeContact?.id ?? null]);
    layer(a, () => { for (let i = 0; i < 90; i++) { t += FRAME; const input = () => i % 40 === 1 ? press('attack') : i % 40 === 21 ? press('dodge', -1, 0) : calm; a.update(FRAME / 1000, input(), t); b.update(FRAME / 1000, input(), t); render(screen, a, 390, 844, t); assert.equal(fact(a), fact(b), `Close View tick ${i}`); } });
  });
});

test('60 s of rushes, dodges and Shadow Boxing recast every frame with cooldowns wiped: finite, bounded, one pooled record', () => {
  const g = room('fists'); let t = 1000, most = 0, record: any = null; const out = new Float64Array(SHADOW_DASH.ghosts * 3), D = { live: false, charge: 0, wraith: 0, t: 1 };
  g.enemies = Array.from({ length: 4 }, (_, i) => dummy(`m${i}`, 20 + 5 * Math.cos(i), 20 + 5 * Math.sin(i), 1e7));
  for (let i = 0; i < 60 * 60; i++) {
    t += FRAME; for (const k of Object.keys(g.save.magicSkills.cooldowns || {})) g.save.magicSkills.cooldowns[k] = 0; g.spellCooldownRemaining = 0; g.player.dodgeReadyAt = 0; g.player.stamina = 1e3;
    g.castSpell('shadow-boxing'); if (i % 40 === 0) for (const [k, e] of g.enemies.entries()) { e.x = 4 + ((i * 7 + k * 11) % 30); e.y = 4 + ((i * 3 + k * 13) % 30); e.dead = false; e.hp = 1e7; }
    g.player.hp = 1e5; g.update(1 / 60, i % 11 === 5 ? press('dodge', Math.cos(i), Math.sin(i)) : press('attack'), t);
    const n = shadowDashGhosts(g, out); most = Math.max(most, n); for (let k = 0; k < n * 3; k++) assert.ok(Number.isFinite(out[k]), `finite ghost at ${i}`);
    const P = shadowDashPose(g, D); assert.ok(Number.isFinite(P.charge) && Number.isFinite(P.wraith) && Number.isFinite(P.t));
    if (g.shadowTrail) { record ||= g.shadowTrail; assert.equal(g.shadowTrail, record, 'one record, reused'); }
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y)); assert.ok(g.effects.length < 400 && g.projectiles.length <= 64);
  }
  assert.ok(record, 'trails were marked'); assert.ok(most > 0 && most <= SHADOW_DASH.ghosts, `bounded (${most})`);
});

// ---- harness: a recording 2D context and WebGL2 stand-in (as shadow-boxing-dash.test.ts)
function ctx(log: any[] = []) { return new Proxy({ canvas: null, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) } as any, { get: (o, k) => k in o ? o[k] : (...args: any[]) => log.push([k, ...args]), set: (o, k, v) => { o[k] = v; return true; } }); }
class MockGL {
  program: any = null;
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; } shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; } getProgramParameter(p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
}
function gpu(run: (o: any) => void) {
  const old = (globalThis as any).WebGL2RenderingContext; (globalThis as any).WebGL2RenderingContext = MockGL; const gl = new MockGL(), screen = ctx(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true as any; resetCloseViewGL();
  try { run({ gl, screen }); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); if (old === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = old; }
}
function layer(g: any, run: () => void) { const fn = (c: any, w: number, h: number, shots: any) => drawRangedEffects(c, g, w, h, shots); CLOSE_VIEW_HOOKS.groundLayers.push(fn); try { return run(); } finally { CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(fn), 1); } }
