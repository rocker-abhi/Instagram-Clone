import secrets
import string


def generate_otp(length: int = 8) -> str:
    """
    Generate a cryptographically secure OTP containing digits (0-9)
    and uppercase English letters (A-Z) of the specified length.
    """
    chars = string.digits + string.ascii_uppercase
    return "".join(secrets.choice(chars) for _ in range(length))
