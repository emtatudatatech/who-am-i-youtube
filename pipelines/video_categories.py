"""
    ------------
    Information
    ------------
    Creator: @emtatudatatech
    Version: 2.0
    Version Date: July 24, 2026 (v1) / rebuilt to load Neon Postgres (v2)
    Purpose: Populate the `video_categories` dimension table joined to
             history.category_id. YouTube's category IDs are stable and
             region-independent for this account's data, so this uses a
             documented static map rather than a live API call.
    Source: https://mixedanalytics.com/blog/list-of-youtube-video-category-ids/
    Output: rows upserted into the `video_categories` Postgres table.

    Usage (from repo root):  python -m pipelines.video_categories --person emtatu
             The map is identical for everyone; it is loaded once per database.
"""
import argparse
import logging

from psycopg2.extras import execute_values

from pipelines.common.db import get_conn
from pipelines.common.logging_config import setup_logging
from pipelines.common.person import add_person_arg, load_person_env, resolve_person

setup_logging()
logger = logging.getLogger(__name__)

categories_map = {
    1: "Film & Animation",
    2: "Autos & Vehicles",
    10: "Music",
    15: "Pets & Animals",
    17: "Sports",
    18: "Short Movies",
    19: "Travel & Events",
    20: "Gaming",
    21: "Videoblogging",
    22: "People & Blogs",
    23: "Comedy",
    24: "Entertainment",
    25: "News & Politics",
    26: "Howto & Style",
    27: "Education",
    28: "Science & Technology",
    29: "Nonprofits & Activism",
    30: "Movies",
    31: "Anime/Animation",
    32: "Action/Adventure",
    33: "Classics",
    34: "Comedy",
    35: "Documentary",
    36: "Drama",
    37: "Family",
    38: "Foreign",
    39: "Horror",
    40: "Sci-Fi/Fantasy",
    41: "Thriller",
    42: "Shorts",
    43: "Shows",
    44: "Trailers",
}


def main() -> None:
    # category_id stored as text to match history.category_id (YouTube IDs like '22').
    rows = [(str(cid), name) for cid, name in categories_map.items()]
    assert all(name for _, name in rows), "category_name must be non-null"

    conn = get_conn()
    with conn.cursor() as cur:
        execute_values(
            cur,
            "INSERT INTO video_categories (category_id, category_name) VALUES %s "
            "ON CONFLICT (category_id) DO UPDATE SET category_name = EXCLUDED.category_name",
            rows,
        )
    conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM video_categories")
        row = cur.fetchone()
        total = row[0] if row else 0
    conn.close()

    logger.info("Upserted %d categories; video_categories now has %d rows.", len(rows), total)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load the video_categories dimension into one person's database.")
    add_person_arg(parser)
    args = parser.parse_args()

    load_person_env(resolve_person(args.person))
    main()
