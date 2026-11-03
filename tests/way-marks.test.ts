// The way down and the way out (Tim, 2026-11-03: "I'll get to the end and there'll be the way out versus the way down... and it'll
// just take me out... I'm not sure which one I actually should go to... it should just be better marked").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render, wayKind } from '../src/renderer.ts';

const canvas = () => { const texts = []; const base = { texts, fillText(t) { texts.push(String(t)); }, strokeText(t) { texts.push(String(t)); }, measureText: (t) => ({ width: String(t).length * 6 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), getTransform: () => ({}),
  ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } };
  return new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true }); };
const clearedAnnex = () => { const s = freshSave(); s.seed = 'ANNEX'; const g = new Game(s, 0); let o = null;
  for (let rx = 3; rx < 60 && !o; rx++) for (let ry = -20; ry < 20 && !o; ry++) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); o = g.map.objects.find((q) => q.deepAnnex); }
  g.player.x = o.x; g.player.y = o.y; g.interact('enter', o.id); for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; }
  g.update(.016, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 99999); return g; };

test('ways are told apart: annex and Deep stairs and a stair down are the way down; doors out and the Ember Door the way out', () => {
  assert.equal(wayKind({ kind: 'annexStair' }, {}), 'down'); assert.equal(wayKind({ kind: 'deepStair' }, {}), 'down'); assert.equal(wayKind({ kind: 'deepTransition', direction: 'down' }, {}), 'down');
  assert.equal(wayKind({ kind: 'exit', completionExit: true }, {}), 'out'); assert.equal(wayKind({ kind: 'emberDoor' }, {}), 'out');
  assert.equal(wayKind({ kind: 'deepTransition', direction: 'up' }, {}), null); assert.equal(wayKind({ kind: 'exit' }, { building: { base: 'x' } }), null, 'buildings name their own doors');
});

test('a cleared annex floor labels its way down (with the floor below) and its way out; off the screen, an arrow points the way down', () => {
  const g = clearedAnnex(), st = g.map.objects.find((o) => o.kind === 'annexStair'), out = g.map.objects.find((o) => o.completionExit); assert.ok(st && out);
  g.player.x = st.x - 1; g.player.y = st.y + 1; let ctx = canvas(); render(ctx, g, 360, 640, 5000);
  assert.ok(ctx.texts.includes(`▼ WAY DOWN · FLOOR ${st.floor}`), ctx.texts.join('|')); assert.ok(ctx.texts.some((t) => t.startsWith('WAY OUT')));
  g.player.x = st.x + 30; g.player.y = st.y + 30; ctx = canvas(); render(ctx, g, 360, 640, 5000); assert.ok(ctx.texts.includes('WAY DOWN'), 'the edge arrow');
});
