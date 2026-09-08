(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.tooling = function (props) {
    this.setParting = (key, value) =>
      this.edit(
        this.t('파팅 설정', 'Parting settings'),
        (p) => {
          p.parting[key] = value;
          for (const b of p.bodies) if (this.state.selected.includes(b.id)) b.tool = null;
        },
        { parting: true }
      );
    this.autoParting = () => {
      const b = this.active();
      if (!b) return;
      this.task(this.t('파팅 방향 샘플 검사', 'Sampling parting directions'), () => {
        const bb = M.bounds(M.world(b)),
          results = ['X', 'Y', 'Z'].map((axis, i) => ({
            axis,
            position: bb.center[i],
            score: M.analyze(b, axis, bb.center[i]).undercut
          }));
        results.sort(
          (a, b) =>
            a.score - b.score || ['Z', 'Y', 'X'].indexOf(a.axis) - ['Z', 'Y', 'X'].indexOf(b.axis)
        );
        const { axis, position } = results[0];
        this.edit(
          this.t('자동 파팅 추천', 'Auto parting suggestion'),
          (p) => {
            p.parting = { axis, position };
          },
          { parting: true }
        );
        this.notice(
          this.t(
            '표면 샘플 기준 추천입니다. 언더컷 제거를 보장하지 않습니다.',
            'Sample-based recommendation; not a guarantee of undercut-free tooling.'
          )
        );
      });
    };
    this.generate = (all) => {
      const list = all ? this.state.p.bodies : this.selectedBodies();
      if (!list.length) return;
      this.task(
        this.t('캐비티·코어와 금형 세트 생성 중', 'Generating cavity, core and tooling'),
        () => {
          const configs = new Map();
          for (const b of list) {
            const bb = M.bounds(M.world(b)),
              cfg = { ...this.state.p.parting, pins: 4, generated: true };
            const k = 'XYZ'.indexOf(cfg.axis);
            cfg.position = Math.max(bb.min[k], Math.min(bb.max[k], cfg.position));
            M.makeTool(b, cfg);
            configs.set(b.id, cfg);
          }
          this.edit(this.t('금형 생성 완료', 'Tooling generated'), (p) => {
            for (const b of p.bodies) if (configs.has(b.id)) b.tool = configs.get(b.id);
          });
          this.notice(
            this.t(
              `${list.length}개 금형 세트를 생성했습니다. Press에서 소재를 선택하세요.`,
              `${list.length} mold set(s) ready. Choose a material in Press.`
            )
          );
        }
      );
    };
  };
})(window.MP);
