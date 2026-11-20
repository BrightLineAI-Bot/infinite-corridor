// Dependency-free, bake-once primitives for Close View actors. Raw meshes are position, normal, RGB.
export const MESH_FLOATS = 9;

export function prism(sides, taper = 1) {
  const low = [], high = [], faces = [];
  for (let i = 0; i < sides; i++) {
    const a = (i + .5) * 2 * Math.PI / sides;
    low.push([Math.cos(a), Math.sin(a), -1]);
    high.push([Math.cos(a) * taper, Math.sin(a) * taper, 1]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([low[i], low[j], high[j]], [low[i], high[j], high[i]]);
  }
  for (let i = 1; i < sides - 1; i++) faces.push([low[0], low[i + 1], low[i]], [high[0], high[i], high[i + 1]]);
  return faces;
}

export function ellipsoid(sides = 8, bands = 3) {
  const rings = [];
  for (let j = 1; j <= bands; j++) { const a = -Math.PI / 2 + j * Math.PI / (bands + 1); rings.push(Array.from({length:sides},(_,i)=>{const p=(i+.5)*Math.PI*2/sides;return [Math.cos(a)*Math.cos(p),Math.cos(a)*Math.sin(p),Math.sin(a)];})); }
  const faces=[], bottom=[0,0,-1], top=[0,0,1];
  for(let i=0;i<sides;i++){const k=(i+1)%sides;faces.push([bottom,rings[0][k],rings[0][i]]);for(let r=0;r<rings.length-1;r++)faces.push([rings[r][i],rings[r][k],rings[r+1][k]],[rings[r][i],rings[r+1][k],rings[r+1][i]]);faces.push([top,rings.at(-1)[i],rings.at(-1)[k]]);}
  return faces;
}

// Rings are [forward, radius, height]. A zero-radius endpoint produces a pointed cap.
export function ringLoft(rings, sides = 8) {
  const vertices = rings.map(([x, radius, z]) => Array.from({ length: sides }, (_, i) => {
    const a = (i + .5) * Math.PI * 2 / sides;
    return [x, Math.cos(a) * radius, z + Math.sin(a) * radius];
  })), faces = [];
  for (let r = 0; r < vertices.length - 1; r++) for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, a = vertices[r][i], b = vertices[r][j], c = vertices[r + 1][j], d = vertices[r + 1][i];
    faces.push([a, b, c], [a, c, d]);
  }
  return faces;
}

// Upright loft. Rings remain [forward offset, radius, height], but each cross-section lies in XY at Z.
// Keep ringLoft as the X-axis primitive for crawlers, muzzles, ribs and other deliberately horizontal forms.
export function verticalLoft(rings, sides = 8) {
  const vertices = rings.map(([x, radius, z]) => Array.from({ length: sides }, (_, i) => {
    const a = (i + .5) * Math.PI * 2 / sides;
    return [x + Math.cos(a) * radius, Math.sin(a) * radius, z];
  })), faces = [];
  for (let r = 0; r < vertices.length - 1; r++) for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, a = vertices[r][i], b = vertices[r][j], c = vertices[r + 1][j], d = vertices[r + 1][i];
    faces.push([a, b, c], [a, c, d]);
  }
  return faces;
}

// Curved, tapered tube along a short authored path. Parallel-transported rings stay perpendicular
// to the path while preserving the original Y/Z ring orientation for a straight +X tube.
export function curvedTube(points, sides = 5) {
  const path = points.filter((point, i) => !i || point.some((value, q) => value !== points[i - 1][q]));
  const unit = v => { const length = Math.hypot(...v); return length > 1e-9 ? v.map(q => q / length) : [1, 0, 0]; };
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const tangents = path.map((point, i) => {
    let low = i - 1, high = i + 1;
    while (low >= 0 && Math.hypot(path[low][0]-point[0],path[low][1]-point[1],path[low][2]-point[2]) < 1e-9) low--;
    while (high < path.length && Math.hypot(path[high][0]-point[0],path[high][1]-point[1],path[high][2]-point[2]) < 1e-9) high++;
    const a = low >= 0 ? path[low] : point, b = high < path.length ? path[high] : point;
    return unit([b[0]-a[0], b[1]-a[1], b[2]-a[2]]);
  });
  let normal = [0, 1, 0];
  const frames = tangents.map(tangent => {
    let projected = normal.map((q, i) => q - tangent[i] * dot(normal, tangent));
    if (Math.hypot(...projected) < 1e-7) {
      const seed = Math.abs(tangent[1]) < .9 ? [0,1,0] : [1,0,0];
      projected = seed.map((q, i) => q - tangent[i] * dot(seed, tangent));
    }
    normal = unit(projected);
    return [normal, unit(cross(tangent, normal))];
  });
  const rings = path.map(([x, y, z, radius], r) => Array.from({ length: sides }, (_, i) => {
    const a = (i + .5) * Math.PI * 2 / sides, [n, b] = frames[r];
    return [x + (Math.cos(a)*n[0]+Math.sin(a)*b[0])*radius,
      y + (Math.cos(a)*n[1]+Math.sin(a)*b[1])*radius,
      z + (Math.cos(a)*n[2]+Math.sin(a)*b[2])*radius];
  })), faces = [];
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([rings[r][i], rings[r][j], rings[r + 1][j]], [rings[r][i], rings[r + 1][j], rings[r + 1][i]]);
  }
  return faces;
}

// Thin authored wing or cloth strip, double-sided so it remains visible through a turn or dive.
export function membrane(points) {
  const faces = [];
  for (let i = 1; i < points.length - 1; i++) faces.push([points[0], points[i], points[i + 1]], [points[0], points[i + 1], points[i]]);
  return faces;
}

export const box = prism(4), bevel = prism(6, .81), flare = prism(6, 1.45), taper = prism(4, .18);
export const square = Math.SQRT2;

export function part(shape, x, y, z, sx, sy, sz, color, swing = 0, px = x, pz = z, rest = 0, smooth = false) {
  const mesh = new Float32Array(shape.length * 3 * MESH_FLOATS), cos = Math.cos(rest), sin = Math.sin(rest);
  let k = 0;
  for (const triangle of shape) {
    const points = triangle.map(([u, v, w]) => [x + u * sx, y + v * sy, z + w * sz]);
    const [a, b, c] = points, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const flat = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    for (let n = 0; n < 3; n++) {
      const [u, v, w] = points[n], local = triangle[n];
      let nx = flat[0], ny = flat[1], nz = flat[2];
      if (smooth) { nx = local[0] / Math.max(.0001, Math.abs(sx)); ny = local[1] / Math.max(.0001, Math.abs(sy)); nz = local[2] / Math.max(.0001, Math.abs(sz)); if (Math.hypot(nx,ny,nz) < .0001) [nx,ny,nz] = flat; }
      const length = Math.hypot(nx, ny, nz) || 1;
      mesh[k++] = (u - px) * cos + (w - pz) * sin; mesh[k++] = v; mesh[k++] = (w - pz) * cos - (u - px) * sin;
      mesh[k++] = (nx * cos + nz * sin) / length; mesh[k++] = ny / length; mesh[k++] = (nz * cos - nx * sin) / length;
      mesh[k++] = (color >> 16) / 255; mesh[k++] = ((color >> 8) & 255) / 255; mesh[k++] = (color & 255) / 255;
    }
  }
  return { mesh, swing, px, pz };
}

export function block(x, y, z, sx, sy, sz, color, swing, px, pz, rest) {
  return part(box, x, y, z, sx * square, sy * square, sz, color, swing, px, pz, rest);
}
