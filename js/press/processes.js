(function (M) {
  'use strict';
  M.processes = {
    injection: {
      name: ['수지 사출', 'Resin injection'],
      stages: [
        ['형폐', '충전', '보압·냉각', '형개', '취출'],
        ['Close', 'Fill', 'Pack / cool', 'Open', 'Eject']
      ],
      heat: 0.06
    },
    compression: {
      name: ['압축 성형', 'Compression forming'],
      stages: [
        ['형폐', '압축', '유지', '형개', '취출'],
        ['Close', 'Compress', 'Hold', 'Open', 'Eject']
      ],
      heat: 0.12
    },
    casting: {
      name: ['금속 주조', 'Metal casting'],
      stages: [
        ['형폐', '주입', '응고', '형개', '취출'],
        ['Close', 'Inject', 'Solidify', 'Open', 'Eject']
      ],
      heat: 0.3
    }
  };
  M.processFor = (material) => M.materials[material]?.process || 'injection';
  M.processProfile = (material) => M.processes[M.processFor(material)];
  const fillCache = new Map();
  M.formingGeometry = (geo, axis, progress) => {
    if (progress <= 0 || progress >= 1) return geo;
    const step = Math.max(1, Math.min(19, Math.ceil(progress * 20)));
    const key = JSON.stringify([geo, axis, step]);
    if (!fillCache.has(key)) {
      const p = M.unpack(geo),
        bb = M.bounds(p);
      try {
        const at = bb.max[axis] - (bb.size[axis] * step) / 20;
        fillCache.set(key, M.pack(M.splitMesh(p, 'XYZ'[axis], at)[1]));
      } catch {
        // Imported open meshes use the existing fade instead of blocking production.
        fillCache.set(key, geo);
      }
      if (fillCache.size > 48) fillCache.delete(fillCache.keys().next().value);
    }
    return fillCache.get(key);
  };
  M.processCharge = (machine, thickness) => {
    if (machine.process === 'compression') return M.box(machine.blankW, machine.blankD, thickness);
    if (machine.process === 'casting') return M.cylinder(11, 4, 24);
    const pellets = [];
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4,
        r = 2 + Math.sqrt(i) * 1.3;
      pellets.push(
        ...M.translate(M.sphere(1.35, 8, 4), [Math.cos(a) * r, Math.sin(a) * r, (i % 3) * 2])
      );
    }
    return pellets;
  };
})(window.MP);
