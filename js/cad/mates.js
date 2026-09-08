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
  M.CadInstallers.mates = function (app) {
    app.startSnap = (mode) => {
      app.snapSource = null;
      app.setState({
        mateActive: true,
        snapMode: 'mate',
        mateRef: null,
        mateMoving: null,
        mateBack: false,
        mateType:
          mode === 'pin' ? 'concentric' : mode === 'face' ? 'coincident' : app.state.mateType,
        mateAlignment:
          mode === 'face' ? 'opposed' : mode === 'pin' ? 'aligned' : app.state.mateAlignment,
        mode: 'select',
        explode: 0,
        dimEdit: null,
        cadError: ''
      });
      app.notice(
        app.t(
          '기준 면(고정) → 이동할 면 순서로 클릭하세요. 두 번째 클릭 즉시 Mate가 적용됩니다.',
          'Reference face (fixed) → moving face. The second click applies the mate.'
        )
      );
    };
    app.cancelMate = () => {
      app.snapSource = null;
      app.setState({
        mateActive: false,
        mateRef: null,
        mateMoving: null,
        snapMode: null,
        mateBack: false
      });
    };
    app.applyMatePair = (ref, moving) => {
      try {
        const next = A.add(app.state.p, ref, moving, {
          type: app.state.mateType,
          value: app.state.mateValue,
          alignment: app.state.mateAlignment,
          center: app.state.mateCenter,
          flip: app.state.mateFlip
        });
        app.edit(
          app.t('Mate 적용 · ', 'Apply mate · ') + app.state.mateType,
          (p) => Object.assign(p, next),
          {
            selected: [moving.bodyId],
            mateActive: false,
            mateRef: null,
            mateMoving: null,
            snapMode: null,
            mateBack: false,
            explode: 0,
            cadError: ''
          }
        );
        app.notice(
          app.t(
            'Mate 적용 완료. 첫 선택 부품은 고정되고 두 번째 부품이 이동했습니다.',
            'Mate applied. First component stays; second component moves.'
          )
        );
      } catch (e) {
        app.notice(e.message);
        app.setState({ cadError: e.message, mateMoving: null });
      }
    };
    const oldPick = app.pick;
    app.pick = (hit, multi) => {
      if (app.state.mateActive && app.state.page === 'assembly') {
        if (!hit?.id) return;
        try {
          const b = app.state.p.assembly.find((x) => x.id === hit.id),
            axis = app.state.mateType === 'concentric' || app.state.mateType === 'tangent';
          let r;
          try {
            r = A.fromHit(b, hit, axis);
          } catch (e) {
            if (app.state.mateType !== 'tangent') throw e;
            r = A.fromHit(b, hit, false);
          }
          if (!app.state.mateRef) {
            app.setState({ mateRef: r, selected: [b.id], mateBack: false });
            app.notice(
              app.t(
                '이동할 부품의 면을 클릭하세요. 아랫면은 ‘뒷면 선택’을 켜거나 뷰를 회전하세요.',
                'Pick the moving face. Enable “Back face” or orbit to select an underside.'
              )
            );
          } else app.applyMatePair(app.state.mateRef, r);
        } catch (e) {
          app.notice(e.message);
        }
        return;
      }
      oldPick(hit, multi);
    };
    app.pickMateOverride = (cx, cy) => {
      const s = app.state;
      if (s.page !== 'assembly' || !s.mateActive) return undefined;
      const ray = app.view.ray(cx, cy);
      let hit = null;
      for (const b of app.view.pickBodies) {
        if (!b.visible || b.id === s.mateRef?.bodyId) continue;
        const p = M.world(b);
        for (let i = 0; i < p.length; i += 9) {
          const a = p.slice(i, i + 3),
            c = p.slice(i + 3, i + 6),
            d = p.slice(i + 6, i + 9),
            n = V.unit(V.cross(V.sub(c, a), V.sub(d, a)));
          if (s.mateBack ? V.dot(n, ray.d) < 0.001 : V.dot(n, ray.d) > -0.001) continue;
          const t = M.rayTri(ray.o, ray.d, a, c, d);
          if (t !== null && (!hit || t < hit.t))
            hit = { id: b.id, point: V.add(ray.o, V.mul(ray.d, t)), normal: n, t, index: i };
        }
      }
      return hit;
    };
    app.mateFromList = () => {
      const b = app.state.p.assembly.find((b) => b.id === app.state.mateBody),
        features = b && A.features(b),
        f =
          features &&
          features.faces.concat(features.curved).find((f) => f.id === app.state.mateFace);
      if (!b || !f) {
        app.notice(
          app.t(
            '부품과 실제 면/원통을 선택하세요.',
            'Choose a component and a recognised face/cylinder.'
          )
        );
        return;
      }
      const ref = A.reference(b, f);
      if (!app.state.mateRef)
        app.setState({ mateRef: ref, mateActive: true, snapMode: 'mate', explode: 0 });
      else app.applyMatePair(app.state.mateRef, ref);
    };
    app.changeMate = (id, patch) =>
      app.edit(app.t('Mate 편집', 'Edit mate'), (p) => {
        const m = p.mates.find((m) => m.id === id);
        Object.assign(m, patch);
      });
  };
})(window.MP);
