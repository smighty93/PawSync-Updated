function Button({ children, type = "button", className = "", ...props }) {
  return <button type={type} {...props} className={`ps-button w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>{children}</button>;
}
export default Button;
