from enum import Enum


class PostVisibility(str, Enum):
    """
    Enum representing the privacy/visibility of a post.
    """
    PUBLIC = "PUBLIC"
    FOLLOWERS = "FOLLOWERS"
    PRIVATE = "PRIVATE"
