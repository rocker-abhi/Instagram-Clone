from sqlalchemy.types import UserDefinedType
from app.routes.strategy.user_registeration.strategy_enum import RegisterationType
from app.routes.strategy.user_registeration.strategy.email_registeration import (
    EmailRegisteration,
)
from app.routes.strategy.user_registeration.strategy.phone_registeration import (
    PhoneRegisteration,
)


class UserRegisterationFactory:

    @staticmethod
    def get_strategy(strategy_type: str, builder: "UserRegisterationBuilder"):
        registry = {
            RegisterationType.EMAIL: EmailRegisteration(builder),
            RegisterationType.PHONE: PhoneRegisteration(builder)
        }
        return registry.get(strategy_type.upper())

class UserRegisterationBuilder:

    def __init__(self):
        self._request_data = None
        self._user_repository = None
        self._kafka = None
        self._redis = None
        self._strategy_type = None

    def set_request_data(self, request_data):
        self._request_data = request_data
        return self

    def set_user_repository(self, user_repository):
        self._user_repository = user_repository
        return self

    def set_kafka(self, kafka):
        self._kafka = kafka
        return self

    def set_redis(self, redis):
        self._redis = redis
        return self
    
    def set_strategy_type(self, strategy_type):
        self._strategy_type = strategy_type
        return self

    def build(self):
        if not self._request_data:
            raise ValueError("request_data is required")
        if not self._user_repository:
            raise ValueError("user_repository is required")
        if not self._kafka:
            raise ValueError("kafka is required")
        if not self._redis:
            raise ValueError("redis is required")
        if not self._strategy_type:
            raise ValueError("strategy_type is required")
        return self