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
  M.CadInstallers.scene = function (app) {
    const oldRefresh = app.refreshScene;
    app.refreshScene = () => {
      oldRefresh();
      if (!app.view) return;
      const s = app.state,
        recs = app.view.records.slice();
      if (s.page === 'studio' && !s.sketchMode) {
        for (const sk of s.p.sketches || []) {
          if (sk.visible === false) continue;
          const lines = [];
          for (const e of sk.entities) {
            if (e.type === 'point') continue;
            let q;
            try {
              q = S.sample(e);
            } catch {
              continue;
            }
            for (let i = 0; i < q.points.length - (q.closed ? 0 : 1); i++) {
              const a = S.toWorld(sk, q.points[i]),
                b = S.toWorld(sk, q.points[(i + 1) % q.points.length]);
              if (e.construction) {
                for (let j = 0; j < 12; j += 2)
                  lines.push(...V.lerp(a, b, j / 12), ...V.lerp(a, b, (j + 1) / 12));
              } else lines.push(...a, ...b);
            }
          }
          if (lines.length)
            recs.push(
              M.record('sketch-' + sk.id, lines, sk.id === s.activeSketch ? '#f0bd75' : '#5f879c', {
                lines: true,
                alpha: 0.85
              })
            );
        }
        if (s.featurePreview)
          recs.push({
            ...app.productRecord(s.featurePreview),
            id: 'feature-preview',
            color: '#edb363',
            alpha: 0.58
          });
      }
      if (s.page === 'assembly' && s.mateRef) {
        const r = s.mateRef,
          b = s.p.assembly.find((x) => x.id === r.bodyId),
          f =
            b &&
            A.features(b)
              .faces.concat(A.features(b).curved)
              .find((x) => x.id === r.featureId);
        if (f) {
          const raw = M.unpack(b.geo),
            p = f.indices.flatMap((i) => Array.from(raw.slice(i, i + 9)));
          recs.push({
            ...app.productRecord(b),
            id: 'mate-face-highlight',
            geo: M.pack(p),
            color: '#55bfe7',
            alpha: 0.65
          });
        }
      }
      app.view.set(recs, app.view.pickBodies);
    };
  };
})(window.MP);
