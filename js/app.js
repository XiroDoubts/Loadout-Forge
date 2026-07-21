// ============================================================
// Loadout Forge — app state & UI
// ============================================================

const STORAGE_KEY = "loadout-forge-java-26.2";

const ARMOR_SLOTS = [
  { key: "head",  kind: "helmet",     label: "Helmet" },
  { key: "chest", kind: "chestplate", label: "Chestplate" },
  { key: "legs",  kind: "leggings",   label: "Leggings" },
  { key: "feet",  kind: "boots",      label: "Boots" },
];

const DEFAULT_VIEW = { model: "stand", skin: "steve", customSkin: null };

let state = loadState() || {
  slots: { head: null, chest: null, legs: null, feet: null },
  gear: Array(9).fill(null),
  sel: null, // {type:"slot",key} | {type:"gear",index}
  view: { ...DEFAULT_VIEW },
};
if (!state.view) state.view = { ...DEFAULT_VIEW };

let viewer = null; // created on boot

// ---------- State helpers ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.slots || !Array.isArray(s.gear)) return null;
    return s;
  } catch { return null; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function newItem(kind) {
  const def = ITEM_DEFS[kind];
  let material = null;
  if (def.tiered === "armor") material = "iron";
  if (def.tiered === "tool") material = "iron";
  return { kind, material, trim: null, enchants: {} };
}

function selectedItem() {
  if (!state.sel) return null;
  return state.sel.type === "slot" ? state.slots[state.sel.key] : state.gear[state.sel.index];
}

function setSelectedItem(item) {
  if (!state.sel) return;
  if (state.sel.type === "slot") state.slots[state.sel.key] = item;
  else state.gear[state.sel.index] = item;
}

// ---------- Save slots ----------
const SAVES_KEY = "loadout-forge-saves";

function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || {}; }
  catch { return {}; }
}
function setSaves(s) { localStorage.setItem(SAVES_KEY, JSON.stringify(s)); }

function saveCurrentAs(name) {
  const saves = getSaves();
  saves[name] = {
    slots: JSON.parse(JSON.stringify(state.slots)),
    gear: JSON.parse(JSON.stringify(state.gear)),
    view: JSON.parse(JSON.stringify(state.view)),
    savedAt: Date.now(),
  };
  setSaves(saves);
  state.activeSave = name;
}

function loadSave(name) {
  const snap = getSaves()[name];
  if (!snap) return;
  state.slots = JSON.parse(JSON.stringify(snap.slots));
  state.gear = JSON.parse(JSON.stringify(snap.gear));
  if (snap.view) state.view = JSON.parse(JSON.stringify(snap.view));
  state.sel = null;
  state.activeSave = name;
  renderAll();
}

function renderSaves() {
  const list = $("#save-list");
  list.innerHTML = "";
  const saves = getSaves();
  const names = Object.keys(saves).sort((a, b) => saves[b].savedAt - saves[a].savedAt);
  if (!names.length) {
    list.appendChild(el("div", "hint", "No saved loadouts yet."));
  }
  for (const name of names) {
    const snap = saves[name];
    const count = [snap.slots.head, snap.slots.chest, snap.slots.legs, snap.slots.feet,
      ...snap.gear].filter(Boolean).length;
    const row = el("div", "save-item" + (state.activeSave === name ? " active" : ""));
    const label = el("button", "save-load", "");
    label.appendChild(el("span", "save-name", name));
    label.appendChild(el("span", "save-meta", `${count} item${count === 1 ? "" : "s"}`));
    label.onclick = () => loadSave(name);
    label.title = "Load this loadout";
    row.appendChild(label);
    const x = el("button", "save-x", "×");
    x.title = "Delete";
    x.onclick = () => {
      if (!confirm(`Delete loadout "${name}"?`)) return;
      const s = getSaves();
      delete s[name];
      setSaves(s);
      if (state.activeSave === name) state.activeSave = null;
      renderAll();
    };
    row.appendChild(x);
    list.appendChild(row);
  }
}

// ---------- Enchant logic ----------
function conflictWith(item, enchId) {
  const active = Object.keys(item.enchants);
  const exc = ENCHANTS[enchId].exclusive;
  return active.find(a => exc.includes(a) || ENCHANTS[a].exclusive.includes(enchId)) || null;
}

