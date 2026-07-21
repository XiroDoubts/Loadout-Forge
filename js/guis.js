// ============================================================
// Loadout Forge — real Minecraft GUI renderers for Inspect
// Draws the actual crafting table / smithing table interfaces
// from the game's GUI sheets with recipe items placed in slots.
// ============================================================

const INGREDIENT_TEX = {
  amethyst: "item/amethyst_shard.png", copper: "item/copper_ingot.png",
  diamond: "item/diamond.png", emerald: "item/emerald.png",
  gold: "item/gold_ingot.png", iron: "item/iron_ingot.png",
  lapis: "item/lapis_lazuli.png", netherite: "item/netherite_ingot.png",
  quartz: "item/quartz.png", redstone: "item/redstone.png",
  resin: "item/resin_brick.png",
};

// Duplication ingredient per template: block textures render as iso cubes,
// items render flat.
const DUPE_TEX = {
  sentry:    { tex: "block/cobblestone.png", cube: true },
  dune:      { tex: "block/sandstone.png", cube: true },
  coast:     { tex: "block/cobblestone.png", cube: true },
  wild:      { tex: "block/mossy_cobblestone.png", cube: true },
  ward:      { tex: "block/cobbled_deepslate.png", cube: true },
  eye:       { tex: "block/end_stone.png", cube: true },
  vex:       { tex: "block/cobblestone.png", cube: true },
  tide:      { tex: "block/prismarine.png", cube: true },
  snout:     { tex: "block/blackstone.png", cube: true },
  rib:       { tex: "block/netherrack.png", cube: true },
  spire:     { tex: "block/purpur_block.png", cube: true },
  wayfinder: { tex: "block/terracotta.png", cube: true },
  shaper:    { tex: "block/terracotta.png", cube: true },
  silence:   { tex: "block/cobbled_deepslate.png", cube: true },
  raiser:    { tex: "block/terracotta.png", cube: true },
  host:      { tex: "block/terracotta.png", cube: true },
  flow:      { tex: "item/breeze_rod.png", cube: false },
  bolt:      { tex: "block/copper_block.png", cube: true },
  netherite_upgrade: { tex: "block/netherrack.png", cube: true },
};

// Blocks and items alike draw flat (simple 2D, minetrim-style).
async function drawIngredient(ctx, spec, x, y, s) {
  const img = await loadImage(spec.tex);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, s, s);
}

