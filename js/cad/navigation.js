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
  M.CadInstallers.navigation = function (app) {
    const oldLoadSample = app.loadSample;
    app.loadSample = (kind) => {
      app.sketchBoard?.cancel();
      app.cancelMate();
      app.setState({
        sketchMode: false,
        activeSketch: null,
        skEntity: null,
        featureDialog: null,
        featurePreview: null
      });
      oldLoadSample(kind);
    };
    const oldImport = app.import;
    app.import = (files) => {
      app.sketchBoard?.cancel();
      app.cancelMate();
      app.setState({
        sketchMode: false,
        skEntity: null,
        featureDialog: null,
        featurePreview: null
      });
      oldImport(files);
    };
    const oldChangePage = app.changePage;
    app.changePage = (page) => {
      if (app.state.sketchMode) {
        app.notice(
          app.t('스케치를 마친 후 단계를 변경하세요.', 'Finish the sketch before changing stages.')
        );
        return;
      }
      app.cancelMate();
      app.setState({ featureDialog: null, featurePreview: null });
      oldChangePage(page);
    };
  };
})(window.MP);