function setEnchant(item, enchId, level) {
  if (level <= 0) { delete item.enchants[enchId]; return; }
  // Applying an enchant evicts anything it conflicts with (anvil rules)
  for (const active of Object.keys(item.enchants)) {
    if (active === enchId) continue;
    if (ENCHANTS[enchId].exclusive.includes(active) ||
        ENCHANTS[active].exclusive.includes(enchId)) {
      delete item.enchants[active];
    }
  }
  item.enchants[enchId] = level;
}

// ---------- Rendering ----------
const $ = sel => document.querySelector(sel);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function itemCanvas(item, scale) {
  const c = el("canvas", "pix");
  renderItemCanvas(c, item, scale);
  return c;
}

function renderAll() {
  renderSaves();
  renderSlots();
  renderPreview();
  renderEditor();
  save();
}

// ----- Loadout panel -----
function renderSlots() {
  const armorWrap = $("#armor-slots");
  armorWrap.innerHTML = "";
  for (const slot of ARMOR_SLOTS) {
    const item = state.slots[slot.key];
    const div = el("div", "slot" + (isSel("slot", slot.key) ? " selected" : ""));
    div.title = slot.label;
    if (item) {
      div.appendChild(itemCanvas(item, 3));
      const x = el("button", "slot-x", "×");
      x.onclick = (e) => { e.stopPropagation(); clearSlot("slot", slot.key); };
      div.appendChild(x);
    } else {
      const ghost = document.createElement("img");
      ghost.className = "slot-ghost";
      ghost.src = texURL(`gui/sprites/container/slot/${slot.kind}.png`);
      ghost.alt = slot.label;
      div.appendChild(ghost);
    }
    div.onclick = () => {
      if (isSel("slot", slot.key)) { state.sel = null; renderAll(); return; }
      if (!state.slots[slot.key]) state.slots[slot.key] = newItem(slot.kind);
      state.sel = { type: "slot", key: slot.key };
      renderAll();
    };
    armorWrap.appendChild(div);
  }

  const gearWrap = $("#gear-slots");
  gearWrap.innerHTML = "";
  state.gear.forEach((item, i) => {
    const div = el("div", "slot" + (isSel("gear", i) ? " selected" : ""));
    if (item) {
      div.appendChild(itemCanvas(item, 3));
      const x = el("button", "slot-x", "×");
      x.onclick = (e) => { e.stopPropagation(); clearSlot("gear", i); };
      div.appendChild(x);
      div.onclick = () => {
        state.sel = isSel("gear", i) ? null : { type: "gear", index: i };
        renderAll();
      };
    } else {
      div.classList.add("empty");
      div.appendChild(el("span", "slot-plus", "+"));
      div.onclick = () => openPicker(i);
    }
    gearWrap.appendChild(div);
  });
}

function isSel(type, keyOrIndex) {
  if (!state.sel || state.sel.type !== type) return false;
  return type === "slot" ? state.sel.key === keyOrIndex : state.sel.index === keyOrIndex;
}

function clearSlot(type, keyOrIndex) {
  if (type === "slot") state.slots[keyOrIndex] = null;
  else state.gear[keyOrIndex] = null;
  if (isSel(type, keyOrIndex)) state.sel = null;
  renderAll();
}

// ----- Gear picker modal -----
function openPicker(index) {
  const overlay = el("div", "overlay");
  const modal = el("div", "modal panel");
  modal.appendChild(el("h3", "panel-title", "Choose Gear"));
  const grid = el("div", "picker-grid");
  for (const kind of GEAR_PICKER) {
    const cell = el("div", "picker-cell");
    cell.appendChild(itemCanvas(newItem(kind), 3));
    cell.appendChild(el("span", "picker-label", ITEM_DEFS[kind].name));
    cell.onclick = () => {
      state.gear[index] = newItem(kind);
      state.sel = { type: "gear", index };
      document.body.removeChild(overlay);
      renderAll();
    };
    grid.appendChild(cell);
  }
  modal.appendChild(grid);
  overlay.appendChild(modal);
  overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

// ----- Preview panel (3D) -----
const _customSkinCache = { url: null, img: null };

async function skinSource() {
  if (state.view.customSkin) {
    // Reuse the same Image object per dataURL so the viewer's texture
    // cache (keyed by source object) doesn't grow on every update.
    if (_customSkinCache.url !== state.view.customSkin) {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = state.view.customSkin; });
      _customSkinCache.url = state.view.customSkin;
      _customSkinCache.img = img;
    }
    return _customSkinCache.img;
  }
  return loadImage(skinPath(state.view.skin, state.view.model === "slim" ? "slim" : "wide"));
}

