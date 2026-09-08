(function (M) {
  'use strict';
  const V = M.V;
  M.stl = (bodies) => {
    const ps = bodies.map(M.world),
      count = ps.reduce((n, p) => n + p.length / 9, 0),
      buf = new ArrayBuffer(84 + count * 50),
      view = new DataView(buf);
    new Uint8Array(buf, 0, 80).set(
      new TextEncoder().encode('Mold Press | millimetres | simplified emulation')
    );
    view.setUint32(80, count, true);
    let at = 84;
    for (const p of ps)
      for (let i = 0; i < p.length; i += 9) {
        const n = M.normals(p.slice(i, i + 9));
        for (let j = 0; j < 3; j++) view.setFloat32(at + j * 4, n[j], true);
        for (let j = 0; j < 9; j++) view.setFloat32(at + 12 + j * 4, p[i + j], true);
        view.setUint16(at + 48, 0, true);
        at += 50;
      }
    return buf;
  };
})(window.MP);
