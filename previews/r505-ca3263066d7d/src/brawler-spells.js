// Brawler spells (release 483; Tim, 2026-10-27: "we can even have like spell sword spells... like a giant hammer that comes
// down and attacks... another one that does a large sweep with a sword. And these can be buffed by melee damage... these are
// brawler type [spells]... another one can be like a charge punch fist... you [dash] forward and you punch... you can like
// charge it up if you hold the spell button... the hammer... in whatever direction he's facing, or... the regular, like,
// targeting... that applies for attacking").
//
// Three spells that hit like weapons: their damage is a share of a swing's (Game.meleePower: the weapon, the melee bonus and
// every melee-damage multiplier), not of the magic stats. They aim like a swing: the locked target, else the foe auto aim
// picks, else the way you face.
//   Hammerfall: a hammer of light falls on the foe (or `reach` tiles ahead) after `delay` s; a heavy blow in `radius` that
//     staggers (`stun` s; a quarter of that for bosses and elites).
//   Great Sweep: a blade sweeps all the way round you: every foe within `radius`.
//   Iron Fist (a spell in 483 and 485; the Iron Fists tool from release 489, see IRON_FISTS): press and hold to charge (up to `chargeTime` s past `tapGrace`); let go to dash `dash` tiles plus `chargeDash`
//     at full charge toward the aim and punch in `radius`. Damage goes from `share` to `share + chargeShare` with the charge.
//     The dash stops at walls and lethal ground, and you cannot be hurt during it.
// The spells are ordinary SPELLS entries (items.ts, `brawler: true`), so slots, presets, glyph sockets and cooldowns treat them
// like the others. game.ts runs them (castBrawler for Aegis and Shadow Boxing; brawlerTool for Hammerfall and Great Sweep; fistPress and fistPunch for the Iron Fists); drawBrawler below draws them.
export const BRAWLER = {
  // Release 493 (Tim: "the hammer fall and the great sweep are tools"): tools now, each press costs `cooldown` s; damage is a
  // share of the tool's power (Game.toolPower), not of a spell.
  hammerfall: { share: 1.8, radius: 1.5, reach: 2.6, delay: .32, stun: .6, cooldown: 1.2, lifetime: .25 },
  "great-sweep": { share: 1.2, radius: 2.4, cooldown: 1, lifetime: .3 },
  // Release 485 (Tim: "a shield where you can put up this shield for like a second... it'll just like block damage"): every
  // blow is turned aside for `ms`. A fall into lava or a chasm is not a blow.
  aegis: { ms: 1000 },
  // Release 485 (Tim: "shadow boxing... if you [lock] on a target, you can hit the melee... moves and it will move with the
  // target... stick to him... a bruiser... healing passives, or... damage reduction passives, or... damage increased
  // passives"): for `seconds`, each swing first carries you to your foe (the lock, else the nearest within `stick` tiles past
  // your reach) if it is out of reach, stopping at walls; your blows deal `damage` more and heal `heal` of what they deal,
  // and you take `guard` less damage.
  // Release 493/495: it works with the Iron Fists' punches and with the Hammerfall and Great Sweep tools as well (the hammer
  // reaches `stick` tiles farther, the sweep carries you to the foe first; each deals `damage` more and heals `heal`).
  "shadow-boxing": { seconds: 8, stick: 4, damage: .1, heal: .06, guard: .15 },
};
// Aegis and Shadow Boxing, as the Wayfarer wears them (drawn round the player).
export function drawBrawlerAuras(ctx, game, toScreen, s, t) {
  const now = game.lastUpdateNow || 0, [x, y] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 });
  if (now < (game.aegisUntil || 0)) { const k = (game.aegisUntil - now) / BRAWLER.aegis.ms; ctx.fillStyle = "#9fd0ff22"; ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 2.5; ctx.globalAlpha = .4 + .6 * k; ctx.beginPath(); ctx.arc(x, y, s * .85, 0, 7); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * .85, y + Math.sin(a) * s * .85); ctx.lineTo(x + Math.cos(a + Math.PI / 3) * s * .85, y + Math.sin(a + Math.PI / 3) * s * .85); ctx.stroke(); } ctx.globalAlpha = 1; }
  if (now < (game.boxingUntil || 0)) { ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 2; ctx.globalAlpha = .55 + .2 * Math.sin(t * 8); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(x, y + s * .35, s * .55, s * .2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
}
// Iron Fists (release 489; Tim: "let's make the iron fist a tool that you can use instead of a spell... a three button combo...
// the first punch is... your standard dash. You can charge it and then dash... you can hold it and dash farther... Second
// [punch] will be like a quick follow up. You can't hold it. And the third punch would be like an uppercut that does more
// damage. If... you land all three"). The Iron Fist spell of release 483 became a tool: gauntlets in the Tool slot. Each press
// of Tool throws the next punch of the combo while the last one's `window` s are open; past it, the combo starts again.
//   1. Dash punch: hold Tool to charge in place (up to `chargeTime` s past `tapGrace`); on release (a tap is a release at
//      once) it rushes to the foe you target (the lock, else auto aim) when it is within `rush` tiles, stopping `stop` short,
//      and punches for `share` plus `chargeShare` with the charge; with no foe in range it punches in place. Release 491 (Tim:
//      "the initial punch should [dash] you towards the enemy that you're targeting... if it's beyond range, then it should
//      just do a punch in place... a reasonable range... if you try to hold it, you'll stay in place and... charge it"). You
//      cannot be hurt during the rush.
//   2. Jab: a short step and a quick blow; it cannot be held.
//   3. Uppercut: the heavy blow, with a stagger. If both earlier punches landed, it is a finisher: `finisher` × the damage
//      and a longer stagger. After it, `recover` s before the next combo.
// Damage: (`base` + the gauntlets' power × `perPower` + the melee bonus) × the tool glyph mods × every melee-damage multiplier.
// The dashes stop at walls and lethal ground. game.ts runs it (fistPress, fistPunch); drawBrawler draws the blows.
// Release 493 (Tim: "the iron fist is an attack... shadow boxing should work with iron fist"): the Iron Fists are a weapon
// on the Attack button now (the same combo); while Shadow Boxing holds, the dash punch rushes `stick` tiles farther, the jab
// and uppercut step to the foe, and every punch deals and heals as a boxing swing does.
export const IRON_FISTS = {
  base: 10, perPower: 1.2, window: .9, recover: .45, finisher: 1.5, finisherStun: .8, tapGrace: .12, chargeTime: 1.2, guardMs: 220,
  punches: [
    { name: "Dash punch", share: 1.4, chargeShare: 2.2, dash: 0, radius: 1.3, rush: 4, stop: .9 }, // release 491: rushes to a foe within `rush` tiles (to `stop` from it); none in range, it lands in place
    { name: "Jab", share: .9, chargeShare: 1.2, echoes: 1, dash: .6, radius: 1.1 },
    { name: "Uppercut", share: 2.4, chargeShare: 1.6, echoes: 2, dash: .3, radius: 1.4, stun: .5 },
  ],
};
// Release 503 (Tim: "if you have echo... it'll let you power up your second swing... it'll still... do the small... forward
// motion step... If you put a second [echo] in there your third swing [can] be charged... as well"): with `echoes` Echo glyphs
// in the Iron Fists' sockets, that punch can be held and charged too (`chargeShare` more at full charge). Without them it is
// thrown at once, as before.
// Release 503 (Tim: Echo on Shadow Boxing "spawns a shadow clone for 3 seconds... that only does melee attacks"): `echoClone`.
export const BRAWLER_ECHO = { echoClone: 3, cloneArc: { shape: "arc", range: 1.75, arc: 160 } };
// How charged the dash punch is after `held` seconds of holding (0..1).
export const fistCharge = (held) => Math.max(0, Math.min(1, (held - IRON_FISTS.tapGrace) / IRON_FISTS.chargeTime));

// Drawing (called from combat-visuals.ts with its screen transform). `t` is seconds.
export function drawBrawler(ctx, game, toScreen, s, t) {
  for (const fx of game.effects) {
    if (!fx.brawler) continue;
    const [x, y] = toScreen(fx), R = fx.radius * s;
    if (fx.kind === "hammerfall") {
      const fall = fx.delay > 0 ? 1 - fx.delay / BRAWLER.hammerfall.delay : 1;
      ctx.strokeStyle = "#ffd58a99"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); ctx.setLineDash([]); // where it lands
      if (fx.delay > 0) { // the hammer head comes down
        const hy = y - s * 2.2 * (1 - fall), w = s * .9, h = s * .5;
        ctx.fillStyle = "#e8d3a2"; ctx.strokeStyle = "#5a4628"; ctx.lineWidth = 2; ctx.fillRect(x - w / 2, hy - h, w, h); ctx.strokeRect(x - w / 2, hy - h, w, h);
        ctx.fillStyle = "#8a6a3e"; ctx.fillRect(x - s * .06, hy - h - s * .8, s * .12, s * .8);
      } else { // the shock ring
        const k = Math.max(0, fx.life / .25); ctx.globalAlpha = k; ctx.strokeStyle = "#ffe2a8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R * (1.15 - .4 * k), 0, 7); ctx.stroke();
        ctx.fillStyle = "#ffcf7a44"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
    } else if (fx.kind === "great-sweep") {
      const k = Math.max(0, fx.life / .3), a0 = (1 - k) * Math.PI * 2;
      ctx.strokeStyle = "#dfe8f0"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.globalAlpha = .85 * k + .15; ctx.beginPath(); ctx.arc(x, y, R * .85, a0 - 1.6, a0); ctx.stroke();
      ctx.strokeStyle = "#9fc4e0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R, a0 - 2.4, a0); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt";
    } else if (fx.kind === "fist-uppercut") { // release 489: a blow that rises
      const k = Math.max(0, fx.life / .3); ctx.globalAlpha = k; ctx.strokeStyle = fx.finisher ? "#fff0b8" : "#ffd08a"; ctx.lineWidth = fx.finisher ? 6 : 4; ctx.lineCap = "round";
      for (const o of [-.35, 0, .35]) { ctx.beginPath(); ctx.moveTo(x + o * R, y + R * .4); ctx.lineTo(x + o * R * .5, y - R * (1.1 - .5 * k)); ctx.stroke(); }
      if (fx.finisher) { ctx.fillStyle = "#ffcf7a44"; ctx.beginPath(); ctx.arc(x, y, R * 1.1, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.lineCap = "butt";
    } else if (fx.kind === "iron-fist") {
      const k = Math.max(0, fx.life / .25); ctx.globalAlpha = k; ctx.fillStyle = "#ffb05a55"; ctx.beginPath(); ctx.arc(x, y, R * (1.1 - .3 * k), 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffe0b0"; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .4, y + Math.sin(a) * R * .4); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  const c = game.fistCharge;
  if (c) { // charging: a ring tightening round the Wayfarer, brighter as it fills
    const [x, y] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }), k = fistCharge(((game.lastUpdateNow || 0) - c.start) / 1000);
    ctx.strokeStyle = k >= 1 ? "#ffe9b0" : "#ffb05a"; ctx.lineWidth = 2 + 3 * k; ctx.globalAlpha = .5 + .4 * k; ctx.beginPath(); ctx.arc(x, y, s * (1.2 - .5 * k), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.05, k)); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
