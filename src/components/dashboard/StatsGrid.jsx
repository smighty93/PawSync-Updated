import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function StatsGrid() {
  const [stats, setStats] = useState({
    pets: 0,
    appointments: 0,
    vaccinations: 0,
    healthStatus: "Good",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError("");

    try {
      // -----------------------------------------
      // Get logged-in user
      // -----------------------------------------

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

      // -----------------------------------------
      // 1. Get owner's pets
      // -----------------------------------------

      const {
        data: pets,
        error: petsError,
      } = await supabase
        .from("pets")
        .select("id")
        .eq("owner_id", user.id);

      if (petsError) {
        throw petsError;
      }

      const petList = pets || [];
      const petIds = petList.map((pet) => pet.id);

      // -----------------------------------------
      // No pets
      // -----------------------------------------

      if (petIds.length === 0) {
        setStats({
          pets: 0,
          appointments: 0,
          vaccinations: 0,
          healthStatus: "No Pets",
        });

        return;
      }

      // -----------------------------------------
      // 2. Get appointments
      // -----------------------------------------

      const {
        data: appointments,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select("id")
        .in("pet_id", petIds);

      if (appointmentsError) {
        throw appointmentsError;
      }

      const appointmentCount =
        appointments?.length || 0;

      // -----------------------------------------
      // 3. Get vaccinations
      //
      // IMPORTANT:
      // Vaccinations come from the vaccinations
      // table, not medical_records.
      // -----------------------------------------

      const {
        data: vaccinations,
        error: vaccinationsError,
      } = await supabase
        .from("vaccinations")
        .select("id")
        .in("pet_id", petIds);

      if (vaccinationsError) {
        throw vaccinationsError;
      }

      const vaccinationCount =
        vaccinations?.length || 0;

      // -----------------------------------------
      // 4. Health status
      // -----------------------------------------
      //
      // At this stage there is no dedicated
      // health-status field in the dashboard
      // data being used here.
      //
      // Therefore we keep the existing status
      // behavior rather than inventing a health
      // calculation.
      // -----------------------------------------

      const healthStatus = "Good";

      // -----------------------------------------
      // Update dashboard statistics
      // -----------------------------------------

      setStats({
        pets: petList.length,
        appointments: appointmentCount,
        vaccinations: vaccinationCount,
        healthStatus,
      });
    } catch (err) {
      console.error(
        "Error loading dashboard statistics:",
        err
      );

      setError(
        err.message ||
          "Failed to load dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Error */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadStats}
            className="mt-2 text-sm font-semibold text-red-700 hover:underline"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="ps-stat-grid grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* My Pets */}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-slate-500">
            My Pets
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading ? "..." : stats.pets}
          </p>
        </div>

        {/* Appointments */}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-slate-500">
            Appointments
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading
              ? "..."
              : stats.appointments}
          </p>
        </div>

        {/* Vaccinations */}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-slate-500">
            Vaccinations
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading
              ? "..."
              : stats.vaccinations}
          </p>
        </div>

        {/* Health Status */}

        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-slate-500">
            Health Status
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading
              ? "..."
              : stats.healthStatus}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatsGrid;