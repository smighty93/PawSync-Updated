import { useEffect, useState } from "react";

import VetDashboardLayout from "../../components/layout/VetDashboardLayout";

import { supabase } from "../../lib/supabase";

function MedicalReports() {
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
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

      // --------------------------------------------------
      // LOAD ALL MEDICAL RECORDS
      // --------------------------------------------------
      // IMPORTANT:
      // There is NO veterinarian_id filter here.
      // Every veterinarian can see all medical records.
      // --------------------------------------------------

      const {
        data,
        error: reportsError,
      } = await supabase
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
            breed,
            owner_id
          )
        `)
        .order("record_date", {
          ascending: false,
        });

      if (reportsError) {
        throw reportsError;
      }

      const medicalRecords = data || [];

      // --------------------------------------------------
      // LOAD OWNER PROFILES
      // --------------------------------------------------

      const ownerIds = [
        ...new Set(
          medicalRecords
            .map(
              (record) =>
                record.pets?.owner_id
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

      // --------------------------------------------------
      // FORMAT REPORTS
      // --------------------------------------------------

      const formattedReports =
        medicalRecords.map((record) => {
          const owner = profiles.find(
            (profile) =>
              profile.id ===
              record.pets?.owner_id
          );

          return {
            ...record,

            petName:
              record.pets?.name ||
              "Unknown Pet",

            ownerName:
              owner?.full_name ||
              "Unknown Owner",

            reportType:
              record.diagnosis ||
              "Medical Examination",

            status: "Completed",
          };
        });

      setReports(formattedReports);
    } catch (err) {
      console.error(
        "Error loading medical reports:",
        err
      );

      setError(
        err.message ||
          "Failed to load medical reports."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(
      date
    ).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const completedCount =
    reports.filter(
      (report) =>
        report.status === "Completed"
    ).length;

  return (
    <VetDashboardLayout>
      <div className="space-y-6">

        {/* Header */}

        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Medical Reports
          </h1>

          <p className="mt-1 text-slate-500">
            View medical records for all patients.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {/* Summary Cards */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {/* Total Reports */}

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Reports
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-800">
              {loading
                ? "—"
                : reports.length}
            </p>
          </div>

          {/* Completed */}

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {loading
                ? "—"
                : completedCount}
            </p>
          </div>

          {/* Patients */}

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Patients
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {loading
                ? "—"
                : new Set(
                    reports.map(
                      (report) =>
                        report.pet_id
                    )
                  ).size}
            </p>
          </div>
        </div>

        {/* Reports */}

        {loading ? (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              Loading medical reports...
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              No medical reports
            </h2>

            <p className="mt-2 text-slate-500">
              No medical records have been created yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">

            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-800">
                Medical Reports
              </h2>
            </div>

            <div className="overflow-x-auto">

              <table className="ps-table w-full min-w-[1000px]">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Pet
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Diagnosis
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Treatment
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {reports.map(
                    (report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-slate-50"
                      >

                        {/* Pet */}

                        <td className="px-5 py-4">

                          <p className="font-semibold text-slate-800">
                            {report.petName}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {report.pets
                              ?.species ||
                              ""}

                            {report.pets
                              ?.breed
                              ? ` • ${report.pets.breed}`
                              : ""}
                          </p>

                        </td>

                        {/* Owner */}

                        <td className="px-5 py-4 text-slate-600">
                          {report.ownerName}
                        </td>

                        {/* Diagnosis */}

                        <td className="px-5 py-4">

                          <p className="max-w-xs text-slate-700">
                            {report.diagnosis ||
                              "—"}
                          </p>

                        </td>

                        {/* Treatment */}

                        <td className="px-5 py-4">

                          <p className="max-w-xs text-slate-700">
                            {report.treatment ||
                              "—"}
                          </p>

                        </td>

                        {/* Date */}

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(
                            report.record_date
                          )}
                        </td>

                        {/* Status */}

                        <td className="px-5 py-4">

                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            Completed
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

      </div>
    </VetDashboardLayout>
  );
}

export default MedicalReports;