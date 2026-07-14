import React, { useState, useEffect } from "react";
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";

export default function EditProfilePage({ profile, token, onBack, onUpdateSuccess }) {
  const [username, setUsername] = useState(profile.username || "");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.profile_picture_url || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" }); // 'success' | 'error'

  // Input validation states
  const [usernameStatus, setUsernameStatus] = useState({
    state: "idle", // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: ""
  });

  const [displayNameError, setDisplayNameError] = useState("");
  const [bioError, setBioError] = useState("");

  // Real-time Display Name validation
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

  // Real-time Bio validation
  useEffect(() => {
    if (bio.length > 150) {
      setBioError("Bio cannot exceed 150 characters.");
    } else {
      setBioError("");
    }
  }, [bio]);

  // Real-time Username validation with API check
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
      // 1. Update text profile info (username, display_name, bio)
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

      // 2. Upload avatar if changed
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
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#efefef]">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-[#262626]">Edit profile</h2>
      </div>

      {status.message && (
        <div className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border text-sm font-semibold transition-all
          ${status.type === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload Selection */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#efefef]">
          <div className="w-[80px] h-[80px] rounded-full overflow-hidden border border-[#dbdbdb] shrink-0 bg-gradient-to-tr from-purple-100 to-pink-100 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-pink-500">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="font-bold text-sm text-[#262626]">{username}</span>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-[#0095f6] hover:bg-[#00376b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,149,246,0.15)] transition-all">
              <Upload className="w-4 h-4" />
              Change photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Username field */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#262626]">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
            placeholder="Username"
            maxLength={30}
            className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all
              ${usernameStatus.state === "available" ? "border-green-300 focus:border-green-500" : ""}
              ${usernameStatus.state === "taken" || usernameStatus.state === "invalid" ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-purple-500"}`}
          />
          {usernameStatus.message && (
            <p className={`text-xs font-semibold
              ${usernameStatus.state === "checking" ? "text-slate-400" : ""}
              ${usernameStatus.state === "available" ? "text-green-600" : ""}
              ${usernameStatus.state === "taken" || usernameStatus.state === "invalid" ? "text-red-500" : ""}`}
            >
              {usernameStatus.message}
            </p>
          )}
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#262626]">Full Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Full name"
            maxLength={20}
            className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all
              ${displayNameError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-purple-500"}`}
          />
          {displayNameError ? (
            <p className="text-xs font-semibold text-red-500">{displayNameError}</p>
          ) : (
            <p className="text-[11px] text-slate-400">
              Help people discover your account by using the name you're known by: either your full name, nickname, or business name.
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#262626]">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write something about yourself..."
            maxLength={150}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border focus:outline-none text-sm transition-all resize-none
              ${bioError ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-purple-500"}`}
          />
          <div className="flex justify-between items-center text-xs">
            {bioError ? (
              <span className="font-semibold text-red-500">{bioError}</span>
            ) : (
              <span />
            )}
            <span className="text-slate-400">
              {bio.length} / 150
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading || isFormInvalid}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0095f6] hover:bg-[#00376b] disabled:opacity-50 text-white font-bold text-sm px-8 py-3 rounded-xl transition-all active:scale-95 shadow-[0_4px_12px_rgba(0,149,246,0.2)]"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
