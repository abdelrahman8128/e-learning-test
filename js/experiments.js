/* =========================================================================
   experiments.js — the four urine tests: bench views, equipment handling,
   reagent addition, simulated reactions, and the shared heating station.
   ========================================================================= */
(function (L) {
  'use strict';

  var Exp = L.Exp = {};
  var UI = L.UI, Safety = L.Safety;
  var P = L.PROTOCOL;
  var URINE = '#f1cf5b';

  function S() { return L.S; }
  function def(exp) { return L.expDef(exp.id); }
  function sc() { return L.scenario(); }
  function isDone(exp, step) { return !!exp.steps[step]; }
  function done(exp, step) { exp.steps[step] = true; }
  Exp.isDone = isDone;
  Exp.done = done;

  Exp.stationExp = function (station) {
    if (station === 'hood') return L.exp('rothera');
    var d = L.EXPERIMENTS.filter(function (e) { return e.station === station; })[0];
    return d ? L.exp(d.id) : null;
  };

  Exp.nextStep = function (exp) {
    var steps = def(exp).steps;
    for (var i = 0; i < steps.length; i++) if (!exp.steps[steps[i].id]) return steps[i];
    return null;
  };

  /** Sequence guard: all `needed` steps must be done before `action`. */
  function seq(exp, needed, action, why) {
    for (var i = 0; i < needed.length; i++) {
      if (!isDone(exp, needed[i])) {
        var st = def(exp).steps.filter(function (s) { return s.id === needed[i]; })[0];
        Safety.tech({
          id: 'seq-' + exp.id + '-' + needed[i], cat: 'sequence', points: 3,
          title: 'Step out of sequence',
          action: 'You tried to ' + action + ' before completing the step: "' + st.text + '"',
          consequence: why || 'Following the approved order of steps is what makes the result valid and comparable.',
          fix: 'Complete that step first, then try again.'
        });
        return false;
      }
    }
    return true;
  }

  function blend(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  Exp.blend = blend;

  /* ------------------------------------------------------------------ */
  /* Simulated reaction appearance                                       */
  /* ------------------------------------------------------------------ */
  var HAY_FILL = { quarter: 3.75, half: 7.5, twothirds: 10, full: 15 };
  Exp.HAY_FILL = HAY_FILL;

  Exp.visual = function (exp) {
    var t = exp.tube, c = t.contents, v = { layers: [] }, s = sc(), now = Date.now();
    if (t.loc === 'broken' || t.loc === 'disposed') return null;
    if (t.washStage >= 1) {
      v.layers = t.washStage < 3 ? [{ from: 0, to: 0.6, color: '#dfe9f1', op: 0.6 }] : [];
      return v;
    }
    v.hot = t.temp >= 45;
    v.steam = t.temp >= 85;
    v.bubbles = t.temp >= 97 && Exp.Heating.isRunning(exp);
    v.holder = t.loc === 'holder';
    if (t.spoiled) {
      v.layers.push({ from: 0, to: 1.2, color: URINE, op: 0.6 });
      return v;
    }

    if (exp.id === 'albumin') {
      var u = c.urine || 0;
      if (u) v.layers.push({ from: 0, to: u, color: URINE });
      if (t.heatedOnce && t.turbidOnHeat) {
        var acidDone = (c.acetic || 0) >= 1;
        var show = s.albumin || !acidDone;
        if (show) v.turbid = { from: u * 0.45, to: u, op: s.albumin ? 0.88 : 0.6 };
      }
    } else if (exp.id === 'benedict') {
      var ur = c.urine || 0, bn = c.benedict || 0;
      if (ur && !bn) v.layers.push({ from: 0, to: ur, color: URINE });
      else if (!ur && bn) v.layers.push({ from: 0, to: bn, color: '#2f78c9' });
      else if (ur && bn && !t.mixed) {
        v.layers.push({ from: 0, to: ur, color: URINE });
        v.layers.push({ from: ur, to: ur + bn, color: '#2f78c9' });
      } else if (ur && bn) {
        var base = '#3f86bf';
        var lvl = L.BENEDICT_COLOURS[s.glucose];
        var f = s.glucose ? Math.min(1, t.boil / P.benedict.boilTarget) : 0;
        var col = s.glucose ? blend(base, lvl.hex, f) : '#2f78c9';
        v.layers.push({ from: 0, to: ur + bn, color: col });
        if (s.glucose && f > 0.3) {
          v.ppt = { color: lvl.pptHex, amt: Math.min(1, (f - 0.3) * 1.4) * (0.35 + s.glucose * 0.16) };
        }
      }
    } else if (exp.id === 'rothera') {
      var u3 = c.urine || 0;
      if (u3) v.layers.push({ from: 0, to: u3, color: t.mixed ? '#f4dc86' : URINE });
      if (c.rothera && !t.mixed) v.ppt = { color: '#f6f3ea', amt: 0.6 };
      if (t.layered) {
        var am = c.ammonia || 1;
        if (t.disturbed) {
          v.layers = [{ from: 0, to: u3 + am, color: s.ketones ? '#c7a6cf' : '#f1e6b0' }];
        } else {
          v.layers.push({ from: u3, to: u3 + am, color: '#eaf3fb', op: 0.7 });
          if (s.ketones) v.ring = { at: u3, color: '#7a2a9c', delay: -(now - t.layeredAt) };
        }
      }
    } else if (exp.id === 'hay') {
      var lv = HAY_FILL[c.fill] || 0;
      if (lv) v.layers.push({ from: 0, to: lv, color: URINE });
      if (c.sulfur) {
        var mode = t.disturbed ? 'scatter' : (s.bile ? 'sink' : 'float');
        v.sulfur = { level: lv, mode: mode, amt: t.sulfurAmt, delay: -(now - t.sulfurAt) };
      }
    }
    return v;
  };

  /** Has a time-based observation finished developing? */
  Exp.ready = function (exp) {
    var t = exp.tube, now = Date.now();
    if (exp.id === 'rothera') return t.layered && now - t.layeredAt > 3600;
    if (exp.id === 'hay') return !!t.sulfurAt && now - t.sulfurAt > 4200;
    return true;
  };

  /* ------------------------------------------------------------------ */
  /* Bench view                                                          */
  /* ------------------------------------------------------------------ */
  function tile(id, extra) {
    var r = L.REAGENTS[id], icon, label;
    if (id === 'holder') { icon = UI.icon.holder(); label = 'Test tube holder'; }
    else if (id === 'sample') { icon = UI.icon.cup(); label = 'Urine sample'; }
    else if (id === 'acetic') { icon = UI.icon.dropper(); label = r.label; }
    else if (r.kind === 'powder') { icon = UI.icon.jar(r.color); label = r.label; }
    else { icon = UI.icon.bottle(r.color, true); label = r.label; }
    return '<div class="tile' + (extra || '') + '" data-drag="' + id + '" data-label="' + UI.esc(label) + '" tabindex="0" role="button">' +
      icon + '<span>' + label + '</span>' + (r && r.hazard ? '<em class="haz">' + r.hazard + '</em>' : '') + '</div>';
  }

  var LOC_LABEL = { rack: 'standing in the rack', hand: 'held in your hand', holder: 'clamped in the test tube holder', broken: 'broken', disposed: 'disposed' };

  Exp.tubeMeta = function (exp) {
    var t = exp.tube, c = t.contents, bits = [];
    if (c.urine) bits.push(c.urine + ' mL urine');
    if (c.fill) bits.push('urine to ' + { quarter: '¼', half: '½', twothirds: '⅔', full: 'the brim' }[c.fill]);
    if (c.benedict) bits.push(c.benedict + ' mL Benedict\'s');
    if (c.acetic) bits.push(c.acetic + ' drop(s) acetic acid');
    if (c.rothera) bits.push('Rothera\'s reagent');
    if (c.ammonia) bits.push(c.ammonia + ' mL NH₄OH layer');
    if (c.sulfur) bits.push('sulfur powder');
    return '<div class="tube-meta"><div><strong>Location:</strong> ' + LOC_LABEL[t.loc] + '</div>' +
      '<div><strong>Contents:</strong> ' + (bits.length ? bits.join(', ') : 'empty (clean)') + '</div>' +
      '<div class="temp ' + (t.temp >= 45 ? 'is-hot' : '') + '" data-temp-of="' + exp.id + '">🌡 ' + Math.round(t.temp) + ' °C' + (t.temp >= 45 ? ' — HOT' : '') + '</div></div>';
  };

  Exp.view = function (station) {
    var exp = Exp.stationExp(station);
    var d = def(exp), idx = L.EXPERIMENTS.indexOf(d);
    if (S().phase === 'cleanup') return L.Cleanup.benchView(station, exp);
    if (idx > S().expIndex) {
      return '<div class="panel locked"><h2>' + L.STATIONS[station].name + '</h2><p>🔒 This workstation is for <strong>Experiment ' + d.num + ': ' + d.title + '</strong>.</p>' +
        '<p>Complete the experiments in order. Your current task is <strong>Experiment ' + (S().expIndex + 1) + '</strong> at ' +
        L.STATIONS[L.EXPERIMENTS[S().expIndex].station].name + '.</p></div>';
    }
    if (exp.done) return doneView(exp, station);
    if (exp.id === 'rothera') {
      if (station === 'bench3' && exp.tube.where !== 'bench3') {
        return '<div class="panel"><h2>Bench 3</h2><p>Your Rothera\'s tube is now in the rack at the <strong>' + L.STATIONS[exp.tube.where].name + '</strong>.</p></div>';
      }
      if (station === 'hood' && exp.tube.where !== 'hood') {
        return hoodShell(exp, '<div class="hood-empty"><p>The fume hood is ready for the layering step.</p><p>Prepare your tube at <strong>Bench 3</strong> (urine, Rothera\'s reagent, gentle mixing), stand it in the rack and walk here — the rack is carried with you.</p></div>');
      }
    }
    return benchHTML(exp, station);
  };

  function doneView(exp, station) {
    var d = def(exp);
    return '<div class="panel done-view"><h2>✔ Experiment ' + d.num + ' complete — ' + d.title + '</h2>' +
      '<div class="done-grid"><div class="tube-wrap static">' + UI.tubeSVG(Exp.visual(exp)) + '</div>' +
      '<div><p>' + d.notes + '</p><p>Interpretation score: <strong>' + exp.quiz.correct + ' / ' + exp.quiz.total + '</strong></p>' +
      (S().expIndex < 4 ? '<p class="next">Next: <strong>Experiment ' + (S().expIndex + 1) + '</strong> at ' + L.STATIONS[L.EXPERIMENTS[S().expIndex].station].name + ' (use the floor plan).</p>' : '') +
      '</div></div></div>';
  }

  function hoodShell(exp, inner, noHead) {
    var h = S().hood;
    return '<div class="bench hood-view" data-drop="bench">' +
      (noHead ? '' : '<div class="bench-head"><span class="exp-tag">Experiment 3 · Chemical fume hood</span><h2>Rothera\'s test — layering step</h2></div>') +
      '<div class="hood-frame sash-' + h.sash + (h.fan ? ' fan-on' : '') + '">' +
      '<div class="hood-top"><span class="fan-ind">' + (h.fan ? '🌀 Extraction ON — airflow OK' : '⛔ Extraction fan OFF') + '</span></div>' +
      '<div class="hood-glass"></div><div class="hood-airflow"><i></i><i></i><i></i></div>' + inner + '</div>' +
      '<div class="hood-ctrls"><div><strong>Extraction fan:</strong> ' +
      '<button class="btn sm ' + (h.fan ? 'on' : '') + '" data-act="hood-fan">' + (h.fan ? 'Turn fan OFF' : 'Turn fan ON') + '</button></div>' +
      '<div><strong>Sash:</strong> ' + ['open', 'working', 'closed'].map(function (s) {
        return '<button class="btn sm ' + (h.sash === s ? 'on' : '') + '" data-act="hood-sash" data-v="' + s + '">' +
          { open: 'Fully raised', working: 'Working height (lowered)', closed: 'Closed' }[s] + '</button>';
      }).join(' ') + '</div></div></div>';
  }

  function benchHTML(exp, station) {
    var d = def(exp), t = exp.tube, next = Exp.nextStep(exp);
    var isHood = station === 'hood';
    var tray = (isHood ? ['ammonia'] : d.reagents.slice()).map(function (id) { return tile(id); }).join('');
    if (d.hasBurner) tray += tile('holder', ' tool');
    var vis = Exp.visual(exp);

    var problem = '';
    if (t.spoiled) problem = 'The sample was lost (splashed / boiled over). Reset this experiment to start again with a fresh tube.';
    if (t.disturbed) problem = exp.id === 'hay' ? 'The surface was disturbed — the sulfur result is no longer valid. Reset and repeat the test.' : 'The layers have been disturbed — no clear interface remains. Reset and repeat the test.';
    var waiting = (exp.id === 'rothera' && t.layered && !t.disturbed && !Exp.ready(exp)) || (exp.id === 'hay' && t.sulfurAt && !t.disturbed && !Exp.ready(exp));

    var burner = '';
    if (d.hasBurner) {
      var b = S().burners[station];
      burner = '<div class="zone burner-zone" data-drop="burner"><div class="zone-ico">' + UI.icon.burner(b.lit) + '</div>' +
        '<div class="zone-lbl">Bunsen burner<br><small>' + (b.lit ? (b.air === 'open' ? 'Lit — blue flame' : 'Lit — yellow (air hole closed)') : 'Off') + '</small></div>' +
        (b.lit ? '<button class="btn sm danger" data-act="burner-off">Turn off gas</button>' : '<small class="tiny">Drag the tube (in its holder) here to heat</small>') + '</div>';
    }

    var work =
      '<div class="work">' +
      '<div class="zone rack-zone" data-drop="rack"><div class="zone-ico">' + UI.icon.rack(t.loc === 'rack' ? 1 : 0) + '</div><div class="zone-lbl">Test tube rack</div></div>' +
      '<div class="tube-zone"><div class="tube-wrap ' + (t.loc === 'holder' ? 'in-holder' : '') + '" data-drag="tube" data-drop="tube" data-label="Test tube" tabindex="0" role="button" aria-label="Your test tube">' +
      UI.tubeSVG(vis) + '</div>' + Exp.tubeMeta(exp) + '</div>' + burner + '</div>';

    var actions = [];
    actions.push('<button class="btn" data-act="mix-gentle">🔄 Mix gently</button>');
    actions.push('<button class="btn warn-outline" data-act="shake">↕ Shake vigorously</button>');
    if (t.loc !== 'hand') actions.push('<button class="btn" data-act="pickup">✋ Pick up tube by hand</button>');
    if (t.loc !== 'holder' && d.hasBurner) actions.push('<button class="btn" data-act="holder">🗜 Attach holder</button>');
    if (t.loc !== 'rack') actions.push('<button class="btn" data-act="to-rack">⬇ Stand tube in rack</button>');
    if (d.hasBurner) actions.push('<button class="btn" data-act="heat">🔥 Heat at burner</button>');
    if (exp.id === 'albumin') actions.push('<button class="btn" data-act="add" data-v="acetic">💧 Use acetic acid dropper</button>');
    actions.push('<button class="btn" data-act="wait">⏳ Wait</button>');
    actions.push('<button class="btn primary" data-act="observe"' + (waiting ? ' disabled' : '') + '>👁 Observe & record result</button>');

    var head =
      '<div class="bench-head"><span class="exp-tag">Experiment ' + d.num + ' · ' + L.STATIONS[station].name + '</span>' +
      '<h2>' + d.title + '</h2><p class="obj">' + d.objective + '</p></div>' +
      (next ? '<div class="step-banner"><span>Current step</span>' + next.text + '</div>' : '') +
      (problem ? '<div class="problem">⚠ ' + problem + ' <button class="btn sm danger" data-act="reset-exp">Reset experiment</button></div>' : '') +
      (waiting ? '<div class="waiting">⏳ Reaction developing — do not shake or disturb the tube…</div>' : '');

    var other =
      '<details class="other-actions"><summary>Other actions at this bench</summary><div>' +
      '<button class="btn sm" data-act="bad" data-v="smell">Smell the sample directly</button>' +
      '<button class="btn sm" data-act="bad" data-v="phone">Put your phone on the bench</button>' +
      '<button class="btn sm" data-act="bad" data-v="play">Play with a reagent bottle</button>' +
      '<button class="btn sm" data-act="bad" data-v="move">Carry a stock reagent to a friend\'s bench</button>' +
      '</div></details>';

    var body = head +
      '<div class="bench-grid"><div class="tray"><h3>Equipment & reagents</h3><div class="tiles">' + tray + '</div>' +
      '<p class="tiny">Drag an item onto the <strong>tube</strong> (or tap the item, then tap the tube). Glassware released outside the workstation falls and breaks.</p></div>' +
      work + '</div><div class="actions">' + actions.join('') + '</div>' + other;

    if (isHood) {
      return hoodShell(exp, '<div class="hood-inner">' + body + '</div>', true);
    }
    return '<div class="bench" data-drop="bench">' + body + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Interaction routing                                                 */
  /* ------------------------------------------------------------------ */
  function activeExp() {
    var exp = Exp.stationExp(S().station);
    if (!exp || S().phase !== 'lab') return null;
    if (L.EXPERIMENTS.indexOf(def(exp)) !== S().expIndex || exp.done) return null;
    if (exp.tube.where !== S().station) return null;
    return exp;
  }
  Exp.activeExp = activeExp;

  Exp.onDrop = function (dragId, dropId, info) {
    var exp = activeExp();
    if (!exp) return;
    if (!Safety.canAct()) return;
    var t = exp.tube;

    if (dragId === 'tube') {
      if (dropId === 'rack') return toRack(exp);
      if (dropId === 'burner') return toBurner(exp);
      if (dropId === 'tube') return;
      if (dropId === 'bench') {
        return Safety.flag({
          id: 'tube-flat', rule: 'glassware', cat: 'handling', severity: 'minor',
          title: 'Test tube laid flat on the bench',
          action: 'You put the test tube down on its side on the bench instead of standing it in the rack.',
          consequence: 'A tube lying on the bench rolls, spills its contents and falls off the edge.',
          fix: 'Always stand test tubes upright in the rack.'
        });
      }
      if (dropId === null && info && info.drag) {
        if (t.temp >= 45 && t.loc !== 'holder') return Exp.burn(exp, 'carry the hot tube');
        return L.Incident.breakTube(exp, 'dropped');
      }
      return;
    }
    if (dropId === 'tube') {
      if (dragId === 'holder') return attachHolder(exp);
      if (L.REAGENTS[dragId]) return addReagent(exp, dragId);
    }
    if (dragId === 'holder' && dropId !== 'tube') { UI.toast('Clamp the holder onto the <strong>tube</strong> (drop it on the tube).', 'info'); return; }
    if (L.REAGENTS[dragId]) {
      if (dropId === null && info && info.drag) {
        Safety.flag({
          id: 'move-reagent', rule: 'no_move_chem', cat: 'conduct', severity: 'minor',
          title: 'Reagent carried away from the workstation',
          action: 'You carried the ' + L.REAGENTS[dragId].label + ' away from the bench.',
          consequence: 'Moving reagents around the lab spreads spills and leaves other groups without them.',
          fix: 'Keep reagents in their place; bring the tube to the reagent, not the reagent around the room.'
        });
        return;
      }
      UI.toast('Drop the reagent onto the <strong>test tube</strong>.', 'info');
    }
  };

  Exp.act = function (name, el) {
    var exp = activeExp();
    if (name === 'reset-exp') return Exp.reset();
    if (name === 'hood-fan' || name === 'hood-sash') return hoodControl(name, el);
    if (name === 'burner-off') {
      var b = S().burners[S().station];
      if (b) { b.lit = false; L.Score.good('burner-off-' + S().station, 'Turned off the burner after use', 'heating'); UI.toast('Gas turned off at ' + L.STATIONS[S().station].name + '.', 'good'); }
      return;
    }
    if (!exp) return;
    if (!Safety.canAct()) return;
    switch (name) {
      case 'mix-gentle': return mix(exp, true);
      case 'shake': return mix(exp, false);
      case 'pickup': return pickUp(exp);
      case 'holder': return attachHolder(exp);
      case 'to-rack': return toRack(exp);
      case 'heat': return toBurner(exp);
      case 'add': return addReagent(exp, el.dataset.v);
      case 'wait': return wait(exp);
      case 'observe': return observe(exp);
      case 'bad': return badAction(exp, el.dataset.v);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Handling actions                                                    */
  /* ------------------------------------------------------------------ */
  function badTubeState(exp) {
    if (exp.tube.spoiled || exp.tube.disturbed) { UI.toast('This tube must be reset first (use “Reset experiment”).', 'warn'); return true; }
    return false;
  }

  Exp.burn = function (exp, context) {
    var e = L.Score.violation({
      id: 'hot-glass', rule: 'hot_glass', cat: 'handling', severity: 'major',
      title: 'Hand burn — hot glassware handled',
      action: 'You tried to ' + context + ' with your hand while it was still hot (' + Math.round(exp.tube.temp) + ' °C).',
      consequence: 'Hot glass looks the same as cold glass. Gloves give no thermal protection, so your fingers are burned and you drop the tube by reflex (simulated). First aid: cool the burn under running water and report it to the TA.',
      fix: 'Handle hot tubes only with a test tube holder and allow them to cool in the rack.'
    });
    if (e) {
      UI.warning(e, {
        anim: '<div class="burn-anim"><span class="hand">✋</span><span class="heat">♨</span></div>',
        button: 'Continue',
        onClose: function () { L.Incident.breakTube(exp, 'burn-drop'); }
      });
    }
    L.requestRender();
  };

  function pickUp(exp) {
    var t = exp.tube;
    if (t.temp >= 45) return Exp.burn(exp, 'pick up the tube');
    t.loc = 'hand';
    UI.toast('You are holding the tube by hand. Do not walk around with it — stand it in the rack when you move.', 'info');
  }

  function attachHolder(exp) {
    var t = exp.tube;
    if (!def(exp).hasBurner) { UI.toast('No heating is needed in this test — a holder is not required here.', 'info'); return; }
    if (badTubeState(exp)) return;
    if (t.loc === 'holder') { UI.toast('The tube is already in the holder.', 'info'); return; }
    if (t.loc === 'hand' && t.temp >= 45) return Exp.burn(exp, 'hold the tube');
    t.loc = 'holder';
    done(exp, 'holder');
    L.Score.good('holder-' + exp.id, 'Secured the test tube with a holder', 'handling');
    UI.toast('Tube clamped in the holder near its mouth (about 2–3 cm from the top).', 'good');
  }

  function toRack(exp) {
    var t = exp.tube;
    if (t.loc === 'rack') { UI.toast('The tube is already in the rack.', 'info'); return; }
    if (t.loc === 'hand' && t.temp >= 45) return Exp.burn(exp, 'move the hot tube');
    if (exp.id === 'benedict' && isDone(exp, 'holder') && t.heat >= 100 && !isDone(exp, 'heat') && t.boil > 0) {
      Safety.tech({
        id: 'benedict-short', cat: 'heating', points: 3,
        title: 'Boiling time too short',
        action: 'You stopped after only ' + Math.round(t.boil) + ' s of boiling (simulated); the protocol requires about 2 minutes.',
        consequence: 'Reduction of Cu²⁺ to Cu₂O needs sustained boiling — a short boil can give a false-negative or under-estimated colour.',
        fix: 'Return the tube to the burner and complete the 2-minute boil.'
      });
    }
    t.loc = 'rack';
    UI.toast('Tube stood upright in the rack.' + (t.temp >= 45 ? ' It is hot — leave it to cool.' : ''), 'good');
    if (exp.id === 'albumin' && isDone(exp, 'acid')) done(exp, 'rack');
  }

  function toBurner(exp) {
    if (!def(exp).hasBurner) {
      UI.toast('This test is performed without heating — there is no burner at this station.', 'info');
      return;
    }
    if (badTubeState(exp)) return;
    if (exp.tube.loc !== 'holder') {
      return Safety.flag({
        id: 'no-holder', rule: 'holder_heat', cat: 'heating', severity: 'critical',
        title: 'Heating without a test tube holder — stopped',
        action: 'You tried to put the test tube into the flame holding it directly with your fingers.',
        consequence: 'The glass becomes too hot to hold within seconds: you would be burned and drop the tube of hot liquid. Gloves melt or conduct heat.',
        fix: 'Drag the test tube holder onto the tube first, then bring it to the burner.'
      });
    }
    if (exp.id === 'albumin' && isDone(exp, 'heat')) { UI.toast('The heating step is complete — continue with the next step.', 'info'); return; }
    if (exp.id === 'benedict' && isDone(exp, 'heat')) { UI.toast('The 2-minute boil is complete — stand the tube in the rack to cool.', 'info'); return; }
    Exp.Heating.open(exp);
  }

  function mix(exp, gentle) {
    var t = exp.tube, s = sc();
    if (badTubeState(exp)) return;
    if (!Safety.requireGloves(gentle ? 'mix the tube' : 'shake the tube')) return;
    if (t.temp >= 45 && t.loc !== 'holder') return Exp.burn(exp, gentle ? 'mix the hot tube' : 'shake the hot tube');

    var shakeAfter = function (what, consequence) {
      return Safety.flag({
        id: 'shake-after-' + exp.id, rule: 'no_shake', cat: 'handling', severity: 'minor',
        title: 'Tube shaken after the reaction',
        action: 'You shook the test tube after ' + what + '.',
        consequence: consequence,
        fix: 'Leave the tube standing still in the rack and observe it.'
      });
    };

    if (exp.id === 'albumin') {
      if (isDone(exp, 'heat')) return shakeAfter('the heat/acid reaction', 'Shaking hot liquid can splash it out of the tube, and it disperses the coagulum so you cannot compare the heated upper part with the unheated lower part.');
      UI.toast('Mixing is not part of the heat test protocol.', 'info');
      return;
    }
    if (exp.id === 'benedict') {
      if (isDone(exp, 'heat')) return shakeAfter('boiling with Benedict\'s reagent', 'Shaking a tube of hot alkaline copper reagent can splash it onto you, and it resuspends the precipitate you need to observe.');
      if (!seq(exp, ['sample', 'benedict'], 'mix the tube', 'Both the urine and the Benedict\'s reagent must be in the tube before mixing.')) return;
      t.mixed = true; done(exp, 'mix');
      if (!gentle) {
        Safety.tech({ id: 'vigorous-' + exp.id, cat: 'handling', points: 2, title: 'Vigorous shaking is unnecessary',
          action: 'You shook the tube vigorously to mix it.',
          consequence: 'Gentle swirling or flicking mixes the contents just as well; vigorous shaking risks spilling reagent out of an unstoppered tube.',
          fix: 'Use gentle mixing.' });
      } else {
        L.Score.good('mix-' + exp.id, 'Mixed the sample and reagent gently before heating', 'sequence');
        UI.toast('Contents mixed gently — the solution is now uniformly blue.', 'good');
      }
      return;
    }
    if (exp.id === 'rothera') {
      if (t.layered) {
        t.disturbed = true;
        L.Score.technique({ id: 'layers-disturbed', cat: 'sequence', points: 5, title: 'Layers disturbed', action: 'The ammonium hydroxide layer was mixed into the urine.', rule: 'no_shake' });
        return Safety.flag({
          id: 'shake-layer', rule: 'no_shake', cat: 'handling', severity: 'minor',
          title: 'Tube ' + (gentle ? 'mixed' : 'shaken') + ' after layering — layers disturbed',
          action: 'You ' + (gentle ? 'mixed' : 'shook') + ' the tube after layering the ammonium hydroxide.',
          consequence: 'The two layers mix, so the interface where the purple ring forms is destroyed — the result can no longer be read. Shaking also releases ammonia vapour and can splash the alkaline solution.',
          fix: 'Reset the experiment and repeat it. After layering, leave the tube completely still.'
        });
      }
      if (!seq(exp, ['sample', 'rothera'], 'mix the tube', 'Rothera\'s reagent must be added to the urine before mixing to dissolve it.')) return;
      t.mixed = true; done(exp, 'mix');
      if (t.where === 'hood') done(exp, 'transfer');
      if (!gentle) {
        Safety.tech({ id: 'vigorous-' + exp.id, cat: 'handling', points: 2, title: 'Vigorous shaking is unnecessary',
          action: 'You shook the tube vigorously to dissolve the reagent.',
          consequence: 'Gentle mixing dissolves the reagent; vigorous shaking risks spilling the sample.', fix: 'Use gentle mixing.' });
      } else {
        L.Score.good('mix-' + exp.id, 'Mixed gently to dissolve Rothera\'s reagent', 'sequence');
        UI.toast('Reagent dissolved — the urine is saturated. Next: stand the tube in the rack and carry the rack to the fume hood.', 'good');
      }
      return;
    }
    if (exp.id === 'hay') {
      if (t.contents.sulfur) {
        t.disturbed = true;
        L.Score.technique({ id: 'hay-disturbed', cat: 'sequence', points: 5, title: 'Surface disturbed in Hay\'s test', action: 'The urine surface was agitated after adding sulfur.', rule: 'no_shake' });
        return Safety.flag({
          id: 'shake-hay', rule: 'no_shake', cat: 'handling', severity: 'minor',
          title: 'Tube ' + (gentle ? 'mixed' : 'shaken') + ' during Hay\'s test',
          action: 'You ' + (gentle ? 'mixed' : 'shook') + ' the tube after sprinkling sulfur powder on the surface.',
          consequence: 'Agitation pushes the sulfur below the surface mechanically, so it may sink even without bile salts — a false-positive result. The test depends only on surface tension.',
          fix: 'Reset the experiment and repeat it without shaking.'
        });
      }
      UI.toast('No mixing is needed in Hay\'s test.', 'info');
    }
  }

  function wait(exp) {
    var t = exp.tube;
    if (t.temp >= 45) UI.toast('Waiting… the tube is cooling (' + Math.round(t.temp) + ' °C).', 'info');
    else if (!Exp.ready(exp)) UI.toast('Waiting… leave the tube undisturbed.', 'info');
    else UI.toast('Nothing more to wait for — continue with the next step.', 'info');
  }

  var BAD = {
    smell: { id: 'smell', rule: 'no_smell', cat: 'conduct', severity: 'major', title: 'Sample smelled directly',
      action: 'You put your nose over the tube to smell the sample directly.',
      consequence: 'Inhaling directly from a tube exposes you to infectious aerosols and to irritant vapours (e.g. ammonia, acetic acid). Odour is never used as an identification method in this practical.',
      fix: 'Never smell chemicals or samples. Rely on the reaction you observe.' },
    phone: { id: 'phone', rule: 'belongings', cat: 'conduct', severity: 'minor', title: 'Personal item on the bench',
      action: 'You put your phone on the laboratory bench.',
      consequence: 'Personal items on the bench become contaminated with urine or reagents and are then carried to your face and home. They also clutter the working area.',
      fix: 'Keep personal belongings in the locker outside the laboratory.' },
    play: { id: 'play', rule: 'no_play', cat: 'conduct', severity: 'major', title: 'Playing with reagent containers',
      action: 'You spun and tossed a reagent bottle on the bench.',
      consequence: 'Dropped bottles break and spill reagents (corrosive, irritant) over you and the bench, and contaminated reagents ruin everyone\'s results.',
      fix: 'Handle reagent containers only when you need them, carefully and with both hands.' },
    move: { id: 'move-stock', rule: 'no_move_chem', cat: 'conduct', severity: 'minor', title: 'Chemicals moved unnecessarily',
      action: 'You carried a stock reagent bottle across the laboratory to a friend\'s bench.',
      consequence: 'Carrying stock bottles around the room risks collisions and spills, and the reagent goes missing from its designated place.',
      fix: 'Leave reagents at their station. Your friend should come to the reagent.' }
  };

  function badAction(exp, k) {
    var b = BAD[k];
    if (b) Safety.flag(b);
  }

  /* ------------------------------------------------------------------ */
  /* Reagents                                                            */
  /* ------------------------------------------------------------------ */
  var WRONG_WHY = {
    albumin: 'The heat test needs only urine, heat and 1% acetic acid.',
    benedict: 'Benedict\'s test uses only urine and Benedict\'s reagent.',
    rothera: 'Rothera\'s test uses Rothera\'s reagent and ammonium hydroxide.',
    hay: 'Hay\'s test uses only urine and sulfur powder.'
  };
  var USED_IN = { acetic: 'the heat test for albumin (Exp. 1)', benedict: 'the test for reducing sugars (Exp. 2)', rothera: 'the test for ketone bodies (Exp. 3)', ammonia: 'the layering step of Rothera\'s test (Exp. 3)', sulfur: 'Hay\'s test for bile salts (Exp. 4)' };

  function wrongQty(exp, id, what, given, wanted, why) {
    Safety.tech({
      id: 'qty-' + exp.id + '-' + id, cat: 'quantity', points: 3,
      title: 'Incorrect quantity',
      action: 'You measured ' + given + ' of ' + what + '; the protocol requires ' + wanted + '.',
      consequence: why,
      fix: 'The measurement was discarded — measure the correct quantity again.'
    });
  }

  function addReagent(exp, rid) {
    var t = exp.tube, c = t.contents, r = L.REAGENTS[rid];
    if (badTubeState(exp)) return;

    // Fume-hood-only reagent at an open bench
    if (rid === 'ammonia' && S().station !== 'hood') {
      return Safety.flag({
        id: 'ammonia-bench', rule: 'fume_hood', cat: 'fumehood', severity: 'major',
        title: 'Hazardous reagent outside the fume hood — stopped',
        action: 'You tried to use ammonium hydroxide at the open bench (' + L.STATIONS[S().station].name + ').',
        consequence: 'Strong ammonium hydroxide releases ammonia gas, which irritates the eyes and airways of everyone around the bench. It must be handled where the vapour is extracted.',
        fix: 'Finish the bench steps, stand the tube in the rack and carry the rack to the chemical fume hood.'
      });
    }
    if (!Safety.requireGloves('handle the ' + r.label.replace(/ \(.*\)/, ''))) return;

    if (!isCorrectForExp(exp, rid)) {
      return Safety.tech({
        id: 'wrong-reagent-' + exp.id + '-' + rid, cat: 'reagent', points: 4,
        title: 'Wrong reagent selected',
        action: 'You tried to add ' + r.label + ' during the ' + def(exp).title + '.',
        consequence: r.label + ' belongs to ' + (USED_IN[rid] || 'another test') + '. ' + WRONG_WHY[exp.id] + ' Adding it would invalidate the result.',
        fix: 'Select the correct reagent for this step.'
      });
    }
    REAGENT_HANDLERS[exp.id](exp, rid, t, c);
  }

  var CORRECT = { albumin: ['sample', 'acetic'], benedict: ['sample', 'benedict'], rothera: ['sample', 'rothera', 'ammonia'], hay: ['sample', 'sulfur'] };
  function isCorrectForExp(exp, rid) { return CORRECT[exp.id].indexOf(rid) !== -1; }

  var REAGENT_HANDLERS = {
    albumin: function (exp, rid, t, c) {
      if (rid === 'sample') {
        if (c.urine) return UI.toast('The tube already contains urine.', 'info');
        return UI.volume({
          title: 'Measure the urine sample', color: URINE, max: 10, step: 0.5,
          prompt: 'Draw up urine with the pipette and dispense it into the test tube.',
          hint: 'Protocol: 5–6 mL of urine.',
          onConfirm: function (v) {
            if (v < P.albumin.urineMin || v > P.albumin.urineMax) {
              return wrongQty(exp, 'urine', 'urine', v + ' mL', '5–6 mL',
                v < P.albumin.urineMin ? 'Too little urine leaves too short a column: you cannot heat the upper part while keeping the lower part as an unheated comparison.' :
                  'Too much urine fills the tube too high — boiling liquid can bump out of the mouth of the tube.');
            }
            c.urine = v; done(exp, 'sample');
            L.Score.good('qty-' + exp.id, 'Measured the correct urine volume', 'quantity');
            UI.toast(v + ' mL of urine transferred into the test tube.', 'good');
            L.requestRender();
          }
        });
      }
      if (rid === 'acetic') {
        if (!Safety.requireGoggles('handle 1% acetic acid', 'acid')) return;
        if (!seq(exp, ['heat'], 'add acetic acid', 'In this protocol the acid is added after heating: it dissolves any turbidity caused by phosphates or carbonates, so that only coagulated protein remains turbid.')) return;
        if (c.acetic) return UI.toast('Acetic acid has already been added.', 'info');
        return dropperModal(exp);
      }
    },

    benedict: function (exp, rid, t, c) {
      if (rid === 'sample') {
        if (c.urine) return UI.toast('The tube already contains urine.', 'info');
        return UI.volume({
          title: 'Measure the urine sample', color: URINE, max: 10, step: 0.5,
          prompt: 'Draw up urine and dispense it into the test tube.', hint: 'Protocol: 3 mL of urine.',
          onConfirm: function (v) {
            if (v !== P.benedict.urine) return wrongQty(exp, 'urine', 'urine', v + ' mL', P.benedict.urine + ' mL', 'The ratio of urine to Benedict\'s reagent determines how much copper is available — a wrong ratio changes the colour you will see and makes it non-comparable with the standard colour scale.');
            c.urine = v; done(exp, 'sample');
            L.Score.good('qty-' + exp.id + '-u', 'Measured 3 mL of urine', 'quantity');
            UI.toast('3 mL of urine transferred.', 'good');
            L.requestRender();
          }
        });
      }
      if (rid === 'benedict') {
        if (!seq(exp, ['sample'], 'add Benedict\'s reagent', 'This protocol adds the measured urine first and then the reagent.')) return;
        if (c.benedict) return UI.toast('Benedict\'s reagent has already been added.', 'info');
        return UI.volume({
          title: 'Measure Benedict\'s reagent', color: '#2f78c9', max: 10, step: 0.5,
          prompt: 'Draw up Benedict\'s reagent and add it to the urine.', hint: 'Protocol: 2 mL of Benedict\'s reagent.',
          onConfirm: function (v) {
            if (v !== P.benedict.benedict) return wrongQty(exp, 'benedict', 'Benedict\'s reagent', v + ' mL', P.benedict.benedict + ' mL', 'Too little reagent can be exhausted by a high sugar concentration; too much dilutes the colour change — either way the colour no longer matches the scale.');
            c.benedict = v; done(exp, 'benedict');
            L.Score.good('qty-' + exp.id + '-b', 'Measured 2 mL of Benedict\'s reagent', 'quantity');
            UI.toast('2 mL Benedict\'s reagent added. Mix gently before heating.', 'good');
            L.requestRender();
          }
        });
      }
    },

    rothera: function (exp, rid, t, c) {
      if (rid === 'sample') {
        if (c.urine) return UI.toast('The tube already contains urine.', 'info');
        return UI.volume({
          title: 'Measure the urine sample', color: URINE, max: 10, step: 0.5,
          prompt: 'Draw up urine and dispense it into the test tube.', hint: 'Protocol: 5 mL of urine.',
          onConfirm: function (v) {
            if (v !== P.rothera.urine) return wrongQty(exp, 'urine', 'urine', v + ' mL', P.rothera.urine + ' mL', 'The amount of Rothera\'s reagent in the manual is designed to saturate 5 mL of urine.');
            c.urine = v; done(exp, 'sample');
            L.Score.good('qty-' + exp.id + '-u', 'Measured 5 mL of urine', 'quantity');
            UI.toast('5 mL urine transferred.', 'good');
            L.requestRender();
          }
        });
      }
      if (rid === 'rothera') {
        if (!seq(exp, ['sample'], 'add Rothera\'s reagent', 'The reagent is dissolved in the measured urine.')) return;
        if (c.rothera) return UI.toast('Rothera\'s reagent has already been added.', 'info');
        return UI.choice({
          title: 'Add Rothera\'s reagent', prompt: 'How much Rothera\'s reagent (ammonium sulfate + sodium nitroprusside) do you add?',
          options: [
            { label: 'A tiny pinch (≈0.1 g)', value: 'pinch' },
            { label: 'About 1 g — one level spatula', value: 'one' },
            { label: 'A heaped scoop (≈5 g)', value: 'heap' }
          ],
          onPick: function (v) {
            if (v !== P.rothera.reagent) {
              return wrongQty(exp, 'rothera', 'Rothera\'s reagent', v === 'pinch' ? 'a tiny pinch' : 'a heaped scoop', P.rothera.reagentLabel,
                v === 'pinch' ? 'Too little reagent does not saturate the urine with ammonium sulfate and gives too little nitroprusside — a weak or false-negative ring.' :
                  'A large excess stays undissolved, wastes reagent and makes the layers cloudy so the ring is hard to see.');
            }
            c.rothera = 'one'; done(exp, 'rothera');
            L.Score.good('qty-' + exp.id + '-r', 'Added the correct amount of Rothera\'s reagent', 'quantity');
            UI.toast('Rothera\'s reagent added. Mix gently until it dissolves.', 'good');
            L.requestRender();
          }
        });
      }
      if (rid === 'ammonia') {
        if (!Safety.requireGoggles('handle ammonium hydroxide', 'hazard')) return;
        if (!seq(exp, ['sample', 'rothera', 'mix'], 'layer ammonium hydroxide', 'The urine must first be saturated with Rothera\'s reagent.')) return;
        var h = S().hood;
        if (!h.fan) {
          return Safety.flag({
            id: 'hood-fan-off', rule: 'fume_hood', cat: 'fumehood', severity: 'major',
            title: 'Fume hood extraction is OFF — stopped',
            action: 'You tried to open the ammonium hydroxide with the fume hood fan switched off.',
            consequence: 'Without extraction the hood is just a box: ammonia vapour accumulates and spills out toward your face.',
            fix: 'Turn the extraction fan ON and check the airflow indicator before opening the reagent.'
          });
        }
        if (h.sash === 'closed') return UI.toast('The sash is closed — raise it to working height to reach inside.', 'info');
        if (h.sash === 'open') {
          return Safety.flag({
            id: 'sash-open', rule: 'fume_hood', cat: 'fumehood', severity: 'minor',
            title: 'Sash fully raised',
            action: 'You tried to work in the fume hood with the sash fully raised.',
            consequence: 'A fully open sash lowers the face velocity so vapour can escape into your breathing zone, and removes the glass shield between your face and a splash.',
            fix: 'Lower the sash to the marked working height.'
          });
        }
        if (t.layered) return UI.toast('The ammonium hydroxide layer is already in place — do not add more.', 'info');
        return UI.volume({
          title: 'Measure ammonium hydroxide', color: '#d8e9fb', max: 5, step: 0.5,
          prompt: 'Draw up strong ammonium hydroxide with a pipette (inside the hood).', hint: 'Protocol: 1–2 mL, layered gently.',
          onConfirm: function (v) {
            if (v < P.rothera.ammoniaMin || v > P.rothera.ammoniaMax) {
              return wrongQty(exp, 'ammonia', 'ammonium hydroxide', v + ' mL', '1–2 mL',
                v < P.rothera.ammoniaMin ? 'Too thin a layer may not make the interface alkaline enough to develop the ring.' : 'Excess ammonia gives a thick layer that dilutes the interface and releases more vapour.');
            }
            setTimeout(function () { layerMethod(exp, v); }, 0);
          }
        });
      }
    },

    hay: function (exp, rid, t, c) {
      if (rid === 'sample') {
        if (c.fill) return UI.toast('The tube already contains urine.', 'info');
        return UI.choice({
          title: 'Fill the test tube with urine', prompt: 'How far do you fill the test tube?',
          options: [
            { label: 'About one-quarter full', value: 'quarter' },
            { label: 'About half full', value: 'half' },
            { label: 'About two-thirds full', value: 'twothirds' },
            { label: 'To the brim', value: 'full' }
          ],
          onPick: function (v) {
            if (v !== 'twothirds') {
              return wrongQty(exp, 'fill', 'urine', { quarter: 'one-quarter of the tube', half: 'half of the tube', full: 'the brim' }[v], 'about two-thirds of the tube',
                v === 'full' ? 'A brim-full tube spills when moved and the meniscus bulges, so powder runs off the surface.' : 'A low liquid level makes the sinking powder hard to see against the tube wall and the result is easy to misread.');
            }
            c.fill = 'twothirds'; done(exp, 'sample');
            L.Score.good('qty-hay', 'Filled the tube to two-thirds', 'quantity');
            UI.toast('Tube filled to about two-thirds with urine.', 'good');
            L.requestRender();
          }
        });
      }
      if (rid === 'sulfur') {
        if (!seq(exp, ['sample'], 'add sulfur powder', 'The urine must be in the tube and settled before the powder is sprinkled on its surface.')) return;
        if (c.sulfur) return UI.toast('Sulfur has already been added. Wait and observe — do not shake.', 'info');
        return UI.choice({
          title: 'Add sulfur powder', prompt: 'How do you add the sulfur powder?',
          options: [
            { label: 'Sprinkle a small pinch lightly over the surface', value: 'pinch' },
            { label: 'Tip a heaped spatula of powder in at once', value: 'heap' },
            { label: 'Sprinkle a pinch, then stir it in with a glass rod', value: 'stir' }
          ],
          onPick: function (v) {
            if (v === 'heap') {
              return wrongQty(exp, 'sulfur', 'sulfur powder', 'a heaped spatula', 'a small pinch sprinkled on the surface',
                'A heap of powder forms clumps that sink under their own weight even in normal urine — a false-positive result.');
            }
            if (v === 'stir') {
              return Safety.tech({ id: 'hay-stir', cat: 'sequence', points: 3, title: 'Powder stirred in', rule: 'no_shake',
                action: 'You planned to stir the sulfur into the urine.',
                consequence: 'Stirring breaks the surface film and pushes the powder down mechanically — the test only works if surface tension alone decides whether the powder sinks.',
                fix: 'Sprinkle a small pinch onto the surface and leave the tube completely still.' });
            }
            c.sulfur = true; t.sulfurAmt = 'small'; t.sulfurAt = Date.now(); done(exp, 'sulfur');
            L.Score.good('sulfur', 'Sprinkled a small quantity of sulfur without disturbing the surface', 'quantity');
            UI.toast('Sulfur sprinkled onto the surface. Leave the tube still and watch the powder.', 'good');
            L.requestRender();
          }
        });
      }
    }
  };

  function layerMethod(exp, vol) {
    UI.choice({
      title: 'Add the ammonium hydroxide', prompt: 'How do you add the ' + vol + ' mL of ammonium hydroxide?',
      options: [
        { label: 'Tilt the tube and run it slowly down the inside wall', desc: 'so it floats as a separate layer', value: 'wall' },
        { label: 'Squirt it quickly into the centre of the tube', value: 'squirt' },
        { label: 'Add it, then invert the tube to mix', value: 'invert' }
      ],
      onPick: function (m) {
        var t = exp.tube;
        t.contents.ammonia = vol; t.layered = true; t.layeredAt = Date.now(); t.layerMethod = m;
        done(exp, 'ammonia');
        if (m !== 'wall') {
          t.disturbed = true;
          Safety.tech({
            id: 'layer-method', cat: 'sequence', points: 4, rule: 'no_shake',
            title: m === 'invert' ? 'Tube inverted — no layers formed' : 'Reagent added too fast — layers mixed',
            action: m === 'invert' ? 'You inverted the tube after adding ammonium hydroxide.' : 'You squirted the ammonium hydroxide straight into the urine.',
            consequence: 'Rothera\'s test is read at the interface between two separate layers. Without a sharp interface the purple ring cannot form or be seen.',
            fix: 'Reset the experiment and run the ammonium hydroxide slowly down the inside wall of the tilted tube.', modal: true
          });
        } else {
          L.Score.good('layer', 'Layered ammonium hydroxide carefully down the wall in the fume hood', 'fumehood');
          UI.toast('A clear ammonia layer floats on the urine. Leave the tube still and watch the interface.', 'good');
        }
        L.requestRender();
      }
    });
  }

  function dropperModal(exp) {
    var drops = 0;
    UI.modal({
      title: '1% acetic acid — dropper', cls: 'dropper-modal', dismiss: false,
      body: '<p>Squeeze the bulb gently to release one drop at a time into the tube. Protocol: <strong>2 drops</strong>.</p>' +
        '<div class="dropper-stage"><div class="dropper-big">' + UI.icon.dropper() + '<span class="drop"></span></div>' +
        '<div class="mini-tube">' + UI.tubeSVG(Exp.visual(exp)) + '</div></div>' +
        '<p class="drop-count">Drops added: <strong>0</strong></p>' +
        '<button class="btn" id="squeeze">💧 Squeeze bulb (1 drop)</button>',
      buttons: [{ label: 'Finished adding acid', cls: 'primary', onClick: function () {
        if (!drops) { UI.toast('No acid added yet.', 'info'); return false; }
        var t = exp.tube;
        t.contents.acetic = drops; done(exp, 'acid');
        if (t.loc === 'rack') done(exp, 'rack');
        if (drops !== P.albumin.aceticDrops) {
          wrongQty(exp, 'acetic', '1% acetic acid', drops + ' drop(s)', '2 drops',
            drops < 2 ? 'Too little acid may not dissolve phosphate turbidity, which could be mistaken for protein.' : 'Excess acid can partially redissolve coagulated protein and weaken a true positive.');
          // the acid cannot be removed — the result is still shown (controlled scenario)
        } else {
          L.Score.good('acetic', 'Added exactly 2 drops of acetic acid after heating', 'quantity');
        }
        var s = sc();
        UI.toast(t.turbidOnHeat ? (s.albumin ? 'The turbidity persists after adding acid.' : 'The turbidity disappeared after adding acid.') : 'The tube remains clear after adding acid.', 'info', 5000);
        if (t.loc !== 'rack') UI.toast('When the tube is safe to handle, stand it in the rack (still using the holder).', 'info');
      } }],
      onOpen: function (w) {
        UI.$('#squeeze', w).addEventListener('click', function () {
          drops++;
          UI.$('.drop-count strong', w).textContent = drops;
          var d = UI.$('.drop', w);
          d.classList.remove('falling'); void d.offsetWidth; d.classList.add('falling');
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Fume hood controls                                                  */
  /* ------------------------------------------------------------------ */
  function hoodControl(name, el) {
    var h = S().hood;
    if (S().station !== 'hood') return;
    if (name === 'hood-fan') h.fan = !h.fan;
    else h.sash = el.dataset.v;
    Exp.syncHood(true);
  }

  /** The 'hood' step is done whenever the hood is correctly set while the tube is in it. */
  Exp.syncHood = function (announce) {
    var h = S().hood, exp = L.exp('rothera');
    if (S().phase !== 'lab' || exp.done || exp.tube.layered) return;
    var ok = h.fan && h.sash === 'working';
    if (ok && exp.tube.where === 'hood' && !isDone(exp, 'hood')) {
      done(exp, 'hood');
      L.Score.good('hood-ready', 'Prepared the fume hood correctly (fan on, sash at working height)', 'fumehood');
      if (announce) UI.toast('Fume hood ready: extraction on, sash at working height.', 'good');
    } else if (!ok) {
      delete exp.steps.hood;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Observation                                                         */
  /* ------------------------------------------------------------------ */
  function observe(exp) {
    var t = exp.tube;
    if (badTubeState(exp)) return;
    if (exp.id === 'albumin') {
      if (!seq(exp, ['sample', 'heat', 'acid'], 'record the result', 'The result is read after heating and adding acetic acid.')) return;
      if (t.loc !== 'rack') {
        return Safety.tech({ id: 'obs-rack-albumin', cat: 'handling', points: 2, title: 'Stand the tube in the rack first',
          action: 'You tried to inspect the result while still holding the tube.',
          consequence: 'The tube should be stood safely in the rack once it is safe to handle; then inspect it against a dark background.',
          fix: 'Drag the tube (in its holder) onto the rack.' });
      }
      done(exp, 'rack');
    } else if (exp.id === 'benedict') {
      if (!seq(exp, ['sample', 'benedict', 'mix', 'heat'], 'record the result', 'The colour is read only after 2 minutes of boiling.')) return;
      if (t.loc !== 'rack' || t.temp >= 40) {
        return Safety.tech({ id: 'obs-cool', cat: 'handling', points: 2, title: 'Allow the tube to cool first',
          action: 'You tried to inspect the tube while it is ' + (t.loc !== 'rack' ? 'not yet in the rack' : 'still hot (' + Math.round(t.temp) + ' °C)') + '.',
          consequence: 'Hot glass must not be handled, and the precipitate settles as the tube cools, making the colour easier to judge.',
          fix: 'Stand the tube in the rack and wait until it has cooled.' });
      }
      done(exp, 'cool');
    } else if (exp.id === 'rothera') {
      if (!seq(exp, ['sample', 'rothera', 'mix', 'transfer', 'hood', 'ammonia'], 'record the result', 'The ring is read after layering in the fume hood.')) return;
      if (!Exp.ready(exp)) return UI.toast('The ring takes a moment to develop — wait without disturbing the tube.', 'info');
    } else if (exp.id === 'hay') {
      if (!seq(exp, ['sample', 'sulfur'], 'record the result', 'Sulfur must be sprinkled on the surface first.')) return;
      if (!Exp.ready(exp)) return UI.toast('Watch the powder for a moment longer — do not shake.', 'info');
    }
    done(exp, 'observe');
    L.Quiz.open(exp);
  }

  /* ------------------------------------------------------------------ */
  /* Reset                                                               */
  /* ------------------------------------------------------------------ */
  Exp.reset = function (silent) {
    var exp = L.currentExp();
    if (!exp || S().phase !== 'lab') return;
    if (S().incident && S().incident.stage !== 'cleared') { UI.toast('Resolve the broken-glass incident first.', 'warn'); return; }
    if (Exp.Heating.isRunning(exp)) return;
    var d = def(exp);
    var fresh = L.newExp(d);
    fresh.resets = exp.resets + (silent ? 0 : 1);
    S().exps[S().expIndex] = fresh;
    if (!silent) {
      L.Score.info('Experiment reset', 'Experiment ' + d.num + ' was reset with a fresh tube.');
      UI.toast('Experiment ' + d.num + ' reset — fresh clean tube in the rack at ' + L.STATIONS[d.station].name + '.', 'info');
    }
    L.requestRender();
  };

  /* ------------------------------------------------------------------ */
  /* Time-based updates (called by the global ticker)                    */
  /* ------------------------------------------------------------------ */
  Exp.tick = function (dt) {
    var changed = false;
    S().exps.forEach(function (e) {
      var t = e.tube;
      if (Exp.Heating.isRunning(e)) return;
      if (t.temp > 22.5) {
        var before = t.temp;
        t.temp = 22 + (t.temp - 22) * Math.exp(-dt / 5.5);
        if ((before >= 45) !== (t.temp >= 45) || (before >= 85) !== (t.temp >= 85) || (before >= 40) !== (t.temp >= 40)) changed = true;
        var el = document.querySelector('[data-temp-of="' + e.id + '"]');
        if (el) el.textContent = '🌡 ' + Math.round(t.temp) + ' °C' + (t.temp >= 45 ? ' — HOT' : '');
      }
      if (S().phase === 'lab' && e.id === 'benedict' && isDone(e, 'heat') && !isDone(e, 'cool') && t.loc === 'rack' && t.temp < 40) {
        done(e, 'cool');
        L.Score.good('cooled', 'Allowed the tube to cool in the rack before handling', 'handling');
        UI.toast('The Benedict\'s tube has cooled. You can now observe the result.', 'good');
        changed = true;
      }
      if ((e.id === 'rothera' || e.id === 'hay') && !e.flags.readyShown && Exp.ready(e) && !e.done) {
        if ((e.id === 'rothera' && e.tube.layered) || (e.id === 'hay' && e.tube.sulfurAt)) {
          e.flags.readyShown = true; changed = true;
        }
      }
    });
    if (changed) L.requestRender();
  };

  /* ================================================================== */
  /* Heating station                                                     */
  /* ================================================================== */
  var Heating = Exp.Heating = { H: null };

  Heating.isRunning = function (exp) {
    var H = Heating.H;
    return !!(H && H.running && (!exp || H.exp === exp));
  };

  var ZONES = [
    { id: 'top', y: 70, h: 46, label: 'Top of the flame' },
    { id: 'tip', y: 116, h: 28, label: 'Just above the inner blue cone' },
    { id: 'inner', y: 146, h: 56, label: 'Inside the inner cone' }
  ];
  var DIRS = [
    { id: 'self', label: 'Toward yourself', x: 110, y: 140 },
    { id: 'side', label: 'Toward your lab partner', x: 32, y: 86 },
    { id: 'opposite', label: 'Toward the student opposite', x: 110, y: 30 },
    { id: 'away', label: 'Away from everyone (toward the empty back wall)', x: 190, y: 86 }
  ];

  Heating.open = function (exp) {
    var station = S().station;
    var t = exp.tube;
    var H = Heating.H = {
      exp: exp, burner: S().burners[station], zone: null, angle: 90, dir: null,
      moving: false, running: false, hotspot: 0, warnedUneven: false, said: {}
    };
    // resume from the tube's current temperature
    t.heat = Math.min(t.heat, Math.max(0, (t.temp - 22) / 0.78));
    UI.modal({
      title: '🔥 Heating station — ' + def(exp).title, cls: 'heat-modal',
      body: '<div class="heat-grid"><div class="heat-side" id="h-side"></div>' +
        '<div class="heat-ctrl">' +
        '<fieldset><legend>1 · Burner</legend><div class="row">' +
        '<button class="btn sm" id="h-lit"></button>' +
        '<span>Air hole:</span><button class="btn sm" data-air="closed">Closed</button><button class="btn sm" data-air="open">Open</button></div>' +
        '<small class="tiny">Open air hole → blue, non-luminous flame. Closed → yellow, luminous (safety) flame.</small></fieldset>' +
        '<fieldset><legend>2 · Flame region</legend><div class="row wrap">' +
        ZONES.map(function (z) { return '<button class="btn sm" data-zone="' + z.id + '">' + z.label + '</button>'; }).join('') +
        '</div><small class="tiny">You can also click a region on the flame.</small></fieldset>' +
        '<fieldset><legend>3 · Tube angle (from the bench)</legend><div class="row"><input type="range" id="h-angle" min="20" max="90" step="5" value="90" aria-label="Tube angle"><output id="h-angle-out">90°</output></div></fieldset>' +
        '<fieldset><legend>4 · Direction of the tube opening</legend><div class="dir-wrap"><div id="h-top"></div><div class="dir-btns">' +
        DIRS.map(function (d) { return '<button class="btn sm" data-dir="' + d.id + '">' + d.label + '</button>'; }).join('') +
        '</div></div></fieldset>' +
        '<fieldset><legend>5 · Technique</legend><label class="switch"><input type="checkbox" id="h-move"> <span>Move the tube gently back and forth through the flame</span></label></fieldset>' +
        '<div class="row heat-go"><button class="btn primary" id="h-start">▶ Start heating</button><button class="btn" id="h-stop">■ Remove from flame</button></div>' +
        '<div class="heat-status"><div>Temperature: <strong id="h-temp">' + Math.round(t.temp) + ' °C</strong></div>' +
        '<div class="meter"><span>Heating</span><div class="bar"><i id="h-prog"></i></div></div>' +
        (exp.id === 'benedict' ? '<div>Boiling time (simulated, ×' + P.simSecondsPerRealSecond + '): <strong id="h-boil">0:00</strong> / 2:00</div>' : '') +
        '<div class="meter hotspot"><span>Hot-spot risk</span><div class="bar"><i id="h-hot"></i></div></div>' +
        '<div id="h-msg" class="h-msg">Set up the burner and tube, then start heating.</div></div>' +
        '</div></div>',
      buttons: [{ label: 'Finish & return to bench', cls: 'primary' }],
      onOpen: function (w) { H.el = w; bind(w); draw(); updateLive(); },
      onClose: function () { Heating.stop(true); Heating.H = null; }
    });
  };

  function bind(w) {
    var H = Heating.H;
    UI.$('#h-lit', w).addEventListener('click', function () {
      H.burner.lit = !H.burner.lit;
      if (!H.burner.lit && H.running) Heating.stop(false, 'Burner turned off.');
      draw();
    });
    UI.$$('[data-air]', w).forEach(function (b) {
      b.addEventListener('click', function () { H.burner.air = b.dataset.air; changed(); });
    });
    w.addEventListener('click', function (e) {
      var z = e.target.closest('[data-zone]');
      if (z) { H.zone = z.dataset.zone; changed(); }
      var d = e.target.closest('[data-dir]');
      if (d) { H.dir = d.dataset.dir; changed(); }
    });
    var ang = UI.$('#h-angle', w);
    ang.addEventListener('input', function () { H.angle = +ang.value; UI.$('#h-angle-out', w).textContent = H.angle + '°'; draw(); });
    ang.addEventListener('change', function () { changed(); });
    UI.$('#h-move', w).addEventListener('change', function (e) { H.moving = e.target.checked; draw(); });
    UI.$('#h-start', w).addEventListener('click', Heating.start);
    UI.$('#h-stop', w).addEventListener('click', function () { Heating.stop(false); });
  }

  /** A control changed: redraw and, if heating, re-check safety live. */
  function changed() {
    var H = Heating.H;
    draw();
    if (H.running && !preflight(true)) Heating.stop(false);
    draw();
  }

  /** All checks before (and during) heating. Returns true if heating may proceed. */
  function preflight(live) {
    var H = Heating.H, exp = H.exp, t = exp.tube;
    if (!live) {
      if (!Safety.requirePPE('heat a test tube', 'heating')) return false;
      if (t.loc !== 'holder') {
        return Safety.flag({
          id: 'no-holder', rule: 'holder_heat', cat: 'heating', severity: 'critical',
          title: 'Heating without a test tube holder — stopped',
          action: 'You tried to heat the tube without clamping it in a test tube holder.',
          consequence: 'The glass becomes too hot to hold within seconds: you would be burned and drop the tube of hot liquid.',
          fix: 'Close the heating station, attach the holder, then return.'
        });
      }
      if (exp.id === 'albumin' && !seq(exp, ['sample'], 'heat the tube', 'There is no urine in the tube yet.')) return false;
      if (exp.id === 'benedict' && !seq(exp, ['sample', 'benedict', 'mix'], 'heat the tube', 'The urine and Benedict\'s reagent must be mixed before heating so that the sugar reacts evenly with the copper reagent.')) return false;
    }
    if (!H.burner.lit) { msg('Light the burner first.'); return false; }
    if (!H.dir) { msg('Choose where the opening of the tube points.'); return false; }
    if (H.dir !== 'away') {
      var who = { self: 'yourself', side: 'your lab partner', opposite: 'the student across the bench' }[H.dir];
      return Safety.flag({
        id: 'point-' + H.dir, rule: 'point_away', cat: 'heating', severity: 'critical',
        title: 'Tube opening pointed at a person — procedure stopped',
        action: 'The opening of the heated tube is pointing toward ' + who + (live ? ' while it is in the flame.' : '.'),
        consequence: 'If the liquid bumps, boiling urine (or hot alkaline reagent) is ejected straight out of the mouth of the tube into ' + (H.dir === 'self' ? 'your' : 'their') + ' face and eyes.',
        fix: 'Turn the tube so that its opening points away from yourself and everyone else (toward the empty back wall).'
      });
    }
    if (H.angle >= 80) {
      return Safety.flag({
        id: 'angle-vertical', rule: 'angle', cat: 'heating', severity: 'major',
        title: 'Tube held vertically (' + H.angle + '°)',
        action: 'You are heating the tube straight up and down at ' + H.angle + '° instead of about 45°.',
        consequence: 'In a vertical tube the heat is concentrated at the bottom under a tall column of liquid: a vapour bubble forms and pushes the liquid up and out of the tube (bumping, boiling over, splashing).',
        fix: 'Tilt the tube to about 45° using the angle slider.'
      });
    }
    if (H.angle < 35 || H.angle > 60) {
      Safety.tech({ id: 'angle-off', rule: 'angle', cat: 'heating', points: 2, title: 'Adjust the tube angle',
        action: 'You are holding the tube at ' + H.angle + '°.',
        consequence: H.angle < 35 ? 'Almost horizontal, the liquid reaches the mouth of the tube and can pour out.' : 'Too steep: heat concentrates at the bottom and the liquid may bump.',
        fix: 'Hold the tube at approximately 45°.' });
      return false;
    }
    if (H.burner.air !== 'open') {
      Safety.tech({ id: 'flame-luminous', rule: 'flame_zone', cat: 'heating', points: 2, title: 'Luminous (yellow) flame',
        action: 'You are trying to heat in the yellow, luminous flame with the air hole closed.',
        consequence: 'The luminous flame is cooler, unsteady and deposits soot on the tube, which heats it unevenly and hides the contents.',
        fix: 'Open the air hole to obtain a blue, non-luminous flame.' });
      return false;
    }
    if (!H.zone) { msg('Choose the flame region (click on the flame).'); return false; }
    if (H.zone === 'inner') {
      Safety.tech({ id: 'flame-inner', rule: 'flame_zone', cat: 'heating', points: 2, title: 'Wrong flame region: inside the inner cone',
        action: 'You placed the tube inside the inner blue cone.',
        consequence: 'The inner cone contains unburnt gas and is relatively cool; the tube also sits right on the burner barrel where heating is uneven.',
        fix: 'Raise the tube to just above the tip of the inner blue cone — the hottest region.' });
      return false;
    }
    if (H.zone === 'top') {
      Safety.tech({ id: 'flame-top', rule: 'flame_zone', cat: 'heating', points: 2, title: 'Wrong flame region: top of the flame',
        action: 'You placed the tube at the very top of the flame.',
        consequence: 'The flame tip flickers and is cooler — heating is slow and uneven, tempting you to hold the tube still for longer.',
        fix: 'Lower the tube to just above the tip of the inner blue cone.' });
      return false;
    }
    return true;
  }

  Heating.start = function () {
    var H = Heating.H;
    if (!H || H.running) return;
    if (!preflight(false)) { draw(); return; }
    H.running = true;
    L.Score.good('heat-setup-' + H.exp.id, 'Correct heating set-up: holder, ~45°, opening away from people, blue flame region', 'heating');
    msg('Heating… keep the tube moving gently.');
    H.timer = setInterval(tick, 100);
    draw();
  };

  Heating.stop = function (closing, why) {
    var H = Heating.H;
    if (!H) return;
    var was = H.running;
    H.running = false;
    clearInterval(H.timer);
    if (why) msg(why);
    if (was || closing) afterHeat(H.exp, closing);
    if (!closing) draw();
    L.requestRender();
  };

  function tick() {
    var H = Heating.H;
    if (!H || !H.running) return;
    var exp = H.exp, t = exp.tube;
    if (t.heat < 100) t.heat += 2;
    else if (exp.id === 'benedict') t.boil += P.simSecondsPerRealSecond * 0.1;
    else t.heat += 1;
    t.temp = 22 + 0.78 * Math.min(100, t.heat);

    if (H.moving) H.hotspot = Math.max(0, H.hotspot - 5);
    else H.hotspot += 2.2;

    if (H.hotspot >= 45 && !H.warnedUneven) {
      H.warnedUneven = true;
      Safety.tech({ id: 'uneven-heat', rule: 'gentle_motion', cat: 'heating', points: 3, title: 'Uneven heating — keep the tube moving',
        action: 'You are holding the tube still in one spot of the flame.',
        consequence: 'Heat concentrates in one spot: a vapour bubble forms under the liquid and can erupt (bumping), throwing hot liquid out of the tube.',
        fix: 'Switch on "Move the tube gently back and forth" now.' });
    }
    if (H.hotspot >= 100) return bump('uneven');

    if (exp.id === 'albumin') {
      if (t.heat >= 100 && !H.said.boil) { H.said.boil = true; msg('The upper part is boiling. Remove the tube from the flame now.'); UI.toast('Boiling reached — remove the tube from the flame.', 'info'); }
      if (t.heat >= 140 && !H.said.over) { H.said.over = true; msg('⚠ Boiling vigorously — stop heating NOW.'); }
      if (t.heat >= 160) return bump('overheat');
    }
    if (exp.id === 'benedict') {
      if (t.boil >= P.benedict.boilTarget && !H.said.boil) { H.said.boil = true; msg('2 minutes of boiling complete. Remove the tube from the flame.'); UI.toast('2 minutes reached — remove the tube from the flame.', 'info'); }
      if (t.boil >= P.benedict.boilMax - 30 && !H.said.over) { H.said.over = true; msg('⚠ Over-boiling — stop heating NOW.'); }
      if (t.boil >= P.benedict.boilMax) return bump('overheat');
    }
    updateLive();
  }

  function bump(kind) {
    var H = Heating.H, exp = H.exp;
    H.running = false;
    clearInterval(H.timer);
    exp.tube.spoiled = true;
    var side = UI.$('#h-side', H.el);
    if (side) side.classList.add('splashing');
    var e = L.Score.violation({
      id: 'bump-' + kind, rule: 'gentle_motion', cat: 'heating', severity: 'major',
      title: kind === 'uneven' ? 'Bumping! Hot liquid splashed out (simulated)' : 'Boiled over! Hot liquid ejected (simulated)',
      action: kind === 'uneven' ? 'You kept heating the tube in one spot without moving it. The liquid superheated and bumped.' : 'You kept heating long after the required boiling point.',
      consequence: 'Boiling liquid shot out of the tube and ran down over the holder toward your hand — a possible scald/burn. Had the opening pointed at someone they would have been hit.',
      fix: 'Close the heating station, reset the experiment and heat again: about 45°, opening away from people, moving the tube gently, stopping once the required boiling is reached.'
    });
    if (e) UI.warning(e, { anim: '<div class="splash-anim"><i></i><i></i><i></i><i></i><i></i><span class="hand">✋</span></div>' });
    updateLive();
    L.requestRender();
  }

  function afterHeat(exp, closing) {
    var t = exp.tube, s = sc();
    if (t.spoiled) return;
    if (exp.id === 'albumin') {
      if (t.heat >= 100 && !isDone(exp, 'heat')) {
        done(exp, 'heat'); t.heatedOnce = true; t.turbidOnHeat = s.albumin || s.phosphates;
        L.Score.good('heated-albumin', 'Heated the urine to boiling safely', 'heating');
        UI.toast(t.turbidOnHeat ? 'Observation: turbidity (cloudiness) appeared in the heated upper part.' : 'Observation: the heated part remained clear.', 'info', 5500);
      } else if (closing && t.heat > 0 && t.heat < 100) {
        UI.toast('The urine did not reach boiling. Heat again until the upper part boils.', 'info');
      }
    }
    if (exp.id === 'benedict') {
      if (t.boil >= P.benedict.boilMin && !isDone(exp, 'heat')) {
        done(exp, 'heat'); t.heatedOnce = true;
        L.Score.good('heated-benedict', 'Boiled for about 2 minutes with safe technique', 'heating');
        UI.toast('Boiling complete. Stand the tube in the rack and let it cool.', 'info');
      } else if (closing && !isDone(exp, 'heat') && t.heat > 0) {
        UI.toast('Boiled for ' + Math.round(t.boil) + ' s (simulated). The protocol requires about 2 minutes.', 'info');
      }
    }
  }

  function msg(m) {
    var H = Heating.H;
    var el = H && H.el && UI.$('#h-msg', H.el);
    if (el) el.textContent = m;
  }

  function updateLive() {
    var H = Heating.H;
    if (!H || !H.el) return;
    var t = H.exp.tube;
    UI.$('#h-temp', H.el).textContent = Math.round(t.temp) + ' °C' + (t.temp >= 97 ? ' (boiling)' : '');
    UI.$('#h-prog', H.el).style.width = Math.min(100, t.heat) + '%';
    var hot = UI.$('#h-hot', H.el);
    hot.style.width = Math.min(100, H.hotspot) + '%';
    hot.className = H.hotspot > 45 ? 'danger' : '';
    var bt = UI.$('#h-boil', H.el);
    if (bt) { var b = Math.round(t.boil); bt.textContent = Math.floor(b / 60) + ':' + ('0' + (b % 60)).slice(-2); }
    var liq = UI.$('#h-liq', H.el);
    if (liq) liq.setAttribute('fill', liquidColour(H.exp));
    var g = UI.$('#h-bub', H.el);
    if (g) g.style.display = t.temp >= 97 && H.running ? '' : 'none';
    var tb = UI.$('#h-turb', H.el);
    if (tb) tb.style.display = H.exp.id === 'albumin' && t.heat >= 90 && (sc().albumin || sc().phosphates) ? '' : 'none';
  }

  function liquidColour(exp) {
    var v = Exp.visual(exp);
    if (!v || !v.layers.length) return '#f1cf5b';
    return v.layers[v.layers.length - 1].color;
  }

  function draw() {
    var H = Heating.H;
    if (!H || !H.el) return;
    var w = H.el, b = H.burner, t = H.exp.tube;
    UI.$('#h-lit', w).textContent = b.lit ? 'Turn burner off' : 'Light burner';
    UI.$('#h-lit', w).classList.toggle('on', b.lit);
    UI.$$('[data-air]', w).forEach(function (x) { x.classList.toggle('on', x.dataset.air === b.air); });
    UI.$$('button[data-zone]', w).forEach(function (x) { x.classList.toggle('on', x.dataset.zone === H.zone); });
    UI.$$('[data-dir]', w).forEach(function (x) { x.classList.toggle('on', x.dataset.dir === H.dir); x.classList.toggle('bad', x.dataset.dir === H.dir && H.dir !== 'away'); });
    UI.$('#h-start', w).disabled = H.running;
    UI.$('#h-stop', w).disabled = !H.running;

    // side view
    var flame = '';
    if (b.lit) {
      flame = b.air === 'open'
        ? '<path class="flame-outer" d="M150 70 Q188 150 166 205 H134 Q112 150 150 70Z" fill="#7fb8ff" opacity=".55"/><path class="flame-inner" d="M150 140 Q163 178 158 205 H142 Q137 178 150 140Z" fill="#2453d6" opacity=".9"/>'
        : '<path class="flame-lum" d="M150 30 Q200 130 170 205 H130 Q100 130 150 30Z" fill="#ffc533" opacity=".85"/><path class="flame-lum" d="M150 90 Q178 160 162 205 H138 Q122 160 150 90Z" fill="#ff8c1a" opacity=".8"/>';
    }
    var zones = ZONES.map(function (z) {
      return '<rect class="fzone' + (H.zone === z.id ? ' sel' : '') + '" data-zone="' + z.id + '" x="100" y="' + z.y + '" width="100" height="' + z.h + '" rx="6"><title>' + z.label + '</title></rect>';
    }).join('');
    var zone = ZONES.filter(function (z) { return z.id === H.zone; })[0];
    var bx = zone ? 150 : 250, by = zone ? zone.y + zone.h / 2 : 200;
    var vol = (t.contents.urine || 0) + (t.contents.benedict || 0);
    var liqLen = Math.max(8, Math.min(140, vol / 15 * 150));
    var hand = L.S.ppe.gloves ? '#4c9be8' : '#e3b48e';
    var tubeG =
      '<g class="' + (H.moving ? 'osc' : '') + '"><g transform="translate(' + bx + ' ' + by + ') rotate(' + (-H.angle) + ')">' +
      '<clipPath id="h-clip"><rect x="0" y="-10" width="150" height="20" rx="10"/></clipPath>' +
      '<g clip-path="url(#h-clip)"><rect id="h-liq" x="-2" y="-12" width="' + liqLen + '" height="24" fill="' + liquidColour(H.exp) + '" opacity=".85"/>' +
      '<rect id="h-turb" x="' + (liqLen * 0.45) + '" y="-12" width="' + (liqLen * 0.55) + '" height="24" fill="#fff" opacity=".7" style="display:none"/>' +
      '<g id="h-bub" style="display:none"><circle class="bubble" cx="10" cy="-3" r="2" fill="#fff"/><circle class="bubble" cx="22" cy="4" r="1.5" fill="#fff" style="animation-delay:.3s"/><circle class="bubble" cx="35" cy="-2" r="2.2" fill="#fff" style="animation-delay:.6s"/></g></g>' +
      '<rect x="0" y="-10" width="150" height="20" rx="10" fill="none" stroke="#55687a" stroke-width="2"/>' +
      '<line x1="150" y1="-13" x2="150" y2="13" stroke="#55687a" stroke-width="3"/>' +
      '<rect x="112" y="-14" width="14" height="28" rx="3" fill="#b07a3c" stroke="#6e4818"/>' +
      '<rect x="115" y="14" width="8" height="70" rx="3" fill="#c58b47" stroke="#6e4818"/>' +
      '<circle cx="119" cy="92" r="11" fill="' + hand + '"/>' +
      '<g class="drops"><circle cx="160" cy="0" r="3" fill="#f1cf5b"/><circle cx="170" cy="-6" r="2.5" fill="#f1cf5b"/><circle cx="168" cy="7" r="2" fill="#f1cf5b"/></g>' +
      '</g></g>';
    UI.$('#h-side', w).innerHTML =
      '<svg viewBox="0 0 300 320" class="heat-svg">' +
      '<rect x="0" y="300" width="300" height="20" fill="#cfd6dc"/>' +
      flame + zones +
      '<rect x="110" y="292" width="80" height="10" rx="2" fill="#555"/><rect x="140" y="205" width="20" height="90" fill="#8f9aa5" stroke="#5b6670"/>' +
      '<rect x="136" y="262" width="28" height="12" fill="' + (b.air === 'open' ? '#4a7' : '#6b7680') + '"/><text x="170" y="272" font-size="9" fill="#456">air hole ' + b.air + '</text>' +
      tubeG +
      '<text x="8" y="16" font-size="11" fill="#345">Side view · angle ' + H.angle + '°</text></svg>';

    // top view
    var dir = DIRS.filter(function (d) { return d.id === H.dir; })[0];
    UI.$('#h-top', w).innerHTML =
      '<svg viewBox="0 0 220 170" class="top-svg"><rect x="40" y="48" width="140" height="76" rx="6" fill="#d9e4dc" stroke="#7a9a86"/>' +
      '<text x="110" y="62" font-size="10" text-anchor="middle" fill="#567">bench (top view)</text>' +
      '<g><circle cx="110" cy="152" r="12" fill="#4c7bd9"/><text x="110" y="156" font-size="9" text-anchor="middle" fill="#fff">You</text></g>' +
      '<g><circle cx="16" cy="86" r="12" fill="#d98a4c"/><text x="18" y="112" font-size="11" text-anchor="middle" fill="#555">partner</text></g>' +
      '<g><circle cx="110" cy="16" r="12" fill="#d98a4c"/><text x="128" y="20" font-size="11" fill="#555">student</text></g>' +
      '<g><rect x="206" y="40" width="10" height="92" fill="#bbb"/><text x="204" y="150" font-size="11" text-anchor="end" fill="#555">wall</text></g>' +
      (dir ? '<line x1="110" y1="86" x2="' + (110 + (dir.x - 110) * 0.7) + '" y2="' + (86 + (dir.y - 86) * 0.7) + '" stroke="' + (dir.id === 'away' ? '#1e8a4c' : '#c0392b') + '" stroke-width="5" marker-end="url(#arr)"/>' : '<text x="110" y="76" font-size="9" text-anchor="middle" fill="#a33">direction not set</text>') +
      '<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6Z" fill="' + (dir && dir.id === 'away' ? '#1e8a4c' : '#c0392b') + '"/></marker></defs></svg>';
    updateLive();
  }
})(window.Lab);
