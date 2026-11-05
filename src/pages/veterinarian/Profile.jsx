import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import DashboardLayout from "../../components/layout/DashboardLayout";

function Profile() {
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          phone,
          specialization,
          experience,
          created_at,
          updated_at
        `)
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(data);

      setFormData({
        full_name: data.full_name || "",
        email: data.email || user.email || "",
        phone: data.phone || "",
        specialization: data.specialization || "",
        experience:
          data.experience !== null &&
          data.experience !== undefined
            ? String(data.experience)
            : "",
      });
    } catch (err) {
      console.error("Error loading profile:", err);

      setError(
        err.message || "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCancel() {
    if (!profile) return;

    setFormData({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      specialization: profile.specialization || "",
      experience:
        profile.experience !== null &&
        profile.experience !== undefined
          ? String(profile.experience)
          : "",
    });

    setEditing(false);
    setError("");
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const experienceValue =
        formData.experience === ""
          ? null
          : Number(formData.experience);

      if (
        experienceValue !== null &&
        (!Number.isInteger(experienceValue) ||
          experienceValue < 0)
      ) {
        throw new Error(
          "Experience must be a valid number of years."
        );
      }

      const updates = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        specialization:
          formData.specialization.trim(),
        experience: experienceValue,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);

      setFormData({
        full_name: data.full_name || "",
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

      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Error updating profile:", err);

      setError(
        err.message || "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-gray-500">
            Loading profile...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-md p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              👤 My Profile
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your veterinarian profile information.
            </p>
          </div>
        </div>

        {/* Success message */}
        {message && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!profile ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-gray-500">
            Profile information could not be found.
          </div>
        ) : !editing ? (
          <>
            {/* Profile details */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-200">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Name
                  </span>

                  <span className="md:col-span-2 text-gray-800">
                    {profile.full_name || "Not provided"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Email
                  </span>

                  <span className="md:col-span-2 text-gray-800">
                    {profile.email || "Not provided"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Phone
                  </span>

                  <span className="md:col-span-2 text-gray-800">
                    {profile.phone || "Not provided"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Specialization
                  </span>

                  <span className="md:col-span-2 text-gray-800">
                    {profile.specialization ||
                      "Not provided"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Experience
                  </span>

                  <span className="md:col-span-2 text-gray-800">
                    {profile.experience !== null &&
                    profile.experience !== undefined
                      ? `${profile.experience} ${
                          profile.experience === 1
                            ? "Year"
                            : "Years"
                        }`
                      : "Not provided"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                  <span className="font-semibold text-gray-600">
                    Role
                  </span>

                  <span className="md:col-span-2 capitalize text-gray-800">
                    {profile.role || "Veterinarian"}
                  </span>
                </div>

              </div>
            </div>

            {/* Edit button */}
            <div className="mt-6">
              <button
                onClick={() => {
                  setEditing(true);
                  setMessage("");
                  setError("");
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                Edit Profile
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit form */}
            <div className="space-y-5">

              {/* Full name */}
              <div>
                <label htmlFor="ps-profile-field-20" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>

                <input id="ps-profile-field-20"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="ps-profile-field-21" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>

                <input id="ps-profile-field-21"
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed"
                />

                <p className="text-xs text-gray-500 mt-1">
                  Email is managed by your authentication
                  account.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="ps-profile-field-22" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>

                <input id="ps-profile-field-22"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Specialization */}
              <div>
                <label htmlFor="ps-profile-field-23" className="block text-sm font-semibold text-gray-700 mb-2">
                  Specialization
                </label>

                <input id="ps-profile-field-23"
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="Veterinary Surgeon"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Experience */}
              <div>
                <label htmlFor="ps-profile-field-24" className="block text-sm font-semibold text-gray-700 mb-2">
                  Experience (Years)
                </label>

                <input id="ps-profile-field-24"
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  placeholder="8"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-7">

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                onClick={handleCancel}
                disabled={saving}
                className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg transition"
              >
                Cancel
              </button>

            </div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

export default Profile;