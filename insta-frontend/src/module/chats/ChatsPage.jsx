import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Search, PlusCircle, Loader2, ArrowLeft, WifiOff, RefreshCw, X } from "lucide-react";
import { CHAT_API_BASE_URL, CHAT_WS_URL, USER_API_BASE_URL } from "../../config";

// ─── Avatar helper ─────────────────────────────────────────────────────────────
const Avatar = ({ url, name, size = "md" }) => {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const letter = (name || "?")[0].toUpperCase();
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {letter}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ChatsPage({ token }) {
  // ─── My Identity ──────────────────────────────────────────────────────────
  const [myUserId, setMyUserId] = useState(null);       // UUID from /user-profile (full)
  const [myUsername, setMyUsername] = useState("");

  // ─── Conversations ────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // ─── Active Conversation ──────────────────────────────────────────────────
  const [activeConvId, setActiveConvId] = useState(null);
  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  // ─── Messages ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);

  // ─── Unread tracking (per-conversation) ─────────────────────────────────
  // Stores conversation IDs that have received new messages since last viewed
  const [unreadConvIds, setUnreadConvIds] = useState(new Set());

  // ─── New Chat Modal ───────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [friendList, setFriendList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  // ─── WebSocket ────────────────────────────────────────────────────────────
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting | connected | offline
  const [wsAttempt, setWsAttempt] = useState(1);
  const socketRef = useRef(null);
  const attemptRef = useRef(1);
  const retryTimerRef = useRef(null);
  const mountTimerRef = useRef(null);
  const activeConvIdRef = useRef(null);
  const myUserIdRef = useRef(null);

  // keep refs in sync
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);

  // ─── 1. Fetch my user_id via full profile endpoint ────────────────────────
  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        // GET /user-profile returns UserProfileResponse which includes user_id
        const res = await fetch(`${USER_API_BASE_URL}/user-profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.data) {
            setMyUserId(d.data.user_id);
            setMyUsername(d.data.username);
          }
        }
      } catch (err) {
        console.error("Failed to fetch own profile:", err);
      }
    };
    run();
  }, [token]);

  // ─── 2. Fetch conversations ───────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch(`${CHAT_API_BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.data)) setConversations(d.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ─── 3. Fetch messages when active conv changes ───────────────────────────
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const run = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`${CHAT_API_BASE_URL}/conversations/${activeConvId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success && Array.isArray(d.data)) setMessages(d.data);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };
    run();
  }, [activeConvId, token]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── 4. WebSocket ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let isConnected = false;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        isConnected = true;
        attemptRef.current = 1;
        setWsAttempt(1);
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event_type === "chat.message") {
            const msg = payload.data;
            // Append message to current conversation if visible
            if (msg.conversation_id === activeConvIdRef.current) {
              setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            } else {
              // Mark this conversation as having unread messages
              setUnreadConvIds(prev => new Set([...prev, msg.conversation_id]));
              // Notify the global nav bar
              window.dispatchEvent(new CustomEvent("chat:unread"));
            }
            // Bump conversation to top of list
            setConversations(prev =>
              prev.map(c => c.id === msg.conversation_id ? { ...c, updated_at: new Date().toISOString() } : c)
            );
          }
        } catch (e) { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        if (destroyed) return;
        if (ws !== socketRef.current) return;
        if (isConnected) {
          isConnected = false;
          setWsStatus("connecting");
          attemptRef.current = 1;
          retryTimerRef.current = setTimeout(connect, 3000);
        } else {
          if (attemptRef.current < 5) {
            attemptRef.current += 1;
            setWsAttempt(attemptRef.current);
            retryTimerRef.current = setTimeout(connect, 3000);
          } else {
            setWsStatus("offline");
          }
        }
      };

      ws.onerror = () => { /* onclose will handle */ };
    };

    mountTimerRef.current = setTimeout(connect, 150);

    return () => {
      destroyed = true;
      clearTimeout(mountTimerRef.current);
      clearTimeout(retryTimerRef.current);
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token]);

  const retryWs = () => {
    clearTimeout(retryTimerRef.current);
    attemptRef.current = 1;
    setWsAttempt(1);
    setWsStatus("connecting");
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    mountTimerRef.current = setTimeout(() => {
      const ws = new WebSocket(`${CHAT_WS_URL}?token=${token}`);
      socketRef.current = ws;
      ws.onopen = () => { setWsStatus("connected"); };
      ws.onclose = () => { setWsStatus("offline"); };
    }, 150);
  };

  // ─── 6. Send a message ────────────────────────────────────────────────────
  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      event_type: "chat.message",
      data: { conversation_id: activeConvId, content: messageText.trim() }
    }));
    // Optimistic local insert
    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      conversation_id: activeConvId,
      sender_id: myUserId,
      message_type: "TEXT",
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
    setMessageText("");
  };

  // ─── 7. Open new chat modal ───────────────────────────────────────────────
  const openModal = async () => {
    setShowModal(true);
    setFriendSearch("");
    setLoadingFriends(true);
    try {
      const [followResp, followersResp] = await Promise.all([
        fetch(`${USER_API_BASE_URL}/user-profile/me/following`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${USER_API_BASE_URL}/user-profile/me/followers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const followData = followResp.ok ? await followResp.json() : { data: [] };
      const followerData = followersResp.ok ? await followersResp.json() : { data: [] };
      const merged = new Map();
      (followerData.data || []).forEach(u => merged.set(u.user_id, u));
      (followData.data || []).forEach(u => merged.set(u.user_id, u));
      merged.delete(myUserId); // never show self
      setFriendList(Array.from(merged.values()));
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // ─── 8. Start / open a conversation ──────────────────────────────────────
  const startConversation = async (friendUserId) => {
    try {
      const res = await fetch(`${CHAT_API_BASE_URL}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_two_id: friendUserId }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.data) {
          const conv = d.data;
          setConversations(prev => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
          setActiveConvId(conv.id);
          setShowModal(false);
        }
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  const filteredFriends = friendList.filter(f =>
    (f.username?.toLowerCase() || "").includes(friendSearch.toLowerCase()) ||
    (f.display_name?.toLowerCase() || "").includes(friendSearch.toLowerCase())
  );

  // Partner data comes pre-enriched from the chat-server via gRPC — no extra HTTP calls needed
  const getPartner = (conv) => {
    if (!conv) return null;
    return {
      id: conv.partner_id,
      username: conv.partner_username,
      display_name: conv.partner_display_name,
      profile_picture_url: conv.partner_profile_picture,
    };
  };

  const activePartner = activeConv ? getPartner(activeConv) : null;

  // ─── Connection screens ───────────────────────────────────────────────────
  if (wsStatus === "connecting") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <p className="font-semibold text-slate-700">Connecting to chat server...</p>
        <p className="text-xs text-slate-400">Attempt {wsAttempt} of 5</p>
      </div>
    );
  }

  if (wsStatus === "offline") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">Chat Server Offline</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">Unable to connect after 5 attempts. Make sure the chat service is running.</p>
        </div>
        <button onClick={retryWs} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  // ─── Main Layout ──────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-60px)] md:h-screen flex bg-white overflow-hidden">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <div className={`
        w-full md:w-[340px] flex-shrink-0 flex flex-col border-r border-slate-100
        ${activeConvId ? "hidden md:flex" : "flex"}
      `}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <span className="font-bold text-slate-800 text-base">{myUsername || "Messages"}</span>
          <button
            onClick={openModal}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 hover:text-blue-500 transition-all"
            title="New conversation"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">No conversations yet.</p>
              <button onClick={openModal} className="text-sm font-semibold text-blue-500 hover:underline">
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map(conv => {
              const partner = getPartner(conv);
              const isActive = conv.id === activeConvId;
              const hasUnread = !isActive && unreadConvIds.has(conv.id);
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    // Clear unread dot when user opens this conversation
                    setUnreadConvIds(prev => {
                      const next = new Set(prev);
                      next.delete(conv.id);
                      return next;
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${isActive ? "bg-blue-50" : ""}`}
                >
                  <Avatar url={partner?.profile_picture_url} name={partner?.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${hasUnread ? "font-bold text-slate-900" : isActive ? "font-bold text-blue-600" : "font-semibold text-slate-800"}`}>
                      {partner?.username || "Loading..."}
                    </p>
                    <p className={`text-xs truncate ${hasUnread ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                      {hasUnread ? "New message" : (partner?.display_name || "")}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── CHAT PANEL ────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConvId ? "hidden md:flex" : "flex"}`}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-100 bg-white flex-shrink-0">
              <button onClick={() => setActiveConvId(null)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar url={activePartner?.profile_picture_url} name={activePartner?.username} size="sm" />
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-800 truncate">{activePartner?.username || "..."}</p>
                <p className="text-xs text-slate-400 truncate">{activePartner?.display_name || ""}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <p className="text-sm text-slate-400">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === myUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`
                        max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm
                        ${isMe
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
                        }
                      `}>
                        <p>{msg.content}</p>
                        <span className={`text-[10px] block mt-1 ${isMe ? "text-blue-200 text-right" : "text-slate-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="p-3 flex items-center gap-2 border-t border-slate-100 bg-white flex-shrink-0">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          // Empty state (desktop)
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">Your Messages</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">Select a conversation or start a new one with someone you follow.</p>
            </div>
            <button onClick={openModal} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all">
              New Message
            </button>
          </div>
        )}
      </div>

      {/* ── NEW CHAT MODAL ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">New Message</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  placeholder="Search people you follow..."
                  className="bg-transparent text-sm text-slate-800 placeholder-slate-400 w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto">
              {loadingFriends ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400 px-4">
                  {friendSearch ? `No results for "${friendSearch}"` : "No friends found. Follow someone first!"}
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <button
                    key={friend.user_id}
                    onClick={() => startConversation(friend.user_id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Avatar url={friend.profile_picture_url} name={friend.username} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{friend.username}</p>
                      <p className="text-xs text-slate-400 truncate">{friend.display_name || ""}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
