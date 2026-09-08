(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  M.smooth = (p, iterations = 2, amount = 0.15) => {
    const map = new Map(),
      ids = [],
      verts = [],
      adj = [];
    for (let i = 0; i < p.length; i += 3) {
      const key = [p[i], p[i + 1], p[i + 2]].map((x) => x.toFixed(4)).join(',');
      if (!map.has(key)) {
        map.set(key, verts.length);
        verts.push([p[i], p[i + 1], p[i + 2]]);
        adj.push(new Set());
      }
      ids.push(map.get(key));
    }
    for (let i = 0; i < ids.length; i += 3)
      for (let j = 0; j < 3; j++) {
        adj[ids[i + j]].add(ids[i + ((j + 1) % 3)]);
        adj[ids[i + j]].add(ids[i + ((j + 2) % 3)]);
      }
    let v = verts;
    for (let it = 0; it < iterations; it++)
      v = v.map((x, i) => {
        const n = [...adj[i]];
        if (!n.length) return x;
        let sum = n.reduce((s, j) => V.add(s, v[j]), [0, 0, 0]);
        return V.lerp(x, V.mul(sum, 1 / n.length), amount);
      });
    return ids.flatMap((i) => v[i]);
  };
  M.rayTri = (o, d, a, b, c) => {
    const e1 = V.sub(b, a),
      e2 = V.sub(c, a),
      h = V.cross(d, e2),
      det = V.dot(e1, h);
    if (Math.abs(det) < 1e-9) return null;
    const f = 1 / det,
      s = V.sub(o, a),
      u = f * V.dot(s, h);
    if (u < -1e-6 || u > 1 + 1e-6) return null;
    const q = V.cross(s, e1),
      v = f * V.dot(d, q);
    if (v < -1e-6 || u + v > 1 + 1e-6) return null;
    const t = f * V.dot(e2, q);
    return t > 1e-5 ? t : null;
  };
  M.raycast = (p, o, d, max = Infinity) => {
    let hit = null;
    for (let i = 0; i < p.length; i += 9) {
      let a = Array.from(p.slice(i, i + 3)),
        b = Array.from(p.slice(i + 3, i + 6)),
        c = Array.from(p.slice(i + 6, i + 9)),
        t = M.rayTri(o, d, a, b, c);
      if (t !== null && t < max) {
        max = t;
        hit = { point: V.add(o, V.mul(d, t)), normal: normal(a, b, c), t, index: i };
      }
    }
    return hit;
  };
  M.analyze = (body, axis = 'Z', plane = null) => {
    const p = M.world(body),
      bb = M.bounds(p),
      k = 'XYZ'.indexOf(axis),
      ax = [0, 0, 0];
    ax[k] = 1;
    const at = plane === null ? bb.center[k] : plane,
      th = [],
      drafts = [];
    let under = 0,
      count = 0;
    const step = Math.max(9, Math.ceil(p.length / 9 / 56) * 9);
    for (let i = 0; i < p.length; i += step) {
      const a = Array.from(p.slice(i, i + 3)),
        b = Array.from(p.slice(i + 3, i + 6)),
        c = Array.from(p.slice(i + 6, i + 9));
      if (c.length < 3) continue;
      const n = normal(a, b, c),
        mid = V.mul(V.add(V.add(a, b), c), 1 / 3);
      if (V.len(V.cross(V.sub(b, a), V.sub(c, a))) < 0.01) continue;
      const off = V.add(mid, V.mul(n, -0.015)),
        h = M.raycast(p, off, V.mul(n, -1));
      if (h && h.t > 0.025) th.push(h.t + 0.015);
      const dot = V.dot(n, ax);
      if (Math.abs(dot) < 0.9) drafts.push((Math.asin(Math.abs(dot)) * 180) / Math.PI);
      const dir = V.mul(ax, mid[k] >= at ? 1 : -1);
      if (Math.abs(dot) > 0.025) {
        count++;
        if (V.dot(n, dir) < -0.05 || M.raycast(p, V.add(mid, V.mul(dir, 0.04)), dir)) under++;
      }
    }
    th.sort((a, b) => a - b);
    drafts.sort((a, b) => a - b);
    const lo = th.length ? th[Math.floor(th.length * 0.1)] : Math.min(...bb.size),
      hi = th.length ? th[Math.floor(th.length * 0.9)] : Math.max(...bb.size);
    return {
      ...bb,
      volume: M.volume(p),
      minWall: lo,
      maxWall: hi,
      draft: drafts.length ? drafts[Math.floor(drafts.length * 0.1)] : 90,
      undercut: count ? under / count : 0,
      samples: th.length,
      triangles: p.length / 9
    };
  };
  M.intersects = (a, b) => {
    const pa = M.world(a),
      pb = M.world(b),
      A = M.bounds(pa),
      B = M.bounds(pb);
    if (A.min.some((v, i) => A.max[i] <= B.min[i] + 0.02 || B.max[i] <= v + 0.02)) return false;
    try {
      return M.volume(M.csg(pa, pb, 'intersect')) > 0.15;
    } catch {
      return true;
    }
  };
})(window.MP);
