// ============================================================
// Loadout Forge — procedural pixel-art renderer
// 16x16 maps: . transparent | o outline | b base | d dark
//             l light | s secondary | S secondary dark
// ============================================================

const PIXEL_MAPS = {
  helmet: [
    "................",
    "................",
    "....oooooooo....",
    "...obbbbbbbbo...",
    "..oblbbbbbbbbo..",
    "..oblbbbbbbbdo..",
    "..obbbbbbbbbdo..",
    "..obbbbbbbbbdo..",
    "..obbbbbbbbbdo..",
    "..obboooooobdo..",
    "..obdo....obdo..",
    "..obdo....obdo..",
    "..oooo....oooo..",
    "................",
    "................",
    "................",
  ],
  chestplate: [
    "................",
    "..ooo......ooo..",
    ".obbbo....obbdo.",
    ".obbbboooobbbdo.",
    ".obbbbbbbbbbbdo.",
    ".oblbobbbbobbdo.",
    ".oblbobbbbobddo.",
    "..oobbbbbbbboo..",
    "...obbbbbbbbo...",
    "...oblbbbbbdo...",
    "...oblbbbbbdo...",
    "...obbbbbbbdo...",
    "...obbbbbbddo...",
    "...obbbbbbddo...",
    "....oooooooo....",
    "................",
  ],
  leggings: [
    "................",
    "................",
    "..oooooooooooo..",
    "..oblbbbbbbbdo..",
    "..oblbbbbbbbdo..",
    "..obbbooooobdo..",
    "..obbo....obdo..",
    "..obbo....obdo..",
    "..oblo....obdo..",
    "..oblo....obdo..",
    "..obbo....obdo..",
    "..obdo....oddo..",
    "..oooo....oooo..",
    "................",
    "................",
    "................",
  ],
  boots: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..oooo....oooo..",
    "..oblo....obdo..",
    "..oblo....obdo..",
    ".oobbo....obdoo.",
    ".olbbdo..oblbdo.",
    ".obbbdo..obbbdo.",
    ".oooooo..oooooo.",
    "................",
    "................",
    "................",
  ],
  elytra: [
    "................",
    ".....oo..oo.....",
    "....obo..obo....",
    "...obbo..obdo...",
    "...obbo..obdo...",
    "..oblbo..obbdo..",
    "..oblbo..obbdo..",
    ".obbbbo..obbbdo.",
    ".oblbbo..obbbdo.",
    ".oblbbo..obbbdo.",
    ".obbbo....obbdo.",
    "..obbo....obdo..",
    "..obo......obo..",
    "..oo........oo..",
    "................",
    "................",
  ],
  sword: [
    "................",
    ".............oo.",
    "............obbo",
    "...........oblbo",
    "..........oblbo.",
    ".........oblbo..",
    "........oblbo...",
    "...oo..oblbo....",
    "...oso.oblbo....",
    "....osoblbo.....",
    ".....osobo......",
    "....os.oso......",
    "...oso..oo......",
    "..oso...........",
    "..oo............",
    "................",
  ],
  spear: [
    "................",
    ".............oo.",
    "............obbo",
    "...........oblbo",
    "..........oblo..",
    ".........osSo...",
    "........osSo....",
    ".......osSo.....",
    "......osSo......",
    ".....osSo.......",
    "....osSo........",
    "...osSo.........",
    "..osSo..........",
    "..oo............",
    "................",
    "................",
  ],
  pickaxe: [
    "................",
    ".....ooooooo....",
    "...oobbbbbbboo..",
    "..obbboooooobbo.",
    ".obbo......obbo.",
    ".obo...oo...obo.",
    ".oo...oso....oo.",
    ".....osSo.......",
    "....osSo........",
    "...osSo.........",
    "..osSo..........",
    ".osSo...........",
    ".oSo............",
    "..oo............",
    "................",
    "................",
  ],
  axe: [
    "................",
    ".....ooooo......",
    "....obbbbdo.....",
    "...obbbbbbdo....",
    "...obbo..oso....",
    "...obbdoooso....",
    "....oooo.oso....",
    "........osSo....",
    "........osSo....",
    ".......osSo.....",
    ".......osSo.....",
    "......osSo......",
    "......osSo......",
    "......oo........",
    "................",
    "................",
  ],
  shovel: [
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "....oblbbbdo....",
    "....oblbbbdo....",
    "....obbbbbdo....",
    ".....obbbdo.....",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......oooo......",
    "................",
    "................",
  ],
  hoe: [
    "................",
    "....ooooooo.....",
    "...obbbbbbdo....",
    "...oddo...oso...",
    "..........oso...",
    "..........oso...",
    ".........osSo...",
    ".........osSo...",
    "........osSo....",
    "........osSo....",
    ".......osSo.....",
    ".......osSo.....",
    "......oso.......",
    "......oo........",
    "................",
    "................",
  ],
  mace: [
    "................",
    "................",
    "....oooooo......",
    "...obbbbbbo.....",
    "..obbllbbbbo....",
    "..obblbbbbdo....",
    "..obbbbbbbdo....",
    "..obbbbbbddo....",
    "...obbbbddo.....",
    "....oooooo......",
    ".......oso......",
    "........oso.....",
    ".........oso....",
    "..........oo....",
    "................",
    "................",
  ],
  bow: [
    "................",
    "................",
    ".....ooooo......",
    "....obbbbbo.....",
    "...obbo...oso...",
    "..obbo.....os...",
    "..obo.......s...",
    "..obo.......s...",
    "..obo.......s...",
    "..obo.......s...",
    "..obbo.....os...",
    "...obbo...oso...",
    "....obbbbbo.....",
    ".....ooooo......",
    "................",
    "................",
  ],
  crossbow: [
    "................",
    "................",
    "..oo........oo..",
    ".obbo......obdo.",
    ".obbboooooobbdo.",
    "..oobbbbbbbboo..",
    "...olllllllllo..",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......osSo......",
    "......oSSo......",
    ".......oo.......",
    "................",
    "................",
    "................",
  ],
  trident: [
    "................",
    "..oo..oo..oo....",
    "..obo.obo.obo...",
    "..obo.obo.obo...",
    "..obooobooobo...",
    "...obbbbbbbo....",
    "......obo.......",
    "......obo.......",
    "......obo.......",
    "......obo.......",
    "......obo.......",
    "......obo.......",
    "......obo.......",
    ".......o........",
    "................",
    "................",
  ],
  fishing_rod: [
    "................",
    "..........oo....",
    ".........oso.o..",
    "........oso..o..",
    ".......oso...o..",
    "......oso....o..",
    ".....oso.....o..",
    "....oso......o..",
    "...oso......olo.",
    "..oso.......olo.",
    ".oso............",
    ".oo.............",
    "................",
    "................",
    "................",
    "................",
  ],
  shears: [
    "................",
    "................",
    "................",
    "...oooo..oooo...",
    "...obbo..obbo...",
    "...obbo..obbo...",
    "....obboobbo....",
    ".....obbbbo.....",
    "......obbo......",
    "....oso..oso....",
    "...oso....oso...",
    "...oso....oso...",
    "....oo....oo....",
    "................",
    "................",
    "................",
  ],
  shield: [
    "................",
    "................",
    "...oooooooooo...",
    "..obbbbllbbbdo..",
    "..obbbbllbbbdo..",
    "..obbbbbbbbbdo..",
    "..obbbbbbbbbdo..",
    "..obbbbbbbbbdo..",
    "...obbbbbbbdo...",
    "...obbbbbbbdo...",
    "....obbbbbdo....",
    ".....obbbdo.....",
    "......obdo......",
    ".......oo.......",
    "................",
    "................",
  ],
};

