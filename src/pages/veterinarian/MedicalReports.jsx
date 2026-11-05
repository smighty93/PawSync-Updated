
import { useEffect, useState } from "react";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import { supabase } from "../../lib/supabase";
function getPetPhoto(photoPath) {
  if (!photoPath) return "/default-pet.png";

  const { data } = supabase.storage
    .from("pet-photos")
    .getPublicUrl(photoPath);

  return data.publicUrl;
}
function MedicalReports() {
  const [patients, setPatients] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [document, setDocument] = useState(null);

  const [form, setForm] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    symptoms: "",
    diagnosis: "",
    treatment: "",
    prescription: "",
    medication_instructions: "",
    notes: "",
    follow_up_date: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      loadReports(selectedPet);
    } else {
      setReports([]);
    }
  }, [selectedPet]);

  async function loadPatients() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      const { data, error: appointmentError } =
        await supabase
          .from("appointments")
          .select(`
            pet_id,
            pets (
              id,
              name,
              species,
              breed,
              owner_id,
              photo_url
            )
          `)
          .eq("veterinarian_id", user.id)
          .order("appointment_date", { ascending: false });

      if (appointmentError) throw appointmentError;

      const uniquePets = [
        ...new Map(
          (data || [])
            .filter((item) => item.pets)
            .map((item) => [item.pets.id, item.pets])
        ).values(),
      ];

      setPatients(uniquePets);

      if (uniquePets.length > 0) {
        setSelectedPet(uniquePets[0].id);
      }
    } catch (err) {
      console.error("Patient loading error:", err);
      setError(err.message || "Unable to load patients.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReports(petId) {
    setError("");

    try {
  const { data, error: reportsError } =
    await supabase
      .from("medical_records")
      .select(`
        id,
        pet_id,
        veterinarian_id,
        veterinarian_name,
        record_type,
        record_date,
        symptoms,
        diagnosis,
        treatment,
        prescription,
        medication_instructions,
        notes,
        follow_up_date,
        document_url,
        created_at,
        pets (
          id,
          name,
          species,
          breed,
          photo_url
        )
      `)
      .eq("pet_id", petId)
      .order("record_date", { ascending: false });

  if (reportsError) throw reportsError;

  setReports(data || []);

} catch (err) {
  console.error("Medical history error:", err);
  setError(err.message || "Unable to load medical history.");
}
  }
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedPet) {
      setError("Please select a patient.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let uploadedPath = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      const pet = patients.find(
        (item) => item.id === selectedPet
      );

      if (!pet) throw new Error("Selected patient not found.");

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      // Upload optional document
      if (document) {
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        if (!allowedTypes.includes(document.type)) {
          throw new Error("Only PDF, JPG, PNG and WEBP files are allowed.");
        }

        if (document.size > 10 * 1024 * 1024) {
          throw new Error("Document must be smaller than 10 MB.");
        }

        const safeName = document.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const filePath =
          `${pet.owner_id}/${pet.id}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("medical-documents")
          .upload(filePath, document, {
            contentType: document.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedPath = filePath;
      }

      // Insert a NEW report. Existing reports are never updated.
      const { error: insertError } = await supabase
        .from("medical_records")
        .insert({
          pet_id: pet.id,
          veterinarian_id: user.id,
          veterinarian_name: profile.full_name,
          record_type: "consultation",
          record_date: form.record_date,
          symptoms: form.symptoms,
          diagnosis: form.diagnosis,
          treatment: form.treatment,
          prescription: form.prescription,
          medication_instructions: form.medication_instructions,
          notes: form.notes,
          follow_up_date: form.follow_up_date || null,
          document_url: uploadedPath,
        });

      if (insertError) throw insertError;

      setSuccess("New consultation report saved successfully.");

      setForm({
        record_date: new Date().toISOString().slice(0, 10),
        symptoms: "",
        diagnosis: "",
        treatment: "",
        prescription: "",
        medication_instructions: "",
        notes: "",
        follow_up_date: "",
      });

      setDocument(null);
      setShowForm(false);

      await loadReports(selectedPet);
    } catch (err) {
      console.error("Report saving error:", err);

      // Remove uploaded file if the database insert failed
      if (uploadedPath) {
        await supabase.storage
          .from("medical-documents")
          .remove([uploadedPath]);
      }

      setError(err.message || "Unable to save consultation report.");
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(path) {
    if (!path) return;

    const { data, error: urlError } = await supabase.storage
      .from("medical-documents")
      .createSignedUrl(path, 60);

    if (urlError) {
      setError(urlError.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const selectedPatient = patients.find(
    (pet) => pet.id === selectedPet
  );

  function formatDate(date) {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <VetDashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Medical Reports
            </h1>
            <p className="mt-1 text-slate-500">
              View patient history and add new consultation reports.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            disabled={!selectedPet}
            className="rounded-xl bg-[#062F4A] px-5 py-3 font-semibold text-white hover:bg-[#0B496B] disabled:opacity-50"
          >
            {showForm ? "Close Form" : "+ Add Check-up Report"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}

        {/* PATIENT SELECTOR */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <label className="mb-2 block font-semibold text-slate-700">
            Select Patient
          </label>

          {loading ? (
            <p className="text-slate-500">Loading patients...</p>
          ) : patients.length === 0 ? (
            <p className="text-slate-500">
              No patients with appointments assigned to you.
            </p>
          ) : (
            <select
              value={selectedPet}
              onChange={(e) => {
                setSelectedPet(e.target.value);
                setShowForm(false);
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-700 outline-none focus:border-[#062F4A]"
            >
              {patients.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} — {pet.species} ({pet.breed || "Unknown breed"})
                </option>
              ))}
            </select>
          )}

          {selectedPatient && (
  <div className="mt-4 flex items-center gap-4 rounded-lg bg-slate-50 p-4">
    <img
      src={getPetPhoto(selectedPatient.photo_url)}
      alt={selectedPatient.name}
      className="h-20 w-20 rounded-xl object-cover"
    />

    <div>
      <p className="font-semibold text-slate-800">
        {selectedPatient.name}
      </p>
      <p className="text-sm text-slate-500">
        {selectedPatient.species} · {selectedPatient.breed}
      </p>
    </div>
  </div>
)}
             
        </div>

        {/* NEW CONSULTATION FORM */}
        {showForm && selectedPatient && (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                New Check-up Report
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Adding a new report for {selectedPatient.name}.
                Previous reports will remain unchanged.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Consultation Date *
                </label>
                <input
                  type="date"
                  name="record_date"
                  value={form.record_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  name="follow_up_date"
                  value={form.follow_up_date}
                  onChange={handleChange}
                  min={form.record_date}
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            {[
              ["symptoms", "Symptoms", "Describe the symptoms observed..."],
              ["diagnosis", "Diagnosis", "Enter the diagnosis..."],
              ["treatment", "Treatment Provided", "Describe the treatment..."],
              ["prescription", "Prescription", "Enter prescribed medicines..."],
              ["medication_instructions", "Medication Instructions", "Dosage, frequency and duration..."],
              ["notes", "Additional Notes", "Other observations or recommendations..."],
            ].map(([name, label, placeholder]) => (
              <div key={name}>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {label}
                </label>
                <textarea
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-[#062F4A]"
                />
              </div>
            ))}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Upload Prescription / Medical Document
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setDocument(e.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-slate-200 p-3"
              />
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG or WEBP · Maximum 10 MB
              </p>
              {document && (
                <p className="mt-2 text-sm text-slate-600">
                  Selected: {document.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#062F4A] px-6 py-3 font-semibold text-white hover:bg-[#0B496B] disabled:opacity-50"
              >
                {saving ? "Saving Report..." : "Save New Report"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-6 py-3 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* MEDICAL HISTORY */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-800">
              Previous Medical History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All available consultations for the selected patient.
            </p>
          </div>

          {!selectedPet ? (
            <p className="text-slate-500">Select a patient to view history.</p>
          ) : reports.length === 0 ? (
            <p className="py-6 text-center text-slate-500">
              No previous medical reports found.
            </p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-center gap-3">
  <img
  src={getPetPhoto(report.pets?.photo_url)}
    alt={report.pets?.name || "Pet"}
    className="h-14 w-14 rounded-full object-cover"
  />

  <div>
    <p className="font-semibold text-slate-800">
      {report.pets?.name || selectedPatient?.name}
    </p>

    <p className="text-sm text-slate-500">
      {report.diagnosis || "Medical Consultation"}
    </p>

    <p className="mt-1 text-sm text-slate-500">
      {formatDate(report.record_date)}
    </p>
  </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {report.diagnosis || "Medical Consultation"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(report.record_date)}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Saved Report
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      ["Symptoms", report.symptoms],
                      ["Treatment", report.treatment],
                      ["Prescription", report.prescription],
                      ["Medication Instructions", report.medication_instructions],
                      ["Additional Notes", report.notes],
                      ["Follow-up Date", formatDate(report.follow_up_date)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          {label}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {report.veterinarian_name && (
                    <p className="mt-4 text-sm text-slate-500">
                      Recorded by: {report.veterinarian_name}
                    </p>
                  )}

                  {report.document_url && (
                    <button
                      onClick={() => openDocument(report.document_url)}
                      className="mt-4 text-sm font-semibold text-blue-700 underline"
                    >
                      View attached medical document
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </VetDashboardLayout>
  );
}

export default MedicalReports;
