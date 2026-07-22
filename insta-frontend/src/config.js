// API Gateway base endpoints - All microservice requests route strictly via API Gateway
const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
const wsHost = typeof window !== "undefined" ? window.location.host : "localhost";

export const API_BASE_URL = import.meta.env.VITE_API_URL || `${baseOrigin}/auth`;
export const USER_API_BASE_URL = import.meta.env.VITE_USER_API_URL || `${baseOrigin}/user-profile`;
export const NOTIFICATION_API_BASE_URL = import.meta.env.VITE_NOTIFICATION_API_URL || `${baseOrigin}/notifications`;
export const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_URL || `${baseOrigin}/chat`;
export const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL || `${wsProtocol}//${wsHost}/chat/ws`;
export const POST_API_BASE_URL = import.meta.env.VITE_POST_API_URL || `${baseOrigin}/posts`;
