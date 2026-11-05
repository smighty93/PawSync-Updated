import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Users, FileText, BarChart3, Stethoscope } from "lucide-react";
const actions = {
  vet: [{ to:"/veterinarian/appointments", label:"Manage appointments", detail:"Plan your day", icon:CalendarDays }, { to:"/veterinarian/patient-records", label:"Patient records", detail:"A complete care history", icon:Users }, { to:"/veterinarian/medical-reports", label:"Medical reports", detail:"Document every visit", icon:FileText }],
  admin: [{ to:"/admin/veterinarians", label:"Veterinarian management", detail:"Manage your care network", icon:Stethoscope }, { to:"/admin/analytics", label:"Platform analytics", detail:"Explore growth and activity", icon:BarChart3 }, { to:"/admin/reports", label:"Reports", detail:"Review platform performance", icon:FileText }]
};
export default function WorkspaceActions({ role }) {
  return <nav aria-label="Quick actions" className="ps-workspace-actions">{actions[role].map(({to,label,detail,icon:Icon}) => <Link key={to} to={to}><span className="ps-action-icon"><Icon size={19}/></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight size={16} className="ps-action-arrow"/></Link>)}</nav>;
}
