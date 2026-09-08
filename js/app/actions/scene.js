(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.scene = function (props) {
    this.getAnalysis = (b) => {
      if (!b) return null;
      const cfg = b.tool || this.state.p.parting,
        key = b.geo + JSON.stringify([b.pos, b.rot, b.scale, cfg.axis, cfg.position]);
      if (!this.analysisCache.has(key)) {
        this.analysisCache.set(key, M.analyze(b, cfg.axis, cfg.position));
        if (this.analysisCache.size > 40)
          this.analysisCache.delete(this.analysisCache.keys().next().value);
      }
      return this.analysisCache.get(key);
    };
    this.edge = (p) => {
      if (!this.edgeCache.has(p)) {
        this.edgeCache.set(p, M.pack(M.edges(M.unpack(p))));
        if (this.edgeCache.size > 60) this.edgeCache.delete(this.edgeCache.keys().next().value);
      }
      return this.edgeCache.get(p);
    };
    this.productRecord = (b, extra = {}) => {
      const mat = M.materials[b.material] || M.materials.ABS;
      return {
        ...M.record(b.id, b.geo, mat.color, {
          ...b,
          rough: mat.rough,
          metal: mat.metal,
          surface: mat.surface
        }),
        ...extra
      };
    };
    this.refreshScene = () => {
      if (!this.view) return;
      const s = this.state,
        b = this.active(),
        recs = [],
        pick = [];
      this.view.grid = s.grid;
      this.view.measure = s.measure;
      try {
        if (s.page === 'studio' || s.page === 'assembly') {
          const products = s.show !== 'molds' || s.page === 'studio';
          const list = this.list(),
            center = list.length
              ? V.mul(
                  list.reduce((sum, b) => V.add(sum, b.pos), [0, 0, 0]),
                  1 / list.length
                )
              : [0, 0, 0];
          if (products && !s.hideProduct)
            for (const body of list) {
              if (!body.visible) continue;
              const rec = this.productRecord(body);
              if (s.page === 'assembly') {
                let dir = V.sub(body.home?.pos || body.pos, center);
                if (V.len(dir) < 1) dir = [1, 0, 1];
                rec.pos = V.add(body.pos, V.mul(V.unit(dir), s.explode));
              }
              if (s.collisions.includes(body.id) && s.page === 'assembly') rec.color = '#e55f56';
              recs.push(rec);
              pick.push({ ...body, pos: rec.pos });
              if (s.selected.includes(body.id))
                recs.push({
                  ...rec,
                  id: body.id + '-outline',
                  geo: this.edge(body.geo),
                  color: '#edb363',
                  lines: true,
                  alpha: 0.96
                });
            }
          if (s.page === 'assembly' && s.show !== 'products') {
            const source = s.p.bodies.find((x) => x.tool);
            if (source) {
              const t = M.toolRecords(source, { gap: 18, xray: s.xray });
              for (const r of t.records) recs.push({ ...r, pos: V.add(r.pos, [100, 20, 0]) });
            }
          }
          if (s.parting && s.page === 'studio' && b) {
            const bb = M.bounds(M.world(b)),
              k = 'XYZ'.indexOf(s.p.parting.axis),
              axes = [0, 1, 2].filter((i) => i !== k),
              p = [];
            let corners = [];
            for (const [a, c] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1]
            ]) {
              const v = bb.center.slice();
              v[k] = s.p.parting.position;
              v[axes[0]] += a * (bb.size[axes[0]] / 2 + 12);
              v[axes[1]] += c * (bb.size[axes[1]] / 2 + 12);
              corners.push(v);
            }
            for (let i = 0; i < 4; i++) p.push(...corners[i], ...corners[(i + 1) % 4]);
            recs.push(M.record('parting-plane', p, '#dfa858', { lines: true, alpha: 1 }));
          }
        } else if (s.page === 'tooling') {
          if (b) {
            if (b.tool) {
              const t = M.toolRecords(b, { gap: 18, xray: s.xray, hidden: s.hidden });
              recs.push(...t.records);
              if (!s.hideProduct) recs.push(this.productRecord(b));
              pick.push(b);
            } else {
              recs.push(this.productRecord(b));
              pick.push(b);
            }
          }
        } else if (s.page === 'press') {
          const target = this.cycle?.body || b;
          const fallback = {
            bb: target ? M.bounds(M.world(target)) : { size: [68, 46, 36], center: [0, 0, 0] },
            k: target ? 'XYZ'.indexOf(target.tool?.axis || s.p.parting.axis) : 2
          };
          fallback.at = target ? (target.tool?.position ?? fallback.bb.center[fallback.k]) : 0;
          const tool = target?.tool ? M.makeTool(target) : fallback;
          const machineKey = JSON.stringify([
            tool.bb.size,
            tool.k,
            tool.at - tool.bb.center[tool.k]
          ]);
          if (!this.machineCache || this.machineCache.key !== machineKey)
            this.machineCache = { key: machineKey, ...M.machine(tool) };
          const machine = this.machineCache,
            moving = M.movingMachine(machine, machine.openGap);
          recs.push(...machine.records, ...moving);
          const rig = { machine, target, moving, toolRecords: [], blank: null, part: null };
          if (target) {
            const mat = M.materials[target.material] || M.materials.ABS;
            rig.mat = mat;
            rig.thickness = Math.max(
              1.2,
              Math.min(6, M.volume(M.world(target)) / (machine.blankW * machine.blankD))
            );
            if (target.tool) {
              const t = M.toolRecords(target, { press: true, gap: 0, datum: machine.datum });
              rig.toolRecords = t.records.map((r) => ({
                record: r,
                base: r.pos.slice(),
                alpha: r.alpha
              }));
              recs.push(...t.records);
              rig.part = this.productRecord({
                ...target,
                id: 'press-formed-part',
                geo: t.productGeo,
                pos: [0, 0, machine.datum],
                rot: [0, 0, 0],
                scale: [1, 1, 1]
              });
              recs.push(rig.part);
            }
            rig.blank = M.record(
              'press-raw-panel',
              M.box(machine.blankW, machine.blankD, rig.thickness),
              mat.color,
              {
                pos: machine.feed.slice(),
                rough: mat.rough,
                metal: mat.metal,
                surface: mat.surface
              }
            );
            recs.push(rig.blank);
            for (const [i, tray] of s.p.tray.slice(-5).entries()) {
              const q = tray.part,
                bb = M.bounds(M.unpack(q.geo)),
                scale = Math.min(0.48, 60 / Math.max(...bb.size));
              recs.push(
                this.productRecord({
                  ...q,
                  id: 'tray-visual-' + tray.id,
                  pos: V.add(machine.tray, [0, (i - 2) * 9, i * 2]),
                  rot: [0, 0, i * 5],
                  scale: [scale, scale, scale]
                })
              );
            }
          }
          this.pressRig = rig;
          this.applyPressMotion(this.cycle?.progress ?? s.progress, s.running);
        }

        this.view.set(recs, pick);
        // Preserve the user's orbit, pan and zoom when the next mold is mounted.
      } catch (e) {
        console.error('Scene assembly:', e);
        this.view.set(
          this.list().map((b) => this.productRecord(b)),
          this.list()
        );
      }
    };
    this.onFrame = (cam) => {
      if (++this.frameN % 2) return;
      const b = this.active();
      if (b) {
        const bb = M.bounds(M.world(b)),
          center = bb.center;
        const o = cam.project(center),
          len = cam.viewH * 0.1;
        for (let k = 0; k < 3; k++) {
          const p = center.slice();
          p[k] += len;
          const end = cam.project(p),
            ref = this.gizmoRefs[k],
            line = this.lineRefs[k];
          if (ref) {
            ref.style.left = end.x + 'px';
            ref.style.top = end.y + 'px';
          }
          if (line) {
            line.setAttribute('x1', o.x);
            line.setAttribute('y1', o.y);
            line.setAttribute('x2', end.x);
            line.setAttribute('y2', end.y);
          }
        }
        const labels = {
          x: [bb.center[0], bb.min[1] - 6, bb.min[2]],
          y: [bb.max[0] + 6, bb.center[1], bb.min[2]],
          z: [bb.max[0] + 6, bb.max[1] + 3, bb.center[2]]
        };
        for (const [key, p] of Object.entries(labels)) {
          const e = this.dimensionRefs[key],
            xy = cam.project(p);
          if (e) {
            e.style.left = xy.x + 'px';
            e.style.top = xy.y + 'px';
          }
        }
      }
      if (this.labelRef.current && this.state.measure.length === 2) {
        const xy = cam.project(V.mul(V.add(...this.state.measure), 0.5));
        this.labelRef.current.style.left = xy.x + 'px';
        this.labelRef.current.style.top = xy.y + 'px';
      }
    };
    this.fitView = () => {
      if (this.state.page === 'press') this.view.fitRecords(this.view.records);
      else this.view.fit(this.list());
    };
  };
})(window.MP);
