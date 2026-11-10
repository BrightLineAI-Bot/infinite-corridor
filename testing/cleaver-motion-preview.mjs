// Offline CPU projection diagnostic, not a game/GPU visual acceptance harness.
// node testing/cleaver-motion-preview.mjs <absolute-output.html>
import fs from 'node:fs';
import path from 'node:path';
import { acceptCleaverChoreography, sampleCleaverChoreography } from '../src/action-motion.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewHeroGear } from '../src/close-view-models.ts';

const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw new Error('Supply an absolute output HTML path');
const bytes = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url))),
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const state = createHeroPoseState(asset), frame = createHeroFrame(asset), gear = new Float32Array(7680);
const records = [];
for (let step = 1; step <= 4; step++) {
  const at = 1000 + (step - 1) * 420;
  records.push({ weaponKind: 'verge-cleaver', primaryMotion: { v: 2, step },
    meleeAction: { v: 1, kind: 'verge-cleaver', move: 'cleaver', contactMs: 75, durationMs: 360 },
    cleaverChoreography: { ...acceptCleaverChoreography(records.at(-1), at), contactLogicalMs: at + 75 } });
}
const encoded = [], encode = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
let indices;
for (let n = 0; n <= 63; n++) {
  const elapsed = n * 1000 / 30, r = records[Math.min(3, Math.floor(elapsed / 420))];
  sampleCloseViewHero(asset, state, { nowMs: 1000 + elapsed, x: 0, y: 0, groundZ: 0, liftZ: 0,
    yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: 'verge-cleaver', handProfile: 'verge-cleaver',
    cleaverFrame: sampleCleaverChoreography(r, 1000 + elapsed) }, frame);
  const end = writeCloseViewHeroGear(gear, 0, { profile: 'verge-cleaver', primaryStage: { kind: 'cleaver-four', step: r.primaryMotion.step },
    leftSocket: frame.leftSocket, rightSocket: frame.rightSocket });
  const vertexCount = frame.positionsNormals.length / 6, p = new Float32Array(vertexCount * 3 + end / 10 * 3);
  for (let v = 0; v < vertexCount; v++) p.set(frame.positionsNormals.subarray(v * 6, v * 6 + 3), v * 3);
  for (let v = 0; v < end / 10; v++) p.set(gear.subarray(v * 10, v * 10 + 3), (vertexCount + v) * 3);
  if (!indices) indices = new Uint32Array([...asset.arrays.indices, ...Array.from({ length: end / 10 }, (_, i) => vertexCount + i)]);
  encoded.push(encode(p));
}
fs.writeFileSync(output, `<!doctype html><meta charset="utf-8"><title>Cleaver offline motion diagnostic</title>
<style>body{margin:24px;background:#171b20;color:#e0e5e9;font:16px system-ui}canvas{background:#232b32;width:min(100%,900px)}button,select,input{margin:10px;font:inherit}p{max-width:900px}</style>
<h1>Cleaver: offline motion diagnostic</h1><p>Actual imported rig and held gladius, sampled at 30 Hz. Untextured CPU projection; this does not certify hosted GPU appearance or phone performance. Four accepted cuts 420 ms apart, unchanged 75 ms contact.</p>
<button id="play">Pause</button><select id="speed"><option value="1">Normal speed (1×)</option><option value=".25">Slow (¼×)</option></select>
<input id="scrub" type="range" min="0" max="2100" value="0"><span id="label"></span><br><canvas id="view" width="900" height="630"></canvas>
<script>
const decode=(s,T)=>{const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new T(b.buffer)};
const frames=${JSON.stringify(encoded)}.map(s=>decode(s,Float32Array)),indices=decode('${encode(indices)}',Uint32Array),bodyIndices=${asset.arrays.indices.length};
const c=document.querySelector('#view'),ctx=c.getContext('2d'),button=document.querySelector('#play'),scrub=document.querySelector('#scrub'),speed=document.querySelector('#speed'),label=document.querySelector('#label');
let playing=true,t=0,last=performance.now();button.onclick=()=>{playing=!playing;button.textContent=playing?'Pause':'Play'};
scrub.oninput=()=>{t=Number(scrub.value);playing=false;button.textContent='Play'};
function draw(angle,center,p){const cs=Math.cos(angle),sn=Math.sin(angle),points=[];
for(let i=0;i<p.length;i+=3)points.push([center+(p[i]*sn+p[i+1]*cs)*230,520-p[i+2]*230, p[i]*cs-p[i+1]*sn]);
const tris=[];for(let i=0;i<indices.length;i+=3){const a=points[indices[i]],b=points[indices[i+1]],d=points[indices[i+2]];tris.push({a,b,d,z:(a[2]+b[2]+d[2])/3,gear:i>=bodyIndices})}tris.sort((a,b)=>a.z-b.z);
for(const q of tris){ctx.beginPath();ctx.moveTo(q.a[0],q.a[1]);ctx.lineTo(q.b[0],q.b[1]);ctx.lineTo(q.d[0],q.d[1]);ctx.closePath();const shade=Math.round(55+Math.max(0,Math.min(1,(q.z+1)/2))*65);ctx.fillStyle=q.gear?'#b38b65':'rgb('+shade+','+(shade+12)+','+(shade+8)+')';ctx.fill();ctx.strokeStyle='#242b2b33';ctx.lineWidth=.3;ctx.stroke()}}
function loop(now){if(playing)t=(t+(now-last)*Number(speed.value))%2100;last=now;scrub.value=t;ctx.clearRect(0,0,900,630);const f=frames[Math.min(frames.length-1,Math.floor(t*30/1000))];draw(.8,245,f);draw(2.9,680,f);label.textContent=Math.round(t)+' ms · cut '+Math.min(4,1+Math.floor(t/420));ctx.fillStyle='#c6d0d7';ctx.font='16px system-ui';ctx.fillText('Quarter view',190,600);ctx.fillText('Opposite quarter',615,600);requestAnimationFrame(loop)}requestAnimationFrame(loop);
</script>`);
console.log(JSON.stringify({ output, frames: encoded.length, sampleHz: 30, durationMs: 2100, bytes: fs.statSync(output).size,
  note: 'Generated only; open and inspect before claiming visual acceptance.' }));
