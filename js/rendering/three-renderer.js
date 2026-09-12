(function (M) {
  'use strict';
  const V = M.V;
  const { matrix, identity, mul } = M.RenderMath;
  class ThreeRenderer {
    constructor(canvas) {
      const T = window.THREE;
      this.T = T;
      this.canvas = canvas;
      this.name = 'Three.js r' + T.REVISION;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setClearColor('#101419');
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.scene = new T.Scene();
      this.environment = M.makeEnvironment(T, this.renderer);
      this.scene.environment = this.environment.texture;
      this.camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 5000);
      this.camera.up.set(0, 0, 1);
      this.scene.add(new T.HemisphereLight(0xe2eaf1, 0x373c43, 0.85));
      const a = new T.DirectionalLight(0xfff1d9, 1.1);
      a.position.set(-130, -180, 250);
      const b = new T.DirectionalLight(0xc7def3, 0.65);
      b.position.set(100, 100, 120);
      this.scene.add(a, b);
      this.keyLight = a;
      this.scene.add(a.target);
      a.castShadow = true;
      a.shadow.mapSize.set(1024, 1024);
      a.shadow.normalBias = 0.12;
      a.shadow.bias = -0.0001;
      this.floor = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShadowMaterial({ opacity: 0.2 }));
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);
      this.cache = new Map();
    }
    resize(w, h) {
      this.renderer.setPixelRatio(
        Math.min(
          devicePixelRatio || 1,
          this.quality === 'low' ? 1 : this.quality === 'high' ? 2 : 1.5
        )
      );
      this.renderer.setSize(w, h, false);
      const high = this.quality === 'high';
      if (this.renderer.shadowMap.enabled !== high) {
        this.renderer.shadowMap.enabled = high;
        for (const obj of this.cache.values()) obj.material.needsUpdate = true;
      }
      this.floor.visible = high;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
    render(records, cam) {
      const T = this.T,
        used = new Set();
      this.camera.left = -cam.viewW / 2;
      this.camera.right = cam.viewW / 2;
      this.camera.top = cam.viewH / 2;
      this.camera.bottom = -cam.viewH / 2;
      this.camera.position.fromArray(cam.eye);
      this.camera.lookAt(...cam.target);
      this.camera.updateProjectionMatrix();
      for (const r of records) {
        used.add(r.id);
        let obj = this.cache.get(r.id);
        if (!obj || obj.userData.geo !== r.geo || obj.userData.lines !== r.lines) {
          if (obj) {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
          }
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.Float32BufferAttribute(M.unpack(r.geo), 3));
          if (!r.lines) {
            g.setAttribute(
              'normal',
              new T.Float32BufferAttribute(M.shadingNormals(M.unpack(r.geo)), 3)
            );
            g.computeBoundingBox();
          }
          const mat = r.lines
            ? new T.LineBasicMaterial({
                color: new T.Color(...M.hex(r.color)).convertSRGBToLinear(),
                transparent: true,
                opacity: r.alpha ?? 1
              })
            : new T.MeshStandardMaterial({
                color: new T.Color(...M.hex(r.color)).convertSRGBToLinear(),
                roughness: r.rough ?? 0.4,
                metalness: r.metal ?? 0.3,
                transparent: true,
                opacity: r.alpha ?? 1,
                side: T.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
              });
          if (!r.lines) {
            mat.userData.surface = {
              value: new T.Vector4().fromArray(r.surface || M.finishes.none)
            };
            mat.onBeforeCompile = (shader) => {
              shader.uniforms.uSurface = mat.userData.surface;
              shader.vertexShader =
                'varying vec3 vSurfacePosition;\n' +
                shader.vertexShader.replace(
                  '#include <begin_vertex>',
                  '#include <begin_vertex>\nvSurfacePosition=position;'
                );
              shader.fragmentShader =
                M.surfaceGLSL +
                shader.fragmentShader.replace(
                  '#include <roughnessmap_fragment>',
                  '#include <roughnessmap_fragment>\nfloat mpFinish=mpSurface(vSurfacePosition);diffuseColor.rgb*=1.0+mpFinish*uSurface.y;roughnessFactor=clamp(roughnessFactor+mpFinish*uSurface.w,.045,1.0);'
                );
            };
            mat.customProgramCacheKey = () => 'mold-press-finish-v1';
          }
          obj = r.lines ? new T.LineSegments(g, mat) : new T.Mesh(g, mat);
          obj.userData = { geo: r.geo, lines: r.lines };
          this.cache.set(r.id, obj);
          this.scene.add(obj);
        }
        obj.position.fromArray(r.pos || [0, 0, 0]);
        const rr = r.rot || [0, 0, 0];
        obj.rotation.set(...rr.map((x) => (x * Math.PI) / 180), 'ZYX');
        obj.scale.fromArray(r.scale || [1, 1, 1]);
        obj.material.color.setRGB(...M.hex(r.color)).convertSRGBToLinear();
        if (!r.lines) {
          obj.material.roughness = r.rough ?? 0.4;
          obj.material.metalness = r.metal ?? 0.3;
          obj.material.userData.surface.value.fromArray(r.surface || M.finishes.none);
        }
        obj.castShadow = !r.lines && !r.helper && (r.alpha ?? 1) >= 0.99;
        obj.receiveShadow = !r.lines && !r.helper;
        obj.material.opacity = r.alpha ?? 1;
        const transparent = obj.material.opacity < 0.99;
        if (obj.material.transparent !== transparent) {
          obj.material.transparent = transparent;
          obj.material.needsUpdate = true;
        }
        obj.material.depthWrite = obj.material.opacity >= 0.99;
        obj.visible = obj.material.opacity > 0;
      }
      for (const [id, o] of this.cache)
        if (!used.has(id)) {
          this.scene.remove(o);
          o.geometry.dispose();
          o.material.dispose();
          this.cache.delete(id);
        }
      if (this.quality === 'high') {
        const bounds = new T.Box3();
        for (const obj of this.cache.values())
          if (obj.castShadow) {
            obj.updateMatrixWorld();
            bounds.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
          }
        if (!bounds.isEmpty()) {
          const c = bounds.getCenter(new T.Vector3()),
            size = bounds.getSize(new T.Vector3());
          const span = Math.max(size.x, size.y, size.z, 40),
            light = this.keyLight;
          light.position.copy(c).add(new T.Vector3(-span, -span, span * 2));
          light.target.position.copy(c);
          light.target.updateMatrixWorld();
          Object.assign(light.shadow.camera, {
            left: -span,
            right: span,
            top: span,
            bottom: -span,
            near: 0.1,
            far: span * 6
          });
          light.shadow.camera.updateProjectionMatrix();
          this.floor.position.set(c.x, c.y, bounds.min.z - 0.12);
          this.floor.scale.set(span * 3, span * 3, 1);
        }
      }
      this.renderer.render(this.scene, this.camera);
    }
    dispose() {
      for (const o of this.cache.values()) {
        o.geometry.dispose();
        o.material.dispose();
      }
      this.floor.geometry.dispose();
      this.floor.material.dispose();
      this.keyLight.shadow.dispose();
      this.environment.dispose();
      this.renderer.dispose();
    }
  }
  M.Renderers.Three = ThreeRenderer;
})(window.MP);
