from app.strategy.user_registeration.strategy_enum import RegisterationType
from app.strategy.reset_password.strategy.email_password_reset import (
    EmailPasswordReset,
)
from app.strategy.reset_password.strategy.phone_password_reset import (
    PhonePasswordReset,
)


class UserResetPasswordFactory:

    @staticmethod
    def get_strategy(strategy_type: str, builder: "UserResetPasswordBuilder"):
        registry = {
            RegisterationType.EMAIL: EmailPasswordReset(builder),
            RegisterationType.PHONE: PhonePasswordReset(builder)
        }
        return registry.get(strategy_type.upper())


class UserResetPasswordBuilder:

    def __init__(self):
        self._password = None
        self._identifier = None
        self._user_repository = None
        self._kafka = None
        self._strategy_type = None

    def set_password(self, password):
        self._password = password
        return self

    def set_identifier(self, identifier):
        self._identifier = identifier
        return self

    def set_user_repository(self, user_repository):
        self._user_repository = user_repository
        return self

    def set_kafka(self, kafka):
        self._kafka = kafka
        return self

    def set_strategy_type(self, strategy_type):
        self._strategy_type = strategy_type
        return self

    def build(self):
        if not self._password:
            raise ValueError("password is required")
        if not self._identifier:
            raise ValueError("identifier is required")
        if not self._user_repository:
            raise ValueError("user_repository is required")
        if not self._kafka:
            raise ValueError("kafka is required")
        if not self._strategy_type:
            raise ValueError("strategy_type is required")
        return self