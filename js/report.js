/* =========================================================================
   report.js — end-of-lab performance report.
   ========================================================================= */
(function (L) {
  'use strict';

  var Report = L.Report = {};
  var UI = L.UI;

  function fmtTime(ms) {
    var m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m + ' min ' + s + ' s';
  }

  Report.status = function () {
    var S = L.S, overall = L.Score.overall();
    var crit = S.violations.filter(function (v) { return v.severity === 'critical'; }).length;
    if (S.endReason !== 'complete') return { cls: 'inc', text: 'Incomplete — session ended before the practical and cleanup were finished' };
    if (S.scores.safety < 60 || crit >= 3) return { cls: 'fail', text: 'Completed — safety revision required before the next practical' };
    if (overall >= 70) return { cls: 'pass', text: 'Completed — competent' };
    return { cls: 'warn', text: 'Completed — further practice recommended' };
  };

  Report.html = function () {
    var S = L.S, sc = L.scenario(), interp = L.Score.interpretation();
    var st = Report.status();
    var bySev = { minor: 0, major: 0, critical: 0 };
    S.violations.forEach(function (v) { bySev[v.severity]++; });

    var cats = Object.keys(L.CATEGORIES).map(function (k) {
      var c = S.cat[k] || { errors: 0, good: 0 };
      var stt = c.errors === 0 ? (c.good ? 'good' : 'na') : (c.errors <= 1 ? 'ok' : 'bad');
      return '<tr class="r-' + stt + '"><td>' + L.CATEGORIES[k] + '</td><td>' + c.good + '</td><td>' + c.errors + '</td><td>' +
        ({ good: '✔ Good', ok: '△ Minor issues', bad: '✘ Needs revision', na: '—' })[stt] + '</td></tr>';
    }).join('');

    var exps = S.exps.map(function (e) {
      var d = L.expDef(e.id);
      var expected = {
        albumin: sc.albumin ? 'Protein coagulation — albumin possibly present' : 'No coagulation — albumin not detected',
        benedict: L.BENEDICT_COLOURS[sc.glucose].name + ' — ' + L.BENEDICT_COLOURS[sc.glucose].meaning.toLowerCase(),
        rothera: sc.ketones ? 'Purple ring — ketone bodies present' : 'No ring — ketone bodies not detected',
        hay: sc.bile ? 'Sulfur sank — bile salts possibly present' : 'Sulfur floated — bile salts not detected'
      }[e.id];
      return '<tr><td>' + d.num + '. ' + d.title + '</td><td>' + (e.done ? '✔' : '✘') + '</td><td>' + expected + '</td><td>' +
        (e.quiz ? e.quiz.correct + ' / ' + e.quiz.total : '—') + '</td><td>' + e.resets + '</td></tr>';
    }).join('');

    var errors = S.violations.concat(S.techErrors).sort(function (a, b) { return a.t - b.t; });
    var errRows = errors.length ? errors.map(function (e) {
      return '<tr class="sev-' + e.severity + '"><td>' + new Date(e.t).toLocaleTimeString() + '</td><td>' +
        (e.type === 'violation' ? e.severity.toUpperCase() + ' safety' : 'Procedure') + '</td><td><strong>' + UI.esc(e.title) + '</strong><br><small>' + UI.esc(e.action || '') + '</small></td><td>−' + e.pts + '</td></tr>';
    }).join('') : '<tr><td colspan="4">No errors recorded — excellent!</td></tr>';

    var rules = Object.keys(S.ruleHits).sort(function (a, b) { return S.ruleHits[b] - S.ruleHits[a]; });
    var ruleList = rules.length ? '<ul class="rules">' + rules.map(function (r) {
      return '<li><strong>' + L.RULES[r] + '</strong> <span class="cnt">(' + S.ruleHits[r] + '×)</span></li>';
    }).join('') + '</ul>' : '<p>No safety rules require revision.</p>';

    var breaks = S.breakages.length ? '<ul>' + S.breakages.map(function (b) {
      return '<li>Tube broke (' + ({ dropped: 'dropped', 'burn-drop': 'dropped after a burn', thermal: 'thermal shock' })[b.cause] + ') — ' +
        (b.reported ? '<span class="good">reported to the TA</span>' : '<span class="bad">not reported</span>') +
        (b.wrong.length ? ', <span class="bad">' + b.wrong.length + ' unsafe response(s): ' + b.wrong.join(', ') + '</span>' : ', correct response') + '</li>';
    }).join('') + '</ul>' : '<p>No breakages occurred.</p>';

    var good = S.safeActs.length ? '<ul class="good-list">' + S.safeActs.map(function (g) { return '<li>✔ ' + UI.esc(g.msg) + '</li>'; }).join('') + '</ul>' : '<p>—</p>';

    return '<div class="report">' +
      '<header class="rep-head"><div><h1>End-of-lab report</h1><p>Biochemistry 2 · Qualitative detection of abnormal constituents in urine</p>' +
      '<p>Simulated case: <strong>' + sc.code + ' — ' + sc.name + '</strong>' + (S.scenarioHidden ? ' (unknown sample, revealed)' : '') + '<br><small>' + sc.history + '</small></p>' +
      '<p><small>Date: ' + new Date().toLocaleString() + ' · Time in lab: ' + fmtTime((S.endedAt || Date.now()) - S.startedAt) + ' (time is not scored)</small></p></div>' +
      '<div class="final"><div class="big">' + L.Score.overall() + '</div><div>Final score</div></div></header>' +
      '<div class="status ' + st.cls + '">' + st.text + '</div>' +
      '<div class="score-cards">' +
      '<div class="sc"><span>Safety compliance</span><strong>' + S.scores.safety + '%</strong><small>' + bySev.critical + ' critical · ' + bySev.major + ' major · ' + bySev.minor + ' minor</small></div>' +
      '<div class="sc"><span>Procedural accuracy</span><strong>' + S.scores.technique + '%</strong><small>' + S.techErrors.length + ' procedure error(s)</small></div>' +
      '<div class="sc"><span>Interpretation</span><strong>' + interp.pct + '%</strong><small>' + interp.correct + ' / ' + interp.max + ' correct</small></div>' +
      '</div><p class="tiny">Final score = 40% safety + 35% procedure + 25% interpretation. Speed is never rewarded.</p>' +
      '<h2>Experiments</h2><table><thead><tr><th>Test</th><th>Done</th><th>Expected observation (simulated)</th><th>Interpretation</th><th>Resets</th></tr></thead><tbody>' + exps + '</tbody></table>' +
      '<h2>Performance by category</h2><table><thead><tr><th>Category</th><th>Correct actions</th><th>Errors</th><th>Status</th></tr></thead><tbody>' + cats + '</tbody></table>' +
      '<h2>Safety rules requiring revision</h2>' + ruleList +
      '<h2>Broken glassware response</h2>' + breaks +
      '<h2>Errors made</h2><table class="errs"><thead><tr><th>Time</th><th>Type</th><th>What happened</th><th>Points</th></tr></thead><tbody>' + errRows + '</tbody></table>' +
      '<h2>Safe actions recognised</h2>' + good +
      '<p class="tiny">All reactions, boiling, splashing and injuries in this virtual laboratory are simulated for teaching purposes. No real chemical analysis is performed.</p>' +
      '<div class="rep-btns no-print"><button class="btn" data-act="print">🖨 Print / save as PDF</button><button class="btn primary" data-act="restart">↻ Start a new session</button></div>' +
      '</div>';
  };

  Report.show = function () {
    var root = document.getElementById('intro-root');
    root.innerHTML = '<div class="overlay report-overlay">' + Report.html() + '</div>';
    document.getElementById('toast-root').innerHTML = '';
    document.getElementById('modal-root').innerHTML = '';
    root.querySelector('.overlay').scrollTop = 0;
    L.requestRender();
  };
})(window.Lab);
