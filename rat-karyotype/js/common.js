/* =========================================================================
   common.js — task sequences shared by both labs.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h } = KL.UI, A = KL.Art, T = KL.Tasks, CFG = KL.CONFIG;
  const Common = {};

  const spin = CFG.spin.rpm + ' rpm for ' + CFG.spin.minutes + ' min';
  Common.spin = spin;

  const clickIn = (host, sel, fn) => host.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => { e.stopPropagation(); fn(el, e); }));
  Common.clickIn = clickIn;

  /**
   * Centrifuge: balance the rotor → set speed and time → run → identify the cell pellet.
   * o.pelletMsg, o.liquid (supernatant colour), o.finish() (called instead of next() after the last stage).
   * Returns an array of stage functions for Tasks.stages.
   */
  Common.centrifugeStages = function (ctx, o) {
    o = o || {};
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
        if (rpm === CFG.spin.rpm && min === CFG.spin.minutes) { ctx.fb('ok', 'Settings match the protocol (' + spin + '). The run starts.'); next(); return; }
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
          if (el.dataset.part === 'pellet') { ctx.fb('ok', o.pelletMsg || 'Correct — the cell pellet is at the bottom.'); if (o.finish) o.finish(); else next(); }
          else ctx.fb('sci', 'That is the supernatant — the liquid above the deposit. Cells are denser than the liquid, so they are driven to the bottom of the tube by centrifugal force.');
        });
      }, 2600);
      return h('div.task-block', host);
    });
    return seq;
  };

  KL.Common = Common;
})();
