class InfrastructureException(Exception):

    def __init__(self, service: str, message: str = "Service temporarily unavailable."):
        self.service = service
        self.message = message
        super().__init__(f"Infrastructure error in {service}: {message}")
