import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { 
  Grid, Bookmark, User, Heart, MessageCircle, Settings, 
  MoreHorizontal, Smile, Send, Bookmark as BookmarkIcon,
  Sparkles, ShieldCheck, Link2, Lock
} from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import EditProfilePage from "./EditProfilePage";

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

  // ── Real profile data from GET /user-profile/portfolio ─────────────────────────────
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

  // Avatar helper — gradient initial fallback
  const AvatarImg = ({ src, alt, className }) =>
    src ? (
      <img src={src} alt={alt} className={className} />
    ) : (
      <div
        className={`${className} bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-white font-bold`}
      >
        {alt?.[0]?.toUpperCase() ?? "U"}
      </div>
    );

  // Skeleton block helper
  const Skeleton = ({ className }) => (
    <span className={`inline-block bg-slate-100 animate-pulse rounded ${className}`} />
  );

  // Mock saved posts
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

  const handleUpdateSuccess = (newData) => {
    // Re-fetch profile to ensure stats and newly signed urls are aligned
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
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 bg-gradient-to-b from-[#fafafa] via-white to-[#fafafa] min-h-screen">
      
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 pb-8 mb-8 border-b border-[#efefef]">
        
        {/* Profile Avatar */}
        <div className="w-[150px] h-[150px] rounded-full overflow-hidden border border-[#dbdbdb] shrink-0">
          {profileLoading ? (
            <div className="w-full h-full bg-slate-100 animate-pulse" />
          ) : (
            <AvatarImg
              src={profile.profile_picture_url}
              alt={profile.username || "profile"}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info & Stats */}
        <div className="flex-1 space-y-6 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-semibold text-[#262626] tracking-tight">
                {profileLoading ? <Skeleton className="w-28 h-5" /> : profile.username || "—"}
              </h2>
              <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-100" />
            </div>
            
            {searchUsername ? (
              profile.following_status === "ACCEPTED" ? (
                <button 
                  onClick={handleFollowAction}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-6 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Following
                </button>
              ) : profile.following_status === "PENDING" ? (
                <button 
                  onClick={handleFollowAction}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-6 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Click to withdraw request"
                >
                  Cancel Request
                </button>
              ) : (
                <button 
                  onClick={handleFollowAction}
                  className="bg-[#0095f6] hover:bg-[#00376b] text-white font-bold text-xs px-6 py-2 rounded-xl shadow-[0_2.5px_8px_rgba(0,149,246,0.2)] transition-all active:scale-95 cursor-pointer"
                >
                  Follow
                </button>
              )
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white hover:bg-slate-50 text-[#262626] font-bold text-xs px-5 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                Edit profile
              </button>
            )}
          </div>

          {/* Stats Bar */}
          {(() => {
            const isPrivate = searchUsername && profile.account_visibility === "PRIVATE" && profile.following_status !== "ACCEPTED";
            return (
              <div className="grid grid-cols-3 max-w-[400px] mx-auto md:mx-0 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="text-center border-r border-[#efefef]">
                  <span className="block font-extrabold text-sm text-[#262626]">
                    {activeTab === "posts" ? posts.length : savedPosts.length}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">posts</span>
                </div>
                <div 
                  onClick={() => !isPrivate && fetchFollowsList("followers")}
                  className={`text-center border-r border-[#efefef] rounded-lg transition-colors ${isPrivate ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-slate-50"}`}
                >
                  <span className="block font-extrabold text-sm text-[#262626]">
                    {profileLoading ? <Skeleton className="w-8 h-4 mx-auto" /> : profile.followers_count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">followers</span>
                </div>
                <div 
                  onClick={() => !isPrivate && fetchFollowsList("following")}
                  className={`text-center rounded-lg transition-colors ${isPrivate ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-slate-50"}`}
                >
                  <span className="block font-extrabold text-sm text-[#262626]">
                    {profileLoading ? <Skeleton className="w-8 h-4 mx-auto" /> : profile.following_count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">following</span>
                </div>
              </div>
            );
          })()}

          {/* Bio details */}
          <div className="text-sm space-y-2 text-[#262626]">
            <h1 className="font-bold text-[#1e1e1e] text-base">
              {profileLoading ? <Skeleton className="w-36 h-4" /> : profile.display_name || "—"}
            </h1>
            {(!searchUsername || profile.account_visibility !== "PRIVATE" || profile.following_status === "ACCEPTED") && (
              <>
                <p className="whitespace-pre-line leading-relaxed text-slate-600 font-medium">
                  {profileLoading ? (
                    <span className="flex flex-col gap-1.5">
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
                    className="inline-flex items-center gap-1.5 text-[#0095f6] hover:text-[#00376b] font-semibold transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>{profile.website}</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>

      </header>

      {searchUsername && profile.account_visibility === "PRIVATE" && profile.following_status !== "ACCEPTED" ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-center space-y-4">
          <div className="p-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400">
            <Lock className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#262626]">This Account is Private</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto font-medium">
              Follow this account to see their photos and videos.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#efefef]/60 p-1 rounded-xl flex gap-1.5">
              <button 
                onClick={() => setActiveTab("posts")}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none select-none
                  ${activeTab === "posts" ? "bg-white text-[#262626] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Posts</span>
              </button>
              <button 
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none select-none
                  ${activeTab === "saved" ? "bg-white text-[#262626] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved</span>
              </button>
            </div>
          </div>

          {/* Grid Content */}
          {displayedPosts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
              <Grid className="w-12 h-12 mx-auto mb-4 stroke-[1.5] text-slate-300" />
              <p className="text-sm font-bold text-slate-400">No Posts Yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
              {displayedPosts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => handlePostClick(post)}
                  className="relative aspect-square cursor-pointer group bg-slate-50 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                  <img 
                    src={post.image} 
                    alt="profile grid media" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Glass overlay */}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white text-xs sm:text-sm font-bold">
                    <div className="flex items-center gap-1.5 transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                      <Heart className="w-5 h-5 fill-current text-white" />
                      <span>{post.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                      <MessageCircle className="w-5 h-5 fill-current text-white" />
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
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white max-w-[850px] w-full max-h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row relative shadow-[0_24px_50px_rgba(0,0,0,0.25)] border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors font-bold text-sm"
            >
              ✕
            </button>

            {/* Left — Image */}
            <div className="flex-1 bg-black flex items-center justify-center aspect-square md:aspect-auto">
              <img 
                src={selectedPost.image} 
                alt="Selected post zoom" 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>

            {/* Right — Detail panel */}
            <div className="w-full md:w-[380px] flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-[#efefef] bg-white">
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#efefef]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#ff3040] to-[#af26b3]">
                    <div className="w-full h-full bg-white rounded-full p-[1px]">
                      <AvatarImg
                        src={profile.profile_picture_url}
                        alt={profile.username || "user"}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-[#262626]">{profile.username || "—"}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Creator</span>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-800">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Comments feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[200px] md:max-h-[350px] scrollbar-none">
                {/* Caption */}
                <div className="text-xs flex gap-3">
                  <AvatarImg
                    src={profile.profile_picture_url}
                    alt={profile.username || "user"}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-[#262626] mr-1.5 hover:underline cursor-pointer">
                      {profile.username || "—"}
                    </span>
                    <span className="text-slate-600 font-medium leading-relaxed">{selectedPost.caption}</span>
                  </div>
                </div>

                {/* Comments */}
                {selectedPost.comments && selectedPost.comments.map((comment, index) => (
                  <div key={index} className="text-xs flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex-shrink-0 flex items-center justify-center font-bold text-[8px] uppercase select-none">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-[#262626] mr-1.5 hover:underline cursor-pointer">
                        {comment.username}
                      </span>
                      <span className="text-slate-600 leading-relaxed">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action drawer */}
              <div className="p-4 border-t border-[#efefef] space-y-2 bg-[#fafafa]/50">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <Heart className="w-6 h-6 text-[#262626] hover:text-red-500 cursor-pointer transition-colors" />
                    <MessageCircle className="w-6 h-6 text-[#262626] hover:opacity-60 cursor-pointer" />
                    <Send className="w-6 h-6 text-[#262626] hover:opacity-60 cursor-pointer" />
                  </div>
                  <BookmarkIcon className="w-6 h-6 text-[#262626] hover:opacity-60 cursor-pointer" />
                </div>
                <div className="font-bold text-xs text-[#262626]">
                  {(selectedPost.likes || 0).toLocaleString()} likes
                </div>
              </div>

              {/* Comment form */}
              <form 
                onSubmit={(e) => handleCommentSubmit(e, selectedPost.id)}
                className="flex items-center gap-3 p-3 border-t border-[#efefef] bg-white mt-auto"
              >
                <Smile className="w-5 h-5 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0" />
                <input 
                  type="text" 
                  placeholder="Add a comment..."
                  value={commentInputs[selectedPost.id] || ""}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [selectedPost.id]: e.target.value })}
                  className="flex-1 bg-transparent text-xs focus:outline-none text-[#262626] placeholder-[#8e8e8e]"
                />
                <button 
                  type="submit"
                  disabled={!commentInputs[selectedPost.id]?.trim()}
                  className="font-bold text-xs text-[#0095f6] disabled:opacity-30 hover:text-[#00376b] transition-colors focus:outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col max-h-[400px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-extrabold text-[#262626] capitalize">
                {showFollowsModal}
              </span>
              <button 
                onClick={() => {
                  setShowFollowsModal(null);
                  setFollowsList([]);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors font-bold text-lg focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {followsLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-slate-100 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followsList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">
                  No {showFollowsModal} found.
                </div>
              ) : (
                followsList.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 shrink-0">
                        <AvatarImg 
                          src={user.profile_picture_url} 
                          alt={user.username} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <a
                          href={`/profile?username=${user.username}`}
                          className="font-bold text-sm text-[#262626] hover:underline cursor-pointer"
                        >
                          {user.username}
                        </a>
                        <p className="text-xs text-slate-400 font-semibold">
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
