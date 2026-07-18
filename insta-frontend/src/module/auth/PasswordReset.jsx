import React, { useState, useRef, useEffect } from "react";
import { Compass, Sparkles, User, ArrowLeft, Mail, Key, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase";
import { API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function PasswordReset({ onSwitchToLogin, isResetFlow = false, userId = null, code = null }) {
  const [step, setStep] = useState(1); // 1: Request code, 2: Verify code, 3: Reset password, 4: Email sent success redirect
  const [identifier, setIdentifier] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(5);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isVerificationLinkSent, setIsVerificationLinkSent] = useState(false);
  const [verificationCountdown, setVerificationCountdown] = useState(10);

  const recaptchaVerifierRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
    );
  }, [step, isVerificationLinkSent, isEmailUnverified, isResetSuccess]);

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
    if (!isResetFlow || !userId || !code) return;

    const verifyToken = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-reset-password?user_id=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setResetEmail(data.email);
          setStep(3);
        } else {
          setError(data.message || "Invalid or expired password reset link.");
        }
      } catch (err) {
        console.error("Token verification error:", err);
        setError("Failed to verify reset link. It may be invalid or expired.");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [isResetFlow, userId, code]);

  useEffect(() => {
    if (step !== 4) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (!isResetSuccess) return;

    const interval = setInterval(() => {
      setSuccessCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isResetSuccess]);

  useEffect(() => {
    if (!isVerificationLinkSent) return;

    const interval = setInterval(() => {
      setVerificationCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVerificationLinkSent]);

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

  const handleResendVerification = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsVerificationLinkSent(true);
      } else {
        setError(data.message || "Failed to send verification link.");
      }
    } catch (err) {
      console.error("Error sending verification link:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitIdentifier = async (e) => {
    e.preventDefault();
    if (!identifier) {
      setError("Please enter your username, email, or phone number.");
      return;
    }

    const isOnlyDigits = /^\d+$/.test(identifier);
    if (isOnlyDigits && identifier.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setError("");
    setIsLoading(true);

    if (isOnlyDigits) {
      const phoneNumberWithPrefix = `+91${identifier}`;
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/check-phone?phone=${encodeURIComponent(phoneNumberWithPrefix)}`
        );
        const data = await response.json();

        if (response.ok && data.exists) {
          // Setup reCAPTCHA and trigger Firebase phone verification
          setupRecaptcha();
          const appVerifier = recaptchaVerifierRef.current;
          const result = await signInWithPhoneNumber(
            auth,
            phoneNumberWithPrefix,
            appVerifier
          );
          
          setConfirmationResult(result);
          setVerifiedPhone(phoneNumberWithPrefix);
          setError("");
          setStep(2);
        } else {
          setError("This phone number does not match any registered account.");
        }
      } catch (err) {
        console.error("Error checking phone number:", err);
        setError(err.message || "Failed to send verification code. Please try again.");
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch (e) {}
          recaptchaVerifierRef.current = null;
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(identifier)) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: identifier,
            }),
          });
          const data = await response.json();

          if (response.ok && data.success) {
            setIdentifier("");
            setStep(4);
          } else {
            if (data.error_code === "EMAIL_NOT_VERIFIED" || data.error_code === "ACCOUNT_NOT_VERIFIED") {
              setUnverifiedEmail(identifier);
              setIsEmailUnverified(true);
              setError("");
            } else {
              setError(data.message || (data.detail && data.detail[0]?.msg) || "Failed to request password reset.");
            }
          }
        } catch (err) {
          console.error("Error requesting password reset:", err);
          setError("An error occurred. Please try again later.");
        } finally {
          setIsLoading(false);
        }
      } else {
        // Treat as username!
        try {
          const response = await fetch(`${API_BASE_URL}/users/user-info?username=${encodeURIComponent(identifier)}`);
          const data = await response.json();

          if (response.ok && data.success) {
            if (data.email) {
              if (!data.is_email_verified) {
                setUnverifiedEmail(data.email);
                setIsEmailUnverified(true);
                setError("");
              } else {
                // Send verification link to email
                const resetResponse = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: data.email }),
                });
                const resetData = await resetResponse.json();

                if (resetResponse.ok && resetData.success) {
                  setIdentifier("");
                  setStep(4);
                } else {
                  setError(resetData.message || "Failed to send reset link to the registered email.");
                }
              }
            } else if (data.phone) {
              // Register using phone: send verification code to phone number
              setupRecaptcha();
              const appVerifier = recaptchaVerifierRef.current;
              const result = await signInWithPhoneNumber(auth, data.phone, appVerifier);
              
              setConfirmationResult(result);
              setVerifiedPhone(data.phone);
              setError("");
              setStep(2);
            } else {
              setError("No contact method registered on this user account.");
            }
          } else {
            setError("This username does not match any registered account.");
          }
        } catch (err) {
          console.error("Username reset check error:", err);
          setError(err.message || "An error occurred. Please try again later.");
          if (recaptchaVerifierRef.current) {
            try {
              recaptchaVerifierRef.current.clear();
            } catch (e) {}
            recaptchaVerifierRef.current = null;
          }
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the verification code.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
        setIsLoading(false);
        setError("");
        setStep(3);
      } else {
        throw new Error("No verification session found. Please request a new code.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid verification code. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.includes(" ")) {
      setError("Password cannot contain spaces.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasSpecial = /[^\w\s]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasSpecial) {
      setError("Password must contain capital & small letters and at least one special character.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const resetType = resetEmail ? "email" : "phone";
      const identifierVal = resetEmail ? resetEmail : verifiedPhone;

      const payload = {
        reset_type: resetType,
        password: newPassword,
        confirm_password: confirmPassword,
      };

      if (resetType === "email") {
        payload.email = identifierVal;
      } else {
        payload.phone = identifierVal;
      }

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsResetSuccess(true);
      } else {
        setError(data.message || (data.detail && data.detail[0]?.msg) || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[420px] p-8 rounded-3xl bg-premium-card border border-premium-border shadow-premium overflow-hidden transition-all duration-300"
    >
      {/* Container for invisible Recaptcha */}
      <div id="recaptcha-container"></div>

      {/* Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      {isVerificationLinkSent ? (
        <div className="text-center relative z-10 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 p-2 shadow-inner mb-6 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-accent-emerald" />
          </div>
          <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
            Verification Link Sent!
          </h2>
          <p className="text-sm text-premium-muted mt-4 px-4 leading-relaxed">
            A verification link has been successfully sent to your email. Check your inbox to activate your account.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center space-y-6">
            <div className="w-10 h-10 rounded-full border-2 border-premium-border border-t-accent-emerald animate-spin" />
            <p className="text-xs text-premium-muted">
              Redirecting in <span className="text-accent-emerald font-bold">{verificationCountdown}</span> seconds...
            </p>
            <button
              onClick={() => window.location.replace("/")}
              className="w-full py-3 bg-white text-premium-bg font-bold rounded-2xl shadow-lg transition-transform duration-200 cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      ) : isEmailUnverified ? (
        <div className="text-center relative z-10 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-orange/10 border border-accent-orange/20 p-2 shadow-inner mb-6">
            <Mail className="w-8 h-8 text-accent-orange" />
          </div>
          <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
            Email Not Verified
          </h2>
          <p className="text-sm text-premium-muted mt-4 px-4 leading-relaxed">
            The email address associated with your account has not been verified yet. Please verify your email before attempting to reset your password.
          </p>
          {error && (
            <div className="p-3.5 my-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium animate-shake">
              {error}
            </div>
          )}
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 w-full">
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="w-full py-3 bg-white text-premium-bg font-bold rounded-2xl shadow-lg transition-transform duration-200 cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
                ) : (
                  "Send Verification Link"
                )}
              </span>
            </button>
            <button
              onClick={() => window.location.replace("/")}
              className="font-bold text-premium-muted hover:text-premium-text transition-colors text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : isResetSuccess ? (
        <div className="text-center relative z-10 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 p-2 shadow-inner mb-6 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-accent-emerald" />
          </div>
          <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
            Reset Successful!
          </h2>
          <p className="text-sm text-premium-muted mt-4 px-4 leading-relaxed">
            Your password has been successfully reset.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center space-y-6">
            <div className="w-10 h-10 rounded-full border-2 border-premium-border border-t-accent-emerald animate-spin" />
            <p className="text-xs text-premium-muted">
              Redirecting in <span className="text-accent-emerald font-bold">{successCountdown}</span> seconds...
            </p>
            <button
              onClick={() => window.location.replace("/")}
              className="w-full py-3 bg-white text-premium-bg font-bold rounded-2xl shadow-lg transition-transform duration-200 cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 1 && (
            <>
              <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-premium-gray border border-premium-border p-0.5 mb-4 shadow-inner">
                  <Mail className="w-6 h-6 text-accent-cyan" />
                </div>
                <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
                  Trouble Logging In?
                </h2>
                <p className="text-sm text-premium-muted mt-2 px-2">
                  Enter your email, username, or phone and we'll send you a link to get back into your account.
                </p>
              </div>

              <form onSubmit={handleSubmitIdentifier} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3.5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium animate-shake">
                    {error}
                  </div>
                )}

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
                      placeholder="Enter identifier"
                      className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                    />
                  </div>
                </div>

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
                        Send Login Link
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-premium-gray border border-premium-border p-0.5 mb-4 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-accent-emerald" />
                </div>
                <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
                  Enter Verification Code
                </h2>
                <p className="text-sm text-premium-muted mt-2">
                  We have sent a verification code to <span className="font-semibold text-premium-text">{verifiedPhone}</span>
                </p>
              </div>

              <form onSubmit={handleSubmitVerification} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3.5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium animate-shake">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
                    6-Digit Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter OTP code"
                      className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200 tracking-[0.25em] text-center font-bold text-lg"
                    />
                  </div>
                </div>

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
                        Verify Code
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-premium-gray border border-premium-border p-0.5 mb-4 shadow-inner">
                  <Lock className="w-6 h-6 text-accent-coral" />
                </div>
                <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
                  Create New Password
                </h2>
                <p className="text-sm text-premium-muted mt-2">
                  Choose a secure password for your verified account.
                </p>
              </div>

              <form onSubmit={handleSubmitNewPassword} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3.5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs text-center font-medium animate-shake">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                    />
                  </div>
                </div>

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
                        Reset Password
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center justify-between text-xs text-premium-muted/30 relative z-10">
            <span className="w-1/3 border-b border-premium-border" />
            <span>OR</span>
            <span className="w-1/3 border-b border-premium-border" />
          </div>

          {/* Switch actions */}
          <div className="text-center relative z-10 text-sm">
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                className="inline-flex items-center gap-2 font-bold text-accent-cyan hover:text-accent-cyan/80 transition-colors focus:outline-none cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Details
              </button>
            )}
            {step === 1 && (
              <button
                onClick={onSwitchToLogin}
                className="font-bold text-accent-cyan hover:text-accent-cyan/80 transition-colors focus:outline-none cursor-pointer"
              >
                Back to Login
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
