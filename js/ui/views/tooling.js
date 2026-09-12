(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderToolLeft() {
      const s = this.state,
        b = this.active();
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'section',
          null,
          React.createElement('div', { className: 'eyebrow' }, 'TOOLING WORKSPACE'),
          React.createElement('h2', null, this.t('형상을 금형으로.', 'Shape into tooling.')),
          React.createElement(
            'p',
            { className: 'muted' },
            this.t(
              '각 조각에 독립적인 2판 금형을 생성합니다.',
              'Generate an independent two-plate mold for each part.'
            )
          ),
          React.createElement(
            Button,
            {
              primary: true,
              icon: 'tool',
              onClick: () => this.generate(true),
              disabled: !s.p.bodies.length,
              test: 'generate-all',
              className: 'full'
            },
            this.t('전체 금형 생성', 'Generate all molds')
          )
        ),
        this.renderTree(),
        this.renderInspection(),
        React.createElement(
          'section',
          null,
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('금형 구성', 'TOOLING LAYERS'),
            React.createElement('span', null, b?.tool ? 'READY' : '-')
          ),
          [
            ['cavity', '캐비티', 'Cavity', '#66717b'],
            ['core', '코어', 'Core', '#a2adb4'],
            ['gate', '게이트 / 런너', 'Gate / runner', '#d8a154'],
            ['pin', '취출판 / 핀', 'Ejector plate / pins', '#d1d7da'],
            ['guide', '가이드 포스트 / 부시', 'Guide posts / bushes', '#ae8a51'],
            ['cool', '냉각수로', 'Cooling channels', '#64a9be'],
            ['slide', '슬라이드 / 사이드코어', 'Slides / side cores', '#bb8a4b']
          ].map(([key, ko, en, c]) =>
            React.createElement(
              'label',
              { className: 'layer-row', key: key },
              React.createElement('i', { style: { background: c } }),
              React.createElement('span', null, this.t(ko, en)),
              React.createElement('input', {
                type: 'checkbox',
                'aria-label': en,
                checked: !s.hidden.includes(key),
                onChange: () => this.toggleHidden(key)
              })
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
            this.t('캐비티 반투명 보기', 'Translucent cavity')
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
              '분할 블록의 음각 형상입니다. 제작용 코어 분리·슬라이드 운동학은 별도 설계가 필요합니다.',
              'Split-block negative geometry. Production core separation and slide kinematics require additional design.'
            )
          )
        )
      );
    },
    renderParting() {
      const s = this.state;
      return React.createElement(
        'section',
        null,
        React.createElement(
          'div',
          { className: 'section-title' },
          this.t('파팅 컨트롤', 'PARTING CONTROL'),
          React.createElement('small', null, 'AUTO / MANUAL')
        ),
        React.createElement(
          'div',
          { className: 'axis-tabs' },
          ['X', 'Y', 'Z'].map((axis) =>
            React.createElement(
              'button',
              {
                key: axis,
                'data-testid': 'parting-' + axis,
                className: s.p.parting.axis === axis ? 'selected' : '',
                onClick: () => this.setParting('axis', axis)
              },
              axis,
              React.createElement('span', null, this.t('축', 'axis'))
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'form-row' },
          React.createElement('label', null, this.t('파팅 위치', 'Plane position')),
          React.createElement(
            'label',
            { className: 'unit-input' },
            React.createElement('input', {
              'aria-label': 'Parting position',
              'data-testid': 'parting-position',
              type: 'number',
              step: '.5',
              value: s.p.parting.position,
              onChange: (e) => this.setParting('position', +e.target.value)
            }),
            React.createElement('span', null, 'mm')
          )
        ),
        React.createElement(
          Button,
          {
            icon: 'refresh',
            onClick: this.autoParting,
            disabled: !this.active(),
            className: 'full',
            test: 'auto-parting'
          },
          'Auto Parting'
        ),
        s.page === 'studio' &&
          React.createElement(
            Button,
            {
              icon: 'split',
              onClick: this.split,
              primary: true,
              disabled: !this.active(),
              className: 'full',
              test: 'split-body'
            },
            this.t('2조각으로 분할', 'Split into two parts')
          ),
        s.page === 'tooling' &&
          React.createElement(
            Button,
            {
              icon: 'tool',
              onClick: () => this.generate(false),
              primary: true,
              disabled: !this.active(),
              className: 'full',
              test: 'generate-selected'
            },
            this.t('선택 조각 금형 생성', 'Generate selected tooling')
          )
      );
    }
  });
})(window.MP);
