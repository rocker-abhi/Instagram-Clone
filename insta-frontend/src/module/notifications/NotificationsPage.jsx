import React, { useState, useEffect } from "react";
import { Heart, UserCheck, Settings, Check, CheckSquare, Loader2, AlertCircle } from "lucide-react";
import { NOTIFICATION_API_BASE_URL } from "../../config";

export default function NotificationsPage({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [readAllLoading, setReadAllLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${NOTIFICATION_API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        setError("Failed to fetch notifications.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const handleMarkAsRead = async (id) => {
    setActioningId(id);
    try {
      const res = await fetch(`${NOTIFICATION_API_BASE_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Mark as read in state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      } else {
        alert("Failed to mark notification as read.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setReadAllLoading(true);
    try {
      const res = await fetch(`${NOTIFICATION_API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      } else {
        alert("Failed to mark all as read.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setReadAllLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "follow":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />;
      case "follow_accept":
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case "settings":
        return <Settings className="w-5 h-5 text-blue-500" />;
      default:
        return <Heart className="w-5 h-5 text-slate-500" />;
    }
  };

  const getNotificationColorClass = (type) => {
    switch (type) {
      case "follow":
        return "bg-red-50 border-red-100 hover:border-red-200";
      case "follow_accept":
        return "bg-green-50 border-green-100 hover:border-green-200";
      case "settings":
        return "bg-blue-50 border-blue-100 hover:border-blue-200";
      default:
        return "bg-slate-50 border-slate-100 hover:border-slate-200";
    }
  };

  const [showPrevious, setShowPrevious] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <span className="text-slate-400 text-sm font-medium">Loading notifications...</span>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);
  const unreadCount = unreadNotifications.length;

  const renderNotificationItem = (n) => (
    <div
      key={n.id}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
        !n.is_read
          ? getNotificationColorClass(n.type)
          : "bg-white border-slate-100 hover:border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-100 shadow-sm shrink-0">
          {getNotificationIcon(n.type)}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className={`text-sm text-[#262626] leading-snug break-words ${!n.is_read ? "font-bold" : "font-medium"}`}>
            {n.message}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1">
            {new Date(n.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Action Button */}
      {!n.is_read && (
        <button
          disabled={actioningId === n.id}
          onClick={() => handleMarkAsRead(n.id)}
          className="ml-3 px-2.5 py-1 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          {actioningId === n.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Mark read"
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-[650px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#efefef]">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-slate-800 fill-slate-800" />
          <h2 className="text-2xl font-black text-[#262626] tracking-tight">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-black bg-red-500 text-white rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            disabled={readAllLoading}
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {readAllLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5" />
            )}
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No notifications yet.</p>
          <p className="text-slate-300 text-xs mt-1">Actions on your profile will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* New/Unread section */}
          {unreadNotifications.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#8e8e8e] uppercase tracking-wider pl-1">New</h3>
              <div className="space-y-3.5">
                {unreadNotifications.map(renderNotificationItem)}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <p className="text-xs text-slate-400 font-semibold">You're all caught up!</p>
            </div>
          )}

          {/* Previous/Read section behind a button */}
          {readNotifications.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-[#efefef]">
              <div className="flex justify-center">
                <button
                  onClick={() => setShowPrevious(!showPrevious)}
                  className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {showPrevious ? "Hide previous notifications" : `See previous notifications (${readNotifications.length})`}
                </button>
              </div>

              {showPrevious && (
                <div className="space-y-3 animate-fade-in">
                  <h3 className="text-xs font-black text-[#8e8e8e] uppercase tracking-wider pl-1">Earlier</h3>
                  <div className="space-y-3.5">
                    {readNotifications.map(renderNotificationItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
