import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, ArrowUpRight, HeartPulse, Syringe,
  CalendarDays, Dog, Heart, Shield,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import petsImage from "../../assets/pets-login.png";

// ─── Resolve photo URL from Supabase storage ──────────
function resolvePhoto(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  const { data } = supabase.storage.from("pet-photos").getPublicUrl(photoUrl);
  return data?.publicUrl || null;
}

// ─── Vaccination badge label ──────────────────────────
const VACC_LABELS = {
  fully_vaccinated:     "Fully Vaccinated",
  partially_vaccinated: "Partial",
  not_vaccinated:       "Not Vaccinated",
  unknown:              "Unknown",
};
const VACC_COLORS = {
  fully_vaccinated:     "bg-emerald-100 text-emerald-700",
  partially_vaccinated: "bg-amber-100 text-amber-700",
  not_vaccinated:       "bg-red-100 text-red-700",
  unknown:              "bg-slate-100 text-slate-500",
};

// ─── Pet Card ──────────────────────────────────────────
function PetCard({ pet, onClick }) {
  const photo = resolvePhoto(pet.photo_url);
  const vaccColor = VACC_COLORS[pet.vaccination_status] || VACC_COLORS.unknown;
  const vaccLabel = VACC_LABELS[pet.vaccination_status] || "Unknown";

  return (
    <button
      type="button"
      onClick={() => onClick(pet)}
      className="ps-new-pet-card text-left"
      aria-label={`View ${pet.name}'s profile`}
    >
      {photo ? (
        <img src={photo} alt={pet.name} className="ps-pet-card-photo" />
      ) : (
        <div className="ps-pet-card-photo-placeholder">
          <Dog size={48} strokeWidth={1.2} />
        </div>
      )}
      <div className="ps-pet-card-info">
        <p className="ps-pet-card-name">{pet.name}</p>
        <p className="ps-pet-card-breed">
          {pet.breed || pet.species || "Dog"}
        </p>
        <div className="ps-pet-card-badge">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${vaccColor}`}>
            {vaccLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Knowledge Card ────────────────────────────────────
function KnowledgeCard({ icon: Icon, iconBg, title, description }) {
  return (
    <div className="ps-knowledge-card">
      <div className="ps-knowledge-card-img" style={{ background: iconBg }}>
        <Icon size={40} strokeWidth={1.2} color="rgba(245,223,175,.7)" />
      </div>
      <div className="ps-knowledge-card-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────
function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [pets,  setPets]  = useState([]);
  const [stats, setStats] = useState({ pets: 0, appointments: 0, vaccinations: 0 });
  const [loading, setLoading] = useState(true);

  const firstName = (
    profile?.full_name || user?.user_metadata?.full_name || ""
  ).split(" ")[0] || "there";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;

      const [petsRes, apptsRes, vaccsRes] = await Promise.all([
        supabase.from("pets").select("*").eq("owner_id", u.id).order("created_at", { ascending: false }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).in(
          "pet_id",
          // subquery not supported — fetch pet IDs first
          []
        ),
        supabase.from("vaccinations").select("id", { count: "exact", head: true }).in("pet_id", []),
      ]);

      const petList = petsRes.data || [];
      const petIds  = petList.map((p) => p.id);

      // Re-fetch counts with actual pet IDs
      const [apptsCount, vaccsCount] = await Promise.all([
        petIds.length ? supabase.from("appointments").select("id", { count: "exact", head: true }).in("pet_id", petIds) : { count: 0 },
        petIds.length ? supabase.from("vaccinations").select("id", { count: "exact", head: true }).in("pet_id", petIds) : { count: 0 },
      ]);

      setPets(petList);
      setStats({
        pets:         petList.length,
        appointments: apptsCount.count || 0,
        vaccinations: vaccsCount.count || 0,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handlePetClick(pet) {
    navigate(`/pets/${pet.id}`);
  }

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content space-y-8">

        {/* ── HERO SECTION ──────────────────────────── */}
        <section className="ps-owner-hero">
          <div className="ps-hero-copy">
            <span className="ps-eyebrow">
              <HeartPulse size={13} className="inline mr-1" />
              PET HEALTHCARE PLATFORM
            </span>
            <h1>
              Welcome back,<br />
              {firstName}.
            </h1>
            <p>
              Everything your pets need, right here —
              health records, reminders and appointments.
            </p>

            {/* Stats */}
            <div className="ps-hero-stats">
              <div className="ps-hero-stat">
                <strong>{loading ? "…" : stats.pets}</strong>
                <span>Pets</span>
              </div>
              <div className="ps-hero-stat">
                <strong>{loading ? "…" : stats.appointments}</strong>
                <span>Appointments</span>
              </div>
              <div className="ps-hero-stat">
                <strong>{loading ? "…" : stats.vaccinations}</strong>
                <span>Vaccinations</span>
              </div>
            </div>

            <div className="ps-hero-actions">
              <Link to="/appointments" className="ps-hero-btn-primary">
                <CalendarDays size={15} />
                Book Appointment
              </Link>
              <Link to="/pets" className="ps-hero-btn-ghost">
                <Plus size={15} />
                Add a Pet
              </Link>
            </div>
          </div>

          <img
            src={petsImage}
            alt="Happy pets"
            className="ps-hero-image"
          />
        </section>

        {/* ── PET CARDS ─────────────────────────────── */}
        <div>
          <div className="ps-section-header">
            <h2 className="ps-section-title">My Pets</h2>
            <Link to="/pets" className="ps-view-all">View all →</Link>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">Loading your pets…</p>
            </div>
          ) : pets.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
              <Dog size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm mb-4">No pets yet. Add your first pet.</p>
              <Link to="/pets"
                className="inline-flex items-center gap-2 rounded-xl bg-[#062F4A] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#041F32]">
                <Plus size={16} /> Add Pet
              </Link>
            </div>
          ) : (
            <div className="ps-pet-card-grid">
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} onClick={handlePetClick} />
              ))}
            </div>
          )}
        </div>

        {/* ── PET HEALTHCARE KNOWLEDGE ──────────────── */}
        <div>
          <div className="ps-section-header">
            <h2 className="ps-section-title">Pet Healthcare Tips</h2>
          </div>
          <div className="ps-knowledge-grid">
            <KnowledgeCard
              icon={Syringe}
              iconBg="linear-gradient(135deg, #062F4A, #0a5080)"
              title="Staying Up to Date on Vaccinations"
              description="Regular vaccinations protect your pet from serious diseases. Keep a record of all administered vaccines and upcoming due dates."
            />
            <KnowledgeCard
              icon={Heart}
              iconBg="linear-gradient(135deg, #1a4a2e, #2a7a4e)"
              title="Nutrition and Healthy Weight"
              description="Maintaining a healthy weight is one of the most important things you can do for your pet's long-term health and mobility."
            />
            <KnowledgeCard
              icon={Shield}
              iconBg="linear-gradient(135deg, #4a2a0a, #7a4e1a)"
              title="Preventive Care and Check-ups"
              description="Annual wellness exams help detect health issues early. Regular dental care, parasite prevention and grooming all contribute to a longer, happier life."
            />
          </div>
        </div>

      </div>
    </OwnerDashboardLayout>
  );
}

export default Dashboard;
