(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.dimensions = function (props) {
    this.beginDimension = (k) => {
      const b = this.active(),
        s = this.state;
      if (!b || s.page !== 'studio' || s.running || s.busy || this.directDrag || this.gizmoDrag)
        return;
      const size = M.bounds(M.world(b)).size[k];
      this.dimensionSession = M.uid();
      this.setState(
        {
          dimEdit: {
            id: b.id,
            axis: k,
            value: String(Number(size.toFixed(6))),
            token: this.dimensionSession,
            error: false
          },
          selected: [b.id]
        },
        () => {
          this.dimensionInputRef.current?.focus();
          this.dimensionInputRef.current?.select();
        }
      );
    };
    this.cancelDimension = () => {
      this.dimensionSession = null;
      this.setState({ dimEdit: null });
    };
    this.commitDimension = () => {
      const d = this.state.dimEdit;
      if (!d || d.token !== this.dimensionSession) return;
      const value = Number(d.value.trim()),
        b = this.state.p.bodies.find((x) => x.id === d.id);
      if (!d.value.trim() || !Number.isFinite(value) || value < 0.01 || value > 10000) {
        this.setState({ dimEdit: { ...d, error: true } });
        this.notice(
          this.t(
            '치수는 0.01-10,000 mm의 숫자로 입력하세요. 기존 형상은 유지됩니다.',
            'Enter a dimension from 0.01 to 10,000 mm. The existing mesh is unchanged.'
          )
        );
        return;
      }
      if (!b || this.state.page !== 'studio') {
        this.cancelDimension();
        return;
      }
      try {
        const current = M.bounds(M.world(b)).size[d.axis];
        if (Math.abs(current - value) < 1e-6) {
          this.cancelDimension();
          return;
        }
        const next = M.resizeWorldDimension(b, d.axis, value);
        this.dimensionSession = null;
        this.edit(
          this.t('외곽 치수 편집', 'Edit bounding dimension'),
          (p) => {
            p.bodies = p.bodies.map((x) => (x.id === b.id ? next : x));
          },
          { dimEdit: null, selected: [b.id] }
        );
      } catch (error) {
        this.notice(this.t('치수 변경 불가: ', 'Cannot resize: ') + error.message);
      }
    };
  };
})(window.MP);
