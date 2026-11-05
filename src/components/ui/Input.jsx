import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
function Input({ label, type = "text", className = "", id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return <div className="flex flex-col gap-2">
    <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
    <div className="relative"><input {...props} id={inputId} type={password && visible ? "text" : type} className={`ps-input w-full rounded-xl border border-slate-300 px-4 py-3 ${password ? "pr-12" : ""} ${className}`} />
    {password && <button type="button" className="ps-password-toggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>}</div>
  </div>;
}
export default Input;
