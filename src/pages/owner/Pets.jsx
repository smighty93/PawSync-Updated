import PetPortrait from "../../components/ui/PetPortrait";
import { useEffect, useState, useRef } from "react";
import {
  PawPrint, Plus, X, Syringe, ShieldCheck,
  AlertCircle, Camera, Loader2, Pencil,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";

const INPUT = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#062F4A] focus:ring-2 focus:ring-[#062F4A]/10 bg-white";

function SectionHeading({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 mt-6 first:mt-0 pb-2 border-b border-slate-100">
      {children}
    </p>
  );
}

const VACC_LABELS = {
  fully_vaccinated:     "Fully Vaccinated",
  partially_vaccinated: "Partially Vaccinated",
  not_vaccinated:       "Not Vaccinated",
  unknown:              "Unknown",
};
const VACC_COLORS = {
  fully_vaccinated:     "bg-emerald-100 text-emerald-700",
  partially_vaccinated: "bg-amber-100 text-amber-700",
  not_vaccinated:       "bg-red-100 text-red-700",
  unknown:              "bg-slate-100 text-slate-600",
};

// ─── Photo upload component ────────────────────────────
function PhotoUploader({ preview, onChange, uploading }) {
  const ref = useRef(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-[#062F4A] transition"
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Pet preview" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Camera size={28} strokeWidth={1.5} />
            <span className="text-xs">Add photo</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#062F4A]" />
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onChange}
      />
      <p className="text-xs text-slate-400">JPG, PNG or WebP · max 5 MB</p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────
function Pets() {
  const [pets,        setPets]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile,    setPhotoFile]    = useState(null);

  const emptyForm = {
    name: "", species: "", breed: "", gender: "",
    date_of_birth: "", weight: "",
    vaccination_status: "unknown", is_neutered: false,
    allergies: "", medical_conditions: "",
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
        .from("pets").select("*").eq("owner_id", user.id)
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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  async function uploadPhoto(userId) {
    if (!photoFile) return null;
    setUploading(true);
    try {
      const ext  = photoFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("pet-photos")
        .upload(path, photoFile, { upsert: true });
      if (upErr) throw upErr;
      return path;
    } finally {
      setUploading(false);
    }
  }

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

      const photoPath = await uploadPhoto(user.id);

      const petData = {
        owner_id:           user.id,
        name:               form.name.trim(),
        species:            form.species.trim(),
        breed:              form.breed.trim()              || null,
        gender:             form.gender                    || null,
        date_of_birth:      form.date_of_birth             || null,
        weight:             form.weight ? Number(form.weight) : null,
        vaccination_status: form.vaccination_status        || "unknown",
        is_neutered:        form.is_neutered,
        allergies:          form.allergies.trim()          || null,
        medical_conditions: form.medical_conditions.trim() || null,
        microchip_id:       form.microchip_id.trim()       || null,
        special_notes:      form.special_notes.trim()      || null,
        photo_url:          photoPath,
      };

      const { data, error: ie } = await supabase
        .from("pets").insert([petData]).select().single();
      if (ie) throw ie;

      setPets((p) => [data, ...p]);
      setForm(emptyForm);
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || "Failed to add pet.");
    } finally {
      setSaving(false);
    }
  };

  const openForm = () => {
    setError("");
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowAddForm(true);
  };

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0B3048]">My Pets</h1>
            <p className="mt-2 text-slate-500 text-sm">Manage your pets and their health information.</p>
          </div>
          <button type="button" onClick={openForm}
            className="flex items-center gap-2 rounded-xl bg-[#062F4A] px-5 py-3 font-semibold text-white shadow-md hover:bg-[#041F32] transition">
            <Plus size={18} /> Add Pet
          </button>
        </div>

        {error && !showAddForm && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pet list */}
        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-400">Loading your pets…</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <PawPrint size={44} className="mx-auto text-[#062F4A]/30 mb-3" />
            <h2 className="text-xl font-bold text-[#0B3048]">No pets yet</h2>
            <p className="mt-2 text-slate-500 text-sm">Add your first pet to get started.</p>
            <button type="button" onClick={openForm}
              className="mt-6 rounded-xl bg-[#062F4A] px-5 py-3 font-semibold text-white hover:bg-[#041F32]">
              + Add Your First Pet
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {pets.map((pet) => (
              <div key={pet.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                <PetPortrait pet={pet} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#0B3048]">{pet.name}</h2>
                      <p className="mt-0.5 text-slate-500 text-sm">
                        {pet.species}{pet.breed ? ` • ${pet.breed}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/pets/${pet.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#062F4A] hover:bg-slate-50 transition"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {[
                      ["Gender",        pet.gender],
                      ["Date of Birth", pet.date_of_birth],
                      ["Weight",        pet.weight ? `${pet.weight} kg` : null],
                      ["Microchip ID",  pet.microchip_id],
                    ].map(([label, val]) => val ? (
                      <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-[#0B3048]">{val}</span>
                      </div>
                    ) : null)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {pet.vaccination_status && (
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${VACC_COLORS[pet.vaccination_status] || VACC_COLORS.unknown}`}>
                        <Syringe size={11} />
                        {VACC_LABELS[pet.vaccination_status] || "Unknown"}
                      </span>
                    )}
                    {pet.is_neutered && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        <ShieldCheck size={11} /> Neutered/Spayed
                      </span>
                    )}
                    {pet.allergies && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        <AlertCircle size={11} /> Has Allergies
                      </span>
                    )}
                  </div>

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
              </div>
            ))}
          </div>
        )}

        {/* ─── ADD PET MODAL ─── */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="add-pet-title"
              className="my-6 w-full max-w-xl rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-[#062F4A] rounded-t-2xl">
                <div>
                  <h2 id="add-pet-title" className="text-xl font-bold text-white">Add Pet</h2>
                  <p className="mt-0.5 text-xs text-white/60">Fill in your pet's information.</p>
                </div>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddPet} className="p-6 space-y-4">

                {/* Photo */}
                <div className="flex justify-center">
                  <PhotoUploader
                    preview={photoPreview}
                    onChange={handlePhotoChange}
                    uploading={uploading}
                  />
                </div>

                <SectionHeading>Basic Information</SectionHeading>

                <div>
                  <label htmlFor="pet-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Pet Name *</label>
                  <input id="pet-name" type="text" name="name" value={form.name}
                    onChange={handleChange} placeholder="e.g. Bruno" required className={INPUT} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pet-species" className="mb-1.5 block text-sm font-semibold text-slate-700">Species *</label>
                    <select id="pet-species" name="species" value={form.species}
                      onChange={handleChange} required className={INPUT}>
                      <option value="">Select</option>
                      <option>Dog</option><option>Cat</option>
                      <option>Bird</option><option>Rabbit</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pet-gender" className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</label>
                    <select id="pet-gender" name="gender" value={form.gender}
                      onChange={handleChange} className={INPUT}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="pet-breed" className="mb-1.5 block text-sm font-semibold text-slate-700">Breed</label>
                  <input id="pet-breed" type="text" name="breed" value={form.breed}
                    onChange={handleChange} placeholder="e.g. Labrador Retriever" className={INPUT} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pet-dob" className="mb-1.5 block text-sm font-semibold text-slate-700">Date of Birth</label>
                    <input id="pet-dob" type="date" name="date_of_birth"
                      value={form.date_of_birth} onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]} className={INPUT} />
                  </div>
                  <div>
                    <label htmlFor="pet-weight" className="mb-1.5 block text-sm font-semibold text-slate-700">Weight (kg)</label>
                    <input id="pet-weight" type="number" name="weight" value={form.weight}
                      onChange={handleChange} placeholder="e.g. 25" min="0" step="0.1" className={INPUT} />
                  </div>
                </div>

                <SectionHeading>Health Information</SectionHeading>

                <div>
                  <label htmlFor="pet-vacc" className="mb-1.5 block text-sm font-semibold text-slate-700">Vaccination Status</label>
                  <select id="pet-vacc" name="vaccination_status"
                    value={form.vaccination_status} onChange={handleChange} className={INPUT}>
                    <option value="unknown">Unknown</option>
                    <option value="fully_vaccinated">Fully Vaccinated</option>
                    <option value="partially_vaccinated">Partially Vaccinated</option>
                    <option value="not_vaccinated">Not Vaccinated</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_neutered" checked={form.is_neutered}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-300 accent-[#062F4A]" />
                  <span className="text-sm font-semibold text-slate-700">Neutered / Spayed</span>
                </label>

                <div>
                  <label htmlFor="pet-allergies" className="mb-1.5 block text-sm font-semibold text-slate-700">Known Allergies</label>
                  <textarea id="pet-allergies" name="allergies" value={form.allergies}
                    onChange={handleChange} rows={2}
                    placeholder="e.g. Pollen, certain foods..." className={`${INPUT} resize-none`} />
                </div>

                <div>
                  <label htmlFor="pet-conditions" className="mb-1.5 block text-sm font-semibold text-slate-700">Medical Conditions</label>
                  <textarea id="pet-conditions" name="medical_conditions"
                    value={form.medical_conditions} onChange={handleChange} rows={2}
                    placeholder="e.g. Hip dysplasia..." className={`${INPUT} resize-none`} />
                </div>

                <SectionHeading>Additional Information</SectionHeading>

                <div>
                  <label htmlFor="pet-microchip" className="mb-1.5 block text-sm font-semibold text-slate-700">Microchip ID</label>
                  <input id="pet-microchip" type="text" name="microchip_id"
                    value={form.microchip_id} onChange={handleChange}
                    placeholder="e.g. 985112345678901" className={INPUT} />
                </div>

                <div>
                  <label htmlFor="pet-notes" className="mb-1.5 block text-sm font-semibold text-slate-700">Special Notes</label>
                  <textarea id="pet-notes" name="special_notes" value={form.special_notes}
                    onChange={handleChange} rows={3}
                    placeholder="Any other important information..."
                    className={`${INPUT} resize-none`} />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || uploading}
                    className="rounded-xl bg-[#062F4A] px-5 py-3 font-semibold text-white hover:bg-[#041F32] disabled:opacity-50 flex items-center gap-2">
                    {(saving || uploading) && <Loader2 size={16} className="animate-spin" />}
                    {saving || uploading ? "Saving…" : "Add Pet"}
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
