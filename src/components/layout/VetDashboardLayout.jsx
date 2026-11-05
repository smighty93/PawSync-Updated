import Brand from "../ui/Brand";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  User,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import vetMenu from "../../config/menus/vetMenu";
import { useAuth } from "../../context/AuthContext";

export default function VetDashboardLayout({ children }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [showProfile, setShowProfile] = useState(false);
  const [showDashboards, setShowDashboards] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const switchDashboard = (path) => {
    setShowProfile(false);
    setShowDashboards(false);
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setShowProfile(false);
    setShowDashboards(false);

    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/", { replace: true });
    }
  };

  const displayName =
    user?.user_metadata?.full_name || "Veterinarian";

  const filteredVetMenu = vetMenu;

  return (
    <div className="ps-shell ps-shell-vet min-h-screen bg-slate-50">

      <a href="#main-content" className="ps-skip-link">Skip to content</a>
      {/* ================= DESKTOP SIDEBAR ================= */}

      <aside className="ps-sidebar hidden md:flex fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex-col">

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Brand />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {filteredVetMenu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.path === "/veterinarian"}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-[18px] h-[18px] ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />

                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Info */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-medium text-slate-700">
              Veterinary Portal
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              PawSync Healthcare Network
            </p>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE SIDEBAR ================= */}

      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          <aside className="ps-sidebar fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-xl md:hidden">

            {/* Mobile Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Brand />
              </div>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="p-4 space-y-1 overflow-y-auto">
              {filteredVetMenu.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.title}
                    to={item.path}
                end={item.path === "/veterinarian"}
                    onClick={() => setShowMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {item.title}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* ================= MAIN AREA ================= */}

      <div className="md:pl-64 min-h-screen">

        {/* ================= TOP HEADER ================= */}

        <header className="ps-header h-16 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="h-full px-4 sm:px-6 md:px-8 flex items-center justify-between">

            {/* Mobile Menu */}
            <button
              type="button"
              aria-label="Open navigation" aria-expanded={showMobileMenu}
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="md:hidden"><Brand /></div>
            {/* Desktop Header Title */}
            <div className="hidden md:block">
              <p className="text-xs text-slate-400">
                Veterinary Portal
              </p>

              <p className="text-sm font-semibold text-slate-700">
                PawSync Healthcare Network
              </p>
            </div>

            {/* Profile */}
            <div className="relative">

              <button
                type="button"
                aria-label="Account menu" aria-expanded={showProfile}
              onClick={() => {
                  setShowProfile((value) => !value);
                  setShowDashboards(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>

                {/* Name */}
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-semibold text-slate-700 leading-tight">
                    {displayName}
                  </p>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Veterinarian
                  </p>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    showProfile ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* ================= PROFILE DROPDOWN ================= */}

              {showProfile && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[100]">

                  {/* User Info */}
                  <div className="px-4 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {displayName}
                        </p>

                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {user?.email || "Veterinarian"}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() =>
                      switchDashboard("/veterinarian/profile")
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-slate-600 hover:bg-slate-50 border-t border-slate-100"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile
                  </button>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-600 hover:bg-red-50 border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>

                </div>
              )}

            </div>
          </div>
        </header>

        {/* ================= PAGE CONTENT ================= */}

        <main id="main-content" className="ps-main p-4 sm:p-6 md:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}