(function (M) {
  'use strict';
  const workerURL = new URL(
    '../../workers/geometry-worker.js',
    document.currentScript?.src || document.baseURI
  ).href;
  M.AppActions.jobs = function () {
    this.cancelJob = () => {
      const operation = this.operation;
      if (!operation?.cancel) return;
      operation.cancel();
      this.notice(
        this.t('연산을 취소했습니다. 원본은 유지됩니다.', 'Operation cancelled. Source preserved.')
      );
    };
    this.geometryJob = async (type, payload) => {
      const operation = this.operation,
        source = this.state.p;
      const abort = () => new DOMException('Operation cancelled or project changed.', 'AbortError');
      let cancelled = false;
      const check = () => {
        if (cancelled || !this.alive || this.operation !== operation || this.state.p !== source)
          throw abort();
      };
      const progress = ({ done, total }) => {
        if (!cancelled && this.alive && this.operation === operation)
          this.setState({ jobProgress: Math.round((done / Math.max(1, total)) * 100) });
      };
      const fallback = async () => {
        operation.cancel = () => {
          cancelled = true;
        };
        this.setState({ jobMode: 'local', jobProgress: 0 });
        return M.solveGeometryJob(type, payload, (done, total) => progress({ done, total }), check);
      };
      let result;
      if (!/^https?:$/.test(location.protocol) || !globalThis.Worker) result = await fallback();
      else
        result = await new Promise((resolve, reject) => {
          let worker;
          try {
            worker = new Worker(workerURL);
          } catch (e) {
            reject(e);
            return;
          }
          this.setState({ jobMode: 'worker', jobProgress: 0 });
          const finish = (error, value) => {
            clearTimeout(timer);
            worker.terminate();
            error ? reject(error) : resolve(value);
          };
          const timer = setTimeout(
            () => finish(Error('Geometry operation timed out. Source preserved.')),
            120000
          );
          operation.cancel = () => {
            cancelled = true;
            finish(abort());
          };
          worker.onmessage = ({ data }) => {
            if (data.progress) progress(data.progress);
            else finish(data.error ? Error(data.error) : null, data.result);
          };
          worker.onerror = (event) => {
            event.preventDefault();
            finish(Error('Geometry worker could not start. Check local asset access and retry.'));
          };
          worker.postMessage({ type, payload });
        });
      check();
      operation.cancel = null;
      return result;
    };
  };
})(window.MP);
