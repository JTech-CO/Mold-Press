(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderViewport() {
      const s = this.state,
        b = this.active(),
        bb = b ? M.bounds(M.world(b)) : null,
        profile = M.processProfile(b?.material),
        stages = profile.stages[s.lang === 'ko' ? 0 : 1],
        isModel = s.page === 'studio' || s.page === 'assembly';
      return React.createElement(
        'main',
        { className: 'workspace' + (s.page === 'studio' && s.sketchMode ? ' sketch-active' : '') },
        React.createElement(
          'div',
          { className: 'viewport-toolbar' },
          React.createElement(
            'div',
            { className: 'toolbar-group' },
            [
              ['select', 'pointer', '선택', 'Select', 'V'],
              ['translate', 'move', '이동', 'Move', 'G'],
              ['rotate', 'rotate', '회전', 'Rotate', 'R'],
              ['scale', 'scale', '스케일', 'Scale', 'S'],
              ['measure', 'measure', '측정', 'Measure', 'M']
            ].map(([key, icon, ko, en, shortcut]) =>
              React.createElement(
                Button,
                {
                  key: key,
                  icon: icon,
                  active: s.mode === key,
                  test: 'mode-' + key,
                  disabled: !isModel && key !== 'select' && key !== 'measure',
                  title:
                    `${this.t(ko, en)} (${shortcut})` +
                    (key === 'rotate'
                      ? this.t(' · Shift+드래그: 30° 스냅', ' · Shift+drag: 30° snap')
                      : ''),
                  onClick: () => this.setState({ mode: key, measure: [] })
                },
                this.t(ko, en)
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'toolbar-group right' },
            this.active()?.material === 'PC' &&
              React.createElement(
                'label',
                { className: 'render-pc' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: s.pcTransparent,
                  'data-testid': 'pc-transparent',
                  onChange: (e) => this.setState({ pcTransparent: e.target.checked })
                }),
                this.t('PC 투명', 'Clear PC')
              ),
            React.createElement(
              'select',
              {
                className: 'render-quality',
                'aria-label': this.t('렌더링 품질', 'Rendering quality'),
                'data-testid': 'render-quality',
                value: s.quality,
                onChange: (e) => this.setState({ quality: e.target.value })
              },
              [
                ['low', '성능', 'Fast'],
                ['standard', '표준', 'Standard'],
                ['high', '고품질', 'High']
              ].map(([value, ko, en]) =>
                React.createElement('option', { key: value, value }, this.t(ko, en))
              )
            ),
            React.createElement(Button, {
              icon: 'grid',
              active: s.grid,
              title: this.t('그리드', 'Grid'),
              onClick: () => this.setState({ grid: !s.grid })
            }),
            React.createElement(Button, {
              icon: 'magnet',
              active: s.snap,
              title: this.t('1 mm / 5° 스냅', '1 mm / 5° snap'),
              onClick: () => this.setState({ snap: !s.snap })
            }),
            React.createElement(Button, {
              icon: 'fit',
              title: this.t('화면 맞춤 (F)', 'Fit view (F)'),
              onClick: this.fitView
            })
          )
        ),
        React.createElement(
          'div',
          {
            className: 'viewport ' + (s.snapMode ? 'snap-cursor' : ''),
            ref: this.viewRef,
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
              e.preventDefault();
              const id =
                e.dataTransfer.getData('application/moldpress') ||
                e.dataTransfer.getData('text/plain');
              if (this.state.p.tray.some((t) => t.id === id)) {
                const hit = this.view.pick(e.clientX, e.clientY);
                this.addTray(id, hit);
              } else if (e.dataTransfer.files.length) this.import(e.dataTransfer.files);
            }
          },
          this.renderSketchBoard(),
          s.page === 'assembly' && this.renderMateHint(),
          React.createElement(
            'div',
            { className: 'viewport-title' },
            React.createElement(
              'span',
              { className: 'eyebrow' },
              s.page === 'studio'
                ? 'DESIGN SPACE'
                : s.page === 'tooling'
                  ? 'MOLD EXPLORER'
                  : s.page === 'press'
                    ? 'PRESS CELL: MP / 01'
                    : 'ASSEMBLY SPACE'
            ),
            React.createElement(
              'h1',
              null,
              s.page === 'studio'
                ? s.p.name
                : s.page === 'tooling'
                  ? this.t('금형 설계', 'Tooling design')
                  : s.page === 'press'
                    ? this.t('프레스 셀', 'Press cell')
                    : this.t('최종 조립', 'Final assembly')
            ),
            React.createElement(
              'p',
              null,
              s.page === 'studio'
                ? this.t('설계하고, 나누고, 찍어내세요.', 'Design it. Divide it. Make it.')
                : s.page === 'tooling'
                  ? this.t(
                      '캐비티와 코어 사이, 제품이 만들어지는 곳.',
                      'Between cavity and core, your product takes shape.'
                    )
                  : s.page === 'press'
                    ? this.t('소재부터 완성된 조각까지.', 'From raw material to a finished part.')
                    : this.t(
                        '독립적인 조각을 하나의 제품으로.',
                        'Independent parts. One complete product.'
                      )
            )
          ),
          React.createElement(
            'div',
            { className: 'view-controls' },
            React.createElement(
              'select',
              {
                'aria-label': 'Camera view',
                onChange: (e) => this.view.view(e.target.value),
                defaultValue: 'iso'
              },
              React.createElement('option', { value: 'iso' }, this.t('등각 투영', 'Isometric')),
              React.createElement('option', { value: 'top' }, this.t('윗면', 'Top')),
              React.createElement('option', { value: 'front' }, this.t('정면', 'Front')),
              React.createElement('option', { value: 'right' }, this.t('오른쪽', 'Right'))
            ),
            React.createElement(
              'button',
              {
                className: 'icon-btn ' + (s.dims ? 'active' : ''),
                title: this.t('치수 오버레이', 'Dimension overlay'),
                onClick: () => this.setState({ dims: !s.dims })
              },
              React.createElement(Icon, { name: 'measure' })
            )
          ),
          b &&
            s.dims &&
            isModel &&
            ['x', 'y', 'z'].map((k, i) => {
              const editable = s.page === 'studio',
                editing = editable && s.dimEdit?.id === b.id && s.dimEdit.axis === i;
              return React.createElement(
                'div',
                {
                  key: k,
                  className:
                    'dimension-label' + (editable ? ' editable' : '') + (editing ? ' editing' : ''),
                  ref: (el) => (this.dimensionRefs[k] = el),
                  'data-testid': 'dimension-' + k,
                  tabIndex: editable ? 0 : undefined,
                  role: editable ? 'button' : undefined,
                  'aria-label': editable
                    ? this.t(
                        k.toUpperCase() + ' 외곽 치수 편집 (mm)',
                        'Edit ' + k.toUpperCase() + ' bounding dimension (mm)'
                      )
                    : undefined,
                  title: editable
                    ? this.t(
                        '더블클릭 / Enter: 치수 편집 · 월드축 외곽 치수, 중심 유지',
                        'Double-click / Enter to edit world-axis bounds; centre is fixed'
                      )
                    : undefined,
                  onDoubleClick: (e) => {
                    if (editable && !editing) {
                      e.stopPropagation();
                      this.beginDimension(i);
                    }
                  },
                  onKeyDown: (e) => {
                    if (editable && !editing && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      e.stopPropagation();
                      this.beginDimension(i);
                    }
                  }
                },
                React.createElement('span', null, k.toUpperCase()),
                ' ',
                editing
                  ? React.createElement('input', {
                      ref: this.dimensionInputRef,
                      'data-testid': 'dimension-input',
                      className: 'dimension-input' + (s.dimEdit.error ? ' invalid' : ''),
                      'aria-label': this.t('치수 (mm)', 'Dimension (mm)'),
                      'aria-invalid': s.dimEdit.error || undefined,
                      inputMode: 'decimal',
                      type: 'text',
                      value: s.dimEdit.value,
                      onChange: (e) =>
                        this.setState({
                          dimEdit: { ...this.state.dimEdit, value: e.target.value, error: false }
                        }),
                      onBlur: this.commitDimension,
                      onKeyDown: (e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          this.commitDimension();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          this.cancelDimension();
                        }
                      }
                    })
                  : React.createElement('b', { className: 'dimension-value' }, fmt(bb.size[i], 2)),
                ' ',
                React.createElement('small', null, 'mm')
              );
            }),
          b &&
            isModel &&
            ['translate', 'rotate', 'scale'].includes(s.mode) &&
            s.selected.length > 0 &&
            React.createElement(
              'div',
              { className: 'gizmo-overlay' },
              React.createElement(
                'svg',
                { className: 'gizmo-lines' },
                [0, 1, 2].map((k) =>
                  React.createElement('line', {
                    key: k,
                    ref: (el) => (this.lineRefs[k] = el),
                    stroke: ['#d57468', '#88b790', '#73a8d6'][k],
                    strokeWidth: '2',
                    strokeDasharray: s.mode === 'scale' ? '3 3' : ''
                  })
                )
              ),
              [0, 1, 2].map((k) =>
                React.createElement(
                  'button',
                  {
                    key: k,
                    'data-testid': 'gizmo-' + ['X', 'Y', 'Z'][k],
                    ref: (el) => {
                      this.gizmoRefs[k] = el;
                      if (el && !el._mpPointer) {
                        el.addEventListener('pointerdown', (e) => this.gizmoStart(e, k));
                        el._mpPointer = true;
                      }
                    },
                    className: 'axis-handle axis-' + ['x', 'y', 'z'][k],
                    title: this.t(
                      '드래그하여 변형 · 회전 중 Shift: 30° 스냅',
                      'Drag to transform · hold Shift for 30° rotation snap'
                    )
                  },
                  ['X', 'Y', 'Z'][k]
                )
              )
            ),
          s.measure.length === 2 &&
            React.createElement(
              'div',
              { className: 'distance-label', ref: this.labelRef },
              fmt(V.len(V.sub(s.measure[0], s.measure[1])), 2),
              ' mm'
            ),
          (s.mode === 'measure' || (s.snapMode && !s.mateActive)) &&
            React.createElement(
              'div',
              { className: 'interaction-help' },
              React.createElement(Icon, { name: s.snapMode ? 'magnet' : 'measure', size: 16 }),
              s.snapMode
                ? this.t('이동할 면 → 대상 면 순서로 클릭', 'Click moving face → target face')
                : this.t(
                    '메쉬 또는 그리드에서 두 점을 클릭하세요.',
                    'Click two points on the mesh or grid.'
                  ),
              React.createElement(
                'button',
                {
                  className: 'icon-btn',
                  onClick: () => {
                    this.snapSource = null;
                    this.setState({ mode: 'select', snapMode: null, measure: [] });
                  }
                },
                React.createElement(Icon, { name: 'close', size: 14 })
              )
            ),
          React.createElement(
            'div',
            { className: 'orientation' },
            React.createElement(
              'svg',
              { viewBox: '0 0 90 80' },
              React.createElement('path', {
                d: 'M40 45 70 54M40 45 17 57M40 45V14',
                fill: 'none',
                stroke: '#596772',
                strokeWidth: '1.5'
              }),
              React.createElement('text', { x: '74', y: '59', fill: '#d57468' }, 'X'),
              React.createElement('text', { x: '7', y: '64', fill: '#88b790' }, 'Y'),
              React.createElement('text', { x: '36', y: '10', fill: '#73a8d6' }, 'Z'),
              React.createElement('circle', { cx: '40', cy: '45', r: '3', fill: '#aab1b4' })
            ),
            React.createElement('span', null, 'ORTHOGRAPHIC')
          ),
          React.createElement(
            'div',
            { className: 'viewport-corner' },
            React.createElement('span', { className: 'status-dot' }),
            this.t('로컬 작업 공간', 'LOCAL WORKSPACE'),
            React.createElement('small', null, 'GRID 5 mm')
          ),
          !this.list().length &&
            !s.featurePreview &&
            !s.p.sketches.length &&
            s.page === 'studio' &&
            React.createElement(
              'div',
              { className: 'viewport-empty' },
              React.createElement(Icon, { name: 'box', size: 42 }),
              React.createElement(
                'h2',
                null,
                this.t('첫 번째 형상을 만들어보세요.', 'Start with a shape.')
              ),
              React.createElement(
                'p',
                null,
                this.t(
                  '왼쪽 기본체를 선택하거나 STL · OBJ · GLB를 드롭하세요.',
                  'Choose a primitive or drop an STL, OBJ or GLB.'
                )
              ),
              React.createElement(
                Button,
                { icon: 'plus', primary: true, onClick: () => this.addPrimitive('box') },
                this.t('박스 추가', 'Add a box')
              )
            )
        ),
        React.createElement(
          'div',
          {
            className: 'workspace-footer' + (s.page === 'press' ? ' press-footer' : ''),
            'data-testid': 'workspace-footer'
          },
          React.createElement(
            'div',
            null,
            React.createElement(
              'span',
              { className: 'step-label' },
              String(['studio', 'tooling', 'press', 'assembly'].indexOf(s.page) + 1).padStart(
                2,
                '0'
              ),
              ' / 04'
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'strong',
                null,
                this.t(
                  {
                    studio: '아이디어를 형태로',
                    tooling: '조각마다, 하나의 금형',
                    press: '첫 번째 생산 사이클',
                    assembly: '조립하고, 내보내세요'
                  }[s.page],
                  {
                    studio: 'Give your idea a shape',
                    tooling: 'One mold for every part',
                    press: 'Your first production cycle',
                    assembly: 'Assemble. Export. Share.'
                  }[s.page]
                )
              ),
              React.createElement(
                'small',
                null,
                this.t(
                  {
                    studio: '분할 후 Tooling에서 금형을 생성합니다.',
                    tooling: '구배와 두께를 확인한 후 Press로 이동합니다.',
                    press: '완료품은 아래 트레이에 자동으로 보관됩니다.',
                    assembly: 'GLB는 m, STL은 mm 단위로 저장됩니다.'
                  }[s.page],
                  {
                    studio: 'Split the body, then create molds in Tooling.',
                    tooling: 'Review draft and walls before moving to Press.',
                    press: 'Finished parts are automatically kept in the tray.',
                    assembly: 'GLB exports in metres; STL in millimetres.'
                  }[s.page]
                )
              )
            )
          ),
          s.page === 'press' &&
            React.createElement(
              'div',
              {
                className: 'press-sequence',
                'data-testid': 'press-sequence',
                role: 'group',
                'aria-label': this.t('5단계 프레스 시퀀스', '5-stage press sequence')
              },
              React.createElement(
                'div',
                { className: 'sequence-heading' },
                React.createElement(
                  'span',
                  null,
                  s.running
                    ? this.t('진행 중', 'RUNNING')
                    : s.progress === 1
                      ? this.t('사이클 완료', 'COMPLETE')
                      : this.t('사이클 대기', 'READY')
                ),
                React.createElement(
                  'strong',
                  null,
                  s.running
                    ? `${s.queueIndex} / ${s.queueTotal} · ${Math.round(s.progress * 100)}%`
                    : this.t('5단계 프레스', '5-stage press')
                )
              ),
              React.createElement(
                'div',
                { className: 'sequence-stages' },
                stages.map((stage, i) =>
                  React.createElement(
                    'div',
                    {
                      key: i,
                      'data-testid': 'press-stage-' + i,
                      title: stage,
                      className: s.running
                        ? s.phase === i
                          ? 'current'
                          : s.phase > i
                            ? 'done'
                            : ''
                        : s.progress === 1
                          ? 'done'
                          : ''
                    },
                    React.createElement(
                      'i',
                      null,
                      (s.running && s.phase > i) || (!s.running && s.progress === 1)
                        ? React.createElement(Icon, { name: 'check', size: 12 })
                        : String(i + 1).padStart(2, '0')
                    ),
                    React.createElement(
                      'span',
                      null,
                      this.t(profile.stages[0][i], profile.stages[1][i])
                    )
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'sequence-track' },
                React.createElement('i', { style: { width: s.progress * 100 + '%' } })
              )
            ),
          React.createElement(
            'div',
            { className: 'footer-actions' },
            s.page === 'studio'
              ? React.createElement(
                  Button,
                  {
                    primary: true,
                    icon: 'tool',
                    onClick: () => this.changePage('tooling'),
                    test: 'next-tooling'
                  },
                  this.t('금형 설계', 'Create tooling'),
                  React.createElement(Icon, { name: 'chevron', size: 14 })
                )
              : s.page === 'tooling'
                ? React.createElement(
                    Button,
                    {
                      primary: true,
                      icon: 'press',
                      onClick: () => this.changePage('press'),
                      test: 'next-press'
                    },
                    this.t('프레스 준비', 'Prepare press'),
                    React.createElement(Icon, { name: 'chevron', size: 14 })
                  )
                : s.page === 'press'
                  ? s.running
                    ? React.createElement(
                        Button,
                        { icon: 'stop', onClick: this.stopPress, test: 'cancel-press' },
                        this.t('사이클 취소', 'Cancel cycle')
                      )
                    : React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          Button,
                          {
                            icon: 'play',
                            disabled: !this.pressTarget(),
                            onClick: () => this.startPress(false),
                            test: 'press-one'
                          },
                          this.t('선택 프레스', 'Press selected')
                        ),
                        React.createElement(
                          Button,
                          {
                            primary: true,
                            icon: 'play',
                            disabled: !s.p.bodies.length || s.p.bodies.some((b) => !b.tool),
                            onClick: () => this.startPress(true),
                            test: 'press-all'
                          },
                          this.t('전체 프레스', 'Press all')
                        )
                      )
                  : React.createElement(
                      Button,
                      {
                        primary: true,
                        icon: 'download',
                        onClick: () =>
                          this.setState({
                            modal: 'export',
                            exportScope: s.p.assembly.length ? 'assembly' : 'all'
                          }),
                        test: 'assembly-export'
                      },
                      this.t('완성본 내보내기', 'Export assembly')
                    )
          )
        ),
        s.page === 'press' &&
          React.createElement(
            'div',
            { className: 'press-tray-bar' },
            React.createElement(Icon, { name: 'box', size: 18 }),
            React.createElement('span', null, this.t('취출 트레이', 'OUTPUT TRAY')),
            React.createElement('strong', { 'data-testid': 'tray-count' }, s.p.tray.length),
            React.createElement(
              'div',
              { className: 'tray-chips' },
              s.p.tray.map((tr, i) =>
                React.createElement(
                  'span',
                  {
                    key: tr.id,
                    'data-testid': 'press-tray-part-' + i,
                    draggable: true,
                    onDragStart: (e) => {
                      if (e.target.closest('button')) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('application/moldpress', tr.id);
                      e.dataTransfer.setData('text/plain', tr.id);
                    }
                  },
                  React.createElement('i', {
                    style: { background: M.materials[tr.material].color }
                  }),
                  React.createElement(
                    'span',
                    { className: 'chip-name', title: tr.part.name + ' #' + (i + 1) },
                    tr.part.name + ' #' + (i + 1)
                  ),
                  React.createElement(
                    'button',
                    {
                      className: 'icon-btn small delete-part',
                      'data-testid': 'delete-press-tray-' + i,
                      'aria-label': this.t('트레이 부품 삭제 #', 'Delete tray part #') + (i + 1),
                      title: this.t(
                        '트레이에서 삭제 · 조립본은 유지',
                        'Delete from tray; keep assembly copies'
                      ),
                      draggable: false,
                      disabled: s.running,
                      onClick: (e) => {
                        e.stopPropagation();
                        this.removeTray(tr.id);
                      },
                      onKeyDown: (e) => {
                        if (e.key === 'Delete') {
                          e.stopPropagation();
                          this.removeTray(tr.id);
                        }
                      }
                    },
                    React.createElement(Icon, { name: 'trash', size: 15 })
                  )
                )
              )
            ),
            React.createElement(
              Button,
              {
                icon: 'assembly',
                onClick: () => this.changePage('assembly'),
                test: 'next-assembly'
              },
              this.t('조립으로 이동', 'Go to assembly'),
              React.createElement(Icon, { name: 'chevron', size: 14 })
            )
          )
      );
    }
  });
})(window.MP);
