(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  class App extends R.Component {
    constructor(props) {
      super(props);
      M.AppActions.state.call(this, props);
      M.AppActions.history.call(this, props);
      M.AppActions.selection.call(this, props);
      M.AppActions.scene.call(this, props);
      M.AppActions.dimensions.call(this, props);
      M.AppActions.transforms.call(this, props);
      M.AppActions.modeling.call(this, props);
      M.AppActions.tooling.call(this, props);
      M.AppActions.press.call(this, props);
      M.AppActions.playback.call(this, props);
      M.AppActions.assembly.call(this, props);
      M.AppActions.files.call(this, props);
      M.AppActions.share.call(this, props);
      M.AppActions.reset.call(this, props);
      this.state = {
        p: props.project,
        lang: 'ko',
        page: 'studio',
        selected: props.project.bodies.slice(0, 1).map((b) => b.id),
        mode: 'select',
        grid: true,
        snap: true,
        dims: true,
        parting: false,
        save: 'saved',
        engine: 'WebGL',
        quality: 'standard',
        pcTransparent: false,
        componentLabels: false,
        busy: false,
        toast: props.error || '',
        modal: null,
        exportScope: 'all',
        speed: 4,
        running: false,
        pressPaused: false,
        pressReplay: false,
        progress: 0,
        phase: 0,
        queueIndex: 0,
        queueTotal: 0,
        explode: 0,
        show: 'products',
        xray: false,
        toolGap: 18,
        sectionEnabled: false,
        sectionAxis: 'X',
        sectionPosition: 50,
        sectionReverse: false,
        sectionError: false,
        hideProduct: false,
        hidden: [],
        measure: [],
        alignAxis: 'XYZ',
        text: 'MP',
        textSize: 9,
        textDepth: 1,
        logs: [{ name: '프로젝트 열림 / Project opened', time: new Date().toLocaleTimeString() }],
        collisions: [],
        toolRadius: 2,
        shareLink: '',
        undoCount: 0,
        redoCount: 0,
        snapMode: null,
        alignMode: 'center',
        alignReference: 'first',
        dimEdit: null,
        assemblyAlignAxis: 'XY',
        assemblyAlignMode: 'center',
        assemblyAlignReference: 'first',
        exportFile: null,
        exportError: '',
        shareError: '',
        shareBusy: false,
        pressTargetId: null
      };
      this.undoStack = [];
      this.redoStack = [];
      this.analysisCache = new Map();
      this.edgeCache = new Map();
      this.sceneCache = '';
      this.saveSerial = 0;
      this.frameN = 0;
      this.viewRef = createRef();
      this.inputRef = createRef();
      this.labelRef = createRef();
      this.gizmoRefs = {};
      this.lineRefs = {};
      this.dimensionRefs = {};
      this.dimensionInputRef = createRef();
      this.alive = true;
      this.workspaceEpoch = 0;
      M.installCadUI(this);
      this.resetDefaults = JSON.parse(
        JSON.stringify({
          ...this.state,
          p: null,
          selected: [],
          activeSketch: null,
          toast: '',
          logs: []
        })
      );
    }
    componentDidMount() {
      this.view = new M.Viewport(this.viewRef.current, {
        pick: this.pick,
        pickOverride: this.pickMateOverride,
        dragStart: this.directDragStart,
        dragMove: this.directDragMove,
        dragEnd: this.directDragEnd,
        frame: this.onFrame,
        beforeFrame: this.advancePress,
        afterFrame: this.afterPressFrame,
        engine: (name) => {
          if (this.alive && name !== this.state.engine) this.setState({ engine: name });
        }
      });
      this.view.fit(this.state.p.bodies);
      this.refreshScene();
      window.addEventListener('keydown', this.keydown);
      window.addEventListener('pagehide', this.emergencySave);
      window.MoldPress = {
        app: this,
        getProject: () => JSON.parse(JSON.stringify(this.state.p)),
        kernel: M
      };
      this.scheduleSave();
      if (this.state.toast) this.toastTimer = setTimeout(() => this.setState({ toast: '' }), 12000);
    }
    componentDidUpdate(prevProps, prev) {
      this.reconcileCad?.();
      if (prev.p.id !== this.state.p.id) {
        this.lastPress = null;
        if (this.state.running) this.stopPress();
      }
      if (prev.lang !== this.state.lang) document.documentElement.lang = this.state.lang;
      if (this.state.page === 'press' && !this.state.running) {
        const target = this.pressTarget();
        if (
          this.state.pressTargetId !== (target?.id || null) ||
          this.state.selected.length !== (target ? 1 : 0) ||
          this.state.selected[0] !== target?.id
        ) {
          this.setState({ pressTargetId: target?.id || null, selected: target ? [target.id] : [] });
        }
      }
      if (
        (prev.p !== this.state.p || prev.exportScope !== this.state.exportScope) &&
        this.state.exportFile
      ) {
        URL.revokeObjectURL(this.state.exportFile.url);
        this.setState({ exportFile: null, exportError: '' });
      }
      if (prev.p !== this.state.p) {
        if (!this.directDrag && !this.gizmoDrag) this.scheduleSave();
        this.refreshScene();
        if (this.state.page === 'assembly') this.checkCollisions();
      } else if (
        [
          'page',
          'selected',
          'explode',
          'show',
          'xray',
          'toolGap',
          'sectionEnabled',
          'sectionAxis',
          'sectionPosition',
          'sectionReverse',
          'hidden',
          'hideProduct',
          'parting',
          'grid',
          'quality',
          'pcTransparent',
          'measure',
          'running',
          'sketchMode',
          'activeSketch',
          'featurePreview',
          'mateRef',
          'mateActive'
        ].some((k) => prev[k] !== this.state[k])
      )
        this.refreshScene();
      if (prev.page !== this.state.page) {
        this.setState({ snapMode: null, measure: [], mode: 'select' });
        if (this.state.page === 'press') {
          this.view.view('iso');
          this.fitView();
        } else if (this.state.page === 'tooling') {
          const b = this.active();
          if (b) {
            this.view.target = M.bounds(M.world(b)).center;
            this.view.viewH = Math.max(150, Math.max(...M.bounds(M.world(b)).size) * 1.7);
          }
        } else {
          this.view.fit(this.list());
          this.view.view('iso');
        }
      }
    }
    componentWillUnmount() {
      if (this.state.exportFile) URL.revokeObjectURL(this.state.exportFile.url);
      this.cancelGizmo?.();
      this.alive = false;
      this.view?.dispose();
      window.removeEventListener('keydown', this.keydown);
      window.removeEventListener('pagehide', this.emergencySave);
      clearTimeout(this.saveTimer);
      clearTimeout(this.pressTransition);
      this.pressEpoch = (this.pressEpoch || 0) + 1;
      this.cycle = null;
    }
  }
  Object.assign(App.prototype, M.AppViews);
  M.App = App;
})(window.MP);
