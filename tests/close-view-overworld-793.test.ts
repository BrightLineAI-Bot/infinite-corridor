// Release 793: Close View's version 4 leaves the ordinary view alone. The overworld with Close View off (Ember Refuge and a
// Pentagon's section, its courts) draws exactly as it did on main before release 793: a digest of every draw call, pinned from
// origin/main (release 791) and checked to match on the release 793 branch. Its own file, so nothing run before it can change
// the renderer's caches; the clock the renderer reads for its pulses is held still while it draws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { findLabPentagon } from '../src/proving-ground-labs.ts';
const W = 390, H = 844;
test('the overworld with Close View off draws exactly as main did before release 793 (a pinned digest of every draw call)', () => {
  const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g = new Game(s, 0), c = findLabPentagon(s.seed), sums = [], was = performance.now; performance.now = () => 4321;
  try {
  for (const [rx, ry] of [[0, 0], [c.cx, c.cy]]) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.save.closeView = false; const r = plainRecorder(); render(r.ctx, g, W, H, 5000); render(r.ctx, g, W, H, 5000); sums.push(createHash('sha256').update(r.log.join('\n')).digest('hex').slice(0, 16)); } } finally { performance.now = was; }
  assert.deepEqual(sums, OVERWORLD_DIGESTS, `digests ${JSON.stringify(sums)}`);
});
// a recorder that logs every call as it comes (it never throws: the ordinary renderer's own handling is part of what is pinned)
function plainRecorder() { const r = { log: [] }; r.ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : (...a) => { r.log.push(`${String(k)}(${a.map((v) => typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'string' ? v : typeof v).join(',')})`); },
  set: (o, k, v) => { o[k] = v; if (typeof v !== 'object') r.log.push(`${String(k)}=${v}`); return true; } }); return r; }
const OVERWORLD_DIGESTS = ['b8201dfbdf30a968', '01c9266f5f212263']; // computed on origin/main (release 791) and on this branch: the same
