(function (M) {
  'use strict';
  const V = M.V,
    A = M.Mate;
  const { E, clamp, copy, fail, Q, solveLinear, least, smallestEigen } = M.MateMath;
  A.types = [
    ['coincident', '일치 · 면 맞붙임', 'Coincident'],
    ['concentric', '동심 · 같은 축', 'Concentric'],
    ['parallel', '평행', 'Parallel'],
    ['perpendicular', '수직', 'Perpendicular'],
    ['distance', '거리', 'Distance'],
    ['angle', '각도', 'Angle'],
    ['tangent', '접선', 'Tangent'],
    ['lock', '상대 위치 잠금', 'Lock']
  ];
  function desiredNormal(n, ref, theta) {
    let t = V.sub(n, V.mul(ref, V.dot(n, ref)));
    if (V.len(t) < 1e-6) t = V.cross(ref, Math.abs(ref[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
    return V.add(V.mul(ref, Math.cos(theta)), V.mul(V.unit(t), Math.sin(theta)));
  }
  function orient(b, from, to, pivot) {
    if (V.dot(from, to) < 1 - 1e-12) A.rotateBody(b, Q.fromTo(from, to), pivot);
  }
  A.project = (bodies, m) => {
    const a = bodies.find((b) => b.id === m.reference.bodyId),
      b = bodies.find((b) => b.id === m.moving.bodyId);
    if (!a || !b) fail('Mate 부품이 없습니다.', 'Mate component is missing.');
    let r = A.world(a, m.reference),
      s = A.world(b, m.moving),
      type = m.type;
    const aligned = m.alignment === 'aligned' ? 1 : -1;
    if (type === 'lock') {
      b.rot = Q.angles(Q.mul(Q.euler(a.rot), m.relative.q));
      b.pos = V.add(a.pos, M.rotate(m.relative.pos, a.rot));
      return;
    }
    if (['coincident', 'distance', 'parallel', 'perpendicular', 'angle'].includes(type)) {
      if (r.kind !== 'plane' || s.kind !== 'plane')
        fail('이 Mate에는 평면 두 개가 필요합니다.', 'This mate requires two planar faces.');
      const theta =
        type === 'perpendicular'
          ? Math.PI / 2
          : type === 'angle'
            ? (m.value * Math.PI) / 180
            : aligned === 1
              ? 0
              : Math.PI;
      orient(b, s.normal, desiredNormal(s.normal, r.normal, theta), s.point);
      s = A.world(b, m.moving);
      if (type === 'coincident' || type === 'distance') {
        const target = type === 'distance' ? m.value : 0,
          delta = target - V.dot(V.sub(s.point, r.point), r.normal);
        b.pos = V.add(b.pos, V.mul(r.normal, delta));
      }
    } else if (type === 'concentric') {
      if (!r.axis || !s.axis)
        fail(
          '동심 Mate에는 원통 또는 원형 면 두 개가 필요합니다.',
          'Concentric mate needs cylindrical or circular faces.'
        );
      orient(b, s.axis, V.mul(r.axis, m.alignment === 'opposed' ? -1 : 1), s.point);
      s = A.world(b, m.moving);
      const d = V.sub(r.point, s.point);
      b.pos = V.add(b.pos, V.sub(d, V.mul(r.axis, V.dot(d, r.axis))));
    } else if (type === 'tangent') {
      if (r.kind === 'plane' && s.kind === 'cylinder') {
        let tangent = V.sub(s.axis, V.mul(r.normal, V.dot(s.axis, r.normal)));
        if (V.len(tangent) < 1e-6)
          tangent = V.cross(r.normal, Math.abs(r.normal[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
        orient(b, s.axis, V.unit(tangent), s.point);
        s = A.world(b, m.moving);
        const side = m.flip ? -1 : 1;
        b.pos = V.add(
          b.pos,
          V.mul(r.normal, side * s.radius - V.dot(V.sub(s.point, r.point), r.normal))
        );
      } else if (r.kind === 'cylinder' && s.kind === 'plane') {
        let n = V.sub(s.normal, V.mul(r.axis, V.dot(s.normal, r.axis)));
        if (V.len(n) < 1e-6) n = V.cross(r.axis, Math.abs(r.axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
        orient(b, s.normal, V.unit(n), s.point);
        s = A.world(b, m.moving);
        b.pos = V.add(
          b.pos,
          V.mul(s.normal, (m.flip ? -1 : 1) * r.radius - V.dot(V.sub(s.point, r.point), s.normal))
        );
      } else if (r.kind === 'cylinder' && s.kind === 'cylinder') {
        orient(b, s.axis, r.axis, s.point);
        s = A.world(b, m.moving);
        let d = V.sub(s.point, r.point);
        const axial = V.mul(r.axis, V.dot(d, r.axis));
        d = V.sub(d, axial);
        if (V.len(d) < 1e-6) d = V.cross(r.axis, Math.abs(r.axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
        const radius = m.flip ? Math.abs(r.radius - s.radius) : r.radius + s.radius;
        b.pos = V.add(
          b.pos,
          V.sub(V.add(r.point, V.add(axial, V.mul(V.unit(d), radius))), s.point)
        );
      } else
        fail(
          '접선 Mate는 평면-원통 또는 원통-원통을 지원합니다.',
          'Tangent mate supports plane-cylinder and cylinder-cylinder.'
        );
    } else fail('알 수 없는 Mate 유형입니다.', 'Unknown mate type.');
  };
  A.residual = (bodies, m) => {
    const b = bodies.find((b) => b.id === m.moving.bodyId),
      probe = bodies.map((x) => ({
        ...x,
        pos: x.pos.slice(),
        rot: x.rot.slice(),
        scale: x.scale.slice()
      }));
    A.project(probe, m);
    const q = probe.find((x) => x.id === b.id),
      dotq = Math.abs(Q.euler(b.rot).reduce((n, x, i) => n + x * Q.euler(q.rot)[i], 0));
    return {
      distance: V.len(V.sub(q.pos, b.pos)),
      angle: (2 * Math.acos(clamp(dotq)) * 180) / Math.PI
    };
  };
  A.graph = (mates) => {
    const graph = new Map();
    for (const m of mates.filter((m) => m.enabled !== false)) {
      const a = m.reference.bodyId,
        b = m.moving.bodyId;
      if (a === b) fail('서로 다른 부품을 선택하세요.', 'Select two different components.');
      const next = graph.get(a) || new Set();
      next.add(b);
      graph.set(a, next);
    }
    const visiting = new Set(),
      done = new Set();
    function visit(id) {
      if (visiting.has(id))
        fail(
          '순환 Mate입니다. 기준 방향을 통일하거나 기존 Mate를 해제하세요.',
          'Cyclic mate: use a consistent reference direction or suppress an existing mate.'
        );
      if (done.has(id)) return;
      visiting.add(id);
      for (const b of graph.get(id) || []) visit(b);
      visiting.delete(id);
      done.add(id);
    }
    for (const id of graph.keys()) visit(id);
  };
  A.solve = (project) => {
    const mates = (project.mates || []).filter((m) => m.enabled !== false);
    if (!mates.length) return project;
    if (mates.length > 64) fail('Mate는 최대 64개입니다.', 'Maximum 64 mates.');
    A.graph(mates);
    for (const m of mates)
      for (const r of [m.reference, m.moving]) {
        const b = project.assembly.find((b) => b.id === r.bodyId);
        if (!b) fail('삭제된 부품을 참조하는 Mate입니다.', 'Mate references a removed part.');
        if (r.signature !== A.signature(b.geo))
          fail(
            'Mate 면이 변경되었습니다. 해당 Mate를 해제하고 다시 선택하세요.',
            'Mate face changed; suppress it and reselect.'
          );
      }
    let residual = [];
    for (let i = 0; i < 48; i++) {
      for (const m of mates) A.project(project.assembly, m);
      residual = mates.map((m) => A.residual(project.assembly, m));
      if (residual.every((r) => r.distance < 0.0005 && r.angle < 0.005)) {
        project.mateStatus = {
          solved: true,
          maxDistance: Math.max(...residual.map((r) => r.distance)),
          maxAngle: Math.max(...residual.map((r) => r.angle))
        };
        return project;
      }
    }
    fail(
      'Mate 구속이 서로 충돌합니다. 원본은 유지됩니다. 거리/각도 또는 기존 Mate를 확인하세요.',
      'Conflicting mates; source preserved. Check distance, angle, or existing mates.'
    );
  };
  A.add = (project, reference, moving, options = {}) => {
    const p = copy(project),
      m = {
        id: M.uid(),
        type: options.type || 'coincident',
        reference: copy(reference),
        moving: copy(moving),
        value: Number(options.value || 0),
        alignment: options.alignment || 'opposed',
        flip: !!options.flip,
        enabled: true
      };
    p.mates = p.mates || [];
    if (reference.bodyId === moving.bodyId)
      fail('같은 부품이 아닌 두 부품의 면을 선택하세요.', 'Select faces on two different parts.');
    if (
      !Number.isFinite(m.value) ||
      Math.abs(m.value) > 10000 ||
      (m.type === 'angle' && (m.value < 0 || m.value > 180))
    )
      fail('Mate 수치가 범위를 벗어났습니다.', 'Invalid mate value.');
    const a = p.assembly.find((b) => b.id === reference.bodyId),
      b = p.assembly.find((b) => b.id === moving.bodyId);
    if (!a || !b) fail('부품이 없습니다.', 'Component missing.');
    if (m.type === 'lock')
      m.relative = {
        q: Q.mul(Q.inv(Q.euler(a.rot)), Q.euler(b.rot)),
        pos: M.inverseRotate(V.sub(b.pos, a.pos), a.rot)
      };
    if (options.center && m.type === 'coincident') {
      A.project(p.assembly, m);
      const r = A.world(a, reference),
        s = A.world(b, moving),
        d = V.sub(r.point, s.point);
      b.pos = V.add(b.pos, V.sub(d, V.mul(r.normal, V.dot(d, r.normal))));
    }
    p.mates.push(m);
    A.solve(p);
    b.mate = { targetId: a.id, normal: reference.normal.slice() };
    return p;
  };
  A.clean = (project) => {
    const ids = new Set(project.assembly.map((b) => b.id));
    project.mates = (project.mates || []).filter(
      (m) => ids.has(m.reference.bodyId) && ids.has(m.moving.bodyId)
    );
    return project;
  };
})(window.MP);
