"""Per-person resolution: whose data are we operating on, and where does it live?

One repo serves many people (see ONBOARDING.md). Every person has:
  - a slug, e.g. 'emtatu'
  - a dataset folder,  datasets/<slug>/
  - an env file,       people/<slug>.env   (gitignored — holds their DATABASE_URL)
  - a Neon database and a Netlify site of their own

The slug is the single knob. It selects the dataset paths AND the database, so
the two can never be mismatched — loading Wambui's export into Emtatu's database
is not a mistake this layout allows you to make.

Every pipeline entry point calls `load_person_env(person)` before touching the
DB; `pipelines.common.db.get_conn` refuses to connect until it has.
"""
import os
import pathlib
import re

from dotenv import load_dotenv

# Repo root = two levels up from pipelines/common/person.py
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

DEFAULT_PERSON = "emtatu"

# Slugs become directory names, env filenames and Netlify subdomains, so keep
# them to the intersection of what all three accept.
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$")

# Set by load_person_env(); read by get_conn() as proof the env was prepared.
ACTIVE_PERSON_VAR = "ACTIVE_PERSON"


def resolve_person(explicit: str | None = None) -> str:
    """Pick the person slug: --person flag > PERSON env var > DEFAULT_PERSON.

    An explicitly-passed value is never allowed to fall through to the default,
    even if empty — `--person ""` is a mistake, not a request for 'emtatu'.
    """
    if explicit is not None:
        person = explicit
    else:
        person = os.getenv("PERSON") or DEFAULT_PERSON
    person = person.strip().lower()
    if not _SLUG_RE.match(person):
        raise ValueError(
            f"Invalid person slug {person!r}. Use lowercase letters, digits and "
            "hyphens, 2-32 chars, e.g. 'wambui'."
        )
    return person


def person_env_path(person: str) -> pathlib.Path:
    return REPO_ROOT / "people" / f"{person}.env"


def dataset_dir(person: str) -> pathlib.Path:
    return REPO_ROOT / "datasets" / person


def raw_path(person: str) -> pathlib.Path:
    """The Google Takeout export, exactly as downloaded."""
    return dataset_dir(person) / "MyActivity.json"


def enriched_path(person: str) -> pathlib.Path:
    """The export after enrich_watch_history.py adds YouTube API metadata."""
    return dataset_dir(person) / "MyActivity_enriched.json"


def load_person_env(person: str) -> str:
    """Load shared `.env`, then overlay `people/<person>.env`.

    The person file wins, so DATABASE_URL always points at *this* person's Neon
    database even if a stale one is sitting in `.env` or the shell. Returns the
    person slug so callers can do `person = load_person_env(resolve_person(a))`.
    """
    # Shared, non-secret-per-person settings: YOUTUBE_API_KEY, PYTHONPATH.
    # override=False so anything already exported in the shell still wins here.
    load_dotenv(REPO_ROOT / ".env")

    env_file = person_env_path(person)
    if not env_file.exists():
        raise RuntimeError(
            f"No env file for person {person!r} at {env_file}.\n"
            f"Create it from people/emtatu.env.example — see ONBOARDING.md step 3."
        )
    # override=True: the person file is the authority on DATABASE_URL.
    load_dotenv(env_file, override=True)

    if not os.getenv("DATABASE_URL"):
        raise RuntimeError(f"{env_file} does not set DATABASE_URL.")

    os.environ[ACTIVE_PERSON_VAR] = person
    return person


def add_person_arg(parser) -> None:
    """Attach the standard --person flag to an argparse parser."""
    parser.add_argument(
        "--person",
        default=None,
        help=f"Person slug, e.g. 'emtatu'. Defaults to $PERSON, then '{DEFAULT_PERSON}'.",
    )
