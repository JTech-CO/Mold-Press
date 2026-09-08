(function (M) {
  'use strict';

  const V = M.V,
    A = (M.Mate = {}),
    E = 1e-7,
    clamp = (x) => Math.max(-1, Math.min(1, x)),
    copy = (x) => JSON.parse(JSON.stringify(x));
  const fail = (a, b) => {
    throw Error(a + ' / ' + b);
  };
  const Q = {
    mul: (a, b) => [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ],
    inv: (q) => [-q[0], -q[1], -q[2], q[3]],
    axis: (v, a) => [...V.mul(V.unit(v), Math.sin(a / 2)), Math.cos(a / 2)],
    rotate: (v, q) => {
      const u = q.slice(0, 3);
      return V.add(v, V.mul(V.cross(u, V.add(V.cross(u, v), V.mul(v, q[3]))), 2));
    },
    euler: (r) => {
      const h = r.map((x) => (x * Math.PI) / 360),
        q = [
          [Math.sin(h[0]), 0, 0, Math.cos(h[0])],
          [0, Math.sin(h[1]), 0, Math.cos(h[1])],
          [0, 0, Math.sin(h[2]), Math.cos(h[2])]
        ];
      return Q.mul(q[2], Q.mul(q[1], q[0]));
    },
    angles: (q) => {
      const length = Math.hypot(...q),
        [x, y, z, w] = q.map((v) => v / length),
        m31 = 2 * (x * z - w * y),
        pitch = Math.asin(clamp(-m31));
      let roll, yaw;
      if (Math.abs(m31) < 1 - 1e-10) {
        roll = Math.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y));
        yaw = Math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z));
      } else {
        roll = 0;
        yaw = Math.atan2(-2 * (x * y - w * z), 1 - 2 * (x * x + z * z));
      }
      return [roll, pitch, yaw].map((x) => (x * 180) / Math.PI);
    }
  };
  Q.fromTo = (a, b) => {
    a = V.unit(a);
    b = V.unit(b);
    const d = clamp(V.dot(a, b)),
      c = V.cross(a, b);
    if (d > 1 - 1e-10) return [0, 0, 0, 1];
    if (d < -1 + 1e-8)
      return Q.axis(V.cross(a, Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]), Math.PI);
    const s = Math.sqrt((1 + d) * 2);
    return [c[0] / s, c[1] / s, c[2] / s, s / 2];
  };
  A.Q = Q;
  A.rotateBody = (b, q, pivot) => {
    b.pos = V.add(pivot, Q.rotate(V.sub(b.pos, pivot), q));
    b.rot = Q.angles(Q.mul(q, Q.euler(b.rot)));
  };
  A.signature = (geo) => {
    let h = 2166136261;
    for (let i = 0; i < geo.length; i += Math.max(1, Math.floor(geo.length / 400)))
      h = Math.imul(h ^ geo.charCodeAt(i), 16777619);
    return geo.length + ':' + (h >>> 0);
  };
  function solveLinear(mat, rhs) {
    const n = rhs.length,
      a = mat.map((r, i) => r.concat(rhs[i]));
    for (let j = 0; j < n; j++) {
      let p = j;
      for (let i = j + 1; i < n; i++) if (Math.abs(a[i][j]) > Math.abs(a[p][j])) p = i;
      if (Math.abs(a[p][j]) < 1e-10) return null;
      [a[j], a[p]] = [a[p], a[j]];
      const d = a[j][j];
      for (let k = j; k <= n; k++) a[j][k] /= d;
      for (let i = 0; i < n; i++)
        if (i !== j) {
          const f = a[i][j];
          for (let k = j; k <= n; k++) a[i][k] -= f * a[j][k];
        }
    }
    return a.map((r) => r[n]);
  }
  function least(rows, y) {
    const n = rows[0].length,
      mat = Array.from({ length: n }, () => Array(n).fill(0)),
      rhs = Array(n).fill(0);
    rows.forEach((r, i) => {
      for (let j = 0; j < n; j++) {
        rhs[j] += r[j] * y[i];
        for (let k = 0; k < n; k++) mat[j][k] += r[j] * r[k];
      }
    });
    return solveLinear(mat, rhs);
  }
  function smallestEigen(normals) {
    const a = Array.from({ length: 3 }, () => [0, 0, 0]),
      vec = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
    for (const n of normals)
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] += n[i] * n[j];
    for (let it = 0; it < 30; it++) {
      let p = 0,
        q = 1;
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          if (Math.abs(a[i][j]) > Math.abs(a[p][q])) {
            p = i;
            q = j;
          }
      if (Math.abs(a[p][q]) < 1e-10) break;
      const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]),
        c = Math.cos(phi),
        s = Math.sin(phi),
        pp = a[p][p],
        qq = a[q][q],
        pq = a[p][q];
      for (let k = 0; k < 3; k++)
        if (k !== p && k !== q) {
          const x = a[k][p],
            y = a[k][q];
          a[k][p] = a[p][k] = c * x - s * y;
          a[k][q] = a[q][k] = s * x + c * y;
        }
      a[p][p] = c * c * pp - 2 * s * c * pq + s * s * qq;
      a[q][q] = s * s * pp + 2 * s * c * pq + c * c * qq;
      a[p][q] = a[q][p] = 0;
      for (let k = 0; k < 3; k++) {
        const x = vec[k][p],
          y = vec[k][q];
        vec[k][p] = c * x - s * y;
        vec[k][q] = s * x + c * y;
      }
    }
    let k = 0;
    for (let i = 1; i < 3; i++) if (a[i][i] < a[k][k]) k = i;
    return V.unit(vec.map((v) => v[k]));
  }
  M.MateMath = { E, clamp, copy, fail, Q, solveLinear, least, smallestEigen };
})(window.MP);
