import React, { useState, useEffect, useRef } from "react";
import { Mail, Phone, Lock, User, UserCheck, Shield, Sparkles, KeyRound } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase";
import { API_BASE_URL } from "../../config";

export default function Register({ onSwitchToLogin }) {
  const [method, setMethod] = useState("email"); // "email" or "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // "", "checking", "available", "taken"
  const [phoneStatus, setPhoneStatus] = useState(""); // "", "checking", "available", "taken"

  const recaptchaVerifierRef = useRef(null);

  // Recaptcha cleanup on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("Failed to clear Recaptcha:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (phone.length !== 10) {
      setPhoneStatus("");
      return;
    }

    setPhoneStatus("checking");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/phone?phone=%2B91${phone}`
        );
        const data = await response.json();
        if (data.success) {
          if (data.exists) {
            setPhoneStatus("taken");
          } else {
            setPhoneStatus("available");
          }
        }
      } catch (err) {
        console.error("Error checking phone number:", err);
        setPhoneStatus("");
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [phone]);

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("");
      return;
    }

    setUsernameStatus("checking");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/search?identifier=${username}`
        );
        const data = await response.json();
        if (data.success) {
          if (data.message === "User found") {
            setUsernameStatus("taken");
          } else {
            setUsernameStatus("available");
          }
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameStatus("");
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  useEffect(() => {
    if (!isSuccessModalOpen) return;

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onSwitchToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccessModalOpen, onSwitchToLogin]);

  useEffect(() => {
    // Clear error by default
    setError("");

    if (method === "email") {
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError("Please enter a valid email address.");
          return;
        }
      }
    } else {
      if (phone) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
          setError("Please enter a valid 10-digit phone number.");
          return;
        }
        if (phoneStatus === "taken") {
          setError("Phone number is already registered.");
          return;
        }
      }
    }

    if (username) {
      if (username.includes(" ")) {
        setError("Username cannot contain spaces.");
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9._]+$/;
      if (!usernameRegex.test(username)) {
        setError("Usernames can only use letters, numbers, underscores, and periods.");
        return;
      }
      if (username.startsWith(".") || username.endsWith(".")) {
        setError("Usernames cannot start or end with a period.");
        return;
      }
      if (username.includes("..")) {
        setError("Usernames cannot contain consecutive periods.");
        return;
      }
      if (username.length < 6 || username.length > 20) {
        setError("Username must be between 6 and 20 characters.");
        return;
      }
    }

    if (username && usernameStatus === "taken") {
      setError("Username is already taken.");
      return;
    }

    if (password) {
      if (password.includes(" ")) {
        setError("Password cannot contain spaces.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasSpecial = /[^\w\s]/.test(password);
      if (!hasUppercase || !hasLowercase || !hasSpecial) {
        setError("Password must contain capital & small letters and at least one special character.");
        return;
      }
    }
  }, [email, phone, username, password, confirmPassword, method, usernameStatus, phoneStatus]);

  const setupRecaptcha = () => {
    if (recaptchaVerifierRef.current) return;
    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response) => {
          console.log("Recaptcha resolved");
        },
        "expired-callback": () => {
          console.log("Recaptcha expired");
        }
      });
      recaptchaVerifierRef.current = verifier;
    } catch (err) {
      console.error("Recaptcha setup failed:", err);
    }
  };

  const handleSendOtp = async () => {
    if (!phone || !username || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone) || usernameStatus === "taken" || phoneStatus === "taken" || password.length < 6 || password !== confirmPassword) {
      return; 
    }
    setError("");
    setIsLoading(true);

    try {
      setupRecaptcha();
      const appVerifier = recaptchaVerifierRef.current;
      const fullPhoneNumber = `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
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
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registeration_type: "phone",
          username: username,
          password: password,
          phone: `+91${phone}`,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsSuccessModalOpen(true);
      } else {
        setError(data.message || "Failed to complete registration.");
      }
    } catch (err) {
      console.error(err);
      setError("Invalid verification code or registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || usernameStatus === "taken" || password.length < 6 || password !== confirmPassword) {
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registeration_type: "email",
          username: username,
          password: password,
          email: email,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsSuccessModalOpen(true);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 hover:border-pink-500/30">
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container"></div>

      {/* Decorative Glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Success Modal Overlay */}
      {isSuccessModalOpen && (
        <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-green-500 animate-bounce" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Success!</h3>
          <p className="text-sm text-slate-500 max-w-xs mb-4">
            {method === "email" 
              ? "A verification link has been sent to your email. Please check your inbox and verify your email to activate your account."
              : "Your account has been successfully verified and registered. Welcome to Instaclone!"}
          </p>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-6">
            Redirecting to login in <span className="text-pink-500 font-bold">{redirectCountdown}</span> seconds...
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
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
          Create Account
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Join us to capture & share your favorite moments
        </p>
      </div>

      {/* Method Switcher Tabs (Only if OTP not sent yet) */}
      {!otpSent && (
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-6 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
              method === "email"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900"
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
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone Number
          </button>
        </div>
      )}

      {/* Form */}
      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center relative z-10">
          {error}
        </div>
      )}

      {method === "email" ? (
        <form onSubmit={handleEmailRegister} className="space-y-4 relative z-10" autoComplete="off">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
              />
            </div>
            {usernameStatus === "checking" && (
              <span className="text-xs text-purple-600 mt-1 block">Checking username availability...</span>
            )}
            {usernameStatus === "available" && (
              <span className="text-xs text-green-600 mt-1 block">Username is available!</span>
            )}
            {usernameStatus === "taken" && (
              <span className="text-xs text-red-500 mt-1 block">Username is already taken.</span>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                autoComplete="new-password"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 tracking-wider block">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
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
                <label className="text-xs font-semibold text-slate-600 tracking-wider block">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 gap-1.5">
                    <Phone className="w-5 h-5" />
                    <span className="text-sm font-semibold text-slate-600 border-r border-slate-200 pr-2">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) {
                        setPhone(val);
                      }
                    }}
                    placeholder="9876543210"
                    autoComplete="off"
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                    autoComplete="off"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all duration-300"
                  />
                </div>
                {usernameStatus === "checking" && (
                  <span className="text-xs text-pink-600 mt-1 block">Checking username availability...</span>
                )}
                {usernameStatus === "available" && (
                  <span className="text-xs text-green-600 mt-1 block">Username is available!</span>
                )}
                {usernameStatus === "taken" && (
                  <span className="text-xs text-red-500 mt-1 block">Username is already taken.</span>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all duration-300"
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
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4" autoComplete="off">
              {/* OTP Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 tracking-wider block">
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
                    autoComplete="one-time-code"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all duration-300"
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
            </form>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="my-6 flex items-center justify-between text-xs text-slate-400 relative z-10">
        <span className="w-1/3 border-b border-slate-200" />
        <span>OR</span>
        <span className="w-1/3 border-b border-slate-200" />
      </div>

      {/* Switch to Login */}
      <div className="text-center relative z-10 text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors focus:outline-none"
        >
          Log In
        </button>
      </div>
    </div>
  );
}
