(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  M.box = (w = 24, d = 24, h = 24) => {
    const q = [],
      vs = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1]
      ].map((a) => [(a[0] * w) / 2, (a[1] * d) / 2, (a[2] * h) / 2]);
    [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [3, 7, 6, 2],
      [0, 4, 7, 3],
      [1, 2, 6, 5]
    ].forEach((f) => {
      tri(q, vs[f[0]], vs[f[1]], vs[f[2]]);
      tri(q, vs[f[0]], vs[f[2]], vs[f[3]]);
    });
    return q;
  };
  M.cylinder = (r = 12, h = 24, n = 32, rt = r) => {
    const o = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        b = ((i + 1) / n) * Math.PI * 2,
        A = [r * Math.cos(a), r * Math.sin(a), -h / 2],
        B = [r * Math.cos(b), r * Math.sin(b), -h / 2],
        C = [rt * Math.cos(b), rt * Math.sin(b), h / 2],
        D = [rt * Math.cos(a), rt * Math.sin(a), h / 2];
      tri(o, A, B, C);
      tri(o, A, C, D);
      tri(o, [0, 0, -h / 2], B, A);
      if (rt > 0) tri(o, [0, 0, h / 2], D, C);
    }
    return o;
  };
  M.sphere = (r = 14, n = 24, k = 12) => {
    const o = [],
      v = (a, b) => [r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a), r * Math.cos(b)];
    for (let j = 0; j < k; j++)
      for (let i = 0; i < n; i++) {
        let a = (i / n) * Math.PI * 2,
          b = ((i + 1) / n) * Math.PI * 2,
          c = (j / k) * Math.PI,
          d = ((j + 1) / k) * Math.PI;
        tri(o, v(a, c), v(a, d), v(b, d));
        tri(o, v(a, c), v(b, d), v(b, c));
      }
    return o;
  };
  M.torus = (r = 18, t = 5, n = 32, k = 12) => {
    const o = [],
      v = (a, b) => [
        (r + t * Math.cos(b)) * Math.cos(a),
        (r + t * Math.cos(b)) * Math.sin(a),
        t * Math.sin(b)
      ];
    for (let j = 0; j < k; j++)
      for (let i = 0; i < n; i++) {
        let a = (i / n) * Math.PI * 2,
          b = ((i + 1) / n) * Math.PI * 2,
          c = (j / k) * Math.PI * 2,
          d = ((j + 1) / k) * Math.PI * 2;
        tri(o, v(a, c), v(b, c), v(b, d));
        tri(o, v(a, c), v(b, d), v(a, d));
      }
    return o;
  };
  M.roundBox = (w, d, h, r = 3, steps = 5, chamfer = false) => {
    r = Math.max(0.001, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01));
    const rings = [],
      o = [];
    const nl = chamfer ? 1 : 3,
      nc = chamfer ? 1 : steps;
    for (let j = 0; j <= 2 * nl + 1; j++) {
      let z, cr;
      if (j <= nl) {
        const a = ((j / nl) * Math.PI) / 2;
        z = -h / 2 + r - r * Math.cos(a);
        cr = r * Math.sin(a);
      } else {
        const a = (((j - nl - 1) / nl) * Math.PI) / 2;
        z = h / 2 - r + r * Math.sin(a);
        cr = r * Math.cos(a);
      }
      const ring = [];
      for (let c = 0; c < 4; c++)
        for (let s = 0; s <= nc; s++) {
          const a = (c * Math.PI) / 2 + ((s / nc) * Math.PI) / 2;
          const cx = c === 0 || c === 3 ? w / 2 - r : -w / 2 + r,
            cy = c < 2 ? d / 2 - r : -d / 2 + r;
          ring.push([cx + cr * Math.cos(a), cy + cr * Math.sin(a), z]);
        }
      rings.push(ring);
    }
    const n = rings[0].length;
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        tri(o, rings[j][i], rings[j][k], rings[j + 1][k]);
        tri(o, rings[j][i], rings[j + 1][k], rings[j + 1][i]);
      }
    for (let i = 0; i < n; i++) {
      tri(o, [0, 0, -h / 2], rings[0][(i + 1) % n], rings[0][i]);
      tri(o, [0, 0, h / 2], rings.at(-1)[i], rings.at(-1)[(i + 1) % n]);
    }
    return o;
  };
})(window.MP);
