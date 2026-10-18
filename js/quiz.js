/* =========================================================================
   quiz.js — result interpretation questions. Correct answers are derived
   from the simulated case, so interpretation must match what was observed.
   ========================================================================= */
(function (L) {
  'use strict';

  var Quiz = L.Quiz = {};
  var UI = L.UI;

  function rotate(arr, n) { n = n % arr.length; return arr.slice(n).concat(arr.slice(0, n)); }

  Quiz.count = function () { return 3; };

  Quiz.build = function (expId) {
    var s = L.scenario();
    if (expId === 'albumin') {
      return [
        { q: 'What did you observe in the heated upper part of the tube (compared with the unheated lower part)?',
          options: [
            { v: 'coag', label: 'Protein coagulation — white, cloudy coagulated masses formed on heating' },
            { v: 'clear', label: 'No coagulation — the heated part stayed clear, like the lower part' },
            { v: 'red', label: 'The urine turned brick-red' },
            { v: 'ring', label: 'A purple ring formed at the top of the urine' }
          ], correct: s.albumin ? 'coag' : 'clear',
          explain: s.albumin ? 'Heat denatured the albumin, which coagulated into white masses in the heated part.' : 'No protein coagulated: the heated part looked the same as the unheated lower part.' },
        { q: 'What is your interpretation?',
          options: [
            { v: 'pos', label: 'Protein coagulation indicates the possible presence of albumin (proteinuria)' },
            { v: 'neg', label: 'No coagulation — albumin was not detected' },
            { v: 'glu', label: 'Glucose is present in the urine' }
          ], correct: s.albumin ? 'pos' : 'neg',
          explain: s.albumin ? 'Visible protein coagulation on heating indicates the possible presence of albumin.' : 'Without coagulation, albumin was not detected by this test.' },
        { q: 'Which statement about the heat test is correct?',
          options: rotate([
            { v: 'qual', label: 'It is qualitative: it indicates whether albumin is present, not its concentration' },
            { v: 'quant', label: 'The amount of coagulation gives the exact albumin concentration in g/L' },
            { v: 'reag', label: 'A reagent must be added before heating for coagulation to occur' }
          ], 1), correct: 'qual',
          explain: 'The heat test is qualitative and uses heat alone. Quantification needs a dedicated method (e.g. urine protein:creatinine ratio).' }
      ];
    }
    if (expId === 'benedict') {
      var lvl = s.glucose;
      var interp = lvl === 0 ? 'neg' : lvl === 1 ? 'low' : lvl === 4 ? 'high' : 'mid';
      return [
        { q: 'What colour did you observe after boiling and cooling?',
          options: L.BENEDICT_COLOURS.map(function (c) {
            return { v: String(c.level), label: '<span class="sw" style="background:' + c.hex + '"></span>' + c.name + (c.level ? ' precipitate' : ' solution, no precipitate') };
          }), correct: String(lvl),
          explain: 'The simulated tube showed ' + L.BENEDICT_COLOURS[lvl].name.toLowerCase() + (lvl ? ' precipitate.' : ' solution with no precipitate.') },
        { q: 'What is your interpretation?',
          options: [
            { v: 'neg', label: 'Negative — no reducing sugar detected' },
            { v: 'low', label: 'Positive — low concentration of reducing sugar' },
            { v: 'mid', label: 'Positive — intermediate concentration of reducing sugar' },
            { v: 'high', label: 'Positive — high concentration of reducing sugar' }
          ], correct: interp,
          explain: 'Blue = negative; green = low; yellow/orange = intermediate; brick-red = high. ' + L.BENEDICT_COLOURS[lvl].meaning + '.' },
        { q: 'Which statement about Benedict\'s test is correct?',
          options: rotate([
            { v: 'reducing', label: 'It detects reducing sugars in general (e.g. glucose, fructose, galactose, lactose) — it is not specific to glucose' },
            { v: 'specific', label: 'It is specific for glucose only' },
            { v: 'sucrose', label: 'It detects sucrose as well as glucose' }
          ], 2), correct: 'reducing',
          explain: 'Any sugar with a free aldehyde or ketone group reduces Cu²⁺ to Cu₂O. Sucrose is non-reducing. Glucose-specific methods use glucose oxidase.' }
      ];
    }
    if (expId === 'rothera') {
      return [
        { q: 'What did you observe at the interface between the two layers?',
          options: [
            { v: 'ring', label: 'A purple/violet ring at the interface' },
            { v: 'none', label: 'No purple/violet ring at the interface' },
            { v: 'sank', label: 'Sulfur powder sank' },
            { v: 'red', label: 'A brick-red precipitate' }
          ], correct: s.ketones ? 'ring' : 'none',
          explain: s.ketones ? 'A purple ring formed where the alkaline ammonia layer met the nitroprusside-saturated urine.' : 'No coloured ring formed at the interface.' },
        { q: 'What is your interpretation?',
          options: [
            { v: 'pos', label: 'Ketone bodies (acetoacetate/acetone) present — ketonuria' },
            { v: 'neg', label: 'Ketone bodies not detected' },
            { v: 'bile', label: 'Bile salts present' }
          ], correct: s.ketones ? 'pos' : 'neg',
          explain: 'A purple/violet ring indicates ketone bodies. Rothera\'s test has nothing to do with bile salts.' },
        { q: 'Which ketone body is NOT detected by Rothera\'s test?',
          options: rotate([
            { v: 'bhb', label: 'β-Hydroxybutyrate' },
            { v: 'aca', label: 'Acetoacetate' },
            { v: 'ace', label: 'Acetone' }
          ], 1), correct: 'bhb',
          explain: 'Nitroprusside reacts with the keto group of acetoacetate (strongly) and acetone (weakly). β-Hydroxybutyrate has no keto group and is not detected.' }
      ];
    }
    // hay
    return [
      { q: 'What happened to the sulfur powder?',
        options: [
          { v: 'sank', label: 'It sank below the surface' },
          { v: 'float', label: 'It remained floating on the surface' },
          { v: 'ring', label: 'A violet ring formed' }
        ], correct: s.bile ? 'sank' : 'float',
        explain: s.bile ? 'The powder sank through the surface.' : 'The powder stayed on the surface.' },
      { q: 'What is your interpretation?',
        options: [
          { v: 'pos', label: 'Bile salts possibly present' },
          { v: 'neg', label: 'The characteristic positive result did not occur — bile salts not detected' },
          { v: 'ket', label: 'Ketone bodies present' }
        ], correct: s.bile ? 'pos' : 'neg',
        explain: 'Sinking sulfur indicates bile salts. Ketone bodies are detected by Rothera\'s test, not Hay\'s test.' },
      { q: 'What is the principle of Hay\'s test?',
        options: rotate([
          { v: 'tension', label: 'Bile salts lower the surface tension of urine, so the light sulfur powder sinks' },
          { v: 'react', label: 'Bile salts react chemically with sulfur to form a heavy precipitate' },
          { v: 'ketone', label: 'Ketone bodies lower the surface tension of urine' }
        ], 2), correct: 'tension',
        explain: 'Bile salts are detergents (surface-active agents). The test is physical, not chemical.' }
    ];
  };

  Quiz.open = function (exp) {
    var d = L.expDef(exp.id), qs = Quiz.build(exp.id);
    var body = '<p class="quiz-intro">Record your observation and interpretation for <strong>' + d.title + '</strong>. You have one attempt.</p>' +
      '<div class="obs-tube">' + UI.tubeSVG(L.Exp.visual(exp)) + '</div>' +
      qs.map(function (q, i) {
        return '<fieldset class="q"><legend>' + (i + 1) + '. ' + q.q + '</legend>' +
          q.options.map(function (o) {
            return '<label class="opt"><input type="radio" name="q' + i + '" value="' + o.v + '"> <span>' + o.label + '</span></label>';
          }).join('') + '</fieldset>';
      }).join('');
    UI.modal({
      title: '📝 Results — Experiment ' + d.num, cls: 'quiz-modal', body: body,
      buttons: [{ label: 'Submit answers', cls: 'primary', onClick: function (w) {
        var answers = qs.map(function (q, i) { var c = w.querySelector('input[name="q' + i + '"]:checked'); return c ? c.value : null; });
        if (answers.indexOf(null) !== -1) { UI.toast('Answer every question before submitting.', 'info'); return false; }
        var correct = 0;
        answers.forEach(function (a, i) { if (a === qs[i].correct) correct++; });
        exp.quiz = { correct: correct, total: qs.length, answers: answers };
        L.S.cat.interpretation = L.S.cat.interpretation || { errors: 0, good: 0 };
        L.S.cat.interpretation.good += correct;
        L.S.cat.interpretation.errors += qs.length - correct;
        if (correct < qs.length) {
          L.S.log.unshift({ type: 'technique', severity: 'procedure', cat: 'interpretation', title: 'Interpretation errors in Experiment ' + d.num,
            action: (qs.length - correct) + ' of ' + qs.length + ' answers were incorrect.', t: Date.now(), exp: exp.id, pts: 0 });
        }
        setTimeout(function () { feedback(exp, qs, answers); }, 0);
      } }]
    });
  };

  function feedback(exp, qs, answers) {
    var d = L.expDef(exp.id);
    var body = qs.map(function (q, i) {
      var ok = answers[i] === q.correct;
      var right = q.options.filter(function (o) { return o.v === q.correct; })[0];
      return '<div class="fb ' + (ok ? 'ok' : 'no') + '"><div class="fb-q">' + (ok ? '✔' : '✘') + ' ' + q.q + '</div>' +
        (ok ? '' : '<div>Correct answer: <strong>' + right.label + '</strong></div>') +
        '<div class="fb-x">' + q.explain + '</div></div>';
    }).join('') + '<div class="note"><strong>Remember:</strong> ' + d.notes + '</div>' +
      '<p class="tiny">All reactions in this virtual laboratory are simulated from a predefined case — no real chemical analysis is performed.</p>';
    L.UI.modal({
      title: 'Feedback — Experiment ' + d.num + ' (' + exp.quiz.correct + '/' + exp.quiz.total + ')', cls: 'quiz-modal', body: body,
      buttons: [{ label: L.S.expIndex < 3 ? 'Continue to Experiment ' + (L.S.expIndex + 2) : 'Continue to cleanup', cls: 'primary', onClick: function () {
        L.completeExperiment(exp);
      } }]
    });
  }
})(window.Lab);
