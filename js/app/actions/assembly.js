(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.assembly = function (props) {
    this.removeTray = (id) => {
      const s = this.state;
      if (s.running || !s.p.tray.some((t) => t.id === id)) return;
      this.edit(this.t('취출 트레이 부품 삭제', 'Delete output-tray part'), (p) => {
        p.tray = p.tray.filter((t) => t.id !== id);
      });
      this.notice(
        this.t(
          '트레이 부품을 삭제했습니다. 이미 배치한 조립 부품은 유지됩니다. Ctrl+Z로 복원할 수 있습니다.',
          'Tray part deleted. Existing assembly copies are kept. Ctrl+Z restores the tray part.'
        )
      );
    };
    this.addTray = (id, hit = null) => {
      const t = this.state.p.tray.find((x) => x.id === id);
      if (!t || this.state.running) return;
      const copy = JSON.parse(JSON.stringify(t.part));
      copy.id = M.uid();
      copy.trayId = t.id;
      copy.home = { pos: copy.pos.slice(), rot: copy.rot.slice(), scale: copy.scale.slice() };
      const b = M.stagePart(copy, this.state.p.assembly, hit?.point || null, 8);
      this.edit(
        this.t('트레이에서 조립에 추가', 'Add tray part to assembly'),
        (p) => p.assembly.push(b),
        { page: 'assembly', selected: [b.id], explode: 0 }
      );
      requestAnimationFrame(() => {
        if (this.alive && this.state.page === 'assembly') this.view.fit(this.state.p.assembly);
      });
    };
    this.autoAssemble = () => {
      const tray = this.state.p.tray;
      if (!tray.length) {
        this.notice(this.t('먼저 조각을 프레스하세요.', 'Press a part first.'));
        return;
      }
      this.edit(
        this.t('설계 위치로 조립', 'Assemble to design positions'),
        (p) => {
          const done = new Set(p.assembly.map((b) => b.sourceId));
          for (const t of tray) {
            if (done.has(t.part.sourceId)) continue;
            const b = JSON.parse(JSON.stringify(t.part));
            b.id = M.uid();
            b.trayId = t.id;
            p.assembly.push(b);
            done.add(b.sourceId);
          }
          for (const b of p.assembly)
            if (b.home) {
              b.pos = b.home.pos.slice();
              b.rot = b.home.rot.slice();
              b.scale = b.home.scale.slice();
            }
        },
        { page: 'assembly', explode: 0, selected: [] }
      );
      setTimeout(() => this.view.fit(this.state.p.assembly), 50);
    };
    this.checkCollisions = () => {
      clearTimeout(this.collisionTimer);
      this.collisionTimer = setTimeout(() => {
        const list = this.state.p.assembly,
          ids = new Set();
        for (let i = 0; i < list.length; i++)
          for (let j = i + 1; j < list.length; j++)
            if (M.intersects(list[i], list[j])) {
              ids.add(list[i].id);
              ids.add(list[j].id);
            }
        const next = [...ids];
        if (JSON.stringify(next) !== JSON.stringify(this.state.collisions))
          this.setState({ collisions: next }, this.refreshScene);
      }, 120);
    };
    this.applyFaceSnap = (source, target, mode) => {
      if (source.id === target.id) {
        this.notice(this.t('다른 조각의 면을 선택하세요.', 'Choose a face on another part.'));
        return;
      }
      const b = this.state.p.assembly.find((b) => b.id === source.id),
        tb = this.state.p.assembly.find((b) => b.id === target.id);
      if (!b || !tb) return;
      const desired = V.mul(target.normal, -1),
        from = V.unit(source.normal),
        cross = V.cross(from, desired),
        dot = Math.max(-1, Math.min(1, V.dot(from, desired))),
        angle = Math.acos(dot),
        axis =
          V.len(cross) > 1e-6
            ? V.unit(cross)
            : V.unit(V.cross(from, Math.abs(from[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]));
      let sp = source.point,
        tp = target.point;
      if (mode === 'pin') {
        const sa = M.bounds(M.world(b)),
          ta = M.bounds(M.world(tb));
        const sk = source.normal.map(Math.abs).indexOf(Math.max(...source.normal.map(Math.abs))),
          tk = target.normal.map(Math.abs).indexOf(Math.max(...target.normal.map(Math.abs)));
        sp = sa.center.slice();
        tp = ta.center.slice();
        sp[sk] = source.point[sk];
        tp[tk] = target.point[tk];
      }
      const p = M.world(b),
        q = [];
      for (let i = 0; i < p.length; i += 3) {
        const v = V.sub(p.slice(i, i + 3), sp),
          rot =
            angle < 1e-6
              ? v
              : V.add(
                  V.add(V.mul(v, Math.cos(angle)), V.mul(V.cross(axis, v), Math.sin(angle))),
                  V.mul(axis, V.dot(axis, v) * (1 - Math.cos(angle)))
                );
        q.push(...V.add(V.add(rot, tp), V.mul(target.normal, 0.025)));
      }
      const updated = M.body(b.name, q, {
        id: b.id,
        material: b.material,
        sourceId: b.sourceId,
        trayId: b.trayId,
        home: b.home,
        mate: {
          targetId: tb.id,
          normal: V.unit(M.inverseRotate(target.normal, tb.rot).map((x, i) => x * tb.scale[i]))
        }
      });
      this.edit(
        this.t('면/핀 스냅 완료', 'Mating snap complete'),
        (p) => {
          p.assembly = p.assembly.map((x) => (x.id === b.id ? updated : x));
        },
        { selected: [b.id], explode: 0 }
      );
    };
    this.startSnap = (mode) => {
      this.snapSource = null;
      this.setState({ snapMode: mode, mode: 'select', explode: 0 });
      this.notice(
        this.t(
          '이동할 조각의 면을 클릭한 다음 대상 면을 클릭하세요.',
          'Click a face on the moving part, then the target face.'
        )
      );
    };
  };
})(window.MP);
