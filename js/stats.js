// ============================================================
// Loadout Forge — item stats & knowledge base (Java 26.2)
// Numbers verified against minecraft.wiki (Durability, Armor,
// Spear, Mace, Lunge, Smithing Template pages).
// ============================================================

// ---------- durability ----------
const TOOL_TIER_DURABILITY = {
  wooden: 59, stone: 131, copper: 190, iron: 250,
  golden: 32, diamond: 1561, netherite: 2031,
};

const FIXED_DURABILITY = {
  bow: 384, crossbow: 465, trident: 250, mace: 500,
  fishing_rod: 64, shears: 238, shield: 336, elytra: 432,
};

// per piece: helmet, chestplate, leggings, boots
const ARMOR_DURABILITY = {
  leather:   { helmet: 55,  chestplate: 80,  leggings: 75,  boots: 65 },
  golden:    { helmet: 77,  chestplate: 112, leggings: 105, boots: 91 },
  copper:    { helmet: 121, chestplate: 176, leggings: 165, boots: 143 },
  chainmail: { helmet: 165, chestplate: 240, leggings: 225, boots: 195 },
  iron:      { helmet: 165, chestplate: 240, leggings: 225, boots: 195 },
  diamond:   { helmet: 363, chestplate: 528, leggings: 495, boots: 429 },
  netherite: { helmet: 407, chestplate: 592, leggings: 555, boots: 481 },
  turtle:    { helmet: 275 },
};

// ---------- armor defense ----------
const ARMOR_POINTS = {
  leather:   { helmet: 1, chestplate: 3, leggings: 2, boots: 1 },
  golden:    { helmet: 2, chestplate: 5, leggings: 3, boots: 1 },
  copper:    { helmet: 2, chestplate: 4, leggings: 3, boots: 1 },
  chainmail: { helmet: 2, chestplate: 5, leggings: 4, boots: 1 },
  iron:      { helmet: 2, chestplate: 6, leggings: 5, boots: 2 },
  diamond:   { helmet: 3, chestplate: 8, leggings: 6, boots: 3 },
  netherite: { helmet: 3, chestplate: 8, leggings: 6, boots: 3 },
  turtle:    { helmet: 2 },
};
const ARMOR_TOUGHNESS = { diamond: 2, netherite: 3 }; // per piece
const ARMOR_KB_RESIST = { netherite: 0.1 };           // per piece

// ---------- weapon/tool combat stats ----------
const WEAPON_STATS = {
  sword:   { speed: () => 1.6, dmg: { wooden: 4, stone: 5, copper: 5, iron: 6, golden: 4, diamond: 7, netherite: 8 } },
  axe:     { speed: t => ({ wooden: 0.8, stone: 0.8, copper: 0.8, iron: 0.9, golden: 1.0, diamond: 1.0, netherite: 1.0 }[t]),
             dmg: { wooden: 7, stone: 9, copper: 9, iron: 9, golden: 7, diamond: 9, netherite: 10 } },
  pickaxe: { speed: () => 1.2, dmg: { wooden: 2, stone: 3, copper: 3, iron: 4, golden: 2, diamond: 5, netherite: 6 } },
  shovel:  { speed: () => 1.0, dmg: { wooden: 2.5, stone: 3.5, copper: 3.5, iron: 4.5, golden: 2.5, diamond: 5.5, netherite: 6.5 } },
  hoe:     { speed: t => ({ wooden: 1, stone: 2, copper: 2, iron: 3, golden: 1, diamond: 4, netherite: 4 }[t]),
             dmg: { wooden: 1, stone: 1, copper: 1, iron: 1, golden: 1, diamond: 1, netherite: 1 } },
  spear:   { speed: t => ({ wooden: 1.54, stone: 1.33, copper: 1.18, iron: 1.05, golden: 1.05, diamond: 0.95, netherite: 0.87 }[t]),
             dmg: { wooden: 1, stone: 2, copper: 2, iron: 3.5, golden: 1, diamond: 4, netherite: 5 } },
  mace:    { fixedDmg: 6, fixedSpeed: 0.6 },
  trident: { fixedDmg: 9, fixedSpeed: 1.1 },
};

// ---------- stat computation ----------
function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n * 10 % 1 === 0 ? 1 : 2);
}

function baseDurability(item) {
  const def = ITEM_DEFS[item.kind];
  if (def.tiered === "tool") return TOOL_TIER_DURABILITY[item.material];
  if (def.tiered === "armor") return ARMOR_DURABILITY[item.material]?.[item.kind] ?? null;
  return FIXED_DURABILITY[item.kind] ?? null;
}

