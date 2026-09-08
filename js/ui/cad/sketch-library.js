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
  function renderSketchLibrary(a) {
    const s = a.state;
    return React.createElement(
      'section',
      { className: 'cad-library', 'data-testid': 'sketch-library' },
      React.createElement(
        'div',
        { className: 'section-title' },
        a.t('스케치 기반 모델링', 'SKETCH MODELING')
      ),
      React.createElement(
        'div',
        { className: 'cad-plane-row' },
        React.createElement(
          'select',
          {
            'aria-label': 'Sketch plane',
            'data-testid': 'sketch-plane',
            value: s.skPlane,
            onChange: (e) => a.setState({ skPlane: e.target.value })
          },
          ['XY', 'XZ', 'YZ'].map((p) => React.createElement('option', { key: p }, p))
        ),
        React.createElement(NumberField, {
          app: a,
          test: 'sketch-offset',
          label: 'Plane offset (mm)',
          value: s.skOffset,
          min: -10000,
          max: 10000,
          onCommit: (v) => a.setState({ skOffset: v })
        }),
        React.createElement('small', null, 'mm')
      ),
      button(a, 'new-sketch', '+ 2D 스케치', '+ 2D sketch', () => a.startSketch(), {
        className: 'btn primary full'
      }),
      React.createElement(
        'div',
        { className: 'sketch-list' },
        s.p.sketches.map((sk, i) =>
          React.createElement(
            'div',
            { key: sk.id, className: 'sketch-row ' + (sk.id === s.activeSketch ? 'active' : '') },
            React.createElement(
              'button',
              {
                'data-testid': 'select-sketch-' + i,
                onClick: () => a.setState({ activeSketch: sk.id }),
                onDoubleClick: () => a.startSketch(sk.id),
                title: sk.name
              },
              sk.name,
              sk.dirty ? ' *' : '',
              React.createElement('small', null, sk.plane, ' \u00B7 ', sk.offset, ' mm')
            ),
            React.createElement(
              'button',
              {
                'data-testid': 'edit-sketch-' + i,
                title: a.t('스케치 편집', 'Edit sketch'),
                onClick: () => a.startSketch(sk.id)
              },
              '\u270E'
            ),
            React.createElement(
              'button',
              {
                title: a.t('스케치 표시', 'Sketch visibility'),
                'data-testid': 'show-sketch-' + i,
                onClick: () =>
                  a.edit('Sketch visibility', (p) => {
                    p.sketches.find((x) => x.id === sk.id).visible = sk.visible === false;
                  })
              },
              sk.visible === false ? '○' : '●'
            ),
            React.createElement(
              'button',
              {
                'data-testid': 'delete-sketch-' + i,
                title: a.t('스케치 삭제', 'Delete sketch'),
                onClick: () => a.deleteSketch(sk.id)
              },
              '\u00D7'
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'cad-feature-buttons' },
        featureTypes.map(([key, ko, en]) =>
          button(a, 'feature-' + key, ko, en, () => a.openFeature(key), {
            key,
            disabled: !s.p.sketches.length
          })
        )
      ),
      s.p.features.length > 0 &&
        React.createElement(
          'div',
          { className: 'feature-history' },
          React.createElement(
            'div',
            { className: 'section-title' },
            a.t('스케치 피처', 'SKETCH FEATURES')
          ),
          s.p.features.map((f, i) =>
            React.createElement(
              'button',
              {
                key: f.id,
                'data-testid': 'edit-feature-' + i,
                onClick: () => a.openFeature(f.type, f.id)
              },
              String(i + 1).padStart(2, '0'),
              ' \u00B7 ',
              f.name,
              React.createElement('small', null, a.t('수치 편집', 'Edit parameters'))
            )
          )
        ),
      React.createElement(
        'p',
        { className: 'tiny-text' },
        a.t(
          '2D 스케치 → 피처. 아래 3D 직접 모델링도 그대로 사용합니다.',
          '2D sketch → feature. Direct 3D modeling remains available below.'
        )
      )
    );
  }
  M.CadUI.renderSketchLibrary = renderSketchLibrary;
})(window.MP);
