import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Syringe,
  Pill,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";
import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import { supabase } from "../../lib/supabase";

// =====================================================
// HELPERS
// =====================================================

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysDiff(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(`${d}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function typeIcon(type) {
  if (type === "vaccination") return <Syringe size={18} />;
  if (type === "medication") return <Pill size={18} />;
  return <CalendarDays size={18} />;
}

function typeBg(type) {
  if (type === "vaccination") return "bg-green-100 text-green-600";
  if (type === "medication") return "bg-purple-100 text-purple-600";
  return "bg-blue-100 text-blue-600";
}

// =====================================================
// REMINDER CARD
// =====================================================

function ReminderCard({ reminder, onComplete }) {
  const diff = daysDiff(reminder.due_date);
  const isCompleted = reminder.status === "completed";
  const isOverdue = diff < 0 && !isCompleted;
  const isToday = diff === 0 && !isCompleted;

  return (
    <div
      className={`rounded-2xl border p-4 flex items-start gap-3 transition ${
        isCompleted
          ? "border-slate-100 bg-slate-50 opacity-60"
          : isOverdue
          ? "border-red-200 bg-red-50"
          : isToday
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className={`p-2 rounded-xl flex-shrink-0 ${typeBg(reminder.type)}`}>
        {typeIcon(reminder.type)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{reminder.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {reminder.pet_name} &bull; {formatDate(reminder.due_date)}
        </p>
        {reminder.notes && (
          <p className="text-xs text-slate-400 mt-1 truncate">{reminder.notes}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {!isCompleted && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isOverdue
                ? "bg-red-100 text-red-700"
                : isToday
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {isOverdue
              ? `${Math.abs(diff)}d overdue`
              : isToday
              ? "Today"
              : `In ${diff}d`}
          </span>
        )}

        {isCompleted ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
            <CheckCircle2 size={14} /> Done
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onComplete(reminder.id)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
          >
            <Check size={12} /> Mark done
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// SECTION
// =====================================================

function Section({ title, icon, reminders, onComplete, emptyText, color = "slate" }) {
  if (reminders.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-3">
          {icon}
          {title}
          <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            0
          </span>
        </h2>
        <p className="text-sm text-slate-400">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-3">
        {icon}
        {title}
        <span
          className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            color === "red"
              ? "bg-red-100 text-red-700"
              : color === "amber"
              ? "bg-amber-100 text-amber-700"
              : color === "green"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {reminders.length}
        </span>
      </h2>
      <div className="space-y-3">
        {reminders.map((r) => (
          <ReminderCard key={r.id} reminder={r} onComplete={onComplete} />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// REMINDERS PAGE
// =====================================================

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  // ===================================================
  // LOAD + SYNC REMINDERS
  // ===================================================

  const loadAndSync = useCallback(async (uid) => {
    try {
      // Get all pets for this owner
      const { data: pets, error: petsError } = await supabase
        .from("pets")
        .select("id, name")
        .eq("owner_id", uid);

      if (petsError) throw petsError;

      const petMap = {};
      (pets || []).forEach((p) => { petMap[p.id] = p.name; });
      const petIds = Object.keys(petMap);

      if (petIds.length === 0) {
        setReminders([]);
        return;
      }

      const todayStr = today();

      // Sync vaccination reminders (due + overdue)
      const { data: vaccinations } = await supabase
        .from("vaccinations")
        .select("id, pet_id, vaccine_name, next_due_date")
        .in("pet_id", petIds)
        .not("next_due_date", "is", null);

      // Sync appointment reminders (upcoming)
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, pet_id, reason, appointment_date, status")
        .in("pet_id", petIds)
        .in("status", ["pending", "confirmed"])
        .gte("appointment_date", new Date().toISOString());

      // Build upsert array — duplicate prevented by unique constraint
      const toUpsert = [];

      for (const v of vaccinations || []) {
        if (!v.next_due_date) continue;
        toUpsert.push({
          owner_id: uid,
          pet_id: v.pet_id,
          type: "vaccination",
          title: `${v.vaccine_name} vaccination`,
          due_date: v.next_due_date,
          source_id: v.id,
        });
      }

      for (const a of appointments || []) {
        const dueDate = a.appointment_date.split("T")[0];
        toUpsert.push({
          owner_id: uid,
          pet_id: a.pet_id,
          type: "appointment",
          title: a.reason || "Veterinary appointment",
          due_date: dueDate,
          source_id: a.id,
        });
      }

      if (toUpsert.length > 0) {
        // Use upsert with onConflict — the unique constraint prevents duplicates
        await supabase
          .from("reminders")
          .upsert(toUpsert, {
            onConflict: "owner_id,pet_id,type,title,due_date",
            ignoreDuplicates: true,
          });
      }

      // Load all reminders
      const { data: all, error: allError } = await supabase
        .from("reminders")
        .select("id, pet_id, type, title, due_date, status, notes, completed_at")
        .eq("owner_id", uid)
        .order("due_date", { ascending: true });

      if (allError) throw allError;

      // Attach pet names
      const withPets = (all || []).map((r) => ({
        ...r,
        pet_name: petMap[r.pet_id] || "Pet",
      }));

      setReminders(withPets);
    } catch (err) {
      console.error("Reminders load error:", err);
      throw err;
    }
  }, []);

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("Not logged in.");

        if (!mounted) return;

        setUserId(user.id);
        await loadAndSync(user.id);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load reminders.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, [loadAndSync]);

  // ===================================================
  // MARK COMPLETE
  // ===================================================

  async function handleComplete(id) {
    try {
      const { error: updateError } = await supabase
        .from("reminders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "completed" } : r
        )
      );
    } catch (err) {
      console.error("Mark complete error:", err);
    }
  }

  // ===================================================
  // MANUAL SYNC
  // ===================================================

  async function handleSync() {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      await loadAndSync(userId);
    } catch (err) {
      setError(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  // ===================================================
  // CATEGORISE
  // ===================================================

  const todayStr = today();
  const overdue = reminders.filter(
    (r) => r.status === "pending" && r.due_date < todayStr
  );
  const todayReminders = reminders.filter(
    (r) => r.status === "pending" && r.due_date === todayStr
  );
  const upcoming = reminders.filter(
    (r) => r.status === "pending" && r.due_date > todayStr
  );
  const completed = reminders.filter((r) => r.status === "completed");

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <OwnerDashboardLayout>
      <div className="ps-page-content">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Health Reminders
            </h1>
            <p className="mt-2 text-slate-500">
              Vaccinations, medications and appointments.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Reminders"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center h-48">
            <p className="text-slate-500">Loading reminders...</p>
          </div>
        ) : (
          <div className="mt-8">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{overdue.length}</p>
                <p className="text-xs text-red-600 mt-0.5">Overdue</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{todayReminders.length}</p>
                <p className="text-xs text-amber-600 mt-0.5">Today</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{upcoming.length}</p>
                <p className="text-xs text-blue-600 mt-0.5">Upcoming</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{completed.length}</p>
                <p className="text-xs text-green-600 mt-0.5">Completed</p>
              </div>
            </div>

            <Section
              title="Overdue"
              icon={<AlertTriangle size={16} className="text-red-600" />}
              reminders={overdue}
              onComplete={handleComplete}
              emptyText="No overdue reminders."
              color="red"
            />

            <Section
              title="Today"
              icon={<Clock size={16} className="text-amber-600" />}
              reminders={todayReminders}
              onComplete={handleComplete}
              emptyText="Nothing due today."
              color="amber"
            />

            <Section
              title="Upcoming"
              icon={<Bell size={16} className="text-blue-600" />}
              reminders={upcoming}
              onComplete={handleComplete}
              emptyText="No upcoming reminders."
              color="blue"
            />

            <Section
              title="Completed"
              icon={<CheckCircle2 size={16} className="text-green-600" />}
              reminders={completed}
              onComplete={handleComplete}
              emptyText="No completed reminders yet."
              color="green"
            />
          </div>
        )}
      </div>
    </OwnerDashboardLayout>
  );
}

export default Reminders;
