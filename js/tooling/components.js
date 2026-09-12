(function (M) {
  'use strict';
  const V = M.V;
  // Closed annular sleeve; cyclic coordinates preserve winding on every parting axis.
  M.sleeve = (center, axis, length, outer, inner, n = 20) => {
    const mesh = [],
      a = (axis + 1) % 3,
      b = (axis + 2) % 3;
    const point = (r, angle, z) => {
      const p = center.slice();
      p[a] += r * Math.cos(angle);
      p[b] += r * Math.sin(angle);
      p[axis] += z;
      return p;
    };
    const quad = (a, b, c, d) => {
      M.Geometry.tri(mesh, a, b, c);
      M.Geometry.tri(mesh, a, c, d);
    };
    for (let i = 0; i < n; i++) {
      const x = (i * Math.PI * 2) / n,
        y = ((i + 1) * Math.PI * 2) / n,
        z = length / 2;
      const A = point(outer, x, -z),
        B = point(outer, y, -z),
        C = point(outer, y, z),
        D = point(outer, x, z);
      const E = point(inner, x, -z),
        F = point(inner, y, -z),
        G = point(inner, y, z),
        H = point(inner, x, z);
      quad(A, B, C, D);
      quad(F, E, H, G);
      quad(D, C, G, H);
      quad(B, A, E, F);
    }
    return mesh;
  };
  M.toolComponents = (lo, hi, mid, k, at, pins) => {
    const rec = [],
      lateral = [0, 1, 2].filter((i) => i !== k),
      [a, d] = lateral;
    for (const sa of [-1, 1])
      for (const sd of [-1, 1]) {
        const p = mid.slice();
        p[a] = sa < 0 ? lo[a] - 5 : hi[a] + 5;
        p[d] = sd < 0 ? lo[d] + 5 : hi[d] - 5;
        const start = p.slice(),
          end = p.slice();
        start[k] = lo[k] - 2;
        end[k] = hi[k] + 10;
        rec.push(
          M.record('guide-post' + sa + sd, M.link(start, end, 2.2, 20), '#b9c8d0', {
            role: 'lowerGuide',
            metal: 0.85,
            rough: 0.2
          })
        );
        const center = p.slice();
        center[k] = (at + hi[k]) / 2;
        rec.push(
          M.record('guide-bush' + sa + sd, M.sleeve(center, k, hi[k] - at, 3.6, 2.35), '#ae8a51', {
            role: 'upperGuide',
            metal: 0.7,
            rough: 0.3
          })
        );
        for (const upper of [false, true]) {
          const size = [8, 8, 8],
            q = p.slice();
          size[a] = 10;
          size[k] = 3;
          q[a] -= sa * 3;
          q[k] = upper ? hi[k] - 2 : lo[k] + 2;
          rec.push(
            M.record('guide-mount' + sa + sd + upper, M.translate(M.box(...size), q), '#647683', {
              role: upper ? 'upperGuide' : 'lowerGuide',
              metal: 0.65
            })
          );
        }
      }
    if (pins) {
      const size = V.sub(hi, lo).map((x) => Math.max(8, x - 20)),
        center = mid.slice();
      size[k] = 6;
      center[k] = lo[k] - 12;
      rec.push(
        M.record('pin-plate', M.translate(M.box(...size), center), '#6a7884', {
          role: 'pin',
          metal: 0.75,
          rough: 0.32
        })
      );
    }
    for (const sign of [-1, 1])
      for (const side of [-1, 1]) {
        const port = mid.slice();
        port[k] = sign < 0 ? lo[k] + 6 : hi[k] - 6;
        port[a] = lo[a] - 5;
        port[d] = side < 0 ? lo[d] + 5 : hi[d] - 5;
        const center = port.slice();
        center[a] -= 3;
        const role = sign > 0 ? 'upperPipe' : 'lowerPipe';
        rec.push(
          M.record('cool-coupler' + sign + side, M.sleeve(center, a, 6, 2.4, 1.3, 16), '#bf9859', {
            role,
            metal: 0.75
          })
        );
        const bend = port.slice(),
          end = port.slice();
        bend[a] -= 14;
        end[a] -= 14;
        end[d] += side * 12;
        rec.push(
          M.record(
            'cool-hose' + sign + side,
            [
              ...M.link(
                V.add(
                  port,
                  V.mul(
                    [0, 0, 0].map((_, i) => (i === a ? 1 : 0)),
                    -6
                  )
                ),
                bend,
                1.7,
                12
              ),
              ...M.link(bend, end, 1.7, 12)
            ],
            side < 0 ? '#357887' : '#a35f4d',
            { role, metal: 0.1, rough: 0.85 }
          )
        );
      }
    return rec;
  };
  M.componentLabels = [
    ['cavity', '캐비티', 'Cavity'],
    ['core', '코어', 'Core'],
    ['guide-bush', '가이드 부시', 'Guide bush'],
    ['pin-plate', '취출판', 'Ejector plate'],
    ['cool-coupler', '냉각 커플러', 'Cooling coupler'],
    ['machine-nozzle', '사출 노즐', 'Injection nozzle'],
    ['machine-hydraulic-cylinder', '유압 실린더', 'Hydraulic cylinder']
  ];
})(window.MP);
