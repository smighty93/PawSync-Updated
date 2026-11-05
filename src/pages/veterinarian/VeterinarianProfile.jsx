import { useEffect, useState } from "react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

function Profile() {
  const { user, profile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
  });

  // --------------------------------------------------
  // LOAD PROFILE DATA
  // --------------------------------------------------

  useEffect(() => {
    if (profile || user) {
      setFormData({
        name: profile?.full_name || "",
        email: profile?.email || user?.email || "",
        phone: profile?.phone || "",
        specialization: profile?.specialization || "",
        experience:
          profile?.experience !== null &&
          profile?.experience !== undefined
            ? String(profile.experience)
            : "",
      });

      setLoading(false);
    }
  }, [profile, user]);

  // --------------------------------------------------
  // HANDLE INPUT
  // --------------------------------------------------

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // --------------------------------------------------
  // SAVE PROFILE
  // --------------------------------------------------

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("You are not logged in.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!formData.specialization.trim()) {
      setError("Specialization is required.");
      return;
    }

    if (
      formData.experience === "" ||
      Number(formData.experience) < 0
    ) {
      setError("Please enter a valid experience.");
      return;
    }

    try {
      setSaving(true);

      const { data, error: updateError } =
        await supabase
          .from("profiles")
          .update({
            full_name: formData.name.trim(),
            phone: formData.phone.trim(),
            specialization:
              formData.specialization.trim(),
            experience: Number(formData.experience),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      // Update local form with the actual saved data
      setFormData({
        name: data.full_name || "",
        email: data.email || user.email || "",
        phone: data.phone || "",
        specialization:
          data.specialization || "",
        experience:
          data.experience !== null &&
          data.experience !== undefined
            ? String(data.experience)
            : "",
      });

      setSuccess("Profile updated successfully.");
      setEditing(false);
    } catch (saveError) {
      console.error(
        "Error updating profile:",
        saveError
      );

      setError(
        saveError?.message ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <VetDashboardLayout>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500">
            Loading profile...
          </p>
        </div>
      </VetDashboardLayout>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <VetDashboardLayout>
      <div className="bg-white p-6 rounded-xl shadow">

        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          👤 My Profile
        </h1>

        {/* SUCCESS MESSAGE */}

        {success && (
          <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* VIEW PROFILE */}

        {!editing ? (
          <>
            <div className="border rounded-lg p-5 space-y-3">

              <p>
                <strong>Name:</strong>{" "}
                {formData.name || "Not provided"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {formData.email || "Not provided"}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {formData.phone || "Not provided"}
              </p>

              <p>
                <strong>Specialization:</strong>{" "}
                {formData.specialization ||
                  "Not provided"}
              </p>

              <p>
                <strong>Experience:</strong>{" "}
                {formData.experience
                  ? `${formData.experience} Years`
                  : "Not provided"}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {profile?.role || "Veterinarian"}
              </p>

            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setEditing(true);
              }}
              className="mt-5 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
            >
              Edit Profile
            </button>
          </>
        ) : (

          /* EDIT PROFILE */

          <div className="space-y-4">

            <div>
              <label htmlFor="ps-veterinarianprofile-field-25" className="block font-semibold text-gray-700 mb-1">
                Name
              </label>

              <input id="ps-veterinarianprofile-field-25"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="ps-veterinarianprofile-field-26" className="block font-semibold text-gray-700 mb-1">
                Email
              </label>

              <input id="ps-veterinarianprofile-field-26"
                type="email"
                value={formData.email}
                disabled
                className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />

              <p className="text-xs text-gray-500 mt-1">
                Email is managed by your account.
              </p>
            </div>

            <div>
              <label htmlFor="ps-veterinarianprofile-field-27" className="block font-semibold text-gray-700 mb-1">
                Phone
              </label>

              <input id="ps-veterinarianprofile-field-27"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="ps-veterinarianprofile-field-28" className="block font-semibold text-gray-700 mb-1">
                Specialization
              </label>

              <input id="ps-veterinarianprofile-field-28"
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label htmlFor="ps-veterinarianprofile-field-29" className="block font-semibold text-gray-700 mb-1">
                Experience
              </label>

              <input id="ps-veterinarianprofile-field-29"
                type="number"
                min="0"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                  setSuccess("");
                }}
                disabled={saving}
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>

            </div>
          </div>
        )}
      </div>
    </VetDashboardLayout>
  );
}

export default Profile;