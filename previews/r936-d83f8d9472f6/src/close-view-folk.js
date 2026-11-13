// Close View townsfolk (Tim, 2026-11-13: "every interactable character should have a real 3D body in Close View, so the 3D world
// feels alive"). The Refuge's people, hamlet and town folk, the smiths, cooks, keepers and traders, the travelling bands and their
// peddler, Ilse, the Tide Bearer and the Wanderer stood in Close View as the standard view's sprite on a flat card. Now each stands
// as a skinned body on the shared beast rig (close-view-beast-rig.ts), drawn by the beast slot's GPU program. (The Elder Wanderers
// and the reciters already stand as native 3D models, renderer.ts nativeTraveler, and keep them; a reciter in a look without one,
// or riding, takes a body here.)
//
// - Two bodies from the RPG Character Pack (CC0, close-view-folk-body.ts, made by docs/asset-sources/townsfolk/convert-folk.mjs):
//   the Rogue's fitted `tunic` and the Cleric's long `robe`, at an adult's proportions. Every one wears a head of its own built
//   here (a face, hair, a beard, a hat, a hood), and may hold something (a staff, a lantern, a hammer, a basket, a book...), carry
//   something on its back (the peddler's pack, a lute, a bedroll) or stand by its work (the smith's forge and anvil, Ilse's lamp).
// - A look (FOLK_LOOKS) is data: its body, build, height, palette, head, hands and back. Named people have their own; townsfolk,
//   wardens, traders and travellers draw theirs from a pool (FOLK_POOLS) picked by a hash of the character's id, so the same
//   person always looks the same. A mesh is built once per look and tier and shared by everyone wearing it.
// - Its pose is a pure function of the character's own state and the game's clocks: idle breathing and small weight shifts, a
//   glance about, the head and then the body turning toward the Wayfarer when near, a walk on planted feet for anyone who moves
//   (travellers, reciters), a seat for a rider, a talk gesture when spoken to, the smith's hammer on the anvil. Reduced motion
//   keeps them still but for walking and turning.
// - Bounded: FOLK_SLOT caps how many are skinned at once per tier (the nearest first; the rest keep their card), and every mesh
//   stays inside the tier's triangle budget. Nothing is allocated per frame. The standard view and the game are untouched.
// Shale, the quarry keeper, is a small stone turtle in a straw hat: he has his own little body here (TURTLE).
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, mix, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r936-d83f8d9472f6";
import { FOLK_BODIES, FOLK_BODY_CLASSES } from "./close-view-folk-body.js?v=r936-d83f8d9472f6";

// ------------------------------------------------------------------------------------------------ the slot
export const FOLK_SLOT = Object.freeze({
  // how many townsfolk are skinned at once (the nearest first; the rest keep their standard-view card)
  maxFolk: Object.freeze({ full: 8, balanced: 6, low: 4 }),
  // the most triangles one may take (its body, head, hands, back and work)
  triangles: Object.freeze({ full: 2000, balanced: 1500, low: 1100 }),
  maxBones: 24,
});
// Motion (presentation only): stride and gait, turning, how near the Wayfarer must be to be watched, breathing and sway, the talk
// gesture's length (ms after the Wayfarer speaks to them), the smith's hammer cycle.
export const FOLK_MOTION = Object.freeze({
  stride: .42, stance: .6, footLift: .07, settle: 6, stepAt: .07, stepTime: .32, turnRate: 6, watchTurnRate: 2.4,
  watchRange: 3.6, lookMax: .9, breathe: .24, bob: .014, armSwing: .14, sway: .012, glanceSec: 7.5,
  talkMs: 1900, hammerSec: 1.3, seat: .56, grip: .045, giant: 1.8, // giant: the Tall Country's folk (far-realms.ts FAR_FOLK.scale)
});

// ------------------------------------------------------------------------------------------------ palettes and looks
// A tone: one colour, its shadow and light made from it (the source texture's shade picks between them).
const shade = (hex, k) => { const c = (sh) => Math.max(0, Math.min(255, Math.round(((hex >> sh) & 255) * k))); return (c(16) << 16) | (c(8) << 8) | c(0); };
const SKIN = Object.freeze({ fair: 0xd9b08c, warm: 0xc08a62, olive: 0xa97c55, deep: 0x7a5236, umber: 0x5e3d28, sallow: 0xb59a74, pale: 0xe2c7ab });
const HAIR = Object.freeze({ black: 0x1d1a18, brown: 0x4a3324, auburn: 0x7a3a22, sand: 0xb08f5c, grey: 0x8f8a84, white: 0xd9d6cf, red: 0x9a4426 });
// A look's fields: body (tunic | robe), build (width, 1 average), height (x the townsfolk height), hunch (0..1), colours
// { cloth, dark, trim, leather, boot, hand (gloves; else the skin), hat, skin, hair }, hair (short | long | bun | bald | none),
// beard (none | full | goatee | stubble), hat (none | cap | wide | scarf | helm | hood | peaked | chef | feather), mantle (a shawl),
// skirt (a robe's, from the waist; robes have one), rags (a torn, patched hem and shawl), pouch and belt (the source's), held (none | staff | stick | spear | lantern | basket | hammer | book | ladle | taper |
// lamp | lens | map | pitchfork), back (none | pack | lute | bedroll | satchel), work (none | forge | lampPost | lampDark), idle
// (stand | work: at the anvil | scheme: hands rubbed together before the chest), nose (1 ordinary; more, longer), eyes ('' ordinary; 'narrow').
const L = (id, o) => Object.freeze({ id, body: 'tunic', build: 1, height: 1, hunch: 0, hair: 'short', beard: 'none', hat: 'none', mantle: false, pouch: false, belt: true,
  held: 'none', back: 'none', work: 'none', idle: 'stand', nose: 1, eyes: '', skirt: o.body === 'robe', rags: false, ...o, colors: Object.freeze({ hand: null, hat: null, ...o.colors }) });
