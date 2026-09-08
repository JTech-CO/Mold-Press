(function (M) {
  'use strict';
  const V = M.V,
    S = M.Sketch;
  const { TAU, eps, clone, sub, add, mul, dot, cross, len, unit, err } = M.SketchMath;
  S.frame = (s) => {
    if (s.frame) return s.frame;
    const f =
      s.plane === 'XZ'
        ? { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] }
        : s.plane === 'YZ'
          ? { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] }
          : { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
    return { ...f, origin: V.mul(f.n, s.offset || 0) };
  };
  S.toWorld = (s, p, z = 0) => {
    const f = S.frame(s);
    return V.add(f.origin, V.add(V.mul(f.u, p[0]), V.add(V.mul(f.v, p[1]), V.mul(f.n, z))));
  };
  S.fromWorld = (s, p) => {
    const f = S.frame(s),
      d = V.sub(p, f.origin);
    return [V.dot(d, f.u), V.dot(d, f.v)];
  };
  S.create = (plane = 'XY', offset = 0, name = 'Sketch') => ({
    id: M.uid(),
    name,
    plane,
    offset,
    entities: [],
    visible: true
  });
  S.area = (p) => p.reduce((a, v, i) => a + cross(v, p[(i + 1) % p.length]), 0) / 2;
  S.inside = (p, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      let a = ring[i],
        b = ring[j];
      if (
        a[1] > p[1] !== b[1] > p[1] &&
        p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
    }
    return inside;
  };
  S.arcThrough = (a, m, b) => {
    const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1]));
    if (Math.abs(d) < eps) err('원호의 세 점이 일직선입니다.', 'Arc points are collinear.');
    const q = (x) => dot(x, x),
      c = [
        (q(a) * (m[1] - b[1]) + q(m) * (b[1] - a[1]) + q(b) * (a[1] - m[1])) / d,
        (q(a) * (b[0] - m[0]) + q(m) * (a[0] - b[0]) + q(b) * (m[0] - a[0])) / d
      ],
      angle = (p) => Math.atan2(p[1] - c[1], p[0] - c[0]),
      start = angle(a),
      mid = (((angle(m) - start) % TAU) + TAU) % TAU,
      end = (((angle(b) - start) % TAU) + TAU) % TAU;
    return {
      type: 'arc',
      center: c,
      radius: len(sub(a, c)),
      start,
      sweep: mid < end ? end : end - TAU
    };
  };
  S.vertices = (e) =>
    e.type === 'rectangle'
      ? [
          [e.points[0][0], e.points[0][1]],
          [e.points[1][0], e.points[0][1]],
          [e.points[1][0], e.points[1][1]],
          [e.points[0][0], e.points[1][1]]
        ]
      : e.type === 'polygon'
        ? Array.from({ length: e.sides || 6 }, (_, i) =>
            add(
              e.center,
              mul(
                [
                  Math.cos((e.angle || 0) + (i * TAU) / (e.sides || 6)),
                  Math.sin((e.angle || 0) + (i * TAU) / (e.sides || 6))
                ],
                e.radius
              )
            )
          )
        : e.points || [];
  S.cornerPath = (pts, corners = {}, closed = true) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const b = pts[i],
        cfg = corners[i];
      if (!cfg || (!closed && (i === 0 || i === pts.length - 1))) {
        out.push(b.slice());
        continue;
      }
      const a = pts[(i + pts.length - 1) % pts.length],
        c = pts[(i + 1) % pts.length],
        u = unit(sub(a, b)),
        v = unit(sub(c, b)),
        theta = Math.acos(Math.max(-1, Math.min(1, dot(u, v)))),
        t = cfg.type === 'fillet' ? cfg.radius / Math.tan(theta / 2) : cfg.radius;
      if (theta < 0.01 || Math.PI - theta < 0.01 || !Number.isFinite(t) || t <= 0)
        err('해당 꼭짓점은 가공할 수 없습니다.', 'Invalid corner.');
      if (t > Math.min(len(sub(a, b)), len(sub(c, b))) * 0.49)
        err(
          '반지름/거리가 인접 선분의 절반보다 큽니다.',
          'Corner radius/distance exceeds half an adjacent edge.'
        );
      const p = add(b, mul(u, t)),
        q = add(b, mul(v, t));
      out.push(p);
      if (cfg.type === 'fillet') {
        const center = add(b, mul(unit(add(u, v)), cfg.radius / Math.sin(theta / 2))),
          a0 = Math.atan2(p[1] - center[1], p[0] - center[0]),
          a1 = Math.atan2(q[1] - center[1], q[0] - center[0]),
          turn = cross(sub(b, a), sub(c, b));
        let sweep = a1 - a0;
        if (turn > 0) {
          while (sweep < 0) sweep += TAU;
        } else while (sweep > 0) sweep -= TAU;
        const steps = Math.max(3, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
        for (let j = 1; j < steps; j++)
          out.push(
            add(
              center,
              mul(
                [Math.cos(a0 + (sweep * j) / steps), Math.sin(a0 + (sweep * j) / steps)],
                cfg.radius
              )
            )
          );
      }
      out.push(q);
    }
    return out;
  };
  S.sample = (e, res = 48) => {
    let points = [],
      closed = false;
    if (e.type === 'point') return { points: [e.point], closed: false };
    if (e.type === 'line') points = e.points.map((p) => p.slice());
    else if (['rectangle', 'polygon', 'polyline'].includes(e.type)) {
      closed = e.type !== 'polyline' || !!e.closed;
      points = S.cornerPath(S.vertices(e), e.corners, closed);
    } else if (e.type === 'circle' || e.type === 'ellipse') {
      closed = true;
      const rx = e.radius || e.rx,
        ry = e.type === 'ellipse' ? e.ry : e.radius;
      points = Array.from({ length: res }, (_, i) => [
        e.center[0] + rx * Math.cos((TAU * i) / res),
        e.center[1] + ry * Math.sin((TAU * i) / res)
      ]);
    } else if (e.type === 'arc') {
      const n = Math.max(3, Math.ceil((res * Math.abs(e.sweep)) / TAU));
      points = Array.from({ length: n + 1 }, (_, i) =>
        add(
          e.center,
          mul(
            [Math.cos(e.start + (e.sweep * i) / n), Math.sin(e.start + (e.sweep * i) / n)],
            e.radius
          )
        )
      );
    } else if (e.type === 'bezier') {
      const [a, b, c, d] = e.points;
      points = Array.from({ length: res + 1 }, (_, i) => {
        const t = i / res,
          u = 1 - t;
        return [0, 1].map(
          (k) => a[k] * u * u * u + 3 * b[k] * u * u * t + 3 * c[k] * u * t * t + d[k] * t * t * t
        );
      });
    } else err('알 수 없는 스케치 요소입니다.', 'Unknown sketch entity.');
    const clean = [];
    for (const p of points) if (!clean.length || len(sub(p, clean.at(-1))) > eps) clean.push(p);
    if (closed && clean.length > 1 && len(sub(clean[0], clean.at(-1))) < eps) clean.pop();
    return { points: clean, closed };
  };
  S.curvature = (e) => {
    if (e.type === 'arc' || e.type === 'circle') return 1 / e.radius;
    if (e.type !== 'bezier') return 0;
    const p = e.points,
      t = 0.5,
      u = 0.5,
      d1 = [0, 1].map(
        (k) =>
          3 *
          (u * u * (p[1][k] - p[0][k]) +
            2 * u * t * (p[2][k] - p[1][k]) +
            t * t * (p[3][k] - p[2][k]))
      ),
      d2 = [0, 1].map(
        (k) => 6 * (u * (p[2][k] - 2 * p[1][k] + p[0][k]) + t * (p[3][k] - 2 * p[2][k] + p[1][k]))
      );
    return Math.abs(cross(d1, d2)) / Math.max(eps, len(d1) ** 3);
  };
})(window.MP);
