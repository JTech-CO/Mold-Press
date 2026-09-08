(function (M) {
  'use strict';
  const V = M.V;
  const { matrix, identity, mul } = M.RenderMath;
  Object.assign(M.Renderers.Raw.prototype, {
    paint(records, cam) {
      const c = this.ctx,
        W = this.canvas.width,
        H = this.canvas.height,
        ratio = Math.min(1, 850 / W),
        w = Math.max(1, Math.round(W * ratio)),
        h = Math.max(1, Math.round(H * ratio));
      if (!this.soft || this.soft.width !== w || this.soft.height !== h) {
        this.soft = document.createElement('canvas');
        this.soft.width = w;
        this.soft.height = h;
        this.softctx = this.soft.getContext('2d');
        this.pixels = this.softctx.createImageData(w, h);
        this.zbuf = new Float32Array(w * h);
      }
      const pix = this.pixels.data,
        zbuf = this.zbuf;
      zbuf.fill(-1e9);
      for (let k = 0; k < pix.length; k += 4) {
        pix[k] = 15;
        pix[k + 1] = 19;
        pix[k + 2] = 23;
        pix[k + 3] = 255;
      }
      const sx = w / cam.w,
        sy = h / cam.h,
        lines = [],
        tris = [];
      const projection = (v) => {
        const d = V.sub(v, cam.target);
        return [
          w / 2 + (V.dot(d, cam.right) / cam.viewW) * w,
          h / 2 - (V.dot(d, cam.up) / cam.viewH) * h,
          -V.dot(d, cam.forward)
        ];
      };
      for (const r of records) {
        if (r.alpha <= 0) continue;
        const wp = M.world({
          ...r,
          rot: r.rot || [0, 0, 0],
          scale: r.scale || [1, 1, 1],
          pos: r.pos || [0, 0, 0]
        });
        if (r.lines) {
          lines.push({ r, wp });
          continue;
        }
        const col = M.hex(r.color),
          local = r.surface?.[0] ? M.unpack(r.geo) : null;
        for (let i = 0; i < wp.length; i += 9) {
          const a = Array.from(wp.slice(i, i + 3)),
            b = Array.from(wp.slice(i + 3, i + 6)),
            d = Array.from(wp.slice(i + 6, i + 9));
          let n = V.unit(V.cross(V.sub(b, a), V.sub(d, a)));
          if (V.dot(n, cam.forward) > 0) n = V.mul(n, -1);
          const lit = V.unit([-0.4, -0.8, 1.2]),
            half = V.unit(V.add(lit, V.mul(cam.forward, -1))),
            rough = r.rough ?? 0.4,
            metal = r.metal ?? 0;
          const spec =
            Math.pow(Math.max(0, V.dot(n, half)), 110 * (1 - rough) + 8 * rough) *
            (0.1 + 0.34 * metal);
          const light =
            0.38 +
            0.48 * Math.max(0, V.dot(n, lit)) +
            0.2 * Math.max(0, V.dot(n, V.unit([0.8, 0.2, 0.6])));
          const v = [a, b, d].map(projection);
          tris.push({
            v,
            surface: r.surface,
            local: local ? local.slice(i, i + 9) : null,
            col: col.map((x) => Math.min(255, (x * light + spec) * 255)),
            alpha: r.alpha ?? 1,
            z: (v[0][2] + v[1][2] + v[2][2]) / 3
          });
        }
      }
      tris.sort(
        (a, b) =>
          (a.alpha < 0.98 ? 1 : 0) - (b.alpha < 0.98 ? 1 : 0) || (a.alpha < 0.98 ? a.z - b.z : 0)
      );
      for (const t of tris) {
        const [a, b, d] = t.v,
          det = (b[1] - d[1]) * (a[0] - d[0]) + (d[0] - b[0]) * (a[1] - d[1]);
        if (Math.abs(det) < 0.0001) continue;
        const xmin = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0]))),
          xmax = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], d[0]))),
          ymin = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1]))),
          ymax = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], d[1])));
        for (let y = ymin; y <= ymax; y++)
          for (let x = xmin; x <= xmax; x++) {
            const u = ((b[1] - d[1]) * (x + 0.5 - d[0]) + (d[0] - b[0]) * (y + 0.5 - d[1])) / det,
              v = ((d[1] - a[1]) * (x + 0.5 - d[0]) + (a[0] - d[0]) * (y + 0.5 - d[1])) / det,
              k = 1 - u - v;
            if (u < -0.00001 || v < -0.00001 || k < -0.00001) continue;
            const z = u * a[2] + v * b[2] + k * d[2],
              index = y * w + x;
            if (z < zbuf[index] - 0.00005) continue;
            const off = index * 4;
            let finish = 1;
            if (t.local) {
              const p = t.local;
              finish +=
                M.surfaceValue(
                  u * p[0] + v * p[3] + k * p[6],
                  u * p[1] + v * p[4] + k * p[7],
                  u * p[2] + v * p[5] + k * p[8],
                  t.surface
                ) * t.surface[1];
            }
            for (let ch = 0; ch < 3; ch++)
              pix[off + ch] = t.col[ch] * finish * t.alpha + pix[off + ch] * (1 - t.alpha);
            if (t.alpha >= 0.98) zbuf[index] = z;
          }
      }
      for (const { r, wp } of lines) {
        const col = M.hex(r.color).map((v) => v * 255);
        for (let i = 0; i < wp.length; i += 6) {
          const a = projection(wp.slice(i, i + 3)),
            b = projection(wp.slice(i + 3, i + 6)),
            steps = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])));
          for (let j = 0; j <= steps; j++) {
            const q = j / (steps || 1),
              x = Math.round(a[0] + (b[0] - a[0]) * q),
              y = Math.round(a[1] + (b[1] - a[1]) * q),
              z = a[2] + (b[2] - a[2]) * q;
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const index = y * w + x;
            if (z < zbuf[index] - 0.16) continue;
            const alpha = r.alpha ?? 1;
            for (let ch = 0; ch < 3; ch++)
              pix[index * 4 + ch] = col[ch] * alpha + pix[index * 4 + ch] * (1 - alpha);
          }
        }
      }
      this.softctx.putImageData(this.pixels, 0, 0);
      c.drawImage(this.soft, 0, 0, W, H);
    }
  });
})(window.MP);
