const fse = require("fs-extra");
const path = require("path");

const SETTINGS_FILE_PATH = path.join(process.cwd(), "settings.json");

const DEFAULT_SETTINGS = {
    downloadDir: path.join(process.cwd(), "downloads"),
};

const getSettings = () => {
    try {
        if (fse.existsSync(SETTINGS_FILE_PATH)) {
            const settings = fse.readJsonSync(SETTINGS_FILE_PATH);
            return { ...DEFAULT_SETTINGS, ...settings };
        }
        return DEFAULT_SETTINGS;
    } catch (error) {
        console.error(
            "Ayarlar dosyası okunurken hata oluştu, varsayılanlar kullanılıyor.",
            error,
        );
        return DEFAULT_SETTINGS;
    }
};

const saveSettings = (settings) => {
    try {
        fse.writeJsonSync(SETTINGS_FILE_PATH, settings, { spaces: 2 });
    } catch (error) {
        console.error("Ayarlar kaydedilemedi:", error);
    }
};

const updateSetting = (key, value) => {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
};

module.exports = {
    getSettings,
    saveSettings,
    updateSetting,
};
