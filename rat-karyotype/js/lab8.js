/* =========================================================================
   lab8.js — Lab 8: Chromosome Spreading, Staining and Karyotype Analysis.
   10 steps. Locked until Lab 7 is complete (enforced in storage.js and the router).
   All microscopy images are SIMULATED teaching models, not real student observations.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc, clock, fmtClock } = KL.UI, A = KL.Art, T = KL.Tasks, CFG = KL.CONFIG, L8 = CFG.lab8, K0 = KL.KARYO, KY = KL.Karyo;
  const T_ = A.TOOL;
  const PH = ['Phase 1 — Metaphase spreading', 'Phase 2 — Giemsa staining and microscopy', 'Phase 3 — Karyotype arrangement', 'Phase 4 — Quantitative karyotype analysis', 'Phase 5 — Morphological classification'];
  const note = t => h('div.sim-note', { html: t });
  const lab8 = () => KL.Store.get().lab8;

  /** Schematic of the four chromosome types used by the course criteria. */
  function typesDiagram() {
    const defs = [['Metacentric', 2.6, 2.2], ['Submetacentric', 3.6, 1.6], ['Acrocentric', 4.4, 0.8], ['Telocentric', 5.2, 0]];
    let v = '<rect width="320" height="190" fill="#f2f6fb" rx="10"/>';
    defs.forEach((d, i) => {
      const g = KY.chromGeom({ L: d[1], S: d[2] }, 22), x = 40 + i * 78;
      v += '<g transform="translate(' + (x - g.cx) + ' 14)">' + g.inner + '</g><text x="' + x + '" y="' + (14 + g.H + 16) + '" font-size="9.5" fill="#233a5c" text-anchor="middle" font-weight="600">' + d[0] + '</text>';
    });
    return '<svg class="art" viewBox="0 0 320 190" aria-hidden="true">' + v + '<text x="160" y="184" font-size="10" fill="#6b7a90" text-anchor="middle">Schematic — centromere position (not to scale)</text></svg>';
  }

  const STEPS = [];
  const add = (n, ph, d) => STEPS.push(Object.assign({ n, phase: PH[ph], stage: 'lab8' }, d));
  const simMicro = (variant, seed) => '<svg class="art" viewBox="0 0 600 450" aria-hidden="true">' + KY.spreadSVG(KY.makeSpread(variant, seed)) + '</svg><p class="cap">Simulated micrograph (teaching model) — not a real observation</p>';

  /* ----------------------------------------------------------------- 1 */
  add(1, 0, {
    title: 'Prepare the Slide', thumb: 'slide', objective: 'Select the correct slide preparation condition.',
    purpose: 'A clean slide kept cold and wet in 70% ethanol helps the cell suspension spread evenly when it is dropped, so the chromosomes separate instead of clumping.',
    materials: ['Clean glass slides', 'Cold 70% ethanol at 4 °C', 'Forceps', 'Gloves'],
    procedure: ['Take a clean slide from the container of cold <strong>' + L8.slide.ethanolPct + '% ethanol at ' + L8.slide.tempC + ' °C</strong> (course protocol).', 'Handle it by the edges with forceps.', 'Keep it wet and cold until the cell suspension is applied.'],
    observe: 'A clean, wet, cold slide with no visible dust or fingerprints.',
    safety: 'Ethanol is flammable: keep it away from the flame and heat sources and keep containers closed.',
    key: ['Slides are stored in cold ' + L8.slide.ethanolPct + '% ethanol at ' + L8.slide.tempC + ' °C.', 'Handle by the edges.', 'Ethanol is flammable.'],
    tools: [[T_.slide, 'Clean slide'], [T_.forceps, 'Forceps'], [T_.bottle, '70% ethanol, 4 °C']],
    close: () => A.slide({ wet: true, label: '70% EtOH' }), ref: () => A.slide({ wet: true, label: '4 °C', note: 'wet, cold' }), refTitle: 'Prepared slide',
    structures: [['Glass slide', 'Receives the cell suspension.'], ['Cold ethanol film', 'Keeps the surface clean and wet.']],
    task(ctx) {
      return h('div', [h('div.hero', { html: A.slide({ wet: true, label: '?' }) }),
        T.single(ctx, { prompt: 'Which slide do you use for the cell suspension?', options: [
          { id: 'ok', text: 'A clean slide kept in cold 70% ethanol at 4 °C', correct: true, why: 'Correct — a clean, cold, wet slide gives the best spreading of the swollen fixed cells.' },
          { id: 'dry', text: 'A dry slide taken straight from the box at room temperature', why: 'A dry, uncleaned slide spreads cells unevenly and may carry grease or dust.' },
          { id: 'hot', text: 'A slide warmed on a hot plate beforehand', why: 'This is not part of the protocol; warm slides dry the drop too fast and chromosomes do not spread.' },
          { id: 'abs', text: 'A slide kept in pure methanol at room temperature', unsafe: true, why: 'Not the protocol condition, and methanol is toxic and flammable — never store slides this way on an open bench.' }] })]);
    }
  });

  /* ----------------------------------------------------------------- 2 */
  add(2, 0, {
    title: 'Apply the Cell Suspension', thumb: 'dropper', objective: 'Apply the specified number of drops of the fixed cell suspension.',
    purpose: 'Dropping the suspension onto the slide deposits the fixed, swollen cells so they can burst gently and release their chromosomes.',
    materials: ['Fixed cell suspension (from Lab 7)', 'Pipette', 'Prepared slide'],
    procedure: ['Re-suspend the fixed cells gently.', 'Apply <strong>' + L8.drops.min + '–' + L8.drops.max + ' drops</strong> onto the slide (course protocol).', 'Do not touch the slide surface with the pipette tip.'],
    observe: 'Small wet spots on the slide.',
    safety: 'The suspension contains methanol/acetic acid: wear PPE and work in a ventilated area.',
    key: [L8.drops.min + '–' + L8.drops.max + ' drops per slide.', 'Too much suspension makes overlapping spreads.', 'Too little gives few cells.'],
    tools: [[T_.dropper, 'Pipette / dropper'], [T_.tube, 'Cell suspension'], [T_.slide, 'Slide']],
    close: () => A.slide({ drops: [0, 1] }), ref: () => A.cells({ swell: .9 }), refTitle: 'Swollen fixed cells',
    structures: [['Drop', 'Contains swollen fixed cells.']],
    task(ctx) {
      let drops = [];
      const host = h('div.hero', { html: A.slide({ drops }) });
      const count = h('p.counter', '0 drops applied');
      const redraw = () => { host.innerHTML = A.slide({ drops: drops.map((d, i) => i - 1) }); count.textContent = drops.length + ' drop' + (drops.length === 1 ? '' : 's') + ' applied'; };
      return h('div', [h('p.task-prompt', 'Apply the protocol number of drops, then confirm.'), host, count,
        h('div.task-actions', [
          h('button.btn', { onclick: () => { if (drops.length >= 6) return; drops.push(1); redraw(); } }, '💧 Add a drop'),
          h('button.btn', { onclick: () => { drops = []; redraw(); } }, 'Clear slide'),
          h('button.btn.primary', { onclick: () => {
            if (!drops.length) return ctx.fb('hint', 'Add at least one drop first.');
            ctx.attempt();
            if (drops.length >= L8.drops.min && drops.length <= L8.drops.max) { ctx.fb('ok', drops.length + ' drops is within the protocol (' + L8.drops.min + '–' + L8.drops.max + ').'); ctx.complete('Applied ' + drops.length + ' drops.'); }
            else ctx.fb('sci', drops.length < L8.drops.min ? 'Too little suspension: very few cells will be on the slide, so finding good spreads will be difficult.' : 'Too much suspension: cells pile up and chromosomes overlap, making spreads unreadable.');
          } }, 'Confirm')])]);
    }
  });

  /* ----------------------------------------------------------------- 3 */
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
        const c = byId[it.id], g = KY.chromGeom(c, 5), cx = 300 + ((i % 3) - 1) * 40 * (1 - t) , cy = 225 + (((i * 7) % 5) - 2) * 14 * (1 - t);
        const x = cx + (it.x - 300) * t, y = cy + (it.y - 225) * t, rot = it.rot * t;
        v += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(0) + ') translate(' + (-g.cx) + ' ' + (-g.H / 2) + ')" opacity="' + (0.35 + 0.65 * t).toFixed(2) + '">' + g.inner + '</g>';
      });
      v += '<text x="300" y="30" text-anchor="middle" font-size="16" fill="#233a5c" font-weight="700">' + (p < 0.9 ? 'Cells burst gently; chromosomes disperse' : 'Dispersed metaphase chromosomes') + '</text>';
    }
    return '<svg class="art" viewBox="0 0 600 450" aria-hidden="true">' + v + '</svg>';
  }

  add(3, 0, {
    title: 'Simulate Chromosome Spreading', thumb: 'cells', objective: 'Review the safety measures, then watch the simulated spreading of chromosomes.',
    purpose: 'When the swollen, fixed cells hit the cold wet slide and the surface is dried (heat-shock/air-drying step of the course protocol), the cells burst gently and the chromosomes disperse and flatten onto the glass.',
    materials: ['Slide with suspension', 'Alcohol / fixative (flammable)', 'Flame or heat source (course protocol)', 'Lab coat, gloves, goggles'],
    procedure: ['Complete the safety check below before any flame-related step.', 'Under trained supervision, carry out the spreading and heat-shock step exactly as written in your course protocol.', 'This page only <em>simulates</em> the result; it does not demonstrate a real flame procedure.'],
    observe: 'Cells flatten and burst; chromosomes are scattered across the field as separate bodies.',
    safety: 'Alcohol vapour is flammable and a flame is an ignition source. Never perform flame-related steps unsupervised, never pour alcohol toward a flame, and keep flammables capped and away.',
    key: ['Hypotonic swelling + fixation + dropping makes chromosomes spread.', 'Flame and alcohol together are a serious fire hazard.', 'Supervision and approved facilities are mandatory.'],
    tools: [[T_.flame, 'Heat source (supervised)'], [T_.slide, 'Slide'], [T_.gloves, 'Gloves'], [T_.goggles, 'Goggles']],
    close: () => A.cells({ swell: 1 }), ref: () => spreadScene(1), refTitle: 'Dispersed chromosomes (simulation)', viewTab: 'Microscopy View',
    structures: [['Swollen cell', 'Membrane stretched by hypotonic treatment.'], ['Released chromosomes', 'Spread apart on the glass.']],
    task(ctx) {
      return h('div', [note('<strong>Safety overlay.</strong> Flame and alcohol are shown for the simulation only — never carry out flame steps unsupervised.'),
        T.stages(ctx, [
          next => T.multi(ctx, { prompt: 'Before any flame-related step, which precautions are required? Select all that apply.', options: [
            { id: 'a', text: 'Work only under trained supervision in an approved laboratory', correct: true },
            { id: 'b', text: 'Keep alcohol and fixative containers closed and well away from the flame', correct: true },
            { id: 'c', text: 'Wear lab coat, gloves and goggles; tie back long hair and secure loose sleeves', correct: true },
            { id: 'd', text: 'Know where the fire extinguisher, fire blanket and exit are', correct: true },
            { id: 'e', text: 'Pour a little alcohol on the flame to dry the slide faster', unsafe: true, why: 'Pouring alcohol near a flame can cause a flash fire and burns.' },
            { id: 'f', text: 'Leave the flame burning unattended between slides', unsafe: true, why: 'An unattended flame near flammables is a fire hazard — extinguish it when not in use.' }],
            okMsg: 'Correct — supervision, closed flammables, PPE and emergency awareness are all required.', missHint: 'Think about who supervises, where the alcohol is, what you wear and what to do if there is a fire.', onDone: next }),
          () => { const host = h('div.hero', { html: spreadScene(0) }); let busy = false;
            return h('div.task-block', [h('p.task-prompt', 'Start the simulated spreading and watch the progression from cells to dispersed chromosomes.'), host, h('div.task-actions', h('button.btn.primary', { onclick: ev => {
              if (busy) return; busy = true; ev.target.disabled = true; ctx.attempt(); let p = 0;
              const iv = setInterval(() => { p += 0.025; host.innerHTML = spreadScene(Math.min(1, p)); if (p >= 1) { clearInterval(iv); ctx.fb('ok', 'The simulation shows the cells bursting and the chromosomes dispersing across the slide. This is an educational animation, not a real result.'); ctx.complete('Reviewed flame/alcohol safety and watched the spreading simulation.'); } }, 70);
            } }, 'Start simulated spreading'))]); }
        ], { names: ['Safety check', 'Simulation'] })]);
    }
  });

  /* ----------------------------------------------------------------- 4 */
  add(4, 1, {
    title: 'Apply Giemsa Stain', thumb: 'jar', objective: 'Choose the correct stain solution and stain for the required time.',
    purpose: 'Giemsa binds DNA and colours the chromosomes dark purple so they stand out from the pale background and can be seen and counted under the microscope.',
    materials: ['Giemsa working solution', 'Staining jar or rack', 'Timer', 'Gloves'],
    procedure: ['Cover the slide with <strong>' + L8.giemsa.pct + '% Giemsa</strong> working solution (course protocol).', 'Stain for <strong>' + L8.giemsa.minutes + ' minutes</strong>.', 'Watch the timer; do not let the stain dry on the slide.'],
    observe: 'The slide takes on a purple colour as the stain binds the DNA.',
    safety: 'Giemsa stain contains methanol (flammable, toxic). Wear gloves and a lab coat and avoid skin contact.',
    key: [L8.giemsa.pct + '% Giemsa working solution.', L8.giemsa.minutes + ' minutes staining.', 'Under-staining makes chromosomes faint.'],
    tools: [[T_.jar, 'Giemsa ' + L8.giemsa.pct + '%'], [T_.timer, 'Timer'], [T_.slide, 'Slide'], [T_.gloves, 'Gloves']],
    close: () => A.jar({ label: 'Giemsa 10%' }), ref: () => A.slide({ stain: 'pour', note: 'stained' }), refTitle: 'Slide being stained',
    structures: [['Giemsa', 'DNA-binding stain.']],
    task(ctx) {
      return T.stages(ctx, [
        next => T.single(ctx, { prompt: 'Which solution do you apply to the slide?', options: [
          { id: 'g10', text: 'Giemsa working solution at ' + L8.giemsa.pct + '%', correct: true, why: 'Correct — the protocol working dilution.' },
          { id: 'stock', text: 'Undiluted Giemsa stock solution', why: 'Undiluted stock over-stains and obscures chromosome detail; it must be diluted to the working solution.' },
          { id: 'weak', text: 'A 1% Giemsa solution', why: 'Too dilute: chromosomes would be faint. Use the protocol working solution.' },
          { id: 'eth', text: '70% ethanol', unsafe: true, why: 'Ethanol is not a stain, and it is flammable.' }], onDone: next }),
        () => { const read = h('div.big-read', '00:00'), view = h('div.hero', { html: A.slide({ stain: 'pour', note: 'Giemsa applied' }) }); let c = null; const rinse = h('button.btn', { disabled: true, onclick: () => {
            if (!c) return; const s = c.elapsed(); c.stop(); c = null; rinse.disabled = true; go.disabled = false; read.textContent = '00:00';
            ctx.attempt(); ctx.fb('sci', 'You stopped at ' + fmtClock(s) + ' — before ' + L8.giemsa.minutes + ' minutes. The chromosomes would be under-stained and faint. Start again and wait for the full time.'); } }, 'Rinse early');
          const go = h('button.btn.primary', { onclick: () => {
            go.disabled = true; rinse.disabled = false; ctx.fb('hint', 'Staining… the clock runs about ' + CFG.sim.secondsPerRealSecond + '× faster than real time.');
            c = clock(s => { read.textContent = fmtClock(s); if (s >= L8.giemsa.minutes * 60) { c.stop(); rinse.disabled = true; ctx.attempt(); ctx.fb('ok', L8.giemsa.minutes + ' minutes complete — the chromosomes are stained.'); ctx.complete('Stained with ' + L8.giemsa.pct + '% Giemsa for ' + L8.giemsa.minutes + ' min.'); } });
          } }, 'Start staining');
          return h('div.task-block', [h('p.task-prompt', 'Stain for the protocol time.'), view, read, h('div.task-actions', [go, rinse])]); }
      ], { names: ['Choose the stain', 'Stain the slide'] });
    }
  });

  /* ----------------------------------------------------------------- 5 */
  add(5, 1, {
    title: 'Rinse and Dry', thumb: 'paper', objective: 'Rinse the slide gently and dry it correctly.',
    purpose: 'Gentle rinsing removes excess stain without washing chromosomes off the slide; air-drying on filter paper avoids heat or rubbing that would damage the spreads.',
    materials: ['Distilled water', 'Filter paper', 'Forceps'],
    procedure: ['Rinse the slide gently with distilled water.', 'Stand or lay it on filter paper to air-dry.', 'Do not wipe or heat the stained surface.'],
    observe: 'A clear purple-stained film that dries evenly.',
    safety: 'Dispose of the stain and rinse water as directed by the laboratory waste procedure.',
    key: ['Gentle rinse with distilled water.', 'Air-dry on filter paper.', 'No rubbing, no heat.'],
    tools: [[T_.bottle, 'Distilled water'], [T_.paper, 'Filter paper'], [T_.slide, 'Slide']],
    close: () => A.slide({ stain: 'pour', note: 'rinsed' }), ref: () => A.slide({ note: 'air-drying' }), refTitle: 'Drying slide',
    structures: [['Filter paper', 'Absorbs excess water.']],
    task(ctx) {
      return T.stages(ctx, [
        next => T.single(ctx, { prompt: 'How do you rinse the stained slide?', options: [
          { id: 'g', text: 'Gently with distilled water', correct: true, why: 'Correct — gentle rinsing removes excess stain without dislodging the chromosomes.' },
          { id: 'j', text: 'With a strong jet of tap water', why: 'A strong jet washes the chromosomes off the slide.' },
          { id: 'a', text: 'With absolute ethanol', unsafe: true, why: 'Ethanol would destain the preparation and is a flammable hazard.' }], onDone: next }),
        () => T.single(ctx, { prompt: 'How do you dry the slide?', options: [
          { id: 'a', text: 'Air-dry on filter paper', correct: true, why: 'Correct — air-drying preserves the spread chromosomes.' },
          { id: 'f', text: 'Hold it over a flame', unsafe: true, why: 'Heating a wet slide over a flame is a burn and fire hazard and cracks/distorts the preparation.' },
          { id: 'w', text: 'Wipe it with a tissue', why: 'Wiping smears and removes the chromosomes from the surface.' }] })
      ], { names: ['Rinse', 'Dry'] });
    }
  });

  /* ----------------------------------------------------------------- 6 microscope */
  const FIELDS = { '0,1': { variant: 'interphase', seed: 11 }, '2,0': { variant: 'overlap', seed: 21 }, '1,2': { variant: 'good', seed: 31 }, '2,2': { variant: 'incomplete', seed: 41 } };
  const OBJ = [4, 10, 40, 100];

  add(6, 1, {
    title: 'Examine the Slide', thumb: 'microscope', objective: 'Find a well-spread metaphase on the stained slide and select it for karyotyping.',
    purpose: 'The stained slide is scanned at low power to find cells, then examined at 40× (course protocol) to choose a complete, well-spread metaphase with distinct chromosomes. Rat chromosomes in this exercise are largely telocentric.',
    materials: ['Light microscope', 'Stained slide', 'Objectives 4×, 10×, 40×'],
    procedure: ['Place the slide on the stage and focus at low power.', 'Scan the slide to locate cells, then switch to the <strong>' + L8.objective + '×</strong> objective (course protocol).', 'Choose a metaphase with all chromosomes present, well separated and not overlapping.'],
    observe: 'Dark purple chromosomes on a pale background; a good spread shows 2n = 42 separate chromosomes.',
    safety: 'Carry the microscope with both hands; keep the stage dry; never let the objective touch the slide.',
    key: ['Scan at low power, analyse at ' + L8.objective + '×.', 'A good spread: complete (42), well separated, condensed chromosomes.', 'Interphase nuclei have no visible chromosomes.'],
    tools: [[T_.microscope, 'Light microscope'], [T_.slide, 'Stained slide']],
    close: () => A.microscope(), ref: () => simMicro('good', 31), refTitle: 'Simulated metaphase (teaching model)', viewTab: 'Microscopy View',
    structures: [['Interphase nucleus', 'Round, granular, no separate chromosomes.'], ['Metaphase spread', 'Chromosomes dispersed and countable.'], ['Overlap / loss', 'Make a spread unsuitable.']],
    task(ctx) {
      let obj = 4, pos = { c: 1, r: 1 }, marks = new Set(), counting = false;
      const root = h('div.scope');
      function viewSVG() {
        const f = FIELDS[pos.c + ',' + pos.r], scale = { 4: 0.18, 10: 0.42, 40: 1, 100: 1 }[obj];
        let inner;
        if (!f) { inner = '<rect width="600" height="450" fill="#efe6ef"/>'; const r = KL.UI.rng(pos.c * 7 + pos.r * 13 + 3); for (let i = 0; i < 24; i++) inner += '<circle cx="' + (r() * 600) + '" cy="' + (r() * 450) + '" r="' + (1 + r() * 3) + '" fill="#cdb9d3" opacity=".7"/>'; }
        else inner = '<g transform="translate(300 225) scale(' + scale + ') translate(-300 -225)">' + KY.spreadSVG(KY.makeSpread(f.variant, f.seed), { marks, interactive: obj >= 40 && counting }) + '</g>';
        return '<svg class="scope-svg" viewBox="0 0 600 450" role="img" aria-label="Microscope field"><defs><clipPath id="fov"><circle cx="300" cy="225" r="218"/></clipPath></defs><rect width="600" height="450" fill="#12161f"/><g clip-path="url(#fov)">' + inner + (obj === 100 ? '<rect width="600" height="450" fill="#fff" opacity=".25"/>' : '') + '</g><circle cx="300" cy="225" r="218" fill="none" stroke="#12161f" stroke-width="14"/></svg>';
      }
      function draw() {
        const f = FIELDS[pos.c + ',' + pos.r];
        root.innerHTML = '';
        const view = h('div.scope-view', { html: viewSVG() });
        view.querySelectorAll('.sp-chr').forEach(g => g.addEventListener('click', () => { const id = g.dataset.id; marks.has(id) ? marks.delete(id) : marks.add(id); draw(); }));
        const objBtns = h('div.seg', OBJ.map(o => h('button.btn.sm' + (o === obj ? '.on' : ''), { 'aria-label': o + ' times objective', onclick: () => { obj = o; draw(); } }, o + '×')));
        const nav = (dc, dr, t) => h('button.btn.sm', { 'aria-label': 'Move stage ' + t, onclick: () => { pos = { c: Math.max(0, Math.min(2, pos.c + dc)), r: Math.max(0, Math.min(2, pos.r + dr)) }; marks = new Set(); draw(); } }, t);
        const mini = h('div.minimap', [0, 1, 2].map(r => h('div.mrow', [0, 1, 2].map(c => h('span.mcell' + (c === pos.c && r === pos.r ? '.cur' : ''), 'ABC'[c] + (r + 1))))));
        const hint = obj === 4 ? 'Low power: scan the slide for dark spots (cells).' : obj === 10 ? 'Medium power: cells are visible but chromosomes are too small to analyse.' : obj === 40 ? (f ? 'Analysis objective: inspect the chromosomes.' : 'No cells in this field. Move the stage.') : 'Oil immersion (100×) is not used in this protocol — return to ' + L8.objective + '×.';
        const count = h('div.count', [h('label.switch', [h('input', { type: 'checkbox', checked: counting, onchange: e => { counting = e.target.checked; draw(); } }), ' Count tool (click chromosomes)']), h('span.tally', 'Marked: ' + marks.size), h('button.btn.xs', { onclick: () => { marks = new Set(); draw(); } }, 'Clear')]);
        const use = h('button.btn.primary', { onclick: choose }, 'Use this spread for karyotyping');
        root.appendChild(h('div.scope-grid', [view, h('div.scope-ctl', [h('div.lbl', 'Objective'), objBtns, h('div.lbl', 'Stage — field ' + 'ABC'[pos.c] + (pos.r + 1)), h('div.stage-pad', [nav(0, -1, '↑'), h('div', [nav(-1, 0, '←'), nav(1, 0, '→')]), nav(0, 1, '↓')]), mini, h('p.scope-hint', hint), count, use])]));
      }
      function choose() {
        const f = FIELDS[pos.c + ',' + pos.r]; ctx.attempt();
        if (obj !== L8.objective) return ctx.fb('sci', 'Select the spread at the ' + L8.objective + '× objective, as in the course protocol: chromosomes cannot be judged at other magnifications.');
        if (!f) return ctx.fb('sci', 'There is no cell in this field. Move the stage to a field that contains cells.');
        if (f.variant === 'interphase') return ctx.fb('sci', 'These are interphase nuclei: the chromatin is not condensed into separate chromosomes, so they cannot be karyotyped.');
        if (f.variant === 'overlap') return ctx.fb('sci', 'This metaphase is complete but several chromosomes overlap, so they cannot be told apart or measured reliably. Look for a better-spread cell.');
        if (f.variant === 'incomplete') return ctx.fb('sci', 'The cell membrane has broken and chromosomes have been lost: the set is incomplete (count them), so a full karyotype is impossible. Look for a cell with all chromosomes.');
        lab8().spread = { variant: f.variant, seed: f.seed }; KL.Store.save();
        ctx.fb('ok', 'Good choice — a complete, well-separated metaphase. This simulated spread (2n = 42, telocentric and bi-armed chromosomes) will be used for the karyotype.'); ctx.complete('Selected a complete, well-spread metaphase at 40×.');
      }
      draw();
      return h('div', [note('<strong>Simulated microscope.</strong> The images are teaching models generated by the application, not real student observations.'), root]);
    }
  });

  /* ----------------------------------------------------------------- 7 karyotype */
  add(7, 2, {
    title: 'Arrange the Karyotype', thumb: 'karyo', objective: 'Pair, order, orient, align and label the chromosomes in the course four-row arrangement.',
    purpose: 'A karyotype arranges the chromosomes of one cell into homologous pairs, ordered by size, so that the chromosome number and any structural features can be examined.',
    materials: ['Selected metaphase spread', 'Karyotype sheet'],
    procedure: ['Find homologous pairs by size and by the position of the centromere.', 'Arrange the pairs in descending order of size.', 'Align the centromeres on one horizontal line; short arms up, long arms down.', 'Place the sex chromosomes last and number each pair underneath.',
      'Course layout: <strong>Row 1</strong> large (Groups A, B) · <strong>Row 2</strong> medium (Group C) · <strong>Row 3</strong> small (Groups D, E) · <strong>Row 4</strong> minute (Groups F, G).'],
    observe: 'A tidy karyotype of 20 autosome pairs plus X and Y (2n = 42).',
    safety: 'Take care when using scissors or tape if preparing a paper karyotype.',
    key: ['Pairs are matched by size and centromere position.', 'Order from largest to smallest; sex chromosomes last.', 'Centromeres on one line; short arms up.'],
    tools: [[T_.ruler, 'Ruler'], [T_.slide, 'Spread image']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    structures: [['Autosomes', '20 pairs, numbered 1–20 by size.'], ['Sex chromosomes', 'X and Y, placed last.']],
    task(ctx) {
      const L = lab8(); const sp = L.spread || { seed: 31 };
      if (!L.karyotype) { L.karyotype = KY.initState(sp.seed); KL.Store.save(); }
      const K = L.karyotype, host = h('div.karyo-host');
      const m = KY.mount(host, { K, onChange: () => KL.Store.save() });
      const out = h('div.kres', { 'aria-live': 'polite' });
      const check = h('button.btn.primary', { onclick: () => {
        K.checks++; ctx.attempt(); const r = m.check(); KL.Store.save();
        if (r.perfect) { out.className = 'kres fb ok'; out.innerHTML = '<strong>Karyotype correct.</strong> All 21 positions are right: pairs matched, ordered by size, upright, aligned on the centromere line and numbered.'; ctx.complete('Karyotype completed correctly (' + K.checks + ' check' + (K.checks > 1 ? 's' : '') + ').'); }
        else { out.className = 'kres fb sci'; out.innerHTML = '<strong>Not yet right:</strong><ul>' + r.issues.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>'; }
      } }, 'Check karyotype');
      const reset = h('button.btn', { onclick: () => KL.UI.confirmDialog('Reset the arrangement?', 'All chromosomes return to the tray and the labels are cleared.', () => { m.reset(); out.innerHTML = ''; out.className = 'kres'; }, 'Reset arrangement') }, 'Reset arrangement');
      return h('div', [h('p.task-prompt', 'The 42 chromosomes of the selected spread are in the tray in random orientation. Build the karyotype.'), host, h('div.task-actions', [check, reset]), out]);
    }
  });

  /* ----------------------------------------------------------------- 8 */
  add(8, 3, {
    title: 'Measure and Calculate', thumb: 'ruler', objective: 'Measure chromosome arms and calculate AR, centromeric index and relative length.',
    purpose: 'Measuring and comparing chromosome arms gives objective numbers (arm ratio, centromeric index, relative length) for describing each chromosome pair.',
    materials: ['Karyotype', 'Ruler / measuring scale', 'Calculator'],
    procedure: ['Measure the short arm and the long arm of both homologues (simulated µm, one consistent scale).', 'Average the two homologues.',
      '<strong>AR</strong> = average long arm ÷ average short arm', '<strong>CI</strong> (long arm) = average long arm ÷ total chromosome length × 100', '<strong>RL</strong> = average chromosome length ÷ total haploid length × 100 (haploid = ½ × diploid sum)'],
    observe: 'Numeric values for each pair; telocentric chromosomes have no measurable short arm, so AR is not defined.',
    safety: 'No special hazards. Keep the workstation tidy.',
    key: ['The CI here always uses the LONG arm.', 'Telocentric: short arm absent → AR is undefined (never divide by zero).', 'Haploid total = ½ × sum of all 42 chromosome lengths.'],
    tools: [[T_.ruler, 'Measuring scale'], [T_.calc, 'Calculator']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    structures: [['Short arm (p)', 'Above the centromere.'], ['Long arm (q)', 'Below the centromere.']],
    task(ctx) {
      const L = lab8(); const host = h('div.meas');
      const wrap = h('div', [note('<strong>Simulated scale.</strong> All lengths are in simulated µm on a single consistent scale.'), host]);
      KL.Measure.mountMeasure(host, L.measure, ctx, () => KL.Store.save());
      return wrap;
    }
  });

  /* ----------------------------------------------------------------- 9 */
  add(9, 4, {
    title: 'Classify the Chromosomes', thumb: 'classify', objective: 'Classify each measured pair using the course criteria.',
    purpose: 'Classification by centromere position (metacentric, submetacentric, acrocentric, telocentric) summarises chromosome shape using the arm ratio and centromeric index.',
    materials: ['Your measurements and calculations'],
    procedure: ['Decide first whether the centromere is at the end (telocentric).', 'Otherwise compare AR and long-arm CI with the course criteria.', 'Check that the two criteria agree.'],
    observe: 'Each measured pair gets one class.',
    safety: 'No special hazards.',
    key: ['Metacentric 1.0–1.5 / 50–60 %.', 'Submetacentric 1.6–3.0 / 61–75 %.', 'Acrocentric 3.1+ / 76–100 %.', 'Telocentric: centromere at the end; AR not defined.'],
    tools: [[T_.calc, 'Calculator'], [T_.ruler, 'Criteria table']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    structures: [['Centromere position', 'Determines the class.']],
    task(ctx) {
      const L = lab8(); const host = h('div.classify');
      const missing = CFG.measure.requiredPairs.filter(id => !(L.measure[id] && L.measure[id].calcOk));
      if (missing.length) return h('div.sim-note', 'Complete the measurements in the previous step first (pairs ' + missing.join(', ') + ').');
      KL.Measure.mountClassify(host, L.measure, L.classify, ctx, () => KL.Store.save());
      return host;
    }
  });

  /* ----------------------------------------------------------------- 10 */
  add(10, 4, {
    title: 'Final Analysis', thumb: 'karyo', objective: 'Review your completed karyotype, measurements and classifications.',
    purpose: 'The final analysis brings together the karyotype, the measurements and the classification of the selected cell.',
    materials: ['Your completed analysis'],
    procedure: ['Review the karyotype you arranged.', 'Check the measurement table.', 'Finish Lab 8 to see the performance summary.'],
    observe: 'A complete summary for one simulated rat metaphase (2n = 42).',
    safety: 'No special hazards.',
    key: ['The simulated model is idealised and for teaching.', 'Chromosome number 2n = 42.', 'Report AR as n/a for telocentric chromosomes.'],
    tools: [[T_.calc, 'Results']],
    close: () => typesDiagram(), ref: () => simMicro('good', 31), refTitle: 'Selected spread (simulated)', viewTab: 'Microscopy View',
    structures: [['Karyotype', 'Ordered, labelled pairs.']],
    task(ctx) {
      const L = lab8(), M = L.measure, req = CFG.measure.requiredPairs;
      const kar = L.karyotype ? KY.staticHTML(L.karyotype) : h('p', 'No karyotype yet.');
      const rows = req.map(id => { const r = M[id] && M[id].res; if (!r) return ''; return '<tr><th>' + id + '</th><td>' + KL.Measure.fmt(r.avgL) + '</td><td>' + KL.Measure.fmt(r.avgS) + '</td><td>' + (r.telo ? 'n/a' : KL.Measure.fmt(r.ar)) + '</td><td>' + KL.Measure.fmt(r.ci, 1) + '</td><td>' + KL.Measure.fmt(r.rl, 2) + '</td><td>' + esc(L.classify[id] || '—') + '</td></tr>'; }).join('');
      const fin = h('button.btn.primary', { onclick: () => { ctx.attempt(); ctx.complete('Reviewed the final analysis.'); ctx.fb('ok', 'Lab 8 complete. Open the summary to see your performance.'); } }, 'Finish Lab 8');
      return h('div', [note('<strong>Simulated teaching model.</strong> The cell, chromosomes and measurements are generated by the application.'), h('h4', 'Completed karyotype (2n = 42)'), h('div.final-kar', kar),
        h('h4', 'Measurements, calculations and classification'), h('div.tscroll', { html: '<table class="ctab"><thead><tr><th>Pair</th><th>Avg long arm</th><th>Avg short arm</th><th>AR</th><th>Long-arm CI %</th><th>RL %</th><th>Class</th></tr></thead><tbody>' + rows + '</tbody></table>' }),
        h('p.tiny', 'Haploid total length used for RL: ' + KL.Measure.fmt(K0.haploidTotal, 2) + ' µm (simulated) = ½ × ' + KL.Measure.fmt(K0.diploidTotal, 2) + '.'), h('div.task-actions', fin)]);
    }
  });

  KL.LAB8 = { PH, STEPS, FIELDS };
})();
