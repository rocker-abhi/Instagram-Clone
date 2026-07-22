import React, { useState, useEffect, useRef } from "react";
import { Settings, Shield, MessageSquare, Eye, Loader2, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { USER_API_BASE_URL, API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function SettingsPage({ token }) {
  const [settings, setSettings] = useState({
    account_visibility: "PUBLIC",
    show_activity_status: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" }); // 'success' | 'error'

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
    );
  }, [showPasswordForm]);

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
      const resetRes = await fetch(`${API_BASE_URL}/change-password`, {
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
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-premium-bg">
        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan mb-2" />
        <span className="text-premium-muted text-xs font-semibold">Loading settings...</span>
      </div>
    );
  }

  if (showPasswordForm) {
    return (
      <div ref={containerRef} className="w-full max-w-[600px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-premium-border/50">
          <button 
            onClick={() => {
              setShowPasswordForm(false);
              setStatus({ type: null, message: "" });
            }}
            className="p-2 hover:bg-premium-gray rounded-full transition-colors text-premium-text cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold font-display text-premium-text">Change Password</h2>
        </div>

        {status.message && (
          <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-xs font-semibold transition-all
            ${status.type === "success" 
              ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald" 
              : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"}`}
          >
            {status.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-premium-muted uppercase tracking-wider">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create strong password"
              className={`w-full px-4 py-3 bg-premium-bg rounded-2xl border text-xs focus:outline-none focus:ring-1 transition-all
                ${passwordError ? "border-accent-coral focus:border-accent-coral focus:ring-accent-coral/30" : "border-premium-border focus:border-accent-blue focus:ring-accent-blue/30"}`}
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-premium-muted uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className={`w-full px-4 py-3 bg-premium-bg rounded-2xl border text-xs focus:outline-none focus:ring-1 transition-all
                ${passwordError ? "border-accent-coral focus:border-accent-coral focus:ring-accent-coral/30" : "border-premium-border focus:border-accent-blue focus:ring-accent-blue/30"}`}
            />
            {passwordError && (
              <p className="text-[10px] font-bold text-accent-coral mt-1">{passwordError}</p>
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
              className="px-5 py-2.5 bg-premium-gray hover:bg-premium-gray/80 text-premium-text font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordSaving || !password || !confirmPassword || !!passwordError}
              className="inline-flex items-center justify-center gap-2 bg-white text-premium-bg disabled:opacity-50 font-bold text-xs px-6 py-2.5 rounded-2xl transition-all shadow hover:bg-slate-100 cursor-pointer"
            >
              {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Password
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-[600px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-premium-border/50">
        <Settings className="w-5 h-5 text-accent-cyan" />
        <h2 className="text-lg font-bold font-display text-premium-text">Settings & Privacy</h2>
      </div>

      {status.message && (
        <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-xs font-semibold transition-all
          ${status.type === "success" 
            ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald" 
            : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"}`}
        >
          {status.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Account Visibility */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-premium-border/50 hover:border-premium-border transition-all bg-premium-bg/30">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-premium-gray rounded-xl text-accent-cyan shrink-0 border border-premium-border">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-premium-text">Private Account</h3>
              <p className="text-[10px] text-premium-muted mt-1 max-w-[320px] leading-relaxed">
                When your account is private, only approved followers can see your profile posts.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("account_visibility", settings.account_visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE")}
            disabled={saving}
            className={`w-10 h-5.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              settings.account_visibility === "PRIVATE" ? "bg-accent-cyan" : "bg-premium-gray"
            }`}
          >
            <div
              className={`bg-white w-3.5 h-3.5 rounded-full shadow transition-transform duration-200 ${
                settings.account_visibility === "PRIVATE" ? "translate-x-4.5" : ""
              }`}
            />
          </button>
        </div>


        {/* Activity State */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-premium-border/50 hover:border-premium-border transition-all bg-premium-bg/30">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-premium-gray rounded-xl text-accent-cyan shrink-0 border border-premium-border">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-premium-text">Show Activity Status</h3>
              <p className="text-[10px] text-premium-muted mt-1 max-w-[320px] leading-relaxed">
                Allow accounts you follow to see when you are active.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("show_activity_status", !settings.show_activity_status)}
            disabled={saving}
            className={`w-10 h-5.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
              settings.show_activity_status ? "bg-accent-cyan" : "bg-premium-gray"
            }`}
          >
            <div
              className={`bg-white w-3.5 h-3.5 rounded-full shadow transition-transform duration-200 ${
                settings.show_activity_status ? "translate-x-4.5" : ""
              }`}
            />
          </button>
        </div>

        {/* Change Password Trigger */}
        <div className="pt-4 border-t border-premium-border/50">
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-premium-border/50 hover:border-premium-border transition-all bg-premium-bg/30 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-premium-gray rounded-xl text-accent-cyan shrink-0 border border-premium-border">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-premium-text">Change Password</h3>
                <p className="text-[10px] text-premium-muted mt-1 leading-relaxed">
                  Update and verify secure credentials.
                </p>
              </div>
            </div>
            <span className="text-[9px] text-accent-cyan font-bold px-3 py-1.5 bg-premium-bg border border-premium-border rounded-xl">
              Change
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
