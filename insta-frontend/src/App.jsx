import React, { useState, useEffect } from "react";
import Login from "./module/auth/Login";
import Register from "./module/auth/Register";
import VerifyEmail from "./module/auth/VerifyEmail";
import PasswordReset from "./module/auth/PasswordReset";
import HomePage from "./module/home/HomePage";
import { API_BASE_URL } from "./config";

export default function App() {
  const isVerifyEmailPath = window.location.pathname === "/verify-email";
  const isResetPasswordPath = window.location.pathname === "/reset-password";
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [view, setView] = useState("login"); // "login", "register", or "forgot_password"

  useEffect(() => {
    if (!token || isVerifyEmailPath || isResetPasswordPath) return;

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setToken(null);
            setView("login");
          }
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };

    verifySession();
  }, [token, isVerifyEmailPath, isResetPasswordPath]);

  const queryParams = new URLSearchParams(window.location.search);
  const userIdParam = queryParams.get("user_id");
  const codeParam = queryParams.get("code");

  const handleLogout = async () => {
    const accToken = localStorage.getItem("access_token");
    if (accToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accToken}`
          }
        });
      } catch (err) {
        console.error("Backend logout error:", err);
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setView("login");
  };

  const isAuthActionPath = isVerifyEmailPath || isResetPasswordPath;

  return (
    <div className={`min-h-screen ${token && !isAuthActionPath ? "bg-[#fafafa]" : "bg-slate-50"} text-slate-900 ${token && !isAuthActionPath ? "" : "flex flex-col items-center justify-center p-4"} font-sans relative overflow-hidden`}>
      {/* Dynamic Animated background blobs (only visible in auth screens) */}
      {(!token || isAuthActionPath) && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] animate-pulse duration-10000 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[120px] animate-pulse duration-7000 pointer-events-none" />
        </>
      )}

      {/* Main content container */}
      <div className={`relative z-10 w-full ${token && !isAuthActionPath ? "" : "flex items-center justify-center"} transition-all duration-500`}>
        {isVerifyEmailPath ? (
          <VerifyEmail onGoToLogin={() => {
            window.history.replaceState({}, '', '/');
            setView("login");
          }} />
        ) : isResetPasswordPath ? (
          <PasswordReset 
            isResetFlow={true} 
            userId={userIdParam} 
            code={codeParam} 
            onSwitchToLogin={() => {
              window.history.replaceState({}, '', '/');
              setView("login");
            }} 
          />
        ) : token ? (
          <HomePage onLogout={handleLogout} />
        ) : view === "login" ? (
          <Login 
            onSwitchToRegister={() => setView("register")} 
            onSwitchToPasswordReset={() => setView("forgot_password")}
          />
        ) : view === "register" ? (
          <Register onSwitchToLogin={() => setView("login")} />
        ) : (
          <PasswordReset onSwitchToLogin={() => setView("login")} />
        )}
      </div>

      {/* Footer / Copyright (only visible in auth screens) */}
      {(!token || isAuthActionPath) && (
        <div className="mt-8 text-center text-xs text-slate-400 relative z-10">
          &copy; {new Date().getFullYear()} Instaclone. All rights reserved.
        </div>
      )}
    </div>
  );
}
