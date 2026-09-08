(function (M) {
  'use strict';
  const V = M.V;
  M.pressMotion = (p, running = true) => {
    const clamp = (x) => Math.max(0, Math.min(1, x)),
      ease = (x) => {
        const q = clamp(x);
        return q * q * (3 - 2 * q);
      };
    if (!running)
      return { feed: 0, clamp: 0, form: 0, cool: 0, open: 1, eject: 0, lift: 0, pin: 0, phase: 0 };
    return {
      feed: ease(p / 0.16),
      clamp: ease((p - 0.16) / 0.18),
      form: ease((p - 0.34) / 0.16),
      cool: clamp((p - 0.5) / 0.22),
      open:
        p < 0.16
          ? 1
          : p < 0.34
            ? 1 - ease((p - 0.16) / 0.18)
            : p < 0.72
              ? 0
              : ease((p - 0.72) / 0.16),
      eject: ease((p - 0.92) / 0.08),
      lift: ease((p - 0.88) / 0.04),
      pin: ease((p - 0.88) / 0.04) * (1 - ease((p - 0.96) / 0.04)),
      phase: p < 0.34 ? 0 : p < 0.5 ? 1 : p < 0.72 ? 2 : p < 0.88 ? 3 : 4
    };
  };
})(window.MP);
