from enum import Enum


class AccountVisibility(str, Enum):
    """
    Enum representing the privacy/visibility of a user account.
    """
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
