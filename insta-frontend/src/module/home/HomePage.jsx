import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Search, MessageCircle, Heart, PlusSquare, User, LogOut,
  Bookmark, Send, MoreHorizontal, Smile, Settings, UserCheck, Plus, Trash2
} from "lucide-react";
import ProfilePage from "../profile/ProfilePage";
import SearchPage from "../search/SearchPage";
import SettingsPage from "../settings/SettingsPage";
import RequestsPage from "../requests/RequestsPage";
import NotificationsPage from "../notifications/NotificationsPage";
import ChatsPage from "../chats/ChatsPage";
import CreatePostModal from "../post/CreatePostModal";
import CreateStoryModal from "../post/CreateStoryModal";
import HLSVideoPlayer from "../post/HLSVideoPlayer";
import { USER_API_BASE_URL, POST_API_BASE_URL, CHAT_WS_URL } from "../../config";
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
  const [me, setMe] = useState({ user_id: "", username: "", display_name: "", profile_picture_url: "" });
  const [meLoading, setMeLoading] = useState(!!token);

  const sidebarRef = useRef(null);
  const feedRef = useRef(null);
  const suggestionsRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const activeView = location.pathname === "/profile" ? "profile" : location.pathname === "/search" ? "search" : location.pathname === "/settings" ? "settings" : location.pathname === "/requests" ? "requests" : location.pathname === "/notifications" ? "notifications" : location.pathname === "/chats" ? "chats" : "feed";
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const activeViewRef = useRef(activeView);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [
      {
        id: newPost.id || Date.now(),
        username: me.username || newPost.username || "current_user",
        userAvatar: me.profile_picture_url || newPost.userAvatar || "",
        image: newPost.image || (newPost.images && newPost.images[0]) || "",
        caption: newPost.caption || "",
        likes: 0,
        hasLiked: false,
        hasSaved: false,
        comments: [],
        time: "Just now"
      },
      ...prev
    ]);
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === updatedPost.id ? { ...post, ...updatedPost } : post))
    );
  };

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

  const BATCH_SIZE = 10;
  const MAX_WINDOW_SIZE = 20;

  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const observerTargetRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchFeedPostsBatch = async (currentOffset = 0) => {
    if (!token || isFetchingMore || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetchingMore(true);
    setServerError(false);
    setRetryCount(0);

    const tryFetch = async (attempt) => {
      try {
        const res = await fetch(`${POST_API_BASE_URL}/posts?limit=${BATCH_SIZE}&offset=${currentOffset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const newPostsRaw = json.data;

            if (newPostsRaw.length < BATCH_SIZE) {
              setHasMore(false);
            }

            const mapped = newPostsRaw.map((p) => ({
              id: p.id,
              username: me.username || "user",
              userAvatar: me.profile_picture_url || "",
              image: p.media?.[0]?.url || "",
              hls_url: p.media?.[0]?.hls_url || null,
              mediaType: p.media?.[0]?.media_type || "IMAGE",
              images: p.media?.map((m) => m.url) || [],
              caption: p.caption || "",
              location: p.location || "",
              visibility: p.visibility,
              commentsEnabled: p.comments_enabled,
              likes: p.likes || 0,
              hasLiked: p.hasLiked || false,
              hasSaved: false,
              comments: p.comments || [],
              time: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Just now"
            }));

            setPosts((prevPosts) => {
              if (currentOffset === 0) return mapped;
              const combined = [...prevPosts, ...mapped];
              // Sliding Window: keep maximum 20 posts in active DOM memory
              return combined.length > MAX_WINDOW_SIZE
                ? combined.slice(combined.length - MAX_WINDOW_SIZE)
                : combined;
            });

            setOffset(currentOffset + newPostsRaw.length);
            setRetryCount(0);
            isFetchingRef.current = false;
            setIsFetchingMore(false);
            return true;
          }
        }
        throw new Error("Failed to load response");
      } catch (err) {
        console.warn(`Attempt ${attempt} failed to fetch feed posts:`, err);
        if (attempt < 3) {
          setRetryCount(attempt);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return await tryFetch(attempt + 1);
        } else {
          setRetryCount(3);
          setServerError(true);
          isFetchingRef.current = false;
          setIsFetchingMore(false);
          return false;
        }
      }
    };

    await tryFetch(1);
  };

  // Initial fetch on mount or auth change
  useEffect(() => {
    if (!token) return;
    setOffset(0);
    setHasMore(true);
    fetchFeedPostsBatch(0);
  }, [token]);

  // Infinite scroll IntersectionObserver listener
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasMore || serverError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore && hasMore && !serverError) {
          fetchFeedPostsBatch(offset);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [observerTargetRef, offset, isFetchingMore, hasMore, serverError]);

  const [storiesFeed, setStoriesFeed] = useState([]);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  const fetchStoriesFeed = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${POST_API_BASE_URL}/stories/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStoriesFeed(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch stories feed:", err);
    }
  };

  useEffect(() => {
    fetchStoriesFeed();
  }, [token]);

  const [suggestions, setSuggestions] = useState([
    { id: 1, username: "pixel_artist", relation: "Suggested for you", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 2, username: "lens_explorer", relation: "Followed by chef_master", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 3, username: "wanderer_99", relation: "New to Instagram", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80", followed: false }
  ]);

  const [commentInputs, setCommentInputs] = useState({});
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

    ws.onerror = () => { };
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

  const handleDeleteStory = async (storyId) => {
    if (!token || !storyId) return;
    try {
      const res = await fetch(`${POST_API_BASE_URL}/stories/${storyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchStoriesFeed();
        if (activeStoryGroup && activeStoryGroup.stories.length > 1) {
          const updatedStories = activeStoryGroup.stories.filter((s) => s.id !== storyId);
          setActiveStoryGroup({ ...activeStoryGroup, stories: updatedStories });
          setActiveStoryIndex((idx) => (idx >= updatedStories.length ? Math.max(0, updatedStories.length - 1) : idx));
        } else {
          setActiveStoryGroup(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  // Story progress timer for activeStoryGroup
  useEffect(() => {
    if (!activeStoryGroup || !activeStoryGroup.stories || activeStoryGroup.stories.length === 0) return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
            setActiveStoryIndex((idx) => idx + 1);
            return 0;
          } else {
            clearInterval(interval);
            setActiveStoryGroup(null);
            return 0;
          }
        }
        return prev + 2.5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryGroup, activeStoryIndex]);

  const handleLike = async (postId, e) => {
    if (!token) return;
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

    try {
      await fetch(`${POST_API_BASE_URL}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Error calling like endpoint:", err);
    }
  };

  const handleDoubleTap = async (postId) => {
    if (!token) return;
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

    try {
      await fetch(`${POST_API_BASE_URL}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Error calling double tap like endpoint:", err);
    }
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

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    if (!token) return;

    try {
      const res = await fetch(`${POST_API_BASE_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
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
        }
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }

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
                onClick={() => { setIsCreateModalOpen(true); setIsMoreOpen(false); }}
                className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group cursor-pointer text-premium-muted hover:bg-premium-gray/30 hover:text-premium-text"
              >
                <PlusSquare className="w-5 h-5 shrink-0 group-hover:scale-[1.03] transition-transform text-accent-cyan" />
                <span className="text-sm font-semibold hidden xl:inline">Create</span>
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
                  {/* Your Story Button */}
                  {(() => {
                    const myStoryGroup = storiesFeed.find((g) => g.is_user);
                    const hasMyStory = myStoryGroup && myStoryGroup.stories.length > 0;
                    return (
                      <div className="flex flex-col items-center flex-shrink-0 group">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (hasMyStory) {
                                setActiveStoryGroup(myStoryGroup);
                                setActiveStoryIndex(0);
                              } else {
                                setIsCreateStoryModalOpen(true);
                              }
                            }}
                            className={`w-[62px] h-[62px] rounded-full p-[1.5px] cursor-pointer transition-transform group-hover:scale-[1.03] ${hasMyStory ? "bg-gradient-to-tr from-accent-cyan via-accent-blue to-accent-coral" : "bg-premium-border"}`}
                          >
                            <div className="w-full h-full bg-premium-card rounded-full p-[1.5px]">
                              <AvatarImg
                                src={me.profile_picture_url}
                                alt={me.username || "you"}
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                          </button>

                          {/* Plus Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCreateStoryModalOpen(true);
                            }}
                            className="absolute bottom-0 right-0 w-5 h-5 bg-accent-cyan hover:bg-accent-cyan/90 text-white rounded-full flex items-center justify-center border-2 border-premium-card shadow-sm transition-transform hover:scale-110 cursor-pointer"
                            title="Add Story"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                        <span className="text-[10px] text-premium-muted font-semibold mt-2 truncate max-w-[60px]">
                          Your Story
                        </span>
                      </div>
                    );
                  })()}

                  {/* Followed Users Stories */}
                  {storiesFeed
                    .filter((g) => !g.is_user && g.stories.length > 0)
                    .map((group) => (
                      <button
                        key={group.user_id}
                        onClick={() => {
                          setActiveStoryGroup(group);
                          setActiveStoryIndex(0);
                        }}
                        className="flex flex-col items-center flex-shrink-0 focus:outline-none cursor-pointer group"
                      >
                        <div className="w-[62px] h-[62px] rounded-full p-[1.5px] bg-gradient-to-tr from-accent-cyan via-accent-blue to-accent-coral transition-transform duration-200 group-hover:scale-[1.03]">
                          <div className="w-full h-full bg-premium-card rounded-full p-[1.5px]">
                            <AvatarImg
                              src={group.user_avatar}
                              alt={group.username}
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-premium-muted font-semibold mt-2 truncate max-w-[65px]">
                          {group.username}
                        </span>
                      </button>
                    ))}
                </div>

                {/* Feed Items */}
                <div className="space-y-6">
                  {serverError && posts.length === 0 && (
                    <div className="text-center py-12 bg-premium-card border border-premium-border rounded-3xl space-y-3">
                      <p className="text-sm font-bold text-accent-coral font-display">Unable to connect to server 🔌</p>
                      <p className="text-xs text-premium-muted">Please check your network connection or try again later.</p>
                      <button 
                        onClick={() => { setOffset(0); setHasMore(true); fetchFeedPostsBatch(0); }} 
                        className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan hover:text-accent-cyan/80 bg-accent-cyan/10 px-4 py-2 rounded-2xl border border-accent-cyan/20 transition-all active:scale-95 cursor-pointer"
                      >
                        Retry Connection
                      </button>
                    </div>
                  )}

                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className="bg-premium-card border border-premium-border rounded-3xl overflow-hidden flex flex-col transition-all duration-300"
                    >

                      {/* Post Header */}
                      <div className="flex items-center justify-between p-4 border-b border-premium-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-[36px] h-[36px] rounded-full p-[1.5px] bg-premium-gray">
                            <AvatarImg
                              src={post.userAvatar}
                              alt={post.username}
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
                      </div>

                      {/* Content Media */}
                      <div
                        className="relative aspect-square bg-premium-bg select-none cursor-pointer overflow-hidden flex items-center justify-center"
                        onDoubleClick={() => handleDoubleTap(post.id)}
                      >
                        {post.mediaType === "VIDEO" ? (
                          <HLSVideoPlayer
                            src={post.hls_url || post.image}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={post.image}
                            alt="Post media"
                            className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-700"
                          />
                        )}
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

                        {/* Hero Highlighted Caption Block */}
                        {post.caption && (
                          <div className="p-3.5 rounded-2xl bg-premium-card/90 border border-premium-border/60 shadow-sm space-y-1 my-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/20 uppercase tracking-wider">
                                Caption
                              </span>
                            </div>
                            <p className="text-[13px] text-premium-text font-medium leading-relaxed select-text">
                              {post.caption}
                            </p>
                          </div>
                        )}

                        {/* Comments */}
                        {/* Comments */}
                        <div className="space-y-2 pt-2 border-t border-premium-border/30">
                          <span className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Comments</span>
                          {post.comments && post.comments.filter(c => !c.parent_comment_id).length > 0 ? (
                            post.comments.filter(c => !c.parent_comment_id).map((comment, index) => (
                              <div key={index} className="text-xs flex items-center justify-between bg-premium-bg/50 border border-premium-border/30 rounded-xl px-3 py-2">
                                <div>
                                  <span className="font-bold text-premium-text text-[11px] mr-1.5 hover:text-accent-cyan cursor-pointer transition-colors">
                                    {comment.username}
                                  </span>
                                  <span className="text-premium-text/80 text-[11px]">{comment.text}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 bg-premium-card/40 border border-premium-border/20 rounded-xl">
                              <p className="text-[11px] font-bold text-premium-text">No comments yet.</p>
                              <p className="text-[9px] text-premium-muted font-medium">Start the conversation.</p>
                            </div>
                          )}
                        </div>

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

                  {/* IntersectionObserver Sentinel & Feed End Indicators */}
                  <div ref={observerTargetRef} className="py-6 flex flex-col items-center justify-center gap-2 min-h-[60px]">
                    {isFetchingMore && (
                      <div className="flex items-center gap-2 text-xs text-premium-muted font-medium animate-pulse">
                        <div className="w-4 h-4 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin" />
                        <span>{retryCount > 0 ? `Connecting to server (Attempt ${retryCount}/3)...` : "Fetching more posts..."}</span>
                      </div>
                    )}

                    {!hasMore && !serverError && (
                      <div className="text-center py-4 space-y-1">
                        <p className="text-xs font-bold text-premium-text font-display">You're all caught up! ✨</p>
                        <p className="text-[10px] text-premium-muted">You've seen all the latest posts for now.</p>
                      </div>
                    )}
                  </div>
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
              <ProfilePage posts={posts} token={token} me={me} onPostDeleted={handlePostDeleted} onPostUpdated={handlePostUpdated} />
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
      {activeStoryGroup && activeStoryGroup.stories?.[activeStoryIndex] && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          {/* Progress bars for story group */}
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-20">
            {activeStoryGroup.stories.map((st, idx) => (
              <div key={st.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width: idx < activeStoryIndex ? "100%" : idx === activeStoryIndex ? `${storyProgress}%` : "0%"
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveStoryGroup(null)}
            className="absolute top-8 right-8 text-white/80 hover:text-white font-bold text-xl cursor-pointer z-30"
          >
            ✕
          </button>

          <div className="max-w-md w-full aspect-[9/16] relative flex items-center justify-center p-4">
            {/* Header info */}
            <div className="absolute top-8 left-6 right-6 flex items-center justify-between text-white z-20">
              <div className="flex items-center gap-3">
                <AvatarImg
                  src={activeStoryGroup.user_avatar}
                  alt={activeStoryGroup.username}
                  className="w-8 h-8 rounded-full border border-white/40 object-cover"
                />
                <span className="font-bold text-sm drop-shadow-md">
                  {activeStoryGroup.is_user ? "Your Story" : activeStoryGroup.username}
                </span>
              </div>

              {activeStoryGroup.is_user && (
                <button
                  type="button"
                  onClick={() => handleDeleteStory(activeStoryGroup.stories[activeStoryIndex]?.id)}
                  className="p-2 rounded-full bg-black/40 hover:bg-rose-600/80 text-white/90 hover:text-white transition-all backdrop-blur-md cursor-pointer border border-white/20"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Image display */}
            <img
              src={activeStoryGroup.stories[activeStoryIndex].media_url}
              alt="Story asset"
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />

            {/* Story Caption */}
            {activeStoryGroup.stories[activeStoryIndex].caption && (
              <div className="absolute bottom-8 left-6 right-6 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 text-white text-xs font-semibold text-center drop-shadow-lg z-20">
                {activeStoryGroup.stories[activeStoryIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
        token={token}
        onStoryCreated={() => fetchStoriesFeed()}
      />

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
          onClick={() => setIsCreateModalOpen(true)}
          className="cursor-pointer text-premium-muted hover:text-accent-cyan transition-colors"
          title="Create post"
        >
          <PlusSquare className="w-5 h-5 text-accent-cyan" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className={`cursor-pointer ${activeView === "profile" ? "text-accent-cyan" : "text-premium-muted"}`}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>

      {/* Create Post Modal */}
      <CreatePostModal
        token={token}
        user={me}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

    </div>
  );
}
