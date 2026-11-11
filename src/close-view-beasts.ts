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
});
// Forms the body covers. Hidden, veiled, illusory, ridden or mounted states keep the billboard (their art owns them).
export function closeViewBeastEligible(e) {
  return !!e && Object.hasOwn(CLOSE_VIEW_BEASTS, e.kind) && !e.dead && e.hp > 0 && !e.hidden && !e.gloomVeil && !e.illusion
    && !e.mount && !e.astralAllyOf && !e.seaKind && !e.foundryForm && CLOSE_VIEW_BEASTS[e.kind].eligible?.(e) !== false;
}
export { BEAST_SLOT };
