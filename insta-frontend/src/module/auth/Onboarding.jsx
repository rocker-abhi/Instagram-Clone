import React, { useState, useRef } from "react";
import {
  Sparkles,
  User,
  FileText,
  Camera,
  LogOut,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ImageOff,
} from "lucide-react";
import { USER_API_BASE_URL } from "../../config";

// Client-side guards (must match backend limits)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function Onboarding({ token, onCompleteOnboarding, onLogout }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  // Raw File object (sent as multipart) + an object URL for preview only
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ─── File Selection ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    // Reset previous state regardless of whether a file was chosen
    setFileError("");
    setAvatarFile(null);
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl("");
    }

    if (!file) return;

    // Client-side MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError(`Unsupported file type. Please upload a JPEG, PNG, or WebP image.`);
      // Clear the file input so the same file can be reselected after fixing
      e.target.value = "";
      return;
    }

    // Client-side size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Image is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    // All good — store the File reference and create a preview URL
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

  // ─── Submit ──────────────────────────────────────────────────────────────
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
      // Build multipart/form-data — the browser sets the correct Content-Type
      // boundary automatically when using FormData; never set it manually.
      const formData = new FormData();
      formData.append("display_name", displayName.trim());
      formData.append("bio", bio.trim());
      if (avatarFile) {
        formData.append("profile_picture", avatarFile);
      }

      const response = await fetch(`${USER_API_BASE_URL}/user-profile/setup`, {
        method: "POST",
        headers: {
          // ⚠️  Do NOT set Content-Type here — the browser adds it with the boundary
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clean up the preview object URL to avoid memory leaks
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

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl bg-white/70 backdrop-blur-lg border border-slate-200/60 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden transition-all duration-500 my-8">

      {/* ── Left Branding Panel ─────────────────────────────────────────── */}
      <div className="md:w-5/12 bg-gradient-to-tr from-purple-700 via-pink-600 to-orange-500 p-10 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10">
          <h1 className="font-serif text-4xl tracking-wide select-none mb-3">Instaclone</h1>
          <p className="text-white/80 text-sm font-medium leading-relaxed">
            Join millions of people sharing their moments, hobbies, and stories in real-time.
          </p>
        </div>

        <div className="z-10 my-8 space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-white/60">
            Why Setup Your Profile?
          </h3>
          <div className="space-y-3">
            {[
              "Personalize your feed view",
              "Help friends find your official handle",
              "Customize comments & notification cards",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-300 shrink-0" />
                <span className="text-xs font-semibold text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 flex items-center gap-2 text-white/70 text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Identity Setup</span>
        </div>
      </div>

      {/* ── Right Form Panel ────────────────────────────────────────────── */}
      <div className="flex-1 p-8 md:p-12 flex flex-col justify-center items-center bg-white/40">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Create Your Profile
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Add your information to configure your profile card.
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div className="w-full mb-5 p-3.5 bg-red-50/80 backdrop-blur border border-red-100 text-red-600 rounded-2xl text-xs flex items-center gap-2.5 z-10">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-6">

            {/* ── Avatar Upload ─────────────────────────────────────────── */}
            <div className="flex flex-col items-center space-y-3">
              {/* Hidden real file input */}
              <input
                id="avatar-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              {/* Clickable avatar circle */}
              <div
                className="relative group cursor-pointer"
                onClick={triggerFileSelect}
                title="Click to upload a profile picture"
              >
                <div className="w-28 h-28 rounded-full bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md ring-4 ring-slate-100/50 group-hover:ring-pink-500/10">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Camera className="w-8 h-8 stroke-[1.5]" />
                      <span className="text-[10px] mt-1.5 font-bold uppercase tracking-wider">
                        Add Photo
                      </span>
                    </div>
                  )}
                </div>

                {/* Edit badge */}
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center border-2 border-white shadow-md transition-transform duration-300 group-hover:scale-110">
                  <Camera className="w-3.5 h-3.5" />
                </div>

                {/* Remove badge — only shown when a file is selected */}
                {avatarFile && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    title="Remove photo"
                    className="absolute top-0 right-0 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-red-600 transition-colors z-10"
                  >
                    <ImageOff className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Action link */}
              <button
                type="button"
                onClick={triggerFileSelect}
                className="text-xs font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text hover:opacity-80 transition"
              >
                {avatarFile ? "Change Profile Picture" : "Select Profile Picture"}
              </button>

              {/* File meta info */}
              {avatarFile && !fileError && (
                <p className="text-[10px] text-slate-400 text-center">
                  {avatarFile.name} &nbsp;·&nbsp;{(avatarFile.size / 1024).toFixed(0)} KB
                </p>
              )}

              {/* File error */}
              {fileError && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold text-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fileError}
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                JPEG · PNG · WebP &nbsp;·&nbsp; Max {MAX_FILE_SIZE_MB} MB
              </p>
            </div>

            {/* ── Display Name ──────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label
                htmlFor="display-name"
                className="text-xs font-bold text-slate-400 uppercase tracking-widest block"
              >
                Display Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="display-name"
                  type="text"
                  placeholder="e.g. Abhishek Kumar"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200/80 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition duration-200 shadow-inner"
                  required
                />
              </div>
            </div>

            {/* ── Bio ───────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="bio"
                  className="text-xs font-bold text-slate-400 uppercase tracking-widest block"
                >
                  Biography
                </label>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                  {bio.length}/150
                </span>
              </div>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <textarea
                  id="bio"
                  placeholder="Share a short bio with your followers..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={3}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200/80 rounded-2xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition duration-200 resize-none shadow-inner"
                />
              </div>
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading || !!fileError}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl font-bold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </button>
          </form>

          {/* Logout link */}
          <button
            onClick={onLogout}
            className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
