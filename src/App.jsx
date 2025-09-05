import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, Upload, Plus, Trash2 } from "lucide-react";

// Config via env
const REMOTE = {
  enabled: true,
  endpoint: import.meta.env.VITE_REMOTE_ENDPOINT,
  token: import.meta.env.VITE_REMOTE_TOKEN,
};

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
const LS_KEY = "kpi_weekly_records_v2"; // schema v2
const LS_REPS = "kpi_reps_v1";

export default function App() {
  const [reps, setReps] = useState(() => {
    const saved = localStorage.getItem(LS_REPS);
    return saved ? JSON.parse(saved) : DEFAULT_REPS;
  });
  useEffect(() => localStorage.setItem(LS_REPS, JSON.stringify(reps)), [reps]);

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(records)), [records]);

  const [activeTab, setActiveTab] = useState("saisie");

  const [form, setForm] = useState(() => ({
    rep: DEFAULT_REPS[0] || "",
    week: formatWeekLabel(new Date()),
    calls: "",
    newContacts: "",
    emails: "",
    meetings: "",
    ca: "",
    grossMarginPct: "",
    prospectsArr: Array(5).fill(""),
    quotesArr: Array(5).fill(""),
    notes: "",
  }));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wk = params.get("week");
    const rp = params.get("rep");
    if (wk || rp) setForm((f) => ({ ...f, week: wk || f.week, rep: rp || f.rep }));
  }, []);

  // Load from remote
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
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!reps.includes(form.rep)) {
      setForm((f) => ({ ...f, rep: reps[0] || "" }));
    }
  }, [reps]);

  const weeks = useMemo(() => {
    const set = new Set(records.map((r) => r.week));
    return [formatWeekLabel(new Date()), ...Array.from(set)].filter((v, i, a) => a.indexOf(v) === i);
  }, [records]);

  const [filters, setFilters] = useState({ week: "", rep: "" });

  const filtered = useMemo(() => {
    return records.map((r) => ({
      new_contacts: 0,
      gross_margin_pct: 0,
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
      if (!map[r.rep]) map[r.rep] = { rep: r.rep, calls: 0, new_contacts: 0, emails: 0, meetings: 0, revenue_eur: 0 };
      map[r.rep].calls += Number(r.calls || 0);
      map[r.rep].new_contacts += Number(r.new_contacts || 0);
      map[r.rep].emails += Number(r.emails || 0);
      map[r.rep].meetings += Number(r.meetings || 0);
      map[r.rep].revenue_eur += Number(r.revenue_eur || 0);
    });
    return Object.values(map);
  }, [filtered]);

  const byWeek = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.week]) map[r.week] = { week: r.week, calls: 0, new_contacts: 0, emails: 0, meetings: 0, revenue_eur: 0 };
      map[r.week].calls += Number(r.calls || 0);
      map[r.week].new_contacts += Number(r.new_contacts || 0);
      map[r.week].emails += Number(r.emails || 0);
      map[r.week].meetings += Number(r.meetings || 0);
      map[r.week].revenue_eur += Number(r.revenue_eur || 0);
    });
    return Object.values(map).sort((a, b) => a.week.localeCompare(b.week));
  }, [filtered]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, r) => ({
      calls: acc.calls + Number(r.calls || 0),
      new_contacts: acc.new_contacts + Number(r.new_contacts || 0),
      emails: acc.emails + Number(r.emails || 0),
      meetings: acc.meetings + Number(r.meetings || 0),
      revenue_eur: acc.revenue_eur + Number(r.revenue_eur || 0),
    }), { calls: 0, new_contacts: 0, emails: 0, meetings: 0, revenue_eur: 0 });
  }, [filtered]);

  function resetForm() {
    setForm({ rep: reps[0] || "", week: formatWeekLabel(new Date()), calls: "", newContacts: "", emails: "", meetings: "", ca: "", grossMarginPct: "", prospectsArr: Array(5).fill(""), quotesArr: Array(5).fill(""), notes: "" });
  }

  function toNum(v) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function toPct(v) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  function addRecord(e) {
    e.preventDefault();
    const prospects = (form.prospectsArr || []).map((s) => String(s || "").trim()).filter(Boolean).join(", ");
    const pending_quotes = (form.quotesArr || []).map((s) => String(s || "").trim()).filter(Boolean).join(", ");
    const newRec = {
      id: crypto.randomUUID(),
      rep: form.rep || reps[0] || "",
      week: form.week || formatWeekLabel(new Date()),
      calls: toNum(form.calls),
      new_contacts: toNum(form.newContacts),
      emails: toNum(form.emails),
      meetings: toNum(form.meetings),
      revenue_eur: toNum(form.ca),
      gross_margin_pct: toPct(form.grossMarginPct),
      prospects,
      pending_quotes,
      notes: form.notes?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    setRecords((prev) => [newRec, ...prev]);
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
      "rep","week","calls","new_contacts","emails","meetings","revenue_eur","gross_margin_pct","prospects","pending_quotes","notes","createdAt"
    ];
    const rows = records.map((r) => [
      r.rep, r.week, r.calls ?? 0, r.new_contacts ?? 0, r.emails ?? 0, r.meetings ?? 0, r.revenue_eur ?? 0, r.gross_margin_pct ?? 0, r.prospects ?? "", r.pending_quotes ?? "", r.notes ?? "", r.createdAt
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
          calls: Number(get(arr, idx("calls"))) || 0,
          new_contacts: Number(get(arr, idx("new_contacts"))) || 0,
          emails: Number(get(arr, idx("emails"))) || 0,
          meetings: Number(get(arr, idx("meetings"))) || 0,
          revenue_eur: Number(get(arr, idx("revenue_eur"))) || 0,
          gross_margin_pct: Number(get(arr, idx("gross_margin_pct"))) || 0,
          prospects: get(arr, idx("prospects")) || "",
          pending_quotes: get(arr, idx("pending_quotes")) || "",
          notes: get(arr, idx("notes")) || "",
          createdAt: new Date().toISOString(),
        }));
        setRecords((prev) => [...newRecs, ...prev]);
      } catch {
        alert("Import CSV invalide");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-700 text-white grid place-items-center font-bold">K</div>
            <div>
              <h1 className="text-lg font-semibold text-emerald-900">KPI – Saisie hebdo (Option 2)</h1>
              <p className="text-xs text-gray-500">Prospects (5) & Gros devis en cours (5). Arrière-plan #f9fafb.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("saisie")} className={`px-3 py-1.5 rounded-xl text-sm ${activeTab === "saisie" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-900"}`}>Saisie</button>\n            <button onClick={() => setActiveTab("tableau")} className={`px-3 py-1.5 rounded-xl text-sm ${activeTab === "tableau" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-900"}`}>Tableau de bord</button>
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
                    <label className="text-sm">Nombre d'appels</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.calls} onChange={(e) => setForm({ ...form, calls: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Nouveaux contacts</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.newContacts} onChange={(e) => setForm({ ...form, newContacts: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Emails envoyés</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.emails} onChange={(e) => setForm({ ...form, emails: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">RDV pris</label>
                    <input type="number" min="0" className="mt-1 w-full border rounded-xl p-2.5" value={form.meetings} onChange={(e) => setForm({ ...form, meetings: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Chiffre d'affaires (€)</label>
                    <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded-xl p-2.5" value={form.ca} onChange={(e) => setForm({ ...form, ca: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm">Marge brut (%)</label>
                    <input type="number" min="0" max="100" step="0.1" className="mt-1 w-full border rounded-xl p-2.5" value={form.grossMarginPct} onChange={(e) => setForm({ ...form, grossMarginPct: e.target.value })} />
                  </div>

                  <div className="sm:col-span-2 grid md:grid-cols-2 gap-6 mt-2">
                    {/* Prospects à gauche (5 champs) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-emerald-900">Prospects (5 champs)</h3>
                        <span className="text-xs text-gray-500">Sociétés</span>
                      </div>
                      <div className="grid gap-2">
                        {form.prospectsArr.map((v, i) => (
                          <input
                            key={i}
                            value={v}
                            onChange={(e)=> {
                              const arr = [...form.prospectsArr]; arr[i] = e.target.value; setForm({ ...form, prospectsArr: arr });
                            }}
                            placeholder={`Prospect ${i+1}`}
                            className="w-full border rounded-xl p-2.5"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Gros devis en cours à droite (5 champs) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-emerald-900">Gros devis en cours (5 champs)</h3>
                        <span className="text-xs text-gray-500">Réf / Société / Montant</span>
                      </div>
                      <div className="grid gap-2">
                        {form.quotesArr.map((v, i) => (
                          <input
                            key={i}
                            value={v}
                            onChange={(e)=> {
                              const arr = [...form.quotesArr]; arr[i] = e.target.value; setForm({ ...form, quotesArr: arr });
                            }}
                            placeholder={`Devis ${i+1}`}
                            className="w-full border rounded-xl p-2.5"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm">Commentaires (Succès ou difficultés)</label>
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
                <p className="text-xs text-gray-500 mt-2">CSV attendu : rep, week, calls, new_contacts, emails, meetings, revenue_eur, gross_margin_pct, prospects, pending_quotes, notes.</p>
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
              <SummaryCard label="Appels" value={totals.calls} />
              <SummaryCard label="Nouveaux contacts" value={totals.new_contacts} />
              <SummaryCard label="Emails" value={totals.emails} />
              <SummaryCard label="RDV" value={totals.meetings} />
              <SummaryCard label="CA (€)" value={totals.revenue_eur} format={(v)=>formatCurrency(v)} />
              <SummaryCard label="Marge brut (%)" value="—" />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="Activité par commercial (appels / nouveaux contacts / emails / RDV)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byRep}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rep" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" name="Appels" />
                    <Bar dataKey="new_contacts" name="Nvx contacts" />
                    <Bar dataKey="emails" name="Emails" />
                    <Bar dataKey="meetings" name="RDV" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Chiffre d'affaires par commercial">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byRep}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rep" />
                    <YAxis />
                    <Tooltip formatter={(v)=>formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="revenue_eur" name="CA (€)" />
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
                    <Line type="monotone" dataKey="revenue_eur" name="CA (€)" />
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
                        <th>Appels</th>
                        <th>Nvx contacts</th>
                        <th>Emails</th>
                        <th>RDV</th>
                        <th>CA (€)</th>
                        <th>Marge (%)</th>
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
                          <td>{r.calls}</td>
                          <td>{r.new_contacts}</td>
                          <td>{r.emails}</td>
                          <td>{r.meetings}</td>
                          <td>{formatCurrency(r.revenue_eur)}</td>
                          <td>{Number(r.gross_margin_pct ?? 0).toFixed(1)}%</td>
                          <td className="max-w-xs truncate" title={r.prospects}>{r.prospects}</td>
                          <td className="max-w-xs truncate" title={r.pending_quotes}>{r.pending_quotes}</td>
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
