import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, Search, MessageCircle, Heart, PlusSquare, User, LogOut, 
  Bookmark, Send, MoreHorizontal, Smile, Menu, Settings
} from "lucide-react";
import ProfilePage from "../profile/ProfilePage";
import SearchPage from "../search/SearchPage";
import { USER_API_BASE_URL } from "../../config";

const InstagramIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

// ── Module-level helpers (stable references, not recreated on every render) ──

/**
 * Renders an <img> when src is present; falls back to a gradient circle
 * showing the first letter of alt (e.g. username initial).
 */
const AvatarImg = ({ src, alt, className }) =>
  src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div
      className={`${className} bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs`}
    >
      {alt?.[0]?.toUpperCase() ?? "U"}
    </div>
  );


export default function HomePage({ onLogout, token }) {
  // ── Real user data from GET /user-profile/me ────────────────────────────────
  const [me, setMe] = useState({ username: "", display_name: "", profile_picture_url: "" });
  // Start as false when there is no token — avoids infinite loading skeleton
  const [meLoading, setMeLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setMeLoading(false);
      return;
    }
    setMeLoading(true);
    const fetchMe = async () => {
      try {
        const res = await fetch(`${USER_API_BASE_URL}/user-profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) setMe(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch /user-profile/me:", err);
      } finally {
        setMeLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const [posts, setPosts] = useState([
    {
      id: 1,
      username: "travel_diaries",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      caption: "Chasing sunsets around the world 🌅✨ #wanderlust #beaches #sunset",
      likes: 1240,
      hasLiked: false,
      hasSaved: false,
      comments: [
        { username: "nature_lover", text: "This is breathtaking!" },
        { username: "alex_stories", text: "Adding to my bucket list ASAP!" }
      ],
      time: "2h"
    },
    {
      id: 2,
      username: "chef_master",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
      caption: "Freshly made artisanal salad for lunch today! Healthy & delicious 🥗💚 #healthyfood #chef",
      likes: 852,
      hasLiked: false,
      hasSaved: false,
      comments: [
        { username: "foodie_girl", text: "Recipe please! 😍" }
      ],
      time: "5h"
    },
    {
      id: 3,
      username: "tech_vision",
      userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      caption: "Designing the workspace of the future. Clean setups, high productivity 💻🔌 #desksetup #workspace",
      likes: 2195,
      hasLiked: false,
      hasSaved: false,
      comments: [
        { username: "code_hustler", text: "Minimalism at its best!" },
        { username: "gamer_guy", text: "What monitor arm is that?" }
      ],
      time: "1d"
    }
  ]);

  const [stories] = useState([
    { id: 1, username: "your_story", isUser: true },
    { id: 2, username: "travel_diaries", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 3, username: "chef_master", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 4, username: "tech_vision", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 5, username: "fitness_guru", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 6, username: "art_gallery", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80" }
  ]);

  const [suggestions, setSuggestions] = useState([
    { id: 1, username: "pixel_artist", relation: "Suggested for you", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 2, username: "lens_explorer", relation: "Followed by chef_master", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 3, username: "wanderer_99", relation: "New to Instagram", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80", followed: false }
  ]);

  const [commentInputs, setCommentInputs] = useState({});
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [likeAnimationId, setLikeAnimationId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = location.pathname === "/profile" ? "profile" : location.pathname === "/search" ? "search" : "feed";
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Story progress timer
  useEffect(() => {
    if (!activeStory) return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setActiveStory(null);
          return 0;
        }
        return prev + 2.5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStory]);

  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            hasLiked: !post.hasLiked,
            likes: post.hasLiked ? post.likes - 1 : post.likes + 1
          };
        }
        return post;
      })
    );
  };

  const handleDoubleTap = (postId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newHasLiked = true;
          const newLikes = post.hasLiked ? post.likes : post.likes + 1;
          return { ...post, hasLiked: newHasLiked, likes: newLikes };
        }
        return post;
      })
    );
    setLikeAnimationId(postId);
    setTimeout(() => {
      setLikeAnimationId(null);
    }, 1000);
  };

  const handleSave = (postId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return { ...post, hasSaved: !post.hasSaved };
        }
        return post;
      })
    );
  };

  const handleCommentSubmit = (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, { username: "current_user", text }]
          };
        }
        return post;
      })
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleFollowSuggestion = (sugId) => {
    setSuggestions((prev) =>
      prev.map((sug) => {
        if (sug.id === sugId) {
          return { ...sug, followed: !sug.followed };
        }
        return sug;
      })
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#262626] font-sans flex w-full justify-center">
      <div className="flex w-full max-w-[1440px] relative min-h-screen">
        
        {/* Left Sidebar - High-Fidelity Responsive Design */}
        <aside className="fixed left-0 top-0 bottom-0 h-screen border-r border-[#dbdbdb] bg-white flex flex-col justify-between py-6 px-3 z-30 transition-all duration-300
          w-[72px] xl:w-[245px] hidden md:flex shrink-0">
          
          <div className="space-y-6">
            {/* Instagram Cursive Logo */}
            <div className="pt-4 px-3 h-14 flex items-center">
              {/* Desktop Logo */}
              <span className="font-billabong text-3xl font-medium tracking-wide bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent cursor-pointer hidden xl:inline">
                Instagram
              </span>
              {/* Tablet Icon Logo */}
              <InstagramIcon className="w-7 h-7 text-[#262626] xl:hidden mx-auto hover:scale-105 transition-transform" />
            </div>

            <nav className="space-y-1">
              <button 
                onClick={() => { navigate("/"); setIsMoreOpen(false); }}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group"
              >
                <Home className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform text-[#262626]" />
                <span className="text-sm font-bold hidden xl:inline">Home</span>
              </button>
              <button 
                onClick={() => { navigate("/search"); setIsMoreOpen(false); }}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group"
              >
                <Search className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Search</span>
              </button>

              <button className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group relative">
                <MessageCircle className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="absolute left-7 top-2.5 w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm font-semibold hidden xl:inline">Messages</span>
              </button>
              <button className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group">
                <Heart className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Notifications</span>
              </button>
              <button className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group">
                <PlusSquare className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Create</span>
              </button>
              <button 
                onClick={() => { navigate("/profile"); setIsMoreOpen(false); }}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#dbdbdb] shrink-0">
                  <AvatarImg
                    src={me.profile_picture_url}
                    alt={me.username || "profile"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-semibold hidden xl:inline">Profile</span>
              </button>
            </nav>
          </div>

          {/* Bottom Settings Menu with interactive popup */}
          <div className="space-y-1 relative">
            {isMoreOpen && (
              <div className="absolute bottom-16 left-2 w-[220px] bg-white border border-[#dbdbdb] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-2 z-50 animate-fade-in space-y-1">
                <button 
                  onClick={() => { navigate("/profile"); setIsMoreOpen(false); }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 text-[#262626] font-semibold text-xs transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Saved</span>
                </button>
                <button 
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 text-[#262626] font-semibold text-xs transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="h-[1px] bg-[#efefef] my-1" />
                <button 
                  onClick={onLogout}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-500 font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 text-[#262626] transition-all group"
            >
              <Menu className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
              <span className="text-sm font-semibold hidden xl:inline">More</span>
            </button>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#dbdbdb] flex md:hidden items-center justify-between px-4 z-30">
          <span className="font-billabong text-2xl tracking-wide bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
            Instagram
          </span>
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6 text-[#262626]" />
            <MessageCircle className="w-6 h-6 text-[#262626]" />
          </div>
        </header>

        {/* Main Content Feed / Profile Layer */}
        <div className="flex-1 md:pl-[72px] xl:pl-[245px] flex justify-center py-6 min-h-screen w-full bg-[#fafafa]">
          {activeView === "feed" ? (
            <main className="flex w-full max-w-[935px] py-6 px-4 gap-8 justify-center mt-12 md:mt-0">
            
            {/* Feed Section (Exactly 600px Max-Width for Native Look) */}
            <section className="max-w-[470px] sm:max-w-[600px] w-full shrink-0 space-y-4">
              
              {/* Stories Carousel */}
              <div className="bg-white border border-[#dbdbdb] rounded-lg py-4 px-4 flex gap-4 overflow-x-auto scrollbar-none">
                {stories.map((story) => (
                  <button 
                    key={story.id} 
                    onClick={() => setActiveStory(story.isUser ? { ...story, avatar: me.profile_picture_url, username: me.username } : story)}
                    className="flex flex-col items-center flex-shrink-0 focus:outline-none cursor-pointer group"
                  >
                    <div className="w-[66px] h-[66px] rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] transition-transform duration-200 group-hover:scale-105">
                      <div className="w-full h-full bg-white rounded-full p-[2px]">
                        {story.isUser ? (
                          <AvatarImg
                            src={me.profile_picture_url}
                            alt={me.username || "you"}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <img 
                            src={story.avatar} 
                            alt={story.username} 
                            className="w-full h-full object-cover rounded-full"
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#262626] font-normal mt-1.5 truncate max-w-[62px]">
                      {story.isUser ? "Your Story" : story.username}
                    </span>
                  </button>
                ))}
              </div>

              {/* Feed Items */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="bg-white border border-[#dbdbdb] rounded-lg overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-[#efefef]">
                      <div className="flex items-center gap-3">
                        <div className="w-[38px] h-[38px] rounded-full p-[1.5px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                          <div className="w-full h-full bg-white rounded-full p-[1px]">
                            <img 
                              src={post.userAvatar} 
                              alt="user avatar" 
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[#262626] cursor-pointer hover:text-black/75">
                            {post.username}
                          </span>
                          <span className="text-[9px] text-[#8e8e8e] font-semibold">Suggested post</span>
                        </div>
                      </div>
                      <button className="text-[#262626] hover:opacity-50">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content Image with Double-Tap Like support */}
                    <div 
                      className="relative aspect-square bg-[#fafafa] select-none cursor-pointer overflow-hidden flex items-center justify-center"
                      onDoubleClick={() => handleDoubleTap(post.id)}
                    >
                      <img 
                        src={post.image} 
                        alt="Post media" 
                        className="w-full h-full object-cover"
                      />
                      {/* Native Double-Tap Heart Pop Animation */}
                      {likeAnimationId === post.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 animate-fade-in z-10">
                          <Heart className="w-24 h-24 text-white fill-white animate-heart-beat drop-shadow-xl" />
                        </div>
                      )}
                    </div>

                    {/* Actions Panel */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className={`transition-transform duration-200 active:scale-125 focus:outline-none ${post.hasLiked ? "text-[#ff3040]" : "text-[#262626] hover:opacity-60"}`}
                          >
                            <Heart className={`w-7 h-7 ${post.hasLiked ? "fill-current" : ""}`} />
                          </button>
                          <button className="text-[#262626] hover:opacity-60 focus:outline-none">
                            <MessageCircle className="w-7 h-7" />
                          </button>
                          <button className="text-[#262626] hover:opacity-60 focus:outline-none">
                            <Send className="w-7 h-7" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleSave(post.id)}
                          className={`transition-transform focus:outline-none ${post.hasSaved ? "text-[#262626]" : "text-[#262626] hover:opacity-60"}`}
                        >
                          <Bookmark className={`w-7 h-7 ${post.hasSaved ? "fill-current" : ""}`} />
                        </button>
                      </div>

                      {/* Likes Counter */}
                      <div className="font-bold text-xs text-[#262626]">
                        {post.likes.toLocaleString()} likes
                      </div>

                      {/* Caption block */}
                      <div className="text-xs text-[#262626] leading-relaxed">
                        <span className="font-bold mr-1.5 hover:opacity-85 cursor-pointer">
                          {post.username}
                        </span>
                        {post.caption}
                      </div>

                      {/* Comments render */}
                      {post.comments.length > 0 && (
                        <div className="space-y-1 pt-1.5">
                          <button className="text-[#8e8e8e] text-xs font-semibold focus:outline-none hover:text-black/60 block mb-1">
                            View all {post.comments.length} comments
                          </button>
                          {post.comments.map((comment, index) => (
                            <div key={index} className="text-xs flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[#262626] mr-1.5 hover:opacity-80 cursor-pointer">
                                  {comment.username}
                                </span>
                                <span className="text-[#262626]">{comment.text}</span>
                              </div>
                              <Heart className="w-3 h-3 text-slate-400 hover:text-red-500 cursor-pointer" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] text-[#8e8e8e] font-semibold uppercase tracking-wider pt-1">
                        {post.time} ago
                      </div>

                      {/* Text Input area */}
                      <form 
                        onSubmit={(e) => handleCommentSubmit(e, post.id)}
                        className="flex items-center gap-3 pt-3 border-t border-[#efefef] mt-3"
                      >
                        <Smile className="w-5 h-5 text-slate-500 cursor-pointer hover:text-slate-700 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Add a comment..."
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          className="flex-1 bg-transparent text-xs focus:outline-none text-[#262626] placeholder-[#8e8e8e]"
                        />
                        <button 
                          type="submit"
                          disabled={!commentInputs[post.id]?.trim()}
                          className="font-bold text-xs text-[#0095f6] disabled:opacity-30 hover:text-[#00376b] transition-colors focus:outline-none"
                        >
                          Post
                        </button>
                      </form>
                    </div>

                  </article>
                ))}
              </div>
            </section>

            {/* Right Sidebar Suggestions - Instagram-Fidelity width and placement */}
            <aside className="w-[320px] shrink-0 hidden lg:block sticky top-6 self-start pl-6">
              
              {/* Logged in User Identity Card */}
              <div className="flex items-center justify-between mb-4">
                <div 
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-[56px] h-[56px] rounded-full p-[2px] border border-[#dbdbdb] overflow-hidden">
                    {meLoading ? (
                      <div className="w-full h-full rounded-full bg-slate-100 animate-pulse" />
                    ) : (
                      <AvatarImg
                        src={me.profile_picture_url}
                        alt={me.username || "user"}
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-[#262626] hover:opacity-85">
                      {meLoading ? (
                        <span className="inline-block w-20 h-3 bg-slate-100 animate-pulse rounded" />
                      ) : (
                        me.username || "—"
                      )}
                    </span>
                    <span className="text-[11px] text-[#8e8e8e]">
                      {meLoading ? (
                        <span className="inline-block w-28 h-2.5 bg-slate-100 animate-pulse rounded mt-1" />
                      ) : (
                        me.display_name || "Instaclone Member"
                      )}
                    </span>
                  </div>
                </div>

              </div>

              {/* Suggestions Section */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#8e8e8e]">Suggested for you</span>
                <button className="text-[11px] font-bold text-[#262626] hover:opacity-50">See All</button>
              </div>

              {/* Suggestions List */}
              <div className="space-y-3">
                {suggestions.map((sug) => (
                  <div key={sug.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={sug.avatar} 
                        alt={sug.username} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-[#262626] cursor-pointer hover:opacity-80">
                          {sug.username}
                        </span>
                        <span className="text-[9px] text-[#8e8e8e] truncate max-w-[130px]">
                          {sug.relation}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleFollowSuggestion(sug.id)}
                      className={`text-[11px] font-bold transition-colors focus:outline-none ${sug.followed ? "text-[#262626] hover:opacity-50" : "text-[#0095f6] hover:text-[#00376b]"}`}
                    >
                      {sug.followed ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Native links footer */}
              <footer className="mt-8 text-[10px] text-[#c7c7c7] space-y-3 leading-normal font-normal">
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                  <a href="#" className="hover:underline">About</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Help</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Press</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">API</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Jobs</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Privacy</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Terms</a>
                  <span>&middot;</span>
                  <a href="#" className="hover:underline">Locations</a>
                </div>
                <div className="uppercase tracking-wider text-[9px] font-semibold">&copy; {new Date().getFullYear()} INSTACLONE FROM METACLONE</div>
              </footer>

            </aside>

          </main>
          ) : activeView === "profile" ? (
            <div className="w-full mt-12 md:mt-0">
              <ProfilePage posts={posts} token={token} />
            </div>
          ) : (
            <div className="w-full mt-12 md:mt-0">
              <SearchPage token={token} />
            </div>
          )}
        </div>

      </div>

      {/* Story Modal Viewer */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-fade-in">
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${storyProgress}%` }}
            />
          </div>

          <button 
            onClick={() => setActiveStory(null)}
            className="absolute top-8 right-8 text-white/70 hover:text-white font-bold text-lg"
          >
            ✕
          </button>

          <div className="max-w-md w-full aspect-[9/16] relative flex items-center justify-center p-4">
            <div className="absolute top-4 left-4 flex items-center gap-3 text-white">
              <img 
                src={activeStory.avatar} 
                alt={activeStory.username} 
                className="w-8 h-8 rounded-full border border-white/40 object-cover"
              />
              <span className="font-bold text-sm">{activeStory.isUser ? "Your Story" : activeStory.username}</span>
            </div>
            <img 
              src={activeStory.avatar} 
              alt="Story" 
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#dbdbdb] flex md:hidden items-center justify-around z-30 shadow-lg">
        <button 
          onClick={() => navigate("/")}
          className={`${activeView === "feed" ? "text-purple-600" : "text-slate-500"}`}
        >
          <Home className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate("/search")}
          className={`${activeView === "search" ? "text-purple-600" : "text-slate-500"}`}
        >
          <Search className="w-6 h-6" />
        </button>
        <button className="text-slate-500">
          <PlusSquare className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate("/profile")}
          className={`${activeView === "profile" ? "text-purple-600" : "text-slate-500"}`}
        >
          <User className="w-6 h-6" />
        </button>
      </nav>

    </div>
  );
}
