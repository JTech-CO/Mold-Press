(function (M) {
  'use strict';
  const V = M.V;
  M.validate = (p) => {
    if (
      !p ||
      p.version !== 1 ||
      !Array.isArray(p.bodies) ||
      !Array.isArray(p.tray) ||
      !Array.isArray(p.assembly)
    )
      throw Error('Invalid Mold Press project / 올바른 프로젝트 JSON이 아닙니다.');
    if (p.bodies.length > 80 || p.tray.length > 120 || p.assembly.length > 120)
      throw Error('Project capacity exceeded.');
    if (typeof p.id !== 'string' || typeof p.name !== 'string')
      throw Error('Invalid project identity.');
    if (!Object.hasOwn(M.materials, p.material)) p.material = 'ABS';
    for (const list of [p.bodies, p.assembly, p.tray]) {
      const ids = new Set();
      for (const item of list) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id))
          throw Error('Missing or duplicate object ID / 중복되거나 없는 개체 ID입니다.');
        ids.add(item.id);
      }
    }
    let total = 0;
    const check = (b) => {
      if (
        !b ||
        typeof b.id !== 'string' ||
        typeof b.name !== 'string' ||
        typeof b.geo !== 'string' ||
        b.geo.length > 12000000
      )
        throw Error('Invalid body.');
      const g = M.unpack(b.geo);
      total += g.length;
      if (g.length % 9 || g.length < 9 || g.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e6))
        throw Error('Invalid mesh coordinates.');
      for (const k of ['pos', 'rot', 'scale'])
        if (
          !Array.isArray(b[k]) ||
          b[k].length !== 3 ||
          b[k].some((x) => !Number.isFinite(x) || Math.abs(x) > 1e6)
        )
          throw Error('Invalid transform.');
      if (b.scale.some((x) => x <= 0)) throw Error('Scale must be positive.');
      if (!Object.hasOwn(M.materials, b.material)) b.material = 'ABS';
      b.visible = b.visible !== false;
      if (b.tool != null) {
        const t = b.tool;
        if (
          typeof t !== 'object' ||
          !['X', 'Y', 'Z'].includes(t.axis) ||
          !Number.isFinite(t.position) ||
          Math.abs(t.position) > 1e6 ||
          (t.pins != null && (!Number.isInteger(t.pins) || t.pins < 0 || t.pins > 4))
        )
          throw Error('Invalid mold settings / 금형 설정이 올바르지 않습니다.');
      }
    };
    p.bodies.forEach(check);
    p.tray.forEach((t) => {
      if (!t || !t.part) throw Error('Invalid tray.');
      check(t.part);
      t.material = t.part.material;
    });
    p.assembly.forEach(check);
    if (total > 1800000) throw Error('Project triangle limit exceeded.');
    if (
      !p.parting ||
      !['X', 'Y', 'Z'].includes(p.parting.axis) ||
      !Number.isFinite(p.parting.position)
    )
      p.parting = { axis: 'Z', position: 0 };
    return p;
  };
})(window.MP);
