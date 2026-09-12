(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.state = function (props) {
    this.t = (ko, en) => (this.state.lang === 'ko' ? ko : en);
    this.list = () =>
      this.state.page === 'assembly' ? this.state.p.assembly : this.state.p.bodies;
    this.pressTarget = () => {
      const s = this.state,
        ready = s.p.bodies.filter((b) => b.tool);
      return (
        ready.find((b) => b.id === s.pressTargetId) ||
        ready.find((b) => b.id === s.selected[0]) ||
        ready[0] ||
        null
      );
    };
    this.active = () =>
      (this.state.page === 'press' ? this.cycle?.body || this.pressTarget() : null) ||
      this.list().find((b) => b.id === this.state.selected[0]) ||
      this.list()[0];
    this.selectPressTool = (id) => {
      if (
        this.state.running ||
        this.state.busy ||
        !this.state.p.bodies.some((b) => b.id === id && b.tool)
      )
        return;
      this.setState({
        pressTargetId: id,
        selected: [id],
        progress: 0,
        phase: 0,
        queueIndex: 0,
        queueTotal: 0
      });
    };
    this.selectedBodies = () =>
      this.state.selected.map((id) => this.list().find((b) => b.id === id)).filter(Boolean);
    this.notice = (message) => {
      clearTimeout(this.toastTimer);
      this.setState({ toast: message });
      this.toastTimer = setTimeout(() => {
        if (this.alive) this.setState({ toast: '' });
      }, 6000);
    };
    this.log = (name) =>
      this.setState((s) => ({
        logs: [{ name, time: new Date().toLocaleTimeString() }, ...s.logs].slice(0, 18)
      }));
    this.task = (name, fn) => {
      if (this.state.busy) return;
      const operation = {};
      this.operation = operation;
      this.setState({ busy: name, jobProgress: 0, jobMode: null });
      setTimeout(async () => {
        try {
          await fn();
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error('Mold Press operation:', e);
            this.notice(e.message || String(e));
          }
        } finally {
          if (this.operation === operation) {
            this.operation = null;
            if (this.alive) this.setState({ busy: false, jobMode: null });
          }
        }
      }, 40);
    };
    this.changePage = (page) => {
      let selected = this.state.selected;
      if (page === 'assembly') selected = this.state.p.assembly.slice(0, 1).map((b) => b.id);
      else if (this.state.page === 'assembly')
        selected = this.state.p.bodies.slice(0, 1).map((b) => b.id);
      this.dimensionSession = null;
      this.setState({ page, selected, dimEdit: null });
    };
    this.select = (id, multi = false) => {
      const b = this.list().find((x) => x.id === id);
      let ids = b?.group
        ? this.list()
            .filter((x) => x.group === b.group)
            .map((x) => x.id)
        : id
          ? [id]
          : [];
      this.dimensionSession = null;
      this.setState((s) => ({
        dimEdit: null,
        selected: multi
          ? s.selected.includes(id)
            ? s.selected.filter((x) => !ids.includes(x))
            : [...new Set([...s.selected, ...ids])]
          : ids
      }));
    };
    this.toggleHidden = (key) =>
      this.setState((s) => ({
        hidden: s.hidden.includes(key) ? s.hidden.filter((x) => x !== key) : [...s.hidden, key]
      }));
  };
})(window.MP);
