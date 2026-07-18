import React, { useState, useEffect, useRef } from "react";
import { Heart, UserCheck, Settings, CheckSquare, Loader2, AlertCircle } from "lucide-react";
import { NOTIFICATION_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function NotificationsPage({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [readAllLoading, setReadAllLoading] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
    );
  }, [showPrevious]);

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
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReadAllLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "follow":
        return <Heart className="w-4.5 h-4.5 text-accent-coral" />;
      case "follow_accept":
        return <UserCheck className="w-4.5 h-4.5 text-accent-emerald" />;
      case "settings":
        return <Settings className="w-4.5 h-4.5 text-accent-cyan" />;
      default:
        return <Heart className="w-4.5 h-4.5 text-premium-muted" />;
    }
  };

  const getNotificationColorClass = (type) => {
    switch (type) {
      case "follow":
        return "bg-accent-coral/5 border-accent-coral/10 hover:border-accent-coral/25";
      case "follow_accept":
        return "bg-accent-emerald/5 border-accent-emerald/10 hover:border-accent-emerald/25";
      case "settings":
        return "bg-accent-cyan/5 border-accent-cyan/10 hover:border-accent-cyan/25";
      default:
        return "bg-premium-gray border-premium-border hover:border-premium-border/85";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-premium-bg">
        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan mb-2" />
        <span className="text-premium-muted text-xs font-semibold">Loading notifications...</span>
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
          : "bg-premium-card border-premium-border/50 hover:border-premium-border"
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-premium-bg border border-premium-border shadow-inner shrink-0">
          {getNotificationIcon(n.type)}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className={`text-xs text-premium-text leading-snug break-words ${!n.is_read ? "font-bold" : "font-medium"}`}>
            {n.message}
          </p>
          <span className="text-[9px] text-premium-muted mt-1.5 font-bold">
            {new Date(n.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {!n.is_read && (
        <button
          disabled={actioningId === n.id}
          onClick={() => handleMarkAsRead(n.id)}
          className="ml-3 px-3 py-1.5 bg-premium-bg border border-premium-border text-premium-text hover:text-accent-cyan rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0"
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
    <div ref={containerRef} className="w-full max-w-[650px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-premium-border/50">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-accent-coral fill-accent-coral/10" />
          <h2 className="text-lg font-bold font-display text-premium-text">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-accent-coral text-white rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            disabled={readAllLoading}
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-bold text-accent-cyan bg-premium-bg border border-premium-border rounded-2xl transition-all cursor-pointer disabled:opacity-50"
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
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-accent-coral/20 bg-accent-coral/10 text-accent-coral text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="w-10 h-10 text-premium-muted/30 mb-3" />
          <p className="text-premium-muted text-xs font-semibold">No notifications yet.</p>
          <p className="text-premium-muted/50 text-[10px] mt-1">Actions on your profile will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {unreadNotifications.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-premium-muted uppercase tracking-wider pl-1">New</h3>
              <div className="space-y-3.5">
                {unreadNotifications.map(renderNotificationItem)}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-premium-border rounded-2xl bg-premium-bg/30">
              <p className="text-xs text-premium-muted font-semibold">You're all caught up!</p>
            </div>
          )}

          {readNotifications.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-premium-border/50">
              <div className="flex justify-center">
                <button
                  onClick={() => setShowPrevious(!showPrevious)}
                  className="px-5 py-2 text-[10px] font-bold text-premium-text bg-premium-bg border border-premium-border rounded-xl transition-all cursor-pointer shadow-sm hover:bg-premium-gray/50"
                >
                  {showPrevious ? "Hide previous notifications" : `See previous notifications (${readNotifications.length})`}
                </button>
              </div>

              {showPrevious && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-premium-muted uppercase tracking-wider pl-1">Earlier</h3>
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
