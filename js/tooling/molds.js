(function (M) {
  'use strict';
  const V = M.V;
  M.toolCache = new Map();
  M.toolKey = (b, cfg) => b.geo + JSON.stringify([b.pos, b.rot, b.scale, cfg]);
  M.makeTool = (b, config) => {
    const cfg = config ||
      b.tool || { axis: 'Z', position: M.bounds(M.world(b)).center[2], pins: 4 };
    const key = M.toolKey(b, cfg);
    if (M.toolCache.has(key)) return M.toolCache.get(key);
    const p = M.world(b),
      bb = M.bounds(p),
      k = 'XYZ'.indexOf(cfg.axis),
      at = Math.max(bb.min[k] - 0.1, Math.min(bb.max[k] + 0.1, cfg.position));
    const lo = bb.min.map((x) => x - 12),
      hi = bb.max.map((x) => x + 12),
      mid = bb.center.slice(),
      size = V.sub(hi, lo),
      upperSize = size.slice(),
      lowerSize = size.slice(),
      upperPos = mid.slice(),
      lowerPos = mid.slice();
    upperSize[k] = hi[k] - at;
    lowerSize[k] = at - lo[k];
    upperPos[k] = (hi[k] + at) / 2;
    lowerPos[k] = (lo[k] + at) / 2;
    const cavity = M.csg(M.translate(M.box(...upperSize), upperPos), p, 'subtract'),
      core = M.csg(M.translate(M.box(...lowerSize), lowerPos), p, 'subtract');
    const rec = [
      M.record('cavity', cavity, '#66717b', { role: 'upper', alpha: 1, metal: 0.78, rough: 0.3 }),
      M.record('core', core, '#879097', { role: 'lower', alpha: 1, metal: 0.78, rough: 0.28 })
    ];
    const lateral = [0, 1, 2].filter((i) => i !== k),
      a = lateral[0],
      d = lateral[1],
      base = mid.slice();
    base[k] = at;
    const corners = [];
    for (const sa of [-1, 1])
      for (const sd of [-1, 1]) {
        const x = base.slice();
        x[a] += sa * size[a] * 0.31;
        x[d] += sd * size[d] * 0.31;
        corners.push(x);
      }
    for (let i = 0; i < (cfg.pins ?? 4); i++) {
      const start = corners[i].slice(),
        end = start.slice();
      start[k] = lo[k] - 12;
      end[k] = at - 1;
      rec.push(
        M.record('pin' + i, M.link(start, end, 1.45), '#dedfe0', { role: 'pin', metal: 0.85 })
      );
    }
    const gate = mid.slice(),
      gateOut = mid.slice();
    gate[k] = at;
    gateOut[k] = at;
    gate[d] = bb.max[d];
    gateOut[d] = hi[d] + 15;
    rec.push(
      M.record('gate', M.link(gate, gateOut, 1.7), '#e8ad55', { role: 'fixed', metal: 0.2 })
    );
    const runnerEnd = gateOut.slice();
    runnerEnd[a] += size[a] * 0.32;
    rec.push(M.record('runner', M.link(gateOut, runnerEnd, 2.2), '#cc8c36', { role: 'fixed' }));
    for (const sign of [-1, 1]) {
      const z = sign < 0 ? lo[k] + 6 : hi[k] - 6,
        p1 = mid.slice(),
        p2 = mid.slice(),
        p3 = mid.slice(),
        p4 = mid.slice();
      p1[k] = p2[k] = p3[k] = p4[k] = z;
      p1[a] = p4[a] = lo[a] - 5;
      p2[a] = p3[a] = hi[a] + 5;
      p1[d] = p2[d] = lo[d] + 5;
      p3[d] = p4[d] = hi[d] - 5;
      for (const [i, j] of [
        [p1, p2],
        [p2, p3],
        [p3, p4]
      ])
        rec.push(
          M.record('cool' + sign + rec.length, M.link(i, j, 1.2), '#64a9be', {
            role: sign > 0 ? 'upperPipe' : 'lowerPipe',
            metal: 0.55
          })
        );
    }
    const contour = [];
    for (let i = 0; i < p.length; i += 9) {
      const vs = [
          Array.from(p.slice(i, i + 3)),
          Array.from(p.slice(i + 3, i + 6)),
          Array.from(p.slice(i + 6, i + 9))
        ],
        hits = [];
      for (let j = 0; j < 3; j++) {
        const a = vs[j],
          b = vs[(j + 1) % 3],
          da = a[k] - at,
          db = b[k] - at;
        if ((da < 0 && db >= 0) || (db < 0 && da >= 0)) {
          const f = da / (da - db);
          hits.push(V.lerp(a, b, f));
        }
      }
      if (hits.length === 2) contour.push(...hits[0], ...hits[1]);
    }
    if (contour.length)
      rec.push(M.record('parting-line', contour, '#efb661', { lines: true, role: 'fixed' }));
    const analysis = M.analyze(b, cfg.axis, at);
    if (analysis.undercut > 0.04 || cfg.sideCore) {
      for (const sign of [-1, 1]) {
        const q = mid.slice(),
          s = [10, 10, 10];
        q[a] = sign < 0 ? lo[a] - 9 : hi[a] + 9;
        s[k] = Math.max(8, size[k] * 0.3);
        s[d] = Math.max(10, size[d] * 0.25);
        rec.push(
          M.record('slide' + sign, M.translate(M.box(...s), q), '#bd8945', {
            role: 'slide',
            slideDirection: [0, 0, 0].map((_, i) => (i === a ? sign : 0))
          })
        );
      }
    }
    rec.push(...M.toolComponents(lo, hi, mid, k, at, cfg.pins ?? 4));
    const result = { records: rec, bb, k, axis: cfg.axis, at, analysis };
    M.toolCache.set(key, result);
    if (M.toolCache.size > 16) M.toolCache.delete(M.toolCache.keys().next().value);
    return result;
  };
  function transformAxis(p, bb, k) {
    const out = [];
    for (let i = 0; i < p.length; i += 3) {
      const v = V.sub(Array.from(p.slice(i, i + 3)), bb.center);
      out.push(...(k === 2 ? v : k === 0 ? [v[1], v[2], v[0]] : [v[2], v[0], v[1]]));
    }
    return out;
  }
  M.toolRecords = (b, options = {}) => {
    const t = M.makeTool(b),
      gap = options.gap ?? 17,
      press = options.press,
      records = [];
    if (press && !t.pressRecords) {
      t.pressRecords = t.records.map((r) => ({
        ...r,
        geo: M.pack(transformAxis(M.unpack(r.geo), t.bb, t.k)),
        slideDirection: r.slideDirection
          ? transformAxis(r.slideDirection, { center: [0, 0, 0] }, t.k)
          : undefined
      }));
      t.pressProductGeo = M.pack(transformAxis(M.world(b), t.bb, t.k));
    }
    for (const r of press ? t.pressRecords : t.records) {
      if (
        options.hidden?.some((key) => r.id.startsWith(key) || (key === 'gate' && r.id === 'runner'))
      )
        continue;
      const pos = [0, 0, 0],
        k = press ? 2 : t.k;
      if (/upper/.test(r.role)) pos[k] += gap;
      if (!press && /lower|pin/.test(r.role)) pos[k] -= gap;
      if (r.role === 'pin') pos[k] += options.eject || 0;
      if (r.role === 'slide') for (let j = 0; j < 3; j++) pos[j] += r.slideDirection[j] * gap * 0.5;
      if (press) pos[2] += options.datum ?? 82;
      const alpha = options.xray
        ? r.id === 'cavity'
          ? 0.23
          : press && r.id === 'core'
            ? 0.45
            : r.alpha
        : r.alpha;
      records.push({ ...r, id: b.id + '-' + r.id, pos, alpha });
    }
    return { records, tool: t, productGeo: press ? t.pressProductGeo : M.pack(M.world(b)) };
  };
})(window.MP);
