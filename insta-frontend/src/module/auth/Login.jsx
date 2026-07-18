import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Lock, User, Compass, Sparkles, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function Login({ onSwitchToRegister, onSwitchToPasswordReset }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // States for concurrent session warning popup
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    // Premium Apple/Linear inspired entrance animation
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setIsLoading(true);

    let loginType = "username";
    let identifierVal = identifier;

    if (identifier.includes("@")) {
      loginType = "email";
    } else if (/^\+?\d+$/.test(identifier)) {
      loginType = "phone";
      if (/^\d{10}$/.test(identifier)) {
        identifierVal = `+91${identifier}`;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_type: loginType,
          identifier: identifierVal,
          password: password,
          force_logout: false,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("access_token", data.data.access_token);
        localStorage.setItem("refresh_token", data.data.refresh_token);
        window.location.reload();
      } else if (response.status === 409 || data.error_code === "ALREADY_LOGGED_IN") {
        setPendingLoginData({ loginType, identifierVal, password });
        setShowConflictModal(true);
      } else {
        setError(data.message || (data.detail && data.detail[0]?.msg) || "Invalid login credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to connect to the authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!pendingLoginData) return;
    setIsLoading(true);
    setShowConflictModal(false);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_type: pendingLoginData.loginType,
          identifier: pendingLoginData.identifierVal,
          password: pendingLoginData.password,
          force_logout: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("access_token", data.data.access_token);
        localStorage.setItem("refresh_token", data.data.refresh_token);
        window.location.reload();
      } else {
        setError(data.message || (data.detail && data.detail[0]?.msg) || "Invalid login credentials.");
      }
    } catch (err) {
      console.error("Force login error:", err);
      setError("Failed to connect to the authentication server.");
    } finally {
      setIsLoading(false);
      setPendingLoginData(null);
    }
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="relative w-full max-w-[420px] p-8 rounded-3xl bg-premium-card border border-premium-border shadow-premium overflow-hidden transition-all duration-300"
      >
        {/* Subtle Decorative Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-premium-gray border border-premium-border p-0.5 mb-4 shadow-inner">
            <Compass className="w-6 h-6 text-accent-cyan" />
          </div>
          <h2 className="text-2xl font-bold font-display text-premium-text tracking-tight">
            Welcome Back
          </h2>
          <p className="text-sm text-premium-muted mt-2">
            Experience Instaclone's minimal design
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {error && (
            <div className="p-3.5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium">
              {error}
            </div>
          )}

          {/* Identifier Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
              Username, Email, or Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="alex_story or email"
                className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-premium-muted uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={onSwitchToPasswordReset}
                className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors font-medium focus:outline-none"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-premium-muted hover:text-premium-text transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-premium-bg font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign In
                </>
              )}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-between text-xs text-premium-muted/30 relative z-10">
          <span className="w-1/3 border-b border-premium-border" />
          <span>OR</span>
          <span className="w-1/3 border-b border-premium-border" />
        </div>

        {/* Switch to Register */}
        <div className="text-center relative z-10 text-sm">
          <span className="text-premium-muted">Don't have an account? </span>
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-accent-cyan hover:text-accent-cyan/80 hover:underline transition-colors focus:outline-none cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Concurrent Session Warning Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-premium-card rounded-3xl overflow-hidden max-w-sm w-full shadow-premium border border-premium-border flex flex-col items-center">
            
            {/* Warning Icon & Title area */}
            <div className="p-6 pt-8 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center text-accent-coral">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-premium-text font-display tracking-tight">
                  Log Out of Other Device?
                </h3>
                <p className="text-sm text-premium-muted leading-relaxed px-2">
                  You are already logged in to another device. To continue, you must log out of your previous session.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full border-t border-premium-border flex flex-col">
              <button
                onClick={handleForceLogout}
                className="w-full py-4 text-center font-bold text-sm text-accent-coral hover:bg-premium-gray/30 transition-colors focus:outline-none border-b border-premium-border cursor-pointer"
              >
                Log Out of Other Device
              </button>
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setPendingLoginData(null);
                }}
                className="w-full py-4 text-center font-semibold text-sm text-premium-text hover:bg-premium-gray/30 transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
