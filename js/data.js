// ============================================================
// Loadout Forge — Game data for Minecraft: Java Edition 26.2
// Sourced from minecraft.wiki (Enchanting, Smithing, Spear,
// Copper Age pages). Single-version build: Java 26.2.
// ============================================================

const GAME_VERSION = "Java Edition 26.2";

// ---------- Enchantments ----------
// exclusive: ids that cannot coexist with this enchantment.
const ENCHANTS = {
  // Armor
  protection:            { name: "Protection",            max: 4, exclusive: ["fire_protection", "blast_protection", "projectile_protection"] },
  fire_protection:       { name: "Fire Protection",       max: 4, exclusive: ["protection", "blast_protection", "projectile_protection"] },
  blast_protection:      { name: "Blast Protection",      max: 4, exclusive: ["protection", "fire_protection", "projectile_protection"] },
  projectile_protection: { name: "Projectile Protection", max: 4, exclusive: ["protection", "fire_protection", "blast_protection"] },
  thorns:                { name: "Thorns",                max: 3, exclusive: [] },
  respiration:           { name: "Respiration",           max: 3, exclusive: [] },
  aqua_affinity:         { name: "Aqua Affinity",         max: 1, exclusive: [] },
  swift_sneak:           { name: "Swift Sneak",           max: 3, exclusive: [] },
  feather_falling:       { name: "Feather Falling",       max: 4, exclusive: [] },
  depth_strider:         { name: "Depth Strider",         max: 3, exclusive: ["frost_walker"] },
  frost_walker:          { name: "Frost Walker",          max: 2, exclusive: ["depth_strider"] },
  soul_speed:            { name: "Soul Speed",            max: 3, exclusive: [] },

  // Melee
  sharpness:          { name: "Sharpness",          max: 5, exclusive: ["smite", "bane_of_arthropods", "density", "breach"] },
  smite:              { name: "Smite",              max: 5, exclusive: ["sharpness", "bane_of_arthropods", "density", "breach"] },
  bane_of_arthropods: { name: "Bane of Arthropods", max: 5, exclusive: ["sharpness", "smite", "density", "breach"] },
  knockback:          { name: "Knockback",          max: 2, exclusive: [] },
  fire_aspect:        { name: "Fire Aspect",        max: 2, exclusive: [] },
  looting:            { name: "Looting",            max: 3, exclusive: [] },
  sweeping_edge:      { name: "Sweeping Edge",      max: 3, exclusive: [] },
  lunge:              { name: "Lunge",              max: 3, exclusive: [] },

  // Mace
  density:    { name: "Density",    max: 5, exclusive: ["breach", "sharpness", "smite", "bane_of_arthropods"] },
  breach:     { name: "Breach",     max: 4, exclusive: ["density", "sharpness", "smite", "bane_of_arthropods"] },
  wind_burst: { name: "Wind Burst", max: 3, exclusive: [] },

  // Tools
  efficiency: { name: "Efficiency", max: 5, exclusive: [] },
  silk_touch: { name: "Silk Touch", max: 1, exclusive: ["fortune"] },
  fortune:    { name: "Fortune",    max: 3, exclusive: ["silk_touch"] },

  // Bow
  power:    { name: "Power",    max: 5, exclusive: [] },
  punch:    { name: "Punch",    max: 2, exclusive: [] },
  flame:    { name: "Flame",    max: 1, exclusive: [] },
  infinity: { name: "Infinity", max: 1, exclusive: ["mending"] },

  // Crossbow
  quick_charge: { name: "Quick Charge", max: 3, exclusive: [] },
  multishot:    { name: "Multishot",    max: 1, exclusive: ["piercing"] },
  piercing:     { name: "Piercing",     max: 4, exclusive: ["multishot"] },

  // Trident
  impaling:   { name: "Impaling",   max: 5, exclusive: [] },
  loyalty:    { name: "Loyalty",    max: 3, exclusive: ["riptide"] },
  riptide:    { name: "Riptide",    max: 3, exclusive: ["loyalty", "channeling"] },
  channeling: { name: "Channeling", max: 1, exclusive: ["riptide"] },

  // Fishing rod
  luck_of_the_sea: { name: "Luck of the Sea", max: 3, exclusive: [] },
  lure:            { name: "Lure",            max: 3, exclusive: [] },

  // Universal
  unbreaking:         { name: "Unbreaking",         max: 3, exclusive: [] },
  mending:            { name: "Mending",            max: 1, exclusive: ["infinity"] },
  curse_of_binding:   { name: "Curse of Binding",   max: 1, exclusive: [], curse: true },
  curse_of_vanishing: { name: "Curse of Vanishing", max: 1, exclusive: [], curse: true },
};

