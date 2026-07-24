import argparse
import json
import logging
import os
import re
from typing import Dict, List, Optional, Set

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

from pipelines.common.logging_config import setup_logging

# ==============================================================================
# CONFIGURATION
# ==============================================================================
setup_logging()
logger = logging.getLogger(__name__)

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
DEFAULT_INPUT_FILE = "datasets/MyActivity.json"
DEFAULT_OUTPUT_FILE = "datasets/MyActivity_enriched.json"

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================
def extract_video_id(url: Optional[str]) -> Optional[str]:
    """Extracts the 11-character YouTube video ID from a URL."""
    if not url:
        return None
    match = re.search(r"(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None

def batch_list(items: List, size: int = 50):
    """Yield successive n-sized chunks from a list (YouTube API max batch is 50)."""
    for i in range(0, len(items), size):
        yield items[i : i + size]

# ==============================================================================
# ENRICHMENT (in place, no file I/O — reusable by the incremental updater)
# ==============================================================================
def enrich_entries(data: List[dict]) -> int:
    """Enrich watch-type entries in `data` in place with YouTube metadata
    (videoId, categoryId, videoThumbnailUrl, channelId, channelImageUrl,
    channelCountry, videoDuration). Returns the number of records enriched.

    Operates on a list of raw MyActivity entries so callers can enrich either a
    whole export (main) or just the newly-downloaded delta (incremental_update)
    without writing intermediate files.
    """
    if not API_KEY:
        raise RuntimeError("YOUTUBE_API_KEY is not set (check your .env).")

    youtube = build("youtube", "v3", developerKey=API_KEY)

    # --------------------------------------------------------------------------
    # STEP 1: Parse Watch History and collect unique Video IDs
    # --------------------------------------------------------------------------
    logger.info("Step 1: Parsing Watch History records...")
    video_records = []
    video_ids_to_fetch: Set[str] = set()

    for entry in data:
        # Ignore search history or non-watch events
        controls = entry.get("activityControls", [])
        if "YouTube watch history" not in controls:
            continue

        title_url = entry.get("titleUrl", "")
        vid_id = extract_video_id(title_url)

        if vid_id:
            entry["videoId"] = vid_id
            video_records.append(entry)
            video_ids_to_fetch.add(vid_id)

    logger.info(f"   Found {len(video_records)} watch logs across {len(video_ids_to_fetch)} unique videos.")

    # --------------------------------------------------------------------------
    # STEP 2: Batch Query YouTube API for Video Details (categoryId & Thumbnails)
    # --------------------------------------------------------------------------
    logger.info("Step 2: Fetching Video metadata from YouTube API...")
    video_metadata: Dict[str, dict] = {}
    channel_ids_to_fetch: Set[str] = set()

    unique_video_ids = list(video_ids_to_fetch)
    for chunk in batch_list(unique_video_ids, 50):
        try:
            response = youtube.videos().list(
                part="snippet,contentDetails",
                id=",".join(chunk)
            ).execute()

            for item in response.get("items", []):
                vid_id = item["id"]
                snippet = item["snippet"]

                # Extract best available thumbnail URL
                thumbnails = snippet.get("thumbnails", {})
                best_thumb = (
                    thumbnails.get("maxres", {}).get("url") or
                    thumbnails.get("high", {}).get("url") or
                    thumbnails.get("medium", {}).get("url") or
                    thumbnails.get("default", {}).get("url")
                )

                channel_id = snippet.get("channelId")
                if channel_id:
                    channel_ids_to_fetch.add(channel_id)

                # ISO-8601 duration string, e.g. "PT10M32S" (parsed to seconds at load time)
                duration = item.get("contentDetails", {}).get("duration")

                video_metadata[vid_id] = {
                    "categoryId": snippet.get("categoryId"),
                    "videoThumbnailUrl": best_thumb,
                    "channelId": channel_id,
                    "videoDuration": duration
                }
        except HttpError as e:
            logger.warning(f"   API Error during video fetch: {e}")

    logger.info(f"   Successfully fetched metadata for {len(video_metadata)} videos.")

    # --------------------------------------------------------------------------
    # STEP 3: Batch Query YouTube API for Channel Images and Country
    # --------------------------------------------------------------------------
    logger.info("Step 3: Fetching Channel details (Avatars & Country) from YouTube API...")
    channel_metadata: Dict[str, dict] = {}

    unique_channel_ids = list(channel_ids_to_fetch)
    for chunk in batch_list(unique_channel_ids, 50):
        try:
            response = youtube.channels().list(
                part="snippet",
                id=",".join(chunk)
            ).execute()

            for item in response.get("items", []):
                c_id = item["id"]
                snippet = item["snippet"]
                
                # Extract channel profile picture
                thumbnails = snippet.get("thumbnails", {})
                avatar_url = (
                    thumbnails.get("high", {}).get("url") or
                    thumbnails.get("medium", {}).get("url") or
                    thumbnails.get("default", {}).get("url")
                )

                # Extract channel country code (ISO 2-letter code or None)
                country_code = snippet.get("country")

                channel_metadata[c_id] = {
                    "channelImageUrl": avatar_url,
                    "channelCountry": country_code
                }
        except HttpError as e:
            logger.warning(f"   API Error during channel fetch: {e}")

    logger.info(f"   Successfully fetched details for {len(channel_metadata)} channels.")

    # --------------------------------------------------------------------------
    # STEP 4: Merge Metadata back into JSON records and Save
    # --------------------------------------------------------------------------
    logger.info("Step 4: Enriching original JSON records and exporting...")
    enriched_count = 0

    for entry in data:
        vid_id = entry.get("videoId")
        if vid_id and vid_id in video_metadata:
            v_info = video_metadata[vid_id]
            c_id = v_info.get("channelId")
            
            c_info = channel_metadata.get(c_id, {}) if c_id else {}

            # Enrich the record directly
            entry["categoryId"] = v_info.get("categoryId")
            entry["videoThumbnailUrl"] = v_info.get("videoThumbnailUrl")
            entry["channelId"] = c_id
            entry["channelImageUrl"] = c_info.get("channelImageUrl")
            entry["channelCountry"] = c_info.get("channelCountry")
            entry["videoDuration"] = v_info.get("videoDuration")
            enriched_count += 1

    logger.info(f"Enriched {enriched_count} records.")
    return enriched_count


# ==============================================================================
# MAIN (whole-file enrichment)
# ==============================================================================
def main(input_file: str = DEFAULT_INPUT_FILE, output_file: str = DEFAULT_OUTPUT_FILE) -> None:
    if not API_KEY:
        logger.error("Error: Please set the YOUTUBE_API_KEY environment variable.")
        return

    logger.info("Loading %s ...", input_file)
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    enrich_entries(data)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    logger.info("Finished! File saved as: %s", output_file)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich a Google Takeout MyActivity.json export with YouTube metadata.")
    parser.add_argument("--input", default=DEFAULT_INPUT_FILE, help="Path to raw MyActivity.json")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_FILE, help="Path to write enriched JSON")
    args = parser.parse_args()
    main(args.input, args.output)