export const FOLK_LOOKS = Object.freeze({
  // ---- Ember Refuge
  vela: L('vela', { body: 'tunic', build: 1.04, hair: 'bun', pouch: true, held: 'book', colors: { cloth: 0x4f5d6b, dark: 0x2a2f36, trim: 0xb88a3c, leather: 0x6b4a2c, boot: 0x2e2620, skin: SKIN.warm, hair: HAIR.auburn } }),
  oren: L('oren', { body: 'tunic', build: 1.16, height: 1.05, beard: 'full', hat: 'helm', held: 'spear', colors: { cloth: 0x5b6450, dark: 0x30362c, trim: 0x8a2f2a, leather: 0x5a4430, boot: 0x2a241f, hand: 0x4a3a2c, hat: 0x7d8288, skin: SKIN.olive, hair: HAIR.grey } }),
  sela: L('sela', { body: 'robe', build: .94, height: 1.02, hair: 'long', mantle: true, held: 'lantern', colors: { cloth: 0x2f6a6a, dark: 0x1f3436, trim: 0xc9a85a, leather: 0x6e5236, boot: 0x2a2420, skin: SKIN.fair, hair: HAIR.black } }),
  hollis: L('hollis', { body: 'tunic', build: 1.12, hair: 'short', beard: 'stubble', hat: 'wide', held: 'pitchfork', colors: { cloth: 0x8a7a4e, dark: 0x4a3f2c, trim: 0x6b5a3a, leather: 0x7a5634, boot: 0x3a2c20, hat: 0xc9a85a, skin: SKIN.warm, hair: HAIR.sand } }),
  maud: L('maud', { body: 'robe', build: .96, height: .95, hunch: .25, hair: 'long', hat: 'scarf', held: 'stick', colors: { cloth: 0x6a5a6e, dark: 0x3a3040, trim: 0xa89a7a, leather: 0x5a4632, boot: 0x2a2420, hat: 0x3e4a5c, skin: SKIN.pale, hair: HAIR.white } }),
  // ---- Glasshaven and Coilmarket (the waystations)
  iona: L('iona', { body: 'robe', build: .98, hair: 'bun', hat: 'cap', mantle: true, held: 'book', colors: { cloth: 0x4f7f9a, dark: 0x263c4c, trim: 0xd9e4ea, leather: 0x5c4a36, boot: 0x262626, hat: 0x2a4a5c, skin: SKIN.fair, hair: HAIR.brown } }),
  tarn: L('tarn', { body: 'tunic', build: 1.1, hair: 'bald', beard: 'full', held: 'hammer', pouch: true, colors: { cloth: 0x6e8a8c, dark: 0x2c3a3c, trim: 0xa8d8dc, leather: 0x6a4a30, boot: 0x2a2420, skin: SKIN.deep, hair: HAIR.black } }),
  mora: L('mora', { body: 'tunic', build: 1.06, hair: 'long', hat: 'scarf', held: 'basket', colors: { cloth: 0xa0642e, dark: 0x4a2e1c, trim: 0xd99a4a, leather: 0x6a4428, boot: 0x2e241c, hat: 0xb0562a, skin: SKIN.olive, hair: HAIR.black } }),
  esh: L('esh', { body: 'robe', build: .92, height: 1.04, hair: 'short', hat: 'feather', held: 'map', colors: { cloth: 0x4a5a7a, dark: 0x22283a, trim: 0xd8c38a, leather: 0x5a4632, boot: 0x24222a, hat: 0x2a3048, skin: SKIN.umber, hair: HAIR.black } }),
  // ---- town people with work
  smith: L('smith', { body: 'tunic', build: 1.2, height: 1.02, hair: 'bald', beard: 'full', held: 'hammer', work: 'forge', idle: 'work', colors: { cloth: 0x6a4a34, dark: 0x2a201a, trim: 0x8a6a4a, leather: 0x3e2c20, boot: 0x241c16, hand: 0x3a2a1e, skin: SKIN.warm, hair: HAIR.brown } }),
  cook: L('cook', { body: 'tunic', build: 1.18, hair: 'short', hat: 'chef', held: 'ladle', colors: { cloth: 0xe0dccf, dark: 0x5a4a3a, trim: 0xb04a35, leather: 0x6a4a30, boot: 0x2e241c, hat: 0xf2efe6, skin: SKIN.fair, hair: HAIR.brown } }),
  keeper: L('keeper', { body: 'robe', build: 1, height: 1.02, hair: 'short', beard: 'goatee', mantle: true, held: 'lens', colors: { cloth: 0x5a4a7a, dark: 0x2a2440, trim: 0xc9a6ff, leather: 0x4a3a52, boot: 0x24202a, skin: SKIN.olive, hair: HAIR.grey } }),
  shipwright: L('shipwright', { body: 'tunic', build: 1.12, hair: 'short', beard: 'full', hat: 'cap', held: 'hammer', colors: { cloth: 0x4f7f9a, dark: 0x3a2c22, trim: 0xd8c39a, leather: 0x6a4a30, boot: 0x2a2018, hat: 0x2a3a4c, skin: SKIN.warm, hair: HAIR.red } }),
  tideBearer: L('tideBearer', { body: 'robe', build: .96, height: 1.04, hat: 'hood', hair: 'long', held: 'lamp', colors: { cloth: 0x2f5a64, dark: 0x16282e, trim: 0x9fd8d2, leather: 0x3a4a4a, boot: 0x1e2426, hat: 0x2a4a54, skin: SKIN.pale, hair: HAIR.white } }),
  // ---- the peddler (Tim, 2026-11-13: "a hunched, classic schemer in red ... rags and robes ... a traveling pack on his back, about the
  // size of a 35-40 L hiking backpack: noticeable but not huge"). His standard-view sprite is unchanged.
  peddler: L('peddler', { body: 'robe', build: .9, height: .97, hunch: .62, hat: 'peaked', hair: 'none', beard: 'goatee', mantle: true, rags: true, held: 'none', idle: 'scheme', back: 'pack', nose: 1.6, eyes: 'narrow',
    colors: { cloth: 0x8e1f1c, dark: 0x4a0f0e, trim: 0xb8402c, leather: 0x5a3a24, boot: 0x2a1a14, hand: null, hat: 0x7a1816, skin: SKIN.sallow, hair: HAIR.grey, mantle: 0x6a2420, pack: 0x6e5034, packDark: 0x3e2a1a } }),
  // ---- the Wanderer (Old Quillon, the wandering cartographer)
  quillon: L('quillon', { body: 'robe', build: 1, height: 1, hunch: .15, hair: 'long', beard: 'full', hat: 'wide', held: 'map', back: 'satchel', colors: { cloth: 0x7d8f6a, dark: 0x3b4a3a, trim: 0xf0d58a, leather: 0x6a5034, boot: 0x2e281e, hat: 0x5a4a32, skin: SKIN.warm, hair: HAIR.white } }),
  // ---- Ilse, the Lamplighter, at each age (her lamp by meeting: a taper, the last lamp, a post's lamp lit or dark)
  ilseChild: L('ilseChild', { body: 'tunic', build: .86, height: .74, hair: 'long', held: 'taper', work: 'lampPost', colors: { cloth: 0x9a6a8a, dark: 0x4a3446, trim: 0xe8d0a0, leather: 0x6a4a34, boot: 0x2a2420, skin: SKIN.fair, hair: HAIR.sand } }),
  ilseYoung: L('ilseYoung', { body: 'robe', build: .92, height: .96, hair: 'long', held: 'taper', work: 'lampPost', colors: { cloth: 0x8a5a7a, dark: 0x3e2a3a, trim: 0xe8d0a0, leather: 0x6a4a34, boot: 0x2a2420, skin: SKIN.fair, hair: HAIR.sand } }),
  ilseLamp: L('ilseLamp', { body: 'robe', build: .94, height: 1, hair: 'bun', held: 'lamp', colors: { cloth: 0x7a4e6e, dark: 0x3a2636, trim: 0xe8d0a0, leather: 0x6a4a34, boot: 0x2a2420, skin: SKIN.fair, hair: HAIR.sand } }),
  ilseDark: L('ilseDark', { body: 'robe', build: .94, height: 1, hair: 'bun', work: 'lampDark', colors: { cloth: 0x7a4e6e, dark: 0x3a2636, trim: 0xe8d0a0, leather: 0x6a4a34, boot: 0x2a2420, skin: SKIN.fair, hair: HAIR.sand } }),
  ilseOld: L('ilseOld', { body: 'robe', build: .98, height: .94, hunch: .4, hair: 'bun', hat: 'scarf', held: 'stick', colors: { cloth: 0x6a5a6a, dark: 0x302830, trim: 0xd8c8a8, leather: 0x5a4632, boot: 0x2a2420, hat: 0x8a7a8a, skin: SKIN.pale, hair: HAIR.white } }),
});
// The pools (data): townsfolk, wardens, traders and each traveller's look. A character takes pool[hash(id) % length].
const P = (id, o) => L(id, o);
export const FOLK_POOLS = Object.freeze({
  villager: Object.freeze([
    P('folkFarmer', { build: 1.1, hat: 'wide', beard: 'stubble', held: 'pitchfork', colors: { cloth: 0x7a6a3e, dark: 0x3e3424, trim: 0x5a4a30, leather: 0x6a4a2c, boot: 0x302418, hat: 0xc2a25a, skin: SKIN.warm, hair: HAIR.brown } }),
    P('folkBasket', { body: 'robe', build: 1.04, hair: 'long', hat: 'scarf', held: 'basket', colors: { cloth: 0x6a7a4a, dark: 0x343c26, trim: 0xd8c89a, leather: 0x6a4a2c, boot: 0x2a2420, hat: 0xa8442e, skin: SKIN.olive, hair: HAIR.black } }),
    P('folkElder', { body: 'robe', build: .96, height: .95, hunch: .3, hair: 'bald', beard: 'full', held: 'stick', colors: { cloth: 0x5a5466, dark: 0x2c2834, trim: 0xa89a7a, leather: 0x5a4632, boot: 0x26222a, skin: SKIN.pale, hair: HAIR.white } }),
    P('folkBaker', { build: 1.18, hat: 'cap', hair: 'short', held: 'basket', colors: { cloth: 0xc8b48a, dark: 0x5a4a34, trim: 0x8a5a3a, leather: 0x6a4a2c, boot: 0x2e241c, hat: 0xd8d0bc, skin: SKIN.fair, hair: HAIR.sand } }),
    P('folkHerbalist', { body: 'robe', build: .9, height: 1.02, hair: 'long', mantle: true, pouch: true, held: 'book', colors: { cloth: 0x4a6a4e, dark: 0x22342a, trim: 0xb8c88a, leather: 0x5a4632, boot: 0x24261e, skin: SKIN.deep, hair: HAIR.black } }),
    P('folkYouth', { build: .92, height: .9, hair: 'short', pouch: true, colors: { cloth: 0x9a4a3a, dark: 0x3a2a24, trim: 0xd8a85a, leather: 0x6a4a2c, boot: 0x2a2018, skin: SKIN.warm, hair: HAIR.auburn } }),
    P('folkWeaver', { build: 1, hair: 'bun', held: 'basket', back: 'bedroll', colors: { cloth: 0x7a5a8a, dark: 0x3a2c44, trim: 0xe0c08a, leather: 0x5a4030, boot: 0x2a2026, skin: SKIN.umber, hair: HAIR.black } }),
    P('folkMiller', { build: 1.14, height: 1.04, hat: 'cap', beard: 'full', colors: { cloth: 0x8a8678, dark: 0x4a463c, trim: 0xd8d4c4, leather: 0x6a5034, boot: 0x302a22, hat: 0x6a6658, skin: SKIN.fair, hair: HAIR.grey } }),
    P('folkWoodcut', { build: 1.16, hair: 'long', beard: 'stubble', held: 'hammer', colors: { cloth: 0x5a6a3a, dark: 0x2a3220, trim: 0x8a5a2a, leather: 0x5a3a20, boot: 0x2a1e14, skin: SKIN.olive, hair: HAIR.red } }),
    P('folkScribe', { body: 'robe', build: .94, height: .98, hair: 'short', hat: 'cap', held: 'book', colors: { cloth: 0x6a5a3a, dark: 0x32281a, trim: 0xd8c88a, leather: 0x5a4030, boot: 0x2a221a, hat: 0x3a3022, skin: SKIN.warm, hair: HAIR.brown } }),
  ]),
  warden: Object.freeze([
    P('wardenSpear', { build: 1.14, height: 1.04, hat: 'helm', beard: 'stubble', held: 'spear', colors: { cloth: 0x5a6a7a, dark: 0x2a323c, trim: 0xb08a3a, leather: 0x5a4430, boot: 0x241e18, hand: 0x4a3a2c, hat: 0x8a9096, skin: SKIN.warm, hair: HAIR.brown } }),
    P('wardenHood', { build: 1.08, hat: 'hood', held: 'spear', colors: { cloth: 0x6a5a3e, dark: 0x30281c, trim: 0x8a3a2a, leather: 0x5a4430, boot: 0x241e18, hand: 0x4a3a2c, hat: 0x4a4030, skin: SKIN.deep, hair: HAIR.black } }),
    P('wardenStaff', { build: 1.1, height: 1.02, hat: 'helm', beard: 'full', held: 'staff', colors: { cloth: 0x4a5a4a, dark: 0x262e26, trim: 0xc9a85a, leather: 0x5a4430, boot: 0x241e18, hand: 0x4a3a2c, hat: 0x7a7e82, skin: SKIN.olive, hair: HAIR.grey } }),
  ]),
  trader: Object.freeze([
    P('traderLantern', { body: 'robe', build: 1.06, hat: 'hood', mantle: true, held: 'lantern', back: 'satchel', colors: { cloth: 0x5a4a2e, dark: 0x2a2216, trim: 0xe0c070, leather: 0x6a4a2c, boot: 0x2a2018, hat: 0x3e3220, skin: SKIN.olive, hair: HAIR.black } }),
    P('traderMoss', { body: 'robe', build: 1.12, hair: 'short', beard: 'full', mantle: true, held: 'book', pouch: true, colors: { cloth: 0x4a6a46, dark: 0x22341e, trim: 0xc8b46a, leather: 0x5a4628, boot: 0x26241a, skin: SKIN.warm, hair: HAIR.brown } }),
    P('traderQuiet', { build: 1, hair: 'bun', hat: 'wide', pouch: true, back: 'satchel', colors: { cloth: 0x6a6a72, dark: 0x30303a, trim: 0xb8a6d8, leather: 0x5a4a3a, boot: 0x24222a, hat: 0x3a3a44, skin: SKIN.fair, hair: HAIR.auburn } }),
  ]),
  pilgrim: Object.freeze([
    P('pilgrimA', { body: 'robe', hat: 'wide', hair: 'short', beard: 'full', held: 'staff', back: 'bedroll', colors: { cloth: 0xb9ad92, dark: 0x6b5f4c, trim: 0xe7dcc0, leather: 0x6a5034, boot: 0x3a2e22, hat: 0x8a7a5a, skin: SKIN.warm, hair: HAIR.grey } }),
    P('pilgrimB', { body: 'robe', build: .94, hat: 'hood', held: 'staff', colors: { cloth: 0xa89a7a, dark: 0x5a4e3c, trim: 0xe7dcc0, leather: 0x6a5034, boot: 0x3a2e22, hat: 0x8a7c60, skin: SKIN.deep, hair: HAIR.black } }),
  ]),
  mercenary: Object.freeze([
    P('mercA', { build: 1.18, height: 1.05, hat: 'helm', beard: 'stubble', held: 'spear', colors: { cloth: 0x6f6a62, dark: 0x3a3f46, trim: 0xb8a27a, leather: 0x4a3a2a, boot: 0x221e1a, hand: 0x3a2e24, hat: 0x7a7e84, skin: SKIN.olive, hair: HAIR.black } }),
    P('mercB', { build: 1.12, hair: 'long', beard: 'full', held: 'spear', back: 'bedroll', colors: { cloth: 0x5a5e66, dark: 0x2e3238, trim: 0x9a3a2a, leather: 0x4a3a2a, boot: 0x221e1a, hand: 0x3a2e24, skin: SKIN.fair, hair: HAIR.red } }),
  ]),
  minstrel: Object.freeze([
    P('minstrelA', { build: .94, hair: 'long', hat: 'feather', back: 'lute', colors: { cloth: 0xa35f6c, dark: 0x4a2f4f, trim: 0xe6c069, leather: 0x6a4a34, boot: 0x2a2026, hat: 0x4a2f4f, skin: SKIN.fair, hair: HAIR.auburn } }),
    P('minstrelB', { build: 1, hair: 'short', hat: 'cap', back: 'lute', pouch: true, colors: { cloth: 0x7a4a8a, dark: 0x3a2444, trim: 0xe6c069, leather: 0x6a4a34, boot: 0x2a2026, hat: 0xa35f6c, skin: SKIN.deep, hair: HAIR.black } }),
  ]),
  scholar: Object.freeze([
    P('scholarA', { body: 'robe', build: .94, height: 1.02, hair: 'short', beard: 'goatee', mantle: true, held: 'book', colors: { cloth: 0x5f6f92, dark: 0x2f3550, trim: 0xc9cfe6, leather: 0x4a4050, boot: 0x24222a, skin: SKIN.fair, hair: HAIR.grey } }),
    P('scholarB', { body: 'robe', build: .9, hair: 'bun', hat: 'cap', held: 'book', back: 'satchel', colors: { cloth: 0x4a5a82, dark: 0x262c46, trim: 0xd8dcf0, leather: 0x4a4050, boot: 0x24222a, hat: 0x2f3550, skin: SKIN.umber, hair: HAIR.black } }),
  ]),
  traveler: Object.freeze([
    P('travelerA', { hat: 'hood', held: 'stick', back: 'satchel', colors: { cloth: 0x8c7d64, dark: 0x45403a, trim: 0xc7b48c, leather: 0x6a4e32, boot: 0x2e2620, hat: 0x5a5044, skin: SKIN.warm, hair: HAIR.brown } }),
    P('travelerB', { build: 1.06, hair: 'short', beard: 'full', held: 'stick', back: 'bedroll', colors: { cloth: 0x6a7464, dark: 0x343a30, trim: 0xc7b48c, leather: 0x6a4e32, boot: 0x2e2620, skin: SKIN.olive, hair: HAIR.sand } }),
  ]),
  cartographer: Object.freeze([
    P('cartographerA', { body: 'robe', hat: 'wide', hair: 'short', held: 'map', back: 'satchel', colors: { cloth: 0x7d8f6a, dark: 0x3b4a3a, trim: 0xf0d58a, leather: 0x6a5034, boot: 0x2e281e, hat: 0x5a4a32, skin: SKIN.fair, hair: HAIR.brown } }),
  ]),
});
// Which pool a traveller's standard-view look draws from (the peddler has his own look)
const TRAVELER_POOL = Object.freeze({ pilgrim: 'pilgrim', mercenary: 'mercenary', minstrel: 'minstrel', scholar: 'scholar', traveler: 'traveler', cartographer: 'cartographer' });
const RECITER_NATIVE = new Set(['pilgrim', 'mercenary', 'minstrel', 'scholar', 'traveler', 'cartographer']); // renderer.ts RECITER_NATIVE_LOOKS: a reciter in one of these looks has its own native 3D model
const NAMED = Object.freeze({ 'vendor-vela': 'vela', 'warden-oren': 'oren', 'keeper-sela': 'sela', 'refuge-farmer': 'hollis', 'cairn-keeper': 'maud',
  'vendor-iona': 'iona', 'resident-tarn': 'tarn', 'vendor-mora': 'mora', 'resident-esh': 'esh' });