// rows: { label, value, mod?, note?, kind: "base"|"bonus"|"cond" }
function computeStats(item) {
  const rows = [];
  const def = ITEM_DEFS[item.kind];
  const e = item.enchants || {};
  const isArmor = def.tiered === "armor" || item.kind === "elytra";

  // --- durability ---
  const dur = baseDurability(item);
  if (dur != null) {
    let row = { label: "Durability", value: item.kind === "elytra" ? dur + "s flight" : String(dur), kind: "base" };
    const u = e.unbreaking;
    if (u) {
      // tools: damage chance 1/(lvl+1) → expected ×(lvl+1)
      // armor: damage chance 0.6 + 0.4/(lvl+1)
      const mult = isArmor ? 1 / (0.6 + 0.4 / (u + 1)) : u + 1;
      row.mod = "≈ " + Math.round(dur * mult) + (item.kind === "elytra" ? "s" : "");
      row.note = `Unbreaking ${ROMAN[u]}: ×${mult.toFixed(2)} expected life`;
    }
    rows.push(row);
  }

  // --- melee combat ---
  const ws = WEAPON_STATS[item.kind];
  if (ws) {
    const base = ws.fixedDmg ?? ws.dmg[item.material];
    let dmg = base;
    let note = null;
    if (e.sharpness) { dmg = base + 0.5 * e.sharpness + 0.5; note = `Sharpness ${ROMAN[e.sharpness]}: +${fmtNum(0.5 * e.sharpness + 0.5)}`; }
    const row = { label: "Attack Damage", value: fmtNum(base), kind: "base" };
    if (dmg !== base) { row.mod = fmtNum(dmg); row.note = note; }
    rows.push(row);

    if (e.smite) rows.push({ label: "vs Undead", value: `+${fmtNum(2.5 * e.smite)} (${fmtNum(dmg + 2.5 * e.smite)} total)`, kind: "cond" });
    if (e.bane_of_arthropods) rows.push({ label: "vs Arthropods", value: `+${fmtNum(2.5 * e.bane_of_arthropods)} + Slowness IV`, kind: "cond" });
    if (e.impaling) rows.push({ label: "vs Aquatic mobs", value: `+${fmtNum(2.5 * e.impaling)} (${fmtNum(dmg + 2.5 * e.impaling)} total)`, kind: "cond" });

    const spd = ws.fixedSpeed ?? ws.speed(item.material);
    rows.push({ label: "Attack Speed", value: fmtNum(spd) + "/s", kind: "base" });
    rows.push({ label: "Max DPS", value: fmtNum(Math.round(dmg * spd * 100) / 100), kind: "base" });

    if (item.kind === "spear") {
      rows.push({ label: "Reach", value: "4.5 blocks (min 2)", kind: "base" });
      if (e.lunge) rows.push({ label: "Lunge dash", value: `${fmtNum(9.16 * e.lunge)} blocks/s, ${e.lunge} hunger/use`, kind: "bonus" });
    }
    if (item.kind === "mace") {
      const per = e.density ? ` (+${fmtNum(0.5 * e.density)}/block with Density ${ROMAN[e.density]})` : "";
      rows.push({ label: "Smash attack", value: "+4/blk (first 3), +2/blk (next 5), +1/blk after" + per, kind: "cond" });
      if (e.breach) rows.push({ label: "Armor piercing", value: `ignores ${15 * e.breach}% of target's armor`, kind: "bonus" });
      if (e.wind_burst) rows.push({ label: "Wind Burst", value: `launch ~${8 * e.wind_burst} blocks on smash`, kind: "bonus" });
    }
    if (e.fire_aspect) rows.push({ label: "Ignites target", value: `${4 * e.fire_aspect}s of fire`, kind: "bonus" });
    if (e.knockback) rows.push({ label: "Knockback", value: `+${e.knockback * 3} blocks`, kind: "bonus" });
    if (e.looting) rows.push({ label: "Looting", value: `+${e.looting} max drops, +${e.looting}% rare drop chance`, kind: "bonus" });
    if (e.sweeping_edge) rows.push({ label: "Sweep damage", value: `${Math.round(e.sweeping_edge / (e.sweeping_edge + 1) * 100)}% of hit`, kind: "bonus" });
  }

  // --- mining tools ---
  if (["pickaxe", "shovel", "axe", "hoe", "shears"].includes(item.kind) && e.efficiency) {
    rows.push({ label: "Mining speed", value: `+${e.efficiency * e.efficiency + 1} when correct tool`, kind: "bonus" });
  }
  if (e.fortune) rows.push({ label: "Fortune", value: `up to ×${e.fortune + 1} drops`, kind: "bonus" });
  if (e.silk_touch) rows.push({ label: "Silk Touch", value: "blocks drop themselves", kind: "bonus" });

  // --- ranged ---
  if (item.kind === "bow") {
    const bonus = e.power ? ` (+${25 * (e.power + 1)}% with Power ${ROMAN[e.power]})` : "";
    rows.push({ label: "Arrow damage", value: "up to 10 charged" + bonus, kind: "base" });
    if (e.punch) rows.push({ label: "Arrow knockback", value: `+${e.punch * 3} blocks`, kind: "bonus" });
    if (e.flame) rows.push({ label: "Flame", value: "arrows ignite (5s fire)", kind: "bonus" });
    if (e.infinity) rows.push({ label: "Infinity", value: "arrows not consumed", kind: "bonus" });
  }
  if (item.kind === "crossbow") {
    rows.push({ label: "Arrow damage", value: "6–11 (firework: up to 18)", kind: "base" });
    const qc = e.quick_charge || 0;
    rows.push({ label: "Charge time", value: fmtNum(1.25 - 0.25 * qc) + "s" + (qc ? ` (Quick Charge ${ROMAN[qc]})` : ""), kind: qc ? "bonus" : "base" });
    if (e.multishot) rows.push({ label: "Multishot", value: "3 projectiles, 1 ammo", kind: "bonus" });
    if (e.piercing) rows.push({ label: "Piercing", value: `passes through ${e.piercing + 1} entities`, kind: "bonus" });
  }
  if (item.kind === "trident") {
    if (e.loyalty) rows.push({ label: "Loyalty", value: `returns after ${fmtNum(1.3 / e.loyalty)}s-ish (faster per level)`, kind: "bonus" });
    if (e.riptide) rows.push({ label: "Riptide", value: "launches with you (rain/water only)", kind: "bonus" });
    if (e.channeling) rows.push({ label: "Channeling", value: "lightning on hit during thunderstorms", kind: "bonus" });
  }
  if (item.kind === "fishing_rod") {
    if (e.luck_of_the_sea) rows.push({ label: "Treasure chance", value: `${5 + e.luck_of_the_sea * 2}% (base 5%)`, kind: "bonus" });
    if (e.lure) rows.push({ label: "Wait time", value: `-${5 * e.lure}s per catch`, kind: "bonus" });
  }

  // --- armor defense ---
  if (def.tiered === "armor") {
    const pts = ARMOR_POINTS[item.material]?.[item.kind];
    if (pts != null) rows.push({ label: "Armor", value: `+${pts}`, kind: "base" });
    const tough = ARMOR_TOUGHNESS[item.material];
    if (tough) rows.push({ label: "Toughness", value: `+${tough}`, kind: "base" });
    const kb = ARMOR_KB_RESIST[item.material];
    if (kb) rows.push({ label: "Knockback Resist", value: `+${kb * 100}%`, kind: "base" });

    // Protection family: EPF × 4% damage reduction (this piece's contribution)
    const epf = [
      ["protection", 1, "all damage"],
      ["fire_protection", 2, "fire damage"],
      ["blast_protection", 2, "explosions"],
      ["projectile_protection", 2, "projectiles"],
    ];
    for (const [id, perLvl, what] of epf) {
      if (e[id]) rows.push({ label: ENCHANTS[id].name, value: `-${Math.min(e[id] * perLvl * 4, 80)}% ${what}`, kind: "bonus" });
    }
    if (e.fire_protection) rows.push({ label: "Burn time", value: `-${15 * e.fire_protection}%`, kind: "bonus" });
    if (e.feather_falling) rows.push({ label: "Fall damage", value: `-${Math.min(e.feather_falling * 12, 48)}%`, kind: "bonus" });
    if (e.thorns) rows.push({ label: "Thorns", value: `${15 * e.thorns}% chance to reflect 1–4`, kind: "bonus" });
    if (e.respiration) rows.push({ label: "Underwater breathing", value: `+${15 * e.respiration}s`, kind: "bonus" });
    if (e.aqua_affinity) rows.push({ label: "Underwater mining", value: "full speed", kind: "bonus" });
    if (e.swift_sneak) rows.push({ label: "Sneak speed", value: `${30 + 15 * e.swift_sneak}% of walking`, kind: "bonus" });
    if (e.depth_strider) rows.push({ label: "Swim speed", value: e.depth_strider >= 3 ? "as fast as walking" : `+${Math.round(e.depth_strider / 3 * 100)}% toward walk speed`, kind: "bonus" });
    if (e.frost_walker) rows.push({ label: "Frost Walker", value: `freezes water in ${2 + e.frost_walker} block radius`, kind: "bonus" });
    if (e.soul_speed) rows.push({ label: "Soul sand speed", value: `×${(1.3 + 0.105 * e.soul_speed).toFixed(2)}`, kind: "bonus" });
  }

  if (e.mending) rows.push({ label: "Mending", value: "XP repairs 2 durability per point", kind: "bonus" });
  if (e.curse_of_binding) rows.push({ label: "Curse of Binding", value: "cannot be removed once worn", kind: "curse" });
  if (e.curse_of_vanishing) rows.push({ label: "Curse of Vanishing", value: "destroyed on death", kind: "curse" });

  return rows;
}

