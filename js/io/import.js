(function (M) {
  'use strict';
  const V = M.V;
  M.parseImport = async (file) => {
    if (file.size > 20000000) throw Error('20 MB 이하의 파일을 가져오세요. / Maximum 20 MB.');
    const ext = file.name.split('.').pop().toLowerCase(),
      base = file.name.replace(/\.[^.]+$/, '');
    if (ext === 'json') return { project: M.validate(JSON.parse(await file.text())) };
    const buf = await file.arrayBuffer();
    let out = [];
    if (ext === 'stl') {
      const v = new DataView(buf);
      if (buf.byteLength >= 84 && 84 + v.getUint32(80, true) * 50 <= buf.byteLength) {
        const n = v.getUint32(80, true);
        if (n > 200000) throw Error('STL triangle limit: 200,000');
        for (let i = 0; i < n; i++)
          for (let j = 0; j < 9; j++) out.push(v.getFloat32(84 + i * 50 + 12 + j * 4, true));
      } else {
        const t = new TextDecoder().decode(buf),
          r = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;
        for (const m of t.matchAll(r)) out.push(+m[1], +m[2], +m[3]);
      }
    } else if (ext === 'obj') {
      const verts = [];
      for (const line of new TextDecoder().decode(buf).split(/\r?\n/)) {
        const a = line.trim().split(/\s+/);
        if (a[0] === 'v') verts.push(a.slice(1, 4).map(Number));
        if (a[0] === 'f') {
          const ids = a.slice(1).map((s) => {
            const n = parseInt(s.split('/')[0], 10);
            return n < 0 ? verts.length + n : n - 1;
          });
          for (let j = 2; j < ids.length; j++) {
            for (const id of [ids[0], ids[j - 1], ids[j]]) {
              if (!verts[id]) throw Error('Invalid OBJ vertex index.');
              out.push(...verts[id]);
            }
          }
        }
      }
    } else if (ext === 'glb') {
      const v = new DataView(buf);
      if (v.getUint32(0, true) !== 0x46546c67 || v.getUint32(4, true) !== 2)
        throw Error('Only glTF 2.0 GLB is supported.');
      let json, bin;
      for (let off = 12; off + 8 <= buf.byteLength;) {
        const len = v.getUint32(off, true),
          type = v.getUint32(off + 4, true);
        if (off + 8 + len > buf.byteLength) throw Error('Invalid GLB chunk.');
        if (type === 0x4e4f534a)
          json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len)).trim());
        if (type === 0x004e4942) bin = new DataView(buf, off + 8, len);
        off += 8 + len;
      }
      if (!json || !bin) throw Error('Embedded GLB geometry is required.');
      if (json.extensionsRequired?.some((x) => /draco|meshopt/i.test(x)))
        throw Error(
          '압축 GLB는 미지원입니다. uncompressed GLB로 내보내세요. / Export uncompressed GLB.'
        );
      const read = (idx) => {
        const a = json.accessors[idx],
          b = json.bufferViews[a.bufferView];
        if (!b || b.buffer !== 0 || a.sparse)
          throw Error('Sparse/external GLB accessors are not supported.');
        const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 },
          fns = {
            5120: 'getInt8',
            5121: 'getUint8',
            5122: 'getInt16',
            5123: 'getUint16',
            5125: 'getUint32',
            5126: 'getFloat32'
          },
          k = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type],
          s = sizes[a.componentType],
          values = [];
        if (!k || !s) throw Error('Unsupported GLB accessor.');
        for (let i = 0; i < a.count; i++)
          for (let j = 0; j < k; j++)
            values.push(
              bin[fns[a.componentType]](
                (b.byteOffset || 0) + (a.byteOffset || 0) + i * (b.byteStride || s * k) + j * s,
                true
              )
            );
        return values;
      };
      const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        mul = (a, b) =>
          Array.from({ length: 16 }, (_, i) => {
            let r = 0;
            for (let k = 0; k < 4; k++) r += a[(i % 4) + 4 * k] * b[Math.floor(i / 4) * 4 + k];
            return r;
          }),
        matrix = (n) => {
          if (n.matrix) return n.matrix;
          const [x, y, z, w] = n.rotation || [0, 0, 0, 1],
            s = n.scale || [1, 1, 1],
            t = n.translation || [0, 0, 0];
          return [
            (1 - 2 * y * y - 2 * z * z) * s[0],
            (2 * x * y + 2 * z * w) * s[0],
            (2 * x * z - 2 * y * w) * s[0],
            0,
            (2 * x * y - 2 * z * w) * s[1],
            (1 - 2 * x * x - 2 * z * z) * s[1],
            (2 * y * z + 2 * x * w) * s[1],
            0,
            (2 * x * z + 2 * y * w) * s[2],
            (2 * y * z - 2 * x * w) * s[2],
            (1 - 2 * x * x - 2 * y * y) * s[2],
            0,
            ...t,
            1
          ];
        };
      const bodies = [],
        seen = new Set();
      function visit(i, parent, depth = 0) {
        if (depth > 64 || seen.has(i)) throw Error('Invalid GLB node graph.');
        seen.add(i);
        const n = json.nodes[i],
          mat = mul(parent, matrix(n));
        if (n.mesh !== undefined) {
          const mesh = json.meshes[n.mesh];
          for (const pr of mesh.primitives) {
            if (pr.mode !== undefined && pr.mode !== 4) continue;
            const p = read(pr.attributes.POSITION),
              ix =
                pr.indices === undefined
                  ? Array.from({ length: p.length / 3 }, (_, i) => i)
                  : read(pr.indices),
              a = [];
            for (const id of ix) {
              let [x, y, z] = p.slice(id * 3, id * 3 + 3);
              const xx = mat[0] * x + mat[4] * y + mat[8] * z + mat[12],
                yy = mat[1] * x + mat[5] * y + mat[9] * z + mat[13],
                zz = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
              a.push(xx * 1000, -zz * 1000, yy * 1000);
            }
            if (a.length)
              bodies.push(M.body(n.name || mesh.name || base, a, { primitive: 'imported' }));
          }
        }
        for (const j of n.children || []) visit(j, mat, depth + 1);
        seen.delete(i);
      }
      for (const i of json.scenes?.[json.scene || 0]?.nodes || []) visit(i, ident());
      if (!bodies.length) throw Error('No triangle geometry found.');
      return { bodies };
    } else throw Error('STL, OBJ, GLB 또는 프로젝트 JSON만 지원합니다.');
    if (!out.length || out.length % 9 || out.some((x) => !Number.isFinite(x)))
      throw Error('Invalid or empty triangle mesh.');
    return { bodies: [M.body(base, out, { primitive: 'imported' })] };
  };
})(window.MP);
