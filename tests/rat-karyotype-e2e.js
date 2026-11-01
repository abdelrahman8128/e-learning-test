/* End-to-end test for the Rat Bone Marrow Extraction and Karyotyping virtual labs (Lab 7 + Lab 8).
 *   node tests/rat-karyotype-e2e.js            (needs the `playwright` package)
 * Set SHOTS=dir to save screenshots.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'))); }

const URL = 'file://' + path.resolve(__dirname, '..', 'rat-karyotype', 'index.html');
const SHOTS = process.env.SHOTS;
let ctx, page, passes = 0, failures = 0;
const errors = [];

const ok = (c, m) => { if (c) { passes++; console.log('  ✔ ' + m); } else { failures++; console.log('  ✘ ' + m); } };
const wait = ms => page.waitForTimeout(ms);
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const hash = () => ev(() => location.hash);
const noOverflow = () => ev(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
const state = () => ev(() => JSON.parse(JSON.stringify(KL.Store.get())));

async function openPage(p) {
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await p.goto(URL); await p.waitForSelector('#view *');
  await p.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; });
}
const go = async h => { await page.evaluate(x => { location.hash = x; }, h); await wait(150); };
const clickBtn = async t => { await page.locator('button').filter({ hasText: t }).first().click(); await wait(90); };
const setRange = async (idx, v) => { await page.locator('.dial input[type=range]').nth(idx).evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v)); };
const doneBanner = async () => { await page.waitForSelector('.done-banner .banner', { timeout: 9000 }); };
const next = async () => { await doneBanner(); await page.click('#btn-next'); await wait(160); };
const fbText = async () => (await page.locator('.fb').first().innerText().catch(() => ''));

/* ---------- generic stage helpers ---------- */
const tools = async names => { for (const n of names) await page.locator('.tpick').filter({ has: page.getByText(n, { exact: true }) }).first().click(); await clickBtn('Confirm selection'); await wait(120); };
const single = async t => { await page.locator('.opt').filter({ hasText: t }).first().locator('input').check(); await clickBtn('Check answer'); await wait(80); };
const multi = async ts => { for (const t of ts) await page.locator('.opt').filter({ hasText: t }).first().locator('input').check(); await clickBtn('Check selection'); await wait(80); };
const seq = async ts => { for (const t of ts) await page.locator('.seq-item:not(.used)').filter({ hasText: t }).first().click(); await clickBtn('Check order'); await wait(80); };
const region = async (r) => { await page.locator('[data-region="' + r + '"]').first().dispatchEvent('click'); await wait(110); };
const patches = async () => { while (await page.locator('.task-area .patch').count()) { await page.locator('.task-area .patch').first().dispatchEvent('click'); await wait(90); } await wait(600); };
async function centrifuge() {
  await page.dispatchEvent('.rslot[data-slot="0"]', 'click'); await page.dispatchEvent('.rslot[data-slot="3"]', 'click'); await wait(900);
  await setRange(0, 2000); await setRange(1, 5); await clickBtn('Start centrifuge');
  await page.waitForSelector('.hit-pel', { timeout: 6000 }); await page.click('.hit-pel'); await wait(150);
}
async function timed(minLabel) {   // start the accelerated clock, wait for the simulated minutes, stop
  await page.locator('button').filter({ hasText: /^(Start incubation|Start timing|Start staining)$/ }).click();
  const target = minLabel;
  for (let i = 0; i < 60; i++) { const t = await page.locator('.big-read').innerText(); const [m] = t.split(':').map(Number); if (m >= target) break; await wait(100); }
  await wait(60);
  await page.locator('button').filter({ hasText: /^(Remove tube|Finish fixation|Rinse)$/ }).click(); await wait(150);
}

