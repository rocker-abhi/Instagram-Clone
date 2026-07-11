import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "../../config";

export default function VerifyEmail({ onGoToLogin }) {
  const [status, setStatus] = useState("verifying"); // "verifying", "success", "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get("user_id");
      const code = params.get("code");

      if (!userId || !code) {
        setStatus("error");
        setMessage("Invalid verification link. Missing user ID or verification code.");
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-email?user_id=${userId}&code=${code}`
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully!");
          setTimeout(() => {
            window.location.replace("/");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Failed to verify email. The code might be expired or invalid.");
          setTimeout(() => {
            window.location.replace("/");
          }, 4000);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again later.");
        setTimeout(() => {
          window.location.replace("/");
        }, 4000);
      }
    };

    verify();
  }, []);

  return (
    <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 hover:border-blue-500/30">
      {/* Glows */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10 py-4">
        {status === "verifying" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-extrabold text-slate-800">Verifying Your Email</h2>
            <p className="text-sm text-slate-500">Checking verification code with the server...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border border-green-200 p-2 shadow-lg shadow-green-500/10 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Email Verified!
              </h2>
              <p className="text-sm text-slate-500 px-4">{message}</p>
            </div>
            <p className="text-xs text-slate-400 animate-pulse">
              Redirecting you to login page in 3 seconds...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border border-red-200 p-2 shadow-lg shadow-red-500/10 animate-pulse">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-red-600">
                Verification Failed
              </h2>
              <p className="text-sm text-slate-500 px-4">{message}</p>
            </div>
            <p className="text-xs text-slate-400 animate-pulse">
              Redirecting you to login page in 4 seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
