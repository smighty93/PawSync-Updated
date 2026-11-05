import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Bell,
  ShieldAlert,
  CheckCircle2,
  Info,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const {
        data,
        error: notificationsError,
      } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          title,
          message,
          is_read,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (notificationsError) {
        throw notificationsError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error(
        "Error loading notifications:",
        err
      );

      setError(
        err.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  function getNotificationType(title, message) {
    const text = `${title} ${message}`.toLowerCase();

    if (
      text.includes("backup") ||
      text.includes("completed") ||
      text.includes("success")
    ) {
      return "success";
    }

    if (
      text.includes("warning") ||
      text.includes("alert") ||
      text.includes("high") ||
      text.includes("memory")
    ) {
      return "warning";
    }

    return "info";
  }

  function formatTime(createdAt) {
    if (!createdAt) {
      return "";
    }

    const date = new Date(createdAt);

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getIcon(type) {
    if (type === "success") {
      return <CheckCircle2 className="w-5 h-5" />;
    }

    if (type === "warning") {
      return <ShieldAlert className="w-5 h-5" />;
    }

    return <Info className="w-5 h-5" />;
  }

  function getIconClass(type) {
    if (type === "success") {
      return "bg-emerald-500";
    }

    if (type === "warning") {
      return "bg-amber-500";
    }

    return "bg-blue-500";
  }

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId);

      if (error) {
        throw error;
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Error marking notification as read:",
        err
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Notifications & System Alerts
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Audit trail and system event broadcast logs.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">

          {loading ? (
            <div className="p-10 text-center">
              <p className="text-slate-500">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-slate-400" />
              </div>

              <h3 className="font-semibold text-slate-800">
                No notifications
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                You don't have any notifications yet.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const type = getNotificationType(
                item.title,
                item.message
              );

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    !item.is_read &&
                    markAsRead(item.id)
                  }
                  className={`p-5 flex items-start gap-4 transition-colors ${
                    item.is_read
                      ? "bg-white"
                      : "bg-blue-50/40 cursor-pointer hover:bg-blue-50"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`p-2.5 rounded-lg text-white mt-1 ${getIconClass(
                      type
                    )}`}
                  >
                    {getIcon(type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">

                    <div className="flex justify-between items-center gap-4">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        {item.title}
                      </h3>

                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.message}
                    </p>

                    {!item.is_read && (
                      <span className="inline-flex mt-2 text-xs font-medium text-blue-600">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}