/* =========================================================================
   karyotype.js — chromosome drawing, simulated metaphase spreads, and the
   interactive karyotype-arrangement workspace (drag, pair, rotate, align, label).
   All images are SIMULATED teaching models drawn in code — not real micrographs.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc, shuffle, rng } = KL.UI, K0 = KL.KARYO, Calc = KL.Calc;

  const ARM_W = 1.2, PAD = 2, COLOR = '#5c3d91', STROKE = '#35205f';
  const SC = 8;                     // tray / slot scale (px per simulated µm)
  const LINE_Y = 96, SLOT_H = 196;  // centromere guide line and slot height (px)
  const ALIGN_TOL = 3;              // px
  const isTelo = c => Calc.isTelocentric(c.S);

  /** Geometry + SVG inner markup for an upright chromosome (short arm up). */
  function chromGeom(c, sc) {
    const w = ARM_W * sc, W = Math.round(w + 6), S = isTelo(c) ? 0 : c.S, sh = S * sc, lg = c.L * sc, cx = W / 2;
    let inner = '';
    const rect = (y, hh) => '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + (w / 2) + '" fill="' + COLOR + '" stroke="' + STROKE + '" stroke-width=".7"/>';
    const chromatid = (y1, y2) => '<line x1="' + cx + '" y1="' + (y1 + w / 2) + '" x2="' + cx + '" y2="' + (y2 - w / 2) + '" stroke="#fff" stroke-opacity=".28" stroke-width=".9"/>';
    if (S > 0) {
      inner += rect(PAD, sh - 0.6) + rect(PAD + sh + 0.6, lg - 0.6) +
        '<rect x="' + (cx - w * 0.22) + '" y="' + (PAD + sh - 1.6) + '" width="' + (w * 0.44) + '" height="3.8" fill="' + COLOR + '"/>' +
        chromatid(PAD, PAD + sh) + chromatid(PAD + sh, PAD + sh + lg);
    } else {
      inner += rect(PAD, lg) + chromatid(PAD, PAD + lg) + '<ellipse cx="' + cx + '" cy="' + (PAD + w * 0.36) + '" rx="' + (w * 0.5) + '" ry="' + (w * 0.2) + '" fill="#2a1750" opacity=".75"/>';
    }
    return { W, H: Math.round((S + c.L) * sc + PAD * 2), cx, cy0: PAD + sh, inner };
  }

  function chromSVG(c, o) {
    o = o || {};
    const g = chromGeom(c, o.sc || SC);
    return { geom: g, html: '<svg class="chr-svg" width="' + g.W + '" height="' + g.H + '" viewBox="0 0 ' + g.W + ' ' + g.H + '" style="transform:rotate(' + (o.rot || 0) + 'deg)" aria-hidden="true">' + g.inner + '</svg>' };
  }

  /* ----------------------------------------------------------- spreads */
  const CANVAS = { w: 600, h: 450 };

  function makeSpread(variant, seed) {
    const rnd = rng(seed), sc = 5;
    if (variant === 'interphase') return { variant, seed, items: [], nuclei: [{ x: 190, y: 170, r: 72 }, { x: 410, y: 250, r: 62 }, { x: 290, y: 345, r: 50 }] };
    const list = K0.chroms.slice().sort((a, b) => b.T - a.T);
    const placed = [], pts = [];
    list.forEach(c => {
      const len = c.T * sc + 6;
      for (let attempt = 0, minD = 15; attempt < 2500; attempt++) {
        if (attempt === 1500) minD = 12;
        const ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()), x = 300 + Math.cos(ang) * rad * 232, y = 225 + Math.sin(ang) * rad * 168, rot = rnd() * 360, r = rot * Math.PI / 180;
        const mine = [];
        for (let d = -len / 2; d <= len / 2; d += 6) mine.push([x - Math.sin(r) * d, y + Math.cos(r) * d]);
        if (!mine.every(p => ((p[0] - 300) / 262) ** 2 + ((p[1] - 225) / 192) ** 2 < 1)) continue;
        if (mine.some(p => pts.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < minD))) continue;
        placed.push({ id: c.id, x, y, rot }); mine.forEach(p => pts.push(p)); return;
      }
      placed.push({ id: c.id, x: 300 + (rnd() - .5) * 400, y: 225 + (rnd() - .5) * 280, rot: rnd() * 360 }); // extremely unlikely fallback
    });
    const s = { variant, seed, items: placed, nuclei: [] };
    if (variant === 'overlap') {
      for (let k = 0; k < 9; k++) { const a = placed[k * 4], b = placed[k * 4 + 1]; b.x = a.x + 4 + k; b.y = a.y + 3; b.rot = a.rot + 18 + k * 7; }
    } else if (variant === 'incomplete') {
      const drop = new Set(); while (drop.size < 7) drop.add(Math.floor(rnd() * placed.length));
      s.items = placed.filter((p, i) => !drop.has(i)); s.broken = true;
    }
    return s;
  }

  /** The simulated field. o.scale zoom, o.marks Set of marked ids, o.interactive, o.detail 0–1 */
  function spreadSVG(sp, o) {
    o = o || {};
    const sc = 5, byId = {}; K0.chroms.forEach(c => { byId[c.id] = c; });
    let v = '<defs><radialGradient id="bgf"><stop offset="0" stop-color="#f4eaf2"/><stop offset="1" stop-color="#e5d7e6"/></radialGradient></defs><rect width="600" height="450" fill="url(#bgf)"/>';
    const r0 = rng(sp.seed + 99);
    for (let i = 0; i < 40; i++) v += '<circle cx="' + (r0() * 600) + '" cy="' + (r0() * 450) + '" r="' + (0.8 + r0() * 1.6) + '" fill="#cdb9d3" opacity=".6"/>';
    if (sp.variant === 'interphase') {
      sp.nuclei.forEach(n => {
        v += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="#9b79c2" stroke="#6a4a95" stroke-width="2" opacity=".92"/>';
        for (let i = 0; i < 60; i++) v += '<circle cx="' + (n.x + (r0() - .5) * n.r * 1.6) + '" cy="' + (n.y + (r0() - .5) * n.r * 1.6) + '" r="' + (1 + r0() * 3) + '" fill="#5c3d91" opacity=".5"/>';
      });
      return v;
    }
    v += '<ellipse cx="300" cy="225" rx="262" ry="192" fill="rgba(255,255,255,.18)" stroke="#d1bcd8" stroke-width="2" ' + (sp.broken ? 'stroke-dasharray="26 18"' : '') + '/>';
    sp.items.forEach(it => {
      const c = byId[it.id], g = chromGeom(c, sc);
      v += '<g class="sp-chr' + (o.marks && o.marks.has(it.id) ? ' marked' : '') + '" data-id="' + it.id + '" transform="translate(' + it.x.toFixed(1) + ' ' + it.y.toFixed(1) + ') rotate(' + it.rot.toFixed(1) + ') translate(' + (-g.cx) + ' ' + (-g.H / 2) + ')">' + g.inner +
        (o.interactive ? '<rect x="-4" y="-2" width="' + (g.W + 8) + '" height="' + (g.H + 4) + '" fill="transparent" class="sp-hit"/>' : '') + '</g>';
    });
    return v;
  }

  /* --------------------------------------------------- arrangement state */
  function initState(seed) {
    const rnd = rng(seed + 7), chr = {};
    K0.chroms.forEach(c => { chr[c.id] = { slot: null, rot: rnd() < 0.5 ? 0 : 180, dy: Math.round((rnd() < .5 ? -1 : 1) * (9 + rnd() * 14)) }; });
    return { seed, chr, labels: {}, trayOrder: shuffle(K0.chroms.map(c => c.id), rnd), checks: 0, assists: 0, perfect: false };
  }

  const slotContents = (K, i) => K0.chroms.filter(c => K.chr[c.id].slot === i).map(c => c.id);
  const norm = s => String(s || '').toUpperCase().replace(/[^0-9XY]/g, '');

  /** Evaluate the whole arrangement. Returns {perfect, slotState[], issues[], counts} */
  function evaluate(K) {
    const byId = {}; K0.chroms.forEach(c => { byId[c.id] = c; });
    const cnt = { unplaced: 0, pairing: 0, order: 0, row: 0, sex: 0, orient: 0, align: 0, label: 0 };
    const slotState = K0.slots.map(() => 'empty');
    K0.chroms.forEach(c => {
      const p = K.chr[c.id];
      if (p.slot == null) { cnt.unplaced++; return; }
      if (p.rot !== 0) cnt.orient++;
      if (Math.abs(p.dy) > ALIGN_TOL) cnt.align++;
    });
    K0.slots.forEach((s, i) => {
      const ids = slotContents(K, i); if (!ids.length) return;
      const pairs = ids.map(id => byId[id].pair);
      let st = 'ok';
      if (s.key === 'XY') {
        if (!(ids.length === 2 && pairs.indexOf('X') >= 0 && pairs.indexOf('Y') >= 0)) { st = 'bad'; cnt.sex++; }
      } else if (ids.length === 2 && pairs[0] === pairs[1]) {
        if (pairs[0] === 'X' || pairs[0] === 'Y') { st = 'bad'; cnt.sex++; }
        else if (pairs[0] !== s.key) {
          st = 'bad';
          const target = K0.slots.find(x => x.key === pairs[0]);
          if (target && target.row !== s.row) cnt.row++; else cnt.order++;
        }
      } else if (ids.length === 1) { st = 'bad'; cnt.pairing++; }
      else { st = 'bad'; if (pairs.some(p => p === 'X' || p === 'Y')) cnt.sex++; else cnt.pairing++; }
      // labels
      const want = s.key, got = norm(K.labels[i]);
      if (got !== want) { cnt.label++; if (st === 'ok') st = 'label'; }
      slotState[i] = st;
    });
    const total = Object.keys(cnt).reduce((a, k) => a + cnt[k], 0);
    const issues = [];
    if (cnt.unplaced) issues.push(cnt.unplaced + ' chromosome' + (cnt.unplaced > 1 ? 's are' : ' is') + ' still in the tray. All 42 must be placed.');
    if (cnt.pairing) issues.push(cnt.pairing + ' slot' + (cnt.pairing > 1 ? 's hold' : ' holds') + ' chromosomes that are not homologous (or a single chromosome). Homologues match in size and in centromere position.');
    if (cnt.order) issues.push(cnt.order + ' correctly matched pair' + (cnt.order > 1 ? 's are' : ' is') + ' in the wrong position within a row. Order the pairs from longest to shortest.');
    if (cnt.row) issues.push(cnt.row + ' pair' + (cnt.row > 1 ? 's are' : ' is') + ' in the wrong row. Rows are: large (A, B), medium (C), small (D, E), minute (F, G).');
    if (cnt.sex) issues.push('The sex chromosomes are not placed correctly: the unpaired X and Y go together in the last position of the final row.');
    if (cnt.orient) issues.push(cnt.orient + ' chromosome' + (cnt.orient > 1 ? 's are' : ' is') + ' upside down: short arms (or the centromere end) point up, long arms down.');
    if (cnt.align) issues.push(cnt.align + ' chromosome' + (cnt.align > 1 ? 's are' : ' is') + ' not aligned with the centromere guide line. Drag vertically or use the arrow buttons.');
    if (cnt.label) issues.push(cnt.label + ' pair label' + (cnt.label > 1 ? 's are' : ' is') + ' missing or wrong. Number the pairs 1, 2, 3… by size; the sex chromosomes are labelled X Y.');
    return { perfect: total === 0, slotState, issues, cnt };
  }

  /* --------------------------------------------------------- mounting */
  /**
   * Mounts the interactive workspace into `root`.
   * opts: { K (state), onChange(), onCheck(result), readOnly }
   */
  function mount(root, opts) {
    const K = opts.K;
    let selected = null, ghost = null;
    root.classList.add('karyo');

    const tileHTML = (c, p, cls) => {
      const s = chromSVG(c, { rot: p.rot });
      return '<div class="chr ' + (cls || '') + (selected === c.id ? ' sel' : '') + '" data-id="' + c.id + '" role="button" tabindex="0" aria-label="Chromosome" style="width:' + s.geom.W + 'px;height:' + s.geom.H + 'px">' + s.html + '</div>';
    };

    function render(result) {
      const rows = [0, 1, 2, 3].map(r => {
        const slots = K0.slots.filter(s => s.row === r).map(s => {
          const ids = slotContents(K, s.index), st = result ? result.slotState[s.index] : 'empty';
          const tiles = ids.map((id, k) => {
            const c = K0.chroms.find(x => x.id === id), p = K.chr[id], g = chromGeom(c, SC), cyEff = p.rot ? g.H - g.cy0 : g.cy0;
            const top = LINE_Y - cyEff + p.dy, left = 10 + k * 40;
            const html = tileHTML(c, p, 'placed');
            return html.replace('style="', 'style="position:absolute;left:' + left + 'px;top:' + top.toFixed(0) + 'px;');
          }).join('');
          return '<div class="kslot ' + (st === 'bad' ? 'bad' : st === 'label' ? 'badlabel' : (result && st === 'ok' ? 'good' : '')) + '" data-slot="' + s.index + '"><div class="kslot-h">' + (s.group === 'sex' ? 'Sex chr.' : 'Group ' + s.group) + '</div><div class="kslot-in" style="height:' + SLOT_H + 'px"><div class="guide" style="top:' + LINE_Y + 'px"></div>' + tiles + '</div>' +
            '<input class="klabel" type="text" inputmode="text" maxlength="3" placeholder="no." aria-label="Pair number" data-slot="' + s.index + '" value="' + esc(K.labels[s.index] || '') + '"' + (opts.readOnly ? ' readonly' : '') + '></div>';
        }).join('');
        return '<div class="krow"><div class="krow-h"><span>' + esc(K0.rowNames[r]) + '</span>' + (opts.readOnly ? '' : '<button class="btn xs assist" data-assist="' + r + '" title="Assist: snaps this row to the guide line (recorded)">Align row ⇅</button>') + '</div><div class="krow-s">' + slots + '</div></div>';
      }).join('');
      const tray = K.trayOrder.filter(id => K.chr[id].slot == null).map(id => tileHTML(K0.chroms.find(c => c.id === id), K.chr[id], 'tray')).join('');
      const left = K.trayOrder.filter(id => K.chr[id].slot == null).length;
      root.innerHTML = (opts.readOnly ? '' :
        '<div class="ktools"><button class="btn sm" data-k="rot" title="Rotate selected chromosome (R)">⟳ Rotate</button><button class="btn sm" data-k="up" title="Nudge up (↑)">↑</button><button class="btn sm" data-k="down" title="Nudge down (↓)">↓</button>' +
        '<span class="khint">' + (selected ? 'Selected — rotate or nudge it, or drop it in a slot.' : 'Drag a chromosome to a slot (or tap it, then tap a slot).') + '</span></div>' +
        '<div class="ktray" data-tray="1"><div class="ktray-h">Chromosomes from the selected spread — ' + left + ' left</div><div class="ktray-in">' + (tray || '<span class="tiny">All chromosomes placed.</span>') + '</div></div>') +
        '<div class="kgrid">' + rows + '</div>';
    }

    /* --- state helpers --- */
    const save = () => { if (opts.onChange) opts.onChange(); };
    function place(id, slot) {
      const ids = slotContents(K, slot).filter(x => x !== id);
      if (ids.length >= 2) { KL.UI.toast('That slot already holds two chromosomes (a pair).'); return false; }
      K.chr[id].slot = slot; save(); return true;
    }
    function unplace(id) { K.chr[id].slot = null; save(); }

    /* --- pointer interaction --- */
    function slotFromPoint(x, y) { ghost && (ghost.style.display = 'none'); const el = document.elementFromPoint(x, y); ghost && (ghost.style.display = ''); return el; }
    root.addEventListener('pointerdown', e => {
      if (opts.readOnly) return;
      const tile = e.target.closest('.chr'); if (!tile) return;
      const id = tile.dataset.id, sx = e.clientX, sy = e.clientY, fromSlot = K.chr[id].slot; let moved = false;
      selected = id; root.querySelectorAll('.chr.sel').forEach(t => t.classList.remove('sel')); tile.classList.add('sel');
      const hint = root.querySelector('.khint'); if (hint) hint.textContent = 'Selected — rotate or nudge it, or drop it in a slot.';
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          moved = true; ghost = tile.cloneNode(true); ghost.classList.add('ghost'); ghost.style.cssText = 'position:fixed;z-index:999;pointer-events:none;left:' + (ev.clientX - 14) + 'px;top:' + (ev.clientY - 30) + 'px'; document.body.appendChild(ghost); tile.classList.add('dragging');
        }
        if (moved) { ev.preventDefault(); ghost.style.left = (ev.clientX - 14) + 'px'; ghost.style.top = (ev.clientY - 30) + 'px'; }
      };
      const up = ev => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
        if (!moved) return;
        const under = slotFromPoint(ev.clientX, ev.clientY); ghost.remove(); ghost = null;
        const slotEl = under && under.closest('.kslot'), trayEl = under && under.closest('.ktray');
        if (slotEl) {
          const si = +slotEl.dataset.slot;
          if (fromSlot === si) { K.chr[id].dy = Math.max(-40, Math.min(40, K.chr[id].dy + Math.round(ev.clientY - sy))); save(); }  // vertical drag within a slot = align
          else place(id, si);
        } else if (trayEl && fromSlot != null) unplace(id);
        render();
      };
      document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    });

    root.addEventListener('click', e => {
      if (opts.readOnly) return;
      const b = e.target.closest('[data-k]');
      if (b) { act(b.dataset.k); return; }
      const as = e.target.closest('[data-assist]');
      if (as) {
        const r = +as.dataset.assist; let n = 0;
        K0.slots.filter(s => s.row === r).forEach(s => slotContents(K, s.index).forEach(id => { if (Math.abs(K.chr[id].dy) > 0) { K.chr[id].dy = 0; n++; } }));
        if (n) { K.assists++; save(); render(); KL.UI.toast('Row snapped to the guide line (assist recorded).'); }
        return;
      }
      const tile = e.target.closest('.chr');
      if (tile) { selected = tile.dataset.id; render(); return; }
      const slot = e.target.closest('.kslot');
      if (slot && selected && e.target.tagName !== 'INPUT') { place(selected, +slot.dataset.slot); render(); return; }
      if (e.target.closest('.ktray') && selected && K.chr[selected].slot != null) { unplace(selected); render(); }
    });
    root.addEventListener('input', e => { if (e.target.classList.contains('klabel')) { K.labels[e.target.dataset.slot] = e.target.value; save(); } });

    function act(a) {
      if (!selected) return KL.UI.toast('Select a chromosome first.');
      const p = K.chr[selected];
      if (a === 'rot') p.rot = p.rot ? 0 : 180;
      if (a === 'up') p.dy = Math.max(-40, p.dy - 2);
      if (a === 'down') p.dy = Math.min(40, p.dy + 2);
      save(); render();
    }
    function onKey(e) {
      if (!root.isConnected) return document.removeEventListener('keydown', onKey);
      if (!selected || e.target.tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') { act('rot'); e.preventDefault(); }
      else if (K.chr[selected].slot != null && e.key === 'ArrowUp') { act('up'); e.preventDefault(); }
      else if (K.chr[selected].slot != null && e.key === 'ArrowDown') { act('down'); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);

    render();
    return { render, check() { const r = evaluate(K); render(r); return r; }, reset() { Object.assign(K, initState(K.seed)); selected = null; save(); render(); } };
  }

  /** Read-only rendering of the finished karyotype (for the final analysis). */
  function staticHTML(K) {
    const holder = h('div'); const m = mount(holder, { K, readOnly: true, onChange() { } }); return holder;
  }

  KL.Karyo = { chromGeom, chromSVG, makeSpread, spreadSVG, initState, evaluate, mount, staticHTML, slotContents, CANVAS, SC, ALIGN_TOL, LINE_Y };
})();
