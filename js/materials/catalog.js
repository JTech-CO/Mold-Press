(function (M) {
  'use strict';
  const V = M.V;
  M.materials = {
    ABS: {
      name: 'ABS',
      density: 1.04,
      shrink: 0.006,
      draft: 1.5,
      cycle: 32,
      min: 1.15,
      max: 3.56,
      color: '#eee1bd',
      rough: 0.27,
      metal: 0,
      texture: ['새틴 · 미세 텍스처', 'Satin · fine texture'],
      process: 'injection'
    },
    PP: {
      name: 'PP',
      density: 0.9,
      shrink: 0.016,
      draft: 2,
      cycle: 28,
      min: 0.65,
      max: 3.81,
      color: '#39b994',
      rough: 0.48,
      metal: 0,
      texture: ['왁스형 · 반광', 'Waxy · semi-gloss'],
      process: 'injection'
    },
    PC: {
      name: 'PC',
      density: 1.2,
      shrink: 0.006,
      draft: 1.5,
      cycle: 40,
      min: 1.02,
      max: 3.81,
      color: '#559ee2',
      rough: 0.12,
      metal: 0,
      texture: ['광택 · 반투명 느낌', 'Gloss · translucent appearance'],
      process: 'injection'
    },
    Nylon: {
      name: 'Nylon',
      density: 1.14,
      shrink: 0.015,
      draft: 1.5,
      cycle: 38,
      min: 0.76,
      max: 2.92,
      color: '#ce934e',
      rough: 0.48,
      metal: 0,
      texture: ['무광 · 미세 입자', 'Matte · fine grain'],
      process: 'injection'
    },
    'Aluminum 6061': {
      name: 'Aluminum 6061',
      density: 2.7,
      shrink: 0.0064,
      draft: 3,
      cycle: 55,
      min: 1.5,
      max: 5,
      color: '#d2dfeb',
      rough: 0.24,
      metal: 0.88,
      texture: ['브러시드 · 금속', 'Brushed · metallic'],
      process: 'compression',
      note: [
        '6061은 일반 사출·다이캐스팅용 합금이 아닙니다. 압축/단조의 개념 애니메이션이며 수축·사이클은 예시값입니다.',
        '6061 is not a conventional injection/die-casting alloy. Conceptual compression/forging animation; shrink and cycle values are illustrative.'
      ]
    },
    Zinc: {
      name: 'Zinc',
      density: 6.6,
      shrink: 0.012,
      draft: 1,
      cycle: 24,
      min: 0.7,
      max: 4,
      color: '#788cac',
      rough: 0.2,
      metal: 0.9,
      texture: ['광택 · 아연 합금 근사', 'Gloss · generic zinc alloy'],
      process: 'casting'
    },
    'CF Nylon': {
      name: 'Carbon-fiber filled nylon',
      density: 1.18,
      shrink: 0.004,
      draft: 2,
      cycle: 45,
      min: 1.2,
      max: 4,
      color: '#30373d',
      rough: 0.8,
      metal: 0.04,
      texture: ['탄소 충전 · 거친 무광', 'Carbon-filled · rough matte'],
      process: 'injection'
    }
  };
})(window.MP);
