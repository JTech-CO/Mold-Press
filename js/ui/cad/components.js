(function (M) {
  'use strict';

  const R = React,
    S = M.Sketch,
    A = M.Mate,
    V = M.V,
    C = (x) => JSON.parse(JSON.stringify(x));
  const tools = [
    ['select', '↖', '선택 / 이동', 'Select / move'],
    ['line', '╱', '선', 'Line'],
    ['bezier', '∿', '베지어 곡선', 'Bézier curve'],
    ['arc', '⌒', '3점 원호', '3-point arc'],
    ['construction', '┄', '보조선', 'Construction'],
    ['point', '·', '점', 'Point'],
    ['rectangle', '▭', '사각형', 'Rectangle'],
    ['circle', '○', '원', 'Circle'],
    ['ellipse', '⬭', '타원', 'Ellipse'],
    ['polygon', '⬡', '다각형', 'Polygon'],
    ['fillet', '◜', '필렛', 'Fillet'],
    ['chamfer', '⌜', '챔퍼', 'Chamfer']
  ];
  const featureTypes = [
    ['extrude', '돌출 베이스', 'Extrude'],
    ['cut', '돌출 컷', 'Extrude cut'],
    ['revolve', '회전체', 'Revolve'],
    ['sweep', '스윕', 'Sweep'],
    ['loft', '로프트', 'Loft']
  ];
  const f2 = (n) => Number(n.toFixed(3)),
    pathData = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
  const button = (a, id, ko, en, fn, props = {}) =>
    React.createElement(
      'button',
      { type: 'button', className: 'btn', 'data-testid': id, onClick: fn, ...props },
      a.t(ko, en)
    );
  class NumberField extends R.Component {
    constructor(p) {
      super(p);
      this.state = { text: String(p.value ?? 0) };
    }
    componentDidUpdate(prev) {
      if (prev.value !== this.props.value && !this.focused)
        this.setState({ text: String(this.props.value ?? 0) });
    }
    commit() {
      this.focused = false;
      if (this.skipBlur) {
        this.skipBlur = false;
        return;
      }
      const n = Number(this.state.text);
      if (
        this.state.text.trim() === '' ||
        !Number.isFinite(n) ||
        (this.props.min != null && n < this.props.min) ||
        (this.props.max != null && n > this.props.max)
      ) {
        this.setState({ text: String(this.props.value ?? 0) });
        this.props.app?.notice(
          this.props.app.t('입력 범위를 확인하세요.', 'Check the allowed numeric range.')
        );
        return;
      }
      try {
        this.props.onCommit(n);
      } catch (e) {
        this.props.app?.notice(e.message);
      }
      this.setState({ text: String(n) });
    }
    render() {
      return React.createElement('input', {
        type: 'number',
        'data-testid': this.props.test,
        'aria-label': this.props.label || this.props.test,
        step: this.props.step || 'any',
        min: this.props.min,
        max: this.props.max,
        value: this.state.text,
        onFocus: () => (this.focused = true),
        onChange: (e) => this.setState({ text: e.target.value }),
        onBlur: () => this.commit(),
        onKeyDown: (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            this.focused = false;
            this.skipBlur = true;
            const el = e.currentTarget;
            this.setState({ text: String(this.props.value ?? 0) }, () => el.blur());
          }
        }
      });
    }
  }
  function Field({ a, label, en, children }) {
    return React.createElement(
      'label',
      { className: 'cad-field' },
      React.createElement('span', null, a.t(label, en || label)),
      children
    );
  }
  function entityPoints(e) {
    if (e.type === 'point') return [e.point];
    if (e.center) return [e.center];
    return e.points || [];
  }
  function movedEntity(e, dx, dy) {
    const q = C(e),
      move = (p) => [p[0] + dx, p[1] + dy];
    if (q.point) q.point = move(q.point);
    if (q.center) q.center = move(q.center);
    if (q.points) q.points = q.points.map(move);
    return q;
  }
  Object.assign(M.CadUI, {
    R,
    S,
    A,
    V,
    C,
    tools,
    featureTypes,
    f2,
    pathData,
    button,
    NumberField,
    Field,
    entityPoints,
    movedEntity
  });
})(window.MP);
