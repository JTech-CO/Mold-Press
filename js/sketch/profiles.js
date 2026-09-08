(function (M) {
  'use strict';
  const V = M.V,
    S = M.Sketch;
  const { TAU, eps, clone, sub, add, mul, dot, cross, len, unit, err } = M.SketchMath;
  S.contours = (sketch, closedOnly = true) => {
    const loops = [],
      chains = [];
    for (const e of sketch.entities) {
      if (e.construction || e.type === 'point') continue;
      const s = S.sample(e);
      if (s.points.length < 2) continue;
      (s.closed ? loops : chains).push({ points: s.points, ids: [e.id], closed: s.closed });
    }
    while (chains.length) {
      const a = chains.shift();
      let changed = true;
      while (changed && !a.closed) {
        changed = false;
        for (let j = 0; j < chains.length; j++) {
          const b = chains[j],
            p = a.points,
            q = b.points;
          let r = null;
          if (len(sub(p.at(-1), q[0])) < 1e-4) r = p.concat(q.slice(1));
          else if (len(sub(p.at(-1), q.at(-1))) < 1e-4) r = p.concat(q.slice(0, -1).reverse());
          else if (len(sub(p[0], q.at(-1))) < 1e-4) r = q.concat(p.slice(1));
          else if (len(sub(p[0], q[0])) < 1e-4) r = q.slice().reverse().concat(p.slice(1));
          if (r) {
            a.points = r;
            a.ids.push(...b.ids);
            chains.splice(j, 1);
            changed = true;
            break;
          }
        }
        if (a.points.length > 2 && len(sub(a.points[0], a.points.at(-1))) < 1e-4) {
          a.closed = true;
          a.points.pop();
        }
      }
      if (!a.closed && closedOnly)
        err(
          '열린 프로파일입니다. 끝점을 연결하거나 보조선으로 전환하세요.',
          'Open profile. Connect endpoints or mark unused curves as construction.'
        );
      loops.push(a);
    }
    if (!loops.length)
      err(
        '실체 선으로 그린 프로파일이 없습니다. 점·보조선은 솔리드가 되지 않습니다.',
        'No profile: points and construction geometry do not create solids.'
      );
    return loops;
  };
  function intersect(a, b, c, d) {
    const r = sub(b, a),
      s = sub(d, c),
      den = cross(r, s),
      ca = sub(c, a);
    if (Math.abs(den) < eps) {
      if (Math.abs(cross(ca, r)) > eps) return false;
      const rr = dot(r, r);
      if (rr < eps) return false;
      const x = dot(ca, r) / rr,
        y = dot(sub(d, a), r) / rr;
      return Math.min(Math.max(x, y), 1) - Math.max(Math.min(x, y), 0) > eps;
    }
    const t = cross(ca, s) / den,
      u = cross(ca, r) / den;
    return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
  }
  S.profile = (sketch) => {
    const cs = S.contours(sketch);
    let total = 0;
    for (const c of cs) {
      if (c.points.length < 3 || Math.abs(S.area(c.points)) < 1e-5)
        err('프로파일 면적이 0입니다.', 'Zero-area profile.');
      total += c.points.length;
    }
    if (total > 1400)
      err('프로파일이 너무 복잡합니다 (최대 1,400점).', 'Profile exceeds 1,400 sampled points.');
    const edges = [];
    cs.forEach((c, k) =>
      c.points.forEach((a, i) =>
        edges.push({ a, b: c.points[(i + 1) % c.points.length], k, i, n: c.points.length })
      )
    );
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i],
          b = edges[j];
        if (a.k === b.k && (Math.abs(a.i - b.i) === 1 || Math.abs(a.i - b.i) === a.n - 1)) continue;
        if (intersect(a.a, a.b, b.a, b.b))
          err(
            '프로파일이 교차하거나 겹칩니다. 원본은 유지됩니다.',
            'Intersecting/overlapping profile; source preserved.'
          );
      }
    const rings = cs.map((c) => c.points);
    return rings.map((ring, i) => {
      const depth = rings.filter((r, j) => i !== j && S.inside(ring[0], r)).length;
      const ccw = depth % 2 === 0;
      return S.area(ring) > 0 === ccw ? ring : ring.slice().reverse();
    });
  };
  S.cap = (rings) => {
    const ys = [...new Set(rings.flatMap((r) => r.map((p) => Number(p[1].toFixed(8)))))].sort(
        (a, b) => a - b
      ),
      out = [];
    const tri = (a, b, c) => {
      if (Math.abs(cross(sub(b, a), sub(c, a))) > 1e-9) out.push([a, b, c]);
    };
    for (let i = 1; i < ys.length; i++) {
      const y0 = ys[i - 1],
        y1 = ys[i],
        mid = (y0 + y1) / 2,
        hits = [];
      for (const r of rings)
        for (let j = 0; j < r.length; j++) {
          const a = r[j],
            b = r[(j + 1) % r.length];
          if (mid <= Math.min(a[1], b[1]) || mid >= Math.max(a[1], b[1])) continue;
          const x = (y) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
          hits.push({ x: x(mid), a: [x(y0), y0], b: [x(y1), y1] });
        }
      hits.sort((a, b) => a.x - b.x);
      if (hits.length % 2)
        err('프로파일 경계를 닫을 수 없습니다.', 'Profile boundary is not closed.');
      for (let j = 0; j < hits.length; j += 2) {
        const a = hits[j],
          b = hits[j + 1];
        tri(a.a, b.a, b.b);
        tri(a.a, b.b, a.b);
      }
    }
    return out;
  };
  function triangle(out, a, b, c) {
    if (V.len(V.cross(V.sub(b, a), V.sub(c, a))) > 1e-8) out.push(...a, ...b, ...c);
  }
  S.tri = triangle;
  S.checkSolid = (p) => {
    p = S.conform ? S.conform(p) : p;
    if (
      p.length < 36 ||
      p.length % 9 ||
      p.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e5) ||
      M.volume(p) < 1e-5
    )
      err(
        '유효한 솔리드를 만들 수 없습니다. 입력값을 확인하세요.',
        'Invalid solid; check parameters.'
      );
    if (p.length > 540000)
      err('결과가 60,000개 삼각형을 초과합니다.', 'Result exceeds 60,000 triangles.');
    if (M.signedVolume(p) < 0) {
      for (let i = 0; i < p.length; i += 9)
        for (let k = 0; k < 3; k++) [p[i + 3 + k], p[i + 6 + k]] = [p[i + 6 + k], p[i + 3 + k]];
    }
    return p;
  };
  M.SketchMath.triangle = triangle;
})(window.MP);
