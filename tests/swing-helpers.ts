// Weighted swings (src/melee-swing.ts, 2026-11-14): a Verge Cleaver press winds up and strikes during its active window, no
// longer at the press. Tests written for the old instant hit step the live swing with this, ticking only the swing's own
// clock (no AI, no other timers): to its first contact tick, or to its end. Returns the clock it stopped at.
export function swingTo(g: any, now: number, until: 'contact' | 'end' = 'end', step = 8): number {
  let t = now;
  for (let i = 0; i < 400 && g.pendingMeleeContact?.v === 3; i++) {
    t += step; g.tickMeleeSwing(t);
    if (until === 'contact' && g.pendingMeleeContact?.contacted) break;
  }
  return t;
}
// A Cleaver press that lands at once, as the old instant swing did: press, then run the swing out on its own clock.
export function landSwing(g: any, now: number, direction: any = null): number {
  g.primaryAttack(now, direction);
  return swingTo(g, now);
}
