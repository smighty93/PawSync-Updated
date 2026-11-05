import { PawPrint, CalendarDays, FileText } from "lucide-react";
import { Link } from "react-router-dom";

function ActionCard({ icon, title, to }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex items-center gap-4 w-full"
    >
      <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
        {icon}
      </div>

      <span className="font-semibold text-slate-700">
        {title}
      </span>
    </Link>
  );
}

function QuickActions() {
  return (
    <div className="ps-quick-actions mt-8">
      <h2 className="text-2xl font-bold mb-5 text-slate-900">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ActionCard
          icon={<PawPrint size={24} />}
          title="Add Pet"
          to="/pets"
        />

        <ActionCard
          icon={<CalendarDays size={24} />}
          title="Book Appointment"
          to="/appointments"
        />

        <ActionCard
          icon={<FileText size={24} />}
          title="Upload Medical Record"
          to="/medical-records"
        />
      </div>
    </div>
  );
}

export default QuickActions;