// Held-item rendering is shelved for a later revision — the flat quad
// didn't feel right. Flip to true to bring it back (renderer support
// lives in viewer3d.js: addItemQuad + spec.held).
const HELD_ITEM_ENABLED = false;

async function updateViewer() {
  if (!viewer) return;
  try {
    // Held item: the selected gear piece, or the first equipped gear
    const heldItem = HELD_ITEM_ENABLED &&
      ((state.sel?.type === "gear" && state.gear[state.sel.index]) ||
       state.gear.find(Boolean)) || null;
    const spec = {
      model: state.view.model,
      skinSrc: state.view.model === "stand" ? null : await skinSource(),
      armor: state.slots,
      held: heldItem ? { icon: await buildIconCached(heldItem), glint: hasEnchants(heldItem) } : null,
    };
    await viewer.update(spec);
  } catch (err) {
    console.error("viewer update failed", err);
  }
}

// Stable canvas per icon config so the viewer's texture cache stays bounded.
async function buildIconCached(item) {
  const key = iconKey(item);
  if (!_iconCache.has(key)) _iconCache.set(key, await buildIcon(item));
  return _iconCache.get(key);
}

function renderPreview() {
  updateViewer();
  renderViewControls();

  const item = selectedItem();
  const tip = $("#preview-tooltip");
  const gearBox = $("#preview-gear");
  const cards = $("#preview-cards");
  gearBox.innerHTML = "";
  cards.innerHTML = "";

  if (!item) {
    tip.innerHTML = "";
    tip.style.display = "none";
    renderAllCards(cards);
    return;
  }
  // Gear isn't shown on the model — display a large icon beside the tooltip
  if (state.sel.type === "gear") gearBox.appendChild(itemCanvas(item, 6));
  renderTooltip(item);
}

// Deselected view: one card per equipped item, whole loadout at a glance.
function renderAllCards(wrap) {
  const entries = [
    ...ARMOR_SLOTS.map(s => ({ item: state.slots[s.key], sel: { type: "slot", key: s.key } })),
    ...state.gear.map((item, i) => ({ item, sel: { type: "gear", index: i } })),
  ].filter(e => e.item);

  if (!entries.length) {
    wrap.appendChild(el("div", "preview-empty",
      "Nothing equipped yet — click a slot on the left to start building."));
    return;
  }

  wrap.appendChild(buildTotalsCard(entries.map(e => e.item)));

  for (const { item, sel } of entries) {
    const card = el("div", "item-card");
    const head = el("div", "item-card-head");
    head.appendChild(itemCanvas(item, 3));
    head.appendChild(el("span", "item-card-name" + (hasEnchants(item) ? " tip-aqua" : ""),
      itemDisplayName(item)));
    card.appendChild(head);

    const body = el("div", "item-card-body");
    if (item.trim) {
      const l = el("div", "tip-line", `${TRIM_PATTERNS[item.trim.pattern].name} · ${TRIM_MATERIALS[item.trim.material].name}`);
      l.style.color = TRIM_MATERIALS[item.trim.material].color;
      body.appendChild(l);
    }
    for (const [id, lvl] of Object.entries(item.enchants)) {
      const e = ENCHANTS[id];
      body.appendChild(el("div", "tip-line " + (e.curse ? "tip-red" : "tip-ench"),
        e.max === 1 ? e.name : `${e.name} ${ROMAN[lvl]}`));
    }
    if (!item.trim && !hasEnchants(item)) body.appendChild(el("div", "tip-line tip-gray", "No upgrades"));
    card.appendChild(body);

    const plan = planAnvilOrder(item.enchants);
    if (plan) {
      card.appendChild(el("div", "item-card-anvil",
        `⚒ ${plan.steps.length} combine${plan.steps.length > 1 ? "s" : ""} · ${plan.totalLevels} levels` +
        (plan.tooExpensive ? " · too expensive!" : "")));
    }

    card.onclick = () => { state.sel = sel; renderAll(); };
    wrap.appendChild(card);
  }
}

function renderViewControls() {
  const modelRow = $("#model-seg");
  modelRow.innerHTML = "";
  const models = [["stand", "Armor Stand"], ["wide", "Player"], ["slim", "Player (Slim)"]];
  for (const [id, label] of models) {
    const b = el("button", "seg" + (state.view.model === id ? " on" : ""), label);
    b.onclick = () => { state.view.model = id; renderAll(); };
    modelRow.appendChild(b);
  }

  const skinRow = $("#skin-controls");
  skinRow.style.display = state.view.model === "stand" ? "none" : "flex";
  const sel = $("#skin-select");
  if (!sel.options.length) {
    for (const name of DEFAULT_SKINS) {
      const o = document.createElement("option");
      o.value = name;
      o.textContent = name[0].toUpperCase() + name.slice(1);
      sel.appendChild(o);
    }
  }
  sel.value = state.view.skin;
  sel.disabled = !!state.view.customSkin;
  $("#skin-clear").style.display = state.view.customSkin ? "inline-block" : "none";
}

