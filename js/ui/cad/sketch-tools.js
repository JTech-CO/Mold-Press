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
  function renderSketchTools(a) {
    const s = a.state,
      sk = a.currentSketch();
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'section',
        null,
        React.createElement(
          'div',
          { className: 'section-title' },
          a.t('2D 스케치 도구', '2D SKETCH TOOLS')
        ),
        React.createElement(
          'div',
          { className: 'sketch-tool-grid' },
          tools.map(([id, icon, ko, en]) =>
            button(
              a,
              'sketch-tool-' + id,
              ko,
              en,
              () => {
                a.sketchBoard?.cancel();
                a.setState({ skTool: id });
              },
              {
                key: id,
                className: 'btn ' + (s.skTool === id ? 'active' : ''),
                title: icon + ' ' + a.t(ko, en)
              }
            )
          )
        ),
        React.createElement(
          Field,
          { a: a, label: '\uD544\uB81B R / \uCC54\uD37C \uAC70\uB9AC', en: 'Fillet R / chamfer' },
          React.createElement(NumberField, {
            app: a,
            test: 'sketch-corner-size',
            value: s.skRadius,
            min: 0.01,
            max: 1000,
            onCommit: (v) => a.setState({ skRadius: v })
          })
        ),
        React.createElement(
          Field,
          { a: a, label: '\uB2E4\uAC01\uD615 \uBCC0 \uC218', en: 'Polygon sides' },
          React.createElement(NumberField, {
            app: a,
            test: 'sketch-sides',
            value: s.skSides,
            min: 3,
            max: 32,
            step: 1,
            onCommit: (v) => a.setState({ skSides: Math.round(v) })
          })
        ),
        React.createElement(
          'label',
          { className: 'check-row' },
          React.createElement('input', {
            type: 'checkbox',
            checked: s.snap,
            onChange: (e) => a.setState({ snap: e.target.checked })
          }),
          a.t('1 mm / 끝점 스냅', '1 mm / endpoint snap')
        ),
        React.createElement(
          'label',
          { className: 'check-row' },
          React.createElement('input', {
            type: 'checkbox',
            checked: s.grid,
            onChange: (e) => a.setState({ grid: e.target.checked })
          }),
          a.t('그리드', 'Grid')
        )
      ),
      React.createElement(
        'section',
        { className: 'sketch-entities' },
        React.createElement(
          'div',
          { className: 'section-title' },
          a.t('스케치 요소', 'ENTITIES'),
          React.createElement('span', null, sk?.entities.length || 0)
        ),
        sk?.entities.map((e, i) =>
          React.createElement(
            'button',
            {
              key: e.id,
              'data-testid': 'sketch-entity-' + i,
              className: e.id === s.skEntity ? 'active' : '',
              onClick: () => a.setState({ skEntity: e.id, skTool: 'select' })
            },
            i + 1,
            ' \u00B7 ',
            a.t(
              tools.find((t) => t[0] === e.type)?.[2] || '폴리라인',
              tools.find((t) => t[0] === e.type)?.[3] || 'Polyline'
            ),
            e.construction ? ' · ┄' : ''
          )
        )
      ),
      React.createElement(
        'section',
        null,
        React.createElement(
          'p',
          { className: 'tiny-text' },
          a.t(
            '닫힌 프로파일만 솔리드가 됩니다. 점과 보조선은 항상 제외됩니다. 휠: 확대 · 우클릭 드래그: 이동 · Esc: 선 그리기 종료.',
            'Only closed profiles form solids. Points and construction lines are excluded. Wheel: zoom · right-drag: pan · Esc: end chain.'
          )
        )
      )
    );
  }
  M.CadUI.renderSketchTools = renderSketchTools;
})(window.MP);
