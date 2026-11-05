import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Syringe, FileText, Scale, CalendarDays,
  ShieldCheck, AlertCircle, Dog, CheckCircle2, Clock,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

// ─── Resolve Supabase Storage URL ─────────────────────
function resolvePhoto(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  const { data } = supabase.storage.from("pet-photos").getPublicUrl(photoUrl);
  return data?.publicUrl || null;
}

// ─── Simple SVG weight chart ───────────────────────────
function MiniWeightChart({ entries }) {
  if (!entries || entries.length < 2) return null;
  const W = 340, H = 80;
  const PAD = { t: 8, r: 8, b: 20, l: 36 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const weights = entries.map((e) => parseFloat(e.weight_kg));
  const minW = Math.min(...weights), maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const sx = (i) => PAD.l + (i / (entries.length - 1)) * cW;
  const sy = (w) => PAD.t + cH - ((w - minW) / range) * cH;
  const pts = entries.map((e, i) => `${sx(i)},${sy(parseFloat(e.weight_kg))}`).join(" ");
  const area = [`${sx(0)},${PAD.t + cH}`,
    ...entries.map((e, i) => `${sx(i)},${sy(parseFloat(e.weight_kg))}`),
    `${sx(entries.length - 1)},${PAD.t + cH}`].join(" ");
  const fmt = (s) => new Date(`${s}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 90 }} role="img" aria-label="Weight chart">
      <polygon points={area} fill="#dbeafe" opacity=".5" />
      <polyline points={pts} fill="none" stroke="#062F4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {entries.map((e, i) => <circle key={i} cx={sx(i)} cy={sy(parseFloat(e.weight_kg))} r="3" fill="#062F4A" stroke="white" strokeWidth="1.5" />)}
      <text x={sx(0)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{fmt(entries[0].recorded_at)}</text>
      <text x={sx(entries.length - 1)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{fmt(entries[entries.length - 1].recorded_at)}</text>
    </svg>
  );
}

const VACC_COLORS = {
  fully_vaccinated:     "bg-emerald-100 text-emerald-700",
  partially_vaccinated: "bg-amber-100 text-amber-700",
  not_vaccinated:       "bg-red-100 text-red-700",
  unknown:              "bg-slate-100 text-slate-600",
};
const VACC_LABELS = {
  fully_vaccinated:     "Fully Vaccinated",
  partially_vaccinated: "Partially Vaccinated",
  not_vaccinated:       "Not Vaccinated",
  unknown:              "Unknown",
};

function fmt(d) {
  if (!d) return "—";
  return new Date(`${d}T00:00:00`).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

// ─── Section card ──────────────────────────────────────
function Card({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-[#0B3048] flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Icon size={16} className={iconColor} />
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Pet Profile Page ──────────────────────────────────
function PetProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pet,     setPet]     = useState(null);
  const [weights, setWeights] = useState([]);
  const [vaccins, setVaccins] = useState([]);
  const [records, setRecords] = useState([]);
  const [apts,    setApts]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue) throw ue;
      if (!user) throw new Error("Not logged in.");

      // Verify ownership
      const { data: petData, error: pe } = await supabase
        .from("pets").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
      if (pe) throw pe;
      if (!petData) throw new Error("Pet not found or access denied.");
      setPet(petData);

      const [wRes, vRes, rRes, aRes] = await Promise.all([
        supabase.from("pet_weights").select("id,weight_kg,recorded_at,notes")
          .eq("pet_id", id).order("recorded_at", { ascending: true }),
        supabase.from("vaccinations").select("id,vaccine_name,vaccination_date,next_due_date,status")
          .eq("pet_id", id).order("vaccination_date", { ascending: false }),
        supabase.from("medical_records").select("id,record_date,record_type,diagnosis,treatment,veterinarian_name")
          .eq("pet_id", id).order("record_date", { ascending: false }).limit(6),
        supabase.from("appointments").select("id,appointment_date,reason,status")
          .eq("pet_id", id).order("appointment_date", { ascending: true }).limit(5),
      ]);

      setWeights(wRes.data || []);
      setVaccins(vRes.data || []);
      setRecords(rRes.data || []);
      setApts(aRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load pet profile.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <OwnerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Loading pet profile…</p>
        </div>
      </OwnerDashboardLayout>
    );
  }

  if (error || !pet) {
    return (
      <OwnerDashboardLayout>
        <div className="mt-10 rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <p className="text-red-500 mb-4">{error || "Pet not found."}</p>
          <button type="button" onClick={() => navigate("/pets")}
            className="rounded-xl bg-[#062F4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#041F32]">
            Back to My Pets
          </button>
        </div>
      </OwnerDashboardLayout>
    );
  }

  const photo = resolvePhoto(pet.photo_url);
  const latest   = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const weightDiff = latest && previous
    ? (parseFloat(latest.weight_kg) - parseFloat(previous.weight_kg)).toFixed(2)
    : null;
  const overdueVaccins = vaccins.filter((v) =>
    v.next_due_date && new Date(`${v.next_due_date}T00:00:00`) < new Date()
  );

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content space-y-6">

        {/* Back nav */}
        <button type="button" onClick={() => navigate("/pets")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#062F4A] transition mb-2">
          <ArrowLeft size={16} /> Back to My Pets
        </button>

        {/* ── Pet hero card ──────────────────────────── */}
        <div className="rounded-2xl bg-[#062F4A] overflow-hidden flex flex-col sm:flex-row min-h-[200px]">
          {/* Photo */}
          <div className="sm:w-64 flex-shrink-0 bg-[#041F32] flex items-center justify-center overflow-hidden">
            {photo ? (
              <img src={photo} alt={pet.name} className="w-full h-full object-cover object-top" style={{ minHeight: 200 }} />
            ) : (
              <Dog size={64} strokeWidth={1} color="rgba(245,223,175,.4)" />
            )}
          </div>
          {/* Info */}
          <div className="flex-1 p-7">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-white letter-spacing-tight">{pet.name}</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  {pet.species}{pet.breed ? ` • ${pet.breed}` : ""}{pet.gender ? ` • ${pet.gender}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${VACC_COLORS[pet.vaccination_status] || VACC_COLORS.unknown}`}>
                {VACC_LABELS[pet.vaccination_status] || "Unknown"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ["Date of Birth", fmt(pet.date_of_birth)],
                ["Weight", pet.weight ? `${pet.weight} kg` : "—"],
                ["Microchip", pet.microchip_id || "—"],
                ["Neutered", pet.is_neutered ? "Yes" : "No"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-white/90">{val}</p>
                </div>
              ))}
            </div>

            {overdueVaccins.length > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-red-500/20 text-red-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <AlertCircle size={13} />
                {overdueVaccins.length} vaccination{overdueVaccins.length > 1 ? "s" : ""} overdue
              </div>
            )}
          </div>
        </div>

        {/* ── Conditions / allergies ─────────────────── */}
        {(pet.allergies || pet.medical_conditions || pet.special_notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pet.allergies && (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-sm">
                <p className="font-bold text-orange-700 mb-1 flex items-center gap-1.5">
                  <AlertCircle size={13} /> Allergies
                </p>
                <p className="text-orange-600">{pet.allergies}</p>
              </div>
            )}
            {pet.medical_conditions && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm">
                <p className="font-bold text-red-700 mb-1 flex items-center gap-1.5">
                  <AlertCircle size={13} /> Medical Conditions
                </p>
                <p className="text-red-600">{pet.medical_conditions}</p>
              </div>
            )}
            {pet.special_notes && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm sm:col-span-2">
                <p className="font-bold text-slate-600 mb-1">Notes</p>
                <p className="text-slate-600">{pet.special_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Main grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Weight */}
          <Card title="Weight History" icon={Scale} iconColor="text-blue-500">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-400">Current</p>
                <p className="text-xl font-bold text-[#0B3048]">{latest ? `${latest.weight_kg} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Previous</p>
                <p className="text-xl font-bold text-[#0B3048]">{previous ? `${previous.weight_kg} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Change</p>
                <p className={`text-xl font-bold ${weightDiff === null ? "text-slate-400" : parseFloat(weightDiff) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {weightDiff === null ? "—" : parseFloat(weightDiff) > 0 ? `+${weightDiff} kg` : `${weightDiff} kg`}
                </p>
              </div>
            </div>
            <MiniWeightChart entries={weights} />
            {weights.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No weight records yet.</p>
            )}
            <Link to="/analytics" className="mt-3 block text-xs text-[#062F4A] font-semibold hover:underline text-right">
              Manage in Health Analytics →
            </Link>
          </Card>

          {/* Vaccinations */}
          <Card title="Vaccinations" icon={Syringe} iconColor="text-green-500">
            {vaccins.length === 0 ? (
              <p className="text-xs text-slate-400">No vaccination records.</p>
            ) : (
              <div className="space-y-2">
                {vaccins.slice(0, 5).map((v) => {
                  const overdue = v.next_due_date && new Date(`${v.next_due_date}T00:00:00`) < new Date();
                  return (
                    <div key={v.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-700 font-medium text-xs">{v.vaccine_name}</span>
                      <div className="flex gap-2 text-xs">
                        {v.vaccination_date && <span className="text-slate-400">{fmt(v.vaccination_date)}</span>}
                        {v.next_due_date && (
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            Due: {fmt(v.next_due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Medical Records */}
          <Card title="Recent Medical Records" icon={FileText} iconColor="text-purple-500">
            {records.length === 0 ? (
              <p className="text-xs text-slate-400">No medical records.</p>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={13} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{r.diagnosis || "Visit"}</p>
                      {r.veterinarian_name && <p className="text-xs text-slate-400 truncate">{r.veterinarian_name}</p>}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{fmt(r.record_date)}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/medical-records" className="mt-3 block text-xs text-[#062F4A] font-semibold hover:underline text-right">
              View all records →
            </Link>
          </Card>

          {/* Upcoming Appointments */}
          <Card title="Appointments" icon={CalendarDays} iconColor="text-blue-500">
            {apts.length === 0 ? (
              <p className="text-xs text-slate-400">No upcoming appointments.</p>
            ) : (
              <div className="space-y-2">
                {apts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 border-b border-slate-100 pb-2 last:border-0">
                    <Clock size={13} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.reason || "Appointment"}</p>
                      <p className="text-xs text-slate-400">{new Date(a.appointment_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <span className={`rounded-full text-xs px-2 py-0.5 font-semibold ${a.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/appointments" className="mt-3 block text-xs text-[#062F4A] font-semibold hover:underline text-right">
              Manage appointments →
            </Link>
          </Card>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 flex-wrap">
          {[
            ["/reminders",  "View Reminders"],
            ["/timeline",   "Medical Timeline"],
            ["/analytics",  "Health Analytics"],
          ].map(([to, label]) => (
            <Link key={to} to={to}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#062F4A] hover:bg-slate-50 hover:border-[#062F4A]/30 transition">
              {label}
            </Link>
          ))}
        </div>

      </div>
    </OwnerDashboardLayout>
  );
}

export default PetProfile;
