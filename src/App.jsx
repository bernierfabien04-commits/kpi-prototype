import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, Upload, Plus, Trash2 } from "lucide-react";

// Config via env (Vercel/Netlify or .env.local)
const REMOTE = {
  enabled: true,
  endpoint: import.meta.env.VITE_REMOTE_ENDPOINT,
  token: import.meta.env.VITE_REMOTE_TOKEN,
};

// Helpers
function startOfISOWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatWeekLabel(date = new Date()) {
  const monday = startOfISOWeek(date);
  const year = monday.getFullYear();
  const tmp = new Date(monday);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3);
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-W${pad(weekNumber)}`;
}

const DEFAULT_REPS = ["Commercial 1", "Commercial 2", "Commercial 3", "Commercial 4", "Commercial 5"];
const LS_KEY = "kpi_weekly_records_v1";
const LS_REPS = "kpi_reps_v1";

export default function App() {
  // reps
  const [reps, setReps] = useState(() => {
    const saved = localStorage.getItem(LS_REPS);
    return saved ? JSON.parse(saved) : DEFAULT_REPS;
  });
  useEffect(() => localStorage.setItem(LS_REPS, JSON.stringify(reps)), [reps]);

  // records
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(records)), [records]);

  const [activeTab, setActiveTab] = useState("saisie");

  // prefill from URL
  const [form, setForm] = useState(() => ({
    rep: DEFAULT_REPS[0] || "",
    week: formatWeekLabel(new Date()),
    leads: "",
    calls: "",
    emails: "",
    meetings: "",
    opp: "",
    revenue: "",
    prospects: "",
    pendingQuotes: "",
    notes: "",
  }));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wk = params.get("week");
    const rp = params.get("rep");
    if (wk || rp) setForm((f) => ({ ...f, week: wk || f.week, rep: rp || f.rep }));
  }, []);

  useEffect(() => {
    // keep form rep in sync if reps list changes
    if (!reps.includes(form.rep)) {
      setForm((f) => ({ ...f, rep: reps[0] || "" }));
    }
  }, [reps]);

  // Remote bootstrap (merge distant -> local) on first load
  useEffect(() => {
    if (!REMOTE.enabled || !REMOTE.endpoint || !REMOTE.token) return;
    (async () => {
      try {
        const res = await fetch(`${REMOTE.endpoint}?token=${encodeURIComponent(REMOTE.token)}`);
        if (!res.ok) return;
        const remote = await res.json();
        if (Array.isArray(remote)) {
          const byId = {};
          [...records, ...remote].forEach((r) => (byId[r.id] = { ...byId[r.id], ...r }));
          const merged = Object.values(byId).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
          setRecords(merged);
        }
      } catch (e) {
        console.warn("Sync distant indisponible", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weeks = useMemo(() => {
    const set = new Set(records.map((r) => r.week));
    return [formatWeekLabel(new Date()), ...Array.from(set)].filter((v, i, a) => a.indexOf(v) === i);
  }, [records]);

  const [filters, setFilters] = useState({ week: "", rep: "" });

  const filtered = useMemo(() => {
    return records.map((r) => ({
      // Backward-compat with older entries
      meetings: 0,
      prospects: "",
      pendingQuotes: "",
      ...r,
    })).filter((r) => {
      const wk = filters.week ? r.week === filters.week : true;
      const rp = filters.rep ? r.rep === filters.rep : true;
      return wk && rp;
    });
  }, [records, filters]);

  const byRep = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.rep]) map[r.rep] = { rep: r.rep, leads: 0, calls: 0, emails: 0, meetings: 0, opp: 0, revenue: 0 };
      map[r.rep].leads += Number(r.leads || 0);
      map[r.rep].calls += Number(r.calls || 0);
      map[r.rep].emails += Number(r.emails || 0);
      map[r.rep].meetings += Number(r.meetings || 0);
      map[r.rep].opp += Number(r.opp || 0);
      map[r.rep].revenue += Number(r.revenue || 0);
    });
    return Object.values(map);
  }, [filtered]);

  const byWeek = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.week]) map[r.week] = { week: r.week, leads: 0, calls: 0, emails: 0, meetings: 0, opp: 0, revenue: 0 };
      map[r.week].leads += Number(r.leads || 0);
      map[r.week].calls += Number(r.calls || 0);
      map[r.week].emails += Number(r.emails || 0);
      map[r.week].meetings += Number(r.meetings || 0);
      map[r.week].opp += Number(r.opp || 0);
      map[r.week].revenue += Number(r.revenue || 0);
    });
    return Object.values(map).sort((a, b) => a.week.localeCompare(b.week));
  }, [filtered]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, r) => ({
      leads: acc.leads + Number(r.leads || 0),
      calls: acc.calls + Number(r.calls || 0),
      emails: acc.emails + Number(r.emails || 0),
      meetings: acc.meetings + Number(r.meetings || 0),
      opp: acc.opp + Number(r.opp || 0),
      revenue: acc.revenue + Number(r.revenue || 0),
    }), { leads: 0, calls: 0, emails: 0, meetings: 0, opp: 0, revenue: 0 });
  }, [filtered]);

  function resetForm() {
    setForm({ rep: reps[0] || "", week: formatWeekLabel(new Date()), leads: "", calls: "", emails: "", meetings: "", opp: "", revenue: "", prospects: "", pendingQuotes: "", notes: "" });
  }

  function addRecord(e) {
    e.preventDefault();
    const toNum = (v) => {
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const newRec = {
      id: crypto.randomUUID(),
      rep: form.rep || reps[0] || "",
      week: form.week || formatWeekLabel(new Date()),
      leads: toNum(form.leads),
      calls: toNum(form.calls),
      emails: toNum(form.emails),
      meetings: toNum(form.meetings),
      opp: toNum(form.opp),
      revenue: toNum(form.revenue),
      prospects: form.prospects?.trim() || "",
      pendingQuotes: form.pendingQuotes?.trim() || "",
      notes: form.notes?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newRec, ...prev]);
    // push distant (best-effort)
    if (REMOTE.enabled && REMOTE.endpoint && REMOTE.token) {
      fetch(REMOTE.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ token: REMOTE.token, action: "append", record: newRec }),
      }).catch(() => {});
    }
    resetForm();
    setActiveTab("tableau");
  }

  function deleteRecord(id) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (REMOTE.enabled && REMOTE.endpoint && REMOTE.token) {
      fetch(REMOTE.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ token: REMOTE.token, action: "delete", id }),
      }).catch(() => {});
    }
  }

  function exportCSV() {
    const header = [
      "rep",
      "week",
      "leads",
      "calls",
      "emails",
      "meetings",
      "opportunities_eur",
      "revenue_eur",
      "prospects",
      "pending_quotes",
      "notes",
      "createdAt",
    ];
    const rows = records.map((r) => [
      r.rep,
      r.week,
      r.leads ?? 0,
      r.calls ?? 0,
      r.emails ?? 0,
      r.meetings ?? 0,
      r.opp ?? 0,
      r.revenue ?? 0,
      r.prospects ?? "",
      r.pendingQuotes ?? "",
      r.notes ?? "",
      r.createdAt,
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.map((v) => {
      const s = String(v ?? "");
      return s.includes(",") ? `"${s.replaceAll('"', '""')}"` : s;
    }).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const [headerLine, ...lines] = text.split(/\\r?\\n/).filter(Boolean);
        const cols = headerLine.split(",").map((c) => c.trim().toLowerCase());
        const idx = (name) => cols.findIndex((c) => c === name);
        const get = (arr, i) => (i >= 0 ? arr[i] : "");
        const newRecs = lines.map((ln) => ln.split(",")).map((arr) => ({
          id: crypto.randomUUID(),
          rep: get(arr, idx("rep")) || reps[0] || "",
          week: get(arr, idx("week")) || formatWeekLabel(new Date()),
          leads: Number(get(arr, idx("leads"))) || 0,
          calls: Number(get(arr, idx("calls"))) || 0,
          emails: Number(get(arr, idx("emails"))) || 0,
          meetings: Number(get(arr, idx("meetings"))) || 0,
          opp: Number(get(arr, idx("opportunities_eur"))) || 0,
          revenue: Number(get(arr, idx("revenue_eur"))) || 0,
          prospects: get(arr, idx("prospects")) || "",
          pendingQuotes: get(arr, idx("pending_quotes")) || "",
          notes: get(arr, idx("notes")) || "",
          createdAt: new Date().toISOString(),
        }));
        setRecords((prev) => [...newRecs, ...prev]);
      } catch (err) {
        alert("Import CSV invalide");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-700 text-white grid place-items-center font-bold">K</div>
            <div>
              <h1 className="text-lg font-semibold text-emerald-900">KPI – Saisie hebdo (équipe commerciale)</h1>
              <p className="text-xs text-gray-500">Saisissez les KPI chaque lundi. Données locales + Google Sheets.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("saisie")} className={`px-3 py-1.5 rounded-xl text-sm ${activeTab === "saisie" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-900"}`}>Saisie</button>
            <button onClick={() => setActiveTab("tableau")} className={`px-3 py-1.5 rounded-xl text-sm ${activeTab === "tableau" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-900"}`}>Tableau de bord</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "saisie" ? (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-base font-semibold mb-4 text-emerald-900">Formulaire de saisie</h2>
                <form onSubmit={addRecord} className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Commercial</label>
                    <select className="mt-1 w-full border rounded-xl p-2.5" value={form.rep} onChange={(e) => setForm({ ...form, rep: e.target.value })}>
                      {reps.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">Semaine (ISO)</label>
                    <input className="mt-1 w-full border rounded-xl p-2.5" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} placeholder="YYYY-Wxx" />
                  </div>
                  <div>
                    <label className="text-sm">Leads créés</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Appels sortants</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.calls} onChange={(e) => setForm({ ...form, calls: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Emails envoyés</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">RDV pris</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.meetings} onChange={(e) => setForm({ ...form, meetings: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm">Prospects (sociétés)</label>
                    <input className="mt-1 w-full border rounded-xl p-2.5" placeholder="Liste des prospects (séparés par des virgules)" value={form.prospects} onChange={(e) => setForm({ ...form, prospects: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm">Devis importants en cours</label>
                    <input className="mt-1 w-full border rounded-xl p-2.5" placeholder="Liste des devis non closés (séparés par des virgules)" value={form.pendingQuotes} onChange={(e) => setForm({ ...form, pendingQuotes: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Opportunités (€)</label>
                    <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded-xl p-2.5" value={form.opp} onChange={(e) => setForm({ ...form, opp: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Revenus gagnés (€)</label>
                    <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded-xl p-2.5" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm">Commentaires</label>
                    <textarea rows={3} className="mt-1 w-full border rounded-xl p-2.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-700 text-white">Enregistrer</button>
                    <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900">Réinitialiser</button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-sm font-semibold mb-3 text-emerald-900">Gestion des commerciaux</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {reps.map((r) => (
                    <span key={r} className="inline-flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full text-sm text-emerald-900">
                      {r}
                      <button title="Supprimer" onClick={() => { if (!confirm(`Supprimer ${r} ?`)) return; setReps((prev) => prev.filter((x) => x !== r)); setRecords((prev) => prev.filter((rec) => rec.rep !== r)); }} className="text-emerald-700 hover:text-red-600"><Trash2 size={16} /></button>
                    </span>
                  ))}
                </div>
                <button onClick={() => { const name = prompt("Nom du commercial"); if (name && !reps.includes(name)) setReps((prev) => [...prev, name]); }} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white inline-flex items-center gap-2"><Plus size={16}/>Ajouter</button>
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-sm font-semibold mb-3 text-emerald-900">Export / Import</h3>
                <div className="flex items-center gap-3">
                  <button onClick={exportCSV} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white inline-flex items-center gap-2"><Download size={16}/>Exporter CSV</button>
                  <label className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 inline-flex items-center gap-2 cursor-pointer"><Upload size={16}/>Importer CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={importCSV}/></label>
                </div>
                <p className="text-xs text-gray-500 mt-2">CSV attendu : rep, week, leads, calls, emails, meetings, opportunities_eur, revenue_eur, prospects, pending_quotes, notes.</p>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm">Filtre semaine</label>
                  <select className="mt-1 w-full border rounded-xl p-2.5" value={filters.week} onChange={(e) => setFilters((f) => ({ ...f, week: e.target.value }))}>
                    <option value="">(Toutes)</option>
                    {weeks.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Filtre commercial</label>
                  <select className="mt-1 w-full border rounded-xl p-2.5" value={filters.rep} onChange={(e) => setFilters((f) => ({ ...f, rep: e.target.value }))}>
                    <option value="">(Tous)</option>
                    {reps.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => setFilters({ week: "", rep: "" })} className="w-full px-3 py-2 rounded-xl bg-emerald-100 text-emerald-900">Réinitialiser</button>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-6 gap-4">
              <SummaryCard label="Leads" value={totals.leads} />
              <SummaryCard label="Appels" value={totals.calls} />
              <SummaryCard label="Emails" value={totals.emails} />
              <SummaryCard label="RDV" value={totals.meetings} />
              <SummaryCard label="Opp (€)" value={totals.opp} format={(v)=>formatCurrency(v)} />
              <SummaryCard label="CA (€)" value={totals.revenue} format={(v)=>formatCurrency(v)} />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Activité par commercial (leads / appels / emails / RDV)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byRep}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rep" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" name="Leads" />
                    <Bar dataKey="calls" name="Appels" />
                    <Bar dataKey="emails" name="Emails" />
                    <Bar dataKey="meetings" name="RDV" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Revenus par commercial">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byRep}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rep" />
                    <YAxis />
                    <Tooltip formatter={(v)=>formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="CA (€)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Tendance hebdo (CA)">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={byWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip formatter={(v)=>formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="CA (€)" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="p-4 border-b"><h3 className="text-sm font-semibold text-emerald-900">Données (filtrées)</h3></div>
                <div className="p-4 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2">Semaine</th>
                        <th>Commercial</th>
                        <th>Leads</th>
                        <th>Appels</th>
                        <th>Emails</th>
                        <th>RDV</th>
                        <th>Opp (€)</th>
                        <th>CA (€)</th>
                        <th>Prospects</th>
                        <th>Devis en cours</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="py-2">{r.week}</td>
                          <td>{r.rep}</td>
                          <td>{r.leads}</td>
                          <td>{r.calls}</td>
                          <td>{r.emails}</td>
                          <td>{r.meetings ?? 0}</td>
                          <td>{formatCurrency(r.opp)}</td>
                          <td>{formatCurrency(r.revenue)}</td>
                          <td className="max-w-xs truncate" title={r.prospects}>{r.prospects}</td>
                          <td className="max-w-xs truncate" title={r.pendingQuotes}>{r.pendingQuotes}</td>
                          <td className="max-w-xs truncate" title={r.notes}>{r.notes}</td>
                          <td>
                            <button onClick={() => deleteRecord(r.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td className="py-4 text-gray-500" colSpan={12}>Aucune donnée encore. Ajoutez des enregistrements dans l’onglet Saisie.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 pt-2 text-xs text-gray-500">
        Données locales (navigateur) + Google Sheets via Apps Script. Export CSV disponible.
      </footer>
    </div>
  );
}

function SummaryCard({ label, value, format }) {
  const display = format ? format(value) : value;
  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-emerald-100">
      <div className="text-xs text-emerald-700">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-emerald-900">{display}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow border border-emerald-100">
      <div className="p-4 border-b"><h3 className="text-sm font-semibold text-emerald-900">{title}</h3></div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function formatCurrency(v) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
  } catch {
    return `${v}`;
  }
}
