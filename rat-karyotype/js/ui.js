/* =========================================================================
   ui.js — small DOM helpers: element builder, modal, confirm, toast, timers.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** h('div.class#id', {attr:..., onclick:fn}, child | 'text' | [..]) → HTMLElement */
  function h(sel, attrs, kids) {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, n) => { if (t === '.') el.classList.add(n); else el.id = n; });
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) { kids = attrs; attrs = null; }
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') v.split(' ').filter(Boolean).forEach(c => el.classList.add(c));
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(k) {
      if (k == null || k === false) return;
      if (Array.isArray(k)) return k.forEach(add);
      el.appendChild(k.nodeType ? k : document.createTextNode(k));
    })(kids);
    return el;
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- modal ---------- */
  function modal(opts) {
    const root = $('#modal-root');
    const body = h('div.modal-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    const foot = h('div.modal-foot');
    const wrap = h('div.modal-backdrop', { role: 'dialog', 'aria-modal': 'true' }, h('div.modal' + (opts.cls ? '.' + opts.cls : ''), [
      h('div.modal-head', [h('h2', opts.title || ''), opts.dismiss === false ? null : h('button.icon-btn', { 'aria-label': 'Close', onclick: () => close() }, '×')]),
      body, foot
    ]));
    let closed = false;
    function close() { if (closed) return; closed = true; wrap.remove(); if (opts.onClose) opts.onClose(); }
    (opts.buttons || []).forEach(b => foot.appendChild(h('button.btn' + (b.cls ? '.' + b.cls : ''), {
      onclick: () => { const r = b.onClick ? b.onClick(close) : undefined; if (r !== false) close(); }
    }, b.label)));
    if (!foot.children.length) foot.remove();
    wrap.addEventListener('mousedown', e => { if (e.target === wrap && opts.dismiss !== false) close(); });
    root.appendChild(wrap);
    const first = $('.modal-foot .btn', wrap);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
    return { close, el: wrap };
  }

  /** Confirmation dialog; options look identical (no suggested answer). */
  function confirmDialog(title, text, onYes, yesLabel) {
    modal({ title, body: '<p>' + text + '</p>', buttons: [{ label: 'Cancel' }, { label: yesLabel || 'Confirm', onClick: () => { onYes(); } }] });
  }

  /* ---------- toast ---------- */
  function toast(msg, kind) {
    const root = $('#toast-root');
    const t = h('div.toast' + (kind ? '.' + kind : ''), { role: 'status', html: msg });
    root.appendChild(t);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4100);
  }

  /* ---------- accelerated lab clock ---------- */
  const timers = new Set();
  /**
   * Runs an accelerated clock. onTick(simSeconds) is called every 200 ms real time.
   * Returns {stop(), elapsed()}. All timers are stopped when the step changes (KL.UI.clearTimers).
   */
  function clock(onTick) {
    const speed = KL.CONFIG.sim.secondsPerRealSecond;
    const t0 = Date.now();
    const api = {
      stopped: false,
      elapsed: () => (Date.now() - t0) / 1000 * speed,
      stop() { api.stopped = true; clearInterval(id); timers.delete(api); }
    };
    const id = setInterval(() => { if (!api.stopped) onTick(api.elapsed()); }, 200);
    timers.add(api);
    return api;
  }
  const clearTimers = () => Array.from(timers).forEach(t => t.stop());

  const fmtClock = sec => { sec = Math.max(0, Math.floor(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };

  function shuffle(arr, seedFn) {
    const a = arr.slice(); const rnd = seedFn || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /** Deterministic PRNG so simulated micrographs are identical on every attempt. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  KL.UI = { h, $, $$, esc, modal, confirmDialog, toast, clock, clearTimers, fmtClock, shuffle, rng };
})();
