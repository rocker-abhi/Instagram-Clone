import React, { useState, useEffect } from "react";
import { 
  Home, Search, Compass, MessageCircle, Heart, PlusSquare, User, LogOut, 
  Bookmark, Send, MoreHorizontal, Smile, Check, Globe, Grid, BookOpen
} from "lucide-react";

export default function HomePage({ onLogout }) {
  const [posts, setPosts] = useState([
    {
      id: 1,
      username: "travel_diaries",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      caption: "Chasing sunsets around the world 🌅✨ #wanderlust #beaches #sunset",
      likes: 1240,
      hasLiked: false,
      comments: [
        { username: "nature_lover", text: "This is breathtaking!" },
        { username: "alex_stories", text: "Adding to my bucket list ASAP!" }
      ],
      time: "2 hours ago"
    },
    {
      id: 2,
      username: "chef_master",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
      caption: "Freshly made artisanal salad for lunch today! Healthy & delicious 🥗💚 #healthyfood #chef",
      likes: 852,
      hasLiked: false,
      comments: [
        { username: "foodie_girl", text: "Recipe please! 😍" }
      ],
      time: "5 hours ago"
    },
    {
      id: 3,
      username: "tech_vision",
      userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      caption: "Designing the workspace of the future. Clean setups, high productivity 💻🔌 #desksetup #workspace",
      likes: 2195,
      hasLiked: false,
      comments: [
        { username: "code_hustler", text: "Minimalism at its best!" },
        { username: "gamer_guy", text: "What monitor arm is that?" }
      ],
      time: "1 day ago"
    }
  ]);

  const [stories] = useState([
    { id: 1, username: "your_story", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80", isUser: true },
    { id: 2, username: "travel_diaries", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 3, username: "chef_master", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 4, username: "tech_vision", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 5, username: "fitness_guru", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80" },
    { id: 6, username: "art_gallery", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80" }
  ]);

  const [suggestions] = useState([
    { id: 1, username: "pixel_artist", relation: "Suggested for you", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 2, username: "lens_explorer", relation: "Followed by chef_master", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80", followed: false },
    { id: 3, username: "wanderer_99", relation: "New to Instaclone", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80", followed: false }
  ]);

  const [commentInputs, setCommentInputs] = useState({});
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);

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

  return (
    <div className="min-h-screen bg-slate-50 w-full flex justify-center text-slate-900 font-sans">
      {/* 1. Left Sidebar - Sticky */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-slate-200 bg-white flex flex-col p-6 hidden md:flex z-30">
        {/* Logo */}
        <div className="mb-10 font-billabong text-3xl font-bold tracking-wider bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent cursor-default">
          Instaclone
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-50 text-slate-900 font-bold transition-all">
            <Home className="w-6 h-6 text-purple-600" />
            <span>Home</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <Search className="w-6 h-6" />
            <span>Search</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <Compass className="w-6 h-6" />
            <span>Explore</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <MessageCircle className="w-6 h-6" />
            <span>Messages</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <Heart className="w-6 h-6" />
            <span>Notifications</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <PlusSquare className="w-6 h-6" />
            <span>Create</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-semibold">
            <User className="w-6 h-6" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold"
          >
            <LogOut className="w-6 h-6" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Feed area */}
      <main className="flex-1 max-w-[935px] w-full md:pl-64 flex justify-between p-4 sm:p-6 lg:p-8">
        <section className="flex-1 max-w-[600px] w-full space-y-6">
          {/* Stories Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 overflow-x-auto scrollbar-none shadow-sm">
            {stories.map((story) => (
              <button 
                key={story.id} 
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center flex-shrink-0 group cursor-pointer focus:outline-none"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 p-0.5 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-white rounded-full p-0.5">
                    <img 
                      src={story.avatar} 
                      alt={story.username} 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500 mt-1.5 truncate max-w-[70px]">
                  {story.isUser ? "Your Story" : story.username}
                </span>
              </button>
            ))}
          </div>

          {/* Feed Posts */}
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Post Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full p-0.5 bg-slate-100">
                      <img 
                        src={post.userAvatar} 
                        alt={post.username} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 hover:underline cursor-pointer">
                        {post.username}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-semibold">{post.time}</span>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Image */}
                <div className="relative aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img 
                    src={post.image} 
                    alt="Post content" 
                    className="w-full h-full object-cover select-none"
                    onDoubleClick={() => handleLike(post.id)}
                  />
                </div>

                {/* Actions Panel */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className={`transition-transform duration-200 active:scale-125 ${post.hasLiked ? "text-red-500" : "text-slate-700 hover:text-slate-500"}`}
                      >
                        <Heart className={`w-7 h-7 ${post.hasLiked ? "fill-current" : ""}`} />
                      </button>
                      <button className="text-slate-700 hover:text-slate-500">
                        <MessageCircle className="w-7 h-7" />
                      </button>
                      <button className="text-slate-700 hover:text-slate-500">
                        <Send className="w-7 h-7" />
                      </button>
                    </div>
                    <button className="text-slate-700 hover:text-slate-500">
                      <Bookmark className="w-7 h-7" />
                    </button>
                  </div>

                  {/* Likes Count */}
                  <div className="font-bold text-sm text-slate-800">
                    {post.likes.toLocaleString()} likes
                  </div>

                  {/* Caption */}
                  <div className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 mr-2 cursor-pointer hover:underline">
                      {post.username}
                    </span>
                    {post.caption}
                  </div>

                  {/* Comments list */}
                  {post.comments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-50">
                      {post.comments.map((comment, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-bold text-slate-800 mr-2 hover:underline cursor-pointer">
                            {comment.username}
                          </span>
                          <span className="text-slate-600">{comment.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input form */}
                  <form 
                    onSubmit={(e) => handleCommentSubmit(e, post.id)}
                    className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2"
                  >
                    <Smile className="w-6 h-6 text-slate-400 cursor-pointer hover:text-slate-600" />
                    <input 
                      type="text" 
                      placeholder="Add a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      className="flex-1 bg-transparent text-sm focus:outline-none text-slate-900 placeholder-slate-400"
                    />
                    <button 
                      type="submit"
                      disabled={!commentInputs[post.id]?.trim()}
                      className="font-bold text-sm text-purple-600 disabled:opacity-30 hover:text-pink-600 transition-colors"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 3. Suggestions Sidebar - Sticky */}
        <aside className="w-72 pl-8 hidden lg:block sticky top-6 self-start">
          {/* User Profile Card */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500">
                <div className="w-full h-full bg-white rounded-full p-0.5">
                  <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" 
                    alt="Current user" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 block cursor-pointer hover:underline">
                  current_user
                </span>
                <span className="text-xs text-slate-400 font-semibold block">Instaclone Member</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors"
            >
              Switch
            </button>
          </div>

          {/* Suggestions Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">Suggested for you</span>
            <button className="text-xs font-bold text-slate-800 hover:text-slate-500">See All</button>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={sug.avatar} 
                    alt={sug.username} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-800 block cursor-pointer hover:underline">
                      {sug.username}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                      {sug.relation}
                    </span>
                  </div>
                </div>
                <button className="text-xs font-bold text-purple-600 hover:text-pink-600">
                  Follow
                </button>
              </div>
            ))}
          </div>

          {/* Suggestions Footer */}
          <footer className="mt-8 text-[11px] text-slate-400 space-y-4 leading-normal">
            <div className="flex flex-wrap gap-x-2.5 gap-y-1">
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
            </div>
            <div>&copy; {new Date().getFullYear()} INSTACLONE FROM ABHISHEK</div>
          </footer>
        </aside>
      </main>

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center animate-fade-in">
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${storyProgress}%` }}
            />
          </div>

          {/* Close button */}
          <button 
            onClick={() => setActiveStory(null)}
            className="absolute top-8 right-8 text-white/70 hover:text-white font-bold text-lg"
          >
            ✕
          </button>

          {/* Story Image container */}
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

      {/* Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex md:hidden items-center justify-around z-30 shadow-lg">
        <button className="text-purple-600">
          <Home className="w-6 h-6" />
        </button>
        <button className="text-slate-500">
          <Search className="w-6 h-6" />
        </button>
        <button className="text-slate-500">
          <PlusSquare className="w-6 h-6" />
        </button>
        <button className="text-slate-500">
          <Heart className="w-6 h-6" />
        </button>
        <button onClick={onLogout} className="text-red-500">
          <LogOut className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
