(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderTree() {
      const list = this.list(),
        s = this.state;
      return React.createElement(
        'section',
        { className: 'tree-section' },
        React.createElement(
          'div',
          { className: 'section-title' },
          this.t('바디 탐색기', 'BODY EXPLORER'),
          React.createElement('span', null, String(list.length).padStart(2, '0'))
        ),
        React.createElement(
          'div',
          { className: 'tree-root' },
          React.createElement(Icon, { name: 'folder', size: 15 }),
          React.createElement('span', null, s.p.name),
          React.createElement('small', null, 'mm')
        ),
        !list.length &&
          React.createElement(
            'div',
            { className: 'empty-small' },
            this.t('기본체 또는 파일을 추가하세요.', 'Add a primitive or import a file.')
          ),
        list.map((b, i) =>
          React.createElement(
            'div',
            {
              key: b.id,
              className: 'tree-row ' + (s.selected.includes(b.id) ? 'selected' : ''),
              'data-testid': 'body-' + i,
              onClick: (e) => this.select(b.id, e.shiftKey)
            },
            React.createElement(Icon, {
              name: b.group ? 'group' : b.primitive === 'pressed' ? 'check' : 'box',
              size: 16
            }),
            React.createElement('span', { title: b.name }, b.name),
            b.tool && React.createElement('i', { className: 'tiny-dot' }),
            s.page === 'assembly' &&
              React.createElement(
                'button',
                {
                  className: 'icon-btn small delete-part',
                  'data-testid': 'delete-assembly-' + i,
                  'aria-label': this.t(
                    b.name + ' 조립 부품 삭제',
                    'Delete assembly part ' + b.name
                  ),
                  title: this.t('이 조립 부품만 삭제', 'Delete only this assembly copy'),
                  onClick: (e) => {
                    e.stopPropagation();
                    this.remove([b.id]);
                  }
                },
                React.createElement(Icon, { name: 'trash', size: 15 })
              ),
            React.createElement(
              'button',
              {
                className: 'icon-btn small',
                title: this.t('표시/숨기기', 'Show/hide'),
                onClick: (e) => {
                  e.stopPropagation();
                  this.edit(this.t('표시 변경', 'Visibility'), (p) => {
                    const q = (s.page === 'assembly' ? p.assembly : p.bodies).find(
                      (x) => x.id === b.id
                    );
                    q.visible = !q.visible;
                  });
                },
                style: { opacity: b.visible ? 1 : 0.35 }
              },
              React.createElement(Icon, { name: 'eye', size: 14 })
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'tree-hint' },
          this.t('Shift + 클릭 · 다중 선택', 'Shift + click · multi-select')
        )
      );
    },
    renderStudioLeft() {
      const s = this.state,
        selected = s.selected.length;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'section',
          null,
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('기본체', 'PRIMITIVES'),
            React.createElement('span', null, '+')
          ),
          React.createElement(
            'div',
            { className: 'primitives' },
            [
              ['box', '박스', 'Box'],
              ['cylinder', '원기둥', 'Cylinder'],
              ['sphere', '구', 'Sphere'],
              ['cone', '원뿔', 'Cone'],
              ['torus', '토러스', 'Torus'],
              ['text', '텍스트', 'Text']
            ].map(([k, ko, en]) =>
              React.createElement(
                'button',
                { key: k, 'data-testid': 'add-' + k, onClick: () => this.addPrimitive(k) },
                React.createElement(Icon, { name: k, size: 24 }),
                React.createElement('span', null, this.t(ko, en))
              )
            )
          )
        ),
        React.createElement(
          'section',
          null,
          React.createElement('div', { className: 'section-title' }, this.t('바디 편집', 'MODIFY')),
          React.createElement(
            'div',
            { className: 'tool-grid' },
            React.createElement(
              Button,
              { icon: 'copy', onClick: this.duplicate, disabled: !selected, test: 'duplicate' },
              this.t('복제', 'Duplicate')
            ),
            React.createElement(
              Button,
              { icon: 'mirror', onClick: this.mirror, disabled: !selected, test: 'mirror' },
              this.t('미러', 'Mirror')
            ),
            React.createElement(
              Button,
              { icon: 'align', onClick: this.align, disabled: !selected, test: 'align' },
              this.t('정렬 적용', 'Align')
            ),
            React.createElement(
              Button,
              { icon: 'group', onClick: this.group, disabled: !selected, test: 'group' },
              this.t('그룹/해제', 'Group')
            )
          ),
          React.createElement(
            'div',
            { className: 'inline-small' },
            React.createElement('span', null, this.t('정렬 축', 'Align axis')),
            React.createElement(
              'select',
              {
                'aria-label': 'Align axis',
                'data-testid': 'align-axis',
                value: s.alignAxis,
                onChange: (e) => this.setState({ alignAxis: e.target.value })
              },
              ['XYZ', 'X', 'Y', 'Z'].map((x) => React.createElement('option', { key: x }, x))
            )
          ),
          React.createElement(
            'div',
            { className: 'inline-small alignment-field' },
            React.createElement('span', null, this.t('맞출 위치', 'Bounds')),
            React.createElement(
              'select',
              {
                'aria-label': 'Align bounds',
                'data-testid': 'align-mode',
                value: s.alignMode,
                onChange: (e) => this.setState({ alignMode: e.target.value })
              },
              [
                ['min', '최소 면', 'Minimum'],
                ['center', '중심', 'Centre'],
                ['max', '최대 면', 'Maximum']
              ].map(([key, ko, en]) =>
                React.createElement('option', { key, value: key }, this.t(ko, en))
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'inline-small alignment-field' },
            React.createElement('span', null, this.t('기준', 'Reference')),
            React.createElement(
              'select',
              {
                'aria-label': 'Align reference',
                'data-testid': 'align-reference',
                value: s.alignReference,
                onChange: (e) => this.setState({ alignReference: e.target.value })
              },
              React.createElement(
                'option',
                { value: 'first' },
                this.t('첫 선택 바디', 'First selected')
              ),
              React.createElement(
                'option',
                { value: 'origin' },
                this.t('월드 원점', 'World origin')
              )
            )
          ),
          React.createElement(
            'p',
            { className: 'tree-hint align-hint', 'data-testid': 'align-reference-hint' },
            this.t('월드 축 외곽 기준 · ', 'World-axis bounds · '),
            selected < 2 || s.alignReference === 'origin'
              ? this.t('원점 0 mm', 'Origin 0 mm')
              : this.t('기준: ', 'Reference: ') + (this.selectedBodies()[0]?.name || '')
          )
        ),
        React.createElement(
          'section',
          null,
          React.createElement(
            'div',
            { className: 'section-title' },
            this.t('불리언', 'BOOLEAN'),
            React.createElement('small', null, 'CSG')
          ),
          React.createElement(
            'div',
            { className: 'three-tools' },
            [
              ['union', '합치기', 'Union'],
              ['subtract', '빼기', 'Subtract'],
              ['intersect', '교차', 'Intersect']
            ].map(([k, ko, en]) =>
              React.createElement(
                Button,
                { key: k, icon: k, test: 'boolean-' + k, onClick: () => this.boolean(k) },
                this.t(ko, en)
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'tool-grid edge-tools' },
            React.createElement(
              Button,
              {
                icon: 'round',
                disabled: !selected,
                onClick: () => this.fillet(false),
                test: 'fillet'
              },
              this.t('필렛 · 근사', 'Fillet ≈')
            ),
            React.createElement(
              Button,
              {
                icon: 'chamfer',
                disabled: !selected,
                onClick: () => this.fillet(true),
                test: 'chamfer'
              },
              this.t('챔퍼 · 근사', 'Chamfer ≈')
            )
          ),
          React.createElement(
            'div',
            { className: 'inline-small' },
            React.createElement('span', null, this.t('모서리 반경', 'Edge radius')),
            React.createElement(
              'label',
              { className: 'unit-input compact' },
              React.createElement('input', {
                'aria-label': 'Edge radius',
                type: 'number',
                min: '.2',
                max: '12',
                step: '.2',
                value: s.toolRadius,
                onChange: (e) => this.setState({ toolRadius: Math.max(0.2, +e.target.value) })
              }),
              React.createElement('span', null, 'mm')
            )
          )
        ),
        this.renderTree(),
        React.createElement(
          'section',
          { className: 'sidebar-bottom' },
          React.createElement(
            Button,
            { icon: 'upload', onClick: () => this.inputRef.current.click(), className: 'full' },
            this.t('STL / OBJ / GLB 가져오기', 'Import STL / OBJ / GLB')
          )
        )
      );
    }
  });
})(window.MP);
