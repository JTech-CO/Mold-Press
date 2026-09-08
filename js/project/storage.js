(function (M) {
  'use strict';
  const V = M.V;
  M.compress = async (text) => {
    if (!globalThis.CompressionStream) return 'J' + text;
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return 'G' + M.b64(new Uint8Array(await new Response(stream).arrayBuffer()));
  };
  M.decompress = async (str) => {
    if (str[0] === 'J') return str.slice(1);
    if (str[0] !== 'G') return str;
    if (str.length > 24000000) throw Error('Project too large.');
    const stream = new Blob([M.unb64(str.slice(1))])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    const r = stream.getReader(),
      chunks = [];
    let n = 0;
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      n += value.length;
      if (n > 24000000) {
        await r.cancel();
        throw Error('Uncompressed project exceeds 24 MB.');
      }
      chunks.push(value);
    }
    return await new Blob(chunks).text();
  };
  M.load = async () => {
    let project = null,
      error = null,
      shared = false;
    try {
      const h = location.hash;
      if (h.startsWith('#copy=')) {
        const id = decodeURIComponent(h.slice(6));
        const raw = localStorage.getItem('mold-press.share.' + id);
        if (!raw)
          throw Error(
            '이 복제 링크는 생성한 브라우저·사이트 저장소에서만 열립니다. 다른 기기에는 프로젝트 JSON을 전달하세요.'
          );
        project = M.validate(JSON.parse(await M.decompress(raw)));
        project.id = M.uid();
        project.name += ' · 복제';
        shared = true;
      } else {
        const raw = localStorage.getItem(M.STORAGE);
        if (raw) project = M.validate(JSON.parse(await M.decompress(raw)));
      }
    } catch (e) {
      error = e.message;
    }
    return { project: project || M.newProject(), error, shared };
  };
  M.save = async (p) => {
    const data = await M.compress(JSON.stringify(p));
    localStorage.setItem(M.STORAGE, data);
    return data.length;
  };
})(window.MP);
