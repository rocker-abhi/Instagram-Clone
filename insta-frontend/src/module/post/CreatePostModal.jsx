import React, { useState, useRef, useEffect } from "react";
import { 
  X, Image as ImageIcon, ArrowLeft, MapPin, Globe, Users, Lock, 
  MessageSquare, ChevronLeft, ChevronRight, Plus, Loader2, AlertCircle, CheckCircle2,
  Film
} from "lucide-react";
import { POST_API_BASE_URL, USER_API_BASE_URL } from "../../config";
import gsap from "gsap";

export default function CreatePostModal({ token, user, isOpen, onClose, onPostCreated }) {
  const [postMode, setPostMode] = useState(null); // null = mode picker, "post" | "reel"
  const [step, setStep] = useState(1); // 1: Select/Preview, 2: Caption & Details
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoDuration, setVideoDuration] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Post Metadata State
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const stepContainerRef = useRef(null);
  const imageSlideRef = useRef(null);

  const handleAnimatedClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.86,
        opacity: 0,
        y: 24,
        filter: "blur(12px)",
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setIsClosing(false);
          onClose();
        }
      });
    } else {
      setIsClosing(false);
      onClose();
    }
  };

  // Entrance & state reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setPostMode(null);
      setStep(1);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setActiveImageIndex(0);
      setErrorMessage("");
      setVideoDuration(null);
      setCaption("");
      setLocation("");
      setVisibility("PUBLIC");
      setCommentsEnabled(true);
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setUploadProgress(0);

      if (modalRef.current) {
        gsap.fromTo(
          modalRef.current,
          { scale: 0.86, opacity: 0, y: 30, filter: "blur(14px)" },
          { scale: 1, opacity: 1, y: 0, filter: "blur(0px)", duration: 0.52, ease: "back.out(1.4)" }
        );
      }
    } else {
      // Clean up object URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  }, [isOpen]);

  // GSAP animation on Step transition
  useEffect(() => {
    if (stepContainerRef.current) {
      gsap.fromTo(
        stepContainerRef.current,
        { opacity: 0, scale: 0.97, filter: "blur(6px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.35, ease: "power3.out" }
      );
    }
  }, [step, postMode]);

  if (!isOpen) return null;

  // ── Video duration helper ─────────────────────────────────────────
  const validateVideoDuration = (objectUrl) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        resolve(duration);
      };
      video.onerror = () => {
        reject("Unable to read video file. Please try a different format.");
      };
      video.src = objectUrl;
    });
  };

  // ── File Validation ──────────────────────────────────────────────
  const validateAndAddFiles = async (files) => {
    setErrorMessage("");
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (postMode === "reel") {
      // Reel mode: accept exactly 1 video
      const hasImage = fileList.some(
        (file) => file.type.startsWith("image/")
      );
      if (hasImage) {
        setErrorMessage("Image files are not allowed in Reel mode. Please select a video file.");
        return;
      }

      const videoFile = fileList.find(
        (file) => file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)
      );
      if (!videoFile) {
        setErrorMessage("Please select a valid video file (MP4, WebM, MOV).");
        return;
      }

      // Create object URL for both validation and preview
      const url = URL.createObjectURL(videoFile);

      // Validate duration using this URL
      try {
        const duration = await validateVideoDuration(url);
        setVideoDuration(duration);
      } catch (errMsg) {
        URL.revokeObjectURL(url);
        setErrorMessage(errMsg);
        return;
      }

      // Revoke old previews
      previewUrls.forEach((oldUrl) => URL.revokeObjectURL(oldUrl));

      setSelectedFiles([videoFile]);
      setPreviewUrls([url]);
    } else {
      // Post mode: accept only images, block videos
      const hasVideo = fileList.some(
        (file) => file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|flv|wmv)$/i.test(file.name)
      );
      if (hasVideo) {
        setErrorMessage("Video files are not allowed in Post mode. Please select images only.");
        return;
      }

      const validImages = fileList.filter(
        (file) => file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
      );
      if (validImages.length === 0) {
        setErrorMessage("Please select valid image files (JPEG, PNG, WEBP, GIF).");
        return;
      }

      const combinedFiles = [...selectedFiles, ...validImages].slice(0, 10);
      setSelectedFiles(combinedFiles);

      const newUrls = combinedFiles.map((file) => URL.createObjectURL(file));
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls(newUrls);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      validateAndAddFiles(e.target.files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedUrls = previewUrls.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedUrls);

    if (activeImageIndex >= updatedFiles.length) {
      setActiveImageIndex(Math.max(0, updatedFiles.length - 1));
    }

    if (postMode === "reel" && updatedFiles.length === 0) {
      setVideoDuration(null);
    }
  };

  const handleNextStep = () => {
    if (selectedFiles.length === 0) {
      setErrorMessage(
        postMode === "reel"
          ? "Please select a video to continue."
          : "Please select at least one image to continue."
      );
      return;
    }
    setStep(2);
  };

  const handleSelectMode = (mode) => {
    setPostMode(mode);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setActiveImageIndex(0);
    setErrorMessage("");
    setVideoDuration(null);
  };

  const uploadFileWithProgress = (url, file, contentType, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      if (contentType) {
        xhr.setRequestHeader("Content-Type", contentType);
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setUploadProgress(0);

    try {
      let post_id;
      let mediaPayload = [];

      if (postMode === "reel") {
        const file = selectedFiles[0];
        // 1. Initiate Multipart Upload
        const initRes = await fetch(`${POST_API_BASE_URL}/posts/multipart/initiate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_name: file.name,
            content_type: file.type || "video/mp4",
          }),
        });

        if (!initRes.ok) {
          const errJson = await initRes.json().catch(() => ({}));
          throw new Error(errJson.message || `Failed to initiate video upload (${initRes.status})`);
        }

        const initData = await initRes.json();
        if (!initData.success || !initData.data) {
          throw new Error(initData.message || "Failed to initialize video upload session.");
        }

        const { upload_id, object_key } = initData.data;
        post_id = initData.data.post_id;

        // 2. Slice file into 5MB chunks (MinIO S3 requires non-final parts to be at least 5MB)
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const partNumbers = Array.from({ length: totalChunks }, (_, i) => i + 1);

        const presignRes = await fetch(`${POST_API_BASE_URL}/posts/multipart/presign-parts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            upload_id,
            object_key,
            part_numbers: partNumbers,
          }),
        });

        if (!presignRes.ok) {
          throw new Error(`Failed to request part upload signatures (${presignRes.status})`);
        }

        const presignData = await presignRes.json();
        if (!presignData.success || !presignData.data?.parts) {
          throw new Error("Failed to sign video parts.");
        }

        const signedParts = presignData.data.parts;
        const uploadedParts = [];
        const loadedBytes = new Array(signedParts.length).fill(0);

        // 3. Upload parts concurrently
        await Promise.all(
          signedParts.map(async (partInfo) => {
            const start = (partInfo.part_number - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const xhrRes = await uploadFileWithProgress(partInfo.upload_url, chunk, null, (loaded) => {
              loadedBytes[partInfo.part_number - 1] = loaded;
              const totalLoaded = loadedBytes.reduce((a, b) => a + b, 0);
              const percent = Math.min(100, Math.round((totalLoaded / file.size) * 100));
              setUploadProgress(percent);
            });

            const etag = xhrRes.getResponseHeader("ETag") || xhrRes.getResponseHeader("etag");
            if (!etag) {
              throw new Error(`Server did not return ETag signature for part ${partInfo.part_number}`);
            }

            uploadedParts.push({
              part_number: partInfo.part_number,
              etag: etag.replace(/"/g, ""), // strip surrounding quotes
            });
          })
        );

        // Sort parts by part_number before completing
        uploadedParts.sort((a, b) => a.part_number - b.part_number);

        // 4. Complete Multipart Upload
        const completeRes = await fetch(`${POST_API_BASE_URL}/posts/multipart/complete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            upload_id,
            object_key,
            parts: uploadedParts,
          }),
        });

        if (!completeRes.ok) {
          throw new Error(`Failed to assemble video segments on storage server (${completeRes.status})`);
        }

        mediaPayload = [{
          object_key: object_key,
          mime_type: file.type || "video/mp4",
          file_size: file.size,
          display_order: 0,
          media_type: "VIDEO",
          duration: videoDuration,
        }];
      } else {
        // Standard post mode (images only)
        const filePayload = selectedFiles.map((file) => ({
          file_name: file.name,
          content_type: file.type || "image/jpeg",
          file_size: file.size,
        }));

        const urlRes = await fetch(`${POST_API_BASE_URL}/posts/upload-urls`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: filePayload }),
        });

        if (!urlRes.ok) {
          const errorJson = await urlRes.json().catch(() => ({}));
          throw new Error(errorJson.message || `Failed to request upload URLs (${urlRes.status})`);
        }

        const urlData = await urlRes.json();
        if (!urlData.success || !urlData.data) {
          throw new Error(urlData.message || "Failed to generate presigned upload URLs.");
        }

        const { upload_urls } = urlData.data;
        post_id = urlData.data.post_id;

        const totalBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        const loadedBytesPerFile = new Array(selectedFiles.length).fill(0);

        await Promise.all(
          upload_urls.map(async (item, idx) => {
            const file = selectedFiles[idx];
            await uploadFileWithProgress(item.upload_url, file, file.type || "image/jpeg", (loaded) => {
              loadedBytesPerFile[idx] = loaded;
              const currentTotalLoaded = loadedBytesPerFile.reduce((a, b) => a + b, 0);
              const percent = Math.min(100, Math.round((currentTotalLoaded / totalBytes) * 100));
              setUploadProgress(percent);
            });
          })
        );

        mediaPayload = upload_urls.map((item, idx) => ({
          object_key: item.object_key,
          mime_type: selectedFiles[idx]?.type || "image/jpeg",
          file_size: selectedFiles[idx]?.size || 0,
          display_order: item.display_order,
          media_type: "IMAGE",
        }));
      }

      // Step 3: Create Post & PostMedia records in Database
      const createRes = await fetch(`${POST_API_BASE_URL}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post_id,
          caption: caption || null,
          location: location || null,
          visibility: visibility,
          comments_enabled: commentsEnabled,
          media: mediaPayload,
        }),
      });

      if (!createRes.ok) {
        const createErrJson = await createRes.json().catch(() => ({}));
        throw new Error(createErrJson.message || `Failed to create post (${createRes.status})`);
      }

      const createData = await createRes.json();
      if (!createData.success || !createData.data) {
        throw new Error(createData.message || "Failed to finalize post creation.");
      }

      const createdPost = createData.data;

      // Map backend response for local feed state rendering
      const feedPostObj = {
        id: createdPost.id,
        username: user?.username || "you",
        userAvatar: user?.profile_picture_url || "",
        image: createdPost.media?.[0]?.url || previewUrls[0],
        images: createdPost.media?.map((m) => m.url) || previewUrls,
        caption: createdPost.caption || "",
        location: createdPost.location || "",
        visibility: createdPost.visibility,
        commentsEnabled: createdPost.comments_enabled,
        likes: 0,
        hasLiked: false,
        hasSaved: false,
        comments: [],
        time: "Just now",
        created_at: createdPost.created_at,
        isReel: postMode === "reel",
      };

      setSubmitSuccess(true);
      setTimeout(() => {
        if (onPostCreated) {
          onPostCreated(feedPostObj);
        }
        handleAnimatedClose();
      }, 1000);

    } catch (err) {
      console.error("Failed to create post:", err);
      setErrorMessage(err.message || "Failed to create post. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const isReelMode = postMode === "reel";
  const fileAccept = isReelMode
    ? "video/mp4, video/webm, video/quicktime"
    : "image/png, image/jpeg, image/webp, image/gif";

  const modalTitle = postMode === null
    ? "Create new"
    : step === 1
      ? isReelMode ? "Upload reel" : "Create new post"
      : isReelMode ? "Reel Details" : "Post Details";

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 ${isClosing ? "animate-backdrop-exit" : "animate-backdrop-smooth"}`}
      onClick={handleAnimatedClose}
    >
      <div 
        ref={modalRef}
        className={`bg-premium-card border border-premium-border rounded-3xl shadow-premium overflow-hidden flex flex-col transition-all duration-300 w-full ${isClosing ? "animate-modal-exit" : "animate-post-modal-smooth"} ${
          step === 2 && previewUrls.length > 0 ? "max-w-4xl h-[85vh] max-h-[700px]" : "max-w-lg h-[80vh] max-h-[600px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-premium-border/50 flex items-center justify-between shrink-0 bg-premium-card">
          <div className="flex items-center gap-2">
            {(step === 2 || (step === 1 && postMode !== null)) && (
              <button 
                type="button" 
                onClick={() => {
                  if (step === 2) {
                    setStep(1);
                  } else {
                    setPostMode(null);
                    setSelectedFiles([]);
                    setPreviewUrls([]);
                    setErrorMessage("");
                    setVideoDuration(null);
                  }
                }}
                className="p-1.5 rounded-xl hover:bg-premium-gray text-premium-text transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-bold text-sm text-premium-text font-display">
              {modalTitle}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {step === 1 && postMode !== null && previewUrls.length > 0 && (
              <button 
                type="button"
                onClick={handleNextStep}
                className="text-xs font-bold text-accent-cyan hover:text-accent-cyan/80 transition-colors cursor-pointer"
              >
                Next
              </button>
            )}

            {step === 2 && (
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || submitSuccess}
                className="text-xs font-bold text-accent-cyan hover:text-accent-cyan/80 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading ({uploadProgress}%)
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                    Published!
                  </>
                ) : (
                  "Share"
                )}
              </button>
            )}

            <button 
              type="button"
              onClick={handleAnimatedClose}
              className="p-1.5 rounded-xl hover:bg-premium-gray text-premium-muted hover:text-premium-text transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isSubmitting && (
          <div className="w-full bg-premium-gray/20 h-1.5 relative overflow-hidden shrink-0">
            <div 
              className="bg-gradient-to-r from-accent-cyan to-accent-blue h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="bg-accent-coral/10 border-b border-accent-coral/20 px-4 py-2.5 flex items-center justify-between text-xs text-accent-coral font-medium animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setErrorMessage("")}
              className="text-accent-coral/80 hover:text-accent-coral font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div ref={stepContainerRef} className="flex-1 flex min-h-0 overflow-hidden bg-premium-bg/40">

          {/* ── MODE PICKER ────────────────────────────────────── */}
          {postMode === null && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-center space-y-2">
                <h4 className="font-bold text-base text-premium-text font-display">
                  What would you like to create?
                </h4>
                <p className="text-xs text-premium-muted max-w-xs mx-auto leading-relaxed">
                  Choose between sharing photos or uploading a short video reel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {/* Post Card */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("post")}
                  className="group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 border-premium-border/60 bg-premium-card hover:border-accent-cyan hover:bg-accent-cyan/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 border border-accent-cyan/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="w-7 h-7 text-accent-cyan" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="font-bold text-sm text-premium-text block">Post</span>
                    <span className="text-[10px] text-premium-muted leading-relaxed block">
                      Share up to 10 photos
                    </span>
                  </div>
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan/20 rounded-full text-[8px] font-bold text-accent-cyan uppercase tracking-wider">
                    Images
                  </span>
                </button>

                {/* Reel Card */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("reel")}
                  className="group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 border-premium-border/60 bg-premium-card hover:border-accent-coral hover:bg-accent-coral/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-coral/20 to-pink-500/20 border border-accent-coral/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Film className="w-7 h-7 text-accent-coral" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="font-bold text-sm text-premium-text block">Reel</span>
                    <span className="text-[10px] text-premium-muted leading-relaxed block">
                      Upload a video reel
                    </span>
                  </div>
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-accent-coral/10 border border-accent-coral/20 rounded-full text-[8px] font-bold text-accent-coral uppercase tracking-wider">
                    Video
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: File Selection ─────────────────────────── */}
          {postMode !== null && step === 1 && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {previewUrls.length === 0 ? (
                /* File Dropzone Area */
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-all duration-200 border-2 border-dashed m-6 rounded-3xl ${
                    dragActive 
                      ? isReelMode
                        ? "border-accent-coral bg-accent-coral/5 scale-[0.99]"
                        : "border-accent-cyan bg-accent-cyan/5 scale-[0.99]"
                      : "border-premium-border/60 hover:border-premium-border bg-premium-card/30"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-inner ${
                    isReelMode
                      ? "bg-accent-coral/10 border-accent-coral/30 text-accent-coral"
                      : "bg-premium-gray/80 border-premium-border text-accent-cyan"
                  }`}>
                    {isReelMode ? (
                      <Film className="w-8 h-8" />
                    ) : (
                      <ImageIcon className="w-8 h-8" />
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-premium-text font-display">
                    {isReelMode ? "Drag your video here" : "Drag photos here"}
                  </h4>
                  <p className="text-xs text-premium-muted mt-1 max-w-xs leading-relaxed">
                    {isReelMode
                      ? "Upload a video for your reel."
                      : "Upload photos for your post. High resolution images supported."}
                  </p>
                  <p className={`text-[10px] font-semibold mt-2.5 px-3 py-1 border rounded-full ${
                    isReelMode
                      ? "text-accent-coral bg-accent-coral/10 border-accent-coral/20"
                      : "text-accent-coral bg-accent-coral/10 border-accent-coral/20"
                  }`}>
                    {isReelMode
                      ? "Video only — MP4, WebM, MOV"
                      : "Images only (Videos not supported)"}
                  </p>

                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept={fileAccept}
                    multiple={!isReelMode}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 px-5 py-2.5 bg-white hover:bg-slate-100 text-premium-bg text-xs font-bold rounded-2xl shadow transition-all cursor-pointer"
                  >
                    Select from computer
                  </button>
                </div>
              ) : isReelMode ? (
                /* Reel Video Preview */
                <div className="flex-1 flex flex-col h-full min-h-0 relative bg-black/40">
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/80">
                    {previewUrls[0] && (
                      <video 
                        src={previewUrls[0]} 
                        controls
                        className="w-full h-full object-contain select-none max-h-full"
                      />
                    )}
                    {/* Duration badge */}
                    {videoDuration !== null && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5">
                        <Film className="w-3 h-3" />
                        {videoDuration}s
                      </span>
                    )}
                  </div>

                  {/* Bottom bar with remove */}
                  <div className="h-16 border-t border-premium-border/40 bg-premium-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-accent-coral" />
                      <span className="text-xs text-premium-text font-semibold truncate max-w-[200px]">
                        {selectedFiles[0]?.name}
                      </span>
                      {videoDuration !== null && (
                        <span className="text-[10px] text-premium-muted font-bold">
                          ({videoDuration}s)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(0)}
                      className="px-3 py-1.5 rounded-xl bg-accent-coral/10 text-accent-coral text-[10px] font-bold border border-accent-coral/20 hover:bg-accent-coral/20 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected Images Carousel Preview */
                <div className="flex-1 flex flex-col h-full min-h-0 relative bg-black/40">
                  {/* Main Active Image View */}
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden aspect-square bg-black/80">
                    <img 
                      src={previewUrls[activeImageIndex]} 
                      alt="Selected preview"
                      className="w-full h-full object-cover select-none aspect-square"
                    />

                    {/* Carousel Left/Right Controls */}
                    {previewUrls.length > 1 && (
                      <>
                        {activeImageIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => prev - 1)}
                            className="absolute left-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {activeImageIndex < previewUrls.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => prev + 1)}
                            className="absolute right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {/* Image Position Counter Badge */}
                    {previewUrls.length > 1 && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10">
                        {activeImageIndex + 1} / {previewUrls.length}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Tray / Add More Bar */}
                  <div className="h-20 border-t border-premium-border/40 bg-premium-card/80 backdrop-blur-md px-4 flex items-center gap-3 overflow-x-auto shrink-0">
                    {previewUrls.map((url, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                          activeImageIndex === idx ? "border-accent-cyan scale-105" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:bg-accent-coral transition-colors"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {previewUrls.length < 10 && (
                      <>
                        <input 
                          ref={fileInputRef}
                          type="file"
                          accept={fileAccept}
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-12 h-12 rounded-xl border border-dashed border-premium-border hover:border-accent-cyan flex flex-col items-center justify-center text-premium-muted hover:text-accent-cyan shrink-0 transition-colors cursor-pointer bg-premium-bg/50"
                          title="Add more photos"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[8px] font-bold mt-0.5">Add</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Caption & Details ──────────────────────── */}
          {step === 2 && (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
              
              {/* Left Column: Media Preview */}
              <div className="w-full md:w-1/2 aspect-square bg-black/80 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-premium-border/40 overflow-hidden">
                {isReelMode ? (
                  previewUrls[0] && (
                    <video 
                      src={previewUrls[0]} 
                      controls
                      className="w-full h-full object-contain select-none"
                    />
                  )
                ) : (
                  <img 
                    src={previewUrls[activeImageIndex]} 
                    alt="Post preview" 
                    className="w-full h-full object-cover select-none aspect-square"
                  />
                )}

                {!isReelMode && previewUrls.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                    {previewUrls.map((_, idx) => (
                      <span 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${activeImageIndex === idx ? "bg-accent-cyan w-3" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                )}

                {isReelMode && videoDuration !== null && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5">
                    <Film className="w-3 h-3" />
                    {videoDuration}s reel
                  </span>
                )}
              </div>

              {/* Right Column: Metadata Form */}
              <div className="w-full md:w-1/2 flex flex-col h-full bg-premium-card overflow-y-auto p-5 space-y-6">
                
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-premium-gray overflow-hidden border border-premium-border">
                    {user?.profile_picture_url ? (
                      <img src={user.profile_picture_url} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-premium-text">
                        {(user?.username || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-premium-text">{user?.username || "current_user"}</span>
                    {isReelMode && (
                      <span className="px-2 py-0.5 bg-accent-coral/10 border border-accent-coral/20 rounded-full text-[9px] font-bold text-accent-coral">
                        Reel
                      </span>
                    )}
                  </div>
                </div>

                {/* Caption Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    rows="4"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={2200}
                    placeholder="Write a caption..."
                    className="w-full bg-premium-bg border border-premium-border/60 rounded-2xl p-3.5 text-xs text-premium-text placeholder-premium-muted/50 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all resize-none"
                  />
                  <div className="flex justify-end text-[10px] text-premium-muted font-medium">
                    {caption.length} / 2200
                  </div>
                </div>

                {/* Location Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-premium-muted">
                    Location
                  </label>
                  <div className="flex items-center gap-2 bg-premium-bg border border-premium-border/60 rounded-2xl px-3.5 py-2.5">
                    <MapPin className="w-4 h-4 text-accent-cyan shrink-0" />
                    <input 
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Add location (e.g. Mumbai, India)"
                      className="w-full bg-transparent text-xs text-premium-text placeholder-premium-muted/50 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Visibility Options */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-premium-muted">
                    Post Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "PUBLIC", label: "Public", icon: Globe },
                      { id: "FOLLOWERS", label: "Followers", icon: Users },
                      { id: "PRIVATE", label: "Private", icon: Lock },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = visibility === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVisibility(opt.id)}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-accent-cyan/10 border-accent-cyan text-accent-cyan" 
                              : "bg-premium-bg/40 border-premium-border/60 text-premium-muted hover:text-premium-text"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Settings: Comments Toggle */}
                <div className="pt-3 border-t border-premium-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-accent-cyan shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-premium-text">Allow Comments</p>
                        <p className="text-[10px] text-premium-muted">People will be able to comment on this post.</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setCommentsEnabled(!commentsEnabled)}
                      className={`w-10 h-5.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                        commentsEnabled ? "bg-accent-cyan" : "bg-premium-gray"
                      }`}
                    >
                      <div
                        className={`bg-white w-3.5 h-3.5 rounded-full shadow transition-transform duration-200 ${
                          commentsEnabled ? "translate-x-4.5" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
