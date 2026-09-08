(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  M.splitTolerance = (p) => Math.max(1e-6, Math.max(...M.bounds(p).size) * 2e-7);
  M.signedVolume = (p) => {
    const c = M.bounds(p).center;
    let sum = 0;
    for (let i = 0; i < p.length; i += 9)
      sum +=
        V.dot(
          V.sub(p.slice(i, i + 3), c),
          V.cross(V.sub(p.slice(i + 3, i + 6), c), V.sub(p.slice(i + 6, i + 9), c))
        ) / 6;
    return sum;
  };
  M.splitMesh = (input, axis, at) => {
    const p = Array.from(input),
      k = 'XYZ'.indexOf(axis),
      bb = M.bounds(p),
      eps = M.splitTolerance(p);
    if (
      k < 0 ||
      !Number.isFinite(at) ||
      p.length < 9 ||
      p.length % 9 ||
      p.some((x) => !Number.isFinite(x))
    )
      throw Error('올바른 솔리드와 파팅 평면이 필요합니다. / Invalid solid or parting plane.');
    if (p.length > 540000)
      throw Error(
        '분할 입력은 60,000개 삼각형 이하로 제한됩니다. 원본을 유지했습니다. / Split input exceeds 60,000 triangles; source preserved.'
      );
    if (at <= bb.min[k] + eps * 2 || at >= bb.max[k] - eps * 2)
      throw Error(
        '파팅 평면이 이미 절단된 경계 또는 바디 밖에 있습니다. 원본을 유지했습니다. Auto Parting으로 다시 추천하거나 평면을 내부로 이동하세요. / The plane is on a cut boundary or outside the body. Source preserved; move the plane inside or use Auto Parting again.'
      );
    const origin = bb.center,
      plane = at - origin[k],
      u = (k + 1) % 3,
      v = (k + 2) % 3,
      lo = [],
      hi = [],
      segments = [];
    const point = (q) => {
      const x = V.sub(q, origin);
      if (Math.abs(x[k] - plane) <= eps) x[k] = plane;
      return x;
    };
    const append = (poly, dst, collect) => {
      const clean = [];
      for (const x of poly)
        if (!clean.length || V.len(V.sub(x, clean.at(-1))) > eps * 0.05) clean.push(x);
      if (clean.length > 1 && V.len(V.sub(clean[0], clean.at(-1))) <= eps * 0.05) clean.pop();
      if (clean.length < 3) return;
      let area = 0;
      for (let j = 2; j < clean.length; j++)
        area += V.len(V.cross(V.sub(clean[j - 1], clean[0]), V.sub(clean[j], clean[0])));
      if (area <= eps * eps * 0.01) return;
      for (let j = 2; j < clean.length; j++) tri(dst, clean[0], clean[j - 1], clean[j]);
      if (collect)
        for (let j = 0; j < clean.length; j++) {
          const a = clean[j],
            b = clean[(j + 1) % clean.length];
          if (a[k] === plane && b[k] === plane && V.len(V.sub(a, b)) > eps * 0.05)
            segments.push([
              [a[u], a[v]],
              [b[u], b[v]]
            ]);
        }
    };
    const clip = (poly, sign) => {
      const out = [];
      for (let j = 0; j < poly.length; j++) {
        const a = poly[j],
          b = poly[(j + 1) % poly.length],
          da = (a[k] - plane) * sign,
          db = (b[k] - plane) * sign;
        if (da <= 0) out.push(a);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          const q = V.lerp(a, b, Math.max(0, Math.min(1, da / (da - db))));
          q[k] = plane;
          out.push(q);
        }
      }
      return out;
    };
    for (let i = 0; i < p.length; i += 9) {
      const t = [
        point(p.slice(i, i + 3)),
        point(p.slice(i + 3, i + 6)),
        point(p.slice(i + 6, i + 9))
      ];
      if (t.every((x) => x[k] === plane)) {
        const n = V.cross(V.sub(t[1], t[0]), V.sub(t[2], t[0]));
        append(t, n[k] >= 0 ? lo : hi, n[k] >= 0);
      } else {
        append(clip(t, 1), lo, true);
        append(clip(t, -1), hi, false);
      }
    }
    // Group nearly-identical row ordinates created by Float32 project serialization.
    const rows = segments.flatMap((s) => s.map((q) => q[1])).sort((a, b) => a - b),
      ys = [];
    for (const y of rows) if (!ys.length || y - ys.at(-1) > eps * 2) ys.push(y);
    const row = (y) => {
      let a = 0,
        b = ys.length;
      while (a < b) {
        const m = (a + b) >> 1;
        if (ys[m] <= y) a = m + 1;
        else b = m;
      }
      return ys[Math.max(0, a - 1)];
    };
    const edges = segments
      .map(([a, b]) => ({ a: [a[0], row(a[1])], b: [b[0], row(b[1])] }))
      .filter((s) => Math.abs(s.a[1] - s.b[1]) > eps * 0.01);
    edges.sort((a, b) => Math.min(a.a[1], a.b[1]) - Math.min(b.a[1], b.b[1]));
    let edgeIndex = 0,
      active = [];
    for (let j = 0; j < ys.length - 1; j++) {
      const y0 = ys[j],
        y1 = ys[j + 1],
        mid = (y0 + y1) / 2;
      if (y1 - y0 <= eps * 0.01) continue;
      active = active.filter((s) => Math.max(s.a[1], s.b[1]) > mid);
      while (
        edgeIndex < edges.length &&
        Math.min(edges[edgeIndex].a[1], edges[edgeIndex].b[1]) < mid
      ) {
        const edge = edges[edgeIndex++];
        if (Math.max(edge.a[1], edge.b[1]) > mid) active.push(edge);
      }
      const hits = [];
      for (const { a, b } of active) {
        if (mid <= Math.min(a[1], b[1]) || mid >= Math.max(a[1], b[1])) continue;
        const x = (y) =>
            a[0] + (b[0] - a[0]) * Math.max(0, Math.min(1, (y - a[1]) / (b[1] - a[1]))),
          x0 = x(y0),
          x1 = x(y1);
        hits.push({ x0, x1, x: (x0 + x1) / 2, wind: b[1] > a[1] ? 1 : -1 });
      }
      hits.sort((a, b) => a.x - b.x);
      const groups = [];
      for (const h of hits) {
        let g = groups.at(-1);
        if (
          g &&
          Math.abs(h.x - g.x) < eps * 4 &&
          Math.abs(h.x0 - g.x0) < eps * 8 &&
          Math.abs(h.x1 - g.x1) < eps * 8
        ) {
          g.wind += h.wind;
          g.count++;
        } else groups.push({ ...h, count: 1 });
      }
      let winding = 0,
        left = null;
      for (const h of groups) {
        const next = winding + h.wind;
        if (winding === 0 && next !== 0) left = h;
        if (winding !== 0 && next === 0 && left) {
          const a = [left.x0, y0],
            b = [h.x0, y0],
            c = [h.x1, y1],
            d = [left.x1, y1];
          const area = ((h.x0 - left.x0 + (h.x1 - left.x1)) * (y1 - y0)) / 2;
          if (area > eps * eps) {
            const pts = [a, b, c, d].map((q) => {
              const x = [0, 0, 0];
              x[k] = plane;
              x[u] = q[0];
              x[v] = q[1];
              return x;
            });
            tri(lo, pts[0], pts[1], pts[2]);
            tri(lo, pts[0], pts[2], pts[3]);
            tri(hi, pts[0], pts[2], pts[1]);
            tri(hi, pts[0], pts[3], pts[2]);
          }
          left = null;
        }
        winding = next;
      }
      if (lo.length + hi.length > 1800000)
        throw Error(
          '절단 결과가 안전한 메모리 한도를 초과했습니다. 원본을 유지했습니다. / Cut output exceeds the safe memory budget; source preserved.'
        );
      if (winding !== 0)
        throw Error(
          '절단면 경계가 닫히지 않습니다. 원본은 유지됩니다. 메쉬의 열린 틈을 확인하세요. / The cut contour is open. Source preserved; check the mesh for gaps.'
        );
    }
    const halves = [M.translate(lo, origin), M.translate(hi, origin)],
      before = Math.abs(M.signedVolume(p)),
      volumes = halves.map((x) => Math.abs(M.signedVolume(x))),
      sum = volumes[0] + volumes[1];
    if (halves.some((h) => h.length < 9) || volumes.some((x) => x < Math.max(1e-6, before * 1e-9)))
      throw Error(
        '유효한 두 솔리드가 생성되지 않았습니다. 원본을 유지했습니다. / The cut did not produce two valid solids; source preserved.'
      );
    for (let side = 0; side < 2; side++) {
      const h = halves[side],
        bounds = M.bounds(h);
      if (
        h.some((x) => !Number.isFinite(x)) ||
        bounds.min.some((x, i) => x < bb.min[i] - eps * 8) ||
        bounds.max.some((x, i) => x > bb.max[i] + eps * 8) ||
        (!side ? bounds.max[k] > at + eps * 8 : bounds.min[k] < at - eps * 8)
      )
        throw Error(
          '절단 결과의 경계 검증 실패. 원본을 유지했습니다. / Invalid cut bounds; source preserved.'
        );
    }
    if (Math.abs(sum - before) > Math.max(before * 0.0003, eps * Math.max(...bb.size) ** 2 * 8))
      throw Error(
        '절단 결과의 체적 검증 실패. 원본을 유지했습니다. / Cut volume validation failed; source preserved.'
      );
    return halves;
  };
})(window.MP);
