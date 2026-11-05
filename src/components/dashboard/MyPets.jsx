import PetPortrait from "../ui/PetPortrait";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function MyPets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPets();
  }, []);

  async function loadPets() {
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
        setPets([]);
        return;
      }

      const { data, error: petsError } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (petsError) {
        throw petsError;
      }

      setPets(data || []);
    } catch (err) {
      console.error("Error loading pets:", err);
      setError(err.message || "Failed to load pets.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ps-pet-section">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-slate-900">
          My Pets
        </h2>

        <Link
          to="/pets"
          className="text-blue-600 font-semibold hover:text-blue-700"
        >
          View All
        </Link>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-slate-500">
            Loading your pets...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-600">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && pets.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-slate-600">
            You haven't added any pets yet.
          </p>

          <Link
            to="/pets"
            className="inline-block mt-4 text-blue-600 font-semibold hover:text-blue-700"
          >
            Add your first pet →
          </Link>
        </div>
      )}

      {!loading && !error && pets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="ps-pet-card bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <PetPortrait pet={pet} />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {pet.name}
                  </h3>

                  <p className="text-slate-500 mt-1">
                    {pet.species || "Pet"}
                    {pet.breed ? ` • ${pet.breed}` : ""}
                  </p>
                </div>

                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                  🐾
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                {pet.gender && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">
                      Gender
                    </span>

                    <span className="font-semibold text-slate-700">
                      {pet.gender}
                    </span>
                  </div>
                )}

                {pet.date_of_birth && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">
                      Date of Birth
                    </span>

                    <span className="font-semibold text-slate-700">
                      {pet.date_of_birth}
                    </span>
                  </div>
                )}

                {pet.weight !== null &&
                  pet.weight !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Weight
                      </span>

                      <span className="font-semibold text-slate-700">
                        {pet.weight}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPets;