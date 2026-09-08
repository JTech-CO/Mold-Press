(function (M) {
  'use strict';

  const V = M.V,
    S = (M.Sketch = {}),
    TAU = Math.PI * 2,
    eps = 1e-6;
  const clone = (x) => JSON.parse(JSON.stringify(x)),
    sub = (a, b) => [a[0] - b[0], a[1] - b[1]],
    add = (a, b) => [a[0] + b[0], a[1] + b[1]],
    mul = (a, t) => [a[0] * t, a[1] * t],
    dot = (a, b) => a[0] * b[0] + a[1] * b[1],
    cross = (a, b) => a[0] * b[1] - a[1] * b[0],
    len = (a) => Math.hypot(...a),
    unit = (a) => mul(a, 1 / (len(a) || 1));
  const err = (ko, en) => {
    throw Error(ko + ' / ' + en);
  };
  M.SketchMath = { TAU, eps, clone, sub, add, mul, dot, cross, len, unit, err };
})(window.MP);
