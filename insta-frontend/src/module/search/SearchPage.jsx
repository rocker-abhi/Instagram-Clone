import React, { useState, useEffect } from "react";
import { Search, User, Loader2, X, AlertCircle } from "lucide-react";
import { USER_API_BASE_URL } from "../../config";

export default function SearchPage({ token }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Debounced search logic
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
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, token]);

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

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 bg-white rounded-3xl border border-[#efefef] shadow-[0_10px_30px_rgba(0,0,0,0.02)] mt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#efefef]">
        <Search className="w-6 h-6 text-slate-500" />
        <h2 className="text-xl font-bold text-[#262626]">Search Users</h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List */}
      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No users found matching "{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((user) => (
            <div
              key={user.user_id}
              onClick={() => setSelectedUser(user)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 shrink-0">
                  <AvatarImg
                    src={user.profile_picture_url}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-[#262626]">{user.username}</span>
                  <span className="text-xs text-slate-400">{user.display_name}</span>
                </div>
              </div>
              <div className="text-xs text-purple-600 font-semibold px-3 py-1 bg-purple-50 rounded-full">
                View Profile
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Profile Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[420px] p-6 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Overview */}
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 shadow-md mb-4 bg-gradient-to-tr from-purple-100 to-pink-100 flex items-center justify-center">
                <AvatarImg
                  src={selectedUser.profile_picture_url}
                  alt={selectedUser.username}
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="text-lg font-bold text-[#262626]">@{selectedUser.username}</h3>
              <p className="text-sm font-semibold text-slate-400 mb-4">{selectedUser.display_name}</p>

              {/* Bio Card */}
              {selectedUser.bio ? (
                <div className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-600 text-left border border-slate-100 mb-4 whitespace-pre-wrap">
                  {selectedUser.bio}
                </div>
              ) : (
                <p className="text-xs text-slate-300 italic mb-4">No bio available</p>
              )}

              {/* Action Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-3 bg-[#0095f6] hover:bg-[#00376b] text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
