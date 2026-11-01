/* End-to-end test for the Rat Bone Marrow Karyotyping virtual lab.
 *   node tests/rat-karyotype-e2e.js            (needs the `playwright` package)
 * Set SHOTS=dir to save screenshots. Covers the ten required test conditions.
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
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };
const ev = (fn, arg) => page.evaluate(fn, arg);

async function openPage(p) {
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await p.goto(URL); await p.waitForSelector('#view *');
  await p.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; });   // accelerated clocks for testing
}
const opt = (t) => page.locator('.opt').filter({ hasText: new RegExp('^\\s*' + esc(t) + '\\s*$') });
const pick = async t => { await opt(t).first().locator('input').check(); };
const clickBtn = async t => { await page.locator('button').filter({ hasText: new RegExp('^\\s*' + esc(t) + '\\s*$') }).first().click(); await wait(80); };
const setRange = async (idx, v) => { await page.locator('.dial input[type=range]').nth(idx).evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v)); };
const doneBanner = async () => { await page.waitForSelector('.done-banner .banner', { timeout: 8000 }); };
const next = async () => { await doneBanner(); await page.click('#btn-next'); await wait(150); };
const fbText = async () => (await page.locator('.fb').first().innerText().catch(() => ''));
const state = () => ev(() => JSON.parse(JSON.stringify(KL.Store.get())));
const hash = () => ev(() => location.hash);
const noOverflow = () => ev(() => document.documentElement.scrollWidth <= window.innerWidth + 2);

/* --------------------------------------------------------------- Lab 7 steps */
async function seq(texts) { for (const t of texts) await page.locator('.seq-item').filter({ hasText: t }).first().click(); }
const LAB7 = {
  1: async () => { await seq(['binds tubulin', 'No mitotic spindle', 'held at metaphase', 'More metaphase cells']); await clickBtn('Check order'); },
  2: async () => { for (const t of ['approved animal-ethics protocol', 'trained, authorised personnel', 'method is the one specified']) await page.locator('.opt').filter({ hasText: t }).locator('input').check(); await clickBtn('Check selection'); },
  3: async () => { await clickBtn('Bone layer'); await page.dispatchEvent('[data-region="femur"]', 'click'); },
  4: async () => { await page.dispatchEvent('[data-inc="incA"]', 'click'); },
  5: async () => { await clickBtn('Reflect the skin'); await page.dispatchEvent('[data-region="thigh-muscle"]', 'click'); },
  6: async () => { await page.dispatchEvent('.marker[data-m="hip"]', 'click'); await page.dispatchEvent('.marker[data-m="knee"]', 'click'); await clickBtn('Check release points'); },
  7: async () => { for (const t of ['Scissors', 'Forceps', 'Gauze']) await pick(t); await clickBtn('Check selection'); },
  8: async () => { while (await page.$('.patch')) await page.dispatchEvent('.patch', 'click'); },
  9: async () => { const b = await page.locator('.femur-host svg').boundingBox(); for (const x of [80, 322]) await page.mouse.click(b.x + x / 400 * b.width, b.y + 100 / 200 * b.height); await clickBtn('Make the cuts'); },
  10: async () => { await pick('Phosphate-buffered saline (PBS)'); await clickBtn('Check answer'); await setRange(0, 3); await clickBtn('Confirm volume'); await clickBtn('Flush the femur'); },
  11: async () => { for (let i = 0; i < 5; i++) await clickBtn('Pipette up and down gently'); },
  12: async () => { await centrifuge(); },
  13: async () => { await pick('KCl 0.075 M (hypotonic)'); await clickBtn('Check answer'); await setRange(0, 3); await clickBtn('Add to the tube'); await pick('The medium is hypotonic, so water enters the cells by osmosis'); await clickBtn('Check answer'); },
  14: async () => { await setRange(0, 37); await clickBtn('Start incubation'); await wait(2500); await clickBtn('Remove the tube'); },
  15: async () => { await centrifuge(); await pick('Remove the supernatant carefully, leaving the pellet undisturbed'); await clickBtn('Check answer'); },
  16: async () => {
    for (const t of ['Lab coat, gloves and safety goggles on', 'Work carried out inside a chemical fume hood', 'Trained supervision and approved laboratory facilities']) await pick(t);
    await clickBtn('Check selection'); await setRange(0, 2.25); await setRange(1, 0.75); await clickBtn('Confirm fixative'); await clickBtn('Add fixative gently and let it stand');
  },
  17: async () => { await seq(['Centrifuge the tube', 'Remove the supernatant', 'Add fresh fixative', 'Resuspend the cells gently']); await clickBtn('Check order'); await pick('The designated, labelled chemical (solvent) waste container, kept capped'); await clickBtn('Check answer'); }
};
async function centrifuge() {
  await page.dispatchEvent('.rslot[data-slot="0"]', 'click'); await page.dispatchEvent('.rslot[data-slot="3"]', 'click'); await wait(900);
  await setRange(0, 2000); await setRange(1, 5); await clickBtn('Start centrifuge');
  await page.waitForSelector('.hit-pel', { timeout: 6000 }); await page.click('.hit-pel'); await wait(100);
}
/* --------------------------------------------------------------- Lab 8 steps */
async function arrangeKaryotype(opts) {
  opts = opts || {};
  const info = await ev(() => ({ slots: KL.KARYO.slots, chroms: KL.KARYO.chroms }));
  const slotOf = pair => info.slots.find(s => s.key === (pair === 'X' || pair === 'Y' ? 'XY' : pair)).index;
  const K = () => ev(() => JSON.parse(JSON.stringify(KL.Store.get().lab8.karyotype)));
  const only = opts.only || info.chroms.length;
  for (const c of info.chroms.slice(0, only)) {
    await page.click('.chr.tray[data-id="' + c.id + '"]'); await page.click('.kslot[data-slot="' + slotOf(c.pair) + '"] .kslot-h');
  }
  return { info, slotOf, K };
}

