// ============================================================
// Loadout Forge — first-run walkthrough
// A short guided tour that spotlights each panel in turn and
// explains what it is for. Runs once per browser; the "Show me
// around" button in the empty editor replays it on demand.
// ============================================================

const TOUR_KEY = "loadout-forge-tour-seen";

const TOUR_STEPS = [
  {
    target: "#armor-slots",
    title: "1 · Equip",
    text: "Click any armour slot to add a piece. The grid beside it holds tools, weapons and off-hand gear.",
  },
  {
    target: ".col-editor",
    title: "2 · Customise",
    text: "Whatever you select opens here — material, armour trim and enchantments. Sections start collapsed; click a heading to open it.",
  },
  {
    target: ".stage",
    title: "3 · Preview",
    text: "Your build renders live with the real game textures. Drag to rotate, shift-drag to pan, double-click to reset.",
  },
  {
    target: ".topbar-right",
    title: "4 · Keep it",
    text: "Save named loadouts, copy a summary, or share a link that restores the exact build.",
  },
];

function tourSeen() {
  try { return !!localStorage.getItem(TOUR_KEY); } catch { return true; }
}

function markTourSeen() {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* private mode */ }
}

function startTour() {
  // Never stack a tour on top of a modal, or on top of itself.
  if (document.querySelector(".tour-layer") || document.querySelector(".overlay")) return;

  let index = 0;
  const layer = el("div", "tour-layer");
  const hole = el("div", "tour-hole");
  const card = el("div", "tour-card");
  layer.appendChild(hole);
  layer.appendChild(card);
  document.body.appendChild(layer);

  function close() {
    markTourSeen();
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey, true);
    layer.remove();
  }

  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0) return;
    if (next >= TOUR_STEPS.length) { close(); return; }
    index = next;
    render();
  }

  // Position the spotlight over the step's target and the card beside it,
  // flipping to whichever side has room.
  function place() {
    const step = TOUR_STEPS[index];
    const node = document.querySelector(step.target);
    if (!node) { close(); return; }
    const r = node.getBoundingClientRect();
    const pad = 6;
    Object.assign(hole.style, {
      top: `${r.top - pad}px`, left: `${r.left - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
    });

    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    let left = r.right + gap;
    if (left + cw > window.innerWidth - 8) left = r.left - gap - cw;   // flip to the left
    if (left < 8) left = Math.min(Math.max(8, r.left), window.innerWidth - cw - 8);
    let top = r.top;
    if (top + ch > window.innerHeight - 8) top = window.innerHeight - ch - 8;
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  function render() {
    const step = TOUR_STEPS[index];
    const node = document.querySelector(step.target);
    if (!node) { close(); return; }
    node.scrollIntoView({ block: "nearest", behavior: "smooth" });

    card.innerHTML = "";
    card.appendChild(el("div", "tour-title", step.title));
    card.appendChild(el("div", "tour-text", step.text));

    const dots = el("div", "tour-dots");
    TOUR_STEPS.forEach((_, i) =>
      dots.appendChild(el("span", "tour-dot" + (i === index ? " on" : ""))));

    const row = el("div", "tour-row");
    const skip = el("button", "btn small ghost", "Skip");
    skip.type = "button";
    skip.onclick = close;
    row.appendChild(skip);
    row.appendChild(dots);
    if (index > 0) {
      const back = el("button", "btn small ghost", "Back");
      back.type = "button";
      back.onclick = () => go(-1);
      row.appendChild(back);
    }
    const next = el("button", "btn small",
      index === TOUR_STEPS.length - 1 ? "Done" : "Next");
    next.type = "button";
    next.onclick = () => go(1);
    row.appendChild(next);
    card.appendChild(row);

    place();
    next.focus();
  }

  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  document.addEventListener("keydown", onKey, true);
  render();
}

// Offer the tour on a first visit, once the app is settled.
function maybeStartTour() {
  if (tourSeen()) return;
  setTimeout(startTour, 400);
}
