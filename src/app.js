const path = require("path");
const nfd = require("node-file-dialog");
const settingsManager = require("./core/settingsManager");
const logger = require("./ui/logger");
const prompts = require("./ui/prompts");
const { ensureDirExists } = require("./utils/fileUtils");
const { loadProviders, searchAllProviders } = require("./core/providerManager");
const { downloadChapters } = require("./core/downloader");

class App {
    constructor() {
        this.providers = loadProviders();
        this.settings = settingsManager.getSettings();
        ensureDirExists(this.settings.downloadDir);
        ensureDirExists(path.join(__dirname, "..", "data"));
    }

    async getChapterSelection(allChapters) {
        const { choice, start, end } =
            await prompts.askSelectChapterRange(allChapters);

        switch (choice) {
            case "all":
                return allChapters;
            case "last":
                return [allChapters[allChapters.length - 1]];
            case "range":
                return allChapters.filter(
                    (c) => c.number >= start && c.number <= end,
                );
            case "cancel":
            default:
                return null;
        }
    }

    async startMangaDownloader() {
        while (true) {
            const { term } = await prompts.askSearchTerm();
            if (term.toLowerCase() === "exit") break;

            const searchResults = await searchAllProviders(
                this.providers,
                term,
            );
            if (searchResults.length === 0) continue;

            const { mangaIndex } = await prompts.askSelectManga(searchResults);
            const selectedManga = searchResults[mangaIndex];
            const provider = this.providers[selectedManga.provider];

            logger.header(
                `"${selectedManga.title}" için bölümler getiriliyor...`,
            );
            const allChapters = await provider.getChapters(selectedManga.url);

            if (allChapters.length === 0) {
                logger.error("Bu manga için bölüm bulunamadı.");
                continue;
            }
            logger.success(`${allChapters.length} bölüm bulundu.`);

            const chaptersToDownload =
                await this.getChapterSelection(allChapters);
            if (!chaptersToDownload || chaptersToDownload.length === 0) {
                logger.warn(
                    "Bölüm seçilmedi veya geçersiz aralık, ana menüye dönülüyor.",
                );
                continue;
            }

            const { confirmed } = await prompts.askConfirmation(
                `⚠️  ${chaptersToDownload.length} bölüm indirilecek. Onaylıyor musun?`,
            );

            if (confirmed) {
                const { parallel } = await prompts.askParallelDownload();
                await downloadChapters(
                    chaptersToDownload,
                    selectedManga,
                    provider,
                    parallel,
                    this.settings.downloadDir,
                );
            } else {
                logger.warn("İndirme iptal edildi.");
            }

            const { confirmed: continueSearch } = await prompts.askConfirmation(
                "\n🔄 Başka bir manga aramak ister misin?",
            );
            if (!continueSearch) break;
        }
    }

    async changeDownloadDirectory() {
        logger.info(`Mevcut indirme klasörü: ${this.settings.downloadDir}`);
        const hasGUI = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
        let newDir;

        try {
            if (hasGUI) {
                const paths = await nfd({ type: "directory" });
                if (paths && paths.length > 0) {
                    newDir = paths[0];
                } else {
                    logger.warn("Klasör seçimi iptal edildi.");
                    return;
                }
            } else {
                logger.info(
                    "Grafik arayüz bulunamadı, lütfen yolu manuel girin.",
                );
                const answer = await prompts.askForDirectoryPath(
                    this.settings.downloadDir,
                );
                newDir = answer.folderPath;
            }

            await ensureDirExists(newDir);
            settingsManager.updateSetting("downloadDir", newDir);
            this.settings.downloadDir = newDir;
            logger.success(`İndirme klasörü güncellendi: ${newDir}`);
        } catch (e) {
            logger.error(
                `Klasör seçimi sırasında bir hata oluştu: ${e.message}`,
            );
        }
    }

    async handleSettings() {
        while (true) {
            logger.header("AYARLAR");
            const { action } = await prompts.askSettingsMenu();
            if (action === "changeDir") {
                await this.changeDownloadDirectory();
            } else if (action === "back") {
                break;
            }
        }
    }

    async run() {
        while (true) {
            const { action } = await prompts.askMainMenuAction();
            if (action === "search") {
                await this.startMangaDownloader();
            } else if (action === "settings") {
                await this.handleSettings();
            } else if (action === "exit") {
                break;
            }
        }
    }
}

const main = async () => {
    try {
        const app = new App();
        await app.run();
    } catch (error) {
        logger.error(`Kritik bir hata oluştu: ${error.message}`);
        console.error(error);
    } finally {
        logger.success("\n👋 Görüşmek üzere!");
        process.exit(0);
    }
};

module.exports = {
    main,
};
