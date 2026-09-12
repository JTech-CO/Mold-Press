(function (M) {
  'use strict';
  const V = M.V;
  M.machine = (t, process = 'injection') => {
    const dims =
        t.k === 2
          ? t.bb.size
          : t.k === 0
            ? [t.bb.size[1], t.bb.size[2], t.bb.size[0]]
            : [t.bb.size[2], t.bb.size[0], t.bb.size[1]],
      w = Math.max(106, dims[0] + 62),
      d = Math.max(90, dims[1] + 52),
      moldH = dims[2] + 24,
      datum = 46 + moldH / 2,
      moldTop = 46 + moldH,
      openGap = Math.max(45, dims[2] + 12),
      crown = moldTop + openGap + 54,
      partingZ = datum + (t.at ?? t.bb.center[t.k]) - t.bb.center[t.k],
      r = [];
    const box = (id, size, pos, c, extra = {}) =>
      r.push(M.record(id, M.translate(M.box(...size), pos), c, extra));
    box('machine-bed', [w + 34, d + 90, 18], [0, 12, 0], '#303a43');
    box('machine-fixed-platen', [w, d, 14], [0, 0, 23], '#626f79', { metal: 0.65 });
    for (const sign of [-1, 1])
      box(
        'machine-spacer-' + sign,
        [6, dims[1] + 24, 16],
        [sign * (dims[0] / 2 + 8), 0, 38],
        '#536571',
        { metal: 0.7 }
      );
    box('machine-crown', [w + 14, d + 14, 20], [0, 0, crown], '#55616b');
    box('machine-crown-accent', [w + 15, 3, 7], [0, -d / 2 - 8, crown], '#cc923f', { metal: 0.1 });
    for (const x of [-1, 1])
      for (const y of [-1, 1]) {
        const a = [x * (w / 2 - 8), y * (d / 2 - 8), 9],
          b = [a[0], a[1], crown - 9];
        r.push(
          M.record('machine-tie-' + x + '-' + y, M.link(a, b, 3.8, 16), '#b6c5d0', {
            metal: 0.85,
            rough: 0.2
          })
        );
        box('machine-foot-' + x + '-' + y, [16, 16, 10], [a[0], a[1], 13], '#475663');
      }
    r.push(
      M.record(
        'machine-hydraulic-cylinder',
        M.translate(M.cylinder(14, 30, 24), [0, 0, crown + 13]),
        '#52616d',
        { metal: 0.65 }
      )
    );
    // Feed table is level with the parting plane. The blank enters between the tie bars.
    const blankW = Math.max(14, dims[0] * 1.13),
      blankD = Math.max(14, dims[1] * 1.13),
      feedX = -w / 2 - blankW / 2 - 28;
    const feedZ = partingZ + 3;
    box('machine-feed-table', [blankW + 38, blankD + 16, 4], [feedX, 0, partingZ], '#68727b', {
      metal: 0.65
    });
    for (const sign of [-1, 1])
      box(
        'machine-feed-leg-' + sign,
        [7, 7, Math.max(12, partingZ - 10)],
        [feedX + sign * (blankW / 2), 0, (partingZ - 10) / 2 + 8],
        '#374550'
      );
    for (let i = 0; i < 4; i++)
      r.push(
        M.record(
          'machine-feed-roller-' + i,
          M.link(
            [feedX - blankW / 2 + (i * blankW) / 3, -blankD / 2, partingZ + 3],
            [feedX - blankW / 2 + (i * blankW) / 3, blankD / 2, partingZ + 3],
            1.5
          ),
          '#9aaebc',
          { metal: 0.75 }
        )
      );
    r.push(
      M.record(
        'machine-barrel',
        M.link([0, d / 2 + 5, datum], [0, d / 2 + 75, datum], 7, 20),
        '#7d8b96',
        { metal: 0.7 }
      )
    );
    for (let i = 0; i < 4; i++)
      r.push(
        M.record(
          'machine-heater-' + i,
          M.link([0, d / 2 + 15 + i * 13, datum], [0, d / 2 + 19 + i * 13, datum], 7.6),
          '#bc843d'
        )
      );
    box('machine-injection-drive', [27, 25, 27], [0, d / 2 + 88, datum], '#3d4c57');
    r.push(
      M.record(
        'machine-hopper',
        M.translate(
          M.csg(
            M.cylinder(5, 28, 24, 18),
            M.translate(M.cylinder(3, 30, 24, 16), [0, 0, 1]),
            'subtract'
          ),
          [0, d / 2 + 68, datum + 38]
        ),
        '#b8c6cd',
        { metal: 0.72, rough: 0.23 }
      )
    );
    r.push(
      M.record(
        'machine-hopper-neck',
        M.link([0, d / 2 + 68, datum + 6], [0, d / 2 + 68, datum + 25], 4),
        '#8b9ca8'
      )
    );
    const tray = [w / 2 + 59, 0, 12];
    box('machine-tray-surface', [82, 76, 4], [tray[0], 0, 7], '#596974');
    box('machine-tray-foot', [62, 52, 10], [tray[0], 0, 0], '#303e48');
    box('machine-control-cabinet', [28, 20, 36], [w / 2 + 18, d / 2 + 4, 29], '#36434d');
    box('machine-control-screen', [16, 2, 12], [w / 2 + 18, d / 2 - 7, 36], '#739d92', {
      metal: 0
    });
    for (const x of [-1, 1])
      for (const y of [-1, 1]) {
        const p = [x * (w / 2 - 8), y * (d / 2 - 8), crown + 11];
        r.push(
          M.record(
            'machine-washer-' + x + '-' + y,
            M.translate(M.cylinder(6, 1.2, 20), p),
            '#7c8d99',
            { metal: 0.8, rough: 0.25 }
          )
        );
        r.push(
          M.record(
            'machine-bolt-' + x + '-' + y,
            M.translate(M.cylinder(4.5, 3.6, 6), V.add(p, [0, 0, 2])),
            '#bac6ce',
            { metal: 0.85, rough: 0.22 }
          )
        );
      }
    for (let i = 0; i < 6; i++)
      box(
        'machine-cabinet-vent-' + i,
        [16, 0.5, 0.65],
        [w / 2 + 18, d / 2 - 6.3, 16 + i * 1.8],
        '#17232d',
        { metal: 0.2 }
      );
    r.push(
      M.record(
        'machine-stop-button',
        M.link([w / 2 + 24, d / 2 - 6, 27], [w / 2 + 24, d / 2 - 9, 27], 2.3, 16),
        '#d85a4c',
        { metal: 0, rough: 0.4 }
      )
    );
    for (let i = 0; i < 3; i++)
      box(
        'machine-screen-readout-' + i,
        [10 - i * 2, 0.4, 0.6],
        [w / 2 + 18, d / 2 - 8.2, 33 + i * 2.5],
        '#bce6d3',
        { metal: 0 }
      );
    const records = r.filter((item) => {
      if (process !== 'compression' && item.id.startsWith('machine-feed-')) return false;
      if (process === 'compression' && /barrel|heater|injection-drive|hopper/.test(item.id))
        return false;
      if (process === 'casting' && /hopper|heater/.test(item.id)) return false;
      return true;
    });
    const charge =
      process === 'compression'
        ? [feedX, 0, feedZ]
        : [0, d / 2 + 68, datum + (process === 'casting' ? 7 : 42)];
    if (process === 'casting') {
      records.push(
        M.record(
          'machine-melt-reservoir',
          M.translate(M.cylinder(17, 22, 24), [0, d / 2 + 68, datum - 6]),
          '#47515c',
          { metal: 0.7, rough: 0.45 }
        )
      );
      records.push(
        M.record(
          'machine-reservoir-rim',
          M.translate(M.torus(16, 2, 24, 6), [0, d / 2 + 68, datum + 6]),
          '#acb3b9',
          { metal: 0.75 }
        )
      );
      records.push(
        M.record(
          'machine-reservoir-base',
          M.translate(M.box(42, 42, 10), [0, d / 2 + 68, datum - 22]),
          '#36414c'
        )
      );
    }
    const gateAxis = t.k === 1 ? 0 : 1;
    const gate = [0, 0, partingZ];
    gate[gateAxis] = dims[gateAxis] / 2;
    const gateOut = gate.slice();
    gateOut[gateAxis] += 27;
    const feedPath = [[0, d / 2 + 48, datum], [0, d / 2 + 5, datum], gateOut, gate];
    if (process !== 'compression') {
      for (let i = 2; i < feedPath.length; i++)
        records.push(
          M.record(
            'machine-nozzle-' + i,
            M.link(feedPath[i - 1], feedPath[i], 3.1, 16),
            '#a5b3bc',
            { metal: 0.8, rough: 0.22 }
          )
        );
    }
    return {
      records,
      process,
      charge,
      chargeEnd: process === 'compression' ? [0, 0, partingZ + 3] : [0, d / 2 + 68, datum + 8],
      fillAxis: t.k === 1 ? 0 : 1,
      feedPath,
      tray,
      w,
      d,
      dims,
      datum,
      moldTop,
      openGap,
      crown,
      partingZ,
      blankW,
      blankD,
      feed: [feedX, 0, feedZ]
    };
  };
  M.movingMachine = (machine, gap, cutaway = false) => {
    const z = machine.moldTop + gap + 7,
      top = machine.crown - 12,
      rodBottom = z + 7;
    return [
      M.record('machine-moving-platen', M.box(machine.w, machine.d, 14), '#8b744f', {
        pos: [0, 0, z],
        metal: 0.5,
        rough: 0.35,
        alpha: cutaway ? 0.38 : 1
      }),
      M.record('machine-piston', M.cylinder(7, 1, 20), '#c1cdd3', {
        pos: [0, 0, (rodBottom + top) / 2],
        scale: [1, 1, Math.max(0.1, top - rodBottom)],
        metal: 0.85,
        rough: 0.16
      })
    ];
  };
})(window.MP);
