// Shared env loading for the local Node scripts (dev server, function tests).
//
// Mirrors pipelines/common/person.py: load the shared `.env`, then overlay
// `people/<PERSON>.env` so DATABASE_URL points at the person you are previewing.
// PERSON defaults to 'emtatu'.
//
//   PERSON=wambui node scripts/dev-server.mjs
//
// Netlify itself never runs this — each deployed site gets DATABASE_URL from
// its own site environment variables.
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PERSON = (process.env.PERSON || "emtatu").trim().toLowerCase();

dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const personEnv = path.join(REPO_ROOT, "people", `${PERSON}.env`);
if (!fs.existsSync(personEnv)) {
  console.error(
    `No env file for person '${PERSON}' at people/${PERSON}.env — see ONBOARDING.md step 3.`
  );
  process.exit(1);
}
dotenv.config({ path: personEnv, override: true });

if (!process.env.DATABASE_URL) {
  console.error(`people/${PERSON}.env does not set DATABASE_URL.`);
  process.exit(1);
}

// Host only — never log the password.
const host = new URL(process.env.DATABASE_URL).host;
console.log(`person=${PERSON} → ${host}`);
