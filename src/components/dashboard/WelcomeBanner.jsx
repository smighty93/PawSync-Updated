import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, HeartPulse } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import pets from "../../assets/pets-login.png";
function WelcomeBanner() {
  const { profile, user } = useAuth();
  const name = (profile?.full_name || user?.user_metadata?.full_name || "").split(" ")[0];
  return <section className="ps-owner-welcome">
    <div className="ps-welcome-copy"><span className="ps-eyebrow"><HeartPulse size={16}/> A LITTLE CARE, EVERY DAY</span><h1>Welcome back{name ? `, ${name}` : ""}.</h1><p>Happy pets. Healthier tomorrows.<br />Everything they need, all in one place.</p><div className="ps-welcome-actions"><Link className="ps-primary-link" to="/appointments">Book an appointment <ArrowUpRight size={17}/></Link><Link className="ps-secondary-link" to="/pets"><Plus size={17}/> Add a pet</Link></div></div>
    <img src={pets} alt="A dog and cat enjoying time together" className="ps-welcome-image"/>
  </section>;
}
export default WelcomeBanner;
