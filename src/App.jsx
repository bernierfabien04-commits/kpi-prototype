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

export default function KPIPrototypeProspectsQuotes(){
  const [testResults, setTestResults] = React.useState([]);
  const [tab, setTab] = React.useState('saisie');
  const [filterWeek, setFilterWeek] = React.useState('');
  const [filterRep, setFilterRep] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [unlocked, setUnlocked] = React.useState(false);

  const [form, setForm] = React.useState({
    rep: 'Commercial 1',
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
  const [preview, setPreview] = React.useState(null);

  const SAMPLE = React.useMemo(() => ([
    { id:'s1', rep:'Commercial 1', week:'2025-W34', calls:48, new_contacts:12, emails:60, meetings:5, revenue_eur:9000 },
    { id:'s2', rep:'Commercial 2', week:'2025-W34', calls:52, new_contacts:9,  emails:44, meetings:6, revenue_eur:7000 },
    { id:'s3', rep:'Commercial 3', week:'2025-W34', calls:31, new_contacts:7,  emails:30, meetings:3, revenue_eur:4000 },
    { id:'s4', rep:'Commercial 1', week:'2025-W35', calls:55, new_contacts:15, emails:68, meetings:7, revenue_eur:13000 },
    { id:'s5', rep:'Commercial 2', week:'2025-W35', calls:46, new_contacts:10, emails:41, meetings:4, revenue_eur:6500 },
    { id:'s6', rep:'Commercial 3', week:'2025-W35', calls:38, new_contacts:6,  emails:29, meetings:4, revenue_eur:5200 },
  ]), []);

  const records = React.useMemo(() => {
    const extra = preview ? [{...preview}] : [];
    return [...SAMPLE, ...extra];
  }, [SAMPLE, preview]);

  const weeks = React.useMemo(() => Array.from(new Set(records.map(r=>r.week))).sort(), [records]);
  const repsList = React.useMemo(() => Array.from(new Set(records.map(r=>r.rep))), [records]);

  React.useEffect(() => {
    const results = [];
    const wk = defaultWeek();
    results.push({ name: 'defaultWeek format', pass: /^\d{4}-W\d{2}$/.test(wk), got: wk });
    setTestResults(results);
  }, []);

  function onChange(e){
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function setArr(setter, idx, value){ setter(prev => prev.map((v,i)=> i===idx? value : v)); }
  function toNum(v){ const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; }
  function toPct(v){ const n = Number(String(v ?? '').replace(',', '.')); if (!Number.isFinite(n)) return 0; return Math.max(0, Math.min(100, n)); }
  function submit(e){ e.preventDefault(); setPreview({ id: crypto.randomUUID(), rep: form.rep, week: form.week, calls: toNum(form.calls), new_contacts: toNum(form.newContacts), emails: toNum(form.emails), meetings: toNum(form.meetings), revenue_eur: toNum(form.ca) }); setTab('tableau'); }

  // ——— Nouvelle palette personnalisée fournie ———
  const CUSTOM_COLORS = ['#E1A624','#317AC1','#384454','#D4D3DC','#AD956B'];
  const colorByRep = React.useMemo(() => { const map = {}; repsList.forEach((rep, i) => { map[rep] = CUSTOM_COLORS[i % CUSTOM_COLORS.length]; }); return map; }, [repsList]);

  const filtered = React.useMemo(() => records.filter(r => (filterWeek? r.week===filterWeek : true) && (filterRep? r.rep===filterRep : true)), [records, filterWeek, filterRep]);

  const byRep = React.useMemo(() => { const map = new Map(); for (const r of filtered) { const key = r.rep; const cur = map.get(key) || { rep:key, calls:0, new_contacts:0, emails:0, meetings:0, revenue_eur:0 }; cur.calls += Number(r.calls||0); cur.new_contacts += Number(r.new_contacts||0); cur.emails += Number(r.emails||0); cur.meetings += Number(r.meetings||0); cur.revenue_eur += Number(r.revenue_eur||0); map.set(key, cur);} return Array.from(map.values()); }, [filtered]);

  const byWeek = React.useMemo(() => { const map = new Map(); for (const r of filtered) { const key = r.week; const cur = map.get(key) || { week:key, revenue_eur:0 }; cur.revenue_eur += Number(r.revenue_eur||0); map.set(key, cur);} return Array.from(map.values()).sort((a,b)=> a.week.localeCompare(b.week)); }, [filtered]);

  const totals = React.useMemo(() => filtered.reduce((acc, r) => ({ calls: acc.calls + Number(r.calls||0), new_contacts: acc.new_contacts + Number(r.new_contacts||0), emails: acc.emails + Number(r.emails||0), meetings: acc.meetings + Number(r.meetings||0), revenue_eur: acc.revenue_eur + Number(r.revenue_eur||0), }), { calls:0, new_contacts:0, emails:0, meetings:0, revenue_eur:0 }), [filtered]);

  function checkPassword(){
    if(password === '2020Head') setUnlocked(true);
    else alert('Mot de passe incorrect');
  }

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

      {tab==='tableau' && !unlocked && (
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Accès protégé</h2>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mot de passe" className="border rounded-xl p-2.5 mr-2" />
            <button onClick={checkPassword} className="px-4 py-2 rounded-xl bg-emerald-700 text-white">Entrer</button>
          </div>
        </main>
      )}

      {tab==='tableau' && unlocked && (
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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

function SummaryCard({ label, value }){
  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-emerald-100">
      <div className="text-xs text-emerald-700">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-emerald-900">{value}</div>
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

function formatCurrency(v){ try{ return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits: 0 }).format(Number(v)||0);}catch{ return String(v);} }

function defaultWeek(){ const d = new Date(); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); const monday = new Date(d); const tmp = new Date(monday); tmp.setDate(tmp.getDate()+3); const firstThursday = new Date(tmp.getFullYear(),0,4); const weekNumber = 1 + Math.round(((tmp-firstThursday)/86400000 - 3 + ((firstThursday.getDay()+6)%7))/7); const pad = (n)=> String(n).padStart(2,'0'); return `${monday.getFullYear()}-W${pad(weekNumber)}`; }