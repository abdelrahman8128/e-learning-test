# Virtual Lab: Rat Bone Marrow Chromosome Extraction and Karyotyping

An interactive virtual laboratory for the **Faculty of Biotechnology, MSA University** covering two
consecutive practical sessions:

| Stage | Title | Steps |
|---|---|---|
| **Lab 7** | Extraction of Metaphase Chromosomes from Rat Bone Marrow | 17 steps + a 5-question checkpoint |
| **Lab 8** | Chromosome Spreading, Staining and Karyotype Analysis | 10 steps — **locked until Lab 7 is completed** |

> Every image is an **illustration** or a **simulated teaching model** drawn by the application. Nothing is
> a photograph, a real micrograph or a real experimental result, and the software performs no real analysis.

## Running it

No build step, server or internet connection is needed.

* **Locally:** open `rat-karyotype/index.html` in any current browser (Chrome, Edge, Firefox, Safari).
* **Hosted:** copy the repository to any static web host. On this project it is served at `/rat-karyotype/`.

Progress is stored in the browser's `localStorage` (key `msa-karyo-lab-v1`).

## What the student does

**Lab 7** — colchicine pretreatment (protocol information only) → euthanasia ethics → hind-limb anatomy →
skin incision → reflect skin → remove femur → remove muscle → clean → trim epiphyses → aspirate marrow
(3 mL saline/PBS) → resuspend → centrifuge (2000 rpm, 5 min, balance the rotor, identify the pellet) →
hypotonic 0.075 M KCl (3 mL) → 37 °C incubation (10–15 min window) → centrifuge again → Carnoy's fixative
(3:1 methanol : glacial acetic acid, 3 mL, PPE + fume hood gate, 10 min) → wash and final suspension (waste
disposal) → checkpoint (purpose of each major phase).

**Lab 8** — slide in cold 70 % ethanol → 2–3 drops → flame/alcohol safety overlay and spreading simulation →
10 % Giemsa for 10 min → rinse and air-dry → microscope (find a complete, well-spread metaphase at 40×) →
**karyotype arrangement** (drag, pair, rotate, align, label, four-row course layout) → measurements and
AR / CI / RL calculations → classification → final analysis.

Interactions are varied on purpose — sequencing, multi-select, identification by clicking, dials and timers,
balancing a rotor, a microscope with stage and objectives, drag-and-drop, ruler measurement and numeric entry —
not just multiple choice. Feedback follows every attempt; correct answers are not shown beforehand. Unsafe or
unethical choices are labelled **“Safety / ethics issue”** and are kept distinct from **“Not quite — scientific
reasoning”**. Speed is never scored.

## The Lab 8 lock (how it is enforced)

* Lab 7 completion is **derived** from the saved step records (all 17 steps + the checkpoint), never read from a
  stored flag.
* Lab 7 records are signed. A record that fails verification is discarded.
* Lab 8 data found without a complete Lab 7 is discarded on load.
* Every entry point goes through `guard()` in `js/app.js` and `Store.canOpen()` / `Store.assertLab8()` in
  `js/storage.js`: the home button, the sidebar, the progress tracker, `#/lab8/…` URLs, the *Continue to Lab 8*
  button and direct store writes.

A browser cannot be made tamper-proof; this stops accidental and casual bypasses. Use an LMS or a server for
high-stakes grading.

## Karyotype model

`js/config.js` holds an **idealised** male rat karyotype (2n = 42: 20 autosome pairs + X + Y) used for the
spreads, the arrangement and the measurements. The course states that the rat chromosomes used here are
telocentric, so most pairs are telocentric; a few have measurable short arms so that AR, CI and all four
classes can be practised. **Edit `Lab.KARYO` to match your course material.** Lengths use one consistent
scale (simulated µm).

* Row 1: Groups A, B (pairs 1–6) · Row 2: Group C (7–12) · Row 3: Groups D, E (13–17) ·
  Row 4: Groups F, G (18–20) + X Y.
  The assignment of pairs to groups is a configuration choice in `js/config.js`; the row structure follows the
  course protocol.
* **AR** = average long arm ÷ average short arm — not defined for telocentric chromosomes (no division by zero).
* **CI** = average **long arm** ÷ total chromosome length × 100 (always the long arm, stated in the interface).
* **RL** = average chromosome length ÷ haploid total × 100, haploid total = ½ × sum of all 42 chromosomes.
* Classification (course criteria): metacentric AR 1.0–1.5 / CI 50–60 %; submetacentric 1.6–3.0 / 61–75 %;
  acrocentric ≥ 3.1 / 76–100 %; telocentric = centromere at the end. **Boundary rule:** AR is rounded to one
  decimal and CI to a whole percent before comparing, so the ranges leave no gaps.

## Protocol parameters

All numbers from the supplied protocol are in `js/config.js` (saline 3 mL, 2000 rpm × 5 min, KCl 0.075 M 3 mL,
37 °C for 10–15 min, Carnoy's 3:1 / 3 mL / 10 min, slide in 70 % ethanol at 4 °C, 2–3 drops, 10 % Giemsa for
10 min, 40× objective). **The colchicine dose and timing were not supplied**, so they are shown as “as specified
in your approved course protocol” and are never simulated; enter them in `CONFIG.colchicine` if you want them
displayed. Timers run ~30× faster than real time (`CONFIG.sim.secondsPerRealSecond`).

## Files

```
index.html          page shell (header, #view, modals)
css/app.css         styling (navy/cream academic look, responsive)
js/config.js        protocol parameters + the idealised karyotype
js/calc.js          pure calculations and classification (also run in Node)
js/storage.js       saving, integrity check, the Lab 7 → Lab 8 lock
js/ui.js            DOM helpers, modal, accelerated clock, seeded random
js/art.js           SVG illustrations and tool icons
js/tasks.js         reusable task builders (single, multi, sequence, dial, stages)
js/lab7.js          the 17 Lab 7 steps + checkpoint questions
js/lab8.js          the 10 Lab 8 steps (incl. the microscope)
js/karyotype.js     chromosome drawing, simulated spreads, arrangement workspace
js/measure.js       measuring, calculating and classifying
js/app.js           routing + guard, sidebar, tracker, home, completion screens
```

To add a step, append an `add(n, phase, {...})` entry in `lab7.js` / `lab8.js` with `title`, `purpose`,
`materials`, `procedure`, `observe`, `safety`, `key`, `tools`, `close`, `ref`, `structures` and a `task(ctx)`
function returning a DOM element; use `ctx.attempt()`, `ctx.fb(kind, html)` and `ctx.complete(summary)`.

## Tests

```
node tests/calc-test.js                 # data model, formulas, boundary handling
node tests/rat-karyotype-e2e.js         # whole lab in a headless browser (needs `playwright`)
```

The end-to-end test drives the real interface through all 17 + 10 steps, the lock (URL, storage tampering,
direct writes), persistence across reopening, resume, reset confirmation, drag-and-drop arrangement,
calculations, classification and tablet / phone widths.
