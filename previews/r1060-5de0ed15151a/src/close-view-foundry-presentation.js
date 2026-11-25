// Data-only Foundry presentation contract; safe for projectile producers and renderer imports.
export const FOUNDRY_MODEL_KEYS = Object.freeze({
  quadruped: 'foundry-quadruped', floating: 'foundry-floating', segmented: 'foundry-segmented',
  tentacled: 'foundry-tentacled', geometric: 'foundry-geometric', biomechanical: 'foundry-biomechanical',
});

// primary, shadow, accent. actor.palette accepts only the production Foundry indices 0..4.
export const FOUNDRY_PALETTES = Object.freeze([
  Object.freeze([0x607d78, 0x263b3b, 0xb4d5c5]),
  Object.freeze([0x77617f, 0x30283b, 0xd0a7d7]),
  Object.freeze([0x8a6248, 0x3d3029, 0xf0b867]),
  Object.freeze([0x526f8a, 0x253440, 0x8ed9e7]),
  Object.freeze([0x73765a, 0x303328, 0xd2cc78]),
]);

// Local-space anchors are presentation evidence for later integration, not gameplay range or timing.
export const FOUNDRY_MODEL_METADATA = Object.freeze({
  quadruped: Object.freeze({ key: FOUNDRY_MODEL_KEYS.quadruped, headZ: .78, actionZ: .60, phase: 'four-beat-gait' }),
  floating: Object.freeze({ key: FOUNDRY_MODEL_KEYS.floating, headZ: .94, actionZ: .72, phase: 'hover-orbit' }),
  segmented: Object.freeze({ key: FOUNDRY_MODEL_KEYS.segmented, headZ: .55, actionZ: .48, phase: 'segment-wave' }),
  tentacled: Object.freeze({ key: FOUNDRY_MODEL_KEYS.tentacled, headZ: 1.02, actionZ: .82, phase: 'radial-tendrils' }),
  geometric: Object.freeze({ key: FOUNDRY_MODEL_KEYS.geometric, headZ: 1.06, actionZ: .82, phase: 'counter-orbit' }),
  biomechanical: Object.freeze({ key: FOUNDRY_MODEL_KEYS.biomechanical, headZ: 1.22, actionZ: .92, phase: 'paired-stride' }),
});

export function foundryPaletteIndex(value) { return Number.isSafeInteger(value) && value >= 0 && value < FOUNDRY_PALETTES.length ? value : 0; }
export function foundryPaletteColor(rgb, palette) {
  const index = foundryPaletteIndex(palette), source = FOUNDRY_PALETTES[0], slot = source.indexOf(rgb);
  return slot < 0 ? rgb : FOUNDRY_PALETTES[index][slot];
}

export const FOUNDRY_BASE_BODIES = Object.freeze({ latticeHunter: 'biomechanical', archiveBehemoth: 'biomechanical', riftGrazer: 'quadruped' });
export const FOUNDRY_ATTACKS = Object.freeze(['none','meleeSwipe','straightBolt','threeShotCone','arcBurst','sweepingBeam']);
export const FOUNDRY_MOVEMENTS = Object.freeze(['stalking','hopping','hovering','orbiting','retreating']);
export function foundryModelKey(body, tentacles = 0) {
  const key = FOUNDRY_MODEL_KEYS[body];
  return key && ['tentacled','biomechanical'].includes(body) && [3,6].includes(tentacles) ? `${key}-${tentacles}` : key;
}
