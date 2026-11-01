/* =========================================================================
   storage.js — progress persistence (localStorage), the two learning modes,
   and the Lab 7 → Lab 8 lock.

   Modes
   • guided — Guided Revision: hints, explanations, unlimited retries. Unlocks everything.
   • exam   — Practical Examination: no hints, limited attempts, randomised, scored.
     An exam of a lab is only available after the guided version of that lab is complete.

   The lock is enforced in logic, not in the look of a button:
   • Lab 7 completion is DERIVED from the saved guided step records (all 12 steps + the
     checkpoint), never read from a stored "completed" flag.
   • All records are signed; a record that fails verification is discarded.
   • Lab 8 data found without a complete Lab 7 is discarded on load.
   • Every entry point (router, sidebar, hash URL, Continue button, Lab 8 renderer, direct
     store writes) calls Store.canOpen(stage, mode) / Store.assertOpen(stage, mode).
   A browser cannot be made tamper-proof; this stops accidental and casual bypasses.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL;
  const KEY = 'msa-karyo-lab-v2';
  const LAB7_STEPS = 12, LAB8_STEPS = 15;
  const CHECKPOINT = LAB7_STEPS + 1;
  let mem = null, state = null, notice = null;

  const blankLab7 = () => ({ steps: {}, checkpoint: { answers: {}, firstTry: {}, passed: false, score: 0, errors: 0, picked: null }, finished: false, seed: 0, log: [] });
  const blankLab8 = () => ({ steps: {}, spread: null, slide: null, karyotype: null, measure: {}, classify: {}, draft: null, finished: false, seed: 0, log: [] });
  const blankMode = () => ({ lab7: blankLab7(), lab8: blankLab8() });
  const blank = () => ({ v: 2, mode: 'guided', guided: blankMode(), exam: blankMode(), history: [], pos: { mode: 'guided', stage: 'home', step: 1 }, sig: '' });

  // FNV-1a hash — a deterrent against hand-edited records, not cryptography.
  function hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
  const sign = s => hash('msa-karyo|' + JSON.stringify([s.guided, s.exam, s.history]));

  function lab7Complete(lab7) {
    for (let i = 1; i <= LAB7_STEPS; i++) { const r = lab7.steps[i]; if (!r || r.done !== true) return false; }
    return lab7.checkpoint.passed === true;
  }
  const hasLab8Data = l => Object.keys(l.steps || {}).length || l.spread || l.karyotype || l.finished || l.slide;

  function read() { try { const raw = window.localStorage.getItem(KEY); if (raw) return raw; } catch (e) { /* unavailable */ } return mem; }
  function write(raw) { mem = raw; try { window.localStorage.setItem(KEY, raw); return true; } catch (e) { return false; } }

  function sanitize(s) {
    if (!s || typeof s !== 'object' || s.v !== 2 || !s.guided || !s.exam) return blank();
    if (s.sig !== sign(s)) { notice = 'Saved progress could not be verified and was cleared.'; return blank(); }
    const l7ok = lab7Complete(s.guided.lab7);
    // Lab 8 (either mode) may only hold data when guided Lab 7 is genuinely complete; exam only after the guided stage
    if (!l7ok && (hasLab8Data(s.guided.lab8) || hasLab8Data(s.exam.lab8))) {
      notice = 'Lab 8 data was found without a completed Lab 7 and was removed.';
      s.guided.lab8 = blankLab8(); s.exam.lab8 = blankLab8();
    }
    if (!l7ok && hasLab8Data(s.exam.lab8)) s.exam.lab8 = blankLab8();
    if (!lab7Complete(s.guided.lab7) && Object.keys(s.exam.lab7.steps).length) { s.exam.lab7 = blankLab7(); notice = 'Examination data was found before the guided revision was complete and was removed.'; }
    if (!(s.guided.lab8.finished) && Object.keys(s.exam.lab8.steps).length) { s.exam.lab8 = blankLab8(); notice = 'Examination data was found before the guided revision was complete and was removed.'; }
    if (s.pos && s.pos.stage === 'lab8' && !l7ok) s.pos = { mode: 'guided', stage: 'home', step: 1 };
    return s;
  }

  const Store = {
    LAB7_STEPS, LAB8_STEPS, CHECKPOINT,

    load() { try { const raw = read(); state = sanitize(raw ? JSON.parse(raw) : null); } catch (e) { state = blank(); } Store.save(); return state; },
    get: () => state,
    takeNotice() { const n = notice; notice = null; return n; },
    save() { state.sig = sign(state); return write(JSON.stringify(state)); },

    /* ---------- modes ---------- */
    mode: () => state.mode,
    setMode(m) { if (m !== 'guided' && m !== 'exam') return false; state.mode = m; Store.save(); return true; },
    /** Data of the current (or given) mode for a stage. */
    d: (stage, mode) => state[mode || state.mode][stage],
    totalSteps: stage => stage === 'lab7' ? LAB7_STEPS : LAB8_STEPS,

    /* ---------- completion (derived) ---------- */
    lab7Complete: () => lab7Complete(state.guided.lab7),
    guidedComplete: stage => stage === 'lab7' ? lab7Complete(state.guided.lab7) : (lab7Complete(state.guided.lab7) && state.guided.lab8.finished === true),
    examFinished: stage => state.exam[stage].finished === true,

    /* ---------- the lock ---------- */
    canOpen(stage, mode) {
      mode = mode || state.mode;
      if (stage === 'lab7') return mode === 'guided' || Store.guidedComplete('lab7');
      if (stage === 'lab8') return mode === 'guided' ? Store.lab7Complete() : Store.guidedComplete('lab8');
      return true;
    },
    assertOpen(stage, mode) { if (!Store.canOpen(stage, mode)) throw new Error(stage === 'lab8' ? 'Lab 8 is locked until Lab 7 is completed.' : 'The practical examination opens after the guided revision is complete.'); },
    assertLab8() { if (!Store.lab7Complete()) throw new Error('Lab 8 is locked until Lab 7 is completed.'); },

    /** Record a completed step in the current mode. Writing to Lab 8 requires the stage to be open. */
    markStep(stage, n, score, summary, extra) {
      Store.assertOpen(stage, state.mode);
      const bag = state[state.mode][stage].steps, prev = bag[n];
      bag[n] = Object.assign({ done: true, score: prev && prev.done ? prev.score : score, summary: summary || (prev && prev.summary) || '', ts: Date.now() }, prev && prev.done ? { toolScore: prev.toolScore, errors: prev.errors, safety: prev.safety, failed: prev.failed } : (extra || {}));
      Store.save();
    },
    stepRecord: (stage, n) => state[state.mode][stage].steps[n] || null,
    stepDone: (stage, n) => !!(state[state.mode][stage].steps[n] && state[state.mode][stage].steps[n].done),
    checkpointDone: () => state[state.mode].lab7.checkpoint.passed === true,
    log(stage, entry) { const l = state[state.mode][stage].log; l.push(Object.assign({ ts: Date.now() }, entry)); if (l.length > 120) l.shift(); },

    /** First step that is not done (the checkpoint is step 13 of Lab 7). */
    firstIncomplete(stage) {
      const d = state[state.mode][stage], n = stage === 'lab7' ? LAB7_STEPS : LAB8_STEPS;
      for (let i = 1; i <= n; i++) if (!(d.steps[i] && d.steps[i].done)) return i;
      if (stage === 'lab7' && !d.checkpoint.passed) return CHECKPOINT;
      return null;
    },
    maxOpen(stage) { const f = Store.firstIncomplete(stage); return f === null ? (stage === 'lab7' ? CHECKPOINT : LAB8_STEPS) : f; },
    setPos(mode, stage, step) { state.pos = { mode, stage, step }; Store.save(); },

    /* ---------- scores ---------- */
    scores(stage, mode) {
      const d = state[mode || state.mode][stage], recs = Object.keys(d.steps).map(k => d.steps[k]).filter(r => r.done);
      let n = stage === 'lab7' ? LAB7_STEPS : LAB8_STEPS, sum = recs.reduce((a, r) => a + (r.score || 0), 0);
      if (stage === 'lab7') { n += 1; if (d.checkpoint.passed) sum += d.checkpoint.score || 0; }
      const done = recs.length + (stage === 'lab7' && d.checkpoint.passed ? 1 : 0);
      return { done, total: n, pct: Math.round(100 * sum / n) };
    },

    /* ---------- practical examination attempts ---------- */
    examSeed: stage => state.exam[stage].seed || 0,
    /** Start a new exam attempt for a stage (archives a finished one). */
    beginExam(stage) {
      Store.assertOpen(stage, 'exam');
      const e = state.exam[stage];
      if (e.finished) { /* history entry was written at finish */ }
      state.exam[stage] = stage === 'lab7' ? blankLab7() : blankLab8();
      state.exam[stage].seed = (Math.floor(Math.random() * 2147483000) + 1);
      Store.save();
    },
    hasExamInProgress: stage => { const e = state.exam[stage]; return !e.finished && (Object.keys(e.steps).length > 0 || (stage === 'lab7' && e.checkpoint.passed)); },
    finishExam(stage, summary) { const e = state.exam[stage]; if (e.finished) return; e.finished = true; state.history.push(Object.assign({ stage, at: Date.now() }, summary)); if (state.history.length > 20) state.history.shift(); Store.save(); },
    lastExam(stage) { for (let i = state.history.length - 1; i >= 0; i--) if (state.history[i].stage === stage) return state.history[i]; return null; },

    reset() { state = blank(); notice = null; Store.save(); }
  };

  KL.Store = Store;
})();
