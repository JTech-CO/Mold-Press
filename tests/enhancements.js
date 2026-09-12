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
    const tool=M.makeTool(b), machine=M.machine(tool), pressed=M.toolRecords(b,{press:true,gap:0,datum:machine.datum}).records;
    const plate=pressed.find(r=>r.id.endsWith('pin-plate')), plateBounds=M.bounds(M.world(plate));
    check(axis+' ejector plate clears platen and mold throughout stroke',plateBounds.min[2]>30 && plateBounds.max[2]+8<46);
    check(axis+' four guides and hollow bushes exist',tool.records.filter(r=>r.id.startsWith('guide-post')).length===4 && tool.records.filter(r=>r.id.startsWith('guide-bush')).length===4);
    check(axis+' cooling circuit has four couplers and hoses',tool.records.filter(r=>r.id.startsWith('cool-coupler')).length===4 && tool.records.filter(r=>r.id.startsWith('cool-hose')).length===4);
    const gate=pressed.find(r=>r.id.endsWith('-gate')), endpoint=machine.feedPath.at(-1), gb=M.bounds(M.world(gate));
    check(axis+' nozzle feed joins transformed gate',endpoint.every((x,i)=>x>=gb.min[i]-.01 && x<=gb.max[i]+.01));
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
  for (const [key,surface] of Object.entries(M.finishes)) {
    check('Finite material profile '+key,Array.from({length:20},(_,i)=>M.surfaceValue(i*.17,i*.23,i*.37,surface)).every(x=>Number.isFinite(x)&&Math.abs(x)<=1.01));
    check('Subpixel detail fades '+key,Math.abs(M.surfaceValue(1,2,3,surface,[0,0,1],3))<1e-6);
  }
  for (const [material,process] of [['ABS','injection'],['Aluminum 6061','compression'],['Zinc','casting']]) {
    const b=M.body('Process',M.box(20,16,12),{material,tool:{axis:'Y',position:0,pins:4}});
    const machine=M.machine(M.makeTool(b),M.processFor(material));
    const ids=machine.records.map(r=>r.id);
    check(material+' selects its process',machine.process===process && M.processProfile(material).stages.every(s=>s.length===5));
    check(material+' uses the correct feed equipment',process==='compression' ? ids.some(x=>x.startsWith('machine-feed-')) && !ids.some(x=>x==='machine-barrel') : ids.some(x=>x==='machine-barrel') && !ids.some(x=>x.startsWith('machine-feed-')));
    check(material+' correct reservoir or hopper',process==='casting' ? ids.includes('machine-melt-reservoir')&&!ids.includes('machine-hopper') : process==='injection' ? ids.includes('machine-hopper') : !ids.includes('machine-hopper'));
    check(material+' finite charge geometry',M.processCharge(machine,2).every(Number.isFinite));
  }
  for(const axis of [0,1,2])for(const q of [.25,.5,.75]) {
    const filled=M.unpack(M.formingGeometry(box.geo,axis,q));
    check('Progressive fill preserves volume '+axis+' '+q,Math.abs(M.volume(filled)-3840*q)<.01);
  }
  const app=MoldPress.app;
  for(const material of ['ABS','Aluminum 6061','Zinc']) {
    const project=M.newProject('new');
    const b=M.body('Cycle check',M.box(20,16,12),{material,tool:{axis:'Z',position:0,pins:4}});
    project.bodies=[b];
    await new Promise(resolve=>app.setState({p:project,page:'press',selected:[b.id],pressTargetId:b.id,speed:8,sectionEnabled:false},resolve));
    app.startPress(false);
    await new Promise(resolve=>setTimeout(resolve,40));
    const rig=app.pressRig;
    app.applyPressMotion(.42,true);
    check(material+' forming phase has valid bounds',rig.part && Array.from(M.unpack(rig.part.geo)).every(Number.isFinite));
    check(material+' clamp matches the process',material==='Aluminum 6061' ? rig.moving[0].pos[2]>rig.machine.moldTop+7 : Math.abs(rig.moving[0].pos[2]-rig.machine.moldTop-7)<1e-6);
    check(material+' feed follows its process',material==='Aluminum 6061' ? !rig.flow && rig.blank.scale[2]<1 : rig.flow.alpha>0);
    const limit=performance.now()+15000;
    while(app.state.running&&performance.now()<limit)await new Promise(resolve=>setTimeout(resolve,50));
    check(material+' completes exactly one production cycle',!app.state.running && app.state.p.tray.length===1 && app.state.p.tray[0].material===material);
  }
  return results;
}
