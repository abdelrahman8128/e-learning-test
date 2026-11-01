/* =========================================================================
   storage.js — progress persistence (localStorage) and the Lab 7 → Lab 8 lock.

   The lock is enforced in logic, not in the look of a button:
   • Lab 7 completion is DERIVED from the saved step records (all 17 steps + the checkpoint),
     never read from a stored "completed" flag.
   • Lab 7 records are signed; a record that fails verification is discarded.
   • Lab 8 data found without a complete, valid Lab 7 is discarded on load.
   • Every entry point (router, sidebar, hash URL, Continue button, Lab 8 renderer) calls
     Store.canOpen('lab8') / Store.assertLab8().
   Note: a browser cannot be made tamper-proof. This stops accidental and casual bypasses
   (URL edits, hand-edited storage); use an LMS or server for graded, high-stakes use.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL;
  const KEY = 'msa-karyo-lab-v1';
  const LAB7_STEPS = 17, LAB8_STEPS = 10;
  let mem = null;     // fallback if localStorage is unavailable
  let state = null;
  let notice = null;

  const blank = () => ({
    v: 1,
    lab7: { steps: {}, checkpoint: { answers: {}, firstTry: {}, passed: false } },
    lab8: { steps: {}, spread: null, karyotype: null, measure: {}, classify: {}, finished: false },
    pos: { stage: 'home', step: 1 },
    sig: ''
  });

  // FNV-1a hash — a deterrent against hand-edited records, not cryptography.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  }
  const sign = s => hash('msa-karyo|' + JSON.stringify(s.lab7));

  function lab7CompleteOf(s) {
    for (let i = 1; i <= LAB7_STEPS; i++) { const r = s.lab7.steps[i]; if (!r || r.done !== true) return false; }
    return s.lab7.checkpoint.passed === true;
  }

  function read() {
    try { const raw = window.localStorage.getItem(KEY); if (raw) return raw; } catch (e) { /* unavailable */ }
    return mem;
  }
  function write(raw) {
    mem = raw;
    try { window.localStorage.setItem(KEY, raw); return true; } catch (e) { return false; }
  }

  function sanitize(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.lab7 || !s.lab8) return blank();
    // 1. Lab 7 records must carry a valid signature
    if (s.sig !== sign(s)) {
      notice = 'Saved Lab 7 progress could not be verified and was cleared.';
      const b = blank(); return b;
    }
    // 2. Lab 8 may only hold data when Lab 7 is genuinely complete
    const hasLab8 = Object.keys(s.lab8.steps || {}).length || s.lab8.spread || s.lab8.karyotype || s.lab8.finished;
    if (hasLab8 && !lab7CompleteOf(s)) {
      notice = 'Lab 8 data was found without a completed Lab 7 and was removed.';
      s.lab8 = blank().lab8;
      if (s.pos.stage === 'lab8') s.pos = { stage: 'home', step: 1 };
    }
    return s;
  }

  const Store = {
    LAB7_STEPS, LAB8_STEPS,

    load() {
      try { const raw = read(); state = sanitize(raw ? JSON.parse(raw) : null); } catch (e) { state = blank(); }
      Store.save();
      return state;
    },
    get: () => state,
    takeNotice() { const n = notice; notice = null; return n; },

    save() {
      state.sig = sign(state);
      return write(JSON.stringify(state));
    },

    /* ---------- Lab 7 ---------- */
    lab7Complete: () => lab7CompleteOf(state),
    lab7Done: n => !!(state.lab7.steps[n] && state.lab7.steps[n].done),

    /* ---------- the lock ---------- */
    canOpen(stage) { return stage !== 'lab8' || Store.lab7Complete(); },
    assertLab8() { if (!Store.lab7Complete()) throw new Error('Lab 8 is locked until Lab 7 is completed.'); },

    /** Record a completed step. Lab 8 steps can only be written when Lab 7 is complete. */
    markStep(stage, n, score, summary) {
      if (stage === 'lab8') Store.assertLab8();
      const bag = state[stage].steps;
      const prev = bag[n];
      bag[n] = { done: true, score: prev && prev.done ? prev.score : score, summary: summary || (prev && prev.summary) || '', ts: Date.now() };
      Store.save();
    },
    stepRecord: (stage, n) => state[stage].steps[n] || null,
    stepDone: (stage, n) => !!(state[stage].steps[n] && state[stage].steps[n].done),
    firstIncomplete(stage) {
      const max = stage === 'lab7' ? LAB7_STEPS + 1 : LAB8_STEPS;   // Lab 7: 17 steps + the checkpoint (step 18)
      for (let i = 1; i <= max; i++) {
        if (stage === 'lab7' && i === 18) return state.lab7.checkpoint.passed ? null : 18;
        if (!Store.stepDone(stage, i)) return i;
      }
      return null;
    },

    /** Furthest step the student may open: every earlier step is done. */
    maxOpen(stage) {
      const f = Store.firstIncomplete(stage);
      return f === null ? (stage === 'lab7' ? LAB7_STEPS + 1 : LAB8_STEPS) : f;
    },

    setPos(stage, step) { state.pos = { stage, step }; Store.save(); },

    /* ---------- scores ---------- */
    scores(stage) {
      const recs = Object.keys(state[stage].steps).map(k => state[stage].steps[k]).filter(r => r.done);
      const n = stage === 'lab7' ? LAB7_STEPS : LAB8_STEPS;
      const sum = recs.reduce((a, r) => a + (r.score || 0), 0);
      return { done: recs.length, total: n, pct: Math.round(100 * sum / n) };
    },

    reset() { state = blank(); notice = null; Store.save(); }
  };

  KL.Store = Store;
})();
