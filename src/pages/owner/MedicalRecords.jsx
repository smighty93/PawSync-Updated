import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [pets, setPets] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    pet_id: "",
    record_date: "",
    diagnosis: "",
    treatment: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      // Load pets belonging to the logged-in owner
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select("id, name, species, breed")
        .eq("owner_id", user.id)
        .order("name");

      if (petsError) {
        throw petsError;
      }

      setPets(petsData || []);

      const petIds = (petsData || []).map((pet) => pet.id);

      // No pets means there can be no medical records to display
      if (petIds.length === 0) {
        setRecords([]);
        return;
      }

      // Load medical records belonging to owner's pets
      const { data: recordsData, error: recordsError } = await supabase
        .from("medical_records")
        .select(`
          id,
          pet_id,
          veterinarian_id,
          diagnosis,
          treatment,
          notes,
          record_date,
          created_at,
          pets (
            id,
            name,
            species,
            breed
          )
        `)
        .in("pet_id", petIds)
        .order("record_date", { ascending: false });

      if (recordsError) {
        throw recordsError;
      }

      setRecords(recordsData || []);
    } catch (err) {
      console.error("Error loading medical records:", err);
      setError(err.message || "Failed to load medical records.");
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

    setFormData({
      pet_id: pets.length > 0 ? pets[0].id : "",
      record_date: new Date().toISOString().split("T")[0],
      diagnosis: "",
      treatment: "",
      notes: "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (!saving) {
      setShowForm(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.pet_id) {
      setError("Please select a pet.");
      return;
    }

    if (!formData.record_date) {
      setError("Please select a record date.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("medical_records")
        .insert({
          pet_id: formData.pet_id,
          record_date: formData.record_date,
          diagnosis: formData.diagnosis.trim() || null,
          treatment: formData.treatment.trim() || null,
          notes: formData.notes.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      setShowForm(false);

      setFormData({
        pet_id: "",
        record_date: "",
        diagnosis: "",
        treatment: "",
        notes: "",
      });

      await loadData();
    } catch (err) {
      console.error("Error adding medical record:", err);
      setError(err.message || "Failed to add medical record.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Medical Records
            </h1>

            <p className="mt-2 text-slate-500">
              View your pets' medical records and history.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add Medical Record
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-500">
              Loading medical records...
            </p>
          </div>
        ) : records.length === 0 ? (
          /* Empty State */
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText size={32} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No medical records yet
            </h2>

            <p className="mt-2 text-slate-500">
              Add a medical record for one of your pets.
            </p>

            <button
              type="button"
              onClick={openForm}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Add Medical Record
            </button>
          </div>
        ) : (
          /* Medical Records */
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                {/* Record Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText size={24} />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {record.pets?.name || "Pet"}
                      </h2>

                      <p className="text-sm text-slate-500">
                        {record.pets?.species || ""}
                        {record.pets?.breed
                          ? ` • ${record.pets.breed}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatDate(record.record_date)}
                  </span>
                </div>

                {/* Diagnosis */}
                {record.diagnosis && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-400">
                      Diagnosis
                    </p>

                    <p className="mt-1 text-slate-700">
                      {record.diagnosis}
                    </p>
                  </div>
                )}

                {/* Treatment */}
                {record.treatment && (
                  <div className="mt-5">
                    <p className="text-sm font-medium text-slate-400">
                      Treatment
                    </p>

                    <p className="mt-1 text-slate-700">
                      {record.treatment}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {record.notes && (
                  <div className="mt-5">
                    <p className="text-sm font-medium text-slate-400">
                      Notes
                    </p>

                    <p className="mt-1 text-slate-600">
                      {record.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Medical Record Form */}
        {showForm && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* Form Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Add Medical Record
                </h2>

                <p className="mt-1 text-slate-500">
                  Add medical information for one of your pets.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                <label htmlFor="ps-medicalrecords-field-12" className="mb-2 block text-sm font-semibold text-slate-700">
                  Pet
                </label>

                {pets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    You need to add a pet before adding a medical record.
                  </div>
                ) : (
                  <select
                    name="pet_id"
                    value={formData.pet_id}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {pets.map((pet) => (
                      <option
                        key={pet.id}
                        value={pet.id}
                      >
                        {pet.name}
                        {pet.breed ? ` — ${pet.breed}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Record Date */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Record Date
                </label>

                <input id="ps-medicalrecords-field-12"
                  type="date"
                  name="record_date"
                  value={formData.record_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label htmlFor="ps-medicalrecords-field-13" className="mb-2 block text-sm font-semibold text-slate-700">
                  Diagnosis
                </label>

                <input id="ps-medicalrecords-field-13"
                  type="text"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  placeholder="e.g. Ear infection"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Treatment */}
              <div>
                <label htmlFor="ps-medicalrecords-field-14" className="mb-2 block text-sm font-semibold text-slate-700">
                  Treatment
                </label>

                <input id="ps-medicalrecords-field-14"
                  type="text"
                  name="treatment"
                  value={formData.treatment}
                  onChange={handleChange}
                  placeholder="e.g. Medication prescribed"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="ps-medicalrecords-field-15" className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea id="ps-medicalrecords-field-15"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Additional information..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || pets.length === 0}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Medical Record"}
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
      </div>
    </OwnerDashboardLayout>
  );
}

export default MedicalRecords;