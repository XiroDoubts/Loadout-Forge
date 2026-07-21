// ============================================================
// Loadout Forge — build I/O + modal dialogs
// Extracted from app.js: import/share/sanitize, loadout totals +
// shopping list, jar importer, anvil planner, and inspect cards.
// All functions are globals invoked from app.js render code.
// ============================================================

// ----- Import build -----
// Validates every field against game data; anything unrecognized is dropped.
function sanitizeItem(raw, allowedKinds) {
  if (!raw || typeof raw !== "object") return null;
  const def = ITEM_DEFS[raw.kind];
  if (!def || (allowedKinds && !allowedKinds.includes(raw.kind))) return null;

  const item = { kind: raw.kind, material: null, trim: null, enchants: {} };

  if (def.tiered) {
    const mats = def.tiered === "armor" ? ARMOR_MATERIALS : TOOL_MATERIALS;
    const m = mats[raw.material];
    item.material = (m && (!m.only || m.only.includes(raw.kind))) ? raw.material : "iron";
  }

  if (def.trims && raw.trim && TRIM_PATTERNS[raw.trim.pattern] && TRIM_MATERIALS[raw.trim.material]) {
    item.trim = { pattern: raw.trim.pattern, material: raw.trim.material };
  }

  if (raw.enchants && typeof raw.enchants === "object") {
    for (const [id, lvl] of Object.entries(raw.enchants)) {
      if (!ENCHANT_SETS[item.kind].includes(id)) continue;
      const level = Math.min(Math.max(1, Math.floor(lvl)), ENCHANTS[id].max);
      if (Number.isFinite(level)) setEnchant(item, id, level); // enforces conflicts
    }
  }
  return item;
}

function importBuild(text) {
  let data;
  try { data = JSON.parse(text); } catch { return "That isn't valid JSON."; }
  if (!data || typeof data !== "object" || (!data.slots && !data.gear)) {
    return "No loadout data found — expected the JSON from Copy Build.";
  }
  const slotKinds = { head: ["helmet"], chest: ["chestplate", "elytra"], legs: ["leggings"], feet: ["boots"] };
  const slots = { head: null, chest: null, legs: null, feet: null };
  for (const [key, kinds] of Object.entries(slotKinds)) {
    slots[key] = sanitizeItem(data.slots?.[key], kinds);
  }
  const gear = Array(9).fill(null);
  if (Array.isArray(data.gear)) {
    data.gear.slice(0, 9).forEach((raw, i) => { gear[i] = sanitizeItem(raw, GEAR_PICKER); });
  }
  state.slots = slots;
  state.gear = gear;
  state.sel = null;
  state.activeSave = null;
  renderAll();
  return null; // success
}

function openImport() {
  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel inspect-modal");
  modal.appendChild(el("h3", "panel-title", "Import Build"));
  modal.appendChild(el("div", "inspect-text",
    "Paste a build copied with “Copy Build” (from any browser or friend):"));
  const ta = document.createElement("textarea");
  ta.className = "mc-input import-area";
  ta.placeholder = '{"version":"Java Edition 26.2","slots":{...},"gear":[...]}';
  modal.appendChild(ta);
  const err = el("div", "inspect-text conflict");
  err.style.display = "none";
  modal.appendChild(err);
  const btns = el("div", "btn-row");
  const load = el("button", "btn small", "Load build");
  load.onclick = () => {
    const problem = importBuild(ta.value.trim());
    if (problem) { err.textContent = problem; err.style.display = "block"; return; }
    document.body.removeChild(overlay);
  };
  const cancel = el("button", "btn small ghost", "Cancel");
  cancel.onclick = () => document.body.removeChild(overlay);
  btns.appendChild(load);
  btns.appendChild(cancel);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
  ta.focus();
}

