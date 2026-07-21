import React, { useState, useRef } from "react";
import { Image, X, UploadCloud, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { POST_API_BASE_URL } from "../../config";

export default function CreateStoryModal({ isOpen, onClose, token, onStoryCreated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate that file is strictly an image
    if (file.type.startsWith("video/")) {
      setErrorMessage("Videos are not supported in Stories. Please upload an image file.");
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Unsupported file format. Please select an image (JPEG, PNG, WebP, etc.).");
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    setErrorMessage("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePublishStory = async () => {
    if (!selectedFile || !token) return;
    setIsUploading(true);
    setErrorMessage("");

    try {
      // 1. Request presigned upload URL from Post-Server
      const presignRes = await fetch(`${POST_API_BASE_URL}/stories/upload-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: selectedFile.name,
          content_type: selectedFile.type || "image/jpeg",
          file_size: selectedFile.size,
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to initiate story upload (${presignRes.status})`);
      }

      const presignData = await presignRes.json();
      if (!presignData.success || !presignData.data) {
        throw new Error(presignData.message || "Failed to generate story upload URL.");
      }

      const { object_key, upload_url } = presignData.data;

      // 2. Direct PUT upload to MinIO temp-media bucket
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type || "image/jpeg",
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed uploading story image to storage (${uploadRes.status})`);
      }

      // 3. Create Story record in database
      const createRes = await fetch(`${POST_API_BASE_URL}/stories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_key: object_key,
          caption: caption.trim() || null,
          mime_type: selectedFile.type || "image/jpeg",
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        throw new Error(createErr.message || "Failed to publish story.");
      }

      const createData = await createRes.json();
      if (createData.success && onStoryCreated) {
        onStoryCreated(createData.data);
      }

      // Reset & close
      setSelectedFile(null);
      setPreviewUrl("");
      setCaption("");
      onClose();
    } catch (err) {
      console.error("Error publishing story:", err);
      setErrorMessage(err.message || "An unexpected error occurred while publishing story.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-premium-card max-w-md w-full rounded-3xl overflow-hidden border border-premium-border shadow-2xl relative flex flex-col gap-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-premium-border/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-cyan via-accent-blue to-accent-coral p-[1.5px] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-premium-text font-display">Create 24h Story</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-premium-gray hover:bg-premium-gray/80 text-premium-text flex items-center justify-center transition-colors font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-accent-coral/10 border border-accent-coral/30 p-3 rounded-2xl text-accent-coral text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* File Dropzone or Image Preview */}
        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-premium-border hover:border-accent-cyan/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-premium-bg/40 hover:bg-premium-bg/80 transition-all group min-h-[240px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan group-hover:scale-110 transition-transform">
              <Image className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-premium-text">Select Story Image</p>
              <p className="text-[10px] text-premium-muted font-medium">Images only (JPEG, PNG, WebP) &bull; Expire in 24h</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="relative aspect-[9/16] max-h-[360px] w-full rounded-2xl overflow-hidden bg-black border border-premium-border/50 flex items-center justify-center">
            <img src={previewUrl} alt="Story preview" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl("");
              }}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-1.5 rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Caption Input */}
        {previewUrl && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-premium-muted">Story Caption (Optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-premium-bg text-xs text-premium-text px-4 py-2.5 rounded-2xl border border-premium-border/60 focus:outline-none focus:border-accent-cyan/85"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 rounded-2xl bg-premium-gray hover:bg-premium-gray/80 text-premium-text font-bold text-xs border border-premium-border transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublishStory}
            disabled={!selectedFile || isUploading}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-coral text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Share Story</span>
              </>
            )
          }
          </button>
        </div>
      </div>
    </div>
  );
}
