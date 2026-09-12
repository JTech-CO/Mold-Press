(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.press = function (props) {
    this.applyPressMotion = (progress, running) => {
      const rig = this.pressRig;
      if (!rig) return;
      const { machine, target, moving, mat, thickness } = rig,
        s = this.state,
        m = M.pressMotion(progress, running),
        gap =
          machine.openGap * m.open +
          (running && progress >= 0.16 && progress < 0.5 ? 8 * (1 - m.form) * (1 - m.open) : 0),
        cutaway = s.xray || (running && progress >= 0.16 && progress < 0.88),
        z = machine.moldTop + gap + 7,
        rodBottom = z + 7,
        rodTop = machine.crown - 12;
      moving[0].pos = [0, 0, z];
      moving[0].alpha = cutaway ? 0.38 : 1;
      moving[1].pos = [0, 0, (rodBottom + rodTop) / 2];
      moving[1].scale = [1, 1, Math.max(0.1, rodTop - rodBottom)];
      for (const item of rig.toolRecords) {
        const r = item.record;
        r.pos = item.base.slice();
        if (/upper/.test(r.role)) r.pos[2] += gap;
        if (r.role === 'pin') r.pos[2] += m.pin * 8;
        if (r.role === 'slide') r.pos = V.add(r.pos, V.mul(r.slideDirection, gap * 0.5));
        r.alpha = cutaway
          ? r.id.endsWith('-cavity')
            ? 0.23
            : r.id.endsWith('-core')
              ? 0.45
              : item.alpha
          : item.alpha;
      }
      if (target) {
        const q = m.form,
          shrink = 1 - mat.shrink * m.cool;
        rig.blank.pos = V.lerp(machine.feed, [0, 0, machine.partingZ + 3], m.feed);
        rig.blank.scale = [1 - 0.08 * q, 1 - 0.08 * q, 1 - 0.65 * q];
        rig.blank.alpha = s.hideProduct
          ? 0
          : (1 - q) * (mat.name === 'PC' && s.pcTransparent ? 0.42 : 1);
        rig.blank.transmission = mat.name === 'PC' && s.pcTransparent ? 0.75 : 0;
        if (rig.part) {
          const startScale = thickness / Math.max(0.01, machine.dims[2]);
          rig.part.scale = [shrink, shrink, (startScale + (1 - startScale) * q) * shrink];
          rig.part.pos = [0, 0, (machine.partingZ + 3) * (1 - q) + machine.datum * q + m.lift * 8];
          if (m.eject > 0) {
            rig.part.pos = V.lerp([0, 0, machine.datum + 8], machine.tray, m.eject);
            rig.part.pos[2] += Math.sin(m.eject * Math.PI) * 24;
          }
          rig.part.alpha = s.hideProduct
            ? 0
            : Math.min(1, q * 4) * (mat.name === 'PC' && s.pcTransparent ? 0.42 : 1);
          rig.part.color = V.lerp(M.hex(mat.color), [0.95, 0.59, 0.27], (1 - m.cool) * 0.1);
        }
      }
      this.view?.invalidate();
    };
    this.advancePress = (now) => {
      const c = this.cycle;
      if (!c || !this.state.running || c.completing) return;
      if (this.state.modal === 'reset') {
        c.lastTime = now;
        return;
      }
      // Slow renderers and background-tab throttling must not skip the visible strokes.
      const dt = c.lastTime === null ? 0 : Math.max(0, Math.min(80, now - c.lastTime));
      c.lastTime = now;
      c.elapsed = Math.min(c.duration, c.elapsed + dt);
      c.progress = c.elapsed / c.duration;
      if (this.state.page === 'press') this.applyPressMotion(c.progress, true);
      const phase = M.pressMotion(c.progress).phase;
      if (now - c.uiTime >= 100 || phase !== this.state.phase || c.progress === 1) {
        c.uiTime = now;
        this.setState({ progress: c.progress, phase });
      }
      if (c.progress === 1) c.presentFinal = true;
    };
    this.afterPressFrame = () => {
      const c = this.cycle;
      if (!c || !c.presentFinal || c.completing) return;
      // The ejection endpoint is drawn before the part is committed to the tray.
      c.completing = true;
      this.pressTransition = setTimeout(() => this.finishCycle(c), 100);
    };
    this.material = (key) =>
      this.edit(this.t('소재 선택', 'Select material'), (p) => {
        p.material = key;
        const ids =
          this.state.page === 'press'
            ? [this.pressTarget()?.id]
            : this.state.selected.length
              ? this.state.selected
              : [this.active()?.id];
        for (const b of p.bodies) if (ids.includes(b.id)) b.material = key;
      });
    this.startPress = (all) => {
      if (this.state.running) return;
      const target = this.pressTarget(),
        list = (all ? this.state.p.bodies : [target]).filter(Boolean);
      if (!list.length) return;
      if (list.some((b) => !b.tool)) {
        this.notice(
          this.t(
            '먼저 Tooling에서 대상 조각의 금형을 생성하세요.',
            'Generate tooling for every target part first.'
          )
        );
        return;
      }
      clearTimeout(this.pressTransition);
      this.pressEpoch = (this.pressEpoch || 0) + 1;
      this.pressQueue = list.map((b) => JSON.parse(JSON.stringify(b)));
      this.setState(
        {
          pressTargetId: target?.id || null,
          queueIndex: 0,
          queueTotal: list.length,
          running: true,
          progress: 0,
          phase: 0
        },
        () => this.nextCycle()
      );
    };
    this.nextCycle = () => {
      if (!this.alive || !this.state.running) return;
      if (this.state.modal === 'reset') {
        this.pressTransition = setTimeout(() => this.nextCycle(), 100);
        return;
      }
      if (!this.pressQueue.length) {
        this.cycle = null;
        const target = this.pressTarget();
        this.setState({
          running: false,
          progress: 1,
          phase: 4,
          selected: target ? [target.id] : []
        });
        this.notice(
          this.t(
            '프레스 완료. 트레이에서 조립으로 옮길 수 있습니다.',
            'Press complete. Parts are ready for assembly.'
          )
        );
        return;
      }
      const body = this.pressQueue.shift(),
        mat = M.materials[body.material] || M.materials.ABS;
      this.cycle = {
        body,
        epoch: this.pressEpoch,
        duration: (mat.cycle / this.state.speed) * 1000,
        elapsed: 0,
        progress: 0,
        lastTime: null,
        uiTime: 0,
        completing: false
      };
      this.setState(
        (s) => ({ selected: [body.id], queueIndex: s.queueIndex + 1, progress: 0, phase: 0 }),
        () => this.refreshScene()
      );
    };
    this.finishCycle = (c) => {
      if (!this.alive || c !== this.cycle || c.epoch !== this.pressEpoch || !this.state.running)
        return;
      if (this.state.modal === 'reset') {
        this.pressTransition = setTimeout(() => this.finishCycle(c), 100);
        return;
      }
      const b = c.body,
        mat = M.materials[b.material] || M.materials.ABS,
        wp = M.world(b),
        bb = M.bounds(wp),
        shrink = wp.map((x, i) => bb.center[i % 3] + (x - bb.center[i % 3]) * (1 - mat.shrink)),
        part = M.body(b.name, shrink, {
          material: b.material,
          sourceId: b.id,
          primitive: 'pressed',
          shrink: mat.shrink,
          tool: null
        }),
        tr = {
          id: M.uid(),
          part,
          material: b.material,
          created: new Date().toISOString(),
          cycle: mat.cycle
        };
      this.edit(this.t('취출 완료', 'Ejection complete'), (p) => {
        p.tray.push(tr);
      });
      this.cycle = null;
      const epoch = this.pressEpoch;
      this.pressTransition = setTimeout(() => {
        if (epoch === this.pressEpoch) this.nextCycle();
      }, 150);
    };
    this.stopPress = () => {
      clearTimeout(this.pressTransition);
      this.pressEpoch = (this.pressEpoch || 0) + 1;
      this.cycle = null;
      this.pressQueue = [];
      this.setState({ running: false, progress: 0, phase: 0 });
      this.notice(
        this.t(
          '진행 중인 사이클을 취소했습니다. 완료품은 유지됩니다.',
          'Current cycle cancelled. Completed parts are kept.'
        )
      );
    };
  };
})(window.MP);
