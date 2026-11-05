import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Settings() {
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const {
        data,
        error: settingsError,
      } = await supabase
        .from("platform_settings")
        .select("id, platform_name, support_email")
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      if (data) {
        setPlatformName(data.platform_name || "");
        setSupportEmail(data.support_email || "");
      }
    } catch (err) {
      console.error(
        "Error loading platform settings:",
        err
      );

      setError(
        err.message ||
          "Unable to load platform settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!platformName.trim()) {
        setError("Platform name is required.");
        return;
      }

      if (!supportEmail.trim()) {
        setError("Support email is required.");
        return;
      }

      const {
        data: existingSettings,
        error: findError,
      } = await supabase
        .from("platform_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      let saveError;

      if (existingSettings?.id) {
        const { error } = await supabase
          .from("platform_settings")
          .update({
            platform_name: platformName.trim(),
            support_email: supportEmail.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSettings.id);

        saveError = error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert({
            platform_name: platformName.trim(),
            support_email: supportEmail.trim(),
          });

        saveError = error;
      }

      if (saveError) {
        throw saveError;
      }

      setSuccess(
        "Platform configuration saved successfully."
      );
    } catch (err) {
      console.error(
        "Error saving platform settings:",
        err
      );

      setError(
        err.message ||
          "Unable to save platform settings."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Platform Settings
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Configure PawSync network controls and
            preferences.
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 space-y-6">

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading settings...
              </div>
            </div>
          ) : (
            <>
              {/* General Configuration */}
              <div>
                <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3">
                  General Configuration
                </h2>

                <div className="mt-4 space-y-4">

                  {/* Platform Name */}
                  <div>
                    <label htmlFor="ps-settings-field-18" className="block text-sm font-medium text-slate-700">
                      Platform Name
                    </label>

                    <input id="ps-settings-field-18"
                      type="text"
                      value={platformName}
                      onChange={(event) =>
                        setPlatformName(
                          event.target.value
                        )
                      }
                      className="mt-1 w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Support Email */}
                  <div>
                    <label htmlFor="ps-settings-field-19" className="block text-sm font-medium text-slate-700">
                      Support Contact Email
                    </label>

                    <input id="ps-settings-field-19"
                      type="email"
                      value={supportEmail}
                      onChange={(event) =>
                        setSupportEmail(
                          event.target.value
                        )
                      }
                      className="mt-1 w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* Save */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}