(function (M) {
  'use strict';
  M.AppActions.playback = function () {
    this.lastPress = null;
    this.togglePressPause = () => {
      const c = this.cycle;
      if (!c || !this.state.running || this.state.modal) return;
      if (c.replay && c.progress === 1 && this.state.pressPaused) {
        c.elapsed = 0;
        c.progress = 0;
        c.presentFinal = false;
        c.completing = false;
        this.applyPressMotion(0, true);
      }
      c.lastTime = null;
      this.setState({
        pressPaused: !this.state.pressPaused,
        progress: c.progress,
        phase: M.pressMotion(c.progress).phase
      });
    };
    this.stepPress = () => {
      const c = this.cycle;
      if (!c || !this.state.running || c.completing || this.state.modal) return;
      const next = [0.34, 0.5, 0.72, 0.88, 1].find((x) => x > c.progress + 1e-6) ?? 1;
      c.progress = next;
      c.elapsed = c.duration * next;
      c.lastTime = null;
      c.manualFinal = next === 1;
      c.presentFinal = next === 1;
      this.applyPressMotion(next, true);
      this.setState({ pressPaused: true, progress: next, phase: M.pressMotion(next).phase });
    };
    this.startReplay = () => {
      if (!this.lastPress || this.state.running || this.state.busy || this.state.modal) return;
      clearTimeout(this.pressTransition);
      this.pressEpoch = (this.pressEpoch || 0) + 1;
      const body = JSON.parse(JSON.stringify(this.lastPress));
      this.pressQueue = [];
      this.cycle = {
        body,
        epoch: this.pressEpoch,
        replay: true,
        duration: (M.materials[body.material].cycle / this.state.speed) * 1000,
        elapsed: 0,
        progress: 0,
        lastTime: null,
        uiTime: 0,
        completing: false
      };
      this.setState(
        {
          page: 'press',
          selected: [body.id],
          running: true,
          pressReplay: true,
          pressPaused: true,
          progress: 0,
          phase: 0,
          queueIndex: 0,
          queueTotal: 0
        },
        () => this.refreshScene()
      );
    };
    this.seekReplay = (percent) => {
      const c = this.cycle;
      if (!c?.replay || !Number.isFinite(percent) || this.state.modal) return;
      const progress = Math.max(0, Math.min(1, percent / 100));
      c.progress = progress;
      c.elapsed = c.duration * progress;
      c.lastTime = null;
      c.presentFinal = false;
      c.completing = false;
      this.applyPressMotion(progress, true);
      this.setState({ pressPaused: true, progress, phase: M.pressMotion(progress).phase });
    };
  };
})(window.MP);
