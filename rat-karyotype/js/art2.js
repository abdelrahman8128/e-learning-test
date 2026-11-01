/* =========================================================================
   art2.js — second set of illustrations (extends KL.Art): the rat specimen with
   rotatable views and clickable regions, and the femur / tibia bones.
   All are schematic ILLUSTRATIONS, not photographs. Course photographs can replace
   any of them through CONFIG.photos (see the README).
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL, A = KL.Art, C = A.C, txt = A.txt, svg = A.svg;

  const fur = '#fbf7f2', furS = '#cdbfae', pink = '#f4c9c4', pinkS = '#d8a09a';
  const R = (o, name, shape) => o && o.regions ? shape.replace('/>', ' data-region="' + name + '" class="hot"/>') : '';

  /* ---------------------------------------------------------------- rat */
  /** o.view: 'lateral' | 'lateral-r' | 'dorsal' | 'ventral'; o.regions: clickable parts; o.highlight: 'neck' */
  A.rat = function (o) {
    o = o || {};
    const view = o.view || 'lateral';
    let v = '';
    if (view === 'lateral' || view === 'lateral-r') {
      const hl = o.highlight === 'neck' ? '<circle cx="150" cy="112" r="24" fill="none" stroke="#e5484d" stroke-width="3" stroke-dasharray="5 4"/>' : '';
      const body =
        '<path d="M398 178 C452 176 476 120 458 70 C455 60 446 62 448 74 C458 112 436 150 398 150" fill="' + pink + '" stroke="' + pinkS + '" stroke-width="2"/>' +
        '<ellipse cx="270" cy="150" rx="135" ry="62" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.5"/>' +
        '<path d="M178 198 q-8 32 -2 46 q16 8 30 0 q-4 -24 4 -46 Z" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M165 150 C150 110 120 100 80 118 C58 128 52 150 66 166 C86 186 140 190 168 178 Z" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.5"/>' +
        '<ellipse cx="112" cy="96" rx="15" ry="20" fill="' + pink + '" stroke="' + pinkS + '" stroke-width="2" transform="rotate(-18 112 96)"/>' +
        '<circle cx="90" cy="132" r="5" fill="#c0392b"/><circle cx="60" cy="152" r="4" fill="' + pinkS + '"/><path d="M62 160 l-22 4 M62 156 l-22 -4 M64 150 l-20 -12" stroke="#bda88f" stroke-width="1.2"/>' +
        '<ellipse cx="352" cy="172" rx="46" ry="56" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.5"/>' +
        '<path d="M338 216 L318 248 q24 12 50 -2 L356 214 Z" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M322 252 q-14 4 -16 12 M334 254 q-8 8 -8 14 M350 254 q0 8 -2 14" stroke="' + pinkS + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      const regs = R(o, 'head', '<ellipse cx="102" cy="132" rx="62" ry="50"/>') + R(o, 'forelimb', '<path d="M170 190 L214 190 L214 250 L170 250 Z"/>') +
        R(o, 'trunk', '<ellipse cx="250" cy="140" rx="70" ry="52"/>') + R(o, 'hindlimb', '<ellipse cx="352" cy="176" rx="50" ry="62"/>') + R(o, 'hindlimb', '<path d="M310 212 L376 212 L372 270 L304 270 Z"/>') + R(o, 'tail', '<path d="M398 120 L476 120 L476 200 L398 200 Z"/>');
      v = view === 'lateral-r' ? '<g transform="translate(480 0) scale(-1 1)">' + body + hl + regs + '</g>' : body + hl + regs;
      return svg(480, 280, '<rect width="480" height="280" fill="#f2f6fb" rx="10"/>' + v + txt(240, 272, 'Illustration — stylised rat (' + (view === 'lateral' ? 'left side' : 'right side') + '), not to scale', { size: 11, fill: '#6b7a90', weight: 500 }), 'rat');
    }
    // dorsal / ventral (head up)
    const belly = view === 'ventral';
    v = '<path d="M150 322 C160 372 120 396 168 414" fill="none" stroke="' + pinkS + '" stroke-width="7" stroke-linecap="round"/>' +
      '<ellipse cx="150" cy="215" rx="62" ry="118" fill="' + (belly ? '#fdf9f3' : fur) + '" stroke="' + furS + '" stroke-width="2.5"/>' +
      '<ellipse cx="150" cy="78" rx="38" ry="52" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.5"/><ellipse cx="110" cy="52" rx="14" ry="18" fill="' + pink + '" stroke="' + pinkS + '"/><ellipse cx="190" cy="52" rx="14" ry="18" fill="' + pink + '" stroke="' + pinkS + '"/>' +
      '<circle cx="150" cy="128" r="5" fill="#c0392b" transform="translate(0 -60)"/>' + (belly ? '' : '<circle cx="136" cy="70" r="4" fill="#222"/><circle cx="164" cy="70" r="4" fill="#222"/>') +
      '<ellipse cx="88" cy="150" rx="17" ry="30" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4"/><ellipse cx="212" cy="150" rx="17" ry="30" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4"/>' +
      '<ellipse cx="84" cy="300" rx="30" ry="48" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4"/><ellipse cx="216" cy="300" rx="30" ry="48" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.4"/>' +
      '<ellipse cx="78" cy="352" rx="14" ry="20" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.2"/><ellipse cx="222" cy="352" rx="14" ry="20" fill="' + fur + '" stroke="' + furS + '" stroke-width="2.2"/>' +
      R(o, 'head', '<ellipse cx="150" cy="78" rx="46" ry="58"/>') + R(o, 'forelimb', '<ellipse cx="88" cy="150" rx="24" ry="38"/>') + R(o, 'forelimb', '<ellipse cx="212" cy="150" rx="24" ry="38"/>') +
      R(o, 'trunk', '<ellipse cx="150" cy="200" rx="40" ry="80"/>') + R(o, 'hindlimb', '<ellipse cx="84" cy="312" rx="36" ry="64"/>') + R(o, 'hindlimb', '<ellipse cx="216" cy="312" rx="36" ry="64"/>') + R(o, 'tail', '<path d="M130 380 L180 380 L180 420 L130 420 Z"/>');
    return svg(300, 430, '<rect width="300" height="430" fill="#f2f6fb" rx="10"/>' + v + txt(150, 424, 'Illustration — ' + (belly ? 'ventral' : 'dorsal') + ' view (schematic)', { size: 10, fill: '#6b7a90', weight: 500 }), 'rat rat-v');
  };
  A.RAT_VIEWS = ['lateral', 'dorsal', 'lateral-r', 'ventral'];
  A.RAT_PART_NAMES = { head: 'Head', forelimb: 'Forelimb', trunk: 'Trunk (body)', hindlimb: 'Hindlimb', tail: 'Tail' };

  /* -------------------------------------------------------------- bones */
  const BX0 = 36, BX1 = 364;
  /** One long bone centred on y. kind: 'femur' | 'tibia'. */
  function boneGroup(kind, y, o) {
    const fem = kind === 'femur', sh = fem ? 26 : 20;
    const trimmed = o.trimmed && (o.trimmed === true || o.trimmed[kind]);
    let v = '';
    const bone = 'fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"';
    const prox = fem
      ? '<circle cx="54" cy="' + (y - 4) + '" r="28" ' + bone + '/><rect x="64" y="' + (y - 36) + '" width="20" height="22" rx="8" ' + bone + ' transform="rotate(-20 74 ' + (y - 26) + ')"/>'
      : '<rect x="34" y="' + (y - 24) + '" width="54" height="48" rx="14" ' + bone + '/><rect x="58" y="' + (y - 30) + '" width="14" height="12" rx="4" ' + bone + '/>';
    const dist = fem ? '<ellipse cx="344" cy="' + (y + 4) + '" rx="24" ry="30" ' + bone + '/>' : '<ellipse cx="340" cy="' + (y + 2) + '" rx="19" ry="23" ' + bone + '/><path d="M348 ' + (y + 20) + ' q6 12 0 18" fill="none" stroke="' + C.boneS + '" stroke-width="3"/>';
    if (!trimmed) v += prox;
    v += '<rect x="76" y="' + (y - sh / 2) + '" width="246" height="' + sh + '" rx="6" ' + bone + '/>';
    if (!trimmed) v += dist;
    if (o.marrow !== false) v += '<rect x="' + (trimmed ? 80 : 90) + '" y="' + (y - 6) + '" width="' + (trimmed ? 238 : 218) + '" height="12" rx="5" fill="' + C.marrow + '" opacity="' + (o.flushed && (o.flushed === true || o.flushed[kind]) ? 0.12 : 0.75) + '"/>';
    if (trimmed) v += '<ellipse cx="78" cy="' + y + '" rx="5" ry="' + (sh / 2) + '" fill="' + C.marrow + '" opacity=".85"/><ellipse cx="320" cy="' + y + '" rx="5" ry="' + (sh / 2) + '" fill="' + C.marrow + '" opacity=".85"/>';
    const patches = (o.patches && (Array.isArray(o.patches) ? (fem ? o.patches : []) : o.patches[kind])) || [];
    patches.forEach((p, i) => { v += '<g class="patch" data-bone="' + kind + '" data-patch="' + i + '"><ellipse cx="' + p[0] + '" cy="' + (y + p[1]) + '" rx="21" ry="12" fill="' + C.muscle + '" stroke="' + C.muscle2 + '" stroke-width="1.6" opacity=".92"/><path d="M' + (p[0] - 12) + ' ' + (y + p[1]) + ' h24" stroke="' + C.muscle2 + '" opacity=".6"/></g>'; });
    const cuts = (o.cuts && (Array.isArray(o.cuts) ? (fem ? o.cuts : []) : o.cuts[kind])) || [];
    cuts.forEach(cx => { v += '<line x1="' + cx + '" y1="' + (y - 44) + '" x2="' + cx + '" y2="' + (y + 44) + '" stroke="#e5484d" stroke-width="3" stroke-dasharray="6 4"/>'; });
    if (o.regions) {
      v += '<rect x="30" y="' + (y - 38) + '" width="56" height="76" fill="transparent" data-region="' + kind + '-prox" class="hot"/>' +
        '<rect x="320" y="' + (y - 38) + '" width="50" height="76" fill="transparent" data-region="' + kind + '-dist" class="hot"/>' +
        '<rect x="88" y="' + (y - 18) + '" width="230" height="36" fill="transparent" data-region="' + kind + '" class="hot"/>';
    }
    if (o.labels) v += txt(60, y + 52, 'Proximal epiphysis', { size: 9.5 }) + txt(344, y + 52, 'Distal epiphysis', { size: 9.5 }) + txt(200, y + 30, 'Diaphysis (shaft) — ' + (fem ? 'femur' : 'tibia'), { size: 9.5 });
    return v;
  }

  A.femur = function (o) {
    o = o || {};
    return svg(400, 200, '<rect width="400" height="200" fill="#f2f6fb" rx="10"/>' + boneGroup('femur', 100, o) + txt(200, 190, 'Illustration — femur (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'femur');
  };
  A.tibia = function (o) {
    o = o || {};
    return svg(400, 200, '<rect width="400" height="200" fill="#f2f6fb" rx="10"/>' + boneGroup('tibia', 100, o) + txt(200, 190, 'Illustration — tibia (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'femur tibia');
  };
  /** Both bones, one above the other (femur y = 78, tibia y = 210). */
  A.bones = function (o) {
    o = o || {};
    return svg(400, 290, '<rect width="400" height="290" fill="#f2f6fb" rx="10"/>' + boneGroup('femur', 78, o) + boneGroup('tibia', 206, o) + txt(200, 280, 'Illustration — isolated femur and tibia (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'femur bones');
  };
  A.BONE_Y = { femur: 78, tibia: 206 };

  /** A pair of labelled sample tubes: femur (blue cap) and tibia (green cap). */
  A.sampleTubes = function (o) {
    o = o || {};
    const lv = k => (o[k] == null ? 0 : o[k]);
    const one = (k, name, cap) => '<div class="stube">' + A.tube({ level: lv(k), color: '#f3b9bd', label: k === 'femur' ? 'F' : 'T', cap, pellet: o.pellet ? 0.7 : 0 }) + '<span>' + name + '</span></div>';
    return '<div class="stubes">' + one('femur', 'Femur sample', '#2f6db5') + one('tibia', 'Tibia sample', '#2f9d6a') + '</div>';
  };

  /** Draft-pairing / chromosome cards use KL.Karyo; nothing to add here. */
})();
