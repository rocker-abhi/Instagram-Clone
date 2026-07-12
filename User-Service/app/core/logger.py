import logging


def setup_logger(level: int = logging.INFO) -> None:
    """
    Configure application logging.
    """
    root_logger = logging.getLogger()

    # Prevent duplicate handlers when using --reload
    if root_logger.handlers:
        return

    root_logger.setLevel(level)

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(level)

    # Log format: time, levelname, function name, line number, and message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler.setFormatter(formatter)

    root_logger.addHandler(stream_handler)