(async () => {
  const browser = await chromium.launch();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await ctx.newPage();
  await openPage(page);

  console.log('\n[1] A new student can start Lab 7');
  ok((await hash()) === '#/home', 'opens on the home screen');
  ok((await page.locator('#btn-lab7').innerText()).includes('Start Lab 7'), 'Lab 7 is offered as “Start Lab 7”');
  await page.click('#btn-lab7'); await wait(200);
  ok((await hash()) === '#/lab7/1' && /Colchicine/.test(await page.locator('.step-title h2').innerText()), 'step 1 (Colchicine Pretreatment) opens');
  ok(await page.locator('.hdr h1').innerText().then(t => /Rat Bone Marrow Chromosome Extraction and Karyotyping/.test(t)), 'header shows the lab title');
  ok((await page.locator('.stepbtn').count()) === 18 && (await page.locator('.tnode').count()) === 18, 'sidebar and progress tracker list 17 steps + checkpoint');
  ok(await page.locator('.stepbtn.locked').count() === 17, 'later steps are locked until earlier ones are done');
  ok((await page.locator('.tab').allInnerTexts()).join('|') === 'Procedure|Anatomy View|Key Points', 'tabs: Procedure · Anatomy View · Key Points');
  ok(await page.locator('#btn-next').isDisabled(), 'Next is disabled until the step is complete');
  // neutral options + key points gating
  await page.click('.tab[data-tab="key"]'); ok(/unlock after your first attempt/.test(await page.locator('.locked-tab').innerText()), 'Key Points are withheld before the first attempt');
  await page.click('.tab[data-tab="procedure"]');
  await shot('01-lab7-step1');

  console.log('\n[2] Lab 8 stays inaccessible before Lab 7 completion');
  await page.click('#nav-home'); await wait(150);
  ok((await page.locator('#btn-lab8').getAttribute('aria-disabled')) === 'true', 'Lab 8 button is marked locked');
  await page.click('#btn-lab8', { force: true }); await wait(150);
  ok((await hash()) === '#/home', 'clicking Lab 8 does not leave the home screen');
  await page.evaluate(() => { location.hash = '#/lab8/1'; }); await wait(200);
  ok((await hash()) === '#/home', 'typing #/lab8/1 in the URL is redirected home');
  await page.evaluate(() => { location.hash = '#/lab8/done'; }); await wait(200);
  ok((await hash()) === '#/home', '#/lab8/done is redirected home');
  await page.evaluate(() => { location.hash = '#/lab7/5'; }); await wait(200);
  ok((await hash()) === '#/lab7/1', 'jumping ahead inside Lab 7 is redirected to the first incomplete step');
  const blocked = await ev(() => { try { KL.Store.markStep('lab8', 1, 1, 'x'); return false; } catch (e) { return true; } });
  ok(blocked, 'writing Lab 8 progress directly through the store throws while Lab 7 is incomplete');
  // tampering with saved data
  await ev(() => { const s = JSON.parse(localStorage.getItem('msa-karyo-lab-v1')); s.lab8.steps[1] = { done: true, score: 1 }; s.lab8.finished = true; localStorage.setItem('msa-karyo-lab-v1', JSON.stringify(s)); });
  await page.reload(); await page.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(200);
  ok(Object.keys((await state()).lab8.steps).length === 0 && !(await state()).lab8.finished, 'Lab 8 data planted in storage without Lab 7 is discarded');
  await ev(() => { const s = JSON.parse(localStorage.getItem('msa-karyo-lab-v1')); for (let i = 1; i <= 17; i++) s.lab7.steps[i] = { done: true, score: 1 }; s.lab7.checkpoint.passed = true; localStorage.setItem('msa-karyo-lab-v1', JSON.stringify(s)); });
  await page.reload(); await page.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; location.hash = '#/home'; }); await wait(250);
  ok(!(await ev(() => KL.Store.lab7Complete())) && (await page.locator('#btn-lab8').getAttribute('aria-disabled')) === 'true', 'hand-edited “completed” Lab 7 records fail verification: Lab 8 stays locked');
  ok(/could not be verified|Lab 8 data/.test(await page.locator('.notice').innerText().catch(() => '')), 'the student is told the saved data was rejected');

  console.log('\n[3] The student can complete Lab 7 (through the real interface) and exit');
  await page.click('#btn-lab7'); await wait(200);
  await LAB7[1](); await doneBanner();
  ok(!(await page.locator('#btn-next').isDisabled()) && /Step complete/.test(await page.locator('.done-banner').innerText()), 'step 1 task completes and unlocks Next');
  await page.click('.tab[data-tab="key"]'); ok(await page.locator('.keys').count() === 1, 'Key Points unlock once the task has been attempted');
  await page.click('.tab[data-tab="anatomy"]'); ok(await page.locator('.anat').count() === 1, 'Anatomy View tab shows structures');
  await page.click('.tab[data-tab="procedure"]');
  await page.click('#btn-next'); await wait(150);
  // wrong answers give feedback and allow another attempt (step 2)
  await page.locator('.opt').filter({ hasText: 'without approval because it is a teaching exercise' }).locator('input').check(); await clickBtn('Check selection');
  ok(/Safety \/ ethics issue/.test(await fbText()), 'an unethical choice is flagged as a safety/ethics issue (distinct from a scientific error)');
  await page.locator('.opt input:checked').uncheck();
  await LAB7[2](); await next();
  for (let n = 3; n <= 17; n++) { await LAB7[n](); await doneBanner(); await page.click('#btn-next'); await wait(120); }
  ok((await hash()) === '#/lab7/18', 'all 17 steps completed through the interface → checkpoint');
  const s1 = await state();
  ok(s1.lab7.steps[10].done && s1.lab7.steps[16].done && !s1.lab7.checkpoint.passed, 'steps are saved; the checkpoint is not yet passed');
  console.log('  — checkpoint: wrong answer first');
  const CHECK = await ev(() => KL.LAB7.CHECK);
  const wrongOpt = CHECK[0].o.find(o => !o[1]);
  await pick(wrongOpt[0]); await clickBtn('Check answer');
  ok(/Not quite/.test(await fbText()) && !(await page.locator('#btn-nextq').count()), 'wrong checkpoint answer: feedback shown, no progress, retry allowed');
  const allText = await page.locator('.opt').allInnerTexts();
  ok(allText.length === 4, 'four options are shown');
  for (let i = 0; i < CHECK.length; i++) {
    const right = CHECK[i].o.find(o => o[1]);
    await pick(right[0]); await clickBtn('Check answer');
    ok(/Correct/.test(await fbText()), 'checkpoint “' + CHECK[i].k + '”: feedback after the answer');
    if (i < CHECK.length - 1) await clickBtn('Next question ›');
  }
  await page.click('#btn-finish7'); await wait(200);
  ok((await hash()) === '#/lab7/done' && /Lab 7 complete/.test(await page.locator('.done-screen h1').innerText()), 'Lab 7 completion screen appears');
  ok(/summary of procedures completed/i.test(await page.locator('.done-screen').innerText()) && /checkpoint results/i.test(await page.locator('.done-screen').innerText()), 'summary shows procedures and checkpoint results');
  ok(!(await page.locator('#btn-continue8').isDisabled()) && await page.locator('#btn-save-exit').count() === 1, '“Save and Exit” and “Continue to Lab 8” are available after completion');
  await shot('02-lab7-complete');
  await page.click('#btn-save-exit'); await wait(150);
  ok(/Progress saved/.test(await page.locator('.done-screen h1').innerText()), 'Save and Exit confirms the progress is stored');

  console.log('\n[4] Lab 7 progress persists after closing and reopening');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });  // fresh browser profile: nothing carried over
  const blank = await ctx2.newPage(); await blank.goto(URL); await blank.waitForSelector('#view *');
  ok((await blank.locator('#btn-lab8').getAttribute('aria-disabled')) === 'true', 'a different profile starts locked (progress is per browser)');
  await blank.close(); await ctx2.close();
  const old = page; page = await ctx.newPage(); await openPage(page); await old.close();   // same profile, “reopened”
  ok(await ev(() => KL.Store.lab7Complete()), 'Lab 7 is still complete after reopening');
  ok((await page.locator('.stage-card').first().innerText()).includes('Completed') && /Review Lab 7/.test(await page.locator('#btn-lab7').innerText()), 'home shows Lab 7 as completed');
  const s2 = await state();
  ok(s2.lab7.checkpoint.passed && s2.lab7.steps[12].score > 0 && Object.keys(s2.lab7.steps).length === 17, 'step scores and checkpoint results are preserved');
  await page.click('#btn-lab7'); await wait(150);
  ok(/Step complete/.test(await page.locator('.done-banner').innerText()), 'revisiting a completed step shows its result without losing progress');
  await page.click('.done-banner .btn'); await wait(100);
  ok(await page.locator('.seq-item').count() === 4 && (await state()).lab7.steps[1].done, '“Practice again” re-opens the task and keeps the saved result');

  console.log('\n[5] Lab 8 unlocks after Lab 7');
  await page.click('#nav-home'); await wait(150);
  ok((await page.locator('#btn-lab8').getAttribute('aria-disabled')) === null && /Start Lab 8/.test(await page.locator('#btn-lab8').innerText()), 'Lab 8 is now unlocked');
  await page.click('#btn-lab8'); await wait(200);
  ok((await hash()) === '#/lab8/1' && /Prepare the Slide/.test(await page.locator('.step-title h2').innerText()), 'Lab 8 step 1 opens');
  ok((await page.locator('.stepbtn').count()) === 10, 'sidebar lists the 10 Lab 8 steps');

  console.log('\n[6] Students can resume Lab 8 without repeating Lab 7');
  await pick('A clean slide kept in cold 70% ethanol at 4 °C'); await clickBtn('Check answer'); await next();
  await clickBtn('💧 Add a drop'); await clickBtn('Confirm');
  ok(/Too little/.test(await fbText()), 'one drop is rejected with an explanation');
  await clickBtn('💧 Add a drop'); await clickBtn('Confirm'); await next();
  await page.reload(); await page.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(250);
  ok((await hash()) === '#/lab8/3' || await page.locator('.step-num').first().innerText().then(t => t === '3'), 'reopening resumes at Lab 8 step 3 (' + await hash() + ')');
  ok((await state()).lab7.checkpoint.passed && (await state()).lab8.steps[2].done, 'Lab 7 is not repeated; Lab 8 steps 1–2 remain saved');
  console.log('  — step 3: flame/alcohol safety overlay, then the spreading simulation');
  await page.locator('.opt').filter({ hasText: 'Pour a little alcohol on the flame' }).locator('input').check(); await clickBtn('Check selection');
  ok(/Safety \/ ethics issue/.test(await fbText()), 'unsafe flame/alcohol choice flagged as a safety issue');
  await page.locator('.opt input:checked').uncheck();
  for (const t of ['Work only under trained supervision in an approved laboratory', 'Keep alcohol and fixative containers closed and well away from the flame', 'Wear lab coat, gloves and goggles; tie back long hair and secure loose sleeves', 'Know where the fire extinguisher, fire blanket and exit are']) await pick(t);
  await clickBtn('Check selection'); await clickBtn('Start simulated spreading'); await doneBanner(); await shot('03-lab8-spreading'); await page.click('#btn-next'); await wait(150);
  await pick('Giemsa working solution at 10%'); await clickBtn('Check answer'); await clickBtn('Start staining'); await doneBanner(); await page.click('#btn-next'); await wait(150);
  await pick('Gently with distilled water'); await clickBtn('Check answer'); await pick('Air-dry on filter paper'); await clickBtn('Check answer'); await next();

  console.log('\n[7] Microscope, then the karyotype workspace accepts arrangement interactions');
  // wrong choices first
  await clickBtn('Use this spread for karyotyping'); ok(/40× objective/.test(await fbText()), 'selecting a spread at 4× is refused: 40× is required');
  await clickBtn('40×'); await clickBtn('Use this spread for karyotyping'); ok(/no cell in this field/i.test(await fbText()), 'an empty field is rejected');
  const mv = async d => { await page.click('[aria-label="Move stage ' + d + '"]'); await wait(40); };
  await mv('←'); await clickBtn('Use this spread for karyotyping');
  ok(/interphase/i.test(await fbText()), 'interphase nuclei are rejected (not a metaphase)');
  await mv('→'); await mv('→'); await mv('↑'); await clickBtn('Use this spread for karyotyping'); ok(/overlap/i.test(await fbText()), 'an overlapping metaphase is rejected');
  await mv('↓'); await mv('↓'); await clickBtn('Use this spread for karyotyping'); ok(/incomplete/i.test(await fbText()), 'an incomplete metaphase is rejected');
  // count tool
  await page.locator('.count input[type=checkbox]').check(); await wait(100);
  await mv('←'); await wait(100);
  const nch = await page.locator('.scope-svg .sp-chr').count(); ok(nch === 42, 'the well-spread cell shows all 42 chromosomes (' + nch + ')');
  await page.locator('.scope-svg .sp-chr').nth(0).dispatchEvent('click'); await page.locator('.scope-svg .sp-chr').nth(1).dispatchEvent('click');
  ok((await page.locator('.tally').innerText()) === 'Marked: 2', 'the count tool marks chromosomes');
  await shot('04-microscope-40x');
  await clickBtn('Use this spread for karyotyping'); await doneBanner(); await page.click('#btn-next'); await wait(200);
  ok((await state()).lab8.spread.variant === 'good', 'the complete, well-spread metaphase is accepted and stored');

  // karyotype
  ok(await page.locator('.ktray .chr.tray').count() === 42, 'all 42 chromosomes start in the tray (nothing is pre-arranged)');
  const tilesRot = await ev(() => Object.values(KL.Store.get().lab8.karyotype.chr).filter(c => c.rot !== 0).length);
  ok(tilesRot > 5 && tilesRot < 37, 'chromosomes start in mixed orientations (' + tilesRot + ' upside down)');
  await clickBtn('Check karyotype'); ok(/still in the tray/.test(await page.locator('.kres').innerText()), 'checking an empty karyotype reports the unplaced chromosomes');
  // wrong pairing: two non-homologues in one slot
  const info = await ev(() => ({ slots: KL.KARYO.slots, chroms: KL.KARYO.chroms }));
  const slotOf = pair => info.slots.find(s => s.key === (pair === 'X' || pair === 'Y' ? 'XY' : pair)).index;
  await page.click('.chr.tray[data-id="1a"]'); await page.click('.kslot[data-slot="0"] .kslot-h'); await page.click('.chr.tray[data-id="4a"]'); await page.click('.kslot[data-slot="0"] .kslot-h');
  await clickBtn('Check karyotype'); ok(/not homologous/.test(await page.locator('.kres').innerText()), 'non-homologous chromosomes in one slot are flagged');
  // a third chromosome cannot join a full slot
  await page.click('.chr.tray[data-id="2a"]'); await page.click('.kslot[data-slot="0"] .kslot-h'); ok(await page.locator('.kslot[data-slot="0"] .chr').count() === 2, 'a slot holds at most two chromosomes');
  // correct placement by tap-select, with pointer drag for two chromosomes
  await page.click('.chr[data-id="4a"]'); await page.click('.ktray-h'); await wait(80);
  ok(await page.locator('.ktray .chr.tray[data-id="4a"]').count() === 1, 'tap a placed chromosome, tap the tray: it returns');
  await page.click('.chr[data-id="1a"]'); await page.click('.ktray-h'); await page.click('.chr[data-id="2a"]'); await page.click('.ktray-h');
  // pointer drag of one chromosome into slot 0
  const from = await page.locator('.chr.tray[data-id="1a"]').boundingBox(), to = await page.locator('.kslot[data-slot="0"] .kslot-in').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(from.x + 30, from.y + 20, { steps: 3 }); await page.mouse.move(to.x + 40, to.y + 70, { steps: 8 }); await page.mouse.up(); await wait(120);
  ok((await ev(() => KL.Store.get().lab8.karyotype.chr['1a'].slot)) === 0, 'drag-and-drop places a chromosome in a slot');
  // arrange all
  const placed = [];
  for (const c of info.chroms) { if (c.id === '1a') continue; await page.click('.chr.tray[data-id="' + c.id + '"]'); await page.click('.kslot[data-slot="' + slotOf(c.pair) + '"] .kslot-h'); }
  ok(await page.locator('.ktray .chr.tray').count() === 0, 'all chromosomes placed');
  // orientation + rotate via button and key
  let K = await ev(() => JSON.parse(JSON.stringify(KL.Store.get().lab8.karyotype)));
  const upside = info.chroms.filter(c => K.chr[c.id].rot !== 0);
  await clickBtn('Check karyotype');
  ok(/upside down/.test(await page.locator('.kres').innerText()) && /not aligned/.test(await page.locator('.kres').innerText()) && /label/.test(await page.locator('.kres').innerText()), 'the check reports orientation, alignment and labelling problems separately');
  const u0 = upside[0]; await page.click('.chr[data-id="' + u0.id + '"]'); await page.click('[data-k="rot"]');
  ok((await ev((id) => KL.Store.get().lab8.karyotype.chr[id].rot, u0.id)) === 0, 'Rotate turns a chromosome upright');
  const u1 = upside[1]; await page.click('.chr[data-id="' + u1.id + '"]'); await page.keyboard.press('r');
  ok((await ev((id) => KL.Store.get().lab8.karyotype.chr[id].rot, u1.id)) === 0, 'the R key rotates the selected chromosome');
  for (const c of upside.slice(2)) { await page.click('.chr[data-id="' + c.id + '"]'); await page.click('[data-k="rot"]'); }
  // alignment: arrow nudge and vertical drag, then the row assist for the rest
  const a0 = info.chroms[0]; await page.click('.chr[data-id="' + a0.id + '"]');
  const dy0 = await ev(id => KL.Store.get().lab8.karyotype.chr[id].dy, a0.id);
  await page.click('[data-k="' + (dy0 > 0 ? 'up' : 'down') + '"]');
  const dy1 = await ev(id => KL.Store.get().lab8.karyotype.chr[id].dy, a0.id);
  ok(Math.abs(dy1) < Math.abs(dy0), 'arrow buttons nudge a chromosome toward the centromere line');
  const a1 = info.chroms[2]; const dyA = await ev(id => KL.Store.get().lab8.karyotype.chr[id].dy, a1.id);
  const bb = await page.locator('.chr[data-id="' + a1.id + '"]').boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy - dyA / 2, { steps: 4 }); await page.mouse.move(cx, cy - dyA, { steps: 4 }); await page.mouse.up(); await wait(120);
  const dyB = await ev(id => KL.Store.get().lab8.karyotype.chr[id].dy, a1.id);
  ok(Math.abs(dyB) < Math.abs(dyA) || Math.abs(dyB) <= 3, 'dragging vertically inside a slot aligns the chromosome (' + dyA + ' → ' + dyB + ')');
  for (let r = 0; r < 4; r++) await page.click('[data-assist="' + r + '"]');
  // labels
  await clickBtn('Check karyotype'); ok(/label/.test(await page.locator('.kres').innerText()) && !/not aligned/.test(await page.locator('.kres').innerText()) && !/upside/.test(await page.locator('.kres').innerText()), 'after rotating and aligning, only the labels remain');
  for (const s of info.slots) await page.fill('.klabel[data-slot="' + s.index + '"]', s.key === 'XY' ? 'X Y' : s.key);
  // a wrong label is caught
  await page.fill('.klabel[data-slot="3"]', '9'); await clickBtn('Check karyotype');
  ok(/label/.test(await page.locator('.kres').innerText()) && await page.locator('.kslot.badlabel').count() === 1, 'a wrong pair number is flagged on that slot only');
  await page.fill('.klabel[data-slot="3"]', '4');
  await shot('05-karyotype-before-final-check');
  // persistence of partial work
  await page.reload(); await page.evaluate(() => { KL.CONFIG.sim.secondsPerRealSecond = 300; }); await wait(250);
  ok(await page.locator('.kslot .chr').count() === 42 && (await page.locator('.klabel[data-slot="3"]').inputValue()) === '4', 'the arrangement and labels are restored after reloading');
  await clickBtn('Check karyotype'); await doneBanner();
  ok(/Karyotype correct/.test(await page.locator('.kres').innerText()), 'the correct karyotype is accepted (rows, order, orientation, alignment, labels)');
  await shot('06-karyotype-complete');
  // reset requires confirmation, cancel keeps the work
  await clickBtn('Reset arrangement'); await page.locator('.modal button').filter({ hasText: 'Cancel' }).click(); await wait(80);
  ok(await page.locator('.kslot .chr').count() === 42, 'cancelling the arrangement reset keeps the karyotype');
  await page.click('#btn-next'); await wait(200);

  console.log('\n[8] Calculations produce mathematically correct results');
  const calcs = await ev(() => { const out = {}; KL.CONFIG.measure.requiredPairs.forEach(id => { const [a, b] = KL.KARYO.chroms.filter(c => c.pair === id); const v = { La: a.L, Sa: a.S, Lb: b.L, Sb: b.S }; out[id] = { v, e: KL.Measure.expected(v, KL.KARYO.haploidTotal) }; }); return out; });
  // marker readout
  const mb = await page.locator('.meas-svg').boundingBox();
  await page.mouse.move(mb.x + 150, mb.y + 24 / 4.4 * 0 + mb.height * 0.2); await page.mouse.down(); await page.mouse.move(mb.x + 150, mb.y + mb.height * 0.3); await page.mouse.up(); await wait(80);
  ok(parseFloat(await page.locator('#mk-val').innerText()) > 0, 'dragging the marker updates the scale reading');
  // wrong measurement
  await page.fill('[data-m="La"]', '9.5'); await page.fill('[data-m="Sa"]', String(calcs['1'].v.Sa)); await page.fill('[data-m="Lb"]', String(calcs['1'].v.Lb)); await page.fill('[data-m="Sb"]', String(calcs['1'].v.Sb)); await clickBtn('Check measurements');
  ok(/too long/.test(await page.locator('.mfb').innerText()) && await page.locator('.mf.bad').count() === 1, 'a wrong reading is flagged (field marked, direction given, no answer revealed)');
  ok(!/6\.6/.test(await page.locator('.mfb').innerText()), 'the correct length is not displayed in the feedback');
  for (const id of ['1', '3', '4', '13', '14', '20']) {
    await page.click('.pbtn[data-pair="' + id + '"]'); await wait(60);
    const { v, e } = calcs[id];
    for (const k of ['La', 'Sa', 'Lb', 'Sb']) await page.fill('[data-m="' + k + '"]', String(v[k]));
    await clickBtn('Check measurements');
    // wrong calculation first for the first pair, and a numeric AR for the telocentric pair
    if (id === '1') {
      await page.fill('[data-c="avgL"]', String(e.avgL)); await page.fill('[data-c="avgS"]', String(e.avgS)); await page.fill('[data-c="ar"]', String((e.avgS / e.avgL).toFixed(2))); await page.fill('[data-c="ci"]', String(e.ci.toFixed(1))); await page.fill('[data-c="rl"]', String(e.rl.toFixed(2)));
      await clickBtn('Check calculations'); ok(/Arm ratio = average long arm ÷ average short arm/.test(await page.locator('.mfb').innerText()), 'inverted AR gives a stepwise hint');
    }
    if (id === '4') {
      await page.fill('[data-c="avgL"]', e.avgL.toFixed(2)); await page.fill('[data-c="avgS"]', '0'); await page.fill('[data-c="ar"]', '0'); await page.fill('[data-c="ci"]', '100'); await page.fill('[data-c="rl"]', e.rl.toFixed(2));
      await clickBtn('Check calculations'); ok(/dividing by zero|undefined/.test(await page.locator('.mfb').innerText()), 'telocentric: a numeric AR is rejected (division by zero is undefined)');
    }
    await page.fill('[data-c="avgL"]', e.avgL.toFixed(2)); await page.fill('[data-c="avgS"]', e.avgS.toFixed(2));
    await page.fill('[data-c="ar"]', e.telo ? 'n/a' : e.ar.toFixed(2)); await page.fill('[data-c="ci"]', e.ci.toFixed(1)); await page.fill('[data-c="rl"]', e.rl.toFixed(2));
    await clickBtn('Check calculations');
    if (id === '1') { ok(await ev(() => KL.Store.get().lab8.measure['1'].calcOk), 'pair 1: AR ' + e.ar.toFixed(2) + ', CI ' + e.ci.toFixed(1) + '%, RL ' + e.rl.toFixed(2) + '% accepted'); await shot('07-measure'); }
  }
  const expectChk = await ev(() => ({ ar: 6.6 / 3.0, ci: 6.6 / 9.6 * 100, rl: 9.6 / KL.KARYO.haploidTotal * 100 }));
  ok(Math.abs(expectChk.ar - 2.2) < 1e-9 && Math.abs(expectChk.ci - 68.75) < 1e-9 && Math.abs(expectChk.rl - 7.8850) < 1e-3, 'independent check: pair 1 AR 2.20, CI 68.75 %, RL 7.885 %');
  await doneBanner(); ok(await ev(() => KL.CONFIG.measure.requiredPairs.every(id => KL.Store.get().lab8.measure[id].calcOk)), 'all required pairs measured and calculated');
  await page.click('#btn-next'); await wait(200);

  console.log('\n[9] Morphological classification');
  await page.selectOption('[data-cls="1"]', 'Metacentric'); for (const id of ['3', '4', '13', '14', '20']) await page.selectOption('[data-cls="' + id + '"]', 'Metacentric');
  await clickBtn('Check classification'); ok(/need.* another look|needs another look/.test(await page.locator('.mfb').innerText()), 'wrong classifications are explained without revealing the answers');
  const want = await ev(() => { const o = {}; KL.CONFIG.measure.requiredPairs.forEach(id => { const r = KL.Store.get().lab8.measure[id].res; o[id] = KL.Calc.classify(r.avgL, r.avgS).cls; }); return o; });
  for (const id of Object.keys(want)) await page.selectOption('[data-cls="' + id + '"]', want[id]);
  await clickBtn('Check classification'); await doneBanner();
  ok(['Metacentric', 'Submetacentric', 'Acrocentric', 'Telocentric'].every(c => Object.values(want).includes(c)), 'the measured set covers all four classes (' + Object.values(want).join(', ') + ')');
  ok(want['4'] === 'Telocentric' && want['1'] === 'Submetacentric' && want['3'] === 'Acrocentric' && want['14'] === 'Metacentric', 'pairs 4, 1, 3 and 14 classify as telocentric, submetacentric, acrocentric, metacentric');
  await page.click('#btn-next'); await wait(200);

  console.log('\n[10] Final analysis and Lab 8 completion');
  ok(await page.locator('.final-kar .kslot').count() === 21 && /measurements, calculations and classification/i.test(await page.locator('.details').first().evaluate(() => document.body.innerText)), 'the final analysis shows the karyotype, measurements and classifications');
  await shot('08-final-analysis');
  await clickBtn('Finish Lab 8'); await doneBanner(); await page.click('#btn-next'); await wait(200);
  ok((await hash()) === '#/lab8/done' && /Lab 8 complete/.test(await page.locator('.done-screen h1').innerText()), 'Lab 8 completion summary appears');
  ok((await state()).lab8.finished === true && Object.keys((await state()).lab8.steps).length === 10, 'all 10 Lab 8 steps are recorded');
  await shot('09-lab8-complete');

  console.log('\n[11] Reset progress requires confirmation');
  await page.click('#nav-home'); await wait(150);
  await page.click('#btn-reset'); await wait(100);
  ok(await page.locator('.modal-backdrop').count() === 1 && /reset all progress/i.test(await page.locator('.modal h2').innerText()), 'a confirmation dialog appears');
  await page.locator('.modal button').filter({ hasText: 'Cancel' }).click(); await wait(100);
  ok(await ev(() => KL.Store.lab7Complete()), 'cancelling keeps all progress');
  await page.click('#btn-reset'); await page.locator('.modal button').filter({ hasText: 'Reset progress' }).click(); await wait(250);
  ok(!(await ev(() => KL.Store.lab7Complete())) && (await page.locator('#btn-lab8').getAttribute('aria-disabled')) === 'true' && Object.keys((await state()).lab7.steps).length === 0, 'confirming erases progress and re-locks Lab 8');

  console.log('\n[12] The application remains usable on smaller screens');
  for (const [w, hgt] of [[820, 1180], [600, 900]]) {
    await page.setViewportSize({ width: w, height: hgt });
    await page.evaluate(() => { location.hash = '#/home'; }); await wait(150);
    ok(await noOverflow(), w + 'px: home has no horizontal overflow');
    await page.click('#btn-lab7'); await wait(200);
    ok(await noOverflow(), w + 'px: step view has no horizontal overflow');
    ok(await page.locator('#btn-next').isVisible() && await page.locator('.tab').first().isVisible(), w + 'px: tabs and navigation are reachable');
    await page.click('#nav-home'); await wait(100);
  }
  // karyotype on a tablet: seed a completed Lab 7 through the store (legitimate state) and open Lab 8 step 7
  await page.setViewportSize({ width: 820, height: 1180 });
  await ev(() => { for (let i = 1; i <= 17; i++) KL.Store.markStep('lab7', i, 1, 'test'); const s = KL.Store.get(); s.lab7.checkpoint.passed = true; KL.Store.save(); [1, 2, 3, 4, 5, 6].forEach(i => KL.Store.markStep('lab8', i, 1, 'test')); KL.Store.get().lab8.spread = { variant: 'good', seed: 31 }; KL.Store.save(); });
  await page.evaluate(() => { location.hash = '#/lab8/7'; }); await wait(300);
  ok(/Arrange the Karyotype/.test(await page.locator('.step-title h2').innerText()) && await noOverflow(), '820px: the karyotype workspace opens without horizontal page overflow');
  await page.click('.chr.tray >> nth=0'); await page.click('.kslot[data-slot="0"] .kslot-h'); await wait(80);
  ok(await page.locator('.kslot .chr').count() === 1, '820px: tap-to-place works on a tablet-sized screen');
  await shot('10-tablet-karyotype');

  ok(errors.length === 0, 'no JavaScript errors during the whole run' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
