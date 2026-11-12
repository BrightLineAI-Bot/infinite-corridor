// The Close View beast roster (release 891): which world beasts have a skinned Close View body (close-view-beast-rig.ts),
// and when one may use it. A beast outside the roster, in a form its body does not cover, or beyond the slot's
// BEAST_SLOT.maxBeasts keeps its standard-view billboard exactly as before.
import { BEAST_SLOT } from "./close-view-beast-rig.js?v=r908-077da6310291";
import { createGiantTrack, sampleGiant, giantMesh, GIANT_RIG } from "./close-view-beast-giant.js?v=r908-077da6310291";
import { createStagTrack, sampleStag, stagMesh, STAG_RIG } from "./close-view-beast-stag.js?v=r908-077da6310291";
import { createTurtleTrack, sampleTurtle, turtleMesh, TURTLE_RIG } from "./close-view-beast-turtle.js?v=r908-077da6310291";
import { createQbTrack, sampleQb, qbMesh, QB_RIG } from "./close-view-beast-questing.js?v=r908-077da6310291";
import { createKnightTrack, sampleKnight, knightMesh, KNIGHT_RIG } from "./close-view-beast-knight.js?v=r908-077da6310291";

export const CLOSE_VIEW_BEASTS = Object.freeze({
  // scale: the Close View size relative to the standard view's (a presentation table, never gameplay)
  // (read lazily: monster-pack.ts reaches close-view.ts, which loads this roster, before the beast modules finish loading)
  lightningGiant: Object.freeze({ mesh: giantMesh, createTrack: createGiantTrack, sample: sampleGiant, get scale() { return GIANT_RIG.closeViewScale; } }),
  briarStag: Object.freeze({ mesh: stagMesh, createTrack: createStagTrack, sample: sampleStag, get scale() { return STAG_RIG.closeViewScale; } }),
  mountainTurtle: Object.freeze({ mesh: turtleMesh, createTrack: createTurtleTrack, sample: sampleTurtle, get scale() { return TURTLE_RIG.closeViewScale; } }),
  questingBeast: Object.freeze({ mesh: qbMesh, createTrack: createQbTrack, sample: sampleQb, get scale() { return QB_RIG.closeViewScale; } }),
  nanobotKnight: Object.freeze({ mesh: knightMesh, createTrack: createKnightTrack, sample: sampleKnight, get scale() { return KNIGHT_RIG.closeViewScale; } }),
});
// Forms the body covers. Hidden, veiled, illusory, ridden or mounted states keep the billboard (their art owns them).
export function closeViewBeastEligible(e) {
  return !!e && Object.hasOwn(CLOSE_VIEW_BEASTS, e.kind) && !e.dead && e.hp > 0 && !e.hidden && !e.gloomVeil && !e.illusion
    && !e.mount && !e.astralAllyOf && !e.seaKind && !e.foundryForm;
}
export { BEAST_SLOT };
