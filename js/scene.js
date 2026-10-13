/* =========================================================================
   scene.js — floor plan & navigation, entrance PPE inspection, conduct
   decision prompts, TA desk and the laminar flow cabinet (distractor).
   ========================================================================= */
(function (L) {
  'use strict';

  var Scene = L.Scene = {};
  var UI = L.UI, Safety = L.Safety;
  function S() { return L.S; }

  /* ------------------------------------------------------------------ */
  /* Floor plan                                                          */
  /* ------------------------------------------------------------------ */
  var lastPos = null;

  function stationRect(id, x, y, w, h, label, sub, cls) {
    var st = S().station === id;
    return '<g class="st ' + (cls || '') + (st ? ' here' : '') + '" data-station="' + id + '" role="button" tabindex="0" aria-label="Go to ' + UI.esc(L.STATIONS[id].name) + '">' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 - (sub ? 3 : -4)) + '" text-anchor="middle" class="lbl">' + label + '</text>' +
      (sub ? '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 12) + '" text-anchor="middle" class="sub">' + sub + '</text>' : '') + '</g>';
  }

  /** The station the student should head to for the current task (null if none). */
  Scene.targetStation = function () {
    var s = S(), cur = L.currentExp();
    if (s.phase === 'entry') return 'entrance';
    if (s.phase === 'cleanup') return L.Cleanup.allDone() ? 'entrance' : null;
    if (s.phase !== 'lab' || !cur) return null;
    if (cur.id === 'rothera' && (L.Exp.isDone(cur, 'mix') || cur.tube.where === 'hood')) return 'hood';
    return L.expDef(cur.id).station;
  };

  /** Compact row of station buttons (focus mode and phones). */
  Scene.stationChips = function () {
    var s = S(), target = Scene.targetStation();
    var short = { entrance: '🚪 Entrance', bench1: '1 · Heat', bench2: '2 · Benedict', bench3: '3 · Rothera', bench4: '4 · Hay',
      hood: '🌀 Fume hood', laminar: 'Laminar', sink: '🚰 Sink', tech: '🧑‍🔧 Technician', ta: '👩‍🔬 TA' };
    return Object.keys(short).map(function (id) {
      var done = /^bench(\d)$/.test(id) && s.exps[+id.slice(5) - 1].done;
      return '<button class="chip' + (s.station === id ? ' here' : '') + (target === id && s.station !== id ? ' target' : '') + '" data-goto="' + id + '"' +
        (s.station === id ? ' aria-current="location"' : '') + ' title="' + UI.esc(L.STATIONS[id].name) + '">' + short[id] + (done ? ' ✓' : '') + '</button>';
    }).join('');
  };

  Scene.mapSVG = function () {
    var s = S();
    var target = s.phase === 'lab' ? Scene.targetStation() : null;
    function tag(id) { return target === id ? ' target' : ''; }
    var done = function (n) { return s.exps[n - 1].done ? ' ✔' : ''; };
    var h = '<svg viewBox="0 0 1000 272" class="map-svg" role="img" aria-label="Laboratory floor plan">' +
      '<rect x="2" y="2" width="996" height="268" rx="8" class="floor"/>' +
      '<rect x="0" y="196" width="1000" height="66" class="aisle"/>' +
      '<text x="500" y="254" text-anchor="middle" class="aisle-lbl">MAIN AISLE — keep clear for evacuation →</text>' +
      '<rect x="0" y="204" width="8" height="50" class="door"/><text x="14" y="218" class="door-lbl">Entrance</text>' +
      '<rect x="988" y="204" width="10" height="50" class="exit"/><text x="982" y="218" text-anchor="end" class="exit-lbl">EMERGENCY EXIT</text>' +
      stationRect('entrance', 8, 10, 110, 180, 'Entrance', 'PPE area & lockers', 'ppe' + tag('entrance')) +
      stationRect('sink', 140, 12, 110, 48, 'Sink', 'washing station', 'util') +
      stationRect('tech', 270, 12, 130, 48, 'Technician', 'equipment return', 'util') +
      stationRect('ta', 420, 12, 120, 48, 'Lab TAs', 'help & reporting', 'util') +
      '<g class="decor"><rect x="560" y="12" width="140" height="48" rx="6"/><text x="630" y="34" text-anchor="middle" class="lbl">Stock reagents</text><text x="630" y="49" text-anchor="middle" class="sub">do not move</text></g>' +
      stationRect('bench1', 140, 96, 140, 52, 'Bench 1' + done(1), 'Heat test (albumin)', 'bench' + tag('bench1')) +
      stationRect('bench2', 300, 96, 140, 52, 'Bench 2' + done(2), 'Benedict\'s (glucose)', 'bench' + tag('bench2')) +
      stationRect('bench3', 460, 96, 140, 52, 'Bench 3' + done(3), 'Rothera\'s prep (ketones)', 'bench' + tag('bench3')) +
      stationRect('bench4', 620, 96, 140, 52, 'Bench 4' + done(4), 'Hay\'s (bile salts)', 'bench' + tag('bench4')) +
      stationRect('hood', 800, 12, 160, 68, 'Chemical fume hood', 'extracted — for fumes', 'hood' + tag('hood')) +
      stationRect('laminar', 800, 96, 160, 52, 'Laminar flow cabinet', 'biological — NOT for fumes', 'laminar');
    // classmates (static)
    [[250, 160], [330, 160], [600, 160], [740, 160], [870, 90]].forEach(function (p) {
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" class="mate"/>';
    });
    if (s.phase === 'cleanup' && s.cleanup.stool === 'aisle') {
      h += '<g class="stool" data-act="stool" role="button" tabindex="0" aria-label="Stool blocking the aisle"><rect x="545" y="214" width="26" height="26" rx="4"/><text x="558" y="232" text-anchor="middle">🪑</text><text x="558" y="210" text-anchor="middle" class="warn-lbl">obstruction!</text></g>';
    }
    var me = L.STATIONS[s.station];
    var from = lastPos || me;
    h += '<g class="me" id="me" style="transform:translate(' + from.x + 'px,' + from.y + 'px)"><circle r="11"/><text y="4" text-anchor="middle">You</text></g>';
    h += '</svg>';
    return h;
  };

  Scene.afterMapRender = function (root) {
    var me = root.querySelector('#me');
    var p = L.STATIONS[S().station];
    if (me) {
      void me.getBoundingClientRect();
      requestAnimationFrame(function () { me.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)'; });
    }
    lastPos = p;
  };
  Scene.resetMap = function () { lastPos = null; };

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  Scene.goTo = function (dest) {
    var s = S();
    if (!L.STATIONS[dest] || dest === s.station) return;
    if (s.phase === 'entry' || s.phase === 'intro') {
      UI.toast('Complete the PPE inspection and enter through the entrance first.', 'info');
      return;
    }
    if (s.phase === 'report') return;
    if (UI.modalOpen()) return;
    if (!Safety.checkLeaving(dest)) return;
    var prev = s.station;

    if (s.phase === 'lab') {
      var r = L.exp('rothera');
      if (L.currentExp() === r && r.tube.where === prev && r.tube.loc === 'rack' && (dest === 'hood' || dest === 'laminar')) {
        r.tube.where = dest;
        if (dest === 'hood') {
          if (L.Exp.isDone(r, 'mix')) {
            L.Exp.done(r, 'transfer');
            L.Score.good('rack-carry', 'Carried the tube in a rack to the fume hood', 'handling', 2);
          }
          UI.toast('You carry the test tube rack to the chemical fume hood.', 'good');
        } else {
          UI.toast('You carry the test tube rack to the laminar flow cabinet.', 'info');
        }
      }
    }
    if (s.phase === 'cleanup') {
      s.exps.forEach(function (e) { if (e.tube.loc === 'carry') e.tube.where = dest; });
    }
    s.prevStation = prev;
    s.station = dest;
    if (dest === 'hood') L.Exp.syncHood(false);
    L.requestRender();
    setTimeout(function () { Scene.arrive(dest); }, 350);
  };

  /* ------------------------------------------------------------------ */
  /* Decision prompts (personal conduct) on first arrival at a station   */
  /* ------------------------------------------------------------------ */
  var DECISIONS = {
    bench1: {
      title: '🧃 A classmate offers you a drink',
      prompt: 'Your lab partner pulls a bottle of juice out of their coat pocket: “It\'s so warm in here — want a sip?”',
      good: { label: 'Decline — no eating or drinking in the laboratory', msg: 'Refused food/drink in the laboratory' },
      bad: { label: 'Take a quick sip', v: { id: 'drink', rule: 'no_food', cat: 'conduct', severity: 'major', title: 'Drinking in the laboratory',
        action: 'You drank juice at the laboratory bench.',
        consequence: 'Anything you eat or drink in the lab can be contaminated by urine samples or reagents on your gloves and the bench — a direct route for infection and poisoning.',
        fix: 'Never eat or drink in the lab. Food and drink stay in the locker outside.' } }
    },
    bench2: {
      title: '👥 Crowd at Bench 2',
      prompt: 'Five students from other groups are crowded around Bench 2, leaning over a lit burner to watch a colour change.',
      good: { label: 'Wait at a distance and ask the TA to ask them to return to their own benches', msg: 'Avoided crowding around a workstation' },
      bad: { label: 'Squeeze in among them and start working', v: { id: 'crowd', rule: 'crowding', cat: 'conduct', severity: 'minor', title: 'Crowding a workstation',
        action: 'You squeezed into a crowd of students around a bench with a lit burner.',
        consequence: 'In a crowd, elbows knock over tubes and burners, sleeves and hair reach the flame, and nobody can move away quickly if something splashes.',
        fix: 'Keep workstations uncrowded — one group per bench.' } }
    },
    bench3: {
      title: '👃 “Smell this!”',
      prompt: 'A classmate opens the Rothera\'s reagent jar and holds it toward you: “Smell it — it smells weird!”',
      good: { label: 'Refuse — never smell chemicals; read the label instead', msg: 'Refused to smell a chemical directly' },
      bad: { label: 'Take a sniff from the jar', v: { id: 'sniff', rule: 'no_smell', cat: 'conduct', severity: 'major', title: 'Chemical smelled directly',
        action: 'You inhaled directly from the open Rothera\'s reagent jar.',
        consequence: 'Fine powders and vapours irritate the nose and lungs; some laboratory chemicals are toxic by inhalation. Smelling is never an acceptable test.',
        fix: 'Never smell chemicals or samples directly.' } }
    },
    bench4: {
      title: '🤹 Juggling dropper bottles',
      prompt: 'A student at the next bench starts juggling two dropper bottles and spinning the sulfur jar: “Bet you can\'t do three!”',
      good: { label: 'Decline, ask them to stop and leave the reagents in place', msg: 'Did not play with reagent containers' },
      bad: { label: 'Join in for a moment', v: { id: 'juggle', rule: 'no_play', cat: 'conduct', severity: 'major', title: 'Playing with chemicals',
        action: 'You joined in juggling reagent bottles.',
        consequence: 'A dropped bottle shatters and sprays reagent over people and benches; the broken glass and spill endanger everyone nearby.',
        fix: 'Never play with chemicals or reagent containers.' } }
    },
    hood: {
      title: '🧴 “Can you bring the ammonia over?”',
      prompt: 'A student asks you to carry the stock bottle of ammonium hydroxide from the fume hood to their open bench.',
      good: { label: 'Refuse — it stays in the hood; they should bring their tube here', msg: 'Kept a hazardous reagent in the fume hood' },
      bad: { label: 'Carry it over for them', v: { id: 'carry-ammonia', rule: 'no_move_chem', cat: 'fumehood', severity: 'major', title: 'Hazardous reagent moved out of the fume hood',
        action: 'You carried the stock ammonium hydroxide bottle across the lab to an open bench.',
        consequence: 'Ammonia vapour is released at an open bench where it is not extracted, and carrying stock bottles risks a large spill in the aisle.',
        fix: 'Never move chemicals unnecessarily — hazardous reagents stay in the fume hood.' } }
    }
  };

  Scene.arrive = function (dest) {
    var s = S();
    if (s.phase !== 'lab' || s.incident) return;
    var d = DECISIONS[dest];
    if (!d || s.seen['dec:' + dest]) return;
    var cur = L.currentExp();
    var expHere = L.Exp.stationExp(dest);
    if (!cur || !expHere || expHere !== cur) return;
    if (UI.modalOpen()) return;
    s.seen['dec:' + dest] = true;
    var opts = [{ label: d.good.label, value: 'good' }, { label: d.bad.label, value: 'bad' }];
    if (dest === 'bench2' || dest === 'bench4') opts.reverse();
    UI.choice({
      title: d.title, prompt: d.prompt, options: opts, dismiss: false,
      onPick: function (v) {
        if (v === 'good') {
          L.Score.good('dec-' + dest, d.good.msg, d.bad.v.cat, 2);
          UI.toast('✔ Safe decision: ' + d.good.msg + '.', 'good');
        } else {
          Safety.flag(d.bad.v);
        }
        L.requestRender();
      }
    });
  };

  /* ------------------------------------------------------------------ */
  /* Entrance & PPE inspection                                           */
  /* ------------------------------------------------------------------ */
  Scene.entranceView = function () {
    var s = S();
    if (s.phase === 'lab') {
      return '<div class="panel"><h2>🚪 Entrance / exit</h2><p>This doorway and the main aisle must stay clear for evacuation. You may leave only after completing all four experiments and the cleanup sequence.</p></div>';
    }
    if (s.phase === 'cleanup') {
      var ok = L.Cleanup.allDone();
      return '<div class="panel exit-view"><h2>🚪 Sign out & leave the laboratory</h2>' +
        '<p>' + (ok ? 'All cleanup tasks are complete. You may sign out.' : 'Check the cleanup list on the left — every item must be completed before you can leave.') + '</p>' +
        '<button class="btn primary big" data-act="finish">Sign out and view my lab report</button></div>';
    }
    var p = s.ppe, b = s.belongings;
    var item = function (id, label, icon, worn) {
      return '<div class="tile ppe-item' + (worn ? ' disabled worn' : '') + '" data-drag="' + id + '" data-label="' + label + '" tabindex="0" role="button">' +
        '<span class="big-ico">' + icon + '</span><span>' + label + '</span>' + (worn ? '<em class="ok">worn</em>' : '') + '</div>';
    };
    var checks = Scene.entryChecklist();
    return '<div class="entrance-view">' +
      '<div class="ent-head"><h2>Laboratory entrance — PPE inspection</h2><p>Drag each item of PPE onto yourself, fasten every coat button (click them), and put personal belongings in the locker. Then pass the safety checklist.</p></div>' +
      '<div class="ent-grid">' +
      '<div class="ppe-hooks"><h3>PPE station</h3>' +
      item('coat', 'Laboratory coat', '🥼', p.coat) + item('gloves', 'Nitrile gloves', '🧤', p.gloves) + item('goggles', 'Safety goggles', '🥽', p.goggles) +
      '</div>' +
      '<div class="avatar-zone" data-drop="avatar" aria-label="You — drop PPE here">' + UI.avatarSVG(p, b) +
      '<div class="avatar-cap">' + (p.coat && !p.buttons.every(Boolean) ? '<strong class="red">Click the red circles to fasten each button — including the lowest.</strong>' : 'Drop PPE here') + '</div>' +
      '<div class="carried">' +
      (b.bag === 'carried' ? item('bag', 'Your backpack', '🎒') : '') +
      (b.drink === 'carried' ? item('drink', 'Bottle of juice', '🧃') : '') + '</div></div>' +
      '<div class="lockers"><div class="locker" data-drop="locker"><span class="big-ico">🗄️</span><strong>Personal locker</strong><small>(outside the lab)</small>' +
      '<div class="stored">' + (b.bag === 'locker' ? '🎒 ' : '') + (b.drink === 'locker' ? '🧃' : '') + '</div></div>' +
      '<div class="checklist"><h3>Safety checklist</h3><ul>' + checks.map(function (c) {
        return '<li class="' + (c.ok ? 'ok' : (c.required ? 'no' : 'later')) + '">' + (c.ok ? '✔' : (c.required ? '✘' : '•')) + ' ' + c.text + '</li>';
      }).join('') + '</ul></div>' +
      '<button class="btn primary big" data-act="enter">Enter the laboratory →</button></div>' +
      '</div></div>';
  };

  Scene.entryChecklist = function () {
    var p = S().ppe, b = S().belongings;
    return [
      { ok: p.coat, required: true, text: 'Laboratory coat worn' },
      { ok: p.coat && p.buttons.every(Boolean), required: true, text: 'Coat fully buttoned — including the lowest button' },
      { ok: b.drink === 'locker', required: true, text: 'No food or drink — stored in locker' },
      { ok: b.bag === 'locker', required: true, text: 'Personal belongings stored in locker' },
      { ok: p.gloves, required: false, text: 'Gloves — required before handling samples/reagents' },
      { ok: p.goggles, required: false, text: 'Goggles — required for heating, acids and hazardous reagents' }
    ];
  };

  Scene.entranceDrop = function (dragId, dropId) {
    var p = S().ppe, b = S().belongings;
    if (dropId === 'avatar') {
      if (dragId === 'coat') { p.coat = true; p.buttons = [false, false, false, false]; UI.toast('Lab coat on. Now fasten every button — including the lowest one.', 'info'); }
      else if (dragId === 'gloves') {
        p.gloves = true;
        UI.toast(p.coat ? 'Gloves on — pull the cuffs over your coat sleeves.' : 'Gloves on. (Tip: put the coat on first so the glove cuffs cover the sleeves.)', 'good');
      }
      else if (dragId === 'goggles') { p.goggles = true; UI.toast('Safety goggles on.', 'good'); }
      else if (dragId === 'bag' || dragId === 'drink') UI.toast('Put personal items in the locker, not on yourself.', 'info');
      return;
    }
    if (dropId === 'locker') {
      if (dragId === 'bag' || dragId === 'drink') {
        b[dragId] = 'locker';
        UI.toast(dragId === 'bag' ? 'Backpack stored in your locker.' : 'Drink stored in your locker — no food or drink in the lab.', 'good');
        L.Score.good('locker-' + dragId, dragId === 'bag' ? 'Stored personal belongings outside the lab' : 'Left food/drink outside the lab', 'conduct');
      } else {
        UI.toast('PPE is worn, not stored — drop it onto yourself.', 'info');
      }
    }
  };

  Scene.toggleButton = function (i) {
    var p = S().ppe;
    if (S().phase !== 'entry' || !p.coat) return;
    p.buttons[i] = !p.buttons[i];
    if (p.buttons.every(Boolean)) UI.toast('Coat fully buttoned. ✔', 'good');
    L.requestRender();
  };

  Scene.enter = function () {
    var s = S(), b = s.belongings, p = s.ppe;
    if (b.drink === 'carried') {
      return Safety.flag({ id: 'enter-drink', rule: 'no_food', cat: 'conduct', severity: 'major', title: 'Entry refused — drink in hand',
        action: 'You tried to enter the laboratory carrying a bottle of juice.',
        consequence: 'Food and drink in a laboratory become contaminated with samples and reagents and may be ingested.',
        fix: 'Put the drink in your locker outside the laboratory.' });
    }
    if (b.bag === 'carried') {
      return Safety.flag({ id: 'enter-bag', rule: 'belongings', cat: 'conduct', severity: 'minor', title: 'Entry refused — personal belongings',
        action: 'You tried to bring your backpack into the laboratory.',
        consequence: 'Bags on benches or the floor clutter the workspace, block pathways and become contaminated.',
        fix: 'Store your backpack in the locker.' });
    }
    if (!Safety.requireCoat('enter the laboratory')) return;
    if (!p.gloves || !p.goggles) {
      var missing = [];
      if (!p.gloves) missing.push('<li><strong>Gloves</strong> — you will be stopped from handling any sample or reagent until you put them on.</li>');
      if (!p.goggles) missing.push('<li><strong>Safety goggles</strong> — you will be stopped from heating or handling acids/hazardous reagents until you put them on.</li>');
      UI.modal({
        title: 'PPE reminder', body: '<p>You are not wearing:</p><ul>' + missing.join('') + '</ul><p>You may enter, but you can put them on now (recommended).</p>',
        buttons: [{ label: 'Go back and put them on', cls: 'primary' }, { label: 'Enter anyway', onClick: function () { doEnter(); } }]
      });
      return;
    }
    doEnter();
  };

  function doEnter() {
    var s = S();
    s.phase = 'lab';
    L.Score.good('ppe-complete', 'Passed the PPE inspection', 'ppe', 0);
    if (s.ppe.gloves && s.ppe.goggles) L.Score.good('ppe-full', 'Entered wearing full PPE (coat, gloves, goggles)', 'ppe', 2);
    UI.toast('Welcome to the laboratory. Go to Bench 1 for Experiment 1.', 'good');
    L.requestRender();
    setTimeout(function () { Scene.goTo('bench1'); }, 400);
  }

  /* ------------------------------------------------------------------ */
  /* TA desk & laminar flow cabinet                                      */
  /* ------------------------------------------------------------------ */
  Scene.taView = function () {
    return '<div class="panel ta-view"><div class="person">👩‍🔬</div><h2>Laboratory teaching assistants</h2>' +
      '<p>“We\'re here to help. Ask about the next step at any time — and report every breakage, spill or injury to us immediately.”</p>' +
      '<div class="row wrap"><button class="btn primary" data-act="ta-hint">💡 Ask about my current step</button>' +
      '<button class="btn" data-act="ta-rules">📋 Review the laboratory safety rules</button></div></div>';
  };

  Scene.hint = function () {
    var s = S();
    var txt;
    if (s.phase === 'entry') txt = 'Put on your coat and fasten every button (including the lowest), store your bag and drink in the locker, and put on gloves and goggles before entering.';
    else if (s.phase === 'cleanup') {
      var t = L.Cleanup.tasks().filter(function (x) { return !x.done; })[0];
      txt = t ? 'Next cleanup task: ' + t.text + '.' : 'Everything is done — sign out at the entrance.';
    } else if (s.phase === 'lab') {
      var e = L.currentExp(), d = L.expDef(e.id), st = L.Exp.nextStep(e);
      var where = (e.id === 'rothera' && L.Exp.isDone(e, 'mix')) ? 'the chemical fume hood' : L.STATIONS[d.station].name;
      txt = 'Experiment ' + d.num + ' (' + d.title + ') takes place at ' + where + '. ' + (st ? 'Next step: ' + st.text : '') +
        (e.tube.spoiled || e.tube.disturbed ? ' Your tube must be reset first.' : '') +
        (!s.ppe.gloves ? ' Remember: gloves are required for handling samples and reagents.' : '') +
        ((d.hasBurner || e.id === 'rothera' || e.id === 'albumin') && !s.ppe.goggles ? ' You will also need your goggles.' : '');
    }
    UI.modal({ title: '💡 TA guidance', body: '<p>' + txt + '</p>', buttons: [{ label: 'Thanks', cls: 'primary' }] });
  };

  Scene.rules = function () {
    UI.modal({ title: '📋 Laboratory safety rules', cls: 'rules-modal', dismiss: true,
      body: '<ul class="rules">' + Object.keys(L.RULES).map(function (k) { return '<li>' + L.RULES[k] + '</li>'; }).join('') + '</ul>',
      buttons: [{ label: 'Close', cls: 'primary' }] });
  };

  Scene.laminarView = function () {
    var r = L.exp('rothera');
    var hasTube = S().phase === 'lab' && r.tube.where === 'laminar';
    return '<div class="panel laminar-view"><h2>Laminar flow cabinet</h2>' +
      '<p class="lam-note">A laminar flow cabinet (clean bench / biological cabinet) blows HEPA-filtered air over the work surface to protect <em>samples</em> from contamination. Depending on its design, air may flow <strong>out toward the operator</strong> and it does not extract chemical vapours to the outside.</p>' +
      (hasTube ? '<p>Your Rothera\'s tube rack is here.</p><div class="row wrap"><button class="btn" data-act="laminar-add">Layer ammonium hydroxide here</button></div>' :
        '<p>This cabinet is not used in today\'s practical.</p>') + '</div>';
  };

  Scene.laminarAdd = function () {
    Safety.flag({ id: 'laminar', rule: 'laminar', cat: 'fumehood', severity: 'major', title: 'Wrong cabinet — laminar flow is not a fume hood',
      action: 'You tried to use ammonium hydroxide in the laminar flow cabinet.',
      consequence: 'A laminar flow cabinet is designed to protect samples, not people: it does not exhaust chemical vapours and may blow ammonia fumes straight toward your face.',
      fix: 'Carry the rack to the chemical fume hood (top right of the floor plan).' });
  };

  Scene.otherView = function (station) {
    if (station === 'sink') return L.Cleanup.sinkView();
    if (station === 'tech') return L.Cleanup.techView();
    if (station === 'ta') return Scene.taView();
    if (station === 'laminar') return Scene.laminarView();
    if (station === 'entrance') return Scene.entranceView();
    return '';
  };
})(window.Lab);
