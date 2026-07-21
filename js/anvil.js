// ============================================================
// Loadout Forge — anvil enchant-ordering solver
// Finds the cheapest order to combine enchanted books onto an
// item (inspired by iamcal.github.io/enchant-order, implemented
// natively). Java Edition anvil mechanics:
//   step cost = penalty(target) + penalty(sacrifice)
//             + Σ (level × multiplier) over sacrifice enchants
//   prior-work penalty = 2^uses − 1;  ≥ 40 levels = Too Expensive
// ============================================================

// [item multiplier, book multiplier] per enchantment (Java)
const ANVIL_MULT = {
  protection: [1, 1], fire_protection: [2, 1], feather_falling: [2, 1],
  blast_protection: [4, 2], projectile_protection: [2, 1], thorns: [8, 4],
  respiration: [4, 2], depth_strider: [4, 2], aqua_affinity: [4, 2],
  sharpness: [1, 1], smite: [2, 1], bane_of_arthropods: [2, 1],
  knockback: [2, 1], fire_aspect: [4, 2], looting: [4, 2],
  efficiency: [1, 1], silk_touch: [8, 4], unbreaking: [2, 1],
  fortune: [4, 2], power: [1, 1], punch: [4, 2], flame: [4, 2],
  infinity: [8, 4], luck_of_the_sea: [4, 2], lure: [4, 2],
  frost_walker: [4, 2], mending: [4, 2], curse_of_binding: [8, 4],
  curse_of_vanishing: [8, 4], impaling: [4, 2], riptide: [4, 2],
  loyalty: [1, 1], channeling: [8, 4], multishot: [4, 2],
  piercing: [1, 1], quick_charge: [2, 1], soul_speed: [8, 4],
  swift_sneak: [8, 4], wind_burst: [4, 2], density: [2, 1],
  breach: [4, 2], lunge: [2, 1], sweeping_edge: [4, 2],
};

// total XP points needed to go from 0 to `levels`
function xpPoints(levels) {
  if (levels <= 16) return levels * levels + 6 * levels;
  if (levels <= 31) return 2.5 * levels * levels - 40.5 * levels + 360;
  return 4.5 * levels * levels - 162.5 * levels + 2220;
}

const penalty = uses => Math.pow(2, uses) - 1;

// Optimal merge plan for `enchants` ({id: level}) onto a fresh item.
// Returns { steps, totalLevels, totalPoints, maxStep, tooExpensive } or null.
function planAnvilOrder(enchants) {
  const ids = Object.keys(enchants).filter(id => ANVIL_MULT[id]);
  const n = ids.length;
  if (!n) return null;

  // value of a subset when sacrificed as a book
  const bookValue = new Array(1 << n).fill(0);
  for (let m = 1; m < (1 << n); m++) {
    const low = m & -m, i = Math.log2(low);
    bookValue[m] = bookValue[m ^ low] + enchants[ids[i]] * ANVIL_MULT[ids[i]][1];
  }

  // bookBest[mask] : Map(uses -> {points, steps})  — cheapest book holding `mask`
  // itemBest[mask] : Map(uses -> {points, steps})  — item after absorbing `mask`
  const bookBest = new Array(1 << n).fill(null).map(() => new Map());
  const itemBest = new Array(1 << n).fill(null).map(() => new Map());

  const put = (map, uses, points, steps) => {
    const cur = map.get(uses);
    if (!cur || points < cur.points) map.set(uses, { points, steps });
  };

  for (let i = 0; i < n; i++) put(bookBest[1 << i], 0, 0, []);
  put(itemBest[0], 0, 0, []);

  const subsetsAsc = [];
  for (let m = 1; m < (1 << n); m++) subsetsAsc.push(m);
  subsetsAsc.sort((a, b) => popcount(a) - popcount(b));

  function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

  // book + book merges
  for (const m of subsetsAsc) {
    if (popcount(m) < 2) continue;
    for (let a = (m - 1) & m; a > 0; a = (a - 1) & m) {
      const b = m ^ a;
      if (a < b) continue; // each unordered split once; try both orientations below
      for (const [ta, sb] of [[a, b], [b, a]]) {
        for (const [ua, ca] of bookBest[ta]) {
          for (const [ub, cb] of bookBest[sb]) {
            const lv = penalty(ua) + penalty(ub) + bookValue[sb];
            const uses = Math.max(ua, ub) + 1;
            put(bookBest[m], uses,
              ca.points + cb.points + xpPoints(lv),
              [...ca.steps, ...cb.steps, { target: ta, targetBook: true, sac: sb, levels: lv }]);
          }
        }
      }
    }
  }

  // item absorbs book subsets in some sequence
  for (const m of subsetsAsc) {
    for (let b = m; b > 0; b = (b - 1) & m) { // b = last book combined
      const rest = m ^ b;
      for (const [ui, ci] of itemBest[rest]) {
        for (const [ub, cb] of bookBest[b]) {
          const lv = penalty(ui) + penalty(ub) + bookValue[b];
          const uses = Math.max(ui, ub) + 1;
          put(itemBest[m], uses,
            ci.points + cb.points + xpPoints(lv),
            [...ci.steps, ...cb.steps, { target: rest, targetBook: false, sac: b, levels: lv }]);
        }
      }
    }
  }

  let best = null;
  for (const [, c] of itemBest[(1 << n) - 1]) {
    if (!best || c.points < best.points) best = c;
  }
  if (!best) return null;

  const describe = mask => ids.filter((_, i) => mask & (1 << i))
    .map(id => `${ENCHANTS[id].name}${ENCHANTS[id].max > 1 ? " " + ROMAN[enchants[id]] : ""}`);

  const steps = best.steps.map(s => ({
    targetLabels: s.targetBook ? describe(s.target) : null, // null = the item itself
    itemSoFar: s.targetBook ? null : describe(s.target),
    sacLabels: describe(s.sac),
    levels: s.levels,
    points: Math.round(xpPoints(s.levels)),
    tooExpensive: s.levels >= 40,
  }));

  return {
    steps,
    totalLevels: steps.reduce((t, s) => t + s.levels, 0),
    totalPoints: Math.round(best.points),
    maxStep: Math.max(...steps.map(s => s.levels)),
    tooExpensive: steps.some(s => s.tooExpensive),
  };
}
