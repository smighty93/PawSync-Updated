import { useEffect, useState } from "react";
import { X, CalendarDays } from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    pet_id: "",
    appointment_date: "",
    reason: "",
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

      // Load the owner's pets
      const { data: petsData, error: petsError } =
        await supabase
          .from("pets")
          .select("id, name, species, breed")
          .eq("owner_id", user.id)
          .order("name");

      if (petsError) {
        throw petsError;
      }

      setPets(petsData || []);

      // Load appointments belonging to the owner's pets
      const petIds = (petsData || []).map(
        (pet) => pet.id
      );

      if (petIds.length === 0) {
        setAppointments([]);
        return;
      }

      const {
        data: appointmentsData,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select(
          `
            id,
            pet_id,
            veterinarian_id,
            appointment_date,
            reason,
            status,
            notes,
            created_at,
            pets (
              id,
              name,
              species,
              breed
            )
          `
        )
        .in("pet_id", petIds)
        .order("appointment_date", {
          ascending: true,
        });

      if (appointmentsError) {
        throw appointmentsError;
      }

      setAppointments(appointmentsData || []);
    } catch (err) {
      console.error(
        "Error loading appointments:",
        err
      );

      setError(
        err.message ||
          "Failed to load appointments."
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

    setFormData({
      pet_id:
        pets.length > 0
          ? pets[0].id
          : "",
      appointment_date: "",
      reason: "",
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

    if (!formData.appointment_date) {
      setError(
        "Please select a date and time."
      );
      return;
    }

    if (
      new Date(formData.appointment_date) <=
      new Date()
    ) {
      setError(
        "Please select a future date and time."
      );
      return;
    }

    if (!formData.reason.trim()) {
      setError(
        "Please enter a reason for the appointment."
      );
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } =
        await supabase
          .from("appointments")
          .insert({
            pet_id: formData.pet_id,
            appointment_date:
              formData.appointment_date,
            reason: formData.reason.trim(),
            status: "pending",
            notes:
              formData.notes.trim() || null,
          });

      if (insertError) {
        throw insertError;
      }

      setShowForm(false);

      setFormData({
        pet_id: "",
        appointment_date: "",
        reason: "",
        notes: "",
      });

      await loadData();
    } catch (err) {
      console.error(
        "Error booking appointment:",
        err
      );

      setError(
        err.message ||
          "Failed to book appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getStatusClass(status) {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";

      case "confirmed":
        return "bg-green-100 text-green-700";

      case "completed":
        return "bg-blue-100 text-blue-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">
        {/* Header */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Appointments
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your pet appointments.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Book Appointment
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
              Loading appointments...
            </p>
          </div>
        ) : appointments.length === 0 ? (
          /* Empty State */

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={32} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No appointments yet
            </h2>

            <p className="mt-2 text-slate-500">
              Book an appointment for one of
              your pets.
            </p>

            <button
              type="button"
              onClick={openForm}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Book Appointment
            </button>
          </div>
        ) : (
          /* Appointment List */

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {appointments.map(
              (appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {appointment.pets
                          ?.name || "Pet"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {appointment.pets
                          ?.species || ""}

                        {appointment.pets
                          ?.breed
                          ? ` • ${appointment.pets.breed}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                        appointment.status
                      )}`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Date & Time
                      </p>

                      <p className="mt-1 font-semibold text-slate-700">
                        {formatDate(
                          appointment.appointment_date
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-400">
                        Reason
                      </p>

                      <p className="mt-1 font-semibold text-slate-700">
                        {appointment.reason ||
                          "—"}
                      </p>
                    </div>

                    {appointment.notes && (
                      <div>
                        <p className="text-sm font-medium text-slate-400">
                          Notes
                        </p>

                        <p className="mt-1 text-slate-600">
                          {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Booking Form */}

        {showForm && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Book Appointment
                </h2>

                <p className="mt-1 text-slate-500">
                  Schedule an appointment for
                  one of your pets.
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
                <label htmlFor="ps-appointments-field-9" className="mb-2 block text-sm font-semibold text-slate-700">
                  Pet
                </label>

                {pets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    You need to add a pet
                    before booking an
                    appointment.
                  </div>
                ) : (
                  <select
                    name="pet_id"
                    value={formData.pet_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    {pets.map((pet) => (
                      <option
                        key={pet.id}
                        value={pet.id}
                      >
                        {pet.name}

                        {pet.breed
                          ? ` — ${pet.breed}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date & Time */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date & Time
                </label>

                <input id="ps-appointments-field-9"
                  type="datetime-local"
                  name="appointment_date"
                  value={
                    formData.appointment_date
                  }
                  onChange={handleChange}
                  min={new Date()
                    .toISOString()
                    .slice(0, 16)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Reason */}

              <div>
                <label htmlFor="ps-appointments-field-10" className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>

                <input id="ps-appointments-field-10"
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g. General checkup"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Notes */}

              <div>
                <label htmlFor="ps-appointments-field-11" className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea id="ps-appointments-field-11"
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
                  disabled={
                    saving ||
                    pets.length === 0
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Booking..."
                    : "Book Appointment"}
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

export default Appointments;