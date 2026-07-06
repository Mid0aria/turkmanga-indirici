import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DOWNLOAD_DIR = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
    "MangaDownloads",
);

export const PROVIDERS_DIR = path.join(__dirname, "providers");
export const MAX_CHAPTER_CONCURRENCY = 5;
export const MAX_IMAGE_CONCURRENCY = 5;

export default {
    DOWNLOAD_DIR,
    PROVIDERS_DIR,
    MAX_CHAPTER_CONCURRENCY,
    MAX_IMAGE_CONCURRENCY,
};