// ----- Loadout totals card + shopping list -----
function buildTotalsCard(items) {
  const armorItems = ARMOR_SLOTS.map(s => state.slots[s.key]).filter(Boolean);
  const t = loadoutTotals(armorItems, items);

  const card = el("div", "item-card totals-card");
  card.appendChild(el("div", "item-card-name", "Loadout Totals"));

  const body = el("div", "totals-body");
  const row = (label, value) => {
    const r = el("div", "totals-row");
    r.appendChild(el("span", "totals-label", label));
    r.appendChild(el("span", "totals-value", value));
    body.appendChild(r);
  };
  row("Armor", `${t.armor} / 20`);
  if (t.toughness) row("Toughness", `+${t.toughness}`);
  if (t.kbResist) row("Knockback Resist", `${Math.round(t.kbResist * 100)}%`);
  row("All damage", `−${epfReduction(t.epf.all, 0)}%`);
  if (t.epf.fire) row("Fire damage", `−${epfReduction(t.epf.all, t.epf.fire)}%`);
  if (t.epf.blast) row("Explosions", `−${epfReduction(t.epf.all, t.epf.blast)}%`);
  if (t.epf.projectile) row("Projectiles", `−${epfReduction(t.epf.all, t.epf.projectile)}%`);
  if (t.epf.fall) row("Fall damage", `−${Math.min(epfReduction(t.epf.all, t.epf.fall), 80)}%`);
  if (t.anvilItems) {
    row("Anvil work", `${t.anvilLevels} levels · ~${t.anvilPoints.toLocaleString()} XP` +
      (t.tooExpensive ? " ⚠" : ""));
  }
  card.appendChild(body);

  const shopBtn = el("button", "btn small", "📋 Shopping list");
  shopBtn.onclick = (e) => { e.stopPropagation(); openShoppingList(items); };
  card.appendChild(shopBtn);
  return card;
}

