import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Grid, Bookmark, Heart, MessageCircle, 
  MoreHorizontal, Smile, Send, Bookmark as BookmarkIcon,
  ShieldCheck, Link2, Lock, Film, Play, Clapperboard, Eye, Trash2, Loader2, X, AlertCircle
} from "lucide-react";
import { USER_API_BASE_URL, POST_API_BASE_URL } from "../../config";
import EditProfilePage from "./EditProfilePage";
import { gsap } from "gsap";

export default function ProfilePage({ posts, token, onPostDeleted }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [showFollowsModal, setShowFollowsModal] = useState(null); // "followers" | "following" | null
  const [followsList, setFollowsList] = useState([]);
  const [followsLoading, setFollowsLoading] = useState(false);

  const [savedPosts] = useState([]);
  const [selectedReel, setSelectedReel] = useState(null);
  const [reels] = useState([]);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");
  const [isClosingPost, setIsClosingPost] = useState(false);
  const [isClosingDeleteModal, setIsClosingDeleteModal] = useState(false);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchUsername = queryParams.get("username");

  const [profile, setProfile] = useState({
    username: "",
    display_name: "",
    bio: "",
    website: "",
    profile_picture_url: "",
    followers_count: 0,
    following_count: 0,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  const containerRef = useRef(null);
  const postModalRef = useRef(null);
  const deleteModalRef = useRef(null);

  useEffect(() => {
    // GSAP entrance
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, [searchUsername]);

  // GSAP ultra-smooth spring animation when post detail modal opens
  useEffect(() => {
    if (selectedPost && postModalRef.current) {
      gsap.fromTo(
        postModalRef.current,
        { scale: 0.86, opacity: 0, y: 30, filter: "blur(14px)" },
        { scale: 1, opacity: 1, y: 0, filter: "blur(0px)", duration: 0.52, ease: "back.out(1.4)" }
      );
    }
  }, [selectedPost]);

  // GSAP elastic spring animation when delete confirmation popup modal opens
  useEffect(() => {
    if (showDeleteConfirmModal && deleteModalRef.current) {
      gsap.fromTo(
        deleteModalRef.current,
        { scale: 0.78, opacity: 0, y: 35, filter: "blur(16px)" },
        { scale: 1, opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "back.out(1.6)" }
      );
    }
  }, [showDeleteConfirmModal]);

  const fetchFollowsList = async (type) => {
    if (!token) return;
    setFollowsLoading(true);
    setShowFollowsModal(type);
    try {
      const target = searchUsername || "portfolio";
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/${target}/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setFollowsList(data.data);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
    } finally {
      setFollowsLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!token) return;
    setProfileLoading(true);
    try {
      const endpoint = searchUsername 
        ? `${USER_API_BASE_URL}/user-profile/public/${searchUsername}`
        : `${USER_API_BASE_URL}/user-profile/portfolio`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleFollowAction = async () => {
    if (!token || !searchUsername) return;
    try {
      const isFollowing = profile.following_status === "ACCEPTED" || profile.following_status === "PENDING";
      const action = isFollowing ? "unfollow" : "follow";
      
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/${searchUsername}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchProfile();
        }
      }
    } catch (err) {
      console.error("Error executing follow action:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token, searchUsername]);

  const AvatarImg = ({ src, alt, className }) =>
    src ? (
      <img src={src} alt={alt} className={className} />
    ) : (
      <div className={`${className} bg-premium-gray flex items-center justify-center text-premium-text font-bold`}>
        {alt?.[0]?.toUpperCase() ?? "U"}
      </div>
    );

  const Skeleton = ({ className }) => (
    <span className={`inline-block bg-premium-gray animate-pulse rounded ${className}`} />
  );

  const handlePostClick = (post) => {
    setIsClosingPost(false);
    setSelectedPost(post);
  };

  const handleClosePostModal = () => {
    if (isClosingPost) return;
    setIsClosingPost(true);
    if (postModalRef.current) {
      gsap.to(postModalRef.current, {
        scale: 0.86,
        opacity: 0,
        y: 24,
        filter: "blur(12px)",
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setSelectedPost(null);
          setIsClosingPost(false);
        }
      });
    } else {
      setSelectedPost(null);
      setIsClosingPost(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (isClosingDeleteModal) return;
    setIsClosingDeleteModal(true);
    if (deleteModalRef.current) {
      gsap.to(deleteModalRef.current, {
        scale: 0.80,
        opacity: 0,
        y: 28,
        filter: "blur(14px)",
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setShowDeleteConfirmModal(false);
          setDeleteErrorMsg("");
          setIsClosingDeleteModal(false);
        }
      });
    } else {
      setShowDeleteConfirmModal(false);
      setDeleteErrorMsg("");
      setIsClosingDeleteModal(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteErrorMsg("");
    setIsClosingDeleteModal(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeletePost = async () => {
    const targetId = selectedPost?.id || selectedPost?.post_id;
    if (!token || !targetId) return;

    setIsDeletingPost(true);
    setDeleteErrorMsg("");
    try {
      const res = await fetch(`${POST_API_BASE_URL}/posts/${targetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          handleCloseDeleteModal();
          handleClosePostModal();
          if (onPostDeleted) {
            onPostDeleted(targetId);
          }
        } else {
          setDeleteErrorMsg(data.message || "Failed to delete post.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setDeleteErrorMsg(errData.message || "Failed to delete post.");
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      setDeleteErrorMsg("Connection error. Could not delete post.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleCommentSubmit = (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    if (selectedPost) {
      setSelectedPost({
        ...selectedPost,
        comments: [...(selectedPost.comments || []), { username: profile.username || "you", text }]
      });
    }
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleUpdateSuccess = () => {
    fetchProfile();
  };

  const displayedPosts = activeTab === "posts" ? posts : savedPosts;

  if (isEditing) {
    return (
      <EditProfilePage 
        profile={profile} 
        token={token} 
        onBack={() => setIsEditing(false)} 
        onUpdateSuccess={handleUpdateSuccess}
      />
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-[940px] mx-auto px-4 py-8 bg-premium-bg min-h-screen">
      
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 pb-8 mb-8 border-b border-premium-border/50">
        
        {/* Profile Avatar */}
        <div className="w-[140px] h-[140px] rounded-full overflow-hidden border border-premium-border shrink-0 bg-premium-card p-1">
          {profileLoading ? (
            <div className="w-full h-full bg-premium-gray animate-pulse rounded-full" />
          ) : (
            <AvatarImg
              src={profile.profile_picture_url}
              alt={profile.username || "profile"}
              className="w-full h-full object-cover rounded-full"
            />
          )}
        </div>

        {/* Profile Info & Stats */}
        <div className="flex-1 space-y-6 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold font-display text-premium-text tracking-tight">
                {profileLoading ? <Skeleton className="w-28 h-5" /> : profile.username || "—"}
              </h2>
              <ShieldCheck className="w-5 h-5 text-accent-cyan fill-accent-cyan/10" />
            </div>
            
            {searchUsername ? (
              profile.following_status === "ACCEPTED" ? (
                <button 
                  onClick={handleFollowAction}
                  className="bg-premium-gray hover:bg-premium-gray/80 text-premium-text font-bold text-xs px-6 py-2 rounded-2xl transition-all cursor-pointer"
                >
                  Following
                </button>
              ) : profile.following_status === "PENDING" ? (
                <button 
                  onClick={handleFollowAction}
                  className="bg-premium-gray hover:bg-premium-gray/80 text-premium-text font-bold text-xs px-6 py-2 rounded-2xl transition-all cursor-pointer"
                  title="Click to withdraw request"
                >
                  Cancel Request
                </button>
              ) : (
                <button 
                  onClick={handleFollowAction}
                  className="bg-white text-premium-bg hover:bg-slate-100 font-bold text-xs px-6 py-2 rounded-2xl shadow transition-all cursor-pointer"
                >
                  Follow
                </button>
              )
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-premium-card hover:bg-premium-gray/30 text-premium-text border border-premium-border font-bold text-xs px-5 py-2.5 rounded-2xl transition-all cursor-pointer"
              >
                Edit profile
              </button>
            )}
          </div>

          {/* Stats Bar */}
          {(() => {
            const isPrivate = searchUsername && profile.account_visibility === "PRIVATE" && profile.following_status !== "ACCEPTED";
            return (
              <div className="grid grid-cols-3 max-w-[380px] mx-auto md:mx-0 bg-premium-card rounded-2xl border border-premium-border p-3 shadow-premium">
                <div className="text-center border-r border-premium-border/40">
                  <span className="block font-bold text-sm text-premium-text">
                    {activeTab === "posts" ? posts.length : savedPosts.length}
                  </span>
                  <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider">posts</span>
                </div>
                <div 
                  onClick={() => !isPrivate && fetchFollowsList("followers")}
                  className={`text-center border-r border-premium-border/40 rounded-lg transition-colors ${isPrivate ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-premium-gray/30"}`}
                >
                  <span className="block font-bold text-sm text-premium-text">
                    {profileLoading ? <Skeleton className="w-8 h-4 mx-auto" /> : profile.followers_count.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider">followers</span>
                </div>
                <div 
                  onClick={() => !isPrivate && fetchFollowsList("following")}
                  className={`text-center rounded-lg transition-colors ${isPrivate ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-premium-gray/30"}`}
                >
                  <span className="block font-bold text-sm text-premium-text">
                    {profileLoading ? <Skeleton className="w-8 h-4 mx-auto" /> : profile.following_count.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider">following</span>
                </div>
              </div>
            );
          })()}

          {/* Bio details */}
          <div className="text-xs space-y-2 text-premium-text">
            <h1 className="font-bold text-premium-text text-sm">
              {profileLoading ? <Skeleton className="w-36 h-4" /> : profile.display_name || "—"}
            </h1>
            {(!searchUsername || profile.account_visibility !== "PRIVATE" || profile.following_status === "ACCEPTED") && (
              <>
                <p className="whitespace-pre-line leading-relaxed text-premium-muted font-medium">
                  {profileLoading ? (
                    <span className="flex flex-col gap-1">
                      <Skeleton className="w-full h-3" />
                      <Skeleton className="w-4/5 h-3" />
                    </span>
                  ) : (
                    profile.bio
                  )}
                </p>
                {profile.website && (
                  <a 
                    href={`https://${profile.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-accent-cyan hover:text-accent-cyan/80 font-bold transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{profile.website}</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>

      </header>

      {searchUsername && profile.account_visibility === "PRIVATE" && profile.following_status !== "ACCEPTED" ? (
        <div className="flex flex-col items-center justify-center py-20 bg-premium-card rounded-3xl border border-premium-border text-center space-y-4 shadow-premium">
          <div className="p-4 bg-premium-gray rounded-full border border-premium-border text-premium-muted">
            <Lock className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-premium-text">This Account is Private</h3>
            <p className="text-xs text-premium-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
              Follow this account to view their photographs and updates.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-premium-card p-1 rounded-2xl flex gap-1.5 border border-premium-border">
              <button 
                onClick={() => setActiveTab("posts")}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none select-none cursor-pointer
                  ${activeTab === "posts" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:text-premium-text"}`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Posts</span>
              </button>

              <button 
                onClick={() => setActiveTab("reels")}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none select-none cursor-pointer
                  ${activeTab === "reels" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:text-premium-text"}`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels</span>
              </button>

              <button 
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none select-none cursor-pointer
                  ${activeTab === "saved" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:text-premium-text"}`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved</span>
              </button>
            </div>
          </div>

          {/* Grid Content: REELS TAB */}
          {activeTab === "reels" ? (
            reels.length === 0 ? (
              <div className="text-center py-24 bg-premium-card rounded-3xl border border-premium-border shadow-premium">
                <Clapperboard className="w-10 h-10 mx-auto mb-3 stroke-[1.5] text-premium-muted/50" />
                <p className="text-xs font-bold text-premium-muted">No Reels Uploaded Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {reels.map((reel) => (
                  <div 
                    key={reel.id} 
                    onClick={() => setSelectedReel(reel)}
                    className="relative aspect-[9/16] cursor-pointer group bg-premium-card rounded-2xl overflow-hidden border border-premium-border/50 hover:scale-[1.01] transition-all duration-300 shadow-lg"
                  >
                    <img 
                      src={reel.thumbnail} 
                      alt={reel.title} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Dark gradient overlay at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                    {/* View Count Badge at bottom left */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-[11px] font-bold z-10 drop-shadow-md">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{reel.views}</span>
                    </div>

                    {/* Hover Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Grid Content: POSTS & SAVED TABS */
            displayedPosts.length === 0 ? (
              <div className="text-center py-24 bg-premium-card rounded-3xl border border-premium-border shadow-premium">
                <Grid className="w-10 h-10 mx-auto mb-3 stroke-[1.5] text-premium-muted/50" />
                <p className="text-xs font-bold text-premium-muted">No Posts Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {displayedPosts.map((post) => (
                  <div 
                    key={post.id} 
                    onClick={() => handlePostClick(post)}
                    className="relative aspect-square cursor-pointer group bg-premium-card rounded-2xl overflow-hidden border border-premium-border/50 hover:scale-[1.01] transition-transform duration-300"
                  >
                    <img 
                      src={post.image} 
                      alt="profile grid media" 
                      className="w-full h-full object-cover"
                    />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4.5 h-4.5 fill-current text-white" />
                        <span>{post.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4.5 h-4.5 fill-current text-white" />
                        <span>{post.comments ? post.comments.length : (post.commentsCount || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div 
          className={`fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 ${isClosingPost ? "animate-backdrop-exit" : "animate-backdrop-smooth"}`}
          onClick={handleClosePostModal}
        >
          {/* Top Floating Close Button */}
          <button 
            type="button"
            onClick={handleClosePostModal}
            className="fixed top-6 right-6 z-[60] w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-xl"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <div 
            ref={postModalRef}
            className={`bg-premium-card max-w-[850px] w-full max-h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row relative border border-premium-border shadow-2xl transition-all ${isClosingPost ? "animate-modal-exit" : "animate-post-modal-smooth"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Image Viewport */}
            <div className="flex-1 bg-black flex items-center justify-center aspect-square md:aspect-auto">
              <img 
                src={selectedPost.image} 
                alt="Selected post zoom" 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>

            {/* Right Detail Panel */}
            <div className="w-full md:w-[380px] flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-premium-border bg-premium-card">
              
              {/* Aesthetic Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-premium-border/50 bg-premium-card/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-accent-cyan via-indigo-500 to-accent-coral shadow-sm">
                    <AvatarImg
                      src={profile.profile_picture_url}
                      alt={profile.username || "user"}
                      className="w-full h-full object-cover rounded-full border border-premium-card"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-premium-text font-display tracking-tight">
                        {profile.username || "—"}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan fill-accent-cyan/10" />
                    </div>
                    {selectedPost?.location ? (
                      <span className="text-[10px] text-accent-cyan font-medium flex items-center gap-0.5">
                        {selectedPost.location}
                      </span>
                    ) : (
                      <span className="text-[9px] text-premium-muted font-medium">Original Creator</span>
                    )}
                  </div>
                </div>

                {/* Aesthetic Action Buttons: Delete & Close */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openDeleteModal}
                    className="w-8 h-8 rounded-full bg-accent-coral/10 hover:bg-accent-coral hover:text-white text-accent-coral border border-accent-coral/20 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                  </button>

                  <button 
                    type="button"
                    onClick={handleClosePostModal}
                    className="w-8 h-8 rounded-full bg-premium-gray/80 hover:bg-premium-gray text-premium-muted hover:text-premium-text border border-premium-border/60 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[180px] md:max-h-[320px] bg-premium-bg/30">
                {/* Caption */}
                <div className="text-xs flex gap-3">
                  <AvatarImg
                    src={profile.profile_picture_url}
                    alt={profile.username || "user"}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-premium-text mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                      {profile.username || "—"}
                    </span>
                    <span className="text-premium-text/90 leading-relaxed font-medium">{selectedPost.caption}</span>
                  </div>
                </div>

                {/* Comments */}
                {selectedPost.comments && selectedPost.comments.map((comment, index) => (
                  <div key={index} className="text-xs flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-premium-gray text-premium-text flex-shrink-0 flex items-center justify-center font-bold text-[8px] uppercase border border-premium-border select-none">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-premium-text mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                        {comment.username}
                      </span>
                      <span className="text-premium-text/90 leading-relaxed">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action drawer */}
              <div className="p-4 border-t border-premium-border space-y-2 bg-premium-bg/50">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-premium-text">
                    <Heart className="w-5 h-5 hover:text-accent-coral cursor-pointer transition-colors" />
                    <MessageCircle className="w-5 h-5 hover:text-premium-muted cursor-pointer" />
                    <Send className="w-5 h-5 hover:text-premium-muted cursor-pointer" />
                  </div>
                  <BookmarkIcon className="w-5 h-5 text-premium-text hover:text-accent-cyan cursor-pointer" />
                </div>
                <div className="font-bold text-xs text-premium-text">
                  {(selectedPost.likes || 0).toLocaleString()} likes
                </div>
              </div>

              {/* Comment form */}
              <form 
                onSubmit={(e) => handleCommentSubmit(e, selectedPost.id)}
                className="flex items-center gap-3 p-3 border-t border-premium-border bg-premium-card mt-auto"
              >
                <input 
                  type="text" 
                  placeholder="Add a comment..."
                  value={commentInputs[selectedPost.id] || ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [selectedPost.id]: e.target.value })}
                  className="flex-1 bg-transparent text-xs focus:outline-none text-premium-text placeholder-premium-muted/50"
                />
                <button 
                  type="submit"
                  disabled={!commentInputs[selectedPost.id]?.trim()}
                  className="font-bold text-xs text-accent-cyan disabled:opacity-30 hover:text-accent-cyan/80 transition-colors focus:outline-none cursor-pointer"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reel Video Detail Modal */}
      {selectedReel && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedReel(null)}
        >
          <div 
            className="bg-premium-card max-w-[850px] w-full h-[85vh] max-h-[750px] rounded-3xl overflow-hidden flex flex-col md:flex-row relative border border-premium-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedReel(null)}
              className="absolute top-4 right-4 bg-premium-gray/80 hover:bg-premium-gray text-premium-text z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-xs cursor-pointer"
            >
              ✕
            </button>

            {/* Left 9:16 Video Player Container */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              <video 
                src={selectedReel.videoUrl} 
                autoPlay 
                loop 
                controls 
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Right Details & Comments Column */}
            <div className="w-full md:w-[380px] flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-premium-border bg-premium-card">
              {/* Creator Header */}
              <div className="flex items-center justify-between p-4 border-b border-premium-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full p-[1.5px] bg-premium-gray">
                    <AvatarImg
                      src={profile.profile_picture_url}
                      alt={profile.username || "user"}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-premium-text">{profile.username || "—"}</span>
                    <span className="text-[9px] text-accent-cyan font-semibold flex items-center gap-1">
                      <Film className="w-2.5 h-2.5" /> Reel
                    </span>
                  </div>
                </div>
              </div>

              {/* Caption & Comments Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[180px] md:max-h-[320px] bg-premium-bg/30">
                <div className="text-xs flex gap-3">
                  <AvatarImg
                    src={profile.profile_picture_url}
                    alt={profile.username || "user"}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-premium-text mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                      {profile.username || "—"}
                    </span>
                    <p className="text-premium-text/90 leading-relaxed font-medium mt-0.5">{selectedReel.caption}</p>
                  </div>
                </div>

                {selectedReel.comments && selectedReel.comments.map((comment, index) => (
                  <div key={index} className="text-xs flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-premium-gray text-premium-text flex-shrink-0 flex items-center justify-center font-bold text-[8px] uppercase border border-premium-border select-none">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-premium-text mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                        {comment.username}
                      </span>
                      <span className="text-premium-text/90 leading-relaxed">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Stats Bar */}
              <div className="p-4 border-t border-premium-border space-y-2 bg-premium-bg/50">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-premium-text">
                    <Heart className="w-5 h-5 hover:text-accent-coral cursor-pointer transition-colors" />
                    <MessageCircle className="w-5 h-5 hover:text-premium-muted cursor-pointer" />
                    <Send className="w-5 h-5 hover:text-premium-muted cursor-pointer" />
                  </div>
                  <BookmarkIcon className="w-5 h-5 text-premium-text hover:text-accent-cyan cursor-pointer" />
                </div>
                <div className="flex items-center justify-between font-bold text-xs text-premium-text pt-1">
                  <span>{(selectedReel.likes || 0).toLocaleString()} likes</span>
                  <span className="text-[10px] text-premium-muted font-normal">{selectedReel.views} views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers / Following Modal */}
      {showFollowsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-premium-card rounded-3xl max-w-sm w-full overflow-hidden border border-premium-border shadow-premium flex flex-col max-h-[380px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-premium-border/50">
              <span className="font-bold text-premium-text capitalize font-display">
                {showFollowsModal}
              </span>
              <button 
                onClick={() => {
                  setShowFollowsModal(null);
                  setFollowsList([]);
                }}
                className="text-premium-muted hover:text-premium-text transition-colors font-bold text-lg focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-premium-bg/30">
              {followsLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 bg-premium-gray rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-premium-gray rounded w-1/2" />
                        <div className="h-2.5 bg-premium-gray rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followsList.length === 0 ? (
                <div className="text-center py-10 text-premium-muted text-xs font-semibold">
                  No {showFollowsModal} found.
                </div>
              ) : (
                followsList.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-premium-border shrink-0 bg-premium-gray">
                        <AvatarImg 
                          src={user.profile_picture_url} 
                          alt={user.username} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <a
                          href={`/profile?username=${user.username}`}
                          className="font-bold text-xs text-premium-text hover:text-accent-cyan cursor-pointer transition-colors"
                        >
                          {user.username}
                        </a>
                        <p className="text-[10px] text-premium-muted">
                          {user.display_name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Popup Modal */}
      {showDeleteConfirmModal && (
        <div 
          className={`fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 ${isClosingDeleteModal ? "animate-backdrop-exit" : "animate-backdrop-smooth"}`}
          onClick={handleCloseDeleteModal}
        >
          <div 
            ref={deleteModalRef}
            className={`bg-premium-card border border-premium-border/80 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative transition-all ${isClosingDeleteModal ? "animate-modal-exit" : "animate-delete-popup-smooth"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Trash Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center text-accent-coral mx-auto shadow-inner">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-premium-text font-display">Delete Post?</h3>
              <p className="text-xs text-premium-muted leading-relaxed px-2">
                Are you sure you want to delete this post? This action is permanent and cannot be undone.
              </p>
            </div>

            {deleteErrorMsg && (
              <div className="bg-accent-coral/10 border border-accent-coral/20 p-2.5 rounded-xl text-accent-coral text-xs font-semibold flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={confirmDeletePost}
                disabled={isDeletingPost}
                className="w-full py-2.5 rounded-2xl bg-accent-coral hover:bg-accent-coral/90 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  "Delete Post"
                )}
              </button>

              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeletingPost}
                className="w-full py-2.5 rounded-2xl bg-premium-gray hover:bg-premium-gray/80 text-premium-text font-bold text-xs border border-premium-border transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
