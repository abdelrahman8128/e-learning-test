/* =========================================================================
   config.js — protocol parameters and the simulated rat karyotype model.
   Instructors: edit this file to match the approved course protocol.
   ========================================================================= */
window.KL = window.KL || {};

KL.CONFIG = {
  /* ---------- Lab 7 protocol parameters (from the supplied course protocol) ---------- */
  // Instructor-verified protocol information (supplied for this project).
  colchicine: { dose: '4 mg/kg', timing: 'about 1.5–2 hours before sacrifice', verified: 'Instructor-verified protocol information' },
  saline: { volumeMl: 3, label: '0.9% NaCl (physiological saline) or PBS' },
  spin: { rpm: 2000, minutes: 5 },
  kcl: { volumeMl: 3, molarity: '0.075 M' },
  incubation: { tempC: 37, minMin: 10, maxMin: 15 },
  carnoy: { methanolParts: 3, aceticParts: 1, totalMl: 3, standMin: 10 },

  /* ---------- Lab 8 protocol parameters ---------- */
  lab8: {
    slide: { ethanolPct: 70, tempC: 4 },
    drops: { min: 2, max: 3 },
    giemsa: { pct: 10, minutes: 10 },
    objective: 40
  },

  /* ---------- Simulation settings ---------- */
  sim: { secondsPerRealSecond: 30 },         // accelerated clock for incubation / standing / staining
  exam: { maxErrors: 3, errPenalty: 0.25, safetyPenalty: 0.15 },   // Practical Examination: errors allowed per step, score penalties
  guidedPenalty: { err: 0.15, safety: 0.1 },
  /** Photographs: map a key to a file under photoDir and it replaces the drawn illustration. Keys: 'lab7-3-close', 'lab7-3-ref', 'lab7-3-anat' … */
  photoDir: 'assets/photos/',
  photos: {},
  measure: {
    tolerance: 0.2,                           // accepted reading error (simulated µm) for arm lengths
    calcTol: { avg: 0.06, ar: 0.06, ci: 0.6, rl: 0.15 },
    shortArmMin: 0.3,                         // an arm shorter than this is "absent / not measurable"
    requiredPairs: ['1', '3', '4', '13', '14', '20']
  }
};

/* Score categories → steps they are derived from (edit to match your marking scheme). */
KL.CATEGORIES = {
  lab7: [
    ['Anatomical identification', [2, 4, 5, 6, 7, 8, 9]],
    ['Procedural sequence', [1, 3, 4, 12]],
    ['Instrument selection', 'tools'],
    ['Femur isolation', [6]],
    ['Tibia isolation', [7]],
    ['Bone marrow collection from both bones', [10]],
    ['Centrifugation', [11]],
    ['Bone marrow suspension', [12, 'checkpoint']]
  ],
  lab8: [
    ['Reagent identification', [2, 4, 5, 7]],
    ['Experimental sequence', [1, 3, 4]],
    ['Chromosome preparation', [2, 3, 4, 6]],
    ['Slide preparation', [5, 7, 8]],
    ['Microscopic examination', [9]],
    ['Metaphase identification', [8, 9]],
    ['Chromosome pairing', [10, 11, 12]],
    ['Karyotyping', [12, 13, 14, 15]]
  ]
};

/** Information the supplied material did not contain — shown in the Laboratory Guide so the instructor can complete it. */
KL.INSTRUCTOR_INPUT = [
  'Route of colchicine administration (dose and timing are supplied: 4 mg/kg, about 1.5–2 h before sacrifice).',
  'Whether the 3 mL of saline/PBS is used per bone or in total, and whether the femur and tibia suspensions are pooled before centrifugation.',
  'Rat chromosome lengths, arm positions and the assignment of pairs to Groups A–G: the karyotype shown is a TEACHING PLACEHOLDER (2n = 42) until course-approved data are supplied (js/config.js).',
  'Course photographs for each step (drop files in assets/photos/ and list them in CONFIG.photos); until then the application uses labelled illustrations.'
];

/* -------------------------------------------------------------------------
   Idealised rat karyotype used for this exercise (2n = 42, male).
   Each entry: [id, long arm L, short arm S] in simulated µm. S = 0 → telocentric.
   This is a teaching model — it is NOT a published ideogram and NOT a real micrograph.
   ------------------------------------------------------------------------- */
KL.KARYO = (function () {
  const autosomes = [
    ['1', 6.6, 3.0], ['2', 6.3, 2.8], ['3', 6.9, 1.8], ['4', 8.3, 0], ['5', 7.9, 0],
    ['6', 7.5, 0], ['7', 7.1, 0], ['8', 6.7, 0], ['9', 6.3, 0], ['10', 5.9, 0],
    ['11', 4.6, 0.9], ['12', 5.1, 0], ['13', 3.0, 1.8], ['14', 2.5, 2.0], ['15', 3.4, 0.8],
    ['16', 3.9, 0], ['17', 2.0, 1.6], ['18', 2.3, 1.0], ['19', 3.0, 0], ['20', 1.4, 1.3]
  ];
  const sex = [['X', 4.0, 2.0], ['Y', 2.1, 0]];

  // Course arrangement: Row 1 = Groups A, B · Row 2 = Group C · Row 3 = Groups D, E · Row 4 = Groups F, G
  const groups = [
    { id: 'A', pairs: ['1', '2', '3'], row: 0 }, { id: 'B', pairs: ['4', '5', '6'], row: 0 },
    { id: 'C', pairs: ['7', '8', '9', '10', '11', '12'], row: 1 },
    { id: 'D', pairs: ['13', '14', '15'], row: 2 }, { id: 'E', pairs: ['16', '17'], row: 2 },
    { id: 'F', pairs: ['18', '19'], row: 3 }, { id: 'G', pairs: ['20'], row: 3 }
  ];
  const rowNames = ['Row 1 — Large (Groups A, B)', 'Row 2 — Medium (Group C)', 'Row 3 — Small (Groups D, E)', 'Row 4 — Minute (Groups F, G) + sex chromosomes'];

  // Slots: ordered left→right, top→bottom. Each slot holds one homologous pair (or X + Y).
  const slots = [];
  groups.forEach(g => g.pairs.forEach(p => slots.push({ key: p, row: g.row, group: g.id })));
  slots.push({ key: 'XY', row: 3, group: 'sex' });
  slots.forEach((s, i) => { s.index = i; });

  // Chromosome objects (42): two homologs per autosome pair + X + Y. Homologs differ very slightly
  // (±0.05 / ±0.02) so the pair average equals the tabulated value exactly.
  const chroms = [];
  autosomes.forEach(([id, L, S]) => {
    [1, -1].forEach((sgn, h) => {
      const Sh = S > 0 ? +(S + sgn * 0.02).toFixed(2) : 0;
      chroms.push({ id: id + (h ? 'b' : 'a'), pair: id, L: +(L + sgn * 0.05).toFixed(2), S: Sh });
    });
  });
  sex.forEach(([id, L, S]) => chroms.push({ id: id, pair: id, L: L, S: S }));
  chroms.forEach(c => { c.T = +(c.L + c.S).toFixed(2); });

  const pairInfo = {};
  autosomes.concat(sex).forEach(([id, L, S]) => { pairInfo[id] = { id, L, S, T: +(L + S).toFixed(2) }; });
  const diploidTotal = +chroms.reduce((a, c) => a + c.T, 0).toFixed(2);

  return { placeholder: true, autosomes, sex, groups, rowNames, slots, chroms, pairInfo, diploidTotal, haploidTotal: +(diploidTotal / 2).toFixed(3), count: chroms.length };
})();
