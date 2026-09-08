(function (M) {
  'use strict';
  const V = M.V,
    A = M.Mate;
  const { E, clamp, copy, fail, Q, solveLinear, least, smallestEigen } = M.MateMath;
  const cache = new Map();
  A.features = (body) => {
    if (cache.has(body.geo)) return cache.get(body.geo);
    const p = Array.from(M.unpack(body.geo)),
      ts = [],
      planes = new Map(),
      verts = new Map(),
      edgeTriangles = new Map();
    const key = (v) => v.map((x) => Math.round(x / 1e-4)).join(',');
    for (let i = 0; i < p.length; i += 9) {
      const vs = [p.slice(i, i + 3), p.slice(i + 3, i + 6), p.slice(i + 6, i + 9)],
        c = V.cross(V.sub(vs[1], vs[0]), V.sub(vs[2], vs[0])),
        area = V.len(c) / 2;
      if (area < 1e-8) continue;
      const n = V.unit(c),
        mid = V.mul(vs.reduce(V.add, [0, 0, 0]), 1 / 3),
        w = V.dot(n, vs[0]),
        pk = n.map((x) => Math.round(x * 1e4)).join(',') + ':' + Math.round(w * 1e3),
        t = { i, vs, n, mid, area, neighbors: new Set() };
      ts.push(t);
      const list = planes.get(pk) || [];
      list.push(t);
      planes.set(pk, list);
      for (let k = 0; k < 3; k++) {
        const a = key(vs[k]),
          b = key(vs[(k + 1) % 3]),
          ek = [a, b].sort().join('|');
        verts.set(a, vs[k]);
        const old = edgeTriangles.get(ek) || [];
        for (const o of old) {
          o.neighbors.add(t);
          t.neighbors.add(o);
        }
        old.push(t);
        edgeTriangles.set(ek, old);
      }
    }
    const faces = [],
      byTri = new Map();
    let num = 0;
    for (const group of planes.values()) {
      const area = group.reduce((a, t) => a + t.area, 0),
        point = V.mul(
          group.reduce((a, t) => V.add(a, V.mul(t.mid, t.area)), [0, 0, 0]),
          1 / area
        ),
        unique = [...new Map(group.flatMap((t) => t.vs.map((v) => [key(v), v]))).values()],
        f = {
          id: 'P' + ++num,
          kind: 'plane',
          point,
          normal: group[0].n,
          area,
          indices: group.map((t) => t.i),
          vertices: unique
        };
      const ds = unique.map((v) => V.len(V.sub(v, point))),
        r = Math.max(...ds),
        rim = unique.filter((v, i) => Math.abs(ds[i] - r) < Math.max(0.002, r * 0.003));
      if (rim.length >= 10 && rim.length >= unique.length * 0.5) {
        f.circular = true;
        f.radius = r;
        f.axis = f.normal.slice();
      }
      faces.push(f);
      for (const t of group) byTri.set(t.i, f);
    }
    // Smoothly connected facets are fitted to cylinders, never guessed from a body bounding box.
    const seen = new Set(),
      curved = [];
    for (const first of ts) {
      if (seen.has(first)) continue;
      const group = [],
        queue = [first];
      seen.add(first);
      while (queue.length) {
        const t = queue.pop();
        group.push(t);
        for (const q of t.neighbors)
          if (!seen.has(q) && V.dot(t.n, q.n) > Math.cos(Math.PI / 4)) {
            seen.add(q);
            queue.push(q);
          }
      }
      if (group.length < 12) continue;
      const ns = group.map((t) => t.n),
        axis = smallestEigen(ns);
      if (ns.some((n) => Math.abs(V.dot(n, axis)) > 0.025)) continue;
      const u = V.unit(V.cross(axis, Math.abs(axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0])),
        v = V.cross(axis, u),
        points = [...new Map(group.flatMap((t) => t.vs.map((p) => [key(p), p]))).values()],
        a = points.map((p) => V.dot(p, u)),
        b = points.map((p) => V.dot(p, v)),
        z = points.map((p) => V.dot(p, axis)),
        fit = least(
          a.map((x, i) => [2 * x, 2 * b[i], 1]),
          a.map((x, i) => x * x + b[i] * b[i])
        );
      if (!fit) continue;
      const radius = Math.sqrt(Math.max(0, fit[2] + fit[0] ** 2 + fit[1] ** 2));
      if (
        radius < 0.01 ||
        points.some(
          (p, i) =>
            Math.abs(Math.hypot(a[i] - fit[0], b[i] - fit[1]) - radius) >
            Math.max(0.004, radius * 0.006)
        )
      )
        continue;
      const point = V.add(
          V.add(V.mul(u, fit[0]), V.mul(v, fit[1])),
          V.mul(axis, (Math.min(...z) + Math.max(...z)) / 2)
        ),
        f = {
          id: 'C' + (curved.length + 1),
          kind: 'cylinder',
          point,
          normal: group[0].n,
          axis,
          radius,
          length: Math.max(...z) - Math.min(...z),
          indices: group.map((t) => t.i),
          vertices: points
        };
      curved.push(f);
    }
    const result = { faces, curved, byTri };
    cache.set(body.geo, result);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return result;
  };
  A.reference = (b, f) => ({
    bodyId: b.id,
    featureId: f.id,
    kind: f.kind,
    point: f.point.slice(),
    normal: f.normal.slice(),
    axis: f.axis?.slice(),
    radius: f.radius,
    circular: f.circular,
    signature: A.signature(b.geo)
  });
  A.fromHit = (b, hit, preferAxis = false) => {
    const fs = A.features(b);
    const f = preferAxis
      ? fs.curved.find((f) => f.indices.includes(hit.index)) || fs.byTri.get(hit.index)
      : fs.byTri.get(hit.index);
    if (!f) fail('선택한 면을 인식하지 못했습니다.', 'Could not recognise the selected face.');
    if (preferAxis && f.kind !== 'cylinder' && !f.circular)
      fail(
        '원통 옆면 또는 원형 평면을 선택하세요.',
        'Choose a cylindrical side or circular planar face.'
      );
    return A.reference(b, f);
  };
  A.world = (b, r) => {
    const point = V.add(
        b.pos,
        M.rotate(
          r.point.map((x, i) => x * b.scale[i]),
          b.rot
        )
      ),
      normal = V.unit(
        M.rotate(
          r.normal.map((x, i) => x / b.scale[i]),
          b.rot
        )
      ),
      axis =
        r.axis &&
        V.unit(
          M.rotate(
            r.axis.map((x, i) => x * b.scale[i]),
            b.rot
          )
        );
    let radius = r.radius;
    if (radius) {
      const localAxis = r.axis || r.normal,
        u = V.unit(V.cross(localAxis, Math.abs(localAxis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0])),
        v = V.cross(localAxis, u),
        su = V.len(u.map((x, i) => x * b.scale[i])),
        sv = V.len(v.map((x, i) => x * b.scale[i]));
      if (Math.abs(su - sv) > 1e-3)
        fail(
          '비균등 스케일로 원형 단면이 변형되었습니다.',
          'Non-uniform scale has deformed a circular section.'
        );
      radius *= su;
    }
    return { ...r, point, normal, axis, radius };
  };
})(window.MP);
