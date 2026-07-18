import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function EditProfilePage({ profile, token, onBack, onUpdateSuccess }) {
  const [username, setUsername] = useState(profile.username || "");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.profile_picture_url || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" }); // 'success' | 'error'

  const [usernameStatus, setUsernameStatus] = useState({
    state: "idle", // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: ""
  });

  const [displayNameError, setDisplayNameError] = useState("");
  const [bioError, setBioError] = useState("");
  
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (!displayName.trim()) {
      setDisplayNameError("Full name is required.");
      return;
    }
    if (displayName.length < 6 || displayName.length > 20) {
      setDisplayNameError("Full name must be between 6 and 20 characters.");
      return;
    }
    const nameRegex = /^[a-zA-Z0-9 ]+$/;
    if (!nameRegex.test(displayName)) {
      setDisplayNameError("Full name can only contain letters, numbers, and spaces.");
      return;
    }
    if (displayName.includes("  ")) {
      setDisplayNameError("Full name cannot contain consecutive spaces.");
      return;
    }
    setDisplayNameError("");
  }, [displayName]);

  useEffect(() => {
    if (bio.length > 150) {
      setBioError("Bio cannot exceed 150 characters.");
    } else {
      setBioError("");
    }
  }, [bio]);

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus({ state: "invalid", message: "Username cannot be empty." });
      return;
    }

    if (username.includes(" ")) {
      setUsernameStatus({ state: "invalid", message: "Username cannot contain spaces." });
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus({
        state: "invalid",
        message: "Usernames can only use letters, numbers, underscores, and periods."
      });
      return;
    }

    if (username.startsWith(".") || username.endsWith(".")) {
      setUsernameStatus({ state: "invalid", message: "Usernames cannot start or end with a period." });
      return;
    }

    if (username.includes("..")) {
      setUsernameStatus({ state: "invalid", message: "Usernames cannot contain consecutive periods." });
      return;
    }

    if (username.length < 6 || username.length > 20) {
      setUsernameStatus({ state: "invalid", message: "Username must be between 6 and 20 characters." });
      return;
    }

    if (username === profile.username) {
      setUsernameStatus({ state: "idle", message: "" });
      return;
    }

    setUsernameStatus({ state: "checking", message: "Checking availability..." });

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `${USER_API_BASE_URL}/user-profile/check-username?username=${encodeURIComponent(username)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            if (data.data.available) {
              setUsernameStatus({ state: "available", message: "✓ Username is available" });
            } else {
              setUsernameStatus({ state: "taken", message: "✗ Username is already taken" });
            }
          }
        }
      } catch (err) {
        console.error("Failed to check username availability:", err);
        setUsernameStatus({ state: "idle", message: "" });
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username, profile.username, token]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", message: "Image size must be less than 5MB" });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (usernameStatus.state === "taken" || usernameStatus.state === "invalid" || displayNameError || bioError) {
      setStatus({ type: "error", message: "Please resolve all validation errors before submitting." });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const putRes = await fetch(`${USER_API_BASE_URL}/user-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username,
          display_name: displayName,
          bio: bio,
          is_onboarding_completed: true
        })
      });

      if (!putRes.ok) {
        const errorData = await putRes.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile details");
      }

      let updatedData = (await putRes.json()).data;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("display_name", displayName);
        formData.append("bio", bio);
        formData.append("profile_picture", avatarFile);

        const uploadRes = await fetch(`${USER_API_BASE_URL}/user-profile/setup`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload profile picture");
        }
        updatedData = (await uploadRes.json()).data;
      }

      setStatus({ type: "success", message: "Profile updated successfully!" });
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedData);
      }
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "An error occurred while updating profile" });
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = 
    usernameStatus.state === "checking" || 
    usernameStatus.state === "taken" || 
    usernameStatus.state === "invalid" || 
    !!displayNameError || 
    !!bioError;

  return (
    <div ref={containerRef} className="w-full max-w-[600px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-premium-border/50">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-premium-gray rounded-full transition-colors text-premium-text cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold font-display text-premium-text">Edit profile</h2>
      </div>

      {status.message && (
        <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-xs font-semibold transition-all
          ${status.type === "success" 
            ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald" 
            : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"}`}
        >
          {status.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-premium-border/40">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden border border-premium-border shrink-0 bg-premium-gray flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-xl font-bold text-premium-text">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="font-bold text-xs text-premium-text">{username}</span>
            <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white text-premium-bg hover:bg-slate-100 font-bold text-[10px] px-4 py-2 rounded-2xl shadow transition-all">
              <Upload className="w-3.5 h-3.5" />
              Change Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-premium-muted uppercase tracking-wider">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
            placeholder="Username"
            maxLength={30}
            className={`w-full px-4 py-3 bg-premium-bg rounded-2xl border text-xs focus:outline-none focus:ring-1 transition-all
              ${usernameStatus.state === "available" ? "border-accent-emerald focus:border-accent-emerald focus:ring-accent-emerald/30" : ""}
              ${usernameStatus.state === "taken" || usernameStatus.state === "invalid" ? "border-accent-coral focus:border-accent-coral focus:ring-accent-coral/30" : "border-premium-border focus:border-accent-blue focus:ring-accent-blue/30"}`}
          />
          {usernameStatus.message && (
            <p className={`text-[10px] font-bold mt-1
              ${usernameStatus.state === "checking" ? "text-premium-muted" : ""}
              ${usernameStatus.state === "available" ? "text-accent-emerald" : ""}
              ${usernameStatus.state === "taken" || usernameStatus.state === "invalid" ? "text-accent-coral" : ""}`}
            >
              {usernameStatus.message}
            </p>
          )}
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-premium-muted uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full name"
            maxLength={20}
            className={`w-full px-4 py-3 bg-premium-bg rounded-2xl border text-xs focus:outline-none focus:ring-1 transition-all
              ${displayNameError ? "border-accent-coral focus:border-accent-coral focus:ring-accent-coral/30" : "border-premium-border focus:border-accent-blue focus:ring-accent-blue/30"}`}
          />
          {displayNameError ? (
            <p className="text-[10px] font-bold text-accent-coral mt-1">{displayNameError}</p>
          ) : (
            <p className="text-[10px] text-premium-muted">
              Help people discover your profile by using the name you are known by.
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-premium-muted uppercase tracking-wider">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write something about yourself..."
            maxLength={150}
            rows={4}
            className={`w-full px-4 py-3 bg-premium-bg rounded-2xl border text-xs focus:outline-none focus:ring-1 transition-all resize-none
              ${bioError ? "border-accent-coral focus:border-accent-coral focus:ring-accent-coral/30" : "border-premium-border focus:border-accent-blue focus:ring-accent-blue/30"}`}
          />
          <div className="flex justify-between items-center text-[10px] font-semibold">
            {bioError ? (
              <span className="text-accent-coral">{bioError}</span>
            ) : (
              <span />
            )}
            <span className="text-premium-muted">
              {bio.length} / 150
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading || isFormInvalid}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-premium-bg disabled:opacity-50 font-bold text-xs px-8 py-3.5 rounded-2xl transition-all active:scale-95 shadow cursor-pointer hover:bg-slate-100"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Submit Details
          </button>
        </div>
      </form>
    </div>
  );
}
