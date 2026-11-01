/* =========================================================================
   tasks.js — reusable interactive task builders.
   Every choice is rendered with identical neutral styling; correctness is only
   communicated by feedback text AFTER an attempt (and, in the practical
   examination, not even then).
   A task gets a `ctx` from the shell: ctx.attempt(), ctx.safety(), ctx.fb(kind, html),
   ctx.complete(summary), ctx.rnd() (seeded in the examination), ctx.revealTools().
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc, shuffle } = KL.UI;

  const Tasks = {};
  let uid = 0;
  const rnd = ctx => (ctx && ctx.rnd) || Math.random;

  /** A finished (sub-)task either advances the surrounding stages (o.onDone) or completes the step. */
  const finish = (ctx, o, summary, picked) => { if (o.onDone) o.onDone(picked); else ctx.complete(o.summary || summary); };
  const block = (prompt, extra) => h('div.task-block', [h('p.task-prompt', { html: prompt }), extra]);

  /** One correct answer. options: [{id, text, correct, why, unsafe}] */
  Tasks.single = function (ctx, o) {
    const name = 'q' + (++uid);
    const opts = o.keepOrder ? o.options : shuffle(o.options, rnd(ctx));
    let checked = null;
    const list = h('div.opts', { role: 'radiogroup' }, opts.map(op => h('label.opt', [
      h('input', { type: 'radio', name, value: op.id, onchange: () => { checked = op; } }), h('span', { html: op.text })
    ])));
    const btn = h('button.btn.primary', { onclick: () => {
      if (!checked) return ctx.fb('hint', 'Select an option first.');
      ctx.attempt();
      if (checked.correct) { ctx.fb('ok', checked.why || o.okMsg || 'Correct.'); finish(ctx, o, checked.text, checked); }
      else { if (checked.unsafe) ctx.safety(); ctx.fb(checked.unsafe ? 'safety' : 'sci', checked.why || 'That is not correct. Think about the purpose of this step and try again.'); }
    } }, o.button || 'Check answer');
    return block(o.prompt, [list, h('div.task-actions', btn)]);
  };

  /** Select all that apply. options: [{id, text, correct, why, unsafe}] */
  Tasks.multi = function (ctx, o) {
    const opts = shuffle(o.options, rnd(ctx));
    const boxes = opts.map(op => h('label.opt', [h('input', { type: 'checkbox', value: op.id }), h('span', { html: op.text })]));
    const btn = h('button.btn.primary', { onclick: () => {
      const picked = opts.filter((op, i) => boxes[i].querySelector('input').checked);
      if (!picked.length) return ctx.fb('hint', 'Select at least one option.');
      ctx.attempt();
      const wrong = picked.filter(p => !p.correct), missed = opts.filter(op => op.correct && picked.indexOf(op) < 0);
      if (!wrong.length && !missed.length) { ctx.fb('ok', o.okMsg || 'Correct — that is the complete set.'); finish(ctx, o, 'Selected the correct set.', picked); return; }
      const unsafe = wrong.filter(w => w.unsafe);
      let html = '';
      if (unsafe.length) { ctx.safety(); html += '<strong>Unsafe or unethical choice:</strong> ' + unsafe.map(u => esc(u.why || u.text)).join(' ') + ' '; }
      const sci = wrong.filter(w => !w.unsafe);
      if (sci.length) html += '<strong>Not required here:</strong> ' + sci.map(w => esc(w.why || w.text)).join(' ') + ' ';
      if (missed.length) html += '<strong>' + missed.length + ' required item' + (missed.length > 1 ? 's are' : ' is') + ' still missing.</strong> ' + (o.missHint || 'Re-read the purpose of this step.');
      ctx.fb(unsafe.length ? 'safety' : 'sci', html);
    } }, o.button || 'Check selection');
    return block(o.prompt, [h('div.opts', boxes), h('div.task-actions', btn)]);
  };

  /** Click items in the order you think is correct. items: [{id, text}], order: [ids] */
  Tasks.sequence = function (ctx, o) {
    const items = shuffle(o.items, rnd(ctx));
    let chosen = [];
    const pool = h('div.seq-pool'), out = h('ol.seq-out');
    function draw() {
      pool.innerHTML = ''; out.innerHTML = '';
      items.forEach(it => { const used = chosen.indexOf(it.id) >= 0; pool.appendChild(h('button.opt.seq-item' + (used ? '.used' : ''), { disabled: used, onclick: () => { chosen.push(it.id); draw(); } }, it.text)); });
      chosen.forEach(id => out.appendChild(h('li', [items.filter(x => x.id === id)[0].text])));
      if (!chosen.length) out.appendChild(h('li.empty', 'Click the items in the order they happen…'));
    }
    draw();
    const reset = h('button.btn', { onclick: () => { chosen = []; draw(); } }, 'Clear order');
    const check = h('button.btn.primary', { onclick: () => {
      if (chosen.length < items.length) return ctx.fb('hint', 'Place all ' + items.length + ' items first.');
      ctx.attempt();
      const wrongAt = o.order.findIndex((id, i) => chosen[i] !== id);
      if (wrongAt < 0) { ctx.fb('ok', o.okMsg || 'Correct order.'); finish(ctx, o, 'Placed the steps in the correct order.'); }
      else ctx.fb('sci', 'The order is not right yet — position ' + (wrongAt + 1) + ' does not fit. ' + (o.hint || 'Ask what must happen before what.'));
    } }, 'Check order');
    return block(o.prompt, [pool, out, h('div.task-actions', [reset, check])]);
  };

  /** A volume/number dial with a unit. */
  Tasks.dial = function (label, o) {
    const out = h('output', (+o.value).toFixed(o.step < 1 ? 1 : 0) + ' ' + o.unit);
    const inp = h('input', { type: 'range', min: o.min, max: o.max, step: o.step, value: o.value, 'aria-label': label,
      oninput: () => { out.textContent = (+inp.value).toFixed(o.step < 1 ? 1 : 0) + ' ' + o.unit; if (o.onChange) o.onChange(+inp.value); } });
    return h('label.dial', [h('span', label), inp, out]);
  };

  /**
   * Instrument / material selection. pool: tool ids; required: tool ids; defs: {id: {name, ic: () => svg, why}}
   * Identical tiles; the student selects what the step needs. On success the shell reveals the "Tools Used" panel.
   */
  Tasks.tools = function (ctx, o) {
    const ids = shuffle(o.pool, rnd(ctx)), sel = new Set();
    const grid = h('div.tool-pick');
    function draw() {
      grid.innerHTML = '';
      ids.forEach(id => { const d = o.defs[id]; grid.appendChild(h('button.tpick', { 'aria-pressed': sel.has(id) ? 'true' : 'false', onclick: () => { sel.has(id) ? sel.delete(id) : sel.add(id); draw(); } }, [h('span.tp-ic', { html: d.ic() }), h('span', d.name)])); });
    }
    draw();
    const btn = h('button.btn.primary', { onclick: () => {
      if (!sel.size) return ctx.fb('hint', 'Select the instruments and materials you need for this step.');
      ctx.attempt();
      const extra = Array.from(sel).filter(id => o.required.indexOf(id) < 0), missing = o.required.filter(id => !sel.has(id));
      if (!extra.length && !missing.length) { ctx.fb('ok', 'Correct selection for this step.'); ctx.revealTools(); ctx.toolOk(); if (o.onDone) o.onDone(); return; }
      ctx.toolError();
      const unsafe = extra.filter(id => o.defs[id].unsafe);
      if (unsafe.length) ctx.safety();
      let html = '';
      if (extra.length) html += '<strong>Not needed here:</strong> ' + extra.map(id => esc(o.defs[id].name + (o.defs[id].why ? ' — ' + o.defs[id].why : ''))).join('; ') + '. ';
      if (missing.length) html += '<strong>' + missing.length + ' required item' + (missing.length > 1 ? 's are' : ' is') + ' missing.</strong> Think about what this step needs.';
      ctx.fb(unsafe.length ? 'safety' : 'sci', html);
    } }, 'Confirm selection');
    return block(o.prompt || 'Select the instruments and materials needed for this step.', [grid, h('div.task-actions', btn)]);
  };

  /** Identify a structure by clicking a hotspot inside art (elements with data-region). */
  Tasks.pick = function (ctx, o) {
    const host = h('div.hero', { html: o.art });
    const msg = h('p.task-prompt', { html: o.prompt });
    function bind() {
      host.querySelectorAll('[data-region]').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation();
        ctx.attempt();
        const r = el.dataset.region;
        const ok = Array.isArray(o.correct) ? o.correct.indexOf(r) >= 0 : r === o.correct;
        if (ok) { ctx.fb('ok', (o.okMsg && (typeof o.okMsg === 'function' ? o.okMsg(r) : o.okMsg)) || 'Correct.'); if (o.onHit) { o.onHit(r, host, bind); } else finish(ctx, o, 'Identified the structure.', r); }
        else ctx.fb(o.unsafe && o.unsafe[r] ? 'safety' : 'sci', (o.wrong && o.wrong[r]) || o.otherWhy || 'That is not the structure asked for. Look again at its position and shape.');
      }));
    }
    bind();
    return h('div.task-block', [msg, host]);
  };

  /** Choose among visual cards (chromosomes, slides …). cards: [{id, html, label}] */
  Tasks.cards = function (ctx, o) {
    const cards = o.keepOrder ? o.cards : shuffle(o.cards, rnd(ctx)), sel = new Set();
    const wrap = h('div.cards');
    function draw() {
      wrap.innerHTML = '';
      cards.forEach(c => wrap.appendChild(h('button.card-opt', { 'data-card': c.id, 'aria-pressed': sel.has(c.id) ? 'true' : 'false', onclick: () => {
        if (o.multi) { sel.has(c.id) ? sel.delete(c.id) : sel.add(c.id); draw(); }
        else if (!o.confirm) check([c.id]); else { sel.clear(); sel.add(c.id); draw(); }
      } }, [h('div.card-art', { html: c.html }), c.label ? h('span', c.label) : null])));
    }
    function check(picked) {
      ctx.attempt();
      const want = Array.isArray(o.correct) ? o.correct : [o.correct];
      const ok = picked.length === want.length && want.every(w => picked.indexOf(w) >= 0);
      if (ok) { ctx.fb('ok', o.okMsg || 'Correct.'); finish(ctx, o, 'Identified correctly.', picked); }
      else {
        const first = picked.find(p => want.indexOf(p) < 0) || want.find(w => picked.indexOf(w) < 0);
        ctx.fb('sci', (o.wrong && o.wrong[first]) || o.otherWhy || 'That is not correct. Compare size and centromere position again.');
      }
    }
    draw();
    return h('div.task-block', [h('p.task-prompt', { html: o.prompt }), wrap, (o.multi || o.confirm) ? h('div.task-actions', h('button.btn.primary', { onclick: () => { if (!sel.size) return ctx.fb('hint', 'Select an option first.'); check(Array.from(sel)); } }, o.button || 'Check selection')) : null]);
  };

  /**
   * Run stages one after another. Each stage: function(next) → element.
   * After the last stage's next() the optional o.onFinish() is called.
   */
  Tasks.stages = function (ctx, fns, o) {
    const box = h('div.stages');
    let i = 0;
    function show() {
      box.innerHTML = '';
      box.appendChild(h('div.stage-tag', 'Stage ' + (i + 1) + ' of ' + fns.length + (o && o.names ? ' — ' + o.names[i] : '')));
      box.appendChild(fns[i](() => { i++; if (i < fns.length) { ctx.fb('clear'); show(); } else if (o && o.onFinish) o.onFinish(); }));
    }
    show();
    return box;
  };

  KL.Tasks = Tasks;
})();
