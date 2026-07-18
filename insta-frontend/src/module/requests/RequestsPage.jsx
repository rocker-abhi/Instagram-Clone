import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Check, X, Loader2, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function RequestsPage({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setRequests(data.data);
        }
      } else {
        setError("Failed to fetch follow requests.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading follow requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleAction = async (id, action) => {
    setActioningId(id);
    try {
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/requests/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRequests((prev) => prev.filter((r) => r.id !== id));
        } else {
          alert(data.message || `Failed to ${action} request.`);
        }
      } else {
        alert(`Failed to ${action} request.`);
      }
    } catch (err) {
      console.error(err);
      alert(`An error occurred while executing ${action}.`);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-premium-bg">
        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan mb-2" />
        <span className="text-premium-muted text-xs font-semibold">Loading follow requests...</span>
      </div>
    );
  }

  const AvatarImg = ({ src, alt, className }) =>
    src ? (
      <img src={src} alt={alt} className={className} />
    ) : (
      <div className={`${className} bg-premium-gray flex items-center justify-center text-premium-text font-bold text-xs`}>
        {alt ? alt.charAt(0).toUpperCase() : "?"}
      </div>
    );

  return (
    <div ref={containerRef} className="w-full max-w-[600px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-premium-border/50">
        <UserCheck className="w-5 h-5 text-accent-cyan" />
        <h2 className="text-lg font-bold font-display text-premium-text">Follow Requests</h2>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-accent-coral/20 bg-accent-coral/10 text-accent-coral text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 text-premium-muted text-xs font-semibold">
          <p>No pending follow requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-premium-border/50 hover:border-premium-border transition-all bg-premium-bg/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-premium-border shrink-0 bg-premium-gray">
                  <AvatarImg
                    src={req.follower_profile_picture_url}
                    alt={req.follower_username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-premium-text">{req.follower_username}</span>
                  <span className="text-[10px] text-premium-muted mt-0.5">{req.follower_display_name || "Instagram User"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleAction(req.id, "accept")}
                  className="p-2 bg-accent-emerald hover:bg-accent-emerald/80 disabled:opacity-50 text-white rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  title="Confirm Request"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleAction(req.id, "reject")}
                  className="p-2 bg-premium-gray hover:bg-premium-gray/80 disabled:opacity-50 text-premium-text rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Delete Request"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
