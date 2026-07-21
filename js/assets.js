// ============================================================
// Loadout Forge — game asset pipeline
// Loads textures extracted from the user's own Minecraft 26.2
// jar (assets/minecraft/textures/...), applies the game's trim
// palette-key remapping and leather tinting, and composes item
// icons and 3D layer textures.
// ============================================================

const TEX_ROOT = "assets/minecraft/textures/";
const LEATHER_TINT = [160, 101, 64]; // default undyed leather color

// ---------- image loading ----------
const _imgCache = new Map();
function loadImage(path) {
  if (_imgCache.has(path)) return _imgCache.get(path);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("missing texture: " + path));
    img.src = TEX_ROOT + path;
  });
  _imgCache.set(path, p);
  return p;
}

function imgToCanvas(img) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return c;
}

// ---------- pixel ops ----------
function tintCanvas(img, [tr, tg, tb]) {
  const c = imgToCanvas(img);
  const ctx = c.getContext("2d");
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i]     = px[i]     * tr / 255;
    px[i + 1] = px[i + 1] * tg / 255;
    px[i + 2] = px[i + 2] * tb / 255;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

// The trim system: trim textures are drawn in the 8 "key" colors of
// color_palettes/trim_palette.png; at load time each key color is
// substituted with the matching index of the material's palette.
let _trimKey = null; // [ "r,g,b" -> index ]
async function trimKeyMap() {
  if (_trimKey) return _trimKey;
  const img = await loadImage("trims/color_palettes/trim_palette.png");
  const d = imgToCanvas(img).getContext("2d").getImageData(0, 0, 8, 1).data;
  _trimKey = new Map();
  for (let i = 0; i < 8; i++) {
    _trimKey.set(`${d[i*4]},${d[i*4+1]},${d[i*4+2]}`, i);
  }
  return _trimKey;
}

const _palCache = new Map();
async function materialPalette(name) {
  if (_palCache.has(name)) return _palCache.get(name);
  const img = await loadImage(`trims/color_palettes/${name}.png`);
  const d = imgToCanvas(img).getContext("2d").getImageData(0, 0, 8, 1).data;
  const pal = [];
  for (let i = 0; i < 8; i++) pal.push([d[i*4], d[i*4+1], d[i*4+2]]);
  _palCache.set(name, pal);
  return pal;
}

// Which palette file to use, honoring the "_darker" variant when the
// trim material matches the armor material (as the game does).
const DARKER_FOR = { iron: "iron", golden: "gold", diamond: "diamond", netherite: "netherite", copper: "copper" };
function paletteNameFor(trimMatId, armorMatId) {
  const base = trimMatId === "lapis" ? "lapis" : trimMatId;
  if (DARKER_FOR[armorMatId] === base) return base + "_darker";
  return base;
}

async function remapTrim(maskPath, paletteName) {
  const cacheKey = maskPath + "|" + paletteName;
  if (_palSwapCache.has(cacheKey)) return _palSwapCache.get(cacheKey);
  const [img, key, pal] = await Promise.all([
    loadImage(maskPath), trimKeyMap(), materialPalette(paletteName),
  ]);
  const c = imgToCanvas(img);
  const ctx = c.getContext("2d");
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const idx = key.get(`${px[i]},${px[i+1]},${px[i+2]}`);
    if (idx === undefined) continue;
    const [r, g, b] = pal[idx];
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(d, 0, 0);
  _palSwapCache.set(cacheKey, c);
  return c;
}
const _palSwapCache = new Map();

// ---------- item icons (16x16) ----------
const ICON_FILE = {
  crossbow: "crossbow_standby",
};

function iconPathFor(item) {
  const def = ITEM_DEFS[item.kind];
  if (def.tiered) {
    if (item.kind === "helmet" && item.material === "turtle") return "item/turtle_helmet.png";
    return `item/${item.material}_${item.kind}.png`;
  }
  return `item/${ICON_FILE[item.kind] || item.kind}.png`;
}

const _iconCache = new Map();
const _iconPending = new Set();

