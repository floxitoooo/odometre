/* Odomètre : interface. Données locales (IndexedDB), accès par clé de licence Gumroad. */
(function () {
  const E = window.Engine;
  const CFG = window.ODOMETRE_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const GRACE_DAYS = 14;
  const VERSION = 'v5';

  const state = { vehicles: [], interventions: [], settings: { pro: false, theme: 'auto', notify: false, lastNotif: '' }, license: { key: '', lastOk: 0 }, currentVehicle: null };
  let view = ['dash', 'log', 'due', 'cost', 'car'].includes(params.get('view')) ? params.get('view') : 'dash';

  /* ---------- Stockage ---------- */
  const MEM = { kv: {}, files: {} };
  const DB = { db: null,
    open() { return new Promise((res, rej) => { if (DEMO) return res(); const r = indexedDB.open('odometre', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
      r.onsuccess = () => { DB.db = r.result; res(); }; r.onerror = () => rej(r.error); }); },
    get(store, key) { return new Promise((res) => { if (DEMO) return res(MEM[store][key] || null); if (!DB.db) return res(null); const q = DB.db.transaction(store).objectStore(store).get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); },
    put(store, key, val) { return new Promise((res) => { if (DEMO) { MEM[store][key] = val; return res(true); } if (!DB.db) return res(false); try { const t = DB.db.transaction(store, 'readwrite'); t.objectStore(store).put(val, key); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); } catch (e) { res(false); } }); },
    del(store, key) { return new Promise((res) => { if (DEMO) { delete MEM[store][key]; return res(); } if (!DB.db) return res(); const t = DB.db.transaction(store, 'readwrite'); t.objectStore(store).delete(key); t.oncomplete = () => res(); }); },
    all(store) { return new Promise((res) => { if (DEMO) return res(Object.entries(MEM[store])); if (!DB.db) return res([]); const out = []; const c = DB.db.transaction(store).objectStore(store).openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); }; c.onerror = () => res(out); }); }
  };
  const save = () => DB.put('kv', 'state', { vehicles: state.vehicles, interventions: state.interventions, settings: state.settings, license: state.license, currentVehicle: state.currentVehicle });
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);


  /* ---------- Validation de tout ce qui vient de l'extérieur (sauvegarde importée) ---------- */
  const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
  const FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
  const MAX_FILE = 10 * 1024 * 1024;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const cs = (s, n) => String(s == null ? '' : s).slice(0, n || 200);
  const cn = (x) => { const n = Number(x); return x !== '' && x != null && Number.isFinite(n) ? n : null; };
  const slug = (s) => cs(s, 40).replace(/[^A-Za-z0-9-]/g, '');
  function sanitizeBackup(j) {
    if (!j || j.app !== 'odometre' || !Array.isArray(j.vehicles) || !Array.isArray(j.interventions)) throw new Error('format');
    const vehicles = j.vehicles.slice(0, 50).map((v) => {
      if (!v || !SAFE_ID.test(String(v.id))) throw new Error('id');
      return { id: v.id, name: cs(v.name, 80), plate: cs(v.plate, 16), fuel: cs(v.fuel, 20), body: window.Art.CAR_KINDS.includes(v.body) ? v.body : 'citadine',
        km: cn(v.km) || 0, kmDate: DATE_RE.test(String(v.kmDate)) ? v.kmDate : E.iso(E.today()), photo: SAFE_ID.test(String(v.photo || '')) ? v.photo : undefined,
        kmLog: (Array.isArray(v.kmLog) ? v.kmLog : []).slice(-50).filter((p) => p && DATE_RE.test(String(p.date)) && cn(p.km) != null).map((p) => ({ date: p.date, km: Number(p.km) })),
        tasks: (Array.isArray(v.tasks) ? v.tasks : []).slice(0, 60).filter((t) => t && SAFE_ID.test(String(t.id))).map((t) => ({ id: t.id, type: slug(t.type), label: cs(t.label, 100),
          intervalKm: cn(t.intervalKm) || 0, intervalMonths: cn(t.intervalMonths) || 0, baseKm: cn(t.baseKm), baseDate: DATE_RE.test(String(t.baseDate || '')) ? t.baseDate : null, enabled: t.enabled !== false })) };
    });
    const ids = new Set(vehicles.map((v) => v.id));
    const interventions = j.interventions.slice(0, 5000).filter((i) => i && SAFE_ID.test(String(i.id)) && ids.has(i.vehicleId) && DATE_RE.test(String(i.date))).map((i) => ({
      id: i.id, vehicleId: i.vehicleId, date: i.date, km: cn(i.km), types: (Array.isArray(i.types) ? i.types : []).map(slug).filter(Boolean).slice(0, 10),
      title: cs(i.title, 120), shop: cs(i.shop, 120), costTtc: cn(i.costTtc) || 0, vat: [0, 5.5, 10, 20].includes(Number(i.vat)) ? Number(i.vat) : 20, notes: cs(i.notes, 2000), status: i.status === 'planned' ? 'planned' : 'done',
      files: (Array.isArray(i.files) ? i.files : []).filter((f) => f && SAFE_ID.test(String(f.id)) && FILE_TYPES.includes(f.type)).slice(0, 20).map((f) => ({ id: f.id, name: cs(f.name, 120), type: f.type })),
      todos: (Array.isArray(i.todos) ? i.todos : []).filter((t) => t && SAFE_ID.test(String(t.id))).slice(0, 50).map((t) => ({ id: t.id, text: cs(t.text, 200), done: !!t.done, doneOn: DATE_RE.test(String(t.doneOn || '')) ? t.doneOn : undefined })) }));
    const st = j.settings || {};
    const settings = { pro: !!st.pro, theme: ['auto', 'dark', 'light'].includes(st.theme) ? st.theme : 'auto', notify: false, lastNotif: '' };
    const files = (Array.isArray(j.files) ? j.files : []).filter((f) => f && SAFE_ID.test(String(f.id)) && FILE_TYPES.includes(f.type) && typeof f.data === 'string' && f.data.startsWith('data:' + f.type + ';base64,') && f.data.length < MAX_FILE * 1.4).slice(0, 500);
    return { vehicles, interventions, settings, files };
  }
  function okFile(f, imagesOnly) {
    if (!f || f.size > MAX_FILE || !FILE_TYPES.includes(f.type) || (imagesOnly && f.type === 'application/pdf')) { alert('Fichier refusé : image (png, jpeg, webp, gif) ou PDF de 10 Mo maximum.'); return false; }
    return true;
  }


  /* ---------- Fichiers (photos, factures) : octets bruts, images réduites, lecture dans l'application ---------- */
  async function toStorable(file, maxSide, q) {
    let type = file.type, buf = null;
    if (type.startsWith('image/')) {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * s)); cv.height = Math.max(1, Math.round(bmp.height * s));
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bmp, 0, 0, cv.width, cv.height); if (bmp.close) bmp.close();
        const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q));
        if (blob) { type = 'image/jpeg'; buf = await blob.arrayBuffer(); }
      } catch (e) { /* format non décodable : on garde l'original */ }
    }
    if (!buf) buf = await file.arrayBuffer();
    return { name: cs(file.name, 120), type, buf };
  }
  async function putFile(file, maxSide, q) {
    try { const rec = await toStorable(file, maxSide, q); const id = uid(); const ok = await DB.put('files', id, rec); return ok ? { id, name: rec.name, type: rec.type } : null; } catch (e) { return null; }
  }
  async function getFile(id) {
    const r = await DB.get('files', id); if (!r) return null;
    try { const b = r instanceof Blob ? r : new Blob([r.buf], { type: r.type }); if (!b.size) return null; if (r instanceof Blob) await b.slice(0, 1).arrayBuffer(); return b; } catch (e) { return null; }
  }
  async function viewFile(id, name) {
    const b = await getFile(id);
    if (!b || !FILE_TYPES.includes(b.type)) { alert("Ce fichier est illisible sur cet appareil (enregistré avec une ancienne version du carnet). Ajoute-le de nouveau."); return; }
    const url = URL.createObjectURL(b); const pdf = b.type === 'application/pdf'; const v = $('#viewer');
    v.innerHTML = `<div class="vbar"><b>${esc(name)}</b><span class="row"><a class="btn small ghost" href="${url}" download="${esc(name)}">Télécharger</a><button class="btn small" type="button" data-vclose>Fermer</button></span></div>${pdf ? `<iframe src="${url}" title="${esc(name)}"></iframe>` : `<img src="${url}" alt="${esc(name)}">`}`;
    v.querySelector('[data-vclose]').onclick = () => v.close(); v.onclose = () => URL.revokeObjectURL(url); v.showModal();
  }


  /* ---------- Erreurs et diagnostic (utile sur téléphone, sans console) ---------- */
  const ERRORS = [];
  const noteErr = (m) => { ERRORS.push(cs(m, 120)); if (ERRORS.length > 5) ERRORS.shift(); };
  window.addEventListener('error', (e) => noteErr(e.message));
  window.addEventListener('unhandledrejection', (e) => noteErr(e.reason && e.reason.message ? e.reason.message : e.reason));
  async function runDiag() {
    const out = $('#diagout'); const L = []; const add = (k, v) => { L.push(k + ' : ' + v); out.textContent = L.join('\n'); };
    add('Version', VERSION); add('Navigateur', navigator.userAgent.slice(0, 110));
    add('Fenêtres (dialog)', typeof HTMLDialogElement); add('createImageBitmap', typeof createImageBitmap); add('Service worker', 'serviceWorker' in navigator);
    try { const est = await navigator.storage.estimate(); add('Stockage', Math.round(est.usage / 1e6) + ' Mo utilisés sur ' + Math.round(est.quota / 1e6) + ' Mo'); } catch (e) { add('Stockage', 'inconnu'); }
    add('Base de données', DEMO ? 'mémoire (mode démo, rien n\'est conservé)' : DB.db ? 'ouverte' : 'INDISPONIBLE');
    try { const ok = await DB.put('files', '__diag', { name: 't', type: 'application/pdf', buf: new Uint8Array([1, 2, 3, 4]).buffer }); const r = await DB.get('files', '__diag'); add('Écriture et relecture', ok && r && r.buf && r.buf.byteLength === 4 ? 'OK' : 'ÉCHEC'); await DB.del('files', '__diag'); } catch (e) { add('Écriture et relecture', 'ÉCHEC ' + e.message); }
    try {
      const cv = document.createElement('canvas'); cv.width = 60; cv.height = 60; cv.getContext('2d').fillRect(0, 0, 60, 60);
      const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.8)); add('Création JPEG', b ? b.size + ' octets' : 'ÉCHEC');
      const f = new File([b], 'x.jpg', { type: 'image/jpeg' });
      try { await createImageBitmap(f, { imageOrientation: 'from-image' }); add('Décodage image', 'OK'); } catch (e) { try { await createImageBitmap(f); add('Décodage image', 'OK (sans orientation)'); } catch (e2) { add('Décodage image', 'ÉCHEC ' + e2.message); } }
    } catch (e) { add('Image', 'ÉCHEC ' + e.message); }
    try { const all = await DB.all('files'); let old = 0, bad = 0, fresh = 0; for (const [id, r] of all) { if (r instanceof Blob) { old++; if (!(await getFile(id))) bad++; } else fresh++; } add('Fichiers enregistrés', fresh + ' récents, ' + old + ' anciens dont ' + bad + ' illisibles'); } catch (e) { add('Fichiers enregistrés', 'ÉCHEC ' + e.message); }
    add('Erreurs récentes', ERRORS.length ? ERRORS.join(' | ') : 'aucune');
  }

  /* ---------- Utilitaires ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  const num = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
  const dFr = (s) => s ? E.parse(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const monthFr = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); };
  const monthShort = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''); };
  const typeLabel = (id) => (E.INTERVENTION_TYPES.find((t) => t[0] === id) || [0, String(id).startsWith('custom-') ? 'Suivi perso' : 'Autre'])[1];
  const $ = (s, r) => (r || document).querySelector(s);
  const vehicle = () => state.vehicles.find((v) => v.id === state.currentVehicle) || state.vehicles[0] || null;
  const vInts = (v) => state.interventions.filter((i) => i.vehicleId === v.id);
  const humanDue = (d) => {
    const parts = [];
    if (d.daysLeft != null) parts.push('date ' + (d.daysLeft < 0 ? `dépassée de ${-d.daysLeft} j` : d.daysLeft === 0 ? "aujourd'hui" : d.daysLeft < 60 ? `dans ${d.daysLeft} j` : `dans ${Math.round(d.daysLeft / 30.4)} mois`));
    if (d.kmLeft != null) parts.push(d.kmLeft < 0 ? `km dépassés de ${num(-d.kmLeft)}` : `km dans ${num(d.kmLeft)}`);
    if (d.daysLeft != null && d.kmLeft != null && d.kmLeft < 0 && d.daysLeft >= 0) parts.reverse();
    return parts.join(' · ') || 'à renseigner';
  };
  const PILL = { ok: 'À jour', bientot: 'Bientôt', retard: 'En retard', inconnu: 'À renseigner' };
  const DIAL = '<svg class="dial" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="var(--line)" stroke-width="3"/><path d="M5.5 22a12 12 0 1 1 21 0" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M16 16l5-6" stroke="var(--text)" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="var(--text)"/></svg>';

  /* ---------- Licence ---------- */
  async function verifyLicense(key) {
    const body = new URLSearchParams({ product_id: CFG.productId || '', license_key: key, increment_uses_count: 'false' });
    const r = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body });
    const j = await r.json().catch(() => ({}));
    return E.licenseValid(j);
  }
  function licenseOk() { return DEMO || (state.license.key && Date.now() - state.license.lastOk < GRACE_DAYS * 864e5); }
  async function recheckLicense() {
    if (DEMO || !state.license.key) return;
    try { const ok = await verifyLicense(state.license.key);
      if (ok) { state.license.lastOk = Date.now(); await save(); } else { state.license.lastOk = 0; await save(); render(); }
    } catch (e) { /* hors ligne : période de grâce */ }
  }
  function renderGate(msg) {
    $('#root').innerHTML = `<div class="gate"><div class="card reveal">${window.Art.scene('berline')}<div class="brand">${DIAL}<span>${esc(CFG.name || 'Odomètre')}</span></div><h1>Ton carnet d'entretien, enfin clair.</h1>
      <p class="muted">Le carnet d'entretien de ta voiture : échéances, factures, reste à faire. Entre la clé de licence reçue après ton abonnement.</p>
      <form id="gate"><div class="f"><label for="lk">Clé de licence</label><input type="text" id="lk" autocomplete="off" placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" required></div>
      <p id="gmsg" class="muted" role="alert">${esc(msg || '')}</p>
      <div class="row"><button class="btn" type="submit">Ouvrir mon carnet</button><a class="btn ghost" href="?demo=1">Voir la démo</a></div></form>
      <p class="muted" style="font-size:12px;margin-top:16px">Tes données restent sur cet appareil. La clé sert uniquement à vérifier ton abonnement.</p></div></div>`;
    $('#gate').onsubmit = async (e) => { e.preventDefault(); const key = $('#lk').value.trim(); if (!CFG.productId) { $('#gmsg').textContent = 'Accès pas encore ouvert.'; return; } if (!/^[A-Za-z0-9-]{8,100}$/.test(key)) { $('#gmsg').textContent = 'Clé invalide.'; return; } $('#gmsg').textContent = 'Vérification…';
      try { if (await verifyLicense(key)) { state.license = { key, lastOk: Date.now() }; await save(); boot2(); } else $('#gmsg').textContent = 'Clé invalide ou abonnement terminé.'; }
      catch (err) { $('#gmsg').textContent = 'Connexion impossible. Réessaie en ligne.'; } };
  }

  /* ---------- Rendu ---------- */
  function render() {
    try { renderInner(); } catch (err) { console.error(err); $('#root').innerHTML = `<div class="gate"><div class="card"><h2>Oups</h2><p class="muted">Un affichage a échoué : ${esc(err.message)}</p><p><a class="btn" href="./">Recharger</a></p></div></div>`; }
  }
  function renderInner() {
    if (!licenseOk()) return renderGate();
    const th = (DEMO && params.get('theme')) || state.settings.theme; document.documentElement.dataset.theme = th === 'auto' ? '' : th;
    if (!document.documentElement.dataset.theme) document.documentElement.removeAttribute('data-theme');
    const nav = [['dash', 'Tableau de bord'], ['log', 'Journal'], ['due', 'Échéances'], ['cost', 'Coûts'], ['car', 'Véhicules']];
    const v = vehicle();
    const V = window.Views;
    $('#root').innerHTML = `<div class="app"><aside class="side"><div class="brand">${DIAL}<span>${esc(CFG.name || 'Odomètre')}</span></div>
      <nav class="nav">${nav.map(([k, l]) => `<button data-act="nav" data-v="${k}" ${view === k ? 'aria-current="page"' : ''}>${window.Art.icon(k)}<span>${l}</span></button>`).join('')}</nav>
      <div class="foot">${DEMO ? 'Mode démo : rien n\'est enregistré.' : 'Données sur cet appareil.'}</div></aside>
      <main>${state.noStorage && !DEMO ? '<div class="banner">Ton navigateur bloque le stockage (navigation privée ?). Tes données ne seront pas conservées : exporte une sauvegarde avant de quitter.</div>' : ''}${DEMO ? '<div class="banner">Démo avec des données d\'exemple. Rien n\'est enregistré.</div>' : ''}${!v && view !== 'car' ? V.start() : ({ dash: V.dash, log: V.log, due: V.due, cost: V.cost, car: V.cars }[view])(v)}</main></div>`;
    V.after();
  }
  const picker = (v) => state.vehicles.length > 1 ? `<select data-act="pickCar" aria-label="Véhicule">${state.vehicles.map((x) => `<option value="${esc(x.id)}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : '';

  /* ---------- Formulaires ---------- */
  const dlg = () => $('#dlg');
  function openDlg(html, onSubmit) {
    dlg().innerHTML = `<div class="dlg">${html}</div>`;
    const f = $('form', dlg());
    if (f) f.onsubmit = (e) => { e.preventDefault(); onSubmit(new FormData(f), f); };
    dlg().querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => dlg().close()));
    dlg().showModal();
  }
  const field = (label, input, id) => `<div class="f"><label for="${id}">${label}</label>${input}</div>`;
  const vat = (sel) => [0, 5.5, 10, 20].map((x) => `<option value="${x}" ${Number(sel) === x ? 'selected' : ''}>${x} %</option>`).join('');

  function carForm(v) {
    v = v || { name: '', plate: '', km: '', kmDate: E.iso(E.today()), fuel: 'Essence', body: 'citadine' };
    const A = window.Art; let newPhoto = null;
    openDlg(`<h2>${v.id ? 'Modifier' : 'Ajouter'} un véhicule</h2><br><form>
      ${field('Nom', `<input type="text" id="n" name="name" value="${esc(v.name)}" placeholder="Peugeot 308, utilitaire…" required>`, 'n')}
      <div class="f"><label>Silhouette</label><div class="kinds">${A.CAR_KINDS.map((k) => `<label><input type="radio" name="body" value="${k}" ${(v.body || 'citadine') === k ? 'checked' : ''}>${A.car(k)}<span>${A.BODY_LABELS[k]}</span></label>`).join('')}</div></div>
      <div class="f"><label for="ph">Photo de ton véhicule (facultatif, remplace la silhouette)</label><input type="file" id="ph" accept="image/*"></div>
      <div class="grid g2">${field('Plaque', `<input type="text" id="p" name="plate" value="${esc(v.plate)}">`, 'p')}${field('Carburant', `<select id="c" name="fuel">${['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL'].map((x) => `<option ${v.fuel === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`, 'c')}</div>
      <div class="grid g2">${field('Kilométrage actuel', `<input type="number" id="k" name="km" value="${v.km}" min="0" required>`, 'k')}${field('Date du relevé', `<input type="date" id="d" name="kmDate" value="${v.kmDate}" required>`, 'd')}</div>
      <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-close>Annuler</button>${v.id ? '<button class="btn danger" type="button" id="delcar">Supprimer</button>' : ''}</div></form>`,
    async (fd) => {
      const o = { name: fd.get('name'), plate: fd.get('plate'), fuel: fd.get('fuel'), body: fd.get('body') || 'citadine', km: Number(fd.get('km')), kmDate: fd.get('kmDate') };
      const ph = $('#ph').files[0];
      if (ph && okFile(ph, true)) { const sv = await putFile(ph, 1400, 0.85); if (sv) { if (v.photo) DB.del('files', v.photo); o.photo = sv.id; } else alert("Impossible d'enregistrer la photo sur cet appareil (stockage du navigateur indisponible)."); }
      if (v.id) Object.assign(v, o); else { const nv = Object.assign({ id: uid(), tasks: E.TASK_TEMPLATES.map((t) => ({ id: uid(), ...t, baseKm: null, baseDate: null, enabled: true })) }, o); state.vehicles.push(nv); state.currentVehicle = nv.id; }
      await save(); dlg().close(); render();
    });
    const del = $('#delcar'); if (del) del.onclick = async () => { if (!confirm('Supprimer ce véhicule et son historique ?')) return;
      state.interventions.filter((i) => i.vehicleId === v.id).forEach((i) => (i.files || []).forEach((f) => DB.del('files', f.id)));
      state.interventions = state.interventions.filter((i) => i.vehicleId !== v.id); state.vehicles = state.vehicles.filter((x) => x.id !== v.id); state.currentVehicle = null; await save(); dlg().close(); render(); };
  }

  function kmForm() {
    const v = vehicle();
    openDlg(`<h2>Kilométrage</h2><br><form>${field('Kilométrage actuel', `<input type="number" id="k" name="km" value="${v.km}" min="0" required>`, 'k')}
      <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-close>Annuler</button></div></form>`,
    async (fd) => { v.kmLog = (v.kmLog || []).concat([{ date: v.kmDate, km: v.km }]).slice(-50); v.km = Number(fd.get('km')); v.kmDate = E.iso(E.today()); await save(); dlg().close(); render(); });
  }

  function intForm(i, preset) {
    const v = vehicle();
    const isNew = !i;
    i = i || Object.assign({ id: uid(), vehicleId: v.id, date: E.iso(E.today()), km: v.km, types: [], title: '', shop: '', costTtc: '', vat: 20, notes: '', files: [], todos: [], status: 'done' }, preset || {});
    const open = E.openTodos(v.id, state.interventions).filter((x) => x.intervention.id !== i.id);
    const newFiles = [];
    openDlg(`<h2>${isNew ? 'Nouvelle' : 'Modifier l\''} intervention</h2><br><form>
      <div class="grid g2">${field('Date', `<input type="date" id="d" name="date" value="${i.date}" required>`, 'd')}${field('Kilométrage', `<input type="number" id="k" name="km" value="${i.km ?? ''}" min="0">`, 'k')}</div>
      <div class="f"><label>Type de travaux</label><div class="chips">${E.INTERVENTION_TYPES.concat((i.types || []).filter((t) => !E.INTERVENTION_TYPES.some((x) => x[0] === t)).map((t) => [t, 'Suivi perso'])).map(([id, l]) => `<label><input type="checkbox" name="types" value="${esc(id)}" ${(i.types || []).includes(id) ? 'checked' : ''}>${window.Art.icon(id)}${l}</label>`).join('')}</div></div>
      ${field('Détail', `<input type="text" id="t" name="title" value="${esc(i.title)}" placeholder="Ex : révision 90 000 km">`, 't')}
      <div class="grid g2">${field('Garage / lieu', `<input type="text" id="s" name="shop" value="${esc(i.shop)}">`, 's')}${field('Statut', `<select id="st" name="status"><option value="done" ${i.status !== 'planned' ? 'selected' : ''}>Fait</option><option value="planned" ${i.status === 'planned' ? 'selected' : ''}>Prévu</option></select>`, 'st')}</div>
      <div class="grid g2">${field('Montant TTC (€)', `<input type="number" id="c" name="costTtc" step="0.01" min="0" value="${i.costTtc}">`, 'c')}${field('TVA', `<select id="v" name="vat">${vat(i.vat)}</select>`, 'v')}</div>
      ${open.length ? `<div class="f"><label>Reprendre ce qui restait à faire</label>${open.map((x) => `<label style="text-transform:none;letter-spacing:0;font-size:14px;color:var(--text)"><input type="checkbox" name="close" value="${esc(x.intervention.id)}:${esc(x.todo.id)}"> ${esc(x.todo.text)}</label>`).join('')}</div>` : ''}
      <div class="f"><label>Reste à faire (une ligne par point non réalisé)</label><div id="todos">${(i.todos || []).map((t) => `<div class="todo"><input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Fait"><input type="text" value="${esc(t.text)}" data-tid="${esc(t.id)}"></div>`).join('')}</div><button type="button" class="btn ghost small" id="addTodo">+ Ajouter une ligne</button></div>
      ${field('Notes', `<textarea id="nt" name="notes" rows="2">${esc(i.notes)}</textarea>`, 'nt')}
      <div class="f"><label>Factures et photos</label><div class="att" id="atts">${(i.files || []).map((f) => `<a href="#" data-act="openFile" data-f="${esc(f.id)}">${esc(f.name)}</a>`).join('')}</div><input type="file" id="ff" multiple accept="image/*,application/pdf"></div>
      <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-close>Annuler</button>${isNew ? '' : '<button class="btn danger" type="button" id="delint">Supprimer</button>'}</div></form>`,
    async (fd) => {
      Object.assign(i, { date: fd.get('date'), km: fd.get('km') === '' ? null : Number(fd.get('km')), types: fd.getAll('types'), title: fd.get('title'), shop: fd.get('shop'), status: fd.get('status'), costTtc: Number(fd.get('costTtc') || 0), vat: Number(fd.get('vat')), notes: fd.get('notes') });
      i.todos = Array.from(dlg().querySelectorAll('#todos .todo')).map((row) => ({ id: $('[data-tid]', row)?.dataset.tid || uid(), text: $('input[type=text]', row).value.trim(), done: $('input[type=checkbox]', row).checked })).filter((t) => t.text);
      fd.getAll('close').forEach((c) => { const [iid, tid] = c.split(':'); const src = state.interventions.find((x) => x.id === iid); const t = src && src.todos.find((y) => y.id === tid); if (t) { t.done = true; t.doneOn = i.date; } });
      for (const f of newFiles) { const sv = await putFile(f, 2000, 0.85); if (sv) i.files.push(sv); else alert("Impossible d'enregistrer « " + f.name + " » (stockage du navigateur indisponible)."); }
      if (i.status !== 'planned' && i.km != null && i.km > v.km) { v.km = i.km; v.kmDate = i.date; }
      if (isNew) state.interventions.push(i);
      await save(); dlg().close(); render();
    });
    $('#addTodo').onclick = () => { const d = document.createElement('div'); d.className = 'todo'; d.innerHTML = '<input type="checkbox" aria-label="Fait"><input type="text" placeholder="Ex : plaquettes arrière à prévoir">'; $('#todos').appendChild(d); $('input[type=text]', d).focus(); };
    $('#ff').onchange = (e) => { Array.from(e.target.files).filter((f) => okFile(f, false)).forEach((f) => newFiles.push(f)); $('#atts').insertAdjacentHTML('beforeend', Array.from(e.target.files).map((f) => `<span class="muted">${esc(f.name)} (à enregistrer) </span>`).join('')); };
    const del = $('#delint'); if (del) del.onclick = async () => { if (!confirm('Supprimer cette intervention ?')) return; (i.files || []).forEach((f) => DB.del('files', f.id)); state.interventions = state.interventions.filter((x) => x.id !== i.id); await save(); dlg().close(); render(); };
  }

  function taskForm(t) {
    const v = vehicle();
    const isNew = !t;
    t = t || { id: uid(), type: 'autre', label: '', intervalKm: 0, intervalMonths: 12, baseKm: null, baseDate: null, enabled: true };
    openDlg(`<h2>${isNew ? 'Nouveau suivi' : esc(t.label)}</h2><br><form>
      ${isNew ? field('Intitulé', `<input type="text" id="l" name="label" required>`, 'l') : ''}
      <div class="grid g2">${field('Tous les (km), 0 = aucun', `<input type="number" id="ik" name="intervalKm" value="${t.intervalKm || 0}" min="0">`, 'ik')}${field('Tous les (mois), 0 = aucun', `<input type="number" id="im" name="intervalMonths" value="${t.intervalMonths || 0}" min="0">`, 'im')}</div>
      <p class="muted" style="font-size:13px">Dernière fois (utilisé tant qu'aucune intervention de ce type n'est enregistrée) :</p>
      <div class="grid g2">${field('Au kilométrage', `<input type="number" id="bk" name="baseKm" value="${t.baseKm ?? ''}" min="0">`, 'bk')}${field('À la date', `<input type="date" id="bd" name="baseDate" value="${t.baseDate || ''}">`, 'bd')}</div>
      <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" data-close>Annuler</button>${isNew ? '' : '<button class="btn danger" type="button" id="deltask">Retirer ce suivi</button>'}</div></form>`,
    async (fd) => {
      Object.assign(t, { intervalKm: Number(fd.get('intervalKm') || 0), intervalMonths: Number(fd.get('intervalMonths') || 0), baseKm: fd.get('baseKm') === '' ? null : Number(fd.get('baseKm')), baseDate: fd.get('baseDate') || null });
      if (isNew) { t.label = fd.get('label'); t.type = 'custom-' + t.id; v.tasks.push(t); }
      await save(); dlg().close(); render();
    });
    const del = $('#deltask'); if (del) del.onclick = async () => { v.tasks = v.tasks.filter((x) => x.id !== t.id); await save(); dlg().close(); render(); };
  }

  /* ---------- Actions ---------- */
  async function exportBackup() {
    const files = await DB.all('files'); const out = [];
    for (const [id, rec] of files) { const blob = rec instanceof Blob ? rec : new Blob([rec.buf], { type: rec.type }); const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); out.push({ id, name: rec.name || 'fichier', type: blob.type, data }); }
    download(new Blob([JSON.stringify({ app: 'odometre', version: 1, vehicles: state.vehicles, interventions: state.interventions, settings: state.settings, files: out })], { type: 'application/json' }), `odometre-sauvegarde-${E.iso(E.today())}.json`);
  }
  async function importBackup(file) {
    try {
      if (!file || file.size > 60 * 1024 * 1024) throw new Error('taille');
      const j = sanitizeBackup(JSON.parse(await file.text()));
      if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
      state.vehicles = j.vehicles; state.interventions = j.interventions; state.settings = Object.assign(state.settings, j.settings);
      for (const f of j.files) { const blob = await (await fetch(f.data)).blob(); if (blob.size <= MAX_FILE) await DB.put('files', f.id, { name: cs(f.name, 120), type: f.type, buf: await blob.arrayBuffer() }); }
      state.currentVehicle = null; await save(); render();
    } catch (e) { alert('Fichier de sauvegarde illisible.'); }
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function enableNotify() {
    if (!('Notification' in window)) return alert('Ce navigateur ne gère pas les alertes.');
    const p = await Notification.requestPermission(); state.settings.notify = p === 'granted'; await save(); render(); if (p === 'granted') notifyDue();
  }
  function notifyDue() {
    if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const t = E.iso(E.today()); if (state.settings.lastNotif === t) return;
    let n = 0; state.vehicles.forEach((v) => { n += E.allDues(v, state.interventions).filter((d) => d.status === 'retard' || d.status === 'bientot').length; });
    if (n) { new Notification(CFG.name || 'Odomètre', { body: `${n} échéance(s) à regarder.` }); state.settings.lastNotif = t; save(); }
  }

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act; const v = vehicle();
    if (a === 'nav') { view = el.dataset.v; render(); }
    else if (a === 'addCar') carForm(); else if (a === 'editCar') carForm(state.vehicles.find((x) => x.id === el.dataset.v));
    else if (a === 'updateKm') kmForm(); else if (a === 'addInt') intForm();
    else if (a === 'editInt') intForm(state.interventions.find((x) => x.id === el.dataset.i));
    else if (a === 'doneTask') { const t = v.tasks.find((x) => x.id === el.dataset.t); intForm(null, { types: [t.type], title: t.label }); }
    else if (a === 'editTask') taskForm(v.tasks.find((x) => x.id === el.dataset.t)); else if (a === 'addTask') taskForm();
    else if (a === 'todoDone') { const i = state.interventions.find((x) => x.id === el.dataset.i); const t = i.todos.find((x) => x.id === el.dataset.t); t.done = true; t.doneOn = E.iso(E.today()); await save(); render(); }
    else if (a === 'ics') download(new Blob([E.ics(state.vehicles, state.interventions)], { type: 'text/calendar' }), 'odometre-echeances.ics');
    else if (a === 'notify') enableNotify(); else if (a === 'export') exportBackup();
    else if (a === 'reset') { if (confirm('Effacer tout le carnet de cet appareil ?') && confirm('Dernière confirmation : cette action est définitive.')) { state.vehicles = []; state.interventions = []; for (const [id] of await DB.all('files')) await DB.del('files', id); state.currentVehicle = null; await save(); render(); } }
    else if (a === 'demoData') { seedDemo(); await save(); render(); }
    else if (a === 'openFile') { e.preventDefault(); viewFile(el.dataset.f, el.textContent.trim() || 'fichier'); }
    else if (a === 'diag') runDiag();
  });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'pickCar') { state.currentVehicle = el.value; await save(); render(); }
    else if (el.closest && el.closest('#settings')) { const f = new FormData($('#settings')); state.settings.pro = f.has('pro'); state.settings.theme = f.get('theme'); await save(); render(); }
    else if (el.id === 'imp') importBackup(el.files[0]);
  });

  /* ---------- Démo ---------- */
  function seedDemo() {
    const t = E.today(); const ago = (d) => E.iso(new Date(t.getTime() - d * 864e5));
    const id = uid();
    state.vehicles = [{ id, name: 'Peugeot 308 (exemple)', plate: 'AB-123-CD', fuel: 'Diesel', body: 'citadine', km: 87450, kmDate: ago(3), tasks: E.TASK_TEMPLATES.map((x) => ({ id: uid(), ...x, baseKm: null, baseDate: null, enabled: true })) }];
    const mk = (days, km, types, title, shop, cost, todos) => ({ id: uid(), vehicleId: id, date: ago(days), km, types, title, shop, costTtc: cost, vat: 20, notes: '', files: [], status: 'done', todos: (todos || []).map((x) => ({ id: uid(), text: x, done: false })) });
    state.interventions = [
      mk(520, 63000, ['vidange', 'filtres'], 'Révision 60 000 km', 'Garage du Centre', 289),
      mk(430, 69800, ['ct'], 'Contrôle technique', 'Autosécurité', 79, ['Contre-visite : phare gauche']),
      mk(300, 74200, ['pneus'], '2 pneus avant', 'Speedy', 232),
      mk(140, 82100, ['vidange'], 'Vidange', 'Garage du Centre', 165, ['Plaquettes arrière à prévoir', 'Essuie-glaces avant']),
      mk(35, 86300, ['freins'], 'Plaquettes avant', 'Garage du Centre', 210)
    ];
    state.currentVehicle = id;
  }

  /* ---------- Démarrage ---------- */
  async function boot2() {
    if (DEMO) { seedDemo(); }
    render();
    if (DEMO && params.get('open') === 'int') intForm(); else if (DEMO && params.get('open') === 'car') carForm(); else if (DEMO && params.get('open') === 'task') taskForm(vehicle().tasks[0]);
    notifyDue(); recheckLicense();
  }
  async function boot() {
    // Ne jamais rester sur un écran blanc : si IndexedDB tarde ou est bloqué (navigation privée), on continue sans sauvegarde.
    try { await Promise.race([DB.open(), new Promise((_, rej) => setTimeout(() => rej(new Error('idb')), 3000))]); } catch (e) { DB.db = null; state.noStorage = true; }
    const s = await DB.get('kv', 'state');
    if (s) Object.assign(state, s);
    if (!DEMO && 'serviceWorker' in navigator && location.protocol.startsWith('http')) { const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', () => { try { if (had && !sessionStorage.getItem('odo-rl')) { sessionStorage.setItem('odo-rl', '1'); location.reload(); } } catch (e) { /* ignore */ } }); navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}); }
    boot2();
  }
  window.Odo = { state, E, DEMO, esc, eur, num, dFr, monthFr, monthShort, typeLabel, vInts, humanDue, picker, PILL, vehicle, getFile, VERSION };
  boot();
})();
