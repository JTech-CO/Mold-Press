(function (M) {
  'use strict';
  const h = M.UI.R.createElement;
  Object.assign(M.AppViews, {
    renderLibrary() {
      const s = this.state,
        entries = s.libraryEntries || [],
        bytes = entries.reduce((sum, e) => sum + e.bytes, 0);
      return h(
        'section',
        { className: 'project-library', 'data-testid': 'project-library' },
        h('h3', null, this.t('내 프로젝트와 저장 이력', 'My projects and save history')),
        h(
          'p',
          { className: 'muted' },
          this.t(
            '프로젝트당 최근 5개 저장을 이 브라우저에 보관합니다.',
            'The latest five saves per project are kept in this browser.'
          )
        ),
        h(
          'div',
          { className: 'library-save' },
          h('input', {
            'data-testid': 'project-name',
            'aria-label': this.t('프로젝트 이름', 'Project name'),
            maxLength: 120,
            value: s.libraryName ?? s.p.name,
            onChange: (e) => this.setState({ libraryName: e.target.value })
          }),
          h(
            'button',
            { className: 'btn', 'data-testid': 'library-save', onClick: () => this.saveLibrary() },
            this.t('이름·현재 저장', 'Save current')
          ),
          h(
            'button',
            {
              className: 'btn',
              'data-testid': 'library-copy',
              onClick: () => this.saveLibrary(true)
            },
            this.t('별도 보관', 'Save a copy')
          )
        ),
        s.libraryError && h('p', { role: 'alert', 'data-testid': 'library-error' }, s.libraryError),
        h(
          'p',
          { className: 'tiny-text', 'data-testid': 'library-usage' },
          entries.length +
            ' ' +
            this.t('프로젝트', 'projects') +
            ' · ' +
            (bytes / 1024 / 1024).toFixed(2) +
            ' MB',
          s.storageEstimate?.quota
            ? ' · ' +
                this.t('사이트 사용량 ', 'Site usage ') +
                (s.storageEstimate.usage / 1024 / 1024).toFixed(1) +
                ' / ' +
                (s.storageEstimate.quota / 1024 / 1024).toFixed(0) +
                ' MB'
            : ''
        ),
        h(
          'div',
          { className: 'library-list' },
          entries.map((entry) =>
            h(
              'article',
              { key: entry.id, 'data-project-id': entry.id },
              h(
                'div',
                { className: 'library-row' },
                h('strong', null, entry.name),
                h(
                  'button',
                  {
                    className: 'btn',
                    'data-testid': 'library-open-' + entry.id,
                    onClick: () => this.openLibrary(entry.id)
                  },
                  this.t('열기', 'Open')
                ),
                entry.id !== s.p.id &&
                  h(
                    'button',
                    {
                      className: 'btn',
                      'data-testid': 'library-delete-' + entry.id,
                      onClick: () => this.setState({ libraryDelete: entry.id })
                    },
                    this.t('삭제', 'Delete')
                  )
              ),
              s.libraryDelete === entry.id &&
                h(
                  'div',
                  { className: 'library-row', role: 'alert' },
                  h(
                    'span',
                    null,
                    this.t(
                      '이 프로젝트와 저장 이력 5개까지 삭제합니다.',
                      'Delete this project and up to five saved revisions.'
                    )
                  ),
                  h(
                    'button',
                    {
                      className: 'btn',
                      'data-testid': 'library-delete-confirm',
                      onClick: () => this.deleteLibrary(entry.id)
                    },
                    this.t('삭제 확인', 'Confirm delete')
                  ),
                  h(
                    'button',
                    { className: 'btn', onClick: () => this.setState({ libraryDelete: null }) },
                    this.t('취소', 'Cancel')
                  )
                ),
              h(
                'details',
                null,
                h(
                  'summary',
                  null,
                  this.t('저장 이력', 'Save history') + ' · ' + entry.revisions.length
                ),
                entry.revisions.map((rev) =>
                  h(
                    'div',
                    { className: 'library-row', key: rev.id },
                    h(
                      'time',
                      null,
                      new Date(rev.date).toLocaleString(s.lang === 'ko' ? 'ko-KR' : 'en-US')
                    ),
                    h(
                      'button',
                      {
                        className: 'btn',
                        'data-testid': 'library-restore-' + rev.id,
                        onClick: () => this.openLibrary(entry.id, rev.id)
                      },
                      this.t('복원', 'Restore')
                    )
                  )
                )
              )
            )
          )
        )
      );
    }
  });
})(window.MP);