function renderTooltip(item) {
  const tip = $("#preview-tooltip");
  tip.style.display = "block";
  tip.innerHTML = "";

  const enchanted = hasEnchants(item);
  tip.appendChild(el("div", "tip-name" + (enchanted ? " tip-aqua" : ""), itemDisplayName(item)));

  if (item.trim) {
    const pat = TRIM_PATTERNS[item.trim.pattern];
    const mat = TRIM_MATERIALS[item.trim.material];
    tip.appendChild(el("div", "tip-line tip-gray", "Upgrade:"));
    const l1 = el("div", "tip-line tip-indent", ` ${pat.name} Armor Trim`);
    l1.style.color = mat.color;
    tip.appendChild(l1);
    const l2 = el("div", "tip-line tip-indent", ` ${mat.name}`);
    l2.style.color = mat.color;
    tip.appendChild(l2);
  }

  for (const [id, lvl] of Object.entries(item.enchants)) {
    const e = ENCHANTS[id];
    const label = e.max === 1 ? e.name : `${e.name} ${ROMAN[lvl]}`;
    tip.appendChild(el("div", "tip-line " + (e.curse ? "tip-red" : "tip-ench"), label));
  }

  tip.appendChild(el("div", "tip-line tip-dark", GAME_VERSION));
}

