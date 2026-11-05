import { useEffect, useState } from "react";
import { FileText, X, Stethoscope, Pill, CalendarDays } from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

const INPUT = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function SectionHeading({ icon: Icon, color, children }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 mt-6 first:mt-0 ${color}`}>
      {Icon && <Icon size={14} />}
      {children}
    </div>
  );
}

const RECORD_TYPE_LABELS = {
  consultation: "Consultation",
  vaccination:  "Vaccination",
  prescription: "Prescription",
  follow_up:    "Follow-up",
  surgery:      "Surgery",
  other:        "Other",
};

const RECORD_TYPE_COLORS = {
  consultation: "bg-blue-100 text-blue-700",
  vaccination:  "bg-green-100 text-green-700",
  prescription: "bg-purple-100 text-purple-700",
  follow_up:    "bg-amber-100 text-amber-700",
  surgery:      "bg-red-100 text-red-700",
  other:        "bg-slate-100 text-slate-600",
};

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [pets,    setPets]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState("");

  const emptyForm = {
    // Consultation
    pet_id: "", record_date: new Date().toISOString().split("T")[0],
    record_type: "consultation", veterinarian_name: "",
    // Medical
    symptoms: "", diagnosis: "", treatment: "",
    prescription: "", medication_instructions: "",
    // Follow-up
    follow_up_date: "", notes: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
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
      setPets(petsData || []);

      const petIds = (petsData || []).map((p) => p.id);
      if (petIds.length === 0) { setRecords([]); return; }

      const { data: recs, error: re } = await supabase
        .from("medical_records")
        .select(`
          id, pet_id, veterinarian_id, veterinarian_name,
          record_type, diagnosis, treatment, symptoms,
          prescription, medication_instructions,
          follow_up_date, notes, record_date, created_at,
          pets ( id, name, species, breed )
        `)
        .in("pet_id", petIds)
        .order("record_date", { ascending: false });
      if (re) throw re;
      setRecords(recs || []);
    } catch (err) {
      setError(err.message || "Failed to load medical records.");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  function openForm() {
    setError("");
    setFormData({ ...emptyForm, pet_id: pets.length > 0 ? pets[0].id : "" });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!formData.pet_id)    { setError("Select a pet."); return; }
    if (!formData.record_date) { setError("Select a date."); return; }

    setSaving(true);
    try {
      const { error: ie } = await supabase.from("medical_records").insert({
        pet_id:                  formData.pet_id,
        record_date:             formData.record_date,
        record_type:             formData.record_type || "consultation",
        veterinarian_name:       formData.veterinarian_name.trim() || null,
        symptoms:                formData.symptoms.trim()    || null,
        diagnosis:               formData.diagnosis.trim()   || null,
        treatment:               formData.treatment.trim()   || null,
        prescription:            formData.prescription.trim()|| null,
        medication_instructions: formData.medication_instructions.trim() || null,
        follow_up_date:          formData.follow_up_date     || null,
        notes:                   formData.notes.trim()       || null,
      });
      if (ie) throw ie;
      setShowForm(false);
      setFormData(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function fmt(d) {
    if (!d) return "—";
    return new Date(`${d}T00:00:00`).toLocaleDateString([], {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Medical Records</h1>
            <p className="mt-2 text-slate-500">View your pets' medical history.</p>
          </div>
          <button type="button" onClick={openForm}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
            + Add Medical Record
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-500">Loading medical records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText size={32} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">No medical records yet</h2>
            <p className="mt-2 text-slate-500">Add a medical record for one of your pets.</p>
            <button type="button" onClick={openForm}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Add Medical Record
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {records.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{r.pets?.name || "Pet"}</h2>
                      <p className="text-xs text-slate-500">
                        {r.pets?.species}{r.pets?.breed ? ` • ${r.pets.breed}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {fmt(r.record_date)}
                    </span>
                    {r.record_type && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RECORD_TYPE_COLORS[r.record_type] || RECORD_TYPE_COLORS.other}`}>
                        {RECORD_TYPE_LABELS[r.record_type] || r.record_type}
                      </span>
                    )}
                  </div>
                </div>

                {r.veterinarian_name && (
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                    <Stethoscope size={12} /> {r.veterinarian_name}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  {[
                    ["Symptoms",      r.symptoms],
                    ["Diagnosis",     r.diagnosis],
                    ["Treatment",     r.treatment],
                    ["Prescription",  r.prescription],
                    ["Instructions",  r.medication_instructions],
                    ["Notes",         r.notes],
                  ].map(([label, val]) => val ? (
                    <div key={label}>
                      <p className="text-xs font-semibold text-slate-400">{label}</p>
                      <p className="mt-0.5 text-slate-700">{val}</p>
                    </div>
                  ) : null)}

                  {r.follow_up_date && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <CalendarDays size={14} className="text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">
                        Follow-up: {fmt(r.follow_up_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── ADD RECORD MODAL ─── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="add-record-title"
              className="my-6 w-full max-w-xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div>
                  <h2 id="add-record-title" className="text-2xl font-bold text-slate-900">Add Medical Record</h2>
                  <p className="mt-1 text-sm text-slate-500">Document a consultation or health visit.</p>
                </div>
                <button type="button" onClick={() => !saving && setShowForm(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                {/* ── CONSULTATION DETAILS ── */}
                <SectionHeading icon={Stethoscope} color="text-blue-500">Consultation Details</SectionHeading>

                {pets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Add a pet before adding a medical record.
                  </div>
                ) : (
                  <div>
                    <label htmlFor="mr-pet" className="mb-1.5 block text-sm font-semibold text-slate-700">Pet</label>
                    <select id="mr-pet" name="pet_id" value={formData.pet_id}
                      onChange={handleChange} required className={INPUT}>
                      {pets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.breed ? ` — ${p.breed}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="mr-date" className="mb-1.5 block text-sm font-semibold text-slate-700">Date</label>
                    <input id="mr-date" type="date" name="record_date"
                      value={formData.record_date} onChange={handleChange}
                      required className={INPUT} />
                  </div>
                  <div>
                    <label htmlFor="mr-type" className="mb-1.5 block text-sm font-semibold text-slate-700">Record Type</label>
                    <select id="mr-type" name="record_type" value={formData.record_type}
                      onChange={handleChange} className={INPUT}>
                      <option value="consultation">Consultation</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="prescription">Prescription</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="surgery">Surgery</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="mr-vet" className="mb-1.5 block text-sm font-semibold text-slate-700">Veterinarian Name</label>
                  <input id="mr-vet" type="text" name="veterinarian_name"
                    value={formData.veterinarian_name} onChange={handleChange}
                    placeholder="e.g. Dr. Sarah Mitchell" className={INPUT} />
                </div>

                {/* ── MEDICAL DETAILS ── */}
                <SectionHeading icon={Pill} color="text-purple-500">Medical Details</SectionHeading>

                <div>
                  <label htmlFor="mr-symptoms" className="mb-1.5 block text-sm font-semibold text-slate-700">Symptoms</label>
                  <textarea id="mr-symptoms" name="symptoms" value={formData.symptoms}
                    onChange={handleChange} rows={2}
                    placeholder="e.g. Lethargy, loss of appetite..."
                    className={`${INPUT} resize-none`} />
                </div>

                <div>
                  <label htmlFor="mr-diag" className="mb-1.5 block text-sm font-semibold text-slate-700">Diagnosis</label>
                  <input id="mr-diag" type="text" name="diagnosis"
                    value={formData.diagnosis} onChange={handleChange}
                    placeholder="e.g. Ear infection" className={INPUT} />
                </div>

                <div>
                  <label htmlFor="mr-treat" className="mb-1.5 block text-sm font-semibold text-slate-700">Treatment</label>
                  <input id="mr-treat" type="text" name="treatment"
                    value={formData.treatment} onChange={handleChange}
                    placeholder="e.g. Antibiotic course" className={INPUT} />
                </div>

                <div>
                  <label htmlFor="mr-rx" className="mb-1.5 block text-sm font-semibold text-slate-700">Prescription</label>
                  <input id="mr-rx" type="text" name="prescription"
                    value={formData.prescription} onChange={handleChange}
                    placeholder="e.g. Amoxicillin 250mg" className={INPUT} />
                </div>

                <div>
                  <label htmlFor="mr-rxinstr" className="mb-1.5 block text-sm font-semibold text-slate-700">Medication Instructions</label>
                  <textarea id="mr-rxinstr" name="medication_instructions"
                    value={formData.medication_instructions} onChange={handleChange} rows={2}
                    placeholder="e.g. Give one tablet twice daily with food for 7 days"
                    className={`${INPUT} resize-none`} />
                </div>

                {/* ── FOLLOW-UP DETAILS ── */}
                <SectionHeading icon={CalendarDays} color="text-amber-500">Follow-up Details</SectionHeading>

                <div>
                  <label htmlFor="mr-followup" className="mb-1.5 block text-sm font-semibold text-slate-700">Follow-up Date</label>
                  <input id="mr-followup" type="date" name="follow_up_date"
                    value={formData.follow_up_date} onChange={handleChange} className={INPUT} />
                </div>

                <div>
                  <label htmlFor="mr-notes" className="mb-1.5 block text-sm font-semibold text-slate-700">Notes</label>
                  <textarea id="mr-notes" name="notes" value={formData.notes}
                    onChange={handleChange} rows={3}
                    placeholder="Additional observations or instructions..."
                    className={`${INPUT} resize-none`} />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving || pets.length === 0}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Record"}
                  </button>
                  <button type="button" onClick={() => !saving && setShowForm(false)}
                    className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OwnerDashboardLayout>
  );
}

export default MedicalRecords;
