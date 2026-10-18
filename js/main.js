/* =========================================================================
   main.js — app shell: intro, rendering of all panels, event routing,
   global ticker, session restart / end.
   ========================================================================= */
(function (L) {
  'use strict';

  var UI = L.UI;
  var $ = UI.$;

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */
  var pending = false;
  L.requestRender = function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      if (UI.DnD.dragging) { L.requestRender(); return; }
      L.render();
    });
  };

  L.render = function () {
    var S = L.S;
    if (!S) return;
    document.body.dataset.phase = S.phase;
    renderHeader();
    if (S.phase === 'intro') return;
    renderLeft();
    renderRight();
    renderFocusbar();
    var map = $('#map');
    map.innerHTML = L.Scene.mapSVG();
    L.Scene.afterMapRender(map);
    renderStation();
    applyView();
  };

  /* ------------------------------------------------------------------ */
  /* Layout / view state (UI preference only — not part of the session)  */
  /* ------------------------------------------------------------------ */
  var VIEW_KEY = 'vlab-view-v1';
  var View = L.View = { left: true, right: true, focus: false, tab: 'bench', seenAt: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
    if (typeof saved.left === 'boolean') View.left = saved.left;
    if (typeof saved.right === 'boolean') View.right = saved.right;
  } catch (e) { /* storage unavailable — use defaults */ }

  function saveView() {
    try { localStorage.setItem(VIEW_KEY, JSON.stringify({ left: View.left, right: View.right })); } catch (e) { /* ignore */ }
  }

  var phoneQuery = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
  L.isPhone = function () { return phoneQuery.matches; };

  /** Is the feedback list currently on screen? */
  function feedbackVisible() {
    if (L.isPhone()) return View.tab === 'feedback';
    return View.right && !View.focus;
  }

  function unreadCount() {
    if (!L.S) return 0;
    return L.S.log.filter(function (e) { return e.t > View.seenAt && (e.type === 'violation' || e.type === 'technique'); }).length;
  }

  function applyView() {
    var b = document.body, phase = L.S ? L.S.phase : 'intro';
    var inGame = phase !== 'intro' && phase !== 'report';
    b.classList.toggle('hide-left', !View.left);
    b.classList.toggle('hide-right', !View.right);
    b.classList.toggle('focus-mode', View.focus && inGame);
    ['bench', 'map', 'tasks', 'feedback'].forEach(function (t) { b.classList.toggle('tab-' + t, View.tab === t); });
    if (feedbackVisible()) View.seenAt = Date.now();
    var n = unreadCount();
    UI.$$('.view-btn').forEach(function (btn) {
      var k = btn.dataset.view;
      var on = k === 'focus' ? View.focus : (View[k] && !View.focus);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('on', on);
    });
    UI.$$('#topbar .badge, #tabbar .badge').forEach(function (el) {
      el.hidden = !n;
      el.textContent = n > 9 ? '9+' : n;
    });
    if (L.isPhone() && View.tab === 'map' && L.S && L.STATIONS[L.S.station]) {
      var m = $('#map'), svg = m.querySelector('svg');
      if (svg) m.scrollLeft = Math.max(0, L.STATIONS[L.S.station].x / 1000 * svg.clientWidth - m.clientWidth / 2);
    }
    UI.$$('#tabbar [data-tab]').forEach(function (btn) {
      if (btn.dataset.tab === View.tab) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }
  L.applyView = applyView;

  L.setView = function (key, value) {
    if (key === 'tab') {
      if (View.tab === value) return;
      View.tab = value;
      window.scrollTo(0, 0);
    } else if (key === 'focus') {
      View.focus = value == null ? !View.focus : !!value;
      if (!View.focus && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } else {
      // showing a side panel leaves focus mode
      if (View.focus) { View.focus = false; View[key] = true; }
      else View[key] = value == null ? !View[key] : !!value;
      saveView();
    }
    applyView();
  };

  function toggleFullscreen() {
    var el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
    if (el.requestFullscreen) el.requestFullscreen().catch(function () { UI.toast('Your browser blocked full screen.', 'info'); });
    else UI.toast('Full screen is not supported in this browser.', 'info');
  }

  function renderFocusbar() {
    var S = L.S, o = objective();
    $('#focusbar').innerHTML =
      '<div class="fb-top"><div class="fb-obj"><span class="fb-title">' + o.title + '</span><span class="fb-text">' + o.text + '</span></div>' +
      '<div class="fb-acts">' +
      '<button class="btn sm fb-fs" data-act="fullscreen" title="Browser full screen">⛶ Full screen</button>' +
      '<button class="btn sm primary fb-exit" data-view="focus">✕ Exit focus</button></div></div>' +
      (S.phase === 'entry' ? '' : '<div class="chips" role="group" aria-label="Go to station">' + L.Scene.stationChips() + '</div>');
  }

  function progress() {
    var S = L.S, total = 1, done = S.phase === 'entry' || S.phase === 'intro' ? 0 : 1;
    S.exps.forEach(function (e) {
      var d = L.expDef(e.id);
      total += d.steps.length;
      d.steps.forEach(function (st) { if (e.steps[st.id]) done++; });
    });
    var tasks = L.Cleanup.tasks();
    total += tasks.length;
    if (S.phase === 'cleanup' || S.phase === 'report') tasks.forEach(function (t) { if (t.done) done++; });
    return Math.round(100 * done / total);
  }

  function renderHeader() {
    var S = L.S, h = $('#hdr-dyn');
    if (S.phase === 'intro') { h.innerHTML = ''; return; }
    var sc = L.scenario(), interp = L.Score.interpretation(), pct = progress();
    var cls = function (v) { return v >= 80 ? 'good' : v >= 60 ? 'mid' : 'bad'; };
    h.innerHTML =
      '<div class="case-badge" title="' + UI.esc(S.scenarioHidden ? 'Unknown sample' : sc.history) + '">🧫 ' + (S.scenarioHidden ? 'Unknown sample' : sc.code + ': ' + sc.name) + '</div>' +
      '<div class="scores">' +
      '<div class="score ' + cls(S.scores.safety) + '"><span>Safety</span><strong>' + S.scores.safety + '%</strong></div>' +
      '<div class="score ' + cls(S.scores.technique) + '"><span>Procedure</span><strong>' + S.scores.technique + '%</strong></div>' +
      '<div class="score"><span>Interpretation</span><strong>' + interp.correct + '/' + interp.max + '</strong></div></div>' +
      '<div class="progress" title="Task progress"><div class="bar"><i style="width:' + pct + '%"></i></div><span>' + pct + '%</span></div>';
  }

  function objective() {
    var S = L.S;
    if (S.phase === 'entry') return { title: 'PPE inspection', text: 'Put on your laboratory coat (fully buttoned), gloves and goggles, store personal belongings, then enter the lab.' };
    if (S.phase === 'cleanup') {
      var t = L.Cleanup.tasks().filter(function (x) { return !x.done; })[0];
      return { title: 'Cleanup', text: t ? t.text : 'All done — sign out at the entrance (left of the floor plan).' };
    }
    if (S.phase === 'report') return { title: 'Session complete', text: 'Review your report.' };
    var e = L.currentExp(), d = L.expDef(e.id), st = L.Exp.nextStep(e);
    var where = (e.id === 'rothera' && L.Exp.isDone(e, 'mix')) ? 'hood' : d.station;
    if (e.id === 'rothera' && e.tube.where === 'hood') where = 'hood';
    var go = S.station !== where && !(e.id === 'rothera' && S.station === e.tube.where) ? ' <span class="goto">→ Go to <a href="#" data-goto="' + where + '">' + L.STATIONS[where].name + '</a></span>' : '';
    return { title: 'Experiment ' + d.num + ': ' + d.title, text: (st ? st.text : '') + go };
  }

  function renderLeft() {
    var S = L.S, o = objective();
    var h = '<div class="panel-bar"><span>Objective, tasks & PPE</span><button class="icon-btn sm" data-view="left" title="Hide this panel" aria-label="Hide tasks panel">⟨</button></div>' +
      '<section class="card objective"><h3>Current objective</h3><div class="obj-title">' + o.title + '</div><p>' + o.text + '</p></section>';
    h += '<section class="card tasks"><h3>Task list</h3><ol class="phases">';
    h += '<li class="' + (S.phase === 'entry' ? 'cur' : 'done') + '"><span>PPE inspection & entry</span></li>';
    S.exps.forEach(function (e, i) {
      var d = L.expDef(e.id);
      var state = e.done ? 'done' : (S.phase === 'lab' && i === S.expIndex ? 'cur' : '');
      h += '<li class="' + state + '"><span>Exp ' + d.num + ': ' + d.title + '</span>';
      if (state === 'cur') {
        var next = L.Exp.nextStep(e);
        h += '<ul class="steps">' + d.steps.map(function (st) {
          var c = e.steps[st.id] ? 'done' : (next && next.id === st.id ? 'cur' : '');
          return '<li class="' + c + '">' + st.text + '</li>';
        }).join('') + '</ul>';
      }
      h += '</li>';
    });
    var cl = S.phase === 'cleanup' ? 'cur' : (S.phase === 'report' ? 'done' : '');
    h += '<li class="' + cl + '"><span>Cleanup & equipment return</span>';
    if (S.phase === 'cleanup') {
      h += '<ul class="steps">' + L.Cleanup.tasks().map(function (t) { return '<li class="' + (t.done ? 'done' : '') + '">' + t.text + '</li>'; }).join('') + '</ul>';
    }
    h += '</li></ol></section>';

    var p = S.ppe;
    var coatOk = p.coat && p.buttons.every(Boolean);
    h += '<section class="card ppe"><h3>Your PPE</h3><div class="ppe-mini">' + UI.avatarSVG(p, S.phase === 'entry' ? S.belongings : null) + '</div><ul class="ppe-list">' +
      '<li class="' + (coatOk ? 'ok' : 'no') + '">🥼 Lab coat: ' + (p.coat ? (coatOk ? 'worn, fully buttoned' : 'NOT fully buttoned') : 'not worn') + '</li>' +
      '<li class="' + (p.gloves ? 'ok' : 'no') + '">🧤 Gloves: ' + (p.gloves ? 'on' : 'off') +
      (S.phase !== 'report' && !(S.phase === 'cleanup' && S.cleanup.glovesOff) ? ' <button class="btn xs" data-act="ppe" data-v="gloves">' + (p.gloves ? 'Remove' : 'Put on') + '</button>' : '') + '</li>' +
      '<li class="' + (p.goggles ? 'ok' : 'no') + '">🥽 Goggles: ' + (p.goggles ? 'on' : 'off') +
      (S.phase !== 'report' ? ' <button class="btn xs" data-act="ppe" data-v="goggles">' + (p.goggles ? 'Remove' : 'Put on') + '</button>' : '') + '</li>' +
      (S.phase === 'entry' && p.coat ? '<li><button class="btn xs" data-act="ppe" data-v="coat">Take coat off</button></li>' : '') +
      '</ul>';
    if (S.phase === 'cleanup') {
      var carried = S.exps.filter(function (e) { return e.tube.loc === 'carry'; }).length;
      h += '<p class="carry">Carrying rack: <strong>' + carried + '</strong> tube(s)</p>';
    }
    h += '</section>';
    $('#left').innerHTML = h;
  }

  function renderRight() {
    var S = L.S;
    var sev = { minor: 0, major: 0, critical: 0 };
    S.violations.forEach(function (v) { sev[v.severity]++; });
    var canReset = S.phase === 'lab' && !(S.incident && S.incident.stage !== 'cleared');
    var h = '<div class="panel-bar"><button class="icon-btn sm" data-view="right" title="Hide this panel" aria-label="Hide feedback panel">⟩</button><span>Controls & feedback</span></div>' +
      '<section class="card controls"><h3>Controls</h3>' +
      '<button class="btn block" data-act="reset-exp"' + (canReset ? '' : ' disabled') + '>↺ Reset current experiment</button>' +
      '<button class="btn block" data-act="ta-hint">💡 Ask a TA for a hint</button>' +
      '<button class="btn block" data-act="ta-rules">📋 Safety rules</button>' +
      '</section>';
    h += '<section class="card warnings" aria-live="polite"><h3>Warnings & feedback</h3>' +
      '<div class="sev-counts"><span class="c-critical">' + sev.critical + ' critical</span><span class="c-major">' + sev.major + ' major</span><span class="c-minor">' + sev.minor + ' minor</span><span class="c-proc">' + S.techErrors.length + ' procedure</span></div>' +
      '<ul class="log">' + (S.log.length ? S.log.slice(0, 40).map(function (e) {
        return '<li class="lg-' + e.severity + '"><div class="lg-t">' + (e.type === 'violation' ? '⚠ ' : e.type === 'good' ? '✔ ' : e.type === 'technique' ? '✎ ' : 'ℹ ') + UI.esc(e.title) +
          (e.pts ? ' <span class="pts">−' + e.pts + '</span>' : '') + '</div>' + (e.action && e.type !== 'good' ? '<div class="lg-a">' + UI.esc(e.action) + '</div>' : '') + '</li>';
      }).join('') : '<li class="empty">No warnings yet. Work safely!</li>') + '</ul></section>';
    $('#right').innerHTML = h;
  }

  function renderStation() {
    var S = L.S, st = S.station, html;
    if (S.phase === 'entry') html = L.Scene.entranceView();
    else if (/^bench\d$/.test(st) || st === 'hood') html = L.Exp.view(st);
    else html = L.Scene.otherView(st);
    var root = $('#station');
    // keep the <details> open state across renders
    var open = root.querySelector('details.other-actions[open]');
    root.innerHTML = '<div class="station-inner">' + html + '</div>' + (L.Incident.overlay() || '');
    if (open) { var d = root.querySelector('details.other-actions'); if (d) d.open = true; }
    root.classList.toggle('has-incident', !!(S.incident && S.incident.station === st));
  }

  /* ------------------------------------------------------------------ */
  /* Drop routing                                                        */
  /* ------------------------------------------------------------------ */
  L.onDrop = function (dragId, dropId, info) {
    var S = L.S;
    if (!S || S.phase === 'intro' || S.phase === 'report') return;
    if (S.phase === 'entry') return L.Scene.entranceDrop(dragId, dropId, info);
    if (S.phase === 'cleanup' && (dragId.indexOf('ctube:') === 0 || dropId === 'technician')) return L.Cleanup.onDrop(dragId, dropId, info);
    return L.Exp.onDrop(dragId, dropId, info);
  };

  /* ------------------------------------------------------------------ */
  /* Click routing                                                       */
  /* ------------------------------------------------------------------ */
  function onClick(e) {
    var S = L.S;
    if (!S) return;
    var vb = e.target.closest('[data-view]');
    if (vb) { L.setView(vb.dataset.view); return; }
    var tb = e.target.closest('#tabbar [data-tab]');
    if (tb) { L.setView('tab', tb.dataset.tab); return; }
    var g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); goFromUI(g.dataset.goto); return; }
    var stn = e.target.closest('#map [data-station]');
    if (stn) { goFromUI(stn.dataset.station); return; }
    var btn = e.target.closest('[data-button]');
    if (btn) { L.Scene.toggleButton(+btn.dataset.button); return; }
    var a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    var n = a.dataset.act;
    if (n.indexOf('inc-') === 0) L.Incident.act(n, a);
    else if (n.indexOf('c-') === 0) L.Cleanup.act(n, a);
    else if (GLOBAL[n]) GLOBAL[n](a);
    else L.Exp.act(n, a);
    L.requestRender();
  }

  /** Navigation started by the student: on phones, jump back to the bench tab. */
  function goFromUI(dest) {
    var before = L.S.station;
    L.Scene.goTo(dest);
    if (L.isPhone() && (L.S.station !== before || dest === before)) L.setView('tab', 'bench');
  }

  var GLOBAL = {
    fullscreen: function () { toggleFullscreen(); },
    enter: function () { L.Scene.enter(); },
    ppe: function (a) {
      var S = L.S, k = a.dataset.v;
      if (k === 'coat') { S.ppe.coat = false; S.ppe.buttons = [false, false, false, false]; return; }
      if (L.Exp.Heating.isRunning()) return;
      S.ppe[k] = !S.ppe[k];
      if (k === 'gloves' && S.ppe.gloves && S.phase === 'cleanup') S.cleanup.glovesOff = false;
      UI.toast((k === 'gloves' ? 'Gloves ' : 'Goggles ') + (S.ppe[k] ? 'on.' : 'removed.'), S.ppe[k] ? 'good' : 'info');
    },
    'ta-hint': function () { L.Scene.hint(); },
    'ta-rules': function () { L.Scene.rules(); },
    'laminar-add': function () { L.Scene.laminarAdd(); },
    stool: function () { L.Cleanup.stool(); },
    finish: function () { L.Cleanup.finish(); },
    restart: function () { confirmRestart(); },
    end: function () { confirmEnd(); },
    help: function () { showHelp(); },
    print: function () { window.print(); }
  };

  /* ------------------------------------------------------------------ */
  /* Experiment completion                                               */
  /* ------------------------------------------------------------------ */
  L.completeExperiment = function (exp) {
    var S = L.S;
    exp.steps.interpret = true;
    exp.done = true;
    if (S.expIndex < 3) {
      S.expIndex++;
      var d = L.EXPERIMENTS[S.expIndex];
      UI.toast('Experiment ' + d.num + ' unlocked at ' + L.STATIONS[d.station].name + '.', 'good');
    } else {
      S.expIndex = 4;
      L.Cleanup.start();
    }
    L.requestRender();
  };

  /* ------------------------------------------------------------------ */
  /* Intro, restart, end, help                                           */
  /* ------------------------------------------------------------------ */
  function showIntro() {
    var root = $('#intro-root');
    var cards = L.SCENARIOS.map(function (s) {
      return '<button class="case-card" data-case="' + s.id + '"><strong>' + s.code + '</strong><span>' + s.name + '</span><small>' + s.history + '</small></button>';
    }).join('') + '<button class="case-card unknown" data-case="unknown"><strong>Unknown sample</strong><span>Assigned by the TA</span><small>One of the predefined cases is assigned without telling you which. Identify it from your results — it is revealed in the report.</small></button>';
    root.innerHTML = '<div class="overlay intro"><div class="intro-card">' +
      '<h1>🧪 Virtual Laboratory — Biochemistry 2</h1><h2>Qualitative detection of abnormal constituents in urine</h2>' +
      '<div class="intro-grid"><div>' +
      '<h3>In this practical you will</h3><ol><li>Pass a <strong>PPE inspection</strong> at the laboratory entrance.</li>' +
      '<li>Perform four tests in order: <strong>heat test</strong> (albumin), <strong>Benedict\'s</strong> (reducing sugars), <strong>Rothera\'s</strong> (ketone bodies, in the fume hood) and <strong>Hay\'s sulfur test</strong> (bile salts).</li>' +
      '<li>Interpret every observation.</li><li>Clean up, wash glassware and return equipment.</li></ol>' +
      '<h3>How to play</h3><ul><li>Click places on the <strong>floor plan</strong> to walk there.</li>' +
      '<li><strong>Drag</strong> equipment and reagents onto the test tube — or <strong>tap</strong> an item, then tap where it goes (tablets).</li>' +
      '<li>Every action is checked against the safety rules. Unsafe actions are stopped and explained; you can always correct them.</li>' +
      '<li>You are scored on <strong>safety</strong>, <strong>procedure</strong> and <strong>interpretation</strong>. Speed is not rewarded.</li></ul>' +
      '<p class="disclaimer">All reactions, boiling, splashing and injuries are <strong>simulated</strong>. This application does not perform any real chemical analysis.</p>' +
      '</div><div><h3>Choose the urine sample to analyse</h3><div class="cases">' + cards + '</div></div></div></div></div>';
    root.querySelectorAll('[data-case]').forEach(function (b) {
      b.addEventListener('click', function () { start(b.dataset.case); });
    });
  }

  function start(caseId) {
    var hidden = caseId === 'unknown';
    if (hidden) caseId = L.SCENARIOS[Math.floor(Math.random() * L.SCENARIOS.length)].id;
    L.S = L.newState(caseId, hidden);
    L.S.phase = 'entry';
    View.tab = 'bench'; View.focus = false; View.seenAt = Date.now();
    L.Scene.resetMap();
    $('#intro-root').innerHTML = '';
    $('#modal-root').innerHTML = '';
    L.render();
    UI.modal({
      title: '🚪 Laboratory entrance',
      body: '<p>Before you enter, a TA checks your personal protective equipment.</p><ul><li>Laboratory coat — <strong>fully buttoned, including the lowest button</strong></li><li>Gloves — before handling any sample or reagent</li><li>Safety goggles — during heating and when handling acids or hazardous reagents</li><li>No food, drink or personal belongings in the lab</li></ul>',
      buttons: [{ label: 'Start the PPE inspection', cls: 'primary' }]
    });
  }
  L.start = start;

  function confirmRestart() {
    UI.modal({
      title: 'Restart the session?', body: '<p>All progress and scores in this session will be lost.</p>',
      buttons: [{ label: 'Cancel' }, { label: 'Restart', cls: 'danger', onClick: function () {
        if (L.Exp.Heating.H) L.Exp.Heating.stop(true);
        L.S = L.newState('healthy'); L.S.phase = 'intro';
        $('#modal-root').innerHTML = '';
        $('#left').innerHTML = ''; $('#right').innerHTML = ''; $('#map').innerHTML = ''; $('#station').innerHTML = '';
        $('#focusbar').innerHTML = '';
        renderHeader();
        document.body.dataset.phase = 'intro';
        View.focus = false; View.tab = 'bench';
        applyView();
        showIntro();
      } }]
    });
  }

  function confirmEnd() {
    if (L.S.phase === 'report' || L.S.phase === 'intro') return;
    UI.modal({
      title: 'End the session now?', body: '<p>Your report will be generated with the status <strong>Incomplete</strong>. You will not be able to continue this session.</p>',
      buttons: [{ label: 'Keep working', cls: 'primary' }, { label: 'End session', cls: 'danger', onClick: function () {
        L.S.phase = 'report'; L.S.endedAt = Date.now(); L.S.endReason = 'early';
        L.Report.show();
      } }]
    });
  }

  function showHelp() {
    UI.modal({
      title: '❓ Help', dismiss: true, cls: 'help-modal',
      body: '<ul><li><strong>Move</strong> by clicking a station on the floor plan. The pulsing outline shows where your current task is.</li>' +
        '<li><strong>Drag & drop</strong> items onto targets (dashed outline). On a tablet you can tap an item and then tap its target.</li>' +
        '<li><strong>Layout</strong>: use <strong>☰ Tasks</strong> and <strong>💬 Feedback</strong> (top bar) to hide or show the side panels, and <strong>⛶ Focus</strong> to make the workbench fill the screen (Esc to exit). On a phone, use the tabs at the bottom.</li>' +
        '<li><strong>PPE</strong>: put gloves and goggles on/off in the “Your PPE” panel.</li>' +
        '<li><strong>Heating</strong>: attach the holder, then drag the tube to the burner (or press “Heat at burner”). Set the burner, flame region, angle, direction and motion before starting.</li>' +
        '<li><strong>Glassware</strong> released outside the workstation falls and breaks. Report breakages to the TA.</li>' +
        '<li><strong>Reset current experiment</strong> gives you a fresh tube for the experiment you are on.</li>' +
        '<li>Severity: <span class="c-critical">critical</span> (−15) stops the procedure, <span class="c-major">major</span> (−8), <span class="c-minor">minor</span> (−3); procedure errors reduce the procedure score.</li></ul>',
      buttons: [{ label: 'Close', cls: 'primary' }]
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  var lastTick = Date.now();
  function tick() {
    var now = Date.now(), dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!L.S || L.S.phase === 'intro' || L.S.phase === 'report') return;
    L.Exp.tick(dt);
    L.Incident.tick();
  }

  function boot() {
    L.S = L.newState('healthy');
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-station], [data-button], .stool, [data-drag], [data-drop]')) {
        e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      if (e.key === 'Escape') {
        UI.DnD.clearSelection();
        if (View.focus && !UI.modalOpen() && !document.fullscreenElement) L.setView('focus', false);
      }
    });
    UI.DnD.init(document.getElementById('app'));
    $('#btn-help').addEventListener('click', showHelp);
    $('#btn-end').addEventListener('click', confirmEnd);
    $('#btn-restart').addEventListener('click', confirmRestart);
    if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', function () { applyView(); });
    applyView();
    setInterval(tick, 250);
    document.body.dataset.phase = 'intro';
    showIntro();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Lab);
