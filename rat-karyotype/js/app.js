/* =========================================================================
   app.js — application shell: routing (with the Lab 7 → Lab 8 lock and the exam
   prerequisite), the two learning modes (Guided Revision / Practical Examination),
   home, intro screens, sidebar, progress tracker, step view, checkpoint, completion
   screens and the performance report.
   Routes:  #/home · #/lab7 · #/lab7/N · #/lab7/done · same for lab8 · #/exam/lab7 … (examination)
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, $, $$, esc, modal, confirmDialog, toast } = KL.UI, A = KL.Art, S = KL.Store, T = KL.Tasks, CFG = KL.CONFIG;
  const attempted = {};          // step attempted this session (unlocks Key Points)
  let tab = 'procedure';

  /* ------------------------------------------------------------ definitions */
  const CHECKPOINT = { n: 13, stage: 'lab7', checkpoint: true, title: 'Final Checkpoint', phase: 'Checkpoint', thumb: 'tube', objective: 'Show that you understand the whole of Lab 7 before moving on.' };
  const defs = { lab7: KL.LAB7.STEPS.concat([CHECKPOINT]), lab8: KL.LAB8.STEPS };
  const TITLES = {
    lab7: { t: 'Virtual Lab 7 – Rat Dissection for Bone Marrow Collection (for Karyotyping)', s: 'Learn and practise the steps required to collect bone marrow from the rat femur and tibia for chromosome analysis.' },
    lab8: { t: 'Virtual Lab 8 – Chromosome Preparation and Karyotyping', s: 'Continue from your bone marrow preparation and learn how to identify and arrange rat chromosomes into a karyogram.' },
    home: { t: 'Genetics Virtual Laboratory — Rat Bone Marrow Extraction and Karyotyping', s: 'Two connected practical labs · MSA University, Faculty of Biotechnology' }
  };
  const stageShort = { lab7: 'Lab 7', lab8: 'Lab 8' };
  const MODE_NAME = { guided: 'Guided Revision', exam: 'Practical Examination' };
  const maxStep = stage => defs[stage].length;
  const def = (stage, n) => defs[stage][n - 1];
  const lab8Done = () => S.guidedComplete('lab8');

  const THUMB = {
    arrest: () => A.arrest(), neck: () => A.rat({ highlight: 'neck' }), limb: () => A.limb({ mode: 'skin' }), muscle: () => A.limb({ mode: 'open' }), bone: () => A.limb({ mode: 'bone' }),
    femur: () => A.femur({}), syringe: () => A.syringe({ ml: 3 }), tube: () => A.tube({ level: .55, color: '#f3b9bd' }), rotor: () => A.rotor({ tubes: { 0: 'sample', 3: 'balance' } }),
    bottle: () => A.bottle({ l1: 'KCl', l2: '0.075 M' }), bath: () => A.waterbath({ on: true, temp: 37 }), fume: () => A.fume(), slide: () => A.slide({ wet: true }), dropper: () => A.dropper(),
    cells: () => A.cells({ swell: 1 }), jar: () => A.jar({}), paper: () => A.TOOL.paper(), microscope: () => A.microscope(), ruler: () => A.TOOL.ruler(), classify: () => A.TOOL.calc(),
    karyo: () => KL.Karyo.chromSVG(KL.KARYO.chroms[0], { sc: 5 }).html + KL.Karyo.chromSVG(KL.KARYO.chroms[6], { sc: 5 }).html + KL.Karyo.chromSVG(KL.KARYO.chroms[24], { sc: 5 }).html
  };
  const thumbHTML = k => { const f = THUMB[k] || THUMB.tube; return '<div class="thumb">' + f() + '</div>'; };
  /** An instructor photograph replaces the drawn illustration when one is listed in CONFIG.photos. */
  function art(key, fn) { const f = CFG.photos && CFG.photos[key]; return f ? '<img class="photo" src="' + esc(CFG.photoDir + f) + '" alt="' + esc(key) + '">' : fn(); }
  const isPhoto = key => !!(CFG.photos && CFG.photos[key]);

  /* ------------------------------------------------------------------ router */
  function parse() {
    const m = /^#\/(?:(exam)\/)?(home|lab7|lab8)(?:\/(\w+))?$/.exec(location.hash || '');
    if (!m || m[2] === 'home') return { stage: 'home', mode: 'guided' };
    const st = m[3] === undefined ? 'intro' : (m[3] === 'done' ? 'done' : (+m[3] || 1));
    return { stage: m[2], mode: m[1] ? 'exam' : 'guided', step: st };
  }
  const path = (stage, step, mode) => stage === 'home' ? '#/home' : '#/' + (mode === 'exam' ? 'exam/' : '') + stage + (step === 'intro' || step == null ? '' : '/' + step);
  function go(stage, step, mode) { const p = path(stage, step, mode || S.mode()); if (location.hash === p) route(); else location.hash = p; }

  /** Every navigation passes through here — the lock and the exam prerequisite are enforced in logic. */
  function guard(r) {
    if (r.stage === 'home') return r;
    const home = msg => ({ stage: 'home', mode: 'guided', blocked: msg });
    if (!S.canOpen(r.stage, r.mode)) return home(r.stage === 'lab8' && r.mode === 'guided' ? 'Lab 8 is locked. Complete Lab 7 first.' : 'The practical examination opens after you complete the guided revision of this lab.');
    S.setMode(r.mode);
    if (r.step === 'intro') return r;
    if (r.mode === 'exam' && !S.examSeed(r.stage)) return { stage: r.stage, mode: r.mode, step: 'intro', blocked: 'Start the examination first.' };
    if (r.step === 'done') {
      const ok = r.mode === 'exam' ? S.examFinished(r.stage) : (r.stage === 'lab7' ? S.lab7Complete() : lab8Done());
      return ok ? r : { stage: r.stage, mode: r.mode, step: S.maxOpen(r.stage), blocked: 'Finish this lab before opening its completion screen.' };
    }
    const max = S.maxOpen(r.stage);
    if (r.step < 1 || r.step > maxStep(r.stage)) return { stage: r.stage, mode: r.mode, step: Math.min(max, maxStep(r.stage)) };
    if (r.step > max) return { stage: r.stage, mode: r.mode, step: max, blocked: 'Complete the current step first.' };
    return r;
  }

  function route() {
    let r = parse(), g = guard(r);
    if (g.blocked) toast(g.blocked, 'warn');
    if (g.stage !== r.stage || g.step !== r.step || g.mode !== r.mode) { const p = path(g.stage, g.step, g.mode); if (location.hash !== p) history.replaceState(null, '', p); }
    r = g;
    S.setMode(r.mode === 'exam' ? 'exam' : 'guided');
    KL.UI.clearTimers();
    if (r.stage !== 'home' && typeof r.step === 'number') S.setPos(r.mode, r.stage, r.step);
    const main = $('#view'); main.innerHTML = '';
    const view = r.stage === 'home' ? 'home' : (r.step === 'done' ? 'done' : (r.step === 'intro' ? 'intro' : 'step'));
    document.body.dataset.view = view; document.body.dataset.stage = r.stage; document.body.dataset.mode = r.mode;
    setHeader(r.stage);
    if (r.stage === 'home') return renderHome(main);
    if (r.step === 'intro') return r.mode === 'exam' ? renderExamIntro(main, r.stage) : renderIntro(main, r.stage);
    if (r.step === 'done') return renderDone(main, r.stage, r.mode);
    tab = 'procedure';
    renderStep(main, r.stage, r.step, r.mode);
  }
  function setHeader(stage) { const t = TITLES[stage]; $('#hdr-title').textContent = t.t; $('#hdr-sub').textContent = t.s; document.title = t.t; }

  /* -------------------------------------------------------------------- home */
  function stageCard(stage) {
    const L7 = stage === 'lab7', unlocked = S.canOpen(stage, 'guided'), d = S.get().guided[stage];
    const sc = S.scores(stage, 'guided'), cp = L7 && d.checkpoint.passed, parts = sc.done, total = L7 ? 13 : 15;
    const done = L7 ? S.lab7Complete() : lab8Done();
    const state = !unlocked ? 'Locked' : (done ? 'Completed' : (parts ? 'In progress' : 'Not started'));
    const exOpen = S.canOpen(stage, 'exam'), last = S.lastExam(stage);
    return h('article.stage-card' + (done ? '.done' : '') + (unlocked ? '' : '.locked'), { 'data-stage': stage }, [
      h('div.sc-top', [h('span.sc-tag', stageShort[stage]), h('span.sc-state.' + state.replace(' ', '-').toLowerCase(), state)]),
      h('h2', L7 ? 'Rat Dissection and Bone Marrow Collection' : 'Chromosome Preparation and Karyotyping'),
      h('p', L7 ? 'Cervical dislocation to bone marrow suspension — 12 steps, femur and tibia collection, centrifugation and a final checkpoint.' : 'Hypotonic treatment, harvesting, fixation, slides, staining, virtual microscope, chromosome identification and an interactive karyogram — 15 steps.'),
      unlocked ? h('div', [h('div.sc-bar', h('i', { style: 'width:' + Math.round(100 * parts / total) + '%' })), h('p.tiny', parts + ' of ' + total + ' parts complete' + (parts ? ' · score ' + sc.pct + '%' : ''))]) : h('p.lock-msg', '🔒 Locked — complete Lab 7 to open Lab 8.'),
      h('div.sc-actions', [
        h('button.btn.primary', { id: 'btn-' + stage, 'aria-disabled': unlocked ? null : 'true', onclick: () => go(stage, 'intro', 'guided') }, unlocked ? (done ? 'Review ' + stageShort[stage] : (parts ? 'Continue ' + stageShort[stage] : 'Start ' + stageShort[stage])) + ' — Guided Revision' : 'Locked'),
        h('button.btn', { id: 'btn-exam-' + stage, 'aria-disabled': exOpen ? null : 'true', title: exOpen ? '' : 'Opens after the guided revision is complete', onclick: () => go(stage, 'intro', 'exam') }, exOpen ? 'Practical Examination' : '🔒 Practical Examination')]),
      last ? h('p.tiny', 'Last examination score: ' + last.total + '%') : null
    ]);
  }
  function renderHome(root) {
    const notice = S.takeNotice();
    root.appendChild(h('div.home', [
      notice ? h('div.notice', notice) : null,
      h('div.home-hero', [h('h1', 'Rat Bone Marrow Extraction and Karyotyping'), h('p', 'Two connected practical labs for the Faculty of Biotechnology. Learn each stage in Guided Revision, then test yourself in the Practical Examination. Complete Lab 7 to unlock Lab 8. Your progress is saved automatically in this browser.')]),
      h('div.stage-cards', [stageCard('lab7'), stageCard('lab8')]),
      h('div.home-foot', [h('button.btn', { id: 'btn-reset', onclick: resetProgress }, 'Reset progress…'), h('p.tiny', 'All images are illustrations or simulated teaching models, not photographs or real experimental results. Protocol values come from the supplied course protocol; information the material did not contain is listed in the Laboratory Guide for instructor input.')])
    ]));
  }
  function resetProgress() {
    confirmDialog('Reset all progress?', 'This permanently erases your saved Lab 7 and Lab 8 progress, scores and karyogram in this browser (both modes) and re-locks Lab 8. This cannot be undone.', () => { S.reset(); Object.keys(attempted).forEach(k => delete attempted[k]); toast('Progress reset.'); go('home'); }, 'Reset progress');
  }

  /* ------------------------------------------------------------ intro screens */
  function labGuide(stage) {
    const C = CFG;
    const prot = stage === 'lab7'
      ? ['Colchicine pretreatment (before sacrifice): ' + C.colchicine.dose + ', ' + C.colchicine.timing + ' — ' + C.colchicine.verified, 'Centrifugation: ' + C.spin.rpm + ' rpm for ' + C.spin.minutes + ' min', 'Saline / PBS supplied: ' + C.saline.volumeMl + ' mL']
      : ['KCl ' + C.kcl.molarity + ', ' + C.kcl.volumeMl + ' mL; incubate ' + C.incubation.tempC + ' °C for ' + C.incubation.minMin + '–' + C.incubation.maxMin + ' min', 'Centrifugation: ' + C.spin.rpm + ' rpm for ' + C.spin.minutes + ' min', 'Fixative: methanol : acetic acid ' + C.carnoy.methanolParts + ':' + C.carnoy.aceticParts + ', ' + C.carnoy.totalMl + ' mL, stand ' + C.carnoy.standMin + ' min', 'Slides: cold ' + C.lab8.slide.ethanolPct + '% ethanol at ' + C.lab8.slide.tempC + ' °C; ' + C.lab8.drops.min + '–' + C.lab8.drops.max + ' drops', 'Giemsa ' + C.lab8.giemsa.pct + '% for ' + C.lab8.giemsa.minutes + ' min; analysis objective ' + C.lab8.objective + '×'];
    modal({ title: 'Laboratory Guide — ' + stageShort[stage], cls: 'wide', body:
      '<h4>How the practical works</h4><ol class="guide"><li>Each step has <em>Procedure</em>, <em>Anatomy View</em> (click the labelled regions) and <em>Key Points</em> tabs. Key Points unlock after your first attempt.</li><li>Every step starts by <strong>selecting the tools</strong> it needs. The Tools Used panel appears only when your selection is right.</li><li>Nothing is done for you: you perform each action and the application checks it.</li><li>Guided Revision gives hints and unlimited retries. The Practical Examination gives none, limits attempts and randomises questions.</li></ol>' +
      '<h4>Protocol values used (from the supplied course protocol)</h4><ul>' + prot.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
      '<h4>Information marked for instructor input</h4><ul>' + KL.INSTRUCTOR_INPUT.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
      '<p class="tiny">All images are drawn illustrations or simulated teaching models. Course photographs can replace them (see the README).</p>', buttons: [{ label: 'Close', cls: 'primary' }] });
  }
  function renderIntro(root, stage) {
    const L7 = stage === 'lab7', t = TITLES[stage], first = S.firstIncomplete(stage), d = S.get().guided[stage];
    const started = Object.keys(d.steps).length > 0, done = L7 ? S.lab7Complete() : lab8Done();
    root.appendChild(h('div.intro', { 'data-intro': stage }, [
      h('span.mode-badge', MODE_NAME.guided),
      h('h1', t.t), h('p.lead', t.s),
      L7 ? h('p', 'You will identify the hindlimb, expose and clean the femur and tibia, collect bone marrow from both bones at two workstations, centrifuge the samples and prepare the bone marrow suspension. Everything is done by you — nothing is performed automatically.')
        : h('div.recap', [h('h3', 'Recap of Lab 7'), h('p', 'In Lab 7 you collected bone marrow from the femur and the tibia, centrifuged it at ' + CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min and prepared a bone marrow suspension. That suspension is the starting material of this lab.')]),
      h('div.intro-actions', [
        h('button.btn.primary', { id: 'btn-start', onclick: () => go(stage, done ? 1 : (first || 1), 'guided') }, done ? 'Review Practical' : (started ? 'Continue Practical' : 'Start Practical')),
        h('button.btn', { id: 'btn-labguide', onclick: () => labGuide(stage) }, 'Laboratory Guide'),
        h('button.btn', { id: 'btn-labhelp', onclick: help }, 'Help')]),
      h('p.tiny', [S.canOpen(stage, 'exam') ? h('a', { href: path(stage, 'intro', 'exam'), id: 'lnk-exam' }, 'Take the Practical Examination for this lab →') : 'The Practical Examination opens after you finish the guided revision of this lab.'])
    ]));
  }
  function renderExamIntro(root, stage) {
    const inprog = S.hasExamInProgress(stage), fin = S.examFinished(stage) && !inprog, last = S.lastExam(stage);
    root.appendChild(h('div.intro.exam', { 'data-intro': 'exam-' + stage }, [
      h('span.mode-badge.exam', MODE_NAME.exam), h('h1', 'Practical Examination — ' + stageShort[stage]), h('p.lead', TITLES[stage].t),
      h('ul.rules', [h('li', 'No hints, explanations or key points are shown.'), h('li', 'Feedback only records your answer — it does not say whether it was right.'), h('li', 'Each stage allows ' + CFG.exam.maxErrors + ' incorrect actions; after that it is marked incomplete and you move on.'), h('li', 'Questions and scenarios are randomised every attempt.'), h('li', 'You are scored by category: no full marks for just reaching the end.')]),
      h('div.intro-actions', [
        h('button.btn.primary', { id: 'btn-start-exam', onclick: () => { if (!inprog) S.beginExam(stage); go(stage, inprog ? (S.firstIncomplete(stage) || 1) : 1, 'exam'); } }, inprog ? 'Resume examination' : (fin ? 'Retake examination' : 'Start examination')),
        fin ? h('button.btn', { onclick: () => go(stage, 'done', 'exam') }, 'View last report') : null,
        h('button.btn', { onclick: () => go(stage, 'intro', 'guided') }, 'Back to Guided Revision')]),
      last ? h('p.tiny', 'Last score: ' + last.total + '%') : null
    ]));
  }

  /* -------------------------------------------------------------- step view */
  function renderStep(root, stage, n, mode) {
    const exam = mode === 'exam', d = def(stage, n), max = S.maxOpen(stage), total = maxStep(stage), data = S.d(stage, mode);
    const stepDone = x => x.checkpoint ? data.checkpoint.passed : S.stepDone(stage, x.n);

    const side = h('aside.sidebar', [
      h('div.stage-switch', ['lab7', 'lab8'].map(st => { const locked = !S.canOpen(st, mode); return h('button.sw' + (st === stage ? '.on' : '') + (locked ? '.locked' : ''), { 'data-stage': st, title: locked ? 'Locked' : TITLES[st].t, onclick: () => go(st, st === stage ? n : (S.firstIncomplete(st) || 1), mode) }, [locked ? '🔒 ' : '', stageShort[st]]); })),
      h('span.mode-badge' + (exam ? '.exam' : ''), MODE_NAME[mode]),
      h('div.side-title', 'Steps'),
      h('ol.steplist', defs[stage].map(x => {
        const sd = stepDone(x), locked = x.n > max;
        return h('li', h('button.stepbtn' + (x.n === n ? '.cur' : '') + (sd ? '.done' : '') + (locked ? '.locked' : ''), { 'data-step': x.n, disabled: locked, 'aria-current': x.n === n ? 'step' : null, onclick: () => go(stage, x.n) },
          [h('span.thumb-wrap', { html: thumbHTML(x.thumb) }), h('span.sn', x.checkpoint ? '★' : x.n), h('span.st', x.title), sd ? h('span.tick', '✓') : (locked ? h('span.lockic', '🔒') : null)]));
      }))
    ]);
    const tracker = h('div.tracker', { role: 'list' }, defs[stage].map(x => {
      const sd = stepDone(x), locked = x.n > max;
      return h('button.tnode' + (x.n === n ? '.cur' : '') + (sd ? '.done' : '') + (locked ? '.locked' : ''), { role: 'listitem', disabled: locked, 'data-tn': x.n, title: x.title, onclick: () => go(stage, x.n) }, [h('span.dot', sd ? '✓' : x.checkpoint ? '★' : x.n), h('span.tl', x.title)]);
    }));
    const card = h('section.step-card' + (exam ? '.exam' : ''));
    root.appendChild(h('div.layout', [side, h('div.mainc', [tracker, card])]));
    const cur = tracker.querySelector('.cur'); if (cur && cur.scrollIntoView) setTimeout(() => cur.scrollIntoView({ block: 'nearest', inline: 'center' }), 0);

    if (d.checkpoint) return renderCheckpoint(card, d, stage, mode);

    const viewTab = d.viewTab || 'Anatomy View';
    const tabList = exam ? [['procedure', 'Procedure']] : [['procedure', 'Procedure'], ['anatomy', viewTab], ['key', 'Key Points']];
    const tabs = h('div.tabs', { role: 'tablist' }, tabList.map(([id, label]) => h('button.tab' + (id === tab ? '.on' : ''), { role: 'tab', 'data-tab': id, 'aria-selected': id === tab ? 'true' : 'false', onclick: () => { tab = id; paintTab(); tabs.querySelectorAll('.tab').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'); }); } }, label)));
    const sub = h('div.pane'), taskBox = h('div.task-area'), fbBox = h('div.fb', { 'aria-live': 'polite' }), banner = h('div.done-banner');
    let taskMounted = false;
    const k = stage + '-' + n;

    card.appendChild(h('header.step-head', [h('div.step-num', n), h('div.step-title', [h('h2', d.title), exam ? null : h('p', d.objective), h('span.phase', d.phase)]), tabs]));
    const right = exam ? null : h('aside.side-col', [
      h('section.panel', [h('h3', 'Close-up View'), h('div.panel-art', { html: art(k + '-close', d.close) }), h('p.cap', isPhoto(k + '-close') ? 'Course photograph' : 'Illustration / simulated teaching model')]),
      h('section.panel', [h('h3', d.refTitle || 'Reference'), h('div.panel-art', { html: art(k + '-ref', d.ref) }), h('p.cap', isPhoto(k + '-ref') ? 'Course photograph' : 'Illustration — schematic')])]);
    card.appendChild(h('div.step-body' + (exam ? '.single' : ''), [h('div.work-col', [sub]), right]));
    const nextBtn = h('button.btn.primary.next', { id: 'btn-next', onclick: () => nextStep() }, 'Next Step ›');
    const prevBtn = h('button.btn.prev', { id: 'btn-prev', disabled: n === 1, onclick: () => go(stage, n - 1) }, '‹ Previous Step');
    const toolRow = h('div.tool-row');
    const toolsBox = h('div.tools', [h('h3', 'Tools Used'), toolRow]);
    function showTools() {
      toolRow.innerHTML = '';
      (d.tools || []).forEach(t => toolRow.appendChild(h('div.tool', [h('div.tool-ic', { html: t[0]() }), h('span', t[1])])));
      toolsBox.classList.add('shown');
    }
    function hideTools() { toolRow.innerHTML = ''; toolRow.appendChild(h('p.tiny.tools-hint', 'Select the right tools in the first stage to see them here.')); toolsBox.classList.remove('shown'); }
    if (S.stepDone(stage, n)) showTools(); else hideTools();
    card.appendChild(h('footer.step-foot', [exam ? h('div') : toolsBox, h('div.nav', [prevBtn, nextBtn])]));

    function refreshNext() {
      const ok = S.stepDone(stage, n);
      nextBtn.disabled = !ok;
      nextBtn.textContent = n === total ? 'Finish' : (stage === 'lab7' && n === 12 ? 'Go to Checkpoint ›' : 'Next Step ›');
      nextBtn.title = ok ? '' : 'Complete this step to continue';
    }
    function nextStep() {
      if (!S.stepDone(stage, n)) return toast('Complete this step\'s task to continue.', 'warn');
      if (n === total) return go(stage, 'done');
      go(stage, n + 1);
    }

    function paintTab() {
      sub.innerHTML = '';
      if (tab === 'procedure') {
        sub.appendChild(banner); sub.appendChild(taskBox); sub.appendChild(fbBox);
        if (!taskMounted) mountTask();
        if (!exam) sub.appendChild(detailsHTML(d));
      } else if (tab === 'anatomy') {
        const info = h('div.region-info', { 'aria-live': 'polite' }, h('p.tiny', 'Click a labelled region to learn what it is.'));
        const host = h('div.anat-art', { html: art(k + '-anat', d.anat || d.ref) });
        host.querySelectorAll('[data-region]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); const ri = (KL.REGION_INFO || {})[el.dataset.region]; if (ri) { info.innerHTML = '<strong>' + esc(ri[0]) + '</strong> — ' + esc(ri[1]); host.querySelectorAll('.hot.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); } }));
        sub.appendChild(h('div.anat', [host, info, h('h3', d.viewTab ? 'What you are looking at' : 'Structures and regions'), h('dl.structs', (d.structures || []).map(s => [h('dt', s[0]), h('dd', s[1])]).reduce((a, b) => a.concat(b), [])), h('p.cap', isPhoto(k + '-anat') ? 'Course photograph' : 'Illustration / simulated model — schematic anatomy, not a photograph.')]));
      } else {
        const open = S.stepDone(stage, n) || attempted[mode + stage + n];
        sub.appendChild(open ? h('div.keys', [h('h3', 'Key points'), h('ul', (d.key || []).map(x => h('li', { html: x }))), h('div.sim-note', { html: '<strong>Why it matters:</strong> ' + d.purpose })])
          : h('div.locked-tab', [h('div.big', '🔒'), h('p', 'Key Points unlock after your first attempt at this step\'s task, so the answers are not given away in advance.')]));
      }
    }

    function stepScore(errors, safety, toolErrors) {
      const pen = exam ? { err: CFG.exam.errPenalty, safety: CFG.exam.safetyPenalty } : CFG.guidedPenalty;
      const task = Math.max(exam ? 0 : 0.3, 1 - pen.err * errors - pen.safety * safety), tool = Math.max(0, 1 - 0.34 * toolErrors);
      return { score: 0.85 * task + 0.15 * tool, toolScore: tool };
    }
    function afterRecord() {
      if (stage === 'lab8' && n === total) {
        if (exam) S.finishExam('lab8', { total: KL.Report.build('lab8', 'exam', defs).total });
        else { S.d('lab8', 'guided').finished = true; S.save(); }
      }
      refreshNext(); refreshSidebar();
    }

    function mountTask(practice) {
      taskMounted = true; taskBox.innerHTML = ''; fbBox.className = 'fb'; fbBox.innerHTML = '';
      let errors = 0, safety = 0, toolErrors = 0, over = false;
      const rec = S.stepRecord(stage, n);
      if (rec && rec.done && !practice) {
        banner.innerHTML = '';
        banner.appendChild(h('div.banner' + (rec.failed ? '.fail' : ''), [h('strong', rec.failed ? 'Stage ended' : '✓ Step complete'), ' — ' + (rec.summary || '') + (exam ? '' : ' · score ' + Math.round((rec.score || 0) * 100) + '%'),
          exam ? null : h('button.btn.sm', { onclick: () => { banner.innerHTML = ''; mountTask(true); } }, 'Practice again (score unchanged)')]));
        return;
      }
      const failStep = () => {
        if (over) return; over = true;
        S.markStep(stage, n, 0, 'Not passed — maximum incorrect actions reached', { failed: true, errors, safety, toolErrors, toolScore: 0 });
        taskBox.querySelectorAll('input,button,[data-region],.hot').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; });
        banner.innerHTML = ''; banner.appendChild(h('div.banner.fail', [h('strong', 'Stage ended'), ' — maximum incorrect actions reached; this stage is marked incomplete.', h('button.btn.primary.sm', { id: 'btn-after-fail', onclick: nextStep }, n === total ? 'Finish ›' : (stage === 'lab7' && n === 12 ? 'Go to Checkpoint ›' : 'Next Step ›'))]));
        afterRecord();
      };
      const bump = () => { errors++; if (exam && errors + safety >= CFG.exam.maxErrors) setTimeout(failStep, 0); };
      const seed = (S.examSeed(stage) || 1) + n * 977;
      const ctx = {
        practice: !!practice, exam,
        rnd: exam ? KL.UI.rng(seed) : Math.random,
        attempt() { attempted[mode + stage + n] = true; },
        safety() { safety++; if (exam && errors + safety >= CFG.exam.maxErrors) setTimeout(failStep, 0); },
        errored() { bump(); },
        revealTools() { if (!exam) showTools(); },
        toolOk() { },
        toolError() { toolErrors++; },
        fb(kind, html) {
          if (kind === 'clear') { fbBox.className = 'fb'; fbBox.innerHTML = ''; return; }
          if (kind === 'sci') bump();
          if (exam && kind !== 'hint') { fbBox.className = 'fb neutral'; fbBox.innerHTML = 'Response recorded.'; return; }
          const label = { ok: 'Correct', sci: 'Not quite — scientific reasoning', safety: 'Safety / ethics issue', hint: 'Hint' }[kind];
          fbBox.className = 'fb ' + kind; fbBox.innerHTML = '<strong>' + label + '.</strong> ' + html;
          if (fbBox.scrollIntoView) fbBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        },
        complete(summary) {
          if (over) return;
          attempted[mode + stage + n] = true;
          if (practice) { toast('Practice finished — your saved score is unchanged.'); return; }
          const sc = stepScore(errors, safety, toolErrors);
          S.markStep(stage, n, sc.score, summary, { toolScore: sc.toolScore, errors, safety, toolErrors });
          afterRecord(); showDone(summary, sc.score);
        }
      };
      taskBox.appendChild(d.task(ctx));
    }
    function showDone(summary, score) {
      banner.innerHTML = '';
      banner.appendChild(h('div.banner', [h('strong', '✓ Step complete'), ' — ' + summary + (exam ? '' : ' · score ' + Math.round(score * 100) + '%'), h('button.btn.primary.sm', { id: 'btn-banner-next', onclick: nextStep }, n === total ? 'Finish ›' : (stage === 'lab7' && n === 12 ? 'Go to Checkpoint ›' : 'Next Step ›'))]));
      if (banner.scrollIntoView) banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function refreshSidebar() {
      const m2 = S.maxOpen(stage), sdn = x => x === 13 && stage === 'lab7' ? data.checkpoint.passed : S.stepDone(stage, x);
      $$('.stepbtn', side).forEach(b => { const x = +b.dataset.step, sd = sdn(x); b.classList.toggle('done', sd); b.classList.toggle('locked', x > m2); b.disabled = x > m2; });
      $$('.tnode', tracker).forEach(b => { const x = +b.dataset.tn, sd = sdn(x); b.classList.toggle('done', sd); b.classList.toggle('locked', x > m2); b.disabled = x > m2; b.querySelector('.dot').textContent = sd ? '✓' : (stage === 'lab7' && x === 13 ? '★' : x); });
    }
    refreshNext(); paintTab();
  }

  function detailsHTML(d) {
    return h('div.details', [
      h('section', [h('h3', 'Purpose'), h('p', { html: d.purpose })]),
      h('section.cols', [h('div', [h('h3', 'Materials'), h('ul', (d.materials || []).map(m => h('li', { html: m })))]), h('div', [h('h3', 'Procedure'), h('ol', (d.procedure || []).map(p => h('li', { html: p })))])]),
      h('section', [h('h3', 'Expected observation'), h('p', { html: d.observe })]),
      h('section.safety', [h('h3', '⚠ Safety'), h('p', { html: d.safety })])
    ]);
  }

  /* -------------------------------------------------------------- checkpoint */
  function renderCheckpoint(card, d, stage, mode) {
    const exam = mode === 'exam', CP = S.d('lab7', mode).checkpoint;
    card.appendChild(h('header.step-head', [h('div.step-num', '★'), h('div.step-title', [h('h2', d.title), exam ? null : h('p', d.objective), h('span.phase', 'Checkpoint')])]));
    const body = h('div.step-body.single'), work = h('div.work-col'); body.appendChild(work); card.appendChild(body);
    const fbBox = h('div.fb', { 'aria-live': 'polite' });
    const finishNow = () => { if (exam) S.finishExam('lab7', { total: KL.Report.build('lab7', 'exam', defs).total }); };
    if (CP.passed) {
      work.appendChild(h('div.banner', [h('strong', '✓ Checkpoint complete'), ' — score ' + Math.round(100 * (CP.score || 0)) + '%']));
      work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-finish7', onclick: () => go('lab7', 'done') }, 'Complete Lab 7 ›')));
      return;
    }
    const rnd = exam ? KL.UI.rng((S.examSeed('lab7') || 1) + 13 * 977) : Math.random;
    if (!CP.picked) { CP.picked = KL.LAB7.checkQuestions({ rnd }).map(q => q.k); S.save(); }
    const Q = CP.picked.map(k => KL.LAB7.CHECK_POOL.filter(q => q.k === k)[0]).filter(Boolean);
    let qi = Object.keys(CP.answers || {}).length, firstTry = Object.assign({}, CP.firstTry);
    function show() {
      work.innerHTML = '';
      if (qi >= Q.length) return finish();
      const q = Q[qi]; let wrong = 0, chosen = null;
      work.appendChild(h('div.cp-progress', 'Question ' + (qi + 1) + ' of ' + Q.length + (exam ? '' : ' — ' + q.k)));
      const name = 'cq' + qi, opts = KL.UI.shuffle(q.o, rnd);
      work.appendChild(h('p.task-prompt', { html: '<strong>' + esc(q.q) + '</strong>' }));
      work.appendChild(h('div.opts', { role: 'radiogroup' }, opts.map(o => h('label.opt', [h('input', { type: 'radio', name, onchange: () => { chosen = o; } }), h('span', o[0])]))));
      work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-cp-check', onclick: () => {
        if (!chosen) { fbBox.className = 'fb hint'; fbBox.innerHTML = '<strong>Hint.</strong> Select an option first.'; return; }
        const ok = !!chosen[1];
        if (exam) { firstTry[q.k] = ok; CP.answers[q.k] = true; CP.firstTry = firstTry; S.save(); qi++; fbBox.className = 'fb neutral'; fbBox.textContent = 'Response recorded.'; show(); work.appendChild(fbBox); return; }
        if (ok) { fbBox.className = 'fb ok'; fbBox.innerHTML = '<strong>Correct.</strong> ' + esc(chosen[2]); firstTry[q.k] = wrong === 0; CP.answers[q.k] = true; CP.firstTry = firstTry; S.save(); qi++; work.querySelectorAll('input,button').forEach(b => { b.disabled = true; });
          work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-nextq', onclick: () => { fbBox.className = 'fb'; fbBox.innerHTML = ''; show(); work.appendChild(fbBox); } }, qi < Q.length ? 'Next question ›' : 'Finish checkpoint ›'))); }
        else { wrong++; fbBox.className = 'fb sci'; fbBox.innerHTML = '<strong>Not quite.</strong> ' + esc(chosen[2]); }
      } }, 'Check answer')));
      work.appendChild(fbBox);
    }
    function finish() {
      CP.passed = true; CP.score = Object.values(firstTry).filter(Boolean).length / Q.length; S.save(); finishNow();
      work.innerHTML = '';
      work.appendChild(h('div.banner', [h('strong', '✓ Checkpoint complete'), ' — ' + Object.values(firstTry).filter(Boolean).length + ' of ' + Q.length + ' correct on the first attempt.']));
      work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-finish7', onclick: () => go('lab7', 'done') }, 'Complete Lab 7 ›')));
    }
    show();
  }

  /* -------------------------------------------------------- completion screens */
  function renderDone(root, stage, mode) {
    const exam = mode === 'exam', r = KL.Report.build(stage, mode, defs);
    if (stage === 'lab7') {
      const unlocked = S.canOpen('lab8', 'guided');
      root.appendChild(h('div.done-screen', { 'data-done': 'lab7-' + mode }, [
        h('div.badge-done', '✓'), h('h1', exam ? 'Lab 7 Examination — Report' : 'Lab 7 Completed – Bone Marrow Collection'),
        exam ? h('p.lead', 'Practical Examination · Rat Dissection and Bone Marrow Collection') : h('p.lead', 'You have completed Lab 7. Your bone marrow preparation is ready for the next stage.'),
        h('div', { html: KL.Report.html(r) }),
        h('div.done-actions', exam ? [h('button.btn', { id: 'btn-retake', onclick: () => go('lab7', 'intro', 'exam') }, 'Retake examination'), h('button.btn.primary', { id: 'btn-home', onclick: () => go('home') }, 'Return to Home')]
          : [h('button.btn', { id: 'btn-return-home', onclick: () => { S.save(); go('home'); } }, 'Return to Home'), h('button.btn.primary', { id: 'btn-continue8', disabled: !unlocked, onclick: () => { if (!S.canOpen('lab8', 'guided')) return toast('Lab 8 is still locked.', 'warn'); go('lab8', 'intro', 'guided'); } }, 'Continue to Lab 8 ›')]),
        h('p.tiny', 'Your progress is saved in this browser. You can leave now and return later: Lab 8 will be unlocked and you will not need to repeat Lab 7.')]));
    } else {
      root.appendChild(h('div.done-screen', { 'data-done': 'lab8-' + mode }, [
        h('div.badge-done', '✓'), h('h1', exam ? 'Lab 8 Examination — Report' : 'Lab 8 Completed – Chromosome Preparation and Karyotyping'), h('p.lead', TITLES.lab8.t),
        h('div', { html: KL.Report.html(r) }),
        h('div.done-actions', [exam ? h('button.btn', { onclick: () => go('lab8', 'intro', 'exam') }, 'Retake examination') : h('button.btn', { onclick: () => go('lab8', 15) }, 'Review final analysis'), h('button.btn.primary', { id: 'btn-home', onclick: () => go('home') }, 'Return to Home')])]));
    }
  }

  /* -------------------------------------------------------------- header modals */
  function guide() {
    modal({ title: 'Guide — how this virtual lab works', cls: 'wide', body:
      '<ol class="guide"><li><strong>Two labs.</strong> Lab 7 (dissection to bone marrow suspension, 12 steps and a checkpoint) must be completed before Lab 8 (chromosome preparation and karyotyping, 15 steps) unlocks.</li>' +
      '<li><strong>Two modes.</strong> Guided Revision gives hints and unlimited retries. The Practical Examination (after a lab\'s guided version is complete) has no hints, limited attempts and randomised questions, and is scored by category.</li>' +
      '<li><strong>Each step</strong> starts with tool selection, then your tasks. Tabs: <em>Procedure</em>, <em>Anatomy / Microscopy View</em> and <em>Key Points</em> (unlocked after your first attempt).</li>' +
      '<li><strong>Progress</strong> is saved automatically in this browser.</li>' +
      '<li><strong>Karyogram:</strong> drag chromosomes to slots (or tap, then tap a slot); <kbd>R</kbd> rotates; <kbd>↑</kbd>/<kbd>↓</kbd> nudge a chromosome onto the centromere line.</li>' +
      '<li><strong>All images</strong> are illustrations or simulated teaching models unless a course photograph is shown.</li></ol>', buttons: [{ label: 'Close', cls: 'primary' }] });
  }
  function help() {
    modal({ title: 'Help', cls: 'wide', body:
      '<h4>Cannot continue to the next step?</h4><p>The Next button is enabled when the current step is complete. Read the feedback under the task for what is still missing.</p>' +
      '<h4>Lab 8 is locked</h4><p>Lab 8 opens only after Lab 7 is fully complete. This is enforced by the application — it cannot be opened from the URL or by editing saved data.</p>' +
      '<h4>My progress disappeared</h4><p>Progress lives in this browser\'s local storage. It is lost if you clear site data, use a private window, or switch browser/device.</p>' +
      '<h4>Use on tablets and phones</h4><p>Tap a chromosome, then tap its destination slot. Use the ⟳ and arrow buttons to rotate and align.</p>' +
      '<h4>Reset</h4><p>Use <em>Reset progress…</em> on the home screen (a confirmation is required).</p>', buttons: [{ label: 'Close', cls: 'primary' }] });
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    S.load();
    $('#nav-guide').addEventListener('click', guide);
    $('#nav-help').addEventListener('click', help);
    $('#nav-home').addEventListener('click', () => go('home'));
    window.addEventListener('hashchange', route);
    if (!location.hash) history.replaceState(null, '', '#/home');
    route();
  }
  KL.App = { go, route, guard, parse, defs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
