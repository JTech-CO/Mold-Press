(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.transforms = function (props) {
    this.directDragStart = (hit, event) => {
      const s = this.state,
        rotating = s.mode === 'rotate',
        model = s.page === 'studio',
        assembly = s.page === 'assembly';
      if ((!model && !assembly) || s.running || s.busy || s.snapMode || s.dimEdit) return false;
      if (
        rotating === false &&
        (!model || !['select', 'translate'].includes(s.mode) || event.shiftKey)
      )
        return false;
      const listKey = assembly ? 'assembly' : 'bodies',
        body = s.p[listKey].find((x) => x.id === hit.id);
      if (!body) return false;
      const ids = s.selected.includes(hit.id)
          ? s.selected.slice()
          : body.group
            ? s.p[listKey].filter((x) => x.group === body.group).map((x) => x.id)
            : [hit.id],
        cam = this.view.camera();
      const axis = cam.forward.map(Math.abs).indexOf(Math.max(...cam.forward.map(Math.abs)));
      this.directDrag = {
        original: s.p,
        ids,
        listKey,
        mode: rotating ? 'rotate' : 'translate',
        axis,
        right: cam.right,
        up: cam.up,
        factor: cam.viewH / this.view.h,
        changed: false
      };
      return true;
    };
    this.directDragMove = (dx, dy, event) => {
      const d = this.directDrag;
      if (!d) return;
      let delta = V.add(V.mul(d.right, dx * d.factor), V.mul(d.up, -dy * d.factor));
      if (this.state.snap) delta = delta.map(Math.round);
      const p = JSON.parse(JSON.stringify(d.original));
      let changed = false;
      for (const b of p[d.listKey].filter((x) => d.ids.includes(x.id))) {
        if (d.mode === 'rotate') {
          const value = M.rotationDrag(b.rot[d.axis], dx - dy, !!event.shiftKey, this.state.snap);
          changed = changed || Math.abs(b.rot[d.axis] - value) > 1e-8;
          b.rot[d.axis] = value;
        } else {
          b.pos = V.add(b.pos, delta);
          changed = changed || V.len(delta) > 1e-8;
        }
        if (changed) {
          b.tool = null;
          if (d.listKey === 'bodies')
            b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
        }
      }
      if (d.listKey === 'assembly' && !this.solveDrag(p)) return;
      d.changed = changed;
      this.setState({ p: changed ? p : d.original, selected: d.ids, explode: 0 });
    };
    this.directDragEnd = (cancel) => {
      const d = this.directDrag;
      if (!d) return;
      this.directDrag = null;
      if (cancel || !d.changed) {
        if (this.state.p !== d.original) this.setState({ p: d.original });
        return;
      }
      this.undoStack.push(d.original);
      if (this.undoStack.length > 24) this.undoStack.shift();
      this.redoStack = [];
      this.setState({
        p: { ...this.state.p, updated: new Date().toISOString() },
        undoCount: this.undoStack.length,
        redoCount: 0
      });
      this.log(
        d.mode === 'rotate'
          ? this.t('드래그 회전', 'Drag rotation')
          : this.t('도형 드래그 이동', 'Drag body')
      );
    };
    this.gizmoStart = (e, k) => {
      const s = this.state;
      if (
        s.running ||
        s.busy ||
        !s.selected.length ||
        s.dimEdit ||
        this.gizmoDrag ||
        !['studio', 'assembly'].includes(s.page)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      const original = s.p,
        ids = s.selected.slice(),
        listKey = s.page === 'assembly' ? 'assembly' : 'bodies',
        cam = this.view.camera(),
        bb = M.bounds(M.world(this.active())),
        c = cam.project(bb.center),
        end = bb.center.slice();
      end[k] += 10;
      const q = cam.project(end),
        axis = [q.x - c.x, q.y - c.y],
        norm = Math.max(1, Math.hypot(...axis)),
        start = [e.clientX, e.clientY],
        mode = s.mode,
        pointerId = e.pointerId;
      const drag = (this.gizmoDrag = { original, changed: false });
      const move = (ev) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - start[0],
          dy = ev.clientY - start[1],
          p = JSON.parse(JSON.stringify(original)),
          delta = ((dx * axis[0] + dy * axis[1]) / (norm * norm)) * 10;
        let changed = false;
        for (const b of p[listKey].filter((x) => ids.includes(x.id))) {
          const before = [...b.pos, ...b.rot, ...b.scale];
          if (mode === 'translate') b.pos[k] += this.state.snap ? Math.round(delta) : delta;
          else if (mode === 'rotate')
            b.rot[k] = M.rotationDrag(b.rot[k], dx - dy, ev.shiftKey, this.state.snap);
          else if (mode === 'scale') b.scale[k] *= Math.max(0.05, 1 + delta / 25);
          const touched = before.some(
            (v, i) => Math.abs(v - [...b.pos, ...b.rot, ...b.scale][i]) > 1e-8
          );
          changed = changed || touched;
          if (touched) {
            b.tool = null;
            if (listKey === 'bodies')
              b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
          }
        }
        if (listKey === 'assembly' && !this.solveDrag(p)) return;
        drag.changed = changed;
        this.setState({ p: changed ? p : original, explode: 0 });
      };
      const finish = (ev, cancel = false) => {
        if (ev && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', abort);
        this.gizmoDrag = null;
        this.cancelGizmo = null;
        if (cancel || !drag.changed) {
          if (this.state.p !== original) this.setState({ p: original });
          return;
        }
        this.undoStack.push(original);
        if (this.undoStack.length > 24) this.undoStack.shift();
        this.redoStack = [];
        this.setState({
          p: { ...this.state.p, updated: new Date().toISOString() },
          undoCount: this.undoStack.length,
          redoCount: 0
        });
        this.log(this.t('기즈모 변형', 'Gizmo transform'));
      };
      const up = (ev) => finish(ev),
        abort = (ev) => finish(ev, true);
      this.cancelGizmo = () => finish(null, true);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', abort);
    };
    this.updateBody = (field, k, value) => {
      if (!Number.isFinite(value)) return;
      const id = this.active()?.id;
      if (!id) return;
      this.edit(this.t('변형 편집', 'Edit transform'), (p) => {
        const list = this.state.page === 'assembly' ? p.assembly : p.bodies,
          b = list.find((x) => x.id === id);
        b[field][k] =
          field === 'scale'
            ? Math.max(0.01, Math.min(100, value))
            : Math.max(-10000, Math.min(10000, value));
        b.tool = null;
        if (this.state.page !== 'assembly')
          b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
      });
    };
    this.align = () => {
      const s = this.state;
      if (!['studio', 'assembly'].includes(s.page) || s.running || s.busy) return;
      const assembly = s.page === 'assembly',
        key = assembly ? 'assembly' : 'bodies',
        axis = assembly ? s.assemblyAlignAxis : s.alignAxis,
        mode = assembly ? s.assemblyAlignMode : s.alignMode,
        ref = assembly ? s.assemblyAlignReference : s.alignReference;
      if (assembly && axis !== 'mate' && ref === 'first' && s.selected.length < 2) {
        this.notice(
          this.t(
            '기준 부품을 먼저 선택하고 Shift+클릭으로 이동할 부품을 추가 선택하세요.',
            'Select the reference part first, then Shift-click the moving part.'
          )
        );
        return;
      }
      if (
        assembly &&
        axis === 'mate' &&
        !s.selected.some((id) => {
          const mate = s.p.assembly.find((b) => b.id === id)?.mate;
          return mate && s.p.assembly.some((b) => b.id === mate.targetId);
        })
      ) {
        this.notice(
          this.t(
            '스냅한 이동 부품을 선택하세요. 이전 프로젝트는 XY/YZ/XZ 또는 축 정렬을 사용하세요.',
            'Select the snapped moving part. For older projects, use XY/YZ/XZ or axis alignment.'
          )
        );
        return;
      }
      const changes =
        assembly && axis === 'mate'
          ? M.alignMating(s.p.assembly, s.selected, mode)
          : M.alignBounds(s.p[key], s.selected, axis, mode, ref);
      if (!changes.length) {
        this.notice(
          this.t('선택한 기준으로 이미 정렬되어 있습니다.', 'Already aligned to this reference.')
        );
        return;
      }
      this.snapSource = null;
      this.edit(
        this.t('외곽 기준 정렬', 'Align by world bounds'),
        (p) => {
          for (const { id, delta } of changes) {
            const b = p[key].find((x) => x.id === id);
            b.pos = V.add(b.pos, delta);
            if (!assembly) {
              b.tool = null;
              b.home = { pos: b.pos.slice(), rot: b.rot.slice(), scale: b.scale.slice() };
            }
          }
        },
        assembly ? { explode: 0, snapMode: null } : {}
      );
    };
  };
})(window.MP);
