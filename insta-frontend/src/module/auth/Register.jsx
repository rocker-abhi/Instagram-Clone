import React, { useState, useEffect, useRef } from "react";
import { Mail, Phone, Lock, User, UserCheck, Shield, Sparkles, KeyRound } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase";

export default function Register({ onSwitchToLogin }) {
  const [method, setMethod] = useState("email"); // "email" or "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
          "expired-callback": () => {
            setError("reCAPTCHA expired. Please try again.");
          }
        });
      }
    } catch (err) {
      console.error("Recaptcha error:", err);
      setError("Failed to initialize security verification.");
    }
  };

  const handleSendOtp = async () => {
    if (!phone || !username || !password) {
      setError("Please fill in phone, username, and password fields first.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      setupRecaptcha();
      const appVerifier = recaptchaVerifierRef.current;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      alert("OTP sent to your phone number!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Please check the format (+1234567890).");
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the verification code.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      await confirmationResult.confirm(otp);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error(err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = (e) => {
    e.preventDefault();
    if (!email || !username || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setIsLoading(true);
    // Simulate email register success
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccessModalOpen(true);
    }, 1500);
  };

  return (
    <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 hover:border-pink-500/30">
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container"></div>

      {/* Decorative Glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Success Modal Overlay */}
      {isSuccessModalOpen && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-green-400 animate-bounce" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
          <p className="text-sm text-slate-400 max-w-xs mb-8">
            Your account has been successfully verified and registered. Welcome to Instaclone!
          </p>
          <button
            onClick={() => {
              setIsSuccessModalOpen(false);
              onSwitchToLogin();
            }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg transition-transform duration-300 transform active:scale-95"
          >
            Go to Login
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-5 sm:mb-6 relative z-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
          Create Account
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Join us to capture & share your favorite moments
        </p>
      </div>

      {/* Method Switcher Tabs (Only if OTP not sent yet) */}
      {!otpSent && (
        <div className="flex p-1 bg-slate-950/60 rounded-2xl border border-white/5 mb-6 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
              method === "email"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("phone");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
              method === "phone"
                ? "bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone Number
          </button>
        </div>
      )}

      {/* Form */}
      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center relative z-10">
          {error}
        </div>
      )}

      {method === "email" ? (
        <form onSubmit={handleEmailRegister} className="space-y-4 relative z-10">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_stories"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 transition-transform duration-500 hover:scale-105" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Sign Up
                </>
              )}
            </span>
          </button>
        </form>
      ) : (
        <div className="space-y-4 relative z-10">
          {!otpSent ? (
            <div className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Phone Number (with Country Code)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+15550000000"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_stories"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 transition-transform duration-500 hover:scale-105" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Send Verification Code
                    </>
                  )}
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
              {/* OTP Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Verification Code (OTP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 transition-transform duration-500 hover:scale-105" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Verify & Register
                    </>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors py-2"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
      )}

      {/* Divider */}
      {!otpSent && (
        <div className="my-5 flex items-center justify-between text-xs text-slate-500 relative z-10">
          <span className="w-1/3 border-b border-slate-800" />
          <span>OR</span>
          <span className="w-1/3 border-b border-slate-800" />
        </div>
      )}

      {/* Switch to Login */}
      {!otpSent && (
        <div className="text-center relative z-10 text-sm">
          <span className="text-slate-400">Have an account? </span>
          <button
            onClick={onSwitchToLogin}
            className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors focus:outline-none"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