export function folkHash(o) { let h = 2166136261; for (const c of String(o?.id ?? o?.name ?? `${o?.x},${o?.y}`)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (pool, o) => pool[folkHash(o) % pool.length];
// Which Close View body a world object takes: 'turtle' (Shale), 'folk' (a person), or null (it keeps what it has: an Elder
// Wanderer keeps its own model; a fallen Refuge person their marker; anything not a character its card). `g` (optional): the game,
// for the Refuge's and the waystations' people (a fallen one is not stood up).
export function closeViewFolkKind(o, g = null) {
  if (!o || typeof o !== 'object' || o.hidden === true || o.customArt || !Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) return null;
  switch (o.kind) {
    case 'villager': return o.quarryTurtle ? 'turtle' : 'folk';
    case 'npc': return g?.save?.consequences?.npcs?.[o.id]?.status === 'dead' ? null : 'folk';
    case 'traveler': return o.elder || (o.reciter && RECITER_NATIVE.has(o.look) && !o.mount && !o.folkGiant) ? null : 'folk'; // (an Elder and a reciter keep their own native models: renderer.ts nativeTraveler)
    case 'townKeeper': case 'townSmith': case 'shipwright': case 'tideBearer': case 'ilse': case 'shelterMerchant': return 'folk';
    default: return null;
  }
}
// The look a person wears (deterministic per id).
export function folkLook(o) {
  const named = NAMED[o?.id]; if (named) return FOLK_LOOKS[named];
  switch (o?.kind) {
    case 'townSmith': return FOLK_LOOKS.smith;
    case 'townKeeper': return FOLK_LOOKS.keeper;
    case 'shipwright': return FOLK_LOOKS.shipwright;
    case 'tideBearer': return FOLK_LOOKS.tideBearer;
    case 'shelterMerchant': return pick(FOLK_POOLS.trader, o);
    case 'ilse': return o.age === 'child' ? FOLK_LOOKS.ilseChild : o.age === 'old' ? FOLK_LOOKS.ilseOld : o.stage === 3 ? FOLK_LOOKS.ilseLamp : o.stage === 4 ? FOLK_LOOKS.ilseDark : FOLK_LOOKS.ilseYoung;
    case 'traveler': if (o.wanderer) return FOLK_LOOKS.quillon; if (o.look === 'peddler') return FOLK_LOOKS.peddler; return pick(FOLK_POOLS[TRAVELER_POOL[o.look]] || FOLK_POOLS.traveler, o);
    case 'villager': if (o.cook) return FOLK_LOOKS.cook; if (o.guard) return pick(FOLK_POOLS.warden, o); return pick(FOLK_POOLS.villager, o);
    case 'npc': return pick(FOLK_POOLS.trader, o);
    default: return pick(FOLK_POOLS.villager, o);
  }
}
// The look, remembered per person (a frame hashes nothing): looked up again only when what chooses it changes (Ilse's meeting).
const LOOKS_OF = new WeakMap();
export function folkLookCached(o) {
  const c = LOOKS_OF.get(o); if (c && c.kind === o.kind && c.id === o.id && c.lk === o.look && c.age === o.age && c.stage === o.stage && c.guard === o.guard) return c.look;
  const look = folkLook(o); LOOKS_OF.set(o, { look, kind: o.kind, id: o.id, lk: o.look, age: o.age, stage: o.stage, guard: o.guard }); return look;
}
// A small per-person height jitter (presentation only; the shared mesh is unchanged): +-3%.
export const folkHeightJitter = (o) => 1 + (((folkHash(o) >>> 8) % 61) - 30) / 1000;

// ------------------------------------------------------------------------------------------------ skeletons
const NECK_TO_HEAD = Object.freeze([.012, 0, .07]);
const SKELETONS = new Map();
function folkSkeleton(body, build = 1) {
  const key = `${body}:${build}`; let sk = SKELETONS.get(key); if (sk) return sk;
  const J = FOLK_BODIES[body].joints, out = (a) => [a[0], a[1] * (1 + (build - 1) * .55), a[2]], dJ = (n) => /^(arm|fore|hand)/.test(n) ? out(J[n]) : J[n];
  const rel = (a, b) => { const A = dJ(a), Bp = b ? dJ(b) : [0, 0, 0]; return [A[0] - Bp[0], A[1] - Bp[1], A[2] - Bp[2]]; };
  sk = defineSkeleton([
    { name: 'base', parent: null, at: [0, 0, 0] }, { name: 'root', parent: 'base', at: [0, 0, 0] },
    { name: 'pelvis', parent: 'root', at: rel('pelvis') },
    { name: 'thighL', parent: 'pelvis', at: rel('thighL', 'pelvis') }, { name: 'shinL', parent: 'thighL', at: rel('shinL', 'thighL') }, { name: 'footL', parent: 'shinL', at: rel('footL', 'shinL') },
    { name: 'thighR', parent: 'pelvis', at: rel('thighR', 'pelvis') }, { name: 'shinR', parent: 'thighR', at: rel('shinR', 'thighR') }, { name: 'footR', parent: 'shinR', at: rel('footR', 'shinR') },
    { name: 'spine', parent: 'pelvis', at: rel('spine', 'pelvis') }, { name: 'chest', parent: 'spine', at: rel('chest', 'spine') },
    { name: 'neck', parent: 'chest', at: rel('neck', 'chest') }, { name: 'head', parent: 'neck', at: NECK_TO_HEAD.slice() },
    { name: 'armL', parent: 'chest', at: rel('armL', 'chest') }, { name: 'foreL', parent: 'armL', at: rel('foreL', 'armL') }, { name: 'handL', parent: 'foreL', at: rel('handL', 'foreL') },
    { name: 'armR', parent: 'chest', at: rel('armR', 'chest') }, { name: 'foreR', parent: 'armR', at: rel('foreR', 'armR') }, { name: 'handR', parent: 'foreR', at: rel('handR', 'foreR') },
    { name: 'heldR', parent: 'handR', at: [0, 0, -FOLK_MOTION.grip] }, { name: 'heldL', parent: 'handL', at: [0, 0, -FOLK_MOTION.grip] },
    { name: 'back', parent: 'chest', at: [-.11, 0, -.02] }, { name: 'work', parent: 'base', at: [0, 0, 0] },
  ]);
  const len = (a, b) => Math.hypot(J[a][0] - J[b][0], J[a][1] - J[b][1], J[a][2] - J[b][2]);
  sk = Object.freeze({ ...sk, body, build, thigh: len('thighR', 'shinR'), shin: len('shinR', 'footR'), ankle: J.footR[2], upperArm: len('armR', 'foreR'), foreArm: len('foreR', 'handR'), hip: J.pelvis[2] });
  SKELETONS.set(key, sk); return sk;
}

// ------------------------------------------------------------------------------------------------ meshes
function lerpRGB(a, b, t) { const c = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (c(16) << 16) | (c(8) << 8) | c(0); }
function decode(b64, T) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
const DECODED = new Map();
function decoded(body) {
  let d = DECODED.get(body); if (d) return d; const S = FOLK_BODIES[body];
  d = { P: decode(S.positions, Float32Array), N: decode(S.normals, Int8Array), Bn: decode(S.bone, Uint8Array), W: decode(S.weight, Uint8Array), Lu: decode(S.shade, Uint8Array), K: decode(S.cls, Uint8Array),
    full: decode(S.indices, Uint16Array), balanced: decode(S.indicesBalanced, Uint16Array), low: decode(S.indicesLow, Uint16Array),
    hoodAt: { full: S.hoodAt, balanced: S.hoodAtBalanced, low: S.hoodAtLow }, lo: new Float32Array(FOLK_BODY_CLASSES.length).fill(255), hi: new Float32Array(FOLK_BODY_CLASSES.length) };
  for (let v = 0; v < S.vertexCount; v++) { const k = d.K[v]; d.lo[k] = Math.min(d.lo[k], d.Lu[v]); d.hi[k] = Math.max(d.hi[k], d.Lu[v]); } // each class's own light range (the source's cloth is dark)
  DECODED.set(body, d); return d;
}
const BONE_NAMES = Object.freeze(["pelvis", "spine", "chest", "neck", "head", "armL", "foreL", "handL", "armR", "foreR", "handR", "thighL", "shinL", "footL", "thighR", "shinR", "footR"]);
const TORSO = new Set([0, 1, 2]), ARM_L = new Set([5, 6, 7]), ARM_R = new Set([8, 9, 10]);
// The colour of a body class in a look: each class's [shadow, light]
function classTone(look, cls) {
  const C = look.colors;
  // (the robe's pale class is its sleeves and under-robe: a shade of its cloth, not the trim)
  const base = cls === 'cloth' ? C.cloth : cls === 'clothDark' ? C.dark : cls === 'trim' ? (look.body === 'robe' ? (C.sleeve ?? shade(C.cloth, 1.12)) : C.trim) : cls === 'leather' || cls === 'belt' || cls === 'pouch' ? C.leather
    : cls === 'hand' ? (C.hand ?? C.skin) : cls === 'boot' ? C.boot : cls === 'collar' ? C.trim : C.cloth;
  return [shade(base, .62), shade(base, 1.1)];
}
function buildFolkMesh(look, tier) {
  const SK = folkSkeleton(look.body, look.build), d = TIER_DETAIL[tier], low = tier === 'low', B = meshBuilder(SK, d), D = decoded(look.body), body = FOLK_BODIES[look.body], bw = SK.bindWorld, BI = SK.index, C = look.colors;
  const J = body.joints, spread = (look.build - 1) * .55;
  // ---- the converted body: every vertex on its two bones, coloured by its class from the look's palette, shaded from the source.
  // Build: the torso widened (or narrowed) about the spine, the arms carried out with their shoulders (folkSkeleton).
  const ids = new Int32Array(body.vertexCount).fill(-1), tones = FOLK_BODY_CLASSES.map((c) => classTone(look, c));
  const skip = new Set(['hood', 'lining']); if (!look.pouch) skip.add('pouch'); if (!look.belt) skip.add('belt');
  const vert = (v) => {
    if (ids[v] >= 0) return ids[v];
    let x = D.P[v * 3], y = D.P[v * 3 + 1], z = D.P[v * 3 + 2]; const a = D.Bn[v * 2], b = D.Bn[v * 2 + 1], w = D.W[v] / 255;
    const torso = (TORSO.has(a) ? 1 - w : 0) + (TORSO.has(b) ? w : 0), armL = (ARM_L.has(a) ? 1 - w : 0) + (ARM_L.has(b) ? w : 0), armR = (ARM_R.has(a) ? 1 - w : 0) + (ARM_R.has(b) ? w : 0);
    if (torso > 0 && z < J.neck[2] + .02) { const k = 1 + (look.build - 1) * torso * Math.min(1, Math.max(0, (z - .2) / .35)); y *= k; x = J.chest[0] + (x - J.chest[0]) * (1 + (k - 1) * 1.15); }
    if (armL > 0) y += J.armL[1] * spread * armL; if (armR > 0) y += J.armR[1] * spread * armR;
    const k = D.K[v], [lo, hi] = tones[k], lt = D.hi[k] > D.lo[k] ? (D.Lu[v] - D.lo[k]) / (D.hi[k] - D.lo[k]) : .7;
    return ids[v] = B.vertexBlend(x, y, z, D.N[v * 3] / 127, D.N[v * 3 + 1] / 127, D.N[v * 3 + 2] / 127, BONE_NAMES[a], BONE_NAMES[b], w, lerpRGB(lo, hi, .2 + .8 * lt));
  };
  const IX = D[tier], end = D.hoodAt[tier];
  for (let i = 0; i < end; i += 3) { const a = IX[i], b = IX[i + 1], c = IX[i + 2]; if (skip.has(FOLK_BODY_CLASSES[D.K[a]]) || skip.has(FOLK_BODY_CLASSES[D.K[b]]) || skip.has(FOLK_BODY_CLASSES[D.K[c]])) continue; B.tri(vert(a), vert(b), vert(c)); }
  const at = (bone, p) => [p[0], p[1], p[2]]; // parts are authored bone-relative
  // ---- a robe's skirt from the waist to the shins (a peddler's in rags: a torn, patched hem): rings about the hips, the upper ones
  // on the pelvis, the lower ones following each side's thigh a little so a stride moves the cloth
  if (look.skirt) {
    const rows = low ? 2 : 4, seg = low ? 8 : 14, top = J.pelvis[2] + .08, hem = look.rags ? .2 : .16, cx = J.pelvis[0] - .01, rings = [];
    for (let i = 0; i <= rows; i++) { const q = i / rows, zq = mix(top, hem, q), rad = mix(.118, .2, Math.pow(q, .75)) * (1 + (look.build - 1) * .9), row = [];
      for (let k = 0; k < seg; k++) { const th = k / seg * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), rag = look.rags && i === rows ? ((k * 7) % 3) * .03 - (k % 2) * .02 : 0;
        const rr = rad * (1 + (look.rags && i === rows ? ((k * 5) % 4) * .05 : 0)), side = s >= 0 ? 'thighR' : 'thighL', wt = q * .42 * Math.abs(s) + q * .12;
        const tone = look.rags && ((k + i * 3) % 5 === 0) ? shade(C.cloth, .78) : look.rags && ((k + i) % 7 === 3) ? (C.trim) : C.cloth;
        row.push(B.vertexBlend(cx + c * rr * .9, s * rr, zq + rag, c, s, .25, 'pelvis', side, wt, lerpRGB(shade(tone, .7), shade(tone, 1.05), .5 + .5 * Math.max(0, c * .6 + .4)))); }
      rings.push(row); }
    for (let i = 0; i < rows; i++) for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg, a = rings[i], b = rings[i + 1]; B.tri(a[k], b[k], b[k2]); B.tri(a[k], b[k2], a[k2]); }
    if (!low) { const belt = []; for (let k = 0; k < seg; k++) { const th = k / seg * Math.PI * 2; belt.push(B.vertexBlend(cx + Math.cos(th) * .124 * .9 * (1 + (look.build - 1) * .9), Math.sin(th) * .124 * (1 + (look.build - 1) * .9), top + .015, Math.cos(th), Math.sin(th), 0, 'pelvis', 'pelvis', 0, C.leather)); }
      for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; B.tri(belt[k], rings[0][k], rings[0][k2]); B.tri(belt[k], rings[0][k2], belt[k2]); } }
  }
  const box = (bone, hex, p, size, o = {}) => B.bone(bone).color(hex, o.emit || 0).box({ at: at(bone, p), size, bevel: o.bevel ?? .2, taper: o.taper || 0, F: o.F, U: o.U, skew: o.skew });
  const ell = (bone, hex, p, r, o = {}) => B.bone(bone).color(hex, o.emit || 0).ellipsoid({ at: p, radius: r, rings: o.rings || (low ? 3 : 5), seg: o.seg || 8, F: o.F, U: o.U });
  const lathe = (bone, hex, p, F, rings, o = {}) => B.bone(bone).color(hex, o.emit || 0).lathe({ at: p, F, U: o.U || (Math.abs(F[2]) > .9 ? [1, 0, 0] : [0, 0, 1]), rings, seg: o.seg || (low ? 5 : 8), smooth: o.smooth !== false, caps: o.caps, rs: o.rs, us: o.us });
  // ---- the neck and the head (on the head bone: its origin NECK_TO_HEAD above the neck joint)
  const skin = C.skin, hair = C.hair, hat = C.hat ?? C.dark, hc = [.012, 0, .095]; // the head's centre
  lathe('neck', shade(skin, .92), [0, 0, -.03], [0, 0, 1], [[0, .044], [.1, .04]], { caps: false, seg: low ? 5 : 7 });
  ell('head', skin, hc, [.092, .083, .108], { rings: low ? 4 : 6, seg: low ? 7 : 10 });
  ell('head', shade(skin, .96), [hc[0] + .03, 0, hc[2] - .055], [.058, .062, .045], { rings: low ? 3 : 4, seg: low ? 6 : 8 }); // the jaw
  const nl = .022 * look.nose; box('head', shade(skin, 1.04), [hc[0] + .088 + nl * .4, 0, hc[2] - .012 - (look.nose - 1) * .012], [nl * .6, .011, .02 + (look.nose - 1) * .006], { taper: .3, bevel: 0 }); // the nose
  const eyeH = look.eyes === 'narrow' ? .0045 : .0085;
  for (const s of [-1, 1]) {
    box('head', 0x1a1412, [hc[0] + .083, s * .034, hc[2] + .012], [.006, .013, eyeH], { bevel: 0 }); // the eyes
    box('head', look.hair === 'bald' || look.hair === 'none' ? shade(skin, .7) : shade(hair, .9), [hc[0] + .086, s * .036, hc[2] + .03 + (look.eyes === 'narrow' ? -.004 : 0)], [.006, .018, .005], { bevel: 0, F: [1, 0, s * (look.eyes === 'narrow' ? .25 : -.08)] }); // the brows
    if (!low) ell('head', shade(skin, .9), [hc[0] - .005, s * .086, hc[2] - .005], [.018, .012, .026], { rings: 2, seg: 5 }); // the ears
  }
  const hatCovers = look.hat === 'hood' || look.hat === 'peaked' || look.hat === 'scarf' || look.hat === 'helm' || look.hat === 'chef';
  if (look.hair !== 'bald' && look.hair !== 'none' && !hatCovers) {
    ell('head', hair, [hc[0] - .016, 0, hc[2] + .026], [.094, .089, .1], { rings: low ? 3 : 5, seg: low ? 7 : 10 }); // the crown and back
    if (look.hair === 'long') box('head', shade(hair, .9), [hc[0] - .06, 0, hc[2] - .06], [.032, .082, .085], { bevel: .3 });
    if (look.hair === 'bun') ell('head', shade(hair, .95), [hc[0] - .09, 0, hc[2] + .05], [.04, .042, .04], { rings: 3, seg: 6 });
  } else if (look.hair === 'bald' && !low) ell('head', hair, [hc[0] - .045, 0, hc[2] - .012], [.06, .088, .045], { rings: 3, seg: 8 }); // a fringe round the back
  else if (hatCovers && look.hair === 'long') box('head', shade(hair, .9), [hc[0] - .05, 0, hc[2] - .07], [.03, .08, .07], { bevel: .3 });
  if (look.beard === 'full') ell('head', shade(hair, .95), [hc[0] + .045, 0, hc[2] - .07], [.055, .07, .06], { rings: low ? 3 : 4, seg: low ? 6 : 9 });
  else if (look.beard === 'goatee') lathe('head', shade(hair, .95), [hc[0] + .085, 0, hc[2] - .07], [.15, 0, -1], [[0, .024], [.075, 0]], { seg: 5, caps: true });
  else if (look.beard === 'stubble') ell('head', lerpRGB(skin, hair, .45), [hc[0] + .04, 0, hc[2] - .058], [.058, .066, .045], { rings: 3, seg: 8 });
  // ---- the hat
  const crown = hc[2] + .085;
  switch (look.hat) {
    case 'cap': ell('head', hat, [hc[0] - .01, 0, crown - .005], [.1, .094, .05], { rings: low ? 3 : 4, seg: low ? 7 : 10 }); box('head', shade(hat, .85), [hc[0] + .085, 0, crown - .03], [.04, .06, .006], { bevel: 0 }); break;
    case 'feather': ell('head', hat, [hc[0] - .01, 0, crown - .005], [.1, .094, .05], { rings: low ? 3 : 4, seg: low ? 7 : 10 });
      B.bone('head').color(C.trim).slab({ at: [hc[0] - .05, .06, crown + .02], F: [-.6, 0, .8], U: [0, 0, 1], thick: .006, points: [[0, 0], [.06, .02], [.16, .01], [.08, -.015]] }); break;
    case 'wide': lathe('head', hat, [hc[0], 0, crown - .03], [0, 0, 1], [[0, .2], [.012, .2], [.016, .1], [.06, .085], [.085, 0]], { seg: low ? 7 : 12 }); break;
    case 'scarf': ell('head', hat, [hc[0] - .018, 0, hc[2] + .022], [.1, .097, .108], { rings: low ? 3 : 5, seg: low ? 7 : 10 });
      if (!low) ell('head', shade(hat, .85), [hc[0] - .1, 0, hc[2] - .03], [.03, .03, .03], { rings: 2, seg: 5 }); break;
    case 'helm': lathe('head', hat, [hc[0] - .005, 0, hc[2] + .005], [0, 0, 1], [[0, .135], [.012, .135], [.02, .1], [.07, .09], [.1, .055], [.115, 0]], { seg: low ? 7 : 12 }); break;
    case 'chef': lathe('head', hat, [hc[0] - .005, 0, crown - .02], [0, 0, 1], [[0, .095], [.08, .098], [.11, .118], [.15, .1], [.17, 0]], { seg: low ? 7 : 10 }); break;
    case 'hood': case 'peaked': { // a deep hood: a shell over the head open at the face, its drape down the back to the shoulders
      const peak = look.hat === 'peaked';
      ell('head', hat, [hc[0] - .028, 0, hc[2] + .012], [.108, .104, .122], { rings: low ? 3 : 5, seg: low ? 7 : 10 });
      if (peak) lathe('head', shade(hat, .95), [hc[0] - .07, 0, hc[2] + .09], [-.75, 0, .66], [[0, .05], [.09, .022], [.15, 0]], { seg: low ? 5 : 7 });
      box('head', shade(hat, .85), [hc[0] - .07, 0, hc[2] - .1], [.06, .12, .07], { taper: -.2, bevel: .25 });
      box('neck', shade(hat, .8), [-.02, 0, .0], [.07, .1, .045], { bevel: .3 }); break; }
    default: break;
  }
  // ---- a shawl over the shoulders (rags for the peddler): a short cone about the collar, on the chest
  if (look.mantle) { const mc = C.mantle ?? C.dark, bw2 = 1 + (look.build - 1) * .7;
    B.bone('chest').color(mc).lathe({ at: [J.neck[0] - J.chest[0] - .02, 0, J.neck[2] - J.chest[2] + .015], F: [0, 0, -1], U: [1, 0, 0], rings: look.rags ? [[0, .06], [.05, .15], [.13, .21], [.17, .19]] : [[0, .06], [.05, .15], [.12, .2]], rs: 1.05 * bw2, us: .82 * bw2, seg: low ? 7 : look.rags ? 9 : 12, smooth: !look.rags, caps: false });
  }
  // ---- held things (each on its hand's held bone, along that bone's +f; the pose aims it)
  const wood = 0x5a4028, steel = 0xb8bec6, dark = 0x2a2420, glow = 0xffc56b;
  const held = (bone, kind) => {
    switch (kind) {
      case 'staff': lathe(bone, wood, [-.62, 0, 0], [1, 0, 0], [[0, .013], [1.36, .016]], { seg: 5 }); ell(bone, shade(wood, 1.2), [.76, 0, 0], [.03, .028, .028], { rings: 3, seg: 6 }); break;
      case 'stick': lathe(bone, wood, [-.1, 0, 0], [1, 0, 0], [[0, .013], [.72, .011]], { seg: 5 }); ell(bone, shade(wood, 1.15), [-.1, 0, 0], [.022, .022, .022], { rings: 2, seg: 5 }); break;
      case 'pitchfork': lathe(bone, wood, [-.55, 0, 0], [1, 0, 0], [[0, .012], [1.2, .012]], { seg: 5 });
        box(bone, 0x6a6a6a, [.66, 0, 0], [.012, .06, .008], { bevel: 0 }); for (const r of [-.05, 0, .05]) box(bone, 0x8a8a8a, [.74, r, 0], [.07, .006, .006], { bevel: 0, taper: .5 }); break;
      case 'spear': lathe(bone, wood, [-.6, 0, 0], [1, 0, 0], [[0, .012], [1.32, .013]], { seg: 5 });
        B.bone(bone).color(steel).slab({ at: [.72, 0, 0], F: [1, 0, 0], U: [0, 0, 1], thick: .008, points: [[0, -.025], [.15, 0], [0, .025], [-.02, 0]] }); box(bone, 0x7a2a22, [.7, 0, 0], [.02, .018, .018], { bevel: 0 }); break;
      case 'lantern': case 'lamp': { const big = kind === 'lamp' ? 1.15 : 1; box(bone, dark, [.03, 0, 0], [.012, .012, .03], { bevel: 0 });
        box(bone, dark, [.09 * big, 0, 0], [.012, .045 * big, .045 * big], { bevel: 0 }); box(bone, glow, [.15 * big, 0, 0], [.05 * big, .036 * big, .036 * big], { bevel: 0, emit: 1 }); box(bone, dark, [.215 * big, 0, 0], [.014, .048 * big, .048 * big], { bevel: 0 }); break; }
      case 'taper': lathe(bone, 0xe8d8b0, [-.05, 0, 0], [1, 0, 0], [[0, .006], [.42, .005]], { seg: 4 }); ell(bone, glow, [.45, 0, 0], [.03, .016, .016], { rings: 2, seg: 5, emit: 1 }); break;
      case 'basket': lathe(bone, 0xa07a46, [.04, 0, 0], [1, 0, 0], [[0, .0], [.02, .08], [.14, .1], [.15, .0]], { seg: low ? 6 : 9, smooth: false });
        box(bone, shade(0xa07a46, .8), [.06, 0, 0], [.07, .005, .07], { bevel: 0 }); if (!low) ell(bone, 0x7a9a4a, [.035, 0, 0], [.03, .07, .07], { rings: 2, seg: 6 }); break;
      case 'hammer': lathe(bone, wood, [-.08, 0, 0], [1, 0, 0], [[0, .012], [.36, .012]], { seg: 5 }); box(bone, 0x5c6067, [.3, 0, 0], [.035, .03, .075], { bevel: .15 }); break;
      case 'ladle': lathe(bone, wood, [-.05, 0, 0], [1, 0, 0], [[0, .009], [.32, .009]], { seg: 4 }); ell(bone, 0x8a8a8a, [.33, 0, -.02], [.04, .04, .025], { rings: 3, seg: 6 }); break;
      case 'book': box(bone, 0x6a2a24, [.0, 0, 0], [.07, .02, .09], { bevel: .1, U: [1, 0, 0], F: [0, 0, 1] }); box(bone, 0xe8dcc0, [.0, .002, .0], [.065, .021, .082], { bevel: 0, U: [1, 0, 0], F: [0, 0, 1] }); break;
      case 'map': lathe(bone, 0xe0d0a8, [-.12, 0, 0], [0, 1, 0], [[0, .024], [.24, .024]], { seg: 6 }); box(bone, 0xb05a3a, [-.12, .12, 0], [.006, .004, .026], { bevel: 0 }); break;
      case 'lens': lathe(bone, wood, [-.05, 0, 0], [1, 0, 0], [[0, .01], [.2, .01]], { seg: 4 });
        lathe(bone, 0xc9a6ff, [.24, 0, 0], [0, 1, 0], [[-.006, .055], [.006, .055]], { seg: 10, emit: 2 }); break;
      default: break;
    }
  };
  held('heldR', look.held);
  // ---- on the back (the back bone sits behind the chest)
  switch (look.back) {
    case 'pack': { // the peddler's pack (35-40 L): a canvas body as tall as his back, a lid flap, side pockets, a bedroll on top, a pot
      const pk = C.pack ?? 0x6e5034, pd = C.packDark ?? 0x3e2a1a;
      box('back', pk, [-.075, 0, -.07], [.075, .118, .2], { bevel: .3, taper: .08 });
      box('back', pd, [-.072, 0, .1], [.08, .122, .045], { bevel: .3 }); // the lid
      box('back', shade(pk, .85), [-.14, 0, -.12], [.02, .09, .08], { bevel: .3 }); // the front pocket
      for (const s of [-1, 1]) { box('back', shade(pk, .9), [-.07, s * .13, -.1], [.05, .02, .08], { bevel: .3 }); box('chest', pd, [.0, s * .09, .03], [.11, .015, .012], { bevel: 0, F: [1, 0, -.15] }); }
      lathe('back', 0x8a6a4a, [-.075, -.14, .17], [0, 1, 0], [[0, .045], [.28, .045]], { seg: low ? 5 : 8 }); // the bedroll
      for (const s of [-.08, .08]) box('back', pd, [-.075, s, .17], [.05, .006, .05], { bevel: 0 });
      lathe('back', 0x4a4440, [-.165, .07, -.2], [0, 0, -1], [[0, .045], [.06, .042], [.065, 0]], { seg: 6, smooth: false }); // a pot hung on the side
      break; }
    case 'lute': ell('back', 0x9a6a3a, [-.06, .02, -.12], [.03, .09, .11], { rings: low ? 3 : 4, seg: low ? 6 : 8, F: [1, 0, 0] }); box('back', 0x5a3a20, [-.07, -.04, .1], [.012, .018, .17], { bevel: 0, F: [1, 0, 0], U: [0, -.35, 1] }); break;
    case 'bedroll': lathe('back', 0x7a6a4a, [-.06, -.13, .08], [0, 1, 0], [[0, .045], [.26, .045]], { seg: low ? 5 : 8 }); break;
    case 'satchel': box('pelvis', C.leather, [-.0, .17, -.04], [.06, .025, .06], { bevel: .3 }); box('chest', shade(C.leather, .8), [.0, 0, .02], [.105, .012, .012], { bevel: 0, F: [1, 0, 0], U: [0, .6, 1] }); break;
    default: break;
  }
  // ---- the work they stand by (on the unturning work bone, in the world's axes: +f east, +r south, the way the standard view lays it out)
  switch (look.work) {
    case 'forge': { const st = 0x5a544e, hot = 0xff8a3a, fx = -.12, fy = -.62; // the forge beside him (to his left), the anvil before him (he faces east at his work)
      box('work', st, [fx, fy, .26], [.22, .2, .26], { bevel: .12 }); box('work', shade(st, .75), [fx, fy, .55], [.2, .18, .04], { bevel: .1 });
      box('work', hot, [fx + .02, fy, .6], [.13, .11, .015], { bevel: 0, emit: 1 }); box('work', shade(st, .85), [fx - .06, fy, .95], [.11, .1, .22], { bevel: .1, taper: .35 }); // the coals and the hood
      for (const s of [-1, 1]) box('work', shade(st, .9), [fx - .06, fy + s * .14, .7], [.03, .03, .1], { bevel: 0 });
      box('work', 0x3a3d42, [.38, .02, .1], [.07, .06, .1], { bevel: .1 }); box('work', 0x5c6067, [.38, .02, .23], [.16, .06, .035], { bevel: .2, taper: .1 }); // the anvil
      break; }
    case 'lampPost': case 'lampDark': { const lit = look.work === 'lampPost';
      lathe('work', 0x3a302a, [.62, -.05, 0], [0, 0, 1], [[0, .028], [1.32, .022]], { seg: 6 });
      box('work', lit ? 0xffdc96 : 0x4a4440, [.62, -.05, 1.38], [.05, .05, .055], { bevel: 0, emit: lit ? 1 : 0 }); // the glass, a dark cap and base
      box('work', 0x2b2420, [.62, -.05, 1.45], [.065, .065, .018], { bevel: 0, taper: .3 }); box('work', 0x2b2420, [.62, -.05, 1.315], [.055, .055, .012], { bevel: 0 });
      break; }
    default: break;
  }
  return B.done();
}
const MESHES = new Map();
export function folkMesh(look, tier = 'full') { const key = `${look.id}:${tier}`; let m = MESHES.get(key); if (!m) { m = buildFolkMesh(look, tier); MESHES.set(key, m); } return m; }
export const folkMeshCount = () => MESHES.size;

