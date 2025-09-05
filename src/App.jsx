import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/**
 * KPI App — Saisie + Tableau de bord
 * - Formulaire (Saisie) : 5 prospects à gauche, 5 "Gros devis en cours" à droite
 * - Tableau de bord : graphiques + filtres (Semaine / Commercial), palette personnalisée
 * - Accès au tableau de bord protégé par mot de passe: 2020Head
 * - Connexion API (Google Apps Script) via VITE_API_URL + VITE_API_KEY (fallback L230_test123)
 */

const TEAM = ['Commercial 1','Commercial 2','Commercial 3','Commercial 4','Commercial 5'];
const CUSTOM_COLORS = ['#E1A624','#317AC1','#384454','#D4D3DC','#AD956B']; // or, bleu, gris foncé, gris clair, bronze

export default function KPIPrototypeApp(){
  const [tab, setTab] = React.useState('saisie');
  const [password, setPassword] = React.useState('');
  const [unlocked, setUnlocked] = React.useState(false);

  // ---- Filters (dashboard) ----
  const [filterWeek, setFilterWeek] = React.useState('');
  const [filterRep, setFilterRep] = React.useState('');

  // ---- Saisie state ----
  const [form, setForm] = React.useState({
    rep: TEAM[0],
    week: defaultWeek(),
    calls: '',
    newContacts: '',
    emails: '',
    meetings: '',
    ca: '',
    grossMarginPct: '',
    notes: '',
  });
  const [prospects, setProspects] = React.useState(Array(5).fill(''));
  const [quotes, setQuotes] = React.useState(Array(5).fill(''));
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState('');

  // ---- Data for dashboard ----
  const API_URL = import.meta?.env?.VITE_API_URL || '';
  const API_KEY = import.meta?.env?.VITE_API_KEY || 'L230_test123';
  const [remoteRows, setRemoteRows] = React.useState([]);

  // Fallback sample data so the dashboard is never empty
  const SAMPLE = React.useMemo(() => ([
    { id:'s1', rep:'Commercial 1', week:'2025-W34', calls:48, new_contacts:12, emails:60, meetings:5, revenue_eur:9000 },
    { id:'s2', rep:'Commercial 2', week:'2025-W34', calls:52, new_contacts:9,  emails:44, meetings:6, revenue_eur:7000 },
    { id:'s3', rep:'Commercial 3', week:'2025-W34', calls:31, new_contacts:7,  emails:30, meetings:3, revenue_eur:4000 },
    { id:'s4', rep:'Commercial 1', week:'2025-W35', calls:55, new_contacts:15, emails:68, meetings:7, revenue_eur:13000 },
    { id:'s5', rep:'Commercial 2', week:'2025-W35', calls:46, new_contacts:10, emails:41, meetings:4, revenue_eur:6500 },
    { id:'s6', rep:'Commercial 3', week:'2025-W35', calls:38, new_contacts:6,  emails:29, meetings:4, revenue_eur:5200 },
  ]), []);

  // Combine sample + remote so charts show something even if API is down
  const records = React.useMemo(() => {
    // Normalize remote rows to the same shape as SAMPLE
    const normalized = (remoteRows || []).map((r, i) => ({
      id: r.id || `r${i}`,
      rep: r.rep || r.commercial || 'N/A',
      week: r.week || r.semaine || '',
      calls: toNum(r.calls ?? r.nb_appels),
      new_contacts: toNum(r.new_contacts ?? r.nouveaux_contacts),
      emails: toNum(r.emails ?? r.nb_emails),
      meetings: toNum(r.meetings ?? r.rdv),
      revenue_eur: toNum(r.revenue_eur ?? r.ca),
    }));
    return [...SAMPLE, ...normalized];
  }, [SAMPLE, remoteRows]);

  const repsList = React.useMemo(() => Array.from(new Set(records.map(r=>r.rep))), [records]);
  const weeks = React.useMemo(() => Array.from(new Set(records.map(r=>r.week))).sort(), [records]);

  const colorByRep = React.useMemo(() => {
    const map = {};
    repsList.forEach((rep, i) => { map[rep] = CUSTOM_COLORS[i % CUSTOM_COLORS.length]; });
    return map;
  }, [repsList]);

  // Load current rows from API on mount
  React.useEffect(() => {
    if(!API_URL) return; // no API set -> stay on sample
    (async () => {
      try{
        const url = `${API_URL}?op=list&k=${encodeURIComponent(API_KEY)}`;
        const res = await fetch(url, { method:'GET' });
        const json = await res.json();
        if(json?.ok && Array.isArray(json.data)){
          setRemoteRows(json.data);
        }
      }catch(e){
        console.warn('API list failed, using SAMPLE only', e);
      }
    })();
  }, [API_URL, API_KEY]);

  // ----- Actions -----
  function onChange(e){
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function setProspectAt(i, v){ setProspects(prev => prev.map((x,idx)=> idx===i? v : x)); }
  function setQuoteAt(i, v){ setQuotes(prev => prev.map((x,idx)=> idx===i? v : x)); }

  async function handleSubmit(e){
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');

    const payload = {
      op: 'add',
      rep: form.rep,
      week: form.week,
      calls: toNum(form.calls),
      new_contacts: toNum(form.newContacts),
      emails: toNum(form.emails),
      meetings: toNum(form.meetings),
      revenue_eur: toNum(form.ca),
      gross_margin_pct: toPct(form.grossMarginPct),
      notes: form.notes,
      // Arrays and flattened strings (for single cell storage in the sheet)
      prospects: prospects.filter(Boolean),
      quotes: quotes.filter(Boolean),
      prospects_flat: prospects.filter(Boolean).join(' | '),
      quotes_flat: quotes.filter(Boolean).join(' | '),
    };

    try{
      if(!API_URL){
        // No API configured -> simulate local preview & message
        setSaveMsg('Aucune API configurée (VITE_API_URL). Données enregistrées en aperçu local.');
        setSaving(false);
        return;
      }
      const url = `${API_URL}?op=add&k=${encodeURIComponent(API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if(json?.ok){
        setSaveMsg('Enregistré !');
        // Optionnel: recharger la liste
        try {
          const listRes = await fetch(`${API_URL}?op=list&k=${encodeURIComponent(API_KEY)}`);
          const listJson = await listRes.json();
          if(listJson?.ok && Array.isArray(listJson.data)){
            setRemoteRows(listJson.data);
          }
        } catch{ /* ignore */ }
        // Remise à zéro de la saisie légère
        setProspects(Array(5).fill(''));
        setQuotes(Array(5).fill(''));
      }else{
        setSaveMsg(json?.error || 'Erreur lors de la sauvegarde');
      }
    }catch(err){
      setSaveMsg('Erreur réseau');
    }finally{
      setSaving(false);
      setTab('tableau');
    }
  }

  function checkPassword(){
    if(password === '2020Head') setUnlocked(true);
    else alert('Mot de passe incorrect');
  }

  // ----- Derived data for charts -----
  const filtered = React.useMemo(() => {
    return records.filter(r =>
      (filterWeek ? r.week === filterWeek : true) &&
      (filterRep ? r.rep === filterRep : true)
    );
  }, [records, filterWeek, filterRep]);

  const totals = React.useMemo(() => filtered.reduce((acc, r) => ({
    calls: acc.calls + Number(r.calls||0),
    new_contacts: acc.new_contacts + Number(r.new_contacts||0),
    emails: acc.emails + Number(r.emails||0),
    meetings: acc.meetings + Number(r.meetings||0),
    revenue_eur: acc.revenue_eur + Number(r.revenue_eur||0),
  }), { calls:0, new_contacts:0, emails:0, meetings:0, revenue_eur:0 }), [filtered]);

  const byRep = React.useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = r.rep;
      const cur = map.get(key) || { rep:key, calls:0, new_contacts:0, emails:0, meetings:0, revenue_eur:0 };
      cur.calls += Number(r.calls||0);
      cur.new_contacts += Number(r.new_contacts||0);
      cur.emails += Number(r.emails||0);
      cur.meetings += Number(r.meetings||0);
      cur.revenue_eur += Number(r.revenue_eur||0);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [filtered]);

  const byWeek = React.useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = r.week;
      const cur = map.get(key) || { week:key, revenue_eur:0 };
      cur.revenue_eur += Number(r.revenue_eur||0);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a,b)=> a.week.localeCompare(b.week));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-700 text-white grid place-items-center font-bold">K</div>
            <div>
              <h1 className="text-lg font-semibold text-emerald-900">KPI – Saisie hebdo</h1>
              <p className="text-xs text-slate-500">Palette personnalisée (or, bleu, gris foncé, gris clair, bronze)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setTab('saisie')} className={`px-3 py-1.5 rounded-xl text-sm ${tab==='saisie'?'bg-emerald-700 text-white':'bg-emerald-100 text-emerald-900'}`}>Saisie</button>
            <button onClick={()=>setTab('tableau')} className={`px-3 py-1.5 rounded-xl text-sm ${tab==='tableau'?'bg-emerald-700 text-white':'bg-emerald-100 text-emerald-900'}`}>Tableau de bord</button>
          </div>
        </div>
      </header>

      {/* ---- TAB: SAISIE ---- */}
      {tab === 'saisie' && (
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-white rounded-2xl shadow border p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Commercial</label>
                  <select name="rep" value={form.rep} onChange={onChange} className="w-full border rounded-xl p-2.5">
                    {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Semaine</label>
                  <input type="week" name="week" value={form.week} onChange={onChange} className="w-full border rounded-xl p-2.5" />
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-4">
                <NumberField label="Nombre d'appels" name="calls" value={form.calls} onChange={onChange} />
                <NumberField label="Nouveaux contacts" name="newContacts" value={form.newContacts} onChange={onChange} />
                <NumberField label="Emails" name="emails" value={form.emails} onChange={onChange} />
                <NumberField label="RDV pris" name="meetings" value={form.meetings} onChange={onChange} />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <CurrencyField label="Chiffre d'affaires (€)" name="ca" value={form.ca} onChange={onChange} />
                <PercentField label="Marge brut (%)" name="grossMarginPct" value={form.grossMarginPct} onChange={onChange} />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900 mb-2">Prospects (sociétés)</h3>
                  <div className="space-y-2">
                    {prospects.map((v,i)=>(
                      <input key={i} value={v} onChange={(e)=>setProspectAt(i, e.target.value)}
                        placeholder={`Prospect ${i+1}`} className="w-full border rounded-xl p-2.5" />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-900 mb-2">Gros devis en cours</h3>
                  <div className="space-y-2">
                    {quotes.map((v,i)=>(
                      <input key={i} value={v} onChange={(e)=>setQuoteAt(i, e.target.value)}
                        placeholder={`Devis ${i+1}`} className="w-full border rounded-xl p-2.5" />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 block mb-1">Commentaires (Succès ou difficultés)</label>
                <textarea name="notes" value={form.notes} onChange={onChange} rows={3} className="w-full border rounded-xl p-2.5" placeholder="Ex: très bonne semaine, 2 RDV qualifiés, un devis à 12k€ en cours..." />
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-700 text-white disabled:opacity-60">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {saveMsg && <span className="text-sm text-slate-600">{saveMsg}</span>}
                {!API_URL && <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">VITE_API_URL non configurée — enregistrement simulé localement</span>}
              </div>
            </form>
          </div>
        </main>
      )}

      {/* ---- TAB: TABLEAU ---- */}
      {tab === 'tableau' && !unlocked && (
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Accès protégé</h2>
            <div className="flex items-center gap-2">
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mot de passe" className="border rounded-xl p-2.5" />
              <button onClick={checkPassword} className="px-4 py-2 rounded-xl bg-emerald-700 text-white">Entrer</button>
            </div>
          </div>
        </main>
      )}

      {tab === 'tableau' && unlocked && (
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Filtres */}
          <div className="bg-white rounded-2xl shadow border p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Semaine</label>
              <select value={filterWeek} onChange={(e)=>setFilterWeek(e.target.value)} className="border rounded-xl p-2.5">
                <option value="">Toutes</option>
                {weeks.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Commercial</label>
              <select value={filterRep} onChange={(e)=>setFilterRep(e.target.value)} className="border rounded-xl p-2.5">
                <option value="">Tous</option>
                {repsList.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={()=>{ setFilterWeek(''); setFilterRep(''); }} className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-900">Réinitialiser</button>
          </div>

          {/* Tuiles */}
          <div className="grid sm:grid-cols-5 gap-4">
            <SummaryCard label="Appels" value={totals.calls} />
            <SummaryCard label="Nvx contacts" value={totals.new_contacts} />
            <SummaryCard label="Emails" value={totals.emails} />
            <SummaryCard label="RDV" value={totals.meetings} />
            <SummaryCard label="CA (€, total)" value={formatCurrency(totals.revenue_eur)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="CA par commercial">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={byRep}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rep" />
                  <YAxis />
                  <Tooltip formatter={(v)=> formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue_eur" name="CA (€)">
                    {byRep.map((e,i)=> <Cell key={i} fill={colorByRep[e.rep]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Répartition du CA par commercial">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={byRep.map(r=>({ name:r.rep, value:r.revenue_eur }))} dataKey="value" nameKey="name" outerRadius={110} label>
                    {byRep.map((entry, i) => (<Cell key={`c-${i}`} fill={colorByRep[entry.rep]} />))}
                  </Pie>
                  <Tooltip formatter={(v)=> formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tendance hebdo du CA">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={byWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(v)=> formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue_eur" name="CA (€)" stroke="#E1A624" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </main>
      )}
    </div>
  );
}

// ---- Small UI helpers ----
function NumberField({ label, name, value, onChange }){
  return (
    <div>
      <label className="text-xs text-slate-600 block mb-1">{label}</label>
      <input type="number" name={name} value={value} onChange={onChange} className="w-full border rounded-xl p-2.5" min="0" />
    </div>
  );
}
function CurrencyField(props){ return <NumberField {...props} />; }
function PercentField(props){ return <NumberField {...props} />; }

function SummaryCard({ label, value }){
  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-emerald-100">
      <div className="text-xs text-emerald-700">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-emerald-900">{String(value)}</div>
    </div>
  );
}

function ChartCard({ title, children }){
  return (
    <div className="bg-white rounded-2xl shadow border border-emerald-100">
      <div className="p-4 border-b"><h3 className="text-sm font-semibold text-emerald-900">{title}</h3></div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ---- Utils ----
function toNum(v){ const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; }
function toPct(v){ const n = Number(String(v ?? '').replace(',', '.')); if (!Number.isFinite(n)) return 0; return Math.max(0, Math.min(100, n)); }
function formatCurrency(v){ try{ return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits: 0 }).format(Number(v)||0);}catch{ return String(v);} }

function defaultWeek(){
  // Returns YYYY-Www in ISO week input format
  const d = new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  const pad = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-W${pad(weekNumber)}`;
}
