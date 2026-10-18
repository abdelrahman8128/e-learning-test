/* =========================================================================
   incidents.js — broken glassware: stop, do not touch, do not conceal,
   keep clear, report to the TA, wait for authorised cleanup and clearance.
   ========================================================================= */
(function (L) {
  'use strict';

  var Incident = L.Incident = {};
  var UI = L.UI;
  var CLEAN_MS = 4500;

  var CAUSE = {
    dropped: 'The test tube slipped from your grip and shattered on the floor.',
    'burn-drop': 'You let go of the hot tube — it fell and shattered.',
    thermal: 'Cold water hit the hot glass: the tube cracked from thermal shock and broke in the sink.'
  };

  Incident.breakTube = function (exp, cause) {
    var S = L.S;
    if (S.incident && S.incident.stage !== 'cleared') return;
    if (L.Exp.Heating.H && L.Exp.Heating.isRunning()) L.Exp.Heating.stop(false);
    exp.tube.loc = 'broken';
    exp.tube.contents = {};
    if (cause === 'dropped') {
      L.Score.violation({
        id: 'dropped-tube', rule: 'glassware', cat: 'handling', severity: 'minor',
        title: 'Glassware dropped',
        action: 'You released the test tube outside the rack, holder or workstation and it fell.',
        consequence: 'Broken glass causes cuts and the spilled urine is a biological hazard.'
      });
    }
    var rec = { cause: cause, expId: exp.id, station: S.station, reported: false, wrong: [], at: Date.now(), phase: S.phase };
    S.breakages.push(rec);
    S.incident = { stage: 'broken', expId: exp.id, station: S.station, rec: rec, cause: cause, phaseAtBreak: S.phase };
    L.Score.info('Broken glassware', CAUSE[cause] || 'A test tube broke.');
    L.requestRender();
  };

  /* ------------------------------------------------------------------ */
  /* Decision questions. Options are shown in random order and with      */
  /* identical styling, so nothing reveals the correct answer.           */
  /* ------------------------------------------------------------------ */
  var QUESTIONS = {
    report: {
      prompt: 'A test tube has just broken. What should you do next?',
      options: [
        { v: 'report', correct: true,
          label: 'Stop, keep away from the broken glass and report the incident to a laboratory TA.',
          fb: 'Correct. Stopping, keeping clear and reporting immediately protects you and everyone nearby. Only authorised staff clean up broken glass and urine spills.' },
        { v: 'pickup', label: 'Pick up the broken glass carefully with your gloved hands.',
          v2: { id: 'glass-pickup', rule: 'broken_touch', title: 'Picking up broken glass',
            consequence: 'Glass fragments cut through gloves easily, and the cut is contaminated with urine — a route for infection. Only authorised staff with a brush, dustpan and broken-glass bin clean breakages.' } },
        { v: 'continue', label: 'Continue the experiment and deal with the glass at the end of the session.',
          v2: { id: 'glass-continue', rule: 'broken_conceal', title: 'Continuing next to broken glass',
            consequence: 'Working beside broken glass exposes you and others to cuts, the spill spreads, and nobody responsible knows the hazard is there.' } },
        { v: 'clean', label: 'Clean the area yourself with paper towels without informing anyone.',
          v2: { id: 'glass-hide', rule: 'broken_conceal', title: 'Cleaning up without reporting',
            consequence: 'Handling the glass risks cuts, paper towels do not disinfect a urine spill, and an unreported incident cannot be checked or recorded. Concealing an incident is a serious breach of laboratory rules.' } }
      ]
    },
    clear: {
      prompt: 'The TA has acknowledged your report. What do you do now?',
      options: [
        { v: 'wait', correct: true,
          label: 'Stay clear of the affected area and wait for the TA\'s clearance before continuing.',
          fb: 'Correct. The area stays out of bounds until authorised staff have removed the glass, disinfected the spill and cleared it.' },
        { v: 'help', label: 'Help the technician by picking up the large pieces of glass.',
          v2: { id: 'glass-help', rule: 'broken_touch', title: 'Handling broken glass to help',
            consequence: 'Even with good intentions, untrained handling causes cuts and contamination. The technician has the right tools and the broken-glass bin.' } },
        { v: 'resume', label: 'Return to your bench and carry on working around the glass.',
          v2: { id: 'glass-resume', rule: 'broken_conceal', title: 'Working in the affected area',
            consequence: 'The area must be cleared before anyone works there — you could kneel or lean on fragments and spread the spill.' } },
        { v: 'mop', label: 'Wipe up the spilled urine yourself to speed things up.',
          v2: { id: 'glass-mop', rule: 'broken_touch', title: 'Cleaning the spill yourself',
            consequence: 'The spill contains hidden glass fragments and potentially infectious urine. It must be cleaned and disinfected by authorised staff.' } }
      ]
    }
  };

  function shuffled(n) {
    var a = []; for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }

  function questionHTML(inc, key) {
    var q = QUESTIONS[key];
    if (!inc.order) inc.order = {};
    if (!inc.order[key]) inc.order[key] = shuffled(q.options.length);
    var fb = inc.fb && inc.fb.q === key ? inc.fb : null;
    var h = '<fieldset class="inc-q"><legend>' + q.prompt + '</legend><div class="inc-opts">' +
      inc.order[key].map(function (i) {
        var o = q.options[i];
        return '<button type="button" class="inc-opt" data-act="inc-choice" data-q="' + key + '" data-v="' + o.v + '">' + UI.esc(o.label) + '</button>';
      }).join('') + '</div></fieldset>';
    if (fb) {
      h += '<div class="inc-fb" role="status"><p><strong>' + (fb.correct ? 'Correct answer.' : 'Not safe — try again.') + '</strong> ' + UI.esc(fb.text) + '</p>' +
        (fb.correct ? '<button type="button" class="inc-opt inc-next" data-act="inc-next" data-q="' + key + '">Continue</button>' : '') + '</div>';
    }
    return h;
  }

  /** Overlay rendered on top of the station view while an incident is active. */
  Incident.overlay = function () {
    var inc = L.S.incident;
    if (!inc || inc.station !== L.S.station) return '';
    var shards = '<svg class="shards" viewBox="0 0 220 90" aria-hidden="true">' +
      (inc.stage === 'cleared' ? '' :
        '<ellipse cx="110" cy="70" rx="90" ry="14" fill="#f1cf5b" opacity=".45"/>' +
        [[60, 60, 20], [90, 72, -30], [120, 58, 50], [150, 70, 10], [100, 50, 80], [140, 52, -60], [75, 48, 35]].map(function (p, i) {
          return '<polygon class="shard" style="animation-delay:' + (i * 40) + 'ms" points="' + p[0] + ',' + p[1] + ' ' + (p[0] + 16) + ',' + (p[1] - 10) + ' ' + (p[0] + 7) + ',' + (p[1] + 13) + '" fill="#dbe9f3" stroke="#5c7184" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"/>';
        }).join('')) +
      '</svg>';

    var html = '<div class="incident-overlay stage-' + inc.stage + '" role="alertdialog" aria-label="Broken glassware incident"><div class="incident-card">';
    if (inc.stage === 'broken') {
      html += '<h2>💥 Broken glassware</h2>' + shards +
        '<p><strong>' + (CAUSE[inc.cause] || 'A test tube broke.') + '</strong> Your experiment is paused.</p>' +
        questionHTML(inc, 'report');
    } else if (inc.stage === 'reported') {
      html += '<h2>👩‍🔬 Lab TA</h2>' + shards +
        '<blockquote>“Thank you for telling me. I\'ve noted the incident and the technician is on the way with a brush, dustpan and the broken-glass bin.”</blockquote>' +
        questionHTML(inc, 'clear');
    } else if (inc.stage === 'waiting') {
      var pct = Math.min(100, Math.round(100 * (Date.now() - inc.waitStart) / CLEAN_MS));
      html += '<h2>🧹 Authorised cleanup in progress</h2>' +
        '<div class="cleaning"><span class="tech">🧑‍🔧</span><span class="broom">🧹</span></div>' +
        '<p>The technician is removing the glass and disinfecting the spill. You are standing clear and waiting for clearance.</p>' +
        '<div class="meter"><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    } else if (inc.stage === 'cleared') {
      html += '<h2>✅ Area cleared</h2>' +
        '<blockquote>“The area is clean and safe. ' + (inc.phaseAtBreak === 'cleanup' ? 'The broken tube has been disposed of — continue with the rest of the cleanup.' : 'Collect a fresh test tube from the rack and start this experiment again from the beginning.') + ' Well done for reporting it.”</blockquote>' +
        '<div class="inc-btns"><button class="btn primary big" data-act="inc-resume">Resume work</button></div>';
    }
    return html + '</div></div>';
  };

  function choose(key, v) {
    var inc = L.S.incident;
    var expected = key === 'report' ? 'broken' : 'reported';
    if (inc.stage !== expected) return;
    var o = QUESTIONS[key].options.filter(function (x) { return x.v === v; })[0];
    if (!o) return;
    if (o.correct) {
      inc.fb = { q: key, correct: true, text: o.fb };
      if (key === 'report') {
        inc.rec.reported = true;
        L.Score.good('report-' + inc.rec.at, 'Reported the broken glassware to the TA immediately', 'breakage', 3);
      } else {
        L.Score.good('stepback-' + inc.rec.at, 'Kept clear of the affected area until cleared', 'breakage', 1);
      }
      return;
    }
    inc.rec.wrong.push(v);
    var e = L.Score.violation({
      id: o.v2.id, rule: o.v2.rule, cat: 'breakage', severity: 'critical', title: o.v2.title,
      action: 'You chose: “' + o.label + '”', consequence: o.v2.consequence
    });
    inc.fb = { q: key, correct: false, text: o.v2.consequence + (e ? ' (−' + e.pts + ' safety points)' : '') };
  }

  Incident.act = function (name, el) {
    var inc = L.S.incident;
    if (!inc) return;
    switch (name) {
      case 'inc-choice':
        choose(el.dataset.q, el.dataset.v);
        break;
      case 'inc-next':
        if (!inc.fb || !inc.fb.correct) return;
        if (inc.fb.q === 'report' && inc.stage === 'broken') { inc.stage = 'reported'; inc.fb = null; }
        else if (inc.fb.q === 'clear' && inc.stage === 'reported') { inc.stage = 'waiting'; inc.waitStart = Date.now(); inc.fb = null; }
        break;
      case 'inc-resume':
        if (inc.stage !== 'cleared') return;
        var exp = L.exp(inc.expId);
        L.S.incident = null;
        if (inc.phaseAtBreak === 'cleanup') {
          exp.tube.loc = 'disposed';
          exp.tube.where = null;
        } else {
          L.Exp.reset(true);
          L.UI.toast('Fresh tube issued. Restart Experiment ' + L.expDef(exp.id).num + ' from the first step.', 'info');
        }
        break;
    }
    L.requestRender();
  };

  Incident.tick = function () {
    var inc = L.S && L.S.incident;
    if (!inc) return;
    if (!inc.phaseAtBreak) inc.phaseAtBreak = inc.rec.phase;
    if (inc.stage === 'waiting') {
      var bar = document.querySelector('.incident-overlay .bar i');
      var pct = Math.min(100, Math.round(100 * (Date.now() - inc.waitStart) / CLEAN_MS));
      if (bar) bar.style.width = pct + '%';
      if (Date.now() - inc.waitStart >= CLEAN_MS) { inc.stage = 'cleared'; L.requestRender(); }
    }
  };
})(window.Lab);
