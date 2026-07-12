import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, Compass, Sparkles, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../config";

export default function Login({ onSwitchToRegister, onSwitchToPasswordReset }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // States for concurrent session warning popup
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

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
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/30">
        {/* Decorative Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 p-0.5 shadow-lg shadow-purple-500/10 mb-4 animate-pulse">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Discover stories, connect with friends
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          {/* Identifier Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
              Username, Email, or Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5 transition-colors group-focus-within:text-purple-600" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. alex_story or alex@example.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={onSwitchToPasswordReset}
                className="text-xs text-pink-500 hover:text-pink-400 transition-colors font-medium focus:outline-none"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 transition-transform duration-500 hover:scale-105" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Sign In
                </>
              )}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-between text-xs text-slate-400 relative z-10">
          <span className="w-1/3 border-b border-slate-200" />
          <span>OR</span>
          <span className="w-1/3 border-b border-slate-200" />
        </div>

        {/* Switch to Register */}
        <div className="text-center relative z-10 text-sm">
          <span className="text-slate-600">Don't have an account? </span>
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors focus:outline-none"
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Concurrent Session Warning Modal - Placed outside parent to escape filter/transform constraints */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center animate-scale-up">
            
            {/* Warning Icon & Title area */}
            <div className="p-6 pt-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <AlertCircle className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  Log Out of Other Device?
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed px-2">
                  You are already logged in to another device. To continue, you must log out of your previous session.
                </p>
              </div>
            </div>

            {/* Action buttons (Instagram flat-border list style) */}
            <div className="w-full border-t border-slate-100 flex flex-col">
              <button
                onClick={handleForceLogout}
                className="w-full py-4 text-center font-bold text-sm text-red-500 hover:bg-slate-50 transition-colors focus:outline-none border-b border-slate-100"
              >
                Log Out of Other Device
              </button>
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setPendingLoginData(null);
                }}
                className="w-full py-4 text-center font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
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
