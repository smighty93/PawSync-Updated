import PetPortrait from "../../components/ui/PetPortrait";
import { useEffect, useState } from "react";
import { PawPrint, Plus, X } from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

function Pets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    gender: "",
    date_of_birth: "",
    weight: "",
  });

  // Load pets belonging to the logged-in user
  const loadPets = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const { data, error: petsError } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (petsError) {
        throw petsError;
      }

      setPets(data || []);
    } catch (err) {
      console.error("Error loading pets:", err);
      setError(err.message || "Failed to load pets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddPet = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const petData = {
        owner_id: user.id,
        name: form.name.trim(),
        species: form.species.trim(),
        breed: form.breed.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        weight: form.weight ? Number(form.weight) : null,
      };

      if (!petData.name) {
        throw new Error("Pet name is required.");
      }

      if (!petData.species) {
        throw new Error("Species is required.");
      }

      const { data, error: insertError } = await supabase
        .from("pets")
        .insert([petData])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Add new pet immediately to the page
      setPets((current) => [data, ...current]);

      // Reset form
      setForm({
        name: "",
        species: "",
        breed: "",
        gender: "",
        date_of_birth: "",
        weight: "",
      });

      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding pet:", err);
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
            <h1 className="text-3xl font-bold text-slate-900">
              My Pets
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your pets and their information.
            </p>
          </div>

          {/* ADD PET BUTTON */}
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
          >
            <Plus size={20} />
            Add Pet
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* PET LIST */}
        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-500">Loading your pets...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <PawPrint
              size={48}
              className="mx-auto text-blue-600"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No pets yet
            </h2>

            <p className="mt-2 text-slate-500">
              Add your first pet to get started.
            </p>

            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              + Add Your First Pet
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="ps-pet-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <PetPortrait pet={pet} />
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {pet.name}
                    </h2>

                    <p className="mt-1 text-slate-500">
                      {pet.species}
                      {pet.breed ? ` • ${pet.breed}` : ""}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <PawPrint size={24} />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500">
                      Gender
                    </span>

                    <span className="font-medium text-slate-800">
                      {pet.gender || "Not specified"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500">
                      Date of Birth
                    </span>

                    <span className="font-medium text-slate-800">
                      {pet.date_of_birth || "Not specified"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Weight
                    </span>

                    <span className="font-medium text-slate-800">
                      {pet.weight ?? "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD PET MODAL */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="add-pet-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-6">
                <div>
                  <h2 id="add-pet-title" className="text-2xl font-bold text-slate-900">
                    Add Pet
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter your pet's information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleAddPet}
                className="space-y-5 p-6"
              >
                {/* Name */}
                <div>
                  <label htmlFor="ps-pets-field-3" className="mb-2 block font-medium text-slate-700">
                    Pet Name *
                  </label>

                  <input id="ps-pets-field-3"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Bruno"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Species */}
                <div>
                  <label htmlFor="ps-pets-field-4" className="mb-2 block font-medium text-slate-700">
                    Species *
                  </label>

                  <select id="ps-pets-field-4"
                    name="species"
                    value={form.species}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select species
                    </option>

                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Breed */}
                <div>
                  <label htmlFor="ps-pets-field-5" className="mb-2 block font-medium text-slate-700">
                    Breed
                  </label>

                  <input id="ps-pets-field-5"
                    type="text"
                    name="breed"
                    value={form.breed}
                    onChange={handleChange}
                    placeholder="e.g. Labrador"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="ps-pets-field-6" className="mb-2 block font-medium text-slate-700">
                    Gender
                  </label>

                  <select id="ps-pets-field-6"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="ps-pets-field-7" className="mb-2 block font-medium text-slate-700">
                    Date of Birth
                  </label>

                  <input id="ps-pets-field-7"
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="ps-pets-field-8" className="mb-2 block font-medium text-slate-700">
                    Weight
                  </label>

                  <input id="ps-pets-field-8"
                    type="number"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    placeholder="e.g. 25"
                    min="0"
                    step="0.1"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
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