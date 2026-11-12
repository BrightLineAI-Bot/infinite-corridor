// The Close View beast roster (release 891): which world beasts have a skinned Close View body (close-view-beast-rig.ts),
// and when one may use it. A beast outside the roster, in a form its body does not cover, or beyond the slot's
// BEAST_SLOT.maxBeasts keeps its standard-view billboard exactly as before.
import { BEAST_SLOT } from "./close-view-beast-rig.ts";
import { createGiantTrack, sampleGiant, giantMesh, GIANT_RIG } from "./close-view-beast-giant.ts";
import { createStagTrack, sampleStag, stagMesh, STAG_RIG } from "./close-view-beast-stag.ts";
import { createTurtleTrack, sampleTurtle, turtleMesh, TURTLE_RIG } from "./close-view-beast-turtle.ts";
import { createQbTrack, sampleQb, qbMesh, QB_RIG } from "./close-view-beast-questing.ts";
import { createKnightTrack, sampleKnight, knightMesh, KNIGHT_RIG } from "./close-view-beast-knight.ts";
import { createDragonTrack, sampleDragon, tyrantMesh, doomMesh, DRAGON_RIG } from "./close-view-beast-dragon.ts";
import { createMothTrack, sampleMoth, mothMesh, MOTH_RIG } from "./close-view-beast-moth.ts";
import { createWormTrack, sampleWorm, wormMesh, WORM_RIG } from "./close-view-beast-worm.ts";
import { createCrystalTrack, sampleCrystal, crystalMesh, CRYSTAL_RIG } from "./close-view-beast-crystal.ts";
import { createBlobTrack, sampleBlob, blobMesh, BLOB_RIG } from "./close-view-beast-blob.ts";
import { createWalkerTrack, sampleWalker, walkerMesh, WALKER_RIG } from "./close-view-beast-walker.ts";
import { createStalkerTrack, sampleStalker, stalkerMesh, STALKER_RIG } from "./close-view-beast-stalker.ts";

export const CLOSE_VIEW_BEASTS = Object.freeze({
  // scale: the Close View size relative to the standard view's (a presentation table, never gameplay)
  // (read lazily: monster-pack.ts reaches close-view.ts, which loads this roster, before the beast modules finish loading)
  lightningGiant: Object.freeze({ mesh: giantMesh, createTrack: createGiantTrack, sample: sampleGiant, get scale() { return GIANT_RIG.closeViewScale; } }),
  briarStag: Object.freeze({ mesh: stagMesh, createTrack: createStagTrack, sample: sampleStag, get scale() { return STAG_RIG.closeViewScale; } }),
  mountainTurtle: Object.freeze({ mesh: turtleMesh, createTrack: createTurtleTrack, sample: sampleTurtle, get scale() { return TURTLE_RIG.closeViewScale; } }),
  questingBeast: Object.freeze({ mesh: qbMesh, createTrack: createQbTrack, sample: sampleQb, get scale() { return QB_RIG.closeViewScale; } }),
  nanobotKnight: Object.freeze({ mesh: knightMesh, createTrack: createKnightTrack, sample: sampleKnight, get scale() { return KNIGHT_RIG.closeViewScale; } }),
  // the two dragons share one body in their own art's colours
  crimsonTyrant: Object.freeze({ mesh: tyrantMesh, createTrack: () => createDragonTrack('crimsonTyrant'), sample: sampleDragon, get scale() { return DRAGON_RIG.closeViewScale; } }),
  doomChaser: Object.freeze({ mesh: doomMesh, createTrack: () => createDragonTrack('doomChaser'), sample: sampleDragon, get scale() { return DRAGON_RIG.closeViewScale; } }),
  // the Ashen Moth and its far kin the Grove Moth share one body (the standard view draws both with drawAshenMoth)
  ashenMoth: Object.freeze({ mesh: mothMesh, createTrack: createMothTrack, sample: sampleMoth, get scale() { return MOTH_RIG.closeViewScale; } }),
  groveMoth: Object.freeze({ mesh: mothMesh, createTrack: createMothTrack, sample: sampleMoth, get scale() { return MOTH_RIG.closeViewScale; } }),
  // up out of its hole only: under the ground, or about to burst up, it keeps the standard view's heaving mound
  tremorWorm: Object.freeze({ mesh: wormMesh, createTrack: createWormTrack, sample: sampleWorm, eligible: (e) => !e.untargetable, get scale() { return WORM_RIG.closeViewScale; } }),
  psychicCrystal: Object.freeze({ mesh: crystalMesh, createTrack: createCrystalTrack, sample: sampleCrystal, get scale() { return CRYSTAL_RIG.closeViewScale; } }),
  morphingBlob: Object.freeze({ mesh: blobMesh, createTrack: createBlobTrack, sample: sampleBlob, get scale() { return BLOB_RIG.closeViewScale; } }),
  // the Void Walker on land (its skiff at sea keeps the billboard)
  voidWalker: Object.freeze({ mesh: walkerMesh, createTrack: createWalkerTrack, sample: sampleWalker, get scale() { return WALKER_RIG.closeViewScale; }, eligible: (e) => !e.marine }),
  // the Stalker as the cat or the ape; the pool, the mist, the tide and its copies and decoys keep the billboard
  stalker: Object.freeze({ mesh: stalkerMesh, createTrack: createStalkerTrack, sample: sampleStalker, get scale() { return STALKER_RIG.closeViewScale; }, eligible: stalkerBodyEligible }),
});
// The Stalker's skinned body covers the cat and the ape. Its pool (a silver puddle, a mouth rising out of the floor), its mist (wisps
// wheeling round the Wayfarer) and the tide (it is the first wave) are flat or vapour art the standard view owns; the small copies and
// decoys keep their billboards too (and leave the beast slot to the Stalker itself).
export function stalkerBodyEligible(e) {
  return !e.stalkerKin && !e.stalkerDecoy && e.stalkForm !== 'pool' && e.stalkForm !== 'mist' && e.stalkAct?.kind !== 'tide';
}
// Forms the body covers. Hidden, veiled, illusory, ridden or mounted states keep the billboard (their art owns them).
export function closeViewBeastEligible(e) {
  return !!e && Object.hasOwn(CLOSE_VIEW_BEASTS, e.kind) && !e.dead && e.hp > 0 && !e.hidden && !e.gloomVeil && !e.illusion
    && !e.mount && !e.astralAllyOf && !e.seaKind && !e.foundryForm && CLOSE_VIEW_BEASTS[e.kind].eligible?.(e) !== false;
}
export { BEAST_SLOT };
