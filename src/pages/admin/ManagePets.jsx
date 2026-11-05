
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getPetPhoto } from "../../utils/petPhoto";
import {
  Search,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ManagePets() {
  const [pets, setPets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPets();
  }, []);

  async function loadPets() {
    try {
      setLoading(true);
      setError("");

      const { data, error: petsError } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          breed,
          owner_id,
          photo_url,
          vaccination_status
        `)
        .order("name", { ascending: true });

      if (petsError) throw petsError;

      const petData = data || [];
      const petIds = petData.map((pet) => pet.id);

      let vaccinationRecords = [];
      let medicalRecords = [];

      if (petIds.length > 0) {
        const { data: vaccinationData, error: vaccinationError } =
          await supabase
            .from("vaccinations")
            .select("pet_id, status, next_due_date, vaccination_date, vaccine_name")
            .in("pet_id", petIds);

        if (vaccinationError) throw vaccinationError;

        vaccinationRecords = vaccinationData || [];

        const { data: medicalData, error: medicalError } =
          await supabase
            .from("medical_records")
            .select("id, pet_id, record_date")
            .in("pet_id", petIds)
            .order("record_date", { ascending: false });

        if (medicalError) throw medicalError;

        medicalRecords = medicalData || [];
      }

      const ownerIds = [
        ...new Set(
          petData.map((pet) => pet.owner_id).filter(Boolean)
        ),
      ];

      let profiles = [];

      if (ownerIds.length > 0) {
        const { data: profileData, error: profilesError } =
          await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ownerIds);

        if (profilesError) throw profilesError;

        profiles = profileData || [];
      }

      const today = new Date().toISOString().split("T")[0];

      const formattedPets = petData.map((pet) => {
        const owner = profiles.find(
          (profile) => profile.id === pet.owner_id
        );

        const petVaccinations = vaccinationRecords.filter(
          (record) => record.pet_id === pet.id
        );

        const hasOverdue = petVaccinations.some(
          (record) =>
            record.status === "overdue" ||
            (record.next_due_date && record.next_due_date < today)
        );

        const hasPending = petVaccinations.some(
          (record) => record.status === "pending"
        );

        const vaccinationStatus =
          petVaccinations.length === 0
            ? "Not Available"
            : hasOverdue
              ? "Overdue"
              : hasPending
                ? "Pending"
                : "Records Available";

        const latestCheckup = medicalRecords.find(
          (record) => record.pet_id === pet.id
        );

        return {
          ...pet,
          owner: owner?.full_name || "Unknown Owner",
          vaccinationStatus,
          lastCheckup: latestCheckup?.record_date
            ? new Date(latestCheckup.record_date).toLocaleDateString()
            : "Not Available",
        };
      });

      setPets(formattedPets);
    } catch (petsError) {
      console.error("Error loading pets:", petsError);
      setError(petsError?.message || "Unable to load pets.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPets = pets.filter((pet) => {
    const search = searchTerm.toLowerCase();

    return (
      (pet.name || "").toLowerCase().includes(search) ||
      (pet.species || "").toLowerCase().includes(search) ||
      (pet.breed || "").toLowerCase().includes(search) ||
      (pet.owner || "").toLowerCase().includes(search)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Manage Pets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of registered pets and health records.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Pet Directory ({filteredPets.length})
            </h2>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search pets..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="m-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading pets...
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No pets found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ps-table w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Pet Name</th>
                    <th className="px-6 py-3">Species & Breed</th>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3">Vaccination Status</th>
                    <th className="px-6 py-3">Last Checkup</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPets.map((pet) => (
                    <tr key={pet.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getPetPhoto(pet.photo_url)}
                            alt={pet.name || "Pet"}
                            className="h-11 w-11 rounded-full object-cover"
                            onError={(event) => {
                              console.error(
                                "Pet image failed:",
                                pet.name,
                                pet.photo_url,
                                event.currentTarget.src
                              );
                            }}
                          />
                          <span className="font-semibold text-slate-900">
                            {pet.name || "Unnamed Pet"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {pet.species || "Unknown"}
                        {pet.breed ? ` • ${pet.breed}` : ""}
                      </td>

                      <td className="px-6 py-4">{pet.owner}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            pet.vaccinationStatus === "Overdue"
                              ? "bg-red-50 text-red-700"
                              : pet.vaccinationStatus === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : pet.vaccinationStatus === "Records Available"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pet.vaccinationStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {pet.lastCheckup}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
