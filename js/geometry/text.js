(function (M) {
  'use strict';
  const V = M.V;
  const { normal, tri } = M.Geometry;
  M.mirror = (p) => {
    const q = [];
    for (let i = 0; i < p.length; i += 9) {
      q.push(
        -p[i],
        p[i + 1],
        p[i + 2],
        -p[i + 6],
        p[i + 7],
        p[i + 8],
        -p[i + 3],
        p[i + 4],
        p[i + 5]
      );
    }
    return q;
  };
  M.textMesh = (text, size = 9, depth = 1) => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 48;
    const ctx = cv.getContext('2d');
    ctx.font = 'bold 28px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(text.slice(0, 16), 2, 2);
    const img = ctx.getImageData(0, 0, 256, 48).data;
    let o = [];
    const s = size / 28;
    for (let y = 0; y < 38; y += 2) {
      let run = -1;
      for (let x = 0; x <= 254; x += 2) {
        const on = x < 254 && img[(y * 256 + x) * 4 + 3] > 100;
        if (on && run < 0) run = x;
        if (!on && run >= 0) {
          const w = (x - run) * s - 0.045,
            h = 2 * s - 0.045;
          o.push(...M.translate(M.box(w, h, depth), [(run + (x - run) / 2) * s, -y * s, 0]));
          run = -1;
        }
      }
    }
    const bb = M.bounds(o);
    return M.translate(o, V.mul(bb.center, -1));
  };
})(window.MP);