// ---------- Enchant sets per item kind ----------
const ARMOR_COMMON = ["protection", "fire_protection", "blast_protection", "projectile_protection",
  "thorns", "unbreaking", "mending", "curse_of_binding", "curse_of_vanishing"];

const ENCHANT_SETS = {
  helmet:     [...ARMOR_COMMON, "respiration", "aqua_affinity"],
  chestplate: [...ARMOR_COMMON],
  leggings:   [...ARMOR_COMMON, "swift_sneak"],
  boots:      [...ARMOR_COMMON, "feather_falling", "depth_strider", "frost_walker", "soul_speed"],
  elytra:     ["unbreaking", "mending", "curse_of_binding", "curse_of_vanishing"],

  sword:   ["sharpness", "smite", "bane_of_arthropods", "knockback", "fire_aspect", "looting",
            "sweeping_edge", "unbreaking", "mending", "curse_of_vanishing"],
  spear:   ["sharpness", "smite", "bane_of_arthropods", "knockback", "fire_aspect", "looting",
            "lunge", "unbreaking", "mending", "curse_of_vanishing"],
  axe:     ["sharpness", "smite", "bane_of_arthropods", "efficiency", "silk_touch", "fortune",
            "unbreaking", "mending", "curse_of_vanishing"],
  pickaxe: ["efficiency", "silk_touch", "fortune", "unbreaking", "mending", "curse_of_vanishing"],
  shovel:  ["efficiency", "silk_touch", "fortune", "unbreaking", "mending", "curse_of_vanishing"],
  hoe:     ["efficiency", "silk_touch", "fortune", "unbreaking", "mending", "curse_of_vanishing"],

  mace:        ["density", "breach", "smite", "bane_of_arthropods", "fire_aspect", "wind_burst",
                "unbreaking", "mending", "curse_of_vanishing"],
  bow:         ["power", "punch", "flame", "infinity", "unbreaking", "mending", "curse_of_vanishing"],
  crossbow:    ["quick_charge", "multishot", "piercing", "unbreaking", "mending", "curse_of_vanishing"],
  trident:     ["impaling", "loyalty", "riptide", "channeling", "unbreaking", "mending", "curse_of_vanishing"],
  fishing_rod: ["luck_of_the_sea", "lure", "unbreaking", "mending", "curse_of_vanishing"],
  shears:      ["efficiency", "unbreaking", "mending", "curse_of_vanishing"],
  shield:      ["unbreaking", "mending", "curse_of_vanishing"],
};

// ---------- Materials ----------
// Armor tiers (turtle: helmet only)
const ARMOR_MATERIALS = {
  leather:   { name: "Leather" },
  chainmail: { name: "Chainmail" },
  copper:    { name: "Copper" },
  iron:      { name: "Iron" },
  golden:    { name: "Golden" },
  diamond:   { name: "Diamond" },
  netherite: { name: "Netherite" },
  turtle:    { name: "Turtle Shell", only: ["helmet"] },
};

// Tool/weapon tiers (sword, spear, pickaxe, axe, shovel, hoe)
const TOOL_MATERIALS = {
  wooden:    { name: "Wooden" },
  stone:     { name: "Stone" },
  copper:    { name: "Copper" },
  iron:      { name: "Iron" },
  golden:    { name: "Golden" },
  diamond:   { name: "Diamond" },
  netherite: { name: "Netherite" },
};

