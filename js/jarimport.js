// ============================================================
// Loadout Forge — in-browser jar asset importer
// Lets anyone pick their own Minecraft .jar (a zip file), parses
// it with no dependencies (DataView + DecompressionStream), and
// stores the needed textures in IndexedDB. Textures then resolve
// from the import instead of the served assets/ directory.
// ============================================================

const ASSET_DB = "loadout-forge-assets";
const ASSET_STORE = "tex";
const TEX_PREFIX = "assets/minecraft/textures/";

// Which jar entries we keep — mirrors extract-assets.sh
const WANTED_TEXTURES = [
  /^assets\/minecraft\/textures\/entity\/equipment\/humanoid(_leggings)?\//,
  /^assets\/minecraft\/textures\/entity\/equipment\/wings\/elytra\.png$/,
  /^assets\/minecraft\/textures\/entity\/player\//,
  /^assets\/minecraft\/textures\/entity\/armorstand\//,
  /^assets\/minecraft\/textures\/trims\//,
  /^assets\/minecraft\/textures\/gui\/container\/(crafting_table|smithing|inventory)\.png$/,
  /^assets\/minecraft\/textures\/gui\/sprites\/container\/slot(\.png$|\/)/,
  /^assets\/minecraft\/textures\/block\/(blackstone|cobbled_deepslate|cobblestone|copper_block|end_stone|mossy_cobblestone|netherrack|prismarine|purpur_block|sandstone|terracotta)\.png$/,
  /^assets\/minecraft\/textures\/item\/[a-z_]*(sword|spear|spear_in_hand|pickaxe|_axe|shovel|_hoe|helmet|chestplate|leggings|boots)(_overlay)?\.png$/,
  /^assets\/minecraft\/textures\/item\/[a-z_]*_smithing_template\.png$/,
  /^assets\/minecraft\/textures\/item\/(elytra|elytra_broken|mace|bow|crossbow_standby|trident|fishing_rod|shears|enchanted_book|amethyst_shard|breeze_rod|copper_ingot|diamond|emerald|gold_ingot|iron_ingot|lapis_lazuli|netherite_ingot|quartz|redstone|resin_brick)\.png$/,
];

function openAssetDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ASSET_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ASSET_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Boot: hydrate the texURL map from any previously imported jar.
async function loadImportedAssets() {
  try {
    const db = await openAssetDB();
    const entries = await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readonly").objectStore(ASSET_STORE);
      const keys = tx.getAllKeys();
      const vals = tx.getAll();
      let k, v;
      keys.onsuccess = () => { k = keys.result; if (v) resolve([k, v]); };
      vals.onsuccess = () => { v = vals.result; if (k) resolve([k, v]); };
      tx.transaction.onerror = () => reject(tx.transaction.error);
    });
    const [keys, blobs] = entries;
    keys.forEach((key, i) => _importedTex.set(key, URL.createObjectURL(blobs[i])));
    return keys.length;
  } catch (err) {
    console.warn("asset import unavailable:", err);
    return 0;
  }
}

// ---------- minimal zip reader ----------
function parseZipEntries(buf) {
  const dv = new DataView(buf);
  // find End Of Central Directory record (scan back through max comment size)
  let eocd = -1;
  const stop = Math.max(0, buf.byteLength - 65558);
  for (let i = buf.byteLength - 22; i >= stop; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a zip/jar file (no central directory)");

  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const entries = [];
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = dec.decode(new Uint8Array(buf, off + 46, nameLen));
    entries.push({ name, method, csize, lho });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function extractZipEntry(buf, dv, entry) {
  const nameLen = dv.getUint16(entry.lho + 26, true);
  const extraLen = dv.getUint16(entry.lho + 28, true);
  const start = entry.lho + 30 + nameLen + extraLen;
  const data = buf.slice(start, start + entry.csize);
  if (entry.method === 0) return new Blob([data], { type: "image/png" });
  if (entry.method !== 8) throw new Error("Unsupported compression: " + entry.method);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Blob([await new Response(stream).arrayBuffer()], { type: "image/png" });
}

// ---------- import flow ----------
async function importJarFile(file, onProgress) {
  onProgress?.("Reading " + file.name + "…");
  const buf = await file.arrayBuffer();
  const dv = new DataView(buf);
  const entries = parseZipEntries(buf)
    .filter(e => WANTED_TEXTURES.some(re => re.test(e.name)));
  if (!entries.length) {
    throw new Error("No Minecraft textures found in this file — pick the game's version .jar (e.g. 26.2.jar).");
  }

  const db = await openAssetDB();
  let done = 0;
  for (const entry of entries) {
    const blob = await extractZipEntry(buf, dv, entry);
    const key = entry.name.slice(TEX_PREFIX.length);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readwrite");
      tx.objectStore(ASSET_STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    done++;
    if (done % 25 === 0) onProgress?.(`Extracting textures… ${done}/${entries.length}`);
  }
  onProgress?.(`Imported ${done} textures.`);
  return done;
}

// True when the served assets/ directory is missing (fresh clone, no
// extract-assets.sh run) and nothing has been imported yet.
async function assetsMissing() {
  if (_importedTex.size > 0) return false;
  try {
    const res = await fetch(TEX_ROOT + "item/diamond.png", { method: "HEAD" });
    return !res.ok;
  } catch {
    return true;
  }
}
