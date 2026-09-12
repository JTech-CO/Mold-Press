(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.reset = function (props) {
    this.requestReset = () => {
      if (this.state.busy) return;
      this.setState({ modal: 'reset' }, () =>
        requestAnimationFrame(() => document.querySelector('[data-testid="reset-cancel"]')?.focus())
      );
    };
    this.cancelReset = () =>
      this.setState({ modal: null }, () =>
        document.querySelector('[data-testid="reset-project"]')?.focus()
      );
    this.resetProject = () => {
      if (this.state.busy || this.state.modal !== 'reset') return;
      M.library.save(this.state.p).catch(() => {});
      this.workspaceEpoch = (this.workspaceEpoch || 0) + 1;
      this.pressEpoch = (this.pressEpoch || 0) + 1;
      this.saveSerial++;
      for (const timer of ['saveTimer', 'pressTransition', 'collisionTimer', 'toastTimer'])
        clearTimeout(this[timer]);
      this.cycle = null;
      this.lastPress = null;
      this.pressQueue = [];
      this.cancelGizmo?.();
      this.directDrag = null;
      this.sketchBoard?.cancel();
      this.snapSource = null;
      this.dimensionSession = null;
      this.mateDragWarn = false;
      this.machineCache = null;
      this.pressRig = null;
      this.sceneCache = '';
      this.analysisCache.clear();
      this.edgeCache.clear();
      M.toolCache.clear();
      this.undoStack = [];
      this.redoStack = [];
      if (this.state.exportFile) URL.revokeObjectURL(this.state.exportFile.url);
      const project = M.newProject('new');
      project.parting = { axis: 'Z', position: 0 };
      project.updated = new Date().toISOString();
      let storageError = false;
      try {
        localStorage.setItem(M.STORAGE, 'J' + JSON.stringify(project));
      } catch {
        storageError = true;
      }
      // A clone hash must not resurrect the old project on the next reload.
      if (location.hash.startsWith('#copy=')) {
        try {
          history.replaceState(null, '', location.href.split('#')[0]);
        } catch {
          location.hash = '';
        }
      }
      const defaults = JSON.parse(JSON.stringify(this.resetDefaults));
      this.setState(
        {
          ...defaults,
          p: project,
          lang: this.state.lang,
          engine: this.state.engine,
          save: storageError ? 'error' : 'saved',
          logs: [
            {
              name: this.t('전체 진행상황 초기화', 'Entire project reset'),
              time: new Date().toLocaleTimeString()
            }
          ]
        },
        () => {
          this.view.view('iso');
          this.view.fit([]);
          this.refreshScene();
          this.notice(
            storageError
              ? this.t(
                  '현재 작업은 초기화했습니다. 저장소 권한이 없어 새로고침 후의 복원 상태는 보장할 수 없습니다.',
                  'Workspace reset. Storage is unavailable, so persistence after reload cannot be guaranteed.'
                )
              : this.t(
                  '모델링·금형·프레스·조립을 모두 초기화했습니다.',
                  'Modeling, tooling, press and assembly have been reset.'
                )
          );
          document.querySelector('[data-testid="reset-project"]')?.focus();
        }
      );
    };
  };
})(window.MP);