// ---------- Palettes ----------
// o outline, b base, d dark, l light, s secondary, S secondary dark
const WOOD_HANDLE = { s: "#8a5a2b", S: "#6b421d" };

const ARMOR_PALETTES = {
  leather:   { o: "#3b2314", b: "#a0653c", d: "#7a4a2b", l: "#c58b5a" },
  chainmail: { o: "#2f3538", b: "#a7b4b6", d: "#77848a", l: "#d3dcdc" },
  copper:    { o: "#3d2012", b: "#c06d43", d: "#94502f", l: "#e39a6f" },
  iron:      { o: "#3c3c3c", b: "#d8d8d8", d: "#a2a2a2", l: "#f4f4f4" },
  golden:    { o: "#4a3308", b: "#ecc846", d: "#c1922a", l: "#fdf1a2" },
  diamond:   { o: "#0d4a44", b: "#4aedd9", d: "#2ab5a5", l: "#b3fff4" },
  netherite: { o: "#171315", b: "#4a4247", d: "#322d31", l: "#6b5f63" },
  turtle:    { o: "#24390f", b: "#6fae3e", d: "#4d7c2a", l: "#9ccf6a" },
};

const TOOL_PALETTES = {
  wooden:    { o: "#3b2314", b: "#b8945f", d: "#8f6d3e", l: "#d9bc88", ...WOOD_HANDLE },
  stone:     { o: "#2e2e2e", b: "#8f8f8f", d: "#666666", l: "#b5b5b5", ...WOOD_HANDLE },
  copper:    { o: "#3d2012", b: "#c06d43", d: "#94502f", l: "#e39a6f", ...WOOD_HANDLE },
  iron:      { o: "#3c3c3c", b: "#d8d8d8", d: "#a2a2a2", l: "#f4f4f4", ...WOOD_HANDLE },
  golden:    { o: "#4a3308", b: "#ecc846", d: "#c1922a", l: "#fdf1a2", ...WOOD_HANDLE },
  diamond:   { o: "#0d4a44", b: "#4aedd9", d: "#2ab5a5", l: "#b3fff4", ...WOOD_HANDLE },
  netherite: { o: "#171315", b: "#4a4247", d: "#322d31", l: "#6b5f63", ...WOOD_HANDLE },
};

