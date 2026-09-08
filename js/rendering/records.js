(function (M) {
  'use strict';
  const V = M.V;
  const matrix = (pos, rot, scale) => {
    const x = M.rotate([scale[0], 0, 0], rot),
      y = M.rotate([0, scale[1], 0], rot),
      z = M.rotate([0, 0, scale[2]], rot);
    return new Float32Array([...x, 0, ...y, 0, ...z, 0, ...pos, 1]);
  };
  const identity = () => matrix([0, 0, 0], [0, 0, 0], [1, 1, 1]);
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
    return o;
  };
  M.hex = (c) => {
    if (Array.isArray(c)) return c;
    return c
      .slice(1)
      .match(/../g)
      .map((x) => parseInt(x, 16) / 255);
  };
  M.edges = (p) => {
    const map = new Map();
    for (let i = 0; i < p.length; i += 9) {
      const vs = [
          Array.from(p.slice(i, i + 3)),
          Array.from(p.slice(i + 3, i + 6)),
          Array.from(p.slice(i + 6, i + 9))
        ],
        n = V.unit(V.cross(V.sub(vs[1], vs[0]), V.sub(vs[2], vs[0])));
      for (let j = 0; j < 3; j++) {
        const a = vs[j],
          b = vs[(j + 1) % 3],
          key = [a.map((x) => x.toFixed(3)).join(','), b.map((x) => x.toFixed(3)).join(',')]
            .sort()
            .join('|');
        if (map.has(key)) {
          const e = map.get(key);
          e.keep = e.keep || V.dot(e.n, n) < 0.87;
          e.count++;
        } else map.set(key, { a, b, n, keep: false, count: 1 });
      }
    }
    const o = [];
    for (const e of map.values()) if (e.count === 1 || e.keep) o.push(...e.a, ...e.b);
    return new Float32Array(o);
  };
  M.link = (a, b, r = 1.2, n = 12) => {
    const d = V.sub(b, a),
      h = V.len(d),
      z = V.unit(d),
      x = V.unit(V.cross(Math.abs(z[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0], z)),
      y = V.cross(z, x),
      center = V.mul(V.add(a, b), 0.5),
      p = M.cylinder(r, h, n),
      o = [];
    for (let i = 0; i < p.length; i += 3)
      o.push(
        ...V.add(center, V.add(V.add(V.mul(x, p[i]), V.mul(y, p[i + 1])), V.mul(z, p[i + 2])))
      );
    return o;
  };
  M.record = (id, p, color = '#9ba6af', extra = {}) => ({
    id,
    geo: typeof p === 'string' ? p : M.pack(p),
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    scale: [1, 1, 1],
    color,
    rough: 0.35,
    metal: 0.4,
    alpha: 1,
    surface: M.surfaceFor(id, extra),
    ...extra
  });
  M.RenderMath = { matrix, identity, mul };
})(window.MP);
