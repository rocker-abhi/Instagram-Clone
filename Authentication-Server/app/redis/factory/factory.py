from app.redis.enum.store_enum import StoreEnums
from app.redis.store.refresh_token_store import RefreshTokenStore
from app.redis.store.email_verificaiton_store import EmailVerificationStore
from app.redis.store.password_reset_store import PasswordResetStore


def get_store(redis_client, store_type):
    registry = {
        StoreEnums.REFRESH_TOKEN: RefreshTokenStore(redis_client),
        StoreEnums.EMAIL_VERIFICATION: EmailVerificationStore(redis_client),
        StoreEnums.PASSWORD_RESET: PasswordResetStore(redis_client)
    }
    store = registry.get(store_type)

    if not store:
        raise ValueError("Invalid store type")
    return store