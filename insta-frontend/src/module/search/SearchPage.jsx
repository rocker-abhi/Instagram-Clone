import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, X, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

export default function SearchPage({ token }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `${USER_API_BASE_URL}/user-profile/search?query=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setResults(data.data);
          } else {
            setResults([]);
          }
        } else {
          setError("Failed to fetch search results.");
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("An error occurred while searching.");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, token]);

  const AvatarImg = ({ src, alt, className }) =>
    src ? (
      <img src={src} alt={alt} className={className} />
    ) : (
      <div className={`${className} bg-premium-gray flex items-center justify-center text-premium-text font-bold`}>
        {alt?.[0]?.toUpperCase() ?? "U"}
      </div>
    );

  return (
    <div ref={containerRef} className="w-full max-w-[600px] mx-auto px-6 py-8 bg-premium-card border border-premium-border rounded-3xl shadow-premium mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-premium-border/50">
        <Search className="w-5 h-5 text-accent-cyan" />
        <h2 className="text-lg font-bold font-display text-premium-text">Search Users</h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-premium-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username or name..."
          className="w-full pl-10 pr-10 py-3 bg-premium-bg border border-premium-border rounded-2xl text-premium-text placeholder-premium-muted/50 text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-premium-muted hover:text-premium-text focus:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-accent-coral/20 bg-accent-coral/10 text-accent-coral text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List */}
      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="text-center py-12 text-premium-muted text-xs font-semibold">
          No users found matching "{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((user) => (
            <div
              key={user.user_id}
              onClick={() => navigate(`/profile?username=${user.username}`)}
              className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-premium-gray/30 border border-transparent hover:border-premium-border cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-premium-border shrink-0 bg-premium-gray">
                  <AvatarImg
                    src={user.profile_picture_url}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-premium-text">{user.username}</span>
                  <span className="text-[10px] text-premium-muted mt-0.5">{user.display_name}</span>
                </div>
              </div>
              <div className="text-[10px] text-accent-cyan font-bold px-3.5 py-1.5 bg-premium-bg border border-premium-border rounded-xl">
                View Profile
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