/* ---------- Lab 7 solvers (ids = step numbers) ---------- */
const LAB7 = {
  1: async () => { await tools(['Lab coat', 'Gloves', 'Dissection pad']); await single('By its label/record'); await multi(['approved animal-ethics protocol', 'trained, authorised personnel', 'method is the one specified']); await seq(['Check specimen identity', 'Colchicine pretreatment', 'Approved humane euthanasia', 'Confirm death', 'Begin dissection']); },
  2: async () => { await tools(['Dissection pad', 'Gloves']); await page.click('#rot-next'); await wait(100); await region('hindlimb'); await region('femur'); },
  3: async () => { await tools(['Scissors', 'Forceps', 'Gloves']); await page.locator('[data-inc="incA"]').dispatchEvent('click'); },
  4: async () => { await tools(['Forceps', 'Scissors', 'Gloves']); await seq(['Grip the cut skin', 'Free the skin', 'Fold the skin']); await region('skin-flap'); },
  5: async () => { await tools(['Forceps', 'Gauze', 'Gloves']); await region('thigh-muscle'); await region('shank-muscle'); },
  6: async () => { await tools(['Scissors', 'Forceps', 'Gauze', 'Gloves']); await region('femur'); await patches(); await region('femur'); },
  7: async () => { await tools(['Scissors', 'Forceps', 'Gauze', 'Gloves']); await region('tibia'); await patches(); await region('tibia'); },
  8: async () => { await tools(['Gauze', 'Forceps', 'Gloves']); await patches(); await multi(['The femur is clean', 'The tibia is clean']); },
  9: async () => { await tools(['Scissors', 'Forceps', 'Gauze', 'Gloves']); for (const r of ['femur-prox', 'femur-dist', 'tibia-prox', 'tibia-dist']) await region(r); await wait(600); await single('Just beyond each epiphysis'); },
  10: async () => {
    await tools(['Syringe with needle', 'Saline / PBS', 'Labelled collection tubes', 'Gloves']);
    for (const [kind, lab] of [['femur', 'Femur sample (F)'], ['tibia', 'Tibia sample (T)']]) {
      await single('physiological saline'); await seq(['Fill the syringe', 'Place the needle', 'Flush the marrow']); await single(lab); await wait(300);
    }
  },
  11: async () => { await tools(['Centrifuge', 'Labelled collection tubes', 'Gloves']); await single('To collect the cells'); await single('Capped, with equal volumes'); await centrifuge(); await single('Remove it gently'); await single('The pellet holds the marrow cells'); },
  12: async () => { await tools(['Pipette', 'Labelled collection tubes', 'Saline / PBS', 'Gloves']); await seq(['Remove the supernatant', 'Resuspend the pellet', 'Check the suspension']); await single('Gently, by pipetting'); await single('A bone marrow cell suspension'); }
};
async function checkpointRun(exam) {
  for (let i = 0; i < 6; i++) {
    const q = (await page.locator('.task-prompt').first().innerText()).trim();
    const right = await ev(qq => { const e = KL.LAB7.CHECK_POOL.filter(x => x.q === qq)[0]; return e.o.filter(o => o[1])[0][0]; }, q);
    await page.locator('.opt').filter({ hasText: right }).first().locator('input').check(); await clickBtn('Check answer');
    if (!exam) { const b = page.locator('#btn-nextq'); if (await b.count()) await b.click(); await wait(100); }
    await wait(100);
  }
}
async function doStep(solvers, n) { try { await solvers[n](); await doneBanner(); } catch (e) { console.log('  !! step ' + n + ' failed: ' + (await fbText()).slice(0, 200)); await shot('fail-step-' + n); throw e; } }
async function lab7All(exam) {
  for (let n = 1; n <= 12; n++) { await doStep(LAB7, n); await page.click('#btn-next'); await wait(170); }
  await checkpointRun(exam);
  await page.waitForSelector('#btn-finish7', { timeout: 5000 });
}

