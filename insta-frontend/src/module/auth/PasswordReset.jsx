import React, { useState, useRef, useEffect } from "react";
import { Compass, Sparkles, User, ArrowLeft, Mail, Key, ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase";
import { API_BASE_URL } from "../../config";

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
          `${API_BASE_URL}/auth/check-phone?phone=${encodeURIComponent(phoneNumberWithPrefix)}`
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
          const response = await fetch(`${API_BASE_URL}/auth/user-info?username=${encodeURIComponent(identifier)}`);
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
    <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 hover:border-purple-500/30">
      {/* Container for invisible Recaptcha */}
      <div id="recaptcha-container"></div>

      {/* Decorative Glows */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {isVerificationLinkSent ? (
        <>
          {/* Verification Link Sent Success Screen */}
          <div className="text-center mb-6 sm:mb-8 relative z-10 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-green-500/10 mb-6 animate-bounce">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
              Verification Link Sent!
            </h2>
            <p className="text-sm text-slate-600 mt-4 px-4 leading-relaxed">
              A verification link has been successfully sent to your email. Please check your email to verify your account.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center space-y-6">
              <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-green-500 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Redirecting to login in <span className="text-green-500 text-sm font-bold">{verificationCountdown}</span> seconds...
              </p>
              <button
                onClick={() => window.location.replace("/")}
                className="relative w-full py-3.5 px-6 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 transition-transform duration-500 hover:scale-105" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Go to Login Screen
                </span>
              </button>
            </div>
          </div>
        </>
      ) : isEmailUnverified ? (
        <>
          {/* Unverified Email Warning Screen */}
          <div className="text-center mb-6 sm:mb-8 relative z-10 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 shadow-lg shadow-orange-500/10 mb-6 animate-bounce">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
              Email Not Verified
            </h2>
            <p className="text-sm text-slate-600 mt-4 px-4 leading-relaxed">
              The email address associated with your account has not been verified yet. Please verify your email before attempting to reset your password.
            </p>
            {error && (
              <div className="p-3 my-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center animate-shake">
                {error}
              </div>
            )}
            <div className="mt-8 flex flex-col items-center justify-center space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="relative w-full py-3.5 px-6 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 transition-transform duration-500 hover:scale-105" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Verification Link"
                  )}
                </span>
              </button>
              <button
                onClick={() => window.location.replace("/")}
                className="font-bold text-slate-600 hover:text-pink-500 transition-colors text-sm"
              >
                Back to Login
              </button>
            </div>
          </div>
        </>
      ) : isResetSuccess ? (
        <>
          {/* Success Redirect Screen */}
          <div className="text-center mb-6 sm:mb-8 relative z-10 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-green-500/10 mb-6 animate-bounce">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
              Password Reset Successful!
            </h2>
            <p className="text-sm text-slate-600 mt-4 px-4 leading-relaxed">
              Your password has been successfully reset.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center space-y-6">
              <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-green-500 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Redirecting to login in <span className="text-green-500 text-sm font-bold">{successCountdown}</span> seconds...
              </p>
              <button
                onClick={() => window.location.replace("/")}
                className="relative w-full py-3.5 px-6 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 transition-transform duration-500 hover:scale-105" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Go to Login Screen
                </span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {step === 1 && (
            <>
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 p-0.5 shadow-lg shadow-purple-500/10 mb-4">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                    <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                  Trouble Logging In?
                </h2>
                <p className="text-sm text-slate-500 mt-2 px-2">
                  Enter your email, username, or phone number and we'll send you a code to get back into your account.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitIdentifier} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* Identifier Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Username, Email, or Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Username, email, phone number"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
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
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-green-500/10 mb-4 animate-bounce">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                  Enter Verification Code
                </h2>
                <p className="text-sm text-slate-500 mt-2 px-2">
                  We have sent a verification code to <span className="font-semibold text-slate-800">{verifiedPhone}</span>
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitVerification} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* OTP Code Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    6-Digit Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 transition-all duration-300 tracking-[0.25em] text-center font-bold"
                    />
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden shadow-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 transition-transform duration-500 hover:scale-105" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
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
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8 relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 p-0.5 shadow-lg shadow-purple-500/10 mb-4 animate-pulse">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                    <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                  Create New Password
                </h2>
                <p className="text-sm text-slate-500 mt-2 px-2">
                  Choose a strong password for your verified account.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitNewPassword} className="space-y-6 relative z-10">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center animate-shake">
                    {error}
                  </div>
                )}

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
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

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Reset Button */}
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
                        Reset Password
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          )}

          {step === 4 && (
            <>
              {/* Success Redirect Screen */}
              <div className="text-center mb-6 sm:mb-8 relative z-10 py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-green-500/10 mb-6 animate-bounce">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                  Reset Link Sent!
                </h2>
                <p className="text-sm text-slate-600 mt-4 px-4 leading-relaxed">
                  A password reset link has been successfully sent to your email.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-pink-500 animate-spin mb-4" />
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Redirecting to login in <span className="text-pink-500 text-sm font-bold">{countdown}</span> seconds...
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          {step !== 4 && (
            <div className="my-6 flex items-center justify-between text-xs text-slate-400 relative z-10">
              <span className="w-1/3 border-b border-slate-200" />
              <span>OR</span>
              <span className="w-1/3 border-b border-slate-200" />
            </div>
          )}

          {/* Return Actions */}
          {step !== 4 && (
            <div className="text-center relative z-10 text-sm">
              {step === 2 && (
                <button
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-green-600 transition-colors focus:outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use a different phone or email
                </button>
              )}
              {step === 1 && (
                <button
                  onClick={onSwitchToLogin}
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-pink-500 transition-colors focus:outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={onSwitchToLogin}
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-pink-500 transition-colors focus:outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
