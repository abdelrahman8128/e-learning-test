/* =========================================================================
   data.js — protocol constants, simulated cases, safety rules, experiments
   Instructors: edit PROTOCOL to match your practical manual.
   ========================================================================= */
window.Lab = window.Lab || {};

(function (L) {
  'use strict';

  /* ---------- Protocol quantities (edit to match the approved manual) ---------- */
  L.PROTOCOL = {
    tubeCapacity: 15, // mL — standard test tube used for drawing and fill levels
    albumin: { urineMin: 5, urineMax: 6 },
    benedict: {
      urine: 3, benedict: 2,
      boilTarget: 120,  // simulated seconds of boiling
      boilMin: 105,     // accepted minimum
      boilMax: 200      // beyond this the tube boils over
    },
    rothera: {
      urine: 5,
      reagent: 'one',   // 'one' = about 1 g (one level spatula), as in this lab's manual
      reagentLabel: 'about 1 g (one level spatula)',
      ammoniaMin: 1, ammoniaMax: 2 // mL of strong ammonium hydroxide, layered
    },
    hay: { fill: '2/3' },
    simSecondsPerRealSecond: 10 // boiling timer acceleration
  };

  /* ---------- Simulated patient cases (controlled, predefined outcomes) ---------- */
  // glucose: 0 = none (blue) | 1 = low (green) | 2 = moderate (yellow) | 3 = moderate-high (orange) | 4 = high (brick-red)
  L.SCENARIOS = [
    {
      id: 'healthy', code: 'Case A', name: 'Routine screening — healthy volunteer',
      history: 'A 22-year-old student attending a routine health check. No symptoms.',
      albumin: false, glucose: 0, ketones: false, bile: false
    },
    {
      id: 'dka', code: 'Case B', name: 'Type 1 diabetes with vomiting',
      history: 'A 19-year-old with type 1 diabetes, missed insulin doses, vomiting, rapid breathing and a fruity odour on the breath.',
      albumin: false, glucose: 4, ketones: true, bile: false
    },
    {
      id: 'nephrotic', code: 'Case C', name: 'Generalised oedema',
      history: 'A 30-year-old with swelling around the eyes and ankles and frothy urine.',
      albumin: true, glucose: 0, ketones: false, bile: false
    },
    {
      id: 'jaundice', code: 'Case D', name: 'Obstructive jaundice',
      history: 'A 55-year-old with yellow sclerae, itching, pale stools and dark urine.',
      albumin: false, glucose: 0, ketones: false, bile: true
    },
    {
      id: 'gestational', code: 'Case E', name: 'Antenatal visit — mild glycosuria',
      history: 'A 28-year-old at 26 weeks of pregnancy attending a routine antenatal check.',
      albumin: false, glucose: 1, ketones: false, bile: false
    },
    {
      id: 'nephropathy', code: 'Case F', name: 'Long-standing type 2 diabetes',
      history: 'A 60-year-old with poorly controlled type 2 diabetes for 15 years and rising blood pressure.',
      albumin: true, glucose: 3, ketones: false, bile: false
    }
  ];

  L.BENEDICT_COLOURS = [
    { level: 0, name: 'Blue', hex: '#2f78c9', pptHex: null, meaning: 'Negative — no reducing sugar detected' },
    { level: 1, name: 'Green', hex: '#5f9e4a', pptHex: '#4c8a36', meaning: 'Low concentration of reducing sugar' },
    { level: 2, name: 'Yellow', hex: '#d9b52a', pptHex: '#c99f1a', meaning: 'Intermediate concentration of reducing sugar' },
    { level: 3, name: 'Orange', hex: '#e0812b', pptHex: '#cf6c1c', meaning: 'Intermediate-to-high concentration of reducing sugar' },
    { level: 4, name: 'Brick-red', hex: '#a9412a', pptHex: '#8f3220', meaning: 'High concentration of reducing sugar (strong positive)' }
  ];

  /* ---------- Safety rules (referenced by id across the app and in the report) ---------- */
  L.RULES = {
    coat: 'Wear a laboratory coat at all times inside the laboratory.',
    coat_buttoned: 'Keep the laboratory coat fully buttoned, including the lowest button.',
    gloves: 'Wear gloves before handling samples or reagents.',
    goggles: 'Wear safety goggles during heating and when handling acids or hazardous reagents.',
    no_food: 'Never eat or drink inside the laboratory.',
    no_smell: 'Never smell chemicals or samples directly.',
    no_play: 'Never play with chemicals or reagent containers.',
    no_move_chem: 'Never move chemicals unnecessarily.',
    belongings: 'Keep personal belongings and unrelated objects off laboratory benches.',
    crowding: 'Avoid crowding around laboratory workstations.',
    pathways: 'Keep entrance and exit pathways clear for emergency evacuation.',
    rack: 'Never carry loose test tubes — always use a test tube rack.',
    holder_heat: 'Always use a test tube holder when heating a test tube.',
    hot_glass: 'Never handle hot glassware with bare (or gloved) hands — use a holder and allow it to cool.',
    point_away: 'Never point a test tube opening toward yourself or another person.',
    angle: 'Hold a test tube at approximately 45° while heating.',
    flame_zone: 'Heat in the correct blue (non-luminous) region of the flame, just above the inner cone.',
    gentle_motion: 'Move the tube gently back and forth through the flame — avoid prolonged heating in one spot.',
    burner: 'Never leave a lit burner unattended; turn off the gas when you have finished heating.',
    glassware: 'Handle all glassware carefully.',
    no_shake: 'Do not shake a test tube after a reaction or after layering unless the procedure requires mixing.',
    fume_hood: 'Use the designated chemical fume hood (fan on, sash lowered) for reagents that release hazardous fumes.',
    laminar: 'A laminar flow cabinet is NOT a substitute for a chemical fume hood.',
    broken_report: 'Stop and report broken glassware to a laboratory TA immediately.',
    broken_touch: 'Never pick up broken glass or clean the spill yourself.',
    broken_conceal: 'Never conceal an incident or continue working in the affected area.',
    cleanup: 'Wash glassware, clean the bench and return equipment before leaving.',
    waste: 'Dispose of reaction mixtures in the designated, correctly labelled waste container — never down the sink.',
    gloves_used: 'Used gloves are discarded and never re-worn — take a fresh pair from the glove box.'
  };

  /* ---------- Performance categories ---------- */
  L.CATEGORIES = {
    ppe: 'PPE compliance',
    conduct: 'Personal conduct',
    handling: 'Safe equipment handling',
    sequence: 'Procedural sequence',
    reagent: 'Reagent selection',
    quantity: 'Sample & reagent quantities',
    heating: 'Heating technique',
    fumehood: 'Fume hood use',
    interpretation: 'Result interpretation',
    breakage: 'Broken glassware response',
    waste: 'Waste disposal',
    cleanup: 'Cleanup & equipment return'
  };

  /* ---------- Stations on the laboratory floor plan ---------- */
  L.STATIONS = {
    entrance: { name: 'Entrance & PPE area', x: 62, y: 128 },
    sink: { name: 'Sink & washing station', x: 180, y: 80 },
    waste: { name: 'Chemical waste station', x: 276, y: 80 },
    tech: { name: 'Technician — equipment return', x: 378, y: 80 },
    ta: { name: 'Teaching assistants\' desk', x: 480, y: 80 },
    ppe: { name: 'PPE station — glove box', x: 582, y: 80 },
    bench1: { name: 'Bench 1 — Heat test', x: 210, y: 172 },
    bench2: { name: 'Bench 2 — Benedict\'s test', x: 370, y: 172 },
    bench3: { name: 'Bench 3 — Rothera\'s preparation', x: 530, y: 172 },
    bench4: { name: 'Bench 4 — Hay\'s test', x: 690, y: 172 },
    hood: { name: 'Chemical fume hood', x: 784, y: 46 },
    laminar: { name: 'Laminar flow cabinet', x: 784, y: 122 }
  };

  /* ---------- Experiments ---------- */
  L.EXPERIMENTS = [
    {
      id: 'albumin', num: 1, station: 'bench1',
      title: 'Heat test for albumin',
      objective: 'Detect the possible presence of albumin (protein) in urine.',
      reagents: ['sample', 'benedict', 'sulfur'],
      hasBurner: true,
      steps: [
        { id: 'sample', text: 'Transfer 5–6 mL of urine into a clean test tube.' },
        { id: 'holder', text: 'Secure the test tube in a test tube holder.' },
        { id: 'ppe', text: 'Make sure you wear a fully buttoned laboratory coat, gloves and protective goggles.' },
        { id: 'heat', text: 'Heat the upper part of the urine to boiling using safe technique (drag the tube to the burner).' },
        { id: 'rack', text: 'When it is safe to handle, stand the tube in the rack (still using the holder).' },
        { id: 'observe', text: 'Observe the heated upper part for protein coagulation, comparing it with the unheated lower part.' },
        { id: 'interpret', text: 'Interpret the result.' }
      ],
      notes: 'Heat denatures albumin, which then coagulates into white, cloudy masses in the heated part of the urine. No other reagent is added. Protein coagulation indicates the possible presence of albumin. This is a qualitative test: it shows whether albumin is possibly present, not how much.'
    },
    {
      id: 'benedict', num: 2, station: 'bench2',
      title: 'Benedict\'s test for glucose (reducing sugars)',
      objective: 'Detect reducing sugars, including glucose, in urine.',
      reagents: ['sample', 'benedict', 'rothera', 'sulfur'],
      hasBurner: true,
      steps: [
        { id: 'sample', text: 'Add 3 mL of urine to a test tube.' },
        { id: 'benedict', text: 'Add 2 mL of Benedict\'s reagent.' },
        { id: 'mix', text: 'Mix the urine and reagent gently before heating.' },
        { id: 'holder', text: 'Secure the tube in a test tube holder.' },
        { id: 'heat', text: 'Heat to boiling and keep boiling for about 2 minutes (simulated timer).' },
        { id: 'cool', text: 'Place the tube in the rack and allow it to cool.' },
        { id: 'observe', text: 'Observe the colour and any precipitate.' },
        { id: 'interpret', text: 'Interpret the result.' }
      ],
      notes: 'Benedict\'s test detects reducing sugars (glucose, fructose, galactose, lactose, maltose, pentoses) — it is not specific to glucose. The colour of the precipitate is semi-quantitative.'
    },
    {
      id: 'rothera', num: 3, station: 'bench3', finalStation: 'hood',
      title: 'Rothera\'s test for ketone bodies',
      objective: 'Detect ketone bodies (acetoacetate and acetone) in urine.',
      reagents: ['sample', 'rothera', 'ammonia', 'benedict'],
      hasBurner: false,
      steps: [
        { id: 'sample', text: 'Add 5 mL of urine to a test tube.' },
        { id: 'rothera', text: 'Add Rothera\'s reagent (about 1 g — one level spatula).' },
        { id: 'mix', text: 'Mix gently until the reagent dissolves (saturates the urine).' },
        { id: 'transfer', text: 'Stand the tube in the rack and carry the rack to the chemical fume hood.' },
        { id: 'hood', text: 'Prepare the fume hood: fan ON and sash lowered to working height.' },
        { id: 'ammonia', text: 'Run 1–2 mL of ammonium hydroxide slowly down the inside wall to form a separate layer.' },
        { id: 'observe', text: 'Do not shake. Wait and observe the interface between the layers.' },
        { id: 'interpret', text: 'Interpret the result.' }
      ],
      notes: 'Sodium nitroprusside reacts with acetoacetate (and, less strongly, acetone) in alkaline conditions to give a purple/violet ring. β-Hydroxybutyrate is NOT detected. Ketone bodies are unrelated to bile salts.'
    },
    {
      id: 'hay', num: 4, station: 'bench4',
      title: 'Hay\'s sulfur test for bile salts',
      objective: 'Detect the possible presence of bile salts in urine.',
      reagents: ['sample', 'sulfur', 'rothera', 'benedict'],
      hasBurner: false,
      steps: [
        { id: 'sample', text: 'Fill a test tube to about two-thirds of its capacity with urine.' },
        { id: 'sulfur', text: 'Sprinkle a small quantity of sulfur powder onto the surface.' },
        { id: 'observe', text: 'Do NOT shake. Wait and observe the sulfur powder.' },
        { id: 'interpret', text: 'Interpret the result.' }
      ],
      notes: 'Bile salts lower the surface tension of urine, so the light sulfur powder sinks. In normal urine the surface tension keeps the powder floating.'
    }
  ];

  /* ---------- Waste segregation (edit to match your laboratory's waste protocol) ---------- */
  L.WASTE = {
    containers: [
      { id: 'bio', icon: '☣️', label: 'Biological waste', sub: 'Urine only — disinfectant added' },
      { id: 'copper', icon: '⚗️', label: 'Heavy-metal waste', sub: 'Copper-containing solutions' },
      { id: 'alkaline', icon: '🧪', label: 'Alkaline / nitroprusside waste', sub: 'Ammonia + nitroprusside — keep lid closed' },
      { id: 'mixed', icon: '🗑️', label: 'Mixed chemical waste', sub: 'Urine with insoluble powders (sulfur)' }
    ],
    // which container each experiment's reaction mixture belongs in
    route: { albumin: 'bio', benedict: 'copper', rothera: 'alkaline', hay: 'mixed' },
    describe: {
      albumin: 'heated urine (no reagent added)',
      benedict: 'urine with Benedict\'s reagent (copper sulfate)',
      rothera: 'urine with Rothera\'s reagent and ammonium hydroxide',
      hay: 'urine with sulfur powder'
    },
    why: {
      albumin: 'It contains only urine, so it is biological waste and must be disinfected before disposal.',
      benedict: 'Benedict\'s reagent contains copper — a heavy metal that must not enter the drains and is collected separately.',
      rothera: 'It contains ammonium hydroxide and sodium nitroprusside, which are collected separately in a closed alkaline waste container.',
      hay: 'It contains insoluble sulfur powder, which would block drains and goes to mixed chemical waste.'
    }
  };

  /* ---------- Reagent catalogue (bench tray items) ---------- */
  L.REAGENTS = {
    sample: { label: 'Urine sample', short: 'Urine', color: '#f1cf5b', kind: 'sample' },
    benedict: { label: 'Benedict\'s reagent', short: 'Benedict\'s', color: '#2f78c9', kind: 'reagent' },
    rothera: { label: 'Rothera\'s reagent (powder)', short: 'Rothera\'s', color: '#f4f1ea', kind: 'powder' },
    ammonia: { label: 'Ammonium hydroxide (fume hood only)', short: 'NH₄OH', color: '#e9f3ff', kind: 'hazard', hazard: 'Fumes — hood + goggles' },
    sulfur: { label: 'Sulfur powder', short: 'Sulfur', color: '#f2dc3a', kind: 'powder' }
  };
})(window.Lab);
