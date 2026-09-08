(function (M) {
  'use strict';
  const V = M.V,
    S = M.Sketch;
  const { TAU, eps, clone, sub, add, mul, dot, cross, len, unit, err } = M.SketchMath;
  const { triangle } = M.SketchMath;
  S.extrude = (sketch, depth = 20, symmetric = false) => {
    if (!Number.isFinite(depth) || Math.abs(depth) < 0.01 || Math.abs(depth) > 10000)
      err('돌출 길이는 ±0.01-10,000 mm입니다.', 'Depth must be ±0.01-10,000 mm.');
    const rings = S.profile(sketch),
      lo = symmetric ? -Math.abs(depth) / 2 : Math.min(0, depth),
      hi = symmetric ? Math.abs(depth) / 2 : Math.max(0, depth),
      out = [];
    for (const t of S.cap(rings)) {
      triangle(out, ...[t[2], t[1], t[0]].map((p) => S.toWorld(sketch, p, lo)));
      triangle(out, ...t.map((p) => S.toWorld(sketch, p, hi)));
    }
    for (const r of rings)
      for (let i = 0; i < r.length; i++) {
        const a = S.toWorld(sketch, r[i], lo),
          b = S.toWorld(sketch, r[(i + 1) % r.length], lo),
          c = S.toWorld(sketch, r[(i + 1) % r.length], hi),
          d = S.toWorld(sketch, r[i], hi);
        triangle(out, a, b, c);
        triangle(out, a, c, d);
      }
    return S.checkSolid(out);
  };
  S.revolve = (sketch, axis = 'V', angle = 360, axisEntity = null) => {
    const rings = S.profile(sketch);
    if (!Number.isFinite(angle) || Math.abs(angle) < 1 || Math.abs(angle) > 360)
      err('회전각은 ±1-360°입니다.', 'Revolve angle must be ±1-360°.');
    let p0 = [0, 0],
      direction = axis === 'U' ? [1, 0] : [0, 1];
    if (axisEntity) {
      if (axisEntity.type !== 'line')
        err('회전축은 직선이어야 합니다.', 'Revolution axis must be a line.');
      p0 = axisEntity.points[0];
      direction = unit(sub(axisEntity.points[1], p0));
    }
    const n2 = [direction[1], -direction[0]],
      radials = rings.flat().map((p) => dot(sub(p, p0), n2));
    if (Math.min(...radials) < -1e-5 && Math.max(...radials) > 1e-5)
      err(
        '프로파일이 회전축을 가로지릅니다. 축의 한쪽에 그리세요.',
        'Profile crosses revolution axis. Draw it on one side.'
      );
    const f = S.frame(sketch),
      origin = S.toWorld(sketch, p0),
      axis3 = V.add(V.mul(f.u, direction[0]), V.mul(f.v, direction[1])),
      radial = V.add(V.mul(f.u, n2[0]), V.mul(f.v, n2[1])),
      tangent = V.cross(axis3, radial),
      full = Math.abs(angle) === 360,
      steps = Math.max(4, Math.ceil(Math.abs(angle) / 7.5)),
      out = [];
    const point = (p, t) => {
      const q = sub(p, p0),
        h = dot(q, direction),
        r = dot(q, n2);
      return V.add(
        origin,
        V.add(
          V.mul(axis3, h),
          V.add(V.mul(radial, r * Math.cos(t)), V.mul(tangent, r * Math.sin(t)))
        )
      );
    };
    for (const ring of rings)
      for (let j = 0; j < steps; j++) {
        const t0 = (((angle * Math.PI) / 180) * j) / steps,
          t1 = (((angle * Math.PI) / 180) * (j + 1)) / steps;
        for (let i = 0; i < ring.length; i++) {
          const k = (i + 1) % ring.length,
            a = point(ring[i], t0),
            b = point(ring[k], t0),
            c = point(ring[k], t1),
            d = point(ring[i], t1);
          triangle(out, a, b, c);
          triangle(out, a, c, d);
        }
      }
    if (!full)
      for (const t of S.cap(rings)) {
        triangle(out, ...t.map((p) => point(p, 0)));
        triangle(
          out,
          ...t
            .slice()
            .reverse()
            .map((p) => point(p, (angle * Math.PI) / 180))
        );
      }
    return S.checkSolid(out);
  };
  S.resample = (ring, n, closed = true) => {
    const lengths = [0],
      pts = closed ? ring.concat([ring[0]]) : ring;
    for (let i = 1; i < pts.length; i++)
      lengths.push(lengths.at(-1) + V.len(V.sub(pts[i], pts[i - 1])));
    const total = lengths.at(-1);
    if (total < eps) err('길이가 0인 경로입니다.', 'Zero-length path.');
    let j = 1;
    return Array.from({ length: n }, (_, i) => {
      const t = (total * i) / (closed ? n : n - 1);
      while (j < lengths.length - 1 && lengths[j] < t) j++;
      return V.lerp(pts[j - 1], pts[j], (t - lengths[j - 1]) / (lengths[j] - lengths[j - 1] || 1));
    });
  };
  S.sweep = (profile, pathSketch, pathId) => {
    const rings = S.profile(profile),
      entity = pathSketch.entities.find((e) => e.id === pathId);
    let pts;
    if (entity) {
      if (entity.construction || entity.type === 'point')
        err(
          '실체 곡선 또는 선을 경로로 선택하세요.',
          'Choose a non-construction curve as the path.'
        );
      const q = S.sample(entity, 40);
      if (q.closed) err('스윕 경로는 열린 경로여야 합니다.', 'Sweep path must be open.');
      pts = q.points;
    } else {
      const chains = S.contours(pathSketch, false);
      if (chains.length !== 1 || chains[0].closed)
        err(
          '경로 스케치에는 연결된 열린 경로 하나가 필요합니다.',
          'Path sketch must contain one connected open chain.'
        );
      pts = chains[0].points;
    }
    const world = pts.map((p) => S.toWorld(pathSketch, p));
    if (world.length < 2) err('두 점 이상인 경로가 필요합니다.', 'Path needs at least two points.');
    // Parallel transport a frame along the path; profile coordinates are relative to its sketch origin.
    const tangents = world.map((p, i) =>
        V.unit(V.sub(world[Math.min(world.length - 1, i + 1)], world[Math.max(0, i - 1)]))
      ),
      frames = [],
      base = S.frame(profile);
    let u = V.sub(base.u, V.mul(tangents[0], V.dot(base.u, tangents[0])));
    if (V.len(u) < 1e-5) u = V.sub(base.v, V.mul(tangents[0], V.dot(base.v, tangents[0])));
    u = V.unit(u);
    for (let i = 0; i < world.length; i++) {
      const t = tangents[i];
      if (i) {
        const old = tangents[i - 1],
          ax = V.cross(old, t),
          a = Math.atan2(V.len(ax), V.dot(old, t));
        if (a > Math.PI * 0.85)
          err('경로가 급격하게 되돌아갑니다.', 'Sweep path reverses too sharply.');
        if (V.len(ax) > eps) u = S.rotateAxis(u, V.unit(ax), a);
        u = V.unit(V.sub(u, V.mul(t, V.dot(u, t))));
      }
      frames.push({ u: u.slice(), v: V.cross(t, u) });
    }
    const map = (p, j) =>
        V.add(world[j], V.add(V.mul(frames[j].u, p[0]), V.mul(frames[j].v, p[1]))),
      out = [];
    for (let j = 1; j < world.length; j++)
      for (const r of rings)
        for (let i = 0; i < r.length; i++) {
          const k = (i + 1) % r.length,
            a = map(r[i], j - 1),
            b = map(r[k], j - 1),
            c = map(r[k], j),
            d = map(r[i], j);
          triangle(out, a, b, c);
          triangle(out, a, c, d);
        }
    for (const t of S.cap(rings)) {
      triangle(
        out,
        ...t
          .slice()
          .reverse()
          .map((p) => map(p, 0))
      );
      triangle(out, ...t.map((p) => map(p, world.length - 1)));
    }
    return S.checkSolid(out);
  };
  S.rotateAxis = (v, axis, a) =>
    V.add(
      V.add(V.mul(v, Math.cos(a)), V.mul(V.cross(axis, v), Math.sin(a))),
      V.mul(axis, V.dot(axis, v) * (1 - Math.cos(a)))
    );
  S.loft = (sketches) => {
    if (sketches.length < 2 || sketches.length > 12)
      err(
        '로프트에는 서로 다른 위치의 단면 2-12개가 필요합니다.',
        'Loft needs 2-12 distinct sections.'
      );
    const rings = sketches.map((s) => S.profile(s));
    if (rings.some((rs) => rs.length !== 1))
      err(
        '로프트 단면은 각각 구멍 없는 닫힌 외곽 하나여야 합니다.',
        'Loft sections must each have a single closed outer contour without holes.'
      );
    const n = Math.min(160, Math.max(32, ...rings.map((r) => r[0].length))),
      local = rings.map((r) => S.resample(r[0], n)),
      world = local.map((r, i) => r.map((p) => S.toWorld(sketches[i], p))),
      out = [];
    // Minimise seam twist by choosing the closest cyclic correspondence; retain user section order.
    for (let j = 1; j < world.length; j++) {
      let best = 0,
        cost = Infinity;
      const ca = M.bounds(world[j - 1].flat()).center,
        cb = M.bounds(world[j].flat()).center;
      for (let shift = 0; shift < n; shift++) {
        let c = 0;
        for (let i = 0; i < n; i++)
          c += V.len(V.sub(V.sub(world[j - 1][i], ca), V.sub(world[j][(i + shift) % n], cb))) ** 2;
        if (c < cost) {
          cost = c;
          best = shift;
        }
      }
      world[j] = world[j].slice(best).concat(world[j].slice(0, best));
      local[j] = local[j].slice(best).concat(local[j].slice(0, best));
      if (V.len(V.sub(ca, cb)) < 1e-4)
        err('같은 위치의 단면으로 로프트할 수 없습니다.', 'Loft sections must not coincide.');
      for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        triangle(out, world[j - 1][i], world[j - 1][k], world[j][k]);
        triangle(out, world[j - 1][i], world[j][k], world[j][i]);
      }
    }
    for (const t of S.cap([local[0]]))
      triangle(
        out,
        ...t
          .slice()
          .reverse()
          .map((p) => S.toWorld(sketches[0], p))
      );
    for (const t of S.cap([local.at(-1)]))
      triangle(out, ...t.map((p) => S.toWorld(sketches.at(-1), p)));
    return S.checkSolid(out);
  };
})(window.MP);
