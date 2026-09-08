(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  M.AppActions.modeling = function (props) {
    this.addPrimitive = (type) => {
      if (type === 'text') {
        this.setState({ modal: 'text' });
        return;
      }
      const ps = {
          box: () => M.box(24, 24, 24),
          cylinder: () => M.cylinder(12, 25),
          sphere: () => M.sphere(14),
          cone: () => M.cylinder(14, 28, 32, 0),
          torus: () => M.torus(17, 5)
        },
        names = {
          box: ['박스', 'Box'],
          cylinder: ['원기둥', 'Cylinder'],
          sphere: ['구', 'Sphere'],
          cone: ['원뿔', 'Cone'],
          torus: ['토러스', 'Torus']
        };
      const mesh = ps[type](),
        bb = M.bounds(mesh),
        b = M.body(
          this.t(...names[type]),
          M.translate(mesh, [this.state.p.bodies.length ? 44 : 0, 0, -bb.min[2] + 2]),
          { primitive: type, material: this.state.p.material }
        );
      this.edit(this.t('기본체 추가', 'Add primitive'), (p) => p.bodies.push(b), {
        selected: [b.id],
        mode: 'translate',
        page: 'studio'
      });
      setTimeout(() => this.view.fit(this.state.p.bodies), 10);
    };
    this.duplicate = () => {
      const list = this.selectedBodies();
      if (!list.length) return;
      let ids = [];
      this.edit(
        this.t('복제', 'Duplicate'),
        (p) => {
          const dst = this.state.page === 'assembly' ? p.assembly : p.bodies;
          for (const b of list) {
            const q = JSON.parse(JSON.stringify(b));
            q.id = M.uid();
            q.name += ' · copy';
            q.pos[0] += 12;
            q.pos[1] += 12;
            q.tool = null;
            q.group = null;
            q.home = { pos: q.pos.slice(), rot: q.rot.slice(), scale: q.scale.slice() };
            dst.push(q);
            ids.push(q.id);
          }
        },
        { selected: ids }
      );
    };
    this.remove = (explicitIds) => {
      const s = this.state,
        ids = Array.isArray(explicitIds) ? explicitIds : s.selected;
      if (!ids.length || s.running || !['studio', 'tooling', 'assembly'].includes(s.page)) return;
      this.snapSource = null;
      this.dimensionSession = null;
      this.edit(
        this.t('선택 삭제', 'Delete selected'),
        (p) => {
          const key = s.page === 'assembly' ? 'assembly' : 'bodies';
          p[key] = p[key].filter((b) => !ids.includes(b.id));
        },
        {
          selected: s.selected.filter((id) => !ids.includes(id)),
          collisions: [],
          snapMode: null,
          dimEdit: null
        }
      );
    };
    this.mirror = () =>
      this.edit(this.t('X축 미러', 'Mirror X'), (p) => {
        for (const b of p.bodies.filter((b) => this.state.selected.includes(b.id))) {
          b.geo = M.pack(M.mirror(M.unpack(b.geo)));
          b.tool = null;
        }
      });
    this.group = () => {
      const list = this.selectedBodies();
      if (!list.length) return;
      const same = list[0].group && list.every((b) => b.group === list[0].group),
        id = same ? null : M.uid();
      this.edit(this.t(same ? '그룹 해제' : '그룹 묶기', same ? 'Ungroup' : 'Group'), (p) => {
        for (const b of p.bodies.filter((b) => this.state.selected.includes(b.id))) b.group = id;
      });
    };
    this.boolean = (op) => {
      const bs = this.selectedBodies();
      if (bs.length < 2) {
        this.notice(
          this.t(
            'Shift+클릭으로 바디 2개 이상을 선택하세요. 첫 선택에서 나머지를 뺍니다.',
            'Shift-click at least two bodies. Subtraction uses the first selected body as the base.'
          )
        );
        return;
      }
      this.task(this.t('메쉬 불리언 계산 중', 'Computing mesh boolean'), () => {
        const ordered = this.state.selected
          .map((id) => bs.find((b) => b.id === id))
          .filter(Boolean);
        let p = M.world(ordered[0]);
        for (const b of ordered.slice(1)) p = M.csg(p, M.world(b), op);
        if (p.length < 9 || M.volume(p) < 0.001)
          throw Error(
            this.t(
              '연산 결과가 비어 있습니다. 바디가 겹치는지 확인하세요.',
              'Empty result. Check that the bodies overlap.'
            )
          );
        const body = M.body(
          this.t({ union: '합친 바디', subtract: '빼기 결과', intersect: '교차 바디' }[op], op),
          p,
          { material: bs[0].material, primitive: 'boolean' }
        );
        this.edit(
          this.t('불리언 완료', 'Boolean complete'),
          (p) => {
            p.bodies = p.bodies.filter((b) => !this.state.selected.includes(b.id));
            p.bodies.push(body);
          },
          { selected: [body.id] }
        );
      });
    };
    this.fillet = (chamfer) => {
      const b = this.active();
      if (!b) return;
      this.task(this.t('근사 모서리 가공', 'Approximate edge treatment'), () => {
        let p = M.unpack(b.geo);
        if (b.primitive === 'box') {
          const bb = M.bounds(p);
          p = M.translate(M.roundBox(...bb.size, this.state.toolRadius, 5, chamfer), bb.center);
        } else p = M.smooth(p, chamfer ? 1 : 3, chamfer ? 0.32 : 0.16);
        this.edit(
          this.t(
            chamfer ? '챔퍼 근사' : '필렛 근사',
            chamfer ? 'Approximate chamfer' : 'Approximate fillet'
          ),
          (project) => {
            const q = project.bodies.find((x) => x.id === b.id);
            q.geo = M.pack(p);
            q.primitive = 'modified';
            q.tool = null;
          }
        );
        this.notice(
          this.t(
            '메쉬 근사 가공입니다. 일반 바디는 전체 형상이 일부 변할 수 있습니다.',
            'Mesh approximation. General bodies may change slightly in overall shape.'
          )
        );
      });
    };
    this.split = () => {
      const b = this.active();
      if (!b || this.state.busy || this.state.running) return;
      const { axis, position } = this.state.p.parting,
        wp = M.world(b),
        bounds = M.bounds(wp),
        k = 'XYZ'.indexOf(axis),
        tolerance = M.splitTolerance(wp);
      if (
        k < 0 ||
        position <= bounds.min[k] + tolerance * 2 ||
        position >= bounds.max[k] - tolerance * 2
      ) {
        this.notice(
          this.t(
            '파팅 평면이 기존 절단 경계 또는 바디 밖에 있습니다. 원본을 유지했습니다. Auto Parting을 다시 누르거나 평면을 내부로 이동하세요.',
            'The plane is on an existing cut boundary or outside the body. Source preserved. Use Auto Parting again or move the plane inside.'
          )
        );
        return;
      }
      this.task(this.t('바디를 조각으로 분할 중', 'Splitting the solid'), () => {
        const halves = M.splitMesh(M.world(b), axis, position);
        if (halves.some((p) => p.length < 9 || M.volume(p) < 0.01))
          throw Error(
            this.t('파팅 위치를 바디 내부로 이동하세요.', 'Move the parting plane inside the body.')
          );
        const pieces = halves.map((p, i) =>
          M.body(b.name + (i === 0 ? ' · A' : ' · B'), p, {
            material: b.material,
            primitive: 'split',
            cut: { axis, position, side: i },
            nominalWall: b.nominalWall
          })
        );
        this.edit(
          this.t('2조각 분할 완료', 'Split into two pieces'),
          (p) => {
            p.bodies = p.bodies.filter((x) => x.id !== b.id);
            p.bodies.push(...pieces);
          },
          { selected: [pieces[0].id], parting: false }
        );
        this.notice(
          this.t(
            '2개의 독립 조각이 생성되었습니다. Tooling에서 전체 금형을 생성하세요.',
            'Two independent pieces created. Generate all molds in Tooling.'
          )
        );
      });
    };
    this.text = (engrave) => {
      const b = this.active();
      if (engrave && !b) return;
      this.task(this.t('텍스트 메쉬 생성', 'Generating text mesh'), () => {
        let p = M.textMesh(this.state.text, this.state.textSize, this.state.textDepth);
        if (!p.length) throw Error(this.t('텍스트를 입력하세요.', 'Enter text.'));
        if (engrave) {
          const wp = M.world(b),
            bb = M.bounds(wp);
          p = M.translate(p, [
            bb.center[0],
            bb.center[1],
            bb.max[2] - this.state.textDepth / 2 + 0.03
          ]);
          const q = M.csg(wp, p, 'subtract');
          if (M.volume(wp) - M.volume(q) < 0.01)
            throw Error(
              this.t(
                '상단 면과 각인 텍스트가 닿지 않습니다. 솔리드 텍스트를 추가해 배치한 뒤 빼기를 사용하세요.',
                'Text does not touch the top face. Add solid text, position it, then subtract.'
              )
            );
          const updated = M.body(b.name, q, {
            id: b.id,
            material: b.material,
            primitive: 'engraved'
          });
          this.edit(
            this.t('텍스트 각인', 'Engrave text'),
            (p) => {
              p.bodies = p.bodies.map((x) => (x.id === b.id ? updated : x));
            },
            { modal: null }
          );
        } else {
          const body = M.body(this.state.text, M.translate(p, [0, 0, 15]), {
            primitive: 'text',
            material: this.state.p.material
          });
          this.edit(this.t('솔리드 텍스트 추가', 'Add solid text'), (p) => p.bodies.push(body), {
            selected: [body.id],
            modal: null,
            mode: 'translate'
          });
        }
      });
    };
  };
})(window.MP);
