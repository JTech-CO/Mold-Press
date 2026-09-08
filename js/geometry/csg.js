(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  const EPS = 1e-5;
  function cleanPolygon(v) {
    const out = [];
    for (const p of v) if (!out.length || V.len(V.sub(p, out[out.length - 1])) > EPS) out.push(p);
    if (out.length > 1 && V.len(V.sub(out[0], out[out.length - 1])) <= EPS) out.pop();
    return out;
  }
  class Poly {
    constructor(vertices, plane = null) {
      this.v = cleanPolygon(vertices);
      this.valid = false;
      if (this.v.length < 3) return;
      let cross = null,
        area = 0;
      for (let i = 2; i < this.v.length; i++) {
        const c = V.cross(V.sub(this.v[i - 1], this.v[0]), V.sub(this.v[i], this.v[0])),
          a = V.len(c);
        if (a > area) {
          area = a;
          cross = c;
        }
      }
      if (area <= EPS * EPS) return;
      this.n = plane ? plane.n.slice() : V.mul(cross, 1 / area);
      this.w = plane ? plane.w : V.dot(this.n, this.v[0]);
      this.valid = true;
    }
    flip() {
      this.v.reverse();
      this.n = V.mul(this.n, -1);
      this.w = -this.w;
      return this;
    }
  }
  function pushPoly(dst, vertices, plane) {
    const p = new Poly(vertices, plane);
    if (p.valid) dst.push(p);
  }
  function split(plane, p, coF, coB, F, B) {
    let types = [],
      dist = [],
      type = 0;
    for (const v of p.v) {
      const t = V.dot(plane.n, v) - plane.w,
        c = t < -EPS ? 2 : t > EPS ? 1 : 0;
      dist.push(t);
      types.push(c);
      type |= c;
    }
    if (type === 0) {
      (V.dot(plane.n, p.n) > 0 ? coF : coB).push(p);
    } else if (type === 1) F.push(p);
    else if (type === 2) B.push(p);
    else {
      let f = [],
        b = [];
      for (let i = 0; i < p.v.length; i++) {
        const j = (i + 1) % p.v.length,
          a = p.v[i],
          z = p.v[j];
        if (types[i] !== 2) f.push(a);
        if (types[i] !== 1) b.push(a);
        if ((types[i] | types[j]) === 3) {
          const t = Math.max(0, Math.min(1, dist[i] / (dist[i] - dist[j]))),
            v = V.lerp(a, z, t);
          f.push(v);
          b.push(v);
        }
      }
      // Preserve the original polygon plane, not a normal from a tiny clipped edge.
      pushPoly(F, f, p);
      pushPoly(B, b, p);
    }
  }
  function choosePlane(ps) {
    if (ps.length < 24) return ps[0];
    let best = ps[0],
      score = Infinity;
    const nc = Math.min(10, ps.length),
      ns = Math.min(40, ps.length);
    for (let c = 0; c < nc; c++) {
      const plane = ps[Math.floor((c * (ps.length - 1)) / Math.max(1, nc - 1))];
      let f = 0,
        b = 0,
        sp = 0;
      for (let j = 0; j < ns; j++) {
        const p = ps[Math.floor((j * (ps.length - 1)) / Math.max(1, ns - 1))];
        let type = 0;
        for (const v of p.v) {
          const d = V.dot(plane.n, v) - plane.w;
          type |= d > EPS ? 1 : d < -EPS ? 2 : 0;
        }
        if (type === 3) sp++;
        if (type & 1) f++;
        if (type & 2) b++;
      }
      const cost = sp * 4 + Math.abs(f - b) * 0.3;
      if (cost < score) {
        best = plane;
        score = cost;
      }
    }
    return best;
  }
  class BSP {
    constructor(p = []) {
      this.p = [];
      this.f = null;
      this.b = null;
      this.plane = null;
      if (p.length) this.build(p);
    }
    invert() {
      const stack = [this];
      while (stack.length) {
        const n = stack.pop();
        n.p.forEach((p) => p.flip());
        if (n.plane) n.plane = { n: V.mul(n.plane.n, -1), w: -n.plane.w };
        if (n.f) stack.push(n.f);
        if (n.b) stack.push(n.b);
        [n.f, n.b] = [n.b, n.f];
      }
    }
    clipPolys(ps) {
      const out = [],
        stack = [[this, ps]];
      while (stack.length) {
        const [n, list] = stack.pop();
        if (!list.length) continue;
        if (!n.plane) {
          for (const p of list) out.push(p);
          continue;
        }
        const f = [],
          b = [];
        for (const p of list) split(n.plane, p, f, b, f, b);
        if (n.f) stack.push([n.f, f]);
        else for (const p of f) out.push(p);
        if (n.b) stack.push([n.b, b]);
      }
      return out;
    }
    clipTo(tree) {
      const stack = [this];
      while (stack.length) {
        const n = stack.pop();
        n.p = tree.clipPolys(n.p);
        if (n.f) stack.push(n.f);
        if (n.b) stack.push(n.b);
      }
    }
    all() {
      const out = [],
        stack = [this];
      while (stack.length) {
        const n = stack.pop();
        for (const p of n.p) out.push(p);
        if (n.f) stack.push(n.f);
        if (n.b) stack.push(n.b);
      }
      return out;
    }
    build(ps) {
      const stack = [[this, ps]];
      let fragments = 0;
      while (stack.length) {
        const [n, list] = stack.pop();
        if (!list.length) continue;
        if (!n.plane) {
          const p = choosePlane(list);
          n.plane = { n: p.n.slice(), w: p.w };
        }
        const f = [],
          b = [];
        for (const p of list) split(n.plane, p, n.p, n.p, f, b);
        fragments += Math.max(0, f.length + b.length - list.length);
        if (fragments > 240000)
          throw Error(
            'CSG 중간 메쉬가 너무 큽니다. 입력 형상을 단순화하세요. / CSG intermediate mesh exceeds the safe memory budget.'
          );
        if (f.length) {
          n.f = n.f || new BSP();
          stack.push([n.f, f]);
        }
        if (b.length) {
          n.b = n.b || new BSP();
          stack.push([n.b, b]);
        }
      }
    }
  }
  function polys(p) {
    const a = [];
    for (let i = 0; i < p.length; i += 9)
      pushPoly(a, [
        Array.from(p.slice(i, i + 3)),
        Array.from(p.slice(i + 3, i + 6)),
        Array.from(p.slice(i + 6, i + 9))
      ]);
    return a;
  }
  M.csg = (pa, pb, op) => {
    if (!['union', 'subtract', 'intersect'].includes(op)) throw Error('Unknown CSG operation.');
    if (!pa.length || !pb.length)
      return op === 'intersect' ? [] : op === 'subtract' ? Array.from(pa) : [...pa, ...pb];
    if (pa.length + pb.length > 540000)
      throw Error(
        'CSG 입력은 60,000개 삼각형 이하로 제한됩니다. / CSG input exceeds 60,000 triangles.'
      );
    const A = M.bounds(pa),
      B = M.bounds(pb);
    if (A.min.some((x, k) => x > B.max[k] + EPS || B.min[k] > A.max[k] + EPS))
      return op === 'intersect' ? [] : op === 'subtract' ? Array.from(pa) : [...pa, ...pb];
    const a = new BSP(polys(pa)),
      b = new BSP(polys(pb));
    if (op === 'union') {
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.all());
    } else if (op === 'subtract') {
      a.invert();
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.all());
      a.invert();
    } else {
      a.invert();
      b.clipTo(a);
      b.invert();
      a.clipTo(b);
      b.clipTo(a);
      a.build(b.all());
      a.invert();
    }
    const out = [];
    for (const p of a.all())
      for (let i = 2; i < p.v.length; i++) tri(out, p.v[0], p.v[i - 1], p.v[i]);
    return out;
  };
})(window.MP);
