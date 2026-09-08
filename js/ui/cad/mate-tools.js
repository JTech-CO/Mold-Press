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
  function renderMateTools(a) {
    const s = a.state,
      b = s.p.assembly.find((x) => x.id === s.mateBody),
      features = b ? A.features(b) : null,
      faceLabel = (f) => {
        if (f.kind === 'cylinder')
          return f.id + ' · ' + a.t('원통 R ', 'Cylinder R ') + f2(f.radius);
        const k = f.normal.map(Math.abs).indexOf(Math.max(...f.normal.map(Math.abs)));
        return (
          f.id +
          ' · ' +
          (Math.abs(f.normal[k]) > 0.999
            ? ['X', 'Y', 'Z'][k] + (f.normal[k] > 0 ? '+' : '-')
            : a.t('기울어진 면', 'Oblique face')) +
          (f.circular ? ' ○' : '')
        );
      };
    return React.createElement(
      'section',
      { className: 'mate-panel', 'data-testid': 'mate-panel' },
      React.createElement(
        'div',
        { className: 'section-title' },
        a.t('Mate · 기하 구속', 'MATE · CONSTRAINTS')
      ),
      React.createElement(
        'div',
        { className: 'tool-grid' },
        button(a, 'snap-face', '면 맞붙임', 'Face contact', () => a.startSnap('face'), {
          disabled: s.p.assembly.length < 2
        }),
        button(a, 'snap-pin', '동심 / 핀', 'Concentric / pin', () => a.startSnap('pin'), {
          disabled: s.p.assembly.length < 2
        })
      ),
      React.createElement(
        Field,
        { a: a, label: 'Mate \uC720\uD615', en: 'Mate type' },
        React.createElement(
          'select',
          {
            'data-testid': 'mate-type',
            value: s.mateType,
            onChange: (e) => {
              a.cancelMate();
              a.setState({ mateType: e.target.value });
            }
          },
          A.types.map(([key, ko, en]) =>
            React.createElement('option', { key: key, value: key }, a.t(ko, en))
          )
        )
      ),
      ['distance', 'angle'].includes(s.mateType) &&
        React.createElement(
          Field,
          {
            a: a,
            label: s.mateType === 'distance' ? '거리 (mm)' : '각도 (°)',
            en: s.mateType === 'distance' ? 'Distance (mm)' : 'Angle (°)'
          },
          React.createElement(NumberField, {
            app: a,
            test: 'mate-value',
            value: s.mateValue,
            min: s.mateType === 'distance' ? -10000 : 0,
            max: s.mateType === 'distance' ? 10000 : 180,
            onCommit: (v) => a.setState({ mateValue: v })
          })
        ),
      ['coincident', 'distance', 'parallel', 'concentric'].includes(s.mateType) &&
        React.createElement(
          Field,
          { a: a, label: '\uBC29\uD5A5', en: 'Alignment' },
          React.createElement(
            'select',
            {
              'data-testid': 'mate-alignment',
              value: s.mateAlignment,
              onChange: (e) => a.setState({ mateAlignment: e.target.value })
            },
            React.createElement('option', { value: 'opposed' }, a.t('반대 방향', 'Anti-aligned')),
            React.createElement('option', { value: 'aligned' }, a.t('같은 방향', 'Aligned'))
          )
        ),
      s.mateType === 'coincident' &&
        React.createElement(
          'label',
          { className: 'check-row' },
          React.createElement('input', {
            'data-testid': 'mate-center',
            type: 'checkbox',
            checked: s.mateCenter,
            onChange: (e) => a.setState({ mateCenter: e.target.checked })
          }),
          a.t('첫 맞붙임 시 면 중심도 맞춤', 'Center faces on initial placement')
        ),
      s.mateType === 'tangent' &&
        React.createElement(
          'label',
          { className: 'check-row' },
          React.createElement('input', {
            type: 'checkbox',
            'data-testid': 'mate-flip',
            checked: s.mateFlip,
            onChange: (e) => a.setState({ mateFlip: e.target.checked })
          }),
          a.t('접선 방향 반전 / 내접', 'Flip tangent / internal contact')
        ),
      button(
        a,
        'start-mate',
        s.mateActive ? '면 선택 다시 시작' : 'Mate 면 선택',
        s.mateActive ? 'Restart face selection' : 'Select mate faces',
        () => a.startSnap('custom'),
        { className: 'btn primary full', disabled: s.p.assembly.length < 2 }
      ),
      React.createElement(
        'p',
        { className: 'tiny-text' },
        a.t(
          '기준 면 → 이동 면. 두 번째 클릭으로 적용. 평면 내부 이동은 일치 구속만으로 고정되지 않습니다.',
          'Reference → moving face; second click applies. Coincidence leaves in-plane translation free.'
        )
      ),
      React.createElement(
        'details',
        { className: 'cad-details' },
        React.createElement(
          'summary',
          null,
          a.t('가려진 면 · 목록에서 선택', 'Hidden faces · select from list')
        ),
        React.createElement(
          'select',
          {
            className: 'full',
            'aria-label': 'Mate component',
            'data-testid': 'mate-body',
            value: s.mateBody,
            onChange: (e) => a.setState({ mateBody: e.target.value, mateFace: '' })
          },
          React.createElement('option', { value: '' }, a.t('부품 선택', 'Choose component')),
          s.p.assembly.map((b) =>
            React.createElement(
              'option',
              { key: b.id, value: b.id },
              b.name,
              ' \u00B7 ',
              b.id.slice(-4)
            )
          )
        ),
        React.createElement(
          'select',
          {
            className: 'full',
            'data-testid': 'mate-face-list',
            'aria-label': 'Recognised face',
            value: s.mateFace,
            onChange: (e) => a.setState({ mateFace: e.target.value })
          },
          React.createElement(
            'option',
            { value: '' },
            a.t('면 / 원통 선택', 'Choose face / cylinder')
          ),
          features &&
            features.faces
              .concat(features.curved)
              .map((f) => React.createElement('option', { value: f.id, key: f.id }, faceLabel(f)))
        ),
        button(
          a,
          'use-mate-face',
          s.mateRef ? '이동 면 적용' : '기준 면 사용',
          s.mateRef ? 'Apply moving face' : 'Use reference face',
          a.mateFromList,
          { className: 'btn full' }
        )
      ),
      s.cadError &&
        React.createElement(
          'div',
          { className: 'check-note danger', 'data-testid': 'mate-error' },
          s.cadError
        ),
      React.createElement(
        'div',
        { className: 'mate-history' },
        React.createElement(
          'div',
          { className: 'section-title' },
          a.t('저장된 Mate', 'SAVED MATES'),
          React.createElement('span', null, s.p.mates.length)
        ),
        s.p.mates.map((m, i) =>
          React.createElement(
            'div',
            { className: 'mate-row', key: m.id },
            React.createElement(
              'label',
              null,
              React.createElement('input', {
                type: 'checkbox',
                'data-testid': 'mate-enabled-' + i,
                checked: m.enabled !== false,
                onChange: (e) => a.changeMate(m.id, { enabled: e.target.checked })
              }),
              React.createElement(
                'strong',
                null,
                i + 1,
                ' \u00B7 ',
                a.t(
                  A.types.find((t) => t[0] === m.type)?.[1] || m.type,
                  A.types.find((t) => t[0] === m.type)?.[2] || m.type
                )
              )
            ),
            React.createElement(
              'small',
              null,
              s.p.assembly.find((b) => b.id === m.reference.bodyId)?.name,
              ' \u2192 ',
              s.p.assembly.find((b) => b.id === m.moving.bodyId)?.name
            ),
            ['angle', 'distance'].includes(m.type) &&
              React.createElement(NumberField, {
                app: a,
                test: 'edit-mate-value-' + i,
                value: m.value,
                min: m.type === 'angle' ? 0 : -10000,
                max: m.type === 'angle' ? 180 : 10000,
                onCommit: (v) => a.changeMate(m.id, { value: v })
              }),
            button(
              a,
              'delete-mate-' + i,
              '구속 삭제',
              'Delete mate',
              () => a.edit('Delete mate', (p) => (p.mates = p.mates.filter((x) => x.id !== m.id))),
              { className: 'btn' }
            )
          )
        ),
        s.p.mates.length > 0 &&
          React.createElement(
            'p',
            { className: 'tiny-text' },
            a.t(
              '체크 해제: 구속 억제. Mate는 이동/회전 후 재계산됩니다. 충돌·순환 구속은 원본을 유지하고 거부합니다.',
              'Uncheck to suppress. Mates solve after move/rotate. Conflicting or cyclic constraints are rejected.'
            )
          )
      )
    );
  }
  M.CadUI.renderMateTools = renderMateTools;
})(window.MP);
