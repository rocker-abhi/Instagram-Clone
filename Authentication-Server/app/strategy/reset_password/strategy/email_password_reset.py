import logging
from dataclasses import asdict
from app.exceptions.business_exception import UserNotFound, RepeatedPassword
from app.strategy.reset_password.interface import UserResetPasswordInterface
from app.utils.password import hash_password, verify_password
from app.kafka.topics import KafakTopics
from app.kafka.events.email_user_password_reset import EmailUserPasswordResetEventBuilder

logger = logging.getLogger(__name__)


class EmailPasswordReset(UserResetPasswordInterface):

    def __init__(self, builder):
        self.password = builder._password
        self.identifier = builder._identifier
        self.user_repository = builder._user_repository
        self.kafka = builder._kafka
        self.strategy_type = builder._strategy_type

    async def reset_password(self):
        logger.debug(f"Resetting password for email: {self.identifier}")
        user = await self.user_repository.get_user_by_email(self.identifier)

        if not user:
            raise UserNotFound("Email address not registered.")

        # 1. Fetch password history for this user ordered by changed_at desc (using repository)
        history_records = await self.user_repository.get_password_history(user.id)

        # 2. Check if the new password matches any of the last 3 passwords
        for record in history_records[:3]:
            if verify_password(self.password, record.password_hash):
                raise RepeatedPassword()

        # 3. Hash the new password
        new_pwd_hash = hash_password(self.password)

        # 4. Determine if we have old records exceeding count of 3 to delete
        old_records_to_delete = []
        if len(history_records) >= 3:
            old_records_to_delete = history_records[2:]

        # 5. Delegate database updates and transaction commits to the repository
        await self.user_repository.update_password_with_history(
            user,
            new_pwd_hash,
            old_records_to_delete
        )

        event = (
                EmailUserPasswordResetEventBuilder()
                .set_user_id(user.id)
                .set_username("")
                .set_email(user.email)
                .build()
            )
        self.kafka.publish(topic=KafakTopics.USER_PASSWORD_RESET_COMPLETED, message=asdict(event))
        logger.info("Published USER_PASSWORD_RESET_COMPLETED event to Kafka successfully.")
