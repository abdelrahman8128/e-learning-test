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
      (inc.stage === 'broken' || inc.stage === 'reported' ? '<text x="110" y="20" text-anchor="middle" font-size="12" fill="#b03a2e" font-weight="700">⚠ BROKEN GLASS — KEEP CLEAR</text>' : '') +
      '</svg>';

    var html = '<div class="incident-overlay stage-' + inc.stage + '" role="alertdialog" aria-label="Broken glassware incident"><div class="incident-card">';
    if (inc.stage === 'broken') {
      html += '<h2>💥 Safety incident — broken glassware</h2>' + shards +
        '<p><strong>' + (CAUSE[inc.cause] || 'A test tube broke.') + '</strong> Your experiment is paused.</p>' +
        '<ul class="inc-rules"><li>Stop what you are doing.</li><li>Do not pick up the glass or clean the spill.</li><li>Do not hide it.</li><li>Keep away from the area.</li><li>Report it to a laboratory TA and wait for instructions.</li></ul>' +
        '<div class="inc-btns"><button class="btn primary big" data-act="inc-report">📣 Report to Lab TA</button>' +
        '<button class="btn" data-act="inc-pickup">Pick up the broken glass</button>' +
        '<button class="btn" data-act="inc-hide">Sweep the pieces under the bench</button>' +
        '<button class="btn" data-act="inc-continue">Carry on working here</button></div>';
    } else if (inc.stage === 'reported') {
      html += '<h2>👩‍🔬 Lab TA</h2>' + shards +
        '<blockquote>“Thank you for reporting it straight away — that\'s exactly right. Don\'t touch anything. Please step back from the bench and keep clear of the area. The technician will clean it up with a brush and dustpan, dispose of the glass in the broken-glass bin and disinfect the urine spill.”</blockquote>' +
        '<div class="inc-btns"><button class="btn primary big" data-act="inc-stepback">↩ Step back and keep clear</button>' +
        '<button class="btn" data-act="inc-pickup">Pick up the large pieces to help</button>' +
        '<button class="btn" data-act="inc-continue">Carry on working at the bench</button></div>';
    } else if (inc.stage === 'waiting') {
      var pct = Math.min(100, Math.round(100 * (Date.now() - inc.waitStart) / CLEAN_MS));
      html += '<h2>🧹 Authorised cleanup in progress</h2>' +
        '<div class="cleaning"><span class="tech">🧑‍🔧</span><span class="broom">🧹</span></div>' +
        '<p>The technician is removing the glass and disinfecting the spill. Stay clear and wait for clearance.</p>' +
        '<div class="meter"><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="inc-btns"><button class="btn" disabled>⏳ Waiting for clearance…</button>' +
        '<button class="btn" data-act="inc-continue">Start working again now</button></div>';
    } else if (inc.stage === 'cleared') {
      html += '<h2>✅ Area cleared</h2>' +
        '<blockquote>“The area is clean and safe. ' + (inc.phaseAtBreak === 'cleanup' ? 'The broken tube has been disposed of — continue with the rest of the cleanup.' : 'Collect a fresh test tube from the rack and start this experiment again from the beginning.') + ' Well done for reporting it.”</blockquote>' +
        '<div class="inc-btns"><button class="btn primary big" data-act="inc-resume">Resume work</button></div>';
    }
    return html + '</div></div>';
  };

  function wrong(kind) {
    var inc = L.S.incident;
    inc.rec.wrong.push(kind);
    var V = {
      pickup: { id: 'glass-pickup', rule: 'broken_touch', title: 'Picking up broken glass — stop!',
        action: 'You tried to pick up the broken glass yourself.',
        consequence: 'Glass fragments cut through gloves easily, and the cut is contaminated with urine — a route for infection. Only authorised staff with a brush, dustpan and sharps/glass bin clean breakages.',
        fix: inc.stage === 'broken' ? 'Leave the glass where it is and report to the Lab TA.' : 'Step back and let the technician clean it.' },
      hide: { id: 'glass-hide', rule: 'broken_conceal', title: 'Concealing a breakage',
        action: 'You tried to sweep the broken glass under the bench to hide it.',
        consequence: 'Hidden glass and urine remain a hazard for the next class and the cleaning staff, and the spill is never disinfected. Concealing an incident is a serious breach of laboratory rules.',
        fix: 'Report the breakage to the Lab TA now.' },
      'continue': { id: 'glass-continue', rule: 'broken_conceal', title: 'Working in the affected area',
        action: 'You tried to continue working next to the broken glass' + (inc.stage === 'broken' ? ' without reporting it.' : ' before the area was cleared.'),
        consequence: 'Leaning on or kneeling near the bench exposes you to cuts, and you may spread the contaminated spill. The area must be cleared before anyone works there.',
        fix: inc.stage === 'broken' ? 'Stop, keep clear and report to the Lab TA.' : 'Keep clear and wait for the TA\'s clearance.' }
    }[kind];
    V.cat = 'breakage'; V.severity = 'critical';
    L.Safety.flag(V);
  }

  Incident.act = function (name) {
    var inc = L.S.incident;
    if (!inc) return;
    switch (name) {
      case 'inc-report':
        if (inc.stage !== 'broken') return;
        inc.stage = 'reported'; inc.rec.reported = true;
        L.Score.good('report-' + inc.rec.at, 'Reported the broken glassware to the TA immediately', 'breakage', 3);
        break;
      case 'inc-stepback':
        inc.stage = 'waiting'; inc.waitStart = Date.now();
        L.Score.good('stepback-' + inc.rec.at, 'Kept clear of the affected area', 'breakage', 1);
        break;
      case 'inc-pickup': return wrong('pickup');
      case 'inc-hide': return wrong('hide');
      case 'inc-continue': return wrong('continue');
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
