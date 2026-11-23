/* Odomètre : écrans (rendu HTML). Lit le contexte exposé par app.js dans window.Odo. */
(function () {
  const A = window.Art;
  const O = () => window.Odo;
  const COLORS = ['#FFB224', '#3DC2B4', '#FF7A6B', '#8E8BFF', '#59A9FF', '#A8D65C', '#C48BD9'];
  const rv = (i) => `style="--i:${i}"`;

  function hero(v) {
    const { esc, num, dFr, picker } = O();
    return `<section class="hero reveal" ${rv(0)}>
      <div class="hero-l"><div class="eyebrow">${A.icon('car')} Mon véhicule</div>
        <h1>${esc(v.name)}</h1>
        <div class="row" style="gap:12px">${A.plate(v.plate)}<span class="muted">${esc(v.fuel || '')}</span></div>
        <div class="odo-wrap"><div class="odo-label">Compteur</div>${A.odo(v.km)}<div class="muted" style="font-size:12px;margin-top:6px">Relevé du ${dFr(v.kmDate)}</div></div>
        <div class="row" style="margin-top:6px">${picker(v)}<button class="btn" data-act="addInt">${A.icon('plus')} Intervention</button><button class="btn ghost" data-act="updateKm">Mettre à jour le km</button></div></div>
      <div class="hero-r">${v.photo ? `<div class="photo" data-photo="${esc(v.photo)}"></div>` : `<div class="carwrap">${A.car(v.body || 'citadine')}</div>`}</div>
    </section>`;
  }

  function dueCard(d, i) {
    const { esc, humanDue, dFr, num, PILL } = O();
    const pct = d.effectiveDays == null ? 0 : Math.max(5, Math.min(100, 100 - (d.effectiveDays / 365) * 100));
    return `<div class="due ${d.status} reveal" ${rv(i)}><div class="ico">${A.icon(d.task.type)}</div>
      <div class="grow"><div class="t">${esc(d.task.label)}</div><div class="s mono">${humanDue(d)}</div>
      <div class="meta mono">${d.dueDate ? A.icon('cal') + dFr(d.dueDate) : ''}${d.dueKm ? ' · ' + num(d.dueKm) + ' km' : ''}</div>
      ${d.status !== 'inconnu' ? `<div class="gauge ${d.status}"><i style="width:${pct}%"></i></div>` : ''}</div>
      <div class="act"><span class="pill ${d.status}">${PILL[d.status]}</span><div class="row"><button class="btn small" data-act="doneTask" data-t="${d.task.id}">Fait</button><button class="btn small ghost" data-act="editTask" data-t="${d.task.id}">Régler</button></div></div></div>`;
  }

  function todoList(todos) {
    const { esc, dFr } = O();
    return todos.length ? todos.map(({ intervention: i, todo: t }) => `<label class="todo"><input type="checkbox" data-act="todoDone" data-i="${i.id}" data-t="${t.id}"><span class="box">${A.icon('check')}</span><span><b>${esc(t.text)}</b><small>noté le ${dFr(i.date)}${i.shop ? ' · ' + esc(i.shop) : ''}</small></span></label>`).join('')
      : '<div class="muted">Rien en attente. Tout ce qui devait être fait l\'a été.</div>';
  }

  function tlItem(i, withMonth) {
    const { esc, eur, num, dFr, typeLabel, state, E } = O();
    const t0 = (i.types || ['autre'])[0] || 'autre';
    const open = (i.todos || []).filter((t) => !t.done).length;
    const cost = state.settings.pro ? E.ht(i.costTtc, i.vat) : Number(i.costTtc || 0);
    return `<div class="tli" data-act="editInt" data-i="${i.id}"><div class="node">${A.icon(t0)}</div>
      <div class="card tcard"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="t">${esc(i.title || (i.types || []).map(typeLabel).join(', ') || 'Intervention')}${i.status === 'planned' ? ' <span class="pill bientot">Prévu</span>' : ''}</div>
        <div class="s">${dFr(i.date)}${i.km != null ? ' · <span class="mono">' + num(i.km) + ' km</span>' : ''}${i.shop ? ' · ' + esc(i.shop) : ''}</div></div><div class="mono price">${eur(cost)}</div></div>
        <div class="tags">${(i.types || []).map((x) => `<span class="tag">${A.icon(x)}${typeLabel(x)}</span>`).join('')}${open ? `<span class="tag warn">${open} à reprendre</span>` : ''}${(i.files || []).length ? `<span class="tag">${A.icon('log')}${i.files.length} pièce(s)</span>` : ''}</div></div></div>`;
  }

  function dash(v) {
    const { state, E, eur, vInts, esc, PILL } = O();
    const dues = E.allDues(v, state.interventions);
    const watch = dues.filter((d) => d.status === 'retard' || d.status === 'bientot');
    const todos = E.openTodos(v.id, state.interventions);
    const m = E.monthly(state.interventions, v.id);
    const key = state.settings.pro ? 'ht' : 'ttc';
    const total = m.reduce((s, x) => s + x[key], 0);
    const cpk = E.costPerKm(v, state.interventions);
    const score = E.health(v, state.interventions);
    const next = dues.find((d) => d.status !== 'inconnu');
    const nr = dues.filter((d) => d.status === 'retard').length, nb = dues.filter((d) => d.status === 'bientot').length, no = dues.filter((d) => d.status === 'ok').length;
    const recent = vInts(v).filter((i) => i.status !== 'planned').sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
    return `${hero(v)}
      <div class="grid g3 dashgrid">
        <div class="card cluster reveal" ${rv(1)}><div class="l">Santé du véhicule</div>${A.cluster(score)}
          <div class="legend"><span class="dot bad"></span>${nr} en retard<span class="dot warn"></span>${nb} bientôt<span class="dot ok"></span>${no} à jour</div></div>
        <div class="card next reveal" ${rv(2)}><div class="l">Prochaine échéance</div>${next ? `<div class="bigico ${next.status}">${A.icon(next.task.type)}</div><h2>${esc(next.task.label)}</h2><div class="mono muted">${O().humanDue(next)}</div><div class="row" style="margin-top:12px"><span class="pill ${next.status}">${PILL[next.status]}</span><button class="btn small" data-act="doneTask" data-t="${next.task.id}">Marquer fait</button></div>` : '<div class="muted" style="margin-top:12px">Renseigne la dernière fois de chaque suivi dans « Échéances ».</div>'}</div>
        <div class="card spendcard reveal" ${rv(3)}><div class="l">12 mois ${state.settings.pro ? 'HT' : 'TTC'}</div><div class="bigv mono">${eur(total)}</div>${A.spark(m.map((x) => x[key]))}<div class="muted mono" style="font-size:12px">${cpk ? (cpk * 100).toFixed(1) + ' c€ au km' : 'Coût au km dès 2 interventions'}</div></div>
      </div>
      ${watch.length ? `<h2 class="sec">À surveiller</h2><div class="stack">${watch.map(dueCard).join('')}</div>` : '<div class="card okcard reveal" ' + rv(4) + '><div class="bigico ok">' + A.icon('check') + '</div><div><b>Tout est à jour.</b><div class="muted">Aucune échéance proche. Profite de la route.</div></div></div>'}
      <h2 class="sec">Ce qui n'a pas été fait la dernière fois</h2><div class="card todos reveal" ${rv(5)}>${todoList(todos)}</div>
      <h2 class="sec">Dernières interventions</h2><div class="tl compact">${recent.length ? recent.map((i) => tlItem(i)).join('') : '<div class="card empty">Ajoute ta dernière facture pour lancer le carnet.</div>'}</div>`;
  }

  function log(v) {
    const { state, E, eur, vInts, monthFr, picker } = O();
    const g = E.groupByMonth(vInts(v)); const keys = Object.keys(g);
    return `<div class="top"><h1>Journal</h1><div class="row">${picker(v)}<button class="btn" data-act="addInt">${A.icon('plus')} Intervention</button></div></div>
      ${keys.length ? `<div class="tl">${keys.map((k) => `<div class="month"><span>${monthFr(k)}</span><span class="mono">${eur(g[k].filter((i) => i.status !== 'planned').reduce((s, i) => s + (state.settings.pro ? E.ht(i.costTtc, i.vat) : Number(i.costTtc || 0)), 0))}</span></div>${g[k].map((i) => tlItem(i)).join('')}`).join('')}</div>`
      : `<div class="card empty">${A.scene(v.body)}<p>Aucune intervention. Ajoute la dernière facture pour commencer.</p></div>`}`;
  }

  function due(v) {
    const { state, E, picker } = O();
    const dues = E.allDues(v, state.interventions);
    return `<div class="top"><h1>Échéances</h1><div class="row">${picker(v)}<button class="btn ghost" data-act="ics">${A.icon('cal')} Exporter vers mon agenda</button><button class="btn ghost" data-act="notify">${state.settings.notify ? 'Alertes actives' : 'Activer les alertes'}</button></div></div>
      <div class="banner">Les intervalles sont des repères courants. Le carnet du constructeur fait foi : règle chaque ligne avec « Régler ».</div>
      <div class="stack">${dues.map(dueCard).join('')}</div><p><button class="btn ghost small" data-act="addTask">${A.icon('plus')} Ajouter un suivi personnalisé</button></p>`;
  }

  function cost(v) {
    const { state, E, eur, vInts, typeLabel, monthFr, monthShort, picker } = O();
    const key = state.settings.pro ? 'ht' : 'ttc';
    const m = E.monthly(state.interventions, v.id);
    const max = Math.max.apply(null, m.map((x) => x[key]).concat([1]));
    const total = m.reduce((s, x) => s + x[key], 0);
    const val = (i) => (state.settings.pro ? E.ht(i.costTtc, i.vat) : Number(i.costTtc || 0));
    const by = {};
    vInts(v).filter((i) => i.status !== 'planned').forEach((i) => { const k = (i.types || ['autre'])[0] || 'autre'; by[k] = (by[k] || 0) + val(i); });
    const keys = Object.keys(by).sort((a, b) => by[b] - by[a]);
    const all = keys.reduce((s, k) => s + by[k], 0);
    const cpk = E.costPerKm(v, state.interventions);
    const parts = keys.map((k, i) => ({ v: by[k], color: COLORS[i % COLORS.length], k }));
    return `<div class="top"><h1>Coûts</h1><div class="row">${picker(v)}</div></div>
      <div class="grid g3"><div class="card stat reveal" ${rv(0)}><div class="l">12 derniers mois ${state.settings.pro ? 'HT' : 'TTC'}</div><div class="v mono">${eur(total)}</div></div>
      <div class="card stat reveal" ${rv(1)}><div class="l">Total depuis le début</div><div class="v mono">${eur(all)}</div></div>
      <div class="card stat reveal" ${rv(2)}><div class="l">Coût au km</div><div class="v mono">${cpk ? (cpk * 100).toFixed(1) + ' c€' : 'n/d'}</div></div></div>
      <h2 class="sec">Mois par mois</h2><div class="card reveal" ${rv(3)}><div class="bars" role="img" aria-label="Dépenses par mois">${m.map((x, i) => `<div class="b" title="${monthFr(x.month)} : ${eur(x[key])}"><span class="val">${x[key] ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(x[key]) : ''}</span><i style="height:${Math.max(1.5, (x[key] / max) * 100)}%;--d:${i * 40}ms"></i><span>${monthShort(x.month)}</span></div>`).join('')}</div></div>
      <h2 class="sec">Où part l'argent</h2><div class="card split reveal" ${rv(4)}>${keys.length ? `<div class="donutwrap">${A.donut(parts)}<div class="dc"><div class="mono">${eur(all)}</div><small>au total</small></div></div>
      <div class="list grow">${parts.map((p) => `<div class="item"><span class="swatch" style="background:${p.color}"></span><span class="ico sm">${A.icon(p.k)}</span><div class="grow">${typeLabel(p.k)}</div><div class="mono">${eur(p.v)}</div></div>`).join('')}</div>` : '<div class="muted">Rien à afficher pour le moment.</div>'}</div>`;
  }

  function cars() {
    const { state, esc, num } = O();
    return `<div class="top"><h1>Véhicules et réglages</h1><button class="btn" data-act="addCar">${A.icon('plus')} Véhicule</button></div>
      <div class="grid g2">${state.vehicles.map((x, i) => `<div class="card vcard reveal" ${rv(i)}>${x.photo ? `<div class="photo sm" data-photo="${esc(x.photo)}"></div>` : `<div class="carwrap sm">${A.car(x.body || 'citadine')}</div>`}<div class="row" style="justify-content:space-between;margin-top:10px"><div><div class="t">${esc(x.name)}</div><div class="s mono muted">${num(x.km)} km</div></div>${A.plate(x.plate)}</div><button class="btn small ghost" style="margin-top:10px" data-act="editCar" data-v="${x.id}">Modifier</button></div>`).join('')}</div>
      ${state.vehicles.length ? '' : '<div class="card empty">Aucun véhicule.</div>'}
      <h2 class="sec">Réglages</h2><div class="card"><form id="settings"><div class="f"><label class="inl"><input type="checkbox" name="pro" ${state.settings.pro ? 'checked' : ''}> Mode pro : afficher les coûts hors taxes</label></div>
      <div class="f"><label for="th">Thème</label><select id="th" name="theme"><option value="auto" ${state.settings.theme === 'auto' ? 'selected' : ''}>Automatique</option><option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Sombre</option><option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Clair</option></select></div></form></div>
      <h2 class="sec">Sauvegarde</h2><div class="card"><p class="muted" style="margin-top:0">Tes données vivent dans ce navigateur. Exporte une sauvegarde de temps en temps, surtout avant de changer d'appareil ou de vider le navigateur.</p>
      <div class="row"><button class="btn" data-act="export">Exporter une sauvegarde</button><label class="btn ghost" style="cursor:pointer">Importer<input type="file" id="imp" accept=".json" hidden></label>${O().DEMO ? '' : '<button class="btn danger" data-act="reset">Tout effacer</button>'}</div></div>
      ${state.license.key ? '<h2 class="sec">Abonnement</h2><div class="card muted">Clé enregistrée sur cet appareil. Gère ton abonnement depuis le reçu Gumroad.</div>' : ''}`;
  }

  function start() {
    return `<div class="card empty startcard reveal">${A.scene('berline')}<h2>Ajoute ton premier véhicule</h2><p class="muted">Quelques infos suffisent : le carnet calcule ensuite les échéances.</p><p><button class="btn" data-act="addCar">${A.icon('plus')} Ajouter un véhicule</button> <button class="btn ghost" data-act="demoData">Charger des données d'exemple</button></p></div>`;
  }

  /** Après chaque rendu : photos, compteur animé. */
  async function after() {
    const o = O();
    document.querySelectorAll('[data-photo]').forEach(async (el) => { const b = await o.getFile(el.dataset.photo); if (b) el.style.backgroundImage = `url(${URL.createObjectURL(b)})`; });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.odo[data-km]').forEach((el) => {
      if (reduce) return; const km = +el.dataset.km; const digits = el.querySelectorAll('.dg'); const t0 = performance.now(); const dur = 900;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); const s = String(Math.round(km * e)).padStart(6, '0'); digits.forEach((d, i) => (d.textContent = s[i])); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  window.Views = { dash, log, due, cost, cars, start, after, hero };
})();
