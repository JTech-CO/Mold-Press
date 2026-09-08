(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderAssemblyLeft() {
      const s = this.state;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'section',
          null,
          React.createElement('div', { className: 'eyebrow' }, 'ASSEMBLY WORKSPACE'),
          React.createElement('h2', null, this.t('조각에서 제품으로.', 'From parts to product.')),
          React.createElement(
            'p',
            { className: 'muted' },
            this.t(
              '트레이에서 드래그하거나 +로 추가합니다. 겹치는 위치는 옆으로 8 mm 간격을 두고 배치합니다.',
              'Drag or click + to add. Occupied positions shift sideways with an 8 mm gap.'
            )
          ),
          React.createElement(
            Button,
            {
              primary: true,
              icon: 'assembly',
              onClick: this.autoAssemble,
              disabled: !s.p.tray.length,
              className: 'full',
              test: 'auto-assemble'
            },
            this.t('설계 위치로 자동 조립', 'Assemble to design positions')
          )
        ),
        this.renderMateTools(),
        React.createElement(
          'section',
          { className: 'tray-section' },
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('취출 트레이', 'OUTPUT TRAY'),
            React.createElement('span', null, String(s.p.tray.length).padStart(2, '0'))
          ),
          !s.p.tray.length
            ? React.createElement(
                'div',
                { className: 'empty-small' },
                this.t(
                  '완료품이 없습니다. Press에서 첫 사이클을 실행하세요.',
                  'No finished parts yet. Run a cycle in Press.'
                ),
                React.createElement(
                  Button,
                  { icon: 'press', onClick: () => this.changePage('press') },
                  'Press'
                )
              )
            : s.p.tray.map((tr, i) =>
                React.createElement(
                  'div',
                  {
                    key: tr.id,
                    'data-testid': 'tray-part-' + i,
                    draggable: true,
                    onDragStart: (e) => {
                      e.dataTransfer.setData('application/moldpress', tr.id);
                      e.dataTransfer.setData('text/plain', tr.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    },
                    className: 'tray-card'
                  },
                  React.createElement(
                    'div',
                    { className: 'part-mini', style: { color: M.materials[tr.material].color } },
                    React.createElement(Icon, { name: 'box', size: 30 })
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement('strong', null, tr.part.name),
                    React.createElement(
                      'small',
                      null,
                      tr.material,
                      ' ',
                      React.createElement('b', null, '\u00B7'),
                      ' #',
                      String(i + 1).padStart(3, '0')
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'tray-actions' },
                    React.createElement(
                      'button',
                      {
                        className: 'icon-btn',
                        'data-testid': 'add-tray-' + i,
                        title: this.t('조립에 추가', 'Add to assembly'),
                        draggable: false,
                        onClick: (e) => {
                          e.stopPropagation();
                          this.addTray(tr.id);
                        }
                      },
                      React.createElement(Icon, { name: 'plus', size: 16 })
                    ),
                    React.createElement(
                      'button',
                      {
                        className: 'icon-btn delete-part',
                        'data-testid': 'delete-tray-' + i,
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
                        }
                      },
                      React.createElement(Icon, { name: 'trash', size: 16 })
                    )
                  )
                )
              )
        ),
        this.renderTree(),
        this.renderAssemblyAlignment()
      );
    },
    renderAssemblyAlignment() {
      const s = this.state,
        anchor = s.p.assembly.find((b) => b.id === s.selected[0]),
        reference =
          s.assemblyAlignAxis === 'mate'
            ? s.p.assembly.find((b) => b.id === anchor?.mate?.targetId)
            : anchor;
      return React.createElement(
        'section',
        { className: 'assembly-alignment', 'data-testid': 'assembly-alignment' },
        React.createElement(
          'div',
          { className: 'section-title' },
          this.t('정렬 보정', 'ALIGNMENT CORRECTION')
        ),
        React.createElement(
          'div',
          { className: 'inline-small alignment-field' },
          React.createElement('span', null, this.t('정렬 축', 'Axes')),
          React.createElement(
            'select',
            {
              'data-testid': 'assembly-align-axis',
              'aria-label': 'Assembly align axes',
              value: s.assemblyAlignAxis,
              onChange: (e) => this.setState({ assemblyAlignAxis: e.target.value })
            },
            ['XY', 'YZ', 'XZ', 'X', 'Y', 'Z', 'XYZ', 'mate'].map((axis) =>
              React.createElement(
                'option',
                { key: axis, value: axis },
                axis === 'mate' ? this.t('스냅면 안', 'Mating plane') : axis
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'inline-small alignment-field' },
          React.createElement('span', null, this.t('맞출 기준', 'Bounds')),
          React.createElement(
            'select',
            {
              'data-testid': 'assembly-align-mode',
              'aria-label': 'Assembly alignment bounds',
              value: s.assemblyAlignMode,
              onChange: (e) => this.setState({ assemblyAlignMode: e.target.value })
            },
            [
              ['min', '최소 면', 'Min face'],
              ['center', '중심', 'Centre'],
              ['max', '최대 면', 'Max face']
            ].map(([key, ko, en]) =>
              React.createElement('option', { key, value: key }, this.t(ko, en))
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'inline-small alignment-field' },
          React.createElement('span', null, this.t('기준 위치', 'Reference')),
          React.createElement(
            'select',
            {
              'data-testid': 'assembly-align-reference',
              'aria-label': 'Assembly alignment reference',
              value: s.assemblyAlignReference,
              disabled: s.assemblyAlignAxis === 'mate',
              onChange: (e) => this.setState({ assemblyAlignReference: e.target.value })
            },
            React.createElement(
              'option',
              { value: 'first' },
              s.assemblyAlignAxis === 'mate'
                ? this.t('스냅 대상', 'Snap target')
                : this.t('첫 선택 부품', 'First selected')
            ),
            React.createElement('option', { value: 'origin' }, this.t('월드 원점', 'World origin'))
          )
        ),
        React.createElement(
          'p',
          { className: 'tiny-text' },
          s.assemblyAlignAxis === 'mate'
            ? this.t(
                '스냅한 이동 부품을 선택하면 접합면 안에서만 이동합니다. 접합면 간격은 유지됩니다.',
                'Select the snapped moving part. Correction stays in the mating plane and retains its gap.'
              )
            : this.t(
                '기준 부품 → Shift+클릭으로 이동 부품 선택. 선택한 축만 이동하며 회전은 바꾸지 않습니다.',
                'Reference first → Shift-click moving parts. Only chosen axes move; rotations stay unchanged.'
              )
        ),
        reference &&
          React.createElement(
            'div',
            { className: 'alignment-anchor', title: reference.name },
            s.assemblyAlignAxis === 'mate'
              ? this.t('스냅 대상: ', 'Snap target: ')
              : this.t('첫 선택: ', 'First selected: '),
            reference.name
          ),
        React.createElement(
          Button,
          {
            icon: 'align',
            className: 'full',
            test: 'assembly-align',
            disabled: !s.selected.length,
            onClick: this.align
          },
          this.t('정렬 적용', 'Apply alignment')
        )
      );
    }
  });
})(window.MP);
