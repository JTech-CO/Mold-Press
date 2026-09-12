(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    render() {
      const s = this.state,
        p = s.p;
      return React.createElement(
        'div',
        { className: 'app-shell' },
        React.createElement(
          'header',
          { className: 'app-header' },
          React.createElement(
            'button',
            { className: 'brand', onClick: () => this.setState({ modal: 'samples' }) },
            React.createElement(
              'span',
              { className: 'brand-mark' },
              React.createElement('i', null),
              React.createElement('i', null),
              React.createElement('b', null)
            ),
            React.createElement(
              'span',
              null,
              React.createElement(
                'strong',
                null,
                'MOLD PRESS',
                React.createElement('span', { className: 'preview-tag' }, 'v1.1')
              ),
              React.createElement('small', null, 'BROWSER MANUFACTURING LAB')
            )
          ),
          React.createElement(
            'div',
            { className: 'project-breadcrumb' },
            React.createElement(
              'span',
              { className: 'breadcrumb-label' },
              this.t('프로젝트', 'Projects')
            ),
            React.createElement('span', { className: 'slash' }, '/'),
            React.createElement(
              'button',
              {
                'data-testid': 'open-projects',
                onClick: () => this.setState({ modal: 'samples' })
              },
              p.name,
              React.createElement(Icon, { name: 'down', size: 13 })
            ),
            React.createElement(
              'span',
              { className: 'save-state ' + s.save, 'data-testid': 'save-status' },
              React.createElement('i', { className: 'status-dot' }),
              s.save === 'saved'
                ? this.t('자동 저장됨', 'Saved locally')
                : s.save === 'saving'
                  ? this.t('저장 중', 'Saving')
                  : this.t('저장 실패', 'Save failed')
            )
          ),
          React.createElement(
            'div',
            { className: 'header-actions' },
            React.createElement(Button, {
              icon: 'undo',
              title: 'Undo \u00B7 Ctrl+Z',
              test: 'undo',
              disabled: !s.undoCount || s.running,
              onClick: this.undo
            }),
            React.createElement(Button, {
              icon: 'redo',
              title: 'Redo \u00B7 Ctrl+Y',
              test: 'redo',
              disabled: !s.redoCount || s.running,
              onClick: this.redo
            }),
            React.createElement(
              Button,
              {
                icon: 'refresh',
                className: 'reset-project',
                test: 'reset-project',
                disabled: !!s.busy,
                title: this.t(
                  '모델링·금형·프레스·조립 전체 초기화',
                  'Reset modeling, tooling, press and assembly'
                ),
                onClick: this.requestReset
              },
              this.t('초기화', 'Reset')
            ),
            React.createElement('span', { className: 'action-divider' }),
            React.createElement(
              Button,
              { icon: 'share', onClick: this.share, test: 'share' },
              this.t('공유', 'Share')
            ),
            React.createElement(
              Button,
              {
                primary: true,
                icon: 'download',
                test: 'open-export',
                onClick: () =>
                  this.setState({
                    modal: 'export',
                    exportScope: s.page === 'assembly' && p.assembly.length ? 'assembly' : 'all'
                  })
              },
              this.t('내보내기', 'Export')
            )
          )
        ),
        React.createElement(
          'nav',
          { className: 'main-nav' },
          React.createElement(
            'div',
            { className: 'stage-tabs' },
            [
              ['studio', 'box', 'Studio', '모델링'],
              ['tooling', 'tool', 'Tooling', '금형'],
              ['press', 'press', 'Press', '프레스'],
              ['assembly', 'assembly', 'Assembly', '조립']
            ].map(([key, icon, en, ko], i) =>
              React.createElement(
                'button',
                {
                  key: key,
                  'data-testid': 'tab-' + key,
                  className: s.page === key ? 'selected' : '',
                  onClick: () => this.changePage(key),
                  onDragOver: (e) => {
                    if (key === 'assembly') {
                      e.preventDefault();
                      this.changePage('assembly');
                    }
                  }
                },
                React.createElement('span', { className: 'tab-number' }, '0', i + 1),
                React.createElement(Icon, { name: icon }),
                React.createElement('strong', null, en),
                React.createElement('span', { className: 'tab-sub' }, this.t(ko, '')),
                key === 'assembly' &&
                  p.tray.length > 0 &&
                  React.createElement('span', { className: 'tab-count' }, p.tray.length)
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'nav-right' },
            React.createElement(
              'span',
              { className: 'emulation-badge' },
              React.createElement('i', null),
              this.t('에뮬레이션(간이)', 'SIMPLIFIED EMULATION')
            ),
            React.createElement('span', { className: 'unit-badge' }, 'mm'),
            React.createElement(
              'div',
              { className: 'language-toggle' },
              React.createElement(
                'button',
                {
                  'data-testid': 'lang-ko',
                  className: s.lang === 'ko' ? 'active' : '',
                  onClick: () => this.setState({ lang: 'ko' })
                },
                'KR'
              ),
              React.createElement(
                'button',
                {
                  'data-testid': 'lang-en',
                  className: s.lang === 'en' ? 'active' : '',
                  onClick: () => this.setState({ lang: 'en' })
                },
                'EN'
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'main-layout' },
          React.createElement(
            'aside',
            { className: 'left-sidebar' },
            React.createElement(
              'div',
              { className: 'panel-heading' },
              React.createElement(
                'span',
                null,
                this.t(
                  {
                    studio: '디자인 도구',
                    tooling: '금형 세트',
                    press: '소재 & 공정',
                    assembly: '부품 & 조립'
                  }[s.page],
                  {
                    studio: 'DESIGN TOOLS',
                    tooling: 'TOOLING SET',
                    press: 'MATERIAL & PROCESS',
                    assembly: 'PARTS & ASSEMBLY'
                  }[s.page]
                )
              ),
              React.createElement(Icon, {
                name:
                  s.page === 'studio'
                    ? 'box'
                    : s.page === 'tooling'
                      ? 'tool'
                      : s.page === 'press'
                        ? 'press'
                        : 'assembly',
                size: 15
              })
            ),
            s.page === 'studio'
              ? this.renderStudioLeft()
              : s.page === 'tooling'
                ? this.renderToolLeft()
                : s.page === 'press'
                  ? this.renderPressLeft()
                  : this.renderAssemblyLeft()
          ),
          this.renderViewport(),
          this.renderInspector()
        ),
        React.createElement(
          'footer',
          { className: 'statusbar' },
          React.createElement(
            'span',
            null,
            React.createElement('i', { className: 'status-dot' }),
            ' ',
            this.t('로컬 세션', 'LOCAL SESSION'),
            React.createElement('b', null, '\u00B7'),
            React.createElement(
              'span',
              {
                title: this.t(
                  'Three.js CDN 불가 시 내장 렌더러 사용',
                  'Built-in renderer when Three.js CDN is unavailable'
                )
              },
              s.engine
            )
          ),
          React.createElement(
            'span',
            null,
            this.t('바디', 'BODIES'),
            ' ',
            p.bodies.length,
            React.createElement('b', null, '\u00B7'),
            this.t('금형', 'MOLDS'),
            ' ',
            p.bodies.filter((b) => b.tool).length,
            React.createElement('b', null, '\u00B7'),
            this.t('완료품', 'PRESSED'),
            ' ',
            p.tray.length
          ),
          React.createElement(
            'button',
            { onClick: () => this.setState({ modal: 'help' }) },
            React.createElement(Icon, { name: 'info', size: 13 }),
            this.t('조작법 & 한계', 'Controls & limitations'),
            React.createElement('kbd', null, '?')
          )
        ),
        React.createElement('input', {
          ref: this.inputRef,
          type: 'file',
          style: { display: 'none' },
          multiple: true,
          accept: '.stl,.obj,.glb,.json',
          'data-testid': 'file-import',
          onChange: (e) => {
            if (e.target.files.length) this.import([...e.target.files]);
            e.target.value = '';
          }
        }),
        s.toast &&
          React.createElement(
            'div',
            { className: 'toast', role: 'status' },
            React.createElement(Icon, { name: 'info', size: 18 }),
            React.createElement('span', null, s.toast),
            React.createElement(
              'button',
              { className: 'icon-btn', onClick: () => this.setState({ toast: '' }) },
              React.createElement(Icon, { name: 'close', size: 14 })
            )
          ),
        this.renderModal(),
        s.busy &&
          React.createElement(
            'div',
            { className: 'busy-cover' },
            React.createElement(
              'div',
              null,
              React.createElement('span', { className: 'spinner' }),
              React.createElement('strong', null, s.busy),
              s.jobMode &&
                React.createElement(
                  'div',
                  { className: 'job-status', 'data-testid': 'job-status' },
                  React.createElement('progress', { value: s.jobProgress, max: 100 }),
                  React.createElement('span', null, s.jobProgress + '%'),
                  React.createElement(
                    'small',
                    null,
                    s.jobMode === 'worker'
                      ? this.t('백그라운드 연산', 'Background processing')
                      : this.t(
                          '로컬 파일 모드: 개별 연산은 화면을 잠시 멈출 수 있습니다.',
                          'Local file mode: individual operations may briefly block the view.'
                        )
                  ),
                  React.createElement(
                    'button',
                    { className: 'btn', 'data-testid': 'cancel-job', onClick: this.cancelJob },
                    this.t('연산 취소', 'Cancel operation')
                  )
                ),
              React.createElement(
                'small',
                null,
                this.t(
                  '브라우저 안에서 처리 중 · 외부 전송 없음',
                  'Processing in your browser · no upload'
                )
              )
            )
          )
      );
    }
  });
})(window.MP);
