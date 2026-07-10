import React, { useState } from "react";
import Login from "./module/auth/Login";
import Register from "./module/auth/Register";

export default function App() {
  const [view, setView] = useState("login"); // "login" or "register"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Dynamic Animated background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] animate-pulse duration-10000 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[120px] animate-pulse duration-7000 pointer-events-none" />

      {/* Main content container */}
      <div className="relative z-10 w-full flex items-center justify-center transition-all duration-500">
        {view === "login" ? (
          <Login onSwitchToRegister={() => setView("register")} />
        ) : (
          <Register onSwitchToLogin={() => setView("login")} />
        )}
      </div>

      {/* Footer / Copyright */}
      <div className="mt-8 text-center text-xs text-slate-400 relative z-10">
        &copy; {new Date().getFullYear()} Instaclone. All rights reserved.
      </div>
    </div>
  );
}
