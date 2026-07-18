import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Search, PlusCircle, Loader2, ArrowLeft, WifiOff, RefreshCw, X, Trash2, Edit3, Check } from "lucide-react";
import { CHAT_API_BASE_URL, USER_API_BASE_URL } from "../../config";
import { gsap } from "gsap";

const Avatar = ({ url, name, size = "md" }) => {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const letter = (name || "?")[0].toUpperCase();
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-premium-gray flex items-center justify-center text-premium-text font-bold flex-shrink-0 border border-premium-border`}>
      {letter}
    </div>
  );
};

export default function ChatsPage({ token, globalSocketRef, globalWsStatus, globalRetryWs, unreadCounts = {}, clearUnread, incrementUnread }) {
  const [myUserId, setMyUserId] = useState(null);
  const [myUsername, setMyUsername] = useState("");

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const [activeConvId, setActiveConvId] = useState(null);
  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [friendList, setFriendList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  const [deletingMessage, setDeletingMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");

  const activeConvIdRef = useRef(null);
  const myUserIdRef = useRef(null);
  const chatPanelRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConvId && chatPanelRef.current) {
      gsap.fromTo(
        chatPanelRef.current,
        { opacity: 0, scale: 0.99, filter: "blur(2px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }
      );
    }
  }, [activeConvId]);

  useEffect(() => {
    const handleMessage = (e) => {
      const msg = e.detail;
      if (msg.conversation_id === activeConvIdRef.current) {
        setMessages(prev => {
          if (msg.sender_id === myUserIdRef.current) {
            const tempIndex = prev.findIndex(m => m.id && m.id.toString().startsWith("tmp-") && m.content === msg.content);
            if (tempIndex !== -1) {
              const next = [...prev];
              next[tempIndex] = msg;
              return next;
            }
          }
          return prev.some(m => m.id === msg.id) ? prev : [...prev, msg];
        });
      } else {
        if (incrementUnread) incrementUnread(msg.conversation_id);
      }
      setConversations(prev =>
        prev.map(c => c.id === msg.conversation_id ? { ...c, updated_at: new Date().toISOString() } : c)
      );
    };

    const handleDelete = (e) => {
      const { message_id, conversation_id } = e.detail;
      if (conversation_id === activeConvIdRef.current) {
        setMessages(prev => prev.filter(m => m.id && m.id.toString() !== message_id.toString()));
      }
    };

    const handleEdit = (e) => {
      const { message_id, conversation_id, content, is_edited } = e.detail;
      if (conversation_id === activeConvIdRef.current) {
        setMessages(prev => prev.map(m => m.id && m.id.toString() === message_id.toString() ? { ...m, content, is_edited } : m));
      }
    };

    const handlePresence = (e) => {
      const payload = e.detail;
      if (payload.event_type === "presence.online") {
        const { user_id } = payload.data;
        setConversations(prev =>
          prev.map(c => {
            const partnerId = c.user_one_id === myUserIdRef.current ? c.user_two_id : c.user_one_id;
            if (partnerId === user_id) {
              return { ...c, is_partner_online: true };
            }
            return c;
          })
        );
      } else if (payload.event_type === "presence.offline") {
        const { user_id } = payload.data;
        setConversations(prev =>
          prev.map(c => {
            const partnerId = c.user_one_id === myUserIdRef.current ? c.user_two_id : c.user_one_id;
            if (partnerId === user_id) {
              return { ...c, is_partner_online: false };
            }
            return c;
          })
        );
      }
    };

    window.addEventListener("global:chat:message", handleMessage);
    window.addEventListener("global:chat:delete", handleDelete);
    window.addEventListener("global:chat:edit", handleEdit);
    window.addEventListener("global:chat:presence", handlePresence);
    return () => {
      window.removeEventListener("global:chat:message", handleMessage);
      window.removeEventListener("global:chat:delete", handleDelete);
      window.removeEventListener("global:chat:edit", handleEdit);
      window.removeEventListener("global:chat:presence", handlePresence);
    };
  }, [incrementUnread]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId || !globalSocketRef?.current || globalSocketRef.current.readyState !== WebSocket.OPEN) return;
    globalSocketRef.current.send(JSON.stringify({
      event_type: "chat.message",
      data: { conversation_id: activeConvId, content: messageText.trim() }
    }));
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

  const handleRequestDelete = (msg) => {
    setDeletingMessage(msg);
  };

  const executeDelete = (deleteForEveryone) => {
    if (!deletingMessage || !globalSocketRef?.current || globalSocketRef.current.readyState !== WebSocket.OPEN) return;
    globalSocketRef.current.send(JSON.stringify({
      event_type: "message.delete",
      data: {
        message_id: deletingMessage.id,
        delete_for_everyone: deleteForEveryone
      }
    }));
    setMessages(prev => prev.filter(m => m.id !== deletingMessage.id));
    setDeletingMessage(null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingMessage || !editText.trim() || !globalSocketRef?.current || globalSocketRef.current.readyState !== WebSocket.OPEN) return;
    globalSocketRef.current.send(JSON.stringify({
      event_type: "message.edit",
      data: {
        message_id: editingMessage.id,
        new_content: editText.trim()
      }
    }));
    setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: editText.trim(), is_edited: true } : m));
    setEditingMessage(null);
    setEditText("");
  };

  const openModal = async () => {
    setShowModal(true);
    setLoadingFriends(true);
    try {
      const res = await fetch(`${USER_API_BASE_URL}/user-profile/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.data)) setFriendList(d.data);
      }
    } catch (err) {
      console.error("Failed to load friends list:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const startConversation = async (partnerId) => {
    try {
      const res = await fetch(`${CHAT_API_BASE_URL}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ partner_id: partnerId })
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

  const filteredFriends = friendList.filter(f =>
    (f.username?.toLowerCase() || "").includes(friendSearch.toLowerCase()) ||
    (f.display_name?.toLowerCase() || "").includes(friendSearch.toLowerCase())
  );

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

  if (globalWsStatus === "connecting") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-premium-bg gap-3">
        <div className="w-14 h-14 rounded-2xl bg-premium-gray flex items-center justify-center border border-premium-border">
          <Loader2 className="w-6 h-6 text-accent-cyan animate-spin" />
        </div>
        <p className="font-semibold text-sm text-premium-text">Connecting to chat server...</p>
      </div>
    );
  }

  if (globalWsStatus === "offline") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-premium-bg gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-accent-coral" />
        </div>
        <div>
          <p className="font-bold text-premium-text text-base">Chat Server Offline</p>
          <p className="text-xs text-premium-muted mt-1 max-w-xs leading-relaxed">Unable to connect. Make sure the chat service is running.</p>
        </div>
        <button onClick={globalRetryWs} className="flex items-center gap-2 px-5 py-2.5 bg-white text-premium-bg text-xs font-bold rounded-2xl shadow transition-all hover:bg-slate-100 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] md:h-screen flex bg-premium-bg overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className={`
        w-full md:w-[320px] flex-shrink-0 flex flex-col border-r border-premium-border bg-premium-card
        ${activeConvId ? "hidden md:flex" : "flex"}
      `}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-premium-border/50 h-14">
          <span className="font-bold text-premium-text text-sm font-display">{myUsername || "Messages"}</span>
          <button
            onClick={openModal}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-premium-gray/50 text-premium-text transition-all cursor-pointer"
            title="New conversation"
          >
            <PlusCircle className="w-4.5 h-4.5 text-accent-cyan" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-premium-muted animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-premium-gray flex items-center justify-center border border-premium-border">
                <MessageCircle className="w-5 h-5 text-premium-muted" />
              </div>
              <p className="text-xs text-premium-muted">No conversations yet.</p>
              <button onClick={openModal} className="text-xs font-bold text-accent-cyan hover:underline cursor-pointer">
                Start conversation
              </button>
            </div>
          ) : (
            conversations.map(conv => {
              const partner = getPartner(conv);
              const isActive = conv.id === activeConvId;
              const count = unreadCounts[conv.id] || 0;
              const hasUnread = !isActive && count > 0;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    if (clearUnread) clearUnread(conv.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-premium-gray/20 transition-all text-left border-b border-premium-border/30 cursor-pointer ${isActive ? "bg-premium-gray" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar url={partner?.profile_picture_url} name={partner?.username} size="md" />
                    {conv.is_partner_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-emerald border border-premium-card rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${hasUnread ? "font-bold text-premium-text" : isActive ? "font-semibold text-accent-cyan" : "font-semibold text-premium-text/90"}`}>
                      {partner?.username || "Loading..."}
                    </p>
                    <p className={`text-[10px] mt-0.5 truncate ${hasUnread ? "text-accent-cyan font-bold" : "text-premium-muted"}`}>
                      {hasUnread ? `New message (${count})` : (partner?.display_name || "Instaclone user")}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="w-4 h-4 rounded-full bg-accent-blue text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT PANEL */}
      <div ref={chatPanelRef} className={`flex-1 flex flex-col min-w-0 bg-premium-bg ${!activeConvId ? "hidden md:flex" : "flex"}`}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="h-14 px-4 flex items-center gap-3 border-b border-premium-border bg-premium-card flex-shrink-0">
              <button onClick={() => setActiveConvId(null)} className="md:hidden p-1.5 rounded-lg hover:bg-premium-gray text-premium-text cursor-pointer">
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <div className="relative flex-shrink-0">
                <Avatar url={activePartner?.profile_picture_url} name={activePartner?.username} size="sm" />
                {activeConv.is_partner_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-emerald border border-premium-card rounded-full" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-premium-text truncate">{activePartner?.username || "..."}</p>
                <p className="text-[10px] text-premium-muted truncate mt-0.5">
                  {activeConv.is_partner_online ? "Active now" : "Offline"}
                </p>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-premium-bg/50">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 text-premium-muted animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <p className="text-xs text-premium-muted leading-relaxed">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === myUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-center group gap-2`}>
                      
                      {/* Options / Action triggers (Left side for own messages) */}
                      {isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => { setEditingMessage(msg); setEditText(msg.content); }}
                            className="p-1.5 text-premium-muted hover:text-accent-cyan cursor-pointer rounded-lg hover:bg-premium-gray/40"
                            title="Edit message"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRequestDelete(msg)}
                            className="p-1.5 text-premium-muted hover:text-accent-coral cursor-pointer rounded-lg hover:bg-premium-gray/40"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className={`
                        max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm relative
                        ${isMe
                          ? "bg-accent-blue text-white rounded-tr-none"
                          : "bg-premium-card text-premium-text border border-premium-border rounded-tl-none"
                        }
                      `}>
                        <p>{msg.content}</p>
                        <span className={`text-[8px] block mt-1 ${isMe ? "text-blue-100/70 text-right" : "text-premium-muted"}`}>
                          {msg.is_edited && <span className="mr-1 opacity-70">edited &bull;</span>}
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Options / Action triggers (Right side for partner's messages) */}

                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message / Edit Input bar */}
            <form 
              onSubmit={editingMessage ? handleSaveEdit : sendMessage} 
              className="p-4 flex flex-col gap-2 border-t border-premium-border bg-premium-card flex-shrink-0"
            >
              {editingMessage && (
                <div className="flex items-center justify-between px-3 py-2 bg-premium-bg/50 border border-premium-border rounded-xl text-[10px] text-premium-muted">
                  <span className="truncate max-w-[80%] font-semibold flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-accent-cyan" />
                    Editing: <span className="text-premium-text">{editingMessage.content}</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setEditingMessage(null); setEditText(""); }}
                    className="text-accent-coral hover:text-accent-coral/80 cursor-pointer font-bold ml-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingMessage ? editText : messageText}
                  onChange={e => editingMessage ? setEditText(e.target.value) : setMessageText(e.target.value)}
                  placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                  className="flex-1 bg-premium-bg border border-premium-border rounded-2xl px-4 py-3 text-xs text-premium-text placeholder-premium-muted/50 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={editingMessage ? !editText.trim() : !messageText.trim()}
                  className="w-10 h-10 flex-shrink-0 rounded-2xl bg-white hover:bg-slate-100 disabled:opacity-30 text-premium-bg flex items-center justify-center transition-all cursor-pointer"
                >
                  {editingMessage ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </>
        ) : (
          // Empty desktop state
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 bg-premium-bg">
            <div className="w-14 h-14 rounded-2xl bg-premium-card border border-premium-border flex items-center justify-center shadow-inner">
              <MessageCircle className="w-6 h-6 text-accent-cyan" />
            </div>
            <div>
              <p className="font-bold text-premium-text text-sm font-display">Your Messages</p>
              <p className="text-xs text-premium-muted mt-1.5 max-w-xs leading-relaxed">Select a conversation or start a new message with someone you follow.</p>
            </div>
            <button onClick={openModal} className="px-5 py-2.5 bg-white text-premium-bg text-xs font-bold rounded-2xl shadow transition-all hover:bg-slate-100 cursor-pointer">
              New Message
            </button>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div ref={modalRef} className="bg-premium-card border border-premium-border rounded-3xl shadow-premium w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "75vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-premium-border/50">
              <h3 className="font-bold text-premium-text text-sm font-display">New Message</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-premium-gray text-premium-muted cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-3 border-b border-premium-border/30">
              <div className="flex items-center gap-2 bg-premium-bg border border-premium-border rounded-2xl px-3 py-2.5">
                <Search className="w-4 h-4 text-premium-muted flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  placeholder="Search people you follow..."
                  className="bg-transparent text-xs text-premium-text placeholder-premium-muted/50 w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto">
              {loadingFriends ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 text-premium-muted animate-spin" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10 text-xs text-premium-muted px-4 leading-relaxed">
                  {friendSearch ? `No results for "${friendSearch}"` : "No friends found. Follow someone first!"}
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <button
                    key={friend.user_id}
                    onClick={() => startConversation(friend.user_id)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-premium-gray/20 transition-colors text-left cursor-pointer border-b border-premium-border/20"
                  >
                    <Avatar url={friend.profile_picture_url} name={friend.username} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-premium-text truncate">{friend.username}</p>
                      <p className="text-[10px] text-premium-muted truncate mt-0.5">{friend.display_name || "Instaclone user"}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MESSAGE CONFIRMATION MODAL */}
      {deletingMessage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeletingMessage(null)}
        >
          <div 
            className="bg-premium-card border border-premium-border rounded-3xl shadow-premium w-full max-w-sm flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center border-b border-premium-border/50 space-y-2">
              <h3 className="font-bold text-premium-text text-sm font-display">Delete Message?</h3>
              <p className="text-[10px] text-premium-muted leading-relaxed">This will delete the message from both ends. This action cannot be undone.</p>
            </div>
            <div className="flex flex-col">
              <button
                onClick={() => executeDelete(true)}
                className="w-full py-3.5 border-b border-premium-border/50 text-accent-coral hover:bg-premium-gray/20 font-bold text-xs cursor-pointer transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingMessage(null)}
                className="w-full py-3.5 text-premium-muted hover:bg-premium-gray/20 font-medium text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
