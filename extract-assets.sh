#!/bin/zsh
# Extracts the textures Loadout Forge needs from a locally installed
# Minecraft: Java Edition jar (your own licensed copy).
#
# Usage: ./extract-assets.sh              auto-locate newest installed version
#        ./extract-assets.sh 26.2         specific version
#        ./extract-assets.sh /path/to.jar explicit jar path
#
# (You can also skip this script entirely: the app's "Import game
#  assets…" button loads a jar directly in the browser.)

set -e
cd "$(dirname "$0")"

# Find the .minecraft versions dir for this OS
find_versions_dir() {
  for dir in \
    "$HOME/Library/Application Support/minecraft/versions" \
    "$HOME/.minecraft/versions" \
    "$APPDATA/.minecraft/versions"; do
    [[ -d "$dir" ]] && { echo "$dir"; return; }
  done
  return 1
}

ARG="${1:-}"
if [[ "$ARG" == *.jar ]]; then
  JAR="$ARG"
else
  VERSIONS_DIR="$(find_versions_dir)" || {
    echo "Couldn't find a .minecraft installation. Pass the jar path directly:" >&2
    echo "  ./extract-assets.sh /path/to/26.2.jar" >&2
    exit 1
  }
  if [[ -n "$ARG" ]]; then
    VERSION="$ARG"
  else
    # newest release version (skips snapshots and modded profiles)
    VERSION="$(ls "$VERSIONS_DIR" | grep -E '^[0-9]+(\.[0-9]+)+$' | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)"
    if [[ -z "$VERSION" ]]; then
      echo "No release versions found in $VERSIONS_DIR" >&2
      echo "Installed versions:" >&2
      ls "$VERSIONS_DIR" >&2
      exit 1
    fi
    echo "Auto-selected newest installed release: $VERSION"
  fi
  JAR="$VERSIONS_DIR/$VERSION/$VERSION.jar"
fi

if [[ ! -f "$JAR" ]]; then
  echo "Jar not found: $JAR" >&2
  VERSIONS_DIR="$(find_versions_dir 2>/dev/null)" && { echo "Installed versions:" >&2; ls "$VERSIONS_DIR" >&2; }
  exit 1
fi

echo "Extracting from $JAR ..."
unzip -o -q "$JAR" \
  "assets/minecraft/textures/entity/equipment/humanoid/*" \
  "assets/minecraft/textures/entity/equipment/humanoid_leggings/*" \
  "assets/minecraft/textures/entity/equipment/wings/elytra.png" \
  "assets/minecraft/textures/entity/player/*" \
  "assets/minecraft/textures/entity/armorstand/*" \
  "assets/minecraft/textures/trims/*" \
  -d .

for f in sword spear pickaxe axe shovel hoe; do
  unzip -o -q "$JAR" "assets/minecraft/textures/item/*_${f}.png" -d . 2>/dev/null || true
done

unzip -o -q "$JAR" \
  "assets/minecraft/textures/item/*helmet*.png" \
  "assets/minecraft/textures/item/*chestplate*.png" \
  "assets/minecraft/textures/item/*leggings*.png" \
  "assets/minecraft/textures/item/*boots*.png" \
  "assets/minecraft/textures/item/elytra.png" \
  "assets/minecraft/textures/item/mace.png" \
  "assets/minecraft/textures/item/bow.png" \
  "assets/minecraft/textures/item/crossbow_standby.png" \
  "assets/minecraft/textures/item/trident.png" \
  "assets/minecraft/textures/item/fishing_rod.png" \
  "assets/minecraft/textures/item/shears.png" \
  "assets/minecraft/textures/item/*_armor_trim_smithing_template.png" \
  "assets/minecraft/textures/item/netherite_upgrade_smithing_template.png" \
  "assets/minecraft/textures/entity/shield/shield_base_nopattern.png" \
  -d .

# GUI sheets, slot ghost sprites, and recipe ingredients (Inspect views)
unzip -o -q "$JAR" \
  "assets/minecraft/textures/gui/container/crafting_table.png" \
  "assets/minecraft/textures/gui/container/smithing.png" \
  "assets/minecraft/textures/gui/container/inventory.png" \
  "assets/minecraft/textures/gui/sprites/container/slot/*" \
  "assets/minecraft/textures/gui/sprites/container/slot.png" \
  "assets/minecraft/textures/item/amethyst_shard.png" \
  "assets/minecraft/textures/item/breeze_rod.png" \
  "assets/minecraft/textures/item/copper_ingot.png" \
  "assets/minecraft/textures/item/diamond.png" \
  "assets/minecraft/textures/item/emerald.png" \
  "assets/minecraft/textures/item/gold_ingot.png" \
  "assets/minecraft/textures/item/iron_ingot.png" \
  "assets/minecraft/textures/item/lapis_lazuli.png" \
  "assets/minecraft/textures/item/netherite_ingot.png" \
  "assets/minecraft/textures/item/quartz.png" \
  "assets/minecraft/textures/item/redstone.png" \
  "assets/minecraft/textures/item/resin_brick.png" \
  "assets/minecraft/textures/item/enchanted_book.png" \
  "assets/minecraft/textures/block/blackstone.png" \
  "assets/minecraft/textures/block/cobbled_deepslate.png" \
  "assets/minecraft/textures/block/cobblestone.png" \
  "assets/minecraft/textures/block/copper_block.png" \
  "assets/minecraft/textures/block/end_stone.png" \
  "assets/minecraft/textures/block/mossy_cobblestone.png" \
  "assets/minecraft/textures/block/netherrack.png" \
  "assets/minecraft/textures/block/prismarine.png" \
  "assets/minecraft/textures/block/purpur_block.png" \
  "assets/minecraft/textures/block/sandstone.png" \
  "assets/minecraft/textures/block/terracotta.png" \
  -d .

echo "Done: $(find assets -name '*.png' | wc -l | tr -d ' ') textures in assets/"
