import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

function AppointmentTable() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTodaysAppointments();
  }, []);

  async function loadTodaysAppointments() {
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

      const now = new Date();

      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );

      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const {
        data,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select(`
          id,
          pet_id,
          appointment_date,
          status,
          reason,
          pets (
            id,
            name,
            species,
            breed,
            owner_id
          )
        `)
        .eq("veterinarian_id", user.id)
        .gte(
          "appointment_date",
          startOfDay.toISOString()
        )
        .lte(
          "appointment_date",
          endOfDay.toISOString()
        )
        .order("appointment_date", {
          ascending: true,
        });

      if (appointmentsError) {
        throw appointmentsError;
      }

      const appointmentData = data || [];

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

      const formattedAppointments =
        appointmentData.map((appointment) => {
          const owner = profiles.find(
            (profile) =>
              profile.id ===
              appointment.pets?.owner_id
          );

          return {
            ...appointment,
            petName:
              appointment.pets?.name ||
              "Unknown Pet",
            ownerName:
              owner?.full_name ||
              "Unknown Owner",
          };
        });

      setAppointments(formattedAppointments);
    } catch (err) {
      console.error(
        "Error loading today's appointments:",
        err
      );

      setError(
        err.message ||
          "Failed to load today's appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatTime(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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

  function getStatusClass(status) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "confirmed":
        return "bg-blue-100 text-blue-700";

      case "completed":
        return "bg-green-100 text-green-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl bg-white p-6 shadow-md"
    >
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800">
          Today's Appointments
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Appointments scheduled across the PawSync healthcare network today.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center">
          <p className="text-gray-500">
            Loading today's appointments...
          </p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
          <h3 className="font-semibold text-slate-800">
            No appointments today
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            There are no appointments scheduled for today.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3">Pet</th>
                <th className="pb-3">Owner</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Reason</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((appointment) => (
                <tr
                  key={appointment.id}
                  className="border-b last:border-none hover:bg-gray-50"
                >
                  <td className="py-4">
                    <p className="font-medium text-slate-800">
                      {appointment.petName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {appointment.pets?.species || ""}

                      {appointment.pets?.breed
                        ? ` • ${appointment.pets.breed}`
                        : ""}
                    </p>
                  </td>

                  <td className="text-slate-600">
                    {appointment.ownerName}
                  </td>

                  <td className="font-medium text-slate-700">
                    {formatTime(
                      appointment.appointment_date
                    )}
                  </td>

                  <td className="max-w-xs text-slate-600">
                    {appointment.reason || "—"}
                  </td>

                  <td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

export default AppointmentTable;