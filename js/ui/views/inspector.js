(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderAnalysis() {
      const b = this.active(),
        a = this.getAnalysis(b);
      if (!a) return null;
      const m = M.materials[b.material],
        thin = a.minWall < m.min,
        thick = a.maxWall > m.max,
        gateDist = Math.hypot(a.size[0], a.size[1]),
        short = thin && gateDist / Math.max(0.1, a.minWall) > 45;
      return React.createElement(
        'section',
        { className: 'analysis-section' },
        React.createElement(
          'div',
          { className: 'section-title' },
          this.t('제조 적합성', 'MOLDABILITY'),
          React.createElement('span', { className: 'amber-text' }, this.t('간이', 'HEURISTIC'))
        ),
        React.createElement(
          'div',
          { className: 'analysis-line' },
          React.createElement('span', null, this.t('최소 살두께 · 표본', 'Min wall · sampled')),
          React.createElement(
            'strong',
            { className: thin ? 'amber-text' : '' },
            fmt(a.minWall, 2),
            ' ',
            React.createElement('small', null, 'mm')
          )
        ),
        React.createElement(
          'div',
          { className: 'mini-track' },
          React.createElement('i', {
            style: { width: Math.min(100, (a.minWall / m.min) * 65) + '%' }
          })
        ),
        React.createElement(
          'div',
          { className: 'analysis-line' },
          React.createElement('span', null, this.t('최대 두께 · 표본', 'Max wall · sampled')),
          React.createElement(
            'strong',
            { className: thick ? 'amber-text' : '' },
            fmt(a.maxWall, 2),
            ' ',
            React.createElement('small', null, 'mm')
          )
        ),
        React.createElement(
          'div',
          { className: 'analysis-line' },
          React.createElement('span', null, this.t('구배 / 권장값', 'Draft / recommendation')),
          React.createElement('strong', null, fmt(a.draft), '\u00B0 / ', m.draft, '\u00B0')
        ),
        React.createElement(
          'div',
          { className: 'check-note ' + (a.undercut > 0.04 ? 'warn' : 'ok') },
          React.createElement(Icon, { name: a.undercut > 0.04 ? 'warn' : 'check', size: 15 }),
          React.createElement(
            'span',
            null,
            a.undercut > 0.04
              ? this.t(
                  `언더컷 의심 · ${fmt(a.undercut * 100, 0)}% 표면`,
                  `Suspected undercut · ${fmt(a.undercut * 100, 0)}% samples`
                )
              : this.t('표본에서 큰 언더컷 없음', 'No major undercut in sampled faces')
          )
        ),
        a.draft < m.draft &&
          React.createElement(
            'div',
            { className: 'check-note warn' },
            React.createElement(Icon, { name: 'warn', size: 15 }),
            React.createElement(
              'span',
              null,
              this.t('권장 빼기구배 미달 구간', 'Draft below recommended value')
            )
          ),
        thick &&
          React.createElement(
            'div',
            { className: 'check-note warn' },
            React.createElement(Icon, { name: 'warn', size: 15 }),
            React.createElement(
              'span',
              null,
              this.t('두꺼운 구간 · 싱크마크 위험', 'Thick sections · sink-mark risk')
            )
          ),
        short &&
          React.createElement(
            'div',
            { className: 'check-note warn' },
            React.createElement(Icon, { name: 'warn', size: 15 }),
            React.createElement(
              'span',
              null,
              this.t(
                '얇은 벽 + 긴 게이트 경로 · 미성형 위험',
                'Thin wall + long gate path · short-shot risk'
              )
            )
          ),
        React.createElement(
          'p',
          { className: 'tiny-text' },
          this.t(
            `${a.samples}개 광선 표본 · 공칭두께/정밀 DFM 아님. 게이트 경로는 외곽 치수 근사입니다.`,
            `${a.samples} ray samples · not nominal wall or precise DFM. Gate path uses an extent-based proxy.`
          )
        )
      );
    },
    renderInspector() {
      const s = this.state,
        b = this.active(),
        a = this.getAnalysis(b),
        m = b ? M.materials[b.material] : M.materials.ABS;
      return React.createElement(
        'aside',
        { className: 'inspector' },
        React.createElement(
          'div',
          { className: 'panel-heading' },
          React.createElement('span', null, this.t('인스펙터', 'INSPECTOR')),
          React.createElement(Icon, { name: 'info', size: 15 })
        ),
        b
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'section',
                { className: 'selected-object' },
                React.createElement(
                  'div',
                  { className: 'eyebrow' },
                  s.page === 'assembly'
                    ? 'ASSEMBLY INSTANCE'
                    : s.page === 'press'
                      ? 'MATERIAL & PROCESS'
                      : 'SELECTED BODY'
                ),
                React.createElement('input', {
                  className: 'object-name',
                  'aria-label': 'Body name',
                  value: b.name,
                  onChange: (e) => {
                    const value = e.target.value;
                    this.edit(this.t('이름 변경', 'Rename'), (p) => {
                      (s.page === 'assembly' ? p.assembly : p.bodies).find(
                        (x) => x.id === b.id
                      ).name = value;
                    });
                  }
                }),
                React.createElement(
                  'div',
                  { className: 'object-meta' },
                  React.createElement('span', { className: 'tag' }, b.material),
                  React.createElement(
                    'span',
                    null,
                    a ? fmt(a.triangles, 0) : 0,
                    ' ',
                    this.t('삼각형', 'triangles')
                  )
                )
              ),
              (s.page === 'studio' || s.page === 'assembly') &&
                React.createElement(
                  'section',
                  null,
                  React.createElement(
                    'div',
                    { className: 'section-title' },
                    this.t('변형', 'TRANSFORM'),
                    React.createElement('span', null, 'mm / \u00B0')
                  ),
                  [
                    ['pos', '위치', 'Position'],
                    ['rot', '회전', 'Rotation'],
                    ['scale', '스케일', 'Scale']
                  ].map(([field, ko, en]) =>
                    React.createElement(
                      'div',
                      { className: 'transform-field', key: field },
                      React.createElement('label', null, this.t(ko, en)),
                      React.createElement(
                        'div',
                        { className: 'xyz-fields' },
                        ['X', 'Y', 'Z'].map((axis, k) =>
                          React.createElement(
                            'label',
                            { key: axis },
                            React.createElement(
                              'span',
                              { className: 'axis-' + axis.toLowerCase() },
                              axis
                            ),
                            React.createElement('input', {
                              'data-testid': `transform-${field}-${axis}`,
                              'aria-label': `${en} ${axis}`,
                              type: 'number',
                              step: field === 'scale' ? '.1' : '1',
                              value: +b[field][k].toFixed(3),
                              onChange: (e) => this.updateBody(field, k, +e.target.value)
                            })
                          )
                        )
                      )
                    )
                  )
                ),
              s.page === 'studio' || s.page === 'tooling' ? this.renderParting() : null,
              s.page === 'press' &&
                React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'section',
                    null,
                    React.createElement(
                      'div',
                      { className: 'section-title' },
                      this.t('소재 사양', 'MATERIAL PRESET')
                    ),
                    React.createElement('h2', { className: 'material-title' }, m.name),
                    React.createElement('p', { className: 'muted' }, this.t(...m.texture)),
                    React.createElement(
                      'div',
                      { className: 'stat-grid' },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('span', null, this.t('밀도', 'Density')),
                        React.createElement(
                          'strong',
                          null,
                          fmt(m.density, 2),
                          ' ',
                          React.createElement('small', null, 'g/cm\u00B3')
                        )
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('span', null, this.t('선형 수축', 'Linear shrink')),
                        React.createElement(
                          'strong',
                          null,
                          fmt(m.shrink * 100, 2),
                          React.createElement('small', null, '%')
                        )
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('span', null, this.t('예상 질량', 'Est. mass')),
                        React.createElement(
                          'strong',
                          null,
                          fmt((a.volume / 1000) * m.density, 2),
                          React.createElement('small', null, 'g')
                        )
                      ),
                      React.createElement(
                        'div',
                        null,
                        React.createElement('span', null, this.t('프리셋 사이클', 'Preset cycle')),
                        React.createElement(
                          'strong',
                          null,
                          m.cycle,
                          React.createElement('small', null, 's')
                        )
                      )
                    ),
                    React.createElement(
                      'div',
                      { className: 'shrink-detail' },
                      React.createElement('span', null, '\u0394X / \u0394Y / \u0394Z'),
                      React.createElement(
                        'strong',
                        null,
                        a.size.map((x) => fmt(x * m.shrink, 2)).join(' / '),
                        ' mm'
                      )
                    ),
                    m.note &&
                      React.createElement('div', { className: 'warning-box' }, this.t(...m.note)),
                    React.createElement(
                      'p',
                      { className: 'tiny-text' },
                      this.t(
                        '대표값입니다. 등급·충전재 함량·공정에 따라 달라지며 수축 보정은 적용하지 않습니다.',
                        'Illustrative values vary by grade, filler content and process. No mold shrink compensation is applied.'
                      )
                    )
                  )
                ),
              s.page !== 'assembly' && this.renderAnalysis(),
              s.page === 'assembly' &&
                React.createElement(
                  'section',
                  null,
                  React.createElement(
                    'div',
                    { className: 'section-title' },
                    this.t('조립 검사', 'ASSEMBLY CHECK')
                  ),
                  React.createElement(
                    'div',
                    { className: 'check-note ' + (s.collisions.length ? 'warn' : 'ok') },
                    React.createElement(Icon, { name: s.collisions.length ? 'warn' : 'check' }),
                    s.collisions.length
                      ? this.t(
                          `${s.collisions.length}개 조각 간섭 감지`,
                          `${s.collisions.length} interfering parts`
                        )
                      : this.t('검사된 조각 간 간섭 없음', 'No detected solid interference')
                  ),
                  React.createElement(
                    'p',
                    { className: 'tiny-text' },
                    this.t(
                      'CSG 교차 체적 > 0.15 mm³. 폭발도는 시각 효과이며 원래 조립 위치를 검사·내보냅니다.',
                      'CSG intersection volume > 0.15 mm³. Explosion is display-only; checks and exports use assembled positions.'
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'section-title spaced' },
                    this.t('폭발도', 'EXPLODED VIEW'),
                    React.createElement('span', null, s.explode, ' mm')
                  ),
                  React.createElement('input', {
                    'aria-label': 'Exploded view',
                    'data-testid': 'explode',
                    className: 'range',
                    type: 'range',
                    min: '0',
                    max: '80',
                    value: s.explode,
                    onChange: (e) => this.setState({ explode: +e.target.value })
                  }),
                  React.createElement(
                    'div',
                    { className: 'range-labels' },
                    React.createElement('span', null, this.t('조립', 'Assembled')),
                    React.createElement('span', null, this.t('분해', 'Exploded'))
                  ),
                  React.createElement(
                    'div',
                    { className: 'section-title spaced' },
                    this.t('표시 모드', 'VISIBILITY')
                  ),
                  React.createElement(
                    'div',
                    { className: 'visibility-options' },
                    [
                      ['products', '제품만', 'Products'],
                      ['molds', '금형만', 'Molds'],
                      ['both', '전체', 'Both']
                    ].map(([key, ko, en]) =>
                      React.createElement(
                        Button,
                        {
                          key: key,
                          active: s.show === key,
                          onClick: () => this.setState({ show: key })
                        },
                        this.t(ko, en)
                      )
                    )
                  ),
                  React.createElement(
                    'label',
                    { className: 'check-row' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: s.hideProduct,
                      onChange: (e) => this.setState({ hideProduct: e.target.checked })
                    }),
                    this.t('완성 제품 숨기기', 'Hide completed product')
                  )
                ),
              React.createElement(
                'section',
                null,
                React.createElement(
                  'div',
                  { className: 'section-title' },
                  this.t('형상 정보', 'GEOMETRY')
                ),
                React.createElement(
                  'div',
                  { className: 'analysis-line' },
                  React.createElement('span', null, this.t('외곽 치수', 'Bounding size')),
                  React.createElement(
                    'strong',
                    { className: 'mono-small' },
                    a.size.map((x) => fmt(x, 1)).join(' × ')
                  )
                ),
                React.createElement(
                  'div',
                  { className: 'analysis-line' },
                  React.createElement('span', null, this.t('체적', 'Solid volume')),
                  React.createElement('strong', null, fmt(a.volume / 1000, 2), ' cm\u00B3')
                ),
                React.createElement(
                  'div',
                  { className: 'analysis-line' },
                  React.createElement('span', null, this.t('질량 · 간이', 'Mass · estimated')),
                  React.createElement('strong', null, fmt((a.volume / 1000) * m.density, 2), ' g')
                )
              )
            )
          : React.createElement(
              'section',
              { className: 'empty-inspector' },
              React.createElement(Icon, { name: 'pointer', size: 32 }),
              React.createElement('h3', null, this.t('바디를 선택하세요', 'Select a body')),
              React.createElement(
                'p',
                { className: 'muted' },
                this.t(
                  '뷰포트나 탐색기에서 선택하면 치수와 속성이 표시됩니다.',
                  'Select in the viewport or explorer to inspect dimensions and properties.'
                )
              )
            ),
        React.createElement(
          'section',
          { className: 'emulation-note' },
          React.createElement(
            'div',
            null,
            React.createElement('i', { className: 'status-dot amber' }),
            React.createElement('strong', null, this.t('에뮬레이션(간이)', 'SIMPLIFIED EMULATION'))
          ),
          React.createElement(
            'p',
            null,
            this.t(
              'CAE·열전달·유동해석이 아닙니다. 제조 검증·안전 판단에 사용하지 마세요.',
              'Not a CAE, thermal or flow solver. Not for manufacturing validation or safety decisions.'
            )
          )
        )
      );
    }
  });
})(window.MP);
