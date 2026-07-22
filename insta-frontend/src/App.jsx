import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Login from "./module/auth/Login";
import Register from "./module/auth/Register";
import VerifyEmail from "./module/auth/VerifyEmail";
import PasswordReset from "./module/auth/PasswordReset";
import HomePage from "./module/home/HomePage";
import Onboarding from "./module/auth/Onboarding";
import { API_BASE_URL, USER_API_BASE_URL } from "./config";

// Global fetch interceptor to handle token refresh automatically
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
  let response = await originalFetch(url, options);

  if (response.status === 401 && !url.includes("/refresh") && !url.includes("/login")) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        const refreshResponse = await originalFetch(`${API_BASE_URL}/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.data) {
            const newAccess = refreshData.data.access_token;
            const newRefresh = refreshData.data.refresh_token;

            localStorage.setItem("access_token", newAccess);
            localStorage.setItem("refresh_token", newRefresh);

            window.dispatchEvent(new CustomEvent("token-refreshed", { detail: { token: newAccess } }));

            const newOptions = { ...options };
            if (newOptions.headers) {
              if (newOptions.headers instanceof Headers) {
                newOptions.headers.set("Authorization", `Bearer ${newAccess}`);
              } else if (Array.isArray(newOptions.headers)) {
                newOptions.headers = newOptions.headers.map(([k, v]) => k.toLowerCase() === "authorization" ? [k, `Bearer ${newAccess}`] : [k, v]);
              } else {
                newOptions.headers = { ...newOptions.headers };
                newOptions.headers["Authorization"] = `Bearer ${newAccess}`;
              }
            }
            return await originalFetch(url, newOptions);
          }
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.dispatchEvent(new Event("auth-logout"));
    }
  }

  return response;
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isVerifyEmailPath = location.pathname === "/verify-email";
  const isResetPasswordPath = location.pathname === "/reset-password";

  // Token refresh state synchronizer
  useEffect(() => {
    const handleLogoutEvent = () => {
      setToken(null);
      navigate("/login");
    };
    const handleRefreshEvent = (e) => {
      setToken(e.detail.token);
    };
    window.addEventListener("auth-logout", handleLogoutEvent);
    window.addEventListener("token-refreshed", handleRefreshEvent);
    return () => {
      window.removeEventListener("auth-logout", handleLogoutEvent);
      window.removeEventListener("token-refreshed", handleRefreshEvent);
    };
  }, [navigate]);

  useEffect(() => {
    if (!token || isVerifyEmailPath || isResetPasswordPath) return;

    const verifySessionAndProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            handleLogoutState();
            return;
          }
        }

        // Fetch onboarding status from User-Service
        const profileResp = await fetch(`${USER_API_BASE_URL}/user-profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (profileResp.ok) {
          const data = await profileResp.json();
          if (data.success && data.data) {
            setIsOnboardingCompleted(data.data.is_onboarding_completed);
            if (!data.data.is_onboarding_completed && location.pathname !== "/onboarding") {
              navigate("/onboarding");
            }
          }
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    };

    verifySessionAndProfile();
  }, [token, location.pathname]);

  const handleLogoutState = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    navigate("/login");
  };

  const handleLogout = async () => {
    const accToken = localStorage.getItem("access_token");
    if (accToken) {
      try {
        await fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accToken}`
          }
        });
      } catch (err) {
        console.error("Backend logout error:", err);
      }
    }
    handleLogoutState();
  };

  const queryParams = new URLSearchParams(location.search);
  const userIdParam = queryParams.get("user_id");
  const codeParam = queryParams.get("code");

  const isAuthActionPath = isVerifyEmailPath || isResetPasswordPath;
  const isFullView = token && isOnboardingCompleted && !isAuthActionPath;

  return (
    <div className={`min-h-screen bg-premium-bg text-premium-text ${isFullView ? "" : "flex flex-col items-center justify-center p-4"} font-sans relative overflow-hidden`}>
      {!isFullView && (
        <>
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      <div className={`relative z-10 w-full ${isFullView ? "" : "flex items-center justify-center"} transition-all duration-500`}>
        <Routes>
          <Route 
            path="/login" 
            element={
              token ? (
                <Navigate to={isOnboardingCompleted ? "/" : "/onboarding"} replace />
              ) : (
                <Login 
                  onSwitchToRegister={() => navigate("/register")} 
                  onSwitchToPasswordReset={() => navigate("/reset-password")}
                />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              token ? (
                <Navigate to={isOnboardingCompleted ? "/" : "/onboarding"} replace />
              ) : (
                <Register onSwitchToLogin={() => navigate("/login")} />
              )
            } 
          />
          <Route 
            path="/verify-email" 
            element={<VerifyEmail onGoToLogin={() => navigate("/login")} />} 
          />
          <Route 
            path="/reset-password" 
            element={
              <PasswordReset 
                isResetFlow={userIdParam && codeParam ? true : false} 
                userId={userIdParam} 
                code={codeParam} 
                onSwitchToLogin={() => navigate("/login")} 
              />
            } 
          />
          <Route 
            path="/onboarding" 
            element={
              !token ? (
                <Navigate to="/login" replace />
              ) : isOnboardingCompleted ? (
                <Navigate to="/" replace />
              ) : (
                <Onboarding
                  token={token}
                  onCompleteOnboarding={() => {
                    setIsOnboardingCompleted(true);
                    setToken(localStorage.getItem("access_token"));
                    navigate("/");
                  }}
                  onLogout={handleLogout}
                />
              )
            } 
          />
          
          {/* Main App Layout (Home, Profile) */}
          <Route 
            path="/*" 
            element={
              !token ? (
                <Navigate to="/login" replace />
              ) : !isOnboardingCompleted ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <HomePage onLogout={handleLogout} token={token} />
              )
            } 
          />
        </Routes>
      </div>

      {(!token || isAuthActionPath) && (
        <div className="mt-8 text-center text-xs text-slate-400 relative z-10">
          &copy; {new Date().getFullYear()} Instaclone. All rights reserved.
        </div>
      )}
    </div>
  );
}
