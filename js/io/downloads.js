(function (M) {
  'use strict';
  const V = M.V;
  M.prepareDownload = (name, content, type = 'application/octet-stream') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    if (!blob.size) throw Error('빈 파일은 저장할 수 없습니다. / Cannot export an empty file.');
    return { name, size: blob.size, type: blob.type || type, url: URL.createObjectURL(blob) };
  };
  M.downloadPermission = () => {
    try {
      let w = window;
      while (w !== w.parent) {
        const frame = w.frameElement;
        if (!frame) return 'unknown';
        if (frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-downloads'))
          return 'blocked';
        w = w.parent;
      }
      return 'allowed';
    } catch {
      return 'unknown';
    }
  };
  M.beginDownload = (file) => {
    if (M.downloadPermission() === 'blocked') return false;
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    return true;
  };
  M.download = (name, content, type = 'application/octet-stream') => {
    const file = M.prepareDownload(name, content, type);
    M.beginDownload(file);
    setTimeout(() => URL.revokeObjectURL(file.url), 600000);
    return file.size;
  };
  M.safeName = (s) => (s || 'Mold-Press').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 80);
})(window.MP);
