import AuthVisual from "../../components/ui/AuthVisual";
import Brand from "../../components/ui/Brand";
import { useState } from "react";
import { PawPrint, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState("pet_owner");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRoleChange = (event) => {
    const selectedRole = event.target.value;

    setRole(selectedRole);

    // Clear veterinarian-only fields when switching away
    if (selectedRole !== "veterinarian") {
      setSpecialization("");
      setExperience("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // -----------------------------
    // Basic validation
    // -----------------------------
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    // -----------------------------
    // Veterinarian validation
    // -----------------------------
    if (role === "veterinarian") {
      if (!specialization.trim()) {
        setError(
          "Please enter your veterinary specialization."
        );
        return;
      }

      if (
        experience === "" ||
        Number(experience) < 0
      ) {
        setError(
          "Please enter a valid number of years of experience."
        );
        return;
      }
    }

    try {
      setLoading(true);

      const result = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        role,

        // Veterinarian-specific details
        specialization:
          role === "veterinarian"
            ? specialization.trim()
            : null,

        experience:
          role === "veterinarian"
            ? Number(experience)
            : null,
      });

      if (result?.error) {
        throw result.error;
      }

      if (result?.data?.session) {
        if (role === "veterinarian") {
          navigate("/veterinarian", {
            replace: true,
          });
        } else if (role === "admin") {
          navigate("/admin", {
            replace: true,
          });
        } else {
          navigate("/dashboard", {
            replace: true,
          });
        }

        return;
      }

      setSuccess(
        "Account created successfully. Please check your email to confirm your account."
      );
    } catch (registerError) {
      console.error(
        "Registration error:",
        registerError
      );

      setError(
        registerError?.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-auth ps-register min-h-screen flex">
      {/* -------------------------------- */}
      {/* LEFT SIDE */}
      {/* -------------------------------- */}

      <AuthVisual registration />

      {/* -------------------------------- */}
      {/* REGISTRATION FORM */}
      {/* -------------------------------- */}

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 35,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="w-full max-w-[500px]"
        >
          <Card>
            <form
              onSubmit={handleSubmit}
              className="w-full"
            >
              <div className="lg:hidden mb-6"><Brand /></div>
              <p className="ps-eyebrow mb-3">WELCOME TO PAWSYNC</p>
              <h2 className="text-3xl font-bold mb-2">
                Create your account.
              </h2>

              <p className="text-slate-500 mb-8">
                A shared home for better pet healthcare.
              </p>

              {/* ERROR */}

              {error && (
                <div role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div role="status" className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="space-y-5">

                {/* -------------------------------- */}
                {/* BASIC DETAILS */}
                {/* -------------------------------- */}

                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                />

                {/* -------------------------------- */}
                {/* ROLE */}
                {/* -------------------------------- */}

                <div>
                  <label htmlFor="register-role" className="text-sm font-medium text-slate-700">
                    Register As
                  </label>

                  <select id="register-role"
                    value={role}
                    onChange={handleRoleChange}
                    className="w-full mt-2 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="pet_owner">
                      Pet Owner
                    </option>

                    <option value="veterinarian">
                      Veterinarian
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>

                {/* -------------------------------- */}
                {/* PET OWNER */}
                {/* -------------------------------- */}

                {role === "pet_owner" && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <h3 className="font-semibold text-blue-900">
                      Pet Owner Information
                    </h3>

                    <p className="text-sm text-blue-700 mt-1">
                      Your account will be set up as a
                      pet owner. You can add and manage
                      your pets after registration.
                    </p>
                  </div>
                )}

                {/* -------------------------------- */}
                {/* VETERINARIAN */}
                {/* -------------------------------- */}

                {role === "veterinarian" && (
                  <div className="space-y-5 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <div>
                      <h3 className="font-semibold text-emerald-900">
                        Veterinarian Information
                      </h3>

                      <p className="text-sm text-emerald-700 mt-1">
                        Enter your professional details.
                      </p>
                    </div>

                    <Input
                      label="Specialization"
                      placeholder="e.g. Veterinary Surgeon"
                      value={specialization}
                      onChange={(event) =>
                        setSpecialization(
                          event.target.value
                        )
                      }
                    />

                    <Input
                      label="Years of Experience"
                      type="number"
                      min="0"
                      placeholder="e.g. 8"
                      value={experience}
                      onChange={(event) =>
                        setExperience(
                          event.target.value
                        )
                      }
                    />
                  </div>
                )}

                {/* -------------------------------- */}
                {/* ADMIN */}
                {/* -------------------------------- */}

                {role === "admin" && (
                  <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                    <h3 className="font-semibold text-purple-900">
                      Administrator Information
                    </h3>

                    <p className="text-sm text-purple-700 mt-1">
                      Your account will be registered
                      with the administrator role.
                    </p>
                  </div>
                )}

                {/* -------------------------------- */}
                {/* PASSWORD */}
                {/* -------------------------------- */}

                <Input
                  label="Password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                />

                {/* -------------------------------- */}
                {/* SUBMIT */}
                {/* -------------------------------- */}

                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>

              {/* -------------------------------- */}
              {/* LOGIN */}
              {/* -------------------------------- */}

              <div className="mt-8 text-center">
                <p className="text-slate-600">
                  Already have an account?

                  <Link
                    to="/"
                    className="text-blue-600 font-semibold ml-2 hover:underline"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;