# Imported Wayfarer contract v2

Owner direction: Rogue body/rig, central Cleric silver-masked white-haired head instead of hood, adult proportions, existing Wayfarer green/gray/leather/bronze palette, protective flexible fantasy suit, no cape required. Source archives and hashes are in provenance.json. No runtime weapons from the source packs.

## Converter ownership and output

Converter lives here as convert.mjs, outside the protected scripts/ workflow directory. Use only Node built-ins; gunzip source archives, verify original SHA-256, decode glTF accessors. Emit assets/wayfarer/rogue-v2.json, rogue-v2.bin, rogue-body.png, cleric-head.png. Preserve both original1024-square body PNGs byte for byte, not the dagger textures. No atlas or raster recolor.

Rogue extraction: body node39/mesh0; retain rigid nodes0,10,25,26,35; exclude original Face node2 and dagger node15. Remove exactly144 body triangles whose maximum source-mesh vertex Y is greater than2.0. Position-weld only for topology inspection: removed hood creates one six-edge collar boundary, bounds X[-.164792,.164792],Y[1.958049,1.997361],Z[-.238973,.114702]. Every removed triangle has maximum Head influence>=.7946; retained body maxHead<=.2281. Preserve shading/UV seams and all actual source coordinates/weights. Seal the six-edge collar with a6-triangle center fan: duplicate boundary vertices with identical positions/weights; center averages positions and normalized influences. Dark lining palette class. Do not weld the rendered mesh.

Cleric extraction: complete rigid Head mesh node1/mesh1, parent Head joint2;1816triangles/2254vertices. Import only this mesh, original local TRS and its body texture. Append new node41 parented to Rogue Head node3, retaining Cleric mesh-node local transform. Rogue animation alone drives the hybrid. Original hybrid3136triangles, plus four derived lens triangles =3140 before gear; ceiling3328body+256gear, only actual normalplayer. All other model caps unchanged.

## JSON schema

Metadata contains version:2, sources:[{id,sha256,license:"CC0-1.0"}], binary:"rogue-v2.bin", textures:[{layer:0|1,file,width:1024,height:1024,sha256}], vertexCount,indexCount, and arrays:{key:{byteOffset,count,componentType:"f32"|"u16"|"u8"}}. Count is scalar components; views4-byte aligned.

nodes:[{name,parent,translation:[3],rotation:[4 xyzw],scale:[3]}] preserves original Rogue node indices/hierarchy, parent-1 at roots, plus node41. skins:[{joints:[original node indices],inverseBindMatrices:arrayKey}]. meshes:[{name,node,skin:-1 for rigid or skinIndex,firstVertex,vertexCount,firstIndex,indexCount,materialLayer:0|1,paletteClass:"source"|"wayfarer-body"|"collar-seal"|"warm-amber-eyes"}].

clips:[{name,duration seconds,channels:[{node,path:"translation"|"rotation"|"scale",times:arrayKey,values:arrayKey,interpolation:"LINEAR"}]}] preserves all12 Rogue clips and local TRS. Retain all original transforms/joints initially; never rebuild feet under lower legs or discard foot translations. Constant-track optimization is optional only if constant values remain represented.

Required flat arrays: positions f32x3, normals f32x3, uvs f32x2, joints u16x4 (indices into skin joint list), weights f32x4 (zero for rigid), indices u16 globally rebased; materialLayers u8 and paletteClasses u8 per vertex. Palette IDs: source0,wayfarer-body1,collar-seal2,protected-region3,amber-lens4. Protected forearm/hand triangles require every source vertex to have summed influence >=.5 from source joint nodes {11,7,6,5,9,8,21,18,17,14,20,19}; split vertices at class boundaries to keep all triangles flat. Final 3583 referenced vertices,3140triangles; original texture bytes are unchanged. Every triangle has one layer/class. Preserve UVs, source inverse-bind column-major matrices and all tracks as additional referenced views.

sockets:{right:{node:16},left:{node:6}}; reference:{clip:"Idle",time:0,headNode:3,bodyNode:33,rootNode:38}. headAttachment:{node:41,parent:3,source:"cleric",sourceNode:1,defaultScale:.40,seatOverlap:.01,collarVertexIndices:[six retained boundary vertices]}. derivatives:{removedRogueHoodTriangles:[original triangle indices],collarSealFirstIndex,collarSealIndexCount:18}.

## Runtime ownership and fixed APIs

Runtime implementer owns src/close-view-hero.ts, src/close-view-hero-gl.ts, close-view-gl.ts and held-gear helper in close-view-models.ts. Parent owns close-view.ts admission/input hookup, build/SW lists and release docs. Converter does not import runtime code.

