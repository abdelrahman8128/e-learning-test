/* =========================================================================
   art.js — illustrative SVG artwork. Everything here is a schematic ILLUSTRATION,
   drawn in code: none of it is a photograph or an experimental result.
   ========================================================================= */
(function () {
  'use strict';
  const KL = window.KL;

  const C = { ink: '#233a5c', bone: '#f3e6c8', boneS: '#b69b62', muscle: '#c8574f', muscle2: '#b04740', fat: '#e9d2a0', skin: '#f7ece3',
    fur: '#fbf7f2', water: '#cfe4f6', blue: '#2f6db5', navy: '#12305f', pellet: '#d9a0a6', marrow: '#c0392b', glass: '#eaf3fb' };

  const svg = (w, h, inner, cls) => '<svg class="art ' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' + inner + '</svg>';
  const txt = (x, y, s, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 12) + '" fill="' + (o.fill || C.ink) + '" text-anchor="' + (o.anchor || 'middle') + '" font-weight="' + (o.weight || 600) + '" font-family="inherit">' + s + '</text>'; };

  /** Tapered limb segment from p1 to p2 with widths w1, w2 (rounded ends). */
  function taper(p1, p2, w1, w2, attrs) {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const a = [p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2], b = [p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2];
    const c = [p2[0] - nx * w2 / 2, p2[1] - ny * w2 / 2], d = [p2[0] + nx * w2 / 2, p2[1] + ny * w2 / 2];
    return '<path d="M' + a + ' L' + d + ' A' + w2 / 2 + ' ' + w2 / 2 + ' 0 0 1 ' + c + ' L' + b + ' A' + w1 / 2 + ' ' + w1 / 2 + ' 0 0 1 ' + a + ' Z" ' + (attrs || '') + '/>';
  }
  const lineAngle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;

  /* ---------------------------------------------------------------- animal */
  function rat(o) {
    o = o || {};
    const hl = o.highlight === 'neck' ? '<circle cx="132" cy="108" r="22" fill="none" stroke="#e5484d" stroke-width="3" stroke-dasharray="5 4"/>' : '';
    const hl2 = o.highlight === 'limb' ? '<ellipse cx="330" cy="160" rx="42" ry="48" fill="none" stroke="#e5484d" stroke-width="3" stroke-dasharray="5 4"/>' : '';
    return svg(480, 280,
      '<path d="M385 175 C440 170 470 120 455 70 C452 60 444 62 446 74 C455 112 430 150 385 150" fill="#f4c9c4" stroke="#d8a09a" stroke-width="2"/>' +
      '<ellipse cx="270" cy="150" rx="135" ry="62" fill="' + C.fur + '" stroke="#cdbfae" stroke-width="2.5"/>' +
      '<path d="M165 150 C150 110 120 100 80 118 C58 128 52 150 66 166 C86 186 140 190 168 178 Z" fill="' + C.fur + '" stroke="#cdbfae" stroke-width="2.5"/>' +
      '<ellipse cx="110" cy="96" rx="15" ry="20" fill="#f4c9c4" stroke="#d8a09a" stroke-width="2" transform="rotate(-18 110 96)"/>' +
      '<circle cx="88" cy="132" r="5" fill="#c0392b"/><circle cx="58" cy="152" r="4" fill="#d8a09a"/>' +
      '<path d="M62 160 l-22 4 M62 156 l-22 -4 M64 150 l-20 -12" stroke="#bda88f" stroke-width="1.2"/>' +
      '<path d="M205 200 l-8 40 q10 8 22 0 l4 -34 Z M350 196 l14 44 q16 6 30 -2 l-14 -28 Z" fill="' + C.fur + '" stroke="#cdbfae" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M215 200 l30 34 q6 12 -8 12 l-30 0" fill="none"/>' + hl + hl2 +
      txt(240, 268, 'Illustration — stylised rat (not to scale)', { size: 11, fill: '#6b7a90', weight: 500 }));
  }

  function skeletonNeck() {
    let v = '';
    for (let i = 0; i < 7; i++) v += '<rect x="' + (170 + i * 20) + '" y="' + (112 + i * 3) + '" width="16" height="22" rx="4" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="1.6" transform="rotate(' + (i * 2) + ' ' + (178 + i * 20) + ' ' + (123 + i * 3) + ')"/>';
    for (let i = 0; i < 9; i++) v += '<rect x="' + (312 + i * 18) + '" y="' + (128 + i * 2) + '" width="14" height="20" rx="4" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="1.4"/>';
    return svg(480, 260,
      '<path d="M170 130 C110 60 40 80 30 128 C28 170 84 190 160 160 Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2"/>' +
      '<circle cx="82" cy="118" r="16" fill="#fff" stroke="' + C.boneS + '" stroke-width="2"/><circle cx="82" cy="118" r="7" fill="#5b4b3a"/>' +
      '<path d="M40 150 l50 6 M36 140 l30 4" stroke="' + C.boneS + '" stroke-width="3"/>' + v +
      '<path d="M300 180 C330 230 400 230 450 190" fill="none" stroke="' + C.boneS + '" stroke-width="3"/>' +
      '<line x1="228" y1="104" x2="262" y2="44" stroke="' + C.ink + '" stroke-width="1.6"/>' +
      '<rect x="224" y="12" width="164" height="34" rx="5" fill="#fff" stroke="' + C.ink + '"/>' +
      txt(306, 27, 'Cervical vertebrae', { size: 12 }) + txt(306, 41, '(dislocation point)', { size: 11, weight: 500 }) +
      txt(240, 250, 'Illustration — skeletal side view (schematic)', { size: 11, fill: '#6b7a90', weight: 500 }));
  }

  /* ------------------------------------------------------------- hind limb */
  const HIP = [120, 60], KNEE = [265, 150], ANKLE = [165, 250], TOE = [262, 275];
  /**
   * mode: 'skin' (intact), 'incision' (shows line options), 'open' (skin reflected), 'muscle', 'bone'
   * o.regions → add transparent clickable regions (data-region)
   */
  function limb(o) {
    o = o || {};
    const mode = o.mode || 'bone';
    let v = '';
    const withRegion = (name, shape) => o.regions ? shape.replace('/>', ' data-region="' + name + '" class="hot"/>') : shape;
    // bones
    const bones =
      '<g>' + taper(HIP, KNEE, 17, 21, 'fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"') +
      '<circle cx="' + HIP[0] + '" cy="' + HIP[1] + '" r="17" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/>' +
      '<circle cx="' + KNEE[0] + '" cy="' + KNEE[1] + '" r="15" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/>' +
      taper(KNEE, ANKLE, 13, 10, 'fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"') +
      taper(ANKLE, TOE, 9, 7, 'fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2"') + '</g>';
    const pelvis = '<path d="M30 40 C60 10 130 14 150 48 C140 80 90 90 60 76 C36 66 24 56 30 40 Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/>';
    // muscle mass of thigh and shank
    const thighM = taper([HIP[0] + 4, HIP[1] + 2], [KNEE[0] - 2, KNEE[1] + 2], 92, 62, 'fill="' + C.muscle + '" stroke="' + C.muscle2 + '" stroke-width="2"');
    const shankM = taper([KNEE[0] - 6, KNEE[1] + 6], [ANKLE[0] + 4, ANKLE[1] - 8], 46, 22, 'fill="' + C.muscle + '" stroke="' + C.muscle2 + '" stroke-width="2"');
    const fibres = '<path d="M95 70 L235 150 M110 92 L240 168 M125 50 L255 128 M200 170 L172 232 M214 160 L188 226" stroke="' + C.muscle2 + '" stroke-width="1.4" opacity=".55" fill="none"/>';
    const skinS = taper([HIP[0] + 2, HIP[1] + 4], [KNEE[0], KNEE[1] + 4], 110, 76, 'fill="' + C.skin + '" stroke="#d9c3b0" stroke-width="2.4"') +
      taper([KNEE[0] - 6, KNEE[1] + 6], [ANKLE[0] + 4, ANKLE[1] - 6], 60, 30, 'fill="' + C.skin + '" stroke="#d9c3b0" stroke-width="2.4"') +
      taper(ANKLE, TOE, 22, 18, 'fill="' + C.skin + '" stroke="#d9c3b0" stroke-width="2.4"');
    if (mode === 'bone') {
      v += pelvis + bones;
      if (o.regions) v += '<path d="M60 60 L130 60 L270 140 L260 165 L130 78 Z" fill="transparent" data-region="femur" class="hot"/>' +
        '<path d="M260 140 L280 150 L190 252 L150 244 Z" fill="transparent" data-region="tibia" class="hot"/>' +
        '<path d="M150 244 L262 270 L262 282 L150 262 Z" fill="transparent" data-region="foot" class="hot"/>';
    } else if (mode === 'muscle') {
      v += pelvis + bones + withRegion('thigh-muscle', thighM) + withRegion('shank-muscle', shankM) + fibres;
      if (!o.regions) v += '';
    } else if (mode === 'open') {
      v += pelvis + bones + thighM + shankM + fibres +
        '<path d="M70 18 C20 60 20 110 70 130 C110 140 150 100 110 70 Z" fill="' + C.skin + '" stroke="#d9c3b0" stroke-width="2.4" opacity=".96"/>' +
        '<path d="M300 110 C340 100 370 140 340 190 C320 220 290 200 285 170 Z" fill="' + C.skin + '" stroke="#d9c3b0" stroke-width="2.4"/>';
      if (o.regions) v += '<path d="M40 70 L120 40 L265 120 L255 190 L130 120 Z" fill="transparent" data-region="thigh-muscle" class="hot"/>' +
        '<path d="M255 150 L280 160 L190 250 L150 240 Z" fill="transparent" data-region="shank-muscle" class="hot"/>';
    } else { // skin / incision
      v += pelvis + skinS;
      if (mode === 'incision') {
        v += '<path id="incA" d="M110 62 L266 148" stroke="#e5484d" stroke-width="3.5" stroke-dasharray="7 5" fill="none"/>' +
          '<path id="incB" d="M300 120 C330 150 320 200 285 214" stroke="#e5484d" stroke-width="3.5" stroke-dasharray="7 5" fill="none"/>' +
          '<path id="incC" d="M120 190 L120 250" stroke="#e5484d" stroke-width="3.5" stroke-dasharray="7 5" fill="none"/>';
      }
    }
    return svg(380, 300, '<rect width="380" height="300" fill="#f2f6fb" rx="10"/>' + v +
      txt(190, 292, 'Illustration — right hind limb, side view (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'limb');
  }

  /* ----------------------------------------------------------------- femur */
  /** Horizontal femur 40→360. o: patches[] tissue patches to show, cuts[] cut x positions, open bool, labels bool */
  function femur(o) {
    o = o || {};
    const x0 = 36, x1 = 364, y = 100;
    let v = '';
    const shaft = '<rect x="' + (x0 + 40) + '" y="' + (y - 13) + '" width="' + (x1 - x0 - 82) + '" height="26" rx="6" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/>';
    const head = '<circle cx="' + (x0 + 18) + '" cy="' + (y - 4) + '" r="28" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/><path d="M' + (x0 + 28) + ' ' + (y - 22) + ' q22 -22 44 -8" fill="none"/>' +
      '<rect x="' + (x0 + 28) + '" y="' + (y - 34) + '" width="20" height="20" rx="8" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2" transform="rotate(-20 ' + (x0 + 38) + ' ' + (y - 24) + ')"/>';
    const condyles = '<ellipse cx="' + (x1 - 20) + '" cy="' + (y + 4) + '" rx="24" ry="30" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="2.2"/>';
    v += o.trimmed ? '' : head;
    v += shaft;
    v += o.trimmed ? '' : condyles;
    if (o.marrow !== false) v += '<rect x="' + (x0 + (o.trimmed ? 20 : 44)) + '" y="' + (y - 6) + '" width="' + (x1 - x0 - (o.trimmed ? 40 : 92)) + '" height="12" rx="5" fill="' + C.marrow + '" opacity="' + (o.flushed ? 0.12 : 0.75) + '"/>';
    (o.patches || []).forEach((p, i) => { v += '<g class="patch" data-patch="' + i + '"><ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="20" ry="11" fill="' + C.muscle + '" stroke="' + C.muscle2 + '" stroke-width="1.6" opacity=".92"/><path d="M' + (p[0] - 12) + ' ' + p[1] + ' h24" stroke="' + C.muscle2 + '" opacity=".6"/></g>'; });
    (o.cuts || []).forEach(cx => { v += '<line x1="' + cx + '" y1="' + (y - 42) + '" x2="' + cx + '" y2="' + (y + 42) + '" stroke="#e5484d" stroke-width="3" stroke-dasharray="6 4"/>'; });
    if (o.labels) v += txt(x0 + 20, y + 54, 'Proximal epiphysis', { size: 10 }) + txt(x1 - 20, y + 54, 'Distal epiphysis', { size: 10 }) + txt(200, y + 40, 'Diaphysis (shaft) — medullary cavity', { size: 10 });
    if (o.trimmed) v += '<ellipse cx="' + (x0 + 28) + '" cy="' + y + '" rx="5" ry="13" fill="' + C.marrow + '" opacity=".85"/><ellipse cx="' + (x1 - 28) + '" cy="' + y + '" rx="5" ry="13" fill="' + C.marrow + '" opacity=".85"/>';
    return svg(400, 200, '<rect width="400" height="200" fill="#f2f6fb" rx="10"/>' + v +
      txt(200, 190, 'Illustration — femur (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'femur');
  }

  /* ------------------------------------------------- tubes, syringe, rotor */
  /** Conical tube. o: level 0–1, color, pellet 0–1, pelletColor, label, w, cap */
  function tube(o) {
    o = o || {};
    const lvl = o.level == null ? 0.6 : o.level, y0 = 36, y1 = 190, H = y1 - y0;
    const top = y1 - H * lvl;
    const clip = 'M26 30 L26 150 Q26 160 33 176 L40 196 Q50 206 60 196 L67 176 Q74 160 74 150 L74 30 Z';
    const id = 'tc' + Math.floor(Math.random() * 1e6);
    return svg(100, 220,
      '<defs><clipPath id="' + id + '"><path d="' + clip + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect x="20" y="' + top + '" width="60" height="' + (230 - top) + '" fill="' + (o.color || '#f3b9bd') + '" opacity=".85"/>' +
      (o.pellet ? '<ellipse cx="50" cy="' + (192 - 4) + '" rx="' + (10 + o.pellet * 8) + '" ry="' + (6 + o.pellet * 14) + '" fill="' + (o.pelletColor || '#b04a55') + '" data-part="pellet"/>' : '') + '</g>' +
      '<path d="' + clip + '" fill="rgba(255,255,255,.35)" stroke="' + C.ink + '" stroke-width="2.2"/>' +
      '<rect x="22" y="18" width="56" height="14" rx="4" fill="' + (o.cap || '#2f6db5') + '" stroke="' + C.ink + '" stroke-width="1.6"/>' +
      (o.label ? '<rect x="30" y="62" width="40" height="22" rx="2" fill="#fff" stroke="#b9c5d6"/>' + txt(50, 77, o.label, { size: 10 }) : '') +
      '<path d="M26 40 h8 M26 70 h8 M26 100 h8 M26 130 h8" stroke="' + C.ink + '" stroke-width="1.2" opacity=".6"/>', 'tube');
  }

  function syringe(o) {
    o = o || {};
    const ml = o.ml == null ? 0 : o.ml, max = 5, fill = Math.min(1, ml / max) * 150;
    return svg(420, 130,
      '<rect x="60" y="40" width="180" height="46" rx="6" fill="' + C.glass + '" stroke="' + C.ink + '" stroke-width="2.2"/>' +
      '<rect x="62" y="42" width="' + fill + '" height="42" rx="4" fill="' + (o.color || '#9ec9ec') + '" opacity=".85"/>' +
      '<path d="M80 40 v10 M110 40 v14 M140 40 v10 M170 40 v14 M200 40 v10 M230 40 v14" stroke="' + C.ink + '" stroke-width="1.4"/>' +
      '<rect x="' + (28 + (150 - fill)) + '" y="58" width="36" height="10" fill="#c4cfdc" stroke="' + C.ink + '" stroke-width="1.6"/>' +
      '<rect x="' + (14 + (150 - fill)) + '" y="48" width="16" height="30" rx="4" fill="#c4cfdc" stroke="' + C.ink + '" stroke-width="1.6"/>' +
      '<path d="M240 55 l30 5 v6 l-30 5 Z" fill="#c4cfdc" stroke="' + C.ink + '" stroke-width="1.6"/><path d="M270 63 L380 63" stroke="' + C.ink + '" stroke-width="3"/>' +
      txt(150, 112, (ml ? ml.toFixed(1) : '0.0') + ' mL', { size: 14 }) +
      txt(210, 24, 'Illustration — syringe with needle', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'syringe');
  }

  /** Centrifuge rotor, top view: 6 slots; o.tubes = {slotIndex:'sample'|'balance'} ; o.spin angle */
  function rotor(o) {
    o = o || {};
    let v = '<circle cx="150" cy="150" r="128" fill="#e6edf6" stroke="' + C.ink + '" stroke-width="3"/><circle cx="150" cy="150" r="20" fill="#9fb3cc" stroke="' + C.ink + '" stroke-width="2"/>';
    let rot = '<g class="' + (o.spin ? 'spin' : '') + '" style="transform-origin:150px 150px">';
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 90) * Math.PI / 180, x = 150 + 86 * Math.cos(a), y = 150 + 86 * Math.sin(a), t = (o.tubes || {})[i];
      rot += '<g class="' + (o.interactive ? 'rslot hot' : 'rslot-static') + '"' + (o.interactive ? ' data-slot="' + i + '"' : '') + '><circle cx="' + x + '" cy="' + y + '" r="24" fill="' + (t ? (t === 'sample' ? '#e8a0a8' : '#9ec9ec') : '#fff') + '" stroke="' + C.ink + '" stroke-width="2.2"/>' +
        (t ? txt(x, y + 4, t === 'sample' ? 'S' : 'B', { size: 12, fill: '#fff' }) : txt(x, y + 4, (i + 1), { size: 11, fill: '#8a9bb3', weight: 500 })) + '</g>';
    }
    return svg(300, 300, v + rot + '</g>' + txt(150, 296, 'Illustration — rotor, top view', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'rotor');
  }

  function waterbath(o) {
    o = o || {};
    return svg(400, 240,
      '<rect x="40" y="90" width="320" height="120" rx="10" fill="#d6dde8" stroke="' + C.ink + '" stroke-width="2.4"/>' +
      '<rect x="52" y="112" width="296" height="86" rx="6" fill="' + (o.on ? '#9fd0f2' : '#cfe0ee') + '" stroke="' + C.ink + '" stroke-width="1.6"/>' +
      '<rect x="80" y="40" width="240" height="30" rx="4" fill="#9fb3cc" stroke="' + C.ink + '" stroke-width="2"/>' +
      '<rect x="270" y="46" width="44" height="18" rx="3" fill="#0f2038"/>' + txt(292, 60, (o.temp == null ? '--' : o.temp) + '°C', { size: 11, fill: '#7dffa8' }) +
      (o.tube ? '<g transform="translate(190 66) scale(.55)">' + tube({ level: .35, color: '#f0b6bb' }).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g>' : '') +
      '<path d="M90 128 q10 -8 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>' +
      txt(200, 232, 'Illustration — water bath', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'bath');
  }

  function bottle(o) {
    o = o || {};
    return svg(130, 200,
      '<rect x="48" y="12" width="34" height="22" rx="4" fill="' + (o.cap || '#2f6db5') + '" stroke="' + C.ink + '" stroke-width="2"/>' +
      '<path d="M48 34 h34 v22 c18 8 22 20 22 36 v78 c0 10 -6 16 -16 16 h-46 c-10 0 -16 -6 -16 -16 v-78 c0 -16 4 -28 22 -36 Z" fill="' + (o.glass || 'rgba(255,255,255,.55)') + '" stroke="' + C.ink + '" stroke-width="2.2"/>' +
      '<rect x="26" y="96" width="78" height="62" rx="3" fill="#fff" stroke="#b9c5d6"/>' + (o.hazard ? '<path d="M104 70 l12 -22 l12 22 Z" fill="#f4b400" stroke="' + C.ink + '"/><text x="116" y="68" font-size="11" text-anchor="middle" fill="' + C.ink + '" font-weight="700">!</text>' : '') +
      txt(65, 118, o.l1 || '', { size: 11 }) + txt(65, 134, o.l2 || '', { size: 10, weight: 500 }) + txt(65, 150, o.l3 || '', { size: 9, weight: 500 }), 'bottle');
  }

  function cells(o) {
    o = o || {};
    const f = o.swell == null ? 0 : o.swell, r = 16 + f * 18;
    let v = '';
    [[70, 70], [160, 60], [110, 130], [200, 130], [260, 80]].forEach((p, i) => {
      const rr = r + (i % 2) * 2;
      v += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + rr + '" fill="#f6dfe3" stroke="#b35a66" stroke-width="2"/><circle cx="' + (p[0] + 2) + '" cy="' + p[1] + '" r="' + (rr * 0.5) + '" fill="#8a5aa8" opacity=".85"/>';
    });
    return svg(320, 190, '<rect width="320" height="190" fill="#f2f6fb" rx="10"/>' + v +
      txt(160, 176, 'Illustration — cells in suspension (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'cells');
  }

  function spindle() {
    let v = '<ellipse cx="160" cy="95" rx="120" ry="70" fill="#f6dfe3" stroke="#b35a66" stroke-width="2.4"/>';
    for (let i = -3; i <= 3; i++) v += '<path d="M60 95 Q160 ' + (95 + i * 22) + ' 260 95" fill="none" stroke="#7aa0cf" stroke-width="1.6"/>';
    for (let i = -3; i <= 3; i++) v += '<rect x="154" y="' + (95 + i * 11 - 4) + '" width="12" height="8" rx="4" fill="#6b3f93"/>';
    v += '<circle cx="60" cy="95" r="6" fill="#2f6db5"/><circle cx="260" cy="95" r="6" fill="#2f6db5"/>';
    return svg(320, 190, '<rect width="320" height="190" fill="#f2f6fb" rx="10"/>' + v +
      txt(160, 182, 'Metaphase plate and spindle (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'spindle');
  }

  function arrest() {
    let v = '<ellipse cx="160" cy="92" rx="118" ry="68" fill="#f6dfe3" stroke="#b35a66" stroke-width="2.4"/>';
    for (let i = -3; i <= 3; i++) v += '<rect x="' + (110 + (i * 9)) + '" y="' + (92 + (i % 2) * 14 - 14) + '" width="10" height="26" rx="5" fill="#6b3f93" transform="rotate(' + (i * 12) + ' ' + (115 + i * 9) + ' 92)"/>';
    v += '<path d="M44 92 l34 0 M276 92 l-34 0" stroke="#e5484d" stroke-width="3"/><text x="52" y="82" font-size="26" fill="#e5484d" font-weight="800">✕</text><text x="262" y="82" font-size="26" fill="#e5484d" font-weight="800">✕</text>';
    return svg(320, 190, '<rect width="320" height="190" fill="#f2f6fb" rx="10"/>' + v +
      txt(160, 182, 'Colchicine: no spindle → arrest at metaphase (schematic)', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'arrest');
  }

  function slide(o) {
    o = o || {};
    let v = '<rect x="30" y="70" width="300" height="90" rx="6" fill="' + (o.wet ? '#d9ecfa' : '#eef6fc') + '" stroke="' + C.ink + '" stroke-width="2.4"/><rect x="36" y="76" width="64" height="78" fill="#fff" opacity=".75" stroke="#b9c5d6"/>' + txt(68, 120, o.label || '', { size: 10 });
    (o.drops || []).forEach((d, i) => { v += '<circle cx="' + (170 + d * 46) + '" cy="115" r="12" fill="#f0b6bb" stroke="#b35a66" stroke-width="1.6" opacity=".9"/>'; });
    if (o.stain) v += '<rect x="110" y="86" width="210" height="58" rx="6" fill="' + (o.stain === 'pour' ? '#6a4c9c' : '#8566b8') + '" opacity=".55"/>';
    return svg(360, 220, '<rect width="360" height="220" fill="#f2f6fb" rx="10"/>' + v +
      txt(180, 206, 'Illustration — glass slide' + (o.note ? ' · ' + o.note : ''), { size: 10.5, fill: '#6b7a90', weight: 500 }), 'slide');
  }

  function dropper() {
    return svg(120, 200, '<ellipse cx="60" cy="30" rx="18" ry="22" fill="#d0463b" stroke="' + C.ink + '" stroke-width="2"/><rect x="50" y="48" width="20" height="14" fill="#9aa8bb" stroke="' + C.ink + '" stroke-width="1.6"/><path d="M48 62 h24 l-8 112 h-8 Z" fill="' + C.glass + '" stroke="' + C.ink + '" stroke-width="2"/><rect x="56" y="110" width="8" height="60" fill="#f0b6bb"/>', 'dropper');
  }

  function microscope() {
    return svg(200, 220, '<path d="M60 200 h110 v10 h-110 Z" fill="#43556f"/><path d="M110 200 v-110 q50 10 40 80" fill="none" stroke="#43556f" stroke-width="14" stroke-linecap="round"/><rect x="92" y="40" width="22" height="70" rx="4" fill="#5d7391" stroke="' + C.ink + '" stroke-width="2" transform="rotate(-18 100 80)"/><rect x="62" y="150" width="70" height="8" fill="#93a6bf" stroke="' + C.ink + '" stroke-width="1.6"/><rect x="82" y="108" width="12" height="30" fill="#7b8da6" stroke="' + C.ink + '" stroke-width="1.6"/>', 'scope');
  }

  function jar(o) {
    o = o || {};
    return svg(130, 170, '<rect x="30" y="14" width="70" height="16" rx="4" fill="#5d7391" stroke="' + C.ink + '" stroke-width="2"/><path d="M26 30 h78 v110 q0 14 -14 14 h-50 q-14 0 -14 -14 Z" fill="rgba(255,255,255,.5)" stroke="' + C.ink + '" stroke-width="2.2"/><rect x="30" y="70" width="70" height="80" fill="' + (o.color || '#7e5fb3') + '" opacity=".8"/><rect x="36" y="46" width="58" height="26" rx="2" fill="#fff" stroke="#b9c5d6"/>' + txt(65, 63, o.label || 'Giemsa', { size: 10 }), 'jar');
  }

  function fume() {
    return svg(300, 200, '<rect x="30" y="20" width="240" height="150" rx="8" fill="#e3edf7" stroke="' + C.ink + '" stroke-width="2.6"/><rect x="42" y="32" width="216" height="62" rx="4" fill="rgba(160,200,235,.45)" stroke="' + C.ink + '"/><rect x="42" y="100" width="216" height="58" fill="#cdd9e8"/><path d="M110 66 v-30 M150 66 v-30 M190 66 v-30" stroke="#2f6db5" stroke-width="3" marker-end="url(#a)" stroke-dasharray="4 4"/>' + txt(150, 190, 'Illustration — chemical fume hood', { size: 10.5, fill: '#6b7a90', weight: 500 }), 'fume');
  }

  /* ------- tool icons (tools-used panel) ------- */
  const TOOL = {
    gloves: () => svg(70, 70, '<path d="M20 60 V34 q0-10 8-10 h2 v-8 q0-6 6-6 t6 6 v6 q0-6 6-6 t6 6 v6 q4-2 6 2 l-2 34 Z" fill="#6aa7e6" stroke="#2f6db5" stroke-width="2"/>'),
    goggles: () => svg(70, 70, '<rect x="6" y="24" width="58" height="26" rx="12" fill="#cfe9f7" stroke="#2f6db5" stroke-width="3"/><line x1="35" y1="26" x2="35" y2="48" stroke="#2f6db5" stroke-width="3"/>'),
    coat: () => svg(70, 70, '<path d="M20 8 l15 12 l15-12 l12 10 l-6 14 v32 h-42 v-32 l-6-14 Z" fill="#fff" stroke="#9db0c8" stroke-width="2.4"/><line x1="35" y1="20" x2="35" y2="62" stroke="#9db0c8"/>'),
    scissors: () => svg(70, 70, '<circle cx="20" cy="54" r="8" fill="none" stroke="#2f6db5" stroke-width="3"/><circle cx="42" cy="54" r="8" fill="none" stroke="#2f6db5" stroke-width="3"/><path d="M24 48 L56 8 M38 48 L10 8" stroke="#43556f" stroke-width="4" stroke-linecap="round"/>'),
    forceps: () => svg(70, 70, '<path d="M30 62 L26 8 M40 62 L44 8" stroke="#43556f" stroke-width="5" stroke-linecap="round"/><path d="M26 8 L35 28 L44 8" fill="none" stroke="#43556f" stroke-width="3"/>'),
    scalpel: () => svg(70, 70, '<path d="M10 58 L46 22" stroke="#2f6db5" stroke-width="7" stroke-linecap="round"/><path d="M46 22 L60 8 L58 24 Z" fill="#c4cfdc" stroke="#43556f" stroke-width="2"/>'),
    gauze: () => svg(70, 70, '<rect x="12" y="14" width="46" height="42" rx="4" fill="#fff" stroke="#9db0c8" stroke-width="2.4"/><path d="M12 26 h46 M12 38 h46 M24 14 v42 M36 14 v42 M48 14 v42" stroke="#cfd9e6"/>'),
    pad: () => svg(70, 70, '<rect x="8" y="18" width="54" height="36" rx="3" fill="#7fb7e8" stroke="#2f6db5" stroke-width="2.4"/>'),
    syringe: () => svg(70, 70, '<rect x="8" y="26" width="38" height="16" rx="3" fill="#eaf3fb" stroke="#233a5c" stroke-width="2.2"/><path d="M46 34 H64" stroke="#233a5c" stroke-width="3"/><rect x="2" y="30" width="8" height="8" fill="#c4cfdc" stroke="#233a5c"/>'),
    tube: () => svg(70, 70, '<path d="M24 8 h22 v34 q0 6 -4 14 l-3 8 q-4 4 -8 0 l-3 -8 q-4 -8 -4 -14 Z" fill="#fbe3e6" stroke="#233a5c" stroke-width="2.2"/><rect x="22" y="4" width="26" height="8" rx="2" fill="#2f6db5"/>'),
    centrifuge: () => svg(70, 70, '<rect x="8" y="22" width="54" height="36" rx="6" fill="#d6dde8" stroke="#233a5c" stroke-width="2.4"/><circle cx="35" cy="40" r="11" fill="#fff" stroke="#233a5c" stroke-width="2"/><path d="M35 33 v14 M28 40 h14" stroke="#233a5c"/>'),
    pipette: () => svg(70, 70, '<ellipse cx="40" cy="12" rx="8" ry="9" fill="#d0463b" stroke="#233a5c" stroke-width="2"/><path d="M36 20 h8 l-3 44 h-2 Z" fill="#eaf3fb" stroke="#233a5c" stroke-width="2"/>'),
    bath: () => svg(70, 70, '<rect x="8" y="28" width="54" height="32" rx="5" fill="#9fd0f2" stroke="#233a5c" stroke-width="2.4"/><path d="M14 38 q5-5 10 0 t10 0 t10 0 t10 0" fill="none" stroke="#fff" stroke-width="2"/>'),
    timer: () => svg(70, 70, '<circle cx="35" cy="38" r="22" fill="#fff" stroke="#233a5c" stroke-width="2.6"/><path d="M35 38 V24 M35 38 L45 44" stroke="#233a5c" stroke-width="3" stroke-linecap="round"/><rect x="29" y="8" width="12" height="6" fill="#233a5c"/>'),
    bottle: () => svg(70, 70, '<rect x="28" y="6" width="14" height="10" fill="#2f6db5" stroke="#233a5c" stroke-width="1.8"/><path d="M28 16 h14 v8 c8 4 10 8 10 16 v14 c0 6 -3 8 -8 8 h-18 c-5 0 -8 -2 -8 -8 v-14 c0 -8 2 -12 10 -16 Z" fill="#eaf3fb" stroke="#233a5c" stroke-width="2.2"/>'),
    slide: () => svg(70, 70, '<rect x="6" y="26" width="58" height="20" rx="2" fill="#eaf3fb" stroke="#233a5c" stroke-width="2.4"/><circle cx="40" cy="36" r="5" fill="#f0b6bb"/>'),
    dropper: () => svg(70, 70, '<ellipse cx="35" cy="12" rx="8" ry="10" fill="#d0463b" stroke="#233a5c" stroke-width="2"/><path d="M31 22 h8 l-2 40 h-4 Z" fill="#eaf3fb" stroke="#233a5c" stroke-width="2"/>'),
    microscope: () => svg(70, 70, '<path d="M18 62 h38" stroke="#43556f" stroke-width="6"/><path d="M36 62 V30 q18 4 14 26" fill="none" stroke="#43556f" stroke-width="5"/><rect x="28" y="8" width="9" height="26" rx="2" fill="#7b8da6" stroke="#233a5c" stroke-width="1.8" transform="rotate(-18 32 20)"/>'),
    jar: () => svg(70, 70, '<rect x="18" y="8" width="34" height="8" rx="2" fill="#5d7391"/><path d="M16 16 h38 v38 q0 8 -8 8 h-22 q-8 0 -8 -8 Z" fill="#c9b6e6" stroke="#233a5c" stroke-width="2.2"/>'),
    paper: () => svg(70, 70, '<rect x="12" y="14" width="46" height="42" rx="2" fill="#fffdf4" stroke="#9db0c8" stroke-width="2.2"/><path d="M20 26 h30 M20 36 h30 M20 46 h20" stroke="#d6dce6"/>'),
    ruler: () => svg(70, 70, '<rect x="6" y="26" width="58" height="18" rx="2" fill="#f6e7a6" stroke="#8a7a2f" stroke-width="2"/><path d="M14 26 v8 M22 26 v6 M30 26 v8 M38 26 v6 M46 26 v8 M54 26 v6" stroke="#8a7a2f"/>'),
    calc: () => svg(70, 70, '<rect x="14" y="8" width="42" height="54" rx="5" fill="#eef2f8" stroke="#233a5c" stroke-width="2.4"/><rect x="20" y="14" width="30" height="12" fill="#cfe4f6"/><path d="M22 34 h6 M32 34 h6 M42 34 h6 M22 44 h6 M32 44 h6 M42 44 h6 M22 54 h26" stroke="#233a5c" stroke-width="3" stroke-linecap="round"/>'),
    fume: () => svg(70, 70, '<rect x="8" y="10" width="54" height="48" rx="4" fill="#e3edf7" stroke="#233a5c" stroke-width="2.4"/><rect x="12" y="14" width="46" height="20" fill="rgba(160,200,235,.5)" stroke="#233a5c"/>'),
    flame: () => svg(70, 70, '<path d="M35 6 Q54 28 46 46 Q42 60 35 60 Q26 60 24 46 Q22 32 35 6 Z" fill="#f59e0b" stroke="#c2410c" stroke-width="2"/><path d="M35 30 Q43 42 38 52 Q34 56 31 50 Q28 42 35 30 Z" fill="#fde68a"/>'),
    waste: () => svg(70, 70, '<path d="M18 20 h34 l-4 40 h-26 Z" fill="#f4d5d5" stroke="#233a5c" stroke-width="2.4"/><rect x="14" y="12" width="42" height="8" rx="2" fill="#c0392b" stroke="#233a5c" stroke-width="2"/>'),
    bone: () => svg(70, 70, '<path d="M14 54 L52 16" stroke="#b69b62" stroke-width="10" stroke-linecap="round"/><circle cx="14" cy="54" r="8" fill="#f3e6c8" stroke="#b69b62" stroke-width="2"/><circle cx="52" cy="16" r="8" fill="#f3e6c8" stroke="#b69b62" stroke-width="2"/>')
  };

  KL.Art = { C, svg, txt, rat, skeletonNeck, limb, femur, tube, syringe, rotor, waterbath, bottle, cells, spindle, arrest, slide, dropper, microscope, jar, fume, TOOL, taper, lineAngle };
})();