/* ---------- Lab 8 solvers ---------- */
const Q = { cards: async (ids, pickFn) => { const got = await page.locator('.card-opt').evaluateAll(els => els.map(e => e.dataset.card)); const id = pickFn(got.length ? got : ids); await page.locator('.card-opt[data-card="' + id + '"]').click(); await wait(150); } };
async function karyoArrange() {
  const info = await ev(() => ({ slots: KL.KARYO.slots, chroms: KL.KARYO.chroms }));
  const slotOf = pair => info.slots.find(s => s.key === (pair === 'X' || pair === 'Y' ? 'XY' : pair)).index;
  for (const c of info.chroms) { await page.click('.chr.tray[data-id="' + c.id + '"]'); await page.click('.kslot[data-slot="' + slotOf(c.pair) + '"] .kslot-h'); }
  const K = await ev(() => JSON.parse(JSON.stringify(KL.Store.d('lab8').karyotype)));
  for (const c of info.chroms.filter(c => K.chr[c.id].rot !== 0)) { await page.click('.chr[data-id="' + c.id + '"]'); await page.click('[data-k="rot"]'); }
  for (let r = 0; r < 4; r++) await page.click('[data-assist="' + r + '"]');
  for (const s of info.slots) await page.fill('.klabel[data-slot="' + s.index + '"]', s.key === 'XY' ? 'X Y' : s.key);
  return info;
}
async function measureAll() {
  const calcs = await ev(() => { const out = {}; KL.CONFIG.measure.requiredPairs.forEach(id => { const [a, b] = KL.KARYO.chroms.filter(c => c.pair === id); const v = { La: a.L, Sa: a.S, Lb: b.L, Sb: b.S }; out[id] = { v, e: KL.Measure.expected(v, KL.KARYO.haploidTotal) }; }); return out; });
  for (const id of ['1', '3', '4', '13', '14', '20']) {
    await page.click('.pbtn[data-pair="' + id + '"]'); await wait(60);
    const { v, e } = calcs[id];
    for (const k of ['La', 'Sa', 'Lb', 'Sb']) await page.fill('[data-m="' + k + '"]', String(v[k]));
    await clickBtn('Check measurements');
    await page.fill('[data-c="avgL"]', e.avgL.toFixed(2)); await page.fill('[data-c="avgS"]', e.avgS.toFixed(2));
    await page.fill('[data-c="ar"]', e.telo ? 'n/a' : e.ar.toFixed(2)); await page.fill('[data-c="ci"]', e.ci.toFixed(1)); await page.fill('[data-c="rl"]', e.rl.toFixed(2));
    await clickBtn('Check calculations');
  }
}
const LAB8 = {
  1: async () => { await tools(['Labelled collection tubes', 'Gloves', 'Lab coat']); await single('The bone marrow cell suspension'); await seq(['Colchicine pretreatment', 'Bone marrow collection', 'Hypotonic treatment', 'Cell harvesting and fixation', 'Slide preparation, spreading', 'Microscopy and chromosome', 'Karyotyping']); },
  2: async () => { await tools(['KCl solution', 'Water bath', 'Timer', 'Pipette', 'Gloves']); await single('KCl 0.075 M'); await setRange(0, 3); await clickBtn('Confirm volume'); await single('37 °C'); await timed(10); },
  3: async () => { await tools(['Centrifuge', 'Labelled collection tubes', 'Pipette', 'Gloves']); await centrifuge(); await single('Remove the supernatant carefully'); },
  4: async () => { await tools(['Methanol : acetic acid fixative', 'Fume hood', 'Pipette', 'Gloves', 'Eye protection', 'Lab coat']); await single('Methanol : acetic acid (Carnoy fixative)'); await single('3 : 1'); await setRange(0, 3); await clickBtn('Confirm volume'); await single('In a fume hood'); await timed(10); },
  5: async () => { await tools(['Clean glass slides', 'Cold ethanol (slide storage)', 'Forceps', 'Gloves']); await single('A clean slide kept in cold'); },
  6: async () => { await tools(['Pipette / dropper', 'Clean glass slides', 'Gloves', 'Eye protection', 'Lab coat']); await page.click('#btn-drop'); await page.click('#btn-drop'); await clickBtn('Confirm'); await multi(['trained supervision', 'containers closed', 'Wear lab coat', 'fire extinguisher']); await page.click('#btn-spread'); await page.waitForSelector('.stage-tag', { timeout: 100 }).catch(() => { }); await wait(1900); },
  7: async () => { await tools(['Giemsa stain', 'Timer', 'Distilled water', 'Filter paper', 'Clean glass slides', 'Gloves']); await single('Giemsa working solution at 10%'); await timed(10); await single('Gently with distilled water'); await single('Air-dry on filter paper'); },
  8: async () => { await tools(['Light microscope', 'Clean glass slides', 'Gloves']); await page.locator('.card-opt[data-card="good"]').click(); await wait(120); await single('Overlapping chromosomes'); },
  9: async () => {
    await tools(['Light microscope', 'Clean glass slides']); await single('Stained side up');
    // focus: scan the slider for the sharpest value
    let best = 0, bb = 99;
    for (let v = 0; v <= 100; v += 2) { await setRange(0, v); const f = await page.locator('.focus-view svg').evaluate(e => parseFloat((e.style.filter.match(/[\d.]+/) || [99])[0])); if (f < bb) { bb = f; best = v; } }
    await setRange(0, best); await page.click('#btn-focus'); await wait(150);
    await page.click('[aria-label="40 times objective"]');
    const cur = await ev(() => Object.keys(KL.LAB8.current).filter(k => KL.LAB8.current[k].variant === 'good')[0]); const [gc, gr] = cur.split(',').map(Number);
    let pos = [1, 1];
    while (pos[0] !== gc) { await page.click('[aria-label="Move stage ' + (gc > pos[0] ? '→' : '←') + '"]'); pos[0] += gc > pos[0] ? 1 : -1; }
    while (pos[1] !== gr) { await page.click('[aria-label="Move stage ' + (gr > pos[1] ? '↓' : '↑') + '"]'); pos[1] += gr > pos[1] ? 1 : -1; }
    await page.click('#btn-use-spread'); await wait(120);
  },
  10: async () => {
    await tools(['Light microscope', 'Calculator']);
    await Q.cards(null, ids => ids.slice().sort((a, b) => ['4a', '5a', '6a'].indexOf(a) >= 0 ? -1 : 1)[0]);
    // longest: choose by total length
    await wait(100);
  },
  11: async () => { await tools(['Light microscope', 'Ruler', 'Calculator']); for (let i = 0; i < 3; i++) { await page.locator('.card-opt[data-card$="b"]').click(); await wait(200); } },
  12: async () => { await tools(['Ruler', 'Calculator']); await karyoArrange(); await page.click('#btn-check-karyo'); await wait(100); },
  13: async () => { await tools(['Ruler', 'Calculator']); await measureAll(); },
  14: async () => {
    await tools(['Calculator', 'Ruler']);
    const want = await ev(() => { const o = {}; KL.CONFIG.measure.requiredPairs.forEach(id => { const r = KL.Store.d('lab8').measure[id].res; o[id] = KL.Calc.classify(r.avgL, r.avgS).cls; }); return o; });
    for (const id of Object.keys(want)) await page.selectOption('[data-cls="' + id + '"]', want[id]);
    await clickBtn('Check classification');
  },
  15: async () => { await tools(['Calculator']); await page.click('#btn-submit-karyo'); await wait(100); }
};
/** Step 10 needs data-driven choices (longest / telocentric / 42). */
LAB8[10] = async () => {
  await tools(['Light microscope', 'Calculator']);
  let ids = await page.locator('.card-opt').evaluateAll(els => els.map(e => e.dataset.card));
  let best = await ev(a => a.slice().sort((x, y) => { const T = i => KL.KARYO.chroms.filter(c => c.id === i)[0].T; return T(y) - T(x); })[0], ids);
  await page.locator('.card-opt[data-card="' + best + '"]').click(); await wait(250);
  ids = await page.locator('.card-opt').evaluateAll(els => els.map(e => e.dataset.card));
  const telo = await ev(a => a.filter(i => KL.KARYO.chroms.filter(c => c.id === i)[0].S === 0)[0], ids);
  await page.locator('.card-opt[data-card="' + telo + '"]').click(); await wait(250);
  await single('42');
};
async function lab8All() {
  for (let n = 1; n <= 15; n++) { await doStep(LAB8, n); if (n < 15) { await page.click('#btn-next'); await wait(170); } }
}

