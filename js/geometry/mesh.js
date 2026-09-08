(function (M) {
  'use strict';

  const V = {
    add: (a, b) => a.map((x, i) => x + b[i]),
    sub: (a, b) => a.map((x, i) => x - b[i]),
    mul: (a, t) => a.map((x) => x * t),
    dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
    cross: (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ],
    len: (a) => Math.hypot(...a),
    unit: (a) => {
      const l = Math.hypot(...a);
      return l > 1e-12 ? a.map((x) => x / l) : [0, 0, 1];
    },
    lerp: (a, b, t) => a.map((x, i) => x + (b[i] - x) * t)
  };
  M.V = V;
  M.uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    'mp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  M.b64 = (a) => {
    let s = '';
    for (let i = 0; i < a.length; i += 16384) s += String.fromCharCode(...a.subarray(i, i + 16384));
    return btoa(s);
  };
  M.unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  M.pack = (p) => M.b64(new Uint8Array(new Float32Array(p).buffer));
  const unpackCache = new Map();
  M.unpack = (p) => {
    if (Array.isArray(p) || p instanceof Float32Array) return p;
    if (!unpackCache.has(p)) {
      const b = M.unb64(p);
      unpackCache.set(p, new Float32Array(b.buffer));
      if (unpackCache.size > 160) unpackCache.delete(unpackCache.keys().next().value);
    }
    return unpackCache.get(p);
  };
  function normal(a, b, c) {
    return V.unit(V.cross(V.sub(b, a), V.sub(c, a)));
  }
  function tri(out, a, b, c) {
    if (V.len(V.cross(V.sub(b, a), V.sub(c, a))) > 1e-8) out.push(...a, ...b, ...c);
  }
  M.normals = (p) => {
    let n = [];
    for (let i = 0; i < p.length; i += 9) {
      const v = normal(
        Array.from(p.slice(i, i + 3)),
        Array.from(p.slice(i + 3, i + 6)),
        Array.from(p.slice(i + 6, i + 9))
      );
      n.push(...v, ...v, ...v);
    }
    return new Float32Array(n);
  };
  M.bounds = (p) => {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i++) {
      const j = i % 3;
      min[j] = Math.min(min[j], p[i]);
      max[j] = Math.max(max[j], p[i]);
    }
    if (!p.length) return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0], center: [0, 0, 0] };
    return { min, max, size: V.sub(max, min), center: V.mul(V.add(min, max), 0.5) };
  };
  M.volume = (p) => {
    let v = 0;
    for (let i = 0; i < p.length; i += 9)
      v +=
        V.dot(
          Array.from(p.slice(i, i + 3)),
          V.cross(Array.from(p.slice(i + 3, i + 6)), Array.from(p.slice(i + 6, i + 9)))
        ) / 6;
    return Math.abs(v);
  };
  M.rotate = (v, r) => {
    let [x, y, z] = v;
    let [a, b, c] = r.map((d) => (d * Math.PI) / 180);
    [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
    return [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c), z];
  };
  M.world = (b) => {
    const p = M.unpack(b.geo),
      o = [];
    for (let i = 0; i < p.length; i += 3) {
      let v = M.rotate([p[i] * b.scale[0], p[i + 1] * b.scale[1], p[i + 2] * b.scale[2]], b.rot);
      o.push(...V.add(v, b.pos));
    }
    return o;
  };
  M.body = (name, p, extra = {}) => {
    const bb = M.bounds(p),
      q = [];
    for (let i = 0; i < p.length; i++) q.push(p[i] - bb.center[i % 3]);
    return {
      id: M.uid(),
      name,
      geo: M.pack(q),
      pos: bb.center,
      rot: [0, 0, 0],
      scale: [1, 1, 1],
      material: 'ABS',
      visible: true,
      home: { pos: bb.center.slice(), rot: [0, 0, 0], scale: [1, 1, 1] },
      tool: null,
      ...extra
    };
  };
  M.inverseRotate = (v, r) => {
    let q = v.slice();
    for (let k = 2; k >= 0; k--) {
      const a = (-r[k] * Math.PI) / 180,
        c = Math.cos(a),
        t = Math.sin(a),
        [x, y, z] = q;
      q =
        k === 0
          ? [x, y * c - z * t, y * t + z * c]
          : k === 1
            ? [x * c + z * t, y, -x * t + z * c]
            : [x * c - y * t, x * t + y * c, z];
    }
    return q;
  };
  M.Geometry = { normal, tri };
})(window.MP);
