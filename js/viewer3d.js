// ============================================================
// Loadout Forge — minimal WebGL viewer
// Renders the player / armor stand with equipped armor using
// Minecraft's box-UV convention. No dependencies.
// ============================================================

// ---------- mat4 (column-major) ----------
const M4 = {
  identity: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
  multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        o[c*4+r] = a[r] * b[c*4] + a[4+r] * b[c*4+1] + a[8+r] * b[c*4+2] + a[12+r] * b[c*4+3];
    return o;
  },
  perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
  },
  translate: (x, y, z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1],
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
};

function rotatePoint(p, rot, pivot) {
  let [x, y, z] = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  const { rx = 0, ry = 0, rz = 0 } = rot;
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x*c - y*s, x*s + y*c]; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x*c + z*s, -x*s + z*c]; }
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y*c - z*s, y*s + z*c]; }
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

// ---------- shaders ----------
const VS = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute float aShade;
uniform mat4 uMVP;
varying vec2 vUV;
varying float vShade;
void main() {
  gl_Position = uMVP * vec4(aPos, 1.0);
  vUV = aUV;
  vShade = aShade;
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform float uGlint;
uniform float uTime;
varying vec2 vUV;
varying float vShade;
void main() {
  vec4 tex = texture2D(uTex, vUV);
  if (tex.a < 0.1) discard;
  vec3 col = tex.rgb * vShade;
  if (uGlint > 0.5) {
    float band = sin((vUV.x + vUV.y) * 25.0 - uTime * 3.0);
    float g = max(0.0, band) * 0.20 + 0.04;
    col += vec3(0.55, 0.25, 0.85) * g;
  }
  gl_FragColor = vec4(col, tex.a);
}`;

// ---------- box geometry (Minecraft UV layout) ----------
const FACE_SHADE = { top: 1.0, bottom: 0.5, front: 0.85, back: 0.85, left: 0.65, right: 0.65 };

function addBox(group, o) {
  const { x, y, z, w, h, d, u, v, texW, texH, inflate = 0, mirror = false, rot = null, pivot = [0,0,0] } = o;
  const x0 = x - inflate, y0 = y - inflate, z0 = z - inflate;
  const x1 = x + w + inflate, y1 = y + h + inflate, z1 = z + d + inflate;

  // UV regions in texture pixels: [u0, v0, u1, v1]
  const R = {
    top:    [u + d,          v,     u + d + w,         v + d],
    bottom: [u + d + w,      v,     u + d + w + w,     v + d],
    right:  [u,              v + d, u + d,             v + d + h],
    front:  [u + d,          v + d, u + d + w,         v + d + h],
    left:   [u + d + w,      v + d, u + d + w + d,     v + d + h],
    back:   [u + d + w + d,  v + d, u + d + w + d + w, v + d + h],
  };

  // Corner labels: A=(x0,y1,z0) B=(x1,y1,z0) C=(x1,y1,z1) D=(x0,y1,z1) (top)
  //                E=(x0,y0,z0) F=(x1,y0,z0) G=(x1,y0,z1) H=(x0,y0,z1) (bottom)
  const A = [x0,y1,z0], B = [x1,y1,z0], C = [x1,y1,z1], D = [x0,y1,z1];
  const E = [x0,y0,z0], F = [x1,y0,z0], G = [x1,y0,z1], H = [x0,y0,z1];

  // Model faces: front looks toward -Z (Minecraft convention).
  // Each entry: 4 corners in the order TL, TR, BR, BL as seen from outside.
  const faces = [
    ["front",  [B, A, E, F]],
    ["back",   [D, C, G, H]],
    ["right",  [A, D, H, E]],   // -X side (model's right)
    ["left",   [C, B, F, G]],   // +X side
    ["top",    [D, C, B, A]],
    ["bottom", [E, F, G, H]],
  ];

  for (const [name, corners] of faces) {
    let [u0, v0, u1, v1] = R[name === "right" && mirror ? "left" :
                             name === "left"  && mirror ? "right" : name];
    let flipU = mirror;
    // bottom face is V-flipped in vanilla
    if (name === "bottom") { const t = v0; v0 = v1; v1 = t; }
    if (flipU) { const t = u0; u0 = u1; u1 = t; }

    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    // corners order: TL,TR,BR,BL matches uv order TL,TR,BR,BL
    const base = group.verts.length / 6;
    for (let i = 0; i < 4; i++) {
      let p = corners[i];
      if (rot) p = rotatePoint(p, rot, pivot);
      group.verts.push(p[0], p[1], p[2], uvs[i][0] / texW, uvs[i][1] / texH, FACE_SHADE[name]);
    }
    group.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

// ---------- part tables ----------
function playerParts(slim) {
  const aw = slim ? 3 : 4;              // arm width
  const arx = slim ? -7 : -8;           // right arm x
  return [
    // part: box params + skin uv + overlay uv
    { box: [-4, 24, -4, 8, 8, 8],    uv: [0, 0],   ov: [32, 0],  ovInf: 0.55 },
    { box: [-4, 12, -2, 8, 12, 4],   uv: [16, 16], ov: [16, 32], ovInf: 0.3 },
    { box: [arx, 12, -2, aw, 12, 4], uv: [40, 16], ov: [40, 32], ovInf: 0.3 },
    { box: [4, 12, -2, aw, 12, 4],   uv: [32, 48], ov: [48, 48], ovInf: 0.3, mirrorless: true },
    { box: [-4, 0, -2, 4, 12, 4],    uv: [0, 16],  ov: [0, 32],  ovInf: 0.3 },
    { box: [0, 0, -2, 4, 12, 4],     uv: [16, 48], ov: [0, 48],  ovInf: 0.3 },
  ];
}

const STAND_PARTS = [ // armorstand.png (64x64)
  { box: [-6, 0, -6, 12, 1, 12], uv: [0, 32] },   // base plate
  { box: [-3, 1, -1, 2, 11, 2],  uv: [8, 0] },    // right leg
  { box: [1, 1, -1, 2, 11, 2],   uv: [40, 16] },  // left leg
  { box: [-4, 11, -1, 8, 2, 2],  uv: [0, 48] },   // hip bar
  { box: [-2, 13, -1, 2, 7, 2],  uv: [16, 0] },   // right body stick
  { box: [0, 13, -1, 2, 7, 2],   uv: [48, 16] },  // left body stick
  { box: [-6, 21, -1.5, 12, 3, 3], uv: [0, 26] }, // shoulder bar
  { box: [-6, 14, -1, 2, 12, 2], uv: [24, 0] },   // right arm
  { box: [4, 14, -1, 2, 12, 2],  uv: [32, 16] },  // left arm
  { box: [-1, 24, -1, 2, 7, 2],  uv: [0, 0] },    // neck/head stick
];

// armor boxes per piece: [box, uv, inflate, mirrorLeft]
const ARMOR_BOXES = {
  helmet: [
    { box: [-4, 24, -4, 8, 8, 8], uv: [0, 0], inf: 1.0 },
  ],
  chestplate: [
    { box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], inf: 1.01 },
    { box: [-8, 12, -2, 4, 12, 4], uv: [40, 16], inf: 1.0 },
    { box: [4, 12, -2, 4, 12, 4],  uv: [40, 16], inf: 1.0, mirror: true },
  ],
  leggings: [
    { box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], inf: 0.51 },
    { box: [-4, 0, -2, 4, 12, 4],  uv: [0, 16],  inf: 0.5 },
    { box: [0, 0, -2, 4, 12, 4],   uv: [0, 16],  inf: 0.5, mirror: true },
  ],
  boots: [
    { box: [-4, 0, -2, 4, 12, 4], uv: [0, 16], inf: 1.0 },
    { box: [0, 0, -2, 4, 12, 4],  uv: [0, 16], inf: 1.0, mirror: true },
  ],
};

// ---------- viewer ----------
function createViewer(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;

  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const loc = {
    aPos: gl.getAttribLocation(prog, "aPos"),
    aUV: gl.getAttribLocation(prog, "aUV"),
    aShade: gl.getAttribLocation(prog, "aShade"),
    uMVP: gl.getUniformLocation(prog, "uMVP"),
    uTex: gl.getUniformLocation(prog, "uTex"),
    uGlint: gl.getUniformLocation(prog, "uGlint"),
    uTime: gl.getUniformLocation(prog, "uTime"),
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  const texCache = new Map(); // source canvas/img -> WebGLTexture
  function texture(src) {
    if (texCache.has(src)) return texCache.get(src);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texCache.set(src, t);
    return t;
  }

  let drawGroups = []; // {vbo, ibo, count, tex, glint}

  function uploadGroups(groups) {
    for (const g of drawGroups) { gl.deleteBuffer(g.vbo); gl.deleteBuffer(g.ibo); }
    drawGroups = groups.map(g => {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.verts), gl.STATIC_DRAW);
      const ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.indices), gl.STATIC_DRAW);
      return { vbo, ibo, count: g.indices.length, tex: texture(g.texSrc), glint: g.glint };
    });
  }

  // camera
  const cam = { yaw: 2.75, pitch: -0.12, dist: 78, target: [0, 17, 0], auto: true };
  let lastPointer = null, lastInteract = 0;

  canvas.addEventListener("pointerdown", e => {
    lastPointer = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!lastPointer) return;
    cam.yaw += (e.clientX - lastPointer[0]) * 0.012;
    cam.pitch += (e.clientY - lastPointer[1]) * 0.01;
    cam.pitch = Math.max(-1.35, Math.min(1.35, cam.pitch));
    lastPointer = [e.clientX, e.clientY];
    lastInteract = performance.now();
  });
  canvas.addEventListener("pointerup", () => { lastPointer = null; });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    cam.dist = Math.max(30, Math.min(110, cam.dist + e.deltaY * 0.06));
    lastInteract = performance.now();
  }, { passive: false });

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr, H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!drawGroups.length) return;

    if (cam.auto && performance.now() - lastInteract > 3000) cam.yaw += 0.004;

    const proj = M4.perspective(0.7, W / H, 1, 500);
    let view = M4.translate(0, 0, -cam.dist);
    view = M4.multiply(view, M4.rotX(-cam.pitch));
    view = M4.multiply(view, M4.rotY(cam.yaw));
    view = M4.multiply(view, M4.translate(-cam.target[0], -cam.target[1], -cam.target[2]));
    const mvp = M4.multiply(proj, view);

    gl.uniformMatrix4fv(loc.uMVP, false, new Float32Array(mvp));
    gl.uniform1f(loc.uTime, t / 1000);
    gl.uniform1i(loc.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    for (const g of drawGroups) {
      gl.bindTexture(gl.TEXTURE_2D, g.tex);
      gl.uniform1f(loc.uGlint, g.glint ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ibo);
      gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 24, 12);
      gl.vertexAttribPointer(loc.aShade, 1, gl.FLOAT, false, 24, 20);
      gl.enableVertexAttribArray(loc.aPos);
      gl.enableVertexAttribArray(loc.aUV);
      gl.enableVertexAttribArray(loc.aShade);
      gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0);
    }
  }

  let raf;
  (function loop(t) { draw(t || 0); raf = requestAnimationFrame(loop); })();

  // ---------- scene assembly ----------
  // spec: { model: "stand"|"wide"|"slim", skinSrc: canvas|img|null, armor: {head, chest, legs, feet} }
  async function update(spec) {
    const groups = [];
    const mk = (texSrc, glint) => {
      const g = { texSrc, glint: !!glint, verts: [], indices: [] };
      groups.push(g);
      return g;
    };

    if (spec.model === "stand") {
      const tex = imgToCanvas(await loadImage("entity/armorstand/armorstand.png"));
      const g = mk(tex, false);
      for (const p of STAND_PARTS) {
        addBox(g, { x: p.box[0], y: p.box[1], z: p.box[2], w: p.box[3], h: p.box[4], d: p.box[5],
                    u: p.uv[0], v: p.uv[1], texW: 64, texH: 64 });
      }
    } else {
      const skin = spec.skinSrc;
      const base = mk(skin, false);
      const overlay = mk(skin, false);
      for (const p of playerParts(spec.model === "slim")) {
        const [x, y, z, w, h, d] = p.box;
        addBox(base, { x, y, z, w, h, d, u: p.uv[0], v: p.uv[1], texW: 64, texH: 64 });
        addBox(overlay, { x, y, z, w, h, d, u: p.ov[0], v: p.ov[1], texW: 64, texH: 64, inflate: p.ovInf });
      }
    }

    // armor pieces (turtle helmet included; elytra handled separately)
    const pieceFor = { head: "helmet", chest: "chestplate", legs: "leggings", feet: "boots" };
    for (const [slot, piece] of Object.entries(pieceFor)) {
      const item = spec.armor[slot];
      if (!item) continue;
      if (item.kind === "elytra") {
        const tex = imgToCanvas(await loadImage("entity/equipment/wings/elytra.png"));
        const g = mk(tex, hasEnchants(item));
        const wing = { w: 10, h: 20, d: 2, u: 22, v: 0, texW: 64, texH: 32 };
        addBox(g, { x: -10, y: 4, z: 2, ...wing,
                    rot: { rz: 0.26, ry: 0.05, rx: 0.15 }, pivot: [0, 24, 2] });
        addBox(g, { x: 0, y: 4, z: 2, ...wing, mirror: true,
                    rot: { rz: -0.26, ry: -0.05, rx: 0.15 }, pivot: [0, 24, 2] });
        continue;
      }
      if (item.kind !== pieceFor[slot]) continue;
      const tex = await armorLayerTexture(item);
      const g = mk(tex, hasEnchants(item));
      for (const b of ARMOR_BOXES[item.kind]) {
        addBox(g, { x: b.box[0], y: b.box[1], z: b.box[2], w: b.box[3], h: b.box[4], d: b.box[5],
                    u: b.uv[0], v: b.uv[1], texW: 64, texH: 32, inflate: b.inf, mirror: b.mirror });
      }
    }

    uploadGroups(groups);
  }

  return { update, cam, destroy: () => cancelAnimationFrame(raf) };
}