(async () => {
  const browser = await chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await ctx.newPage();
  await openPage(page);

  console.log('\n[1] Home, locking and navigation guards');
  ok((await hash()) === '#/home', 'opens on the home screen');
  ok(/Genetics Virtual Laboratory/.test(await page.locator('#hdr-title').innerText()), 'home header shows the genetics lab title');
  ok((await page.locator('#btn-lab7').innerText()).includes('Start Lab 7'), 'Lab 7 is offered (Guided Revision)');
  ok(await page.locator('#btn-lab8').getAttribute('aria-disabled') === 'true' && /Locked/.test(await page.locator('#btn-lab8').innerText()), 'Lab 8 shows as locked');
  ok(await page.locator('#btn-exam-lab7').getAttribute('aria-disabled') === 'true', 'the Lab 7 examination is locked until guided revision is complete');
  await page.locator('#btn-lab8').click({ force: true }); await wait(200);
  ok((await hash()) === '#/home' || /lab8/.test(await hash()) === false, 'clicking the locked Lab 8 does not open it');
  await go('#/lab8/1'); ok((await hash()) === '#/home', 'typing the Lab 8 URL is redirected to Home');
  await go('#/lab8'); ok((await hash()) === '#/home', 'the Lab 8 intro URL is also redirected');
  await go('#/exam/lab7'); ok((await hash()) === '#/home', 'the examination URL is redirected before guided completion');
  await go('#/lab7/5'); ok((await hash()) === '#/lab7/1', 'Lab 7 steps cannot be skipped by URL');
  await go('#/lab7/done'); ok((await hash()) !== '#/lab7/done', 'the Lab 7 completion page cannot be opened early');

  console.log('\n[2] Lab 7 introduction');
  await go('#/home'); await page.click('#btn-lab7'); await wait(200);
  ok((await hash()) === '#/lab7', 'Start opens the Lab 7 intro');
  ok((await page.locator('.intro h1').innerText()) === 'Virtual Lab 7 – Rat Dissection for Bone Marrow Collection (for Karyotyping)', 'Lab 7 intro title is exact');
  ok((await page.locator('.intro .lead').innerText()) === 'Learn and practise the steps required to collect bone marrow from the rat femur and tibia for chromosome analysis.', 'Lab 7 subtitle is exact');
  ok(await page.locator('#btn-start').innerText() === 'Start Practical' && await page.locator('#btn-labguide').innerText() === 'Laboratory Guide' && await page.locator('#btn-labhelp').innerText() === 'Help', 'Start Practical / Laboratory Guide / Help buttons');
  await page.click('#btn-labguide'); ok(/instructor input/i.test(await page.locator('.modal').innerText()) && /4 mg\/kg/.test(await page.locator('.modal').innerText()), 'the Laboratory Guide lists protocol values and instructor-input items');
  await page.keyboard.press('Escape'); await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } }).catch(() => { }); await wait(100);
  await shot('01-lab7-intro');
  await page.click('#btn-start'); await wait(200);
  ok((await hash()) === '#/lab7/1' && await page.locator('.tnode').count() === 13 && await page.locator('.stepbtn').count() === 13, '12 steps plus the checkpoint appear in the horizontal tracker and vertical panel');

  console.log('\n[3] Step 1: tool selection gate and colchicine timeline');
  ok(await page.locator('#btn-next').isDisabled(), 'Next is disabled until the step is done');
  ok(await page.locator('.tools-hint').count() === 1, 'the Tools Used panel is hidden until the right tools are chosen');
  await tools(['Scalpel']); ok(/Not needed here|missing/.test(await fbText()), 'a wrong tool selection is rejected');
  ok(await page.locator('.tool').count() === 0, 'Tools Used stays hidden after a wrong selection');
  await page.locator('.tpick[aria-pressed="true"]').first().click();
  await tools(['Lab coat', 'Gloves', 'Dissection pad']);
  ok(await page.locator('.tool').count() === 3, 'Tools Used appears after the correct selection');
  await shot('02-lab7-step1');
  await single('By its label/record'); await multi(['approved animal-ethics protocol', 'trained, authorised personnel', 'method is the one specified']);
  await seq(['Check specimen identity', 'Approved humane euthanasia', 'Colchicine pretreatment', 'Confirm death', 'Begin dissection']);   // wrong order
  ok(/not right yet/.test(await fbText()), 'colchicine placed after euthanasia is rejected');
  await clickBtn('Clear order');
  await seq(['Check specimen identity', 'Colchicine pretreatment', 'Approved humane euthanasia', 'Confirm death', 'Begin dissection']);
  await doneBanner();
  ok(/4 mg\/kg/.test(await page.locator('.seq-out').innerText()) && /1\.5–2 hours before sacrifice/.test(await page.locator('.seq-out').innerText()), 'colchicine (4 mg/kg, 1.5–2 h before sacrifice) is placed in the timeline');
  await page.click('#btn-next'); await wait(170);

  console.log('\n[4] Steps 2–9: hindlimb, dissection, bones');
  await page.click('[data-tab="anatomy"]'); await wait(100);
  ok(await page.locator('.anat-art [data-region]').count() > 3, 'the Anatomy View has interactive hotspots');
  await page.locator('.anat-art [data-region="hindlimb"]').first().dispatchEvent('click');
  ok(/Hindlimb/.test(await page.locator('.region-info').innerText()), 'clicking a hotspot shows what it is');
  await page.click('[data-tab="procedure"]');
  await tools(['Dissection pad', 'Gloves']);
  await region('head'); ok(/head/i.test(await fbText()), 'step 2: a wrong body part is rejected');
  await page.click('#rot-next'); await page.click('#rot-next');
  ok(/View 3 of 4/.test(await page.locator('.rot-label').innerText()), 'step 2: the specimen can be rotated');
  await region('hindlimb'); await region('femur'); await doneBanner(); await page.click('#btn-next'); await wait(170);
  for (const n of [3, 4, 5]) { await doStep(LAB7, n); await page.click('#btn-next'); await wait(170); }
  console.log('  — step 6 (femur) and step 7 (tibia) are separate stages');
  ok((await page.locator('.step-title h2').innerText()).includes('Femur'), 'step 6 is the femur stage');
  await tools(['Scissors', 'Forceps', 'Gauze', 'Gloves']); await region('tibia'); ok(/tibia/i.test(await fbText()), 'step 6: choosing the tibia as the femur is rejected');
  await region('femur'); await patches(); await region('femur'); await doneBanner(); await page.click('#btn-next'); await wait(170);
  ok((await page.locator('.step-title h2').innerText()).includes('Tibia'), 'step 7 is the tibia stage');
  await doStep(LAB7, 7); await page.click('#btn-next'); await wait(170);
  await doStep(LAB7, 8); ok(true, 'step 8: both bones cleaned and confirmed'); await page.click('#btn-next'); await wait(170);
  await doStep(LAB7, 9); await page.click('#btn-next'); await wait(170);

  console.log('\n[5] Step 10: both collection workstations are mandatory');
  await tools(['Syringe with needle', 'Saline / PBS', 'Labelled collection tubes', 'Gloves']);
  ok(await page.locator('.workstation[data-ws="femur"]').count() === 1, 'Workstation A (femur) is shown first');
  await single('Distilled water'); ok(/lyse|burst|Water/i.test(await fbText()), 'wrong flushing solution is rejected');
  await single('physiological saline'); await seq(['Fill the syringe', 'Place the needle', 'Flush the marrow']); await single('Tibia sample'); ok(/other bone/i.test(await fbText()), 'a wrongly labelled tube is rejected');
  await single('Femur sample (F)'); await wait(300);
  ok(await page.locator('.workstation[data-ws="tibia"]').count() === 1 && await page.locator('.done-banner .banner').count() === 0, 'after Workstation A the step is NOT complete — Workstation B (tibia) is required');
  ok(await page.locator('#btn-next').isDisabled(), 'Next stays disabled with only the femur collected');
  await single('physiological saline'); await seq(['Fill the syringe', 'Place the needle', 'Flush the marrow']); await single('Tibia sample (T)'); await doneBanner();
  ok(true, 'Workstation B completes the step'); await shot('03-lab7-step10');
  await page.click('#btn-next'); await wait(170);

  console.log('\n[6] Step 11: centrifugation protocol conditions');
  await tools(['Centrifuge', 'Labelled collection tubes', 'Gloves']); await single('To collect the cells'); await single('Capped, with equal volumes');
  await page.dispatchEvent('.rslot[data-slot="0"]', 'click'); await page.dispatchEvent('.rslot[data-slot="1"]', 'click'); await wait(100);
  ok(/Unbalanced/.test(await fbText()), 'an unbalanced rotor is refused');
  await page.dispatchEvent('.rslot[data-slot="3"]', 'click'); await wait(900);
  await setRange(0, 3000); await setRange(1, 5); await clickBtn('Start centrifuge'); ok(/do not match the protocol/.test(await fbText()), 'wrong speed is rejected');
  await setRange(0, 2000); await setRange(1, 5); await clickBtn('Start centrifuge');
  await page.waitForSelector('.hit-pel', { timeout: 6000 }); await page.click('.hit-sup'); ok(/supernatant/.test(await fbText()), 'clicking the supernatant is explained'); await page.click('.hit-pel'); await wait(150);
  await single('Remove it gently'); await single('The pellet holds the marrow cells'); await doneBanner(); await page.click('#btn-next'); await wait(170);

  console.log('\n[7] Step 12, checkpoint and Lab 7 completion; progress is saved');
  await doStep(LAB7, 12);
  ok(/Go to Checkpoint/.test(await page.locator('#btn-next').innerText()), 'step 12 leads to the final checkpoint');
  await page.reload(); await ev(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(250);
  ok((await hash()) === '#/lab7/12' || /lab7/.test(await hash()), 'reloading keeps the position'); await go('#/lab7/13'); await wait(200);
  ok(await page.locator('.cp-progress').count() === 1, 'the final checkpoint opens after step 12');
  ok((await state()).guided.lab7.checkpoint.picked.length === 6, 'six checkpoint questions are drawn from the pool');
  await go('#/lab8'); ok((await hash()) === '#/home', 'Lab 8 is still locked before the checkpoint is done');
  await go('#/lab7/13'); await checkpointRun(false); await page.waitForSelector('#btn-finish7');
  await shot('04-lab7-checkpoint-done');
  await page.click('#btn-finish7'); await wait(250);
  const d7 = await page.locator('.done-screen').innerText();
  ok((await hash()) === '#/lab7/done' && /Lab 7 Completed – Bone Marrow Collection/.test(d7), 'completion screen: “Lab 7 Completed – Bone Marrow Collection”');
  ok(/You have completed Lab 7\. Your bone marrow preparation is ready for the next stage\./.test(d7), 'the required completion message is shown');
  ok(/Return to Home/.test(d7) && /Continue to Lab 8/.test(d7), 'Return to Home and Continue to Lab 8 are offered');
  ok(/Anatomical identification/.test(d7) && /Femur isolation/.test(d7) && /Tibia isolation/.test(d7) && /Centrifugation/.test(d7), 'the Lab 7 report lists the score categories');
  ok((await state()).guided.lab7.steps[12].done === true && Object.keys((await state()).guided.lab7.steps).length === 12, 'all 12 steps are saved');
  await shot('05-lab7-complete');

  console.log('\n[8] Leave and return: Lab 8 is unlocked and progress is preserved');
  await page.click('#btn-return-home'); await wait(150);
  await page.reload(); await ev(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(250);
  ok((await page.locator('#btn-lab8').innerText()).includes('Start Lab 8') && await page.locator('#btn-lab8').getAttribute('aria-disabled') === null, 'after reload Lab 8 is unlocked');
  ok(await page.locator('#btn-exam-lab7').getAttribute('aria-disabled') === null, 'the Lab 7 examination is now available');
  ok(await page.locator('#btn-exam-lab8').getAttribute('aria-disabled') === 'true', 'the Lab 8 examination is still locked');
  await go('#/lab7/done'); ok(/Lab 7 Completed/.test(await page.locator('.done-screen').innerText()), 'Lab 7 completion remains available');
  await page.click('#btn-continue8'); await wait(200);
  ok((await hash()) === '#/lab8', 'Continue to Lab 8 opens the Lab 8 intro');
  ok((await page.locator('.intro h1').innerText()) === 'Virtual Lab 8 – Chromosome Preparation and Karyotyping' && (await page.locator('.intro .lead').innerText()) === 'Continue from your bone marrow preparation and learn how to identify and arrange rat chromosomes into a karyogram.', 'Lab 8 title and subtitle are exact');
  ok(/Recap of Lab 7/i.test(await page.locator('.recap').innerText()) && /bone marrow suspension/.test(await page.locator('.recap').innerText()), 'Lab 8 recaps Lab 7 and starts from the bone marrow suspension');
  await shot('06-lab8-intro');

  console.log('\n[9] Tampering cannot unlock Lab 8');
  const tamp = await ev(() => { const k = 'msa-karyo-lab-v2', raw = JSON.parse(localStorage.getItem(k)); raw.guided.lab7.steps[12] = { done: false }; localStorage.setItem(k, JSON.stringify(raw)); return true; });
  await page.reload(); await ev(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(250);
  ok(await page.locator('#btn-lab8').getAttribute('aria-disabled') === 'true', 'editing saved data (bad signature) re-locks Lab 8');
  ok(/could not be verified|cleared|Locked/.test(await page.locator('.notice, #btn-lab8').first().innerText()), 'the user is told the data failed verification');
  ok(await ev(() => { try { KL.Store.assertLab8(); return false; } catch (e) { return /locked/i.test(e.message); } }), 'Store.assertLab8() throws while Lab 7 is incomplete');
  ok(await ev(() => { try { KL.Store.markStep('lab8', 1, 1, 'x'); return false; } catch (e) { return true; } }), 'writing Lab 8 progress directly is refused');

  /* rebuild a legitimate state quickly for the remaining tests: run Lab 7 again */
  console.log('\n[10] Re-complete Lab 7 (second run), then Lab 8 end to end');
  await go('#/home'); await page.click('#btn-lab7'); await page.click('#btn-start'); await wait(200);
  await lab7All(false); await page.click('#btn-finish7'); await wait(250);
  ok(await ev(() => KL.Store.lab7Complete()), 'Lab 7 completed again');
  await page.click('#btn-continue8'); await wait(150); await page.click('#btn-start'); await wait(200);
  ok((await hash()) === '#/lab8/1' && await page.locator('.tnode').count() === 15, 'Lab 8 has 15 steps');
  for (let n = 1; n <= 15; n++) {
    await doStep(LAB8, n);
    if (n === 6) { ok(true, 'step 6: drops, safety checks and the spreading simulation'); }
    if (n === 9) { ok(!!(await state()).guided.lab8.spread, 'step 9: a suitable metaphase was selected on the virtual microscope'); await shot('07-lab8-microscope'); }
    if (n === 12) { ok(/Karyogram correct/.test(await page.locator('.kres').innerText()), 'step 12: the karyogram built by the student is accepted'); await shot('08-lab8-karyogram'); }
    if (n < 15) { await page.click('#btn-next'); await wait(170); }
  }
  ok(/Karyogram submitted/.test(await page.locator('.kres').innerText()), 'step 15: the karyogram is submitted for evaluation');
  await page.click('#btn-next'); await wait(250);
  ok((await hash()) === '#/lab8/done' && /Lab 8 Completed/.test(await page.locator('.done-screen h1').innerText()), 'Lab 8 completion screen');
  const d8 = await page.locator('.done-screen').innerText();
  ok(/Reagent identification/.test(d8) && /Chromosome pairing/.test(d8) && /Karyotyping/.test(d8) && /Metaphase identification/.test(d8), 'the Lab 8 report lists the score categories');
  ok((await state()).guided.lab8.finished === true, 'Lab 8 is marked finished');
  await shot('09-lab8-complete');

  console.log('\n[11] Wrong actions cost marks (no full marks for just reaching the end)');
  const rep = await ev(() => KL.Report.build('lab7', 'guided', KL.App.defs));
  ok(rep.cats.length === 8 && rep.rows.length === 12 && rep.total <= 100, 'the guided report has 8 categories and 12 stage scores (' + rep.total + '%)');
  const sOK = await ev(() => KL.Store.scores('lab7', 'guided').pct);
  ok(sOK > 0, 'the guided score is computed from recorded attempts (' + sOK + '%)');

  console.log('\n[12] Practical Examination (Lab 7)');
  await go('#/home'); await page.click('#btn-exam-lab7'); await wait(200);
  ok((await hash()) === '#/exam/lab7' && /Practical Examination/.test(await page.locator('.intro h1').innerText()), 'exam intro opens');
  await go('#/exam/lab7/1'); ok((await hash()) === '#/exam/lab7', 'examination steps cannot be opened before it is started');
  await page.click('#btn-start-exam'); await wait(250);
  const seed1 = (await state()).exam.lab7.seed;
  ok((await hash()) === '#/exam/lab7/1' && seed1 > 0, 'starting the examination creates a random seed');
  ok(await page.locator('.tab').count() === 1 && await page.locator('.side-col').count() === 0 && await page.locator('.details').count() === 0, 'no hints: Key Points, anatomy tab, reference panels and procedure notes are hidden');
  ok(await page.locator('.mode-badge.exam').count() >= 1, 'the Practical Examination mode badge is shown');
  await tools(['Scalpel']); ok(/Response recorded/.test(await fbText()) && !/Not needed/.test(await fbText()), 'exam feedback is neutral — it does not reveal correctness');
  await tools(['Gloves']); await page.locator('.tpick[aria-pressed="true"]').first().click().catch(() => { });
  await tools(['Gloves', 'Dissection pad']);   // wrong again (3rd error) -> stage ends
  await wait(300);
  ok(await page.locator('.banner.fail').count() === 1 && /incomplete/.test(await page.locator('.banner.fail').innerText()), 'after the maximum incorrect actions the stage is ended and marked incomplete');
  ok((await state()).exam.lab7.steps[1].failed === true && (await state()).exam.lab7.steps[1].score === 0, 'the failed stage scores zero');
  await page.click('#btn-after-fail'); await wait(200);
  for (let n = 2; n <= 12; n++) { await doStep(LAB7, n); await page.click('#btn-next'); await wait(170); }
  await checkpointRun(true); await page.waitForSelector('#btn-finish7', { timeout: 6000 });
  await page.click('#btn-finish7'); await wait(250);
  const ex7 = await page.locator('.done-screen').innerText();
  ok((await hash()) === '#/exam/lab7/done' && /Examination — Report/.test(ex7), 'examination report appears');
  ok(/Missed steps/i.test(ex7) && /Step 1/i.test(ex7) && /Areas for revision/i.test(ex7) && /Recommendations/i.test(ex7) && /Incorrect actions/i.test(ex7), 'report shows incorrect actions, missed steps, revision areas and recommendations');
  const tot = await ev(() => KL.Report.build('lab7', 'exam', KL.App.defs).total);
  ok(tot > 0 && tot < 100, 'the exam score is below 100% because of the failed stage (' + tot + '%)');
  ok((await state()).history.some(h => h.stage === 'lab7'), 'the exam result is stored in the history');
  await shot('10-exam-report');
  // retake: new seed → randomised
  await page.click('#btn-retake'); await wait(150); await page.click('#btn-start-exam'); await wait(200);
  const seed2 = (await state()).exam.lab7.seed;
  ok(seed2 !== seed1 && (await state()).exam.lab7.steps[1] === undefined, 'a retake starts clean with a different random seed (randomised content)');

  console.log('\n[13] Practical Examination (Lab 8)');
  await go('#/home'); ok(await page.locator('#btn-exam-lab8').getAttribute('aria-disabled') === null, 'the Lab 8 examination is available once the guided Lab 8 is complete');
  await go('#/exam/lab8'); await page.click('#btn-start-exam'); await wait(250);
  for (let n = 1; n <= 15; n++) { await doStep(LAB8, n); if (n < 15) { await page.click('#btn-next'); await wait(170); } }
  await page.click('#btn-next'); await wait(250);
  ok((await hash()) === '#/exam/lab8/done' && /Examination — Report/.test(await page.locator('.done-screen h1').innerText()), 'Lab 8 examination (randomised fields/questions) completes with a report');
  ok((await state()).exam.lab8.finished === true, 'Lab 8 exam recorded as finished');

  console.log('\n[14] Responsive layouts');
  await go('#/home'); await page.click('#btn-lab7'); await page.click('#btn-start'); await wait(200);
  for (const [w, hgt, nm] of [[820, 1100, 'tablet'], [390, 844, 'phone']]) {
    await page.setViewportSize({ width: w, height: hgt }); await wait(200);
    ok(await noOverflow(), nm + ' (' + w + 'px): Lab 7 step has no horizontal overflow');
    await shot('11-' + nm + '-lab7');
  }
  await go('#/lab8/9'); await wait(200);
  ok(await noOverflow(), 'phone: the Lab 8 virtual microscope fits'); await shot('12-phone-lab8');
  await page.setViewportSize({ width: 1440, height: 1000 });

  console.log('\n[15] Console errors');
  ok(errors.length === 0, 'no page or console errors' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));

  await browser.close();
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
