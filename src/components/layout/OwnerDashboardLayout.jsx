import Brand from "../ui/Brand";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PawPrint,
  CalendarDays,
  FileText,
  User,
  ChevronDown,
  Stethoscope,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Bell,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const ownerNavItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Pets",
    path: "/pets",
    icon: PawPrint,
  },
  {
    name: "Appointments",
    path: "/appointments",
    icon: CalendarDays,
  },
  {
    name: "Medical Records",
    path: "/medical-records",
    icon: FileText,
  },
  {
    name: "Health Analytics",
    path: "/analytics",
    icon: TrendingUp,
  },
  {
    name: "Reminders",
    path: "/reminders",
    icon: Bell,
  },
  {
    name: "Profile",
    path: "/profile",
    icon: User,
  },
];

function OwnerDashboardLayout({ children }) {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const [showProfile, setShowProfile] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const switchDashboard = (path) => {
    setShowProfile(false);
    setShowDashboards(false);
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleNavigation = () => {
    setShowProfile(false);
    setShowDashboards(false);
    setShowMobileMenu(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await signOut();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "Pet Owner";

  const displayEmail =
    profile?.email ||
    user?.email ||
    "PawSync Member";

  return (
    <div className="ps-shell ps-shell-owner min-h-screen bg-slate-50">

      <a href="#main-content" className="ps-skip-link">Skip to content</a>
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="ps-sidebar hidden md:flex w-64 bg-white border-r border-slate-100 flex-col fixed inset-y-0 left-0 z-30">

        {/* BRAND */}

        <div className="h-16 px-6 flex items-center border-b border-slate-100">
          <button
            type="button"
            onClick={() => switchDashboard("/dashboard")}
            className="flex items-center gap-2"
          >
            <Brand />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 px-4 py-5 space-y-1">
          {ownerNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                onClick={handleNavigation}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3",
                    "px-3 py-2.5",
                    "rounded-lg",
                    "text-sm",
                    "font-medium",
                    "transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")
                }
              >
                <Icon className="w-5 h-5" strokeWidth={1.9} />

                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}

        <div className="p-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Pet Owner Portal
            </p>

            <p className="text-xs text-slate-400 mt-1">
              PawSync Healthcare Network
            </p>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MOBILE MENU OVERLAY
      ===================================================== */}

      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          <aside className="ps-sidebar fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-xl md:hidden">

            {/* MOBILE BRAND */}

            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
              <button
                type="button"
                onClick={() => switchDashboard("/dashboard")}
                className="flex items-center gap-2"
              >
                <Brand />
              </button>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* MOBILE NAV */}

            <nav className="p-4 space-y-1">
              {ownerNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    onClick={handleNavigation}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3",
                        "px-4 py-3",
                        "rounded-lg",
                        "text-sm font-medium",
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")
                    }
                  >
                    <Icon className="w-5 h-5" />

                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="md:pl-64 min-h-screen">

        {/* ===================================================
            TOP HEADER
        =================================================== */}

        <header className="ps-header h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30">

          {/* LEFT HEADER */}

          <div className="flex items-center gap-4">

            {/* MOBILE MENU */}

            <button
              type="button"
              aria-label="Open navigation" aria-expanded={showMobileMenu}
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-50"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <div className="sm:hidden"><Brand /></div>
            {/* PORTAL TITLE */}

            <div className="hidden sm:block">
              <p className="text-xs font-medium text-slate-400">
                Pet Owner Portal
              </p>

              <p className="text-sm font-semibold text-slate-800">
                PawSync Healthcare Network
              </p>
            </div>
          </div>

          {/* =================================================
              TOP RIGHT PROFILE
          ================================================= */}

          <div className="relative">

            <button
              type="button"
              aria-label="Account menu" aria-expanded={showProfile}
              onClick={() => {
                setShowProfile((value) => !value);
                setShowDashboards(false);
              }}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >

              {/* AVATAR */}

              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                <User
                  className="w-5 h-5 text-blue-600"
                  strokeWidth={1.9}
                />
              </div>

              {/* USER DETAILS */}

              <div className="text-left hidden sm:block max-w-[150px]">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {displayName}
                </p>

                <p className="text-xs text-slate-500">
                  Pet Owner
                </p>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showProfile ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* =================================================
                PROFILE DROPDOWN
            ================================================= */}

            {showProfile && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[100]">

                {/* PROFILE INFO */}

                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-sm text-slate-800 truncate">
                    {displayName}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {displayEmail}
                  </p>
                </div>


                {/* PROFILE */}

                <button
                  type="button"
                  onClick={() =>
                    switchDashboard("/profile")
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-500" />

                  Profile
                </button>

                {/* LOGOUT */}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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

        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main id="main-content" className="ps-main p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { OwnerDashboardLayout };

export default OwnerDashboardLayout;