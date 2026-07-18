import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Grid, Bookmark, Heart, MessageCircle, 
  MoreHorizontal, Smile, Send, Bookmark as BookmarkIcon,
  ShieldCheck, Link2, Lock
} from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import EditProfilePage from "./EditProfilePage";
import { gsap } from "gsap";

export default function ProfilePage({ posts, token }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [showFollowsModal, setShowFollowsModal] = useState(null); // "followers" | "following" | null
  const [followsList, setFollowsList] = useState([]);
  const [followsLoading, setFollowsLoading] = useState(false);

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

  useEffect(() => {
    // GSAP entrance
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, [searchUsername]);

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

  const [savedPosts] = useState([
    {
      id: 101,
      image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80",
      likes: 940,
      commentsCount: 22,
      caption: "Serene forests and paths 🌲🍁",
      time: "2d",
      comments: [
        { username: "hiker_bob", text: "Stunning shot!" }
      ]
    },
    {
      id: 102,
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
      likes: 1845,
      commentsCount: 54,
      caption: "Misty mornings in the hills ⛰️⛅",
      time: "4d",
      comments: []
    }
  ]);

  const handlePostClick = (post) => setSelectedPost(post);
  const handleCloseModal = () => setSelectedPost(null);

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
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none select-none cursor-pointer
                  ${activeTab === "saved" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:text-premium-text"}`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved</span>
              </button>
            </div>
          </div>

          {/* Grid Content */}
          {displayedPosts.length === 0 ? (
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
          )}
        </>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-premium-card max-w-[850px] w-full max-h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row relative border border-premium-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 bg-premium-gray/80 hover:bg-premium-gray text-premium-text z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-xs cursor-pointer"
            >
              ✕
            </button>

            {/* Left Image */}
            <div className="flex-1 bg-black flex items-center justify-center aspect-square md:aspect-auto">
              <img 
                src={selectedPost.image} 
                alt="Selected post zoom" 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>

            {/* Right Detail Panel */}
            <div className="w-full md:w-[380px] flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-premium-border bg-premium-card">
              
              {/* Header */}
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
                    <span className="text-[9px] text-premium-muted font-medium">Creator</span>
                  </div>
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

    </div>
  );
}
