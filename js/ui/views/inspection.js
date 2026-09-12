(function (M) {
  'use strict';
  const h = M.UI.R.createElement;
  Object.assign(M.AppViews, {
    renderInspection() {
      const s = this.state;
      const field = (label, input) =>
        h('label', { className: 'inspection-field' }, h('span', null, label), input);
      return h(
        'section',
        { className: 'inspection-panel', 'data-testid': 'inspection-panel' },
        h('div', { className: 'section-title' }, this.t('단면과 분해', 'SECTION / EXPLODE')),
        field(
          this.t('분해 간격', 'Opening gap'),
          h('input', {
            type: 'range',
            min: 0,
            max: 80,
            step: 1,
            value: s.toolGap,
            'data-testid': 'tool-gap',
            onChange: (e) => this.setState({ toolGap: +e.target.value })
          })
        ),
        h('small', null, s.toolGap + ' mm'),
        field(
          this.t('단면 보기', 'Section view'),
          h('input', {
            type: 'checkbox',
            checked: s.sectionEnabled,
            'data-testid': 'section-enabled',
            onChange: (e) => this.setState({ sectionEnabled: e.target.checked })
          })
        ),
        s.sectionEnabled &&
          h(
            'div',
            null,
            field(
              this.t('절단 축', 'Section axis'),
              h(
                'select',
                {
                  value: s.sectionAxis,
                  'data-testid': 'section-axis',
                  onChange: (e) => this.setState({ sectionAxis: e.target.value })
                },
                ['X', 'Y', 'Z'].map((x) => h('option', { key: x }, x))
              )
            ),
            field(
              this.t('절단 위치', 'Section position'),
              h('input', {
                type: 'range',
                min: 0,
                max: 100,
                step: 1,
                value: s.sectionPosition,
                'data-testid': 'section-position',
                onChange: (e) => this.setState({ sectionPosition: +e.target.value })
              })
            ),
            field(
              this.t('반대쪽 표시', 'Reverse side'),
              h('input', {
                type: 'checkbox',
                checked: s.sectionReverse,
                'data-testid': 'section-reverse',
                onChange: (e) => this.setState({ sectionReverse: e.target.checked })
              })
            ),
            h(
              'small',
              null,
              this.t(
                '화면에만 적용됩니다. 원본과 내보내기는 유지됩니다.',
                'Display only. Original geometry and exports are preserved.'
              )
            ),
            s.sectionError &&
              h(
                'p',
                { role: 'status', className: 'amber-text' },
                this.t(
                  '일부 열린 메쉬는 단면 처리할 수 없어 원형으로 표시합니다.',
                  'Some open meshes could not be sectioned and are shown whole.'
                )
              )
          )
      );
    }
  });
})(window.MP);
