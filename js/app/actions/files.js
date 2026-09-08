(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.files = function (props) {
    this.import = (files) =>
      this.task(this.t('파일 가져오는 중', 'Importing file'), async () => {
        for (const file of files) {
          const result = await M.parseImport(file);
          if (result.project) {
            this.edit(
              this.t('프로젝트 가져오기', 'Import project'),
              (p) => {
                for (const key of Object.keys(p)) delete p[key];
                Object.assign(p, result.project);
              },
              { selected: result.project.bodies.slice(0, 1).map((b) => b.id), page: 'studio' }
            );
          } else {
            this.edit(
              this.t('메쉬 가져오기', 'Import mesh'),
              (p) => p.bodies.push(...result.bodies),
              { selected: result.bodies.map((b) => b.id), page: 'studio' }
            );
          }
        }
        setTimeout(() => this.view.fit(this.state.p.bodies), 80);
        this.notice(
          this.t(
            '가져오기 완료. STL/OBJ는 mm, GLB는 m → mm로 변환했습니다.',
            'Imported. STL/OBJ use mm; GLB metres converted to mm.'
          )
        );
      });
    this.loadSample = (kind) =>
      this.task(this.t('프로젝트 여는 중', 'Opening project'), () => {
        const p = M.newProject(kind);
        this.edit(
          this.t('프로젝트 열기', 'Open project'),
          (q) => {
            for (const key of Object.keys(q)) delete q[key];
            Object.assign(q, p);
          },
          {
            selected: p.bodies.slice(0, 1).map((b) => b.id),
            page: 'studio',
            modal: null,
            explode: 0,
            collisions: []
          }
        );
        setTimeout(() => {
          if (this.alive && this.state.p.id === p.id) this.view.fit(p.bodies);
        }, 50);
      });
    this.exportBodies = () => {
      const { exportScope, p } = this.state;
      if (exportScope === 'assembly') return p.assembly;
      if (exportScope === 'selected') return this.selectedBodies();
      return p.bodies;
    };
    this.export = (type) => {
      if (this.exporting) return;
      this.exporting = true;
      if (this.state.exportFile) {
        URL.revokeObjectURL(this.state.exportFile.url);
        this.setState({ exportFile: null });
      }
      try {
        const name = M.safeName(this.state.p.name);
        let content, filename, mime;
        if (type === 'png') {
          content = this.view.screenshot(this.state.p.name);
          filename = name + '.png';
          mime = 'image/png';
        } else if (type === 'json') {
          content = JSON.stringify(this.state.p, null, 2);
          filename = name + '.moldpress.json';
          mime = 'application/json';
        } else {
          const bodies = this.exportBodies();
          if (!bodies.length)
            throw Error(
              this.t(
                '내보낼 바디가 없습니다. 내보내기 범위를 확인하세요.',
                'No bodies in the chosen export scope.'
              )
            );
          for (const body of bodies) {
            const p = M.world(body);
            if (p.length < 9 || p.length % 9 || p.some((x) => !Number.isFinite(x)))
              throw Error(
                this.t(
                  '유효하지 않은 메쉬가 포함되어 있습니다.',
                  'Export contains an invalid mesh.'
                )
              );
          }
          if (type === 'glb') {
            content = M.glb(bodies);
            filename = name + '.glb';
            mime = 'model/gltf-binary';
          } else if (type === 'stl') {
            content = M.stl(bodies);
            filename = name + '.stl';
            mime = 'model/stl';
          } else if (type === 'parts') {
            content = M.zip(
              bodies.map((b, i) => ({
                name: `${i + 1}-${M.safeName(b.name)}.stl`,
                data: M.stl([b])
              }))
            );
            filename = name + '-parts.zip';
            mime = 'application/zip';
          } else throw Error('Unknown export format.');
        }
        const file = M.prepareDownload(filename, content, mime);
        file.permission = M.downloadPermission();
        if (this.state.exportFile) URL.revokeObjectURL(this.state.exportFile.url);
        this.setState({ exportFile: file, exportError: '' });
        const requested = M.beginDownload(file);
        this.notice(
          this.t(
            requested
              ? '파일을 생성하고 다운로드를 요청했습니다. 시작되지 않으면 아래 파일 저장 링크를 누르세요.'
              : '파일은 생성됐지만 미리보기의 다운로드 권한이 차단되어 있습니다. HTML을 일반 브라우저 탭에서 열어 저장하세요.',
            requested
              ? 'File generated; download requested. Use the file link below if it did not start.'
              : 'File generated, but this preview blocks downloads. Open the HTML in a regular browser tab to save.'
          )
        );
      } catch (e) {
        this.setState({ exportError: e.message || String(e) });
        this.notice(this.t('내보내기 실패: ', 'Export failed: ') + (e.message || String(e)));
      } finally {
        this.exporting = false;
      }
    };
  };
})(window.MP);
