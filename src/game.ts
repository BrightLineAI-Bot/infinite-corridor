import { rangedWeapon, primaryProfile, SPELLS } from "./items.ts";
import {
  generateRegion,
  generateDungeon,
  dungeonId,
  SECTION_SIZE,
  regionalThreat,
  perceptionOverlay,
  apertureTier,
  APERTURE_THRESHOLDS,
  apertureEncounterSpawns,
  perceived,
  sectionExits,
  wayfindingCues,
} from "./world.ts";
import { createCombatant, dodge, playerAttack } from "./combat.ts";
import {
  applyInteraction,
  validActions,
  recordNpcDamage,
  dungeonHistory,
  abandonDungeon,
  journalOnce,
  gainAperture,
  progressLead,
} from "./interactions.ts";
import { ensurePerception } from "./types.ts";
import { generateItem } from "./items.ts";
import { hashSeed } from "./random.ts";
const remaining = (v, n) => Math.max(0, Number(v || 0) - n);
export function characterStats(save) {
  const level = Math.max(1, Number(save.level) || 1),
    stats = save.stats || {},
    vigor = Math.max(1, Number(stats.Vigor) || 1),
    finesse = Math.max(1, Number(stats.Finesse) || 1),
    resolve = Math.max(1, Number(stats.Resolve) || 1),
    armorPower = Math.max(0, Number(save.equipment?.armor?.power) || 0),
    charmPower = Math.max(0, Number(save.equipment?.charm?.power) || 0);
  return {
    maxHp: 60 + (level - 1) * 6 + (vigor - 1) * 8,
    maxStamina: 50 + (level - 1) + (finesse - 1) * 3,
    damageReduction: Math.min(
      0.45,
      (resolve - 1) * 0.02 + armorPower * 0.025 + charmPower * 0.01,
    ),
    meleeBonus:
      Math.max(1, Number(stats.Might) || 1) * 2 +
      (Number(save.weaponLevel) || 0) * 3 +
      Math.floor((level - 1) * 0.6),
    magicBonus:
      Math.max(1, Number(stats.Focus) || 1) +
      Math.floor((level - 1) * 0.45),
    armorPower,
    charmPower,
  };
}
export function syncCharacterStats(save) {
  const oldHp = Math.max(0, Number(save.maxHp) || 60),
    oldStamina = Math.max(0, Number(save.maxStamina) || 50),
    derived = characterStats(save);
  save.maxHp = derived.maxHp;
  save.maxStamina = derived.maxStamina;
  const runtime = save.session?.playerRuntime;
  if (runtime) {
    runtime.hp = Math.min(
      derived.maxHp,
      Math.max(0, Number(runtime.hp) || 0) + Math.max(0, derived.maxHp - oldHp),
    );
    runtime.stamina = Math.min(
      derived.maxStamina,
      Math.max(0, Number(runtime.stamina) || 0) +
        Math.max(0, derived.maxStamina - oldStamina),
    );
  }
  if (Number.isFinite(save.hp))
    save.hp = Math.min(
      derived.maxHp,
      save.hp + Math.max(0, derived.maxHp - oldHp),
    );
  if (Number.isFinite(save.stamina))
    save.stamina = Math.min(
      derived.maxStamina,
      save.stamina + Math.max(0, derived.maxStamina - oldStamina),
    );
  return derived;
}
export function settleProgression(save) {
  save.level = Math.max(1, Math.floor(Number(save.level) || 1));
  save.xp = Math.max(0, Math.floor(Number(save.xp) || 0));
  save.nextXp = Math.max(1, Math.floor(Number(save.nextXp) || 30));
  save.statPoints = Math.max(0, Math.floor(Number(save.statPoints) || 0));
  let levels = 0;
  while (save.xp >= save.nextXp && levels < 100) {
    save.xp -= save.nextXp;
    save.level++;
    save.statPoints++;
    save.nextXp = Math.ceil(save.nextXp * 1.35 + 10);
    levels++;
  }
  syncCharacterStats(save);
  return levels;
}
export function awardExperience(save, amount) {
  save.xp = Math.max(
    0,
    (Number(save.xp) || 0) + Math.max(0, Math.floor(Number(amount) || 0)),
  );
  return settleProgression(save);
}
export function tileOpen(map, width, x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    height = map.tiles.length / width;
  return (
    ix >= 0 &&
    iy >= 0 &&
    ix < width &&
    iy < height &&
    !map.tiles[iy * width + ix].blocked
  );
}
export function footprintOpen(map, width, x, y) {
  return (
    tileOpen(map, width, x + 0.24, y + 0.5) &&
    tileOpen(map, width, x + 0.76, y + 0.5) &&
    tileOpen(map, width, x + 0.24, y + 0.88) &&
    tileOpen(map, width, x + 0.76, y + 0.88)
  );
}
export function moveAxis(entity, dx, dy, map, width) {
  let moved = false,
    steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.16)),
    sx = dx / steps,
    sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx && footprintOpen(map, width, entity.x + sx, entity.y)) {
      entity.x += sx;
      moved = true;
    }
    if (sy && footprintOpen(map, width, entity.x, entity.y + sy)) {
      entity.y += sy;
      moved = true;
    }
  }
  return moved;
}
export function projectileDirection(x, y, facing = "down") {
  const m = Math.hypot(x, y);
  if (m > 0.001) return { x: x / m, y: y / m };
  const [a, b] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[
    facing
  ] || [0, 1];
  return { x: a, y: b };
}
export function updateProjectiles(
  projectiles,
  enemies,
  map,
  width,
  dt,
  onDefeat = () => {},
  onDetonate = () => {},
) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.age = (Number(p.age) || 0) + dt;
    if (
      p.path === "boomerang" &&
      !p.returning &&
      p.age >= (Number(p.turnAfter) || p.life / 2)
    ) {
      p.returning = true;
      p.dx *= -1;
      p.dy *= -1;
    }
    const distance = p.speed * dt,
      steps = Math.max(1, Math.ceil(distance / 0.2)),
      step = distance / steps;
    for (let i = 0; i < steps && !p.dead; i++) {
      const nx = p.x + p.dx * step,
        ny = p.y + p.dy * step;
      if (!tileOpen(map, width, nx, ny)) {
        if(p.path==="grenade"){p.dead=true;onDetonate(p);break}
        if (p.path === "boomerang" && !p.returning) {
          p.returning = true;
          p.dx *= -1;
          p.dy *= -1;
          continue;
        } else {
          p.dead = true;
          p.impact = { x: p.x, y: p.y };
          break;
        }
      }
      p.x = nx;
      p.y = ny;
      for (const e of enemies)
        if (
          p.path !== "grenade" &&
          !e.dead &&
          !p.hits?.[e.id] &&
          Math.hypot(e.x + 0.5 - p.x, e.y + 0.45 - p.y) < 0.48
        ) {
          e.hp -= p.damage;
          e.hitFlash = 0.18;
          if (p.path === "boomerang") {
            (p.hits ||= {})[e.id] = true;
          } else p.dead = true;
          p.impact = { x: p.x, y: p.y };
          if (e.hp <= 0 && !e.dead) {
            e.dead = true;
            onDefeat(e);
          }
          break;
        }
    }
    p.life -= dt;
    if (p.life <= 0){p.dead=true;if(p.path==="grenade")onDetonate(p)}
  }
  return projectiles.filter((p) => !p.dead);
}
export function meleeAttackGeometry(player, profile, direction) {
  const d = projectileDirection(direction?.x, direction?.y, player.facing);
  return {
    kind: "sweep",
    x: player.x + 0.5,
    y: player.y + 0.45,
    dx: d.x,
    dy: d.y,
    range: profile.range,
    innerRadius: 0.72,
    arc: profile.arc,
    shape: profile.shape,
  };
}
export function primaryAttackHits(
  player,
  enemies,
  map,
  width,
  profile,
  direction,
) {
  const g = meleeAttackGeometry(player, profile, direction),
    half = (g.arc * Math.PI) / 360,
    hits = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const x = e.x + 0.5 - g.x,
      y = e.y + 0.45 - g.y,
      range = Math.hypot(x, y),
      dot = (x * g.dx + y * g.dy) / (range || 1),
      angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (range <= g.range && (range <= g.innerRadius || angle <= half)) {
      let clear = true,
        steps = Math.ceil(range * 4);
      for (let i = 1; i < steps; i++)
        if (
          !tileOpen(map, width, g.x + (x * i) / steps, g.y + (y * i) / steps)
        ) {
          clear = false;
          break;
        }
      if (clear) hits.push(e);
    }
  }
  return hits;
}
export function selectMeleeAim(player, enemies, map, width, reach) {
  const out = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const x = e.x + 0.5 - (player.x + 0.5),
      y = e.y + 0.45 - (player.y + 0.45),
      distance = Math.hypot(x, y);
    if (distance > reach) continue;
    let clear = true,
      steps = Math.ceil(distance * 4);
    for (let i = 1; i < steps; i++)
      if (
        !tileOpen(
          map,
          width,
          player.x + 0.5 + (x * i) / steps,
          player.y + 0.45 + (y * i) / steps,
        )
      ) {
        clear = false;
        break;
      }
    if (clear) {
      const d = projectileDirection(x, y, player.facing),
        f = projectileDirection(0, 0, player.facing);
      out.push({ e, d, distance, alignment: d.x * f.x + d.y * f.y });
    }
  }
  out.sort(
    (a, b) =>
      a.distance - b.distance ||
      b.alignment - a.alignment ||
      String(a.e.id).localeCompare(String(b.e.id)),
  );
  return out[0]?.d || null;
}
export function updateTraps(objects, player, dt, jumping = false) {
  for (const trap of objects.filter((o) => o.kind === "trap")) {
    trap.hits = trap.hits || {};
    trap.timer = Math.max(0, Number(trap.timer) || 0);
    trap.loadGrace =
      trap.loadGrace === undefined ? 0.8 : Math.max(0, trap.loadGrace - dt);
    const near = Math.hypot(player.x - trap.x, player.y - trap.y) < 0.72;
    if (trap.phase === "armed" && near) {
      trap.phase = "warning";
      trap.timer = 0.7;
      trap.hits = {};
    } else if (trap.phase === "warning") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.phase = "active";
        trap.timer = 0.35;
      }
    } else if (trap.phase === "active") {
      trap.timer -= dt;
      const inFire =
        trap.trapType === "fire" &&
        Math.abs(player.y - trap.y) < 0.55 &&
        player.x >= trap.x - 1 &&
        player.x <= trap.x + 3;
      const inSpikes = trap.trapType === "spikes" && near;
      if (
        !jumping &&
        trap.loadGrace <= 0 &&
        !trap.hits.player &&
        (inFire || inSpikes)
      ) {
        trap.hits.player = true;
        player.hp -= 14;
      }
      if (trap.timer <= 0) {
        trap.phase = "recovery";
        trap.timer = 1.6;
      }
    } else if (trap.phase === "recovery") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.phase = "armed";
        trap.timer = 0;
      }
    }
  }
  return objects;
}
export function updateEffects(effects, enemies, dt, onDefeat = () => {}) {
  for (const fx of effects) {
    fx.life -= dt;
    fx.untilPulse -= dt;
    if (fx.untilPulse <= 0) {
      fx.untilPulse += fx.pulse;
      fx.pulseIndex = (fx.pulseIndex || 0) + 1;
      for (const e of enemies) {
        if (
          e.dead ||
          Math.hypot(e.x + 0.5 - fx.x, e.y + 0.45 - fx.y) > fx.radius
        )
          continue;
        const key = `${fx.pulseIndex}:${e.id}`;
        if (fx.hits[key]) continue;
        fx.hits[key] = true;
        e.hp -= fx.damage;
        e.hitFlash = 0.18;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          onDefeat(e);
        }
      }
    }
  }
  return effects.filter((f) => f.life > 0);
}
export function velaShop(save) {
  if (!save.shop)
    save.shop = {
      version: 1,
      limited: { ironbarkTonic: 2, lumenPhial: 2, crossingSigil: 1 },
      purchased: {},
      equipment: [
        generateItem(`${save.seed}:vela-shop:v1:0`, 2),
        generateItem(`${save.seed}:vela-shop:v1:1`, 3),
      ],
    };
  if (save.shop.limited.crossingSigil === undefined)
    save.shop.limited.crossingSigil = 1;
  return save.shop;
}
export function equipInventoryItem(save, index) {
  const item = save.inventory[index];
  if (!item || !["primary", "secondary", "armor", "charm"].includes(item.slot))
    return false;
  const prior = save.equipment[item.slot] || null;
  save.equipment[item.slot] = { ...item };
  save.inventory.splice(index, 1);
  if (prior) save.inventory.push(prior);
  return true;
}
export function buyFromVela(save, id, quantity = 1) {
  if (
    save.worldFlags["vendor-vela:dead"] ||
    save.consequences?.npcs?.["vendor-vela"]?.status === "dead" ||
    save.consequences?.npcs?.["vendor-vela"]?.disposition === "hostile" ||
    save.consequences?.settlements?.["ember-refuge"]?.status === "fallen"
  )
    return { ok: false, message: "Vela’s supplies are no longer available." };
  const shop = velaShop(save),
    defs = { restorativeDraught: 3, ironbarkTonic: 8, lumenPhial: 9 };
  if (id in defs) {
    const unlimited = id === "restorativeDraught",
      available = unlimited ? 99 : shop.limited[id] || 0,
      cap = 99 - (save.consumables[id] || 0),
      qty = Math.max(
        0,
        Math.min(
          Math.floor(quantity),
          available,
          cap,
          Math.floor(save.currency / defs[id]),
        ),
      );
    if (!qty)
      return {
        ok: false,
        message:
          cap <= 0
            ? "Supply stack is full."
            : available <= 0
              ? "Out of stock."
              : "Not enough marks.",
      };
    save.currency -= qty * defs[id];
    save.consumables[id] = (save.consumables[id] || 0) + qty;
    if (!unlimited) shop.limited[id] -= qty;
    return { ok: true, quantity: qty, message: `Purchased ${qty} ${id}.` };
  }
  const index = shop.equipment.findIndex((i) => i.id === id);
  if (index < 0 || shop.purchased[id])
    return { ok: false, message: "Out of stock." };
  const item = shop.equipment[index],
    price = 12 + item.power * 4;
  if (save.currency < price) return { ok: false, message: "Not enough marks." };
  if (save.inventory.length >= 6)
    return { ok: false, message: "Pack is full." };
  save.currency -= price;
  save.inventory.push({ ...item });
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.` };
}
export function vendorShop(save, vendorId = "vendor-vela") {
  if (vendorId === "vendor-vela") return velaShop(save);
  save.shops ||= {};
  return (save.shops[vendorId] ||= {
    version: 1,
    limited: { ironbarkTonic: 1, lumenPhial: 1, crossingSigil: 1 },
    purchased: {},
    equipment: [
      generateItem(`${save.seed}:${vendorId}:shop:0`, Math.max(2, save.level)),
    ],
  });
}
export function buyFromVendor(save, vendorId, id, quantity = 1) {
  if (vendorId === "vendor-vela" && id !== "crossingSigil")
    return buyFromVela(save, id, quantity);
  const npc = save.consequences?.npcs?.[vendorId],
    settlement =
      vendorId === "vendor-iona"
        ? "glasshaven"
        : vendorId === "vendor-mora"
          ? "coilmarket"
          : "ember-refuge";
  if (
    save.worldFlags[vendorId + ":dead"] ||
    npc?.status === "dead" ||
    npc?.disposition === "hostile" ||
    save.consequences?.settlements?.[settlement]?.status === "fallen"
  )
    return { ok: false, message: "This vendor is unavailable." };
  const shop = vendorShop(save, vendorId),
    defs = {
      restorativeDraught: 3,
      ironbarkTonic: 8,
      lumenPhial: 9,
      crossingSigil: 30,
    };
  if (id in defs) {
    const unlimited = id === "restorativeDraught",
      available = unlimited ? 99 : shop.limited[id] || 0,
      cap = 99 - (save.consumables[id] || 0),
      qty = Math.max(
        0,
        Math.min(
          Math.floor(quantity),
          available,
          cap,
          Math.floor(save.currency / defs[id]),
        ),
      );
    if (!qty)
      return {
        ok: false,
        message:
          cap <= 0
            ? "Supply stack is full."
            : available <= 0
              ? "Out of stock."
              : "Not enough marks.",
      };
    save.currency -= qty * defs[id];
    save.consumables[id] = (save.consumables[id] || 0) + qty;
    if (!unlimited) shop.limited[id] -= qty;
    return { ok: true, quantity: qty, message: `Purchased ${qty} ${id}.` };
  }
  const item = shop.equipment.find((i) => i.id === id);
  if (!item || shop.purchased[id])
    return { ok: false, message: "Out of stock." };
  const price = 12 + item.power * 4;
  if (save.currency < price) return { ok: false, message: "Not enough marks." };
  if (save.inventory.length >= 6)
    return { ok: false, message: "Pack is full." };
  save.currency -= price;
  save.inventory.push({ ...item });
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.` };
}
export function actionReadiness(game, now = 0) {
  const attack = Math.max(0, (game.player.attackReadyAt || 0) - now),
    jump = Math.max(0, (game.jumpUntil || 0) - now),
    spell = Math.max(0, game.spellCooldownRemaining || 0);
  return {
    attack: { remaining: attack / 1000, duration: 0.42 },
    tool: {
      remaining: attack / 1000,
      duration: 0.36,
      active: !!game.save.toolMode,
    },
    dodge: {
      remaining: 0,
      duration: 0,
      available: game.player.stamina >= 15,
      cost: 15,
    },
    jump: { remaining: jump / 1000, duration: 0.52 },
    spell: {
      remaining: spell,
      duration: (SPELLS[game.save.equippedSpell] || SPELLS["ember-ring"])
        .cooldown,
    },
    potion: {
      remaining: 0,
      duration: 0,
      count: game.save.consumables?.restorativeDraught || 0,
      available:
        (game.save.consumables?.restorativeDraught || 0) > 0 &&
        game.player.hp < game.save.maxHp,
    },
  };
}
export function enemyDangerRadius(enemy) {
  return Math.max(1.7, Math.max(0, Number(enemy?.range) || 0) + 0.5);
}
export function attackInRange(enemy, player) {
  return (
    Math.hypot(player.x - enemy.x, player.y - enemy.y) <
    enemyDangerRadius(enemy)
  );
}
export function hasLineOfSight(enemy, player, map, width) {
  const dx = player.x - enemy.x,
    dy = player.y - enemy.y,
    steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 4));
  for (let i = 1; i < steps; i++)
    if (
      !tileOpen(
        map,
        width,
        enemy.x + (dx * i) / steps,
        enemy.y + (dy * i) / steps,
      )
    )
      return false;
  return true;
}
export function ensureAI(e) {
  if (!e.ai)
    e.ai = {
      homeX: e.x,
      homeY: e.y,
      phase: (hashSeed(e.id) % 628) / 100,
      facing: "down",
      mode: "patrol",
      step: 0,
    };
  if (!Number.isFinite(e.ai.phase)) e.ai.phase = 0;
  if ((e.telegraph || 0) < 0) e.telegraph = 0;
  return e.ai;
}
export function updateEnemyAI(e, player, map, width, dt, now, sanctuary=null) {
  if(sanctuary){enforceSanctuary(e,sanctuary);if(Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<sanctuary.radius){e.telegraph=0;return false}}
  const ai = ensureAI(e),
    toPlayer = Math.hypot(player.x - e.x, player.y - e.y),
    fromHome = Math.hypot(e.x - ai.homeX, e.y - ai.homeY);
  e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
  e.strike = Math.max(0, (e.strike || 0) - dt);
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
  e.recoil = Math.max(0, (e.recoil || 0) - dt);
  if (e.telegraph > 0) {
    e.telegraph = Math.max(0, e.telegraph - dt);
    if (e.telegraph === 0) {
      e.cooldown = 1.9;
      e.strike = 0.24;
      return attackInRange(e, player) && hasLineOfSight(e, player, map, width);
    }
    return false;
  }
  let tx,
    ty,
    speed = 0.42;
  if (toPlayer < 6 && fromHome < 9) {
    ai.mode = "chase";
    tx = player.x - e.x;
    ty = player.y - e.y;
    speed = 0.78;
  } else if (fromHome > 3.5) {
    ai.mode = "return";
    tx = ai.homeX - e.x;
    ty = ai.homeY - e.y;
    speed = 0.58;
  } else {
    ai.mode = "patrol";
    ai.phase = (ai.phase + dt / 1.9) % (Math.PI * 2);
    const angle = ai.phase;
    tx = Math.cos(angle);
    ty = Math.sin(angle * 0.83);
    speed = 0.3;
  }
  speed *= e.speedMultiplier || 1;
  const m = Math.hypot(tx, ty) || 1,
    dx = (tx / m) * speed * dt,
    dy = (ty / m) * speed * dt;
  if (Math.abs(tx) > Math.abs(ty)) ai.facing = tx < 0 ? "left" : "right";
  else ai.facing = ty < 0 ? "up" : "down";
  ai.step = (ai.step + Math.hypot(dx, dy)) % 2;
  moveAxis(e, dx, dy, map, width);
  if(sanctuary)enforceSanctuary(e,sanctuary);
  if (
    attackInRange(e, player) &&
    e.cooldown <= 0 &&
    hasLineOfSight(e, player, map, width)
  )
    e.telegraph = 0.9;
  return false;
}
export function settlementSanctuary(map,rx,ry,save){if(!map||rx===0&&ry===0&&save?.consequences?.settlements?.['ember-refuge']?.status==='fallen')return null;return map.settlement||rx===0&&ry===0?{x:16,y:16,radius:9}:null}
export function enforceSanctuary(e,z){if(!z)return false;const dx=e.x-z.x,dy=e.y-z.y,d=Math.hypot(dx,dy);if(d>=z.radius)return false;const m=d||1;e.x=z.x+(d?dx/m:1)*(z.radius+.5);e.y=z.y+(d?dy/m:0)*(z.radius+.5);const ai=ensureAI(e);ai.homeX=e.x;ai.homeY=e.y;e.telegraph=0;return true}
export class Game {
  constructor(save, now = 0) {
    this.save = save;
    if (!["attack", "tool", "act"].includes(save.aimMode))
      save.aimMode = save.toolMode ? "tool" : "attack";
    save.toolMode = save.aimMode === "tool";
    settleProgression(save);
    const s = save.session;
    this.area = s.area;
    this.rx = s.rx || 0;
    this.ry = s.ry || 0;
    this.player = {
      x: s.x,
      y: s.y,
      hp: s.playerRuntime.hp,
      stamina: s.playerRuntime.stamina,
      maxStamina: save.maxStamina,
      stats: save.stats,
      weaponLevel: save.weaponLevel,
      facing: s.playerRuntime.facing || "down",
      walkPhase: s.playerRuntime.walkPhase || 0,
      attackReadyAt: now + s.playerRuntime.attackCooldown,
      attackUntil: now + (s.playerRuntime.attackMotion || 0),
      meleeUntil: now + (s.playerRuntime.meleeMotion || 0),
      meleeStrike: s.playerRuntime.meleeStrike
        ? { ...s.playerRuntime.meleeStrike }
        : null,
      dodgeReadyAt: now + s.playerRuntime.dodgeCooldown,
      invulnerableUntil: now + s.playerRuntime.invulnerability,
      dodgeUntil: now + s.playerRuntime.dodgeMotion,
      dodgeX: s.playerRuntime.dodgeX || 0,
      dodgeY: s.playerRuntime.dodgeY || 0,
    };
    this.message = s.message;
    this.paused = !!s.paused;
    this.pauseStarted = this.paused ? now : null;
    this.jumpUntil = now + s.playerRuntime.jump;
    this.guardRemaining = Math.max(0, Number(s.playerRuntime.guard || 0));
    this.magicBuffRemaining = Math.max(0, Number(save.magicBuff || 0));
    this.spellCooldownRemaining = Math.max(0, Number(save.spellCooldown || 0));
    this.projectiles = [];
    this.effects = [];
    this.reticle = null;
    this.loadArea(this.area, false);
  }
  installSystems() {
    if (this._systemsInstalled) return;
    this._systemsInstalled = true;
    this.player.meleeAim = this.save.session.playerRuntime.meleeAim || null;
    this.traversal = this.save.session.playerRuntime.traversal || null;
    const attack = this.primaryAttack.bind(this);
    this.primaryAttack = (now, explicitDirection = null) => {
      if (now < (this.player.attackReadyAt || 0)) return [];
      const profile = primaryProfile(this.save.equipment.primary),
        width = this.area === "dungeon" ? 24 : 32,
        d = explicitDirection
          ? projectileDirection(
              explicitDirection.x,
              explicitDirection.y,
              this.player.facing,
            )
          : selectMeleeAim(
              this.player,
              this.enemies,
              this.map,
              width,
              profile.range,
            );
      this.player.meleeAim =
        d ||
        projectileDirection(
          this.save.lastAim.x,
          this.save.lastAim.y,
          this.player.facing,
        );
      const pending = this.save.pendingAim,
        last = { ...this.save.lastAim };
      this.save.lastAim = this.player.meleeAim;
      const hits = attack(now, explicitDirection);
      this.save.lastAim = last;
      this.save.pendingAim = pending;
      for (const e of hits)
        if (
          e.kind === "hollowMarshal" &&
          this.areaId() ===
            dungeonId(this.save.seed, this.save.worldGeneration) &&
          e.dead &&
          !this.save.narrative.facts["crossing.marshal"]
        ) {
          this.save.narrative.facts["crossing.marshal"] = true;
          this.save.narrative.journal.push({
            recordId: "marshal-cancel",
            instanceKey: "record:marshal-cancel",
            title: "The Missing Crossing",
            text: "The Hollow Marshal fell guarding the cancellation mechanism.",
            provenance: "original",
          });
        }
      return hits;
    };
    const interact = this.interact.bind(this);
    this.interact = (action, objectId = null) => {
      const o = this.nearestObject();
      if (o?.kind === "vine" && (!action || action === "swing")) {
        const reverse =
            Math.hypot(this.player.x - o.toX, this.player.y - o.toY) < 2,
          startX = reverse ? o.toX : o.x,
          startY = reverse ? o.toY : o.y,
          endX = reverse ? o.x : o.toX,
          endY = reverse ? o.y : o.toY;
        this.traversal = { kind: "swing", startX, startY, endX, endY, t: 0 };
        this.message = "You catch the root-vine and swing across.";
        return { ok: true, message: this.message, transition: "swing" };
      }
      return interact(action, objectId);
    };
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      if (this.paused) return;
      if (this.traversal) {
        const q = this.traversal;
        q.t = Math.min(1, q.t + dt / 0.7);
        const k = q.t * q.t * (3 - 2 * q.t);
        this.player.x = q.startX + (q.endX - q.startX) * k;
        this.player.y = q.startY + (q.endY - q.startY) * k;
        if (q.t >= 1) this.traversal = null;
        return;
      }
      update(dt, input, now);
      updateTraps(this.map.objects, this.player, dt, now < this.jumpUntil);
      if (this.player.hp <= 0 || this.area !== "dungeon") this.traversal = null;
    };
  }
  installWeaponSystems() {
    if (this._weaponSystemsInstalled) return;
    this._weaponSystemsInstalled = true;
    const fire = this.fireSecondary.bind(this);
    this.fireSecondary = (now = 0, direction = null) => {
      if (!direction && !this._attackFiring) {
        this.save.aimMode = this.save.aimMode === "tool" ? null : "tool";
        this.save.toolMode = this.save.aimMode === "tool";
        this.message = this.save.toolMode
          ? "Tool aim active — tap while moving to fire."
          : "Tool aim stowed.";
        return false;
      }
      return fire(now, direction);
    };
    const attack = this.primaryAttack.bind(this);
    this.primaryAttack = (now = 0, direction = null) => {
      if (this.save.activeWeaponSlot === "secondary") {
        this._attackFiring = true;
        const fired = fire(now);
        this._attackFiring = false;
        return fired ? [] : [];
      }
      return attack(now, direction);
    };
    this.toggleAttackMode = () => {
      this.save.aimMode = this.save.aimMode === "attack" ? null : "attack";
      this.save.toolMode = false;
      this.message =
        this.save.aimMode === "attack"
          ? "Attack aim active — tap while moving to strike."
          : "Attack aim stowed.";
      return this.save.aimMode;
    };
  }
  installStorySystems() {
    if (this._storySystemsInstalled) return;
    this._storySystemsInstalled = true;
    const defeat = this.defeatEnemy.bind(this);
    this.defeatEnemy = (e) => {
      if (e.kind === "npc") return;
      if (e.kind === "hollowMarshal") {
        const d = dungeonHistory(this.save, this.areaId());
        d.guardianDefeated = true;
        if (
          this.areaId() !== dungeonId(this.save.seed, this.save.worldGeneration)
        ) {
          d.resolved = true;
          journalOnce(
            this.save,
            "resolved:" + this.areaId(),
            "You cleared the guardian of this buried crossing. Its defeat is permanent.",
            "Crossings",
          );
        }
      }
      if (
        e.kind === "hollowMarshal" &&
        this.areaId() ===
          dungeonId(this.save.seed, this.save.worldGeneration) &&
        !this.save.narrative.facts["crossing.marshal"]
      ) {
        this.save.narrative.facts["crossing.marshal"] = true;
        this.save.narrative.journal.push({
          recordId: "marshal-cancel",
          instanceKey: "record:marshal-cancel",
          title: "The Missing Crossing",
          text: "The Hollow Marshal fell guarding the cancellation mechanism.",
          provenance: "original",
        });
      }
      return defeat(e);
    };
  }
  installTraversalSafety() {
    if (this._traversalSafetyInstalled) return;
    this._traversalSafetyInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      if (this.player.hp <= 0) this.traversal = null;
      return update(dt, input, now);
    };
  }
  installMovementMemory() {
    if (this._movementMemoryInstalled) return;
    this._movementMemoryInstalled = true;
    const q = this.save.session.playerRuntime.lastMoveVector || { x: 0, y: 1 },
      m = Math.hypot(Number(q.x) || 0, Number(q.y) || 0) || 1;
    this.player.lastMoveVector = {
      x: (Number(q.x) || 0) / m,
      y: (Number(q.y) || 0) / m,
    };
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const x = Number(input?.state?.x) || 0,
        y = Number(input?.state?.y) || 0,
        n = Math.hypot(x, y);
      if (n > 0.04) this.player.lastMoveVector = { x: x / n, y: y / n };
      return update(dt, input, now);
    };
  }
  installAperture() {
    if (this._apertureInstalled) return;
    this._apertureInstalled = true;
    ensurePerception(this.save);
    const decorate = () => {
      if (this.area !== "dungeon" || !this.map || !this.enemies) return;
      const annex = String(this.save.session.activeDungeonId).endsWith(
          ":aperture-annex",
        ),
        overlay = perceptionOverlay(
          this.save.seed,
          this.save.session.activeDungeonId,
          this.map.tiles,
          24,
        );
      this.map.objects.push(
        ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
      );
      const tier = apertureTier(this.save.perception.aperture);
      for (const e of this.enemies)
        e.visualTier = Math.max(
          Number(e.visualTier) || 0,
          annex ? Math.max(2, tier) : tier,
        );
      const scaleFresh = () => {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          e.threatRing = q.ring;
          e.maxHp = Math.round(e.maxHp * q.hpMultiplier);
          e.hp = e.maxHp;
          e.damage = Math.max(1, Math.round(e.damage * q.damageMultiplier));
          e.xpMultiplier = q.xpMultiplier;
        }
      };
      const currentId =
        this.area === "dungeon"
          ? this.save.session.activeDungeonId || ""
          : `overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`;
      if (!this.save.session.areas[currentId]) scaleFresh();
    };
    decorate();
    const load = this.loadArea.bind(this);
    this.loadArea = (area, capture = true) => {
      const id =
          area === "dungeon"
            ? this.save.session.activeDungeonId || ""
            : `overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`,
        had = !!this.save.session.areas[id];
      load(area, capture);
      if (area === "dungeon") {
        const annex = String(this.save.session.activeDungeonId).endsWith(
            ":aperture-annex",
          ),
          overlay = perceptionOverlay(
            this.save.seed,
            this.save.session.activeDungeonId,
            this.map.tiles,
            24,
          );
        this.map.objects.push(
          ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
        );
      }
      if (!had) {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          e.threatRing = q.ring;
          e.maxHp = Math.round(e.maxHp * q.hpMultiplier);
          e.hp = e.maxHp;
          e.damage = Math.max(1, Math.round(e.damage * q.damageMultiplier));
          e.xpMultiplier = q.xpMultiplier;
        }
      }
      const tier = apertureTier(this.save.perception.aperture);
      for (const e of this.enemies)
        e.visualTier = Math.max(
          Number(e.visualTier) || 0,
          String(this.save.session.activeDungeonId).endsWith(":aperture-annex")
            ? Math.max(2, tier)
            : tier,
        );
    };
    const transition = this.transitionSection.bind(this);
    this.transitionSection = (dx, dy) => {
      transition(dx, dy);
      if(Math.abs(this.rx)+Math.abs(this.ry)>=4)progressLead(this.save,'distance');
      const key = `section:${this.rx},${this.ry}`;
      if (this.rx || this.ry) {
        const gained = gainAperture(
          this.save,
          1,
          key,
          "Distance opens another fraction of your Aperture.",
        );
        if (gained) {
          const value = this.save.perception.aperture,
            tier = apertureTier(value),
            next = APERTURE_THRESHOLDS[tier],
            unlock = tier === 0 ? "hidden inscriptions" : tier === 1 ? "unseen annexes" : "deep relics";
          this.message = next
            ? `New section understood. Aperture ${value}/${next} — ${unlock} draw nearer.`
            : `New section understood. Aperture ${value} — the Corridor is fully visible for now.`;
        }
      }
    };
    const interact = this.interact.bind(this);
    this.interact = (action, objectId = null) => {
      const target = objectId
        ? this.map.objects.find((o) => o.id === objectId)
        : this.nearestObject();
      if (
        target?.kind === "exit" &&
        String(this.save.session.activeDungeonId).endsWith(":aperture-annex") &&
        this.save.session.veilReturn
      ) {
        this.snapshotArea();
        const q = this.save.session.veilReturn;
        this.save.session.activeDungeonId = q.id;
        this.save.session.veilReturn = null;
        this.loadArea("dungeon", false);
        this.player.x = q.x;
        this.player.y = q.y;
        this.message =
          "You step back through the unseen crossing. The completed dungeon remains changed.";
        this.sync();
        return {
          ok: true,
          message: this.message,
          transition: "apertureReturn",
        };
      }
      const r = interact(action, objectId);
      if (r?.ok && target?.kind === "apertureRelic") {
        const key = "relic-stat:" + this.areaId();
        if (!this.save.perception.awarded[key]) {
          this.save.perception.awarded[key] = true;
          this.save.statPoints++;
          this.message = `${r.message} The relic leaves one permanent stat point.`;
          r.message = this.message;
        }
      }
      if (r?.transition === "apertureDoor") {
        const parent = this.save.session.activeDungeonId;
        this.snapshotArea();
        this.save.session.veilReturn = {
          id: parent,
          x: this.player.x,
          y: this.player.y,
        };
        this.save.session.activeDungeonId = parent + ":aperture-annex";
        dungeonHistory(this.save, this.save.session.activeDungeonId).visits++;
        this.loadArea("dungeon", false);
        this.player.x = 4;
        this.player.y = 5;
        this.save.perception.discoveries.doors++;
        this.message = "The annex resolves around you in impossible clarity.";
      }
      return r;
    };
    this.save.perception.passiveSeconds = 0;
  }
  installApertureRewards() {
    if (this._apertureRewardsInstalled) return;
    this._apertureRewardsInstalled = true;
    const defeat = this.defeatEnemy.bind(this);
    this.defeatEnemy = (e) => {
      const first = !e.rewarded,
        r = defeat(e);
      if (first && e.kind !== "npc") {
        const guardian = e.kind === "hollowMarshal";
        gainAperture(
          this.save,
          guardian ? 4 : 1,
          `${guardian ? "guardian" : "enemy"}:${this.areaId()}:${e.id}`,
          guardian
            ? "A guardian’s last perception joins yours."
            : "The defeated shape leaves a new pattern in your Aperture.",
        );
      }
      return r;
    };
  }
  areaId() {
    this.installSystems();
    this.installWeaponSystems();
    this.installStorySystems();
    this.installTraversalSafety();
    this.installMovementMemory();
    this.installDungeonDeath();
    this.installDungeonHistoryRepair();
    this.installAperture();
    this.installApertureRewards();
    if (
      this._apertureInstalled &&
      this.area === "dungeon" &&
      this.map &&
      !this.map.objects.some((o) => o.kind === "apertureMemory")
    ) {
      const annex = String(this.save.session.activeDungeonId).endsWith(
          ":aperture-annex",
        ),
        overlay = perceptionOverlay(
          this.save.seed,
          this.save.session.activeDungeonId,
          this.map.tiles,
          24,
        );
      this.map.objects.push(
        ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
      );
    }
    const g = this.save.worldGeneration;
    return this.area === "dungeon"
      ? this.save.session.activeDungeonId || `dungeon:${this.save.seed}:g${g}`
      : `overworld:${this.rx}:${this.ry}:g${g}`;
  }
  snapshotArea() {
    if (!this.map) return;
    const objects = {};
    for (const o of this.map.objects)
      objects[o.id] = {
        state: o.state,
        phase: o.phase,
        timer: o.timer,
        hits: { ...o.hits },
      };
    this.save.session.areas[this.areaId()] = {
      enemies: this.enemies.map((e) => ({ ...e, ai: { ...ensureAI(e) } })),
      objects,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      effects: this.effects.map((f) => ({ ...f, hits: { ...f.hits } })),
    };
  }
  loadArea(area, capture = true) {
    if (capture) this.snapshotArea();
    this.area = area;
    this.map =
      area === "dungeon"
        ? generateDungeon(this.save.seed, this.areaId())
        : generateRegion(
            this.save.seed,
            this.rx,
            this.ry,
            this.save.worldGeneration,
          );
    this.enemies = this.map.enemySpawns.map((e) => {
      const c = createCombatant(e.kind, e.x, e.y, e.boss, e.traits || []);
      if (e.apertureEncounter) {
        const multiplier = Math.max(1, Number(e.threatMultiplier) || 1);
        c.apertureEncounter = true;
        c.apertureTier = e.apertureTier;
        c.maxHp = Math.round(c.maxHp * multiplier);
        c.hp = c.maxHp;
        c.damage = Math.max(1, Math.round(c.damage * multiplier));
        c.xpMultiplier = multiplier;
      }
      ensureAI(c);
      return c;
    });
    const intrusions = apertureEncounterSpawns(
      this.save.seed,
      this.areaId(),
      this.save.perception?.aperture || 0,
      this.map.tiles,
      area === "dungeon" ? 24 : 32,
    );
    for (const e of intrusions) {
      const c = createCombatant(e.kind, e.x, e.y, false, e.traits || []),
        multiplier = Math.max(1, Number(e.threatMultiplier) || 1);
      Object.assign(c, {
        apertureEncounter: true,
        apertureTier: e.apertureTier,
        maxHp: Math.round(c.maxHp * multiplier),
        damage: Math.max(1, Math.round(c.damage * multiplier)),
        xpMultiplier: multiplier,
      });
      c.hp = c.maxHp;
      ensureAI(c);
      this.enemies.push(c);
    }
    this.projectiles = [];
    this.effects = [];
    if (
      area === "overworld" &&
      this.rx === 0 &&
      this.ry === 0 &&
      this.save.worldFlags.worldBossAwake &&
      !this.save.worldFlags.worldBossDead
    )
      this.enemies.push(createCombatant("riftColossus", 28, 27, true));
    const s = this.save.session.areas[this.areaId()];
    if (s) {
      const by = new Map((s.enemies || []).map((e) => [e.id, e]));
      this.enemies = this.enemies.map((e) => {
        const restored = by.get(e.id);
        if (!restored) return e;
        const merged = {
          ...e,
          ...restored,
          ai: { ...ensureAI(e), ...restored.ai },
        };
        ensureAI(merged);
        return merged;
      });
      for (const o of this.map.objects)
        if (s.objects?.[o.id]) Object.assign(o, s.objects[o.id]);
      this.projectiles = (s.projectiles || []).map((p) => ({ ...p }));
      this.effects = (s.effects || []).map((f) => ({
        ...f,
        hits: { ...f.hits },
      }));
    }
    this.reconcileConsequences();
    const codex = (this.save.codex ||= { creatures: {}, places: {}, features: {} });
    codex.creatures ||= {};
    codex.places ||= {};
    codex.features ||= {};
    codex.variants ||= {};
    for (const e of this.enemies) {
      codex.creatures[e.kind] = true;
      codex.variants[e.variantId || `${e.kind}:common`] = { kind: e.kind, traits: [...(e.traits || [])] };
    }
    codex.places[area === "dungeon" ? `dungeon:${this.map.recipe || "hollow"}` : `terrain:${this.map.dominant}`] = true;
    if (this.map.settlement) codex.places[`settlement:${this.map.settlement.id}`] = true;
    for (const o of this.map.objects)
      if (["shrine", "checkpoint", "ruinMarker", "dungeon", "relayTerminal", "trap", "vine", "bossCue"].includes(o.kind))
        codex.features[o.kind === "trap" ? `trap:${o.trapType}` : o.kind] = true;
    if (area === "overworld") {
      this.map.objects.push(
        ...wayfindingCues(
          this.save.seed,
          this.rx,
          this.ry,
          this.save.worldGeneration,
          this.save,
          this.map,
        ),
      );
      for (const o of this.map.objects)
        if (o.kind === "dungeon")
          dungeonHistory(
            this.save,
            dungeonId(
              this.save.seed,
              this.save.worldGeneration,
              this.rx,
              this.ry,
              o.id,
            ),
          );
    }
    if (area === "overworld")
      this.save.explored[`${this.rx},${this.ry}`] = true;
  }
  setPaused(v, now = 0) {
    if (v && !this.paused) this.pauseStarted = now;
    if (!v && this.paused && this.pauseStarted !== null) {
      const d = Math.max(0, now - this.pauseStarted);
      for (const k of [
        "attackReadyAt",
        "attackUntil",
        "meleeUntil",
        "dodgeReadyAt",
        "invulnerableUntil",
        "dodgeUntil",
      ])
        if (this.player[k]) this.player[k] += d;
      if (this.jumpUntil) this.jumpUntil += d;
    }
    this.paused = v;
    this.pauseStarted = v ? this.pauseStarted : null;
    this.save.session.paused = v;
  }
  exportSnapshot(now = 0) {
    const clock =
      this.paused && this.pauseStarted !== null ? this.pauseStarted : now;
    this.sync();
    this.snapshotArea();
    Object.assign(this.save.session, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
      message: this.message,
      paused: this.paused,
      savedAt: Date.now(),
      playerRuntime: {
        hp: this.player.hp,
        stamina: this.player.stamina,
        facing: this.player.facing,
        walkPhase: this.player.walkPhase,
        attackCooldown: remaining(this.player.attackReadyAt, clock),
        attackMotion: remaining(this.player.attackUntil, clock),
        meleeMotion: remaining(this.player.meleeUntil, clock),
        meleeAim: this.player.meleeAim ? { ...this.player.meleeAim } : null,
        meleeStrike: this.player.meleeStrike
          ? { ...this.player.meleeStrike }
          : null,
        lastMoveVector: { ...this.player.lastMoveVector },
        dodgeCooldown: remaining(this.player.dodgeReadyAt, clock),
        invulnerability: remaining(this.player.invulnerableUntil, clock),
        dodgeMotion: remaining(this.player.dodgeUntil, clock),
        dodgeX: this.player.dodgeX,
        dodgeY: this.player.dodgeY,
        jump: remaining(this.jumpUntil, clock),
        guard: this.guardRemaining,
        traversal: this.traversal ? { ...this.traversal } : null,
      },
    });
    return this.save;
  }
  travelToCheckpoint(key = null) {
    const c = key ? this.save.checkpoints?.[key] : this.save.activeCheckpoint;
    if (!c) return false;
    if (this.area === "dungeon") {
      this.message =
        "Wayglass travel is sealed inside a dungeon. Reach an exit, die and restart at the entrance, or use a Crossing Sigil.";
      return false;
    }
    this.snapshotArea();
    this.rx = c.rx;
    this.ry = c.ry;
    this.loadArea("overworld", false);
    this.player.x = c.x;
    this.player.y = c.y;
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    this.message = `Returned to ${c.name || "the active checkpoint"}. Nothing carried was lost.`;
    this.sync();
    return true;
  }
  returnToCheckpoint() {
    return this.travelToCheckpoint();
  }
  returnHome() {
    return this.travelToCheckpoint("0,0");
  }
  leaveDungeon(message = "You return to the dungeon entrance.") {
    const q = this.save.session.dungeonReturn || this.save.activeCheckpoint;
    if (!q) return false;
    abandonDungeon(this.save, this.areaId());
    this.snapshotArea();
    this.rx = q.rx;
    this.ry = q.ry;
    this.loadArea("overworld", false);
    this.player.x = q.x;
    this.player.y = q.y;
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    this.message = message;
    this.sync();
    return true;
  }
  recoverFromDeath(now = 0, input = null) {
    const p = this.player,
      before = this.save.consumables.restorativeDraught || 0;
    this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
    if (before < 2) this.save.consumables.restorativeDraught = 2;
    p.hp = this.save.maxHp;
    p.stamina = this.save.maxStamina;
    p.attackReadyAt =
      p.dodgeReadyAt =
      p.dodgeUntil =
      p.attackUntil =
      p.meleeUntil =
        0;
    p.meleeStrike = null;
    this.jumpUntil = 0;
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    input?.reset?.();
    if (this.area === "dungeon") {
      const id = this.areaId(),
        prior = this.save.session.areas[id],
        used = prior?.objects || {};
      delete this.save.session.areas[id];
      this.loadArea("dungeon", false);
      for (const o of this.map.objects)
        if (used[o.id]?.state === "used") o.state = "used";
      p.x = 4;
      p.y = 5;
      p.invulnerableUntil = now + 2000;
      this.message = `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    } else {
      const c = this.save.activeCheckpoint;
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld");
      p.x = c.x;
      p.y = c.y;
      p.invulnerableUntil = now + 2000;
      this.message = `Felled — recovered at ${c.name || "checkpoint"}. No items, marks, equipment, or XP were lost. You are protected briefly.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    }
    this.sync();
    return true;
  }
  sync() {
    Object.assign(this.save.session, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
    });
    Object.assign(this.save.position, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
    });
    this.save.hp = this.player.hp;
    this.save.stamina = this.player.stamina;
    this.save.magicBuff = this.magicBuffRemaining;
    this.save.spellCooldown = this.spellCooldownRemaining;
  }
  transitionSection(dx, dy) {
    this.snapshotArea();
    this.rx += dx;
    this.ry += dy;
    this.loadArea("overworld", false);
    const exits = sectionExits(this.save.seed, this.rx, this.ry);
    if (dx < 0) {
      this.player.x = 30.75;
      this.player.y = exits.east;
    }
    if (dx > 0) {
      this.player.x = 0.25;
      this.player.y = exits.west;
    }
    if (dy < 0) {
      this.player.y = 30.75;
      this.player.x = exits.south;
    }
    if (dy > 0) {
      this.player.y = 0.25;
      this.player.x = exits.north;
    }
    this.sync();
  }
  nearestObject() {
    let f = null,
      d = 1.5;
    for (const o of this.map.objects) {
      const n = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      if (n < d && validActions(o, this.save).length) {
        f = o;
        d = n;
      }
    }
    return f;
  }
  interact(action, objectId = null) {
    this.sync();
    const o = objectId
      ? this.map.objects.find(
          (q) =>
            q.id === objectId &&
            Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.5,
        )
      : this.nearestObject();
    if (!o)
      return {
        ok: false,
        message: (this.message = "Nothing nearby responds."),
      };
    if (!action && ["npc", "dungeon", "relayTerminal"].includes(o.kind)) {
      this.interactionRequested = o.id;
      return {
        ok: true,
        message: (this.message =
          (o.name || "Crossing") + " — choose an action."),
      };
    }
    const chosen = action || validActions(o, this.save)[0],
      before = this.save.hp,
      r = applyInteraction(o, chosen, this.save, this.areaId());
    this.message = r.message;
    if (!r.ok) return r;
    if (o.kind === "npc" && chosen === "trade") this.shopRequested = o.id;
    if (this.save.hp !== before)
      this.player.hp = Math.min(
        this.save.maxHp,
        this.player.hp + (this.save.hp - before),
      );
    if (o.kind === "tree" && chosen === "climb") {
      this.player.x = o.x + 2;
      this.player.y = o.y - 2;
    }
    if (r.transition === "dungeon") {
      this.save.session.dungeonReturn = {
        rx: this.rx,
        ry: this.ry,
        x: this.player.x,
        y: this.player.y,
      };
      this.save.session.activeDungeonId = dungeonId(
        this.save.seed,
        this.save.worldGeneration,
        this.rx,
        this.ry,
        o.id,
      );
      const h = dungeonHistory(this.save, this.save.session.activeDungeonId);
      h.visits++;
      h.visitOpen = true;
      this.loadArea("dungeon");
      this.player.x = 4;
      this.player.y = 5;
    } else if (r.transition === "exit") {
      this.leaveDungeon("You emerge at the dungeon entrance.");
    } else if (r.transition === "checkpoint") {
      this.save.activeCheckpoint = {
        rx: this.rx,
        ry: this.ry,
        x: o.x,
        y: o.y,
        name: o.name,
      };
      this.save.checkpoints[this.rx + "," + this.ry] =
        this.save.activeCheckpoint;
    } else if (r.transition === "chest")
      this.obtainDrop(o.rewardSource || "chest");
    this.reconcileConsequences();
    this.sync();
    return r;
  }

  interactAt(x, y) {
    const o = (this.map.objects || [])
      .filter((q) =>
        Math.hypot(q.x - x, q.y - y) < 0.9 &&
        Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.5 &&
        validActions(q, this.save).length,
      )
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (!o) {
      this.message = "Nothing within reach responds.";
      return { ok: false, message: this.message };
    }
    return this.interact(null, o.id);
  }

  reconcileConsequences() {
    for (const o of this.map.objects || [])
      if (o.kind === "npc") {
        const n = this.save.consequences.npcs[o.id];
        if (n) {
          o.hp = n.hp;
          o.maxHp = 36;
          o.dead = n.status === "dead";
          o.state = o.dead ? "dead" : n.disposition;
        }
      }
    if (
      this.area !== "overworld" ||
      this.rx !== 0 ||
      this.ry !== 0 ||
      this.save.consequences.settlements["ember-refuge"].status !== "fallen"
    )
      return;
    for (const t of this.map.tiles) if (t.kind === "refuge") t.kind = "ash";
    const saved = this.save.session.areas[this.areaId()]?.enemies || [];
    for (const [kind, x, y, id] of [
      ["ashling", 14, 16, "occupation-refuge-west"],
      ["glassMite", 18, 17, "occupation-refuge-east"],
    ])
      if (!this.enemies.some((e) => e.id === id)) {
        const prior = saved.find((e) => e.id === id),
          e = prior
            ? { ...prior, ai: { ...prior.ai } }
            : { ...createCombatant(kind, x, y), id };
        ensureAI(e);
        this.enemies.push(e);
      }
  }
  npcTargets() {
    return (this.map.objects || []).filter(
      (o) =>
        o.kind === "npc" &&
        this.save.consequences.npcs[o.id]?.status !== "dead",
    );
  }
  syncNpcDamage(cause) {
    for (const o of this.npcTargets()) {
      const prior = this.save.consequences.npcs[o.id];
      if (o.hp < prior.hp)
        recordNpcDamage(this.save, o, prior.hp - o.hp, cause, "collateral");
    }
    this.reconcileConsequences();
  }
  installDungeonDeath() {
    if (this._dungeonDeathInstalled) return;
    this._dungeonDeathInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const wasDungeon = this.area === "dungeon",
        id = wasDungeon
          ? this.save.session.activeDungeonId ||
            `dungeon:${this.save.seed}:g${this.save.worldGeneration}`
          : null,
        q =
          wasDungeon && this.save.session.dungeonReturn
            ? { ...this.save.session.dungeonReturn }
            : null,
        deaths = this.save.worldFlags.deaths || 0;
      update(dt, input, now);
      if (
        wasDungeon &&
        (this.save.worldFlags.deaths || 0) > deaths &&
        this.area !== "dungeon"
      ) {
        this.save.session.activeDungeonId = id;
        this.save.session.dungeonReturn = q;
        const claimed = this.save.session.areas[id]?.objects || {};
        delete this.save.session.areas[id];
        this.loadArea("dungeon", false);
        for (const o of this.map.objects)
          if (claimed[o.id]?.state === "used") o.state = "used";
        this.player.x = 4;
        this.player.y = 5;
        this.player.invulnerableUntil = now + 2000;
        this.projectiles = [];
        this.effects = [];
        this.traversal = null;
        this.message = `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.`;
        this.sync();
      }
    };
  }
  installDungeonHistoryRepair() {
    if (this._dungeonHistoryRepairInstalled) return;
    this._dungeonHistoryRepairInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const id =
          this.area === "dungeon" ? this.save.session.activeDungeonId : null,
        h = id ? dungeonHistory(this.save, id) : null,
        abandoned = h?.abandoned || 0,
        deaths = this.save.worldFlags.deaths || 0;
      update(dt, input, now);
      if (id && (this.save.worldFlags.deaths || 0) > deaths) {
        h.abandoned = abandoned;
        h.visitOpen = true;
        this.save.narrative.journal = this.save.narrative.journal.filter(
          (j) => !String(j.recordId).startsWith("abandon:" + id + ":"),
        );
      }
    };
  }
  useCrossingSigil() {
    const c = this.save.consumables;
    if (!(c?.crossingSigil > 0)) {
      this.message = "No Crossing Sigil remains.";
      return false;
    }
    if (this.area !== "dungeon") {
      this.message = "The Crossing Sigil only answers inside a dungeon.";
      return false;
    }
    c.crossingSigil--;
    return this.leaveDungeon(
      "The Crossing Sigil tears a narrow path back to the dungeon entrance.",
    );
  }

  defeatEnemy(e) {
    if (e.rewarded) return;
    e.rewarded = true;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina,
      levels = awardExperience(this.save, e.boss ? 35 : 10);
    if (levels) {
      this.player.hp = Math.min(
        this.save.maxHp,
        this.player.hp + this.save.maxHp - oldHp,
      );
      this.player.stamina = Math.min(
        this.save.maxStamina,
        this.player.stamina + this.save.maxStamina - oldStamina,
      );
      this.player.maxStamina = this.save.maxStamina;
      this.message = `Level ${this.save.level} reached — health and stamina increased. ${this.save.statPoints} stat point${this.save.statPoints === 1 ? "" : "s"} available in Pack.`;
    }
    this.obtainDrop(e.kind);
    if(this.save.narrative.facts['leads.active']){this.save.worldFlags['lead.hunt.count']=(this.save.worldFlags['lead.hunt.count']||0)+1;if(this.save.worldFlags['lead.hunt.count']>=5)progressLead(this.save,'hunt');if(e.kind==='hollowMarshal')progressLead(this.save,'guardian')}
    const key = `drop:v1:${this.areaId()}:${e.id}`;
    if (!this.save.worldFlags[key]) {
      this.save.worldFlags[key] = true;
      const roll = hashSeed(`${this.save.seed}:${key}`) % 100 < 40;
      if (e.boss || roll || (this.save.worldFlags.flaskPity || 0) >= 2) {
        const n = e.boss ? 2 : 1;
        this.save.consumables.restorativeDraught += n;
        this.save.worldFlags.flaskPity = 0;
        this.message = `Recovered ${n} restorative draught${n > 1 ? "s" : ""}.`;
      } else
        this.save.worldFlags.flaskPity =
          (this.save.worldFlags.flaskPity || 0) + 1;
    }
  }
  primaryAttack(now = 0) {
    if (now < (this.player.attackReadyAt || 0)) return [];
    this.player.attackReadyAt = now + 420;
    this.player.attackUntil = now + 240;
    this.player.meleeUntil = now + 240;
    const profile = primaryProfile(this.save.equipment.primary),
      geometry = meleeAttackGeometry(
        this.player,
        profile,
        this.player.meleeAim || this.save.lastAim,
      );
    this.player.meleeStrike = { ...geometry };
    const hits = primaryAttackHits(
      this.player,
      [...this.enemies, ...this.npcTargets()],
      this.map,
      this.area === "dungeon" ? 24 : 32,
      profile,
      { x: geometry.dx, y: geometry.dy },
    );
    for (const e of hits) {
      if (e.kind === "npc") {
        recordNpcDamage(
          this.save,
          e,
          profile.damage +
            this.save.stats.Might * 2 +
            this.save.weaponLevel * 3,
          "melee",
          "collateral",
        );
        continue;
      }
      e.hp -=
        profile.damage + this.save.stats.Might * 2 + this.save.weaponLevel * 3;
      e.hitFlash = 0.18;
      e.recoil = 0.14;
      if (e.hp <= 0) {
        e.dead = true;
        this.defeatEnemy(e);
      }
    }
    this.reconcileConsequences();
    this.attackProfile = profile;
    return hits;
  }
  fireSecondary(now = 0, direction = null) {
    const weapon = rangedWeapon(this.save.equipment.secondary);
    if (!weapon || now < (this.player.attackReadyAt || 0)) return false;
    let d, aimedDistance = null;
    if (this.save.pendingAim) {
      aimedDistance = Math.hypot(this.save.pendingAim.x-(this.player.x+.5),this.save.pendingAim.y-(this.player.y+.45));
      d = projectileDirection(
        this.save.pendingAim.x - (this.player.x + 0.5),
        this.save.pendingAim.y - (this.player.y + 0.45),
        this.player.facing,
      );
      this.save.pendingAim = null;
    } else
      d = projectileDirection(
        direction?.x ?? this.save.lastAim.x,
        direction?.y ?? this.save.lastAim.y,
        this.player.facing,
      );
    this.save.lastAim = d;
    this.player.attackReadyAt = now + 360;
    this.player.attackUntil = now + 180;
    this.player.meleeUntil = 0;
    this.player.meleeStrike = null;
    this.projectiles.push({
      id: `shot-${this.save.dropCounter}-${now}`,
      x: this.player.x + 0.5 + d.x * 0.35,
      y: this.player.y + 0.45 + d.y * 0.35,
      dx: d.x,
      dy: d.y,
      speed: weapon.speed,
      life: weapon.path==="grenade"&&aimedDistance!==null?Math.max(.08,Math.min(weapon.lifetime,aimedDistance/weapon.speed)):weapon.lifetime,
      damage: Math.round(
        (weapon.damage +
          this.save.stats.Focus +
          (this.save.equipment.secondary?.power || 0)) *
          (weapon.damageType === "magic" && this.magicBuffRemaining > 0
            ? 1.4
            : 1),
      ),
      damageType: weapon.damageType,
      path: weapon.path || "straight",
      age: 0,
      turnAfter: weapon.turnAfter || weapon.lifetime / 2,
      returning: false,
      hits: {},
      blastRadius: weapon.radius || 0,
    });
    return true;
  }
  castSpell() {
    const spell = SPELLS[this.save.equippedSpell] || SPELLS["ember-ring"];
    if (this.spellCooldownRemaining > 0) {
      this.message = `${spell.name} recovers in ${Math.ceil(this.spellCooldownRemaining)}s.`;
      return false;
    }
    let x = this.player.x + 0.5,
      y = this.player.y + 0.45;
    if (this.save.pendingAim) {
      const dx = this.save.pendingAim.x - x,
        dy = this.save.pendingAim.y - y,
        m = Math.hypot(dx, dy),
        scale = m > spell.maxRange ? spell.maxRange / m : 1;
      x += dx * scale;
      y += dy * scale;
      this.save.pendingAim = null;
    }
    this.effects.push({
      id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`,
      kind: spell.id,
      x,
      y,
      life: spell.lifetime,
      radius: spell.radius,
      pulse: spell.pulse,
      untilPulse: 0,
      damage: spell.damage + this.save.stats.Focus,
      pulseIndex: 0,
      hits: {},
    });
    this.spellCooldownRemaining = spell.cooldown;
    this.message = `${spell.name} answers.`;
    return true;
  }
  aimAt(x, y) {
    const d = projectileDirection(
      x - (this.player.x + 0.5),
      y - (this.player.y + 0.45),
      this.player.facing,
    );
    this.save.lastAim = d;
    this.save.pendingAim = { x, y };
    this.reticle = { x, y, life: 1.2 };
    this.message = "Aim fixed for the next Tool or Spell.";
    return true;
  }
  obtainDrop(src) {
    const n = this.save.dropCounter++;
    const item = generateItem(`${this.save.seed}:${src}:${n}`, this.save.level);
    if (this.save.inventory.length < 6) this.save.inventory.push(item);
    this.save.materials.cinderIron++;
  }
  upgrade() {
    if (this.save.materials.cinderIron >= 3) {
      this.save.materials.cinderIron -= 3;
      this.save.weaponLevel++;
      this.player.weaponLevel++;
    }
  }
  allocate(s) {
    if (!this.save.statPoints || !Object.hasOwn(this.save.stats, s))
      return false;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina;
    this.save.stats[s]++;
    this.save.statPoints--;
    syncCharacterStats(this.save);
    this.player.hp = Math.min(
      this.save.maxHp,
      this.player.hp + this.save.maxHp - oldHp,
    );
    this.player.stamina = Math.min(
      this.save.maxStamina,
      this.player.stamina + this.save.maxStamina - oldStamina,
    );
    this.player.maxStamina = this.save.maxStamina;
    this.message = `${s} increased to ${this.save.stats[s]}.`;
    this.sync();
    return true;
  }
  useConsumable(type, now = 0) {
    const c =
      this.save.consumables ||
      (this.save.consumables = {
        restorativeDraught: 0,
        ironbarkTonic: 0,
        lumenPhial: 0,
      });
    if (!(c[type] > 0)) {
      this.message = "That supply is exhausted.";
      return false;
    }
    if (type === "restorativeDraught") {
      if (this.player.hp >= this.save.maxHp) {
        this.message = "Health is already full.";
        return false;
      }
      this.player.hp = Math.min(this.save.maxHp, this.player.hp + 30);
      c[type]--;
      this.message = "Restorative draught mends 30 health.";
      this.sync();
      return true;
    }
    if (type === "ironbarkTonic") {
      c[type]--;
      this.guardRemaining = 45;
      this.message = "Ironbark guard hardens you for 45 seconds.";
      return true;
    }
    if (type === "lumenPhial") {
      c[type]--;
      this.magicBuffRemaining = 45;
      this.save.magicBuff = 45;
      this.message = "Lumen surge empowers magic bolts for 45 seconds.";
      return true;
    }
    return false;
  }
  update(dt, input, now) {
    if (this.paused) return;
    const p = this.player;
    this.guardRemaining = Math.max(0, this.guardRemaining - dt);
    this.magicBuffRemaining = Math.max(0, this.magicBuffRemaining - dt);
    this.spellCooldownRemaining = Math.max(0, this.spellCooldownRemaining - dt);
    if (this.reticle) this.reticle.life -= dt;
    let rawX = Number(input.state.x) || 0,
      rawY = Number(input.state.y) || 0,
      m = Math.hypot(rawX, rawY),
      scale = m > 1 ? 1 / m : 1,
      x = rawX * scale,
      y = rawY * scale;
    if (Math.hypot(x, y) > 0.15)
      this.save.lastAim = projectileDirection(x, y, p.facing);
    if (input.consume("tool")) {
      this.save.aimMode = "tool";
      this.save.toolMode = true;
      this.fireSecondary(now, this.save.lastAim);
    }
    if (input.consume("spell")) this.castSpell();
    if (input.consume("dodge")) {
      const r = dodge(p, now, x, y);
      if (!r.ok) this.message = "Not enough stamina to dodge.";
    }
    if (input.consume("jump")) {
      if (now < this.jumpUntil) this.message = "Already airborne.";
      else this.jumpUntil = now + 520;
    }
    if (input.consume("potion")) this.useConsumable("restorativeDraught", now);
    const dodging = now < (p.dodgeUntil || 0);
    if (dodging) {
      x = p.dodgeX;
      y = p.dodgeY;
    }
    const speed = dodging ? 4.8 : 2.4,
      dx = x * speed * dt,
      dy = y * speed * dt,
      nx = p.x + dx,
      ny = p.y + dy;
    if (Math.abs(x) > 0.15 || Math.abs(y) > 0.15) {
      p.facing =
        Math.abs(x) > Math.abs(y)
          ? x < 0
            ? "left"
            : "right"
          : y < 0
            ? "up"
            : "down";
      p.walkPhase = (p.walkPhase + Math.hypot(dx, dy) * 4) % 2;
    }
    if (this.area === "overworld") {
      const exits = this.map.exits,
        near = (value, opening) => Math.abs(value - opening) <= 1.45,
        west = nx < 0 && near(p.y, exits.west),
        east = nx + 0.76 >= SECTION_SIZE - 0.02 && near(p.y, exits.east),
        north = ny < 0 && near(p.x, exits.north),
        south = ny + 0.88 >= SECTION_SIZE - 0.02 && near(p.x, exits.south);
      if (west) this.transitionSection(-1, 0);
      else if (east) this.transitionSection(1, 0);
      else if (north) this.transitionSection(0, -1);
      else if (south) this.transitionSection(0, 1);
      if (west || east || north || south) return;
    }
    if (
      this.area === "overworld" &&
      (nx < -1 || nx > SECTION_SIZE || ny < -1 || ny > SECTION_SIZE)
    ) {
      if (nx < 0) this.transitionSection(-1, 0);
      else if (nx >= SECTION_SIZE) this.transitionSection(1, 0);
      else if (ny < 0) this.transitionSection(0, -1);
      else this.transitionSection(0, 1);
      return;
    }
    const width = this.area === "dungeon" ? 24 : 32;
    moveAxis(p, dx, dy, this.map, width);
    if (input.consume("attack")) {
      this.save.aimMode = "attack";
      this.save.toolMode = false;
      this.primaryAttack(now, this.save.lastAim);
    }
    if (input.consume("interact")) {
      this.save.aimMode = "act";
      this.save.toolMode = false;
      this.interact();
    }
    this.projectiles = updateProjectiles(
      this.projectiles,
      [...this.enemies, ...this.npcTargets()],
      this.map,
      width,
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
      (shot)=>this.effects.push({id:"blast-"+shot.id,kind:"rift-blast",x:shot.x,y:shot.y,life:.32,radius:shot.blastRadius||2,untilPulse:0,pulse:99,damage:shot.damage,hits:{}}),
    );
    this.syncNpcDamage("projectile");
    this.effects = updateEffects(
      this.effects,
      [...this.enemies, ...this.npcTargets()],
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
    );
    this.syncNpcDamage("spell");
    p.stamina = Math.min(p.maxStamina, p.stamina + 9 * dt);
    const sanctuary=settlementSanctuary(this.map,this.rx,this.ry,this.save);
    for (const e of this.enemies)
      if (
        !e.dead &&
        updateEnemyAI(e, p, this.map, width, dt, now, /^(ashling|glassMite|sparkWarden|ashenHound|veilMoth|rootBrute|coilStalker|cinderWisp|hollowMarshal|riftColossus)-/.test(e.id)?sanctuary:null) &&
        now > (p.invulnerableUntil || 0) &&
        (!(now < this.jumpUntil) || e.kind === "sparkWarden")
      ) {
        p.hp -= Math.max(
          1,
          Math.ceil(
            (this.guardRemaining > 0 ? e.damage * 0.65 : e.damage) *
              (1 - characterStats(this.save).damageReduction),
          ),
        );
        p.invulnerableUntil = now + 700;
      }
    if (p.hp <= 0) {
      if (this.area === "dungeon") abandonDungeon(this.save, this.areaId());
      const c = this.save.activeCheckpoint;
      this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
      const before = this.save.consumables.restorativeDraught || 0;
      if (before < 2) this.save.consumables.restorativeDraught = 2;
      p.hp = this.save.maxHp;
      p.stamina = this.save.maxStamina;
      p.attackReadyAt =
        p.dodgeReadyAt =
        p.dodgeUntil =
        p.attackUntil =
        p.meleeUntil =
          0;
      p.meleeStrike = null;
      this.jumpUntil = 0;
      this.projectiles = [];
      this.effects = [];
      input.reset?.();
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld");
      p.x = c.x;
      p.y = c.y;
      p.invulnerableUntil = now + 2000;
      this.message = `Felled — recovered at ${c.name || "checkpoint"}. No items, marks, equipment, or XP were lost. You are protected briefly.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    }
    Object.assign(this.save.position, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: p.x,
      y: p.y,
    });
    this.save.hp = p.hp;
    this.save.stamina = p.stamina;
    this.save.magicBuff = this.magicBuffRemaining;
    this.save.spellCooldown = this.spellCooldownRemaining;
  }
}
