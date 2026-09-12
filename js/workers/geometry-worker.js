/* Dual entry: registers the local fallback in the page, loads the kernel in a Worker. */
(function () {
  'use strict';
  const background = typeof document === 'undefined';
  if (background) {
    self.window = self;
    importScripts(
      '../core/namespace.js',
      '../geometry/mesh.js',
      '../geometry/transforms.js',
      '../geometry/primitives.js',
      '../geometry/csg.js',
      '../geometry/split.js',
      '../geometry/analysis.js',
      '../materials/catalog.js',
      '../materials/surfaces.js',
      '../rendering/records.js',
      '../tooling/components.js',
      '../tooling/molds.js'
    );
  }
  const M = window.MP;
  M.solveGeometryJob = async (type, payload, progress = () => {}, check = () => {}) => {
    const tick = async (n, total) => {
      progress(n, total);
      await new Promise((r) => setTimeout(r, 0));
      check();
    };
    await tick(0, payload.bodies?.length || 1);
    if (type === 'tooling') {
      const results = [];
      for (const item of payload.items) {
        check();
        results.push({
          id: item.body.id,
          config: item.config,
          key: M.toolKey(item.body, item.config),
          tool: M.makeTool(item.body, item.config)
        });
        await tick(results.length, payload.items.length);
      }
      return results;
    }
    if (type === 'boolean') {
      let mesh = M.world(payload.bodies[0]);
      for (let i = 1; i < payload.bodies.length; i++) {
        mesh = M.csg(mesh, M.world(payload.bodies[i]), payload.op);
        await tick(i, payload.bodies.length - 1);
      }
      return mesh;
    }
    if (type === 'split') return M.splitMesh(M.world(payload.body), payload.axis, payload.position);
    throw Error('Unknown geometry operation.');
  };
  if (background)
    self.onmessage = async ({ data }) => {
      try {
        const result = await M.solveGeometryJob(data.type, data.payload, (done, total) =>
          self.postMessage({ progress: { done, total } })
        );
        self.postMessage({ result });
      } catch (e) {
        self.postMessage({ error: e.message || String(e) });
      }
    };
})();
