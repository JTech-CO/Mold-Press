(function (M) {
  'use strict';
  let opening,
    queue = Promise.resolve();
  const open = () => {
    if (!opening)
      opening = new Promise((resolve, reject) => {
        const request = indexedDB.open('mold-press.library.v1', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('projects', { keyPath: 'id' });
          request.result.createObjectStore('meta');
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(Error('Close older Mold Press tabs and retry storage.'));
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            opening = null;
          };
          resolve(db);
        };
      }).catch((e) => {
        opening = null;
        throw e;
      });
    return opening;
  };
  const transaction = async (mode, work) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'meta'], mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || Error('Project storage failed.'));
      tx.onabort = () => reject(tx.error || Error('Project storage was interrupted.'));
      work(tx, (value) => {
        result = value;
      });
    });
  };
  const serialize = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };
  M.library = {
    save(project, { active = false, isCurrent = () => true } = {}) {
      const snapshot = JSON.stringify(project);
      return serialize(async () => {
        const data = await M.compress(snapshot),
          p = JSON.parse(snapshot);
        if (!isCurrent()) return false;
        return transaction('readwrite', (tx, done) => {
          const store = tx.objectStore('projects'),
            req = store.get(p.id);
          req.onsuccess = () => {
            if (!isCurrent()) {
              done(false);
              return;
            }
            const old = req.result,
              revisions = old?.revisions || [];
            if (revisions[0]?.data !== data)
              revisions.unshift({
                id: M.uid(),
                date: new Date().toISOString(),
                updated: p.updated,
                data
              });
            revisions.length = Math.min(revisions.length, 5);
            const entry = {
              id: p.id,
              name: p.name,
              updated: p.updated,
              date: revisions[0].date,
              revisions,
              bytes: revisions.reduce((sum, r) => sum + new Blob([r.data]).size, 0)
            };
            store.put(entry);
            if (active) tx.objectStore('meta').put(p.id, 'active');
            done(true);
          };
        });
      });
    },
    list: () =>
      transaction('readonly', (tx, done) => {
        const req = tx.objectStore('projects').getAll();
        req.onsuccess = () =>
          done(
            req.result
              .map(({ revisions, ...entry }) => ({
                ...entry,
                revisions: revisions.map(({ data, ...r }) => r)
              }))
              .sort((a, b) => b.date.localeCompare(a.date))
          );
      }),
    read: async (id, revision) => {
      const entry = await transaction('readonly', (tx, done) => {
        const req = tx.objectStore('projects').get(id);
        req.onsuccess = () => done(req.result);
      });
      const snapshot = revision
        ? entry?.revisions.find((r) => r.id === revision)
        : entry?.revisions[0];
      if (!snapshot) throw Error('Saved project or revision is unavailable.');
      return M.validate(JSON.parse(await M.decompress(snapshot.data)));
    },
    active: async () => {
      const id = await transaction('readonly', (tx, done) => {
        const req = tx.objectStore('meta').get('active');
        req.onsuccess = () => done(req.result);
      });
      if (!id) return null;
      try {
        return await M.library.read(id);
      } catch (error) {
        const entry = (await M.library.list()).find((e) => e.id === id);
        for (const revision of entry?.revisions.slice(1) || []) {
          try {
            return await M.library.read(id, revision.id);
          } catch {}
        }
        throw error;
      }
    },
    remove: (id) =>
      serialize(() =>
        transaction('readwrite', (tx, done) => {
          tx.objectStore('projects').delete(id);
          const req = tx.objectStore('meta').get('active');
          req.onsuccess = () => {
            if (req.result === id) tx.objectStore('meta').delete('active');
            done(true);
          };
        })
      )
  };
  const load = M.load;
  M.load = async () => {
    const result = await load();
    if (location.hash.startsWith('#copy=')) return result;
    try {
      const saved = await M.library.active();
      let raw = null;
      try {
        raw = localStorage.getItem(M.STORAGE);
      } catch {}
      if (
        saved &&
        (!raw ||
          result.error ||
          (saved.updated || saved.created || '') >
            (result.project.updated || result.project.created || ''))
      ) {
        result.project = saved;
        result.error = '보관함에서 최근 저장을 복구했습니다. / Recovered the latest library save.';
      }
    } catch {}
    return result;
  };
})(window.MP);
