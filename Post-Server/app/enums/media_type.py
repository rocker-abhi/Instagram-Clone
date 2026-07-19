from enum import Enum


class MediaType(str, Enum):
    """
    Enum representing the type of upload media (IMAGE or VIDEO).
    """
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
