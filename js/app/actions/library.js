(function (M) {
  'use strict';
  M.AppActions.library = function () {
    this.refreshLibrary = async () => {
      try {
        const entries = await M.library.list();
        const estimate = await navigator.storage?.estimate?.().catch(() => null);
        if (this.alive)
          this.setState({ libraryEntries: entries, libraryError: '', storageEstimate: estimate });
      } catch (e) {
        if (this.alive)
          this.setState({
            libraryError:
              this.t(
                '보관함을 사용할 수 없습니다. JSON으로 백업하세요.',
                'Library unavailable. Export JSON for a backup.'
              ) +
              ' ' +
              e.message
          });
      }
    };
    this.saveLibrary = (copy = false) =>
      this.task(this.t('프로젝트 저장', 'Saving project'), async () => {
        const name = (this.state.libraryName ?? this.state.p.name).trim().slice(0, 120);
        if (!name) throw Error(this.t('프로젝트 이름을 입력하세요.', 'Enter a project name.'));
        const project = JSON.parse(JSON.stringify(this.state.p));
        project.name = name;
        project.updated = new Date().toISOString();
        if (copy) project.id = M.uid();
        await M.library.save(project);
        if (!copy)
          this.edit(this.t('프로젝트 이름 저장', 'Save project name'), (p) => {
            p.name = name;
          });
        await this.refreshLibrary();
        this.notice(
          this.t(
            copy ? '별도 프로젝트로 보관했습니다.' : '프로젝트를 보관했습니다.',
            copy ? 'Saved a separate project.' : 'Project saved to the library.'
          )
        );
      });
    this.openLibrary = (id, revision) =>
      this.task(this.t('저장 이력 여는 중', 'Opening saved project'), async () => {
        if (this.state.running) this.stopPress();
        const project = await M.library.read(id, revision);
        // Preserve the current workspace before replacing it, including before revision restoration.
        await M.library.save(this.state.p);
        clearTimeout(this.saveTimer);
        this.saveSerial++;
        this.workspaceEpoch++;
        clearTimeout(this.pressTransition);
        this.pressEpoch++;
        this.cycle = null;
        this.lastPress = null;
        this.pressQueue = [];
        this.cancelGizmo?.();
        this.directDrag = null;
        this.snapSource = null;
        this.dimensionSession = null;
        this.undoStack = [];
        this.redoStack = [];
        this.machineCache = null;
        project.updated = new Date().toISOString();
        if (location.hash.startsWith('#copy='))
          history.replaceState(null, '', location.href.split('#')[0]);
        const defaults = JSON.parse(JSON.stringify(this.resetDefaults));
        await new Promise((resolve) =>
          this.setState(
            {
              ...defaults,
              p: project,
              lang: this.state.lang,
              quality: this.state.quality,
              engine: this.state.engine,
              selected: project.bodies.slice(0, 1).map((b) => b.id),
              modal: null,
              busy: this.state.busy,
              save: 'saving'
            },
            resolve
          )
        );
        this.view.fit(project.bodies);
        this.notice(this.t('저장된 프로젝트를 열었습니다.', 'Saved project opened.'));
      });
    this.deleteLibrary = (id) =>
      this.task(this.t('보관 프로젝트 삭제', 'Removing saved project'), async () => {
        if (this.state.libraryDelete !== id || id === this.state.p.id) return;
        await M.library.remove(id);
        this.setState({ libraryDelete: null });
        await this.refreshLibrary();
      });
  };
})(window.MP);
