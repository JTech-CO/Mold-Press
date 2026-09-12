(function (M) {
  'use strict';
  const cache = new Map();
  // Display-only clipping. Never write section meshes back into a project.
  M.sectionRecords = (records, axis, percent, reverse = false) => {
    const k = 'XYZ'.indexOf(axis);
    if (k < 0 || !Number.isFinite(percent)) throw Error('Invalid section plane');
    const solids = records.filter((r) => !r.lines && (r.alpha ?? 1) > 0);
    if (!solids.length) return { records, errors: [] };
    const bounds = solids.map((r) => M.bounds(M.world(r)));
    const min = Math.min(...bounds.map((b) => b.min[k]));
    const max = Math.max(...bounds.map((b) => b.max[k]));
    const at = min + ((max - min) * Math.max(0, Math.min(100, percent))) / 100;
    const result = [],
      errors = [];
    for (const r of records) {
      const p = M.world(r),
        bb = M.bounds(p),
        eps = M.splitTolerance(p);
      const inside = (x) => (reverse ? x >= at : x <= at);
      if (r.lines) {
        const lines = [];
        for (let i = 0; i < p.length; i += 6) {
          let a = Array.from(p.slice(i, i + 3)),
            b = Array.from(p.slice(i + 3, i + 6));
          if (!inside(a[k]) && !inside(b[k])) continue;
          if (inside(a[k]) !== inside(b[k])) {
            const hit = M.V.lerp(a, b, (at - a[k]) / (b[k] - a[k]));
            if (!inside(a[k])) a = hit;
            else b = hit;
          }
          lines.push(...a, ...b);
        }
        if (lines.length)
          result.push({
            ...r,
            geo: M.pack(lines),
            pos: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1, 1]
          });
        continue;
      }
      if (inside(bb.min[k]) && inside(bb.max[k])) {
        result.push(r);
        continue;
      }
      if (!inside(bb.min[k]) && !inside(bb.max[k])) continue;
      if (at <= bb.min[k] + eps * 2 || at >= bb.max[k] - eps * 2) {
        if (inside(bb.center[k])) result.push(r);
        continue;
      }
      const key = JSON.stringify([r.geo, r.pos, r.rot, r.scale, axis, at, reverse]);
      try {
        if (!cache.has(key)) {
          const cut = M.splitMesh(p, axis, at)[reverse ? 1 : 0],
            shell = [],
            cap = [];
          for (let i = 0; i < cut.length; i += 9) {
            const face = cut.slice(i, i + 9);
            const target = [0, 3, 6].every((j) => Math.abs(face[j + k] - at) <= eps * 4)
              ? cap
              : shell;
            target.push(...face);
          }
          cache.set(key, [M.pack(shell), M.pack(cap)]);
          if (cache.size > 64) cache.delete(cache.keys().next().value);
        }
        const [shell, cap] = cache.get(key);
        const fixed = { ...r, pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1] };
        if (shell) result.push({ ...fixed, geo: shell });
        if (cap)
          result.push({
            ...fixed,
            id: r.id + '-section-cap',
            geo: cap,
            color: '#d6a563',
            alpha: 1,
            metal: 0.1,
            rough: 0.7,
            surface: M.finishes.none
          });
      } catch (e) {
        result.push(r);
        errors.push(r.id);
      }
    }
    return { records: result, errors, at };
  };
})(window.MP);