// ---------- Items ----------
const ITEM_DEFS = {
  helmet:      { name: "Helmet",      slot: "head",  tiered: "armor", trims: true },
  chestplate:  { name: "Chestplate",  slot: "chest", tiered: "armor", trims: true },
  leggings:    { name: "Leggings",    slot: "legs",  tiered: "armor", trims: true },
  boots:       { name: "Boots",       slot: "feet",  tiered: "armor", trims: true },
  elytra:      { name: "Elytra",      slot: "chest", tiered: null,    trims: false },

  sword:       { name: "Sword",       tiered: "tool" },
  spear:       { name: "Spear",       tiered: "tool" },
  pickaxe:     { name: "Pickaxe",     tiered: "tool" },
  axe:         { name: "Axe",         tiered: "tool" },
  shovel:      { name: "Shovel",      tiered: "tool" },
  hoe:         { name: "Hoe",         tiered: "tool" },
  mace:        { name: "Mace",        tiered: null },
  bow:         { name: "Bow",         tiered: null },
  crossbow:    { name: "Crossbow",    tiered: null },
  trident:     { name: "Trident",     tiered: null },
  fishing_rod: { name: "Fishing Rod", tiered: null },
  shears:      { name: "Shears",      tiered: null },
  shield:      { name: "Shield",      tiered: null },
};

const GEAR_PICKER = ["sword", "spear", "axe", "pickaxe", "shovel", "hoe", "mace",
  "bow", "crossbow", "trident", "fishing_rod", "shears", "shield"];

// ---------- Armor trims ----------
const TRIM_PATTERNS = {
  sentry:    { name: "Sentry",    style: "edges"   },
  dune:      { name: "Dune",      style: "chevron" },
  coast:     { name: "Coast",     style: "stripe"  },
  wild:      { name: "Wild",      style: "studs"   },
  ward:      { name: "Ward",      style: "edges"   },
  eye:       { name: "Eye",       style: "studs"   },
  vex:       { name: "Vex",       style: "chevron" },
  tide:      { name: "Tide",      style: "stripe"  },
  snout:     { name: "Snout",     style: "studs"   },
  rib:       { name: "Rib",       style: "stripe"  },
  spire:     { name: "Spire",     style: "chevron" },
  wayfinder: { name: "Wayfinder", style: "edges"   },
  shaper:    { name: "Shaper",    style: "stripe"  },
  silence:   { name: "Silence",   style: "edges"   },
  raiser:    { name: "Raiser",    style: "chevron" },
  host:      { name: "Host",      style: "studs"   },
  flow:      { name: "Flow",      style: "stripe"  },
  bolt:      { name: "Bolt",      style: "chevron" },
};

const TRIM_MATERIALS = {
  amethyst:  { name: "Amethyst",     color: "#9a5cc6", dark: "#71399e" },
  copper:    { name: "Copper",       color: "#c06f45", dark: "#8f4f30" },
  diamond:   { name: "Diamond",      color: "#6eecd2", dark: "#3ab3a0" },
  emerald:   { name: "Emerald",      color: "#17c144", dark: "#0e8a2f" },
  gold:      { name: "Gold",         color: "#ecd93f", dark: "#c8a221" },
  iron:      { name: "Iron",         color: "#c9c9c9", dark: "#909090" },
  lapis:     { name: "Lapis Lazuli", color: "#33619c", dark: "#234570" },
  netherite: { name: "Netherite",    color: "#6a5c5c", dark: "#443c3c" },
  quartz:    { name: "Quartz",       color: "#e6dfd5", dark: "#b5aa99" },
  redstone:  { name: "Redstone",     color: "#c81e1e", dark: "#8e1414" },
  resin:     { name: "Resin Brick",  color: "#e07a28", dark: "#a8541a" },
};

// ---------- Helpers ----------
const ROMAN = ["", "I", "II", "III", "IV", "V"];

function itemDisplayName(item) {
  const def = ITEM_DEFS[item.kind];
  if (item.kind === "elytra" || !def.tiered) return def.name;
  const mats = def.tiered === "armor" ? ARMOR_MATERIALS : TOOL_MATERIALS;
  return `${mats[item.material].name} ${def.name}`;
}
