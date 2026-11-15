// Picks the reader by file signature (never by running anything).
import { readFileSync } from 'node:fs';
import { readGltf } from './gltf.mjs';
import { readFbx } from './fbx.mjs';

export function loadSource(file) {
  const head = readFileSync(file).subarray(0, 20).toString('latin1');
  if (head.startsWith('Kaydara FBX Binary')) return readFbx(file);
  return readGltf(file);
}
