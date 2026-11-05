import WorkspaceActions from "../../components/ui/WorkspaceActions";
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatsCard from "../../components/admin/StatsCard";
import UserTable from "../../components/admin/UserTable";

import {
  Users,
  Stethoscope,
  Heart,
  Calendar,
  ArrowUpRight,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPets: 0,
    veterinarians: 0,
    todaysAppointments: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");

      // --------------------------------------------------
      // TOTAL USERS
      // --------------------------------------------------

      const { count: totalUsers, error: usersError } =
        await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          });

      if (usersError) {
        throw usersError;
      }

      // --------------------------------------------------
      // TOTAL VETERINARIANS
      // --------------------------------------------------

      const {
        count: veterinarianCount,
        error: veterinarianError,
      } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("role", "veterinarian");

      if (veterinarianError) {
        throw veterinarianError;
      }

      // --------------------------------------------------
      // TOTAL PETS
      // --------------------------------------------------

      const { count: totalPets, error: petsError } =
        await supabase
          .from("pets")
          .select("*", {
            count: "exact",
            head: true,
          });

      if (petsError) {
        throw petsError;
      }

      // --------------------------------------------------
      // APPOINTMENTS
      // --------------------------------------------------

      const {
        data: appointments,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select("*");

      if (appointmentsError) {
        throw appointmentsError;
      }

      // --------------------------------------------------
      // COUNT TODAY'S APPOINTMENTS
      // --------------------------------------------------

      const today = new Date();

      const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const todaysAppointments =
        (appointments || []).filter((appointment) => {
          const dateValue =
            appointment.appointment_date ||
            appointment.date ||
            appointment.scheduled_date;

          if (!dateValue) {
            return false;
          }

          return String(dateValue).slice(0, 10) === todayString;
        }).length;

      // --------------------------------------------------
      // RECENT USERS
      // --------------------------------------------------

      const {
        data: users,
        error: recentUsersError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(3);

      if (recentUsersError) {
        throw recentUsersError;
      }

      const formattedUsers = (users || []).map(
        (user) => ({
          id: user.id,

          name:
            user.full_name ||
            "Unnamed User",

          email:
            user.email ||
            "No email",

          role:
            user.role === "veterinarian"
              ? "Veterinarian"
              : user.role === "admin"
              ? "Administrator"
              : "Pet Owner",

          status: "Active",

          joinedDate: user.created_at
            ? new Date(
                user.created_at
              ).toISOString()
                .split("T")[0]
            : "-",
        })
      );

      // --------------------------------------------------
      // UPDATE STATE
      // --------------------------------------------------

      setStats({
        totalUsers: totalUsers || 0,
        totalPets: totalPets || 0,
        veterinarians:
          veterinarianCount || 0,
        todaysAppointments,
      });

      setRecentUsers(formattedUsers);
    } catch (dashboardError) {
      console.error(
        "Error loading admin dashboard:",
        dashboardError
      );

      setError(
        dashboardError?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ------------------------------------------------
            WELCOME CARD
        ------------------------------------------------ */}

        <div className="ps-clinical-welcome ps-admin-welcome rounded-2xl p-4 sm:p-6 text-white">

          <h1 className="text-2xl font-bold">
            Your platform at a glance.
          </h1>

          <p className="text-blue-100 mt-1 text-sm">
            Here is what's happening across the
            PawSync healthcare network today.
          </p>

        </div>

        {/* ------------------------------------------------
            ERROR
        ------------------------------------------------ */}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ------------------------------------------------
            STATISTICS
        ------------------------------------------------ */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          <StatsCard
            title="Total Users"
            value={
              loading
                ? "..."
                : stats.totalUsers.toLocaleString()
            }
            change=""
            icon={Users}
          />

          <StatsCard
            title="Total Pets"
            value={
              loading
                ? "..."
                : stats.totalPets.toLocaleString()
            }
            change=""
            icon={Heart}
          />

          <StatsCard
            title="Veterinarians"
            value={
              loading
                ? "..."
                : stats.veterinarians.toLocaleString()
            }
            change=""
            icon={Stethoscope}
          />

          <StatsCard
            title="Today's Appointments"
            value={
              loading
                ? "..."
                : stats.todaysAppointments.toLocaleString()
            }
            change=""
            icon={Calendar}
          />

        </div>

        <WorkspaceActions role="admin" />

        {/* ------------------------------------------------
            RECENT REGISTRATIONS + SYSTEM STATUS
        ------------------------------------------------ */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* RECENT USERS */}

          <div className="lg:col-span-2">

            <UserTable
              users={recentUsers}
              title="Recent Registrations"
            />

          </div>

          {/* SYSTEM STATUS */}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">

            <div>

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-base font-semibold text-slate-800">
                  System Status
                </h2>

                <span className="flex h-2.5 w-2.5 relative">

                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>

                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>

                </span>

              </div>

              <div className="space-y-3 text-sm">

                <div className="flex flex-col min-[400px]:flex-row min-[400px]:justify-between gap-1 py-2 border-b border-slate-100">

                  <span className="text-slate-500">
                    Medical Records DB
                  </span>

                  <span className="text-emerald-600 font-medium">
                    Operational
                  </span>

                </div>

                <div className="flex flex-col min-[400px]:flex-row min-[400px]:justify-between gap-1 py-2 border-b border-slate-100">

                  <span className="text-slate-500">
                    Sync Engine
                  </span>

                  <span className="text-emerald-600 font-medium">
                    Operational
                  </span>

                </div>

                <div className="flex flex-col min-[400px]:flex-row min-[400px]:justify-between gap-1 py-2 border-b border-slate-100">

                  <span className="text-slate-500">
                    Telehealth API
                  </span>

                  <span className="text-emerald-600 font-medium">
                    Operational
                  </span>

                </div>

              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">

              <span>
                System status
              </span>

              <button
                type="button"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                View Logs

                <ArrowUpRight className="w-3 h-3" />

              </button>

            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}