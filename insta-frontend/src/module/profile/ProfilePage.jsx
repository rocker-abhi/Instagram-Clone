import React, { useState } from "react";
import { 
  Grid, Bookmark, User, Heart, MessageCircle, Settings, 
  MoreHorizontal, Smile, Send, Bookmark as BookmarkIcon,
  Sparkles, ShieldCheck, Link2
} from "lucide-react";

export default function ProfilePage({ posts }) {
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const userStats = {
    username: "current_user",
    fullName: "Abhishek",
    bio: "Full Stack Engineer & Designer ✨\nCrafting pixel-perfect web experiences.\nBuilding the future of social networks.",
    website: "github.com/rocker-abhi",
    followers: 1420,
    following: 382
  };

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

  const handlePostClick = (post) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const handleCommentSubmit = (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    if (selectedPost) {
      const updatedPost = {
        ...selectedPost,
        comments: [...(selectedPost.comments || []), { username: "current_user", text }]
      };
      setSelectedPost(updatedPost);
    }
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const displayedPosts = activeTab === "posts" ? posts : savedPosts;

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 bg-gradient-to-b from-[#fafafa] via-white to-[#fafafa] min-h-screen">
      
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 pb-8 mb-8 border-b border-[#efefef]">
        
        {/* Profile Avatar Container */}
        <div className="w-[150px] h-[150px] rounded-full overflow-hidden border border-[#dbdbdb] shrink-0">
          <img 
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
            alt="Current profile" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Info & Stats */}
        <div className="flex-1 space-y-6 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-semibold text-[#262626] tracking-tight">{userStats.username}</h2>
              <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-100" />
            </div>
            
            <button className="bg-white hover:bg-slate-50 text-[#262626] font-bold text-xs px-5 py-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200 transition-all active:scale-95">
              Edit profile
            </button>
          </div>

          {/* Stats Bar (Aesthetic glassmorphic pills) */}
          <div className="grid grid-cols-3 max-w-[400px] mx-auto md:mx-0 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="text-center border-r border-[#efefef]">
              <span className="block font-extrabold text-sm text-[#262626]">{activeTab === "posts" ? posts.length : savedPosts.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">posts</span>
            </div>
            <div className="text-center border-r border-[#efefef] cursor-pointer hover:bg-slate-50 transition-colors rounded-lg">
              <span className="block font-extrabold text-sm text-[#262626]">{userStats.followers.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">followers</span>
            </div>
            <div className="text-center cursor-pointer hover:bg-slate-50 transition-colors rounded-lg">
              <span className="block font-extrabold text-sm text-[#262626]">{userStats.following.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">following</span>
            </div>
          </div>

          {/* Bio details */}
          <div className="text-sm space-y-2 text-[#262626]">
            <h1 className="font-bold text-[#1e1e1e] text-base">{userStats.fullName}</h1>
            <p className="whitespace-pre-line leading-relaxed text-slate-600 font-medium">{userStats.bio}</p>
            {userStats.website && (
              <a 
                href={`https://${userStats.website}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 text-[#0095f6] hover:text-[#00376b] font-semibold transition-colors"
              >
                <Link2 className="w-4 h-4" />
                <span>{userStats.website}</span>
              </a>
            )}
          </div>
        </div>

      </header>

      {/* Tabs Navigation (Pill-Style Slider) */}
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

      {/* Grid Content section */}
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

      {/* Modern Detail Dialog Overlay */}
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

            {/* Left side Image with Soft Inner Border */}
            <div className="flex-1 bg-black flex items-center justify-center aspect-square md:aspect-auto">
              <img 
                src={selectedPost.image} 
                alt="Selected post zoom" 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>

            {/* Right side Detail panel */}
            <div className="w-full md:w-[380px] flex flex-col h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-[#efefef] bg-white">
              
              {/* Header profile info */}
              <div className="flex items-center justify-between p-4 border-b border-[#efefef]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#ff3040] to-[#af26b3]">
                    <div className="w-full h-full bg-white rounded-full p-[1px]">
                      <img 
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
                        alt="Current user avatar" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-[#262626]">{userStats.username}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">Creator</span>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-800">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Feed of Comments */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[200px] md:max-h-[350px] scrollbar-none">
                {/* Caption description */}
                <div className="text-xs flex gap-3">
                  <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
                    alt="user avatar" 
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-[#262626] mr-1.5 hover:underline cursor-pointer">
                      {userStats.username}
                    </span>
                    <span className="text-slate-600 font-medium leading-relaxed">{selectedPost.caption}</span>
                  </div>
                </div>

                {/* Additional Comments */}
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

              {/* Form submit */}
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

    </div>
  );
}
