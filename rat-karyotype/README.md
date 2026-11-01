# Genetics Virtual Laboratory — Rat Bone Marrow Extraction and Karyotyping

Two connected, browser-only practicals (no build step, no server) for the MSA University Faculty of Biotechnology.
Open `index.html` or serve the folder (it is deployed as `/rat-karyotype/`).

| Lab | Title | Steps |
|-----|-------|-------|
| 7 | Rat Dissection and Bone Marrow Collection (for Karyotyping) | 12 + final checkpoint |
| 8 | Chromosome Preparation and Karyotyping | 15 |

**Lab 7 steps:** cervical dislocation · identify hindlimb · skin incision · reflect skin · expose muscles · remove muscles (femur) · remove muscles (tibia) · clean bones · cut epiphyses · aspirate bone marrow (Workstation A femur + Workstation B tibia, both mandatory) · centrifuge · bone marrow suspension → checkpoint → “Lab 7 Completed – Bone Marrow Collection”.

**Lab 8 steps:** recap/timeline (colchicine prerequisite) · hypotonic · harvesting · fixation · slide preparation · spreading · staining/rinse/dry · slide quality · virtual microscope · chromosome identification · homologue matching · karyogram · measure · classify · final analysis and submission.

## Behaviour
* Every step starts with **tool selection**; the *Tools Used* panel appears only when the choice is right. Nothing is performed automatically.
* **Guided Revision**: hints, explanations, Key Points (after a first attempt), anatomy hotspots, unlimited retries.
* **Practical Examination** (a lab's exam opens after its guided version is complete): no hints, neutral feedback, 3 incorrect actions per stage then the stage ends, randomised questions/fields per attempt (seeded), category-scored report. Reaching the end never gives full marks.
* **Lab 8 is locked until Lab 7 is complete.** Enforced in logic (`js/storage.js`, router guard, direct writes) — not only in the buttons. Completion is derived from signed step records, so editing localStorage re-locks Lab 8. (A browser cannot be made tamper-proof; this stops casual bypass.)
* Progress is saved in `localStorage` (key `msa-karyo-lab-v2`); leave and return at any time.

## Protocol values
Taken from the supplied course protocol and kept in `js/config.js`: colchicine 4 mg/kg about 1.5–2 h before sacrifice (instructor-verified, shown as a timeline prerequisite only — nothing is injected), centrifuge 2000 rpm / 5 min, KCl 0.075 M 3 mL at 37 °C for 10–15 min, Carnoy 3:1 (3 mL, 10 min), slides in cold 70 % ethanol at 4 °C, 2–3 drops, Giemsa 10 % for 10 min, 40× objective.

## Marked for instructor input (not invented)
Also listed in the in-app Laboratory Guide (`KL.INSTRUCTOR_INPUT`):
1. Route of colchicine administration.
2. Whether the 3 mL saline/PBS is per bone or in total, and whether the femur and tibia suspensions are pooled.
3. **Rat chromosome data** — lengths, arm positions and Group A–G assignment. The karyogram uses an idealised 2n = 42 **teaching placeholder** (`KL.KARYO` in `js/config.js`); replace with course-approved data.
4. **Photographs.** None were supplied, so every image is a drawn illustration or simulated model (labelled as such). Put photos in `assets/photos/` and list them in `CONFIG.photos`, e.g. `{ 'lab7-3-close': 'incision.jpg', 'lab7-2-anat': 'rat.jpg' }` (keys: `lab7-<step>-close|ref|anat`, `lab8-<step>-…`); a listed photo replaces the illustration automatically.

## Tests
```
node tests/calc-test.js                  # pure calculations (AR, CI, RL, classification)
node tests/rat-karyotype-e2e.js          # Playwright: both labs, both modes, lock, tamper, scoring, responsive
```
Set `SHOTS=dir` to save screenshots.
