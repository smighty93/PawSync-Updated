import { useEffect, useState } from "react";
import { Plus, X, Syringe } from "lucide-react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";

function Vaccinations() {
  const [vaccinations, setVaccinations] = useState([]);
  const [pets, setPets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    pet_id: "",
    vaccine_name: "",
    vaccination_date: "",
    next_due_date: "",
    notes: "",
  });

  useEffect(() => {
    loadVaccinations();
  }, []);

  async function loadVaccinations() {
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

      // Load pets
      const { data: petsData, error: petsError } =
        await supabase
          .from("pets")
          .select("id, name, species, breed, owner_id")
          .order("name", { ascending: true });

      if (petsError) {
        throw petsError;
      }

      setPets(petsData || []);

      // Load vaccinations
      const {
        data: vaccinationData,
        error: vaccinationError,
      } = await supabase
        .from("vaccinations")
        .select(`
          id,
          pet_id,
          vaccine_name,
          vaccination_date,
          next_due_date,
          notes,
          created_at
        `)
        .order("next_due_date", {
          ascending: true,
          nullsFirst: false,
        });

      if (vaccinationError) {
        throw vaccinationError;
      }

      const formattedVaccinations = (
        vaccinationData || []
      ).map((vaccination) => {
        const pet = (petsData || []).find(
          (item) => item.id === vaccination.pet_id
        );

        return {
          ...vaccination,
          petName: pet?.name || "Unknown Pet",
          species: pet?.species || "",
          breed: pet?.breed || "",
        };
      });

      setVaccinations(formattedVaccinations);
    } catch (err) {
      console.error(
        "Error loading vaccinations:",
        err
      );

      setError(
        err.message ||
          "Failed to load vaccinations."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openForm() {
    setError("");
    setSuccess("");

    setFormData({
      pet_id: pets.length > 0 ? pets[0].id : "",
      vaccine_name: "",
      vaccination_date: new Date()
        .toISOString()
        .split("T")[0],
      next_due_date: "",
      notes: "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);

    setFormData({
      pet_id: "",
      vaccine_name: "",
      vaccination_date: "",
      next_due_date: "",
      notes: "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.pet_id) {
      setError("Please select a pet.");
      return;
    }

    if (!formData.vaccine_name.trim()) {
      setError("Please enter the vaccine name.");
      return;
    }

    if (!formData.vaccination_date) {
      setError("Please select the vaccination date.");
      return;
    }

    if (
      formData.next_due_date &&
      formData.next_due_date <
        formData.vaccination_date
    ) {
      setError(
        "The next due date cannot be earlier than the vaccination date."
      );
      return;
    }

    setSaving(true);

    try {
      // Make sure the current user is authenticated
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

      // Confirm that the current user is a veterinarian
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== "veterinarian") {
        throw new Error(
          "Only veterinarians can add vaccination records."
        );
      }

      // Insert only columns that actually exist
      // in the vaccinations table.
      const { error: insertError } = await supabase
        .from("vaccinations")
        .insert({
          pet_id: formData.pet_id,
          vaccine_name:
            formData.vaccine_name.trim(),
          vaccination_date:
            formData.vaccination_date,
          next_due_date:
            formData.next_due_date || null,
          notes:
            formData.notes.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(
        "Vaccination recorded successfully."
      );

      setShowForm(false);

      setFormData({
        pet_id: "",
        vaccine_name: "",
        vaccination_date: "",
        next_due_date: "",
        notes: "",
      });

      await loadVaccinations();
    } catch (err) {
      console.error(
        "Error saving vaccination:",
        err
      );

      setError(
        err.message ||
          "Failed to save vaccination."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatus(nextDueDate) {
    if (!nextDueDate) {
      return {
        label: "No Due Date",
        className:
          "bg-slate-100 text-slate-600",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(
      `${nextDueDate}T00:00:00`
    );

    if (dueDate < today) {
      return {
        label: "Overdue",
        className:
          "bg-red-100 text-red-700",
      };
    }

    if (dueDate.getTime() === today.getTime()) {
      return {
        label: "Due Today",
        className:
          "bg-yellow-100 text-yellow-700",
      };
    }

    return {
      label: "Scheduled",
      className:
        "bg-blue-100 text-blue-700",
    };
  }

  return (
    <VetDashboardLayout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Vaccinations
            </h1>

            <p className="mt-2 text-slate-500">
              Manage vaccination records and upcoming
              vaccination schedules.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            disabled={pets.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Add Vaccination
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Add Vaccination Form */}
        {showForm && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Add Vaccination
                </h2>

                <p className="mt-1 text-slate-500">
                  Record a vaccination given to a pet.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >
              {/* Pet */}
              <div>
                <label htmlFor="ps-vaccinations-field-30" className="mb-2 block text-sm font-semibold text-slate-700">
                  Pet
                </label>

                {pets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    No pets are available.
                  </div>
                ) : (
                  <select
                    name="pet_id"
                    value={formData.pet_id}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select a pet
                    </option>

                    {pets.map((pet) => (
                      <option
                        key={pet.id}
                        value={pet.id}
                      >
                        {pet.name}
                        {pet.species
                          ? ` — ${pet.species}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vaccine Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Vaccine Name
                </label>

                <input id="ps-vaccinations-field-30"
                  type="text"
                  name="vaccine_name"
                  value={formData.vaccine_name}
                  onChange={handleChange}
                  placeholder="e.g. Rabies, DHPP"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Vaccination Date */}
              <div>
                <label htmlFor="ps-vaccinations-field-31" className="mb-2 block text-sm font-semibold text-slate-700">
                  Vaccination Date
                </label>

                <input id="ps-vaccinations-field-31"
                  type="date"
                  name="vaccination_date"
                  value={formData.vaccination_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Next Due Date */}
              <div>
                <label htmlFor="ps-vaccinations-field-32" className="mb-2 block text-sm font-semibold text-slate-700">
                  Next Due Date
                </label>

                <input id="ps-vaccinations-field-32"
                  type="date"
                  name="next_due_date"
                  value={formData.next_due_date}
                  onChange={handleChange}
                  min={
                    formData.vaccination_date ||
                    undefined
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="ps-vaccinations-field-33" className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea id="ps-vaccinations-field-33"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Additional vaccination notes..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    pets.length === 0
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Vaccination"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vaccination List */}
        <div className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-slate-500">
                Loading vaccinations...
              </p>
            </div>
          ) : vaccinations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Syringe size={32} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                No vaccination records yet
              </h2>

              <p className="mt-2 text-slate-500">
                Add a vaccination record for a pet.
              </p>

              <button
                type="button"
                onClick={openForm}
                disabled={pets.length === 0}
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Vaccination
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="ps-table w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      Pet
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      Vaccine
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      Vaccination Date
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      Next Due Date
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {vaccinations.map(
                    (vaccination) => {
                      const status = getStatus(
                        vaccination.next_due_date
                      );

                      return (
                        <tr
                          key={vaccination.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          {/* Pet */}
                          <td className="px-6 py-5">
                            <p className="font-semibold text-slate-900">
                              {vaccination.petName}
                            </p>

                            <p className="text-sm text-slate-500">
                              {vaccination.species}

                              {vaccination.breed
                                ? ` • ${vaccination.breed}`
                                : ""}
                            </p>
                          </td>

                          {/* Vaccine */}
                          <td className="px-6 py-5">
                            <p className="font-medium text-slate-800">
                              {vaccination.vaccine_name}
                            </p>

                            {vaccination.notes && (
                              <p className="mt-1 max-w-xs text-sm text-slate-500">
                                {vaccination.notes}
                              </p>
                            )}
                          </td>

                          {/* Vaccination Date */}
                          <td className="px-6 py-5 text-slate-600">
                            {formatDate(
                              vaccination.vaccination_date
                            )}
                          </td>

                          {/* Next Due Date */}
                          <td className="px-6 py-5 text-slate-600">
                            {formatDate(
                              vaccination.next_due_date
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </VetDashboardLayout>
  );
}

export default Vaccinations;