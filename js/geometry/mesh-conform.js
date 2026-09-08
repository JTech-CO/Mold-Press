/* Conform tessellated cap/side seams and orient closed shells. Used only by sketch features. */
(function (M) {
  const S = M.Sketch,
    V = M.V;
  S.conform = (p) => {
    const tol = 1e-6,
      verts = [],
      ids = [],
      lookup = new Map(),
      key = (v) => v.map((x) => Math.round(x / tol)).join(',');
    for (let i = 0; i < p.length; i += 3) {
      const v = p.slice(i, i + 3),
        k = key(v);
      let id = lookup.get(k);
      if (id === undefined) {
        id = verts.length;
        verts.push(v);
        lookup.set(k, id);
      }
      ids.push(id);
    }
    let tris = [];
    for (let i = 0; i < ids.length; i += 3) {
      const t = ids.slice(i, i + 3);
      if (new Set(t).size === 3) tris.push(t);
    }
    const edges = (ts) => {
      const e = new Map();
      ts.forEach((t, i) => {
        for (let j = 0; j < 3; j++) {
          const a = t[j],
            b = t[(j + 1) % 3],
            key = a < b ? a + ',' + b : b + ',' + a;
          let q = e.get(key);
          if (!q) e.set(key, (q = []));
          q.push({ face: i, a, b, j });
        }
      });
      return e;
    };
    for (let pass = 0; pass < 3; pass++) {
      const em = edges(tris),
        border = [...em.values()].filter((e) => e.length === 1).map((e) => e[0]);
      if (!border.length) break;
      const boundaryIds = [...new Set(border.flatMap((e) => [e.a, e.b]))],
        sorted = [0, 1, 2].map((k) =>
          boundaryIds.slice().sort((a, b) => verts[a][k] - verts[b][k])
        ),
        splits = new Map();
      for (const e of border) {
        const a = verts[e.a],
          b = verts[e.b],
          d = V.sub(b, a),
          ll = V.dot(d, d),
          k = d.map(Math.abs).indexOf(Math.max(...d.map(Math.abs))),
          min = Math.min(a[k], b[k]) - tol,
          max = Math.max(a[k], b[k]) + tol,
          list = sorted[k],
          parts = [];
        let lo = 0,
          hi = list.length;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (verts[list[m]][k] < min) lo = m + 1;
          else hi = m;
        }
        for (let n = lo; n < list.length && verts[list[n]][k] <= max; n++) {
          const id = list[n];
          if (id === e.a || id === e.b) continue;
          const v = verts[id],
            t = V.dot(V.sub(v, a), d) / ll;
          if (t < 1e-8 || t > 1 - 1e-8) continue;
          if (V.len(V.sub(v, V.add(a, V.mul(d, t)))) <= tol * 2) parts.push({ id, t });
        }
        if (parts.length) {
          let by = splits.get(e.face);
          if (!by) splits.set(e.face, (by = {}));
          by[e.j] = parts.sort((a, b) => a.t - b.t).map((p) => p.id);
        }
      }
      if (!splits.size) break;
      const next = [];
      for (let i = 0; i < tris.length; i++) {
        const t = tris[i],
          s = splits.get(i);
        if (!s) {
          next.push(t);
          continue;
        }
        const polygon = [];
        for (let j = 0; j < 3; j++) {
          polygon.push(t[j]);
          if (s[j]) polygon.push(...s[j]);
        }
        const c = V.mul(
            t.reduce((a, id) => V.add(a, verts[id]), [0, 0, 0]),
            1 / 3
          ),
          id = verts.length;
        verts.push(c);
        for (let j = 0; j < polygon.length; j++)
          next.push([polygon[j], polygon[(j + 1) % polygon.length], id]);
      }
      tris = next;
    }
    const em = edges(tris);
    let open = 0,
      nonmanifold = 0;
    for (const e of em.values()) {
      if (e.length === 1) open++;
      if (e.length > 2) nonmanifold++;
    }
    if (open || nonmanifold)
      throw Error(
        '닫힌 메쉬를 구성할 수 없습니다. 단면/경로가 접하거나 겹치는지 확인하세요. / Non-closed mesh: ' +
          open +
          ' boundary, ' +
          nonmanifold +
          ' nonmanifold edges.'
      );
    const adjacency = tris.map(() => []);
    for (const e of em.values()) {
      const [a, b] = e,
        same = a.a === b.a;
      adjacency[a.face].push([b.face, same]);
      adjacency[b.face].push([a.face, same]);
    }
    const signs = new Map();
    for (let i = 0; i < tris.length; i++) {
      if (signs.has(i)) continue;
      const queue = [i],
        component = [];
      signs.set(i, false);
      while (queue.length) {
        const j = queue.pop();
        component.push(j);
        for (const [k, same] of adjacency[j]) {
          const sign = signs.get(j) !== same;
          if (signs.has(k)) {
            if (signs.get(k) !== sign)
              throw Error('일관된 메쉬 방향을 구성할 수 없습니다. / Non-orientable mesh.');
          } else {
            signs.set(k, sign);
            queue.push(k);
          }
        }
      }
      let vol = 0;
      for (const j of component) {
        const t = tris[j],
          a = verts[t[0]],
          b = verts[t[1]],
          c = verts[t[2]];
        vol += (V.dot(a, V.cross(b, c)) / 6) * (signs.get(j) ? -1 : 1);
      }
      if (vol < 0) for (const j of component) signs.set(j, !signs.get(j));
    }
    const out = [];
    tris.forEach((t, i) => {
      const [a, b, c] = signs.get(i) ? [t[0], t[2], t[1]] : t;
      out.push(...verts[a], ...verts[b], ...verts[c]);
    });
    return out;
  };
})(window.MP);
