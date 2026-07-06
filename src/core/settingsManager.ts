import { Settings } from "@/types";
import logger from "@/ui/logger";
import fse from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE_PATH = path.join(__dirname, "..", "..", "data", "settings.json");

const DEFAULT_SETTINGS: Settings = {
    downloadDir: path.join(
        process.env.USERPROFILE || process.env.HOME || "",
        "Downloads",
        "MangaDownloads",
    ),
};

export const getSettings = (): Settings => {
    try {
        if (fse.existsSync(SETTINGS_FILE_PATH)) {
            const settings = fse.readJsonSync(SETTINGS_FILE_PATH);
            return { ...DEFAULT_SETTINGS, ...settings };
        }
        return DEFAULT_SETTINGS;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Ayarlar dosyası okunurken hata oluştu, varsayılanlar kullanılıyor: " + msg);
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = (settings: Settings): void => {
    try {
        fse.writeJsonSync(SETTINGS_FILE_PATH, settings, { spaces: 2 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Ayarlar kaydedilemedi: " + msg);
    }
};

export const updateSetting = (key: keyof Settings, value: string): void => {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
};

export default {
    getSettings,
    saveSettings,
    updateSetting,
};
