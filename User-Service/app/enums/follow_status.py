from enum import Enum


class FollowStatus(str, Enum):
    """
    Enum representing the status of a follow relationship.
    """
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