function drawCount(ctx, n, x, y, s) {
  const size = Math.round(s * 0.55);
  ctx.font = `700 ${size}px 'Press Start 2P', monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#3e3e3e";
  ctx.fillText(String(n), x + s + s * 0.2, y + s + s * 0.25);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(n), x + s + s * 0.2 - size / 8, y + s + s * 0.25 - size / 8);
}

// ---------- crafting table GUI: template duplication ----------
// Sheet layout (measured): panel (0,0)-(176,84) covers title + grid + result.
// Grid slot items start at (30,30), 18px pitch; result item at (124,36).
const CRAFT_CROP = { x: 0, y: 0, w: 176, h: 78 };
const CRAFT_GRID = { x: 30, y: 17, pitch: 18 };
const CRAFT_RESULT = { x: 124, y: 35 };

async function craftingGuiCanvas(templateId, itemCtx) {
  const SC = 2.5;
  const sheet = await loadImage("gui/container/crafting_table.png");
  const c = document.createElement("canvas");
  c.width = CRAFT_CROP.w * SC;
  c.height = CRAFT_CROP.h * SC;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, CRAFT_CROP.x, CRAFT_CROP.y, CRAFT_CROP.w, CRAFT_CROP.h,
    0, 0, CRAFT_CROP.w * SC, CRAFT_CROP.h * SC);

  const slot = (col, row) => [
    (CRAFT_GRID.x + col * CRAFT_GRID.pitch) * SC,
    (CRAFT_GRID.y + row * CRAFT_GRID.pitch) * SC,
  ];
  const s = 16 * SC;
  const diamond = { tex: "item/diamond.png", cube: false };
  const template = { tex: templateIconPath(templateId), cube: false };
  if (templateId === "netherite_upgrade") template.tex = "item/netherite_upgrade_smithing_template.png";
  const dupe = DUPE_TEX[templateId];

  // recipe: D T D / D B D / D D D  →  2 templates
  const layout = [
    [diamond, template, diamond],
    [diamond, dupe, diamond],
    [diamond, diamond, diamond],
  ];
  for (let r = 0; r < 3; r++)
    for (let col = 0; col < 3; col++) {
      const [x, y] = slot(col, r);
      await drawIngredient(ctx, layout[r][col], x, y, s);
    }
  const rx = CRAFT_RESULT.x * SC, ry = CRAFT_RESULT.y * SC;
  await drawIngredient(ctx, template, rx, ry, s);
  drawCount(ctx, 2, rx, ry, s);
  return c;
}

// ---------- smithing table GUI ----------
// Slots (measured): template (9,49), base (27,49), addition (45,49), result (99,49).
const SMITH_CROP = { x: 0, y: 0, w: 176, h: 79 };
const SMITH_SLOTS = { template: [9, 49], base: [27, 49], addition: [45, 49], result: [99, 49] };

// opts: { templateTex, baseIcon (canvas), additionSpec, resultIcon (canvas) }
async function smithingGuiCanvas(opts) {
  const SC = 2.5;
  const sheet = await loadImage("gui/container/smithing.png");
  const c = document.createElement("canvas");
  c.width = SMITH_CROP.w * SC;
  c.height = SMITH_CROP.h * SC;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, SMITH_CROP.x, SMITH_CROP.y, SMITH_CROP.w, SMITH_CROP.h,
    0, 0, SMITH_CROP.w * SC, SMITH_CROP.h * SC);

  const s = 16 * SC;
  const at = name => [SMITH_SLOTS[name][0] * SC, SMITH_SLOTS[name][1] * SC];

  let [x, y] = at("template");
  await drawIngredient(ctx, { tex: opts.templateTex, cube: false }, x, y, s);
  [x, y] = at("base");
  ctx.drawImage(opts.baseIcon, x, y, s, s);
  [x, y] = at("addition");
  await drawIngredient(ctx, opts.additionSpec, x, y, s);
  [x, y] = at("result");
  ctx.drawImage(opts.resultIcon, x, y, s, s);
  return c;
}

// Builds the smithing preview for applying a trim to the given (or a sample) item.
async function trimSmithingCanvas(patternId, contextItem) {
  // base: the item without a trim; result: with the trim applied
  let base;
  if (contextItem && ITEM_DEFS[contextItem.kind].trims) {
    base = { kind: contextItem.kind, material: contextItem.material, trim: null, enchants: {} };
  } else {
    base = { kind: "chestplate", material: "iron", trim: null, enchants: {} };
  }
  const matId = contextItem?.trim?.material || "redstone";
  const result = { ...base, trim: { pattern: patternId, material: matId } };
  return smithingGuiCanvas({
    templateTex: templateIconPath(patternId),
    baseIcon: await buildIcon(base),
    additionSpec: { tex: INGREDIENT_TEX[matId], cube: false },
    resultIcon: await buildIcon(result),
  });
}

async function netheriteSmithingCanvas(contextItem) {
  let kind = "chestplate";
  if (contextItem && (ITEM_DEFS[contextItem.kind].tiered)) kind = contextItem.kind;
  const base = { kind, material: "diamond", trim: null, enchants: {} };
  const result = { kind, material: "netherite", trim: null, enchants: {} };
  return smithingGuiCanvas({
    templateTex: "item/netherite_upgrade_smithing_template.png",
    baseIcon: await buildIcon(base),
    additionSpec: { tex: "item/netherite_ingot.png", cube: false },
    resultIcon: await buildIcon(result),
  });
}
