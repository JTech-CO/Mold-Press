(function (M) {
  'use strict';
  const {
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
  } = M.CadUI;
  class SketchBoard extends R.Component {
    constructor(p) {
      super(p);
      this.cancel = () => {
        this.drag = null;
        this.setState({ preview: null, pending: [] });
      };
      this.fit = () => {
        const sk = this.props.app.currentSketch(),
          p = sk?.entities.flatMap((e) => S.sample(e).points) || [];
        if (!p.length) {
          this.setState({ cx: 0, cy: 0, height: 100 });
          return;
        }
        const xs = p.map((p) => p[0]),
          ys = p.map((p) => p[1]),
          w = Math.max(...xs) - Math.min(...xs),
          h = Math.max(...ys) - Math.min(...ys);
        this.setState({
          cx: (Math.max(...xs) + Math.min(...xs)) / 2,
          cy: (Math.max(...ys) + Math.min(...ys)) / 2,
          height: Math.max(
            50,
            h * 1.5,
            ((w * this.state.pixels) / Math.max(1, this.state.width)) * 1.5
          )
        });
      };
      this.pos = (e) => {
        const r = this.svg.getBoundingClientRect(),
          s = this.state,
          f = s.height / r.height;
        return [
          s.cx + (e.clientX - r.left - r.width / 2) * f,
          s.cy - (e.clientY - r.top - r.height / 2) * f
        ];
      };
      this.snap = (p) => {
        const a = this.props.app,
          s = a.state,
          sk = a.currentSketch();
        if (!s.snap) return p;
        const threshold = (this.state.height / Math.max(1, this.state.pixels)) * 7,
          pts = sk.entities
            .flatMap((e) => {
              const q = S.sample(e);
              return q.closed
                ? S.vertices(e).concat(entityPoints(e))
                : [q.points[0], q.points.at(-1)];
            })
            .filter(Boolean)
            .concat([[0, 0]]);
        let nearest = null,
          best = threshold;
        for (const q of pts) {
          const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (d < best) {
            nearest = q;
            best = d;
          }
        }
        return nearest ? nearest.slice() : p.map(Math.round);
      };
      this.wheel = (e) => {
        e.preventDefault();
        const p = this.pos(e),
          k = Math.exp(e.deltaY * 0.001),
          h = Math.max(4, Math.min(20000, this.state.height * k)),
          scale = h / this.state.height;
        this.setState((s) => ({
          height: h,
          cx: p[0] + (s.cx - p[0]) * scale,
          cy: p[1] + (s.cy - p[1]) * scale
        }));
      };
      this.down = (e) => {
        if (e.button > 2) return;
        e.preventDefault();
        this.svg.focus();
        const a = this.props.app,
          tool = a.state.skTool,
          p = this.snap(this.pos(e)),
          node = e.target.closest('[data-entity]'),
          id = node?.getAttribute('data-entity'),
          entity = a.currentSketch().entities.find((x) => x.id === id),
          handle = e.target.getAttribute('data-handle');
        this.svg.setPointerCapture(e.pointerId);
        if (e.button === 1 || e.button === 2) {
          this.drag = {
            pan: true,
            x: e.clientX,
            y: e.clientY,
            cx: this.state.cx,
            cy: this.state.cy
          };
          return;
        }
        if (tool === 'select') {
          a.setState({ skEntity: id || null });
          if (entity)
            this.drag = {
              entity: C(entity),
              start: p,
              handle: handle === null ? null : Number(handle),
              changed: false
            };
          return;
        }
        if (['fillet', 'chamfer'].includes(tool)) {
          if (entity) {
            a.sketchCorner(id, p, tool);
          } else
            a.notice(
              a.t('필렛/챔퍼를 적용할 꼭짓점 가까이를 클릭하세요.', 'Click near a profile corner.')
            );
          return;
        }
        let pending = this.state.pending.slice();
        if (e.shiftKey && pending.length) {
          const q = pending.at(-1);
          Math.abs(p[0] - q[0]) > Math.abs(p[1] - q[1]) ? (p[1] = q[1]) : (p[0] = q[0]);
        }
        if (tool === 'point') {
          a.addSketchEntity({ type: 'point', point: p, construction: true });
          return;
        }
        pending.push(p);
        const n = ['bezier'].includes(tool) ? 4 : tool === 'arc' ? 3 : 2;
        if (pending.length < n) {
          this.setState({ pending });
          return;
        }
        try {
          let entity;
          if (['line', 'construction'].includes(tool)) {
            if (Math.hypot(pending[1][0] - pending[0][0], pending[1][1] - pending[0][1]) < 0.01)
              throw Error(a.t('선 길이가 0입니다.', 'Zero-length line.'));
            entity = {
              type: 'line',
              points: pending.slice(0, 2),
              construction: tool === 'construction'
            };
          } else if (tool === 'rectangle') entity = { type: tool, points: pending.slice(0, 2) };
          else if (tool === 'circle' || tool === 'polygon')
            entity = {
              type: tool,
              center: pending[0],
              radius: Math.hypot(p[0] - pending[0][0], p[1] - pending[0][1]),
              sides: a.state.skSides,
              angle: Math.atan2(p[1] - pending[0][1], p[0] - pending[0][0])
            };
          else if (tool === 'ellipse')
            entity = {
              type: tool,
              center: pending[0],
              rx: Math.abs(p[0] - pending[0][0]),
              ry: Math.abs(p[1] - pending[0][1])
            };
          else if (tool === 'arc') entity = S.arcThrough(...pending);
          else if (tool === 'bezier') entity = { type: 'bezier', points: pending };
          if (entity.radius === 0 || entity.rx === 0 || entity.ry === 0)
            throw Error(a.t('크기가 0인 도형입니다.', 'Zero-size shape.'));
          a.addSketchEntity(entity);
          this.setState({ pending: tool === 'line' || tool === 'construction' ? [p] : [] });
        } catch (error) {
          a.notice(error.message);
          this.setState({ pending: [] });
        }
      };
      this.move = (e) => {
        const a = this.props.app,
          p = this.snap(this.pos(e)),
          d = this.drag;
        this.setState({ hover: p });
        if (!d) return;
        if (d.pan) {
          const f = this.state.height / this.state.pixels;
          this.setState({ cx: d.cx - (e.clientX - d.x) * f, cy: d.cy + (e.clientY - d.y) * f });
          return;
        }
        let q = C(d.entity);
        if (d.handle !== null) {
          if (q.point) q.point = p;
          else if (q.center && d.handle === 0) q.center = p;
          else if (q.center) {
            if (q.type === 'ellipse') {
              q.rx = Math.max(0.01, Math.abs(p[0] - q.center[0]));
              q.ry = Math.max(0.01, Math.abs(p[1] - q.center[1]));
            } else q.radius = Math.max(0.01, Math.hypot(p[0] - q.center[0], p[1] - q.center[1]));
          } else q.points[d.handle] = p;
        } else q = movedEntity(q, p[0] - d.start[0], p[1] - d.start[1]);
        d.changed = JSON.stringify(q) !== JSON.stringify(d.entity);
        this.setState({ preview: q });
      };
      this.up = (e) => {
        const d = this.drag;
        this.drag = null;
        if (d?.changed && this.state.preview)
          this.props.app.replaceSketchEntity(this.state.preview);
        this.setState({ preview: null });
        if (this.svg.hasPointerCapture(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
      };
      this.state = {
        cx: 0,
        cy: 0,
        height: 100,
        width: 700,
        pixels: 500,
        pending: [],
        hover: [0, 0],
        preview: null
      };
      this.drag = null;
    }
    componentDidMount() {
      this.ro = new ResizeObserver(() => {
        const r = this.svg.getBoundingClientRect();
        this.setState({ width: r.width, pixels: r.height });
      });
      this.ro.observe(this.svg);
      this.svg.addEventListener('pointerdown', this.down);
      this.svg.addEventListener('pointermove', this.move);
      this.svg.addEventListener('pointerup', this.up);
      this.svg.addEventListener('pointercancel', this.cancel);
      this.svg.addEventListener('wheel', this.wheel, { passive: false });
      this.props.app.sketchBoard = this;
      this.fit();
    }
    componentWillUnmount() {
      this.ro.disconnect();
      this.props.app.sketchBoard = null;
    }
    componentDidUpdate(prev) {
      if (prev.app.state?.activeSketch !== this.props.app.state?.activeSketch) this.fit();
    }
    render() {
      const a = this.props.app,
        s = a.state,
        sk = a.currentSketch();
      if (!sk) return null;
      const h = this.state.height,
        w = (h * this.state.width) / Math.max(1, this.state.pixels),
        x = this.state.cx - w / 2,
        y = -this.state.cy - h / 2,
        step = h > 500 ? 50 : h > 100 ? 10 : h < 20 ? 1 : 5,
        entities = sk.entities.map((e) =>
          e.id === this.state.preview?.id ? this.state.preview : e
        ),
        selected = entities.find((e) => e.id === s.skEntity),
        pending = this.state.pending,
        hover = this.state.hover;
      let contourFill = '';
      try {
        contourFill = S.profile({ ...sk, entities })
          .map((r) => pathData(r) + 'Z')
          .join(' ');
      } catch {}
      const radius = (h / Math.max(1, this.state.pixels)) * 4,
        tool = tools.find((t) => t[0] === s.skTool);
      const hints = {
        line: a.t('끝점 클릭 · 연속 그리기 · Esc로 종료', 'Click endpoints · Esc to end chain'),
        bezier: a.t('시작점 → 제어점 1 → 제어점 2 → 끝점', 'Start → control 1 → control 2 → end'),
        arc: a.t('시작점 → 통과점 → 끝점', 'Start → through point → end'),
        construction: a.t(
          '보조선은 점선이며 솔리드에서 제외됩니다.',
          'Dashed construction lines never enter the solid.'
        ),
        fillet: a.t('꼭짓점 클릭 · 반지름은 왼쪽에서 입력', 'Click corner · set radius on left'),
        chamfer: a.t('꼭짓점 클릭 · 거리는 왼쪽에서 입력', 'Click corner · set distance on left'),
        select: a.t(
          '도형/제어점을 드래그 · 오른쪽에서 정확한 수치 입력',
          'Drag geometry / control points · edit exact values on right'
        )
      };
      return React.createElement(
        'div',
        { className: 'sketch-board', 'data-testid': 'sketch-board' },
        React.createElement(
          'div',
          { className: 'sketch-board-head' },
          React.createElement(
            'div',
            null,
            React.createElement('strong', null, sk.name),
            React.createElement('span', null, sk.plane, ' \u00B7 ', f2(sk.offset || 0), ' mm')
          ),
          button(a, 'sketch-fit', '화면 맞춤', 'Fit', this.fit),
          button(a, 'sketch-finish', '스케치 마침', 'Finish sketch', a.finishSketch, {
            className: 'btn primary'
          })
        ),
        React.createElement(
          'svg',
          {
            ref: (el) => (this.svg = el),
            className: 'sketch-surface',
            'data-testid': 'sketch-surface',
            tabIndex: '0',
            viewBox: `${x} ${y} ${w} ${h}`,
            onContextMenu: (e) => e.preventDefault()
          },
          React.createElement(
            'defs',
            null,
            React.createElement(
              'pattern',
              { id: 'cad-grid', width: step, height: step, patternUnits: 'userSpaceOnUse' },
              React.createElement('path', {
                d: `M ${step} 0 H 0 V ${step}`,
                fill: 'none',
                stroke: '#29323a',
                strokeWidth: '0.7',
                vectorEffect: 'non-scaling-stroke'
              })
            )
          ),
          React.createElement('rect', { x: x, y: y, width: w, height: h, fill: '#12191f' }),
          React.createElement('rect', {
            x: x,
            y: y,
            width: w,
            height: h,
            fill: s.grid ? 'url(#cad-grid)' : 'none'
          }),
          React.createElement('line', {
            x1: x,
            y1: '0',
            x2: x + w,
            y2: '0',
            stroke: '#85604b',
            strokeWidth: '1',
            vectorEffect: 'non-scaling-stroke'
          }),
          React.createElement('line', {
            x1: '0',
            y1: y,
            x2: '0',
            y2: y + h,
            stroke: '#4b7166',
            strokeWidth: '1',
            vectorEffect: 'non-scaling-stroke'
          }),
          React.createElement(
            'g',
            { transform: 'scale(1,-1)' },
            React.createElement('path', {
              d: contourFill,
              fill: '#e5ae6010',
              fillRule: 'evenodd',
              pointerEvents: 'none'
            }),
            entities.map((e) => {
              let sample;
              try {
                sample = S.sample(e);
              } catch {
                return null;
              }
              const points = sample.points,
                d = pathData(points) + (sample.closed ? 'Z' : ''),
                color = e.id === s.skEntity ? '#ffd597' : e.construction ? '#7e919e' : '#e5ae60';
              return React.createElement(
                'g',
                { key: e.id, 'data-entity': e.id },
                e.type === 'point'
                  ? React.createElement('circle', {
                      cx: e.point[0],
                      cy: e.point[1],
                      r: radius,
                      fill: color
                    })
                  : React.createElement(
                      React.Fragment,
                      null,
                      React.createElement('path', {
                        d: d,
                        stroke: 'transparent',
                        fill: 'none',
                        strokeWidth: '14',
                        vectorEffect: 'non-scaling-stroke',
                        pointerEvents: 'stroke'
                      }),
                      React.createElement('path', {
                        d: d,
                        fill: 'none',
                        stroke: color,
                        strokeWidth: e.id === s.skEntity ? 2.6 : 1.8,
                        strokeDasharray: e.construction ? '6 5' : undefined,
                        vectorEffect: 'non-scaling-stroke',
                        pointerEvents: 'stroke'
                      })
                    )
              );
            }),
            selected?.type === 'bezier' &&
              React.createElement('path', {
                d: pathData(selected.points),
                fill: 'none',
                stroke: '#7898ad',
                strokeDasharray: '4 4',
                vectorEffect: 'non-scaling-stroke'
              }),
            selected &&
              s.skTool === 'select' &&
              (selected.center
                ? [
                    selected.center,
                    [
                      selected.center[0] + (selected.radius || selected.rx),
                      selected.center[1] + (selected.type === 'ellipse' ? selected.ry : 0)
                    ]
                  ]
                : entityPoints(selected)
              ).map((p, i) =>
                React.createElement('circle', {
                  key: i,
                  'data-entity': selected.id,
                  'data-handle': i,
                  cx: p[0],
                  cy: p[1],
                  r: radius * 1.25,
                  fill: '#17222c',
                  stroke: '#b3dbfa',
                  strokeWidth: '1.5',
                  vectorEffect: 'non-scaling-stroke',
                  className: 'sketch-handle'
                })
              ),
            pending.length > 0 &&
              React.createElement(
                React.Fragment,
                null,
                React.createElement('path', {
                  d: pathData(pending.concat([hover])),
                  stroke: '#a5c4d6',
                  strokeWidth: '1.3',
                  fill: 'none',
                  strokeDasharray: '4 4',
                  vectorEffect: 'non-scaling-stroke',
                  pointerEvents: 'none'
                }),
                pending.map((p, i) =>
                  React.createElement('circle', {
                    key: i,
                    cx: p[0],
                    cy: p[1],
                    r: radius,
                    fill: '#e5ae60',
                    pointerEvents: 'none'
                  })
                )
              ),
            React.createElement('circle', {
              cx: '0',
              cy: '0',
              r: radius * 0.7,
              fill: '#98a9b8',
              pointerEvents: 'none'
            })
          )
        ),
        React.createElement(
          'div',
          { className: 'sketch-board-foot' },
          React.createElement(
            'span',
            null,
            tool && a.t(tool[2], tool[3]),
            ' \u00B7 ',
            hints[s.skTool] ||
              a.t(
                '두 점 클릭으로 크기 지정 · 우클릭 드래그 이동 · 휠 확대',
                'Click to define geometry · right-drag to pan · wheel to zoom'
              )
          ),
          React.createElement('b', null, 'U ', f2(hover[0]), ' \u00B7 V ', f2(hover[1]), ' mm')
        )
      );
    }
  }
  M.CadUI.SketchBoard = SketchBoard;
})(window.MP);
