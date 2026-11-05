import { useEffect, useState, useCallback } from "react";
import {
  Syringe, FileText, Pill, CalendarDays, Stethoscope,
  ChevronDown, Clock, AlertCircle,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

// =====================================================
// TIMELINE ITEM
// =====================================================

const TYPE_CONFIG = {
  vaccination:  { icon: Syringe,     color: "bg-green-100 text-green-700",  dot: "bg-green-500",  label: "Vaccination"  },
  consultation: { icon: Stethoscope, color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500",   label: "Consultation" },
  prescription: { icon: Pill,        color: "bg-purple-100 text-purple-700",dot: "bg-purple-500", label: "Prescription" },
  follow_up:    { icon: CalendarDays,color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500",  label: "Follow-up"    },
  surgery:      { icon: FileText,    color: "bg-red-100 text-red-700",      dot: "bg-red-500",    label: "Surgery"      },
  other:        { icon: FileText,    color: "bg-slate-100 text-slate-600",  dot: "bg-slate-400",  label: "Record"       },
};

function TimelineItem({ item, isLast }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Connector column */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${cfg.color} flex-shrink-0`}>
          <Icon size={16} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                {cfg.label}
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {item.title}
              </h3>
            </div>
            {item.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
            )}
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
            <Clock size={11} /> {item.dateFormatted}
          </span>
        </div>

        {/* Detail rows */}
        {item.details && item.details.length > 0 && (
          <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
            {item.details.map(([label, val]) => val ? (
              <div key={label} className="flex gap-2 text-xs">
                <span className="text-slate-400 font-semibold min-w-[90px]">{label}</span>
                <span className="text-slate-700">{val}</span>
              </div>
            ) : null)}
          </div>
        )}

        {item.followUp && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <CalendarDays size={12} /> Follow-up: {item.followUp}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// TIMELINE PAGE
// =====================================================

function Timeline() {
  const [pets,         setPets]         = useState([]);
  const [selectedPet,  setSelectedPet]  = useState(null);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dataLoading,  setDataLoading]  = useState(false);
  const [error,        setError]        = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [dateFilter,   setDateFilter]   = useState("all");

  function fmt(d) {
    if (!d) return null;
    return new Date(`${d}T00:00:00`).toLocaleDateString([], {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  // ─── Build timeline from DB data ────────────────
  function buildTimeline(vaccinations, records) {
    const timeline = [];

    // From vaccinations table
    for (const v of vaccinations) {
      if (!v.vaccination_date) continue;
      timeline.push({
        id:            `vacc-${v.id}`,
        type:          "vaccination",
        date:          v.vaccination_date,
        dateFormatted: fmt(v.vaccination_date),
        title:         v.vaccine_name || "Vaccination",
        subtitle:      v.next_due_date ? `Next due: ${fmt(v.next_due_date)}` : null,
        details: [
          ["Notes", v.notes],
        ],
        followUp: null,
      });
    }

    // From medical_records table
    for (const r of records) {
      if (!r.record_date) continue;
      const type = r.record_type || "consultation";
      timeline.push({
        id:            `rec-${r.id}`,
        type,
        date:          r.record_date,
        dateFormatted: fmt(r.record_date),
        title:         r.diagnosis || r.record_type || "Medical Visit",
        subtitle:      r.veterinarian_name ? `Dr. / Vet: ${r.veterinarian_name}` : null,
        details: [
          ["Symptoms",     r.symptoms],
          ["Treatment",    r.treatment],
          ["Prescription", r.prescription],
          ["Instructions", r.medication_instructions],
          ["Notes",        r.notes],
        ],
        followUp: r.follow_up_date ? fmt(r.follow_up_date) : null,
      });
    }

    // Sort newest first
    timeline.sort((a, b) => b.date.localeCompare(a.date));
    return timeline;
  }

  // ─── Load pet data ───────────────────────────────
  const loadPetData = useCallback(async (petId) => {
    if (!petId) return;
    setDataLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([
        supabase
          .from("vaccinations")
          .select("id, vaccine_name, vaccination_date, next_due_date, notes")
          .eq("pet_id", petId)
          .not("vaccination_date", "is", null)
          .order("vaccination_date", { ascending: false }),
        supabase
          .from("medical_records")
          .select(`
            id, record_date, record_type, veterinarian_name,
            diagnosis, treatment, symptoms, prescription,
            medication_instructions, follow_up_date, notes
          `)
          .eq("pet_id", petId)
          .order("record_date", { ascending: false }),
      ]);

      if (vRes.error) console.error("vaccinations:", vRes.error);
      if (rRes.error) console.error("medical_records:", rRes.error);

      const timeline = buildTimeline(vRes.data || [], rRes.data || []);
      setItems(timeline);
    } catch (err) {
      console.error("Timeline load error:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      setError("");
      try {
        const { data: { user }, error: ue } = await supabase.auth.getUser();
        if (ue) throw ue;
        if (!user) throw new Error("Not logged in.");

        const { data: petsData, error: pe } = await supabase
          .from("pets").select("id, name, species, breed")
          .eq("owner_id", user.id).order("name");
        if (pe) throw pe;

        if (!mounted) return;
        setPets(petsData || []);
        if (petsData && petsData.length > 0) {
          setSelectedPet(petsData[0]);
          await loadPetData(petsData[0].id);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load timeline.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [loadPetData]);

  async function handlePetChange(petId) {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;
    setSelectedPet(pet);
    setTypeFilter("all");
    setDateFilter("all");
    await loadPetData(petId);
  }

  // ─── Apply filters ───────────────────────────────
  function applyFilters(list) {
    let result = list;

    if (typeFilter !== "all") {
      result = result.filter((i) => i.type === typeFilter);
    }

    if (dateFilter !== "all") {
      const cutoff = new Date();
      if (dateFilter === "3m")  cutoff.setMonth(cutoff.getMonth() - 3);
      if (dateFilter === "6m")  cutoff.setMonth(cutoff.getMonth() - 6);
      if (dateFilter === "1y")  cutoff.setFullYear(cutoff.getFullYear() - 1);
      result = result.filter(
        (i) => new Date(`${i.date}T00:00:00`) >= cutoff
      );
    }

    return result;
  }

  const filtered = applyFilters(items);

  if (loading) {
    return (
      <OwnerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Loading timeline...</p>
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
            <h1 className="text-3xl font-bold text-slate-900">Medical Timeline</h1>
            <p className="mt-2 text-slate-500">Full health history for each pet.</p>
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
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={16} />{error}
          </div>
        )}

        {pets.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Clock className="mx-auto mb-4 text-slate-300" size={40} />
            <p className="text-slate-500">Add a pet to see the medical timeline.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mt-6 flex flex-wrap gap-3 items-center">
              {/* Type filter */}
              <div className="flex gap-1 text-xs">
                {[
                  { label: "All Types",    value: "all"          },
                  { label: "Vaccination",  value: "vaccination"  },
                  { label: "Consultation", value: "consultation" },
                  { label: "Prescription", value: "prescription" },
                  { label: "Follow-up",    value: "follow_up"    },
                ].map((f) => (
                  <button key={f.value} type="button" onClick={() => setTypeFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      typeFilter === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Date filter */}
              <div className="flex gap-1 text-xs ml-auto">
                {[
                  { label: "All Time", value: "all" },
                  { label: "3M",       value: "3m"  },
                  { label: "6M",       value: "6m"  },
                  { label: "1Y",       value: "1y"  },
                ].map((f) => (
                  <button key={f.value} type="button" onClick={() => setDateFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      dateFilter === f.value
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary strip */}
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{selectedPet?.name}</span>
              <span>·</span>
              <span>{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
              {(typeFilter !== "all" || dateFilter !== "all") && (
                <button type="button"
                  onClick={() => { setTypeFilter("all"); setDateFilter("all"); }}
                  className="text-blue-600 hover:underline font-semibold">
                  Clear filters
                </button>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              {dataLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-slate-400 text-sm">Loading timeline...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto mb-3 text-slate-200" size={40} />
                  <p className="text-slate-400 text-sm">
                    {items.length === 0
                      ? "No health records found for this pet."
                      : "No events match the selected filters."}
                  </p>
                </div>
              ) : (
                <div>
                  {filtered.map((item, idx) => (
                    <TimelineItem
                      key={item.id}
                      item={item}
                      isLast={idx === filtered.length - 1}
                    />
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

export default Timeline;
