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
  M.CadInstallers.features = function (app) {
    app.openFeature = (type, id = null) => {
      const old = id && app.state.p.features.find((f) => f.id === id),
        sk = app.currentSketch() || app.state.p.sketches[0];
      if (!sk) {
        app.notice(app.t('먼저 2D 스케치를 작성하세요.', 'Create a 2D sketch first.'));
        return;
      }
      const f = old
        ? C(old)
        : {
            id: M.uid(),
            type,
            sketchId: sk.id,
            depth: 20,
            angle: 360,
            axis: 'V',
            axisEntity: '',
            operation: type === 'cut' ? 'cut' : 'new',
            targetId: app.active()?.id || '',
            symmetric: false,
            through: type === 'cut',
            pathId: app.state.p.sketches.find((s) => s.id !== sk.id)?.id || '',
            pathEntity: '',
            sections: [sk.id],
            name: app.t(
              featureTypes.find((t) => t[0] === type)?.[1] || type,
              featureTypes.find((t) => t[0] === type)?.[2] || type
            )
          };
      app.setState({
        featureDialog: { ...f, editing: !!old },
        featurePreview: null,
        sketchMode: false,
        activeSketch: f.sketchId,
        cadError: ''
      });
    };
    app.featureParam = (key, value) =>
      app.setState((st) => ({
        featureDialog: { ...st.featureDialog, [key]: value },
        featurePreview: null,
        cadError: ''
      }));
    app.previewFeature = () =>
      app.task(app.t('피처 미리보기', 'Feature preview'), () => {
        try {
          const mesh = S.featureMesh(app.state.p, app.state.featureDialog);
          app.setState({
            featurePreview: M.body('Feature preview', mesh, { material: app.state.p.material }),
            cadError: ''
          });
          setTimeout(() => {
            app.refreshScene();
            app.view.fitRecords(app.view.records);
          }, 40);
        } catch (e) {
          app.setState({ cadError: e.message });
          throw e;
        }
      });
    app.applyFeature = () =>
      app.task(app.t('스케치로 솔리드 생성', 'Building solid from sketch'), () => {
        const f = C(app.state.featureDialog),
          p = C(app.state.p);
        delete f.editing;
        const existing = p.features.find((x) => x.id === f.id);
        if (f.operation === 'new') {
          f.outputId = existing?.outputId || M.uid();
          if (!p.bodies.some((x) => x.id === f.outputId)) {
            const candidate = M.body(f.name, S.featureMesh(p, f), {
              id: f.outputId,
              material: p.material,
              primitive: 'sketch-feature'
            });
            candidate.featureCenter = candidate.pos.slice();
            p.bodies.push(candidate);
          }
        } else {
          const target = p.bodies.find((x) => x.id === f.targetId);
          if (!target) throw Error(app.t('기준 바디를 선택하세요.', 'Choose a target body.'));
          if (existing && existing.outputId !== f.targetId)
            throw Error(
              app.t(
                '수정 중에는 기존 피처의 대상 바디를 유지하세요.',
                'Keep the original feature target when editing.'
              )
            );
          f.outputId = f.targetId;
          f.baseBody = existing?.baseBody || C(target);
          f.baseTransform =
            existing?.baseTransform ||
            (target.featureCenter
              ? {
                  delta: V.sub(target.pos, target.featureCenter),
                  rot: target.rot.slice(),
                  scale: target.scale.slice()
                }
              : null);
        }
        if (existing) p.features[p.features.indexOf(existing)] = f;
        else p.features.push(f);
        S.rebuild(p, existing ? [] : [f.outputId]);
        for (const sk of p.sketches) sk.dirty = false;
        app.edit(
          app.t('스케치 피처 적용', 'Apply sketch feature'),
          (q) => Object.assign(q, p),
          {
            selected: [f.outputId],
            featureDialog: null,
            featurePreview: null,
            mode: 'select',
            cadError: ''
          },
          true
        );
        setTimeout(() => app.fitView(), 80);
      });
  };
})(window.MP);
