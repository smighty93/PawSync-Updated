import ResponsivePage from "../components/ui/ResponsivePage";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =====================================================
// AUTH
// =====================================================

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import { useAuth } from "../context/AuthContext";

// =====================================================
// OWNER - MOBILE
// =====================================================

import OwnerMobileDashboard from "../pages/owner/OwnerMobileDashboard";

// =====================================================
// OWNER - DESKTOP
// =====================================================

import OwnerDashboard from "../pages/owner/Dashboard";
import Pets from "../pages/owner/Pets";
import Appointments from "../pages/owner/Appointments";
import MedicalRecords from "../pages/owner/MedicalRecords";
import Profile from "../pages/owner/Profile";
import OwnerAnalytics from "../pages/owner/Analytics";
import Reminders from "../pages/owner/Reminders";
import Timeline from "../pages/owner/Timeline";
import PetProfile from "../pages/owner/PetProfile";

// =====================================================
// VETERINARIAN - MOBILE
// =====================================================

import VaccinationsMobile from "../pages/veterinarian/VaccinationsMobile";
import TodaysAppointmentsMobile from "../pages/veterinarian/TodaysAppointmentsMobile";
import VeterinarianProfileMobile from "../pages/veterinarian/VeterinarianProfileMobile";
import PrescriptionsMobile from "../pages/veterinarian/PrescriptionsMobile";
import PatientRecordsMobile from "../pages/veterinarian/PatientRecordsMobile";
import MedicalReportsMobile from "../pages/veterinarian/MedicalReportsMobile";
import AppointmentsMobile from "../pages/veterinarian/AppointmentsMobile";
import VetMobileDashboard from "../pages/veterinarian/VetMobileDashboard";

// =====================================================
// VETERINARIAN - DESKTOP
// =====================================================

import VeterinarianDashboard from "../pages/veterinarian/Dashboard";
import VeterinarianAppointments from "../pages/veterinarian/Appointments";
import VeterinarianMedicalReports from "../pages/veterinarian/MedicalReports";
import VeterinarianPatientRecords from "../pages/veterinarian/PatientRecords";
import VeterinarianPrescriptions from "../pages/veterinarian/Prescriptions";
import VeterinarianTodaysAppointments from "../pages/veterinarian/TodaysAppointments";
import VeterinarianVaccinations from "../pages/veterinarian/Vaccinations";
import VeterinarianProfile from "../pages/veterinarian/VeterinarianProfile";

// =====================================================
// ADMIN - MOBILE
// =====================================================

import SettingsMobile from "../pages/admin/SettingsMobile";
import ReportsMobile from "../pages/admin/ReportsMobile";
import ProfileMobile from "../pages/admin/ProfileMobile";
import NotificationsMobile from "../pages/admin/NotificationsMobile";
import ManageVeterinariansMobile from "../pages/admin/ManageVeterinariansMobile";
import ManageUsersMobile from "../pages/admin/ManageUsersMobile";
import ManagePetsMobile from "../pages/admin/ManagePetsMobile";
import AnalyticsMobile from "../pages/admin/AnalyticsMobile";
import AdminMobileDashboard from "../pages/admin/AdminMobileDashboard";

// =====================================================
// ADMIN - DESKTOP
// =====================================================

import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import ManagePets from "../pages/admin/ManagePets";
import ManageVeterinarians from "../pages/admin/ManageVeterinarians";
import Reports from "../pages/admin/Reports";
import Analytics from "../pages/admin/Analytics";
import Notifications from "../pages/admin/Notifications";
import Settings from "../pages/admin/Settings";
import AdminProfile from "../pages/admin/Profile";

// =====================================================
// LOADING SCREEN
// =====================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

        <p className="mt-4 text-sm text-slate-500">
          Loading PawSync...
        </p>
      </div>
    </div>
  );
}

// =====================================================
// ROLE HOME
// =====================================================

function getDashboardPath(role) {
  switch (role) {
    case "veterinarian":
      return "/veterinarian";

    case "admin":
      return "/admin";

    case "pet_owner":
      return "/dashboard";

    default:
      return "/dashboard";
  }
}

// =====================================================
// PROTECTED ROUTE
// =====================================================

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Profile is required for role-based routing.
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-800">
            Unable to load your profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

// =====================================================
// ROLE PROTECTED ROUTE
// =====================================================

function RoleRoute({
  allowedRoles,
  children,
}) {
  const {
    user,
    profile,
    loading,
  } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-800">
            Unable to load your profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  const userRole = profile.role;
  console.log("ROUTE DEBUG:", {
  currentPath: window.location.pathname,
  user: user?.email,
  profileRole: userRole,
  allowedRoles,
});

  if (!allowedRoles.includes(userRole)) {
    return (
      <Navigate
        to={getDashboardPath(userRole)}
        replace
      />
    );
  }

  return children;
}

// =====================================================
// RESPONSIVE PAGE
// =====================================================

