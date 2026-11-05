function Card({ children, className = "", ...props }) {
  return <div {...props} className={`ps-card bg-white rounded-2xl p-6 sm:p-8 ${className}`}>{children}</div>;
}
export default Card;
