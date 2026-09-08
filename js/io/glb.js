(function (M) {
  'use strict';
  const V = M.V;
  M.glb = (bodies) => {
    const buffers = [],
      views = [],
      accessors = [],
      meshes = [],
      nodes = [],
      materials = [];
    let bytes = 0;
    const add = (a, type) => {
      const i = views.length;
      views.push({ buffer: 0, byteOffset: bytes, byteLength: a.byteLength, target: 34962 });
      buffers.push(new Uint8Array(a.buffer));
      bytes += a.byteLength;
      const obj = { bufferView: i, componentType: 5126, count: a.length / 3, type: 'VEC3' };
      if (type === 'position') {
        const b = M.bounds(a);
        obj.min = b.min;
        obj.max = b.max;
      }
      accessors.push(obj);
      return accessors.length - 1;
    };
    for (const b of bodies) {
      const wp = M.world(b),
        p = [];
      for (let i = 0; i < wp.length; i += 3)
        p.push(wp[i] / 1000, wp[i + 2] / 1000, -wp[i + 1] / 1000);
      const pos = add(new Float32Array(p), 'position'),
        nor = add(M.normals(p), 'normal'),
        m = M.materials[b.material] || M.materials.ABS,
        color = m.color
          .slice(1)
          .match(/../g)
          .map((x) => parseInt(x, 16) / 255);
      materials.push({
        name: m.name,
        pbrMetallicRoughness: {
          baseColorFactor: [...color, 1],
          metallicFactor: m.metal,
          roughnessFactor: m.rough
        },
        doubleSided: false
      });
      meshes.push({
        name: b.name,
        primitives: [{ attributes: { POSITION: pos, NORMAL: nor }, material: materials.length - 1 }]
      });
      nodes.push({
        name: b.name,
        mesh: meshes.length - 1,
        extras: { sourceId: b.sourceId || b.id, unit: 'metre' }
      });
    }
    const doc = {
      asset: { version: '2.0', generator: 'Mold Press ' + M.REVISION },
      scene: 0,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
      nodes,
      meshes,
      materials,
      buffers: [{ byteLength: bytes }],
      bufferViews: views,
      accessors
    };
    const json = new TextEncoder().encode(JSON.stringify(doc)),
      len = Math.ceil(json.length / 4) * 4,
      total = 12 + 8 + len + 8 + bytes,
      buf = new ArrayBuffer(total),
      dv = new DataView(buf),
      u = new Uint8Array(buf);
    dv.setUint32(0, 0x46546c67, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, len, true);
    dv.setUint32(16, 0x4e4f534a, true);
    u.fill(32, 20, 20 + len);
    u.set(json, 20);
    dv.setUint32(20 + len, bytes, true);
    dv.setUint32(24 + len, 0x004e4942, true);
    let off = 28 + len;
    for (const b of buffers) {
      u.set(b, off);
      off += b.length;
    }
    return buf;
  };
})(window.MP);
