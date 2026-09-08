(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  M.resizeWorldDimension = (body, k, value) => {
    if (
      !Number.isInteger(k) ||
      k < 0 ||
      k > 2 ||
      !Number.isFinite(value) ||
      value < 0.01 ||
      value > 10000
    )
      throw Error('Dimension must be 0.01-10,000 mm.');
    const b = JSON.parse(JSON.stringify(body)),
      wp = M.world(b),
      bb = M.bounds(wp);
    if (bb.size[k] < 1e-7 || b.scale.some((x) => !Number.isFinite(x) || Math.abs(x) < 1e-9))
      throw Error('Cannot resize a zero-width or invalid mesh.');
    const ratio = value / bb.size[k],
      local = [];
    for (let i = 0; i < wp.length; i += 3) {
      let v = wp.slice(i, i + 3);
      v[k] = bb.center[k] + (v[k] - bb.center[k]) * ratio;
      v = M.inverseRotate(V.sub(v, b.pos), b.rot);
      local.push(...v.map((x, j) => x / b.scale[j]));
    }
    b.geo = M.pack(local);
    b.tool = null;
    b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
    return b;
  };
  M.alignBounds = (bodies, ids, axis = 'XYZ', mode = 'center', reference = 'first') => {
    const ordered = ids.map((id) => bodies.find((b) => b.id === id)).filter(Boolean),
      axes = [...axis].map((x) => 'XYZ'.indexOf(x));
    if (
      !ordered.length ||
      !axes.length ||
      axes.some((k) => k < 0) ||
      !['min', 'center', 'max'].includes(mode)
    )
      return [];
    const anchor = M.bounds(M.world(ordered[0]))[mode],
      origin = reference === 'origin' || ordered.length === 1,
      changes = [];
    for (const b of ordered) {
      const at = M.bounds(M.world(b))[mode],
        delta = [0, 0, 0];
      for (const k of axes) delta[k] = (origin ? 0 : anchor[k]) - at[k];
      if (V.len(delta) > 1e-7) changes.push({ id: b.id, delta });
    }
    return changes;
  };
  M.alignMating = (bodies, ids, mode = 'center') => {
    const changes = [];
    for (const id of ids) {
      const b = bodies.find((x) => x.id === id),
        mate = b?.mate,
        t = mate && bodies.find((x) => x.id === mate.targetId);
      if (
        !t ||
        !Array.isArray(mate.normal) ||
        mate.normal.length !== 3 ||
        mate.normal.some((x) => !Number.isFinite(x)) ||
        V.len(mate.normal) < 1e-9
      )
        continue;
      const n = V.unit(
          M.rotate(
            mate.normal.map((x, i) => x / t.scale[i]),
            t.rot
          )
        ),
        delta = V.sub(M.bounds(M.world(t))[mode], M.bounds(M.world(b))[mode]),
        tangent = V.sub(delta, V.mul(n, V.dot(delta, n)));
      if (V.len(tangent) > 1e-7) changes.push({ id, delta: tangent });
    }
    return changes;
  };
  M.stagePart = (part, others, point = null, gap = 8) => {
    const b = JSON.parse(JSON.stringify(part)),
      bb = M.bounds(M.world(b)),
      bounds = others.map((x) => M.bounds(M.world(x)));
    const drop = point && point.length === 3 && point.every(Number.isFinite),
      end = bounds.length ? Math.max(...bounds.map((x) => x.max[0])) : 0;
    const delta = drop
      ? [point[0] - bb.center[0], point[1] - bb.center[1], -bb.min[2]]
      : [bounds.length ? end + gap - bb.min[0] : -bb.center[0], -bb.center[1], -bb.min[2]];
    let placed = { min: V.add(bb.min, delta), max: V.add(bb.max, delta) };
    // Each advance moves past at least one occupied X extent; hidden parts also reserve space.
    for (let n = 0; n <= bounds.length; n++) {
      const conflicts = bounds.filter(
        (o) =>
          placed.min[0] < o.max[0] + gap - 1e-7 &&
          placed.max[0] > o.min[0] - gap + 1e-7 &&
          placed.min[1] < o.max[1] + gap - 1e-7 &&
          placed.max[1] > o.min[1] - gap + 1e-7
      );
      if (!conflicts.length) break;
      const shift = Math.max(...conflicts.map((o) => o.max[0])) + gap - placed.min[0];
      delta[0] += shift;
      placed.min[0] += shift;
      placed.max[0] += shift;
    }
    b.pos = V.add(b.pos, delta);
    return b;
  };
  M.rotationDrag = (start, delta, shift, snap) =>
    shift
      ? Math.round((start + delta) / 30) * 30
      : start + (snap ? Math.round(delta / 5) * 5 : delta);
  M.translate = (p, v) => Array.from(p, (x, i) => x + v[i % 3]);
  M.scaleMesh = (p, s) => Array.from(p, (x, i) => x * s[i % 3]);
})(window.MP);
