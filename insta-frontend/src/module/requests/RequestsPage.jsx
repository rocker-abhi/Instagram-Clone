import React, { useState, useEffect } from "react";
import { UserCheck, Check, X, Loader2, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";

export default function RequestsPage({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null); // track which item is being accepted/rejected

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
          // Remove the request from state list
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <span className="text-slate-400 text-sm">Loading follow requests...</span>
      </div>
    );
  }

  // Avatar helper
  const AvatarImg = ({ src, alt, className }) =>
    src ? (
      <img src={src} alt={alt} className={className} />
    ) : (
      <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
        {alt ? alt.charAt(0).toUpperCase() : "?"}
      </div>
    );

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#efefef]">
        <UserCheck className="w-6 h-6 text-slate-700" />
        <h2 className="text-xl font-bold text-[#262626]">Follow Requests</h2>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">No pending follow requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all bg-slate-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100 shrink-0">
                  <AvatarImg
                    src={req.follower_profile_picture_url}
                    alt={req.follower_username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-[#262626]">{req.follower_username}</span>
                  <span className="text-xs text-slate-400">{req.follower_display_name || "Instagram User"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleAction(req.id, "accept")}
                  className="p-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl shadow-md shadow-green-500/10 transition-all active:scale-95 cursor-pointer"
                  title="Confirm Request"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  disabled={actioningId !== null}
                  onClick={() => handleAction(req.id, "reject")}
                  className="p-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer"
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
