/* =========================================================================
   safety.js — reusable safety checks. Every check returns true when the
   action may proceed and false (after recording + displaying a specific
   warning) when it must be blocked.
   ========================================================================= */
(function (L) {
  'use strict';

  var Safety = L.Safety = {};

  /** Record a safety violation and show it. Always returns false (= blocked). */
  Safety.flag = function (v) {
    var entry = L.Score.violation(v);
    if (entry) L.UI.warning(entry);
    L.requestRender();
    return false;
  };

  /** Record a technique/procedure error and show it. Always returns false. */
  Safety.tech = function (t) {
    var entry = L.Score.technique(t);
    if (entry) L.UI.warning(entry, { modal: !!t.modal });
    L.requestRender();
    return false;
  };

  /* ---------------- PPE ---------------- */

  Safety.coatOK = function () {
    var p = L.S.ppe;
    return p.coat && p.buttons.every(Boolean);
  };

  Safety.requireCoat = function (context) {
    var p = L.S.ppe;
    if (!p.coat) {
      return Safety.flag({
        id: 'no-coat', rule: 'coat', cat: 'ppe', severity: 'major',
        title: 'No laboratory coat',
        action: 'You tried to ' + context + ' without wearing a laboratory coat.',
        consequence: 'Splashes of urine, acids or hot liquids would land directly on your clothes and skin. Contaminated clothing can carry biological material out of the lab.',
        fix: 'Take the laboratory coat from the hook and put it on.'
      });
    }
    if (!p.buttons.every(Boolean)) {
      var onlyLowest = p.buttons.slice(0, 3).every(Boolean) && !p.buttons[3];
      return Safety.flag({
        id: 'coat-open', rule: 'coat_buttoned', cat: 'ppe', severity: 'major',
        title: onlyLowest ? 'Lowest coat button is unfastened' : 'Laboratory coat is not fully buttoned',
        action: 'You tried to ' + context + ' with ' + (onlyLowest ? 'the lowest button of your coat open.' : p.buttons.filter(function (b) { return !b; }).length + ' coat button(s) unfastened.'),
        consequence: 'An open coat flaps toward flames and leaves your legs and clothing exposed to spills — spills on the bench usually run off the edge at lap height, exactly where the lowest button protects you.',
        fix: 'Click every button on the coat — including the lowest one — to fasten it.'
      });
    }
    return true;
  };

  Safety.requireGloves = function (context) {
    if (!Safety.requireCoat(context)) return false;
    if (L.S.ppe.gloves) return true;
    return Safety.flag({
      id: 'no-gloves', rule: 'gloves', cat: 'ppe', severity: 'major',
      title: 'Gloves not worn',
      action: 'You tried to ' + context + ' with bare hands.',
      consequence: 'Urine samples are potentially infectious and reagents such as Benedict\'s (copper salts), acids and ammonia irritate or burn skin. Contamination can also spread to your face, phone or food.',
      fix: 'Put on gloves using the PPE panel (left), then repeat the action.'
    });
  };

  var GOGGLE_REASONS = {
    heating: 'Heated liquids can bump (boil suddenly) and eject hot liquid toward your face. Eyes cannot be protected by reflexes alone.',
    acid: 'Even dilute acid can cause painful chemical injury to the cornea if a drop splashes from the dropper or tube.',
    hazard: 'Ammonium hydroxide releases irritating ammonia gas and is corrosive — a splash or vapour can seriously damage the eyes.'
  };

  Safety.requireGoggles = function (context, kind) {
    if (L.S.ppe.goggles) return true;
    return Safety.flag({
      id: 'no-goggles-' + (kind || 'x'), rule: 'goggles', cat: 'ppe', severity: 'critical',
      title: 'Safety goggles required — procedure stopped',
      action: 'You tried to ' + context + ' without wearing safety goggles.',
      consequence: GOGGLE_REASONS[kind] || GOGGLE_REASONS.heating,
      fix: 'Put on safety goggles using the PPE panel, then start again.'
    });
  };

  /** Convenience: gloves (+coat) and optionally goggles. */
  Safety.requirePPE = function (context, gogglesKind) {
    if (!Safety.requireGloves(context)) return false;
    if (gogglesKind && !Safety.requireGoggles(context, gogglesKind)) return false;
    return true;
  };

  /* ---------------- Movement & handling ---------------- */

  /** Called before the student leaves a station. Returns false to block movement. */
  Safety.checkLeaving = function (dest) {
    var S = L.S;
    if (S.incident) {
      if (S.incident.stage === 'broken') {
        return Safety.flag({
          id: 'leave-incident', rule: 'broken_conceal', cat: 'breakage', severity: 'critical',
          title: 'Walking away from broken glass',
          action: 'You tried to walk away from the broken test tube without reporting it.',
          consequence: 'The next person could be cut by the glass or contaminated by the spilled urine. Leaving the scene is treated the same as concealing the incident.',
          fix: 'Stay where you are and press "Report to Lab TA".'
        });
      }
      if (S.incident.stage !== 'cleared') {
        L.UI.toast('Wait for the TA to clear the area before moving on.', 'info');
        return false;
      }
    }

    // A loose tube (in hand or in a holder) at the current station?
    var loose = S.exps.filter(function (e) {
      return e.tube.where === S.station && (e.tube.loc === 'hand' || e.tube.loc === 'holder');
    })[0];
    if (loose) {
      var inHolder = loose.tube.loc === 'holder';
      return Safety.flag({
        id: 'loose-tube', rule: 'rack', cat: 'handling', severity: 'major',
        title: 'Carrying a loose test tube',
        action: 'You tried to walk to ' + L.STATIONS[dest].name + ' carrying a loose test tube ' + (inHolder ? 'in a test tube holder' : 'in your hand') + '.',
        consequence: 'Loose tubes are easily knocked or dropped while walking between benches — the glass breaks and the contents splash onto you and others.',
        fix: 'Stand the tube in the test tube rack first (drag it onto the rack). The rack is what you carry.'
      });
    }

    // Burner left lit?
    var b = S.burners[S.station];
    if (b && b.lit && dest !== S.station) {
      Safety.flag({
        id: 'burner-unattended-' + S.station, rule: 'burner', cat: 'heating', severity: 'minor',
        title: 'Lit burner left unattended',
        action: 'You walked away from ' + L.STATIONS[S.station].name + ' leaving the Bunsen burner alight.',
        consequence: 'An unattended flame can ignite sleeves, paper or hair of anyone passing, and wastes gas.',
        fix: 'Turn off the burner at the bench when you have finished heating.'
      });
      // movement is not blocked — the burner simply stays lit until turned off.
    }
    return true;
  };

  /** Hot glassware touched without protection. */
  Safety.checkHot = function (tube, context) {
    if (tube.temp < 45) return true;
    L.Score.violation({
      id: 'hot-glass', rule: 'hot_glass', cat: 'handling', severity: 'major',
      title: 'Hot glassware handled by hand',
      action: 'You tried to ' + context + ' while the tube was still hot (' + Math.round(tube.temp) + ' °C).',
      consequence: 'Hot glass looks exactly like cold glass. Gloves do not insulate — you would be burned and reflexively drop the tube.'
    });
    return false;
  };

  /** Is the student allowed to act at all right now? */
  Safety.canAct = function () {
    if (L.S.incident && L.S.incident.stage !== 'cleared') {
      L.UI.toast('The experiment is paused until the broken-glass incident is resolved.', 'warn');
      return false;
    }
    return true;
  };
})(window.Lab);
