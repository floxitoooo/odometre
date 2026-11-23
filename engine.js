/* Odomètre : moteur de calcul (sans DOM, testable sous Node) */
(function (root) {
  const DAY = 864e5;

  // Modèles d'entretien : des REPÈRES courants, à ajuster selon le carnet du constructeur.
  const TASK_TEMPLATES = [
    { type: 'vidange',   label: 'Vidange moteur + filtre à huile', intervalKm: 15000,  intervalMonths: 12 },
    { type: 'filtres',   label: 'Filtres air et habitacle',        intervalKm: 20000,  intervalMonths: 24 },
    { type: 'freins',    label: 'Plaquettes et disques de frein',  intervalKm: 40000,  intervalMonths: 0 },
    { type: 'liquide-frein', label: 'Liquide de frein',            intervalKm: 0,      intervalMonths: 24 },
    { type: 'pneus',     label: 'Pneumatiques (contrôle ou remplacement)', intervalKm: 40000, intervalMonths: 0 },
    { type: 'courroie',  label: 'Distribution (courroie ou chaîne)', intervalKm: 120000, intervalMonths: 120 },
    { type: 'batterie',  label: 'Batterie',                        intervalKm: 0,      intervalMonths: 60 },
    { type: 'clim',      label: 'Climatisation (recharge, contrôle)', intervalKm: 0,   intervalMonths: 24 },
    { type: 'ct',        label: 'Contrôle technique',              intervalKm: 0,      intervalMonths: 24 },
    { type: 'assurance', label: 'Assurance (échéance annuelle)',   intervalKm: 0,      intervalMonths: 12 }
  ];

  const INTERVENTION_TYPES = [
    ['vidange', 'Vidange'], ['filtres', 'Filtres'], ['freins', 'Freins'], ['liquide-frein', 'Liquide de frein'],
    ['pneus', 'Pneus'], ['courroie', 'Distribution'], ['batterie', 'Batterie'], ['clim', 'Climatisation'],
    ['ct', 'Contrôle technique'], ['assurance', 'Assurance'], ['reparation', 'Réparation'], ['carrosserie', 'Carrosserie'],
    ['autre', 'Autre']
  ];

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); };
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); };
  const diffDays = (a, b) => Math.round((a - b) / DAY);
  function addMonths(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(d.getDate(), last));
    return r;
  }

  /** Kilométrage par jour estimé à partir du journal (kilométrages datés). Repli : 35 km/j. */
  function kmPerDay(vehicle, interventions) {
    const pts = [];
    if (vehicle.kmDate && vehicle.km != null) pts.push([parse(vehicle.kmDate), vehicle.km]);
    interventions.filter((i) => i.vehicleId === vehicle.id && i.km != null && i.date).forEach((i) => pts.push([parse(i.date), i.km]));
    (vehicle.kmLog || []).forEach((p) => pts.push([parse(p.date), p.km]));
    pts.sort((a, b) => a[0] - b[0]);
    if (pts.length < 2) return 35;
    const first = pts[0], last = pts[pts.length - 1];
    const days = diffDays(last[0], first[0]);
    const km = last[1] - first[1];
    if (days < 30 || km <= 0) return 35;
    return Math.min(Math.max(km / days, 3), 300);
  }

  function lastDone(vehicleId, type, interventions) {
    return interventions
      .filter((i) => i.vehicleId === vehicleId && i.status !== 'planned' && (i.types || []).includes(type))
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  }

  /** Échéance d'une tâche : dernier fait + intervalle (km et mois), reste en km, en jours, statut. */
  function dueFor(task, vehicle, interventions, now) {
    now = now || today();
    const last = lastDone(vehicle.id, task.type, interventions);
    const baseKm = last ? last.km : task.baseKm;
    const baseDate = last ? last.date : task.baseDate;
    const kpd = kmPerDay(vehicle, interventions);
    const out = { task, last, baseKm, baseDate, dueKm: null, dueDate: null, kmLeft: null, daysLeft: null, status: 'inconnu', kpd };
    if (task.intervalKm && baseKm != null && baseKm !== '') {
      out.dueKm = Number(baseKm) + Number(task.intervalKm);
      out.kmLeft = out.dueKm - Number(vehicle.km || 0);
    }
    if (task.intervalMonths && baseDate) {
      out.dueDate = iso(addMonths(parse(baseDate), Number(task.intervalMonths)));
      out.daysLeft = diffDays(parse(out.dueDate), now);
    }
    const cand = [];
    if (out.daysLeft != null) cand.push(out.daysLeft);
    if (out.kmLeft != null) cand.push(Math.round(out.kmLeft / kpd));
    if (!cand.length) return out;
    out.effectiveDays = Math.min.apply(null, cand);
    if (out.effectiveDays < 0) out.status = 'retard';
    else if (out.effectiveDays <= 30 || (out.kmLeft != null && out.kmLeft <= 1000)) out.status = 'bientot';
    else out.status = 'ok';
    return out;
  }

  const RANK = { retard: 0, bientot: 1, inconnu: 3, ok: 2 };

  function allDues(vehicle, interventions, now) {
    return (vehicle.tasks || []).filter((t) => t.enabled !== false)
      .map((t) => dueFor(t, vehicle, interventions, now))
      .sort((a, b) => RANK[a.status] - RANK[b.status] || (a.effectiveDays ?? 1e9) - (b.effectiveDays ?? 1e9));
  }

  /** Reste à faire : lignes laissées « non faites » lors d'une intervention passée. */
  function openTodos(vehicleId, interventions) {
    const out = [];
    interventions.filter((i) => !vehicleId || i.vehicleId === vehicleId).forEach((i) => {
      (i.todos || []).forEach((t) => { if (!t.done) out.push({ intervention: i, todo: t }); });
    });
    return out.sort((a, b) => (a.intervention.date < b.intervention.date ? 1 : -1));
  }

  /** Score de santé 0 à 100 : moyenne des suivis renseignés (à jour 100, bientôt 60, en retard 10), moins 3 par reste à faire. */
  function health(vehicle, interventions, now) {
    const d = allDues(vehicle, interventions, now).filter((x) => x.status !== 'inconnu');
    if (!d.length) return null;
    const w = { ok: 100, bientot: 60, retard: 10 };
    let s = d.reduce((a, x) => a + w[x.status], 0) / d.length;
    s -= Math.min(15, openTodos(vehicle.id, interventions).length * 3);
    return Math.max(0, Math.round(s));
  }

  const ht = (ttc, vat) => (vat ? Number(ttc) / (1 + Number(vat) / 100) : Number(ttc));

  /** Coût par mois (12 derniers mois), TTC et HT. */
  function monthly(interventions, vehicleId, now, count) {
    now = now || today(); count = count || 12;
    const map = {};
    for (let k = count - 1; k >= 0; k--) {
      const d = addMonths(new Date(now.getFullYear(), now.getMonth(), 1, 12), -k);
      map[`${d.getFullYear()}-${pad(d.getMonth() + 1)}`] = { ttc: 0, ht: 0, n: 0 };
    }
    interventions.filter((i) => (!vehicleId || i.vehicleId === vehicleId) && i.status !== 'planned' && i.date).forEach((i) => {
      const key = i.date.slice(0, 7);
      if (!map[key]) return;
      map[key].ttc += Number(i.costTtc || 0);
      map[key].ht += ht(i.costTtc || 0, i.vat);
      map[key].n += 1;
    });
    return Object.keys(map).map((k) => ({ month: k, ...map[k] }));
  }

  function groupByMonth(interventions) {
    const g = {};
    interventions.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).forEach((i) => {
      const k = (i.date || '').slice(0, 7);
      (g[k] = g[k] || []).push(i);
    });
    return g;
  }

  /** Coût au km : somme des dépenses / km parcourus entre première et dernière intervention. */
  function costPerKm(vehicle, interventions) {
    const list = interventions.filter((i) => i.vehicleId === vehicle.id && i.status !== 'planned' && i.km != null);
    if (list.length < 2) return null;
    const kms = list.map((i) => Number(i.km));
    const span = Math.max.apply(null, kms) - Math.min.apply(null, kms);
    if (span < 500) return null;
    const sum = list.reduce((s, i) => s + Number(i.costTtc || 0), 0);
    return sum / span;
  }

  /** Export agenda (.ics) : un événement journée entière par échéance datée, avec rappel 7 jours avant. */
  function ics(vehicles, interventions, now) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Odometre//FR', 'CALSCALE:GREGORIAN'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    vehicles.forEach((v) => {
      allDues(v, interventions, now).forEach((d) => {
        if (!d.dueDate) return;
        const day = d.dueDate.replace(/-/g, '');
        const next = iso(new Date(parse(d.dueDate).getTime() + DAY)).replace(/-/g, '');
        lines.push('BEGIN:VEVENT', `UID:${v.id}-${d.task.type}-${day}@odometre`, `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`,
          `SUMMARY:${(d.task.label + ' : ' + v.name).replace(/[\r\n,;\\]/g, ' ').slice(0, 150)}`,
          'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Echeance entretien', 'TRIGGER:-P7D', 'END:VALARM', 'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /** Vérifie une réponse de l'API de licences Gumroad. */
  function licenseValid(res) {
    if (!res || !res.success) return false;
    const p = res.purchase || {};
    if (p.refunded || p.chargebacked || p.disputed) return false;
    if (p.subscription_ended_at || p.subscription_failed_at) return false;
    return true;
  }

  const api = { TASK_TEMPLATES, INTERVENTION_TYPES, iso, parse, today, diffDays, addMonths, kmPerDay, lastDone, dueFor, allDues,
    openTodos, health, ht, monthly, groupByMonth, costPerKm, ics, licenseValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
