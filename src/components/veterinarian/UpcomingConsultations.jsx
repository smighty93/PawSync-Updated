import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

function UpcomingConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingConsultations();
  }, []);

  async function loadUpcomingConsultations() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      const now = new Date();

      const today = new Date();
      const todayString =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

      const { data, error } = await supabase
  .from("appointments")
  .select(`
    id,
    appointment_date,
    status,
    reason,
    pets (
      id,
      name,
      owner_id
    )
  `)
  .eq("veterinarian_id", user.id)
  .gte("appointment_date", now.toISOString())
  .in("status", ["pending", "confirmed"])
  .order("appointment_date", {
    ascending: true,
  })
  .limit(5);

if (error) throw error;

      const appointments = data || [];

      const ownerIds = [
        ...new Set(
          appointments
            .map((appointment) => appointment.pets?.owner_id)
            .filter(Boolean)
        ),
      ];

      let profiles = [];

      if (ownerIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);

        if (profileError) throw profileError;

        profiles = profileData || [];
      }

      const upcoming = appointments
        .map((appointment) => {
          const owner = profiles.find(
            (profile) =>
              profile.id === appointment.pets?.owner_id
          );

          const appointmentDateTime = new Date(
  appointment.appointment_date
);

          return {
            ...appointment,
            petName:
              appointment.pets?.name || "Unknown Pet",
            ownerName:
              owner?.full_name || "Unknown Owner",
            appointmentDateTime,
          };
        })
        .filter(
          (appointment) =>
            appointment.appointmentDateTime > now
        )
        .slice(0, 5);

      setConsultations(upcoming);
    } catch (error) {
      console.error(
        "Error loading upcoming consultations:",
        error
      );

      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(time) {
    if (!time) return "—";

    const [hours, minutes] = time.split(":");

    const date = new Date();
    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-md p-6"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-5">
        Upcoming Consultations
      </h2>

      {loading ? (
        <div className="py-6 text-center text-gray-500">
          Loading consultations...
        </div>
      ) : consultations.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-5 py-8 text-center">
          <h3 className="font-semibold text-gray-800">
            No upcoming consultations
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            You do not have any upcoming consultations today.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b last:border-none pb-3"
            >
              <div>
                <h3 className="font-semibold text-gray-800">
                  {item.petName}
                </h3>

                <p className="text-sm text-gray-500">
                  Owner: {item.ownerName}
                </p>
              </div>

              <span className="text-blue-600 font-semibold">
               {item.appointmentDateTime.toLocaleString([], {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default UpcomingConsultations;