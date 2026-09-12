(function (M) {
  'use strict';
  const cache = new WeakMap();
  M.contactShadows = (records, quality) => {
    if (quality === 'low') return [];
    if (cache.has(records)) return cache.get(records);
    const boxes = records
      .filter((r) => !r.lines && (r.alpha ?? 1) > 0)
      .map((r) => M.bounds(M.world(r)));
    if (!boxes.length) return [];
    const lo = [0, 1, 2].map((k) => Math.min(...boxes.map((b) => b.min[k])));
    const hi = [0, 1, 2].map((k) => Math.max(...boxes.map((b) => b.max[k])));
    const cx = (lo[0] + hi[0]) / 2,
      cy = (lo[1] + hi[1]) / 2,
      out = [];
    for (let ring = 0; ring < 4; ring++) {
      const rx = Math.max(4, (hi[0] - lo[0]) * (0.55 + ring * 0.045));
      const ry = Math.max(4, (hi[1] - lo[1]) * (0.55 + ring * 0.045));
      const z = lo[2] - 0.08 - ring * 0.005,
        mesh = [];
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI) / 24,
          b = ((i + 1) * Math.PI) / 24;
        mesh.push(
          cx,
          cy,
          z,
          cx + Math.cos(a) * rx,
          cy + Math.sin(a) * ry,
          z,
          cx + Math.cos(b) * rx,
          cy + Math.sin(b) * ry,
          z
        );
      }
      out.push(
        M.record('contact-shadow-' + ring, mesh, '#030507', {
          alpha: 0.075,
          metal: 0,
          rough: 1,
          helper: true,
          flat: true
        })
      );
    }
    cache.set(records, out);
    return out;
  };
})(window.MP);
