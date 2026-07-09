from app.redis.enum.store_enum import StoreEnums
from app.redis.store.refresh_token import RefreshTokenStore
from app.redis.store.email_verificaiton_token import EmailVerificationStore


def get_store(redis_client, store_type):
    registry = {
        StoreEnums.REFRESH_TOKEN: RefreshTokenStore(redis_client),
        StoreEnums.EMAIL_VERIFICATION: EmailVerificationStore(redis_client)
    }
    store = registry.get(store_type)

    if not store:
        raise ValueError("Invalid store type")
    return store