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
  M.CadInstallers.views = function (app) {
    const oldLeft = app.renderStudioLeft.bind(app),
      oldInspector = app.renderInspector.bind(app);
    app.renderSketchBoard = () =>
      app.state.page === 'studio' && app.state.sketchMode && app.currentSketch()
        ? React.createElement(SketchBoard, { key: app.state.activeSketch, app: app })
        : null;
    app.renderStudioLeft = () =>
      app.state.sketchMode
        ? renderSketchTools(app)
        : React.createElement(React.Fragment, null, renderSketchLibrary(app), oldLeft());
    app.renderInspector = () =>
      app.state.page === 'studio' && app.state.sketchMode
        ? renderSketchInspector(app)
        : app.state.page === 'studio' && app.state.featureDialog
          ? renderFeatureInspector(app)
          : oldInspector();
    app.renderMateTools = () => renderMateTools(app);
    app.renderMateHint = () =>
      app.state.mateActive
        ? React.createElement(
            'div',
            { className: 'mate-prompt', 'data-testid': 'mate-prompt' },
            React.createElement(
              'strong',
              null,
              app.state.mateRef
                ? app.t('02 · 이동할 면 선택', '02 · Select moving face')
                : app.t('01 · 기준 면 선택', '01 · Select reference face')
            ),
            React.createElement(
              'span',
              null,
              app.t(
                '첫 부품 고정 · 두 번째 클릭 즉시 적용',
                'First component stays · second click applies'
              )
            ),
            React.createElement(
              'label',
              null,
              React.createElement('input', {
                type: 'checkbox',
                'data-testid': 'mate-back-face',
                checked: app.state.mateBack,
                onChange: (e) => app.setState({ mateBack: e.target.checked })
              }),
              app.t('뒷면 선택 (아랫면)', 'Back face (underside)')
            ),
            button(app, 'mate-cancel', '취소', 'Cancel', app.cancelMate)
          )
        : null;
  };
})(window.MP);
