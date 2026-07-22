import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function VerifyEmail({ onGoToLogin }) {
  const [status, setStatus] = useState("verifying"); // "verifying", "success", "error"
  const [message, setMessage] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
    );
  }, []);

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
          `${API_BASE_URL}/verify-email?user_id=${userId}&code=${code}`
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
    <div 
      ref={containerRef}
      className="relative w-full max-w-[420px] p-8 rounded-3xl bg-premium-card border border-premium-border shadow-premium overflow-hidden transition-all duration-300"
    >
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10 py-4">
        {status === "verifying" && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-accent-cyan animate-spin" />
            <h2 className="text-xl font-bold font-display text-premium-text">Verifying Your Email</h2>
            <p className="text-sm text-premium-muted">Checking verification code with the server...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 p-2 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-accent-emerald animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-accent-emerald">
                Email Verified!
              </h2>
              <p className="text-sm text-premium-muted px-4 leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-premium-muted/50">
              Redirecting you to dashboard in 3 seconds...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-coral/10 border border-accent-coral/20 p-2 shadow-inner">
              <XCircle className="w-8 h-8 text-accent-coral" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-accent-coral">
                Verification Failed
              </h2>
              <p className="text-sm text-premium-muted px-4 leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-premium-muted/50">
              Redirecting in 4 seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