// ------------------------------------------------------------------------------------------------ the track
export function createFolkTrack(look) {
  const SK = folkSkeleton(look.body, look.build);
  return {
    look, skeleton: SK, pose: createPose(SK), gait: createGait([{ side: -.1, phase: .5 }, { side: .1, phase: 0 }]),
    yaw: NaN, at: NaN, px: NaN, py: NaN, pace: 0, look2: 0, seed: 0,
    frame: { kind: 'folk', folk: look.id, tier: 'full', mesh: null, skin: null, boneCount: SK.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
const FACING_YAW = Object.freeze({ up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 });
const H = new Float64Array(3), T = new Float64Array(3), Jn = new Float64Array(3), POLE = new Float64Array(3), Dv = new Float64Array(3), ARMS = Object.freeze(['R', 'L']);
// Hand targets (body frame: f forward, r right, u up; model units) and the held thing's direction, by what is held.
const HOLD = Object.freeze({
  none: Object.freeze({ hand: [.03, .2, .55], dir: [1, 0, -.1] }),
  staff: Object.freeze({ hand: [.14, .21, .7], dir: [0, 0, 1] }), spear: Object.freeze({ hand: [.12, .22, .68], dir: [.05, 0, 1] }), pitchfork: Object.freeze({ hand: [.13, .22, .66], dir: [.05, 0, 1] }),
  stick: Object.freeze({ hand: [.2, .2, .6], dir: [.22, .04, -1] }), lantern: Object.freeze({ hand: [.16, .2, .6], dir: [0, 0, -1] }), lamp: Object.freeze({ hand: [.24, .12, .86], dir: [0, 0, -1] }),
  basket: Object.freeze({ hand: [.08, .22, .58], dir: [0, 0, -1] }), hammer: Object.freeze({ hand: [.08, .22, .56], dir: [.35, 0, -1] }), ladle: Object.freeze({ hand: [.14, .2, .64], dir: [.3, 0, 1] }),
  book: Object.freeze({ hand: [.2, .08, .8], dir: [.2, 0, 1] }), map: Object.freeze({ hand: [.18, .1, .76], dir: [.3, 0, 1] }), taper: Object.freeze({ hand: [.2, .18, .78], dir: [.25, 0, 1] }),
  lens: Object.freeze({ hand: [.18, .18, .76], dir: [.2, 0, 1] }),
});
const OFF_HAND = Object.freeze({ book: [.2, -.06, .78], map: [.18, -.12, .76] });
// The body's frame this sample (module scratch: nothing allocated a frame): a point and a direction in it to the world.
const BF = { x: 0, y: 0, z: 0, S: 1, fwX: 1, fwY: 0, rtX: 0, rtY: 1, hip: .57, cl: 1, sl: 0 };
function bodyPt(f, r, u, out) { const hu = u - BF.hip, ff = f + hu * BF.sl * .6, uu = BF.hip + hu * (1 - (1 - BF.cl) * .6); out[0] = BF.x + (BF.fwX * ff + BF.rtX * r) * BF.S; out[1] = BF.y + (BF.fwY * ff + BF.rtY * r) * BF.S; out[2] = BF.z + (uu - .01) * BF.S; return out; }
function bodyDir(f, r, u, out) { const l = Math.hypot(f, r, u) || 1; out[0] = (BF.fwX * f + BF.rtX * r) / l; out[1] = (BF.fwY * f + BF.rtY * r) / l; out[2] = u / l; return out; }
// env: { x, y, z (the ground), scale, now (ms), reduce, tier, target (the Wayfarer: { x, y }), talk (ms since spoken to, or NaN),
//        seat (a rider's seat height in tiles, or 0), yaw (the rest facing, or NaN) }
export function sampleFolk(tr, o, env) {
  const M = FOLK_MOTION, look = tr.look, SK = tr.skeleton, BI = SK.index, Po = tr.pose, now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1));
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  if (!tr.seed) tr.seed = 1 + (folkHash(o) % 997) / 97;
  const x = env.x, y = env.y, z = env.z, t = reduce ? 0 : now / 1000, seat = Math.max(0, Number(env.seat) || 0), seated = seat > 0;
  if (Number.isFinite(tr.px) && dt > 0) { const v = Math.hypot(x - tr.px, y - tr.py) / dt; tr.pace += (Math.min(4, v) - tr.pace) * Math.min(1, dt * 8); }
  const moved = Number.isFinite(tr.px) ? Math.hypot(x - tr.px, y - tr.py) : 0, mdx = Number.isFinite(tr.px) ? x - tr.px : 0, mdy = Number.isFinite(tr.py) ? y - tr.py : 0; tr.px = x; tr.py = y;
  // facing: where it walks; standing, the Wayfarer when near (the head first, the body slowly after); else its rest facing
  const tx = env.target ? env.target.x - x : 0, ty = env.target ? env.target.y - y : 0, dist = Math.hypot(tx, ty), near = !!env.target && dist < M.watchRange * Math.max(1, S * .8) && dist > .05;
  const rest = Number.isFinite(env.yaw) ? env.yaw : look.idle === 'work' ? 0 : FACING_YAW[o.facing] ?? Math.PI / 2;
  const walking = moved > .0015 && moved < 2 && !seated;
  let want = rest, rate = M.watchTurnRate;
  if (walking || (seated && moved > .0015 && moved < 2)) { want = Math.atan2(mdy, mdx); rate = M.turnRate; }
  else if (near) want = Math.atan2(ty, tx);
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  const yaw = tr.yaw;
  // the head: toward the Wayfarer when near, else a slow glance about (none with reduced motion)
  let lookTo = 0;
  if (near) { const a = Math.atan2(ty, tx) - yaw; lookTo = Math.max(-M.lookMax, Math.min(M.lookMax, Math.atan2(Math.sin(a), Math.cos(a)))); }
  else if (!reduce && !walking) lookTo = .35 * Math.sin(t * Math.PI * 2 / M.glanceSec + tr.seed * 3) * Math.max(0, Math.sin(t * Math.PI * 2 / (M.glanceSec * 1.7) + tr.seed));
  tr.look2 += (lookTo - tr.look2) * Math.min(1, dt * 5);
  const talkMs = Number(env.talk), talk = Number.isFinite(talkMs) && talkMs >= 0 && talkMs < M.talkMs ? Math.sin(Math.PI * Math.min(1, talkMs / M.talkMs)) : 0;
  stepGait(tr.gait, x, y, yaw, now, { stride: M.stride * S, stance: M.stance, settle: M.settle, still: seated, snapDistance: .6 * S, stepAt: M.stepAt * S, stepTime: M.stepTime });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(Po);
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * M.breathe + tr.seed);
  const shift = reduce ? 0 : Math.sin(t * Math.PI * 2 / 9 + tr.seed * 2) * (1 - moving); // a slow weight shift from foot to foot
  const hunch = look.hunch, bob = moving * M.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * M.sway * Math.sin(cyc) + shift * .012;
  const workT = look.idle === 'work' && !near && !walking ? ((now / 1000) / M.hammerSec + tr.seed) % 1 : -1, strike = workT >= 0 && !reduce ? Math.max(0, Math.sin(workT * Math.PI * 2)) : 0;
  setEuler(Po, BI.base, 0, 0, 0); Po.scl[BI.base] = S; resolveBone(Po, BI.base, x, y, z);
  setEuler(Po, BI.root, yaw, 0, 0); setOffset(Po, BI.root, 0, 0, seated ? seat / S - SK.hip + .1 : 0); resolveBone(Po, BI.root);
  setOffset(Po, BI.pelvis, 0, sway, -bob - .01 - hunch * .03 - (seated ? 0 : 0)); setEuler(Po, BI.pelvis, shift * .04, hunch * .12 + moving * .04, -sway * 2 + shift * .03); resolveBone(Po, BI.pelvis);
  setEuler(Po, BI.spine, tr.look2 * .1, hunch * .45 + strike * .08, 0); resolveBone(Po, BI.spine);
  setEuler(Po, BI.chest, tr.look2 * .15 + moving * .06 * Math.sin(cyc), hunch * .3 - talk * .04, 0); Po.scl[BI.chest] = 1 + breathe * .008; resolveBone(Po, BI.chest);
  const nod = talk * .12 * (reduce ? .5 : (.6 + .4 * Math.sin(now / 160)));
  setEuler(Po, BI.neck, tr.look2 * .4, -hunch * .55 + nod * .5, 0); resolveBone(Po, BI.neck);
  setEuler(Po, BI.head, tr.look2 * .5, -hunch * .35 + nod - strike * .1, shift * .04); resolveBone(Po, BI.head);
  resolveBone(Po, BI.back); resolveBone(Po, BI.work);
  // the arms: each hand to its target in the body's frame (turned with the chest), elbows out and down
  const rootW = Po.wr, ri = BI.root * 9, fwX = rootW[ri] / S, fwY = rootW[ri + 1] / S, rtX = rootW[ri + 3] / S, rtY = rootW[ri + 4] / S, rz0 = Po.wp[BI.root * 3 + 2];
  const lean = hunch * .55; // a hunched body carries its hands forward and lower
  BF.x = x; BF.y = y; BF.z = rz0; BF.S = S; BF.fwX = fwX; BF.fwY = fwY; BF.rtX = rtX; BF.rtY = rtY; BF.hip = SK.hip; BF.cl = Math.cos(lean); BF.sl = Math.sin(lean);
  const hold = HOLD[look.held] || HOLD.none, swing = moving * M.armSwing * Math.sin(cyc);
  for (const tag of ARMS) {
    const right = tag === 'R', s = right ? 1 : -1, ai = BI['arm' + tag]; resolveBone(Po, ai); H[0] = Po.wp[ai * 3]; H[1] = Po.wp[ai * 3 + 1]; H[2] = Po.wp[ai * 3 + 2];
    let f, r, u, df, dr, du;
    if (right) {
      f = hold.hand[0]; r = hold.hand[1]; u = hold.hand[2]; df = hold.dir[0]; dr = hold.dir[1]; du = hold.dir[2]; f += (look.held === 'none' ? swing : swing * .3);
      if (seated) { f = .24; r = .1; u = .7; }
      if (look.idle === 'scheme' && !seated) { const rub = reduce ? 0 : .018 * Math.sin(now / 170 + tr.seed); f = .23; r = .035; u = .74 + rub; df = 1; dr = 0; du = .2; }
      if (talk > 0 && look.held !== 'lamp') { const wave = reduce ? 0 : .05 * Math.sin(now / 140); f = mix(f, .26, talk); r = mix(r, .2 + wave, talk); u = mix(u, .92, talk); }
      if (strike > 0 || workT >= 0) { const lift = workT >= 0 ? (reduce ? .5 : .5 + .5 * Math.cos(workT * Math.PI * 2)) : 0; f = .22; r = .18; u = .62 + lift * .3; df = .6; dr = 0; du = -1 + lift * 1.6; }
    } else {
      const oh = OFF_HAND[look.held];
      if (oh) { f = oh[0]; r = oh[1]; u = oh[2]; } else if (look.idle === 'work' && workT >= 0) { f = .2; r = -.14; u = .62; } else { f = .03 - swing; r = -.2; u = .55; }
      if (seated) { f = .24; r = -.1; u = .7; }
      if (look.idle === 'scheme' && !seated) { const rub = reduce ? 0 : .018 * Math.sin(now / 170 + tr.seed); f = .23; r = -.035; u = .74 - rub; }
      df = 1; dr = 0; du = -.1;
    }
    if (!right && look.hunch > .3 && look.back !== 'pack') { f += .04; }
    bodyPt(f, r, u, T);
    POLE[0] = -fwX * .3 + rtX * s * .7; POLE[1] = -fwY * .3 + rtY * s * .7; POLE[2] = -.5;
    solveTwoBone(H, T, SK.upperArm * S, SK.foreArm * S, POLE, Jn);
    aimWorld(Po, ai, -3, Jn[0] - H[0], Jn[1] - H[1], Jn[2] - H[2], fwX, fwY, 0); resolveBone(Po, ai);
    const fi = BI['fore' + tag]; aimWorld(Po, fi, -3, T[0] - Jn[0], T[1] - Jn[1], T[2] - Jn[2], fwX, fwY, 0); resolveBone(Po, fi);
    const hi = BI['hand' + tag]; aimWorld(Po, hi, 0, fwX, fwY, -.15, 0, 0, 1); resolveBone(Po, hi);
    const wi = BI['held' + tag]; bodyDir(df, dr * s, du, Dv); aimWorld(Po, wi, 0, Dv[0], Dv[1], Dv[2], 0, 0, 1); resolveBone(Po, wi);
  }
  // the legs: two-bone IK to the planted feet; a rider's hang either side of the saddle
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(Po, ti); H[0] = Po.wp[ti * 3]; H[1] = Po.wp[ti * 3 + 1]; H[2] = Po.wp[ti * 3 + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1], lift = tr.gait.out[side * 4 + 2], fz = z + SK.ankle * S + lift * M.footLift * S;
    if (seated) { fx = x + (fwX * .1 + rtX * sgn * .22) * S; fy = y + (fwY * .1 + rtY * sgn * .22) * S; fz = rz0 + (SK.hip - .1 - .42) * S; lift = 0; }
    else if (moving < .05) { const w = side ? Math.max(0, shift) : Math.max(0, -shift); fz += 0 * w; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    POLE[0] = fwX; POLE[1] = fwY; POLE[2] = .05;
    solveTwoBone(H, T, SK.thigh * S, SK.shin * S, POLE, Jn);
    aimWorld(Po, ti, -3, Jn[0] - H[0], Jn[1] - H[1], Jn[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(Po, ti);
    const si = BI['shin' + tag]; aimWorld(Po, si, -3, T[0] - Jn[0], T[1] - Jn[1], T[2] - Jn[2], POLE[0], POLE[1], POLE[2]); resolveBone(Po, si);
    const toe = lift > 0 ? -.35 * lift : seated ? -.4 : 0, fi = BI['foot' + tag], fyaw = yaw + sgn * .1;
    aimWorld(Po, fi, 0, Math.cos(fyaw) * Math.cos(toe), Math.sin(fyaw) * Math.cos(toe), Math.sin(toe), 0, 0, 1); resolveBone(Po, fi);
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  writeSkin(Po);
  const F = tr.frame, flick = reduce ? 1 : .86 + .1 * Math.sin(now / 130 + tr.seed) + .04 * Math.sin(now / 47 + tr.seed * 3);
  F.emitK[0] = (look.held === 'lantern' || look.held === 'lamp' || look.held === 'taper' || look.work === 'forge' || look.work === 'lampPost') ? 1.15 * flick : 0; F.emitK[1] = look.held === 'lens' ? .9 + (reduce ? 0 : .2 * Math.sin(now / 420)) : 0; F.emitK[2] = 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.folk = look.id; F.tier = env.tier || 'full'; F.mesh = folkMesh(look, F.tier); F.skin = Po.skin; F.alpha = 1; F.hit = 0;
  F.x = x; F.y = y; F.z = z; F.yaw = yaw; F.scale = S * .82; F.air = 0; F.shadow = seated ? 0 : 1; F.phase = talk > 0 ? 'talk' : walking ? 'walk' : seated ? 'ride' : workT >= 0 ? 'work' : 'idle'; F.contact = 0; F.cloud = false;
  return F;
}
export const folkBone = (tr, name) => { const i = tr.skeleton.index[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };

// ------------------------------------------------------------------------------------------------ Shale, the quarry keeper
// "A small stone turtle ... looks kind of like the mountain turtle, but smaller ... He could be wearing a hat": a shell of fitted
// stones, stubby legs, a patient head that turns to the Wayfarer, a wide-brimmed straw hat; he breathes slowly.
export const TURTLE = Object.freeze({ scale: 1.25, breatheSec: 5.6, watchRange: 3.6, colors: Object.freeze({ shell: 0x7d8780, seam: 0x4b534e, skin: 0x6f7a72, leg: 0x5d6660, hat: 0xc9a85a, band: 0x7a4a2a, eye: 0x1e2420 }) });
export const TURTLE_SKELETON = defineSkeleton([
  { name: 'base', parent: null, at: [0, 0, 0] }, { name: 'root', parent: 'base', at: [0, 0, 0] },
  { name: 'shell', parent: 'root', at: [0, 0, .1] }, { name: 'neck', parent: 'root', at: [.22, 0, .1] }, { name: 'head', parent: 'neck', at: [.1, 0, .03] },
]);
function buildTurtleMesh(tier) {
  const low = tier === 'low', B = meshBuilder(TURTLE_SKELETON, TIER_DETAIL[tier]), C = TURTLE.colors;
  B.bone('shell').color(C.shell).ellipsoid({ at: [0, 0, 0], radius: [.27, .22, .17], rings: low ? 4 : 6, seg: low ? 8 : 12 });
  B.bone('shell').color(C.seam).ellipsoid({ at: [0, 0, -.035], radius: [.285, .232, .04], rings: 2, seg: low ? 8 : 12 }); // the shell's rim
  if (!low) for (const [f, r] of [[.08, .1], [-.08, .1], [.08, -.1], [-.08, -.1], [0, 0]]) B.bone('shell').color(shade(C.shell, 1.1)).box({ at: [f, r, .135 - Math.hypot(f, r) * .35], size: [.06, .05, .025], bevel: .3 });
  for (const [f, r] of [[.15, .15], [.15, -.15], [-.14, .15], [-.14, -.15]]) B.bone('root').color(C.leg).ellipsoid({ at: [f, r, .05], radius: [.06, .05, .055], rings: 3, seg: 6 });
  B.bone('neck').color(C.skin).lathe({ at: [-.06, 0, 0], F: [1, 0, .2], rings: [[0, .05], [.12, .045]], seg: 6 });
  B.bone('head').color(C.skin).ellipsoid({ at: [.03, 0, 0], radius: [.075, .06, .055], rings: 4, seg: 8 });
  for (const s of [-1, 1]) B.bone('head').color(C.eye).box({ at: [.08, s * .04, .015], size: [.01, .008, .01], bevel: 0 });
  B.bone('head').color(C.hat).lathe({ at: [.01, 0, .045], F: [0, 0, 1], U: [1, 0, 0], rings: [[0, .16], [.01, .16], [.014, .07], [.06, .055], [.075, 0]], seg: low ? 8 : 12 });
  B.bone('head').color(C.band).lathe({ at: [.01, 0, .06], F: [0, 0, 1], U: [1, 0, 0], rings: [[0, .067], [.014, .065]], seg: low ? 8 : 12, caps: false });
  B.bone('root').color(shade(C.skin, .9)).lathe({ at: [-.24, 0, .06], F: [-1, 0, -.2], rings: [[0, .03], [.07, 0]], seg: 5 }); // the tail
  return B.done();
}
const TURTLE_MESHES = {};
export function turtleFolkMesh(tier = 'full') { return TURTLE_MESHES[tier] ||= buildTurtleMesh(tier); }
export function createTurtleFolkTrack() {
  return { turtle: true, skeleton: TURTLE_SKELETON, pose: createPose(TURTLE_SKELETON), yaw: NaN, head: 0, at: NaN,
    frame: { kind: 'folk', folk: 'shale', tier: 'full', mesh: null, skin: null, boneCount: TURTLE_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array([1, 1, 1, 1]),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: 'idle', contact: 0, cloud: false } };
}
export function sampleTurtleFolk(tr, o, env) {
  const Po = tr.pose, BI = TURTLE_SKELETON.index, now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1)) * TURTLE.scale;
  const dt = Number.isFinite(tr.at) ? Math.min(.1, Math.max(0, (now - tr.at) / 1000)) : 0; tr.at = now;
  if (!Number.isFinite(tr.yaw)) tr.yaw = 0; // he faces east, as the standard view draws him
  const tx = env.target ? env.target.x - env.x : 0, ty = env.target ? env.target.y - env.y : 0, near = !!env.target && Math.hypot(tx, ty) < TURTLE.watchRange;
  let want = 0; if (near) { const a = Math.atan2(ty, tx) - tr.yaw; want = Math.max(-1, Math.min(1, Math.atan2(Math.sin(a), Math.cos(a)))); }
  tr.head += (want - tr.head) * Math.min(1, dt * 3);
  const b = reduce ? 0 : Math.sin(now / 1000 * Math.PI * 2 / TURTLE.breatheSec);
  resetPose(Po); setEuler(Po, BI.base, 0, 0, 0); Po.scl[BI.base] = S; resolveBone(Po, BI.base, env.x, env.y, env.z);
  setEuler(Po, BI.root, tr.yaw, 0, 0); resolveBone(Po, BI.root);
  Po.scl[BI.shell] = 1 + b * .02; resolveBone(Po, BI.shell);
  setEuler(Po, BI.neck, tr.head * .5, -.05 * b, 0); setOffset(Po, BI.neck, .01 * b, 0, 0); resolveBone(Po, BI.neck);
  setEuler(Po, BI.head, tr.head * .5, .05, 0); resolveBone(Po, BI.head);
  writeSkin(Po);
  const F = tr.frame; F.tier = env.tier || 'full'; F.mesh = turtleFolkMesh(F.tier); F.skin = Po.skin; F.alpha = 1; F.x = env.x; F.y = env.y; F.z = env.z; F.yaw = tr.yaw; F.scale = S * .9;
  return F;
}
