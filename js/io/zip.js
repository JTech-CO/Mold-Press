(function (M) {
  'use strict';
  const V = M.V;
  M.zip = (files) => {
    const chunks = [],
      central = [];
    let offset = 0;
    const enc = new TextEncoder(),
      crc = (a) => {
        let c = 0xffffffff;
        for (const b of a) {
          c ^= b;
          for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
        return (c ^ 0xffffffff) >>> 0;
      };
    for (const f of files) {
      const name = enc.encode(f.name),
        data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data),
        sum = crc(data),
        h = new Uint8Array(30 + name.length),
        v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x800, true);
      v.setUint32(14, sum, true);
      v.setUint32(18, data.length, true);
      v.setUint32(22, data.length, true);
      v.setUint16(26, name.length, true);
      h.set(name, 30);
      const c = new Uint8Array(46 + name.length),
        cv = new DataView(c.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x800, true);
      cv.setUint32(16, sum, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      c.set(name, 46);
      central.push(c);
      chunks.push(h, data);
      offset += h.length + data.length;
    }
    const cs = central.reduce((n, c) => n + c.length, 0),
      end = new Uint8Array(22),
      e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, files.length, true);
    e.setUint16(10, files.length, true);
    e.setUint32(12, cs, true);
    e.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  };
})(window.MP);
