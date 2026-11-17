// Persistent, one-time expedition payoff. Enemy IDs remain the generator's stable IDs.
export function requiredBossId(e) { return e.id || `${e.kind}-${e.x}-${e.y}`; }
export function registerDungeonBosses(history, maps) {
  const clear = history.combatClear ||= { version: 1, required: [], defeated: [], completed: false, rewardClaimed: false };
  for (const map of maps) for (const e of map.enemySpawns || [])
    if (e.boss && !e.worldBeast && !clear.required.includes(requiredBossId(e))) clear.required.push(requiredBossId(e)); // release 249: a world beast haunting a dungeon is never one of its guardians
  return clear;
}
export function recordDungeonBossDefeat(history, enemy) {
  const clear = history.combatClear;
  if (!clear || !enemy.boss || enemy.worldBeast) return false;
  const id = requiredBossId(enemy);
  if (!clear.defeated.includes(id)) clear.defeated.push(id);
  clear.completed = clear.required.length > 0 && clear.required.every(id => clear.defeated.includes(id));
  return clear.completed;
}
export const CLEAR_MARKS = { plain: 5, deep: 9 };
export function claimDungeonPayoff(save, history, deep = false) {
  const clear = history.combatClear;
  if (!clear?.completed || clear.rewardClaimed) return false;
  clear.rewardClaimed = true;
  if (deep && !history.deep?.rewardClaimed) {
    (history.deep ||= {}).rewardClaimed = true;
    for (const material of ['weaponSphere','armorSphere']) save.materials[material] = (save.materials[material] || 0) + 1;
  } else if (!deep) {
    // Release 601 (Tim, 2026-10-31: "the [weapon] sphere isn't dropping"): every crossing since generator 2 paid an armor sphere,
    // so weapon spheres all but stopped. Clears now alternate, weapon first (save.worldFlags.sphereClears counts them; additive).
    const flags = (save.worldFlags ||= {}), n = Number(flags.sphereClears) || 0, material = history.generatorVersion === 2 || n % 2 === 0 ? 'weaponSphere' : 'armorSphere';
    if (history.generatorVersion !== 2) flags.sphereClears = n + 1;
    save.materials[material] = (save.materials[material] || 0) + 1;
  }
  save.currency += deep ? CLEAR_MARKS.deep : CLEAR_MARKS.plain; // release 607: was 18 / 10
  save.consumables.restorativeDraught = (save.consumables.restorativeDraught || 0) + 1;
  return true;
}
export function installCompletionExit(map, history, site = null) {
  if (!history.combatClear?.completed) return null;
  let exit = map.objects.find(o => o.id === 'expedition-fast-exit');
  if (!exit) {
    const p = site || map.enemySpawns.find(e => e.dungeonRole === 'finalBoss' || e.boss) || map.entry || map.objects.find(o => o.kind === 'exit');
    if (!p) return null;
    exit = { id: 'expedition-fast-exit', kind: 'exit', name: 'Cleared Expedition Return', x: p.x, y: p.y, state: 'open', actions: ['exit'], completionExit: true };
    map.objects.push(exit);
  }
  return exit;
}
