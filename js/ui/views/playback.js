(function (M) {
  'use strict';
  const h = M.UI.R.createElement,
    Button = M.UI.Button;
  Object.assign(M.AppViews, {
    renderPlaybackControls() {
      const s = this.state;
      return h(
        'section',
        { className: 'playback-panel', 'data-testid': 'playback-panel' },
        h('div', { className: 'section-title' }, this.t('사이클 관찰', 'CYCLE INSPECTION')),
        s.running
          ? h(
              'div',
              null,
              h(
                'div',
                { className: 'playback-buttons' },
                h(
                  Button,
                  { test: 'pause-press', onClick: this.togglePressPause },
                  s.pressPaused ? this.t('재개', 'Resume') : this.t('일시 정지', 'Pause')
                ),
                h(
                  Button,
                  { test: 'step-press', onClick: this.stepPress, disabled: this.cycle?.completing },
                  this.t('다음 단계', 'Next stage')
                )
              ),
              h(
                'small',
                { 'data-testid': 'playback-status' },
                s.pressReplay
                  ? this.t(
                      '다시 보기 · 완료품을 생성하지 않습니다.',
                      'Replay · no parts are produced.'
                    )
                  : s.pressPaused
                    ? this.t('생산 일시 정지', 'Production paused')
                    : this.t('생산 진행 중', 'Production running')
              ),
              s.pressReplay &&
                h(
                  'label',
                  { className: 'replay-seek' },
                  this.t('재생 위치', 'Playback position'),
                  h('input', {
                    type: 'range',
                    min: 0,
                    max: 100,
                    step: 1,
                    value: Math.round(s.progress * 100),
                    'data-testid': 'replay-seek',
                    onChange: (e) => this.seekReplay(+e.target.value)
                  })
                )
            )
          : h(
              'div',
              null,
              h(
                Button,
                {
                  test: 'replay-press',
                  onClick: this.startReplay,
                  disabled: !this.lastPress,
                  className: 'full'
                },
                this.t('최근 완료 사이클 다시 보기', 'Replay last completed cycle')
              ),
              h(
                'small',
                null,
                this.t(
                  '현재 세션에서 완료한 사이클을 관찰합니다.',
                  'Inspect the last cycle completed in this session.'
                )
              )
            )
      );
    }
  });
})(window.MP);
