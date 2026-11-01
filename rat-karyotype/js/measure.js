/* =========================================================================
   measure.js — quantitative karyotype analysis (measure, calculate, classify).
   Scale: all simulated chromosomes use one consistent scale (simulated µm).
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, { h, esc } = KL.UI, K0 = KL.KARYO, Calc = KL.Calc, CFG = KL.CONFIG.measure;

  const SCALE = 22;          // px per simulated µm in the measuring view
  const Y0 = 24;             // ruler zero (top end of the chromosome)
  const NA = /^(n\/?a|na|-+|—|undefined|none|not defined|nd)$/i;
  const isNA = v => NA.test(String(v).trim());
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : (+v).toFixed(d == null ? 2 : d));
  const num = v => (v === '' || v == null ? NaN : parseFloat(String(v).replace(',', '.')));
  const pairs = () => K0.autosomes.map(a => a[0]);
  const homologs = id => K0.chroms.filter(c => c.pair === id);

  /* ---------------------------------------------------- pure checks */
  function checkMeasurements(id, v) {
    const [a, b] = homologs(id), tol = CFG.tolerance, out = { ok: true, fields: {}, msgs: [] };
    const want = { La: a.L, Sa: a.S, Lb: b.L, Sb: b.S }, names = { La: 'long arm of homologue A', Sa: 'short arm of homologue A', Lb: 'long arm of homologue B', Sb: 'short arm of homologue B' };
    Object.keys(want).forEach(k => {
      const r = Calc.compare(num(v[k]), want[k], tol);
      out.fields[k] = r;
      if (r !== 'ok') {
        out.ok = false;
        if (r === 'nan') out.msgs.push('Enter a number for the ' + names[k] + '.');
        else if (want[k] === 0 && k[0] === 'S') out.msgs.push('Homologue ' + k[1].toUpperCase() + ' has no measurable short arm: its centromere is at the very end (telocentric). Enter 0.');
        else out.msgs.push('The ' + names[k] + ' reads ' + (r === 'high' ? 'too long' : 'too short') + '. Place the marker at the ' + (k[0] === 'L' ? 'centromere and then at the bottom end; the long arm is the difference' : 'centromere; the short arm runs from 0 to the centromere') + ' and re-read the scale.');
      }
    });
    return out;
  }

  /** Expected values from the student's accepted measurements. */
  function expected(v, haploid) {
    const La = num(v.La), Sa = num(v.Sa), Lb = num(v.Lb), Sb = num(v.Sb);
    const avgL = Calc.avg(La, Lb), avgS = Calc.avg(Sa, Sb), telo = Calc.isTelocentric(avgS);
    return { avgL, avgS, telo, ar: telo ? null : avgL / avgS, ci: Calc.centromericIndex(avgL, telo ? 0 : avgS), rl: Calc.relativeLength(avgL + (telo ? 0 : avgS), haploid) };
  }

  function checkCalcs(v, c, haploid) {
    const e = expected(v, haploid), t = CFG.calcTol, out = { ok: true, fields: {}, msgs: [], e };
    const bad = (k, msg) => { out.ok = false; out.fields[k] = 'bad'; out.msgs.push(msg); };
    const good = k => { out.fields[k] = 'ok'; };
    let r = Calc.compare(num(c.avgL), e.avgL, t.avg);
    r === 'ok' ? good('avgL') : bad('avgL', 'Average long arm: add the two long-arm readings and divide by 2.');
    r = Calc.compare(num(c.avgS), e.avgS, t.avg);
    r === 'ok' ? good('avgS') : bad('avgS', 'Average short arm: add the two short-arm readings and divide by 2' + (e.telo ? ' (both are 0 here)' : '') + '.');
    if (e.telo) {
      if (isNA(c.ar)) good('ar'); else bad('ar', 'AR cannot be calculated: the short arm is absent, and dividing by zero is undefined. Enter “n/a”.');
    } else {
      r = Calc.compare(num(c.ar), e.ar, t.ar);
      r === 'ok' ? good('ar') : bad('ar', 'Arm ratio = average long arm ÷ average short arm' + (r === 'high' || r === 'low' ? ' (your value is ' + (r === 'high' ? 'too high' : 'too low') + ').' : '.'));
    }
    r = Calc.compare(num(c.ci), e.ci, t.ci);
    r === 'ok' ? good('ci') : bad('ci', 'Centromeric index (long-arm CI) = long arm ÷ total chromosome length (long + short) × 100' + (r === 'high' || r === 'low' ? ' (your value is ' + (r === 'high' ? 'too high' : 'too low') + ').' : '.'));
    r = Calc.compare(num(c.rl), e.rl, t.rl);
    r === 'ok' ? good('rl') : bad('rl', 'Relative length = average chromosome length ÷ haploid total × 100, where the haploid total is half the diploid sum' + (r === 'high' || r === 'low' ? ' (your value is ' + (r === 'high' ? 'too high' : 'too low') + ').' : '.'));
    return out;
  }

  /* --------------------------------------------------------- measuring UI */
  /** Mount the measure + calculate workspace. M = lab8.measure store; onChange(); onProgress(doneCount) */
  function mountMeasure(root, M, ctx, onChange) {
    const required = CFG.requiredPairs, haploid = K0.haploidTotal;
    let cur = required[0];
    const rec = id => M[id] || (M[id] = { v: {}, c: {}, accepted: false, calcOk: false });
    const doneCount = () => required.filter(id => M[id] && M[id].calcOk).length;

    function pairSVG(id, marker) {
      const [a, b] = homologs(id);
      const H = Math.max(a.T, b.T) * SCALE + Y0 + 30;
      let v = '<svg class="meas-svg" viewBox="0 0 330 ' + H + '" width="330" height="' + H + '" role="img" aria-label="Homologous chromosomes with scale">';
      v += '<rect width="330" height="' + H + '" fill="#f7f4ee" rx="8"/>';
      for (let u = 0; u <= 10; u += 0.5) {
        const y = Y0 + u * SCALE, big = Number.isInteger(u);
        if (y > H - 14) break;
        v += '<line x1="' + (big ? 24 : 32) + '" y1="' + y + '" x2="44" y2="' + y + '" stroke="#233a5c" stroke-width="' + (big ? 1.4 : 1) + '"/>';
        if (big) v += '<text x="18" y="' + (y + 4) + '" font-size="11" fill="#233a5c" text-anchor="end">' + u + '</text>';
      }
      v += '<line x1="44" y1="' + Y0 + '" x2="44" y2="' + (H - 18) + '" stroke="#233a5c" stroke-width="1.6"/><text x="8" y="12" font-size="10" fill="#6b7a90">µm (sim.)</text>';
      [[a, 130, 'A'], [b, 220, 'B']].forEach(([c, x, lab]) => {
        const g = KL.Karyo.chromGeom(c, SCALE);
        v += '<g transform="translate(' + (x - g.cx) + ' ' + (Y0 - 2) + ')">' + g.inner + '</g><text x="' + x + '" y="' + (H - 6) + '" font-size="12" fill="#233a5c" text-anchor="middle" font-weight="700">' + lab + '</text>';
      });
      v += '<g class="marker-line" transform="translate(0 ' + marker + ')"><line x1="46" y1="0" x2="290" y2="0" stroke="#e5484d" stroke-width="1.6"/><rect x="262" y="-11" width="62" height="22" rx="4" fill="#e5484d"/><text x="293" y="4" font-size="11.5" fill="#fff" text-anchor="middle" font-weight="700" class="marker-read"></text><rect x="46" y="-14" width="212" height="28" fill="transparent" class="marker-grab"/></g>';
      return v + '</svg>';
    }

    function render() {
      const r = rec(cur);
      const list = pairs().map(id => '<button class="pbtn' + (id === cur ? ' on' : '') + (M[id] && M[id].calcOk ? ' done' : '') + '" data-pair="' + id + '">' + id + (required.indexOf(id) >= 0 ? '<sup>★</sup>' : '') + (M[id] && M[id].calcOk ? ' ✓' : '') + '</button>').join('');
      const tele = !!homologs(cur)[0].S === false;
      root.innerHTML =
        '<div class="meas-top"><p class="task-prompt">Select a pair (★ = required: ' + required.length + ' pairs; ' + doneCount() + ' complete). Drag the red marker along the scale to read each arm. Zero is the top end of the short arm / top of the chromosome.</p><div class="pgrid">' + list + '</div></div>' +
        '<div class="meas-grid"><div class="meas-left">' + pairSVG(cur, Y0) + '<div class="marker-info">Marker reading: <strong id="mk-val">0.00</strong> µm (sim.)</div></div>' +
        '<div class="meas-right"><h4>1 · Measure pair ' + cur + '</h4>' +
        '<div class="mfields">' + [['La', 'Long arm — A'], ['Sa', 'Short arm — A'], ['Lb', 'Long arm — B'], ['Sb', 'Short arm — B']].map(([k, l]) => '<label class="mf ' + (r.fv && r.fv[k] ? r.fv[k] : '') + '"><span>' + l + '</span><input type="number" step="0.05" min="0" data-m="' + k + '" value="' + esc(r.v[k] == null ? '' : r.v[k]) + '" ' + (r.accepted ? 'disabled' : '') + '></label>').join('') + '</div>' +
        (r.accepted ? '<p class="ok-line">✓ Measurements accepted</p>' : '<button class="btn primary" data-act="chkm">Check measurements</button>') +
        '<h4>2 · Calculate</h4><div class="formula">AR = avg long arm ÷ avg short arm<br>CI (long arm) = long arm ÷ (long + short) × 100<br>RL = avg chromosome length ÷ haploid total × 100<br><small>Haploid total = ½ × sum of all 42 chromosome lengths = <strong>' + fmt(haploid, 2) + '</strong> µm (sim.; reference total for this cell)</small></div>' +
        '<div class="mfields">' + [['avgL', 'Average long arm'], ['avgS', 'Average short arm'], ['ar', 'Arm ratio (AR)'], ['ci', 'Long-arm CI (%)'], ['rl', 'Relative length (%)']].map(([k, l]) => '<label class="mf ' + (r.fc && r.fc[k] ? r.fc[k] : '') + '"><span>' + l + '</span><input type="text" inputmode="decimal" data-c="' + k + '" value="' + esc(r.c[k] == null ? '' : r.c[k]) + '" ' + (!r.accepted || r.calcOk ? 'disabled' : '') + '></label>').join('') + '</div>' +
        (r.calcOk ? '<p class="ok-line">✓ Calculations correct</p>' : '<button class="btn primary" data-act="chkc"' + (r.accepted ? '' : ' disabled') + '>Check calculations</button>') +
        '<div class="mfb" aria-live="polite"></div></div></div>';
      bindMarker();
    }

    function bindMarker() {
      const svg = root.querySelector('.meas-svg'), g = svg.querySelector('.marker-line'), read = svg.querySelector('.marker-read'), val = root.querySelector('#mk-val');
      const [a, b] = homologs(cur), maxY = Math.max(a.T, b.T) * SCALE + Y0 + 8;
      let y = +(root.dataset.mark || Y0);
      const set = ny => { y = Math.max(Y0 - 6, Math.min(maxY, ny)); root.dataset.mark = y; g.setAttribute('transform', 'translate(0 ' + y + ')'); const u = Math.round((y - Y0) / SCALE * 20) / 20; read.textContent = u.toFixed(2); val.textContent = u.toFixed(2); };
      set(y);
      const toY = e => { const r = svg.getBoundingClientRect(); return (e.clientY - r.top) / r.height * svg.viewBox.baseVal.height; };
      svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); set(toY(e)); const mv = ev => set(toY(ev)); const up = () => { svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); }; svg.addEventListener('pointermove', mv); svg.addEventListener('pointerup', up); });
    }

    const fb = (kind, html) => { const el = root.querySelector('.mfb'); if (el) { el.className = 'mfb fb ' + kind; el.innerHTML = html; } };

    root.addEventListener('click', e => {
      const p = e.target.closest('[data-pair]');
      if (p) { cur = p.dataset.pair; render(); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      const r = rec(cur);
      if (a.dataset.act === 'chkm') {
        root.querySelectorAll('[data-m]').forEach(i => { r.v[i.dataset.m] = i.value; });
        ctx.attempt();
        const res = checkMeasurements(cur, r.v); r.fv = {}; Object.keys(res.fields).forEach(k => { r.fv[k] = res.fields[k] === 'ok' ? 'ok' : 'bad'; });
        if (res.ok) { r.accepted = true; onChange(); render(); fb('ok', 'Measurements accepted. Now calculate the average arms, AR, CI and RL from <em>your</em> readings.'); }
        else { onChange(); render(); fb('sci', res.msgs.map(esc).join('<br>')); }
      } else if (a.dataset.act === 'chkc') {
        root.querySelectorAll('[data-c]').forEach(i => { r.c[i.dataset.c] = i.value; });
        ctx.attempt();
        const res = checkCalcs(r.v, r.c, haploid); r.fc = res.fields;
        if (res.ok) {
          r.calcOk = true; const e2 = res.e; r.res = { avgL: e2.avgL, avgS: e2.avgS, ar: e2.ar, ci: e2.ci, rl: e2.rl, telo: e2.telo };
          onChange(); render(); fb('ok', 'All calculations are correct for pair ' + cur + '.' + (res.e.telo ? ' Note: AR is undefined for a telocentric chromosome.' : ''));
          if (required.every(id => M[id] && M[id].calcOk)) ctx.complete('Measured and calculated ' + required.length + ' pairs.');
        } else { onChange(); render(); fb('sci', res.msgs.map(esc).join('<br>')); }
      }
    });
    render();
    return { render };
  }

  /* ------------------------------------------------------- classification */
  const CLASSES = ['Metacentric', 'Submetacentric', 'Acrocentric', 'Telocentric'];

  function mountClassify(root, M, C, ctx, onChange) {
    const req = CFG.requiredPairs;
    const rows = req.map(id => {
      const r = M[id] && M[id].res; if (!r) return '';
      const cls = C[id] || '';
      return '<tr data-row="' + id + '"><th>' + id + '</th><td>' + fmt(r.avgL, 2) + '</td><td>' + fmt(r.avgS, 2) + '</td><td>' + (r.telo ? 'n/a' : fmt(r.ar, 2)) + '</td><td>' + fmt(r.ci, 1) + '</td><td>' + (r.telo ? 'at the end' : 'internal') + '</td>' +
        '<td><select data-cls="' + id + '" aria-label="Class of pair ' + id + '"><option value="">— choose —</option>' + CLASSES.map(c => '<option' + (c === cls ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></td><td class="cres"></td></tr>';
    }).join('');
    root.innerHTML =
      '<div class="crit"><h4>Course criteria (simplified)</h4><table class="mini"><tr><th>Class</th><th>Arm ratio (AR)</th><th>Long-arm CI</th></tr><tr><td>Metacentric</td><td>1.0 – 1.5</td><td>50 – 60 %</td></tr><tr><td>Submetacentric</td><td>1.6 – 3.0</td><td>61 – 75 %</td></tr><tr><td>Acrocentric</td><td>3.1 and above</td><td>76 – 100 %</td></tr><tr><td>Telocentric</td><td colspan="2">centromere at the extreme end (short arm absent → AR not defined)</td></tr></table>' +
      '<p class="tiny">Boundary rule: AR is rounded to 1 decimal and CI to the nearest whole % before comparing, so there are no gaps between the ranges (e.g. 1.5 | 1.6, 3.0 | 3.1, 60 % | 61 %, 75 % | 76 %).</p></div>' +
      '<div class="tscroll"><table class="ctab"><thead><tr><th>Pair</th><th>Avg long arm</th><th>Avg short arm</th><th>AR</th><th>Long-arm CI %</th><th>Centromere</th><th>Your classification</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="task-actions"><button class="btn primary" data-act="chkcls">Check classification</button></div><div class="mfb" aria-live="polite"></div>';
    root.addEventListener('change', e => { const s = e.target.closest('[data-cls]'); if (s) { C[s.dataset.cls] = s.value; onChange(); } });
    root.addEventListener('click', e => {
      if (!e.target.closest('[data-act="chkcls"]')) return;
      const miss = req.filter(id => !C[id]); const fbEl = root.querySelector('.mfb');
      if (miss.length) { fbEl.className = 'mfb fb hint'; fbEl.textContent = 'Classify every pair first (missing: ' + miss.join(', ') + ').'; return; }
      ctx.attempt();
      let wrong = 0;
      req.forEach(id => {
        const r = M[id].res, want = Calc.classify(r.avgL, r.avgS), row = root.querySelector('[data-row="' + id + '"] .cres');
        if (C[id] === want.cls) row.innerHTML = '<span class="ok-line">✓ ' + esc(want.basis) + '</span>';
        else { wrong++; row.innerHTML = '<span class="bad-line">✗ Re-check the ' + (C[id] === 'Telocentric' || want.cls === 'Telocentric' ? 'centromere position (is there a short arm?)' : 'AR and long-arm CI against the criteria') + '.</span>'; }
      });
      if (!wrong) { fbEl.className = 'mfb fb ok'; fbEl.textContent = 'All classifications are correct. Telocentric chromosomes have their centromere at the end, so AR is not defined.'; ctx.complete('Classified ' + req.length + ' chromosome pairs.'); }
      else { fbEl.className = 'mfb fb sci'; fbEl.textContent = wrong + ' classification' + (wrong > 1 ? 's need' : ' needs') + ' another look. First decide whether a short arm exists; then use AR and CI with the ranges above.'; }
    });
  }

  KL.Measure = { SCALE, checkMeasurements, checkCalcs, expected, mountMeasure, mountClassify, CLASSES, fmt };
})();
