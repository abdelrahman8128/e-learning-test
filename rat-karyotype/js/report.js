/* =========================================================================
   report.js — performance report for a lab in one mode: total score, stage scores,
   category scores, incorrect actions, missed steps, revision areas, recommendations.
   Reaching the last step never gives full marks: every score comes from the recorded
   errors, safety issues and instrument-selection mistakes.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL;
  const pct = x => Math.round(100 * x);

  function build(stage, mode, defs) {
    const S = KL.Store, d = S.d(stage, mode), steps = defs[stage].filter(x => !x.checkpoint);
    const rec = n => d.steps[n] && d.steps[n].done ? d.steps[n] : null;
    const rows = steps.map(x => { const r = rec(x.n); return { n: x.n, title: x.title, done: !!r, failed: !!(r && r.failed), score: r ? r.score || 0 : 0, errors: r ? r.errors || 0 : 0, safety: r ? r.safety || 0 : 0, toolErrors: r ? r.toolErrors || 0 : 0 }; });
    const cp = stage === 'lab7' ? d.checkpoint : null;
    const scoreOfStep = n => { const r = rows.filter(x => x.n === n)[0]; return r ? r.score : 0; };
    const cats = (KL.CATEGORIES[stage] || []).map(([name, src]) => {
      let vals = [];
      if (src === 'tools') vals = rows.filter(r => r.done).map(r => { const rr = d.steps[r.n]; return rr.toolScore == null ? 1 : rr.toolScore; });
      else src.forEach(k => { if (k === 'checkpoint') { if (cp) vals.push(cp.passed ? (cp.score || 0) : 0); } else vals.push(scoreOfStep(k)); });
      const missing = (src === 'tools' ? rows.filter(r => !r.done).length : 0);
      const total = vals.length + missing;
      return { name, pct: total ? pct(vals.reduce((a, b) => a + b, 0) / total) : 0 };
    });
    const n = steps.length + (cp ? 1 : 0);
    const sum = rows.reduce((a, r) => a + r.score, 0) + (cp && cp.passed ? cp.score || 0 : 0);
    const total = n ? pct(sum / n) : 0;
    const incorrect = rows.filter(r => r.errors || r.safety || r.toolErrors).map(r => ({ n: r.n, title: r.title, errors: r.errors, safety: r.safety, toolErrors: r.toolErrors }));
    const missed = rows.filter(r => !r.done || r.failed).map(r => ({ n: r.n, title: r.title, why: r.failed ? 'stopped after too many incorrect attempts' : 'not completed' }));
    const revision = cats.filter(c => c.pct < 70).map(c => c.name);
    const rec2 = [];
    if (!revision.length) rec2.push('Strong performance in every category. Keep practising to stay fluent.');
    revision.forEach(c => rec2.push('Revise “' + c + '” in Guided Revision, then retry it.'));
    if (incorrect.some(i => i.safety)) rec2.push('Review the safety and ethics notes — at least one unsafe or unethical choice was made.');
    if (incorrect.some(i => i.toolErrors)) rec2.push('Review which instruments and reagents each step needs.');
    if (missed.length) rec2.push('Repeat the steps that were not completed or failed: ' + missed.map(m => m.n).join(', ') + '.');
    return { stage, mode, total, rows, cats, incorrect, missed, revision, recommendations: rec2, checkpoint: cp ? { passed: cp.passed, score: pct(cp.score || 0) } : null };
  }

  function html(r, esc) {
    esc = esc || KL.UI.esc;
    const bar = p => '<div class="rbar"><i style="width:' + p + '%"></i></div>';
    return '<div class="report">' +
      '<div class="stat-row"><div class="stat"><strong class="rep-total">' + r.total + '%</strong><span>total score</span></div><div class="stat"><strong>' + r.rows.filter(x => x.done).length + ' / ' + r.rows.length + '</strong><span>stages completed</span></div><div class="stat"><strong>' + r.incorrect.length + '</strong><span>stages with incorrect actions</span></div></div>' +
      '<h3>Score by category</h3><table class="ctab rep-cats"><tbody>' + r.cats.map(c => '<tr><th>' + esc(c.name) + '</th><td>' + c.pct + '%</td><td>' + bar(c.pct) + '</td></tr>').join('') + '</tbody></table>' +
      '<h3>Stage scores</h3><div class="tscroll"><table class="ctab"><thead><tr><th>#</th><th>Stage</th><th>Score</th><th>Incorrect</th></tr></thead><tbody>' + r.rows.map(x => '<tr><td>' + x.n + '</td><td>' + esc(x.title) + '</td><td>' + (x.done ? pct(x.score) + '%' : '—') + '</td><td>' + (x.errors + x.safety + x.toolErrors) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<h3>Incorrect actions</h3>' + (r.incorrect.length ? '<ul class="rep-inc">' + r.incorrect.map(i => '<li>Step ' + i.n + ' — ' + esc(i.title) + ': ' + [i.errors ? i.errors + ' incorrect answer' + (i.errors > 1 ? 's' : '') : '', i.safety ? i.safety + ' safety/ethics issue' + (i.safety > 1 ? 's' : '') : '', i.toolErrors ? i.toolErrors + ' wrong instrument selection' + (i.toolErrors > 1 ? 's' : '') : ''].filter(Boolean).join(', ') + '</li>').join('') + '</ul>' : '<p>None recorded.</p>') +
      '<h3>Missed steps</h3>' + (r.missed.length ? '<ul class="rep-miss">' + r.missed.map(m => '<li>Step ' + m.n + ' — ' + esc(m.title) + ' (' + m.why + ')</li>').join('') + '</ul>' : '<p>None.</p>') +
      '<h3>Areas for revision</h3>' + (r.revision.length ? '<ul class="rep-rev">' + r.revision.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' : '<p>No category below 70%.</p>') +
      '<h3>Recommendations</h3><ul class="rep-rec">' + r.recommendations.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul></div>';
  }

  KL.Report = { build, html };
})();
