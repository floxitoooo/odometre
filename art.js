/* Odomètre : illustrations vectorielles (icônes, silhouettes, jauges). Tout est dessiné ici, aucune image tierce. */
(function (root) {
  const I = {
    'vidange': '<path d="M12 3c3.2 4 6 7 6 11a6 6 0 0 1-12 0c0-4 2.8-7 6-11z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2 2.6"/>',
    'filtres': '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M8 9v6M12 9v6M16 9v6"/>',
    'freins': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/><path d="M17 6.5a8 8 0 0 1 0 11" stroke-width="3" opacity=".55"/>',
    'liquide-frein': '<path d="M9.5 3h5v4l3.2 3.2V19a2 2 0 0 1-2 2H8.3a2 2 0 0 1-2-2v-8.8L9.5 7z"/><path d="M6.3 13.5h11.4"/>',
    'pneus': '<circle cx="12" cy="12" r="9" stroke-dasharray="2.4 1.8"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.7"/>',
    'courroie': '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    'batterie': '<rect x="3" y="8" width="18" height="11" rx="2.2"/><path d="M7 8V5.5h3V8M14 8V5.5h3V8M7.5 13.5h3M9 12v3M14 13.5h3"/>',
    'clim': '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.7 4.8L12 7l2.3-2.2M9.7 19.2L12 17l2.3 2.2"/>',
    'ct': '<rect x="5" y="4" width="14" height="17" rx="2.4"/><path d="M9 4h6v3H9z"/><path d="M9 14.2l2.2 2.2L15.2 12"/>',
    'assurance': '<path d="M12 3l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6z"/><path d="M9 12l2.2 2.2L15 10"/>',
    'reparation': '<path d="M20.5 6.8a4.4 4.4 0 0 1-5.8 5.2L7 19.7a2 2 0 0 1-2.8-2.8L12 9.2A4.4 4.4 0 0 1 17 3.4l-2.8 2.8 2.4 2.4z"/>',
    'carrosserie': '<path d="M3 15l1.6-5A2 2 0 0 1 6.5 8.6h11a2 2 0 0 1 1.9 1.4L21 15v3.2H3z"/><circle cx="7.6" cy="18" r="1.8"/><circle cx="16.4" cy="18" r="1.8"/>',
    'autre': '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
    'dash': '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    'log': '<path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3.5"/>',
    'due': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    'cost': '<path d="M5 20V11M11 20V4M17 20v-6M3 20h18"/>',
    'car': '<path d="M3 15.5l1.6-5A2 2 0 0 1 6.5 9h11a2 2 0 0 1 1.9 1.5L21 15.5V19H3z"/><circle cx="7.6" cy="15.5" r="1.4"/><circle cx="16.4" cy="15.5" r="1.4"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'check': '<path d="M5 12.5l4.2 4.2L19 7"/>',
    'camera': '<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
    'cal': '<rect x="4" y="5" width="16" height="15" rx="2.4"/><path d="M4 10h16M9 3v4M15 3v4"/>'
  };
  const icon = (id, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[id] || I.autre}</svg>`;

  const CARS = {
    citadine: { body: 'M22 120 C20 108 26 100 44 97 L98 92 C116 66 144 50 184 50 L238 50 C268 50 292 70 306 92 L350 98 C368 101 380 108 380 120 L380 130 L22 130 Z',
      glass: 'M112 90 C126 68 148 58 180 58 L232 58 C256 58 276 74 288 90 Z', pillar: 'M200 58 L200 90', wheels: [96, 306], r: 25, hx: 372, tx: 24, belt: 'M50 105 C140 100 260 100 352 107' },
    berline: { body: 'M18 120 C16 108 24 101 42 98 L108 93 C130 70 160 56 198 56 L256 56 C288 58 314 78 334 94 L366 99 C382 102 388 109 388 121 L388 130 L18 130 Z',
      glass: 'M122 92 C140 74 164 64 196 64 L252 64 C274 66 296 80 312 94 Z', pillar: 'M206 64 L206 93', wheels: [92, 314], r: 25, hx: 380, tx: 20, belt: 'M46 105 C150 100 270 100 366 108' },
    suv: { body: 'M20 120 C18 104 26 94 46 91 L92 87 C102 58 132 38 172 38 L266 38 C300 40 322 60 334 84 L362 90 C378 94 386 102 386 116 L386 130 L20 130 Z',
      glass: 'M108 86 C118 62 142 48 174 48 L262 48 C288 50 306 66 316 86 Z', pillar: 'M214 48 L214 86', wheels: [98, 312], r: 27, hx: 378, tx: 22, belt: 'M48 98 C150 92 270 92 362 100' },
    utilitaire: { body: 'M18 126 L18 50 C18 42 24 36 32 36 L248 36 C262 36 272 44 282 58 L312 92 L362 100 C376 103 384 110 384 122 L384 130 L18 130 Z',
      glass: 'M258 46 L296 90 L258 90 Z', pillar: 'M150 36 L150 126', wheels: [96, 306], r: 25, hx: 376, tx: 20, belt: 'M24 108 L330 108' }
  };
  const BODY_LABELS = { citadine: 'Citadine', berline: 'Berline', suv: 'SUV', utilitaire: 'Utilitaire' };

  let uidn = 0;
  /** Silhouette de voiture éclairée par une ligne d'ambre, sur une route animée. */
  function car(kind) {
    const c = CARS[kind] || CARS.citadine; const id = 'c' + (++uidn);
    const wheel = (x) => `<g class="wheel"><circle cx="${x}" cy="122" r="${c.r + 5}" fill="var(--arch)"/><circle cx="${x}" cy="122" r="${c.r}" fill="#0A0B0D"/><circle cx="${x}" cy="122" r="${c.r - 9}" fill="url(#${id}r)"/><g class="spin" style="transform-origin:${x}px 122px">${[0, 72, 144, 216, 288].map((a) => `<path d="M${x} 122 L${x} ${122 - c.r + 11}" stroke="#0A0B0D" stroke-width="3.2" transform="rotate(${a} ${x} 122)"/>`).join('')}</g><circle cx="${x}" cy="122" r="4.5" fill="#2B2F38"/></g>`;
    return `<svg class="carsvg" viewBox="0 0 410 175" role="img" aria-label="Illustration du véhicule">
      <defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--car1)"/><stop offset="1" stop-color="var(--car2)"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--glass1)"/><stop offset="1" stop-color="var(--glass2)"/></linearGradient>
      <radialGradient id="${id}r"><stop offset="0" stop-color="#C9CED8"/><stop offset="1" stop-color="#5C6370"/></radialGradient>
      <radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="var(--accent)" stop-opacity=".55"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".5" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      <ellipse cx="205" cy="148" rx="190" ry="11" fill="#000" opacity=".35"/>
      <ellipse cx="${c.hx - 10}" cy="112" rx="46" ry="22" fill="url(#${id}l)"/>
      <path d="${c.body}" fill="url(#${id}b)"/>
      <path d="${c.body}" fill="none" stroke="url(#${id}s)" stroke-width="1.6" opacity=".9"/>
      <path d="${c.glass}" fill="url(#${id}g)"/><path d="${c.pillar}" stroke="var(--car2)" stroke-width="3"/>
      <path d="${c.belt}" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".7"/>
      ${c.wheels.map(wheel).join('')}
      <path d="M${c.hx - 8} 103 L${c.hx + 2} 105 L${c.hx + 2} 112 L${c.hx - 10} 111 Z" fill="#FFF1C9"/>
      <path d="M${c.tx} 105 L${c.tx + 8} 104 L${c.tx + 8} 113 L${c.tx} 114 Z" fill="#FF5A4D"/>
      <path class="road" d="M6 156 H404" stroke="var(--line)" stroke-width="2" stroke-dasharray="14 12"/></svg>`;
  }

  /** Plaque d'immatriculation française (format SIV), purement décorative. */
  const plate = (txt) => { const t = String(txt || '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 16); return t ? `<div class="plate" aria-label="Plaque ${t}"><span class="eu"><i></i>F</span><b>${t}</b><span class="reg"></span></div>` : ''; };

  /** Compteur mécanique à chiffres. */
  const odo = (km) => { const s = String(Math.max(0, Math.round(km))).padStart(6, '0'); return `<div class="odo" data-km="${Math.round(km)}" aria-label="${new Intl.NumberFormat('fr-FR').format(km)} kilomètres">${s.split('').map((d) => `<span class="dg">${d}</span>`).join('')}<span class="unit">km</span></div>`; };

  const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  /** Jauge d'instrument semi-circulaire : score 0 à 100. */
  function cluster(score) {
    const cx = 110, cy = 112, r = 88; const has = score != null; const s = has ? score : 0;
    const col = !has ? 'var(--muted)' : s >= 70 ? 'var(--ok)' : s >= 40 ? 'var(--warn)' : 'var(--bad)';
    const [x0, y0] = polar(cx, cy, r, 180), [x1, y1] = polar(cx, cy, r, 180 + 180 * (s / 100));
    let ticks = '';
    for (let i = 0; i <= 20; i++) { const a = 180 + 9 * i; const big = i % 5 === 0; const [ax, ay] = polar(cx, cy, r + 9, a), [bx, by] = polar(cx, cy, r + (big ? 18 : 14), a); ticks += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="var(--muted)" stroke-width="${big ? 2 : 1}" opacity="${big ? .8 : .4}"/>`; }
    return `<svg class="cluster-svg" viewBox="0 0 220 152" role="img" aria-label="Santé du véhicule : ${has ? s + ' sur 100' : 'non renseignée'}">
      <path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/>
      ${has ? `<path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" class="arc"/>` : ''}${ticks}
      ${has ? `<g class="needle" style="--r:${(-90 + 180 * (s / 100)).toFixed(1)}deg"><path d="M110 112 L110 50" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/></g>` : ''}
      <circle cx="${cx}" cy="${cy}" r="8" fill="var(--panel2)" stroke="var(--text)" stroke-width="2"/>
      <text x="110" y="148" text-anchor="middle" class="gtxt" fill="${col}">${has ? s : '–'}</text></svg>`;
  }

  /** Anneau de répartition. parts : [{v, color}] */
  function donut(parts) {
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 25;
    return `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Répartition des dépenses"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="5"/>${parts.map((p) => { const d = (p.v / tot) * 100; const s = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${p.color}" stroke-width="5" stroke-dasharray="${Math.max(d - 0.6, 0.1).toFixed(2)} ${(100 - d + 0.6).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`; off -= d; return s; }).join('')}</svg>`;
  }

  const spark = (vals) => { const max = Math.max.apply(null, vals.concat([1])); const w = 160, h = 44, bw = w / vals.length; return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${vals.map((v, i) => { const bh = Math.max(2, (v / max) * (h - 4)); return `<rect x="${(i * bw + 2).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--accent)" opacity="${v ? 0.95 : 0.22}"/>`; }).join('')}</svg>`; };

  /** Grande scène d'accueil (écran de licence, états vides). */
  const scene = (kind) => `<div class="scene">${car(kind || 'berline')}</div>`;

  root.Art = { icon, car, plate, odo, cluster, donut, spark, scene, BODY_LABELS, CAR_KINDS: Object.keys(CARS) };
})(window);
