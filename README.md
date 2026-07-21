# Loadout Forge

A sleek, Minecraft-styled web app for planning gear loadouts — armor sets, tools,
enchantments, and armor trims — for **Minecraft: Java Edition 26.2**, rendered with
the real game textures on a live 3D armor stand or player model.

Game data (enchantments, conflicts, trim patterns/materials, gear tiers) is sourced
from [minecraft.wiki](https://minecraft.wiki), including post-1.21 additions:
copper armor & tools (Copper Age, 1.21.9), the spear with its Lunge enchantment,
and the Resin Brick trim material.

## Features

- **3D preview** — armor stand or player model (wide/slim) wearing the full loadout,
  with drag-rotate, scroll-zoom, auto-spin, and an animated enchant glint.
  Pick any of the 9 default skins or upload your own skin PNG
- **Real game assets** — item icons, armor layers, trims and skins come straight
  from your own installed Minecraft jar; trims use the game's actual palette-key
  remapping (including the "darker" variants when trim matches armor material)
- **Armor planner** — helmet / chestplate / leggings / boots (or elytra in the chest
  slot), across all 8 armor materials including copper and turtle shell
- **Gear planner** — 13 gear types; tiered tools & weapons in all 7 tiers
- **Armor trims** — all 18 smithing-template patterns × 11 trim materials, rendered
  live on the piece in 2D and 3D
- **Enchantments** — full per-item enchant lists with level pickers, conflict
  detection (grayed rows show what blocks them), one-click "Max non-conflicting"
- **Live item stats** — durability (with the exact Unbreaking expected-life math,
  which differs for tools vs armor), attack damage/speed/DPS, armor & toughness,
  and per-enchant effect lines that update as you edit (Sharpness totals, smash
  bonus with Density, Protection %, Lunge dash speed…). Verified against minecraft.wiki
- **Inspect (ⓘ)** — every enchantment and smithing template has an info card:
  what it does per level, where to find it (treasure-only sources flagged),
  and for templates the real **crafting table / smithing table GUIs** rendered
  from the game's own interface textures, with recipe items placed in the slots
  (blocks drawn as isometric cubes, result counts, your actual selected item
  shown as the smithing base/result)
- **Inventory-style loadout panel** — the classic light-gray dialog with
  authentic slot bevels and the game's own ghost silhouette sprites for empty
  armor slots
- **Loadout save slots** — save, load, and delete named loadouts
- **Anvil ordering tool** — computes the cheapest order to combine enchanted
  books on an anvil (subset-DP over merge trees minimizing total XP, with prior-work
  penalties and the 40-level Too Expensive cap; inspired by
  [iamcal's enchant-order](https://iamcal.github.io/enchant-order/)). Per-item
  step-by-step plan plus a summary on every item card
- **All-items view** — deselect (Esc, re-click, or "View all items") to see
  every equipped piece as an in-game-style card with its trim, enchants, and
  anvil cost at a glance
- **Light / dark mode** — toggle between the classic Minecraft GUI palette and
  the dark theme, applied across the whole app
- **Loadout totals** — full-build summary card: armor points, toughness,
  knockback resistance, EPF damage reduction per type, and total anvil cost
- **Shopping list** — everything the build needs: templates (with sources and
  duplication recipes), trim materials, netherite upgrades/ingots, and every
  enchanted book, aggregated across all items
- **Held item** — the selected (or first) gear piece renders in the model's hand
- **Share links** — the whole build compressed into the URL fragment; send the
  link, no backend involved
- **In-browser jar import** — pick your Minecraft .jar right in the app
  (dependency-free zip parser + DecompressionStream); textures are stored in
  IndexedDB and everything runs without ever running the shell script
- **In-game style tooltips**, autosave to localStorage, "Copy Build" JSON export

## Setup

Textures are not bundled (they belong to your licensed game copy). Either use
the in-app **"Import game assets…"** button (footer) and pick your version .jar —
or extract to disk:

```sh
./extract-assets.sh                  # auto-locates your newest installed version
./extract-assets.sh 26.2             # specific version
./extract-assets.sh /path/to/x.jar   # explicit jar
```

Then serve the folder — no build step, no dependencies:

```sh
python3 .claude/serve.py     # http://127.0.0.1:5173
```

## Structure

- `index.html` — page shell
- `css/style.css` — Minecraft-inspired UI (inventory slots, MC buttons, tooltips)
- `js/data.js` — game data: enchantments, conflicts, trims, materials, items
- `js/assets.js` — texture loading, trim palette remapping, leather tint, icon composition
- `js/guis.js` — crafting/smithing GUI renderers for Inspect (real interface textures)
- `js/stats.js` — durability/damage/armor tables, enchant math, sourcing knowledge base
- `js/anvil.js` — anvil combine-order solver (Java anvil mechanics, XP-point optimal)
- `js/jarimport.js` — in-browser jar importer (zip parser → IndexedDB texture store)
- `js/dialogs.js` — build import/share + modal dialogs (inspect, anvil, shopping, jar)
- `tests.html` — standalone logic tests for `anvil.js` and `stats.js` (open in a browser)
- `js/viewer3d.js` — dependency-free WebGL renderer (player / armor stand / armor / elytra)
- `js/sprites.js` — icon canvas + glint loop (procedural pixel-art fallback)
- `js/app.js` — state, editor UI, persistence
- `extract-assets.sh` — pulls required textures from your installed Minecraft jar

Textures in `assets/` are extracted from a legally owned copy of Minecraft for
strictly personal, non-commercial use — do not redistribute them.

## Roadmap

- Support for older game versions (version picker driving the data tables)
- Anvil XP cost estimation
- Shareable build links (state encoded in URL)
