import OwnerDashboardLayout from "../../components/layout/OwnerDashboardLayout";
import WelcomeBanner from "../../components/dashboard/WelcomeBanner";
import StatsGrid from "../../components/dashboard/StatsGrid";
import QuickActions from "../../components/dashboard/QuickActions";
import MyPets from "../../components/dashboard/MyPets";
import UpcomingAppointments from "../../components/dashboard/UpcomingAppointments.jsx";
import VaccinationReminder from "../../components/dashboard/VaccinationReminder";
import RecentActivity from "../../components/dashboard/RecentActivity";

function Dashboard() {
  return (
    <OwnerDashboardLayout>
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Statistics */}
      <StatsGrid />

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2">
          <MyPets />
        </div>

        <UpcomingAppointments />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <VaccinationReminder />

        <RecentActivity />
      </div>
    </OwnerDashboardLayout>
  );
}

export default Dashboard;