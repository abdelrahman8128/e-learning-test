/* =========================================================================
   state.js — the single source of truth for the session, plus scoring.
   ========================================================================= */
(function (L) {
  'use strict';

  L.newTube = function (where) {
    return {
      where: where,       // station the tube is at
      loc: 'rack',        // 'rack' | 'hand' | 'holder' | 'carry' (in carrying rack) | 'broken'
      contents: {},       // urine (mL), benedict (mL), rothera, ammonia (mL), sulfur, fill
      mixed: false,
      heat: 0,            // % towards boiling (100 = boiling)
      boil: 0,            // simulated seconds of boiling
      temp: 22,           // °C
      heatedOnce: false,
      layered: false, layeredAt: 0, layerMethod: null,
      disturbed: false,   // layers mixed / sulfur disturbed — must reset
      sulfurAt: 0, sulfurAmt: null,
      spoiled: false,     // contents lost (splash / boil-over) — must reset
      washStage: 0,       // cleanup: 0 dirty … 4 clean & in drying rack
      collected: false
    };
  };

  L.newExp = function (def) {
    return { id: def.id, steps: {}, tube: L.newTube(def.station), done: false, quiz: null, flags: {}, resets: 0 };
  };

  L.newState = function (scenarioId, hidden) {
    return {
      phase: 'intro',
      scenarioId: scenarioId,
      scenarioHidden: !!hidden,
      ppe: { coat: false, buttons: [false, false, false, false], gloves: false, goggles: false },
      belongings: { bag: 'carried', drink: 'carried' },
      station: 'entrance',
      prevStation: null,
      expIndex: 0,
      exps: L.EXPERIMENTS.map(L.newExp),
      burners: { bench1: { lit: false, air: 'closed' }, bench2: { lit: false, air: 'closed' } },
      hood: { fan: false, sash: 'open' },
      incident: null,
      scores: { safety: 100, technique: 100 },
      log: [],          // every feedback event (warnings, errors, good actions)
      violations: [],   // safety violations
      techErrors: [],   // practical technique errors
      safeActs: [],
      ruleHits: {},     // rule id -> count
      cat: {},          // category -> {errors, good}
      seen: {},         // one-off events (decision prompts, hints)
      cleanup: {
        wiped: { bench1: false, bench2: false, bench3: false, bench4: false, hood: false },
        stool: 'aisle', // 'aisle' | 'stowed'
        returned: false,
        handsWashed: false
      },
      usedGloves: 0,    // pairs discarded (never re-worn)
      breakages: [],    // {reported, violations, at}
      startedAt: Date.now(),
      endedAt: null,
      endReason: null
    };
  };

  L.S = null; // current state

  L.scenario = function () {
    return L.SCENARIOS.find(function (s) { return s.id === L.S.scenarioId; });
  };
  L.expDef = function (idOrIndex) {
    if (typeof idOrIndex === 'number') return L.EXPERIMENTS[idOrIndex];
    return L.EXPERIMENTS.find(function (e) { return e.id === idOrIndex; });
  };
  L.exp = function (id) { return L.S.exps.find(function (e) { return e.id === id; }); };
  L.currentExp = function () { return L.S.exps[L.S.expIndex] || null; };

  /* ------------------------------------------------------------------ */
  /* Scoring                                                             */
  /* ------------------------------------------------------------------ */
  var SAFETY_PTS = { minor: 3, major: 8, critical: 15 };
  var lastHit = {};

  function bumpCat(cat, key) {
    var c = L.S.cat[cat] || (L.S.cat[cat] = { errors: 0, good: 0 });
    c[key]++;
  }

  function pushLog(entry) {
    entry.t = Date.now();
    entry.where = L.S.station;
    L.S.log.unshift(entry);
    if (L.S.log.length > 200) L.S.log.length = 200;
  }

  /* De-duplicate double clicks: the same event within 1.2 s is not charged twice. */
  function debounced(key) {
    var now = Date.now();
    if (lastHit[key] && now - lastHit[key] < 1200) return true;
    lastHit[key] = now;
    return false;
  }

  L.Score = {
    SAFETY_PTS: SAFETY_PTS,

    /** Record a safety violation. Returns the log entry. */
    violation: function (v) {
      var sev = v.severity || 'minor';
      var key = 'v:' + v.id;
      if (debounced(key)) return null;
      var pts = v.points != null ? v.points : SAFETY_PTS[sev];
      L.S.scores.safety = Math.max(0, L.S.scores.safety - pts);
      var entry = {
        type: 'violation', severity: sev, id: v.id, rule: v.rule, cat: v.cat || 'handling',
        title: v.title, action: v.action, consequence: v.consequence, fix: v.fix, pts: pts,
        exp: L.S.phase === 'lab' && L.currentExp() ? L.currentExp().id : L.S.phase
      };
      L.S.violations.push(entry);
      if (v.rule) L.S.ruleHits[v.rule] = (L.S.ruleHits[v.rule] || 0) + 1;
      bumpCat(entry.cat, 'errors');
      pushLog(entry);
      return entry;
    },

    /** Record a practical-technique error (not a safety violation). */
    technique: function (t) {
      var key = 't:' + t.id;
      if (debounced(key)) return null;
      var pts = t.points != null ? t.points : 4;
      L.S.scores.technique = Math.max(0, L.S.scores.technique - pts);
      var entry = {
        type: 'technique', severity: 'procedure', id: t.id, cat: t.cat || 'sequence', title: t.title,
        action: t.action, consequence: t.consequence, fix: t.fix, pts: pts, rule: t.rule,
        exp: L.S.phase === 'lab' && L.currentExp() ? L.currentExp().id : L.S.phase
      };
      L.S.techErrors.push(entry);
      if (t.rule) L.S.ruleHits[t.rule] = (L.S.ruleHits[t.rule] || 0) + 1;
      bumpCat(entry.cat, 'errors');
      pushLog(entry);
      return entry;
    },

    /** Reward a safe decision or correctly performed action (small, capped bonus). */
    good: function (id, msg, cat, pts) {
      if (L.S.seen['good:' + id]) return;
      L.S.seen['good:' + id] = true;
      var p = pts == null ? 1 : pts;
      L.S.scores.safety = Math.min(100, L.S.scores.safety + p);
      L.S.safeActs.push({ id: id, msg: msg, cat: cat });
      bumpCat(cat || 'handling', 'good');
      pushLog({ type: 'good', severity: 'good', title: msg, cat: cat });
    },

    info: function (title, msg) {
      pushLog({ type: 'info', severity: 'info', title: title, action: msg });
    },

    interpretation: function () {
      var total = 0, correct = 0;
      L.S.exps.forEach(function (e) {
        if (e.quiz) { total += e.quiz.total; correct += e.quiz.correct; }
      });
      var maxTotal = L.S.exps.reduce(function (n, e) { return n + L.Quiz.count(e.id); }, 0);
      return { correct: correct, total: total, max: maxTotal, pct: maxTotal ? Math.round(100 * correct / maxTotal) : 0 };
    },

    overall: function () {
      var i = L.Score.interpretation().pct;
      return Math.round(0.4 * L.S.scores.safety + 0.35 * L.S.scores.technique + 0.25 * i);
    }
  };
})(window.Lab);
