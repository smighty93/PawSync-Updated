import { useEffect, useState } from "react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";

function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPrescriptions();
  }, []);

  async function loadPrescriptions() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const { data, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select(`
          id,
          pet_id,
          veterinarian_id,
          medication_name,
          dosage,
          frequency,
          duration,
          instructions,
          created_at,
          pets (
            id,
            name,
            species,
            breed,
            owner_id
          )
        `)
        .eq("veterinarian_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (prescriptionsError) {
        throw prescriptionsError;
      }

      const records = data || [];

      const ownerIds = [
        ...new Set(
          records
            .map((record) => record.pets?.owner_id)
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

      const formattedPrescriptions = records.map((record) => {
        const owner = profiles.find(
          (profile) => profile.id === record.pets?.owner_id
        );

        return {
          ...record,
          petName: record.pets?.name || "Unknown Pet",
          ownerName: owner?.full_name || "Unknown Owner",
        };
      });

      setPrescriptions(formattedPrescriptions);
    } catch (err) {
      console.error("Error loading prescriptions:", err);

      setError(
        err.message || "Failed to load prescriptions."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <VetDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Prescriptions
          </h1>

          <p className="mt-1 text-slate-500">
            View prescription information for your patients.
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
              Loading prescriptions...
            </p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              No prescriptions
            </h2>

            <p className="mt-2 text-slate-500">
              No prescriptions have been created for your patients yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-800">
                Patient Prescriptions
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="ps-table w-full min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Pet
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Medicine
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Dosage
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Frequency
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Duration
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Instructions
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-semibold text-slate-600">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {prescriptions.map((prescription) => (
                    <tr
                      key={prescription.id}
                      className="hover:bg-slate-50"
                    >
                      {/* Pet */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {prescription.petName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {prescription.pets?.species || ""}

                          {prescription.pets?.breed
                            ? ` • ${prescription.pets.breed}`
                            : ""}
                        </p>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4 text-slate-600">
                        {prescription.ownerName}
                      </td>

                      {/* Medicine */}
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {prescription.medication_name || "—"}
                      </td>

                      {/* Dosage */}
                      <td className="px-5 py-4 text-slate-600">
                        {prescription.dosage || "—"}
                      </td>

                      {/* Frequency */}
                      <td className="px-5 py-4 text-slate-600">
                        {prescription.frequency || "—"}
                      </td>

                      {/* Duration */}
                      <td className="px-5 py-4 text-slate-600">
                        {prescription.duration || "—"}
                      </td>

                      {/* Instructions */}
                      <td className="px-5 py-4">
                        <p className="max-w-xs text-sm text-slate-500">
                          {prescription.instructions || "—"}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(prescription.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </VetDashboardLayout>
  );
}

export default Prescriptions;