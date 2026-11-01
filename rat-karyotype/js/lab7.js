/* =========================================================================
   lab7.js — Lab 7: Rat Dissection and Bone Marrow Collection (for Karyotyping).
   12 steps + a final checkpoint. Every step: tool selection first, then the task.
   Nothing is performed automatically — the student acts, the application checks.
   Protocol values come from KL.CONFIG; anything the supplied material did not state is
   listed in KL.INSTRUCTOR_INPUT and is NOT invented here.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc } = KL.UI, A = KL.Art, T = KL.Tasks, CFG = KL.CONFIG, Cm = KL.Common, TO = A.TOOL;

  const PH = ['Phase 1 — Specimen, ethics and orientation', 'Phase 2 — Dissection of the hindlimb', 'Phase 3 — Bone preparation', 'Phase 4 — Bone marrow collection and processing'];
  const spin = CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min';

  /* ---------------- anatomy hotspot descriptions (generic anatomy only) ---------------- */
  KL.REGION_INFO = {
    head: ['Head', 'Skull, brain, eyes, ears and mouth.'],
    forelimb: ['Forelimb', 'The front limb — not used for bone marrow collection in this exercise.'],
    trunk: ['Trunk (body)', 'The chest and abdomen, supported by the vertebral column.'],
    hindlimb: ['Hindlimb', 'The rear limb: thigh (femur), shank (tibia and fibula) and foot. The femur and tibia are the marrow source.'],
    tail: ['Tail', 'Extension of the vertebral column.'],
    femur: ['Femur', 'The thigh bone — the long bone between the hip and the knee. Its central shaft (diaphysis) contains the marrow cavity.'],
    tibia: ['Tibia', 'The shin bone — the long bone between the knee and the ankle.'],
    foot: ['Foot', 'Bones of the ankle and toes — not used.'],
    'femur-prox': ['Femur — proximal epiphysis', 'The rounded upper end (head) of the femur, at the hip. Epiphyses contain spongy bone.'],
    'femur-dist': ['Femur — distal epiphysis', 'The lower end of the femur (condyles), at the knee.'],
    'tibia-prox': ['Tibia — proximal epiphysis', 'The upper end of the tibia, at the knee.'],
    'tibia-dist': ['Tibia — distal epiphysis', 'The lower end of the tibia, at the ankle.'],
    'thigh-muscle': ['Thigh muscles', 'The muscle mass that surrounds the femur.'],
    'shank-muscle': ['Shank (lower-leg) muscles', 'The muscle mass that surrounds the tibia.'],
    'skin-flap': ['Reflected skin', 'Skin folded back to expose the muscles beneath.']
  };

  /* ---------------- tool definitions: identical neutral tiles ---------------- */
  const TD = {
    gloves: { name: 'Gloves', ic: TO.gloves }, coat: { name: 'Lab coat', ic: TO.coat }, goggles: { name: 'Eye protection', ic: TO.goggles },
    pad: { name: 'Dissection pad', ic: TO.pad }, scissors: { name: 'Scissors', ic: TO.scissors }, forceps: { name: 'Forceps', ic: TO.forceps },
    scalpel: { name: 'Scalpel', ic: TO.scalpel }, gauze: { name: 'Gauze', ic: TO.gauze }, syringe: { name: 'Syringe with needle', ic: TO.syringe },
    saline: { name: 'Saline / PBS', ic: TO.bottle }, tube: { name: 'Labelled collection tubes', ic: TO.tube }, centrifuge: { name: 'Centrifuge', ic: TO.centrifuge },
    pipette: { name: 'Pipette', ic: TO.pipette }, timer: { name: 'Timer', ic: TO.timer }, bath: { name: 'Water bath', ic: TO.bath },
    flame: { name: 'Open flame', ic: TO.flame, why: 'not needed here and a fire hazard', unsafe: true }, waste: { name: 'Waste container', ic: TO.waste },
    ruler: { name: 'Ruler', ic: TO.ruler }, jar: { name: 'Staining jar', ic: TO.jar }
  };
  const fix = ids => ids;

  /* ---------------- helpers ---------------- */
  const note = html => h('div.sim-note', { html });
  const hot = (host, fn) => Cm.clickIn(host, '[data-region]', el => fn(el.dataset.region));
  const nm = r => KL.REGION_INFO[r] ? KL.REGION_INFO[r][0] : r;

  /** Build the task of a step: tool selection, then the step's own stages. */
  function stepTask(d) {
    return ctx => {
      const stages = [next => T.tools(ctx, { prompt: d.toolPrompt || 'Select the instruments and materials this step needs. Choose only what is required.', pool: d.pool, required: d.req, defs: TD, onDone: next })]
        .concat(d.stages(ctx));
      return h('div', [d.intro ? note(d.intro) : null, T.stages(ctx, stages, { onFinish: () => ctx.complete(d.summary) })]);
    };
  }

  /** Rotatable specimen; click the part asked for. */
  function rotateStage(ctx, o) {
    return next => {
      let vi = 0;
      const host = h('div.hero.rat-host'), label = h('span.rot-label', '');
      const draw = () => {
        const view = A.RAT_VIEWS[vi];
        host.innerHTML = A.rat({ view, regions: true });
        label.textContent = 'View ' + (vi + 1) + ' of ' + A.RAT_VIEWS.length + ' (' + { lateral: 'left side', dorsal: 'back', 'lateral-r': 'right side', ventral: 'belly' }[view] + ')';
        hot(host, r => {
          ctx.attempt();
          if (r === o.correct) { ctx.fb('ok', o.okMsg); next(); }
          else ctx.fb('sci', 'That is the ' + nm(r).toLowerCase() + '. ' + o.hint);
        });
      };
      const rot = h('div.rot-ctl', [h('button.btn.sm', { id: 'rot-prev', onclick: () => { vi = (vi + A.RAT_VIEWS.length - 1) % A.RAT_VIEWS.length; draw(); } }, '⟲ Rotate'), label, h('button.btn.sm', { id: 'rot-next', onclick: () => { vi = (vi + 1) % A.RAT_VIEWS.length; draw(); } }, 'Rotate ⟳')]);
      draw();
      return h('div.task-block', [h('p.task-prompt', { html: o.prompt }), rot, host]);
    };
  }

  /** Click away tissue patches until none remain. mk(patches) → svg html with .patch elements. */
  function patchStage(ctx, o) {
    return next => {
      let left = o.patches.map(p => p.slice());
      const host = h('div.hero.patch-host'), count = h('p.tiny', '');
      const draw = () => {
        host.innerHTML = o.mk(left);
        count.textContent = left.length + ' piece' + (left.length === 1 ? '' : 's') + ' of tissue remaining';
        host.querySelectorAll('.patch').forEach(el => el.addEventListener('click', e => {
          e.stopPropagation(); ctx.attempt();
          const i = +el.dataset.patch, kind = el.dataset.bone;
          if (o.perBone) { const idx = left.map((p, k) => p[2] === kind ? k : -1).filter(k => k >= 0)[i]; left = left.filter((p, k) => k !== idx); }
          else left = left.filter((p, k) => k !== i);
          if (!left.length) { ctx.fb('ok', o.okMsg); draw(); setTimeout(next, 500); } else { ctx.fb('ok', 'Tissue removed with the instruments you selected. Continue until the bone is clear.'); draw(); }
        }));
      };
      draw();
      return h('div.task-block', [h('p.task-prompt', { html: o.prompt }), host, count]);
    };
  }

  const pickStage = (ctx, o) => next => T.pick(ctx, Object.assign({ onDone: next }, o));
  const singleStage = (ctx, o) => next => T.single(ctx, Object.assign({ onDone: next }, o));
  const multiStage = (ctx, o) => next => T.multi(ctx, Object.assign({ onDone: next }, o));
  const seqStage = (ctx, o) => next => T.sequence(ctx, Object.assign({ onDone: next }, o));
  const opt = (id, text, correct, why, unsafe) => ({ id, text, correct: !!correct, why, unsafe: !!unsafe });

  const STEPS = [];
  const add = (n, ph, d) => {
    const s = Object.assign({ n, phase: PH[ph], stage: 'lab7' }, d);
    s.tools = d.req.map(id => [TD[id].ic, TD[id].name]);
    s.task = stepTask(d);
    STEPS.push(s);
  };

  /* ===================================================== 1 Cervical dislocation */
  add(1, 0, {
    title: 'Cervical Dislocation', thumb: 'neck', objective: 'Identify the specimen, apply the ethics and safety rules and place colchicine pretreatment correctly in the timeline.',
    anat: () => A.rat({ view: 'lateral', regions: true, highlight: 'neck' }), anatTitle: 'Specimen — side view',
    close: () => A.rat({ highlight: 'neck' }), ref: () => A.skeletonNeck(), refTitle: 'Skeletal reference (side view)',
    purpose: 'Euthanasia gives rapid, humane death before tissue collection. The method, the people allowed to perform it and the justification are set by the institutional animal-ethics approval. Colchicine pretreatment must already have been given at the correct time before sacrifice.',
    materials: ['Approved ethics protocol', 'Trained, authorised operator', 'Dissection pad', 'Gloves, lab coat'],
    procedure: ['Confirm the specimen identity and that the work is covered by an approved ethics protocol.', 'Confirm colchicine pretreatment was given at the protocol time.', 'A trained, authorised person performs the approved method (cervical dislocation).', 'Confirm death before dissection begins.'],
    observe: 'Loss of reflexes and respiration confirms death before any dissection begins.',
    safety: 'Never perform euthanasia without ethics approval and training. This page is a non-graphic educational simulation of an approved procedure — no unapproved technique is shown.',
    key: ['Ethics approval and trained personnel come first.', 'Colchicine (' + CFG.colchicine.dose + ', ' + CFG.colchicine.timing + ') is given BEFORE sacrifice — never afterwards.', 'The method must be rapid and cause minimal distress.', 'Death is confirmed before dissection.'],
    structures: [['Cervical vertebrae', 'The neck vertebrae — the region involved in the approved method.']],
    req: ['coat', 'gloves', 'pad'], pool: ['coat', 'gloves', 'pad', 'scalpel', 'flame', 'syringe', 'tube'],
    intro: '<strong>Educational simulation of an approved procedure.</strong> Nothing is shown graphically and colchicine is not “injected” here: the dose and timing are instructor-verified protocol information.',
    summary: 'Identified the specimen, applied the ethics rules and placed colchicine pretreatment in the timeline.',
    stages: ctx => [
      singleStage(ctx, { prompt: 'How is the <strong>specimen identified</strong> before any procedure begins?',
        options: [opt('a', 'By its label/record, checked against the approved ethics protocol and the experiment plan', true, 'Correct — identity, strain and approval are confirmed from the record before anything else.'), opt('b', 'By its appearance alone', false, 'Appearance is not a record. Identity must be confirmed from the label and the approved protocol.'), opt('c', 'It is not necessary in a teaching exercise', false, 'Identification is always required, including in teaching.', true)] }),
      multiStage(ctx, { prompt: 'Which conditions must be met <em>before</em> euthanasia in an approved experiment? Select all that apply.',
        options: [opt('a', 'The work is covered by an approved animal-ethics protocol', true), opt('b', 'It is performed by trained, authorised personnel', true), opt('c', 'The method is the one specified in the approved protocol', true),
          opt('d', 'It is acceptable to proceed without approval because it is a teaching exercise', false, 'Teaching does not remove the requirement for ethics approval.', true), opt('e', 'Any student may try the method first to practise', false, 'Untrained attempts cause suffering; only trained, authorised people may perform euthanasia.', true)],
        okMsg: 'Correct — approval, training and the approved method are all required.', missHint: 'Think about who may do it, under what authority, and by which method.' }),
      seqStage(ctx, { prompt: 'Put the events of the experiment in the correct <strong>timeline</strong>. Colchicine pretreatment is a prerequisite of this lab.',
        items: [{ id: 1, text: 'Check specimen identity and ethics approval' }, { id: 2, text: 'Colchicine pretreatment (' + CFG.colchicine.dose + ', ' + CFG.colchicine.timing + ' — instructor-verified)' }, { id: 3, text: 'Approved humane euthanasia (cervical dislocation) by a trained person' }, { id: 4, text: 'Confirm death' }, { id: 5, text: 'Begin dissection of the hindlimb' }],
        order: [1, 2, 3, 4, 5], okMsg: 'Correct — colchicine is given to the living animal 1.5–2 hours before sacrifice, which accumulates cells at metaphase.', hint: 'Colchicine acts on dividing cells, so the animal must still be alive when it is given.' })
    ]
  });

  /* ===================================================== 2 Identify hindlimb */
  add(2, 0, {
    title: 'Identify the Hindlimb', thumb: 'limb', objective: 'Rotate the specimen and identify the hindlimb and the bones within it.',
    anat: () => A.rat({ view: 'dorsal', regions: true }), anatTitle: 'Specimen — rotatable',
    close: () => A.limb({ mode: 'muscle' }), ref: () => A.limb({ mode: 'bone' }), refTitle: 'Skeletal reference — hindlimb',
    purpose: 'The hindlimb contains the femur and the tibia, the two long bones used as bone marrow sources. Correct orientation prevents cutting in the wrong place.',
    materials: ['Dissection pad', 'Gloves'], procedure: ['Rotate the specimen and distinguish head, forelimbs, trunk, hindlimbs and tail.', 'Choose the hindlimb.', 'Locate the femur (thigh) and tibia (shank).'],
    observe: 'The hindlimb is the rear limb; the femur is above the knee, the tibia below it.',
    safety: 'Wear a lab coat and gloves; handle the specimen only on the dissection pad.',
    key: ['Hindlimb = rear limb.', 'Femur: hip to knee. Tibia: knee to ankle.'], structures: [['Femur', 'Thigh bone.'], ['Tibia', 'Shin bone.']],
    req: ['pad', 'gloves'], pool: ['pad', 'gloves', 'syringe', 'centrifuge', 'saline'],
    summary: 'Identified the hindlimb and distinguished the femur from the tibia.',
    stages: ctx => [
      rotateStage(ctx, { prompt: '<strong>Rotate the specimen</strong> and click the <strong>hindlimb</strong>.', correct: 'hindlimb', okMsg: 'Correct — the hindlimb is the rear limb that carries the femur and the tibia.', hint: 'The hindlimb is the rear limb, at the back end of the body.' }),
      pickStage(ctx, { art: A.limb({ mode: 'bone', regions: true }), prompt: 'Now <strong>click the femur</strong> on the skeleton of the hindlimb.', correct: 'femur', okMsg: 'Correct — the femur is the long bone between the hip and the knee.',
        wrong: { tibia: 'That is the tibia (shin bone), below the knee. The femur is the thigh bone, above the knee.', foot: 'That is the foot. Look higher: the femur lies between the hip and the knee.' } })
    ]
  });

  /* ===================================================== 3 Skin incision */
  const incisionStage = ctx => next => {
    const host = h('div.hero', { html: A.limb({ mode: 'incision' }) });
    ['incA', 'incB', 'incC'].forEach((id, i) => {
      const src = host.querySelector('#' + id), hit = src.cloneNode();
      hit.removeAttribute('id'); hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '24'); hit.setAttribute('stroke-dasharray', 'none'); hit.setAttribute('class', 'hot'); hit.setAttribute('data-inc', id);
      src.parentNode.appendChild(hit);
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text'), pt = { incA: [150, 90], incB: [330, 168], incC: [100, 220] }[id];
      lbl.setAttribute('x', pt[0]); lbl.setAttribute('y', pt[1]); lbl.setAttribute('font-size', '15'); lbl.setAttribute('font-weight', '700'); lbl.setAttribute('fill', '#233a5c'); lbl.textContent = 'ABC'[i]; src.parentNode.appendChild(lbl);
    });
    Cm.clickIn(host, '[data-inc]', el => {
      ctx.attempt();
      const id = el.dataset.inc;
      if (id === 'incA') { ctx.fb('ok', 'Correct — a longitudinal skin incision over the thigh gives access to the muscle covering the femur without damaging deeper tissue.'); next(); }
      else if (id === 'incB') ctx.fb('sci', 'That line passes around the knee joint, away from the femur shaft, and cuts across structures you want to keep intact.');
      else ctx.fb('sci', 'That line is on the lower leg. This incision must expose the thigh to reach the femur.');
    });
    return h('div.task-block', [h('p.task-prompt', 'Click the incision line that exposes the thigh with the least tissue damage.'), host]);
  };
  add(3, 1, {
    title: 'Skin Incision', thumb: 'limb', objective: 'Choose the instruments and the correct line for the skin incision.',
    anat: () => A.limb({ mode: 'muscle', regions: true }), anatTitle: 'Layers beneath the skin',
    close: () => A.limb({ mode: 'skin' }), ref: () => A.limb({ mode: 'muscle' }), refTitle: 'Layers beneath the skin',
    purpose: 'A shallow incision through the skin only, along the thigh, lets the skin be reflected without damaging the muscle or bone beneath.',
    materials: ['Scissors', 'Forceps', 'Gloves'], procedure: ['Lift the skin with forceps.', 'Cut through the skin only, in line with the long axis of the limb.', 'Avoid cutting into the muscle.'],
    observe: 'A clean opening through the skin with the pale muscle surface visible beneath.',
    safety: 'Cut away from your body and fingers; keep the free hand clear of the blade; dispose of sharps in the sharps container.',
    key: ['Incise along the thigh, over the femur.', 'Skin only — keep the cut shallow.'], structures: [['Skin', 'Cut first, along the thigh.'], ['Muscle', 'Must stay intact at this step.']],
    req: ['scissors', 'forceps', 'gloves'], pool: ['scissors', 'forceps', 'gloves', 'syringe', 'tube', 'centrifuge', 'flame'],
    summary: 'Selected the instruments and the thigh incision.', stages: ctx => [incisionStage(ctx)]
  });

  /* ===================================================== 4 Reflect skin */
  add(4, 1, {
    title: 'Reflect the Skin', thumb: 'limb', objective: 'Reflect the skin to uncover the muscles.',
    anat: () => A.limb({ mode: 'open', regions: true }), anatTitle: 'Skin reflected',
    close: () => A.limb({ mode: 'open' }), ref: () => A.limb({ mode: 'muscle' }), refTitle: 'Muscle layer',
    purpose: 'Folding the skin back exposes the muscles of the thigh. The skin is reflected, not removed.',
    materials: ['Forceps', 'Scissors', 'Gauze'], procedure: ['Grip the cut skin edge with forceps and peel it back.', 'Free the skin from the underlying fascia by blunt dissection.', 'Fold the skin back to uncover the muscles.'],
    observe: 'The skin lies folded back and the dark red muscle is visible.',
    safety: 'Handle tissue with forceps rather than fingers; treat all tissue as biohazardous waste.', key: ['Skin is reflected, not removed.', 'Work gently to avoid tearing.'],
    structures: [['Reflected skin', 'Folded back to expose the muscle.']],
    req: ['forceps', 'scissors', 'gloves'], pool: ['forceps', 'scissors', 'gloves', 'gauze', 'syringe', 'bath', 'tube'],
    summary: 'Ordered the reflection technique and identified the reflected skin.',
    stages: ctx => [
      seqStage(ctx, { prompt: 'Put the actions for reflecting the skin in order.', items: [{ id: 1, text: 'Grip the cut skin edge with forceps' }, { id: 2, text: 'Free the skin from the fascia by blunt dissection' }, { id: 3, text: 'Fold the skin back to uncover the muscle' }], order: [1, 2, 3], okMsg: 'Correct order.', hint: 'You must hold the skin before you can free and fold it.' }),
      pickStage(ctx, { art: A.limb({ mode: 'open', regions: true }), prompt: 'The skin is reflected. <strong>Click the reflected skin.</strong>', correct: 'skin-flap', okMsg: 'Correct — that is the reflected skin flap.', wrong: { 'thigh-muscle': 'That is the thigh muscle mass beneath the skin.', 'shank-muscle': 'That is the shank muscle mass beneath the skin.' } })
    ]
  });

  /* ===================================================== 5 Expose muscles */
  add(5, 1, {
    title: 'Expose the Muscles', thumb: 'muscle', objective: 'Identify the muscle masses that cover the femur and the tibia.',
    anat: () => A.limb({ mode: 'muscle', regions: true }), anatTitle: 'Muscle layer',
    close: () => A.limb({ mode: 'open' }), ref: () => A.limb({ mode: 'muscle' }), refTitle: 'Anatomy — muscle layer',
    purpose: 'The thigh muscles enclose the femur and the shank muscles enclose the tibia. Both must be cleared from their bones to free clean bone.',
    materials: ['Forceps', 'Gauze'], procedure: ['Identify the muscle mass around the femur.', 'Identify the muscle mass around the tibia.'],
    observe: 'Dark red muscle covers both bones; neither bone is visible yet.', safety: 'Treat all tissue as biohazardous waste; use forceps, not fingers.',
    key: ['Thigh muscles cover the femur.', 'Shank muscles cover the tibia.'], structures: [['Thigh muscles', 'Around the femur.'], ['Shank muscles', 'Around the tibia.']],
    req: ['forceps', 'gauze', 'gloves'], pool: ['forceps', 'gauze', 'gloves', 'syringe', 'centrifuge', 'saline'],
    summary: 'Identified the thigh and shank muscle masses.',
    stages: ctx => [
      pickStage(ctx, { art: A.limb({ mode: 'open', regions: true }), prompt: '<strong>Click the muscle mass that surrounds the femur.</strong>', correct: 'thigh-muscle', okMsg: 'Correct — the thigh muscles surround the femur.', wrong: { 'shank-muscle': 'Those are the shank muscles around the tibia; the femur lies in the thigh.', 'skin-flap': 'That is the reflected skin, not a muscle.' } }),
      pickStage(ctx, { art: A.limb({ mode: 'open', regions: true }), prompt: 'Now <strong>click the muscle mass that surrounds the tibia.</strong>', correct: 'shank-muscle', okMsg: 'Correct — the shank muscles surround the tibia.', wrong: { 'thigh-muscle': 'Those are the thigh muscles around the femur; the tibia lies below the knee.', 'skin-flap': 'That is the reflected skin, not a muscle.' } })
    ]
  });

  /* ===================================================== 6 / 7 remove muscles */
  const femP = [[130, -10, 'femur', 0], [220, 12, 'femur', 1], [300, -6, 'femur', 2]];
  const tibP = [[120, 8, 'tibia', 0], [210, -10, 'tibia', 1], [300, 6, 'tibia', 2]];
  const boneStep = (n, kind, other) => {
    const Kind = kind === 'femur' ? 'Femur' : 'Tibia', fem = kind === 'femur';
    const patches = fem ? femP : tibP, mk = left => fem ? A.femur({ patches: left.map(p => [p[0], p[1]]) }) : A.tibia({ patches: { tibia: left.map(p => [p[0], p[1]]) } });
    add(n, 2, {
      title: 'Remove the Muscles (' + Kind + ')', thumb: 'bone', objective: 'Identify the ' + kind + ', strip the muscle from it with the right instruments and recognise the exposed bone.',
      anat: () => fem ? A.femur({ regions: true, labels: true }) : A.tibia({ regions: true, labels: true }), anatTitle: Kind + ' — regions',
      close: () => mk(patches), ref: () => fem ? A.femur({ labels: true }) : A.tibia({ labels: true }), refTitle: Kind + ' after muscle removal',
      purpose: 'Removing the attached muscle and connective tissue from the ' + kind + ' prevents contamination of the marrow sample with non-marrow cells. The ' + other + ' is handled as a separate stage.',
      materials: ['Scissors', 'Forceps', 'Gauze', 'Gloves'], procedure: ['Identify the ' + kind + ' and tell it from the ' + other + '.', 'Hold the bone with forceps wrapped in gauze.', 'Cut the muscle away along the bone with scissors.', 'Wipe off remaining tissue with gauze.', 'Recognise the exposed ' + kind + '.'],
      observe: 'A pale bone with only thin tissue remnants.', safety: 'Never hold the bone with bare fingers; use forceps and gauze. Cut away from yourself.',
      key: ['Use instruments, not fingers.', 'Work from the shaft toward the ends.', 'Avoid damaging the epiphyses.', fem ? 'Femur = thigh bone (above the knee).' : 'Tibia = shin bone (below the knee).'],
      structures: [[Kind, fem ? 'Thigh bone.' : 'Shin bone.']],
      req: ['scissors', 'forceps', 'gauze', 'gloves'], pool: ['scissors', 'forceps', 'gauze', 'gloves', 'syringe', 'tube', 'bath', 'flame'],
      summary: 'Identified the ' + kind + ', removed its muscle and recognised the exposed bone.',
      stages: ctx => [
        pickStage(ctx, { art: A.limb({ mode: 'bone', regions: true }), prompt: '<strong>Click the ' + kind + '</strong> on the skeleton of the hindlimb.', correct: kind, okMsg: 'Correct — ' + (fem ? 'the femur is the thigh bone, between the hip and the knee.' : 'the tibia is the shin bone, between the knee and the ankle.'),
          wrong: fem ? { tibia: 'That is the tibia (shin bone), below the knee.', foot: 'That is the foot.' } : { femur: 'That is the femur (thigh bone), above the knee.', foot: 'That is the foot.' } }),
        patchStage(ctx, { patches, mk, prompt: 'Remove the muscle from the ' + kind + ': <strong>click each piece of attached muscle</strong> to strip it away with your instruments.', okMsg: 'The ' + kind + ' is free of muscle.' }),
        pickStage(ctx, { art: fem ? A.femur({ regions: true }) : A.tibia({ regions: true }), prompt: 'The bone is now exposed. <strong>Click the shaft (diaphysis)</strong> — the part that holds the marrow cavity.', correct: kind, okMsg: 'Correct — the shaft is the long middle part that contains the marrow cavity.',
          wrong: (function () { const w = {}; w[kind + '-prox'] = 'That is the upper end (an epiphysis), not the shaft.'; w[kind + '-dist'] = 'That is the lower end (an epiphysis), not the shaft.'; return w; })() })
      ]
    });
  };
  boneStep(6, 'femur', 'tibia');
  boneStep(7, 'tibia', 'femur');

  /* ===================================================== 8 clean bones */
  const remF = [[110, -9, 'femur', 0], [250, 10, 'femur', 1]], remT = [[130, 8, 'tibia', 0], [270, -8, 'tibia', 1]];
  add(8, 2, {
    title: 'Clean the Bones', thumb: 'bone', objective: 'Clean both the femur and the tibia and confirm they are ready.',
    anat: () => A.bones({ regions: true, labels: true }), anatTitle: 'Isolated femur and tibia',
    close: () => A.bones({ patches: { femur: remF.map(p => [p[0], p[1]]), tibia: remT.map(p => [p[0], p[1]]) } }), ref: () => A.bones({ labels: true }), refTitle: 'Clean femur and tibia',
    purpose: 'Residual muscle, connective tissue and blood would contaminate the marrow sample. Both bones must be clean before the ends are cut.',
    materials: ['Gauze', 'Forceps', 'Gloves'], procedure: ['Wipe each bone with gauze to remove remaining tissue.', 'Check both bones — the femur and the tibia.', 'Confirm both are clean before continuing.'],
    observe: 'Two pale, clean bones with no visible attached tissue.', safety: 'Use forceps and gauze, not bare fingers; dispose of tissue in the biohazard waste.',
    key: ['Both bones must be cleaned.', 'Remove every remnant, including near the ends.'], structures: [['Femur', 'Thigh bone.'], ['Tibia', 'Shin bone.']],
    req: ['gauze', 'forceps', 'gloves'], pool: ['gauze', 'forceps', 'gloves', 'syringe', 'centrifuge', 'saline', 'waste'],
    summary: 'Cleaned both bones and confirmed they were ready.',
    stages: ctx => [
      patchStage(ctx, { perBone: true, patches: remF.concat(remT), mk: left => A.bones({ patches: { femur: left.filter(p => p[2] === 'femur').map(p => [p[0], p[1]]), tibia: left.filter(p => p[2] === 'tibia').map(p => [p[0], p[1]]) } }),
        prompt: 'Clean <strong>both bones</strong>: click each remaining piece of tissue on the femur <em>and</em> on the tibia.', okMsg: 'Both bones are clean.' }),
      multiStage(ctx, { prompt: 'Confirm: which statements are true before moving on? Select all that apply.',
        options: [opt('a', 'The femur is clean', true), opt('b', 'The tibia is clean', true), opt('c', 'Only the femur needs to be clean — the tibia can be discarded', false, 'Both bones are marrow sources in this protocol and both must be prepared.'), opt('d', 'Remaining tissue can be left on because the marrow is inside', false, 'Attached tissue contaminates the sample.')],
        okMsg: 'Correct — both bones are clean and ready for the next stage.' })
    ]
  });

  /* ===================================================== 9 cut epiphyses */
  add(9, 2, {
    title: 'Cut the Epiphyses', thumb: 'bone', objective: 'Identify the epiphyses of both bones, choose the right instrument and cut so the marrow cavity opens.',
    anat: () => A.bones({ regions: true, labels: true }), anatTitle: 'Epiphyses and shafts',
    close: () => A.bones({ regions: false, labels: true }), ref: () => A.bones({ trimmed: true, labels: false }), refTitle: 'Bones with both ends opened',
    purpose: 'Cutting off the epiphyses (the ends) opens the marrow cavity of the shaft so the marrow can be flushed out.',
    materials: ['Scissors or scalpel', 'Forceps', 'Gauze'], procedure: ['Identify the proximal and distal epiphysis of the femur and of the tibia.', 'Select the cutting instrument.', 'Cut just beyond the epiphyses so the shaft is open at both ends.'],
    observe: 'A shaft open at both ends, with the pink-red marrow visible.', safety: 'Hold the bone with forceps; cut away from yourself; sharps go in the sharps container.',
    key: ['Each bone has two epiphyses.', 'Open both ends of the shaft.', 'Do not crush the shaft.'], structures: [['Epiphyses', 'The rounded ends of each long bone.'], ['Diaphysis (shaft)', 'Contains the marrow cavity.']],
    req: ['scissors', 'forceps', 'gauze', 'gloves'], pool: ['scissors', 'scalpel', 'forceps', 'gauze', 'gloves', 'syringe', 'tube', 'flame'],
    summary: 'Identified all four epiphyses and chose the cut that opens the marrow cavity.',
    stages: ctx => [
      next => {
        const want = new Set(['femur-prox', 'femur-dist', 'tibia-prox', 'tibia-dist']), got = new Set();
        const host = h('div.hero', { html: A.bones({ regions: true }) }), cnt = h('p.tiny', '0 of 4 epiphyses identified');
        hot(host, r => {
          ctx.attempt();
          if (want.has(r)) { got.add(r); cnt.textContent = got.size + ' of 4 epiphyses identified'; ctx.fb('ok', nm(r) + ' — correct. Epiphyses are the ends of the bone.'); if (got.size === 4) { ctx.fb('ok', 'All four epiphyses identified: two on the femur and two on the tibia.'); setTimeout(next, 500); } }
          else ctx.fb('sci', 'That is the shaft (diaphysis) of the ' + r + '. Click the rounded ends — the epiphyses.');
        });
        return h('div.task-block', [h('p.task-prompt', 'Click <strong>all four epiphyses</strong> — both ends of the femur and both ends of the tibia.'), host, cnt]);
      },
      singleStage(ctx, { prompt: 'Where should each bone be cut?',
        options: [opt('a', 'Just beyond each epiphysis, so the shaft is open at both ends and the marrow cavity is accessible', true, 'Correct — this opens the cavity without crushing the shaft.'), opt('b', 'Through the middle of the shaft', false, 'Cutting mid-shaft damages the cavity and loses marrow.'), opt('c', 'Through the joint centre of the epiphysis', false, 'The epiphyses are removed to open the shaft; cutting the centre of an epiphysis does not give access to the cavity.')] })
    ]
  });

  /* ===================================================== 10 aspirate marrow (two workstations) */
  add(10, 3, {
    title: 'Aspirate the Bone Marrow', thumb: 'syringe', objective: 'Collect marrow from the femur (Workstation A) and from the tibia (Workstation B). Both are mandatory.',
    anat: () => A.bones({ trimmed: true, regions: true }), anatTitle: 'Opened femur and tibia',
    close: () => A.bones({ trimmed: true }), ref: () => A.sampleTubes({ femur: .5, tibia: .5 }), refTitle: 'Femur and tibia samples',
    purpose: 'Flushing the marrow cavity with saline washes the marrow cells out of the bone into a tube. The femur and tibia are collected at two separate workstations so the samples stay distinguishable.',
    materials: ['Syringe with needle', CFG.saline.label, 'Labelled collection tubes (femur / tibia)', 'Gloves'],
    procedure: ['Workstation A — femur: fill the syringe with saline, place the needle in the open end, flush the marrow into a tube labelled for the femur.', 'Workstation B — tibia: repeat for the tibia into a tube labelled for the tibia.', 'Both workstations are required.'],
    observe: 'The cavity looks paler after flushing; the cell suspension collects in the tube.', safety: 'Needles are sharps — never recap by hand; use the sharps container.',
    key: ['Two workstations, two labelled samples.', 'Flush with saline/PBS, not water or fixative.', 'Saline volume: ' + CFG.saline.volumeMl + ' mL is supplied; the per-bone allocation is listed for instructor confirmation.'],
    structures: [['Marrow cavity', 'Inside the shaft; holds the marrow.']],
    req: ['syringe', 'saline', 'tube', 'gloves'], pool: ['syringe', 'saline', 'tube', 'gloves', 'pipette', 'centrifuge', 'bath', 'flame'],
    summary: 'Collected labelled marrow samples from both the femur and the tibia.',
    stages: ctx => {
      const flushed = {}, levels = {};     // shared by both workstations so the samples stay visible and distinguishable
      const ws = (kind, letter) => next => {
        const Kind = kind === 'femur' ? 'Femur' : 'Tibia', scene = lv => '<div class="ws-scene">' + A.bones({ trimmed: true, flushed }) + A.sampleTubes(lv) + '</div>';
        const host = h('div.workstation', { 'data-ws': kind }), sc = h('div.ws-art', { html: scene(levels) });
        const inner = T.stages(ctx, [
          nx => T.single(ctx, { prompt: 'Workstation ' + letter + ' — ' + Kind + '. <strong>What do you flush the marrow cavity with?</strong>', onDone: nx,
            options: [opt('a', CFG.saline.label, true, 'Correct — an isotonic solution keeps the cells intact.'), opt('b', 'Distilled water', false, 'Water would burst the cells (osmotic lysis).'), opt('c', 'Fixative', false, 'Fixative kills and hardens the cells and is added only at a later stage.', true)] }),
          nx => T.sequence(ctx, { prompt: 'Put the aspiration actions for the ' + kind + ' in order.', onDone: () => { flushed[kind] = true; levels[kind] = .5; sc.innerHTML = scene(levels); nx(); },
            items: [{ id: 1, text: 'Fill the syringe with saline' }, { id: 2, text: 'Place the needle in the open end of the ' + kind + ' shaft' }, { id: 3, text: 'Flush the marrow out into the collection tube' }],
            order: [1, 2, 3], okMsg: 'Correct — the marrow is flushed out of the cavity.', hint: 'Load first, then position, then flush.' }),
          nx => T.single(ctx, { prompt: 'Label the collection tube: <strong>which sample is this?</strong>', onDone: nx,
            options: [opt('a', Kind + ' sample (' + (kind === 'femur' ? 'F' : 'T') + ')', true, 'Correct — the tube is labelled so it cannot be confused with the other bone.'), opt('b', (kind === 'femur' ? 'Tibia' : 'Femur') + ' sample', false, 'That is the other bone. Label what you collected.'), opt('c', 'Leave unlabelled — only one tube is in use', false, 'Two samples are being collected; unlabelled tubes cannot be told apart.')] })
        ], { onFinish: () => { ctx.fb('ok', 'Workstation ' + letter + ' complete: ' + kind + ' sample collected.'); next(); }, names: ['Flushing solution', 'Aspiration', 'Labelling'] });
        host.appendChild(h('h4', 'Workstation ' + letter + ' — ' + Kind)); host.appendChild(sc); host.appendChild(inner);
        return host;
      };
      return [ws('femur', 'A'), ws('tibia', 'B')];
    }
  });

  /* ===================================================== 11 centrifuge */
  add(11, 3, {
    title: 'Centrifuge the Samples', thumb: 'rotor', objective: 'Prepare, balance and run the centrifuge with the protocol conditions, then interpret the result.',
    anat: () => A.tube({ level: .7, color: '#f7dfe1', pellet: .8, pelletColor: '#b04a55' }).replace('<svg', '<svg'), anatTitle: 'Tube after centrifugation',
    close: () => A.rotor({ tubes: { 0: 'sample', 3: 'balance' } }), ref: () => A.tube({ level: .7, color: '#f7dfe1', pellet: .8, pelletColor: '#b04a55' }), refTitle: 'Pellet and supernatant',
    purpose: 'Centrifugation drives the cells to the bottom of the tube as a pellet, separating them from the saline (supernatant).',
    materials: ['Centrifuge', 'Sample tubes', 'Balance tube'], procedure: ['Confirm the purpose of the spin.', 'Prepare and balance the tubes.', 'Set ' + spin + '.', 'Start, then interpret the result.'],
    observe: 'A cell pellet at the bottom with clearer liquid above it.', safety: 'Always balance the rotor; close the lid before starting.',
    key: ['Protocol conditions: ' + spin + '.', 'Tubes opposite each other, equal mass.', 'Cells are in the pellet.'], structures: [['Pellet', 'Cells.'], ['Supernatant', 'Saline above the pellet.']],
    req: ['centrifuge', 'tube', 'gloves'], pool: ['centrifuge', 'tube', 'gloves', 'timer', 'bath', 'scalpel', 'flame'],
    summary: 'Ran the centrifuge at the protocol conditions and interpreted the pellet.',
    stages: ctx => [
      singleStage(ctx, { prompt: '<strong>Why</strong> are the samples centrifuged?', options: [opt('a', 'To collect the cells as a pellet, separated from the saline', true, 'Correct.'), opt('b', 'To make the cells divide', false, 'Centrifugation does not make cells divide.'), opt('c', 'To fix the chromosomes', false, 'Fixation is done later, with Carnoy fixative.')] }),
      singleStage(ctx, { prompt: 'How must the tubes be prepared for the rotor?', options: [opt('a', 'Capped, with equal volumes, ready to be placed opposite a balance tube', true, 'Correct — balanced loads protect the rotor.'), opt('b', 'Uncapped and unequal — the rotor will compensate', false, 'Unbalanced or open tubes spill and damage the machine.', true), opt('c', 'Frozen first', false, 'Freezing would damage the cells.')] })
    ].concat(Cm.centrifugeStages(ctx, { pelletMsg: 'Correct — the cell pellet is at the bottom.' })).concat([
      singleStage(ctx, { prompt: 'How do you handle the tube after the run?', options: [opt('a', 'Remove it gently without disturbing the pellet and keep the cells', true, 'Correct — disturbing the pellet would resuspend and lose cells.'), opt('b', 'Shake it vigorously to mix', false, 'That disturbs the pellet.'), opt('c', 'Discard the pellet and keep the supernatant', false, 'The cells are in the pellet.')] }),
      singleStage(ctx, { prompt: 'Interpretation: <strong>what do the two layers show?</strong>', options: [opt('a', 'The pellet holds the marrow cells; the supernatant is the saline above them', true, 'Correct.'), opt('b', 'The supernatant holds the cells; the pellet is debris', false, 'Cells are denser than the liquid, so they sit in the pellet.'), opt('c', 'There is no separation', false, 'A clear pellet and supernatant mean the spin worked.')] })
    ])
  });

  /* ===================================================== 12 suspension */
  add(12, 3, {
    title: 'Bone Marrow Suspension', thumb: 'tube', objective: 'Prepare the final bone marrow suspension and finish Lab 7.',
    anat: () => A.sampleTubes({ femur: .5, tibia: .5 }), anatTitle: 'Femur and tibia samples',
    close: () => A.tube({ level: .55, color: '#f3b9bd' }), ref: () => A.sampleTubes({ femur: .5, tibia: .5 }), refTitle: 'Samples',
    purpose: 'Gently resuspending the pellet gives a single-cell suspension of bone marrow cells — the starting material for Lab 8.',
    materials: ['Pipette', 'Saline / PBS', 'Labelled tubes'], procedure: ['Remove the supernatant without touching the pellet.', 'Resuspend the cells gently.', 'Check and label the suspension.'],
    observe: 'A uniform cloudy pink suspension.', safety: 'Handle samples as biohazardous; wear gloves.',
    key: ['Resuspend gently.', 'Keep the femur and tibia samples labelled.', 'Pooling and exact volumes: instructor to confirm.'], structures: [['Suspension', 'Single cells in saline.']],
    req: ['pipette', 'tube', 'saline', 'gloves'], pool: ['pipette', 'tube', 'saline', 'gloves', 'bath', 'scalpel', 'centrifuge', 'flame'],
    summary: 'Prepared the bone marrow suspension ready for Lab 8.',
    stages: ctx => [
      seqStage(ctx, { prompt: 'Put the suspension steps in order.', items: [{ id: 1, text: 'Remove the supernatant without touching the pellet' }, { id: 2, text: 'Resuspend the pellet gently with the pipette' }, { id: 3, text: 'Check the suspension and keep it labelled' }], order: [1, 2, 3], okMsg: 'Correct order.', hint: 'The supernatant must go before the pellet can be resuspended.' }),
      singleStage(ctx, { prompt: 'How should the pellet be resuspended?', options: [opt('a', 'Gently, by pipetting up and down', true, 'Correct — gentle mixing keeps the cells intact.'), opt('b', 'Vigorously, with a vortex at maximum speed', false, 'Harsh mixing can damage the cells.'), opt('c', 'By leaving it to dissolve overnight', false, 'The pellet will not resuspend by itself and the cells would deteriorate.')] }),
      singleStage(ctx, { prompt: 'What do you now have?', options: [opt('a', 'A bone marrow cell suspension, ready for the next stage (chromosome preparation, Lab 8)', true, 'Correct.'), opt('b', 'Stained chromosomes ready for the microscope', false, 'Hypotonic treatment, fixation, spreading and staining still follow in Lab 8.'), opt('c', 'A fixed slide', false, 'No slide has been prepared yet.')] })
    ]
  });

  /* ===================================================== checkpoint pool */
  const CK = (k, q, o) => ({ k, q, o });
  const CHECK_POOL = [
    CK('Hindlimb orientation', 'Which bones of the hindlimb are the marrow sources in this lab?', [['The femur and the tibia', 1, 'Correct.'], ['The humerus and the radius', 0, 'Those are forelimb bones.'], ['The skull and the ribs', 0, 'Not used here.']]),
    CK('Colchicine timeline', 'When is colchicine given relative to sacrifice?', [['Before sacrifice, about 1.5–2 hours earlier (instructor-verified timing)', 1, 'Correct — it must be given to the living animal.'], ['After sacrifice', 0, 'Colchicine acts on living, dividing cells.'], ['At the same moment as the dissection', 0, 'The timing is before sacrifice.']]),
    CK('Skin and muscle', 'What is done to the skin before the muscles can be reached?', [['It is incised and reflected (folded back)', 1, 'Correct.'], ['It is left in place', 0, 'The muscle would not be accessible.'], ['It is boiled', 0, 'Not part of the procedure.']]),
    CK('Cleaning', 'Why must both bones be cleaned of tissue?', [['Attached tissue contaminates the marrow sample', 1, 'Correct.'], ['It makes the bone heavier', 0, 'Contamination is the concern.'], ['It is purely cosmetic', 0, 'It affects sample purity.']]),
    CK('Epiphyses', 'Why are the epiphyses cut off?', [['To open the marrow cavity of the shaft for flushing', 1, 'Correct.'], ['To make the bone shorter for storage', 0, 'Access to the cavity is the aim.'], ['To fix the chromosomes', 0, 'Fixation is done later.']]),
    CK('Marrow collection', 'How many collection workstations are required and why?', [['Two — femur and tibia — so the samples stay distinguishable', 1, 'Correct.'], ['One — the femur only', 0, 'Both bones are collected.'], ['None — the marrow falls out by itself', 0, 'It has to be flushed out.']]),
    CK('Centrifugation', 'Which conditions does the protocol give for centrifuging the marrow samples?', [[spin, 1, 'Correct.'], ['As fast as the machine allows for 30 minutes', 0, 'Too fast and too long can damage cells.'], ['No centrifugation', 0, 'It is required to collect the cells.']]),
    CK('Suspension', 'What is the product of Lab 7 that Lab 8 starts from?', [['A bone marrow cell suspension', 1, 'Correct.'], ['A stained karyogram', 0, 'That is the end result of Lab 8.'], ['A fixed slide', 0, 'Slides are prepared in Lab 8.']])
  ];
  /** Six questions picked (and shuffled) from the pool — seeded in the examination. */
  function checkQuestions(ctx) { return KL.UI.shuffle(CHECK_POOL, (ctx && ctx.rnd) || Math.random).slice(0, 6); }

  KL.LAB7 = { PH, STEPS, TD, CHECK_POOL, checkQuestions, CHECK: CHECK_POOL };
})();
