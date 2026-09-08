(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderPressLeft() {
      const s = this.state,
        b = this.active(),
        ready = s.p.bodies.filter((b) => b.tool),
        target = this.pressTarget();
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'section',
          { className: 'press-tools-section', 'data-testid': 'press-mold-selector' },
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('생성된 금형', 'READY MOLDS'),
            React.createElement('span', null, String(ready.length).padStart(2, '0'))
          ),
          React.createElement(
            'p',
            { className: 'press-target-help' },
            this.t('금형 선택 → 선택 프레스', 'Choose a mold → Press selected')
          ),
          ready.length
            ? React.createElement(
                'div',
                {
                  className: 'press-mold-list',
                  role: 'radiogroup',
                  'aria-label': this.t('프레스 금형 선택', 'Select press mold')
                },
                ready.map((body, i) =>
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      key: body.id,
                      role: 'radio',
                      'aria-checked': target?.id === body.id,
                      disabled: s.running || !!s.busy,
                      'data-testid': 'press-mold-' + i,
                      'data-mold-id': body.id,
                      className:
                        'press-mold-option ' +
                        (target?.id === body.id ? 'selected ' : '') +
                        (this.cycle?.body.id === body.id ? 'pressing' : ''),
                      onClick: () => this.selectPressTool(body.id),
                      title: body.name
                    },
                    React.createElement(
                      'span',
                      { className: 'mold-number' },
                      String(i + 1).padStart(2, '0')
                    ),
                    React.createElement(
                      'span',
                      { className: 'mold-option-text' },
                      React.createElement('strong', null, body.name),
                      React.createElement(
                        'small',
                        null,
                        body.material + ' · ' + body.tool.axis + ' ' + this.t('파팅', 'parting')
                      )
                    ),
                    React.createElement(Icon, {
                      name: target?.id === body.id ? 'check' : 'tool',
                      size: 16
                    })
                  )
                )
              )
            : React.createElement(
                'p',
                { className: 'empty-small' },
                this.t(
                  '생성된 금형이 없습니다. Tooling에서 금형을 먼저 생성하세요.',
                  'No ready molds. Generate molds in Tooling first.'
                )
              ),
          target &&
            React.createElement(
              'div',
              {
                className: 'press-target-caption',
                'data-testid': 'press-target-name',
                title: target.name
              },
              this.t('선택: ', 'Selected: '),
              React.createElement('strong', null, target.name)
            ),
          s.running &&
            React.createElement(
              'div',
              { className: 'press-target-caption running', 'data-testid': 'press-running-name' },
              this.t('생산 중: ', 'Running: '),
              React.createElement('strong', null, this.cycle?.body.name || '')
            ),
          React.createElement(
            'div',
            { className: 'inline-small' },
            React.createElement('span', null, this.t('재생 속도', 'Playback speed')),
            React.createElement(
              'select',
              {
                'aria-label': 'Playback speed',
                'data-testid': 'press-speed',
                disabled: s.running,
                value: s.speed,
                onChange: (e) => this.setState({ speed: +e.target.value })
              },
              [1, 2, 4, 8].map((x) => React.createElement('option', { key: x, value: x }, x, '×'))
            )
          ),
          React.createElement(
            'label',
            { className: 'check-row' },
            React.createElement('input', {
              type: 'checkbox',
              checked: s.xray,
              onChange: (e) => this.setState({ xray: e.target.checked })
            }),
            this.t('금형 반투명 보기', 'Translucent mold')
          )
        ),
        React.createElement(
          'section',
          { className: 'materials-section' },
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('소재 라이브러리', 'MATERIAL LIBRARY'),
            React.createElement('span', null, '07')
          ),
          React.createElement(
            'p',
            { className: 'muted' },
            this.t(
              '선택 조각에 적용 · 색상은 구분용 프리셋',
              'Selected part · colors are distinct preview tints'
            )
          ),
          Object.entries(M.materials).map(([id, m]) =>
            React.createElement(
              'button',
              {
                'data-testid': 'material-' + id.replace(/ /g, '-'),
                key: id,
                className: 'material-card ' + (b?.material === id ? 'selected' : ''),
                onClick: () => this.material(id),
                disabled: s.running
              },
              React.createElement('i', {
                className: 'material-swatch finish-' + id.replace(/ /g, '-').toLowerCase(),
                style: { backgroundColor: m.color }
              }),
              React.createElement(
                'span',
                null,
                React.createElement('strong', null, id === 'CF Nylon' ? 'CF Nylon' : id),
                React.createElement(
                  'small',
                  null,
                  fmt(m.density, 2),
                  ' g/cm\u00B3 ',
                  React.createElement('b', null, '\u00B7'),
                  ' ',
                  m.cycle,
                  's'
                )
              ),
              b?.material === id && React.createElement(Icon, { name: 'check', size: 16 })
            )
          )
        ),
        React.createElement(
          'section',
          { className: 'note-panel' },
          React.createElement(Icon, { name: 'info' }),
          React.createElement(
            'p',
            null,
            this.t(
              '판재 투입 → 프레스 성형은 간이 시각화입니다. 실제 수지 사출 공정·유동을 재현하지 않습니다. 성형 중 금형을 반투명 표시합니다.',
              'Blank feeding and press forming are illustrative, not a physical resin injection or flow simulation. Tooling becomes translucent during forming.'
            )
          )
        )
      );
    }
  });
})(window.MP);
