import AuthVisual from "../../components/ui/AuthVisual";
import Brand from "../../components/ui/Brand";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [rememberMe, setRememberMe] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const data = await login(
        email.trim(),
        password
      );

      const userRole =
        data?.user?.user_metadata?.role ||
        "pet_owner";

      if (userRole === "admin") {
        navigate("/admin", { replace: true });
      } else if (userRole === "veterinarian") {
        navigate("/veterinarian", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (loginError) {
      setError(
        loginError?.message ||
          "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-auth min-h-screen w-full flex flex-col lg:flex-row">
      <AuthVisual />
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="ps-auth-form w-full max-w-md">
          <div className="lg:hidden mb-8"><Brand /></div>
          <p className="ps-eyebrow mb-3">YOUR PET CARE COMPANION</p>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back.
          </h2>

          <p className="text-slate-500 mt-2 mb-8">
            A healthier, happier life for your pet starts here.
          </p>

          {error && (
            <div role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 pl-12 pr-12 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(
                    event.target.checked
                  )
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />

              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition"
            >
              {loading && (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}

              {loading
                ? "Signing In..."
                : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-600 mt-7">
            Don't have an account?

            <Link
              to="/register"
              className="text-blue-600 font-semibold ml-2 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;