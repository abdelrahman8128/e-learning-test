/* =========================================================================
   ui.js — generic UI helpers: modals, warnings, toasts, drag & drop,
   SVG renderers for test tubes and the student avatar.
   ========================================================================= */
(function (L) {
  'use strict';

  var UI = L.UI = {};
  var uid = 0;

  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.$ = function (sel, root) { return (root || document).querySelector(sel); };
  UI.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------ */
  /* Modals                                                              */
  /* ------------------------------------------------------------------ */
  UI.modal = function (opts) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML =
      '<div class="modal ' + (opts.cls || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h2>' + opts.title + '</h2>' +
      (opts.dismiss ? '<button class="icon-btn" data-close aria-label="Close">×</button>' : '') +
      '</div><div class="modal-body">' + (opts.body || '') + '</div><div class="modal-foot"></div></div>';
    var foot = wrap.querySelector('.modal-foot');
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.remove();
      if (opts.onClose) opts.onClose();
      L.requestRender();
    }
    (opts.buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.innerHTML = b.label;
      if (b.id) el.id = b.id;
      if (b.disabled) el.disabled = true;
      el.addEventListener('click', function () {
        var r = b.onClick ? b.onClick(wrap, close) : undefined;
        if (r !== false) close();
      });
      foot.appendChild(el);
    });
    if (!opts.buttons || !opts.buttons.length) foot.remove();
    var x = wrap.querySelector('[data-close]');
    if (x) x.addEventListener('click', close);
    document.getElementById('modal-root').appendChild(wrap);
    if (opts.onOpen) opts.onOpen(wrap, close);
    var f = wrap.querySelector('.modal-foot .btn') || x;
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
    return { el: wrap, close: close };
  };

  UI.modalOpen = function () { return !!document.querySelector('#modal-root .modal-backdrop'); };

  var SEV_LABEL = { critical: 'Critical safety violation', major: 'Safety violation', minor: 'Safety warning', procedure: 'Procedure error' };

  /** Show a recorded violation / technique error. Major + critical are modal. */
  UI.warning = function (entry, o) {
    o = o || {};
    var sev = entry.severity;
    var modal = sev === 'critical' || sev === 'major' || o.modal;
    if (!modal) {
      UI.toast('<strong>' + UI.esc(entry.title) + '</strong><br>' + UI.esc(entry.action || '') +
        (entry.fix ? '<br><em>' + UI.esc(entry.fix) + '</em>' : ''), sev === 'procedure' ? 'proc' : 'warn', 6500);
      return;
    }
    var body =
      '<div class="sev-tag sev-' + sev + '">' + SEV_LABEL[sev] + (entry.pts ? ' · −' + entry.pts + ' ' + (entry.type === 'violation' ? 'safety' : 'technique') + ' points' : '') + '</div>' +
      (o.anim ? '<div class="warn-anim">' + o.anim + '</div>' : '') +
      '<dl class="warn-dl">' +
      '<dt>What happened</dt><dd>' + UI.esc(entry.action) + '</dd>' +
      (entry.consequence ? '<dt>Why it matters</dt><dd>' + UI.esc(entry.consequence) + '</dd>' : '') +
      (entry.rule && L.RULES[entry.rule] ? '<dt>Rule</dt><dd class="rule">' + UI.esc(L.RULES[entry.rule]) + '</dd>' : '') +
      (entry.fix ? '<dt>What to do now</dt><dd>' + UI.esc(entry.fix) + '</dd>' : '') +
      '</dl>';
    UI.modal({
      title: UI.esc(entry.title),
      cls: 'warn-modal sev-' + sev,
      body: body,
      buttons: [{ label: o.button || 'I understand — let me correct it', cls: 'primary', onClick: o.onClose }]
    });
  };

  UI.toast = function (html, type, ms) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.setAttribute('role', 'status');
    el.innerHTML = html;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(function () { el.classList.add('out'); }, (ms || 3800));
    setTimeout(function () { el.remove(); }, (ms || 3800) + 400);
  };

  /** A modal with a list of option buttons. */
  UI.choice = function (opts) {
    var body = (opts.prompt ? '<p>' + opts.prompt + '</p>' : '') +
      '<div class="choice-list">' + opts.options.map(function (op, i) {
        return '<button class="choice" data-i="' + i + '">' +
          (op.icon ? '<span class="choice-icon">' + op.icon + '</span>' : '') +
          '<span><strong>' + op.label + '</strong>' + (op.desc ? '<small>' + op.desc + '</small>' : '') + '</span></button>';
      }).join('') + '</div>';
    UI.modal({
      title: opts.title, body: body, dismiss: opts.dismiss !== false, cls: opts.cls || '',
      onOpen: function (w, close) {
        UI.$$('.choice', w).forEach(function (b) {
          b.addEventListener('click', function () {
            close();
            opts.onPick(opts.options[+b.dataset.i].value);
          });
        });
      }
    });
  };

  /** Volume dispensing modal with a graduated pipette. */
  UI.volume = function (opts) {
    var max = opts.max || 10, step = opts.step || 0.5, val = opts.start || 0;
    var body =
      '<p>' + opts.prompt + '</p>' +
      '<div class="vol-wrap"><svg class="pipette" viewBox="0 0 70 260" aria-hidden="true">' +
      '<rect x="22" y="10" width="26" height="230" rx="5" fill="#f7fbff" stroke="#6b7c8f" stroke-width="2"/>' +
      '<rect class="pip-fill" x="24" width="22" rx="3" fill="' + opts.color + '" opacity=".85"/>' +
      (function () {
        var t = '';
        for (var i = 0; i <= max; i++) {
          var y = 236 - i * (220 / max);
          t += '<line x1="48" x2="' + (i % 5 === 0 ? 60 : 55) + '" y1="' + y + '" y2="' + y + '" stroke="#456"/>';
          if (i % (max > 10 ? 5 : 1) === 0) t += '<text x="62" y="' + (y + 3) + '" font-size="8" fill="#345">' + i + '</text>';
        }
        return t;
      })() +
      '</svg><div class="vol-ctrl">' +
      '<div class="vol-read"><span class="vol-val">0</span> ' + (opts.unit || 'mL') + '</div>' +
      '<input type="range" class="vol-range" min="0" max="' + max + '" step="' + step + '" value="' + val + '" aria-label="Volume">' +
      '<div class="vol-btns"><button class="btn sm" data-d="-1">− ' + step + '</button><button class="btn sm" data-d="1">+ ' + step + '</button></div>' +
      '<p class="hint">' + (opts.hint || '') + '</p></div></div>';
    UI.modal({
      title: opts.title, body: body, dismiss: true, cls: 'vol-modal',
      buttons: [{ label: opts.confirm || 'Dispense into tube', cls: 'primary', onClick: function (w) {
        var v = parseFloat(UI.$('.vol-range', w).value);
        if (!v) { UI.toast('Draw up some liquid first.', 'info'); return false; }
        setTimeout(function () { opts.onConfirm(v); }, 0);
      } }],
      onOpen: function (w) {
        var r = UI.$('.vol-range', w), fill = UI.$('.pip-fill', w), out = UI.$('.vol-val', w);
        function upd() {
          var v = parseFloat(r.value);
          var h = v * (220 / max);
          fill.setAttribute('y', 236 - h); fill.setAttribute('height', h);
          out.textContent = v;
        }
        r.addEventListener('input', upd);
        UI.$$('[data-d]', w).forEach(function (b) {
          b.addEventListener('click', function () {
            r.value = Math.max(0, Math.min(max, parseFloat(r.value) + step * (+b.dataset.d)));
            upd();
          });
        });
        upd();
      }
    });
  };

  /* ------------------------------------------------------------------ */
  /* Drag & drop (pointer events: mouse, pen and touch) + tap-to-select  */
  /* ------------------------------------------------------------------ */
  var DnD = UI.DnD = { dragging: false, selected: null };

  DnD.init = function (root) {
    root.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var src = e.target.closest('[data-drag]');
      if (!src || src.classList.contains('disabled')) return;
      e.preventDefault(); // no text selection while dragging (click still fires)
      var startX = e.clientX, startY = e.clientY, ghost = null;
      var id = src.dataset.drag;
      function move(ev) {
        var dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!ghost && Math.hypot(dx, dy) > 7) {
          DnD.dragging = true;
          ghost = src.cloneNode(true);
          ghost.classList.add('drag-ghost');
          var r = src.getBoundingClientRect();
          ghost.style.width = r.width + 'px';
          ghost.style.height = r.height + 'px';
          ghost._ox = startX - r.left; ghost._oy = startY - r.top;
          document.body.appendChild(ghost);
          src.classList.add('drag-src');
          document.body.classList.add('is-dragging');
        }
        if (ghost) {
          ev.preventDefault();
          ghost.style.left = (ev.clientX - ghost._ox) + 'px';
          ghost.style.top = (ev.clientY - ghost._oy) + 'px';
          UI.$$('.drop-hover').forEach(function (d) { d.classList.remove('drop-hover'); });
          ghost.style.display = 'none';
          var under = document.elementFromPoint(ev.clientX, ev.clientY);
          ghost.style.display = '';
          var tgt = under && under.closest('[data-drop]');
          if (tgt && tgt !== src) tgt.classList.add('drop-hover');
        }
      }
      function up(ev) {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!ghost) return; // treated as a click (handled by the click listener)
        ghost.style.display = 'none';
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        ghost.remove();
        src.classList.remove('drag-src');
        document.body.classList.remove('is-dragging');
        UI.$$('.drop-hover').forEach(function (d) { d.classList.remove('drop-hover'); });
        var tgt = under && under.closest('[data-drop]');
        var dropId = tgt && tgt !== src ? tgt.dataset.drop : null;
        DnD.suppressClick = true;
        setTimeout(function () { DnD.suppressClick = false; }, 50);
        DnD.dragging = false;
        DnD.clearSelection();
        L.onDrop(id, dropId, { drag: true, srcEl: src, inside: !!(under && under.closest('#station')) });
        L.requestRender();
      }
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });

    // Tap/click alternative: select an item, then tap its destination.
    root.addEventListener('click', function (e) {
      if (DnD.suppressClick) return;
      var tgt = e.target.closest('[data-drop]');
      var src = e.target.closest('[data-drag]');
      if (DnD.selected && tgt && tgt.dataset.drop !== DnD.selected) {
        var id = DnD.selected;
        DnD.clearSelection();
        L.onDrop(id, tgt.dataset.drop, { drag: false });
        L.requestRender();
        return;
      }
      if (src && !src.classList.contains('disabled')) {
        if (DnD.selected === src.dataset.drag) { DnD.clearSelection(); return; }
        DnD.clearSelection();
        DnD.selected = src.dataset.drag;
        src.classList.add('selected');
        document.body.classList.add('has-selection');
        UI.toast('Selected <strong>' + UI.esc(src.dataset.label || src.dataset.drag) + '</strong> — now tap where to put it (or drag it).', 'info', 2500);
      } else if (!tgt) {
        DnD.clearSelection();
      }
    });
  };

  DnD.clearSelection = function () {
    DnD.selected = null;
    document.body.classList.remove('has-selection');
    UI.$$('[data-drag].selected').forEach(function (el) { el.classList.remove('selected'); });
  };

  /* ------------------------------------------------------------------ */
  /* Test tube renderer                                                  */
  /* ------------------------------------------------------------------ */
  var CAP = 15;
  function Y(ml) { return 224 - Math.max(0, Math.min(CAP, ml)) * (214 / CAP); }
  UI.tubeY = Y;

  /**
   * v = { layers:[{from,to,color,op}], turbid:{from,to,op}, ppt:{color,amt}, ring:{at,color,delay},
   *       sulfur:{level, mode:'float'|'sink'|'scatter', amt, delay}, bubbles, hot, holder, steam, label }
   */
  UI.tubeSVG = function (v, o) {
    o = o || {};
    v = v || {};
    var id = 'tc' + (++uid);
    var s = '<svg class="tube-svg' + (v.hot ? ' hot' : '') + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 60 240" overflow="visible" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><path d="M11 8 L11 204 A19 19 0 0 0 49 204 L49 8 Z"/></clipPath>' +
      '<linearGradient id="' + id + 'g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      '<rect x="11" y="8" width="38" height="216" fill="#f4f8fb" opacity=".55" clip-path="url(#' + id + ')"/>' +
      '<g clip-path="url(#' + id + ')">';

    (v.layers || []).forEach(function (l) {
      s += '<rect x="0" width="60" y="' + Y(l.to) + '" height="' + (Y(l.from) - Y(l.to)) + '" fill="' + l.color + '" opacity="' + (l.op == null ? 0.82 : l.op) + '"' + (l.cls ? ' class="' + l.cls + '"' : '') + '/>';
      // meniscus
      s += '<ellipse cx="30" cy="' + Y(l.to) + '" rx="19" ry="2" fill="' + l.color + '" opacity=".5"/>';
    });

    if (v.turbid) {
      var t0 = Y(v.turbid.to), t1 = Y(v.turbid.from);
      s += '<g class="turbid' + (v.turbid.anim ? ' fade-in' : '') + '" opacity="' + v.turbid.op + '"><rect x="0" width="60" y="' + t0 + '" height="' + (t1 - t0) + '" fill="#fdfdf8"/>';
      for (var i = 0; i < 26; i++) {
        var px = 13 + ((i * 37) % 34), py = t0 + 3 + ((i * 53) % Math.max(4, (t1 - t0 - 6)));
        s += '<circle cx="' + px + '" cy="' + py + '" r="1.1" fill="#ffffff"/>';
      }
      s += '</g>';
    }

    if (v.ppt) {
      var n = Math.round(10 + v.ppt.amt * 22);
      s += '<g class="ppt' + (v.ppt.anim ? ' settle' : '') + '">';
      s += '<ellipse cx="30" cy="219" rx="17" ry="' + (3 + v.ppt.amt * 4) + '" fill="' + v.ppt.color + '"/>';
      for (var k = 0; k < n; k++) {
        s += '<circle cx="' + (14 + (k * 29) % 32) + '" cy="' + (210 - (k * 17) % (8 + v.ppt.amt * 14)) + '" r="1.6" fill="' + v.ppt.color + '"/>';
      }
      s += '</g>';
    }

    if (v.ring) {
      s += '<rect class="ring" x="0" width="60" y="' + (Y(v.ring.at) - 3.5) + '" height="7" fill="' + v.ring.color + '" style="animation-delay:' + (v.ring.delay || 0) + 'ms"/>';
    }

    if (v.sulfur) {
      var lv = Y(v.sulfur.level), count = v.sulfur.amt === 'large' ? 46 : 22;
      for (var j = 0; j < count; j++) {
        var sx = 13 + ((j * 41) % 34) + (j % 3) * 0.5;
        var sy = lv - 1.5 + (j % 3);
        var dy = (Y(0) - 6 - sy) - ((j * 13) % 18);
        var cls = v.sulfur.mode === 'sink' ? 'sulfur sink' : (v.sulfur.mode === 'scatter' ? 'sulfur scatter' : 'sulfur');
        var delay = (v.sulfur.delay || 0) + (j % 7) * 120;
        s += '<circle class="' + cls + '" cx="' + sx + '" cy="' + sy + '" r="1.5" fill="#e6c619" stroke="#b39500" stroke-width=".4" style="--dy:' + dy + 'px;animation-delay:' + delay + 'ms"/>';
      }
    }

    if (v.bubbles) {
      for (var b = 0; b < 8; b++) {
        s += '<circle class="bubble" cx="' + (15 + (b * 23) % 30) + '" cy="' + (Y(0) - 8 - (b * 7) % 20) + '" r="' + (1.2 + (b % 3) * 0.7) + '" fill="#fff" opacity=".8" style="animation-delay:' + (b * 170) + 'ms"/>';
      }
    }
    s += '</g>';

    // glass
    s += '<path d="M11 6 L11 204 A19 19 0 0 0 49 204 L49 6" fill="url(#' + id + 'g)" stroke="#55687a" stroke-width="2.2"/>' +
      '<path d="M7 6 H15 M45 6 H53" stroke="#55687a" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="16" x2="16" y1="16" y2="196" stroke="#fff" stroke-width="2.5" opacity=".7"/>';
    // volume ticks (5, 10 mL)
    [5, 10].forEach(function (m) {
      s += '<line x1="44" x2="49" y1="' + Y(m) + '" y2="' + Y(m) + '" stroke="#7b8b9a" stroke-width="1"/>' +
        '<text x="53" y="' + (Y(m) + 3) + '" font-size="7" fill="#7b8b9a">' + m + '</text>';
    });

    if (v.steam) {
      s += '<g class="steam"><path d="M24 2 q-5 -10 0 -18 q5 -8 0 -16" /><path d="M36 2 q5 -10 0 -18 q-5 -8 0 -16" /></g>';
    }
    if (v.holder) {
      s += '<g class="holder-g"><rect x="5" y="26" width="50" height="11" rx="3" fill="#b07a3c" stroke="#6e4818"/>' +
        '<rect x="55" y="28" width="62" height="7" rx="3" fill="#c58b47" stroke="#6e4818"/>' +
        '<circle cx="8" cy="31.5" r="2" fill="#6e4818"/></g>';
    }
    s += '</svg>';
    return s;
  };

  /* ------------------------------------------------------------------ */
  /* Student avatar (PPE)                                                */
  /* ------------------------------------------------------------------ */
  UI.avatarSVG = function (ppe, belongings, o) {
    o = o || {};
    var skin = '#e3b48e', btnY = [128, 160, 192, 224];
    var s = '<svg class="avatar-svg" viewBox="0 0 200 310" aria-label="Student avatar">';
    // legs & shoes
    s += '<rect x="72" y="228" width="24" height="70" rx="6" fill="#33405a"/><rect x="104" y="228" width="24" height="70" rx="6" fill="#33405a"/>' +
      '<ellipse cx="82" cy="300" rx="16" ry="7" fill="#222"/><ellipse cx="118" cy="300" rx="16" ry="7" fill="#222"/>';
    // shirt
    s += '<rect x="62" y="92" width="76" height="142" rx="16" fill="#8a5fa8"/>';
    // backpack (worn)
    if (belongings && belongings.bag === 'carried') {
      s += '<rect x="132" y="104" width="34" height="70" rx="8" fill="#c0533a" stroke="#7d2f1e" stroke-width="2"/><rect x="138" y="140" width="22" height="18" rx="4" fill="#a3442e"/>';
    }
    // arms (skin) & sleeves
    var sleeve = ppe.coat ? '#fbfbfb' : '#8a5fa8';
    s += '<rect x="40" y="98" width="22" height="104" rx="10" fill="' + sleeve + '" stroke="#c9d0d8"/>' +
      '<rect x="138" y="98" width="22" height="104" rx="10" fill="' + sleeve + '" stroke="#c9d0d8"/>';
    var hand = ppe.gloves ? '#4c9be8' : skin;
    s += '<circle cx="51" cy="210" r="11" fill="' + hand + '" stroke="' + (ppe.gloves ? '#2a6fb5' : '#c08d68') + '" stroke-width="1.5"/>' +
      '<circle cx="149" cy="210" r="11" fill="' + hand + '" stroke="' + (ppe.gloves ? '#2a6fb5' : '#c08d68') + '" stroke-width="1.5"/>';
    if (belongings && belongings.drink === 'carried') {
      s += '<rect x="141" y="196" width="16" height="30" rx="4" fill="#e9922f" stroke="#a65e12"/><rect x="144" y="190" width="10" height="7" fill="#444"/>';
    }
    // coat halves
    if (ppe.coat) {
      var lx = [], rx = [];
      var ys = [96].concat(btnY).concat([252]);
      for (var i = 0; i < ys.length; i++) {
        var bi = i - 1; // button index at this y
        var closed = bi >= 0 && bi < 4 ? ppe.buttons[bi] : (i === 0 ? ppe.buttons[0] : ppe.buttons[3]);
        lx.push((closed ? 101 : 86) + ',' + ys[i]);
        rx.push((closed ? 99 : 114) + ',' + ys[i]);
      }
      s += '<polygon points="60,94 ' + lx.join(' ') + ' 58,252" fill="#fdfdfd" stroke="#b8c1cb" stroke-width="1.5"/>';
      s += '<polygon points="140,94 ' + rx.join(' ') + ' 142,252" fill="#fbfbfb" stroke="#b8c1cb" stroke-width="1.5"/>';
      s += '<path d="M78 94 L100 120 L122 94" fill="none" stroke="#b8c1cb" stroke-width="2"/>';
      s += '<rect x="66" y="176" width="20" height="16" fill="none" stroke="#c9d0d8"/>';
      btnY.forEach(function (y, i) {
        var f = ppe.buttons[i];
        s += '<g class="coat-btn' + (f ? ' fastened' : '') + '" data-button="' + i + '" role="button" tabindex="0" aria-label="' + (f ? 'Unfasten' : 'Fasten') + ' button ' + (i + 1) + (i === 3 ? ' (lowest)' : '') + '">' +
          '<circle cx="100" cy="' + y + '" r="13" fill="transparent"/>' +
          (f ? '<circle cx="100" cy="' + y + '" r="5" fill="#4a5a6b"/>'
            : '<circle cx="88" cy="' + y + '" r="5" fill="#fff" stroke="#c0392b" stroke-width="2" class="pulse"/>') +
          '</g>';
      });
    }
    // head
    s += '<rect x="90" y="78" width="20" height="18" fill="' + skin + '"/>' +
      '<circle cx="100" cy="56" r="30" fill="' + skin + '"/>' +
      '<path d="M70 52 Q72 22 100 22 Q130 22 130 52 Q118 36 100 38 Q82 36 70 52Z" fill="#3b2a20"/>' +
      '<circle cx="89" cy="58" r="3" fill="#222"/><circle cx="111" cy="58" r="3" fill="#222"/>' +
      '<path d="M91 72 Q100 78 109 72" stroke="#8a4a3a" stroke-width="2" fill="none"/>';
    if (ppe.goggles) {
      s += '<rect x="70" y="47" width="60" height="21" rx="9" fill="#bfe3f7" fill-opacity=".55" stroke="#1d6fa5" stroke-width="3"/>' +
        '<line x1="100" y1="48" x2="100" y2="67" stroke="#1d6fa5" stroke-width="2"/>';
    }
    s += '</svg>';
    return s;
  };

  /* Small inline icons (SVG) for equipment tiles */
  UI.icon = {
    bottle: function (c, label) {
      return '<svg viewBox="0 0 40 56" class="ico"><rect x="14" y="2" width="12" height="9" rx="2" fill="#555"/>' +
        '<path d="M10 14 Q10 11 14 11 H26 Q30 11 30 14 V52 Q30 54 28 54 H12 Q10 54 10 52Z" fill="#f5f7f9" stroke="#6b7c8f" stroke-width="1.5"/>' +
        '<rect x="11" y="28" width="18" height="25" rx="2" fill="' + c + '" opacity=".85"/>' +
        (label ? '<rect x="12" y="17" width="16" height="9" fill="#fff" stroke="#aab"/>' : '') + '</svg>';
    },
    cup: function () {
      return '<svg viewBox="0 0 40 56" class="ico"><path d="M8 14 H32 L29 52 H11Z" fill="#fff8e6" stroke="#8b6b2b" stroke-width="1.5"/>' +
        '<rect x="9.5" y="24" width="21" height="27" fill="#f1cf5b" opacity=".85"/><rect x="6" y="10" width="28" height="6" rx="2" fill="#d33"/>' +
        '<rect x="12" y="30" width="16" height="10" fill="#fff" stroke="#aaa"/></svg>';
    },
    dropper: function () {
      return '<svg viewBox="0 0 40 56" class="ico"><ellipse cx="20" cy="9" rx="7" ry="8" fill="#d0463b"/><rect x="16" y="15" width="8" height="5" fill="#888"/>' +
        '<path d="M16 20 H24 L21.5 52 H18.5Z" fill="#eef6fb" stroke="#6b7c8f"/><rect x="18" y="38" width="4" height="12" fill="#e8f1f8"/></svg>';
    },
    jar: function (c) {
      return '<svg viewBox="0 0 40 56" class="ico"><rect x="9" y="8" width="22" height="7" rx="2" fill="#666"/>' +
        '<rect x="7" y="15" width="26" height="38" rx="5" fill="#f5f7f9" stroke="#6b7c8f" stroke-width="1.5"/>' +
        '<rect x="9" y="30" width="22" height="21" rx="3" fill="' + c + '"/></svg>';
    },
    holder: function () {
      return '<svg viewBox="0 0 64 40" class="ico wide"><rect x="2" y="15" width="22" height="10" rx="3" fill="#b07a3c" stroke="#6e4818"/>' +
        '<rect x="22" y="17" width="40" height="6" rx="3" fill="#c58b47" stroke="#6e4818"/><path d="M6 15 q6 -8 14 0" fill="none" stroke="#777" stroke-width="2"/></svg>';
    },
    rack: function (n) {
      var s = '<svg viewBox="0 0 90 50" class="ico wide"><rect x="2" y="16" width="86" height="8" rx="2" fill="#2f7d6d"/><rect x="2" y="38" width="86" height="8" rx="2" fill="#2f7d6d"/>' +
        '<rect x="4" y="16" width="5" height="32" fill="#2f7d6d"/><rect x="81" y="16" width="5" height="32" fill="#2f7d6d"/>';
      for (var i = 0; i < 5; i++) s += '<circle cx="' + (16 + i * 15) + '" cy="20" r="4.5" fill="#d7efe9"/>';
      for (var j = 0; j < (n || 0); j++) s += '<rect x="' + (12.5 + j * 15) + '" y="2" width="7" height="40" rx="3.5" fill="#eaf3f8" stroke="#55687a"/>';
      return s + '</svg>';
    },
    burner: function (lit) {
      return '<svg viewBox="0 0 50 80" class="ico"><rect x="8" y="70" width="34" height="8" rx="2" fill="#555"/><rect x="20" y="30" width="10" height="42" fill="#8f9aa5" stroke="#5b6670"/>' +
        '<rect x="17" y="54" width="16" height="6" fill="#6b7680"/>' +
        (lit ? '<path class="flame-ico" d="M25 2 Q35 18 30 30 H20 Q15 18 25 2Z" fill="#6fb3ff" opacity=".85"/><path d="M25 14 Q29 22 27 30 H23 Q21 22 25 14Z" fill="#2c5ee8"/>' : '') + '</svg>';
    },
    sink: '<svg viewBox="0 0 60 40" class="ico wide"><rect x="4" y="14" width="52" height="22" rx="5" fill="#cfd8df" stroke="#6b7c8f"/><path d="M30 14 V4 H40" stroke="#6b7c8f" stroke-width="3" fill="none"/></svg>'
  };
})(window.Lab);
