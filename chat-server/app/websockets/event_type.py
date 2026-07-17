from enum import StrEnum


class EventType(StrEnum):
    CHAT_MESSAGE = "chat.message"
    MESSAGE_REPLY = "message.reply"
    MESSAGE_EDIT = "message.edit"
    MESSAGE_DELETE = "message.delete"
    MESSAGE_READ = "message.read"
    MESSAGE_DELIVERED = "message.delivered"
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    USER_ONLINE = "presence.online"
    USER_OFFLINE = "presence.offline"
    PING = "ping"
    PONG = "pong"