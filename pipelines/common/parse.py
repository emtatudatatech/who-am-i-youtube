"""Shared record-parsing logic for the history loaders.

Both the initial loader (`pipelines/load_history.py`) and the incremental update
script (`pipelines/incremental_update.py`) import from here so the mapping from a
raw enriched MyActivity entry to a `history` row is defined exactly once.
"""
import hashlib
import re
from datetime import datetime
from zoneinfo import ZoneInfo

# East Africa Time — fixed UTC+3, no DST (Ground Rule 11).
EAT = ZoneInfo("Africa/Nairobi")

# Column order used for every INSERT into `history`. `id` and `created_at` are
# DB-generated, so they are intentionally absent here.
COLUMNS = [
    "activity_hash",
    "activity_type",
    "header",
    "title",
    "title_url",
    "channel_name",
    "channel_url",
    "time",
    "time_eat",
    "video_id",
    "category_id",
    "video_thumbnail_url",
    "channel_id",
    "channel_image_url",
    "channel_country",
    "is_short",
    "video_duration_seconds",
]

# Video/channel insights filter to this set of activity types (see plan / Section 8.4).
WATCH_ACTIVITY_TYPES = frozenset({"watched"})

_DURATION_RE = re.compile(
    r"^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$"
)


def classify_activity_type(title: str | None) -> str:
    """Derive activity_type from the title's leading verb.

    Returns the lowercased verb, e.g. 'watched', 'liked', 'viewed'. The one
    multi-word case, 'Searched for ...', collapses to 'searched for'.
    """
    if not title:
        return "unknown"
    first = title.split(" ", 1)[0].lower()
    if first == "searched":
        return "searched for"
    return first


def activity_hash(time: str | None, title_url: str | None, title: str | None) -> str:
    """Stable idempotency key. Takeout entries have no native ID, so we hash the
    fields that together identify an activity. Tolerates a missing title_url."""
    payload = f"{time or ''}|{title_url or ''}|{title or ''}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def parse_utc(time: str) -> datetime:
    """Parse Takeout's ISO-8601 `...Z` timestamp into an aware UTC datetime."""
    # datetime.fromisoformat handles the trailing 'Z' on Python 3.11+.
    return datetime.fromisoformat(time)


def to_eat(time: str) -> datetime:
    """Convert a UTC timestamp string to a naive East Africa Time wall-clock
    datetime (tz dropped) for the `time_eat` column."""
    return parse_utc(time).astimezone(EAT).replace(tzinfo=None)


def is_short(title: str | None) -> bool:
    """Shorts detection: case-insensitive '#shorts' substring in the title.

    Documented limitation: a Short whose title omits the hashtag is a false
    negative (see Section 4, item 3).
    """
    return bool(title) and "#shorts" in title.lower()


def iso8601_duration_to_seconds(duration: str | None) -> int | None:
    """Parse an ISO-8601 duration (e.g. 'PT1H2M3S', 'PT45S', 'P0D') to seconds."""
    if not duration:
        return None
    m = _DURATION_RE.match(duration)
    if not m:
        return None
    days, hours, minutes, seconds = (int(g) if g else 0 for g in m.groups())
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def record_to_row(entry: dict) -> tuple:
    """Map one enriched MyActivity entry to a `history` row tuple (COLUMNS order).

    Tolerates absent keys: search-type entries carry no subtitles/enrichment,
    and some watch entries are missing individual enriched fields.
    """
    title = entry.get("title")
    title_url = entry.get("titleUrl")
    time = entry.get("time")

    subtitles = entry.get("subtitles") or []
    channel_name = channel_url = None
    if subtitles:
        channel_name = subtitles[0].get("name")
        channel_url = subtitles[0].get("url")

    category_id = entry.get("categoryId")
    category_id = str(category_id) if category_id is not None else None

    return (
        activity_hash(time, title_url, title),
        classify_activity_type(title),
        entry.get("header"),
        title,
        title_url,
        channel_name,
        channel_url,
        parse_utc(time) if time else None,
        to_eat(time) if time else None,
        entry.get("videoId"),
        category_id,
        entry.get("videoThumbnailUrl"),
        entry.get("channelId"),
        entry.get("channelImageUrl"),
        entry.get("channelCountry"),
        is_short(title),
        iso8601_duration_to_seconds(entry.get("videoDuration")),
    )
