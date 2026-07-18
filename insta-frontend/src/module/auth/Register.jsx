import React, { useState, useEffect, useRef } from "react";
import { Mail, Phone, Lock, User, UserCheck, Shield, Sparkles, KeyRound } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase";
import { API_BASE_URL, USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

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
  const containerRef = useRef(null);

  useEffect(() => {
    // Premium entry animation
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
    );
  }, []);

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
          `${USER_API_BASE_URL}/user-profile/check-username?username=${username}`
        );
        const data = await response.json();
        if (data.success && data.data) {
          if (!data.data.available) {
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
    <div 
      ref={containerRef}
      className="relative w-full max-w-[420px] p-8 rounded-3xl bg-premium-card border border-premium-border shadow-premium overflow-hidden transition-all duration-300"
    >
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container"></div>

      {/* Decorative Glow */}
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Success Modal Overlay */}
      {isSuccessModalOpen && (
        <div className="absolute inset-0 bg-premium-card/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-accent-emerald/10 border border-accent-emerald/20 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-accent-emerald" />
          </div>
          <h3 className="text-xl font-bold font-display text-premium-text mb-2">Success!</h3>
          <p className="text-sm text-premium-muted max-w-xs mb-4 leading-relaxed">
            {method === "email" 
              ? "A verification link has been sent to your email. Check your inbox to activate your account."
              : "Your account has been successfully verified. Welcome!"}
          </p>
          <p className="text-xs text-premium-muted/60 font-semibold uppercase tracking-wider mb-6">
            Redirecting in <span className="text-accent-cyan font-bold">{redirectCountdown}</span> seconds...
          </p>
          <button
            onClick={() => {
              setIsSuccessModalOpen(false);
              onSwitchToLogin();
            }}
            className="px-8 py-3 bg-white text-premium-bg hover:bg-slate-100 font-bold rounded-2xl shadow-lg transition-transform duration-200 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 relative z-10">
        <h2 className="text-2xl font-bold font-display text-premium-text tracking-tight">
          Create Account
        </h2>
        <p className="text-sm text-premium-muted mt-2">
          Join the premium, aesthetic social network
        </p>
      </div>

      {/* Method Switcher Tabs (Only if OTP not sent yet) */}
      {!otpSent && (
        <div className="flex p-1 bg-premium-bg rounded-2xl border border-premium-border mb-6 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
              method === "email"
                ? "bg-premium-gray text-premium-text shadow-sm"
                : "text-premium-muted hover:text-premium-text"
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
              method === "phone"
                ? "bg-premium-gray text-premium-text shadow-sm"
                : "text-premium-muted hover:text-premium-text"
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone
          </button>
        </div>
      )}

      {/* Form Error */}
      {error && (
        <div className="p-3.5 mb-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium relative z-10">
          {error}
        </div>
      )}

      {method === "email" ? (
        <form onSubmit={handleEmailRegister} className="space-y-4 relative z-10" autoComplete="off">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-premium-muted tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-premium-muted tracking-wider block">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_stories"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
            </div>
            {usernameStatus === "checking" && (
              <span className="text-xs text-accent-cyan mt-1 block font-medium">Checking username availability...</span>
            )}
            {usernameStatus === "available" && (
              <span className="text-xs text-accent-emerald mt-1 block font-medium">Username is available!</span>
            )}
            {usernameStatus === "taken" && (
              <span className="text-xs text-accent-coral mt-1 block font-medium">Username is already taken.</span>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-premium-muted tracking-wider block">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-premium-muted tracking-wider block">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-premium-bg font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
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
                <label className="text-xs font-semibold text-premium-muted tracking-wider block">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted gap-1.5">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-semibold text-premium-muted border-r border-premium-border pr-2">+91</span>
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
                    className="w-full pl-[74px] pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-premium-muted tracking-wider block">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_stories"
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  />
                </div>
                {usernameStatus === "checking" && (
                  <span className="text-xs text-accent-cyan mt-1 block font-medium">Checking username availability...</span>
                )}
                {usernameStatus === "available" && (
                  <span className="text-xs text-accent-emerald mt-1 block font-medium">Username is available!</span>
                )}
                {usernameStatus === "taken" && (
                  <span className="text-xs text-accent-coral mt-1 block font-medium">Username is already taken.</span>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-premium-muted tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-premium-muted tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-premium-bg font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5" />
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
                <label className="text-xs font-semibold text-premium-muted tracking-wider block">
                  Verification Code (OTP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-premium-bg font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
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
      <div className="my-6 flex items-center justify-between text-xs text-premium-muted/30 relative z-10">
        <span className="w-1/3 border-b border-premium-border" />
        <span>OR</span>
        <span className="w-1/3 border-b border-premium-border" />
      </div>

      {/* Switch to Login */}
      <div className="text-center relative z-10 text-sm">
        <span className="text-premium-muted">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-bold text-accent-cyan hover:text-accent-cyan/80 hover:underline transition-colors focus:outline-none cursor-pointer"
        >
          Log In
        </button>
      </div>
    </div>
  );
}