const FIXED_PALETTES = {
  elytra:      { o: "#241d2e", b: "#7a6a8a", d: "#56485f", l: "#a08cc0" },
  mace:        { o: "#26262b", b: "#a9a9b0", d: "#74747c", l: "#d5d5da", s: "#7b95a0", S: "#5d747e" },
  bow:         { o: "#2b1a0a", b: "#8a5a2b", d: "#6b421d", l: "#b07f43", s: "#d9d9d9", S: "#a8a8a8" },
  crossbow:    { o: "#2b1a0a", b: "#6b421d", d: "#523213", l: "#e8e8e8", s: "#8a5a2b", S: "#6b421d" },
  trident:     { o: "#0f3d34", b: "#2fae96", d: "#1e7f6d", l: "#7fe0cb", s: "#c8a83a", S: "#9c7f24" },
  fishing_rod: { o: "#2b1a0a", b: "#8a5a2b", d: "#6b421d", l: "#e04938", s: "#8a5a2b", S: "#6b421d" },
  shears:      { o: "#2e2e2e", b: "#c9c9c9", d: "#969696", l: "#eeeeee", s: "#6e6e6e", S: "#525252" },
  shield:      { o: "#2b1a0a", b: "#7d5a34", d: "#5e421f", l: "#9c7443", s: "#8a5a2b", S: "#6b421d" },
};

function paletteFor(item) {
  const def = ITEM_DEFS[item.kind];
  if (def.tiered === "armor") return ARMOR_PALETTES[item.material];
  if (def.tiered === "tool")  return TOOL_PALETTES[item.material];
  return FIXED_PALETTES[item.kind];
}

// ---------- Drawing ----------
// Prefers the real game texture (composed by assets.js); falls back to
// the procedural pixel map while the texture is still loading. The
// fallback omits the trim overlay — the real (trimmed) icon lands within
// a frame or two.
function drawItemFrame(ctx, item, scale, glintPhase) {
  ctx.clearRect(0, 0, 16 * scale, 16 * scale);

  const icon = getIcon(item, () => drawItemFrame(ctx, item, scale, glintPhase));
  if (icon) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon, 0, 0, 16 * scale, 16 * scale);
  } else {
    const map = PIXEL_MAPS[item.kind];
    const pal = paletteFor(item);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = map[y][x];
        if (c === ".") continue;
        ctx.fillStyle = pal[c] || "#f0f";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  // Enchantment glint — moving translucent sheen clipped to the sprite
  if (glintPhase !== undefined && hasEnchants(item)) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const size = 16 * scale;
    const off = (glintPhase % 1) * size * 2 - size;
    const g = ctx.createLinearGradient(off, 0, off + size, size);
    g.addColorStop(0.0, "rgba(170, 80, 255, 0)");
    g.addColorStop(0.45, "rgba(190, 110, 255, 0.55)");
    g.addColorStop(0.5, "rgba(255, 190, 255, 0.75)");
    g.addColorStop(0.55, "rgba(190, 110, 255, 0.55)");
    g.addColorStop(1.0, "rgba(170, 80, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }
}

function hasEnchants(item) {
  return item && Object.keys(item.enchants || {}).length > 0;
}

// ---------- Animated canvas registry ----------
// Every rendered item canvas registers here; one rAF loop animates
// the glint on enchanted items.
const _liveCanvases = new Set();

function renderItemCanvas(canvas, item, scale) {
  canvas.width = 16 * scale;
  canvas.height = 16 * scale;
  canvas._item = item;
  canvas._scale = scale;
  _liveCanvases.add(canvas);
  drawItemFrame(canvas.getContext("2d"), item, scale, 0);
}

function startGlintLoop() {
  const PERIOD = 3200; // ms per sweep
  function tick(t) {
    for (const canvas of [..._liveCanvases]) {
      if (!canvas.isConnected) { _liveCanvases.delete(canvas); continue; }
      if (!hasEnchants(canvas._item)) continue;
      drawItemFrame(canvas.getContext("2d"), canvas._item, canvas._scale, (t % PERIOD) / PERIOD);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
