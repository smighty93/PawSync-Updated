import { HeartPulse, CalendarDays, FileHeart } from "lucide-react";
import Brand from "./Brand";
import pets from "../../assets/pets-login.png";
export default function AuthVisual({ registration = false }) {
  return <aside className="ps-auth-visual">
    <Brand subtitle="A little care. A healthier life." />
    <div className="ps-auth-story"><span className="ps-eyebrow">CONNECTED CARE, HAPPIER PETS</span><h1>{registration ? <>Great care starts<br />with a connection.</> : <>Their whole world.<br />Your peace of mind.</>}</h1><p>Bring every appointment, health record, and little milestone together. More time for the moments that matter.</p></div>
    <div className="ps-auth-photo"><img src={pets} alt="A happy dog and cat, together" /><div className="ps-photo-note"><HeartPulse size={22}/><div><strong>Care that stays connected</strong><span>For pets, their people, and their vets.</span></div></div></div>
    <div className="ps-auth-features"><span><CalendarDays size={17}/> Easier appointments</span><span><FileHeart size={17}/> Records in one place</span></div>
  </aside>;
}
