import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, CalendarDays } from "lucide-react";
import { supabase } from "../../lib/supabase";

function WelcomeCard() {
  const [doctorName, setDoctorName] = useState("Doctor");
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [vaccinationCount, setVaccinationCount] = useState(0);

  useEffect(() => {
    loadWelcomeData();
  }, []);

  async function loadWelcomeData() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.full_name) {
        setDoctorName(profile.full_name);
      }

      const today = new Date();

      const todayString =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

      const {
        data: appointments,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select("id")
        .eq("veterinarian_id", user.id)
        .gte(
          "appointment_date",
          `${todayString}T00:00:00`
        )
        .lt(
          "appointment_date",
          `${todayString}T23:59:59.999`
        );

      if (appointmentsError) {
        throw appointmentsError;
      }

      setAppointmentCount(appointments?.length || 0);

      const {
        data: medicalRecords,
        error: recordsError,
      } = await supabase
        .from("medical_records")
        .select("pet_id")
        .eq("veterinarian_id", user.id);

      if (recordsError) {
        throw recordsError;
      }

      const patientIds = [
        ...new Set(
          (medicalRecords || [])
            .map((record) => record.pet_id)
            .filter(Boolean)
        ),
      ];

      if (patientIds.length === 0) {
        setVaccinationCount(0);
        return;
      }

      const {
        data: vaccinations,
        error: vaccinationsError,
      } = await supabase
        .from("vaccinations")
        .select("id, pet_id, next_due_date")
        .in("pet_id", patientIds)
        .lte("next_due_date", todayString);

      if (vaccinationsError) {
        throw vaccinationsError;
      }

      setVaccinationCount(
        vaccinations?.length || 0
      );
    } catch (error) {
      console.error(
        "Error loading welcome card data:",
        error
      );
    }
  }

  const formattedDoctorName = doctorName
    .toLowerCase()
    .startsWith("dr.")
    ? doctorName
    : `Dr. ${doctorName}`;

  const today = new Date();

  const formattedDate = today.toLocaleDateString([], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ps-clinical-welcome rounded-2xl px-7 py-6 text-white"
    >
      {/* Main Content */}
      <div className="flex items-center justify-between gap-6">

        {/* Doctor Information */}
        <div className="min-w-0">
          <p className="text-blue-100 text-sm mb-1">
            Welcome back,
          </p>

          <h1 className="text-2xl lg:text-3xl font-bold">
            {formattedDoctorName} 👋
          </h1>

          <p className="mt-2 text-sm lg:text-base text-blue-100 max-w-2xl">
            You have{" "}
            <span className="font-semibold text-white">
              {appointmentCount} appointments
            </span>{" "}
            today and{" "}
            <span className="font-semibold text-white">
              {vaccinationCount} vaccinations
            </span>{" "}
            due for your patients.
          </p>
        </div>

        {/* Icon */}
        <div className="hidden sm:flex shrink-0 items-center justify-center w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-white/20">
          <Stethoscope
            size={42}
            className="lg:w-12 lg:h-12"
          />
        </div>
      </div>

      {/* Date */}
      <div className="mt-6 pt-4 border-t border-white/20 flex items-center gap-2 text-sm text-blue-100">
        <CalendarDays size={17} />

        <span>
          {formattedDate} • Veterinary Dashboard
        </span>
      </div>
    </motion.div>
  );
}

export default WelcomeCard;