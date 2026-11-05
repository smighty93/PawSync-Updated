import logo from "../../assets/pawsync-logo.png";

export default function Brand() {
  return (
    <div className="ps-brand">
      <img src={logo} alt="PawSync logo" className="ps-brand-icon" />
      <span className="ps-brand-name">PawSync</span>
    </div>
  );
}