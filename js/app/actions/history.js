(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.history = function (props) {
    this.emergencySave = () => {
      try {
        if (this.state.save !== 'saved')
          localStorage.setItem(M.STORAGE, 'J' + JSON.stringify(this.state.p));
      } catch {}
    };
    this.scheduleSave = () => {
      clearTimeout(this.saveTimer);
      const serial = ++this.saveSerial;
      this.setState({ save: 'saving' });
      this.saveTimer = setTimeout(async () => {
        try {
          const data = await M.compress(JSON.stringify(this.state.p));
          if (serial !== this.saveSerial) return;
          localStorage.setItem(M.STORAGE, data);
          if (this.alive) this.setState({ save: 'saved' });
        } catch (e) {
          if (this.alive && serial === this.saveSerial) {
            this.setState({ save: 'error' });
            this.notice(
              this.t(
                '브라우저 저장 실패: 저장 공간/권한을 확인하고 JSON으로 백업하세요.',
                'Browser save failed. Check storage permissions and export a JSON backup.'
              )
            );
          }
        }
      }, 450);
    };
    this.edit = (name, fn, extra = {}) => {
      this.undoStack.push(this.state.p);
      if (this.undoStack.length > 24) this.undoStack.shift();
      this.redoStack = [];
      const p = JSON.parse(JSON.stringify(this.state.p));
      fn(p);
      p.updated = new Date().toISOString();
      this.setState((s) => ({
        p,
        ...extra,
        undoCount: this.undoStack.length,
        redoCount: 0,
        logs: [{ name, time: new Date().toLocaleTimeString() }, ...s.logs].slice(0, 18)
      }));
    };
    this.undo = () => {
      if (!this.undoStack.length || this.state.running) return;
      this.redoStack.push(this.state.p);
      const p = this.undoStack.pop();
      this.setState({
        p,
        selected: [],
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length
      });
    };
    this.redo = () => {
      if (!this.redoStack.length || this.state.running) return;
      this.undoStack.push(this.state.p);
      const p = this.redoStack.pop();
      this.setState({
        p,
        selected: [],
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length
      });
    };
  };
})(window.MP);
