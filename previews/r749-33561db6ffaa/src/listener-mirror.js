// The Listener's mirror form, reworked (release 369; Tim, 2026-10-23, "Far away wanderer"): "the version that mirrors you...
// shouldn't use like copy magic... spawn multiple versions of himself that run around and attack... not all of them will
// have the same amount of health... they'll die off after a while... he'll have a mirror attack... similar to the
// psychic crystal's... if you're doing projectile attacks... all of the attacks will just freeze in space and get
// collected... around him... he'll freeze up to 10, and then he'll launch up to 10 back at you... in rapid succession...
// they'll be able to use... the tools or... attacks or spells that your character has unlocked... frequently spawning
// these clones... one will just walk in a different direction... up to eight... they like rush towards you all swinging
// their swords... like a phalanx... another where they... use the spells and... get bigger... the smart AI where they
// try and avoid your attacks and... position themselves". The grotesque (walled) form became the Morphling in release 385 (listener-morph.ts).
//
// The Listener in its open (mirror) form, every frame (tickMirrorListener):
// - Reflections step out of it every `spawnEvery` seconds, up to `maxClones`, each walking off its own way for a moment
//   before it fights. Each has its own share of the Listener's health (`cloneHp`), half its damage, and fades after
//   `cloneLife` seconds. They carry the Wayfarer's kit: a sword sweep and lance always; a tool shot if the Wayfarer has a
//   tool; a shockwave if a spell is slotted. They dodge (the pack's evasive brain) and keep their distance.
// - Phalanx: with `phalanx.min` or more reflections, they form a line between it and you, hold, then rush you together.
// - Swell: they grow, hit harder and each cast a shockwave, for a few seconds.
// - Mirror: the Wayfarer's shots that come within `freeze.radius` stop in the air around it (up to `freeze.max`); after
//   `freeze.hold` seconds it throws them back at you, one every `freeze.every` seconds, at `freeze.share` of their damage.
// State is runtime only (on the actors); a reload starts the fight's rhythm again.
export const MIRROR_FORM = {
  maxClones: 8, spawnEvery: [1.5, 2.5], cloneLife: [14, 22], cloneHp: [.05, .13], cloneDamage: .5, cloneScale: .78, spreadTime: .9, spreadSpeed: 3,
  archerEvery: [1.6, 2.6], archerRange: [2.5, 7.5], shotSpeed: 6.5, shotLife: 1.8, shotDamage: .6,
  phalanx: { min: 4, every: 14, size: 6, distance: 4.5, spacing: 1.1, form: 1.1, rush: 1.1, rushSpeed: 7, hitRange: .9, damage: 1 },
  swell: { every: 17, time: 5, scale: 1.35, damage: 1.4, shockRadius: 2.6, shockDamage: .8 },
  freeze: { radius: 2.2, max: 10, hold: 1.2, every: .12, share: .8, speed: 7.5, life: 2.2 },
};
const between = (r, [a, b]) => a + (b - a) * r;
const unit = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
// A small deterministic sequence per Listener, so a fight plays the same way from the same state.
const rand = (e, salt) => { const n = Math.sin((e.mirror.seq = (e.mirror.seq || 0) + 1) * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };
export const isMirror = (e) => e?.farArrayBoss === "listener" && !e.dead && (e.listenerPhase || "open") === "open";
export const reflectionsOf = (enemies, e) => enemies.filter((q) => q.mirrorClone && !q.dead && q.summonedBy === e.id);

// `w`: { enemies, projectiles, player, kit: { tool, spell }, open(x, y), spawn(owner, x, y, i, fields), hurt(source, amount), shock(source, radius, damage), now, dt }
export function tickMirrorListener(e, w) {
  const M = MIRROR_FORM, now = w.now, st = (e.mirror ||= { nextSpawn: now + 1500, nextPhalanx: now + M.phalanx.every * 1000, nextSwell: now + M.swell.every * 1000, frozen: [], fireAt: 0 });
  const mine = reflectionsOf(w.enemies, e);
  // Reflections step out.
  if (now >= st.nextSpawn && mine.length < M.maxClones) {
    const i = (st.spawned = (st.spawned || 0) + 1), a = rand(e, 1) * Math.PI * 2, kit = [...["clawSweep", "longStab"], ...(w.kit.spell ? ["shockwave"] : [])];
    w.spawn(e, e.x, e.y, i, { hpShare: between(rand(e, 2), M.cloneHp), lifeUntil: now + between(rand(e, 3), M.cloneLife) * 1000, spread: { x: Math.cos(a), y: Math.sin(a), until: now + M.spreadTime * 1000 }, packAttacks: kit, archer: !!w.kit.tool && rand(e, 4) < .5 });
    st.nextSpawn = now + between(rand(e, 5), M.spawnEvery) * 1000;
  }
  // Phalanx: a line between it and you, then all at once.
  if (!st.phalanx && now >= st.nextPhalanx && mine.length >= M.phalanx.min) {
    const p = w.player, back = unit(e.x - p.x, e.y - p.y), side = { x: -back.y, y: back.x }, line = mine.slice(0, M.phalanx.size), mid = (line.length - 1) / 2;
    line.forEach((c, k) => { const sx = p.x + back.x * M.phalanx.distance + side.x * (k - mid) * M.phalanx.spacing, sy = p.y + back.y * M.phalanx.distance + side.y * (k - mid) * M.phalanx.spacing; c.phalanx = { slot: { x: sx, y: sy }, dir: { x: -back.x, y: -back.y }, hit: false }; });
    st.phalanx = { until: now + (M.phalanx.form + M.phalanx.rush) * 1000, rushAt: now + M.phalanx.form * 1000, ids: line.map((c) => c.id) };
    st.nextPhalanx = now + M.phalanx.every * 1000;
  }
  if (st.phalanx && now >= st.phalanx.until) { for (const c of w.enemies) if (st.phalanx.ids.includes(c.id)) delete c.phalanx; st.phalanx = null; }
  // Swell: bigger, harder, and a shockwave from each.
  if (now >= st.nextSwell && mine.length) {
    for (const c of mine) { c.swellUntil = now + M.swell.time * 1000; c.scale = (c.baseScale || c.scale) * M.swell.scale; w.shock(c, M.swell.shockRadius, Math.max(1, Math.round((c.baseDamage || c.damage) * M.swell.shockDamage))); }
    st.nextSwell = now + M.swell.every * 1000;
  }
  // Mirror: your shots stop around it, then come back.
  for (const q of w.projectiles) {
    if (st.firing || q.hostile || q.dead || st.frozen.length >= M.freeze.max || Math.hypot(q.x - (e.x + .5), q.y - (e.y + .45)) > M.freeze.radius) continue;
    q.dead = true; st.frozen.push({ x: q.x, y: q.y, damage: Math.max(1, Number(q.damage) || 1) });
    if (!st.fireAt) st.fireAt = now + M.freeze.hold * 1000;
  }
  if (st.fireAt && now >= st.fireAt && st.frozen.length) { // once it starts throwing, it holds nothing new until all are thrown
    st.firing = true;
    const f = st.frozen.shift(), d = unit(w.player.x + .5 - f.x, w.player.y + .52 - f.y);
    w.projectiles.push({ id: `${e.id}:mirror:${Math.round(now)}:${st.frozen.length}`, x: f.x, y: f.y, dx: d.x, dy: d.y, speed: M.freeze.speed, life: M.freeze.life, damage: Math.max(1, Math.round(f.damage * M.freeze.share)), hostile: true, path: "straight", age: 0, hits: {}, mirrored: true });
    st.fireAt = st.frozen.length ? now + M.freeze.every * 1000 : 0; if (!st.frozen.length) st.firing = false;
  }
}

// A reflection's own turn. Returns true when it moved itself this frame (the pack AI is skipped).
export function tickReflection(c, w) {
  const M = MIRROR_FORM, now = w.now, owner = w.enemies.find((q) => q.id === c.summonedBy);
  if (now >= c.lifeUntil || !owner || owner.dead) { c.dead = true; c.faded = true; return true; }
  if (c.swellUntil && now >= c.swellUntil) { c.scale = c.baseScale; delete c.swellUntil; }
  if (c.swellUntil) c.damage = Math.round(c.baseDamage * M.swell.damage); else c.damage = c.baseDamage;
  if (c.spread && now < c.spread.until) { const step = M.spreadSpeed * w.dt, x = c.x + c.spread.x * step, y = c.y + c.spread.y * step; if (w.open(x, y)) { c.x = x; c.y = y; } else c.spread.until = 0; return true; }
  if (c.phalanx) {
    const st = owner.mirror?.phalanx, p = w.player;
    if (!st) { delete c.phalanx; return false; }
    if (now < st.rushAt) { const s = c.phalanx.slot, dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy), step = Math.min(d, M.phalanx.rushSpeed * w.dt); if (d > .05) { const x = c.x + dx / d * step, y = c.y + dy / d * step; if (w.open(x, y)) { c.x = x; c.y = y; } } c.facing = c.phalanx.dir; return true; }
    const step = M.phalanx.rushSpeed * w.dt, x = c.x + c.phalanx.dir.x * step, y = c.y + c.phalanx.dir.y * step;
    if (w.open(x, y)) { c.x = x; c.y = y; }
    if (!c.phalanx.hit && Math.hypot(p.x - c.x, p.y - c.y) <= M.phalanx.hitRange) { c.phalanx.hit = true; w.hurt(c, Math.max(1, Math.round(c.damage * M.phalanx.damage))); }
    return true;
  }
  if (c.archer && now >= (c.nextShot || 0)) { // the Wayfarer's tool, mirrored
    const p = w.player, dx = p.x + .5 - (c.x + .5), dy = p.y + .52 - (c.y + .45), d = Math.hypot(dx, dy);
    if (d >= M.archerRange[0] && d <= M.archerRange[1]) { const u = unit(dx, dy); w.projectiles.push({ id: `${c.id}:shot:${Math.round(now)}`, x: c.x + .5 + u.x * .4, y: c.y + .45 + u.y * .4, dx: u.x, dy: u.y, speed: M.shotSpeed, life: M.shotLife, damage: Math.max(1, Math.round(c.baseDamage * M.shotDamage)), hostile: true, path: "straight", age: 0, hits: {} }); }
    c.nextShot = now + between(((c.seed = (c.seed || 7) * 16807 % 2147483647) % 1000) / 1000, M.archerEvery) * 1000;
  }
  return false;
}
