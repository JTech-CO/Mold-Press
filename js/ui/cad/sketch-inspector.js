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
  function renderSketchInspector(a) {
    const s = a.state,
      sk = a.currentSketch(),
      e = sk?.entities.find((x) => x.id === s.skEntity),
      change = (fn) => {
        const q = C(e);
        fn(q);
        a.replaceSketchEntity(q);
      },
      points = e ? entityPoints(e) : [];
    let closed = '';
    try {
      const rings = S.profile(sk);
      closed = a.t('닫힌 영역 ', 'Closed regions: ') + rings.length;
    } catch (x) {
      closed = x.message;
    }
    return React.createElement(
      'aside',
      { className: 'inspector cad-inspector' },
      React.createElement(
        'div',
        { className: 'panel-heading' },
        a.t('스케치 인스펙터', 'SKETCH INSPECTOR')
      ),
      React.createElement(
        'section',
        null,
        React.createElement('input', {
          className: 'full',
          'aria-label': 'Sketch name',
          value: sk?.name || '',
          onChange: (ev) => a.editSketch('Rename sketch', (q) => (q.name = ev.target.value))
        }),
        React.createElement(
          Field,
          { a: a, label: '\uD3C9\uBA74 \uC624\uD504\uC14B (mm)', en: 'Plane offset (mm)' },
          React.createElement(NumberField, {
            app: a,
            test: 'edit-sketch-offset',
            value: sk?.offset || 0,
            min: -10000,
            max: 10000,
            onCommit: (v) => a.editSketch('Plane offset', (q) => (q.offset = v))
          })
        ),
        React.createElement(
          'div',
          { className: 'check-note', 'data-testid': 'sketch-profile-status' },
          closed
        )
      ),
      !e
        ? React.createElement(
            'section',
            null,
            React.createElement(
              'p',
              { className: 'muted' },
              a.t(
                '요소를 선택하면 좌표·반지름·제어점을 정확한 mm로 편집합니다.',
                'Select an entity to edit coordinates, radius, and control points in mm.'
              )
            )
          )
        : React.createElement(
            'section',
            null,
            React.createElement('div', { className: 'section-title' }, e.type.toUpperCase()),
            React.createElement(
              'label',
              { className: 'check-row' },
              React.createElement('input', {
                type: 'checkbox',
                'data-testid': 'entity-construction',
                checked: !!e.construction || e.type === 'point',
                disabled: e.type === 'point',
                onChange: (ev) => change((q) => (q.construction = ev.target.checked))
              }),
              a.t('보조 형상 (솔리드에서 제외)', 'Construction (excluded from solids)')
            ),
            points.map((p, i) =>
              React.createElement(
                'div',
                { className: 'cad-point-row', key: i },
                React.createElement(
                  'span',
                  null,
                  e.type === 'bezier' ? ['P0', 'C1', 'C2', 'P3'][i] : 'P' + i
                ),
                [0, 1].map((k) =>
                  React.createElement(NumberField, {
                    key: k,
                    app: a,
                    test: 'entity-point-' + i + '-' + k,
                    label: 'Point ' + i + ' ' + ['U', 'V'][k] + ' mm',
                    value: f2(p[k]),
                    min: -10000,
                    max: 10000,
                    onCommit: (v) =>
                      change((q) => {
                        if (q.point) q.point[k] = v;
                        else if (q.center) q.center[k] = v;
                        else q.points[i][k] = v;
                      })
                  })
                )
              )
            ),
            ['radius', 'rx', 'ry']
              .filter((k) => e[k] != null)
              .map((k) =>
                React.createElement(
                  Field,
                  { key: k, a: a, label: k + ' (mm)' },
                  React.createElement(NumberField, {
                    app: a,
                    test: 'entity-' + k,
                    value: f2(e[k]),
                    min: 0.01,
                    max: 10000,
                    onCommit: (v) => change((q) => (q[k] = v))
                  })
                )
              ),
            e.type === 'rectangle' &&
              ['width', 'height'].map((key, k) =>
                React.createElement(
                  Field,
                  { key: key, a: a, label: k ? '높이 (mm)' : '너비 (mm)', en: key + ' (mm)' },
                  React.createElement(NumberField, {
                    app: a,
                    test: 'entity-' + key,
                    value: Math.abs(e.points[1][k] - e.points[0][k]),
                    min: 0.01,
                    max: 10000,
                    onCommit: (v) =>
                      change(
                        (q) =>
                          (q.points[1][k] =
                            q.points[0][k] + v * Math.sign(q.points[1][k] - q.points[0][k] || 1))
                      )
                  })
                )
              ),
            e.type === 'line' &&
              React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  Field,
                  { a: a, label: '\uAE38\uC774 (mm)', en: 'Length (mm)' },
                  React.createElement(NumberField, {
                    app: a,
                    test: 'entity-length',
                    value: Math.hypot(
                      e.points[1][0] - e.points[0][0],
                      e.points[1][1] - e.points[0][1]
                    ),
                    min: 0.01,
                    max: 10000,
                    onCommit: (v) =>
                      change((q) => {
                        const d = [
                            q.points[1][0] - q.points[0][0],
                            q.points[1][1] - q.points[0][1]
                          ],
                          n = Math.hypot(...d) || 1;
                        q.points[1] = q.points[0].map((p, i) => p + (d[i] * v) / n);
                      })
                  })
                ),
                React.createElement(
                  Field,
                  { a: a, label: '\uBC29\uD5A5 (\u00B0)', en: 'Direction (\u00B0)' },
                  React.createElement(NumberField, {
                    app: a,
                    test: 'entity-direction',
                    value:
                      (Math.atan2(
                        e.points[1][1] - e.points[0][1],
                        e.points[1][0] - e.points[0][0]
                      ) *
                        180) /
                      Math.PI,
                    min: -360,
                    max: 360,
                    onCommit: (v) =>
                      change((q) => {
                        const n = Math.hypot(
                          q.points[1][0] - q.points[0][0],
                          q.points[1][1] - q.points[0][1]
                        );
                        q.points[1] = [
                          q.points[0][0] + n * Math.cos((v * Math.PI) / 180),
                          q.points[0][1] + n * Math.sin((v * Math.PI) / 180)
                        ];
                      })
                  })
                )
              ),
            e.type === 'arc' &&
              React.createElement(
                Field,
                { a: a, label: '\uC6D0\uD638\uAC01 (\u00B0)', en: 'Arc sweep (\u00B0)' },
                React.createElement(NumberField, {
                  app: a,
                  test: 'entity-arc-angle',
                  value: (e.sweep * 180) / Math.PI,
                  min: -359.99,
                  max: 359.99,
                  onCommit: (v) => change((q) => (q.sweep = (v * Math.PI) / 180))
                })
              ),
            e.type === 'polygon' &&
              React.createElement(
                Field,
                { a: a, label: '\uBCC0 \uC218', en: 'Sides' },
                React.createElement(NumberField, {
                  app: a,
                  test: 'entity-sides',
                  value: e.sides || 6,
                  min: 3,
                  max: 32,
                  onCommit: (v) => change((q) => (q.sides = Math.round(v)))
                })
              ),
            e.type === 'bezier' &&
              React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  'p',
                  { className: 'tiny-text' },
                  a.t(
                    'C1/C2를 드래그하거나 좌표를 입력해 접선 방향과 곡률을 조정합니다.',
                    'Drag or edit C1/C2 to set tangent direction and curvature.'
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'analysis-line' },
                  React.createElement('span', null, '\u03BA(t=0.5)'),
                  React.createElement('strong', null, S.curvature(e).toFixed(5), ' mm\u207B\u00B9')
                )
              ),
            e.corners &&
              Object.entries(e.corners).map(([index, c]) =>
                React.createElement(
                  Field,
                  { key: index, a: a, label: 'V' + index + ' · ' + c.type + ' (mm)' },
                  React.createElement(NumberField, {
                    app: a,
                    test: 'corner-' + index,
                    value: c.radius,
                    min: 0.01,
                    max: 1000,
                    onCommit: (v) =>
                      change((q) => {
                        q.corners[index].radius = v;
                        S.sample(q);
                      })
                  })
                )
              ),
            button(
              a,
              'delete-sketch-entity',
              '선택 요소 삭제',
              'Delete entity',
              a.removeSketchEntity,
              { className: 'btn full' }
            )
          ),
      React.createElement(
        'section',
        null,
        React.createElement(
          'p',
          { className: 'tiny-text' },
          a.t(
            '좌표 기반 스케치입니다. 형상 변경은 “스케치 마침”에서 연결된 피처에 재적용됩니다.',
            'Coordinate-based sketches. Finish Sketch rebuilds linked features.'
          )
        )
      )
    );
  }
  M.CadUI.renderSketchInspector = renderSketchInspector;
})(window.MP);
