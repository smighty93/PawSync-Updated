import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp, Plus, X, Scale, Syringe, FileText, ChevronDown, AlertCircle,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

// =====================================================
// SVG WEIGHT CHART
// =====================================================

function WeightChart({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No weight entries for this period
      </div>
    );
  }
  if (entries.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Scale size={32} className="text-blue-300" />
        <p className="text-slate-400 text-sm">Add more entries to see the chart</p>
      </div>
    );
  }

  const W = 500, H = 180;
  const PAD = { top: 16, right: 16, bottom: 40, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const weights = entries.map((e) => parseFloat(e.weight_kg));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const sx = (i) => PAD.left + (i / (entries.length - 1)) * cW;
  const sy = (w) => PAD.top + cH - ((w - minW) / range) * cH;

  const points = entries.map((e, i) => `${sx(i)},${sy(parseFloat(e.weight_kg))}`).join(" ");
  const area = [
    `${sx(0)},${PAD.top + cH}`,
    ...entries.map((e, i) => `${sx(i)},${sy(parseFloat(e.weight_kg))}`),
    `${sx(entries.length - 1)},${PAD.top + cH}`,
  ].join(" ");

  const ticks = 4;
  const step = range / ticks;

  const xIdx = entries.length <= 6
    ? entries.map((_, i) => i)
    : [0, Math.floor(entries.length / 4), Math.floor(entries.length / 2),
       Math.floor((3 * entries.length) / 4), entries.length - 1];

  const fmtX = (s) => {
    const d = new Date(`${s}T00:00:00`);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{ minWidth: "280px", maxHeight: "200px" }}
        aria-label="Weight progression chart" role="img">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const w = minW + i * step;
          const y = sy(w);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                {w.toFixed(1)}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="#dbeafe" opacity="0.5" />
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
        {entries.map((e, i) => (
          <circle key={`${e.id}-${i}`} cx={sx(i)} cy={sy(parseFloat(e.weight_kg))}
            r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
        ))}
        {xIdx.map((i) => (
          <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {fmtX(entries[i].recorded_at)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// =====================================================
// ANALYTICS PAGE
// =====================================================

function Analytics() {
  const [pets,           setPets]           = useState([]);
  const [selectedPet,    setSelectedPet]    = useState(null);
  const [weightEntries,  setWeightEntries]  = useState([]);
  const [vaccinations,   setVaccinations]   = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [weightLoading,  setWeightLoading]  = useState(false);
  const [error,          setError]          = useState("");
  const [weightError,    setWeightError]    = useState("");
  const [showAddWeight,  setShowAddWeight]  = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [dateRange,      setDateRange]      = useState("all");
  const [weightForm,     setWeightForm]     = useState({
    weight_kg:   "",
    recorded_at: new Date().toISOString().split("T")[0],
    notes:       "",
  });

  // Keep a stable ref to the current user id
  const userIdRef = useRef(null);

  // ─── Load pet data ───────────────────────────────
  const loadPetData = useCallback(async (petId) => {
    if (!petId) return;
    setWeightLoading(true);
    setWeightError("");

    try {
      const [wRes, vRes, rRes] = await Promise.all([
        supabase
          .from("pet_weights")
          .select("id, weight_kg, recorded_at, notes")
          .eq("pet_id", petId)
          .order("recorded_at", { ascending: true }),
        supabase
          .from("vaccinations")
          .select("id, vaccine_name, vaccination_date, next_due_date, status")
          .eq("pet_id", petId)
          .order("vaccination_date", { ascending: false }),
        supabase
          .from("medical_records")
          .select("id, diagnosis, treatment, record_date, record_type")
          .eq("pet_id", petId)
          .order("record_date", { ascending: false })
          .limit(8),
      ]);

      // Surface weight table errors explicitly
      if (wRes.error) {
        console.error("pet_weights error:", wRes.error);
        setWeightError(`Weight data: ${wRes.error.message}`);
        setWeightEntries([]);
      } else {
        setWeightEntries(wRes.data || []);
      }

      if (vRes.error) console.error("vaccinations error:", vRes.error);
      else setVaccinations(vRes.data || []);

      if (rRes.error) console.error("medical_records error:", rRes.error);
      else setMedicalRecords(rRes.data || []);

    } catch (err) {
      console.error("loadPetData error:", err);
      setWeightError(err.message || "Failed to load pet data.");
    } finally {
      setWeightLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue) throw ue;
      if (!user) throw new Error("Not logged in.");

      userIdRef.current = user.id;

      const { data: petsData, error: pe } = await supabase
        .from("pets")
        .select("id, name, species, breed, weight")
        .eq("owner_id", user.id)
        .order("name");
      if (pe) throw pe;

      setPets(petsData || []);

      if (petsData && petsData.length > 0) {
        setSelectedPet(petsData[0]);
        await loadPetData(petsData[0].id);
      }
    } catch (err) {
      console.error("loadInitialData error:", err);
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [loadPetData]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ─── Pet change ──────────────────────────────────
  async function handlePetChange(petId) {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    setSelectedPet(pet);
    setDateRange("all");
    await loadPetData(petId);
  }

  // ─── Date range filter ───────────────────────────
  function filterByRange(entries) {
    if (dateRange === "all") return entries;
    const cutoff = new Date();
    if (dateRange === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (dateRange === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (dateRange === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    return entries.filter(
      (e) => new Date(`${e.recorded_at}T00:00:00`) >= cutoff
    );
  }

  // ─── Add weight ──────────────────────────────────
  async function handleAddWeight(e) {
    e.preventDefault();
    if (!selectedPet) return;
    const kg = parseFloat(weightForm.weight_kg);
    if (Number.isNaN(kg) || kg <= 0) return;

    setSaving(true);
    try {
      const { error: ie } = await supabase.from("pet_weights").insert({
        pet_id:      selectedPet.id,
        weight_kg:   kg,
        recorded_at: weightForm.recorded_at,
        notes:       weightForm.notes.trim() || null,
      });
      if (ie) throw ie;

      setShowAddWeight(false);
      setWeightForm({
        weight_kg:   "",
        recorded_at: new Date().toISOString().split("T")[0],
        notes:       "",
      });
      await loadPetData(selectedPet.id);
    } catch (err) {
      console.error("Add weight error:", err);
      setWeightError(err.message || "Failed to save weight.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Helpers ────────────────────────────────────
  function fmt(d) {
    if (!d) return "—";
    return new Date(`${d}T00:00:00`).toLocaleDateString([], {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  function vaccProgress() {
    const total   = vaccinations.length;
    const done    = vaccinations.filter((v) => v.vaccination_date).length;
    const overdue = vaccinations.filter((v) =>
      v.next_due_date && new Date(`${v.next_due_date}T00:00:00`) < new Date()
    ).length;
    return { total, done, overdue };
  }

  const filtered = filterByRange(weightEntries);
  const latest   = filtered[filtered.length - 1];
  const previous = filtered[filtered.length - 2];
  const weightDiff = latest && previous
    ? (parseFloat(latest.weight_kg) - parseFloat(previous.weight_kg)).toFixed(2)
    : null;
  const progress = vaccProgress();

  // ─── Loading state ───────────────────────────────
  if (loading) {
    return (
      <OwnerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Loading analytics...</p>
        </div>
      </OwnerDashboardLayout>
    );
  }

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Health Analytics</h1>
            <p className="mt-2 text-slate-500">Weight trends, vaccinations and medical summaries.</p>
          </div>
          {pets.length > 1 && (
            <div className="relative">
              <select value={selectedPet?.id || ""}
                onChange={(e) => handlePetChange(e.target.value)}
                className="appearance-none rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {pets.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <TrendingUp className="mx-auto mb-4 text-slate-300" size={40} />
            <p className="text-slate-500">Add a pet to start tracking health analytics.</p>
          </div>
        ) : (
          <>
            {/* ─── Weight stats ─────────────────────── */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Current Weight",
                  value: latest ? `${latest.weight_kg} kg` : "—",
                  sub:   latest ? fmt(latest.recorded_at) : "No entries yet",
                  color: "text-slate-900",
                },
                {
                  label: "Previous Weight",
                  value: previous ? `${previous.weight_kg} kg` : "—",
                  sub:   previous ? fmt(previous.recorded_at) : "",
                  color: "text-slate-900",
                },
                {
                  label: "Change",
                  value: weightDiff === null ? "—"
                    : parseFloat(weightDiff) > 0 ? `+${weightDiff} kg`
                    : `${weightDiff} kg`,
                  sub:   "Since last entry",
                  color: weightDiff === null ? "text-slate-900"
                    : parseFloat(weightDiff) > 0 ? "text-green-600"
                    : parseFloat(weightDiff) < 0 ? "text-red-600"
                    : "text-slate-900",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ─── Weight chart ─────────────────────── */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Scale size={20} className="text-blue-500" />
                  Weight Progression — {selectedPet?.name}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 text-xs">
                    {[{ label: "All", value: "all" }, { label: "3M", value: "3m" },
                      { label: "6M", value: "6m" }, { label: "1Y", value: "1y" }].map((r) => (
                      <button key={r.value} type="button" onClick={() => setDateRange(r.value)}
                        className={`px-3 py-1 rounded-lg font-semibold transition ${
                          dateRange === r.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setShowAddWeight(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                    <Plus size={14} /> Add Weight
                  </button>
                </div>
              </div>

              {weightError && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{weightError} — ensure the <code>pet_weights</code> table exists in Supabase (run migration_enhancements.sql).</span>
                </div>
              )}

              {weightLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  Loading weight data...
                </div>
              ) : (
                <WeightChart entries={filtered} />
              )}
            </div>

            {/* ─── Add weight inline form ─────────────── */}
            {showAddWeight && (
              <div className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Log Weight — {selectedPet?.name}</h3>
                  <button type="button" onClick={() => setShowAddWeight(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddWeight} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Weight (kg)</label>
                    <input type="number" step="0.01" min="0.1" max="999" required
                      value={weightForm.weight_kg}
                      onChange={(e) => setWeightForm((f) => ({ ...f, weight_kg: e.target.value }))}
                      placeholder="e.g. 12.5"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                    <input type="date" required value={weightForm.recorded_at}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setWeightForm((f) => ({ ...f, recorded_at: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
                    <input type="text" value={weightForm.notes}
                      onChange={(e) => setWeightForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="e.g. After checkup"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={saving}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ─── Vaccination analytics ──────────────── */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Syringe size={20} className="text-green-500" />
                Vaccination Analytics — {selectedPet?.name}
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Total",        val: progress.total,   color: "text-slate-900" },
                  { label: "Administered", val: progress.done,    color: "text-green-600" },
                  { label: "Overdue",      val: progress.overdue, color: "text-red-600"   },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {progress.total > 0 && (
                <div className="w-full rounded-full bg-slate-100 h-2.5 overflow-hidden mb-4">
                  <div className="h-2.5 rounded-full bg-green-500 transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              )}
              {vaccinations.length > 0 ? (
                <div className="space-y-2">
                  {vaccinations.slice(0, 6).map((v) => {
                    const overdue = v.next_due_date &&
                      new Date(`${v.next_due_date}T00:00:00`) < new Date();
                    return (
                      <div key={v.id}
                        className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 font-medium">{v.vaccine_name}</span>
                        <div className="flex items-center gap-2 text-xs">
                          {v.vaccination_date && (
                            <span className="text-slate-400">{fmt(v.vaccination_date)}</span>
                          )}
                          {v.next_due_date && (
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${
                              overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              Due: {fmt(v.next_due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No vaccination records.</p>
              )}
            </div>

            {/* ─── Medical record summary ─────────────── */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <FileText size={20} className="text-purple-500" />
                Recent Medical Records — {selectedPet?.name}
              </h2>
              {medicalRecords.length === 0 ? (
                <p className="text-sm text-slate-400">No medical records.</p>
              ) : (
                <div className="space-y-2">
                  {medicalRecords.map((r) => (
                    <div key={r.id}
                      className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <FileText size={16} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {r.diagnosis || "Visit"}
                        </p>
                        {r.treatment && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{r.treatment}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{fmt(r.record_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </OwnerDashboardLayout>
  );
}

export default Analytics;