// =====================================================
// APP ROUTES
// =====================================================

function AppRoutes() {
  const {
    user,
    profile,
    loading,
  } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // ===================================================
  // DETERMINE DEFAULT DASHBOARD
  // ===================================================

  const dashboardPath = user
    ? getDashboardPath(profile?.role)
    : "/";

  return (
    <BrowserRouter>
      <Routes>

        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/"
          element={
            user ? (
              <Navigate
                to={dashboardPath}
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        {/* =================================================
            REGISTER
        ================================================= */}

        <Route
          path="/register"
          element={
            user ? (
              <Navigate
                to={dashboardPath}
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        {/* =================================================
            PET OWNER DASHBOARD
        ================================================= */}

        <Route
          path="/dashboard"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <ResponsivePage
                desktop={<OwnerDashboard />}
                mobile={
                  <OwnerMobileDashboard />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - PET PROFILE
        ================================================= */}

        <Route
          path="/pets/:id"
          element={
            <RoleRoute allowedRoles={["pet_owner"]}>
              <PetProfile />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - PETS
        ================================================= */}

        <Route
          path="/pets"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <Pets />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - APPOINTMENTS
        ================================================= */}

        <Route
          path="/appointments"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <Appointments />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - MEDICAL RECORDS
        ================================================= */}

        <Route
          path="/medical-records"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <MedicalRecords />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - PROFILE
        ================================================= */}

        <Route
          path="/profile"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <Profile />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - ANALYTICS
        ================================================= */}

        <Route
          path="/analytics"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <OwnerAnalytics />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - REMINDERS
        ================================================= */}

        <Route
          path="/reminders"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <Reminders />
            </RoleRoute>
          }
        />

        {/* =================================================
            PET OWNER - TIMELINE
        ================================================= */}

        <Route
          path="/timeline"
          element={
            <RoleRoute
              allowedRoles={["pet_owner"]}
            >
              <Timeline />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN DASHBOARD
        ================================================= */}

        <Route
          path="/veterinarian"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianDashboard />
                }
                mobile={
                  <VetMobileDashboard />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN - APPOINTMENTS
        ================================================= */}

        <Route
          path="/veterinarian/appointments"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianAppointments />
                }
                mobile={
                  <AppointmentsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN - MEDICAL REPORTS
        ================================================= */}

        <Route
          path="/veterinarian/medical-reports"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianMedicalReports />
                }
                mobile={
                  <MedicalReportsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN - PATIENT RECORDS
        ================================================= */}

        <Route
          path="/veterinarian/patient-records"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianPatientRecords />
                }
                mobile={
                  <PatientRecordsMobile />
                }
              />
            </RoleRoute>
          }
        />

        

        {/* =================================================
            VETERINARIAN - TODAY'S APPOINTMENTS
        ================================================= */}

        <Route
          path="/veterinarian/todays-appointments"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianTodaysAppointments />
                }
                mobile={
                  <TodaysAppointmentsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN - VACCINATIONS
        ================================================= */}

        <Route
          path="/veterinarian/vaccinations"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianVaccinations />
                }
                mobile={
                  <VaccinationsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            VETERINARIAN - PROFILE
        ================================================= */}

        <Route
          path="/veterinarian/profile"
          element={
            <RoleRoute
              allowedRoles={["veterinarian"]}
            >
              <ResponsivePage
                desktop={
                  <VeterinarianProfile />
                }
                mobile={
                  <VeterinarianProfileMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route
          path="/admin"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<AdminDashboard />}
                mobile={
                  <AdminMobileDashboard />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - USERS
        ================================================= */}

        <Route
          path="/admin/users"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<ManageUsers />}
                mobile={
                  <ManageUsersMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - PETS
        ================================================= */}

        <Route
          path="/admin/pets"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<ManagePets />}
                mobile={
                  <ManagePetsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - VETERINARIANS
        ================================================= */}

        <Route
          path="/admin/veterinarians"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={
                  <ManageVeterinarians />
                }
                mobile={
                  <ManageVeterinariansMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - REPORTS
        ================================================= */}

        <Route
          path="/admin/reports"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<Reports />}
                mobile={<ReportsMobile />}
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - ANALYTICS
        ================================================= */}

        <Route
          path="/admin/analytics"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<Analytics />}
                mobile={<AnalyticsMobile />}
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - NOTIFICATIONS
        ================================================= */}

        <Route
          path="/admin/notifications"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<Notifications />}
                mobile={
                  <NotificationsMobile />
                }
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - SETTINGS
        ================================================= */}

        <Route
          path="/admin/settings"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<Settings />}
                mobile={<SettingsMobile />}
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            ADMIN - PROFILE
        ================================================= */}

        <Route
          path="/admin/profile"
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            >
              <ResponsivePage
                desktop={<AdminProfile />}
                mobile={<ProfileMobile />}
              />
            </RoleRoute>
          }
        />

        {/* =================================================
            FALLBACK
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to={dashboardPath}
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;