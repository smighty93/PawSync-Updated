import { useEffect, useState } from "react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";
import { getPetPhoto } from "../../utils/petPhoto";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  // -----------------------------------------
  // LOAD APPOINTMENTS
  // -----------------------------------------
  async function loadAppointments() {
    setLoading(true);
    setError("");

    try {
      const { data, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select(`
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
              breed,
              owner_id,
              photo_url
            )
          `)
          .order("appointment_date", {
            ascending: true,
          });

      if (appointmentsError) {
        throw appointmentsError;
      }

      const appointmentData = data || [];

      // -----------------------------------------
      // GET OWNER IDS
      // -----------------------------------------
      const ownerIds = [
        ...new Set(
          appointmentData
            .map(
              (appointment) =>
                appointment.pets?.owner_id
            )
            .filter(Boolean)
        ),
      ];
      

      let profiles = [];

      // -----------------------------------------
      // LOAD OWNER PROFILES
      // -----------------------------------------
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

      // -----------------------------------------
      // COMBINE DATA
      // -----------------------------------------
      const formattedAppointments =
        appointmentData.map((appointment) => {
          const owner = profiles.find(
            (profile) =>
              profile.id ===
              appointment.pets?.owner_id
          );

          return {
            ...appointment,
            ownerName:
              owner?.full_name ||
              "Unknown Owner",
          };
        });

      setAppointments(formattedAppointments);
    } catch (err) {
      console.error(
        "Error loading veterinarian appointments:",
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

  // -----------------------------------------
  // UPDATE APPOINTMENT STATUS
  // -----------------------------------------
  async function updateStatus(
    appointmentId,
    newStatus
  ) {
    setUpdatingId(appointmentId);
    setError("");
    setSuccess("");

    try {
      // -----------------------------------------
      // GET LOGGED-IN VETERINARIAN
      // -----------------------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You are not logged in."
        );
      }

      // -----------------------------------------
      // PREPARE UPDATE
      // -----------------------------------------
      const updateData = {
        status: newStatus,
      };

      // When confirming, assign the appointment
      // to the logged-in veterinarian.
      if (newStatus === "confirmed") {
        updateData.veterinarian_id = user.id;
      }

      console.log(
        "Updating appointment:",
        appointmentId
      );

      console.log(
        "Update data:",
        updateData
      );

      // -----------------------------------------
      // UPDATE DATABASE
      // -----------------------------------------
      const {
        data,
        error: updateError,
      } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointmentId)
        .select(
          "id, status, veterinarian_id"
        );

      if (updateError) {
        throw updateError;
      }

      console.log(
        "Supabase update result:",
        data
      );

      // -----------------------------------------
      // CHECK THAT UPDATE RETURNED A ROW
      // -----------------------------------------
      if (!data || data.length === 0) {
        throw new Error(
          "The appointment could not be updated. This may be caused by your Supabase Row Level Security policy."
        );
      }

      const updatedAppointment = data[0];

      console.log(
        "Appointment updated successfully:",
        updatedAppointment
      );

      // -----------------------------------------
      // UPDATE SCREEN IMMEDIATELY
      // -----------------------------------------
      setAppointments((currentAppointments) =>
        currentAppointments.map(
          (appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  status:
                    updatedAppointment.status,
                  veterinarian_id:
                    updatedAppointment.veterinarian_id,
                }
              : appointment
        )
      );

      // -----------------------------------------
      // SUCCESS MESSAGE
      // -----------------------------------------
      if (newStatus === "confirmed") {
        setSuccess(
          "Appointment confirmed successfully."
        );
      } else if (
        newStatus === "cancelled"
      ) {
        setSuccess(
          "Appointment cancelled successfully."
        );
      } else if (
        newStatus === "completed"
      ) {
        setSuccess(
          "Appointment marked as completed."
        );
      }
    } catch (err) {
      console.error(
        "Error updating appointment:",
        err
      );

      setError(
        err.message ||
          "Failed to update appointment."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // -----------------------------------------
  // FORMAT DATE
  // -----------------------------------------
  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(
      date
    ).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // -----------------------------------------
  // FORMAT TIME
  // -----------------------------------------
  function formatTime(date) {
    if (!date) {
      return "—";
    }

    return new Date(
      date
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // -----------------------------------------
  // STATUS STYLE
  // -----------------------------------------
  function getStatusClass(status) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";

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

  // -----------------------------------------
  // STATUS LABEL
  // -----------------------------------------
  function getStatusLabel(status) {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Confirmed";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      default:
        return status || "Unknown";
    }
  }

  return (
    <VetDashboardLayout>
      <div className="space-y-6">

        {/* -------------------------------- */}
        {/* HEADER */}
        {/* -------------------------------- */}

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Appointments
          </h1>

          <p className="mt-2 text-slate-500">
            Manage appointments requested by
            pet owners.
          </p>
        </div>

        {/* -------------------------------- */}
        {/* ERROR MESSAGE */}
        {/* -------------------------------- */}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* -------------------------------- */}
        {/* SUCCESS MESSAGE */}
        {/* -------------------------------- */}

        {success && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* -------------------------------- */}
        {/* LOADING */}
        {/* -------------------------------- */}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-500">
              Loading appointments...
            </p>
          </div>
        ) : appointments.length === 0 ? (
          /* -------------------------------- */
          /* EMPTY STATE */
          /* -------------------------------- */

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              No appointments
            </h2>

            <p className="mt-2 text-slate-500">
              There are no appointments to
              display.
            </p>
          </div>
        ) : (
          /* -------------------------------- */
          /* APPOINTMENT TABLE */
          /* -------------------------------- */

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">

            <table className="ps-table w-full min-w-[1000px]">

              {/* TABLE HEADER */}

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Pet
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Owner
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Date
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Time
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Reason
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                    Action
                  </th>

                </tr>
              </thead>

              {/* TABLE BODY */}

              <tbody>

                {appointments.map(
                  (appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                    
                     {/* PET */}
<td className="px-6 py-5">
  <div className="flex items-center gap-3">
    <img
      src={getPetPhoto(appointment.pets?.photo_url)}
      alt={appointment.pets?.name || "Pet"}
      className="h-12 w-12 rounded-full object-cover"
    />

    <div>
      <p className="font-semibold text-slate-900">
        {appointment.pets?.name || "Unknown Pet"}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {appointment.pets?.species || ""}
        {appointment.pets?.breed
          ? ` • ${appointment.pets.breed}`
          : ""}
      </p>
    </div>
  </div>
</td>

                      {/* OWNER */}

                      <td className="px-6 py-5 text-slate-700">
                        {appointment.ownerName}
                      </td>

                      {/* DATE */}

                      <td className="px-6 py-5 text-slate-600">
                        {formatDate(
                          appointment.appointment_date
                        )}
                      </td>

                      {/* TIME */}

                      <td className="px-6 py-5 text-slate-600">
                        {formatTime(
                          appointment.appointment_date
                        )}
                      </td>

                      {/* REASON */}

                      <td className="px-6 py-5">

                        <p className="max-w-xs text-slate-700">
                          {appointment.reason ||
                            "—"}
                        </p>

                        {appointment.notes && (
                          <p className="mt-1 max-w-xs text-sm text-slate-400">
                            {appointment.notes}
                          </p>
                        )}

                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-5">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(
                            appointment.status
                          )}
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-6 py-5">

                        <div className="flex flex-wrap gap-2">

                          {/* PENDING */}

                          {appointment.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  updatingId ===
                                  appointment.id
                                }
                                onClick={() =>
                                  updateStatus(
                                    appointment.id,
                                    "confirmed"
                                  )
                                }
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updatingId ===
                                appointment.id
                                  ? "Updating..."
                                  : "Confirm"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  updatingId ===
                                  appointment.id
                                }
                                onClick={() =>
                                  updateStatus(
                                    appointment.id,
                                    "cancelled"
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* CONFIRMED */}

                          {appointment.status ===
                            "confirmed" && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                appointment.id
                              }
                              onClick={() =>
                                updateStatus(
                                  appointment.id,
                                  "completed"
                                )
                              }
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {updatingId ===
                              appointment.id
                                ? "Updating..."
                                : "Complete"}
                            </button>
                          )}

                          {/* COMPLETED */}

                          {appointment.status ===
                            "completed" && (
                            <span className="text-sm font-medium text-slate-400">
                              Completed
                            </span>
                          )}

                          {/* CANCELLED */}

                          {appointment.status ===
                            "cancelled" && (
                            <span className="text-sm font-medium text-slate-400">
                              Cancelled
                            </span>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>
        )}
      </div>
    </VetDashboardLayout>
  );
}

export default Appointments;