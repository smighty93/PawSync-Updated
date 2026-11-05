import { useEffect, useState } from "react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    address: "",
  });

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

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setProfile({
        full_name:
          data?.full_name ||
          user.user_metadata?.full_name ||
          "",
        address: data?.address || "",
      });
    } catch (err) {
      console.error("Profile loading error:", err);

      setError(
        err.message || "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          address: profile.address.trim(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setMessage("Profile updated successfully.");

      await loadProfile();
    } catch (err) {
      console.error("Profile update error:", err);

      setError(
        err.message || "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <OwnerDashboardLayout>
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Profile
          </h1>

          <p className="mt-6 text-slate-500">
            Loading your profile...
          </p>
        </div>
      </OwnerDashboardLayout>
    );
  }

  return (
    <OwnerDashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        {/* Header */}

        <h1 className="text-3xl font-bold text-slate-900">
          Profile
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your PawSync profile.
        </p>

        {/* Error */}

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* Success */}

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-green-600">
              {message}
            </p>
          </div>
        )}

        {/* Profile Form */}

        <form
          onSubmit={handleSave}
          className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">
            Personal Information
          </h2>

          <div className="mt-6">
            {/* Full Name */}

            <label htmlFor="ps-profile-field-1" className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name
            </label>

            <input id="ps-profile-field-1"
              type="text"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Address */}

          <div className="mt-6">
            <label htmlFor="ps-profile-field-2" className="block text-sm font-semibold text-slate-700 mb-2">
              Address
            </label>

            <textarea id="ps-profile-field-2"
              name="address"
              value={profile.address}
              onChange={handleChange}
              placeholder="Enter your address"
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Save */}

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </OwnerDashboardLayout>
  );
}

export default Profile;