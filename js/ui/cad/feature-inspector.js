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
  function renderFeatureInspector(a) {
    const s = a.state,
      f = s.featureDialog,
      sk = s.p.sketches.find((x) => x.id === f.sketchId),
      set = (key, v) => a.featureParam(key, v);
    return React.createElement(
      'aside',
      { className: 'inspector cad-inspector' },
      React.createElement(
        'div',
        { className: 'panel-heading' },
        a.t('스케치 → 솔리드', 'SKETCH → SOLID')
      ),
      React.createElement(
        'section',
        null,
        React.createElement('h2', null, f.name),
        React.createElement(
          Field,
          { a: a, label: '\uD504\uB85C\uD30C\uC77C \uC2A4\uCF00\uCE58', en: 'Profile sketch' },
          React.createElement(
            'select',
            {
              'data-testid': 'feature-profile',
              value: f.sketchId,
              onChange: (e) => set('sketchId', e.target.value)
            },
            s.p.sketches.map((sk) =>
              React.createElement(
                'option',
                { key: sk.id, value: sk.id },
                sk.name,
                ' \u00B7 ',
                sk.plane
              )
            )
          )
        ),
        ['extrude', 'cut'].includes(f.type) &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Field,
              { a: a, label: '\uB3CC\uCD9C \uAE38\uC774 (mm)', en: 'Depth (mm)' },
              React.createElement(NumberField, {
                app: a,
                test: 'feature-depth',
                value: f.depth,
                min: -10000,
                max: 10000,
                onCommit: (v) => set('depth', v)
              })
            ),
            React.createElement(
              'label',
              { className: 'check-row' },
              React.createElement('input', {
                'data-testid': 'feature-symmetric',
                type: 'checkbox',
                checked: !!f.symmetric,
                onChange: (e) => set('symmetric', e.target.checked)
              }),
              a.t('중간 평면 / 대칭 돌출', 'Mid-plane / symmetric')
            ),
            f.type === 'cut' &&
              React.createElement(
                'label',
                { className: 'check-row' },
                React.createElement('input', {
                  type: 'checkbox',
                  'data-testid': 'feature-through',
                  checked: !!f.through,
                  onChange: (e) => set('through', e.target.checked)
                }),
                a.t('모두 관통 (양방향)', 'Through all (both directions)')
              )
          ),
        f.type === 'revolve' &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Field,
              { a: a, label: '\uD68C\uC804\uCD95', en: 'Axis' },
              React.createElement(
                'select',
                {
                  'data-testid': 'feature-axis',
                  value: f.axisEntity || f.axis,
                  onChange: (e) => {
                    const v = e.target.value;
                    a.setState({
                      featureDialog: {
                        ...f,
                        axis: v === 'U' || v === 'V' ? v : f.axis,
                        axisEntity: v === 'U' || v === 'V' ? '' : v
                      },
                      featurePreview: null
                    });
                  }
                },
                React.createElement(
                  'option',
                  { value: 'U' },
                  'U \u00B7 ',
                  a.t('가로 원점축', 'horizontal origin axis')
                ),
                React.createElement(
                  'option',
                  { value: 'V' },
                  'V \u00B7 ',
                  a.t('세로 원점축', 'vertical origin axis')
                ),
                sk?.entities
                  .filter((e) => e.type === 'line' && e.construction)
                  .map((e, i) =>
                    React.createElement(
                      'option',
                      { key: e.id, value: e.id },
                      a.t('보조선 ', 'Construction line '),
                      i + 1
                    )
                  )
              )
            ),
            React.createElement(
              Field,
              { a: a, label: '\uD68C\uC804\uAC01 (\u00B0)', en: 'Revolve (\u00B0)' },
              React.createElement(NumberField, {
                app: a,
                test: 'feature-angle',
                value: f.angle,
                min: -360,
                max: 360,
                onCommit: (v) => set('angle', v)
              })
            ),
            React.createElement(
              'p',
              { className: 'tiny-text' },
              a.t(
                '닫힌 프로파일을 축의 한쪽에 그리세요. 보조선을 축으로 사용할 수 있습니다.',
                'Draw a closed profile on one side of the axis. A construction line can be the axis.'
              )
            )
          ),
        f.type === 'sweep' &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Field,
              { a: a, label: '\uACBD\uB85C \uC2A4\uCF00\uCE58', en: 'Path sketch' },
              React.createElement(
                'select',
                {
                  'data-testid': 'feature-path',
                  value: f.pathId,
                  onChange: (e) => {
                    a.setState({
                      featureDialog: { ...f, pathId: e.target.value, pathEntity: '' },
                      featurePreview: null
                    });
                  }
                },
                React.createElement('option', { value: '' }, '-'),
                s.p.sketches.map((sk) =>
                  React.createElement(
                    'option',
                    { key: sk.id, value: sk.id },
                    sk.name,
                    ' \u00B7 ',
                    sk.plane
                  )
                )
              )
            ),
            React.createElement(
              Field,
              { a: a, label: '\uACBD\uB85C \uC694\uC18C', en: 'Path entity' },
              React.createElement(
                'select',
                {
                  'data-testid': 'feature-path-entity',
                  value: f.pathEntity || '',
                  onChange: (e) => set('pathEntity', e.target.value)
                },
                React.createElement(
                  'option',
                  { value: '' },
                  a.t('연결된 전체 열린 경로', 'Entire connected open chain')
                ),
                s.p.sketches
                  .find((sk) => sk.id === f.pathId)
                  ?.entities.filter(
                    (e) => !e.construction && ['line', 'arc', 'bezier', 'polyline'].includes(e.type)
                  )
                  .map((e, i) =>
                    React.createElement(
                      'option',
                      { key: e.id, value: e.id },
                      i + 1,
                      ' \u00B7 ',
                      e.type
                    )
                  )
              )
            ),
            React.createElement(
              'p',
              { className: 'tiny-text' },
              a.t(
                '단면 원점을 경로 시작점으로 옮기고, 단면을 경로에 수직으로 운반합니다. 열린 경로를 사용하세요.',
                'The profile origin is placed at the path start, then transported normal to the open path.'
              )
            )
          ),
        f.type === 'loft' &&
          React.createElement(
            'div',
            { className: 'loft-sections' },
            React.createElement(
              'div',
              { className: 'form-label' },
              a.t('단면 선택 (최소 2개, 선택 순서)', 'Sections (2+, selection order)')
            ),
            s.p.sketches.map((sk, i) =>
              React.createElement(
                'label',
                { key: sk.id, className: 'check-row' },
                React.createElement('input', {
                  type: 'checkbox',
                  'data-testid': 'loft-section-' + i,
                  checked: f.sections.includes(sk.id),
                  onChange: (e) =>
                    set(
                      'sections',
                      e.target.checked
                        ? [...f.sections, sk.id]
                        : f.sections.filter((id) => id !== sk.id)
                    )
                }),
                sk.name,
                ' \u00B7 ',
                sk.offset,
                ' mm'
              )
            ),
            f.sections.map((id, i) =>
              React.createElement(
                'div',
                { className: 'loft-order', key: id },
                React.createElement(
                  'span',
                  null,
                  i + 1,
                  ' \u00B7 ',
                  s.p.sketches.find((sk) => sk.id === id)?.name
                ),
                React.createElement(
                  'button',
                  {
                    className: 'icon-btn',
                    disabled: i === 0,
                    'aria-label': 'Move section up',
                    onClick: () => {
                      const ids = f.sections.slice();
                      [ids[i], ids[i - 1]] = [ids[i - 1], ids[i]];
                      set('sections', ids);
                    }
                  },
                  '\u2191'
                ),
                React.createElement(
                  'button',
                  {
                    className: 'icon-btn',
                    disabled: i === f.sections.length - 1,
                    'aria-label': 'Move section down',
                    onClick: () => {
                      const ids = f.sections.slice();
                      [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                      set('sections', ids);
                    }
                  },
                  '\u2193'
                )
              )
            ),
            React.createElement(
              'p',
              { className: 'tiny-text' },
              a.t(
                '각 단면은 구멍 없는 외곽 1개. 위치가 다른 단면 2-12개를 순서대로 연결합니다.',
                'One hole-free contour per section. Connect 2-12 separated sections in order.'
              )
            )
          ),
        React.createElement(
          Field,
          { a: a, label: '\uC791\uC5C5', en: 'Operation' },
          React.createElement(
            'select',
            {
              'data-testid': 'feature-operation',
              value: f.operation,
              disabled: f.type === 'cut' || f.editing,
              onChange: (e) => set('operation', e.target.value)
            },
            React.createElement('option', { value: 'new' }, a.t('새 바디', 'New body')),
            React.createElement('option', { value: 'join' }, a.t('합치기', 'Join')),
            React.createElement('option', { value: 'cut' }, a.t('자르기', 'Cut'))
          )
        ),
        f.operation !== 'new' &&
          React.createElement(
            Field,
            { a: a, label: '\uAE30\uC900 \uBC14\uB514', en: 'Target body' },
            React.createElement(
              'select',
              {
                'data-testid': 'feature-target',
                value: f.targetId,
                disabled: f.editing,
                onChange: (e) => set('targetId', e.target.value)
              },
              React.createElement('option', { value: '' }, '-'),
              s.p.bodies.map((b) =>
                React.createElement('option', { key: b.id, value: b.id }, b.name)
              )
            )
          ),
        s.cadError &&
          React.createElement('div', { className: 'check-note danger', role: 'alert' }, s.cadError),
        React.createElement(
          'div',
          { className: 'cad-actions' },
          button(a, 'preview-feature', '미리보기', 'Preview', a.previewFeature),
          button(a, 'apply-feature', '피처 적용', 'Apply feature', a.applyFeature, {
            className: 'btn primary'
          }),
          button(a, 'cancel-feature', '취소', 'Cancel', () =>
            a.setState({ featureDialog: null, featurePreview: null, cadError: '' })
          )
        ),
        React.createElement(
          'p',
          { className: 'tiny-text' },
          a.t(
            '메쉬 기반 근사 솔리드입니다. 자가교차/중첩 프로파일은 거부하며 원본을 유지합니다.',
            'Tessellated solids. Intersecting/overlapping profiles are rejected without replacing the source.'
          )
        )
      )
    );
  }
  M.CadUI.renderFeatureInspector = renderFeatureInspector;
})(window.MP);
