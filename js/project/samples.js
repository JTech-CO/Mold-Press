(function (M) {
  'use strict';
  const V = M.V;
  M.newProject = (kind = 'earbuds') => {
    const p = {
      version: 1,
      id: M.uid(),
      name:
        kind === 'earbuds'
          ? '무선이어폰 케이스'
          : kind === 'drone'
            ? '드론 암'
            : kind === 'grip'
              ? '카메라 핸드그립'
              : '새 프로젝트',
      sample: kind,
      bodies: [],
      tray: [],
      assembly: [],
      parting: { axis: 'Z', position: 26 },
      material: 'ABS',
      created: new Date().toISOString()
    };
    if (kind === 'earbuds') {
      const outer = M.roundBox(68, 46, 36, 9, 4),
        inner = M.roundBox(63.2, 41.2, 31.2, 6.6, 4);
      const mesh = M.translate(M.csg(outer, inner, 'subtract'), [0, 0, 20]);
      p.bodies = [M.body('케이스 블랭크', mesh, { primitive: 'shell', nominalWall: 2.4 })];
    }
    if (kind === 'drone') {
      let a = M.roundBox(112, 19, 12, 3, 3);
      let end = M.translate(M.cylinder(19, 9, 24), [56, 0, 0]);
      a = M.csg(a, end, 'union');
      for (const v of [
        [56, 0],
        [47, -8],
        [65, -8],
        [47, 8],
        [65, 8]
      ])
        a = M.csg(
          a,
          M.translate(M.cylinder(v[0] === 56 && v[1] === 0 ? 6 : 2, 22, 12), [...v, 0]),
          'subtract'
        );
      p.bodies = [
        M.body('모터 마운트 암', M.translate(a, [0, 0, 15]), { material: 'CF Nylon' }),
        M.body('마운트 클램프', M.translate(M.roundBox(24, 28, 6, 2, 3), [-42, 0, 25]), {
          material: 'CF Nylon'
        })
      ];
      p.material = 'CF Nylon';
      p.parting.position = 15;
    }
    if (kind === 'grip') {
      let a = M.roundBox(31, 37, 90, 11, 4);
      for (let i = 0; i < 3; i++) {
        let cut = M.cylinder(10, 44, 20);
        cut = cut.map((v, j) => (j % 3 === 0 ? v : j % 3 === 1 ? cut[j + 1] : -cut[j - 1]));
        a = M.csg(a, M.translate(cut, [17, -3, -23 + i * 24]), 'subtract');
      }
      p.bodies = [
        M.body('핸드그립', M.translate(a, [0, 0, 49]), { material: 'Nylon' }),
        M.body('카메라 플레이트', M.translate(M.roundBox(66, 46, 8, 3, 3), [10, 0, 98]), {
          material: 'Aluminum 6061'
        })
      ];
      p.material = 'Nylon';
      p.parting.position = 49;
    }
    return p;
  };
})(window.MP);
