/* =========================================================================
   lab8.js — Lab 8: Chromosome Preparation and Karyotyping. 15 steps.
   Locked until Lab 7 is complete (enforced in storage.js and the router).
   Protocol values come from KL.CONFIG; nothing else is invented. All microscopy images are
   SIMULATED teaching models, and the chromosome dataset is a TEACHING PLACEHOLDER.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc, clock, fmtClock } = KL.UI, A = KL.Art, T = KL.Tasks, CFG = KL.CONFIG, L8 = CFG.lab8, K0 = KL.KARYO, KY = KL.Karyo, Cm = KL.Common, TO = A.TOOL;
  const PH = ['Phase 1 — Starting material', 'Phase 2 — Chromosome preparation', 'Phase 3 — Slide preparation and staining', 'Phase 4 — Microscopy and identification', 'Phase 5 — Karyotyping and analysis'];
  const note = t => h('div.sim-note', { html: t });
  const lab8 = () => KL.Store.d('lab8');
  const PLACEHOLDER = '<strong>Teaching placeholder data.</strong> The chromosome lengths, arm positions and group assignments in this simulation are an idealised model (2n = 42) until course-approved data are supplied by the instructor.';

  const TD = Object.assign({}, KL.LAB7.TD, {
    kcl: { name: 'KCl solution', ic: TO.bottle }, carnoy: { name: 'Methanol : acetic acid fixative', ic: TO.bottle }, giemsa: { name: 'Giemsa stain', ic: TO.jar }, etoh: { name: 'Cold ethanol (slide storage)', ic: TO.bottle },
    water: { name: 'Distilled water', ic: TO.bottle }, slide: { name: 'Clean glass slides', ic: TO.slide }, dropper: { name: 'Pipette / dropper', ic: TO.dropper }, microscope: { name: 'Light microscope', ic: TO.microscope },
    paper: { name: 'Filter paper', ic: TO.paper }, calc: { name: 'Calculator', ic: TO.calc }, colch: { name: 'Colchicine solution', ic: TO.syringe, unsafe: true, why: 'colchicine is given to the living animal before sacrifice, not at this stage' },
    methblue: { name: 'Methylene blue', ic: TO.jar }, fume: { name: 'Fume hood', ic: TO.fume }, goggles: TD_G()
  });
  function TD_G() { return { name: 'Eye protection', ic: TO.goggles }; }

  function typesDiagram() {
    const defs = [['Metacentric', 2.6, 2.2], ['Submetacentric', 3.6, 1.6], ['Acrocentric', 4.4, 0.8], ['Telocentric', 5.2, 0]];
    let v = '<rect width="320" height="190" fill="#f2f6fb" rx="10"/>';
    defs.forEach((d, i) => {
      const g = KY.chromGeom({ L: d[1], S: d[2] }, 22), x = 40 + i * 78;
      v += '<g transform="translate(' + (x - g.cx) + ' 14)">' + g.inner + '</g><text x="' + x + '" y="' + (14 + g.H + 16) + '" font-size="9.5" fill="#233a5c" text-anchor="middle" font-weight="600">' + d[0] + '</text>';
    });
    return '<svg class="art" viewBox="0 0 320 190" aria-hidden="true">' + v + '<text x="160" y="184" font-size="10" fill="#6b7a90" text-anchor="middle">Schematic — centromere position (not to scale)</text></svg>';
  }
  const simMicro = (variant, seed) => '<svg class="art" viewBox="0 0 600 450" aria-hidden="true">' + KY.spreadSVG(KY.makeSpread(variant, seed)) + '</svg><p class="cap">Simulated micrograph (teaching model) — not a real observation</p>';
  const miniMicro = (variant, seed) => '<svg class="art" viewBox="0 0 600 450" aria-hidden="true">' + KY.spreadSVG(KY.makeSpread(variant, seed)) + '</svg>';

  function spreadScene(p) {
    const sp = KY.makeSpread('good', 31), byId = {}; K0.chroms.forEach(c => { byId[c.id] = c; });
    const ease = t => t * t * (3 - 2 * t);
    let v = '<rect width="600" height="450" fill="#f2ecf3"/><ellipse cx="300" cy="225" rx="250" ry="180" fill="rgba(255,255,255,.35)" stroke="#d1bcd8" stroke-width="2"/>';
    if (p < 0.45) {
      const r = 46 + 20 * (p / 0.45);
      [[190, 170], [400, 240], [280, 330]].forEach(c => { v += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '" fill="#f6dfe3" stroke="#b35a66" stroke-width="2.5"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (r * .45) + '" fill="#8a5aa8" opacity=".85"/>'; });
      v += '<text x="300" y="30" text-anchor="middle" font-size="16" fill="#233a5c" font-weight="700">Swollen fixed cells on the wet slide</text>';
    } else {
      const t = ease((p - 0.45) / 0.55);
      sp.items.forEach((it, i) => {
        const c = byId[it.id], g = KY.chromGeom(c, 5), cx = 300 + ((i % 3) - 1) * 40 * (1 - t), cy = 225 + (((i * 7) % 5) - 2) * 14 * (1 - t);
        const x = cx + (it.x - 300) * t, y = cy + (it.y - 225) * t, rot = it.rot * t;
        v += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(0) + ') translate(' + (-g.cx) + ' ' + (-g.H / 2) + ')" opacity="' + (0.35 + 0.65 * t).toFixed(2) + '">' + g.inner + '</g>';
      });
      v += '<text x="300" y="30" text-anchor="middle" font-size="16" fill="#233a5c" font-weight="700">' + (p < 0.9 ? 'Cells burst gently; chromosomes disperse' : 'Dispersed metaphase chromosomes') + '</text>';
    }
    return '<svg class="art" viewBox="0 0 600 450" aria-hidden="true">' + v + '</svg>';
  }

  /* ---------------- helpers ---------------- */
  const opt = (id, text, correct, why, unsafe) => ({ id, text, correct: !!correct, why, unsafe: !!unsafe });
  const singleStage = (ctx, o) => next => T.single(ctx, Object.assign({ onDone: next }, o));
  const multiStage = (ctx, o) => next => T.multi(ctx, Object.assign({ onDone: next }, o));
  const seqStage = (ctx, o) => next => T.sequence(ctx, Object.assign({ onDone: next }, o));

  function stepTask(d) {
    return ctx => {
      const stages = [next => T.tools(ctx, { prompt: d.toolPrompt || 'Select the equipment and materials this step needs. Choose only what is required.', pool: d.pool, required: d.req, defs: TD, onDone: next })].concat(d.stages(ctx));
      return h('div', [d.intro ? note(d.intro) : null, T.stages(ctx, stages, { onFinish: () => ctx.complete(d.summary) })]);
    };
  }
  /** Volume dial: the student sets the protocol volume. */
  const volStage = (ctx, o) => next => {
    let v = o.start;
    const dial = T.dial(o.label, { min: o.min, max: o.max, step: o.step || 0.5, value: v, unit: 'mL', onChange: x => { v = x; } });
    return h('div.task-block', [h('p.task-prompt', { html: o.prompt }), dial, h('div.task-actions', h('button.btn.primary', { onclick: () => {
      ctx.attempt();
      if (Math.abs(v - o.target) < 1e-6) { ctx.fb('ok', o.okMsg || (v + ' mL matches the protocol.')); next(); }
      else ctx.fb('sci', v < o.target ? 'Too little: ' + (o.low || 'the step will not work as intended') + '. Check the protocol volume.' : 'Too much: ' + (o.high || 'the step will not work as intended') + '. Check the protocol volume.');
    } }, 'Confirm volume'))]);
  };
  /** Timed stage on the accelerated clock: stop inside [lo, hi] simulated minutes (hi null = at least lo). */
  const timerStage = (ctx, o) => next => {
    const read = h('div.big-read', '00:00'), view = h('div.hero', { html: o.art || '' });
    let c = null;
    const stop = h('button.btn.primary', { id: o.stopId || 'btn-stop', disabled: true, onclick: () => {
      if (!c) return; const s = c.elapsed() / 60; c.stop(); c = null; stop.disabled = true; go.disabled = false; ctx.attempt();
      if (s >= o.lo && (o.hi == null || s <= o.hi)) { ctx.fb('ok', o.okMsg); next(); }
      else { read.textContent = '00:00'; ctx.fb('sci', s < o.lo ? 'Stopped too early (' + s.toFixed(1) + ' min of the required ' + o.lo + (o.hi ? '–' + o.hi : '') + ' min). ' + o.low : 'Left too long (' + s.toFixed(1) + ' min; the protocol allows ' + o.lo + '–' + o.hi + ' min). ' + o.high); }
    } }, o.stopLabel || 'Stop');
    const go = h('button.btn', { id: o.goId || 'btn-go', onclick: () => {
      go.disabled = true; stop.disabled = false; ctx.fb('hint', 'The clock runs about ' + CFG.sim.secondsPerRealSecond + '× faster than real time.');
      c = clock(s => { read.textContent = fmtClock(s); });
    } }, o.goLabel || 'Start');
    return h('div.task-block', [h('p.task-prompt', { html: o.prompt }), view, read, h('div.task-actions', [go, stop])]);
  };

  const STEPS = [];
  const add = (n, ph, d) => {
    const s = Object.assign({ n, phase: PH[ph], stage: 'lab8' }, d);
    s.tools = d.req.map(id => [TD[id].ic, TD[id].name]);
    s.task = stepTask(d);
    STEPS.push(s);
  };

  /* ===================================================== 1 recap & timeline */
  add(1, 0, {
    title: 'Starting Material and Timeline', thumb: 'tube', objective: 'Recap Lab 7 and place the whole chromosome-preparation workflow, including colchicine pretreatment, in order.',
    purpose: 'Lab 8 starts from the bone marrow suspension you prepared in Lab 7. Colchicine arrests dividing cells at metaphase and must be given to the living animal before sacrifice (' + CFG.colchicine.dose + ', ' + CFG.colchicine.timing + ' — instructor-verified protocol information).',
    materials: ['Bone marrow suspension (Lab 7)'], procedure: ['Recall the Lab 7 products: separate femur and tibia marrow samples collected, centrifuged at ' + CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min and resuspended.', 'Place the stages of chromosome preparation in order.'],
    observe: 'A bone marrow cell suspension rich in cells arrested at metaphase.', safety: 'Handle all samples as biohazardous; wear gloves, lab coat and eye protection.',
    key: ['Starting material: the Lab 7 bone marrow suspension.', 'Colchicine pretreatment comes BEFORE sacrifice.', 'Order: hypotonic → harvest → fixation → slides → staining → microscopy → karyotype.'],
    structures: [['Bone marrow suspension', 'Cells from the femur and tibia.']],
    close: () => A.sampleTubes({ femur: .5, tibia: .5 }), ref: () => A.arrest(), refTitle: 'Metaphase arrest by colchicine',
    anat: () => A.arrest(), anatTitle: 'Metaphase arrest',
    req: ['tube', 'gloves', 'coat'], pool: ['tube', 'gloves', 'coat', 'colch', 'flame', 'microscope'],
    summary: 'Recalled the Lab 7 product and ordered the whole workflow.',
    stages: ctx => [
      singleStage(ctx, { prompt: 'What is the <strong>starting material</strong> of Lab 8?', options: [opt('a', 'The bone marrow cell suspension prepared in Lab 7', true, 'Correct.'), opt('b', 'A stained slide', false, 'Slides are prepared later in this lab.'), opt('c', 'An untreated fresh bone', false, 'The bones were processed in Lab 7; Lab 8 starts from the suspension.')] }),
      seqStage(ctx, { prompt: 'Place the experiment in order from the colchicine prerequisite to the karyogram.',
        items: [{ id: 1, text: 'Colchicine pretreatment (' + CFG.colchicine.dose + ', ' + CFG.colchicine.timing + ' — before sacrifice)' }, { id: 2, text: 'Bone marrow collection and suspension (Lab 7)' }, { id: 3, text: 'Hypotonic treatment' }, { id: 4, text: 'Cell harvesting and fixation' }, { id: 5, text: 'Slide preparation, spreading and staining' }, { id: 6, text: 'Microscopy and chromosome identification' }, { id: 7, text: 'Karyotyping (karyogram)' }],
        order: [1, 2, 3, 4, 5, 6, 7], okMsg: 'Correct order.', hint: 'Cells must be arrested before they are collected, swollen before they are fixed, and spread before they are stained.' })
    ]
  });

  /* ===================================================== 2 hypotonic */
  add(2, 1, {
    title: 'Hypotonic Treatment', thumb: 'bath', objective: 'Identify the hypotonic reagent and apply the protocol volume, temperature and incubation time.',
    purpose: 'A hypotonic KCl solution swells the cells by osmosis so that, later, the chromosomes spread apart instead of piling on top of each other.',
    materials: ['KCl ' + CFG.kcl.molarity, 'Water bath ' + CFG.incubation.tempC + ' °C', 'Timer'], procedure: ['Add ' + CFG.kcl.volumeMl + ' mL of KCl ' + CFG.kcl.molarity + '.', 'Incubate at ' + CFG.incubation.tempC + ' °C for ' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' min.'],
    observe: 'The cells swell and become more fragile.', safety: 'Handle the warm water bath carefully; wear gloves and a lab coat.',
    key: ['KCl ' + CFG.kcl.molarity + ' is the hypotonic solution.', CFG.kcl.volumeMl + ' mL, ' + CFG.incubation.tempC + ' °C, ' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' min.'], structures: [['Swollen cell', 'Membrane stretched by water uptake.']],
    close: () => A.cells({ swell: 1 }), ref: () => A.waterbath({ on: true, temp: CFG.incubation.tempC }), refTitle: 'Water bath',
    anat: () => A.cells({ swell: 1 }), anatTitle: 'Swollen cells',
    req: ['kcl', 'bath', 'timer', 'pipette', 'gloves'], pool: ['kcl', 'bath', 'timer', 'pipette', 'gloves', 'carnoy', 'giemsa', 'flame'],
    summary: 'Applied the hypotonic KCl treatment with the protocol volume, temperature and time.',
    stages: ctx => [
      singleStage(ctx, { prompt: 'Which reagent gives the hypotonic treatment?', options: [opt('a', 'KCl ' + CFG.kcl.molarity, true, 'Correct — the hypotonic reagent of the protocol.'), opt('b', 'Methanol : acetic acid fixative', false, 'That is the fixative, used after the hypotonic step.', true), opt('c', 'Giemsa stain', false, 'Giemsa is the stain used at the end of the slide preparation.'), opt('d', '0.9% saline', false, 'Saline is isotonic and would not swell the cells.')] }),
      volStage(ctx, { prompt: 'Set the volume of KCl to add.', label: 'KCl volume', min: 0, max: 6, start: 1, target: CFG.kcl.volumeMl, low: 'the cells will not swell enough', high: 'the cells may burst' }),
      singleStage(ctx, { prompt: 'At what temperature do you incubate?', options: [opt('a', CFG.incubation.tempC + ' °C', true, 'Correct — the protocol temperature.'), opt('b', '4 °C', false, '4 °C is the temperature of the cold slides, not the incubation.'), opt('c', '60 °C', false, 'Too hot — it would damage the cells.')] }),
      timerStage(ctx, { prompt: 'Incubate the tube: <strong>start the clock and stop it inside the protocol window (' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' min).</strong>', art: A.waterbath({ on: true, temp: CFG.incubation.tempC }), lo: CFG.incubation.minMin, hi: CFG.incubation.maxMin, okMsg: 'Incubation time within the protocol window.', low: 'The cells are not swollen enough.', high: 'The cells may burst.', stopLabel: 'Remove tube', goLabel: 'Start incubation' })
    ]
  });

  /* ===================================================== 3 harvesting */
  add(3, 1, {
    title: 'Cell Harvesting', thumb: 'rotor', objective: 'Collect the swollen cells by centrifugation at the protocol conditions.',
    purpose: 'Centrifugation collects the swollen cells as a pellet so the hypotonic solution can be removed before fixation.',
    materials: ['Centrifuge', 'Balance tube', 'Pipette'], procedure: ['Balance the rotor.', 'Spin at ' + CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min.', 'Remove the supernatant and keep the pellet.'],
    observe: 'A pellet of swollen cells at the bottom.', safety: 'Always balance the rotor.', key: ['Same protocol conditions as Lab 7: ' + CFG.spin.rpm + ' rpm, ' + CFG.spin.minutes + ' min.', 'Keep the pellet; discard the supernatant.'], structures: [['Pellet', 'Swollen cells.']],
    close: () => A.rotor({ tubes: { 0: 'sample', 3: 'balance' } }), ref: () => A.tube({ level: .7, color: '#f7dfe1', pellet: .8, pelletColor: '#b04a55' }), refTitle: 'Pellet',
    anat: () => A.tube({ level: .7, color: '#f7dfe1', pellet: .8, pelletColor: '#b04a55' }), anatTitle: 'Pellet and supernatant',
    req: ['centrifuge', 'tube', 'pipette', 'gloves'], pool: ['centrifuge', 'tube', 'pipette', 'gloves', 'bath', 'giemsa', 'flame'],
    summary: 'Harvested the cells by centrifugation at the protocol conditions.',
    stages: ctx => Cm.centrifugeStages(ctx, { pelletMsg: 'Correct — the swollen cells are in the pellet.' }).concat([
      singleStage(ctx, { prompt: 'What do you do with the liquid above the pellet?', options: [opt('a', 'Remove the supernatant carefully and keep the pellet', true, 'Correct.'), opt('b', 'Keep the supernatant and discard the pellet', false, 'The cells are in the pellet.'), opt('c', 'Shake the tube to mix everything again', false, 'That resuspends the cells in the hypotonic solution.')] })
    ])
  });

  /* ===================================================== 4 fixation */
  add(4, 1, {
    title: 'Fixation', thumb: 'bottle', objective: 'Fix the cells with the protocol fixative, ratio, volume and standing time.',
    purpose: 'The fixative (Carnoy: methanol and acetic acid) preserves the cells and chromosome structure and removes water.',
    materials: ['Methanol : acetic acid ' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts, 'Fume hood', 'Pipette'], procedure: ['Work in a fume hood.', 'Add ' + CFG.carnoy.totalMl + ' mL of fixative (' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + ' methanol : acetic acid).', 'Let it stand ' + CFG.carnoy.standMin + ' min.'],
    observe: 'The cell suspension becomes fixed.', safety: 'Methanol and acetic acid are toxic, flammable or corrosive: gloves, lab coat, eye protection and a fume hood are required.',
    key: ['Fixative ratio ' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + ' methanol : acetic acid.', CFG.carnoy.totalMl + ' mL, ' + CFG.carnoy.standMin + ' min.', 'Always in a fume hood.'], structures: [['Fixative', 'Preserves cell structure.']],
    close: () => A.fume(), ref: () => A.bottle({ l1: 'Fixative', l2: '3:1' }), refTitle: 'Fixative',
    anat: () => A.fume(), anatTitle: 'Fume hood',
    req: ['carnoy', 'fume', 'pipette', 'gloves', 'goggles', 'coat'], pool: ['carnoy', 'fume', 'pipette', 'gloves', 'goggles', 'coat', 'kcl', 'giemsa', 'flame'],
    summary: 'Fixed the cells with the protocol fixative in a fume hood.',
    stages: ctx => [
      singleStage(ctx, { prompt: 'Which reagent fixes the cells?', options: [opt('a', 'Methanol : acetic acid (Carnoy fixative)', true, 'Correct.'), opt('b', 'KCl', false, 'KCl is the hypotonic solution.'), opt('c', 'Giemsa', false, 'Giemsa stains the chromosomes; it does not fix.'), opt('d', 'Distilled water', false, 'Water does not fix cells.')] }),
      singleStage(ctx, { prompt: 'What ratio of methanol : acetic acid is used?', options: [opt('a', CFG.carnoy.methanolParts + ' : ' + CFG.carnoy.aceticParts, true, 'Correct — the protocol ratio.'), opt('b', CFG.carnoy.aceticParts + ' : ' + CFG.carnoy.methanolParts, false, 'The ratio is the other way round.'), opt('c', '1 : 1', false, 'Not the protocol ratio.')] }),
      volStage(ctx, { prompt: 'Set the volume of fixative to add.', label: 'Fixative volume', min: 0, max: 6, start: 1, target: CFG.carnoy.totalMl, low: 'the cells will be incompletely fixed', high: 'the cells are over-diluted' }),
      singleStage(ctx, { prompt: 'Where do you work with the fixative?', options: [opt('a', 'In a fume hood', true, 'Correct — methanol and acetic acid vapours are harmful.'), opt('b', 'On the open bench near the flame', false, 'Flammable vapours near a flame are a fire hazard.', true), opt('c', 'Anywhere — the fumes are harmless', false, 'The fumes are harmful.', true)] }),
      timerStage(ctx, { prompt: 'Let the fixative stand: <strong>start the clock and stop it after at least ' + CFG.carnoy.standMin + ' min.</strong>', art: A.fume(), lo: CFG.carnoy.standMin, hi: null, okMsg: 'The fixation time is met.', low: 'The cells are not fully fixed.', high: '', stopLabel: 'Finish fixation', goLabel: 'Start timing' })
    ]
  });

  /* ===================================================== 5 slide prep */
  add(5, 2, {
    title: 'Slide Preparation', thumb: 'slide', objective: 'Select and prepare the correct slide.',
    purpose: 'A clean slide kept cold and wet in ' + L8.slide.ethanolPct + '% ethanol helps the fixed cells spread evenly.',
    materials: ['Clean glass slides', 'Cold ' + L8.slide.ethanolPct + '% ethanol at ' + L8.slide.tempC + ' °C', 'Forceps'], procedure: ['Take a clean slide from the cold ' + L8.slide.ethanolPct + '% ethanol (' + L8.slide.tempC + ' °C).', 'Handle by the edges with forceps.'],
    observe: 'A clean, wet, cold slide.', safety: 'Ethanol is flammable: keep it away from flames.', key: ['Cold ' + L8.slide.ethanolPct + '% ethanol, ' + L8.slide.tempC + ' °C.', 'Handle by the edges.'], structures: [['Glass slide', 'Receives the suspension.']],
    close: () => A.slide({ wet: true, label: '70% EtOH' }), ref: () => A.slide({ wet: true, label: '4 °C', note: 'wet, cold' }), refTitle: 'Prepared slide',
    anat: () => A.slide({ wet: true }), anatTitle: 'Slide',
    req: ['slide', 'etoh', 'forceps', 'gloves'], pool: ['slide', 'etoh', 'forceps', 'gloves', 'giemsa', 'flame', 'methblue'],
    summary: 'Prepared a clean cold slide.',
    stages: ctx => [singleStage(ctx, { prompt: 'Which slide do you use for the cell suspension?', options: [
      opt('ok', 'A clean slide kept in cold ' + L8.slide.ethanolPct + '% ethanol at ' + L8.slide.tempC + ' °C', true, 'Correct — a clean, cold, wet slide gives the best spreading.'),
      opt('dry', 'A dry slide straight from the box at room temperature', false, 'A dry, uncleaned slide spreads cells unevenly.'),
      opt('hot', 'A slide warmed on a hot plate beforehand', false, 'Not the protocol; warm slides dry the drop too fast.'),
      opt('abs', 'A slide kept in methanol at room temperature', false, 'Not the protocol condition, and methanol is toxic and flammable.', true)] })]
  });

  /* ===================================================== 6 spreading */
  add(6, 2, {
    title: 'Chromosome Spreading', thumb: 'cells', objective: 'Apply the protocol number of drops and review the safety measures before the simulated spreading.',
    purpose: 'Dropping the suspension onto the cold wet slide deposits the fixed, swollen cells; they burst gently and release their chromosomes, which disperse and flatten onto the glass.',
    materials: ['Fixed cell suspension', 'Pipette', 'Prepared slide'], procedure: ['Apply ' + L8.drops.min + '–' + L8.drops.max + ' drops.', 'Complete the safety check before any flame-related step.', 'The spreading is only simulated here.'],
    observe: 'Cells flatten and burst; chromosomes scatter as separate bodies.', safety: 'Alcohol vapour is flammable and a flame is an ignition source. Never perform flame steps unsupervised.',
    key: [L8.drops.min + '–' + L8.drops.max + ' drops per slide.', 'Flame and alcohol are a fire hazard.'], structures: [['Swollen cell', 'Membrane stretched.'], ['Released chromosomes', 'Spread apart.']],
    close: () => A.slide({ drops: [0, 1] }), ref: () => spreadScene(1), refTitle: 'Dispersed chromosomes (simulation)', viewTab: 'Microscopy View',
    anat: () => spreadScene(1), anatTitle: 'Dispersed chromosomes (simulation)',
    req: ['dropper', 'slide', 'gloves', 'goggles', 'coat'], pool: ['dropper', 'slide', 'gloves', 'goggles', 'coat', 'giemsa', 'centrifuge', 'flame'],
    summary: 'Applied the drops and watched the simulated spreading.',
    stages: ctx => [
      next => {
        let drops = [];
        const host = h('div.hero', { html: A.slide({ drops }) }), count = h('p.counter', '0 drops applied');
        const redraw = () => { host.innerHTML = A.slide({ drops: drops.map((d, i) => i - 1) }); count.textContent = drops.length + ' drop' + (drops.length === 1 ? '' : 's') + ' applied'; };
        return h('div.task-block', [h('p.task-prompt', 'Apply the protocol number of drops, then confirm.'), host, count, h('div.task-actions', [
          h('button.btn', { id: 'btn-drop', onclick: () => { if (drops.length >= 6) return; drops.push(1); redraw(); } }, '💧 Add a drop'),
          h('button.btn', { onclick: () => { drops = []; redraw(); } }, 'Clear slide'),
          h('button.btn.primary', { onclick: () => {
            if (!drops.length) return ctx.fb('hint', 'Add at least one drop first.');
            ctx.attempt();
            if (drops.length >= L8.drops.min && drops.length <= L8.drops.max) { ctx.fb('ok', drops.length + ' drops is within the protocol (' + L8.drops.min + '–' + L8.drops.max + ').'); next(); }
            else ctx.fb('sci', drops.length < L8.drops.min ? 'Too little suspension: very few cells will be on the slide.' : 'Too much suspension: cells pile up and chromosomes overlap.');
          } }, 'Confirm')])]);
      },
      multiStage(ctx, { prompt: 'Before any flame-related step, which precautions are required? Select all that apply.', options: [
        opt('a', 'Work only under trained supervision in an approved laboratory', true), opt('b', 'Keep alcohol and fixative containers closed and well away from the flame', true), opt('c', 'Wear lab coat, gloves and goggles; tie back long hair', true), opt('d', 'Know where the fire extinguisher, fire blanket and exit are', true),
        opt('e', 'Pour a little alcohol on the flame to dry the slide faster', false, 'Pouring alcohol near a flame can cause a flash fire and burns.', true), opt('f', 'Leave the flame burning unattended between slides', false, 'An unattended flame near flammables is a fire hazard.', true)],
        okMsg: 'Correct — supervision, closed flammables, PPE and emergency awareness are required.', missHint: 'Think about who supervises, where the alcohol is, what you wear and what to do if there is a fire.' }),
      next => {
        const host = h('div.hero', { html: spreadScene(0) }); let busy = false;
        return h('div.task-block', [h('p.task-prompt', 'Start the simulated spreading and watch the progression from cells to dispersed chromosomes.'), host, h('div.task-actions', h('button.btn.primary', { id: 'btn-spread', onclick: ev => {
          if (busy) return; busy = true; ev.target.disabled = true; ctx.attempt(); let p = 0;
          const iv = setInterval(() => { p += 0.04; host.innerHTML = spreadScene(Math.min(1, p)); if (p >= 1) { clearInterval(iv); ctx.fb('ok', 'The simulation shows the cells bursting and the chromosomes dispersing across the slide. This is an educational animation, not a real result.'); next(); } }, 60);
        } }, 'Start simulated spreading'))]);
      }
    ]
  });

  /* ===================================================== 7 staining */
  add(7, 2, {
    title: 'Staining, Rinsing and Drying', thumb: 'jar', objective: 'Stain the slide with the protocol Giemsa solution and time, then rinse and dry it correctly.',
    purpose: 'Giemsa binds DNA and colours the chromosomes dark purple. Gentle rinsing and air-drying keep the spread chromosomes on the slide.',
    materials: ['Giemsa working solution ' + L8.giemsa.pct + '%', 'Timer', 'Distilled water', 'Filter paper'], procedure: ['Stain with ' + L8.giemsa.pct + '% Giemsa for ' + L8.giemsa.minutes + ' min.', 'Rinse gently with distilled water.', 'Air-dry on filter paper.'],
    observe: 'A purple-stained film.', safety: 'Giemsa contains methanol: gloves and lab coat.', key: [L8.giemsa.pct + '% Giemsa, ' + L8.giemsa.minutes + ' min.', 'Gentle rinse; air-dry; no heat.'], structures: [['Giemsa', 'DNA-binding stain.']],
    close: () => A.jar({ label: 'Giemsa 10%' }), ref: () => A.slide({ stain: 'pour', note: 'stained' }), refTitle: 'Slide being stained',
    anat: () => A.slide({ stain: 'pour', note: 'stained' }), anatTitle: 'Stained slide',
    req: ['giemsa', 'timer', 'water', 'paper', 'slide', 'gloves'], pool: ['giemsa', 'timer', 'water', 'paper', 'slide', 'gloves', 'methblue', 'kcl', 'flame'],
    summary: 'Stained with ' + L8.giemsa.pct + '% Giemsa for ' + L8.giemsa.minutes + ' min, rinsed and air-dried.',
    stages: ctx => [
      singleStage(ctx, { prompt: 'Which solution do you apply to the slide?', options: [opt('g10', 'Giemsa working solution at ' + L8.giemsa.pct + '%', true, 'Correct — the protocol working dilution.'), opt('stock', 'Undiluted Giemsa stock solution', false, 'Undiluted stock over-stains.'), opt('weak', 'A 1% Giemsa solution', false, 'Too dilute: chromosomes would be faint.'), opt('eth', '70% ethanol', false, 'Ethanol is not a stain, and it is flammable.', true)] }),
      timerStage(ctx, { prompt: 'Stain for the protocol time: <strong>start the clock and stop it after at least ' + L8.giemsa.minutes + ' min.</strong>', art: A.slide({ stain: 'pour', note: 'Giemsa applied' }), lo: L8.giemsa.minutes, hi: null, okMsg: L8.giemsa.minutes + ' minutes complete — the chromosomes are stained.', low: 'The chromosomes would be under-stained and faint.', high: '', stopLabel: 'Rinse', goLabel: 'Start staining', stopId: 'btn-rinse' }),
      singleStage(ctx, { prompt: 'How do you rinse the stained slide?', options: [opt('g', 'Gently with distilled water', true, 'Correct.'), opt('j', 'With a strong jet of tap water', false, 'A strong jet washes the chromosomes off.'), opt('a', 'With absolute ethanol', false, 'Ethanol would destain the preparation and is flammable.', true)] }),
      singleStage(ctx, { prompt: 'How do you dry the slide?', options: [opt('a', 'Air-dry on filter paper', true, 'Correct.'), opt('f', 'Hold it over a flame', false, 'Heating a wet slide over a flame is a burn and fire hazard.', true), opt('w', 'Wipe it with a tissue', false, 'Wiping removes the chromosomes.')] })
    ]
  });

  /* ===================================================== 8 slide quality */
  const QUAL = [['good', 31, 'Complete, well-separated chromosomes on a clean background'], ['overlap', 21, 'Chromosomes overlap'], ['incomplete', 41, 'Cell broken, chromosomes lost'], ['interphase', 11, 'No condensed chromosomes (interphase)']];
  add(8, 2, {
    title: 'Slide Quality Evaluation', thumb: 'slide', objective: 'Compare acceptable and unacceptable preparations and choose the best slide.',
    purpose: 'Only a slide with complete, well-separated, well-stained metaphases is worth analysing. Overlapping, broken or interphase preparations cannot be karyotyped.',
    materials: ['Four stained slides'], procedure: ['Compare the preparations.', 'Choose the best slide.'], observe: 'The best slide has complete, separate chromosomes.', safety: 'No special hazards.',
    key: ['Good: complete, separated, condensed chromosomes.', 'Bad: overlap, loss, interphase nuclei.'], structures: [['Acceptable', 'Complete and separated.'], ['Unacceptable', 'Overlap, loss or interphase.']],
    close: () => miniMicro('good', 31), ref: () => miniMicro('overlap', 21), refTitle: 'An unacceptable preparation (overlap)', viewTab: 'Microscopy View',
    anat: () => miniMicro('good', 31), anatTitle: 'An acceptable preparation',
    req: ['microscope', 'slide', 'gloves'], pool: ['microscope', 'slide', 'gloves', 'giemsa', 'centrifuge', 'flame'],
    summary: 'Chose the best-quality slide.',
    stages: ctx => [
      next => T.cards(ctx, { prompt: 'Four stained slides were prepared. <strong>Choose the best slide for analysis.</strong>', cards: QUAL.map((q, i) => ({ id: q[0], html: miniMicro(q[0], q[1] + (ctx.exam ? Math.floor(ctx.rnd() * 3) * 100 : 0)), label: 'Slide ' + 'ABCD'[i] })), correct: 'good', onDone: next,
        okMsg: 'Correct — a complete set of well-separated chromosomes.', wrong: { overlap: 'Chromosomes overlap here, so they cannot be told apart.', incomplete: 'The cell has broken and chromosomes are missing.', interphase: 'These are interphase nuclei with no condensed chromosomes.' } }),
      singleStage(ctx, { prompt: 'Which feature makes a slide <strong>unacceptable</strong>?', options: [opt('a', 'Overlapping chromosomes, lost chromosomes or interphase nuclei', true, 'Correct.'), opt('b', 'A clean background', false, 'A clean background is desirable.'), opt('c', 'Well-separated chromosomes', false, 'That is what you want.')] })
    ]
  });

  /* ===================================================== 9 microscope */
  const FIELDS = { '0,1': { variant: 'interphase', seed: 11 }, '2,0': { variant: 'overlap', seed: 21 }, '1,2': { variant: 'good', seed: 31 }, '2,2': { variant: 'incomplete', seed: 41 } };
  const OBJ = [4, 10, 40, 100];
  const fieldsFor = ctx => {
    if (!ctx.exam) return FIELDS;
    const cells = ['0,0', '1,0', '2,0', '0,1', '2,1', '0,2', '1,2', '2,2'], pick = KL.UI.shuffle(cells, ctx.rnd), out = {};
    [['good', 31], ['overlap', 21], ['incomplete', 41], ['interphase', 11]].forEach((v, i) => { out[pick[i]] = { variant: v[0], seed: v[1] }; });
    return out;
  };
  add(9, 3, {
    title: 'Virtual Microscope', thumb: 'microscope', objective: 'Place and focus the slide, scan it and select a suitable metaphase spread.',
    purpose: 'The stained slide is scanned at low power, then examined at ' + L8.objective + '× (course protocol) to choose a complete, well-spread metaphase.',
    materials: ['Light microscope', 'Stained slide'], procedure: ['Place the slide on the stage.', 'Focus.', 'Scan at low power; analyse at ' + L8.objective + '×.', 'Select a suitable metaphase on your own.'],
    observe: 'Dark chromosomes on a pale background.', safety: 'Carry the microscope with both hands; never let the objective touch the slide.',
    key: ['Scan low, analyse at ' + L8.objective + '×.', 'A good spread: complete, separated.', 'Interphase nuclei have no visible chromosomes.'], structures: [['Interphase nucleus', 'No separate chromosomes.'], ['Metaphase spread', 'Chromosomes dispersed.']],
    close: () => A.microscope(), ref: () => simMicro('good', 31), refTitle: 'Simulated metaphase', viewTab: 'Microscopy View',
    anat: () => simMicro('good', 31), anatTitle: 'Simulated metaphase',
    req: ['microscope', 'slide'], pool: ['microscope', 'slide', 'ruler', 'timer', 'centrifuge', 'flame'],
    summary: 'Placed, focused and scanned the slide and selected a suitable metaphase.',
    stages: ctx => {
      const FLD = fieldsFor(ctx); KL.LAB8.current = FLD;
      return [
        singleStage(ctx, { prompt: 'How do you place the slide on the stage?', options: [opt('a', 'Stained side up, secured by the stage clips, with the specimen over the light opening', true, 'Correct.'), opt('b', 'Stained side down, held by hand', false, 'The specimen must face up and be secured.'), opt('c', 'Under the stage, away from the light', false, 'The specimen must be over the light opening.')] }),
        next => {
          const target = 20 + Math.floor((ctx.exam ? ctx.rnd() : 0.5) * 60);
          let val = 0;
          const prev = h('div.hero.focus-view', { html: miniMicro('good', 31) }), read = h('output', 'Focus: 0');
          const upd = () => { const blur = Math.min(8, Math.abs(val - target) / 6); prev.firstChild.style.filter = 'blur(' + blur.toFixed(1) + 'px)'; read.textContent = 'Focus: ' + val; };
          const sl = h('input', { type: 'range', id: 'focus-range', min: 0, max: 100, step: 1, value: 0, 'aria-label': 'Fine focus', oninput: () => { val = +sl.value; upd(); } });
          upd();
          return h('div.task-block', [h('p.task-prompt', 'Turn the focus control until the image is <strong>sharp</strong>, then confirm.'), prev, h('label.dial', [h('span', 'Focus'), sl, read]), h('div.task-actions', h('button.btn.primary', { id: 'btn-focus', onclick: () => {
            ctx.attempt();
            if (Math.abs(val - target) <= 6) { ctx.fb('ok', 'The image is in focus.'); next(); } else ctx.fb('sci', 'The image is still blurred. Keep adjusting the focus.');
          } }, 'Confirm focus'))]);
        },
        next => {
          let obj = 4, pos = { c: 1, r: 1 }, marks = new Set(), counting = false;
          const root = h('div.scope');
          const viewSVG = () => {
            const f = FLD[pos.c + ',' + pos.r], scale = { 4: 0.18, 10: 0.42, 40: 1, 100: 1 }[obj];
            let inner;
            if (!f) { inner = '<rect width="600" height="450" fill="#efe6ef"/>'; const r = KL.UI.rng(pos.c * 7 + pos.r * 13 + 3); for (let i = 0; i < 24; i++) inner += '<circle cx="' + (r() * 600) + '" cy="' + (r() * 450) + '" r="' + (1 + r() * 3) + '" fill="#cdb9d3" opacity=".7"/>'; }
            else inner = '<g transform="translate(300 225) scale(' + scale + ') translate(-300 -225)">' + KY.spreadSVG(KY.makeSpread(f.variant, f.seed), { marks, interactive: obj >= 40 && counting }) + '</g>';
            return '<svg class="scope-svg" viewBox="0 0 600 450" role="img" aria-label="Microscope field"><defs><clipPath id="fov"><circle cx="300" cy="225" r="218"/></clipPath></defs><rect width="600" height="450" fill="#12161f"/><g clip-path="url(#fov)">' + inner + (obj === 100 ? '<rect width="600" height="450" fill="#fff" opacity=".25"/>' : '') + '</g><circle cx="300" cy="225" r="218" fill="none" stroke="#12161f" stroke-width="14"/></svg>';
          };
          const choose = () => {
            const f = FLD[pos.c + ',' + pos.r]; ctx.attempt();
            if (obj !== L8.objective) return ctx.fb('sci', 'Select the spread at the ' + L8.objective + '× objective, as in the course protocol.');
            if (!f) return ctx.fb('sci', 'There is no cell in this field. Move the stage to a field that contains cells.');
            if (f.variant === 'interphase') return ctx.fb('sci', 'These are interphase nuclei: no condensed chromosomes, so they cannot be karyotyped.');
            if (f.variant === 'overlap') return ctx.fb('sci', 'This metaphase is complete but several chromosomes overlap. Look for a better-spread cell.');
            if (f.variant === 'incomplete') return ctx.fb('sci', 'The cell has broken and chromosomes are lost: the set is incomplete. Look for a cell with all chromosomes.');
            lab8().spread = { variant: f.variant, seed: f.seed }; KL.Store.save();
            ctx.fb('ok', 'Good choice — a complete, well-separated metaphase. This simulated spread will be used for the karyotype.'); next();
          };
          const draw = () => {
            const f = FLD[pos.c + ',' + pos.r];
            root.innerHTML = '';
            const view = h('div.scope-view', { html: viewSVG() });
            view.querySelectorAll('.sp-chr').forEach(g => g.addEventListener('click', () => { const id = g.dataset.id; marks.has(id) ? marks.delete(id) : marks.add(id); draw(); }));
            const objBtns = h('div.seg', OBJ.map(o => h('button.btn.sm' + (o === obj ? '.on' : ''), { 'aria-label': o + ' times objective', onclick: () => { obj = o; draw(); } }, o + '×')));
            const nav = (dc, dr, t) => h('button.btn.sm', { 'aria-label': 'Move stage ' + t, onclick: () => { pos = { c: Math.max(0, Math.min(2, pos.c + dc)), r: Math.max(0, Math.min(2, pos.r + dr)) }; marks = new Set(); draw(); } }, t);
            const mini = h('div.minimap', [0, 1, 2].map(r => h('div.mrow', [0, 1, 2].map(c => h('span.mcell' + (c === pos.c && r === pos.r ? '.cur' : ''), 'ABC'[c] + (r + 1))))));
            const hint = ctx.exam ? '' : (obj === 4 ? 'Low power: scan the slide for dark spots (cells).' : obj === 10 ? 'Medium power: cells are visible but chromosomes are too small to analyse.' : obj === 40 ? (f ? 'Analysis objective: inspect the chromosomes.' : 'No cells in this field. Move the stage.') : 'Oil immersion (100×) is not used in this protocol.');
            const count = h('div.count', [h('label.switch', [h('input', { type: 'checkbox', checked: counting, onchange: e => { counting = e.target.checked; draw(); } }), ' Count tool (click chromosomes)']), h('span.tally', 'Marked: ' + marks.size), h('button.btn.xs', { onclick: () => { marks = new Set(); draw(); } }, 'Clear')]);
            root.appendChild(h('div.scope-grid', [view, h('div.scope-ctl', [h('div.lbl', 'Objective'), objBtns, h('div.lbl', 'Stage — field ' + 'ABC'[pos.c] + (pos.r + 1)), h('div.stage-pad', [nav(0, -1, '↑'), h('div', [nav(-1, 0, '←'), nav(1, 0, '→')]), nav(0, 1, '↓')]), mini, h('p.scope-hint', hint), count, h('button.btn.primary', { id: 'btn-use-spread', onclick: choose }, 'Use this spread for karyotyping')])]));
          };
          draw();
          return h('div.task-block', [note('<strong>Simulated microscope.</strong> The images are teaching models, not real observations.'), root]);
        }
      ];
    }
  });

  /* ===================================================== 10 chromosome identification */
  const chrCard = (id, sc) => { const c = K0.chroms.filter(x => x.id === id)[0]; return { id, html: '<div class="chr-card">' + KY.chromSVG(c, { sc: sc || 6 }).html + '</div>' }; };
  const shuffleWith = (ctx, a) => KL.UI.shuffle(a, ctx.rnd);
  add(10, 3, {
    title: 'Chromosome Identification', thumb: 'karyo', objective: 'Recognise chromosome morphology: size, centromere position, count.',
    purpose: 'Identifying chromosomes by length and centromere position is the basis for pairing homologues.',
    materials: ['Selected metaphase'], procedure: ['Compare lengths.', 'Find the centromere.', 'Count the chromosomes.'], observe: 'Chromosomes differ in length and centromere position.', safety: 'No special hazards.',
    key: ['Centromere at the end = telocentric.', 'Rat diploid number 2n = 42.'], structures: [['Centromere', 'Constriction joining the arms.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Centromere positions',
    intro: PLACEHOLDER,
    req: ['microscope', 'calc'], pool: ['microscope', 'calc', 'ruler', 'centrifuge', 'timer', 'flame'],
    summary: 'Identified chromosome size, centromere position and count.',
    stages: ctx => {
      const sets = shuffleWith(ctx, [['4a', '10a', '13a', '20a'], ['5a', '12a', '16a', '19a'], ['6a', '9a', '15a', '18a']])[0];
      const telo = shuffleWith(ctx, [['1a', '4a', '13a'], ['3a', '5a', '14a'], ['2a', '7a', '17a']])[0];
      return [
        next => T.cards(ctx, { prompt: 'Which of these chromosomes is the <strong>longest</strong>?', cards: sets.map(i => chrCard(i)), correct: sets[0], onDone: next, okMsg: 'Correct — it has the greatest total length.', otherWhy: 'Compare total length from end to end.' }),
        next => T.cards(ctx, { prompt: 'Which chromosome is <strong>telocentric</strong> (centromere at the end, no short arm)?', cards: telo.map(i => chrCard(i)), correct: telo.filter(i => K0.chroms.filter(c => c.id === i)[0].S === 0), onDone: next, okMsg: 'Correct — the centromere is at the end.', otherWhy: 'A telocentric chromosome has no short arm: the centromere sits at one end.' }),
        singleStage(ctx, { prompt: 'How many chromosomes does a complete rat metaphase spread contain?', options: [opt('a', '42', true, 'Correct — the diploid number of the rat is 2n = 42.'), opt('b', '46', false, 'That is the human diploid number.'), opt('c', '21', false, 'That is the haploid number.'), opt('d', '40', false, 'That is the mouse diploid number.')] })
      ];
    }
  });

  /* ===================================================== 11 homologue pairing */
  add(11, 3, {
    title: 'Homologue Matching', thumb: 'karyo', objective: 'Match each chromosome with its homologue by size and centromere position.',
    purpose: 'Homologous chromosomes have the same length and centromere position; matching them is the first step of arranging a karyogram.',
    materials: ['Chromosome images'], procedure: ['Take one chromosome.', 'Find the one with the same length and centromere position.'], observe: 'Each chromosome has one match.', safety: 'No special hazards.',
    key: ['Homologues match in size and centromere position.', 'X and Y differ and do not pair as homologues.'], structures: [['Homologues', 'Matching pair, one from each parent.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Centromere positions',
    intro: PLACEHOLDER,
    req: ['microscope', 'ruler', 'calc'], pool: ['microscope', 'ruler', 'calc', 'giemsa', 'centrifuge', 'flame'],
    summary: 'Matched homologous chromosomes.',
    stages: ctx => shuffleWith(ctx, [['3', ['8', '10', '16']], ['7', ['11', '9', '14']], ['13', ['15', '17', '19']], ['1', ['2', '12', '5']]]).slice(0, 3).map(set => next => {
      const ref = set[0], others = set[1], opts = [ref + 'b'].concat(others.map(o => o + 'a'));
      const refC = K0.chroms.filter(c => c.id === ref + 'a')[0];
      return T.cards(ctx, { prompt: 'Find the <strong>homologue</strong> of this chromosome: <span class="chr-inline">' + KY.chromSVG(refC, { sc: 5 }).html + '</span>', cards: opts.map(i => chrCard(i)), correct: ref + 'b', onDone: next,
        okMsg: 'Correct — same length and centromere position.', otherWhy: 'That chromosome differs in size or centromere position. Compare again.' });
    })
  });

  /* ===================================================== 12 karyogram */
  add(12, 4, {
    title: 'Arrange the Karyogram', thumb: 'karyo', objective: 'Pair, order, orient, align and label the chromosomes in the course four-row arrangement.',
    purpose: 'A karyogram arranges the chromosomes of one cell into homologous pairs, ordered by size, so the chromosome number and any structural features can be examined. It is not arranged automatically.',
    materials: ['Selected metaphase spread', 'Karyotype sheet'], procedure: ['Find homologous pairs by size and centromere position.', 'Arrange the pairs in descending order of size.', 'Align the centromeres on one line; short arms up.', 'Place the sex chromosomes last.',
      'Course layout: <strong>Row 1</strong> large (Groups A, B) · <strong>Row 2</strong> medium (Group C) · <strong>Row 3</strong> small (Groups D, E) · <strong>Row 4</strong> minute (Groups F, G).'],
    observe: 'A tidy karyogram of 20 autosome pairs plus X and Y (2n = 42).', safety: 'No special hazards.', key: ['Pairs are matched by size and centromere position.', 'Largest to smallest; sex chromosomes last.', 'Centromeres on one line; short arms up.'],
    structures: [['Autosomes', '20 pairs.'], ['Sex chromosomes', 'X and Y.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Chromosome types',
    intro: PLACEHOLDER,
    req: ['ruler', 'calc'], pool: ['ruler', 'calc', 'microscope', 'giemsa', 'flame'],
    summary: 'Arranged the karyogram correctly.',
    stages: ctx => [next => {
      const L = lab8(), sp = L.spread || { seed: 31 };
      if (!L.karyotype) { L.karyotype = KY.initState(sp.seed); KL.Store.save(); }
      const K = L.karyotype, host = h('div.karyo-host');
      const m = KY.mount(host, { K, onChange: () => KL.Store.save() });
      const out = h('div.kres', { 'aria-live': 'polite' });
      const maxChecks = ctx.exam ? 3 : Infinity;
      const check = h('button.btn.primary', { id: 'btn-check-karyo', onclick: () => {
        K.checks++; ctx.attempt(); const r = m.check(); KL.Store.save();
        if (r.perfect) { out.className = 'kres fb ok'; out.innerHTML = '<strong>Karyogram correct.</strong> All 21 positions are right.'; next(); }
        else {
          out.className = 'kres fb sci';
          out.innerHTML = ctx.exam ? '<strong>Not yet correct.</strong> ' + r.issues.length + ' position' + (r.issues.length === 1 ? '' : 's') + ' still wrong.' : '<strong>Not yet right:</strong><ul>' + r.issues.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>';
          ctx.errored();
        }
      } }, 'Check karyogram');
      const reset = h('button.btn', { onclick: () => KL.UI.confirmDialog('Reset the arrangement?', 'All chromosomes return to the tray and the labels are cleared.', () => { m.reset(); out.innerHTML = ''; out.className = 'kres'; }, 'Reset arrangement') }, 'Reset arrangement');
      return h('div.task-block', [h('p.task-prompt', 'The 42 chromosomes of the selected spread are in the tray in random orientation. Build the karyogram.'), host, h('div.task-actions', [check, reset]), out]);
    }]
  });

  /* ===================================================== 13 measure */
  add(13, 4, {
    title: 'Measure and Calculate', thumb: 'ruler', objective: 'Measure chromosome arms and calculate AR, centromeric index and relative length.',
    purpose: 'Measuring chromosome arms gives objective numbers (arm ratio, centromeric index, relative length) for describing each chromosome pair.',
    materials: ['Karyogram', 'Ruler', 'Calculator'], procedure: ['Measure the short arm and the long arm of both homologues (simulated µm).', 'Average the two homologues.', '<strong>AR</strong> = average long arm ÷ average short arm', '<strong>CI</strong> (long arm) = average long arm ÷ total length × 100', '<strong>RL</strong> = average chromosome length ÷ total haploid length × 100 (haploid = ½ × diploid sum)'],
    observe: 'Numeric values for each pair; telocentric chromosomes have no measurable short arm, so AR is not defined.', safety: 'No special hazards.',
    key: ['CI uses the LONG arm.', 'Telocentric: AR undefined.', 'Haploid total = ½ × sum of all 42 chromosome lengths.'], structures: [['Short arm (p)', 'Above the centromere.'], ['Long arm (q)', 'Below the centromere.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Chromosome arms',
    intro: PLACEHOLDER,
    req: ['ruler', 'calc'], pool: ['ruler', 'calc', 'timer', 'microscope', 'flame'],
    summary: 'Measured the arms and calculated AR, CI and RL.',
    stages: ctx => [next => {
      const L = lab8(), host = h('div.meas');
      const wrap = h('div', [note('<strong>Simulated scale.</strong> All lengths are in simulated µm on a single consistent scale.'), host]);
      KL.Measure.mountMeasure(host, L.measure, ctx, () => KL.Store.save());
      return wrap;
    }]
  });

  /* ===================================================== 14 classify */
  add(14, 4, {
    title: 'Classify the Chromosomes', thumb: 'classify', objective: 'Classify each measured pair using the course criteria.',
    purpose: 'Classification by centromere position (metacentric, submetacentric, acrocentric, telocentric) summarises chromosome shape using AR and CI.',
    materials: ['Your measurements and calculations'], procedure: ['Decide first whether the centromere is at the end (telocentric).', 'Otherwise compare AR and long-arm CI with the course criteria.'], observe: 'Each measured pair gets one class.', safety: 'No special hazards.',
    key: ['Metacentric 1.0–1.5 / 50–60 %.', 'Submetacentric 1.6–3.0 / 61–75 %.', 'Acrocentric 3.1+ / 76–100 %.', 'Telocentric: centromere at the end; AR not defined.'], structures: [['Centromere position', 'Determines the class.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Chromosome types',
    intro: PLACEHOLDER,
    req: ['calc', 'ruler'], pool: ['calc', 'ruler', 'timer', 'microscope', 'flame'],
    summary: 'Classified the measured chromosome pairs.',
    stages: ctx => [next => {
      const L = lab8(), host = h('div.classify');
      const missing = CFG.measure.requiredPairs.filter(id => !(L.measure[id] && L.measure[id].calcOk));
      if (missing.length) return h('div.sim-note', 'Complete the measurements in the previous step first (pairs ' + missing.join(', ') + ').');
      KL.Measure.mountClassify(host, L.measure, L.classify, ctx, () => KL.Store.save());
      return host;
    }]
  });

  /* ===================================================== 15 final */
  add(15, 4, {
    title: 'Final Analysis and Submission', thumb: 'karyo', objective: 'Review your karyogram, measurements and classification, then submit the karyogram for evaluation.',
    purpose: 'The final analysis brings together the karyogram, the measurements and the classification of the selected cell.',
    materials: ['Your completed analysis'], procedure: ['Review the karyogram.', 'Check the measurement table.', 'Submit the karyogram for evaluation.'], observe: 'A complete summary for one simulated rat metaphase (2n = 42).', safety: 'No special hazards.',
    key: ['The simulated model is idealised and for teaching.', '2n = 42.', 'Report AR as n/a for telocentric chromosomes.'], structures: [['Karyogram', 'Ordered, labelled pairs.']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    anat: () => typesDiagram(), anatTitle: 'Chromosome types',
    intro: PLACEHOLDER,
    req: ['calc'], pool: ['calc', 'ruler', 'timer', 'flame'],
    summary: 'Reviewed the analysis and submitted the karyogram for evaluation.',
    stages: ctx => [next => {
      const L = lab8(), M = L.measure, req = CFG.measure.requiredPairs;
      const kar = L.karyotype ? KY.staticHTML(L.karyotype) : h('p', 'No karyogram yet.');
      const rows = req.map(id => { const r = M[id] && M[id].res; if (!r) return ''; return '<tr><th>' + id + '</th><td>' + KL.Measure.fmt(r.avgL) + '</td><td>' + KL.Measure.fmt(r.avgS) + '</td><td>' + (r.telo ? 'n/a' : KL.Measure.fmt(r.ar)) + '</td><td>' + KL.Measure.fmt(r.ci, 1) + '</td><td>' + KL.Measure.fmt(r.rl, 2) + '</td><td>' + esc(L.classify[id] || '—') + '</td></tr>'; }).join('');
      const out = h('div.kres');
      const fin = h('button.btn.primary', { id: 'btn-submit-karyo', onclick: () => {
        ctx.attempt();
        const r = L.karyotype ? KY.evaluate(L.karyotype) : { perfect: false, issues: ['No karyogram has been built.'] };
        if (!r.perfect) { out.className = 'kres fb sci'; out.innerHTML = '<strong>The karyogram still has errors.</strong> Return to the arrangement step and correct it.'; ctx.errored(); return; }
        out.className = 'kres fb ok'; out.innerHTML = '<strong>Karyogram submitted.</strong> All 21 positions evaluated correct.'; next();
      } }, 'Submit karyogram for evaluation');
      return h('div.task-block', [note(PLACEHOLDER), h('h4', 'Your karyogram (2n = 42)'), h('div.final-kar', kar),
        h('h4', 'Measurements, calculations and classification'), h('div.tscroll', { html: '<table class="ctab"><thead><tr><th>Pair</th><th>Avg long arm</th><th>Avg short arm</th><th>AR</th><th>Long-arm CI %</th><th>RL %</th><th>Class</th></tr></thead><tbody>' + rows + '</tbody></table>' }),
        h('p.tiny', 'Haploid total length used for RL: ' + KL.Measure.fmt(K0.haploidTotal, 2) + ' µm (simulated) = ½ × ' + KL.Measure.fmt(K0.diploidTotal, 2) + '.'), h('div.task-actions', fin), out]);
    }]
  });

  KL.LAB8 = { PH, STEPS, FIELDS, TD };
})();
