// One indexed hero, sharing the scene's two actor phases. Ordinary model buffers are untouched.
export const HERO_VERTEX_BODY = `
in vec3 a_pos; in vec3 a_nrm; in vec2 a_uv; in float a_layer; in float a_class;
out vec3 v_pos; out vec3 v_nrm; out vec2 v_uv; out float v_depth;
flat out int v_layer; flat out int v_class;
void main() { float d; gl_Position=project(a_pos,d); v_depth=d; v_pos=a_pos; v_nrm=a_nrm; v_uv=a_uv; v_layer=int(a_layer+.5); v_class=int(a_class+.5); }
`;
export const HERO_FRAGMENT_BODY = `
precision highp sampler2DArray;
in vec3 v_pos; in vec3 v_nrm; in vec2 v_uv; in float v_depth;
flat in int v_layer; flat in int v_class;
uniform sampler2DArray u_hero; uniform float u_pass; uniform float u_alpha;
uniform vec3 u_tint; uniform float u_hit; uniform vec3 u_sil;
vec3 wayfarerPalette(vec3 c) {
  // Only the two added aperture lenses: all original mask/hair triangles remain source-painted.
  if (v_class==4) return vec3(.952941,.647059,.360784)*clamp(dot(c,vec3(.2126,.7152,.0722))/.7,0.0,1.0);
  if (v_layer==1 || v_class==0) return c; // silver mask and white hair remain source-painted
  if (v_class==2) return vec3(.157,.192,.180); // bounded derivative collar seal
  // Red fabric has nearly equal green/blue channels; warm leather, skin and bronze do not.
  // Relative chroma keeps the same hue selection in the source's painted shadows.
  float red=smoothstep(.18,.38,(c.r-max(c.g,c.b))/max(c.r,.01))*(1.0-smoothstep(.18,.45,abs(c.g-c.b)/max(max(c.g,c.b),.015)));
  float luminance=dot(c,vec3(.2126,.7152,.0722));
  vec3 fabric=mix(vec3(.157,.192,.180),vec3(.392,.471,.420),smoothstep(.08,.42,luminance));
  fabric*=clamp(luminance/.19,.20,1.65);
  vec3 result=mix(c,fabric,red);
  if(v_class==3) { // Offline forearm/hand region only; rigid leather/bronze is excluded.
    float skin=smoothstep(.05,.16,c.r-c.g)*smoothstep(.035,.12,c.g-c.b);
    result=mix(result,vec3(.188,.224,.204)*clamp(luminance*2.5,.35,1.4),skin);
  }
  return result;
}
void main() {
  if(v_pos.z<0.0) discard;
  // Back faces of the added lenses must not shine through the source's open hair geometry.
  // Use the actual surface/view direction rather than the scene projection's winding convention.
  if(v_class==4 && dot(v_nrm,u_eye-v_pos)<=0.0) discard;
  const float bayer[16]=float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
  ivec2 pixel=ivec2(gl_FragCoord.xy)&ivec2(3);
  if(u_alpha <= (bayer[pixel.y*4+pixel.x]+.5)/16.0) discard;
  if(u_pass>.5) { outColor=vec4(u_sil*.1,.1); return; }
  vec3 c=wayfarerPalette(texture(u_hero,vec3(v_uv,float(v_layer))).rgb)*u_tint;
  c=mix(c,vec3(.96,.34,.23),clamp(u_hit,0.0,1.0)*.6);
  vec3 dif,spe; lightsAt(v_pos,normalize(v_nrm),0.0,dif,spe);
  // Source is unlit with painted shading. Broad scene exposure, no second specular highlight.
  c*=max(vec3(.55),mix(vec3(1.0),dif,.35));
  outColor=vec4(finish(atmos(c,v_pos,v_depth,dif)),1.0);
}
`;
export function createHeroGL(gl, compile, vertexCommon, fragmentCommon) {
  return { program: compile(gl, vertexCommon + HERO_VERTEX_BODY, fragmentCommon + HERO_FRAGMENT_BODY), asset: null, vao: null, dynamic: null, static: null, indices: null, texture: null, ready: false, failed: false, uploadBytes: 0 };
}
export function disposeHeroGL(gl, s, destroyProgram = false) {
  if (!s) return;
  for (const b of [s.dynamic,s.static,s.indices]) if(b) gl.deleteBuffer(b);
  if(s.vao) gl.deleteVertexArray(s.vao); if(s.texture) gl.deleteTexture(s.texture);
  if(destroyProgram&&s.program?.p)gl.deleteProgram(s.program.p);
  s.asset=null; s.ready=false; s.dynamic=s.static=s.indices=s.vao=s.texture=null;
}
export function prepareHeroGL(gl, s, asset) {
  if (!s || s.failed || !asset || gl.isContextLost?.()) return false;
  if (s.asset === asset && s.ready) return true;
  if (asset.images?.length !== 2 || asset.images.some(i => !i || i.width !== 1024 || i.height !== 1024)) return false;
  try {
    disposeHeroGL(gl,s);
    s.vao=gl.createVertexArray(); s.dynamic=gl.createBuffer(); s.static=gl.createBuffer(); s.indices=gl.createBuffer(); s.texture=gl.createTexture();
    if(!s.vao||!s.dynamic||!s.static||!s.indices||!s.texture) throw new Error('Hero GL resources');
    gl.bindVertexArray(s.vao); const a=s.program.A;
    gl.bindBuffer(gl.ARRAY_BUFFER,s.dynamic); gl.bufferData(gl.ARRAY_BUFFER,asset.vertexCount*6*4,gl.DYNAMIC_DRAW);
    const attr=(name,size,stride,offset)=>{const k=a[name]; if(k!==undefined&&k>=0){gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,size,gl.FLOAT,false,stride,offset);}};
    attr('a_pos',3,24,0); attr('a_nrm',3,24,12);
    const data=new Float32Array(asset.vertexCount*4);
    for(let i=0;i<asset.vertexCount;i++){data[i*4]=asset.arrays.uvs[i*2];data[i*4+1]=asset.arrays.uvs[i*2+1];data[i*4+2]=asset.arrays.materialLayers[i];data[i*4+3]=asset.arrays.paletteClasses[i];}
    gl.bindBuffer(gl.ARRAY_BUFFER,s.static);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);attr('a_uv',2,16,0);attr('a_layer',1,16,8);attr('a_class',1,16,12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,asset.arrays.indices,gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,s.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY,11,gl.RGBA8,1024,1024,2);
    for(let layer=0;layer<2;layer++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,1024,1024,1,gl.RGBA,gl.UNSIGNED_BYTE,asset.images[layer]);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    if (typeof gl.getError==='function') { const error=gl.getError(); if(typeof error==='number'&&error!==gl.NO_ERROR) throw new Error('Hero GL upload'); }
    s.asset=asset;s.ready=true;s.uploadBytes=asset.vertexCount*24;
    return true;
  } catch { disposeHeroGL(gl,s);s.failed=true;return false; }
  finally { gl.bindVertexArray(null);gl.activeTexture(gl.TEXTURE0); }
}
export function uploadHeroFrame(gl,s,frame) {
  if(!frame?.ready||!s?.ready||s.asset!==frame.asset) return false;
  gl.bindBuffer(gl.ARRAY_BUFFER,s.dynamic);gl.bufferSubData(gl.ARRAY_BUFFER,0,frame.positionsNormals);return true;
}
export function drawHeroGL(gl,s,frame,pass,cam,light,silhouette) {
  const p=s.program,u=p.U;gl.useProgram(p.p);gl.bindVertexArray(s.vao);cam(p);light(p);
  gl.uniform1i(u.u_hero,3);gl.uniform1f(u.u_pass,pass);gl.uniform1f(u.u_alpha,frame.alpha);gl.uniform3fv(u.u_tint,frame.tint);gl.uniform1f(u.u_hit,frame.hitFlash);gl.uniform3fv(u.u_sil,silhouette);
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,s.texture);gl.drawElements(gl.TRIANGLES,frame.indexCount,gl.UNSIGNED_SHORT,0);gl.activeTexture(gl.TEXTURE0);
}
