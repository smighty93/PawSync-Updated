import PetPortrait from "../../components/ui/PetPortrait";
import { useEffect, useState } from "react";
import { PawPrint, Plus, X, Syringe, ShieldCheck, AlertCircle } from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

// ─── Section heading ────────────────────────────────
function SectionHeading({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 mt-6 first:mt-0">
      {children}
    </p>
  );
}

// ─── Field wrapper ───────────────────────────────────
function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const VACC_LABELS = {
  fully_vaccinated:     "Fully Vaccinated",
  partially_vaccinated: "Partially Vaccinated",
  not_vaccinated:       "Not Vaccinated",
  unknown:              "Unknown",
};

const VACC_COLORS = {
  fully_vaccinated:     "bg-green-100 text-green-700",
  partially_vaccinated: "bg-amber-100 text-amber-700",
  not_vaccinated:       "bg-red-100 text-red-700",
  unknown:              "bg-slate-100 text-slate-600",
};

function Pets() {
  const [pets, setPets]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const emptyForm = {
    // Basic
    name: "", species: "", breed: "", gender: "", date_of_birth: "", weight: "",
    // Health
    vaccination_status: "unknown", is_neutered: false,
    allergies: "", medical_conditions: "",
    // Additional
    microchip_id: "", special_notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  const loadPets = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue) throw ue;
      if (!user) throw new Error("Not logged in.");

      const { data, error: pe } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (pe) throw pe;
      setPets(data || []);
    } catch (err) {
      setError(err.message || "Failed to load pets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPets(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue) throw ue;
      if (!user) throw new Error("Not logged in.");

      if (!form.name.trim())    throw new Error("Pet name is required.");
      if (!form.species.trim()) throw new Error("Species is required.");

      const petData = {
        owner_id:            user.id,
        name:                form.name.trim(),
        species:             form.species.trim(),
        breed:               form.breed.trim()             || null,
        gender:              form.gender                   || null,
        date_of_birth:       form.date_of_birth            || null,
        weight:              form.weight ? Number(form.weight) : null,
        vaccination_status:  form.vaccination_status       || "unknown",
        is_neutered:         form.is_neutered,
        allergies:           form.allergies.trim()         || null,
        medical_conditions:  form.medical_conditions.trim()|| null,
        microchip_id:        form.microchip_id.trim()      || null,
        special_notes:       form.special_notes.trim()     || null,
      };

      const { data, error: ie } = await supabase
        .from("pets").insert([petData]).select().single();
      if (ie) throw ie;

      setPets((p) => [data, ...p]);
      setForm(emptyForm);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || "Failed to add pet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Pets</h1>
            <p className="mt-2 text-slate-500">Manage your pets and their health information.</p>
          </div>
          <button
            type="button"
            onClick={() => { setError(""); setShowAddForm(true); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-md hover:bg-blue-700"
          >
            <Plus size={20} /> Add Pet
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Pet list */}
        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-500">Loading your pets...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <PawPrint size={48} className="mx-auto text-blue-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No pets yet</h2>
            <p className="mt-2 text-slate-500">Add your first pet to get started.</p>
            <button type="button" onClick={() => setShowAddForm(true)}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              + Add Your First Pet
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {pets.map((pet) => (
              <div key={pet.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <PetPortrait pet={pet} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{pet.name}</h2>
                    <p className="mt-0.5 text-slate-500 text-sm">
                      {pet.species}{pet.breed ? ` • ${pet.breed}` : ""}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <PawPrint size={22} />
                  </div>
                </div>

                {/* Basic info */}
                <div className="space-y-2 text-sm">
                  {[
                    ["Gender",        pet.gender],
                    ["Date of Birth", pet.date_of_birth],
                    ["Weight",        pet.weight ? `${pet.weight} kg` : null],
                    ["Microchip ID",  pet.microchip_id],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-800">{val}</span>
                    </div>
                  ) : null)}
                </div>

                {/* Health badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {pet.vaccination_status && (
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${VACC_COLORS[pet.vaccination_status] || VACC_COLORS.unknown}`}>
                      <Syringe size={12} />
                      {VACC_LABELS[pet.vaccination_status] || "Unknown"}
                    </span>
                  )}
                  {pet.is_neutered && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <ShieldCheck size={12} /> Neutered/Spayed
                    </span>
                  )}
                  {pet.allergies && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      <AlertCircle size={12} /> Has Allergies
                    </span>
                  )}
                  {pet.medical_conditions && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      <AlertCircle size={12} /> Medical Conditions
                    </span>
                  )}
                </div>

                {/* Conditions detail */}
                {pet.allergies && (
                  <div className="mt-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
                    <span className="font-semibold">Allergies: </span>{pet.allergies}
                  </div>
                )}
                {pet.medical_conditions && (
                  <div className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                    <span className="font-semibold">Conditions: </span>{pet.medical_conditions}
                  </div>
                )}
                {pet.special_notes && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold">Notes: </span>{pet.special_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── ADD PET MODAL ─── */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="add-pet-title"
              className="my-6 w-full max-w-xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 p-6">
                <div>
                  <h2 id="add-pet-title" className="text-2xl font-bold text-slate-900">Add Pet</h2>
                  <p className="mt-1 text-sm text-slate-500">Fill in your pet's information.</p>
                </div>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleAddPet} className="p-6 space-y-4">

                {/* ── BASIC INFORMATION ── */}
                <SectionHeading>Basic Information</SectionHeading>

                <Field label="Pet Name *" htmlFor="pet-name">
                  <input id="pet-name" type="text" name="name" value={form.name}
                    onChange={handleChange} placeholder="e.g. Bruno" required className={INPUT} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Species *" htmlFor="pet-species">
                    <select id="pet-species" name="species" value={form.species}
                      onChange={handleChange} required className={INPUT}>
                      <option value="">Select</option>
                      <option>Dog</option><option>Cat</option>
                      <option>Bird</option><option>Rabbit</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Gender" htmlFor="pet-gender">
                    <select id="pet-gender" name="gender" value={form.gender}
                      onChange={handleChange} className={INPUT}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option>
                    </select>
                  </Field>
                </div>

                <Field label="Breed" htmlFor="pet-breed">
                  <input id="pet-breed" type="text" name="breed" value={form.breed}
                    onChange={handleChange} placeholder="e.g. Labrador Retriever" className={INPUT} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth" htmlFor="pet-dob">
                    <input id="pet-dob" type="date" name="date_of_birth"
                      value={form.date_of_birth} onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]} className={INPUT} />
                  </Field>
                  <Field label="Weight (kg)" htmlFor="pet-weight">
                    <input id="pet-weight" type="number" name="weight" value={form.weight}
                      onChange={handleChange} placeholder="e.g. 25" min="0" step="0.1" className={INPUT} />
                  </Field>
                </div>

                {/* ── HEALTH INFORMATION ── */}
                <SectionHeading>Health Information</SectionHeading>

                <Field label="Vaccination Status" htmlFor="pet-vacc">
                  <select id="pet-vacc" name="vaccination_status"
                    value={form.vaccination_status} onChange={handleChange} className={INPUT}>
                    <option value="unknown">Unknown</option>
                    <option value="fully_vaccinated">Fully Vaccinated</option>
                    <option value="partially_vaccinated">Partially Vaccinated</option>
                    <option value="not_vaccinated">Not Vaccinated</option>
                  </select>
                </Field>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_neutered" checked={form.is_neutered}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">Neutered / Spayed</span>
                </label>

                <Field label="Known Allergies" htmlFor="pet-allergies">
                  <textarea id="pet-allergies" name="allergies" value={form.allergies}
                    onChange={handleChange} rows={2}
                    placeholder="e.g. Pollen, certain foods..." className={`${INPUT} resize-none`} />
                </Field>

                <Field label="Medical Conditions" htmlFor="pet-conditions">
                  <textarea id="pet-conditions" name="medical_conditions"
                    value={form.medical_conditions} onChange={handleChange} rows={2}
                    placeholder="e.g. Hip dysplasia, diabetes..." className={`${INPUT} resize-none`} />
                </Field>

                {/* ── ADDITIONAL INFORMATION ── */}
                <SectionHeading>Additional Information</SectionHeading>

                <Field label="Microchip ID" htmlFor="pet-microchip">
                  <input id="pet-microchip" type="text" name="microchip_id"
                    value={form.microchip_id} onChange={handleChange}
                    placeholder="e.g. 985112345678901" className={INPUT} />
                </Field>

                <Field label="Special Notes" htmlFor="pet-notes">
                  <textarea id="pet-notes" name="special_notes" value={form.special_notes}
                    onChange={handleChange} rows={3}
                    placeholder="Any other important information..."
                    className={`${INPUT} resize-none`} />
                </Field>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Add Pet"}
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

export default Pets;
