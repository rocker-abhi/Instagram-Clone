import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, Shield, Compass, Sparkles } from "lucide-react";

export default function Login({ onSwitchToRegister }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setIsLoading(true);
    // Simulate login for frontend presentation
    setTimeout(() => {
      setIsLoading(false);
      alert("Logged in successfully! (Demo Mode)");
    }, 1500);
  };

  return (
    <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/30">
      {/* Decorative Glows */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 p-0.5 shadow-lg shadow-purple-500/20 mb-4 animate-pulse">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
          Welcome Back
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Discover stories, connect with friends
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-shake">
            {error}
          </div>
        )}

        {/* Identifier Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Username, Email, or Phone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-5 h-5 transition-colors group-focus-within:text-purple-500" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. alex_story or alex@example.com"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <a href="#" className="text-xs text-pink-500 hover:text-pink-400 transition-colors font-medium">
              Forgot?
            </a>
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
              className="w-full pl-11 pr-11 py-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
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
      <div className="my-6 flex items-center justify-between text-xs text-slate-500 relative z-10">
        <span className="w-1/3 border-b border-slate-800" />
        <span>OR</span>
        <span className="w-1/3 border-b border-slate-800" />
      </div>

      {/* Switch to Register */}
      <div className="text-center relative z-10 text-sm">
        <span className="text-slate-400">Don't have an account? </span>
        <button
          onClick={onSwitchToRegister}
          className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors focus:outline-none"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
