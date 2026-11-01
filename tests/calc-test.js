/* Unit tests for the karyotype data model and calculations: node tests/calc-test.js */
global.window = global; global.KL = {};
require('../rat-karyotype/js/config.js');
const Calc = require('../rat-karyotype/js/calc.js');
const K = KL.KARYO;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('  ✘ ' + m); } else console.log('  ✔ ' + m); };

ok(K.count === 42, '42 chromosomes (2n = 42)');
ok(K.slots.length === 21, '21 slots: 20 autosome pairs + XY');
ok(K.slots.filter(s => s.row === 0).length === 6 && K.slots.filter(s => s.row === 1).length === 6 &&
   K.slots.filter(s => s.row === 2).length === 5 && K.slots.filter(s => s.row === 3).length === 4, 'rows hold 6 / 6 / 5 / 4 slots');
const T = K.autosomes.map(([id, L, S]) => L + S);
ok(T.every((t, i) => i === 0 || T[i - 1] - t >= 0.29), 'autosome pair sizes strictly descending (steps ≥ 0.3)');
ok(K.chroms.every(c => c.L >= c.S && c.L > 0), 'long arm ≥ short arm for every chromosome');
ok(Math.abs(K.haploidTotal * 2 - K.diploidTotal) < 1e-9, 'haploid total = ½ diploid total (' + K.haploidTotal + ')');

// classification consistency: AR and CI agree, every class represented
const seen = new Set();
K.autosomes.concat(K.sex).forEach(([id, L, S]) => {
  const c = Calc.classify(L, S);
  seen.add(c.cls);
  if (!c.ciAgrees) { fail++; console.log('  ✘ pair ' + id + ' AR/CI disagree', c); }
});
ok(seen.size === 4, 'all four classes occur: ' + [...seen].join(', '));

// calculations
ok(Calc.armRatio(6.6, 3.0).toFixed(2) === '2.20', 'AR = 6.6 / 3.0 = 2.20');
ok(Math.abs(Calc.centromericIndex(6.6, 3.0) - 68.75) < 1e-9, 'long-arm CI = 6.6 / 9.6 × 100 = 68.75 %');
ok(Calc.armRatio(8.3, 0) === null, 'telocentric: AR is undefined (no division by zero)');
ok(Calc.centromericIndex(8.3, 0) === 100, 'telocentric: long-arm CI = 100 %');
ok(Math.abs(Calc.relativeLength(9.6, K.haploidTotal) - 9.6 / K.haploidTotal * 100) < 1e-9, 'RL formula');

// boundaries (rounded before comparing, so there are no gaps)
const cl = (L, S) => Calc.classify(L, S).cls;
ok(cl(3.0, 2.0) === 'Metacentric', 'AR 1.5 → metacentric');
ok(cl(3.2, 2.0) === 'Submetacentric', 'AR 1.6 → submetacentric');
ok(cl(3.06, 2.0) === 'Metacentric' && cl(3.1, 2.0) === 'Submetacentric', 'AR 1.53 rounds to 1.5 (metacentric), 1.55 rounds to 1.6 (submetacentric): no gap');
ok(cl(3.0, 1.0) === 'Submetacentric', 'AR 3.0 → submetacentric');
ok(cl(3.1, 1.0) === 'Acrocentric', 'AR 3.1 → acrocentric');
ok(cl(5, 0.2) === 'Telocentric', 'arm below the measurable limit → telocentric');
console.log(fail ? '\n' + fail + ' FAILED' : '\nAll calculation tests passed');
process.exit(fail ? 1 : 0);
