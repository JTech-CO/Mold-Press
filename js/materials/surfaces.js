/* Procedural finishes in object coordinates: no downloaded images or UV seams.
 * Surface tuple: pattern, color variation, samples/mm, roughness variation.
 * These visual profiles do not modify the manufacturing estimates or geometry.
 */
(function (M) {
  'use strict';
  M.finishes = {
    none: [0, 0, 1, 0],
    satin: [1, 0.035, 3.8, 0.07],
    wax: [1, 0.035, 2.1, 0.035],
    gloss: [1, 0.018, 4, 0.018],
    nylon: [1, 0.055, 2.6, 0.14],
    brushed: [2, 0.035, 8, 0.12],
    zinc: [1, 0.085, 1.9, 0.065],
    fiber: [3, 0.1, 3.1, 0.18],
    toolSteel: [4, 0.03, 9, 0.08],
    chrome: [2, 0.012, 10, 0.03],
    powderCoat: [1, 0.075, 2.9, 0.12]
  };
  for (const [key, finish] of Object.entries({
    ABS: 'satin',
    PP: 'wax',
    PC: 'gloss',
    Nylon: 'nylon',
    'Aluminum 6061': 'brushed',
    Zinc: 'zinc',
    'CF Nylon': 'fiber'
  })) {
    M.materials[key].surface = M.finishes[finish];
  }
  M.surfaceFor = (id, extra) => {
    if (extra.lines) return M.finishes.none;
    if (id === 'cavity' || id === 'core' || /platen|feed-table|tray-surface/.test(id))
      return M.finishes.toolSteel;
    if (/^pin|tie-|piston|roller|bolt|washer|hopper|barrel/.test(id)) return M.finishes.chrome;
    if (id.startsWith('machine-')) return M.finishes.powderCoat;
    return M.finishes.none;
  };
  const boundsCache = new WeakMap();
  M.surfaceBounds = (p) => {
    if (!boundsCache.has(p)) boundsCache.set(p, M.bounds(p));
    return boundsCache.get(p);
  };
  M.machinedFactor = (point, surface, bounds) => {
    if (surface?.[0] !== 4) return 1;
    const d = Math.min(
      ...point.map((x, k) => Math.min(Math.abs(x - bounds.min[k]), Math.abs(x - bounds.max[k])))
    );
    const q = Math.max(0, Math.min(1, (d - 0.005) / 0.045));
    return 0.2 + 0.8 * (1 - q * q * (3 - 2 * q));
  };
  M.surfaceValue = (x, y, z, s, n = [0, 0, 1], footprint = 0) => {
    x *= s[2];
    y *= s[2];
    z *= s[2];
    const grain =
      0.55 * Math.sin(x * 1.23 + y * 2.79 + z * 2.19) +
      0.3 * Math.sin(y * 1.73 - z * 2.83) * Math.sin(x * 3.11 + z) +
      0.15 * Math.sin(x * 8.1 + y * 7.3 - z * 4.7);
    const w = n.map(Math.abs),
      sum = w.reduce((a, b) => a + b, 0) || 1;
    const lines =
      (Math.sin(y * 6.283) * w[0] + Math.sin(z * 6.283) * w[1] + Math.sin(x * 6.283) * w[2]) / sum;
    const pattern =
      s[0] === 2 || s[0] === 4
        ? lines * 0.7 + grain * 0.3
        : s[0] === 3
          ? grain * 0.65 + Math.sin(x * 0.43 + y + z * 0.61) * 0.35
          : grain;
    const q = Math.max(0, Math.min(1, (footprint * s[2] - 0.3) / 1.2));
    return pattern * (1 - q * q * (3 - 2 * q));
  };
  M.surfaceGLSL = `
    uniform vec4 uSurface;
    uniform vec3 uSurfaceMin;
    uniform vec3 uSurfaceMax;
    uniform float uDetail;
    varying vec3 vSurfacePosition;
    varying vec3 vSurfaceNormal;
    float mpMachined(vec3 p) {
      if(uSurface.x<3.5)return 1.0;
      vec3 d=min(abs(p-uSurfaceMin),abs(p-uSurfaceMax));
      return mix(.2,1.0,1.0-smoothstep(.005,.05,min(d.x,min(d.y,d.z))));
    }
    float mpSurface(vec3 pos) {
      vec3 p=pos*uSurface.z;
      float grain=.55*sin(p.x*1.23+p.y*2.79+p.z*2.19)+.3*sin(p.y*1.73-p.z*2.83)*sin(p.x*3.11+p.z)+.15*sin(p.x*8.1+p.y*7.3-p.z*4.7);
      vec3 w=abs(normalize(vSurfaceNormal)); w/=max(.001,w.x+w.y+w.z);
      float lines=dot(sin(vec3(p.y,p.z,p.x)*6.283),w);
      float value=grain;
      if(uSurface.x>1.5&&(uSurface.x<2.5||uSurface.x>3.5))value=.7*lines+.3*grain;
      else if(uSurface.x>2.5)value=.65*grain+.35*sin(p.x*.43+p.y+p.z*.61);
      float fade=1.0;
      #ifdef MP_DERIVATIVES
      fade=1.0-smoothstep(.3,1.5,length(fwidth(p)));
      #endif
      return value*fade*mpMachined(pos);
    }
    vec3 mpBump(vec3 n,vec3 pos,float height) {
      #ifdef MP_DERIVATIVES
      vec3 dx=dFdx(pos),dy=dFdy(pos);
      vec3 r1=cross(dy,n),r2=cross(n,dx);
      float det=dot(dx,r1);
      vec3 gradient=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);
      return normalize(max(abs(det),1e-12)*n-gradient*uDetail);
      #else
      return n;
      #endif
    }
  `;
  // A small generated studio environment gives metals readable reflections offline.
  M.makeEnvironment = (T, renderer) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext('2d'),
      sky = c.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#b5bdc5');
    sky.addColorStop(0.48, '#687480');
    sky.addColorStop(0.52, '#414b55');
    sky.addColorStop(1, '#252d36');
    c.fillStyle = sky;
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#eef1f3';
    c.fillRect(18, 23, 28, 39);
    c.fillRect(171, 18, 12, 49);
    c.fillStyle = '#aebdcc';
    c.fillRect(91, 34, 42, 17);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.mapping = T.EquirectangularReflectionMapping;
    const generator = new T.PMREMGenerator(renderer),
      target = generator.fromEquirectangular(texture);
    generator.dispose();
    texture.dispose();
    return target;
  };
})(window.MP);
