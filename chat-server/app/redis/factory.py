from app.redis.store_enums import StoreEnums
from app.redis.store.user_active_store import UserActiveStore


def get_store(redis_client, store_type):
    registry = {
        StoreEnums.USER_ACTIVE: UserActiveStore(redis_client),
    }
    store = registry.get(store_type)

    if not store:
        raise ValueError("Invalid store type")
    return store
