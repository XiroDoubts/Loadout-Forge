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
  // inflate may be a number (uniform) or a per-face object {x0,x1,y0,y1,z0,z1}
  // where x0/x1 are the -X/+X faces, etc. Missing faces default to 0. This
  // lets adjacent pieces (e.g. the two boots) inflate outward without their
  // inner faces crossing the centerline and interpenetrating.
  const inf = typeof inflate === "number"
    ? { x0: inflate, x1: inflate, y0: inflate, y1: inflate, z0: inflate, z1: inflate }
    : { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, ...inflate };
  const x0 = x - inf.x0, y0 = y - inf.y0, z0 = z - inf.z0;
  const x1 = x + w + inf.x1, y1 = y + h + inf.y1, z1 = z + d + inf.z1;

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

  // Model faces: boxes are built in Minecraft's own coordinates (the model's
  // right is +X). The viewer then mirrors X in the projection (see draw) so
  // the model's right renders on the viewer's left, exactly as in-game.
  // Each entry: 4 corners in the order TL, TR, BR, BL as seen from outside.
  const faces = [
    ["front",  [B, A, E, F]],
    ["back",   [D, C, G, H]],
    ["right",  [A, D, H, E]],   // -X side
    ["left",   [C, B, F, G]],   // +X side
    ["top",    [D, C, B, A]],
    ["bottom", [E, F, G, H]],
  ];

  for (const [name, corners] of faces) {
    let [u0, v0, u1, v1] = R[name === "right" && mirror ? "left" :
                             name === "left"  && mirror ? "right" : name];
    // The projection mirrors X, so flip U on every face to keep textures
    // (and text) reading the right way round; `mirror` pieces flip back.
    let flipU = !mirror;
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

// Flat double-sided quad for held items (textured with the item icon).
// Size s in world units; positioned via rot/pivot like boxes.
function addItemQuad(group, o) {
  const { x, y, z, s, rot = null, pivot = [0, 0, 0] } = o;
  const corners = [
    [x, y + s, z], [x + s, y + s, z], [x + s, y, z], [x, y, z],
  ];
  // The projection mirrors X, so the icon reads un-mirrored with plain UVs.
  const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const base = group.verts.length / 6;
  for (let i = 0; i < 4; i++) {
    let p = corners[i];
    if (rot) p = rotatePoint(p, rot, pivot);
    group.verts.push(p[0], p[1], p[2], uvs[i][0], uvs[i][1], 0.95);
  }
  // both windings so it's visible from either side
  group.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  group.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
}

// ---------- part tables ----------
// Boxes use Minecraft's own coordinates: the model's right arm/leg is at -X
// (the projection mirror puts it on the viewer's left, as in-game).
function playerParts(slim) {
  const aw = slim ? 3 : 4;              // arm width
  const arx = slim ? -7 : -8;           // right arm x (-X side)
  return [
    // part: box params + skin uv + overlay uv
    { box: [-4, 24, -4, 8, 8, 8],    uv: [0, 0],   ov: [32, 0],  ovInf: 0.55 }, // head
    { box: [-4, 12, -2, 8, 12, 4],   uv: [16, 16], ov: [16, 32], ovInf: 0.3 },  // body
    { box: [arx, 12, -2, aw, 12, 4], uv: [40, 16], ov: [40, 32], ovInf: 0.3 },  // right arm (-X)
    { box: [4, 12, -2, aw, 12, 4],   uv: [32, 48], ov: [48, 48], ovInf: 0.3, mirrorless: true }, // left arm (+X)
    { box: [-4, 0, -2, 4, 12, 4],    uv: [0, 16],  ov: [0, 32],  ovInf: 0.3 },  // right leg (-X)
    { box: [0, 0, -2, 4, 12, 4],     uv: [16, 48], ov: [0, 48],  ovInf: 0.3 },  // left leg  (+X)
  ];
}

// Vanilla ArmorStandModel part positions (armorstand.png, 64x64).
// Real stands have no visible arms and a gap between the body sticks.
//
// KNOWN ISSUE: unlike playerParts, these left/right regions have NOT been
// checked against the model's own left/right (model faces -Z, so its right is
// +X). The pairs below may be swapped the same way the player limbs were.
// It is invisible today because armorstand.png is near-symmetric — the sticks
// carry no side-specific detail — and equipped armor comes from ARMOR_BOXES,
// which is correct, so armor renders right on the stand either way.
// Fix this before relying on stand part sides, or if a resource pack ships a
// stand texture with asymmetric detail (it would then appear on the wrong side).
const STAND_PARTS = [
  { box: [-6, 0, -6, 12, 1, 12],   uv: [0, 32] },  // base plate
  { box: [-2.9, 1, -1, 2, 11, 2],  uv: [8, 0] },   // right leg (unverified side)
  { box: [0.9, 1, -1, 2, 11, 2],   uv: [40, 16] }, // left leg  (unverified side)
  { box: [-4, 12, -1, 8, 2, 2],    uv: [0, 48] },  // waist bar
  { box: [-3, 14, -1, 2, 7, 2],    uv: [16, 0] },  // right body stick (unverified side)
  { box: [1, 14, -1, 2, 7, 2],     uv: [48, 16] }, // left body stick  (unverified side)
  { box: [-6, 21, -1.5, 12, 3, 3], uv: [0, 26] },  // shoulder bar
  { box: [-1, 24, -1, 2, 7, 2],    uv: [0, 0] },   // neck/head stick
];

// armor boxes per piece: [box, uv, inflate, mirrorLeft]
const ARMOR_BOXES = {
  helmet: [
    { box: [-4, 24, -4, 8, 8, 8], uv: [0, 0], inf: 1.0 },
  ],
  chestplate: [
    { box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], inf: 1.01 },
    // arms inflate a hair more than the body (1.02 > 1.01) so they sit just in
    // front of it — otherwise the body's shoulder clips the inner pixel of the
    // sleeve, showing only 3 of its 4px. (Nudging the arm outward in X instead
    // would expose the skin arm underneath.)
    { box: [-8, 12, -2, 4, 12, 4], uv: [40, 16], inf: 1.02 },                // right arm (-X)
    { box: [4, 12, -2, 4, 12, 4],  uv: [40, 16], inf: 1.02, mirror: true },  // left arm  (+X)
  ],
  leggings: [
    { box: [-4, 12, -2, 8, 12, 4], uv: [16, 16], inf: 0.51 },
    // legs inflate outward but not across the centerline (inner face inf 0)
    { box: [-4, 0, -2, 4, 12, 4],  uv: [0, 16],  inf: { x0: 0.5, x1: 0, y0: 0.5, y1: 0.5, z0: 0.5, z1: 0.5 } },                 // right leg (-X)
    { box: [0, 0, -2, 4, 12, 4],   uv: [0, 16],  inf: { x0: 0, x1: 0.5, y0: 0.5, y1: 0.5, z0: 0.5, z1: 0.5 }, mirror: true },   // left leg (+X)
  ],
  boots: [
    // inner face (toward the centerline) is not inflated, so the two boots
    // meet at x=0 instead of overlapping through each other.
    { box: [-4, 0, -2, 4, 12, 4], uv: [0, 16], inf: { x0: 1, x1: 0, y0: 1, y1: 1, z0: 1, z1: 1 } },                // right boot (-X)
    { box: [0, 0, -2, 4, 12, 4],  uv: [0, 16], inf: { x0: 0, x1: 1, y0: 1, y1: 1, z0: 1, z1: 1 }, mirror: true },  // left boot  (+X)
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
  const HOME = { yaw: 2.75, pitch: -0.12, dist: 78, target: [0, 17, 0] };
  const cam = { ...HOME, target: [...HOME.target], auto: true };
  const clampDist = d => Math.max(30, Math.min(110, d));

  let lastInteract = 0;
  const pointers = new Map();   // pointerId -> [x, y]
  let dragMode = null;          // "rotate" | "pan"
  const touched = () => { lastInteract = performance.now(); };

  const pts = () => [...pointers.values()];
  const midOf = p => [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
  const spanOf = p => Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);

  // World-space camera axes for the current yaw/pitch (rows of rotX(-pitch)·rotY(yaw)).
  function camAxes() {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    return { right: [cy, 0, sy], up: [-sp * sy, cp, sp * cy] };
  }

  // Slide the orbit target across the view plane so the model tracks the cursor.
  // Scaled by distance so a drag covers the same screen distance at any zoom.
  // (+right on dx because the projection mirrors X.)
  function pan(dx, dy) {
    const { right, up } = camAxes();
    const k = (2 * cam.dist * Math.tan(0.35)) / Math.max(1, canvas.clientHeight);
    for (let i = 0; i < 3; i++) cam.target[i] += (up[i] * dy + right[i] * dx) * k;
  }

  canvas.addEventListener("pointerdown", e => {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    canvas.setPointerCapture(e.pointerId);
    // middle/right button or shift = pan; two fingers = pan + pinch zoom
    if (pointers.size === 1)
      dragMode = (e.button === 1 || e.button === 2 || e.shiftKey) ? "pan" : "rotate";
    touched();
  });

  canvas.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;

    if (pointers.size >= 2) {
      const before = pts();
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      const after = pts();
      const mBefore = midOf(before), mAfter = midOf(after);
      pan(mAfter[0] - mBefore[0], mAfter[1] - mBefore[1]);
      const sBefore = spanOf(before), sAfter = spanOf(after);
      if (sBefore > 0 && sAfter > 0) cam.dist = clampDist(cam.dist * (sBefore / sAfter));
      touched();
      return;
    }

    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (dragMode === "pan") {
      pan(dx, dy);
    } else {
      cam.yaw -= dx * 0.012; // negated: the projection mirrors X
      cam.pitch = Math.max(-1.35, Math.min(1.35, cam.pitch + dy * 0.01));
    }
    touched();
  });

  const release = e => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) dragMode = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  // right-drag pans, so don't let the browser menu interrupt it
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // double-click recentres — panning can otherwise strand the model off-screen
  canvas.addEventListener("dblclick", () => {
    Object.assign(cam, { yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist });
    cam.target = [...HOME.target];
    touched();
  });

  canvas.addEventListener("wheel", e => {
    // Zoom only with ctrl/cmd held (trackpad pinch sets ctrlKey too);
    // a plain scroll passes through so the page still scrolls normally.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    cam.dist = clampDist(cam.dist + e.deltaY * 0.06);
    touched();
  }, { passive: false });

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr, H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!drawGroups.length) return;

    if (cam.auto && performance.now() - lastInteract > 3000) cam.yaw -= 0.004;

    const proj = M4.perspective(0.7, W / H, 1, 500);
    proj[0] = -proj[0]; // mirror X: model built in MC coords renders as in-game
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

  // Stable canvas per texture path — keeps the GPU texture cache bounded
  // (texCache is keyed by source object, so each source must be created once).
  const _canvasCache = new Map();
  function texCanvas(path) {
    if (!_canvasCache.has(path)) {
      _canvasCache.set(path, loadImage(path).then(imgToCanvas));
    }
    return _canvasCache.get(path);
  }

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
      const tex = await texCanvas("entity/armorstand/armorstand.png");
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
        const tex = await texCanvas("entity/equipment/wings/elytra.png");
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

    // Held item: quad anchored at the right hand, tilted forward like a
    // held tool. The whole plane sits at z <= -2.6 (in front of the arm's
    // front face at z = -2) and only tips further forward, so it can
    // never intersect the body.
    if (spec.held) {
      const g = mk(spec.held.icon, spec.held.glint);
      addItemQuad(g, {
        x: -13, y: 12, z: -2.6, s: 12,
        rot: { rx: -0.85 },
        pivot: [-6, 12, -2.6],
      });
    }

    uploadGroups(groups);
  }

  return { update, cam, destroy: () => cancelAnimationFrame(raf) };
}
