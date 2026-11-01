/* =========================================================================
   app.js — application shell: routing (with the Lab 8 guard), home screen,
   sidebar, progress tracker, step view, checkpoint and completion screens.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, $, $$, esc, modal, confirmDialog, toast } = KL.UI, A = KL.Art, S = KL.Store, T = KL.Tasks;
  const attempted = {};          // step attempted this session (unlocks Key Points)
  let tab = 'procedure';

  /* ------------------------------------------------------------ definitions */
  const CHECKPOINT = { n: 18, stage: 'lab7', checkpoint: true, title: 'Lab 7 Checkpoint', phase: 'Checkpoint', thumb: 'tube', objective: 'Identify the purpose of each major phase of Lab 7.' };
  const defs = {
    lab7: KL.LAB7.STEPS.concat([CHECKPOINT]),
    lab8: KL.LAB8.STEPS
  };
  const stageTitle = { lab7: 'Lab 7 — Extraction of Metaphase Chromosomes from Rat Bone Marrow', lab8: 'Lab 8 — Chromosome Spreading, Staining and Karyotype Analysis' };
  const stageShort = { lab7: 'Lab 7', lab8: 'Lab 8' };
  const maxStep = stage => defs[stage].length;
  const def = (stage, n) => defs[stage][n - 1];

  const THUMB = {
    arrest: () => A.arrest(), neck: () => A.rat({ highlight: 'neck' }), limb: () => A.limb({ mode: 'skin' }), muscle: () => A.limb({ mode: 'open' }), bone: () => A.limb({ mode: 'bone' }),
    femur: () => A.femur({}), syringe: () => A.syringe({ ml: 3 }), tube: () => A.tube({ level: .55, color: '#f3b9bd' }), rotor: () => A.rotor({ tubes: { 0: 'sample', 3: 'balance' } }),
    bottle: () => A.bottle({ l1: 'KCl', l2: '0.075 M' }), bath: () => A.waterbath({ on: true, temp: 37 }), fume: () => A.fume(), slide: () => A.slide({ wet: true }), dropper: () => A.dropper(),
    cells: () => A.cells({ swell: 1 }), jar: () => A.jar({}), paper: () => A.TOOL.paper(), microscope: () => A.microscope(), ruler: () => A.TOOL.ruler(), classify: () => A.TOOL.calc(),
    karyo: () => KL.Karyo.chromSVG(KL.KARYO.chroms[0], { sc: 5 }).html + KL.Karyo.chromSVG(KL.KARYO.chroms[6], { sc: 5 }).html + KL.Karyo.chromSVG(KL.KARYO.chroms[24], { sc: 5 }).html
  };
  const thumbHTML = k => { const f = THUMB[k] || THUMB.tube; return '<div class="thumb">' + f() + '</div>'; };

  /* ------------------------------------------------------------------ router */
  function parse() {
    const m = /^#\/(home|lab7|lab8)(?:\/(\w+))?$/.exec(location.hash || '');
    if (!m) return { stage: 'home' };
    if (m[1] === 'home') return { stage: 'home' };
    return { stage: m[1], step: m[2] === 'done' ? 'done' : (+m[2] || 1) };
  }
  const path = (stage, step) => stage === 'home' ? '#/home' : '#/' + stage + '/' + (step || 1);
  function go(stage, step) { const p = path(stage, step); if (location.hash === p) route(); else location.hash = p; }

  /** Every navigation passes through here — the Lab 8 prerequisite is enforced in logic. */
  function guard(r) {
    if (r.stage === 'lab8' && !S.canOpen('lab8')) {
      return { stage: 'home', blocked: 'Lab 8 is locked. Complete every step and the checkpoint of Lab 7 first.' };
    }
    if (r.stage === 'lab7' || r.stage === 'lab8') {
      if (r.step === 'done') {
        if (r.stage === 'lab7' && !S.lab7Complete()) return { stage: 'lab7', step: S.maxOpen('lab7'), blocked: 'Finish Lab 7 before opening its completion screen.' };
        if (r.stage === 'lab8' && !lab8Complete()) return { stage: 'lab8', step: S.maxOpen('lab8') };
        return r;
      }
      const max = S.maxOpen(r.stage);
      if (r.step < 1 || r.step > maxStep(r.stage)) return { stage: r.stage, step: Math.min(max, maxStep(r.stage)) };
      if (r.step > max) return { stage: r.stage, step: max, blocked: 'Complete the current step first.' };
    }
    return r;
  }
  const lab8Complete = () => S.lab7Complete() && S.get().lab8.finished === true;

  function route() {
    let r = parse(), g = guard(r);
    if (g.blocked) { toast(g.blocked, 'warn'); }
    if (g.stage !== r.stage || g.step !== r.step) { const p = path(g.stage, g.step); if (location.hash !== p) { history.replaceState(null, '', p); } r = g; } else r = g;
    KL.UI.clearTimers();
    if (r.stage !== 'home' && r.step !== 'done') S.setPos(r.stage, r.step);
    const main = $('#view'); main.innerHTML = '';
    document.body.dataset.view = r.stage === 'home' ? 'home' : (r.step === 'done' ? 'done' : 'step');
    document.body.dataset.stage = r.stage;
    if (r.stage === 'home') return renderHome(main);
    if (r.step === 'done') return r.stage === 'lab7' ? renderLab7Done(main) : renderLab8Done(main);
    tab = 'procedure';
    renderStep(main, r.stage, r.step);
  }

  /* -------------------------------------------------------------------- home */
  function renderHome(root) {
    const s7 = S.scores('lab7'), s8 = S.scores('lab8'), c7 = S.lab7Complete(), unlocked = S.canOpen('lab8');
    const p7 = S.get().lab7.checkpoint.passed ? s7.done + 1 : s7.done;   // steps + checkpoint
    const lab7State = c7 ? 'Completed' : (p7 ? 'In progress' : 'Not started');
    const lab8State = !unlocked ? 'Locked' : (lab8Complete() ? 'Completed' : (s8.done ? 'In progress' : 'Not started'));
    const notice = S.takeNotice();
    root.appendChild(h('div.home', [
      notice ? h('div.notice', notice) : null,
      h('div.home-hero', [h('h1', 'Rat Bone Marrow Chromosome Extraction and Karyotyping'), h('p', 'Two connected practical sessions for the Faculty of Biotechnology — genetics and cytogenetics. Complete Lab 7 to unlock Lab 8. Your progress is saved automatically in this browser.')]),
      h('div.stage-cards', [
        h('article.stage-card' + (c7 ? '.done' : ''), [h('div.sc-top', [h('span.sc-tag', 'Lab 7'), h('span.sc-state.' + lab7State.replace(' ', '-').toLowerCase(), lab7State)]), h('h2', 'Extraction of Metaphase Chromosomes from Rat Bone Marrow'),
          h('p', 'Colchicine pretreatment, specimen collection, marrow isolation, cell washing, hypotonic treatment and fixation — 17 steps and a checkpoint.'),
          h('div.sc-bar', h('i', { style: 'width:' + Math.round(100 * p7 / 18) + '%' })), h('p.tiny', p7 + ' of 18 parts complete' + (s7.done ? ' · score ' + s7.pct + '%' : '')),
          h('div.sc-actions', [h('button.btn.primary', { id: 'btn-lab7', onclick: () => go('lab7', c7 ? 1 : (S.firstIncomplete('lab7') || 1)) }, c7 ? 'Review Lab 7' : (p7 ? 'Continue Lab 7' : 'Start Lab 7')), c7 ? h('button.btn', { onclick: () => go('lab7', 'done') }, 'Lab 7 summary') : null])]),
        h('article.stage-card' + (unlocked ? '' : '.locked'), [h('div.sc-top', [h('span.sc-tag', 'Lab 8'), h('span.sc-state.' + lab8State.replace(' ', '-').toLowerCase(), lab8State)]), h('h2', 'Chromosome Spreading, Staining and Karyotype Analysis'),
          h('p', 'Metaphase spreading, Giemsa staining, microscopy, karyotype arrangement, measurements, calculations and classification — 10 steps.'),
          unlocked ? h('div', [h('div.sc-bar', h('i', { style: 'width:' + Math.round(100 * s8.done / 10) + '%' })), h('p.tiny', s8.done + ' of 10 steps complete' + (s8.done ? ' · score ' + s8.pct + '%' : ''))]) : h('p.lock-msg', '🔒 Locked — complete Lab 7 (all 17 steps and the checkpoint) to open Lab 8.'),
          h('div.sc-actions', [h('button.btn.primary', { id: 'btn-lab8', 'aria-disabled': unlocked ? null : 'true', onclick: () => go('lab8', unlocked ? (lab8Complete() ? 1 : (S.firstIncomplete('lab8') || 1)) : 1) }, unlocked ? (lab8Complete() ? 'Review Lab 8' : (s8.done ? 'Continue Lab 8' : 'Start Lab 8')) : 'Locked'), lab8Complete() ? h('button.btn', { onclick: () => go('lab8', 'done') }, 'Lab 8 summary') : null])])
      ]),
      h('div.home-foot', [h('button.btn', { id: 'btn-reset', onclick: resetProgress }, 'Reset progress…'), h('p.tiny', 'All images are illustrations or simulated teaching models — not photographs or real experimental results. Protocol values come from the supplied course protocol; colchicine dose and timing are not simulated.')])
    ]));
  }
  function resetProgress() {
    confirmDialog('Reset all progress?', 'This permanently erases your saved Lab 7 and Lab 8 progress, scores and karyotype in this browser, and re-locks Lab 8. This cannot be undone.', () => { S.reset(); Object.keys(attempted).forEach(k => delete attempted[k]); toast('Progress reset.'); go('home'); }, 'Reset progress');
  }

  /* -------------------------------------------------------------- step view */
  function renderStep(root, stage, n) {
    const d = def(stage, n), max = S.maxOpen(stage), done = d.checkpoint ? S.get().lab7.checkpoint.passed : S.stepDone(stage, n);
    const total = maxStep(stage);

    /* sidebar */
    const side = h('aside.sidebar', [
      h('div.stage-switch', ['lab7', 'lab8'].map(st => { const locked = st === 'lab8' && !S.canOpen('lab8'); return h('button.sw' + (st === stage ? '.on' : '') + (locked ? '.locked' : ''), { 'data-stage': st, title: locked ? 'Locked until Lab 7 is complete' : stageTitle[st], onclick: () => go(st, st === stage ? n : (S.firstIncomplete(st) || 1)) }, [locked ? '🔒 ' : '', stageShort[st]]); })),
      h('div.side-title', 'Steps'),
      h('ol.steplist', defs[stage].map(x => {
        const sd = x.checkpoint ? S.get().lab7.checkpoint.passed : S.stepDone(stage, x.n), locked = x.n > max;
        return h('li', h('button.stepbtn' + (x.n === n ? '.cur' : '') + (sd ? '.done' : '') + (locked ? '.locked' : ''), { 'data-step': x.n, disabled: locked, 'aria-current': x.n === n ? 'step' : null, onclick: () => go(stage, x.n) },
          [h('span.thumb-wrap', { html: thumbHTML(x.thumb) }), h('span.sn', x.checkpoint ? '✓' : x.n), h('span.st', x.title), sd ? h('span.tick', '✓') : (locked ? h('span.lockic', '🔒') : null)]));
      }))
    ]);

    /* tracker */
    const tracker = h('div.tracker', { role: 'list' }, defs[stage].map(x => {
      const sd = x.checkpoint ? S.get().lab7.checkpoint.passed : S.stepDone(stage, x.n), locked = x.n > max;
      return h('button.tnode' + (x.n === n ? '.cur' : '') + (sd ? '.done' : '') + (locked ? '.locked' : ''), { role: 'listitem', disabled: locked, 'data-tn': x.n, title: x.title, onclick: () => go(stage, x.n) }, [h('span.dot', sd ? '✓' : x.checkpoint ? '★' : x.n), h('span.tl', x.title)]);
    }));

    /* main card */
    const card = h('section.step-card');
    root.appendChild(h('div.layout', [side, h('div.mainc', [tracker, card])]));
    const cur = tracker.querySelector('.cur'); if (cur && cur.scrollIntoView) setTimeout(() => cur.scrollIntoView({ block: 'nearest', inline: 'center' }), 0);

    if (d.checkpoint) return renderCheckpoint(card, d);

    const viewTab = d.viewTab || 'Anatomy View';
    const tabs = h('div.tabs', { role: 'tablist' }, [['procedure', 'Procedure'], ['anatomy', viewTab], ['key', 'Key Points']].map(([id, label]) => h('button.tab' + (id === tab ? '.on' : ''), { role: 'tab', 'data-tab': id, 'aria-selected': id === tab ? 'true' : 'false', onclick: () => { tab = id; paintTab(); tabs.querySelectorAll('.tab').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'); }); } }, label)));
    const sub = h('div.pane');
    const taskBox = h('div.task-area'), fbBox = h('div.fb', { 'aria-live': 'polite' }), banner = h('div.done-banner');
    let taskMounted = false;

    card.appendChild(h('header.step-head', [h('div.step-num', n), h('div.step-title', [h('h2', d.title), h('p', d.objective), h('span.phase', d.phase)]), tabs]));
    const right = h('aside.side-col', [h('section.panel', [h('h3', 'Close-up View'), h('div.panel-art', { html: d.close() }), h('p.cap', d.viewTab ? 'Illustration / simulated teaching model' : 'Illustration')]), h('section.panel', [h('h3', d.refTitle || 'Reference'), h('div.panel-art', { html: d.ref() }), h('p.cap', d.viewTab ? 'Simulated teaching model' : 'Illustration — schematic')])]);
    card.appendChild(h('div.step-body', [h('div.work-col', [sub]), right]));
    const nextBtn = h('button.btn.primary.next', { id: 'btn-next', onclick: () => nextStep() }, n === total ? 'Finish' : 'Next Step ›');
    const prevBtn = h('button.btn.prev', { id: 'btn-prev', disabled: n === 1, onclick: () => go(stage, n - 1) }, '‹ Previous Step');
    card.appendChild(h('footer.step-foot', [h('div.tools', [h('h3', 'Tools Used'), h('div.tool-row', (d.tools || []).map(t => h('div.tool', [h('div.tool-ic', { html: t[0]() }), h('span', t[1])])))]), h('div.nav', [prevBtn, nextBtn])]));

    function refreshNext() {
      const ok = S.stepDone(stage, n);
      nextBtn.disabled = !ok;
      nextBtn.textContent = n === total ? (stage === 'lab7' ? 'Finish' : 'Finish') : (n === 17 && stage === 'lab7' ? 'Go to Checkpoint ›' : 'Next Step ›');
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
        const solved = S.stepDone(stage, n);
        sub.appendChild(banner); sub.appendChild(taskBox); sub.appendChild(fbBox);
        if (!taskMounted) mountTask();
        sub.appendChild(detailsHTML(d));
      } else if (tab === 'anatomy') {
        sub.appendChild(h('div.anat', [h('div.anat-art', { html: d.ref() }), h('h3', d.viewTab ? 'What you are looking at' : 'Structures and regions'), h('dl.structs', (d.structures || []).map(s => [h('dt', s[0]), h('dd', s[1])]).reduce((a, b) => a.concat(b), [])), h('p.cap', d.viewTab ? 'Simulated teaching model — not a real observation.' : 'Illustration — schematic anatomy, not a photograph.')]));
      } else {
        const open = S.stepDone(stage, n) || attempted[stage + n];
        sub.appendChild(open ? h('div.keys', [h('h3', 'Key points'), h('ul', (d.key || []).map(k => h('li', { html: k }))), h('div.sim-note', { html: '<strong>Why it matters:</strong> ' + d.purpose })])
          : h('div.locked-tab', [h('div.big', '🔒'), h('p', 'Key Points unlock after your first attempt at this step\'s task, so the answers are not given away in advance.')]));
      }
    }

    function mountTask(practice) {
      taskMounted = true; taskBox.innerHTML = ''; fbBox.className = 'fb'; fbBox.innerHTML = '';
      let errors = 0, safety = 0;
      const rec = S.stepRecord(stage, n);
      if (rec && rec.done && !practice) {
        banner.innerHTML = '';
        banner.appendChild(h('div.banner', [h('strong', '✓ Step complete'), ' — ' + (rec.summary || '') + ' · score ' + Math.round((rec.score || 0) * 100) + '%', h('button.btn.sm', { onclick: () => { banner.innerHTML = ''; mountTask(true); } }, 'Practice again (score unchanged)')]));
        return;
      }
      const ctx = {
        practice: !!practice,
        attempt() { attempted[stage + n] = true; },
        safety() { safety++; },
        fb(kind, html) {
          if (kind === 'clear') { fbBox.className = 'fb'; fbBox.innerHTML = ''; return; }
          if (kind === 'sci' || kind === 'safety') errors++;
          const label = { ok: 'Correct', sci: 'Not quite — scientific reasoning', safety: 'Safety / ethics issue', hint: 'Hint' }[kind];
          fbBox.className = 'fb ' + kind; fbBox.innerHTML = '<strong>' + label + '.</strong> ' + html;
          if (fbBox.scrollIntoView) fbBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        },
        complete(summary) {
          attempted[stage + n] = true;
          if (practice) { toast('Practice finished — your saved score is unchanged.'); return; }
          const score = Math.max(0.3, 1 - 0.15 * errors - 0.1 * safety);
          S.markStep(stage, n, score, summary);
          if (stage === 'lab8' && n === 10) { S.get().lab8.finished = true; S.save(); }
          refreshNext(); refreshSidebar(); showDone(summary, score);
        }
      };
      const el = d.task(ctx); taskBox.appendChild(el);
    }
    function showDone(summary, score) {
      banner.innerHTML = '';
      banner.appendChild(h('div.banner', [h('strong', '✓ Step complete'), ' — ' + summary + ' · score ' + Math.round(score * 100) + '%', h('button.btn.primary.sm', { onclick: nextStep }, n === total ? 'Finish ›' : 'Next Step ›')]));
      if (banner.scrollIntoView) banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function refreshSidebar() {
      const m2 = S.maxOpen(stage);
      $$('.stepbtn', side).forEach(b => { const x = +b.dataset.step, sd = x === 18 ? S.get().lab7.checkpoint.passed : S.stepDone(stage, x); b.classList.toggle('done', sd); b.classList.toggle('locked', x > m2); b.disabled = x > m2; });
      $$('.tnode', tracker).forEach(b => { const x = +b.dataset.tn, sd = x === 18 ? S.get().lab7.checkpoint.passed : S.stepDone(stage, x); b.classList.toggle('done', sd); b.classList.toggle('locked', x > m2); b.disabled = x > m2; b.querySelector('.dot').textContent = sd ? '✓' : (x === 18 ? '★' : x); });
    }
    refreshNext(); paintTab();
    if (done) { /* banner shown by mountTask */ }
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
  function renderCheckpoint(card, d) {
    const CP = S.get().lab7.checkpoint, Q = KL.LAB7.CHECK;
    card.appendChild(h('header.step-head', [h('div.step-num', '★'), h('div.step-title', [h('h2', d.title), h('p', d.objective), h('span.phase', 'Checkpoint')])]));
    const body = h('div.step-body.single'), work = h('div.work-col'); body.appendChild(work); card.appendChild(body);
    const fbBox = h('div.fb', { 'aria-live': 'polite' });
    if (CP.passed) {
      work.appendChild(h('div.banner', [h('strong', '✓ Checkpoint complete'), ' — first-attempt score ' + Math.round(100 * (CP.score || 0)) + '%']));
      work.appendChild(h('div.task-actions', h('button.btn.primary', { onclick: () => go('lab7', 'done') }, 'View Lab 7 summary ›')));
      return;
    }
    let qi = 0, firstTry = {};
    function show() {
      work.innerHTML = '';
      const q = Q[qi];
      work.appendChild(h('div.cp-progress', 'Question ' + (qi + 1) + ' of ' + Q.length + ' — ' + q.k));
      let wrong = 0;
      const ctx = { attempt() { }, safety() { }, fb(kind, html) { if (kind === 'sci') wrong++; fbBox.className = 'fb ' + kind; fbBox.innerHTML = kind === 'clear' ? '' : '<strong>' + ({ ok: 'Correct', sci: 'Not quite', hint: 'Hint' }[kind]) + '.</strong> ' + html; }, complete() { } };
      work.appendChild(T.single(ctx, { prompt: '<strong>' + q.q + '</strong>', options: q.o.map((o, i) => ({ id: 'o' + i, text: o[0], correct: !!o[1], why: o[2] })),
        onDone() { firstTry[q.k] = wrong === 0; CP.answers[q.k] = true; qi++; work.querySelectorAll('input,button').forEach(b => { b.disabled = true; });
          if (qi < Q.length) work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-nextq', onclick: () => { fbBox.className = 'fb'; fbBox.innerHTML = ''; show(); } }, 'Next question ›')));
          else finish(); } }));
      work.appendChild(fbBox);
    }
    function finish() {
      CP.passed = true; CP.firstTry = firstTry; CP.score = Object.values(firstTry).filter(Boolean).length / Q.length; S.save();
      work.querySelectorAll('input,button').forEach(b => { b.disabled = true; });
      work.appendChild(h('div.banner', [h('strong', '✓ Checkpoint complete'), ' — ' + Object.values(firstTry).filter(Boolean).length + ' of ' + Q.length + ' correct on the first attempt.']));
      work.appendChild(h('div.task-actions', h('button.btn.primary', { id: 'btn-finish7', onclick: () => go('lab7', 'done') }, 'Complete Lab 7 ›')));
    }
    show();
  }

  /* -------------------------------------------------------- completion screens */
  function scoreTable(stage) {
    const rows = defs[stage].filter(x => !x.checkpoint).map(x => { const r = S.stepRecord(stage, x.n); return h('tr', [h('td', x.n), h('td', x.title), h('td', r && r.done ? '✓' : '—'), h('td', r && r.done ? Math.round((r.score || 0) * 100) + '%' : '—'), h('td.tiny', r ? r.summary : '')]); });
    return h('div.tscroll', h('table.ctab', [h('thead', h('tr', ['#', 'Step', 'Done', 'Score', 'Result'].map(t => h('th', t)))), h('tbody', rows)]));
  }

  function renderLab7Done(root) {
    const s = S.scores('lab7'), CP = S.get().lab7.checkpoint, Q = KL.LAB7.CHECK;
    const unlocked = S.canOpen('lab8');
    root.appendChild(h('div.done-screen', [
      h('div.badge-done', '✓'), h('h1', 'Lab 7 complete'), h('p.lead', 'Extraction of Metaphase Chromosomes from Rat Bone Marrow'),
      h('div.stat-row', [h('div.stat', [h('strong', s.done + ' / 17'), h('span', 'steps completed')]), h('div.stat', [h('strong', s.pct + '%'), h('span', 'procedure score')]), h('div.stat', [h('strong', Math.round(100 * (CP.score || 0)) + '%'), h('span', 'checkpoint (first attempt)')])]),
      h('h3', 'Summary of procedures completed'), scoreTable('lab7'),
      h('h3', 'Checkpoint results'), h('ul.cp-list', Q.map(q => h('li', [(CP.firstTry && CP.firstTry[q.k]) ? '✓ ' : '↻ ', q.k, h('span.tiny', (CP.firstTry && CP.firstTry[q.k]) ? ' — correct first time' : ' — correct after retry')]))),
      h('div.done-actions', [
        h('button.btn', { id: 'btn-save-exit', onclick: () => { S.save(); renderSaved(); } }, 'Save and Exit'),
        h('button.btn.primary', { id: 'btn-continue8', disabled: !unlocked, onclick: () => { if (!S.canOpen('lab8')) return toast('Lab 8 is still locked.', 'warn'); go('lab8', S.firstIncomplete('lab8') || 1); } }, 'Continue to Lab 8 ›')]),
      h('p.tiny', 'Your progress is saved in this browser. Closing the page is safe: reopen it any time and press “Continue” on the home screen.')]));
  }
  function renderSaved() {
    const main = $('#view'); main.innerHTML = '';
    main.appendChild(h('div.done-screen.saved', [h('div.badge-done', '💾'), h('h1', 'Progress saved'), h('p.lead', 'Lab 7 is complete and stored in this browser. You can close this tab now.'), h('p', 'When you return, Lab 8 will be unlocked and ready to start. You will not need to repeat Lab 7.'), h('div.done-actions', h('button.btn.primary', { onclick: () => go('home') }, 'Back to home'))]));
  }

  function renderLab8Done(root) {
    const s = S.scores('lab8'), L = S.get().lab8, s7 = S.scores('lab7');
    const overall = Math.round((s.pct + s7.pct) / 2);
    const assists = L.karyotype ? L.karyotype.assists : 0, checks = L.karyotype ? L.karyotype.checks : 0;
    root.appendChild(h('div.done-screen', [
      h('div.badge-done', '✓'), h('h1', 'Lab 8 complete'), h('p.lead', 'Chromosome Spreading, Staining and Karyotype Analysis'),
      h('div.stat-row', [h('div.stat', [h('strong', s.done + ' / 10'), h('span', 'steps completed')]), h('div.stat', [h('strong', s.pct + '%'), h('span', 'Lab 8 score')]), h('div.stat', [h('strong', overall + '%'), h('span', 'overall (Labs 7 + 8)')])]),
      h('div.sim-note', { html: 'Karyotype: <strong>' + checks + '</strong> check' + (checks === 1 ? '' : 's') + ' · row-alignment assists used: <strong>' + assists + '</strong>. Speed is not scored.' }),
      h('h3', 'Summary of procedures completed'), scoreTable('lab8'),
      h('div.done-actions', [h('button.btn', { onclick: () => go('lab8', 10) }, 'Review final analysis'), h('button.btn.primary', { onclick: () => go('home') }, 'Back to home')])]));
  }

  /* -------------------------------------------------------------- header modals */
  function guide() {
    modal({ title: 'Guide — how this virtual lab works', cls: 'wide', body:
      '<ol class="guide"><li><strong>Two stages.</strong> Lab 7 (bone marrow → fixed cell suspension) must be completed — all 17 steps and the checkpoint — before Lab 8 (spreading, staining, karyotype) unlocks.</li>' +
      '<li><strong>Each step</strong> has tabs: <em>Procedure</em> (your task, protocol and safety), <em>Anatomy / Microscopy View</em> and <em>Key Points</em> (unlocked after your first attempt).</li>' +
      '<li><strong>Do the task</strong> in the Procedure tab. You get feedback after every attempt and can try again. Mistakes lower the step score slightly; speed is never scored.</li>' +
      '<li><strong>Progress</strong> is saved automatically in this browser. You can leave after Lab 7 and return later.</li>' +
      '<li><strong>Karyotype:</strong> drag chromosomes to slots (or tap, then tap a slot); <kbd>R</kbd> rotates; <kbd>↑</kbd>/<kbd>↓</kbd> nudge a chromosome onto the centromere line.</li>' +
      '<li><strong>All images</strong> are illustrations or simulated teaching models — never real photographs or student results.</li></ol>', buttons: [{ label: 'Close', cls: 'primary' }] });
  }
  function help() {
    modal({ title: 'Help', cls: 'wide', body:
      '<h4>Cannot continue to the next step?</h4><p>The Next button is enabled when the current step is complete. Read the feedback box under the task for what is still missing.</p>' +
      '<h4>Lab 8 is locked</h4><p>Lab 8 opens only after Lab 7 is fully complete. This is enforced by the application — it cannot be opened from the URL or by editing saved data.</p>' +
      '<h4>My progress disappeared</h4><p>Progress lives in this browser\'s local storage. It is lost if you clear site data or use a private window, or switch browser/device. If saved data fails an integrity check it is cleared.</p>' +
      '<h4>Use on tablets</h4><p>Tap a chromosome, then tap its destination slot. Use the ⟳ and arrow buttons to rotate and align.</p>' +
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
  KL.App = { go, route, guard, parse };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
