import { LIFT_PER_LEVEL } from './landscape.ts';

// Read accepted runtime state only. Rendering never advances or reconstructs its clock.
export function galleryLiftRenderState(game) {
  const q = game.scratchGalleryLift;
  return q && q.map === game.map && [q.pose.x, q.pose.y, q.pose.elevation].every(Number.isFinite) ? q : null;
}
export function galleryLiftSupportZ(game) {
  const q = galleryLiftRenderState(game);
  return q?.rider ? q.pose.elevation * LIFT_PER_LEVEL : undefined;
}

export const GALLERY_DECK_FLOATS = 36 * 10;
// One opaque box, twelve triangles, in the existing dynamic native-model batch.
const faces = [
  [[0,0,1],[1,0,1],[1,1,1],[0,1,1],0,0,1],
  [[0,1,0],[1,1,0],[1,0,0],[0,0,0],0,0,-1],
  [[0,0,0],[1,0,0],[1,0,1],[0,0,1],0,-1,0],
  [[1,1,0],[0,1,0],[0,1,1],[1,1,1],0,1,0],
  [[0,1,0],[0,0,0],[0,0,1],[0,1,1],-1,0,0],
  [[1,0,0],[1,1,0],[1,1,1],[1,0,1],1,0,0],
];
const triangles = [0,1,2,0,2,3];
export function writeGalleryLiftDeck(out, offset, game) {
  const q = galleryLiftRenderState(game);
  if (!q || offset + GALLERY_DECK_FLOATS > out.length) return offset;
  const x = q.pose.x + .5, y = q.pose.y + .75, top = q.pose.elevation * LIFT_PER_LEVEL;
  const { halfWidth: w, halfDepth: d } = q.track.deck;
  for (const face of faces) for (const index of triangles) {
    const v = face[index];
    out[offset++] = x + (v[0] * 2 - 1) * w;
    out[offset++] = y + (v[1] * 2 - 1) * d;
    out[offset++] = top - (1 - v[2]) * .12;
    out[offset++] = face[4]; out[offset++] = face[5]; out[offset++] = face[6];
    out[offset++] = .66; out[offset++] = .47; out[offset++] = .23; out[offset++] = 1;
  }
  return offset;
}