// ----- Editor panel -----
function renderEditor() {
  const wrap = $("#editor-body");
  wrap.innerHTML = "";
  const item = selectedItem();
  $("#editor-empty").style.display = item ? "none" : "block";
  if (!item) return;

  const back = el("button", "btn small ghost deselect-btn", "◀ View all items");
  back.onclick = () => { state.sel = null; renderAll(); };
  wrap.appendChild(back);

  const def = ITEM_DEFS[item.kind];

  // Chest slot: chestplate <-> elytra swap.
  // The replaced item is stashed so toggling back restores its full config.
  if (state.sel.type === "slot" && state.sel.key === "chest") {
    const row = el("div", "seg-row");
    for (const kind of ["chestplate", "elytra"]) {
      const b = el("button", "seg" + (item.kind === kind ? " on" : ""), ITEM_DEFS[kind].name);
      b.onclick = () => {
        if (item.kind === kind) return;
        state.chestStash = state.chestStash || {};
        state.chestStash[item.kind] = item;
        state.slots.chest = state.chestStash[kind] || newItem(kind);
        renderAll();
      };
      row.appendChild(b);
    }
    wrap.appendChild(section("Equipment", row));
  }

  // Material tier
  if (def.tiered) {
    const mats = def.tiered === "armor" ? ARMOR_MATERIALS : TOOL_MATERIALS;
    const row = el("div", "chip-row");
    for (const [id, m] of Object.entries(mats)) {
      if (m.only && !m.only.includes(item.kind)) continue;
      const chip = el("button", "chip" + (item.material === id ? " on" : ""));
      const sw = el("span", "chip-swatch");
      const pal = def.tiered === "armor" ? ARMOR_PALETTES[id] : TOOL_PALETTES[id];
      sw.style.background = pal.b;
      chip.appendChild(sw);
      chip.appendChild(document.createTextNode(m.name));
      chip.onclick = () => { item.material = id; renderAll(); };
      row.appendChild(chip);
    }
    const matBody = el("div");
    matBody.appendChild(row);
    if (def.tiered === "armor") {
      const applyAll = el("button", "btn small apply-all", "Apply material to all pieces");
      applyAll.onclick = () => {
        for (const s of ARMOR_SLOTS) {
          const it = state.slots[s.key];
          if (!it || ITEM_DEFS[it.kind].tiered !== "armor") continue;
          const m = ARMOR_MATERIALS[item.material];
          if (m.only && !m.only.includes(it.kind)) continue; // e.g. turtle is helmet-only
          it.material = item.material;
        }
        renderAll();
      };
      matBody.appendChild(applyAll);
    }
    wrap.appendChild(section("Material", matBody));
  }

  // Item stats (live: reacts to material + enchant changes)
  const statRows = computeStats(item);
  if (statRows.length) {
    const table = el("div", "stats-table");
    for (const r of statRows) {
      const row = el("div", "stat-row stat-" + r.kind);
      row.appendChild(el("span", "stat-label", r.label));
      const val = el("span", "stat-value");
      if (r.mod) {
        val.appendChild(el("span", "stat-base struck", r.value));
        val.appendChild(el("span", "stat-mod", " → " + r.mod));
      } else {
        val.appendChild(el("span", "", r.value));
      }
      row.appendChild(val);
      if (r.note) row.appendChild(el("div", "stat-note", r.note));
      table.appendChild(row);
    }
    if (statRows.some(r => String(r.value).includes("≈"))) {
      table.appendChild(el("div", "stat-footnote", "≈ approximate in-game value"));
    }
    if (item.material === "netherite") {
      const nu = el("button", "stat-source-btn", "ⓘ Requires a Netherite Upgrade template");
      nu.onclick = () => openInspect("netherite_upgrade");
      table.appendChild(nu);
    }
    wrap.appendChild(section("Item Stats", table));
  }

  // Armor trim
  if (def.trims) {
    const body = el("div");

    const patGrid = el("div", "trim-grid");
    const noneBtn = el("button", "trim-btn" + (!item.trim ? " on" : ""), "None");
    noneBtn.onclick = () => { item.trim = null; renderAll(); };
    patGrid.appendChild(noneBtn);
    for (const [id, p] of Object.entries(TRIM_PATTERNS)) {
      const b = el("button", "trim-btn" + (item.trim?.pattern === id ? " on" : ""));
      const ico = document.createElement("img");
      ico.className = "trim-ico";
      ico.src = texURL(templateIconPath(id));
      b.appendChild(ico);
      b.appendChild(el("span", "", p.name));
      b.onclick = () => {
        item.trim = { pattern: id, material: item.trim?.material || "redstone" };
        renderAll();
      };
      patGrid.appendChild(b);
    }
    body.appendChild(el("div", "sub-label", "Pattern (Smithing Template)"));
    body.appendChild(patGrid);

    const matRow = el("div", "swatch-row");
    for (const [id, m] of Object.entries(TRIM_MATERIALS)) {
      const b = el("button", "swatch" + (item.trim?.material === id ? " on" : ""));
      b.style.background = m.color;
      b.title = m.name;
      b.onclick = () => {
        item.trim = { pattern: item.trim?.pattern || "sentry", material: id };
        renderAll();
      };
      matRow.appendChild(b);
    }
    body.appendChild(el("div", "sub-label", "Trim Material"));
    body.appendChild(matRow);
    if (item.trim) {
      const cur = el("div", "trim-current");
      cur.appendChild(el("span", "",
        `${TRIM_PATTERNS[item.trim.pattern].name} · ${TRIM_MATERIALS[item.trim.material].name}`));
      const insp = el("button", "inspect-btn", "ⓘ");
      insp.title = "Where to find this smithing template";
      insp.onclick = () => openInspect("template", item.trim.pattern);
      cur.appendChild(insp);
      body.appendChild(cur);
    }
    const applyTrim = el("button", "btn small apply-all",
      item.trim ? "Apply trim to all pieces" : "Clear trim on all pieces");
    applyTrim.onclick = () => {
      for (const s of ARMOR_SLOTS) {
        const it = state.slots[s.key];
        if (!it || !ITEM_DEFS[it.kind].trims) continue;
        it.trim = item.trim ? { ...item.trim } : null;
      }
      renderAll();
    };
    body.appendChild(applyTrim);
    wrap.appendChild(section("Armor Trim", body));
  }

  // Enchantments
  const enchBody = el("div", "ench-list");
  for (const id of ENCHANT_SETS[item.kind]) {
    const e = ENCHANTS[id];
    const cur = item.enchants[id] || 0;
    const conflict = cur === 0 ? conflictWith(item, id) : null;

    const row = el("div", "ench-row" + (cur ? " active" : "") + (conflict ? " conflicted" : ""));
    const insp = el("button", "inspect-btn", "ⓘ");
    insp.title = "Effect & where to get it";
    insp.onclick = (ev) => { ev.stopPropagation(); openInspect("enchant", id); };
    row.appendChild(insp);
    const name = el("span", "ench-name" + (e.curse ? " curse" : ""), e.name);
    row.appendChild(name);

    if (conflict) {
      row.appendChild(el("span", "ench-conflict", "✕ " + ENCHANTS[conflict].name));
    }

    const lvls = el("span", "lvl-row");
    const off = el("button", "lvl" + (cur === 0 ? " on" : ""), "–");
    off.title = "Remove";
    off.onclick = () => { setEnchant(item, id, 0); renderAll(); };
    lvls.appendChild(off);
    for (let n = 1; n <= e.max; n++) {
      const b = el("button", "lvl" + (cur === n ? " on" : ""), ROMAN[n]);
      b.onclick = () => { setEnchant(item, id, n); renderAll(); };
      lvls.appendChild(b);
    }
    row.appendChild(lvls);
    enchBody.appendChild(row);
  }
  const maxBtn = el("button", "btn small", "Max non-conflicting");
  maxBtn.onclick = () => {
    for (const id of ENCHANT_SETS[item.kind]) {
      const e = ENCHANTS[id];
      if (e.curse) continue;
      if (!item.enchants[id] && conflictWith(item, id)) continue;
      item.enchants[id] = e.max;
    }
    renderAll();
  };
  const clearBtn = el("button", "btn small ghost", "Clear enchants");
  clearBtn.onclick = () => { item.enchants = {}; renderAll(); };
  const btns = el("div", "btn-row");
  btns.appendChild(maxBtn);
  btns.appendChild(clearBtn);
  if (planAnvilOrder(item.enchants)) {
    const anvilBtn = el("button", "btn small", "⚒ Anvil order");
    anvilBtn.onclick = () => openAnvilPlanner(item);
    btns.appendChild(anvilBtn);
  }
  enchBody.appendChild(btns);
  wrap.appendChild(section("Enchantments", enchBody));
}

