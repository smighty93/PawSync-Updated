import WorkspaceActions from "../../components/ui/WorkspaceActions";
import VetDashboardLayout from "../../components/layout/VetDashboardLayout";
import WelcomeCard from "../../components/veterinarian/WelcomeCard";
import DashboardStats from "../../components/veterinarian/DashboardStats";
import AppointmentTable from "../../components/veterinarian/AppointmentTable";
import UpcomingConsultations from "../../components/veterinarian/UpcomingConsultations";
import RecentActivity from "../../components/veterinarian/RecentActivity";

function Dashboard() {
  return (
    <VetDashboardLayout>
      <div className="space-y-6">
        <WelcomeCard />

        <DashboardStats />
        <WorkspaceActions role="vet" />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AppointmentTable />
          <UpcomingConsultations />
        </div>

        <RecentActivity />
      </div>
    </VetDashboardLayout>
  );
}

export default Dashboard;