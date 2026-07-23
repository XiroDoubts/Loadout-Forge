// ============================================================
// Loadout Forge — resizable side panels
// Drags the gutters between the three columns, driving the
// --col-l / --col-r custom properties on .layout. Widths persist
// per browser. Only active in the 3-column layout (>1080px);
// below that the columns stack and the handles are hidden.
// ============================================================

const PANELS_KEY = "loadout-forge-panels";
const PANEL_DEFAULTS = { left: 312, right: 380 };
const PANEL_MIN = { left: 240, right: 280 };
const PANEL_MAX = { left: 520, right: 560 };
const CENTER_MIN = 300; // keep the preview usable

function loadPanelWidths() {
  try {
    const saved = JSON.parse(localStorage.getItem(PANELS_KEY));
    if (saved && typeof saved === "object") return { ...PANEL_DEFAULTS, ...saved };
  } catch { /* fall through to defaults */ }
  return { ...PANEL_DEFAULTS };
}

function savePanelWidths(w) {
  try { localStorage.setItem(PANELS_KEY, JSON.stringify(w)); } catch { /* private mode */ }
}

function initPanels() {
  const layout = document.querySelector(".layout");
  const handles = [...document.querySelectorAll(".col-resize")];
  if (!layout || !handles.length) return;

  const widths = loadPanelWidths();

  // Largest this side can grow to without squeezing the preview below CENTER_MIN.
  function maxFor(side) {
    const styles = getComputedStyle(layout);
    const inner = layout.clientWidth
      - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const gutters = 2 * parseFloat(styles.getPropertyValue("--gutter") || 18);
    const other = side === "left" ? widths.right : widths.left;
    const room = inner - gutters - other - CENTER_MIN;
    return Math.max(PANEL_MIN[side], Math.min(PANEL_MAX[side], room));
  }

  function set(side, px, persist) {
    widths[side] = Math.round(Math.max(PANEL_MIN[side], Math.min(maxFor(side), px)));
    layout.style.setProperty(side === "left" ? "--col-l" : "--col-r", widths[side] + "px");
    if (persist) savePanelWidths(widths);
  }

  // Apply stored widths on load (re-clamped to the current viewport).
  set("left", widths.left, false);
  set("right", widths.right, false);

  for (const handle of handles) {
    const side = handle.dataset.resize;
    let startX = 0, startW = 0;

    handle.addEventListener("pointerdown", e => {
      // Ignore while the columns are stacked.
      if (getComputedStyle(handle).display === "none") return;
      startX = e.clientX;
      startW = widths[side];
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("dragging");
      layout.classList.add("resizing");
      e.preventDefault();
    });

    handle.addEventListener("pointermove", e => {
      if (!handle.classList.contains("dragging")) return;
      // The right column is anchored to the right edge, so it grows as the
      // pointer moves left — hence the inverted delta.
      const delta = e.clientX - startX;
      set(side, startW + (side === "left" ? delta : -delta), false);
    });

    const end = e => {
      if (!handle.classList.contains("dragging")) return;
      handle.classList.remove("dragging");
      layout.classList.remove("resizing");
      if (e.pointerId !== undefined && handle.hasPointerCapture?.(e.pointerId))
        handle.releasePointerCapture(e.pointerId);
      savePanelWidths(widths);
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);

    // Double-click restores this column's default width.
    handle.addEventListener("dblclick", () => set(side, PANEL_DEFAULTS[side], true));

    // Keyboard: arrows nudge, Home resets.
    handle.addEventListener("keydown", e => {
      const step = e.shiftKey ? 48 : 16;
      let next = null;
      if (e.key === "ArrowLeft") next = widths[side] + (side === "left" ? -step : step);
      else if (e.key === "ArrowRight") next = widths[side] + (side === "left" ? step : -step);
      else if (e.key === "Home") next = PANEL_DEFAULTS[side];
      if (next === null) return;
      e.preventDefault();
      set(side, next, true);
    });
  }

  // Re-clamp when the window shrinks so the preview keeps its minimum.
  window.addEventListener("resize", () => {
    set("left", widths.left, false);
    set("right", widths.right, false);
  });
}