function section(title, bodyNode) {
  const s = el("div", "section");
  s.appendChild(el("div", "section-title", title));
  s.appendChild(bodyNode);
  return s;
}

// ----- Global actions -----
function wireGlobalButtons() {
  $("#btn-reset").onclick = () => {
    if (!confirm("Reset the entire loadout?")) return;
    state = { slots: { head: null, chest: null, legs: null, feet: null }, gear: Array(9).fill(null), sel: null };
    renderAll();
  };
  $("#btn-import").onclick = openImport;
  $("#btn-share").onclick = shareBuild;
  $("#btn-copy").onclick = async () => {
    const payload = JSON.stringify({ version: GAME_VERSION, slots: state.slots, gear: state.gear });
    try {
      await navigator.clipboard.writeText(payload);
      flashButton($("#btn-copy"), "Copied!");
    } catch {
      flashButton($("#btn-copy"), "Copy failed");
    }
  };
}

function flashButton(btn, msg) {
  const old = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = old; }, 1400);
}

function wireSaveControls() {
  $("#btn-save").onclick = () => {
    let name = $("#save-name").value.trim();
    if (!name) name = state.activeSave || nextSaveName();
    saveCurrentAs(name);
    $("#save-name").value = "";
    renderAll();
    flashButton($("#btn-save"), "Saved!");
  };
  $("#save-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#btn-save").click();
  });
}

function nextSaveName() {
  const saves = getSaves();
  let n = 1;
  while (saves[`Loadout ${n}`]) n++;
  return `Loadout ${n}`;
}

function wireViewControls() {
  $("#skin-select").onchange = (e) => { state.view.skin = e.target.value; renderAll(); };
  $("#skin-upload").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.view.customSkin = reader.result; renderAll(); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  $("#skin-clear").onclick = () => { state.view.customSkin = null; renderAll(); };
}

// ----- Theme -----
const THEME_KEY = "lf-theme";

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  const btn = $("#btn-theme");
  if (btn) btn.textContent = theme === "light" ? "🌙 Dark" : "☀ Light";
}

function wireTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  $("#btn-theme").onclick = () => {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  };
}

// ----- Boot -----
document.addEventListener("DOMContentLoaded", async () => {
  await loadImportedAssets();
  wireGlobalButtons();
  wireSaveControls();
  wireViewControls();
  wireTheme();
  startGlintLoop();
  viewer = createViewer($("#viewer3d"));
  await loadBuildFromURL(); // shared link overrides the stored session
  renderAll();
  $("#btn-assets").onclick = () => openJarImporter(false);
  if (await assetsMissing()) openJarImporter(true);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const overlay = document.querySelector(".overlay");
    if (overlay) { overlay.remove(); return; }
    if (state.sel) { state.sel = null; renderAll(); }
  });
});
