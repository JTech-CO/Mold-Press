(function (M) {
  'use strict';
  const baseValidate = M.validate,
    baseProject = M.newProject;
  M.newProject = (...args) =>
    Object.assign(baseProject(...args), { sketches: [], features: [], mates: [] });
  M.validate = (p) => {
    baseValidate(p);
    for (const key of ['sketches', 'features', 'mates']) {
      if (p[key] == null) p[key] = [];
      if (!Array.isArray(p[key])) throw Error('Invalid CAD records: ' + key);
    }
    if (p.sketches.length > 80 || p.features.length > 100 || p.mates.length > 64)
      throw Error('CAD record capacity exceeded.');
    const finite = (a) =>
      Array.isArray(a) &&
      a.length === 2 &&
      a.every((v) => Number.isFinite(v) && Math.abs(v) < 100000);
    for (const sk of p.sketches) {
      if (
        !sk ||
        typeof sk.id !== 'string' ||
        !['XY', 'XZ', 'YZ'].includes(sk.plane) ||
        !Number.isFinite(sk.offset) ||
        Math.abs(sk.offset) > 10000 ||
        !Array.isArray(sk.entities) ||
        sk.entities.length > 250
      )
        throw Error('Invalid sketch.');
      for (const e of sk.entities) {
        if (
          !e ||
          typeof e.id !== 'string' ||
          ![
            'line',
            'point',
            'rectangle',
            'polyline',
            'polygon',
            'circle',
            'ellipse',
            'arc',
            'bezier'
          ].includes(e.type)
        )
          throw Error('Invalid sketch entity.');
        if (
          (e.point && !finite(e.point)) ||
          (e.center && !finite(e.center)) ||
          (e.points &&
            (!Array.isArray(e.points) ||
              e.points.length > 1000 ||
              e.points.some((v) => !finite(v))))
        )
          throw Error('Invalid sketch coordinates.');
        for (const key of ['radius', 'rx', 'ry', 'start', 'sweep', 'sides', 'angle'])
          if (e[key] != null && (!Number.isFinite(e[key]) || Math.abs(e[key]) > 100000))
            throw Error('Invalid sketch parameter.');
      }
    }
    for (const f of p.features) {
      if (
        !f ||
        typeof f.id !== 'string' ||
        !['extrude', 'cut', 'revolve', 'sweep', 'loft'].includes(f.type) ||
        !['new', 'join', 'cut'].includes(f.operation) ||
        typeof f.outputId !== 'string'
      )
        throw Error('Invalid solid feature.');
      if (f.baseBody) {
        const b = f.baseBody;
        if (
          typeof b.geo !== 'string' ||
          b.geo.length > 12000000 ||
          M.unpack(b.geo).some((x) => !Number.isFinite(x))
        )
          throw Error('Invalid feature base mesh.');
      }
    }
    for (const mate of p.mates) {
      if (
        !mate ||
        !M.Mate.types.some((t) => t[0] === mate.type) ||
        !Number.isFinite(mate.value) ||
        Math.abs(mate.value) > 10000
      )
        throw Error('Invalid mate.');
      for (const r of [mate.reference, mate.moving]) {
        if (
          !r ||
          typeof r.bodyId !== 'string' ||
          !['plane', 'cylinder'].includes(r.kind) ||
          !Array.isArray(r.point) ||
          r.point.length !== 3 ||
          !Array.isArray(r.normal) ||
          r.normal.length !== 3 ||
          [...r.point, ...r.normal].some((v) => !Number.isFinite(v))
        )
          throw Error('Invalid mate reference.');
      }
    }
    M.Mate.clean(p);
    M.Mate.solve(p);
    return p;
  };
})(window.MP);
