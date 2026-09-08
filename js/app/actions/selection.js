(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.selection = function (props) {
    this.pick = (hit, multi) => {
      if (!hit) return;
      if (this.state.mode === 'measure') {
        const points = this.state.measure.length === 2 ? [] : this.state.measure.slice();
        points.push(hit.point);
        this.setState({ measure: points });
        return;
      }
      if (this.state.snapMode && hit.id) {
        if (!this.snapSource) {
          this.snapSource = hit;
          this.notice(this.t('맞물릴 대상 면을 클릭하세요.', 'Click the target mating face.'));
        } else {
          this.applyFaceSnap(this.snapSource, hit, this.state.snapMode);
          this.snapSource = null;
          this.setState({ snapMode: null });
        }
        return;
      }
      this.select(hit.id, multi);
    };
    this.keydown = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || this.state.modal) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? this.redo() : this.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.duplicate();
      } else if (e.key === 'Delete') this.remove();
      else if (e.key.toLowerCase() === 'f') this.fitView();
      else if (['g', 'r', 's', 'm', 'v'].includes(e.key.toLowerCase()))
        this.setState({
          mode: { g: 'translate', r: 'rotate', s: 'scale', m: 'measure', v: 'select' }[
            e.key.toLowerCase()
          ]
        });
      else if (e.key === 'Escape') {
        this.snapSource = null;
        this.setState({ snapMode: null, mode: 'select', measure: [] });
      }
    };
  };
})(window.MP);