Exports: loadCloseViewHero():Promise<asset|null>; createHeroPoseState(asset); createHeroFrame(asset); sampleCloseViewHero(asset,state,input,out):boolean. Provide a readiness accessor and explicit pure decode helper for local-file tests so Node tests never initiate network loads.

Input:{nowMs,reducedMotion,x,y,groundZ,liftZ,yaw,height,speed,gaitPhase,action:null|{kind,profile,phase,durationMs,yaw},alpha,tint:[3],hitFlash}. Existing accepted gameplay clocks own action phases. Kinds: melee,ranged,cast,dodge,jump,hit,death,interact. Runtime owns source clip/contact-marker mapping, bounded blends and explicit missing-clip skeletal pose layers; animation triggers no simulation events. Unknown profiles stay neutral. Preserve pause/reload phase.

Reusable frame:{asset,positionsNormals:Float32Array(world pos3+normal3),vertexCount,indexCount,alpha,tint:Float32Array3,hitFlash,leftSocket:Float32Array16,rightSocket:Float32Array16,ready}. UV/layer/class and indices are static. Skin indexed unique vertices once; no per-frame object/array creation. Actual normalplayer only, one existing actor slot; forms/clones retain current route. Gear-only writer emits existing10-float procedural heldparts from final socket matrices, never a second body and never changes projectile physics/aim.

Head world=rogueHeadWorld * translate(seatOffset) * scale(.40) * clericHeadMeshLocal. Apply scaling to attachment41 only, not Rogue Head/collar. Calculate seatOffset once from modified Idle0 reference: skin collar six points, compute head minimum, seat head bottom at lowest collar-.01 by solving along Rogue Head global Y axis; X/Z offsets0. Constant whole-character normalization and ground offset from seated hybrid reference, never per-frame bounds. Art preview must validate proportions/seam before acceptance.

Roll horizontal compensation=-(BodyGlobal(phase).xz-BodyGlobal(rollStart).xz), blended with roll visual blend weight; apply equally to all vertices/sockets. Preserve all local Body/Hips/foot articulation. No global vertical compensation; gameplay lift applied once. Other attacks/gaits retain source articulation.

## Hero GL path

drawSceneGL(ground,U,models=null,hero=null). Hero-only indexed VAO/program; dynamicpos/normal6floats, staticUV/layer/class buffer; one sampler2DArray of two original1024 RGBA8 layers with mipmaps/source wrapping. ~8MiBbase/~10.67MiBwithmips, explicit cost. Ordinary model10-float layout unchanged. Upload static data once/context, recover on context restoration. Palette body-only: preserve texture detail, map red fabric to Wayfarer anchors #64786b/#303934/#28312e/#46594c with leather#67533b/bronze#bf9a64; preserve source silvermask/whitehair layer1. Protect leather/metal distinctions; source exposed-skin areas may use explicit glove/suit region classification. No global red/brown recolor.

Ordering: board silhouettes; ordinary model AND hero silhouettes GREATER/no depth writes; ordinary model AND hero bodies LEQUAL/depth writes; board bodies/effects. Same coverage in both hero draws. Exactly2additionaldrawcalls, no new framebuffer/pass. Preserve projection/fog/grade/status/hitflash/silhouette conventions and source-unlit baked material treatment. Unavailable data/texture/context retains existing working presentation; suppress source body only after a valid ready frame exists.

## Verification

Converter checks source hashes, selected counts, exact144hood removal/six-edge seam/3140triangles, normalized finite weights, legal indices, source clips/hierarchy/foot translations, original texture hashes, deterministic outputs. Runtime checks finite correct skin/rigid transforms, head seating/proportions, sockets, source phase/contact retiming, shared roll compensation, pause/reload, missing-profile fallback, bounded uploads/caps, context/offline fallback. Hosted/source art views must distinguish actual observations from automated checks. Physical-phone FPS remains unmeasured.


## Final proportion and eye derivatives

Runtime fits the bind frame to .80 width/.82 depth with unchanged vertical height, coherent rest pivots/inverse binds and source animation translation deltas. Wrist/palm and sibling thumb roots scale to .62; normalized gear socket axes preserve actual equipped-tool size. Original source data/archives/textures remain exact. The original white eye slits are mask apertures showing hair: every source head triangle remains class0. Two derived rigid head41-local lens quads (4triangles/8vertices), centered at (-.1485,-.218,.515) and (.1327,-.218,.515), size .14 by .06, use class4 warm amber. Front/quarter/side CPU diagnostics verify aperture fill without recoloring mask/hair. World-normal/eye dot product culls lens backs in existing passes. Final3583vertices/3140triangles,85992dynamicbytes/frame; fitted state adds about177KB once. No new GPU pass, texture or per-frame allocation.
