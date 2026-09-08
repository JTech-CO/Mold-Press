(function (M) {
  'use strict';
  const V = M.V,
    S = M.Sketch;
  const { TAU, eps, clone, sub, add, mul, dot, cross, len, unit, err } = M.SketchMath;
  const { triangle } = M.SketchMath;
  S.featureMesh = (project, f) => {
    const get = (id) => {
        const s = project.sketches.find((x) => x.id === id);
        if (!s) err('피처에서 사용하는 스케치가 없습니다.', 'A referenced sketch is missing.');
        return s;
      },
      s = get(f.sketchId);
    if (f.type === 'extrude' || f.type === 'cut') {
      let depth = f.depth;
      if (f.through && f.targetId) {
        const b = project.bodies.find((x) => x.id === f.targetId);
        if (!b) err('절삭할 바디를 선택하세요.', 'Select the body to cut.');
        const frame = S.frame(s),
          wp = M.world(b),
          d = [];
        for (let i = 0; i < wp.length; i += 3)
          d.push(V.dot(V.sub(wp.slice(i, i + 3), frame.origin), frame.n));
        const size = Math.max(Math.abs(Math.min(...d)), Math.abs(Math.max(...d))) + 2;
        return S.extrude(s, size * 2, true);
      }
      return S.extrude(s, depth, !!f.symmetric);
    }
    if (f.type === 'revolve')
      return S.revolve(
        s,
        f.axis,
        f.angle,
        s.entities.find((e) => e.id === f.axisEntity)
      );
    if (f.type === 'sweep') return S.sweep(s, get(f.pathId), f.pathEntity);
    if (f.type === 'loft') return S.loft((f.sections || []).map(get));
    err('알 수 없는 피처입니다.', 'Unknown feature.');
  };
  S.rebuild = (project, resetIds = []) => {
    const result = new Map(),
      active = new Set(project.bodies.map((b) => b.id));
    for (const f of project.features || []) {
      if (!active.has(f.outputId)) continue;
      let base = null;
      if (f.operation !== 'new') {
        base = clone(result.get(f.targetId) || f.baseBody || null);
        if (result.has(f.targetId) && f.baseTransform) {
          base.pos = V.add(base.pos, f.baseTransform.delta);
          base.rot = f.baseTransform.rot.slice();
          base.scale = f.baseTransform.scale.slice();
        }
        if (!base) err('기준 바디를 찾을 수 없습니다.', 'Target body is missing.');
      }
      // Through-all extent follows the rebuilt upstream solid, not the previous displayed result.
      const inputs = base
        ? { ...project, bodies: project.bodies.map((b) => (b.id === f.targetId ? base : b)) }
        : project;
      let mesh = S.featureMesh(inputs, f);
      if (base) {
        const prior = M.world(base),
          v = M.volume(prior);
        mesh = M.csg(prior, mesh, f.operation === 'cut' ? 'subtract' : 'union');
        if (!mesh.length || M.volume(mesh) < 1e-6)
          err('피처가 바디 전체를 제거합니다.', 'Feature would remove the entire body.');
        if (f.operation === 'cut' && Math.abs(M.volume(mesh) - v) < 1e-5)
          err('절삭이 바디와 만나지 않습니다.', 'Cut does not intersect the body.');
      }
      mesh = S.checkSolid(mesh);
      const body = M.body(f.name || f.type, mesh, {
        id: f.outputId,
        material: project.material,
        primitive: 'sketch-feature',
        featureId: f.id
      });
      result.set(f.outputId, body);
    }
    for (const [id, b] of result) {
      const old = project.bodies.find((x) => x.id === id);
      if (!old) continue;
      const reset = resetIds.includes(id),
        delta = !reset && old.featureCenter ? V.sub(old.pos, old.featureCenter) : [0, 0, 0];
      b.featureCenter = b.pos.slice();
      b.pos = V.add(b.pos, delta);
      b.rot = reset ? [0, 0, 0] : old.rot.slice();
      b.scale = reset ? [1, 1, 1] : old.scale.slice();
      b.name = old.name;
      b.material = old.material;
      b.visible = old.visible;
      b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
      project.bodies[project.bodies.indexOf(old)] = b;
    }
    return project;
  };
})(window.MP);
