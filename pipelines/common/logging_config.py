"""Shared logging setup so every script logs to both youtube.log and stdout.

Uses force=True so whichever script is the entry point wins even when it
imports other modules that also configure logging (plain basicConfig is a no-op
once the root logger already has handlers, which would otherwise drop a script's
own file/stream setup depending on import order).
"""
import logging
import sys

LOG_FILE = "youtube.log"


def setup_logging(logfile: str = LOG_FILE, level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(logfile),
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )
