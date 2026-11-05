import Brand from "../ui/Brand";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Dog,
  BarChart2,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Menu,
  X,
  FileText,
  Settings,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const adminNavItems = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Manage Users",
    path: "/admin/users",
    icon: Users,
  },
  {
    name: "Manage Veterinarians",
    path: "/admin/veterinarians",
    icon: UserCheck,
  },
  {
    name: "Manage Pets",
    path: "/admin/pets",
    icon: Dog,
  },
  {
    name: "System Analytics",
    path: "/admin/analytics",
    icon: BarChart2,
  },
  {
    name: "Notifications",
    path: "/admin/notifications",
    icon: Bell,
  },
  { name: "Reports", path: "/admin/reports", icon: FileText },
  { name: "Settings", path: "/admin/settings", icon: Settings },
  {
    name: "Profile",
    path: "/admin/profile",
    icon: User,
  },
];

export default function DashboardLayout({
  children,
}) {
  const navigate = useNavigate();

  const {
    user,
    profile,
    signOut,
  } = useAuth();

  const [showProfile, setShowProfile] =
    useState(false);

  const [showMobileMenu, setShowMobileMenu] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const handleNavigation = () => {
    setShowProfile(false);
    setShowMobileMenu(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setShowProfile(false);
    setShowMobileMenu(false);

    try {
      await signOut();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      navigate("/", {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "Admin";

  const displayEmail =
    profile?.email ||
    user?.email ||
    "Administrator";

  return (
    <div className="ps-shell ps-shell-admin min-h-screen bg-slate-50">

      <a href="#main-content" className="ps-skip-link">Skip to content</a>
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="ps-sidebar hidden md:flex w-64 bg-white border-r border-slate-100 flex-col fixed inset-y-0 left-0 z-30">

        {/* LOGO */}

        <div className="p-6">
          <button
            type="button"
            onClick={() =>
              navigate("/admin")
            }
            className="text-xl font-bold text-blue-600 flex items-center gap-2"
          >
            <Brand />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                    end={item.path === "/admin"}
                onClick={handleNavigation}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

      </aside>

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() =>
              setShowMobileMenu(false)
            }
          />

          <aside className="ps-sidebar fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-xl md:hidden">

            <div className="p-6 flex items-center justify-between border-b border-slate-100">

              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/admin");
                }}
                className="text-xl font-bold text-blue-600 flex items-center gap-2"
              >
                <Brand />
              </button>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() =>
                  setShowMobileMenu(false)
                }
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <nav className="p-4 space-y-1">

              {adminNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.path === "/admin"}
                    onClick={handleNavigation}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 mt-2"
              >
                <LogOut className="w-5 h-5" />

                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </button>

            </nav>

          </aside>
        </>
      )}

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="md:pl-64 min-h-screen">

        {/* HEADER */}

        <header className="ps-header h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30">

          <button
            type="button"
            aria-label="Open navigation" aria-expanded={showMobileMenu}
            onClick={() =>
              setShowMobileMenu(true)
            }
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="sm:hidden"><Brand /></div>
          <div className="hidden sm:block"><p className="ps-eyebrow">ADMINISTRATION</p><p className="text-sm font-semibold text-slate-700">Healthcare network overview</p></div>

          {/* TOP-RIGHT PROFILE MENU */}

          <div className="relative">

            <button
              type="button"
              aria-label="Account menu" aria-expanded={showProfile}
              onClick={() =>
                setShowProfile(
                  (value) => !value
                )
              }
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-slate-50"
            >

              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>

              <div className="text-left hidden sm:block">

                <p className="text-sm font-semibold text-slate-800">
                  {displayName}
                </p>

                <p className="text-xs text-slate-500">
                  Administrator
                </p>

              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showProfile
                    ? "rotate-180"
                    : ""
                }`}
              />

            </button>

            {/* HEADER PROFILE DROPDOWN */}

            {showProfile && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[100]">

                <div className="px-4 py-3 border-b border-slate-100">

                  <p className="font-semibold text-slate-800">
                    {displayName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {displayEmail}
                  </p>

                </div>

                <button
                  type="button"
                  aria-label="Account menu" aria-expanded={showProfile}
              onClick={() => {
                    setShowProfile(false);
                    navigate("/admin/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />

                  {loggingOut
                    ? "Logging out..."
                    : "Logout"}
                </button>

              </div>
            )}

          </div>

        </header>

        {/* PAGE */}

        <main id="main-content" className="ps-main p-4 sm:p-6 md:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}