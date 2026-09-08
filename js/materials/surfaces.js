/* Procedural finishes in object coordinates: no downloaded images or UV seams.
 * Surface tuple: pattern, color variation, samples/mm, roughness variation.
 * These visual profiles do not modify the manufacturing estimates or geometry.
 */
(function (M) {
  'use strict';
  M.finishes = {
    none: [0, 0, 1, 0],
    satin: [1, 0.075, 3.8, 0.07],
    wax: [1, 0.035, 2.1, 0.035],
    gloss: [1, 0.018, 4, 0.018],
    nylon: [1, 0.15, 2.6, 0.14],
    brushed: [2, 0.12, 2.3, 0.12],
    zinc: [1, 0.085, 1.9, 0.065],
    fiber: [3, 0.27, 3.1, 0.18],
    toolSteel: [2, 0.095, 1.8, 0.1],
    chrome: [2, 0.035, 3.2, 0.03],
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
  // Keep the Canvas fallback and both GPU paths on the same surface definition.
  M.surfaceValue = (x, y, z, s) => {
    x *= s[2];
    y *= s[2];
    z *= s[2];
    const hash =
      Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233 + Math.floor(z) * 37.719) *
      43758.5453;
    const grain = (hash - Math.floor(hash)) * 2 - 1;
    if (s[0] === 2) return 0.7 * Math.sin((y + z * 0.31) * 6.283185) + 0.3 * grain;
    if (s[0] === 3) return 0.55 * grain + 0.45 * Math.sin((x * 0.43 + y + z * 0.61) * 9);
    return grain;
  };
  M.surfaceGLSL = `
    uniform vec4 uSurface;
    varying vec3 vSurfacePosition;
    float mpSurface(vec3 p) {
      p *= uSurface.z;
      float grain = fract(sin(dot(floor(p), vec3(12.9898,78.233,37.719)))*43758.5453)*2.0-1.0;
      if (uSurface.x > 1.5 && uSurface.x < 2.5)
        return .7*sin((p.y+p.z*.31)*6.283185)+.3*grain;
      if (uSurface.x > 2.5)
        return .55*grain+.45*sin((p.x*.43+p.y+p.z*.61)*9.0);
      return grain;
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
