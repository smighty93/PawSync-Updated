import { PawPrint } from "lucide-react";
export default function Brand({ subtitle }) {
  return <div className="ps-brand"><span className="ps-brand-mark"><PawPrint size={23} strokeWidth={2} /></span><div><span className="ps-brand-name">PawSync<span>.</span></span>{subtitle && <p className="ps-brand-subtitle">{subtitle}</p>}</div></div>;
}
