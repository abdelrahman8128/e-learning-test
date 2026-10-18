/* =========================================================================
   cleanup.js — end-of-lab sequence: burners off, cool, collect tubes in a
   rack, wash, rack, return equipment, clean benches, clear pathways,
   remove gloves, wash hands. The session cannot finish until all are done.
   ========================================================================= */
(function (L) {
  'use strict';

  var Cleanup = L.Cleanup = {};
  var UI = L.UI, Safety = L.Safety;
  var BENCHES = ['bench1', 'bench2', 'bench3', 'bench4', 'hood'];

  function S() { return L.S; }
  function liveTubes() { return S().exps.filter(function (e) { return e.tube.loc !== 'disposed'; }); }

  Cleanup.start = function () {
    S().phase = 'cleanup';
    UI.modal({
      title: '🧽 All four tests complete — cleanup time',
      body: '<p>Before you can leave, complete the cleanup sequence. Your task list (left) tracks each item:</p><ol class="clean-list">' +
        Cleanup.tasks().map(function (t) { return '<li>' + t.text + '</li>'; }).join('') + '</ol>' +
        '<p class="tiny">Hint: tubes go into the <strong>carrying rack</strong> — never carry them loose. The sink is the washing station; the technician takes the equipment back.</p>',
      buttons: [{ label: 'Start cleanup', cls: 'primary' }]
    });
  };

  Cleanup.tasks = function () {
    var c = S().cleanup, tubes = liveTubes();
    return [
      { id: 'burners', text: 'Turn off all Bunsen burners', done: !S().burners.bench1.lit && !S().burners.bench2.lit },
      { id: 'cool', text: 'Allow heated tubes to cool before handling', done: tubes.every(function (e) { return e.tube.temp < 40; }) },
      { id: 'collect', text: 'Collect every tube into the carrying rack (no loose tubes)', done: tubes.every(function (e) { return e.tube.loc === 'carry' || e.tube.loc === 'returned'; }) },
      { id: 'wash', text: 'Wash each tube at the sink (empty, brush, rinse)', done: tubes.every(function (e) { return e.tube.washStage >= 3; }) },
      { id: 'rack', text: 'Stand the washed tubes inverted in the rack', done: tubes.every(function (e) { return e.tube.washStage >= 4; }) },
      { id: 'return', text: 'Return the rack and equipment to the technician', done: c.returned },
      { id: 'wipe', text: 'Clean all four benches and the fume hood', done: BENCHES.every(function (b) { return c.wiped[b]; }) },
      { id: 'path', text: 'Keep entrance & exit pathways clear', done: c.stool === 'stowed' },
      { id: 'hands', text: 'Remove gloves and wash hands', done: c.glovesOff && c.handsWashed }
    ];
  };

  Cleanup.allDone = function () { return Cleanup.tasks().every(function (t) { return t.done; }); };

  /* ------------------------------------------------------------------ */
  /* Views                                                               */
  /* ------------------------------------------------------------------ */
  Cleanup.benchView = function (station, exp) {
    var c = S().cleanup;
    var here = S().exps.filter(function (e) { return e.tube.where === station && ['rack', 'hand', 'holder'].indexOf(e.tube.loc) !== -1; });
    var b = S().burners[station];
    var h = '<div class="bench cleanup" data-drop="bench"><div class="bench-head"><span class="exp-tag">Cleanup</span><h2>' + L.STATIONS[station].name + '</h2></div>';
    h += '<div class="clean-grid">';
    if (here.length) {
      here.forEach(function (e) {
        var t = e.tube;
        h += '<div class="clean-tube"><div class="tube-wrap" data-drag="ctube:' + e.id + '" data-label="Used test tube" tabindex="0" role="button">' + UI.tubeSVG(L.Exp.visual(e)) + '</div>' +
          L.Exp.tubeMeta(e) +
          (t.loc !== 'hand' ? '<button class="btn sm" data-act="c-pickup" data-v="' + e.id + '">✋ Pick up by hand</button>' : '') + '</div>';
      });
      h += '<div class="zone carry-zone" data-drop="carry-rack"><div class="zone-ico">' + UI.icon.rack(carried().length) + '</div><div class="zone-lbl">Your carrying rack<br><small>Drag tubes here</small></div></div>';
    } else {
      h += '<div class="clean-empty">' + (S().exps.some(function (e) { return e.id === (L.Exp.stationExp(station) || {}).id && e.tube.loc === 'broken'; }) ? 'Broken tube — reported.' : 'No tubes left at this station.') + '</div>';
    }
    h += '<div class="clean-side">';
    if (b) {
      h += '<div class="zone burner-zone"><div class="zone-ico">' + UI.icon.burner(b.lit) + '</div><div class="zone-lbl">Bunsen burner — ' + (b.lit ? '<strong class="red">still lit</strong>' : 'off') + '</div>' +
        (b.lit ? '<button class="btn sm danger" data-act="burner-off">Turn off gas</button>' : '') + '</div>';
    }
    h += '<div class="bench-surface ' + (c.wiped[station] ? 'clean' : 'dirty') + '"><span>' + (c.wiped[station] ? '✨ Bench surface clean' : '💧 Drips and stains on the bench') + '</span>' +
      (c.wiped[station] ? '' : '<button class="btn sm" data-act="c-wipe" data-v="' + station + '">🧽 Wipe bench with disinfectant</button>') + '</div>';
    h += '</div></div></div>';
    if (station === 'hood') h = h.replace('class="bench cleanup"', 'class="bench cleanup hood-clean"');
    return h;
  };

  function carried() { return S().exps.filter(function (e) { return e.tube.loc === 'carry'; }); }

  var WASH = [
    { label: 'Empty contents into the sink under running water' },
    { label: 'Scrub with a test-tube brush and detergent' },
    { label: 'Rinse with tap water, then distilled water' },
    { label: 'Stand inverted in the drying rack to drain' }
  ];

  Cleanup.sinkView = function () {
    var c = S().cleanup, phase = S().phase;
    var h = '<div class="panel sink-view"><h2>🚰 Sink & washing station</h2>';
    if (phase !== 'cleanup') {
      return h + '<p>Glassware is washed here at the end of the practical. Do not bring tubes here during the experiments.</p></div>';
    }
    var here = carried();
    if (!here.length && !c.returned) h += '<p>Collect the used tubes in your carrying rack and bring them here.</p>';
    here.forEach(function (e) {
      var t = e.tube, d = L.expDef(e.id);
      h += '<div class="wash-row"><div class="tube-wrap static sm">' + UI.tubeSVG(L.Exp.visual(e)) + '</div><div class="wash-body"><strong>Tube from Experiment ' + d.num + '</strong> <span class="temp">' + Math.round(t.temp) + ' °C</span>' +
        '<div class="wash-steps">' + WASH.map(function (w, i) {
          return '<button class="btn sm ' + (t.washStage > i ? 'done' : '') + '" data-act="c-wash" data-v="' + e.id + '" data-i="' + i + '"' + (t.washStage > i ? ' disabled' : '') + '>' + (t.washStage > i ? '✔ ' : (i + 1) + '. ') + w.label + '</button>';
        }).join('') + '</div></div></div>';
    });
    h += '<div class="hand-wash"><h3>Personal hygiene (last)</h3>' +
      '<button class="btn" data-act="c-gloves"' + (c.glovesOff ? ' disabled' : '') + '>' + (c.glovesOff ? '✔ Gloves removed' : '🧤 Remove gloves into the clinical waste bin') + '</button> ' +
      '<button class="btn" data-act="c-hands"' + (c.handsWashed ? ' disabled' : '') + '>' + (c.handsWashed ? '✔ Hands washed' : '🧼 Wash hands with soap and water') + '</button></div>';
    return h + '</div>';
  };

  Cleanup.techView = function () {
    var phase = S().phase, c = S().cleanup;
    var h = '<div class="panel tech-view"><div class="person">🧑‍🔧</div><h2>Laboratory technician — equipment return</h2>';
    if (phase !== 'cleanup') return h + '<p>“Equipment for today\'s practical is already on your benches. Bring the rack and equipment back to me at the end of the session.”</p></div>';
    if (c.returned) return h + '<p>“All equipment received — thank you. Make sure the benches are clean and the pathways are clear before you sign out.”</p></div>';
    h += '<p>“Bring me your rack of clean tubes, the test tube holders and the pipettes.”</p>' +
      '<div class="zone tech-drop" data-drop="technician">' + UI.icon.rack(carried().length) + '<span>Hand over here</span></div>' +
      '<button class="btn primary" data-act="c-return">↩ Return rack & equipment</button>';
    return h + '</div>';
  };

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  Cleanup.onDrop = function (dragId, dropId, info) {
    if (dragId.indexOf('ctube:') === 0) {
      var exp = L.exp(dragId.slice(6));
      if (dropId === 'carry-rack') return collect(exp);
      if (dropId === 'bench') {
        return Safety.flag({ id: 'tube-flat-c', rule: 'glassware', cat: 'handling', severity: 'minor', title: 'Test tube laid on the bench',
          action: 'You laid the used tube down on the bench.', consequence: 'It can roll off and break, spilling its contents.', fix: 'Put it in the carrying rack.' });
      }
      if (dropId === null && info && info.drag) {
        if (exp.tube.temp >= 45 && exp.tube.loc !== 'holder') return L.Exp.burn(exp, 'carry the hot tube');
        return L.Incident.breakTube(exp, 'dropped');
      }
      return;
    }
    if (dropId === 'technician') return giveBack();
  };

  function collect(exp) {
    if (!Safety.canAct()) return;
    if (!Safety.requireGloves('handle used test tubes')) return;
    var t = exp.tube;
    if (t.temp >= 45 && t.loc !== 'holder') return L.Exp.burn(exp, 'move the hot tube into the rack');
    if (t.temp >= 45 && t.loc === 'holder') { UI.toast('The tube is still hot. Leave it in the rack to cool first.', 'warn'); return; }
    t.loc = 'carry';
    L.Score.good('collect-' + exp.id, 'Moved a used tube into the carrying rack', 'cleanup');
    UI.toast('Tube placed in your carrying rack — it moves with you.', 'good');
  }

  function giveBack() {
    var c = S().cleanup;
    if (S().station !== 'tech' || c.returned) return;
    var problems = [];
    liveTubes().forEach(function (e) {
      var d = L.expDef(e.id);
      if (e.tube.loc !== 'carry') problems.push('The tube from Experiment ' + d.num + ' is still at ' + (L.STATIONS[e.tube.where] ? L.STATIONS[e.tube.where].name : 'its bench') + '.');
      else if (e.tube.washStage < 4) problems.push('The tube from Experiment ' + d.num + ' has not been washed and drained.');
    });
    if (problems.length) {
      return Safety.tech({
        id: 'return-incomplete', cat: 'cleanup', points: 2, rule: 'cleanup',
        title: 'Equipment not ready to return',
        action: 'The technician will not accept the rack yet: ' + problems.join(' '),
        consequence: 'Equipment left scattered or dirty becomes a hazard and a contamination risk for the next class.',
        fix: 'Collect every tube in the carrying rack, wash them at the sink, then return the rack.', modal: true
      });
    }
    c.returned = true;
    liveTubes().forEach(function (e) { e.tube.loc = 'returned'; e.tube.where = 'tech'; });
    L.Score.good('returned', 'Returned clean equipment to the technician', 'cleanup', 2);
    UI.toast('Rack, holders and pipettes returned to the technician.', 'good');
  }

  Cleanup.act = function (name, el) {
    var c = S().cleanup;
    if (name === 'c-return') return giveBack();
    if (!Safety.canAct()) return;
    if (name === 'c-pickup') {
      var exp = L.exp(el.dataset.v);
      if (!Safety.requireGloves('handle used test tubes')) return;
      if (exp.tube.temp >= 45) return L.Exp.burn(exp, 'pick up the tube');
      exp.tube.loc = 'hand';
      UI.toast('Holding a loose tube. Put it in the carrying rack before you walk anywhere.', 'info');
      return;
    }
    if (name === 'c-wipe') {
      var st = el.dataset.v;
      if (!Safety.requireGloves('wipe the bench with disinfectant')) return;
      var left = S().exps.filter(function (e) { return e.tube.where === st && ['rack', 'hand', 'holder'].indexOf(e.tube.loc) !== -1; });
      if (left.length) { UI.toast('Clear the equipment from the bench first — move the tube to your carrying rack.', 'info'); return; }
      var b = S().burners[st];
      if (b && b.lit) {
        return Safety.flag({ id: 'wipe-lit', rule: 'burner', cat: 'cleanup', severity: 'major', title: 'Disinfectant near a lit burner',
          action: 'You started wiping the bench with alcohol-based disinfectant while the burner was still lit.',
          consequence: 'Alcohol vapour and soaked wipes are flammable — the flame can ignite them and your sleeve.',
          fix: 'Turn off the burner first, then wipe the bench.' });
      }
      c.wiped[st] = true;
      L.Score.good('wipe-' + st, 'Cleaned ' + L.STATIONS[st].name, 'cleanup');
      return;
    }
    if (name === 'c-wash') {
      var e2 = L.exp(el.dataset.v), i = +el.dataset.i, t = e2.tube;
      if (!Safety.requireGloves('wash used test tubes')) return;
      if (t.temp >= 45) {
        L.Score.violation({ id: 'thermal-shock', rule: 'hot_glass', cat: 'cleanup', severity: 'minor', title: 'Cold water on hot glass',
          action: 'You ran cold water into a tube that was still hot.', consequence: 'Sudden cooling cracks glass (thermal shock).' });
        return L.Incident.breakTube(e2, 'thermal');
      }
      if (i !== t.washStage) {
        return Safety.tech({ id: 'wash-order', cat: 'cleanup', points: 1, title: 'Washing steps out of order',
          action: 'You tried to "' + WASH[i].label.toLowerCase() + '" before "' + WASH[t.washStage].label.toLowerCase() + '".',
          consequence: 'Glassware is emptied first, then scrubbed, then rinsed (tap then distilled water) and finally drained — otherwise residues remain and contaminate the next experiment.',
          fix: 'Follow the washing steps in order.' });
      }
      t.washStage++;
      if (t.washStage === 1) t.contents = {};
      if (t.washStage === 4) L.Score.good('washed-' + e2.id, 'Washed a test tube following the protocol', 'cleanup');
      return;
    }
    if (name === 'c-gloves') {
      var pending = Cleanup.tasks().filter(function (t) { return !t.done && t.id !== 'hands' && t.id !== 'path'; });
      var doIt = function () { c.glovesOff = true; S().ppe.gloves = false; UI.toast('Gloves removed by peeling them inside-out into the clinical waste bin.', 'good'); L.requestRender(); };
      if (pending.length) {
        UI.modal({ title: 'Remove gloves now?', body: '<p>You still have cleanup tasks that involve handling used glassware or disinfectant:</p><ul>' +
          pending.map(function (p) { return '<li>' + p.text + '</li>'; }).join('') + '</ul><p>Gloves should be removed as the <strong>last</strong> step.</p>',
          buttons: [{ label: 'Keep gloves on', cls: 'primary' }, { label: 'Remove anyway', onClick: doIt }] });
        return;
      }
      doIt();
      return;
    }
    if (name === 'c-hands') {
      if (S().ppe.gloves) { UI.toast('Remove your gloves first, then wash your hands.', 'info'); return; }
      c.handsWashed = true;
      L.Score.good('hands', 'Washed hands before leaving', 'cleanup');
      UI.toast('Hands washed with soap and water.', 'good');
    }
  };

  Cleanup.stool = function () {
    if (S().cleanup.stool === 'stowed') return;
    UI.choice({
      title: 'Stool in the exit aisle', prompt: 'A lab stool has been left in the middle of the main aisle leading to the emergency exit.',
      options: [
        { label: 'Push it fully under the bench', value: 'stow' },
        { label: 'Leave it — someone else will move it', value: 'leave' }
      ],
      onPick: function (v) {
        if (v === 'stow') {
          S().cleanup.stool = 'stowed';
          L.Score.good('stool', 'Cleared an obstruction from the exit pathway', 'cleanup', 2);
          UI.toast('Aisle clear — the evacuation route is free.', 'good');
        } else {
          Safety.flag({ id: 'stool', rule: 'pathways', cat: 'cleanup', severity: 'minor', title: 'Exit pathway obstructed',
            action: 'You left a stool in the main aisle that leads to the emergency exit.',
            consequence: 'In an emergency evacuation (fire, gas leak, chemical spill) people trip over obstacles in smoke or in a hurry.',
            fix: 'Push the stool under the bench to keep the pathway clear.' });
        }
        L.requestRender();
      }
    });
  };

  Cleanup.finish = function () {
    var missing = Cleanup.tasks().filter(function (t) { return !t.done; });
    if (missing.length) {
      L.Score.technique({ id: 'leave-early', cat: 'cleanup', points: 2, rule: 'cleanup', title: 'Tried to leave before cleanup was complete',
        action: missing.length + ' cleanup task(s) still open.' });
      UI.modal({ title: '🚫 You cannot sign out yet', body: '<p>Complete these cleanup tasks first:</p><ul>' +
        missing.map(function (m) { return '<li>' + m.text + '</li>'; }).join('') + '</ul>', buttons: [{ label: 'OK', cls: 'primary' }] });
      return;
    }
    S().phase = 'report';
    S().endedAt = Date.now();
    S().endReason = 'complete';
    L.Report.show();
  };
})(window.Lab);
