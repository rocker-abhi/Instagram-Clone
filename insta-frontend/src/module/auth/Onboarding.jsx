import React, { useState, useRef, useEffect } from "react";
import { Sparkles, User, FileText, Camera, LogOut, AlertCircle, CheckCircle2, ShieldCheck, ImageOff } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function Onboarding({ token, onCompleteOnboarding, onLogout }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
    );
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");
    setAvatarFile(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl("");
    }

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError(`Unsupported file type. Please upload a JPEG, PNG, or WebP image.`);
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const clearAvatar = (e) => {
    e.stopPropagation();
    setAvatarFile(null);
    setFileError("");
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (fileError) {
      setError("Please fix the profile picture error before continuing.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("display_name", displayName.trim());
      formData.append("bio", bio.trim());
      if (avatarFile) {
        formData.append("profile_picture", avatarFile);
      }

      const response = await fetch(`${USER_API_BASE_URL}/user-profile/setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        onCompleteOnboarding();
      } else {
        setError(data.message || "Failed to set up profile. Please try again.");
      }
    } catch (err) {
      console.error("Onboarding submit error:", err);
      setError("Failed to connect to the user service. Please check if the service is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-4xl bg-premium-card border border-premium-border rounded-3xl shadow-premium flex flex-col md:flex-row overflow-hidden transition-all duration-300 my-8"
    >
      {/* Left Branding Panel */}
      <div className="md:w-5/12 bg-premium-gray border-r border-premium-border p-10 text-premium-text flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10">
          <h1 className="text-2xl font-bold font-display text-premium-text tracking-tight mb-3">Instaclone</h1>
          <p className="text-premium-muted text-sm leading-relaxed">
            Welcome to a premium space for sharing moments, stories, and connections in real-time.
          </p>
        </div>

        <div className="z-10 my-8 space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-premium-muted">
            Why Complete Profile?
          </h3>
          <div className="space-y-3">
            {[
              "Personalize your feed identity",
              "Help friends locate your official profile",
              "Unlocks messages and direct replies",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-accent-cyan shrink-0" />
                <span className="text-xs font-semibold text-premium-text/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 flex items-center gap-2 text-premium-muted text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-accent-emerald" />
          <span>Secure Identity Setup</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 p-8 md:p-12 flex flex-col justify-center items-center bg-premium-card">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
              Create Your Profile
            </h2>
            <p className="text-premium-muted text-xs mt-2">
              Add your display details and avatar to complete onboarding.
            </p>
          </div>

          {error && (
            <div className="w-full mb-5 p-3.5 bg-accent-coral/10 border border-accent-coral/20 text-accent-coral rounded-2xl text-xs flex items-center gap-2.5 z-10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-3">
              <input
                id="avatar-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <div
                className="relative group cursor-pointer"
                onClick={triggerFileSelect}
                title="Upload profile picture"
              >
                <div className="w-24 h-24 rounded-full bg-premium-bg border border-premium-border overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-[1.02] ring-4 ring-premium-border/50 group-hover:ring-accent-blue/10">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-premium-muted">
                      <Camera className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-[9px] mt-1 font-bold uppercase tracking-wider">
                        Add Photo
                      </span>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-premium-gray text-premium-text flex items-center justify-center border-2 border-premium-card shadow-md transition-transform duration-200 group-hover:scale-110">
                  <Camera className="w-3.5 h-3.5" />
                </div>

                {avatarFile && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    title="Remove photo"
                    className="absolute top-0 right-0 w-6 h-6 rounded-full bg-accent-coral text-white flex items-center justify-center border border-premium-card shadow-md hover:bg-accent-coral/90 transition-colors z-10 cursor-pointer"
                  >
                    <ImageOff className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={triggerFileSelect}
                className="text-xs font-bold text-accent-cyan hover:text-accent-cyan/80 transition cursor-pointer"
              >
                {avatarFile ? "Change photo" : "Select photo"}
              </button>

              {avatarFile && !fileError && (
                <p className="text-[10px] text-premium-muted text-center">
                  {avatarFile.name} ({ (avatarFile.size / 1024).toFixed(0) } KB)
                </p>
              )}

              {fileError && (
                <div className="flex items-center gap-1.5 text-[11px] text-accent-coral font-semibold text-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fileError}
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="display-name" className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
                Display Name <span className="text-accent-coral">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-premium-muted" />
                <input
                  id="display-name"
                  type="text"
                  placeholder="e.g. Abhishek Kumar"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="bio" className="text-xs font-semibold text-premium-muted uppercase tracking-wider block">
                  Biography
                </label>
                <span className="text-[10px] text-premium-muted font-bold">
                  {bio.length}/150
                </span>
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-premium-muted" />
                <textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-sm focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !!fileError}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-premium-bg font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-premium-bg/30 border-t-premium-bg rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </button>
          </form>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="mt-6 text-xs font-bold uppercase tracking-wider text-premium-muted hover:text-premium-text transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
