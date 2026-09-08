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
  const {
    SketchBoard,
    renderSketchLibrary,
    renderSketchTools,
    renderSketchInspector,
    renderFeatureInspector,
    renderMateTools
  } = M.CadUI;
  M.CadInstallers.sketch = function (app) {
    app.startSketch = (id) => {
      if (id) {
        app.setState({
          activeSketch: id,
          sketchMode: true,
          skTool: 'select',
          skEntity: null,
          featureDialog: null,
          featurePreview: null,
          dimEdit: null
        });
        setTimeout(() => app.sketchBoard?.fit(), 70);
        return;
      }
      const sk = S.create(
        app.state.skPlane,
        app.state.skOffset,
        app.t('스케치 ', 'Sketch ') + (app.state.p.sketches.length + 1)
      );
      app.edit(app.t('스케치 생성', 'Create sketch'), (p) => p.sketches.push(sk), {
        activeSketch: sk.id,
        sketchMode: true,
        skTool: 'rectangle',
        skEntity: null,
        featureDialog: null,
        featurePreview: null,
        dimEdit: null
      });
    };
    app.editSketch = (name, fn, extra = {}) => {
      app.edit(
        name,
        (p) => {
          const sk = p.sketches.find((x) => x.id === app.state.activeSketch);
          if (!sk) throw Error('Sketch missing');
          fn(sk);
          sk.dirty = true;
        },
        extra
      );
    };
    app.addSketchEntity = (e) => {
      e = { id: M.uid(), construction: false, ...e };
      app.editSketch(
        app.t('스케치 요소 추가', 'Add sketch entity'),
        (sk) => {
          if (sk.entities.length >= 250) throw Error('Maximum 250 entities per sketch');
          sk.entities.push(e);
        },
        { skEntity: e.id }
      );
    };
    app.replaceSketchEntity = (e) =>
      app.editSketch(app.t('스케치 요소 편집', 'Edit sketch entity'), (sk) => {
        const i = sk.entities.findIndex((x) => x.id === e.id);
        if (i >= 0) sk.entities[i] = e;
      });
    app.removeSketchEntity = () => {
      if (!app.state.skEntity) return;
      app.editSketch(
        app.t('스케치 요소 삭제', 'Delete sketch entity'),
        (sk) => (sk.entities = sk.entities.filter((e) => e.id !== app.state.skEntity)),
        { skEntity: null }
      );
    };
    app.sketchCorner = (id, point, type) => {
      try {
        const sk = app.currentSketch(),
          e = sk.entities.find((e) => e.id === id);
        let q = C(e),
          replace = [id];
        if (!['rectangle', 'polygon', 'polyline'].includes(e.type)) {
          const c = S.contours(sk, false).find((c) => c.ids.includes(id));
          if (!c || c.points.length < 3)
            throw Error(
              app.t(
                '연결된 선 2개 이상의 꼭짓점이 필요합니다.',
                'A corner needs at least two connected edges.'
              )
            );
          q = {
            id: M.uid(),
            type: 'polyline',
            points: c.points,
            closed: c.closed,
            construction: false
          };
          replace = c.ids;
        } else if (q.type !== 'polyline')
          q = {
            id: q.id,
            type: 'polyline',
            points: S.vertices(q),
            closed: true,
            construction: q.construction,
            corners: q.corners || {}
          };
        const pts = q.points,
          i = pts
            .map((p) => Math.hypot(p[0] - point[0], p[1] - point[1]))
            .reduce((best, d, i, ds) => (d < ds[best] ? i : best), 0);
        q.corners = { ...q.corners, [i]: { type, radius: app.state.skRadius } };
        S.sample(q);
        app.editSketch(
          type,
          (sk) => {
            sk.entities = sk.entities.filter((x) => !replace.includes(x.id));
            sk.entities.push(q);
          },
          { skEntity: q.id }
        );
      } catch (e) {
        app.notice(e.message);
      }
    };
    app.finishSketch = () => {
      app.sketchBoard?.cancel();
      app.task(app.t('스케치 피처 재생성', 'Rebuilding sketch features'), () => {
        const p = C(app.state.p);
        S.rebuild(p);
        for (const sk of p.sketches) sk.dirty = false;
        app.edit(
          app.t('스케치 마침', 'Finish sketch'),
          (q) => Object.assign(q, p),
          { sketchMode: false, skEntity: null, featurePreview: null },
          true
        );
        setTimeout(() => app.fitView(), 80);
      });
    };
    app.deleteSketch = (id) => {
      if (
        app.state.p.features.some(
          (f) => f.sketchId === id || f.pathId === id || f.sections?.includes(id)
        )
      ) {
        app.notice(
          app.t(
            '피처가 참조 중인 스케치입니다. 피처 바디를 삭제한 뒤 지우세요.',
            'A feature references this sketch. Delete the feature body first.'
          )
        );
        return;
      }
      app.edit(
        app.t('스케치 삭제', 'Delete sketch'),
        (p) => (p.sketches = p.sketches.filter((s) => s.id !== id)),
        { activeSketch: null, sketchMode: false }
      );
    };
  };
})(window.MP);