function openShoppingList(items) {
  const list = buildShoppingList(items);
  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel inspect-modal");
  modal.appendChild(el("h3", "panel-title", "📋 Build Shopping List"));

  const sectionEl = (label) => {
    const b = el("div", "inspect-block");
    b.appendChild(el("div", "inspect-label", label));
    return b;
  };
  const lineWithIcon = (iconPath, text) => {
    const r = el("div", "shop-row");
    const img = document.createElement("img");
    img.className = "anvil-ico";
    img.src = texURL(iconPath);
    r.appendChild(img);
    r.appendChild(el("span", "", text));
    return r;
  };

  if (list.templates.size) {
    const b = sectionEl("Smithing Templates");
    for (const [pat, count] of list.templates) {
      const t = TEMPLATE_INFO[pat];
      b.appendChild(lineWithIcon(templateIconPath(pat),
        `${count}× ${TRIM_PATTERNS[pat].name} — ${t.where}; or duplicate: 7 diamonds + ${t.dupe}`));
    }
    modal.appendChild(b);
  }
  if (list.trimMats.size) {
    const b = sectionEl("Trim Materials");
    for (const [mat, count] of list.trimMats) {
      b.appendChild(lineWithIcon(INGREDIENT_TEX[mat], `${count}× ${TRIM_MATERIALS[mat].name}`));
    }
    modal.appendChild(b);
  }
  if (list.netheriteUpgrades) {
    const b = sectionEl("Netherite");
    b.appendChild(lineWithIcon("item/netherite_upgrade_smithing_template.png",
      `${list.netheriteUpgrades}× Netherite Upgrade template — ${NETHERITE_UPGRADE_INFO.where}`));
    b.appendChild(lineWithIcon("item/netherite_ingot.png",
      `${list.netheriteIngots}× Netherite Ingot (4 scrap + 4 gold each)`));
    modal.appendChild(b);
  }
  if (list.books.size) {
    const b = sectionEl(`Enchanted Books (${[...list.books.values()].reduce((a, c) => a + c, 0)})`);
    for (const [label, count] of [...list.books].sort((x, y) => x[0].localeCompare(y[0]))) {
      b.appendChild(lineWithIcon("item/enchanted_book.png", `${count}× ${label}`));
    }
    modal.appendChild(b);
  }
  if (list.anvilLevels) {
    const b = sectionEl("Anvil Work");
    b.appendChild(el("div", "inspect-text",
      `${list.anvilLevels} levels total (~${list.anvilPoints.toLocaleString()} XP points) across all items — see each item's ⚒ Anvil order for the step-by-step.`));
    modal.appendChild(b);
  }

  const close = el("button", "btn small", "Close");
  close.onclick = () => document.body.removeChild(overlay);
  modal.appendChild(close);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

// ----- Shareable URLs -----
// Build state -> deflate -> base64url in the #b= fragment. No backend.
async function encodeBuildToHash() {
  const json = JSON.stringify({ slots: state.slots, gear: state.gear });
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function decodeBuildFromHash(b64) {
  const bin = atob(b64.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

async function shareBuild() {
  const hash = await encodeBuildToHash();
  const url = location.origin + location.pathname + "#b=" + hash;
  history.replaceState(null, "", "#b=" + hash);
  try {
    await navigator.clipboard.writeText(url);
    flashButton($("#btn-share"), "Link copied!");
  } catch {
    flashButton($("#btn-share"), "Copy failed");
  }
}

async function loadBuildFromURL() {
  if (!location.hash.startsWith("#b=")) return;
  try {
    const text = await decodeBuildFromHash(location.hash.slice(3));
    const problem = importBuild(text); // sanitizes everything
    if (problem) console.warn("shared build rejected:", problem);
  } catch (err) {
    console.warn("could not decode shared build:", err);
  }
}

// ----- Jar asset importer -----
function openJarImporter(firstRun) {
  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel inspect-modal");
  modal.appendChild(el("h3", "panel-title", "Game Assets"));
  if (firstRun) {
    modal.appendChild(el("div", "inspect-text",
      "No textures found. Loadout Forge uses the real game textures from your own Minecraft installation — pick your version .jar below and everything is imported right in the browser (nothing is uploaded anywhere)."));
  } else {
    modal.appendChild(el("div", "inspect-text",
      "Re-import textures from a Minecraft .jar — useful after a game update or on a machine without the assets/ folder. Files are processed locally in your browser."));
  }

  const where = el("div", "inspect-block");
  where.appendChild(el("div", "inspect-label", "Where your jar lives"));
  const paths = el("div", "inspect-text jar-paths");
  paths.innerHTML =
    "<b>macOS</b> ~/Library/Application Support/minecraft/versions/26.2/26.2.jar<br>" +
    "<b>Windows</b> %APPDATA%\\.minecraft\\versions\\26.2\\26.2.jar<br>" +
    "<b>Linux</b> ~/.minecraft/versions/26.2/26.2.jar";
  where.appendChild(paths);
  modal.appendChild(where);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jar,.zip";
  input.id = "jar-file";
  input.hidden = true;
  const pick = el("label", "btn", "Choose .jar file…");
  pick.setAttribute("for", "jar-file");
  const status = el("div", "inspect-text jar-status", "");
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    pick.style.display = "none";
    try {
      await importJarFile(file, msg => { status.textContent = msg; });
      status.textContent = "Done! Reloading with your textures…";
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      status.textContent = "✕ " + err.message;
      pick.style.display = "";
    }
  };
  modal.appendChild(input);
  modal.appendChild(pick);
  modal.appendChild(status);

  const close = el("button", "btn small ghost", "Close");
  close.style.marginTop = "12px";
  close.onclick = () => document.body.removeChild(overlay);
  modal.appendChild(close);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

// ----- Anvil planner modal -----
function openAnvilPlanner(item) {
  const plan = planAnvilOrder(item.enchants);
  if (!plan) return;

  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel inspect-modal anvil-modal");
  modal.appendChild(el("h3", "panel-title", "⚒ Cheapest Anvil Order"));
  modal.appendChild(el("div", "inspect-text",
    `${itemDisplayName(item)} — combine order minimizing total experience:`));

  const bookImg = () => {
    const img = document.createElement("img");
    img.className = "anvil-ico";
    img.src = texURL("item/enchanted_book.png");
    return img;
  };

  plan.steps.forEach((s, i) => {
    const row = el("div", "anvil-step" + (s.tooExpensive ? " too-expensive" : ""));
    row.appendChild(el("span", "anvil-num", String(i + 1)));

    const left = el("span", "anvil-side");
    if (s.itemSoFar) {
      left.appendChild(itemCanvas(item, 2));
      left.appendChild(el("span", "anvil-label",
        s.itemSoFar.length ? "Item (" + s.itemSoFar.join(", ") + ")" : "Item"));
    } else {
      left.appendChild(bookImg());
      left.appendChild(el("span", "anvil-label", s.targetLabels.join(", ")));
    }
    row.appendChild(left);
    row.appendChild(el("span", "anvil-plus", "+"));

    const right = el("span", "anvil-side");
    right.appendChild(bookImg());
    right.appendChild(el("span", "anvil-label", s.sacLabels.join(", ")));
    row.appendChild(right);

    row.appendChild(el("span", "anvil-cost", `${s.levels} lv`));
    modal.appendChild(row);
  });

  const totals = el("div", "anvil-totals",
    `Total: ${plan.totalLevels} levels · ~${plan.totalPoints.toLocaleString()} XP points · priciest step ${plan.maxStep} lv`);
  modal.appendChild(totals);
  if (plan.tooExpensive) {
    modal.appendChild(el("div", "inspect-text conflict",
      "A step reaches 40+ levels — Too Expensive on a survival anvil. Drop an enchantment or apply it earlier."));
  }
  modal.appendChild(el("div", "gui-caption",
    "Assumes a fresh item and one enchantment per book, all unused (no prior work). Book + book combines happen on the anvil too."));

  const close = el("button", "btn small", "Close");
  close.onclick = () => document.body.removeChild(overlay);
  modal.appendChild(close);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

// ----- Inspect modal -----
function openInspect(type, id) {
  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel inspect-modal");

  const add = (label, text, cls) => {
    const b = el("div", "inspect-block");
    b.appendChild(el("div", "inspect-label", label));
    b.appendChild(el("div", "inspect-text " + (cls || ""), text));
    modal.appendChild(b);
  };
  const addGui = (label, canvasPromise, caption) => {
    const b = el("div", "inspect-block");
    b.appendChild(el("div", "inspect-label", label));
    const holder = el("div", "gui-holder");
    b.appendChild(holder);
    if (caption) b.appendChild(el("div", "gui-caption", caption));
    modal.appendChild(b);
    canvasPromise.then(c => {
      c.className = "gui-canvas";
      holder.appendChild(c);
    }).catch(err => console.warn(err));
  };

  if (type === "enchant") {
    const e = ENCHANTS[id];
    const info = ENCHANT_INFO[id];
    modal.appendChild(el("h3", "panel-title" + (e.curse ? " curse-title" : ""),
      e.name + (e.max > 1 ? ` (max ${ROMAN[e.max]})` : "")));
    add("Effect", info.effect);
    add("How to get it", info.source, info.treasure ? "treasure" : "");
    const applies = Object.entries(ENCHANT_SETS)
      .filter(([, list]) => list.includes(id))
      .map(([kind]) => ITEM_DEFS[kind].name);
    add("Applies to", applies.join(", "));
    if (e.exclusive.length) {
      add("Incompatible with", e.exclusive.map(x => ENCHANTS[x].name).join(", "), "conflict");
    }
    add("Applying", "Combine at an anvil with an enchanted book, or enchant the item directly where available. Matching enchantments from two items merge (same level → level + 1, up to the max).");
  } else if (type === "template") {
    const p = TRIM_PATTERNS[id];
    const t = TEMPLATE_INFO[id];
    const head = el("h3", "panel-title", "");
    const ico = document.createElement("img");
    ico.className = "inspect-ico";
    ico.src = texURL(templateIconPath(id));
    head.appendChild(ico);
    head.appendChild(document.createTextNode(` ${p.name} Armor Trim`));
    modal.appendChild(head);
    add("Where to find it", t.where);
    addGui("Applying — Smithing Table", trimSmithingCanvas(id, selectedItem()),
      "Template + armor + trim material. The template is consumed; trims are cosmetic and can be re-trimmed.");
    addGui("Duplicating — Crafting Table", craftingGuiCanvas(id),
      `7 Diamonds + template + ${t.dupe} → 2 templates. Find one, copy it forever.`);
  } else if (type === "netherite_upgrade") {
    const t = NETHERITE_UPGRADE_INFO;
    modal.appendChild(el("h3", "panel-title", "Netherite Upgrade Template"));
    add("Where to find it", t.where);
    addGui("Applying — Smithing Table", netheriteSmithingCanvas(selectedItem()), t.use);
    addGui("Duplicating — Crafting Table", craftingGuiCanvas("netherite_upgrade"),
      `7 Diamonds + template + ${t.dupe} → 2 templates.`);
  }

  const close = el("button", "btn small", "Close");
  close.onclick = () => document.body.removeChild(overlay);
  modal.appendChild(close);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}