function iconKey(item) {
  return [item.kind, item.material, item.trim?.pattern, item.trim?.material].join("|");
}

// Synchronous lookup; kicks off an async build (then onReady) on miss.
function getIcon(item, onReady) {
  const key = iconKey(item);
  const hit = _iconCache.get(key);
  if (hit) return hit;
  if (!_iconPending.has(key)) {
    _iconPending.add(key);
    buildIcon(item).then(c => {
      _iconCache.set(key, c);
      _iconPending.delete(key);
      onReady && onReady();
    }).catch(err => { console.warn(err); _iconPending.delete(key); });
  }
  return null;
}

async function buildIcon(item) {
  const c = document.createElement("canvas");
  c.width = 16; c.height = 16;
  const ctx = c.getContext("2d");

  if (item.kind === "shield") { // no flat item texture in the jar (3D model)
    drawProceduralShield(ctx);
    return c;
  }

  if (ITEM_DEFS[item.kind].tiered === "armor" && item.material === "leather") {
    const base = await loadImage(`item/leather_${item.kind}.png`);
    ctx.drawImage(tintCanvas(base, LEATHER_TINT), 0, 0);
    const overlay = await loadImage(`item/leather_${item.kind}_overlay.png`);
    ctx.drawImage(overlay, 0, 0);
  } else {
    ctx.drawImage(await loadImage(iconPathFor(item)), 0, 0);
  }

  if (item.trim && ITEM_DEFS[item.kind].trims) {
    const pal = paletteNameFor(item.trim.material, item.material);
    ctx.drawImage(await remapTrim(`trims/items/${item.kind}_trim.png`, pal), 0, 0);
  }
  return c;
}

function drawProceduralShield(ctx) {
  const pal = FIXED_PALETTES.shield;
  const map = PIXEL_MAPS.shield;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const ch = map[y][x];
      if (ch === ".") continue;
      ctx.fillStyle = pal[ch] || "#f0f";
      ctx.fillRect(x, y, 1, 1);
    }
}

// Smithing template icons for the trim pattern picker
function templateIconPath(patternId) {
  return `item/${patternId}_armor_trim_smithing_template.png`;
}

// ---------- 3D layer textures ----------
// Composes the equipment texture (base [+ leather tint/overlay] [+ trim])
// for one armor piece into a single 64x32 canvas.
const EQUIP_FILE = {
  leather: "leather", chainmail: "chainmail", copper: "copper", iron: "iron",
  golden: "gold", diamond: "diamond", netherite: "netherite", turtle: "turtle_scute",
};

const _layerCache = new Map();
async function armorLayerTexture(item) {
  const isLegs = item.kind === "leggings";
  const dir = isLegs ? "entity/equipment/humanoid_leggings" : "entity/equipment/humanoid";
  const key = [dir, item.material, item.trim?.pattern, item.trim?.material].join("|");
  if (_layerCache.has(key)) return _layerCache.get(key);

  const c = document.createElement("canvas");
  c.width = 64; c.height = 32;
  const ctx = c.getContext("2d");

  if (item.material === "leather") {
    ctx.drawImage(tintCanvas(await loadImage(`${dir}/leather.png`), LEATHER_TINT), 0, 0);
    ctx.drawImage(await loadImage(`${dir}/leather_overlay.png`), 0, 0);
  } else {
    ctx.drawImage(await loadImage(`${dir}/${EQUIP_FILE[item.material]}.png`), 0, 0);
  }

  if (item.trim) {
    const trimDir = isLegs ? "trims/entity/humanoid_leggings" : "trims/entity/humanoid";
    const pal = paletteNameFor(item.trim.material, item.material);
    ctx.drawImage(await remapTrim(`${trimDir}/${item.trim.pattern}.png`, pal), 0, 0);
  }

  _layerCache.set(key, c);
  return c;
}

const DEFAULT_SKINS = ["steve", "alex", "ari", "efe", "kai", "makena", "noor", "sunny", "zuri"];

function skinPath(name, variant) {
  return `entity/player/${variant}/${name}.png`;
}
