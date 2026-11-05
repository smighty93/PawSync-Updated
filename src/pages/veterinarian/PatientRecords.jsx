import { useEffect, useState } from "react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";

function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
  setLoading(true);
  setError("");

  try {
    /*
     * Get ALL pets.
     *
     * IMPORTANT:
     * There is intentionally NO veterinarian_id filter here.
     */
    const {
      data: petsData,
      error: petsError,
    } = await supabase
      .from("pets")
      .select(`
        id,
        owner_id,
        name,
        species,
        breed,
        gender,
        date_of_birth,
        weight
      `)
      .order("name", {
        ascending: true,
      });

    if (petsError) {
      throw petsError;
    }

    const pets = petsData || [];

    if (pets.length === 0) {
      setPatients([]);
      return;
    }

    /*
     * Get all owner IDs belonging to these pets.
     */
    const ownerIds = [
      ...new Set(
        pets
          .map((pet) => pet.owner_id)
          .filter(Boolean)
      ),
    ];

    let profiles = [];

    if (ownerIds.length > 0) {
      const {
        data: profileData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);

      if (profilesError) {
        throw profilesError;
      }

      profiles = profileData || [];
    }

    /*
     * Get appointments for ALL pets.
     *
     * There is intentionally NO veterinarian_id filter.
     */
    const petIds = pets.map(
      (pet) => pet.id
    );

    let appointments = [];

    if (petIds.length > 0) {
      const {
        data: appointmentData,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select(
          "pet_id, appointment_date, status"
        )
        .in("pet_id", petIds)
        .order("appointment_date", {
          ascending: false,
        });

      if (appointmentsError) {
        throw appointmentsError;
      }

      appointments = appointmentData || [];
    }

    /*
     * Build the complete patient list.
     */
    const formattedPatients = pets.map(
      (pet) => {
        const owner = profiles.find(
          (profile) =>
            profile.id === pet.owner_id
        );

        const petAppointments =
          appointments.filter(
            (appointment) =>
              appointment.pet_id === pet.id
          );

        const latestAppointment =
          petAppointments[0];

        return {
          ...pet,

          ownerName:
            owner?.full_name ||
            "Unknown Owner",

          latestAppointmentDate:
            latestAppointment?.appointment_date ||
            null,

          latestAppointmentStatus:
            latestAppointment?.status ||
            null,
        };
      }
    );

    setPatients(formattedPatients);
  } catch (err) {
    console.error(
      "Error loading patient records:",
      err
    );

    setError(
      err.message ||
        "Failed to load patient records."
    );
  } finally {
    setLoading(false);
  }
}

  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) {
      return "—";
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let years =
      today.getFullYear() -
      birthDate.getFullYear();

    let months =
      today.getMonth() -
      birthDate.getMonth();

    if (
      months < 0 ||
      (months === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      years--;
      months += 12;
    }

    if (years > 0) {
      return `${years} ${
        years === 1 ? "Year" : "Years"
      }`;
    }

    if (months > 0) {
      return `${months} ${
        months === 1 ? "Month" : "Months"
      }`;
    }

    return "Less than 1 Month";
  }

  function getStatus(patient) {
    const status =
      patient.latestAppointmentStatus;

    if (!status) {
      return {
        label: "Patient",
        className:
          "bg-slate-100 text-slate-700",
      };
    }

    if (status === "pending") {
      return {
        label: "Upcoming",
        className:
          "bg-amber-100 text-amber-700",
      };
    }

    if (
      status === "confirmed" ||
      status === "scheduled"
    ) {
      return {
        label: "Scheduled",
        className:
          "bg-blue-100 text-blue-700",
      };
    }

    if (status === "completed") {
      return {
        label: "Completed",
        className:
          "bg-emerald-100 text-emerald-700",
      };
    }

    if (status === "cancelled") {
      return {
        label: "Cancelled",
        className:
          "bg-red-100 text-red-700",
      };
    }

    return {
      label: status,
      className:
        "bg-slate-100 text-slate-700",
    };
  }

  return (
    <VetDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Patient Records
          </h1>

          <p className="mt-1 text-slate-500">
            View patients associated with your appointments.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              Loading patient records...
            </p>
          </div>
        ) : patients.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              No patients found
            </h2>

            <p className="mt-2 text-slate-500">
              Patients will appear here once they have
              appointments with you.
            </p>
          </div>
        ) : (
          /* Patient Table */
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-800">
                My Patients
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="ps-table w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Pet
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Species
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Breed
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Age
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Weight
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => {
                    const status =
                      getStatus(patient);

                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-slate-50"
                      >
                        {/* Pet */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {patient.name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {patient.gender || "—"}
                          </p>
                        </td>

                        {/* Owner */}
                        <td className="px-5 py-4 text-slate-600">
                          {patient.ownerName}
                        </td>

                        {/* Species */}
                        <td className="px-5 py-4 text-slate-600">
                          {patient.species || "—"}
                        </td>

                        {/* Breed */}
                        <td className="px-5 py-4 text-slate-600">
                          {patient.breed || "—"}
                        </td>

                        {/* Age */}
                        <td className="px-5 py-4 text-slate-600">
                          {calculateAge(
                            patient.date_of_birth
                          )}
                        </td>

                        {/* Weight */}
                        <td className="px-5 py-4 text-slate-600">
                          {patient.weight
                            ? `${patient.weight} kg`
                            : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </VetDashboardLayout>
  );
}

export default PatientRecords;