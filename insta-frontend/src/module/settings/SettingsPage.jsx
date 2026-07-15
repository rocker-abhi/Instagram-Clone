import React, { useState, useEffect } from "react";
import { Settings, Shield, MessageSquare, Eye, Loader2, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { USER_API_BASE_URL, API_BASE_URL } from "../../config";

export default function SettingsPage({ token }) {
  const [settings, setSettings] = useState({
    account_visibility: "PUBLIC",
    allow_message_requests: true,
    show_activity_status: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" }); // 'success' | 'error'

  // Change Password Form State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${USER_API_BASE_URL}/user-profile/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSettings(data.data);
          }
        } else {
          setStatus({ type: "error", message: "Failed to load settings." });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setStatus({ type: "error", message: "An error occurred while loading settings." });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  // Real-time password validation
  useEffect(() => {
    if (!password) {
      setPasswordError("");
      return;
    }
    if (password.includes(" ")) {
      setPasswordError("Password cannot contain spaces.");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasSpecial = /[^\w\s]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasSpecial) {
      setPasswordError("Password must contain capital & small letters and at least one special character.");
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
  }, [password, confirmPassword]);

  const handleToggle = async (key, val) => {
    setSaving(true);
    setStatus({ type: null, message: "" });

    try {
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: val }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setSettings(data.data);
          setStatus({ type: "success", message: "Settings updated successfully." });
        }
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setStatus({ type: "error", message: "Failed to update settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword || passwordError) return;

    setPasswordSaving(true);
    setStatus({ type: null, message: "" });

    try {
      // Call the backend change-password route directly
      const resetRes = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: password,
          confirm_password: confirmPassword,
        }),
      });

      const resetData = await resetRes.json();
      if (resetRes.ok && resetData.success) {
        setStatus({ type: "success", message: "Password changed successfully!" });
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordForm(false);
          setStatus({ type: null, message: "" });
        }, 1500);
      } else {
        throw new Error(resetData.message || "Failed to change password.");
      }
    } catch (err) {
      console.error("Password change error:", err);
      setStatus({ type: "error", message: err.message || "Failed to update password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <span className="text-slate-400 text-sm">Loading settings...</span>
      </div>
    );
  }

  if (showPasswordForm) {
    return (
      <div className="w-full max-w-[600px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#efefef]">
          <button 
            onClick={() => {
              setShowPasswordForm(false);
              setStatus({ type: null, message: "" });
            }}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-[#262626]">Change Password</h2>
        </div>

        {status.message && (
          <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-sm font-semibold transition-all
            ${status.type === "success" 
              ? "bg-green-50 border-green-200 text-green-700" 
              : "bg-red-50 border-red-200 text-red-700"}`}
          >
            {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
          {/* New Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#262626]">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create strong new password"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all
                ${passwordError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-purple-500"}`}
            />
          </div>

          {/* Confirm New Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#262626]">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all
                ${passwordError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-purple-500"}`}
            />
            {passwordError && (
              <p className="text-xs font-semibold text-red-500">{passwordError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setStatus({ type: null, message: "" });
              }}
              className="px-6 py-3 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordSaving || !password || !confirmPassword || !!passwordError}
              className="inline-flex items-center justify-center gap-2 bg-[#0095f6] hover:bg-[#00376b] disabled:opacity-50 text-white font-bold text-sm px-8 py-3 rounded-xl transition-all active:scale-95 shadow-[0_4px_12px_rgba(0,149,246,0.2)]"
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Password
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#efefef]">
        <Settings className="w-6 h-6 text-slate-700" />
        <h2 className="text-xl font-bold text-[#262626]">Settings & Privacy</h2>
      </div>

      {status.message && (
        <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-sm font-semibold transition-all
          ${status.type === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Account Visibility */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#262626]">Private Account</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[340px]">
                When your account is private, only people you approve can see your photos and videos.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("account_visibility", settings.account_visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE")}
            disabled={saving}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              settings.account_visibility === "PRIVATE" ? "bg-purple-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                settings.account_visibility === "PRIVATE" ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* Message Requests */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#262626]">Allow Message Requests</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[340px]">
                Choose if people who don't follow you can send you message requests.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("allow_message_requests", !settings.allow_message_requests)}
            disabled={saving}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              settings.allow_message_requests ? "bg-purple-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                settings.allow_message_requests ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* Activity State */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#262626]">Show Activity Status</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[340px]">
                Allow accounts you follow and anyone you message to see when you were last active.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("show_activity_status", !settings.show_activity_status)}
            disabled={saving}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              settings.show_activity_status ? "bg-purple-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                settings.show_activity_status ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* Change Password Button Trigger */}
        <div className="pt-4 border-t border-[#efefef]">
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all bg-slate-50/50 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[#262626]">Change Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Update your account password with security requirements.
                </p>
              </div>
            </div>
            <span className="text-xs text-purple-600 font-semibold px-3 py-1 bg-purple-50 rounded-full">
              Change
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
