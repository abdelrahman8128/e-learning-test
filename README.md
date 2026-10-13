# Biochemistry 2 — Virtual Laboratory: Abnormal Constituents of Urine

An interactive, browser-based virtual laboratory in which university students perform the
qualitative detection of abnormal constituents in urine **and** practise the laboratory safety
rules needed to do it. Students act out each procedure: they move around a 2D laboratory,
drag equipment and reagents, set up the burner, choose angles and flame regions, observe
simulated reactions, interpret the results and clean up. Every action gets feedback straight away.

> All reactions, boiling, splashing and injuries are **simulated** for teaching. The application
> performs no real chemical analysis.

## Running it

No build step, server or internet connection is needed. Open `index.html` in any current
browser (Chrome, Edge, Firefox, Safari) on a desktop or tablet. To host it, copy the folder
to any static web server, such as GitHub Pages or a university LMS.

## What the student does

1. **Choose a urine sample.** Six predefined cases have fixed results, and an "unknown sample"
   option hides which case is used until the report.
2. **PPE inspection at the entrance.** Drag the coat, gloves and goggles onto the avatar, click
   each coat button (including the lowest one), and put the backpack and drink in the locker.
3. **Four experiments, in order, each at its own workstation:**
   | # | Test | Station | Key mechanics |
   |---|------|---------|---------------|
   | 1 | Heat test for albumin | Bench 1 | 5–6 mL urine, holder, safe heating, 2 drops 1 % acetic acid with an interactive dropper, phosphate vs. protein turbidity |
   | 2 | Benedict's test | Bench 2 | 3 mL urine + 2 mL reagent, gentle mixing, 2-minute boil (simulated timer), cooling, colour/precipitate scale |
   | 3 | Rothera's test | Bench 3 → fume hood | 5 mL urine, ~1 g reagent, mix, carry the rack to the hood, fan on and sash lowered, layer 1–2 mL NH₄OH down the wall, purple ring, no shaking |
   | 4 | Hay's sulfur test | Bench 4 | fill ⅔, a small pinch of sulfur, no shaking, powder sinks or floats |
4. **Interpretation.** Three questions per test (observation, interpretation, principle), with feedback.
5. **Cleanup.** Burners off, let tubes cool, collect tubes in a carrying rack, wash at the sink
   (empty → brush → rinse → drain), return the rack to the technician, wipe all benches and the
   hood, clear the stool from the exit aisle, remove gloves and wash hands. The session cannot
   finish until every cleanup step is done.
6. **End-of-lab report.** Shows the final score, safety, procedure and interpretation scores,
   scores by category, the errors made, the safety rules to revise, the breakage response and
   a completion status. It can be printed or saved as PDF.

### Safety rules that are enforced

- Lab coat worn and fully buttoned. Gloves are required to handle samples and reagents.
  Goggles are required for heating, acetic acid and ammonium hydroxide.
- No food or drink, no personal items on benches, no crowding, no smelling, no playing with
  reagents, no moving chemicals unnecessarily. These are taught through decision prompts and
  "other actions".
- No loose test tubes when walking: movement is blocked until the tube is in the rack.
- Heating: a holder is required, the angle must be about 45° (90° is flagged), the opening must
  point away from everyone (critical), and the tube must sit in the blue region just above the
  inner cone with the air hole open. The tube must keep moving gently: holding it still builds
  up a hot spot, which leads to bumping and a hand-burn simulation. Over-boiling makes it boil over.
- Hot glass must not be handled by hand. Doing so causes a burn, the tube is dropped and
  breakage follows.
- Fume hood for ammonium hydroxide, with the fan on and the sash at working height. The
  laminar flow cabinet is a distractor and is rejected.
- No shaking after a reaction or after layering. Mixing is allowed only where the protocol needs it.
- Broken glass: the experiment pauses. The student must *Report to Lab TA*, step back, wait
  for the authorised cleanup and get clearance. Picking up glass, hiding it, walking away or
  continuing to work are critical violations.

### Layout & devices

- **Desktop/laptop.** The **☰ Tasks** and **💬 Feedback** buttons in the top bar hide or show the side panels; the choice is remembered on that browser. A red badge counts new warnings while the feedback panel is hidden.
- **Focus mode (⛶).** Hides the floor plan and side panels so the workbench fills the window. A compact bar keeps the current objective and one-tap station buttons visible. **Full screen** uses the browser's full-screen mode; **Esc** or **Exit focus** returns.
- **Tablet.** A single column: objective, workstation, then tasks, PPE and feedback.
- **Phone (≤ 640 px).** One section at a time, chosen from a bottom tab bar: **Bench**, **Map**, **Tasks**, **Feedback**. Dialogs open as bottom sheets. Tapping a station on the map walks there and returns to the bench.

### Scoring

| Category | How it is scored |
|----------|------------------|
| Safety compliance | Starts at 100. Deductions are −3 for minor, −8 for major and −15 for critical violations. Safe decisions earn small bonuses, capped at 100. |
| Procedural accuracy | Starts at 100. Deductions for sequence, quantity, reagent, technique and cleanup errors. |
| Interpretation | Correct answers out of 12. |
| **Final** | 40 % safety + 35 % procedure + 25 % interpretation. Speed is never rewarded. |

Critical violations stop the action until the student corrects the problem. Minor errors give
feedback and let the student carry on. Each experiment can be reset on its own, and the whole
session can be restarted.

## Project structure

```
index.html          app shell
css/styles.css      all styling (responsive for desktop & tablet, print styles for the report)
js/data.js          PROTOCOL quantities, simulated cases, safety rules, experiment definitions
js/state.js         session state + scoring (violations, technique errors, rewards)
js/safety.js        reusable safety checks (PPE, movement, hot glass, incident lock)
js/ui.js            modals, warnings, toasts, pointer drag & drop, tube/avatar SVG renderers
js/experiments.js   bench views, reagent handling, reactions, heating station
js/quiz.js          interpretation questions derived from the case
js/incidents.js     broken glassware workflow
js/cleanup.js       end-of-lab cleanup & equipment return
js/scene.js         floor plan, navigation, PPE entrance, decision prompts, TA, laminar cabinet
js/report.js        end-of-lab report
js/main.js          rendering, event routing, intro, restart
tests/e2e.js        headless browser test of every required scenario
```

### Adapting it to your practical manual

- **Quantities.** Edit `Lab.PROTOCOL` in `js/data.js`. Examples are the urine volumes, the number
  of acetic acid drops, the Rothera's reagent amount, the ammonium hydroxide volume and the boiling time.
- **Cases.** Add or edit entries in `Lab.SCENARIOS`. Each case sets `albumin`, `phosphates`,
  `glucose` (0–4), `ketones` and `bile`.
- **Rules text.** Edit `Lab.RULES`. Every warning and the report refer to these rule IDs.

## Testing

`tests/e2e.js` uses Playwright to drive a headless browser through every scenario in the
specification:

- entering without a coat;
- entering with an unbuttoned coat;
- handling a sample without gloves;
- heating without goggles or a holder;
- pointing the tube at someone;
- heating at 90°;
- using the wrong flame region;
- carrying a loose tube;
- using ammonia outside the fume hood (including the laminar flow cabinet);
- shaking during Hay's test and after layering in Rothera's test;
- breaking a tube and reporting it;
- breaking a tube and trying to pick up or hide the glass;
- a full cleanup with equipment return and the report.

```
npm install playwright   # once, if not already available
node tests/e2e.js        # SHOTS=./shots node tests/e2e.js to save screenshots
```
