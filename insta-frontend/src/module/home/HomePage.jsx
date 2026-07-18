import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, Search, MessageCircle, Heart, PlusSquare, User, LogOut, 
  Bookmark, Send, MoreHorizontal, Smile, Settings, UserCheck
} from "lucide-react";
import ProfilePage from "../profile/ProfilePage";
import SearchPage from "../search/SearchPage";
import SettingsPage from "../settings/SettingsPage";
import RequestsPage from "../requests/RequestsPage";
import NotificationsPage from "../notifications/NotificationsPage";
import ChatsPage from "../chats/ChatsPage";
import { USER_API_BASE_URL, CHAT_WS_URL } from "../../config";
import { gsap } from "gsap";

const LogoIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="text-accent-cyan"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="6" ry="6"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const AvatarImg = ({ src, alt, className }) =>
  src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div
      className={`${className} bg-premium-gray flex items-center justify-center text-premium-text font-bold text-xs`}
    >
      {alt?.[0]?.toUpperCase() ?? "U"}
    </div>
  );

export default function HomePage({ onLogout, token }) {
  const [me, setMe] = useState({ username: "", display_name: "", profile_picture_url: "" });
  const [meLoading, setMeLoading] = useState(!!token);

  const sidebarRef = useRef(null);
  const feedRef = useRef(null);
  const suggestionsRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const activeView = location.pathname === "/profile" ? "profile" : location.pathname === "/search" ? "search" : location.pathname === "/settings" ? "settings" : location.pathname === "/requests" ? "requests" : location.pathname === "/notifications" ? "notifications" : location.pathname === "/chats" ? "chats" : "feed";
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const activeViewRef = useRef(activeView);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

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

  // GSAP animations for layout mount
  useEffect(() => {
    // Sidebar slide in from left with blur removal
    gsap.fromTo(
      sidebarRef.current,
      { x: -50, opacity: 0, filter: "blur(4px)" },
      { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }
    );

    // Staggered entry of feed articles
    if (activeView === "feed" && feedRef.current) {
      const cards = feedRef.current.querySelectorAll("article");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0, filter: "blur(4px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, stagger: 0.1, ease: "power4.out" }
        );
      }

      // Suggestions panel fade in
      if (suggestionsRef.current) {
        gsap.fromTo(
          suggestionsRef.current,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.8, delay: 0.2, ease: "power3.out" }
        );
      }
    }
  }, [activeView]);

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
      caption: "Designing the workspace of the future. Clean setups, high productivity 💻 #desksetup #workspace",
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

  const incrementUnread = (convId) => {
    setUnreadCounts(prev => ({
      ...prev,
      [convId]: (prev[convId] || 0) + 1
    }));
  };

  const clearUnread = (convId) => {
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
  };

  const [globalWsStatus, setGlobalWsStatus] = useState("connecting");
  const [globalWsAttempt, setGlobalWsAttempt] = useState(1);
  const globalSocketRef = useRef(null);
  const globalAttemptRef = useRef(1);
  const globalRetryTimerRef = useRef(null);
  const globalMountTimerRef = useRef(null);

  const connectGlobalWs = () => {
    if (!token) return;
    const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);
    globalSocketRef.current = ws;

    ws.onopen = () => {
      globalAttemptRef.current = 1;
      setGlobalWsAttempt(1);
      setGlobalWsStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event_type === "chat.message") {
          const msg = payload.data;
          if (activeViewRef.current === "chats") {
            window.dispatchEvent(new CustomEvent("global:chat:message", { detail: msg }));
          } else {
            incrementUnread(msg.conversation_id);
          }
        } else if (payload.event_type === "message.delete") {
          if (activeViewRef.current === "chats") {
            window.dispatchEvent(new CustomEvent("global:chat:delete", { detail: payload.data }));
          }
        } else if (payload.event_type === "message.edit") {
          if (activeViewRef.current === "chats") {
            window.dispatchEvent(new CustomEvent("global:chat:edit", { detail: payload.data }));
          }
        } else if (payload.event_type === "presence.online" || payload.event_type === "presence.offline") {
          if (activeViewRef.current === "chats") {
            window.dispatchEvent(new CustomEvent("global:chat:presence", { detail: payload }));
          }
        }
      } catch (e) { /* ignore */ }
    };

    ws.onclose = () => {
      if (ws !== globalSocketRef.current) return;
      setGlobalWsStatus("connecting");
      if (globalAttemptRef.current < 5) {
        globalAttemptRef.current += 1;
        setGlobalWsAttempt(globalAttemptRef.current);
        globalRetryTimerRef.current = setTimeout(connectGlobalWs, 3000);
      } else {
        setGlobalWsStatus("offline");
      }
    };

    ws.onerror = () => {};
  };

  useEffect(() => {
    if (token) {
      globalMountTimerRef.current = setTimeout(connectGlobalWs, 150);
    }
    return () => {
      clearTimeout(globalMountTimerRef.current);
      clearTimeout(globalRetryTimerRef.current);
      if (globalSocketRef.current) {
        globalSocketRef.current.onopen = null;
        globalSocketRef.current.onclose = null;
        globalSocketRef.current.onerror = null;
        globalSocketRef.current.onmessage = null;
        globalSocketRef.current.close();
        globalSocketRef.current = null;
      }
    };
  }, [token]);

  const globalRetryWs = () => {
    clearTimeout(globalRetryTimerRef.current);
    globalAttemptRef.current = 1;
    setGlobalWsAttempt(1);
    setGlobalWsStatus("connecting");
    if (globalSocketRef.current) {
      globalSocketRef.current.onclose = null;
      globalSocketRef.current.close();
      globalSocketRef.current = null;
    }
    globalMountTimerRef.current = setTimeout(connectGlobalWs, 150);
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

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

  const handleLike = (postId, e) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiking = !post.hasLiked;
          if (isLiking && e?.currentTarget) {
            gsap.fromTo(
              e.currentTarget,
              { scale: 0.7 },
              { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 }
            );
          }
          return {
            ...post,
            hasLiked: isLiking,
            likes: isLiking ? post.likes + 1 : post.likes - 1
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

  const handleSave = (postId, e) => {
    if (e?.currentTarget) {
      gsap.fromTo(
        e.currentTarget,
        { scale: 0.8 },
        { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1 }
      );
    }
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
            comments: [...post.comments, { username: me.username || "current_user", text }]
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
    <div className="min-h-screen bg-premium-bg text-premium-text font-sans flex w-full justify-center">
      <div className="flex w-full max-w-[1440px] relative min-h-screen">
        
        {/* Left Sidebar - Premium Responsive Navigation */}
        <aside 
          ref={sidebarRef}
          className="fixed left-0 top-0 bottom-0 h-screen border-r border-premium-border bg-premium-card flex flex-col justify-between py-8 px-4 z-30 transition-all duration-300 w-[80px] xl:w-[260px] hidden md:flex shrink-0"
        >
          <div className="space-y-8">
            {/* Minimal Brand Identifier */}
            <div className="pt-2 px-3 h-14 flex items-center">
              <span className="text-xl font-bold font-display text-premium-text tracking-tight hidden xl:inline flex items-center gap-2 select-none">
                <LogoIcon className="w-5 h-5 shrink-0" />
                Instaclone
              </span>
              <LogoIcon className="w-6 h-6 xl:hidden mx-auto" />
            </div>

            <nav className="space-y-1">
              <button 
                onClick={() => { navigate("/"); setIsMoreOpen(false); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${activeView === "feed" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
              >
                <Home className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Home</span>
              </button>
              <button 
                onClick={() => { navigate("/search"); setIsMoreOpen(false); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${activeView === "search" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
              >
                <Search className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Search</span>
              </button>
              <button 
                onClick={() => { navigate("/chats"); setIsMoreOpen(false); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group relative cursor-pointer ${activeView === "chats" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
              >
                <div className="relative">
                  <MessageCircle className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-accent-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-premium-card animate-scale-in">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold hidden xl:inline">Messages</span>
              </button>
              <button 
                onClick={() => { navigate("/notifications"); setIsMoreOpen(false); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${activeView === "notifications" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
              >
                <Heart className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Notifications</span>
              </button>
              <button 
                onClick={() => { navigate("/profile"); setIsMoreOpen(false); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${activeView === "profile" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
              >
                <User className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
                <span className="text-sm font-semibold hidden xl:inline">Profile</span>
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => navigate("/settings")}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${activeView === "settings" ? "bg-premium-gray text-premium-text" : "text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"}`}
            >
              <Settings className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform" />
              <span className="text-sm font-semibold hidden xl:inline">Settings</span>
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-4 p-3 rounded-2xl text-accent-coral hover:bg-accent-coral/10 transition-all duration-200 group cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              <span className="text-sm font-semibold hidden xl:inline">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-premium-card border-b border-premium-border flex md:hidden items-center justify-between px-4 z-30">
          <span className="text-lg font-bold font-display text-premium-text tracking-tight flex items-center gap-1.5 select-none">
            <LogoIcon className="w-4.5 h-4.5" />
            Instaclone
          </span>
          <div className="flex items-center gap-4">
            <Heart className="w-5 h-5 text-premium-text cursor-pointer" onClick={() => navigate("/notifications")} />
            <div className="relative cursor-pointer" onClick={() => navigate("/chats")}>
              <MessageCircle className="w-5 h-5 text-premium-text" />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-accent-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-premium-card animate-scale-in">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 md:pl-[80px] xl:pl-[260px] flex justify-center py-6 min-h-screen w-full bg-premium-bg">
          {activeView === "feed" ? (
            <main ref={feedRef} className="flex w-full max-w-[960px] py-6 px-4 gap-8 justify-center mt-12 md:mt-0">
              
              {/* Feed Column */}
              <section className="max-w-[480px] sm:max-w-[620px] w-full shrink-0 space-y-6">
                
                {/* Stories Strip */}
                <div className="bg-premium-card border border-premium-border rounded-3xl py-5 px-5 flex gap-4 overflow-x-auto scrollbar-none">
                  {stories.map((story) => (
                    <button 
                      key={story.id} 
                      onClick={() => setActiveStory(story.isUser ? { ...story, avatar: me.profile_picture_url, username: me.username } : story)}
                      className="flex flex-col items-center flex-shrink-0 focus:outline-none cursor-pointer group"
                    >
                      <div className="w-[62px] h-[62px] rounded-full p-[1.5px] bg-gradient-to-tr from-accent-cyan via-accent-blue to-accent-coral transition-transform duration-200 group-hover:scale-[1.03]">
                        <div className="w-full h-full bg-premium-card rounded-full p-[1.5px]">
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
                      <span className="text-[10px] text-premium-muted font-semibold mt-2 truncate max-w-[60px]">
                        {story.isUser ? "Your Story" : story.username}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Feed Items */}
                <div className="space-y-6">
                  {posts.map((post) => (
                    <article 
                      key={post.id} 
                      className="bg-premium-card border border-premium-border rounded-3xl overflow-hidden flex flex-col transition-all duration-300"
                    >
                      
                      {/* Post Header */}
                      <div className="flex items-center justify-between p-4 border-b border-premium-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-[36px] h-[36px] rounded-full p-[1.5px] bg-premium-gray">
                            <img 
                              src={post.userAvatar} 
                              alt="user avatar" 
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-premium-text cursor-pointer hover:text-accent-cyan transition-colors">
                              {post.username}
                            </span>
                            <span className="text-[9px] text-premium-muted font-medium">Suggested post</span>
                          </div>
                        </div>
                        <button className="text-premium-muted hover:text-premium-text transition-colors cursor-pointer">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Content Media */}
                      <div 
                        className="relative aspect-square bg-premium-bg select-none cursor-pointer overflow-hidden flex items-center justify-center"
                        onDoubleClick={() => handleDoubleTap(post.id)}
                      >
                        <img 
                          src={post.image} 
                          alt="Post media" 
                          className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-700"
                        />
                        {/* Heart Pop */}
                        {likeAnimationId === post.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 animate-fade-in z-10">
                            <Heart className="w-20 h-20 text-accent-coral fill-accent-coral animate-heart-beat drop-shadow-xl" />
                          </div>
                        )}
                      </div>

                      {/* Actions Panel */}
                      <div className="p-5 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={(e) => handleLike(post.id, e)}
                              className={`focus:outline-none cursor-pointer transition-colors ${post.hasLiked ? "text-accent-coral" : "text-premium-text hover:text-premium-muted"}`}
                            >
                              <Heart className={`w-6 h-6 ${post.hasLiked ? "fill-current" : ""}`} />
                            </button>
                            <button className="text-premium-text hover:text-premium-muted focus:outline-none cursor-pointer">
                              <MessageCircle className="w-6 h-6" />
                            </button>
                            <button className="text-premium-text hover:text-premium-muted focus:outline-none cursor-pointer">
                              <Send className="w-6 h-6" />
                            </button>
                          </div>
                          <button 
                            onClick={(e) => handleSave(post.id, e)}
                            className={`focus:outline-none cursor-pointer transition-colors ${post.hasSaved ? "text-accent-cyan" : "text-premium-text hover:text-premium-muted"}`}
                          >
                            <Bookmark className={`w-6 h-6 ${post.hasSaved ? "fill-current" : ""}`} />
                          </button>
                        </div>

                        {/* Likes Count */}
                        <div className="font-bold text-xs text-premium-text">
                          {post.likes.toLocaleString()} likes
                        </div>

                        {/* Caption */}
                        <div className="text-xs text-premium-text leading-relaxed">
                          <span className="font-bold mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                            {post.username}
                          </span>
                          {post.caption}
                        </div>

                        {/* Comments */}
                        {post.comments.length > 0 && (
                          <div className="space-y-1.5 pt-1.5 border-t border-premium-border/30">
                            {post.comments.map((comment, index) => (
                              <div key={index} className="text-xs flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-premium-text mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                                    {comment.username}
                                  </span>
                                  <span className="text-premium-text/90">{comment.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-[9px] text-premium-muted font-bold uppercase tracking-wider pt-1">
                          {post.time} ago
                        </div>

                        {/* Comment Input */}
                        <form 
                          onSubmit={(e) => handleCommentSubmit(e, post.id)}
                          className="flex items-center gap-3 pt-3 border-t border-premium-border/50 mt-3"
                        >
                          <input 
                            type="text" 
                            placeholder="Add a comment..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            className="flex-1 bg-transparent text-xs focus:outline-none text-premium-text placeholder-premium-muted/50"
                          />
                          <button 
                            type="submit"
                            disabled={!commentInputs[post.id]?.trim()}
                            className="font-bold text-xs text-accent-cyan disabled:opacity-30 hover:text-accent-cyan/80 transition-colors focus:outline-none cursor-pointer"
                          >
                            Post
                          </button>
                        </form>
                      </div>

                    </article>
                  ))}
                </div>
              </section>

              {/* Right Sidebar Suggestions */}
              <aside ref={suggestionsRef} className="w-[320px] shrink-0 hidden lg:block sticky top-8 self-start pl-8 space-y-6">
                
                {/* User Info Profile Box */}
                <div className="bg-premium-card border border-premium-border rounded-3xl p-5 flex items-center justify-between">
                  <div 
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-[50px] h-[50px] rounded-full p-[1.5px] bg-premium-gray overflow-hidden">
                      {meLoading ? (
                        <div className="w-full h-full rounded-full bg-premium-gray animate-pulse" />
                      ) : (
                        <AvatarImg
                          src={me.profile_picture_url}
                          alt={me.username || "user"}
                          className="w-full h-full object-cover rounded-full"
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-premium-text group-hover:text-accent-cyan transition-colors">
                        {meLoading ? (
                          <span className="inline-block w-20 h-3 bg-premium-gray animate-pulse rounded" />
                        ) : (
                          me.username || "—"
                        )}
                      </span>
                      <span className="text-[10px] text-premium-muted mt-0.5">
                        {meLoading ? (
                          <span className="inline-block w-24 h-2.5 bg-premium-gray animate-pulse rounded" />
                        ) : (
                          me.display_name || "Instaclone Member"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Suggestions Card */}
                <div className="bg-premium-card border border-premium-border rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-premium-muted">Suggestions for you</span>
                    <button className="text-[10px] font-bold text-premium-text hover:text-accent-cyan transition-colors cursor-pointer">See All</button>
                  </div>

                  <div className="space-y-4">
                    {suggestions.map((sug) => (
                      <div key={sug.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={sug.avatar} 
                            alt={sug.username} 
                            className="w-8 h-8 rounded-full object-cover bg-premium-gray"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-premium-text cursor-pointer hover:text-accent-cyan transition-colors">
                              {sug.username}
                            </span>
                            <span className="text-[9px] text-premium-muted truncate max-w-[120px]">
                              {sug.relation}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleFollowSuggestion(sug.id)}
                          className={`text-[10px] font-bold transition-colors focus:outline-none cursor-pointer ${sug.followed ? "text-premium-muted hover:text-premium-text" : "text-accent-cyan hover:text-accent-cyan/80"}`}
                        >
                          {sug.followed ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <footer className="text-[10px] text-premium-muted/50 leading-relaxed font-medium px-2">
                  <p className="uppercase tracking-wider text-[8px] font-bold text-premium-muted/40">&copy; {new Date().getFullYear()} INSTACLONE &bull; PREMIUM EXPERIENCE</p>
                </footer>
              </aside>

            </main>
          ) : activeView === "profile" ? (
            <div className="w-full mt-12 md:mt-0">
              <ProfilePage posts={posts} token={token} />
            </div>
          ) : activeView === "search" ? (
            <div className="w-full mt-12 md:mt-0">
              <SearchPage token={token} />
            </div>
          ) : activeView === "settings" ? (
            <div className="w-full mt-12 md:mt-0">
              <SettingsPage token={token} />
            </div>
          ) : activeView === "notifications" ? (
            <div className="w-full mt-12 md:mt-0">
              <NotificationsPage token={token} />
            </div>
          ) : activeView === "chats" ? (
            <div className="w-full mt-12 md:mt-0">
              <ChatsPage 
                token={token} 
                globalSocketRef={globalSocketRef} 
                globalWsStatus={globalWsStatus} 
                globalRetryWs={globalRetryWs} 
                unreadCounts={unreadCounts}
                clearUnread={clearUnread}
                incrementUnread={incrementUnread}
              />
            </div>
          ) : (
            <div className="w-full mt-12 md:mt-0">
              <RequestsPage token={token} />
            </div>
          )}
        </div>

      </div>

      {/* Story Modal Viewer */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${storyProgress}%` }}
            />
          </div>

          <button 
            onClick={() => setActiveStory(null)}
            className="absolute top-8 right-8 text-white/70 hover:text-white font-bold text-lg cursor-pointer"
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

      {/* Mobile Footer Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-premium-card border-t border-premium-border flex md:hidden items-center justify-around z-30 shadow-lg">
        <button 
          onClick={() => navigate("/")}
          className={`cursor-pointer ${activeView === "feed" ? "text-accent-cyan" : "text-premium-muted"}`}
        >
          <Home className="w-5 h-5" />
        </button>
        <button 
          onClick={() => navigate("/search")}
          className={`cursor-pointer ${activeView === "search" ? "text-accent-cyan" : "text-premium-muted"}`}
        >
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={() => navigate("/profile")}
          className={`cursor-pointer ${activeView === "profile" ? "text-accent-cyan" : "text-premium-muted"}`}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>

    </div>
  );
}
