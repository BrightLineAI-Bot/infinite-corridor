// Pose evaluation for the importer's normalized rig (glTF or FBX source): node TRS tracks, world matrices, skin matrices.
import { compose, mul, invert, ident, slerp } from './math.mjs';

function sampleTrack(ch, t) {
  const { times, values } = ch, w = ch.path === 'rotation' ? 4 : 3, cubic = ch.interp === 'CUBICSPLINE', n = times.length;
  const at = (k) => { const o = cubic ? (k * 3 + 1) * w : k * w; return Array.from(values.subarray(o, o + w)); };
  if (t <= times[0] || n === 1) return at(0);
  if (t >= times[n - 1]) return at(n - 1);
  let k = 0;
  while (k < n - 2 && times[k + 1] < t) k++;
  const a = at(k), b = at(k + 1);
  if (ch.interp === 'STEP') return a;
  const u = (t - times[k]) / (times[k + 1] - times[k] || 1);
  return w === 4 ? slerp(a, b, u) : a.map((v, i) => v + (b[i] - v) * u);
}

// Local TRS of every node at time t of a clip (null clip: the rest pose).
export function localPose(rig, clip, t) {
  const pose = rig.nodes.map(n => ({ t: [...n.t], r: [...n.r], s: [...n.s] }));
  if (clip) for (const ch of clip.channels) {
    const v = sampleTrack(ch, t), p = pose[ch.node];
    if (ch.path === 'translation') p.t = v; else if (ch.path === 'rotation') p.r = v; else p.s = v;
  }
  return pose;
}

export function worldMatrices(rig, pose) {
  const n = rig.nodes.length, world = new Array(n), done = new Uint8Array(n);
  const visit = (i) => {
    if (done[i]) return world[i];
    const p = pose[i], local = rig.nodes[i].matrix ? rig.nodes[i].matrix(p) : compose(p.t, p.r, p.s);
    const par = rig.nodes[i].parent;
    world[i] = par >= 0 ? mul(visit(par), local) : local;
    done[i] = 1;
    return world[i];
  };
  for (let i = 0; i < n; i++) visit(i);
  return world;
}

// The node a mesh's rigid (unskinned) geometry follows: itself.
// For a skinned primitive, joint k's skin matrix is world(joint) * inverseBind(k).
export function skinMatrix(mesh, world, k) {
  return mul(world[mesh.jointNodes[k]], mesh.inverseBind.subarray(k * 16, k * 16 + 16));
}

export function restWorld(rig) { return worldMatrices(rig, localPose(rig, null, 0)); }
export { ident, invert, mul };
