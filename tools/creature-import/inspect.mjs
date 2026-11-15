// Inspect source models without executing anything in them: triangles, bones, clips (name and seconds), materials, textures.
// Usage: node tools/creature-import/inspect.mjs <file.gltf|file.glb|file.fbx>... [--md]
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadSource } from './source.mjs';

const args = process.argv.slice(2), md = args.includes('--md'), files = args.filter(a => a !== '--md');
if (md) console.log('| file | format | tris | bones | clips (s) | materials | textures | sha256 |\n|---|---|---|---|---|---|---|---|');
for (const f of files) {
  try {
    const rig = loadSource(f);
    const tris = rig.meshes.reduce((n, m) => n + m.indices.length / 3, 0);
    const clips = rig.clips.map(c => `${c.name} ${c.duration.toFixed(2)}`).join(', ');
    const mats = rig.materials.map(m => m.name).join(', ');
    const sha = createHash('sha256').update(readFileSync(f)).digest('hex');
    if (md) console.log(`| ${basename(f)} | ${rig.format} | ${tris} | ${rig.joints.length} | ${clips} | ${rig.materials.length} (${mats}) | ${rig.textures} | ${sha.slice(0, 16)} |`);
    else console.log(JSON.stringify({ file: basename(f), format: rig.format, tris, bones: rig.joints.length, clips, materials: rig.materials.length, textures: rig.textures, up: rig.upAxis, sha256: sha }));
  } catch (e) { console.log(`| ${basename(f)} | error: ${e.message} |`); }
}
