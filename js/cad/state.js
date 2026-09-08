(function (M) {
  'use strict';
  const {
    R,
    S,
    A,
    V,
    C,
    tools,
    featureTypes,
    f2,
    pathData,
    button,
    NumberField,
    Field,
    entityPoints,
    movedEntity
  } = M.CadUI;
  const {
    SketchBoard,
    renderSketchLibrary,
    renderSketchTools,
    renderSketchInspector,
    renderFeatureInspector,
    renderMateTools
  } = M.CadUI;
  M.CadInstallers.state = function (app) {
    const s = app.state;
    s.p.sketches = s.p.sketches || [];
    s.p.features = s.p.features || [];
    s.p.mates = s.p.mates || [];
    Object.assign(s, {
      sketchMode: false,
      activeSketch: s.p.sketches[0]?.id || null,
      skTool: 'select',
      skEntity: null,
      skPlane: 'XY',
      skOffset: 0,
      skRadius: 2,
      skSides: 6,
      featureDialog: null,
      featurePreview: null,
      mateActive: false,
      mateRef: null,
      mateMoving: null,
      mateType: 'coincident',
      mateValue: 0,
      mateAlignment: 'opposed',
      mateCenter: true,
      mateBack: false,
      mateFlip: false,
      mateBody: '',
      mateFace: '',
      cadError: ''
    });
    app.currentSketch = () => app.state.p.sketches.find((x) => x.id === app.state.activeSketch);
    const oldEdit = app.edit;
    app.edit = (name, fn, extra = {}, cadRebuild = false) => {
      let p = C(app.state.p);
      try {
        fn(p);
        p.sketches = p.sketches || [];
        p.features = p.features || [];
        p.mates = p.mates || [];
        if (!cadRebuild && p.id === app.state.p.id) {
          const detached = new Set();
          for (const b of p.bodies) {
            const old = app.state.p.bodies.find((x) => x.id === b.id);
            if (old && b.featureId && old.featureId === b.featureId && old.geo !== b.geo) {
              detached.add(b.id);
              delete b.featureId;
              delete b.featureCenter;
            }
          }
          if (detached.size) p.features = p.features.filter((f) => !detached.has(f.outputId));
        }
        A.clean(p);
        p.features = p.features.filter((f) => p.bodies.some((b) => b.id === f.outputId));
        if (p.mates.length) A.solve(p);
      } catch (e) {
        app.notice(e.message);
        app.setState({ cadError: e.message });
        return false;
      }
      app.undoStack.push(app.state.p);
      if (app.undoStack.length > 24) app.undoStack.shift();
      app.redoStack = [];
      p.updated = new Date().toISOString();
      app.setState((st) => ({
        p,
        ...extra,
        undoCount: app.undoStack.length,
        redoCount: 0,
        cadError: '',
        logs: [{ name, time: new Date().toLocaleTimeString() }, ...st.logs].slice(0, 18)
      }));
      return true;
    };
    app.solveDrag = (p) => {
      try {
        if (p.mates?.length) A.solve(p);
        return true;
      } catch (e) {
        if (!app.mateDragWarn) {
          app.mateDragWarn = true;
          app.notice(e.message);
        }
        return false;
      }
    };
  };
})(window.MP);
