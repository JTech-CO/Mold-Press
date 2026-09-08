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
  M.CadInstallers.keyboard = function (app) {
    const oldKey = app.keydown;
    app.keydown = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || app.state.modal) return;
      if (app.state.sketchMode) {
        if (e.key === 'Escape') {
          app.sketchBoard?.cancel();
          app.setState({ skTool: 'select' });
          return;
        }
        if (e.key === 'Delete') {
          e.preventDefault();
          app.removeSketchEntity();
          return;
        }
        if (e.key.toLowerCase() === 'f') {
          app.sketchBoard?.fit();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
          oldKey(e);
          return;
        }
        return;
      }
      if (e.key === 'Escape' && app.state.mateActive) {
        app.cancelMate();
        return;
      }
      oldKey(e);
    };
    app.reconcileCad = () => {
      const s = app.state,
        patch = {};
      if (s.activeSketch && !s.p.sketches.some((sk) => sk.id === s.activeSketch)) {
        patch.activeSketch = null;
        patch.sketchMode = false;
        patch.skEntity = null;
      }
      if (s.sketchMode && !app.currentSketch()) {
        patch.sketchMode = false;
        patch.skEntity = null;
      }
      if (s.featureDialog && !s.p.sketches.some((sk) => sk.id === s.featureDialog.sketchId)) {
        patch.featureDialog = null;
        patch.featurePreview = null;
      }
      if (s.mateRef && !s.p.assembly.some((b) => b.id === s.mateRef.bodyId)) {
        patch.mateRef = null;
        patch.mateActive = false;
        patch.snapMode = null;
      }
      if (Object.keys(patch).length) app.setState(patch);
    };
  };
})(window.MP);
