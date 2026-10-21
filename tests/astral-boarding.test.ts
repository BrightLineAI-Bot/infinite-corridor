import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { ASTRAL_BOARDING, beginAstralBoarding, tickAstralBoarding, dismountAstralWalker, syncAstralMount, astralMountPresentation } from '../src/astral-worm-mount.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { ASTRAL_SADDLE, astralBoardingRiderAlpha } from '../src/astral-worm-render.ts';

function pair(dx = 4) {
  const owner = createCombatant('astralWorm', 10, 10, false, []), rider = createCombatant('voidWalker', 10 - dx, 10, false, []);
  owner.id = 'owner'; rider.id = 'rider'; owner.astral = { form: 'worm' };
  const host = { alignment: 'hostile', findOwner: id => id === owner.id ? owner : null, canLand: () => true, findLanding: r => ({ x: r.x + 1, y: r.y }) };
  return { owner, rider, host };
}
const total = ASTRAL_BOARDING.throwTime + ASTRAL_BOARDING.pillarTime + ASTRAL_BOARDING.phaseOutTime + ASTRAL_BOARDING.phaseInTime;

test('boarding: disk homes on the moving Worm, pillar, phase out, phase in, then mounted', () => {
  const { owner, rider, host } = pair();
  assert.equal(beginAstralBoarding(owner, rider, host), true);
  assert.equal(rider.astralMount.status, 'boarding'); assert.equal(rider.astralMount.phase, 'throw');
  const start = { x: rider.x, y: rider.y }, phases = [];
  for (let t = 0; t < total + .2 && rider.astralMount.status === 'boarding'; t += .05) {
    owner.x += .05; // the Worm keeps moving
    tickAstralBoarding(rider, .05, host);
    const m = rider.astralMount;
    if (m.status === 'boarding') {
      if (phases.at(-1) !== m.phase) phases.push(m.phase);
      if (m.phase !== 'phaseIn') assert.deepEqual({ x: rider.x, y: rider.y }, start, 'he never moves himself before phasing in');
      if (m.phase === 'throw') assert(m.disk.h > ASTRAL_BOARDING.diskHeight - 1e-9);
      if (m.phase === 'pillar') assert.deepEqual({ x: m.disk.x, y: m.disk.y }, { x: owner.x, y: owner.y }, 'disk latched to the Worm');
    }
  }
  assert.deepEqual(phases, ['throw', 'pillar', 'phaseOut', 'phaseIn']);
  assert.equal(rider.astralMount.status, 'mounted');
  assert.deepEqual({ x: rider.x, y: rider.y }, { x: owner.x, y: owner.y });
  for (const k of ['phase', 't', 'from', 'disk', 'seat']) assert.equal(k in rider.astralMount, false);
  assert.equal(rider.astralMount.damageTaken, 0); assert(rider.astralMount.knockoffDamage > 0);
});

test('boarding respects reach, pause and zero dt, and survives a JSON round trip', () => {
  let { owner, rider, host } = pair(9);
  assert.equal(beginAstralBoarding(owner, rider, host), false, 'beyond reach');
  ({ owner, rider, host } = pair());
  beginAstralBoarding(owner, rider, host); tickAstralBoarding(rider, .3, host);
  const before = JSON.stringify(rider.astralMount);
  tickAstralBoarding(rider, .3, { ...host, paused: true }); tickAstralBoarding(rider, 0, host);
  assert.equal(JSON.stringify(rider.astralMount), before);
  const copy = JSON.parse(JSON.stringify(rider)); tickAstralBoarding(copy, total, host);
  assert.equal(copy.astralMount.status, 'mounted');
  assert.equal(syncAstralMount(rider, host), false, 'sync never shortcuts boarding');
  assert.equal(rider.astralMount.status, 'boarding');
});

test('boarding cancels in place if the Worm dies or departs, and a late cancel lands normally', () => {
  let { owner, rider, host } = pair();
  beginAstralBoarding(owner, rider, host); tickAstralBoarding(rider, .2, host);
  const at = { x: rider.x, y: rider.y }; owner.dead = true; tickAstralBoarding(rider, .05, host);
  assert.equal(rider.astralMount.status, 'dismounted'); assert.deepEqual({ x: rider.x, y: rider.y }, at);
  ({ owner, rider, host } = pair());
  beginAstralBoarding(owner, rider, host); tickAstralBoarding(rider, .2, host); owner.retreating = true; tickAstralBoarding(rider, .05, host);
  assert.equal(rider.astralMount.status, 'dismounted');
  ({ owner, rider, host } = pair());
  beginAstralBoarding(owner, rider, host);
  tickAstralBoarding(rider, ASTRAL_BOARDING.throwTime + ASTRAL_BOARDING.pillarTime + ASTRAL_BOARDING.phaseOutTime + .05, host);
  assert.equal(rider.astralMount.phase, 'phaseIn');
  assert.equal(dismountAstralWalker(rider, 'damage', host), true);
  assert.equal(rider.astralMount.status, 'dismounted'); assert.deepEqual({ x: rider.x, y: rider.y }, { x: owner.x + 1, y: owner.y });
});

test('boarding presentation: disk in flight, pillar and seat, rider fading out and in', () => {
  const { owner, rider, host } = pair();
  beginAstralBoarding(owner, rider, host);
  const draw = () => { const calls = [], state = {}; const ctx = new Proxy({ getTransform: undefined, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => k in o ? o[k] : k in state ? state[k] : (...args) => calls.push({ kind: k, args, fill: state.fillStyle, alpha: state.globalAlpha }), set: (o, k, v) => (state[k] = v, true) });
    drawPackMonster(ctx, rider, 40, 1000, 'right'); return calls; };
  const seen = {};
  for (let t = 0; t < total; t += .1) {
    tickAstralBoarding(rider, .1, host); if (rider.astralMount.status !== 'boarding') break;
    const p = astralMountPresentation(rider), calls = draw();
    assert(calls.some(c => c.kind === 'fill' && c.fill === ASTRAL_SADDLE.plate), `${p.boarding.phase}: disk or plinth drawn`);
    assert.equal(p.lift, p.boarding.phase === 'phaseIn' ? p.boarding.seatLift : 0);
    const a = astralBoardingRiderAlpha(p.boarding);
    if (p.boarding.phase === 'phaseOut' || p.boarding.phase === 'phaseIn') assert(a >= 0 && a <= 1); else assert.equal(a, 1);
    seen[p.boarding.phase] = true;
  }
  assert.deepEqual(Object.keys(seen).sort(), ['phaseIn', 'phaseOut', 'pillar', 'throw']);
});
