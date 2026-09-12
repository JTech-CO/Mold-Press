async () => {
  const M = MP, results = [];
  const check = (name, value) => {
    if (!value) throw Error(name);
    results.push({name, status: 'PASS'});
  };
  for (const axis of ['X','Y','Z']) {
    const b = M.body('Axis', M.box(24,20,16), {tool: {axis, position:0, pins:4, sideCore:true}});
    const before = JSON.stringify(b);
    for (const press of [false, true]) {
      const closed = M.toolRecords(b, {gap:0,press}).records;
      const opened = M.toolRecords(b, {gap:20,press}).records;
      for (const r of closed.filter(x => x.role==='slide')) {
        const q = opened.find(x => x.id===r.id);
        const bb = M.bounds(M.unpack(r.geo));
        const offset = q.pos.map((v,i)=>v-r.pos[i]);
        check(axis+' slide opens outward '+press+' '+r.id, M.V.dot(offset, bb.center)>0 && offset.every((v,i)=>Math.abs(v-r.slideDirection[i]*10)<1e-6));
      }
    }
    check(axis+' source preserved by inspection',JSON.stringify(b)===before);
  }
  const box = M.record('section-box', M.box(20,16,12));
  for (const axis of ['X','Y','Z']) for (const reverse of [false,true]) {
    const source = JSON.stringify(box), cut = M.sectionRecords([box],axis,50,reverse);
    const mesh = cut.records.flatMap(r=>Array.from(M.world(r)));
    check('Capped section volume '+axis+' '+reverse, !cut.errors.length && Math.abs(M.volume(mesh)-1920)<1e-3);
    check('Cut faces visible '+axis+' '+reverse,cut.records.some(r=>r.id.endsWith('section-cap')));
    check('Section never changes original '+axis+' '+reverse,JSON.stringify(box)===source);
  }
  const shell=M.csg(M.box(24,24,24),M.box(12,12,30),'subtract');
  const cut=M.sectionRecords([M.record('hollow',shell)],'Z',50);
  check('Section retains holes in a hollow solid', !cut.errors.length && Math.abs(M.volume(cut.records.flatMap(r=>Array.from(M.world(r))))-M.volume(shell)/2)<0.01);
  const round=M.cylinder(8,20,24), saved=Array.from(round), ns=M.shadingNormals(round), flat=M.normals(round);
  check('Curved normals are smooth without changing geometry',ns.some((x,i)=>Math.abs(x-flat[i])>0.01) && JSON.stringify(Array.from(round))===JSON.stringify(saved));
  check('Smoothed normals remain unit length',Array.from({length:ns.length/3},(_,i)=>Math.hypot(...ns.slice(i*3,i*3+3))).every(x=>Math.abs(x-1)<1e-5));
  check('Cylinder caps retain sharp boundaries',Array.from({length:ns.length/3},(_,i)=>i*3).filter(i=>Math.abs(flat[i+2])>0.99).every(i=>Math.abs(ns[i+2])>0.99));
  check('Fast quality disables contact shading',M.contactShadows([box],'low').length===0);
  check('Standard quality supplies contact shading',M.contactShadows([box],'standard').length===4);
  return results;
}