// ============================================================
// Inspect knowledge base
// ============================================================

const ENCHANT_INFO = {
  protection:            { effect: "Reduces most types of damage by 4% per level (EPF 1/level).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  fire_protection:       { effect: "Reduces fire damage 8% per level and burn time 15% per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  blast_protection:      { effect: "Reduces explosion damage 8% per level and explosion knockback.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  projectile_protection: { effect: "Reduces projectile damage 8% per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  thorns:                { effect: "15% chance per level to deal 1–4 damage back to attackers; costs extra durability.", source: "Enchanting table (chestplates), librarian trades; applicable to any armor via books." },
  respiration:           { effect: "Extends underwater breathing by 15s per level and improves underwater vision.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  aqua_affinity:         { effect: "Removes the underwater mining speed penalty.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  swift_sneak:           { effect: "Raises sneaking speed to 45/60/75% of walking speed.", source: "TREASURE ONLY — Ancient City chests (Deep Dark). Cannot be table-enchanted.", treasure: true },
  feather_falling:       { effect: "Reduces fall damage 12% per level (48% at IV).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  depth_strider:         { effect: "Reduces water movement slowdown; level III swims as fast as walking.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  frost_walker:          { effect: "Walking near water freezes it into frosted ice (radius 2 + level).", source: "TREASURE ONLY — loot chests, fishing, librarian trades. Not from the table.", treasure: true },
  soul_speed:            { effect: "Walk faster on soul sand/soil (×1.4–1.6); slowly costs durability.", source: "TREASURE ONLY — Bastion Remnant chests & Piglin bartering.", treasure: true },
  sharpness:             { effect: "+0.5 × level + 0.5 melee damage.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  smite:                 { effect: "+2.5 damage per level vs undead (zombies, skeletons, wither…).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  bane_of_arthropods:    { effect: "+2.5 damage per level vs arthropods (spiders, bees…) + Slowness IV.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  knockback:             { effect: "Increases melee knockback by ~3 blocks per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  fire_aspect:           { effect: "Sets targets on fire for 4s per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  looting:               { effect: "+1 max mob drop per level; increases rare drop chance ~1%/level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  sweeping_edge:         { effect: "Sweep attacks deal level/(level+1) of the hit's damage.", source: "Enchanting table (Java exclusive), librarian trades." },
  lunge:                 { effect: "Spear jab dashes you forward ~9 blocks/s per level; costs level hunger points (needs 7+ hunger).", source: "Enchanting table, librarian trades, fishing, structure loot." },
  density:               { effect: "Mace smash attacks deal +0.5 damage per block fallen per level.", source: "Enchanting table (mace), loot in Trial Chambers vaults." },
  breach:                { effect: "Smash ignores 15% of the target's armor per level.", source: "Enchanting table (mace), loot in Trial Chambers vaults." },
  wind_burst:            { effect: "Successful smash launches you ~8 blocks upward per level — chain smashes!", source: "TREASURE ONLY — Ominous Vaults in Trial Chambers.", treasure: true },
  efficiency:            { effect: "Mining speed +level²+1 when using the correct tool.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  silk_touch:            { effect: "Blocks drop themselves (glass, ores, grass blocks…).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  fortune:               { effect: "Multiplies ore/crop drops — up to ×(level+1).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  power:                 { effect: "Arrow damage +25% × (level + 1).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  punch:                 { effect: "Arrow knockback +3 blocks per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  flame:                 { effect: "Arrows set targets on fire (5s).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  infinity:              { effect: "Shooting consumes no arrows (need 1 in inventory; tipped/spectral still consumed).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  quick_charge:          { effect: "Crossbow load time -0.25s per level.", source: "Enchanting table, librarian trades, loot chests (Bastion, Pillager Outpost)." },
  multishot:             { effect: "Fires 3 projectiles in a spread for 1 ammo (durability ×3).", source: "Enchanting table, librarian trades, loot chests." },
  piercing:              { effect: "Arrows pass through level+1 entities; bolts can be picked back up.", source: "Enchanting table, librarian trades, loot chests." },
  impaling:              { effect: "+2.5 damage per level vs aquatic mobs (guardians, dolphins… not drowned in Java).", source: "Enchanting table, librarian trades, loot chests, fishing." },
  loyalty:               { effect: "Thrown trident returns; higher levels return faster.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  riptide:               { effect: "Throwing launches YOU forward — only in water or rain. Trident doesn't leave your hand.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  channeling:            { effect: "Hitting a mob during a thunderstorm summons lightning.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  luck_of_the_sea:       { effect: "Treasure catch chance 5% → ~7/9/11%; less junk.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  lure:                  { effect: "Fish bite 5s sooner per level.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  unbreaking:            { effect: "Tools: only 1/(level+1) chance to lose durability. Armor: ~60–70% chance instead of 100%.", source: "Enchanting table, librarian trades, loot chests, fishing." },
  mending:               { effect: "Collected XP repairs the item (2 durability per XP point) instead of leveling you.", source: "TREASURE ONLY — librarian trades, loot chests, fishing. Not from the table.", treasure: true },
  curse_of_binding:      { effect: "CURSE: worn armor cannot be taken off (until death or it breaks).", source: "TREASURE ONLY — loot chests, fishing, librarian trades.", treasure: true },
  curse_of_vanishing:    { effect: "CURSE: item vanishes on death instead of dropping.", source: "TREASURE ONLY — loot chests, fishing, librarian trades.", treasure: true },
};

// Smithing template sourcing (armor trim patterns) + duplication.
// Duplicate recipe: 7 diamonds + 1 template + the listed block → 2 templates.
const TEMPLATE_INFO = {
  sentry:    { where: "Pillager Outpost chests (25%)", dupe: "Cobblestone" },
  dune:      { where: "Desert Pyramid chests (14.3%)", dupe: "Sandstone" },
  coast:     { where: "Shipwreck treasure/map/supply chests (16.7%)", dupe: "Cobblestone" },
  wild:      { where: "Jungle Pyramid chests (33.3%)", dupe: "Mossy Cobblestone" },
  ward:      { where: "Ancient City chests (5%)", dupe: "Cobbled Deepslate" },
  eye:       { where: "Stronghold library & altar chests (100%)", dupe: "End Stone" },
  vex:       { where: "Woodland Mansion chests (50%)", dupe: "Cobblestone" },
  tide:      { where: "Elder Guardian drop (20% on death)", dupe: "Prismarine" },
  snout:     { where: "Bastion Remnant chests (8.3%)", dupe: "Blackstone" },
  rib:       { where: "Nether Fortress chests (6.7%)", dupe: "Netherrack" },
  spire:     { where: "End City chests (6.7%)", dupe: "Purpur Block" },
  wayfinder: { where: "Trail Ruins suspicious gravel (8.3%)", dupe: "Terracotta" },
  shaper:    { where: "Trail Ruins suspicious gravel (8.3%)", dupe: "Terracotta" },
  silence:   { where: "Ancient City chests (1.2%) — rarest trim", dupe: "Cobbled Deepslate" },
  raiser:    { where: "Trail Ruins suspicious gravel (8.3%)", dupe: "Terracotta" },
  host:      { where: "Trail Ruins suspicious gravel (8.3%)", dupe: "Terracotta" },
  flow:      { where: "Trial Chambers ominous vaults (22.5%)", dupe: "Breeze Rod" },
  bolt:      { where: "Trial Chambers vaults/reward chests (6.3%)", dupe: "Block of Copper" },
};

const NETHERITE_UPGRADE_INFO = {
  where: "Bastion Remnant treasure room chest (100%), other bastion chests (~10%)",
  dupe: "Netherrack",
  use: "Required at a smithing table to upgrade diamond gear to netherite (+1 netherite ingot).",
};
