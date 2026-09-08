(function (M) {
  'use strict';
  const V = M.V;
  const { matrix, identity, mul } = M.RenderMath;
  const { Raw: RawRenderer, Three: ThreeRenderer } = M.Renderers;
  class Viewport {
    constructor(host, callbacks = {}) {
      this.host = host;
      this.callbacks = callbacks;
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-label', 'Mold Press 3D viewport');
      this.canvas.tabIndex = 0;
      host.prepend(this.canvas);
      this.renderer = new RawRenderer(this.canvas);
      this.az = -55;
      this.el = 28;
      this.viewH = 130;
      this.target = [0, 0, 18];
      this.records = [];
      this.pickBodies = [];
      this.grid = true;
      this.measure = [];
      this.bind();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(host);
      this.resize();
      this.running = true;
      const loop = (now) => {
        if (!this.running) return;
        this.callbacks.beforeFrame?.(now);
        this.render();
        this.callbacks.afterFrame?.(now);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      this.tryThree();
    }
    tryThree() {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (!this.running || !window.THREE || this.renderer instanceof ThreeRenderer) return;
        try {
          const old = this.canvas,
            next = document.createElement('canvas');
          const renderer = new ThreeRenderer(next);
          this.renderer.dispose();
          this.canvas = next;
          this.canvas.tabIndex = 0;
          this.canvas.setAttribute('aria-label', 'Mold Press 3D viewport');
          old.replaceWith(this.canvas);
          this.renderer = renderer;
          this.bind();
          this.resize();
          this.callbacks.engine?.(this.renderer.name);
        } catch (e) {
          console.warn('Three.js renderer unavailable; local renderer retained.', e);
        }
      };
      script.onerror = () => this.callbacks.engine?.(this.renderer.name);
      if (window.THREE) script.onload();
      else document.head.appendChild(script);
    }

    resize() {
      this.lastStamp = null;
      this.w = Math.max(1, this.host.clientWidth);
      this.h = Math.max(1, this.host.clientHeight);
      this.renderer.resize(this.w, this.h);
      this.callbacks.engine?.(this.renderer.name);
      this.callbacks.resize?.();
    }
    camera() {
      const w = this.w || 1,
        h = this.h || 1,
        az = (this.az * Math.PI) / 180,
        el = (this.el * Math.PI) / 180,
        dir = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)],
        forward = V.mul(dir, -1),
        right = V.unit(V.cross(forward, [0, 0, 1])),
        up = V.cross(right, forward),
        eye = V.add(this.target, V.mul(dir, 2000)),
        viewW = (this.viewH * w) / h,
        viewH = this.viewH;
      const view = new Float32Array([
          right[0],
          up[0],
          -forward[0],
          0,
          right[1],
          up[1],
          -forward[1],
          0,
          right[2],
          up[2],
          -forward[2],
          0,
          -V.dot(right, eye),
          -V.dot(up, eye),
          V.dot(forward, eye),
          1
        ]),
        proj = new Float32Array([
          2 / viewW,
          0,
          0,
          0,
          0,
          2 / viewH,
          0,
          0,
          0,
          0,
          -2 / 5000,
          0,
          0,
          0,
          -1,
          1
        ]);
      const project = (p) => {
        const d = V.sub(p, this.target);
        return { x: w / 2 + (V.dot(d, right) / viewW) * w, y: h / 2 - (V.dot(d, up) / viewH) * h };
      };
      return {
        w,
        h,
        eye,
        forward,
        right,
        up,
        target: this.target,
        viewW,
        viewH,
        vp: mul(proj, view),
        project
      };
    }
    project(p) {
      return this.camera().project(p);
    }
    ray(cx, cy) {
      const r = this.canvas.getBoundingClientRect(),
        x = cx - r.left - r.width / 2,
        y = r.height / 2 - (cy - r.top),
        cam = this.camera();
      return {
        o: V.add(
          cam.eye,
          V.add(V.mul(cam.right, (x / this.w) * cam.viewW), V.mul(cam.up, (y / this.h) * cam.viewH))
        ),
        d: cam.forward
      };
    }
    pick(cx, cy) {
      const override = this.callbacks.pickOverride?.(cx, cy);
      if (override !== undefined) return override;
      const ray = this.ray(cx, cy);
      let hit = null;
      for (const b of this.pickBodies) {
        if (!b.visible) continue;
        const h = M.raycast(M.world(b), ray.o, ray.d, hit?.t || Infinity);
        if (h) hit = { ...h, id: b.id };
      }
      if (!hit && Math.abs(ray.d[2]) > 1e-8) {
        const t = -ray.o[2] / ray.d[2];
        hit = { point: V.add(ray.o, V.mul(ray.d, t)), normal: [0, 0, 1], id: null, t };
      }
      return hit;
    }
    fit(bodies) {
      let p = [];
      for (const b of bodies) {
        const bb = M.bounds(M.world(b));
        p.push(...bb.min, ...bb.max);
      }
      if (!p.length) {
        this.target = [0, 0, 20];
        this.viewH = 130;
        return;
      }
      const bb = M.bounds(p);
      this.target = bb.center;
      this.viewH = Math.max(
        65,
        Math.max(bb.size[2], bb.size[1], (bb.size[0] * this.h) / this.w) * 1.75
      );
    }
    fitRecords(records) {
      const points = [];
      for (const r of records) {
        if (r.lines || r.alpha === 0) continue;
        const b = M.bounds(M.world(r));
        for (const x of [b.min[0], b.max[0]])
          for (const y of [b.min[1], b.max[1]])
            for (const z of [b.min[2], b.max[2]]) points.push([x, y, z]);
      }
      if (!points.length) return;
      const bb = M.bounds(points.flat());
      this.target = bb.center;
      const cam = this.camera(),
        sx = points.map((p) => V.dot(V.sub(p, this.target), cam.right)),
        sy = points.map((p) => V.dot(V.sub(p, this.target), cam.up)),
        xmin = Math.min(...sx),
        xmax = Math.max(...sx),
        ymin = Math.min(...sy),
        ymax = Math.max(...sy),
        left = 25,
        right = 24,
        top = Math.min(112, this.h * 0.18),
        bottom = 55,
        usableW = Math.max(140, this.w - left - right),
        usableH = Math.max(140, this.h - top - bottom);
      this.viewH =
        Math.max(200, ((ymax - ymin) * this.h) / usableH, ((xmax - xmin) * this.h) / usableW) *
        1.03;
      this.target = V.add(
        this.target,
        V.add(
          V.mul(cam.right, (xmin + xmax) / 2 + (((right - left) / 2) * this.viewH) / this.h),
          V.mul(cam.up, (ymin + ymax) / 2 + (((top - bottom) / 2) * this.viewH) / this.h)
        )
      );
    }

    view(name) {
      if (name === 'top') {
        this.az = -90;
        this.el = 89.9;
      } else if (name === 'front') {
        this.az = -90;
        this.el = 0;
      } else if (name === 'right') {
        this.az = 0;
        this.el = 0;
      } else {
        this.az = -55;
        this.el = 28;
      }
    }
    set(records, bodies = []) {
      this.records = records;
      this.pickBodies = bodies;
      this.invalidate();
    }
    invalidate() {
      this.revision = (this.revision || 0) + 1;
    }
    render() {
      if (!this.w) return;
      const cam = this.camera(),
        r = [];
      if (this.grid) {
        if (!this.gridRecord) {
          const p = [],
            major = [];
          for (let i = -250; i <= 250; i += 5) {
            const a = i % 25 === 0 ? major : p;
            a.push(-250, i, 0, 250, i, 0, i, -250, 0, i, 250, 0);
          }
          this.gridRecord = [
            M.record('grid', p, '#25303a', { lines: true, alpha: 0.55 }),
            M.record('grid-major', major, '#34404a', { lines: true, alpha: 0.7 })
          ];
        }
        r.push(...this.gridRecord);
      }
      r.push(...this.records);
      if (this.measure.length === 2) {
        r.push(M.record('ruler', this.measure.flat(), '#efb665', { lines: true, alpha: 1 }));
      }
      const stamp = JSON.stringify([
        this.w,
        this.h,
        this.az,
        this.el,
        this.viewH,
        this.target,
        this.grid,
        this.measure,
        this.renderer.name
      ]);
      if (
        this.lastRecords !== this.records ||
        this.lastStamp !== stamp ||
        this.lastRevision !== this.revision
      ) {
        this.renderer.render(r, cam);
        this.lastRecords = this.records;
        this.lastStamp = stamp;
        this.lastRevision = this.revision;
      }
      this.callbacks.frame?.(cam);
    }
    screenshot(name) {
      this.invalidate();
      this.render();
      if (!this.canvas.width || !this.canvas.height)
        throw Error('캔버스가 아직 준비되지 않았습니다. / Canvas is not ready.');
      const canvas = document.createElement('canvas');
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height + 54;
      const c = canvas.getContext('2d');
      if (!c) throw Error('PNG 캔버스를 만들지 못했습니다. / Could not create PNG canvas.');
      c.fillStyle = '#101419';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.drawImage(this.canvas, 0, 0);
      c.fillStyle = '#dfa858';
      c.font = 'bold 15px sans-serif';
      c.fillText('MOLD PRESS', 20, canvas.height - 22);
      c.fillStyle = '#a5b0b8';
      c.font = '13px sans-serif';
      c.fillText(name + '  /  mm  /  EMULATION', 150, canvas.height - 22);
      const data = canvas.toDataURL('image/png');
      if (!data.startsWith('data:image/png;base64,'))
        throw Error('PNG 인코딩 실패 / PNG encoding failed.');
      return new Blob([M.unb64(data.split(',')[1])], { type: 'image/png' });
    }
    dispose() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.resizeObserver.disconnect();
      this.renderer.dispose();
    }
  }
  M.Viewport = Viewport;
})(window.MP);
