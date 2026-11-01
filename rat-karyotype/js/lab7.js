/* =========================================================================
   lab7.js — Lab 7: Extraction of Metaphase Chromosomes from Rat Bone Marrow.
   17 steps + checkpoint. Protocol parameters come from KL.CONFIG.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc, shuffle, clock, fmtClock } = KL.UI, A = KL.Art, T = KL.Tasks, CFG = KL.CONFIG;
  const T_ = A.TOOL;

  const PH = ['Phase 1 — Animal pretreatment and euthanasia', 'Phase 2 — Dissection and bone marrow collection', 'Phase 3 — Cell washing and hypotonic treatment', 'Phase 4 — Cell fixation'];
  const spin = CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min';
  const clickIn = (svgHost, sel, fn) => svgHost.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => { e.stopPropagation(); fn(el, e); }));
  const svgOf = html => { const d = document.createElement('div'); d.innerHTML = html; return d.firstChild; };
  const note = (txt) => h('div.sim-note', { html: txt });
  const lab = (...p) => h('div.work-row', p);

  /* ---------- shared: centrifuge stages (steps 12 and 15) ---------- */
  function centrifugeStages(ctx, o) {  // eslint-disable-line
    const seq = [];
    // 1 — load and balance the rotor
    seq.push(next => {
      let sample = null, balance = null;
      const host = h('div.rotor-host');
      const msg = h('p.task-prompt', 'Click a rotor position to load your sample tube.');
      function draw() {
        const tubes = {}; if (sample != null) tubes[sample] = 'sample'; if (balance != null) tubes[balance] = 'balance';
        host.innerHTML = A.rotor({ tubes, interactive: true });
        clickIn(host, '.rslot', el => {
          const i = +el.dataset.slot;
          if (sample == null) { sample = i; msg.textContent = 'Now load a balance tube (same volume) in a position.'; draw(); return; }
          if (i === sample || i === balance) return;
          ctx.attempt();
          if (i === (sample + 3) % 6) { balance = i; ctx.fb('ok', 'Balanced: the balance tube sits directly opposite the sample, so the rotor spins without vibration.'); draw(); setTimeout(next, 600); }
          else { ctx.safety(); ctx.fb('safety', 'Unbalanced rotor. An off-centre load makes the rotor vibrate and can damage the centrifuge or break tubes. Tubes must be placed in opposite positions with equal mass.'); }
        });
      }
      draw();
      return h('div.task-block', [msg, host]);
    });
    // 2 — set the speed and time
    seq.push(next => {
      let rpm = 1000, min = 2;
      const view = h('div.dial-box');
      const upd = () => { view.querySelector('.cf-read').textContent = rpm + ' rpm · ' + min + ' min'; };
      view.appendChild(T.dial('Speed', { min: 500, max: 5000, step: 100, value: rpm, unit: 'rpm', onChange: v => { rpm = v; upd(); } }));
      view.appendChild(T.dial('Time', { min: 1, max: 15, step: 1, value: min, unit: 'min', onChange: v => { min = v; upd(); } }));
      view.appendChild(h('div.cf-read.big-read', ''));
      view.appendChild(h('div.task-actions', h('button.btn.primary', { onclick: () => {
        ctx.attempt();
        if (rpm === CFG.spin.rpm && min === CFG.spin.minutes) { ctx.fb('ok', 'Settings match the protocol (' + spin + '). Start the run.'); next(); return; }
        const parts = [];
        if (rpm > CFG.spin.rpm) parts.push('too fast: high g-force can damage or lyse the cells'); else if (rpm < CFG.spin.rpm) parts.push('too slow: the cells will not form a compact pellet');
        if (min > CFG.spin.minutes) parts.push('too long for the protocol'); else if (min < CFG.spin.minutes) parts.push('too short: separation will be incomplete');
        ctx.fb('sci', 'These settings do not match the protocol (' + parts.join('; ') + '). Check the supplied parameters.');
      } }, 'Start centrifuge')));
      upd();
      return h('div.task-block', [h('p.task-prompt', 'Set the centrifuge for this step.'), view]);
    });
    // 3 — spin and identify the fraction with the cells
    seq.push(next => {
      const host = h('div.cf-run');
      host.innerHTML = '<div class="rotor-spin">' + A.rotor({ tubes: { 0: 'sample', 3: 'balance' }, spin: true }) + '</div><p class="task-prompt">Spinning… (simulated)</p>';
      setTimeout(() => {
        host.innerHTML = '<p class="task-prompt">The run is complete. <strong>Click the fraction that contains the cells you collected.</strong></p><div class="tube-pick">' + A.tube({ level: .7, color: o.liquid || '#f7dfe1', pellet: .8, pelletColor: '#b04a55' }) +
          '<button class="hit hit-sup" data-part="supernatant" aria-label="Upper liquid"></button><button class="hit hit-pel" data-part="pellet" aria-label="Bottom deposit"></button></div>';
        clickIn(host, '.hit', el => {
          ctx.attempt();
          if (el.dataset.part === 'pellet') { ctx.fb('ok', o.pelletMsg); if (o.finish) o.finish(); else next(); }
          else ctx.fb('sci', 'That is the supernatant — the liquid above the deposit. Cells are denser than the liquid, so they are driven to the bottom of the tube by centrifugal force.');
        });
      }, 2600);
      return h('div.task-block', host);
    });
    return seq;
  }

  /* ============================================================ the steps */
  const STEPS = [];
  const add = (n, ph, d) => STEPS.push(Object.assign({ n, phase: PH[ph], stage: 'lab7' }, d));

  add(1, 0, {
    title: 'Colchicine Pretreatment', thumb: 'arrest', objective: 'Understand how colchicine arrests dividing cells at metaphase.',
    purpose: 'Colchicine binds tubulin and stops microtubules from assembling, so no mitotic spindle can form. Cells that enter mitosis are held at metaphase with fully condensed chromosomes, which increases the number of metaphase cells available for chromosome preparation.',
    materials: ['Colchicine solution (prepared and dosed only by trained staff)', 'Course protocol sheet'],
    procedure: ['Read the course protocol for the colchicine dose, route and timing before sampling.',
      'Dose and timing: <strong>' + (CFG.colchicine.dose ? esc(CFG.colchicine.dose) : 'as specified in your approved course protocol') + '</strong> (' + (CFG.colchicine.timing ? esc(CFG.colchicine.timing) : 'timing per protocol') + ') — protocol information only; nothing is injected in this application.',
      'The animal is handled only by trained, authorised personnel under an approved ethics protocol.'],
    observe: 'A higher mitotic index: many cells stopped at metaphase in the bone marrow.',
    safety: 'Colchicine is highly toxic. Preparation, dosing and every animal procedure are done only by trained staff with PPE and under approved ethics. This software never simulates an injection.',
    key: ['Colchicine is a spindle poison: it inhibits microtubule polymerisation.', 'Cells accumulate at metaphase, when chromosomes are most condensed and easiest to count.', 'The effect depends on dose and exposure time — follow the protocol exactly.'],
    tools: [[T_.syringe, 'Syringe'], [T_.bottle, 'Colchicine (protocol)'], [T_.gloves, 'Gloves']],
    close: () => A.arrest(), ref: () => A.spindle(), refTitle: 'Metaphase plate and spindle',
    structures: [['Spindle microtubules', 'Pull sister chromatids apart in anaphase. Colchicine prevents their assembly.'], ['Metaphase plate', 'Chromosomes align at the cell equator — the stage captured for karyotyping.']],
    task(ctx) {
      return h('div', [note('<strong>Educational illustration of protocol information.</strong> No injection or animal procedure is simulated here.'),
        h('div.hero', { html: A.arrest() }),
        T.sequence(ctx, { prompt: 'Put the events that follow colchicine treatment in order.',
          items: [{ id: 1, text: 'Colchicine binds tubulin and prevents microtubule assembly' }, { id: 2, text: 'No mitotic spindle can form' }, { id: 3, text: 'Dividing cells are held at metaphase with condensed chromosomes' }, { id: 4, text: 'More metaphase cells are available for chromosome preparation' }],
          order: [1, 2, 3, 4], okMsg: 'Correct — blocking tubulin assembly removes the spindle, so cells stall in metaphase.', hint: 'Start with what colchicine binds.', summary: 'Ordered the mechanism of metaphase arrest.' })]);
    }
  });

  add(2, 0, {
    title: 'Cervical Dislocation', thumb: 'neck', objective: 'Euthanise the rat by the method approved in the protocol — humanely and ethically.',
    purpose: 'Euthanasia gives rapid, humane death before tissue collection. The method, the people allowed to perform it and the justification are set by the institutional animal-ethics approval.',
    materials: ['Approved ethics protocol', 'Trained, authorised operator', 'Dissection pad', 'Gloves'],
    procedure: ['Confirm the experiment is covered by an approved animal-ethics protocol.', 'Only a trained person performs the approved method.', 'Confirm death before starting dissection.'],
    observe: 'Loss of reflexes and respiration confirms death before any dissection begins.',
    safety: 'Never perform euthanasia without ethics approval and training. This page shows a non-graphic schematic only.',
    key: ['Ethics approval and trained personnel come first.', 'The method must be rapid and cause minimal distress.', 'Death is confirmed before dissection.'],
    tools: [[T_.gloves, 'Gloves'], [T_.pad, 'Dissection pad']],
    close: () => A.rat({ highlight: 'neck' }), ref: () => A.skeletonNeck(), refTitle: 'Skeletal reference (side view)',
    structures: [['Cervical vertebrae', 'The seven neck vertebrae — the region involved in the physical method named in the protocol.'], ['Spinal cord', 'Runs through the vertebral canal.']],
    task(ctx) {
      return h('div', [note('<strong>Non-graphic educational schematic.</strong> No procedure is shown or simulated.'), h('div.hero', { html: A.rat({ highlight: 'neck' }) }),
        T.multi(ctx, { prompt: 'Which conditions must be met <em>before</em> euthanasia in an approved experiment? Select all that apply.',
          options: [
            { id: 'a', text: 'The work is covered by an approved animal-ethics protocol', correct: true },
            { id: 'b', text: 'It is performed by trained, authorised personnel', correct: true },
            { id: 'c', text: 'The method is the one specified in the approved protocol', correct: true },
            { id: 'd', text: 'It is acceptable to proceed without approval because it is a teaching exercise', unsafe: true, why: 'Teaching does not remove the requirement for ethics approval.' },
            { id: 'e', text: 'Any student may try the method first to practise', unsafe: true, why: 'Untrained attempts cause suffering; only trained, authorised people may perform euthanasia.' }],
          okMsg: 'Correct — approval, training and the approved method are all required.', missHint: 'Think about who may do it, under what authority, and by which method.', summary: 'Identified the ethical prerequisites for euthanasia.' })]);
    }
  });

  add(3, 1, {
    title: 'Identify the Hind Limb', thumb: 'limb', objective: 'Identify the femur and its relationship to the skin and muscles.',
    purpose: 'The femur (thigh bone) is the largest long bone of the hind limb and is rich in bone marrow, so it is the sampling site. Knowing the layers — skin, muscle, bone — guides a clean dissection.',
    materials: ['Dissection pad', 'Gloves', 'Hind limb (illustration)'],
    procedure: ['Position the animal so the hind limb is accessible.', 'Identify the layers: skin → muscle → bone.', 'Locate the femur between the hip and the knee.'],
    observe: 'The femur lies deep within the thigh, covered by thick muscle and skin.',
    safety: 'Wear a lab coat, gloves and eye protection. Use sharp instruments carefully and cut away from yourself.',
    key: ['Layers from outside in: skin, muscle, bone.', 'The femur runs from the hip joint to the knee joint.', 'The tibia lies below the knee.'],
    tools: [[T_.gloves, 'Gloves'], [T_.pad, 'Dissection pad']],
    close: () => A.limb({ mode: 'muscle' }), ref: () => A.limb({ mode: 'bone' }), refTitle: 'Skeletal reference — hind limb',
    structures: [['Femur', 'Thigh bone, hip to knee — marrow source.'], ['Tibia', 'Shin bone, knee to ankle.'], ['Thigh muscles', 'Quadriceps and hamstring groups surrounding the femur.'], ['Skin', 'Outer covering reflected in Step 5.']],
    task(ctx) {
      const host = h('div.hero.limb-host');
      let mode = 'skin';
      const draw = () => {
        host.innerHTML = A.limb({ mode, regions: mode === 'bone' });
        clickIn(host, '[data-region]', el => {
          ctx.attempt();
          const r = el.dataset.region;
          if (r === 'femur') { ctx.fb('ok', 'Correct — that is the femur: the long bone between the hip and the knee, protected by the thigh muscles.'); ctx.complete('Identified the femur.'); }
          else if (r === 'tibia') ctx.fb('sci', 'That is the tibia (shin bone), below the knee. The femur is the bone of the thigh, above the knee.');
          else ctx.fb('sci', 'That is the foot. Look higher: the femur lies between the hip and the knee.');
        });
      };
      const tabs = h('div.seg', ['skin', 'muscle', 'bone'].map(m => h('button.btn.sm' + (m === mode ? '.on' : ''), { 'data-m': m, onclick: e => { mode = m; tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); draw(); } }, { skin: 'Skin layer', muscle: 'Muscle layer', bone: 'Bone layer' }[m])));
      draw();
      return h('div', [h('p.task-prompt', 'Look at each layer of the hind limb, then <strong>click the femur</strong> on the bone layer.'), tabs, host]);
    }
  });

  add(4, 1, {
    title: 'Skin Incision', thumb: 'limb', objective: 'Choose the correct line for the skin incision.',
    purpose: 'A shallow incision through the skin only, along the thigh, lets the skin be reflected without damaging the muscle or bone beneath.',
    materials: ['Scissors or scalpel', 'Forceps', 'Gloves'],
    procedure: ['Lift the skin with forceps.', 'Cut through the skin only, in line with the long axis of the limb.', 'Avoid cutting into the muscle.'],
    observe: 'A clean opening through the skin with the pale muscle surface visible beneath.',
    safety: 'Cut away from your body and fingers; keep the free hand clear of the blade; dispose of sharps in the sharps container.',
    key: ['Incise along the thigh, over the femur.', 'Skin only — keep the blade shallow.', 'Keep instruments sharp to avoid tearing.'],
    tools: [[T_.scissors, 'Scissors'], [T_.forceps, 'Forceps'], [T_.scalpel, 'Scalpel']],
    close: () => A.limb({ mode: 'skin' }), ref: () => A.limb({ mode: 'muscle' }), refTitle: 'Layers beneath the skin',
    structures: [['Skin', 'Cut first, along the thigh.'], ['Fascia / fat', 'Thin layer between skin and muscle.'], ['Muscle', 'Must remain intact at this step.']],
    task(ctx) {
      const host = h('div.hero', { html: A.limb({ mode: 'incision' }) });
      ['incA', 'incB', 'incC'].forEach((id, i) => {
        const src = host.querySelector('#' + id), hit = src.cloneNode();
        hit.removeAttribute('id'); hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '24'); hit.setAttribute('stroke-dasharray', 'none'); hit.setAttribute('class', 'hot'); hit.setAttribute('data-inc', id);
        src.parentNode.appendChild(hit);
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text'); const pt = { incA: [150, 90], incB: [330, 168], incC: [100, 220] }[id];
        lbl.setAttribute('x', pt[0]); lbl.setAttribute('y', pt[1]); lbl.setAttribute('font-size', '15'); lbl.setAttribute('font-weight', '700'); lbl.setAttribute('fill', '#233a5c'); lbl.textContent = 'ABC'[i]; src.parentNode.appendChild(lbl);
      });
      clickIn(host, '[data-inc]', el => {
        ctx.attempt();
        const id = el.dataset.inc;
        if (id === 'incA') { ctx.fb('ok', 'Correct — a longitudinal skin incision over the thigh gives access to the muscle covering the femur without damaging deeper tissue.'); ctx.complete('Chose the thigh incision.'); }
        else if (id === 'incB') ctx.fb('sci', 'That line passes around the knee joint, away from the femur shaft, and would cut across structures you want to keep intact. Choose the line that follows the femur.');
        else ctx.fb('sci', 'That line is on the lower leg (shank). The marrow is sampled from the femur, so the incision must expose the thigh.');
      });
      return h('div', [h('p.task-prompt', 'Click the incision line that exposes the <strong>femur</strong> with the least tissue damage.'), host]);
    }
  });

  add(5, 1, {
    title: 'Reflect Skin / Expose Muscles', thumb: 'muscle', objective: 'Reflect the skin and identify the muscles that surround the femur.',
    purpose: 'Folding the skin back exposes the muscles of the thigh. These must be cleared from the bone so that the femur can be removed and cleaned.',
    materials: ['Forceps', 'Scissors', 'Gauze'],
    procedure: ['Grip the cut skin edge with forceps and peel it back.', 'Free the skin from the underlying fascia by blunt dissection.', 'Identify the muscle mass around the femur.'],
    observe: 'Dark red muscle covers the thigh; the femur is not yet visible.',
    safety: 'Handle tissue with forceps rather than fingers where possible; wear gloves; treat all tissue as biohazardous waste.',
    key: ['Skin is reflected, not removed.', 'The thigh muscles lie directly over the femur.', 'Work gently to avoid tearing.'],
    tools: [[T_.forceps, 'Forceps'], [T_.scissors, 'Scissors'], [T_.gauze, 'Gauze']],
    close: () => A.limb({ mode: 'open' }), ref: () => A.limb({ mode: 'muscle' }), refTitle: 'Anatomy — muscle layer',
    structures: [['Thigh muscles', 'Quadriceps (front) and hamstrings (back) enclose the femur.'], ['Shank muscles', 'Surround the tibia.'], ['Reflected skin', 'Folded back to expose the muscle.']],
    task(ctx) {
      let open = false;
      const host = h('div.hero.limb-host');
      const draw = () => {
        host.innerHTML = A.limb({ mode: open ? 'open' : 'skin', regions: open });
        clickIn(host, '[data-region]', el => {
          ctx.attempt();
          if (el.dataset.region === 'thigh-muscle') { ctx.fb('ok', 'Correct — the thigh muscles surround the femur and are the ones to be removed to free the bone.'); ctx.complete('Identified the thigh muscle mass.'); }
          else ctx.fb('sci', 'Those are the shank (lower leg) muscles around the tibia. The femur is enclosed by the thigh muscles.');
        });
      };
      const btn = h('button.btn.primary', { onclick: () => { open = true; btn.disabled = true; draw(); ctx.fb('hint', 'Skin reflected. Now identify the correct muscle mass.'); } }, 'Reflect the skin');
      draw();
      return h('div', [h('p.task-prompt', 'Reflect the skin, then <strong>click the muscle mass that surrounds the femur</strong>.'), h('div.task-actions', btn), host]);
    }
  });

  add(6, 1, {
    title: 'Remove the Femur', thumb: 'bone', objective: 'Choose the joints where the femur is released.',
    purpose: 'The femur is freed by separating it at its two joints — the hip and the knee — leaving the shaft intact so that the marrow is not lost or contaminated.',
    materials: ['Scissors', 'Scalpel', 'Forceps', 'Gauze'],
    procedure: ['Cut through the muscle and joint capsule at the hip.', 'Disarticulate the knee, separating the femur from the tibia.', 'Lift the femur out intact.'],
    observe: 'A whole femur with its two rounded ends and muscle still attached.',
    safety: 'Keep fingers clear of the cutting edge; hold the tissue with forceps.',
    key: ['Release at the hip and at the knee.', 'Never cut through the shaft: that opens the marrow cavity and loses cells.', 'Keep the bone moist and intact.'],
    tools: [[T_.scissors, 'Scissors'], [T_.scalpel, 'Scalpel'], [T_.forceps, 'Forceps']],
    close: () => A.limb({ mode: 'bone' }), ref: () => A.femur({ labels: true }), refTitle: 'Femur — regions',
    structures: [['Hip joint', 'Femoral head in the pelvic socket.'], ['Knee joint', 'Femoral condyles against the tibia.'], ['Shaft (diaphysis)', 'Long middle part holding the marrow cavity.']],
    task(ctx) {
      const host = h('div.hero', { html: A.limb({ mode: 'bone' }) });
      const picks = new Set();
      const svg = host.querySelector('svg');
      [['hip', 120, 60], ['knee', 265, 150], ['ankle', 165, 250], ['shaft', 192, 105]].forEach(([id, x, y]) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 15); c.setAttribute('class', 'marker'); c.dataset.m = id; svg.appendChild(c);
      });
      clickIn(host, '.marker', el => { const id = el.dataset.m; if (picks.has(id)) { picks.delete(id); el.classList.remove('pick'); } else { picks.add(id); el.classList.add('pick'); } });
      const btn = h('button.btn.primary', { onclick: () => {
        if (!picks.size) return ctx.fb('hint', 'Click the points where you will cut or disarticulate.');
        ctx.attempt();
        const bad = ['ankle', 'shaft'].filter(x => picks.has(x)), ok = picks.has('hip') && picks.has('knee');
        if (ok && !bad.length) { ctx.fb('ok', 'Correct — the femur is released at the hip and the knee, keeping the shaft and marrow cavity intact.'); ctx.complete('Selected the hip and knee as release points.'); }
        else if (bad.indexOf('shaft') >= 0) ctx.fb('sci', 'Cutting through the shaft opens the medullary cavity and loses marrow cells before collection. Release the bone at its joints instead.');
        else if (bad.indexOf('ankle') >= 0) ctx.fb('sci', 'The ankle is far from the femur; cutting there would not free the thigh bone. Look at the two joints that bound the femur.');
        else ctx.fb('sci', 'You need both ends of the femur: one joint at the top and one at the bottom of the thigh.');
      } }, 'Check release points');
      return h('div', [h('p.task-prompt', 'Select <strong>every point</strong> where the femur must be separated, then check. (Click a marker again to deselect.)'), host, h('div.task-actions', btn)]);
    }
  });

  add(7, 1, {
    title: 'Remove Surrounding Muscles', thumb: 'bone', objective: 'Select the instruments used to strip the muscle from the femur.',
    purpose: 'Removing attached muscle and connective tissue prevents contamination of the marrow sample with non-marrow cells.',
    materials: ['Scissors', 'Forceps', 'Gauze', 'Gloves'],
    procedure: ['Hold the femur with forceps wrapped in gauze.', 'Cut the muscle away along the bone with scissors.', 'Wipe off the remaining tissue with gauze.'],
    observe: 'A pale bone with only thin tissue remnants.',
    safety: 'Never hold the bone with bare fingers; use forceps and gauze. Cut away from yourself.',
    key: ['Use instruments, not fingers.', 'Work from the shaft toward the ends.', 'Avoid damaging the epiphyses.'],
    tools: [[T_.scissors, 'Scissors'], [T_.forceps, 'Forceps'], [T_.gauze, 'Gauze']],
    close: () => A.femur({ patches: [[130, 90], [220, 112], [300, 94]] }), ref: () => A.femur({ labels: true }), refTitle: 'Bone after muscle removal',
    structures: [['Attached muscle', 'Dark red tissue to remove.'], ['Periosteum', 'Thin membrane on the bone surface.']],
    task(ctx) {
      return h('div', [h('div.hero', { html: A.femur({ patches: [[130, 90], [220, 112], [300, 94]] }) }),
        T.multi(ctx, { prompt: 'Which items do you use to remove the muscle from the bone? Select all that apply.',
          options: [
            { id: 'sc', text: 'Scissors', correct: true }, { id: 'fo', text: 'Forceps', correct: true }, { id: 'ga', text: 'Gauze', correct: true },
            { id: 'sy', text: 'Syringe with needle', why: 'The syringe is used later, to flush the marrow.' },
            { id: 'ct', text: 'Centrifuge', why: 'The centrifuge is used for washing cells, not for dissection.' },
            { id: 'fi', text: 'Bare fingers pulling the muscle away', unsafe: true, why: 'Handling tissue with bare fingers is unsafe (cuts, contamination) and can crush the bone ends.' }],
          okMsg: 'Correct — forceps hold, scissors cut and gauze wipes the bone clean.', missHint: 'You need something to hold, something to cut and something to wipe.', summary: 'Selected scissors, forceps and gauze.' })]);
    }
  });

  add(8, 1, {
    title: 'Clean the Femur', thumb: 'bone', objective: 'Remove every remaining piece of soft tissue from the bone.',
    purpose: 'A clean bone ensures that the later flush collects marrow cells and not muscle or connective-tissue cells.',
    materials: ['Gauze', 'Forceps', 'Scissors'],
    procedure: ['Wipe the bone with gauze.', 'Remove leftover tissue fragments with forceps.', 'Check the whole surface.'],
    observe: 'A clean, whitish bone without red tissue.',
    safety: 'Do not scrape hard — slipping can cause cuts. Dispose of tissue in the biohazard waste.',
    key: ['Only soft tissue is removed — the bone stays intact.', 'Check the ends and the shaft.', 'Biological waste goes in the biohazard container.'],
    tools: [[T_.gauze, 'Gauze'], [T_.forceps, 'Forceps']],
    close: () => A.femur({}), ref: () => A.femur({ labels: true }), refTitle: 'Cleaned femur',
    structures: [['Epiphyses', 'Rounded ends: proximal and distal.'], ['Diaphysis', 'Shaft containing marrow.']],
    task(ctx) {
      const patches = [[110, 86], [160, 112], [210, 90], [255, 112], [300, 88], [340, 118]];
      let left = patches.length, removed = new Set();
      const host = h('div.hero');
      const draw = () => {
        host.innerHTML = A.femur({ patches: patches.filter((p, i) => !removed.has(i)).map(p => p), labels: false });
        host.querySelectorAll('.patch').forEach((g, k) => {
          const idx = patches.findIndex((p, i) => !removed.has(i) && g.querySelector('ellipse').getAttribute('cx') == p[0]);
          g.addEventListener('click', () => { removed.add(idx); left--; if (!left) { ctx.attempt(); ctx.fb('ok', 'The bone is clean. Removing every tissue fragment prevents non-marrow cells from contaminating the suspension.'); ctx.complete('Cleaned all tissue from the femur.'); } else ctx.fb('hint', left + ' fragment' + (left > 1 ? 's' : '') + ' left.'); draw(); });
        });
      };
      draw();
      return h('div', [h('p.task-prompt', 'Use the gauze: <strong>click each piece of remaining tissue</strong> to wipe it off.'), host]);
    }
  });

  add(9, 1, {
    title: 'Trim the Epiphyses', thumb: 'femur', objective: 'Cut off both ends of the femur to expose the medullary cavity.',
    purpose: 'Trimming the epiphyses (rounded bone ends) opens the marrow cavity at both ends so that fluid can be flushed through the bone.',
    materials: ['Scissors or bone cutters', 'Forceps', 'Gauze'],
    procedure: ['Hold the femur with forceps.', 'Cut just beyond the rounded proximal end.', 'Cut just beyond the distal end.', 'Keep the shaft intact.'],
    observe: 'A hollow shaft open at both ends, marrow visible as a red-pink core.',
    safety: 'Keep fingers away from the cut line; use controlled pressure; point sharp edges away.',
    key: ['Remove only the epiphyses.', 'Do not cut into the shaft — you would lose marrow.', 'Both ends must be open to flush the cavity.'],
    tools: [[T_.scissors, 'Scissors'], [T_.forceps, 'Forceps'], [T_.gauze, 'Gauze']],
    close: () => A.femur({ trimmed: true }), ref: () => A.femur({ labels: true }), refTitle: 'Femur — longitudinal view',
    structures: [['Proximal epiphysis', 'Head and neck end — removed.'], ['Distal epiphysis', 'Condyle end — removed.'], ['Medullary cavity', 'Marrow-filled space of the shaft.']],
    task(ctx) {
      const cuts = [];
      const host = h('div.hero.femur-host');
      const draw = () => {
        host.innerHTML = A.femur({ cuts: cuts.map(c => c.x) });
        host.firstChild.addEventListener('click', e => {
          const r = host.firstChild.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 200;
          if (y < 40 || y > 160) return;
          if (cuts.length >= 2) return ctx.fb('hint', 'Two cuts are placed. Use “Undo cuts” to change them.');
          cuts.push({ x }); draw(); ctx.fb('hint', cuts.length === 1 ? 'First cut placed. Place the second cut.' : 'Both cuts placed. Press “Make the cuts”.');
        });
      };
      draw();
      const undo = h('button.btn', { onclick: () => { cuts.length = 0; draw(); ctx.fb('clear'); } }, 'Undo cuts');
      const go = h('button.btn.primary', { onclick: () => {
        if (cuts.length < 2) return ctx.fb('hint', 'Place two cuts first (one near each end).');
        ctx.attempt();
        const xs = cuts.map(c => c.x).sort((a, b) => a - b), okL = Math.abs(xs[0] - 80) < 16, okR = Math.abs(xs[1] - 322) < 16;
        if (okL && okR) { host.innerHTML = A.femur({ trimmed: true }); ctx.fb('ok', 'Both epiphyses are trimmed and the medullary cavity is open at each end — ready for flushing.'); ctx.complete('Trimmed both epiphyses.'); }
        else if (xs[0] > 100 && xs[0] < 300 || xs[1] > 100 && xs[1] < 300) ctx.fb('sci', 'A cut in the middle of the shaft would lose marrow and leave an epiphysis in place. Cut just inside each rounded end, where the shaft begins.');
        else ctx.fb('sci', 'The cuts are too far into the ends: bone from the epiphysis would still block the cavity. Cut where the narrow shaft meets each rounded end.');
      } }, 'Make the cuts');
      return h('div', [h('p.task-prompt', 'Click to place <strong>two cut lines</strong>, one near each end of the bone, then cut.'), host, h('div.task-actions', [undo, go])]);
    }
  });

  add(10, 1, {
    title: 'Aspirate Bone Marrow', thumb: 'syringe', objective: 'Flush the marrow from the femur into a collection tube.',
    purpose: 'Fluid pushed through the open medullary cavity washes marrow cells out of the bone into a tube, producing a cell suspension.',
    materials: ['Syringe with needle', CFG.saline.label, 'Femur', 'Collection tube', 'Gloves'],
    procedure: ['Draw <strong>' + CFG.saline.volumeMl + ' mL</strong> of ' + CFG.saline.label + ' into the syringe (protocol parameter).', 'Insert the needle into one open end of the femur.', 'Flush the fluid through the cavity into the collection tube.', 'Repeat gently until the bone looks pale.'],
    observe: 'The fluid turns pink-red as marrow cells are washed out; the bone becomes pale.',
    safety: 'Needle-stick risk: never recap by hand; use the sharps container. Wear gloves and eye protection.',
    key: ['Isotonic saline or PBS keeps the cells intact.', 'Flush through the cavity — do not force the plunger.', 'Collect all the fluid in the tube.'],
    tools: [[T_.syringe, 'Syringe'], [T_.bottle, 'Saline / PBS'], [T_.tube, 'Collection tube'], [T_.bone, 'Femur']],
    close: () => A.syringe({ ml: 3 }), ref: () => A.femur({ trimmed: true, labels: false }), refTitle: 'Open medullary cavity',
    structures: [['Needle', 'Introduced into one open end of the cavity.'], ['Marrow cells', 'Washed out with the fluid.'], ['Collection tube', 'Receives the suspension.']],
    task(ctx) {
      let ml = 0;
      return T.stages(ctx, [
        next => T.single(ctx, { prompt: 'Which fluid do you draw into the syringe to flush the marrow out?', options: [
          { id: 'n', text: '0.9% NaCl (physiological saline)', correct: true, why: 'Correct — an isotonic solution keeps the cells intact.' },
          { id: 'p', text: 'Phosphate-buffered saline (PBS)', correct: true, why: 'Correct — PBS is also isotonic and buffered.' },
          { id: 'd', text: 'Distilled water', why: 'Water is strongly hypotonic and would burst the cells before collection.' },
          { id: 'k', text: '0.075 M KCl', why: 'KCl is the hypotonic solution used later (Step 13), not for collection.' },
          { id: 'c', text: 'Carnoy\'s fixative', unsafe: true, why: 'Fixative would kill and harden the cells and is hazardous; it is used only in Phase 4.' }], onDone: next }),
        next => { const syr = h('div.hero.syr', { html: A.syringe({ ml: 0 }) });
          const dial = T.dial('Volume drawn into the syringe', { min: 0, max: 5, step: 0.5, value: 0, unit: 'mL', onChange: v => { ml = v; syr.innerHTML = A.syringe({ ml: v }); } });
          return h('div.task-block', [h('p.task-prompt', 'Draw up the protocol volume of fluid.'), syr, dial, h('div.task-actions', h('button.btn.primary', { onclick: () => {
            ctx.attempt();
            if (Math.abs(ml - CFG.saline.volumeMl) < 0.05) { ctx.fb('ok', CFG.saline.volumeMl + ' mL matches the protocol.'); next(); }
            else ctx.fb('sci', (ml < CFG.saline.volumeMl ? 'Too little fluid will not clear the cavity of cells' : 'Too much fluid dilutes the suspension too far for the later steps') + '. Use the protocol volume.');
          } }, 'Confirm volume'))]); },
        () => { const host = h('div.hero.flush', { html: flushScene(0) }); let p = 0, busy = false;
          return h('div.task-block', [h('p.task-prompt', 'Insert the needle into one open end of the femur and <strong>flush the marrow into the collection tube</strong>.'), host, h('div.task-actions', h('button.btn.primary', { onclick: ev => {
            if (busy) return; busy = true; ev.target.disabled = true; ctx.attempt();
            const iv = setInterval(() => { p += 0.05; host.innerHTML = flushScene(Math.min(1, p)); if (p >= 1) { clearInterval(iv); ctx.fb('ok', 'Flushed: the marrow cells are now in the tube as a suspension in saline/PBS.'); ctx.complete('Flushed marrow with ' + CFG.saline.volumeMl + ' mL ' + 'saline/PBS.'); } }, 80);
          } }, 'Flush the femur'))]); }
      ], { names: ['Choose the fluid', 'Measure the volume', 'Flush the bone'] });
    }
  });

  function flushScene(p) {
    const svg = '<svg class="art" viewBox="0 0 520 220" role="img" aria-hidden="true"><rect width="520" height="220" fill="#f2f6fb" rx="10"/>' +
      '<g transform="translate(10 40) scale(.8)">' + A.femur({ trimmed: true, flushed: p > 0.6 }).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g>' +
      '<rect x="40" y="86" width="100" height="14" fill="#c4cfdc" stroke="#233a5c"/><path d="M-10 93 L70 93" stroke="#233a5c" stroke-width="3"/>' +
      '<path d="M330 100 q60 0 100 50" stroke="#e8a0a8" stroke-width="' + (p > 0 && p < 1 ? 6 : 0) + '" fill="none" stroke-dasharray="6 5"/>' +
      '<g transform="translate(400 20) scale(.9)">' + A.tube({ level: .15 + .5 * p, color: '#f3b9bd' }).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g>' +
      '<text x="260" y="212" font-size="10.5" fill="#6b7a90" text-anchor="middle" font-weight="500">Illustration — concept of flushing marrow cells into a tube</text></svg>';
    return svg;
  }

  add(11, 1, {
    title: 'Resuspend the Cells', thumb: 'tube', objective: 'Mix the marrow suspension gently to disperse clumps.',
    purpose: 'Gentle pipetting separates cell clumps into a uniform suspension without damaging the cells.',
    materials: ['Pipette', 'Collection tube with marrow suspension'],
    procedure: ['Draw the suspension into the pipette and release it gently, several times.', 'Avoid foaming and avoid forceful expulsion.', 'Do not vortex.'],
    observe: 'A uniform pink-red suspension without visible clumps.',
    safety: 'Pipette with a mechanical aid — never by mouth. Avoid aerosols.',
    key: ['Gentle pipetting only.', 'Vortexing or forceful mixing breaks cells.', 'A uniform suspension gives an even pellet and good spreads.'],
    tools: [[T_.pipette, 'Pipette'], [T_.tube, 'Tube']],
    close: () => A.tube({ level: .55, color: '#f3b9bd' }), ref: () => A.cells({ swell: 0 }), refTitle: 'Cell suspension (schematic)',
    structures: [['Cell clumps', 'Dispersed by gentle mixing.'], ['Single cells', 'Needed for even spreading.']],
    task(ctx) {
      let n = 0; const goal = 5;
      const count = h('p.counter', '0 / ' + goal + ' gentle pipetting cycles');
      const host = h('div.hero.mix', { html: A.tube({ level: .55, color: '#f3b9bd' }) });
      const gentle = h('button.btn.primary', { onclick: () => { n++; count.textContent = n + ' / ' + goal + ' gentle pipetting cycles'; host.classList.remove('swirl'); void host.offsetWidth; host.classList.add('swirl'); if (n === 1) ctx.attempt(); if (n >= goal) { gentle.disabled = true; ctx.fb('ok', 'The suspension is uniform. Gentle pipetting separates clumps without shearing the cells.'); ctx.complete('Resuspended with ' + goal + ' gentle cycles.'); } } }, 'Pipette up and down gently');
      const vortex = h('button.btn', { onclick: () => { ctx.attempt(); ctx.fb('sci', 'High-speed vortexing shears the cells and damages chromosomes, giving poor spreads. Mix gently with the pipette.'); } }, 'Vortex at full speed');
      return h('div', [h('p.task-prompt', 'Resuspend the cells. Choose the mixing method and repeat until the suspension is uniform.'), host, count, h('div.task-actions', [gentle, vortex])]);
    }
  });

  add(12, 2, {
    title: 'Primary Centrifugation', thumb: 'rotor', objective: 'Spin the suspension and identify the fraction that contains the cells.',
    purpose: 'Centrifugation drives the cells to the bottom as a pellet, leaving saline, soluble material and debris in the supernatant.',
    materials: ['15 mL Falcon tube', 'Centrifuge', 'Balance tube'],
    procedure: ['Transfer the suspension into a 15 mL Falcon tube.', 'Balance the rotor with an equal-mass tube opposite.', 'Spin at <strong>' + spin + '</strong> (protocol parameters).', 'Identify the pellet and the supernatant.'],
    observe: 'A reddish-pink cell pellet at the bottom with clear supernatant above it.',
    safety: 'Never run an unbalanced rotor; close the lid; do not open until the rotor has stopped.',
    key: ['Balance first.', 'Speed and time control pellet quality.', 'The pellet contains the cells.'],
    tools: [[T_.centrifuge, 'Centrifuge'], [T_.tube, '15 mL Falcon tube']],
    close: () => A.tube({ level: .7, color: '#f7dfe1', pellet: .8 }), ref: () => A.rotor({ tubes: { 0: 'sample', 3: 'balance' } }), refTitle: 'Balanced rotor (top view)',
    structures: [['Pellet', 'Packed cells at the tube bottom.'], ['Supernatant', 'Liquid above the pellet.']],
    task(ctx) { return T.stages(ctx, centrifugeStages(ctx, { finish: () => ctx.complete('Spun at ' + spin + ' and identified the cell pellet.'), pelletMsg: 'Correct — the cell pellet is at the bottom. The supernatant above it is clear saline with soluble material.' }), { names: ['Balance the rotor', 'Set speed and time', 'Run and identify'] }); }
  });

  add(13, 2, {
    title: 'Add Hypotonic KCl', thumb: 'bottle', objective: 'Add the hypotonic solution so that the cells swell.',
    purpose: 'In a hypotonic medium water enters the cells by osmosis, so they swell and their membranes stretch. When the cells are later dropped on a slide the swollen cells burst gently and the chromosomes spread apart.',
    materials: ['KCl ' + CFG.kcl.molarity, 'Pipette', 'Cell pellet'],
    procedure: ['Add <strong>' + CFG.kcl.volumeMl + ' mL of ' + CFG.kcl.molarity + ' KCl</strong> to the pellet (protocol parameter).', 'Resuspend gently.', 'Continue directly to incubation.'],
    observe: 'The suspension looks slightly cloudier as the cells swell.',
    safety: 'Wear gloves and eye protection. Label all tubes clearly.',
    key: ['Hypotonic = lower solute concentration outside than inside the cell.', 'Water enters by osmosis.', 'Swelling is what lets the chromosomes spread later.'],
    tools: [[T_.bottle, 'KCl ' + CFG.kcl.molarity], [T_.pipette, 'Pipette'], [T_.tube, 'Tube']],
    close: () => A.cells({ swell: 1 }), ref: () => A.cells({ swell: .5 }), refTitle: 'Osmosis: cells swell (schematic)',
    structures: [['Cell membrane', 'Semi-permeable — water moves across it.'], ['Cytoplasm', 'Expands as water enters.']],
    task(ctx) {
      let ml = 0;
      return T.stages(ctx, [
        next => T.single(ctx, { prompt: 'Which reagent do you add to the pellet?', options: [
          { id: 'k', text: 'KCl ' + CFG.kcl.molarity + ' (hypotonic)', correct: true, why: 'Correct — the hypotonic KCl solution swells the cells.' },
          { id: 's', text: '0.9% NaCl (physiological saline)', why: 'Saline is isotonic: the cells would not swell.' },
          { id: 'p', text: 'PBS', why: 'PBS is isotonic and used for collection, not for swelling.' },
          { id: 'c', text: 'Carnoy\'s fixative', unsafe: true, why: 'Fixative must come last: adding it now would fix the cells before they have swollen, and it is a hazardous chemical.' }], onDone: next }),
        next => { const view = h('div.hero.tube1', { html: A.tube({ level: .1, color: '#f3b9bd', pellet: .8 }) });
          const dial = T.dial('Volume of KCl', { min: 0, max: 6, step: 0.5, value: 0, unit: 'mL', onChange: v => { ml = v; view.innerHTML = A.tube({ level: .1 + v / 12, color: '#f3b9bd', pellet: Math.max(0, .8 - v / 8) }); } });
          return h('div.task-block', [h('p.task-prompt', 'Add the protocol volume.'), view, dial, h('div.task-actions', h('button.btn.primary', { onclick: () => { ctx.attempt(); if (Math.abs(ml - CFG.kcl.volumeMl) < .05) { ctx.fb('ok', CFG.kcl.volumeMl + ' mL matches the protocol.'); next(); } else ctx.fb('sci', 'This volume does not match the protocol (' + CFG.kcl.volumeMl + ' mL). Too little limits swelling; too much dilutes the cells unnecessarily.'); } }, 'Add to the tube'))]); },
        () => { const view = h('div.hero', { html: A.cells({ swell: 0 }) }); let p = 0, ran = false;
          const sl = T.dial('Time in KCl', { min: 0, max: 10, step: 1, value: 0, unit: '(simulated)', onChange: v => { view.innerHTML = A.cells({ swell: v / 10 }); } });
          const q = T.single(ctx, { prompt: 'Why do the cells swell in this solution?', options: [
            { id: 'o', text: 'The medium is hypotonic, so water enters the cells by osmosis', correct: true, why: 'Correct — water moves toward the higher solute concentration inside the cells, swelling them and preparing them to spread.' },
            { id: 'a', text: 'KCl fixes the cells and makes them expand', why: 'KCl does not fix cells; fixation is done later with Carnoy\'s fixative.' },
            { id: 'i', text: 'Salts are pumped out, causing the cells to shrink', why: 'In a hypotonic medium cells swell rather than shrink.' }], summary: 'Added ' + CFG.kcl.volumeMl + ' mL of KCl ' + CFG.kcl.molarity + ' and explained osmotic swelling.' });
          return h('div.task-block', [h('p.task-prompt', 'Move the slider to watch the cells swell, then answer.'), view, sl, q]); }
      ], { names: ['Choose the reagent', 'Measure the volume', 'Observe the cells'] });
    }
  });

  add(14, 2, {
    title: 'Incubate the Suspension', thumb: 'bath', objective: 'Incubate at the protocol temperature for the specified time.',
    purpose: 'Incubation at 37 °C gives the cells time to swell evenly by osmosis without being damaged by too little or too much time.',
    materials: ['Water bath', 'Timer', 'Tube with cell suspension'],
    procedure: ['Set the water bath to <strong>' + CFG.incubation.tempC + ' °C</strong>.', 'Incubate for <strong>' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' minutes</strong> (protocol parameter).', 'Remove the tube within that window.'],
    observe: 'Cells swell gradually; too long in hypotonic medium can lyse them.',
    safety: 'Use a tube holder in the water bath; do not touch hot water or surfaces carelessly.',
    key: ['Temperature: ' + CFG.incubation.tempC + ' °C.', 'Time window: ' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' min.', 'Too short: cells under-swollen. Too long: cells burst.'],
    tools: [[T_.bath, 'Water bath'], [T_.timer, 'Timer'], [T_.tube, 'Tube']],
    close: () => A.waterbath({ on: true, temp: CFG.incubation.tempC, tube: true }), ref: () => A.cells({ swell: .8 }), refTitle: 'Cell swelling over time',
    structures: [['Water bath', 'Holds the temperature constant.'], ['Timer', 'Simulated clock runs about ' + CFG.sim.secondsPerRealSecond + '× faster than real time.']],
    task(ctx) {
      let temp = 25, running = null;
      const host = h('div.hero.bath', { html: A.waterbath({ temp }) });
      const read = h('div.big-read', '00:00');
      const status = h('p.task-prompt', 'Set the temperature, then start the incubation. The clock runs about ' + CFG.sim.secondsPerRealSecond + '× faster than real time.');
      const dial = T.dial('Water-bath temperature', { min: 20, max: 60, step: 1, value: temp, unit: '°C', onChange: v => { temp = v; host.innerHTML = A.waterbath({ temp }); } });
      const start = h('button.btn.primary', { onclick: () => {
        if (running) return;
        ctx.attempt();
        if (temp !== CFG.incubation.tempC) { if (temp > 40) ctx.safety(); ctx.fb(temp > CFG.incubation.tempC ? 'sci' : 'sci', temp > CFG.incubation.tempC ? 'Too hot: heat can damage the cells and chromosomes. The protocol temperature is ' + CFG.incubation.tempC + ' °C.' : 'Too cold: swelling will be slow and uneven. The protocol temperature is ' + CFG.incubation.tempC + ' °C.'); return; }
        host.innerHTML = A.waterbath({ on: true, temp, tube: true }); start.disabled = true; dial.querySelector('input').disabled = true; remove.disabled = false;
        ctx.fb('hint', 'Incubating at ' + temp + ' °C. Remove the tube when the elapsed time is within the protocol window.');
        running = clock(s => { read.textContent = fmtClock(s); if (s > CFG.incubation.maxMin * 60 + 90) { running.stop(); } });
      } }, 'Start incubation');
      const remove = h('button.btn', { disabled: true, onclick: () => {
        if (!running) return; const s = running.elapsed(); running.stop(); read.textContent = fmtClock(s);
        const m = s / 60;
        if (m >= CFG.incubation.minMin && m <= CFG.incubation.maxMin) { ctx.fb('ok', 'Removed after ' + fmtClock(s) + ' — within the ' + CFG.incubation.minMin + '–' + CFG.incubation.maxMin + ' minute window. The cells have swollen evenly.'); ctx.complete('Incubated ' + CFG.incubation.tempC + ' °C for ' + Math.round(m) + ' min.'); remove.disabled = true; }
        else { ctx.fb('sci', m < CFG.incubation.minMin ? 'Removed too early (' + fmtClock(s) + '): the cells are under-swollen and will not spread well. Restart and wait for the protocol time.' : 'Removed too late (' + fmtClock(s) + '): prolonged hypotonic exposure makes cells burst, losing chromosomes. Restart and watch the clock.'); running = null; start.disabled = false; dial.querySelector('input').disabled = false; remove.disabled = true; read.textContent = '00:00'; host.innerHTML = A.waterbath({ temp }); }
      } }, 'Remove the tube');
      return h('div', [status, host, dial, read, h('div.task-actions', [start, remove])]);
    }
  });

  add(15, 2, {
    title: 'Centrifuge Again', thumb: 'rotor', objective: 'Pellet the swollen cells again and remove the supernatant.',
    purpose: 'A second spin collects the swollen cells so the hypotonic KCl can be removed before fixation.',
    materials: ['Centrifuge', 'Balance tube', 'Pipette'],
    procedure: ['Balance the rotor.', 'Spin at <strong>' + spin + '</strong> (protocol parameters).', 'Remove the supernatant, leaving the pellet undisturbed.'],
    observe: 'A looser, paler pellet of swollen cells; clear supernatant above it.',
    safety: 'Balance the rotor; wait for it to stop completely before opening the lid.',
    key: ['Same settings as the first spin.', 'Swollen cells are fragile — handle gently.', 'Leave the pellet undisturbed when removing the supernatant.'],
    tools: [[T_.centrifuge, 'Centrifuge'], [T_.pipette, 'Pipette'], [T_.tube, 'Tube']],
    close: () => A.tube({ level: .7, color: '#f9ecee', pellet: .9 }), ref: () => A.rotor({ tubes: { 1: 'sample', 4: 'balance' } }), refTitle: 'Balanced rotor (top view)',
    structures: [['Pellet', 'Swollen cells.'], ['Supernatant', 'KCl solution to remove.']],
    task(ctx) {
      const st = centrifugeStages(ctx, { liquid: '#f9ecee', pelletMsg: 'Correct — the swollen cells are in the pellet; the KCl supernatant above can now be removed.' });
      st.push(() => T.single(ctx, { prompt: 'What do you do with the liquid above the pellet before adding fixative?', options: [
        { id: 'r', text: 'Remove the supernatant carefully, leaving the pellet undisturbed', correct: true, why: 'Correct — the KCl is removed so it does not dilute the fixative, and the pellet (cells) is kept.' },
        { id: 'k', text: 'Keep the supernatant and add fixative on top', why: 'Residual KCl would dilute the fixative and cause the cells to clump.' },
        { id: 'p', text: 'Discard the pellet and keep the supernatant', why: 'The cells are in the pellet — discarding it would throw away the sample.' },
        { id: 's', text: 'Shake the tube vigorously to resuspend before removing anything', why: 'Shaking breaks the fragile swollen cells.' }], summary: 'Spun at ' + spin + ' and removed the KCl supernatant, keeping the pellet.' }));
      return T.stages(ctx, st, { names: ['Balance the rotor', 'Set speed and time', 'Run and identify', 'Remove the supernatant'] });
    }
  });

  add(16, 3, {
    title: 'Add Carnoy\'s Fixative', thumb: 'fume', objective: 'Prepare and add Carnoy\'s fixative safely, then let the cells stand.',
    purpose: 'Fixation preserves the swollen cells and their chromosomes, stops degradation and hardens the preparation. Methanol dehydrates the cells and precipitates proteins; glacial acetic acid penetrates quickly and swells and clears the chromatin so that chromosomes stay well separated.',
    materials: ['Methanol', 'Glacial acetic acid', 'Fume hood', 'Lab coat, gloves, goggles'],
    procedure: ['Prepare fresh Carnoy\'s fixative: methanol : glacial acetic acid = <strong>' + CFG.carnoy.methanolParts + ' : ' + CFG.carnoy.aceticParts + '</strong>, total volume <strong>' + CFG.carnoy.totalMl + ' mL</strong> (protocol parameter).', 'Add it gently to the pellet, mixing as the protocol directs.', 'Let it stand for <strong>' + CFG.carnoy.standMin + ' minutes</strong> at room temperature.'],
    observe: 'The cells harden and become stable; the suspension may turn whiter.',
    safety: 'Methanol is toxic and flammable; glacial acetic acid is corrosive with irritating fumes. Work only in a fume hood, with lab coat, gloves and goggles, under trained supervision.',
    key: ['Ratio ' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + ' methanol:acetic acid.', 'Total ' + CFG.carnoy.totalMl + ' mL; stand ' + CFG.carnoy.standMin + ' min.', 'Always handle in a fume hood with full PPE.'],
    tools: [[T_.fume, 'Fume hood'], [T_.bottle, 'Methanol / acetic acid'], [T_.gloves, 'Gloves'], [T_.goggles, 'Goggles']],
    close: () => A.fume(), ref: () => A.bottle({ l1: 'Carnoy\'s', l2: '3 : 1', l3: 'MeOH : AcOH', hazard: true, cap: '#c0392b' }), refTitle: 'Fixative (hazardous)',
    structures: [['Methanol', 'Dehydrates and precipitates proteins.'], ['Glacial acetic acid', 'Penetrates rapidly; swells chromatin.']],
    task(ctx) {
      let me = 0, ac = 0;
      return T.stages(ctx, [
        next => T.multi(ctx, { prompt: '<strong>Safety first.</strong> What must be in place before you open the fixative reagents? Select all that apply.', options: [
          { id: 'c', text: 'Lab coat, gloves and safety goggles on', correct: true },
          { id: 'h', text: 'Work carried out inside a chemical fume hood', correct: true },
          { id: 's', text: 'Trained supervision and approved laboratory facilities', correct: true },
          { id: 'o', text: 'Work at an open bench — the fumes are mild', unsafe: true, why: 'Methanol and acetic-acid vapours are harmful; open-bench handling is not permitted.' },
          { id: 'n', text: 'Sniff the bottle to check which is acetic acid', unsafe: true, why: 'Never smell chemicals directly — acetic acid vapour burns the airways.' }],
          okMsg: 'Correct — full PPE, a fume hood and trained supervision are all required.', missHint: 'Think about protection for you, ventilation, and who is overseeing.', summary: 'Confirmed PPE, fume hood and supervision.', onDone: next }),
        next => { const view = h('div.hero.fix', { html: '<div class="mix-row">' + A.bottle({ l1: 'Methanol', l2: 'CH₃OH', hazard: true, cap: '#c0392b' }) + A.bottle({ l1: 'Acetic acid', l2: 'glacial', hazard: true, cap: '#c0392b' }) + '</div>' });
          const sum = h('div.big-read', '0.00 mL total · ratio —');
          const upd = () => { sum.textContent = (me + ac).toFixed(2) + ' mL total · ratio ' + (ac > 0 ? (me / ac).toFixed(1) + ' : 1' : '—'); };
          return h('div.task-block', [h('p.task-prompt', 'Measure the two components of Carnoy\'s fixative (fume hood).'), view,
            T.dial('Methanol', { min: 0, max: 3.5, step: 0.25, value: 0, unit: 'mL', onChange: v => { me = v; upd(); } }), T.dial('Glacial acetic acid', { min: 0, max: 3.5, step: 0.25, value: 0, unit: 'mL', onChange: v => { ac = v; upd(); } }), sum,
            h('div.task-actions', h('button.btn.primary', { onclick: () => {
              ctx.attempt();
              const wantMe = CFG.carnoy.totalMl * CFG.carnoy.methanolParts / (CFG.carnoy.methanolParts + CFG.carnoy.aceticParts), wantAc = CFG.carnoy.totalMl - wantMe;
              if (Math.abs(me - wantMe) < .01 && Math.abs(ac - wantAc) < .01) { ctx.fb('ok', 'Correct: ' + me + ' mL methanol + ' + ac + ' mL acetic acid = ' + (me + ac) + ' mL at ' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + '.'); next(); }
              else if (Math.abs(me + ac - CFG.carnoy.totalMl) > .01) ctx.fb('sci', 'The total volume must be ' + CFG.carnoy.totalMl + ' mL. Yours is ' + (me + ac).toFixed(2) + ' mL.');
              else ctx.fb('sci', 'The total is right but the ratio is not ' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + ' (methanol : acetic acid). A wrong ratio gives poor fixation and chromosome morphology.');
            } }, 'Confirm fixative'))]); },
        () => { const read = h('div.big-read', '00:00'), view = h('div.hero', { html: A.tube({ level: .35, color: '#fff3f1', pellet: .5 }) }); let c = null;
          const go = h('button.btn.primary', { onclick: () => {
            if (c) return; go.disabled = true; ctx.attempt(); ctx.fb('hint', 'The fixative is added gently; the tube now stands at room temperature. Clock is accelerated about ' + CFG.sim.secondsPerRealSecond + '×.');
            c = clock(s => { read.textContent = fmtClock(s); if (s >= CFG.carnoy.standMin * 60) { c.stop(); ctx.fb('ok', 'The ' + CFG.carnoy.standMin + ' minute standing time is complete — the cells are fixed.'); ctx.complete('Fixed in Carnoy\'s (' + CFG.carnoy.methanolParts + ':' + CFG.carnoy.aceticParts + ') for ' + CFG.carnoy.standMin + ' min.'); } });
          } }, 'Add fixative gently and let it stand');
          return h('div.task-block', [h('p.task-prompt', 'Add the fixative to the pellet and let the tube stand for ' + CFG.carnoy.standMin + ' minutes.'), view, read, h('div.task-actions', go)]); }
      ], { names: ['Safety check', 'Prepare the fixative', 'Fix the cells'] });
    }
  });

  add(17, 3, {
    title: 'Wash and Prepare Final Suspension', thumb: 'tube', objective: 'Wash the fixed cells and prepare the final suspension in fresh fixative.',
    purpose: 'Washing in fresh fixative removes residues of the first fixative and gives a clean, well-fixed cell suspension ready for slide preparation.',
    materials: ['Centrifuge', 'Fresh Carnoy\'s fixative', 'Pipette', 'Designated waste container'],
    procedure: ['Centrifuge at <strong>' + spin + '</strong> (protocol parameters).', 'Remove the supernatant into the designated waste container.', 'Add fresh fixative.', 'Resuspend gently.'],
    observe: 'A clean white-pink cell pellet that resuspends into a uniform suspension.',
    safety: 'Fixative waste is hazardous: dispose in the designated solvent/chemical waste container — never down the sink — and keep it capped.',
    key: ['Spin: ' + spin + '.', 'Replace the fixative with fresh fixative.', 'Collect hazardous waste in the designated container.'],
    tools: [[T_.centrifuge, 'Centrifuge'], [T_.pipette, 'Pipette'], [T_.waste, 'Waste container'], [T_.tube, 'Tube']],
    close: () => A.tube({ level: .5, color: '#fff7f5', pellet: .7 }), ref: () => A.cells({ swell: .4 }), refTitle: 'Fixed cell suspension (schematic)',
    structures: [['Fixed cells', 'Chromosomes preserved.'], ['Waste fixative', 'Hazardous chemical waste.']],
    task(ctx) {
      return T.stages(ctx, [
        next => T.sequence(ctx, { prompt: 'Put the washing steps in order.', items: [
          { id: 1, text: 'Centrifuge the tube at ' + spin }, { id: 2, text: 'Remove the supernatant, leaving the pellet' }, { id: 3, text: 'Add fresh fixative' }, { id: 4, text: 'Resuspend the cells gently' }],
          order: [1, 2, 3, 4], okMsg: 'Correct order.', hint: 'The cells must be pelleted before liquid is removed.', onDone: next }),
        () => T.single(ctx, { prompt: 'Where does the used fixative (supernatant) go?', options: [
          { id: 'd', text: 'Down the sink with plenty of water', unsafe: true, why: 'Methanol/acetic-acid waste must not enter the drain: it is hazardous and flammable.' },
          { id: 'b', text: 'The general waste bin', unsafe: true, why: 'Liquid chemical waste in a general bin is a spill, fire and exposure hazard.' },
          { id: 'w', text: 'The designated, labelled chemical (solvent) waste container, kept capped', correct: true, why: 'Correct — hazardous liquid waste goes to the designated container according to the laboratory protocol.' },
          { id: 'o', text: 'Left open in the fume hood to evaporate', unsafe: true, why: 'Evaporating solvent releases harmful vapour into the lab environment.' }], summary: 'Washed in fresh fixative and put the waste in the designated container.' })
      ], { names: ['Washing sequence', 'Waste disposal'] });
    }
  });

  /* ------------------------------------------------------------ checkpoint */
  const CHECK = [
    { k: 'Colchicine pretreatment', q: 'What is the main purpose of the colchicine pretreatment?', o: [
      ['It stops spindle formation so dividing cells accumulate at metaphase', 1, 'Correct — colchicine inhibits microtubule assembly and arrests cells at metaphase.'],
      ['It makes the cells swell so chromosomes spread', 0, 'That is the hypotonic treatment (KCl), later in the protocol.'],
      ['It fixes the chromosomes in position', 0, 'Fixation is done with Carnoy\'s fixative, not colchicine.'],
      ['It separates marrow cells from the bone', 0, 'Marrow is flushed out with saline/PBS; colchicine acts on cell division.']] },
    { k: 'Bone marrow collection', q: 'What is the purpose of flushing the femur with saline or PBS?', o: [
      ['It washes marrow cells out of the bone into a tube as a cell suspension', 1, 'Correct — the isotonic fluid carries the dividing marrow cells out of the cavity.'],
      ['It stains the chromosomes', 0, 'Staining is done with Giemsa in Lab 8.'],
      ['It bursts the cells to release the chromosomes', 0, 'Isotonic fluid keeps the cells intact; bursting happens later on the slide.'],
      ['It counts the chromosomes', 0, 'Counting is done under the microscope in Lab 8.']] },
    { k: 'Cell washing', q: 'What does centrifugation (washing) achieve?', o: [
      ['It collects the cells as a pellet so the surrounding liquid can be removed', 1, 'Correct — cells sediment, and the supernatant with unwanted solutes is discarded.'],
      ['It induces metaphase arrest', 0, 'Metaphase arrest is caused by colchicine in vivo.'],
      ['It swells the cells', 0, 'Swelling is caused by the hypotonic KCl.'],
      ['It stains the cell nuclei', 0, 'Staining is a separate step in Lab 8.']] },
    { k: 'Hypotonic treatment', q: 'Why are the cells treated with hypotonic KCl?', o: [
      ['Water enters by osmosis, swelling the cells so that chromosomes can spread apart', 1, 'Correct — swelling lets the chromosomes separate when the cells are dropped on a slide.'],
      ['It kills the cells to preserve them', 0, 'Preservation is the job of the fixative.'],
      ['It dehydrates the cells so they shrink', 0, 'A hypotonic medium swells cells; it does not dehydrate them.'],
      ['It condenses the chromosomes', 0, 'Condensation is already achieved by colchicine arrest at metaphase.']] },
    { k: 'Cell fixation', q: 'What is the role of Carnoy\'s fixative?', o: [
      ['It preserves the cells and chromosomes and hardens the preparation', 1, 'Correct — methanol and acetic acid fix the structure so chromosomes keep their shape.'],
      ['It swells the cells by osmosis', 0, 'Swelling is the effect of the hypotonic solution.'],
      ['It arrests cells in metaphase', 0, 'That is colchicine\'s action.'],
      ['It provides the colour for microscopy', 0, 'Colour comes from the Giemsa stain.']] }
  ];

  KL.LAB7 = { PH, STEPS, CHECK };
})();
