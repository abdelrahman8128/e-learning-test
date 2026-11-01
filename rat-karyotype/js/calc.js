/* =========================================================================
   calc.js — pure karyotype calculations and morphological classification.
   No DOM access: usable in the browser and in Node tests.
   ========================================================================= */
(function (root) {
  'use strict';
  const KL = root.KL = root.KL || {};
  const SHORT_ARM_MIN = (KL.CONFIG && KL.CONFIG.measure.shortArmMin) || 0.3;

  const round = (v, d) => { const f = Math.pow(10, d); return Math.round((v + 1e-9) * f) / f; };

  const Calc = {
    SHORT_ARM_MIN,
    round,

    /** Mean of two homolog readings. */
    avg: (a, b) => (a + b) / 2,

    /** Is the short arm absent / not measurable under the idealised model? */
    isTelocentric: S => !(S >= SHORT_ARM_MIN),

    /** AR = long arm / short arm. Undefined (null) when the short arm is absent — never divides by zero. */
    armRatio(L, S) { return Calc.isTelocentric(S) ? null : L / S; },

    /** Long-arm centromeric index: CI = long arm / total chromosome length × 100. */
    centromericIndex(L, S) { return L / (L + (Calc.isTelocentric(S) ? 0 : S)) * 100; },

    /** Haploid total = half of the summed length of the diploid set. */
    haploidTotal: diploidSum => diploidSum / 2,

    /** RL = average chromosome length / total haploid length × 100. */
    relativeLength: (avgTotal, haploid) => avgTotal / haploid * 100,

    /**
     * Course criteria (simplified):
     *   Metacentric    AR 1.0–1.5, long-arm CI 50–60 %
     *   Submetacentric AR 1.6–3.0, long-arm CI 61–75 %
     *   Acrocentric    AR ≥ 3.1,   long-arm CI 76–100 %
     *   Telocentric    centromere at the extreme end (short arm absent)
     * Boundary rule: AR is rounded to 1 decimal and CI to the nearest whole % BEFORE comparing, so the
     * ranges above leave no gaps (1.5 | 1.6, 3.0 | 3.1 and 60 | 61, 75 | 76). The centromere position
     * (telocentric test) comes first; AR decides; CI is a cross-check reported as `ciAgrees`.
     */
    classify(L, S) {
      if (Calc.isTelocentric(S)) {
        return { cls: 'Telocentric', ar: null, ci: 100, basis: 'The centromere is at the extreme end and the short arm is absent/not measurable, so AR is not calculated (no division by zero).', ciAgrees: true };
      }
      const ar = round(L / S, 1), ci = Math.round(Calc.centromericIndex(L, S) + 1e-9);
      const byAR = ar <= 1.5 ? 'Metacentric' : ar <= 3.0 ? 'Submetacentric' : 'Acrocentric';
      const byCI = ci <= 60 ? 'Metacentric' : ci <= 75 ? 'Submetacentric' : 'Acrocentric';
      return { cls: byAR, ar, ci, ciAgrees: byAR === byCI,
        basis: 'AR ' + ar.toFixed(1) + ' and long-arm CI ' + ci + ' % fall in the ' + byAR.toLowerCase() + ' range.' + (byAR === byCI ? '' : ' (AR and CI disagree after rounding; AR decides.)') };
    },

    /** Compare a typed value with an expected one. Returns 'ok' | 'high' | 'low' | 'nan'. */
    compare(value, expected, tol) {
      if (value === null || value === undefined || value === '' || isNaN(+value)) return 'nan';
      const d = +value - expected;
      return Math.abs(d) <= tol ? 'ok' : (d > 0 ? 'high' : 'low');
    }
  };

  KL.Calc = Calc;
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
})(typeof window !== 'undefined' ? window : globalThis);
