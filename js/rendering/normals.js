(function (M) {
  'use strict';
  const V = M.V,
    cache = new WeakMap();
  // Render normals only: retain the original triangle soup for CAD and exports.
  M.shadingNormals = (p) => {
    if (cache.has(p)) return cache.get(p);
    const groups = new Map(),
      faces = [],
      keys = [];
    const tolerance = Math.max(1e-6, Math.max(...M.bounds(p).size) * 1e-7);
    for (let i = 0; i < p.length; i += 9) {
      const vs = [0, 3, 6].map((j) => Array.from(p.slice(i + j, i + j + 3)));
      const n = V.unit(V.cross(V.sub(vs[1], vs[0]), V.sub(vs[2], vs[0])));
      for (let j = 0; j < 3; j++) {
        const a = V.unit(V.sub(vs[(j + 1) % 3], vs[j])),
          b = V.unit(V.sub(vs[(j + 2) % 3], vs[j]));
        const weight = Math.acos(Math.max(-1, Math.min(1, V.dot(a, b))));
        const key = vs[j].map((x) => Math.round(x / tolerance)).join(',');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ n, weight });
        keys.push(key);
        faces.push(n);
      }
    }
    const normals = new Float32Array(p.length),
      crease = Math.cos((35 * Math.PI) / 180);
    for (let i = 0; i < keys.length; i++) {
      let sum = [0, 0, 0];
      for (const f of groups.get(keys[i]))
        if (V.dot(f.n, faces[i]) >= crease) sum = V.add(sum, V.mul(f.n, f.weight));
      normals.set(V.unit(sum), i * 3);
    }
    cache.set(p, normals);
    return normals;
  };
})(window.MP);
