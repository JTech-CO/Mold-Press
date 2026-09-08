(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  Object.assign(M.AppViews, {
    renderExportResult() {
      const s = this.state,
        f = s.exportFile;
      return React.createElement(
        React.Fragment,
        null,
        s.exportError &&
          React.createElement(
            'div',
            { className: 'check-note danger', role: 'alert', 'data-testid': 'export-error' },
            s.exportError
          ),
        f &&
          React.createElement(
            'div',
            { className: 'export-result', 'data-testid': 'export-result' },
            React.createElement('strong', null, this.t('생성된 파일', 'GENERATED FILE')),
            React.createElement(
              'span',
              { className: 'export-filename', title: f.name },
              f.name,
              ' · ',
              fmt(f.size / 1024, 1),
              ' KB'
            ),
            React.createElement(
              'a',
              {
                className: 'btn primary full',
                href: f.url,
                download: f.name,
                'data-testid': 'save-export-file',
                onClick: () =>
                  this.notice(
                    this.t(
                      '브라우저에 저장을 요청했습니다. 다운로드 목록을 확인하세요.',
                      'Save requested. Check your browser downloads.'
                    )
                  )
              },
              React.createElement(Icon, { name: 'download', size: 16 }),
              this.t('파일 저장 · 다시 시도', 'Save file · retry')
            ),
            f.type === 'image/png' &&
              React.createElement('img', {
                src: f.url,
                className: 'export-png-preview',
                alt: this.t('현재 뷰 PNG', 'Current view PNG'),
                'data-testid': 'export-png-preview'
              }),
            React.createElement(
              'p',
              { className: 'tiny-text', role: 'status' },
              f.permission === 'blocked'
                ? this.t(
                    '현재 iframe은 다운로드를 차단합니다. 파일 내용은 생성됐습니다. HTML을 브라우저에서 직접 열어 저장하세요. 앱은 상위 페이지의 권한을 변경하지 않습니다.',
                    'This iframe blocks downloads. File bytes are ready. Open the HTML directly in your browser to save. The app does not change host permissions.'
                  )
                : this.t(
                    '파일 생성과 디스크 저장은 별개입니다. 저장되지 않으면 위 링크를 직접 누르고 브라우저의 다운로드 권한을 확인하세요.',
                    'Generation is not confirmation of disk saving. Click the link and check browser download permissions if needed.'
                  )
            )
          )
      );
    },
    renderModal() {
      const s = this.state;
      if (!s.modal) return null;
      const title = {
        reset: this.t('초기화 하시겠습니까?', 'Reset the entire project?'),
        samples: this.t('프로젝트 시작', 'Start a project'),
        export: this.t('내보내기', 'Export your work'),
        share: this.t('프로젝트 복제 링크', 'Project clone link'),
        text: this.t('텍스트 · 솔리드 / 각인', 'Text · solid / engraving'),
        help: this.t('사용법 및 한계', 'Controls & limitations')
      }[s.modal];
      return React.createElement(
        'div',
        {
          className: 'modal-backdrop',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) this.setState({ modal: null });
          }
        },
        React.createElement(
          'div',
          {
            className: 'modal ' + (s.modal === 'samples' ? 'wide' : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': title,
            'data-testid': s.modal === 'reset' ? 'reset-dialog' : undefined,
            onKeyDown: (e) => {
              if (s.modal === 'reset' && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.cancelReset();
              }
            }
          },
          React.createElement(
            'div',
            { className: 'modal-head' },
            React.createElement(
              'div',
              null,
              React.createElement('div', { className: 'eyebrow' }, 'MOLD PRESS / LOCAL WORKSPACE'),
              React.createElement('h2', null, title)
            ),
            React.createElement(
              'button',
              {
                className: 'icon-btn',
                'aria-label': 'Close dialog',
                onClick: () => this.setState({ modal: null })
              },
              React.createElement(Icon, { name: 'close' })
            )
          ),
          s.modal === 'reset' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'p',
                { className: 'muted' },
                this.t(
                  '현재 프로젝트의 모델링, 스케치·피처, 금형, 프레스 대기열·완료품, 조립·Mate를 모두 지우고 빈 Studio로 돌아갑니다.',
                  'Clear this project’s bodies, sketches, features, molds, press queue, tray, assembly and mates, then return to an empty Studio.'
                )
              ),
              React.createElement(
                'p',
                { className: 'reset-warning' },
                this.t(
                  '실행취소·다시실행 기록도 삭제됩니다. 초기화 후에는 되돌릴 수 없습니다.',
                  'Undo and redo history will also be cleared. This reset cannot be undone.'
                )
              ),
              React.createElement(
                'div',
                { className: 'modal-actions' },
                React.createElement(
                  Button,
                  { test: 'reset-cancel', onClick: this.cancelReset },
                  this.t('취소', 'Cancel')
                ),
                React.createElement(
                  Button,
                  { test: 'reset-confirm', className: 'danger', onClick: this.resetProject },
                  this.t('확인 · 전체 초기화', 'Confirm reset')
                )
              )
            ),
          s.modal === 'samples' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'div',
                { className: 'sample-cards' },
                [
                  [
                    'earbuds',
                    '무선이어폰 케이스',
                    'Wireless earbud case',
                    '중공 바디 → 2조각 분할',
                    'Hollow shell → two-part split'
                  ],
                  ['drone', '드론 암', 'Drone arm', '모터 마운트 + 클램프', 'Motor mount + clamp'],
                  [
                    'grip',
                    '카메라 핸드그립',
                    'Camera handgrip',
                    '곡면 그립 + 상판',
                    'Contoured grip + top plate'
                  ]
                ].map(([id, ko, en, subko, suben], i) =>
                  React.createElement(
                    'button',
                    {
                      className: 'sample-card',
                      'data-testid': 'sample-' + id,
                      key: id,
                      onClick: () => this.loadSample(id)
                    },
                    React.createElement(
                      'div',
                      { className: 'sample-drawing ' + id },
                      React.createElement(Icon, {
                        name: i === 0 ? 'box' : i === 1 ? 'rotate' : 'camera',
                        size: 72
                      }),
                      React.createElement('span', null, '0', i + 1)
                    ),
                    React.createElement('strong', null, this.t(ko, en)),
                    React.createElement('small', null, this.t(subko, suben)),
                    React.createElement(
                      'span',
                      { className: 'sample-action' },
                      this.t('샘플 열기', 'Open sample'),
                      React.createElement(Icon, { name: 'chevron', size: 14 })
                    )
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'modal-actions' },
                React.createElement(
                  'p',
                  { className: 'muted' },
                  this.t(
                    '기존 작업으로 돌아가려면 실행취소(Ctrl+Z)를 사용하세요.',
                    'Use Undo (Ctrl+Z) to return to your previous project.'
                  )
                ),
                React.createElement(
                  Button,
                  {
                    icon: 'plus',
                    primary: true,
                    test: 'new-project',
                    onClick: () => this.loadSample('new')
                  },
                  this.t('빈 프로젝트', 'Blank project')
                )
              )
            ),
          s.modal === 'export' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'label',
                { className: 'form-label' },
                this.t('내보내기 범위', 'Export scope')
              ),
              React.createElement(
                'select',
                {
                  className: 'full select-tall',
                  'data-testid': 'export-scope',
                  value: s.exportScope,
                  onChange: (e) => this.setState({ exportScope: e.target.value })
                },
                React.createElement(
                  'option',
                  { value: 'all' },
                  this.t('Studio · 전체 바디', 'Studio · all bodies')
                ),
                React.createElement(
                  'option',
                  { value: 'selected' },
                  this.t('현재 화면 · 선택 바디', 'Current view · selected bodies')
                ),
                React.createElement(
                  'option',
                  { value: 'assembly' },
                  this.t('Assembly · 조립본', 'Assembly · assembled product')
                )
              ),
              React.createElement(
                'div',
                { className: 'export-grid' },
                React.createElement(
                  'button',
                  { 'data-testid': 'export-glb', onClick: () => this.export('glb') },
                  React.createElement(Icon, { name: 'box', size: 28 }),
                  React.createElement('strong', null, 'GLB'),
                  React.createElement(
                    'span',
                    null,
                    this.t('소재 포함 · m · Y-up', 'Materials · m · Y-up')
                  )
                ),
                React.createElement(
                  'button',
                  { 'data-testid': 'export-stl', onClick: () => this.export('stl') },
                  React.createElement(Icon, { name: 'download', size: 28 }),
                  React.createElement('strong', null, 'STL'),
                  React.createElement(
                    'span',
                    null,
                    this.t('바이너리 · mm · Z-up', 'Binary · mm · Z-up')
                  )
                ),
                React.createElement(
                  'button',
                  { 'data-testid': 'export-parts', onClick: () => this.export('parts') },
                  React.createElement(Icon, { name: 'assembly', size: 28 }),
                  React.createElement('strong', null, 'STL / ZIP'),
                  React.createElement(
                    'span',
                    null,
                    this.t('조각별 파일 일괄', 'Individual part files')
                  )
                ),
                React.createElement(
                  'button',
                  { 'data-testid': 'export-png', onClick: () => this.export('png') },
                  React.createElement(Icon, { name: 'camera', size: 28 }),
                  React.createElement('strong', null, 'PNG'),
                  React.createElement('span', null, this.t('현재 3D 뷰', 'Current 3D view'))
                )
              ),
              React.createElement(
                Button,
                {
                  icon: 'download',
                  className: 'full',
                  test: 'export-json',
                  onClick: () => this.export('json')
                },
                this.t('프로젝트 JSON 백업', 'Back up project JSON')
              ),
              React.createElement(
                'p',
                { className: 'tiny-text' },
                this.t(
                  '폭발도·기즈모·금형은 제품 내보내기에 포함되지 않습니다. STL에는 단위 메타데이터가 없으므로 가져올 때 mm를 지정하세요.',
                  'Product exports exclude explosion, gizmos and tooling. STL has no unit metadata: select mm when importing.'
                )
              ),
              this.renderExportResult()
            ),
          s.modal === 'share' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'div',
                { className: 'warning-box' },
                this.t(
                  '이 링크는 같은 브라우저 프로필·같은 사이트의 저장 권한 안에서 프로젝트를 복제합니다. 다른 사람/기기용 공개 링크가 아닙니다.',
                  'This link clones the project within the same browser profile and site storage. It is not a public cross-device share link.'
                )
              ),
              React.createElement('input', {
                id: 'share-link',
                className: 'full share-input',
                value: s.shareLink,
                readOnly: true,
                placeholder: s.shareBusy
                  ? this.t('복제 링크 생성 중…', 'Preparing clone link…')
                  : this.t('복제 링크를 사용할 수 없습니다.', 'Clone link unavailable.')
              }),
              s.shareError &&
                React.createElement(
                  'div',
                  { className: 'check-note warn', 'data-testid': 'share-error', role: 'status' },
                  s.shareError
                ),
              React.createElement(
                'div',
                { className: 'modal-actions' },
                React.createElement(
                  Button,
                  {
                    icon: 'copy',
                    primary: true,
                    test: 'copy-share',
                    disabled: !s.shareLink,
                    onClick: this.copyLink
                  },
                  this.t('링크 복사', 'Copy link')
                ),
                React.createElement(
                  'a',
                  {
                    className: 'btn' + (!s.shareLink ? ' disabled' : ''),
                    'data-testid': 'open-share-copy',
                    'aria-disabled': !s.shareLink,
                    href: s.shareLink || undefined,
                    target: '_blank',
                    rel: 'noopener'
                  },
                  this.t('새 탭에서 복제', 'Clone in new tab'),
                  React.createElement(Icon, { name: 'chevron', size: 15 })
                )
              ),
              React.createElement('div', { className: 'divider' }),
              React.createElement(
                'p',
                { className: 'muted' },
                this.t(
                  '다른 사람에게는 프로젝트 JSON이나 PNG를 전달하세요. 서버에 업로드되지 않습니다.',
                  'Send a project JSON or PNG to others. Nothing is uploaded to a server.'
                )
              ),
              React.createElement(
                'div',
                { className: 'tool-grid' },
                React.createElement(
                  Button,
                  { icon: 'download', test: 'share-json', onClick: () => this.export('json') },
                  'JSON'
                ),
                React.createElement(
                  Button,
                  { icon: 'camera', test: 'share-png', onClick: () => this.export('png') },
                  'PNG'
                )
              ),
              this.renderExportResult()
            ),
          s.modal === 'text' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'label',
                { className: 'form-label' },
                this.t('텍스트 (최대 16자)', 'Text (up to 16 characters)')
              ),
              React.createElement('input', {
                'data-testid': 'engrave-text',
                className: 'full text-entry',
                value: s.text,
                maxLength: '16',
                onChange: (e) => this.setState({ text: e.target.value })
              }),
              React.createElement(
                'div',
                { className: 'form-row' },
                React.createElement('label', null, this.t('문자 높이', 'Text height')),
                React.createElement(
                  'label',
                  { className: 'unit-input' },
                  React.createElement('input', {
                    type: 'number',
                    min: '2',
                    max: '30',
                    value: s.textSize,
                    onChange: (e) =>
                      this.setState({ textSize: Math.max(2, Math.min(30, +e.target.value)) })
                  }),
                  React.createElement('span', null, 'mm')
                )
              ),
              React.createElement(
                'div',
                { className: 'form-row' },
                React.createElement('label', null, this.t('각인 깊이', 'Engraving depth')),
                React.createElement(
                  'label',
                  { className: 'unit-input' },
                  React.createElement('input', {
                    type: 'number',
                    min: '.2',
                    max: '8',
                    step: '.1',
                    value: s.textDepth,
                    onChange: (e) =>
                      this.setState({ textDepth: Math.max(0.2, Math.min(8, +e.target.value)) })
                  }),
                  React.createElement('span', null, 'mm')
                )
              ),
              React.createElement(
                'p',
                { className: 'muted' },
                this.t(
                  '픽셀 스트립 근사 메쉬입니다. 각인은 선택 바디의 +Z 상단 중앙에 적용합니다.',
                  'Pixel-strip mesh approximation. Engraving is applied to the centre of the selected body’s +Z top.'
                )
              ),
              React.createElement(
                'div',
                { className: 'modal-actions' },
                React.createElement(
                  Button,
                  { icon: 'plus', onClick: () => this.text(false), test: 'text-solid' },
                  this.t('솔리드 추가', 'Add solid')
                ),
                React.createElement(
                  Button,
                  {
                    primary: true,
                    icon: 'text',
                    disabled: !this.active(),
                    onClick: () => this.text(true),
                    test: 'text-engrave'
                  },
                  this.t('각인 실행', 'Engrave')
                )
              )
            ),
          s.modal === 'help' &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'div',
                { className: 'help-keys' },
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'Drag'),
                  this.t(
                    '도형: 이동/회전 모드에 따라 변형 · 빈 공간: 뷰 회전',
                    'On body: move/rotate by tool mode · empty space: orbit'
                  )
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'Right drag'),
                  this.t('이동 / 패닝', 'Pan')
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'Wheel'),
                  this.t('확대 / 축소', 'Zoom')
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'Shift + click'),
                  this.t('다중 선택', 'Multi-select')
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'G / R / S'),
                  this.t(
                    '이동 / 회전 / 스케일 · 회전 중 Shift: 30° 스냅',
                    'Move / rotate / scale · Shift while rotating: 30° snap'
                  )
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'M / F'),
                  this.t('거리 측정 / 화면 맞춤', 'Measure / fit')
                ),
                React.createElement(
                  'p',
                  null,
                  React.createElement('kbd', null, 'Ctrl + Z / Y'),
                  this.t('실행취소 / 다시실행', 'Undo / redo')
                )
              ),
              React.createElement(
                'p',
                { className: 'muted' },
                this.t(
                  '선택/이동 모드에서 도형을 직접 드래그하거나 X/Y/Z 핸들을 드래그하세요. 기본체와 모든 연산은 삼각형 메쉬 기준입니다. CSG는 닫힌 메쉬에 적합하며 비다양체·매우 복잡한 입력은 실패할 수 있습니다.',
                  'In Select/Move mode, drag a body directly or use its X/Y/Z handles. All operations use triangle meshes. CSG expects closed solids and may fail on non-manifold or highly complex input.'
                )
              ),
              React.createElement(
                'div',
                { className: 'warning-box' },
                this.t(
                  '기본 렌더링은 Three.js입니다. CDN 연결이 불가능하면 내장 WebGL 렌더러로 자동 대체합니다. 모델·저장·CSG는 외부 연결 없이 동작합니다.',
                  'Three.js is used when its CDN is reachable; otherwise the built-in WebGL renderer is used. Modeling, storage and CSG operate without external connections.'
                )
              ),
              React.createElement(
                'p',
                { className: 'tiny-text' },
                'React 16.0 \u00B7 Three.js r152 / local WebGL \u00B7 BSP CSG \u00B7 GLB 2.0',
                React.createElement('br', null),
                ' ',
                this.t(
                  'STL/OBJ: mm · GLB: m · 텍스처/애니메이션/Draco는 가져오지 않습니다.',
                  'STL/OBJ: mm · GLB: m · textures, animations and Draco are not imported.'
                )
              )
            )
        )
      );
    }
  });
})(window.MP);
