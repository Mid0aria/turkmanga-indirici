const fs = require("fs");
const config = require("./config");
const logger = require("./ui/logger");
const prompts = require("./ui/prompts");
const { loadProviders, searchAllProviders } = require("./core/providerManager");
const { downloadChapters } = require("./core/downloader");

class App {
    constructor() {
        this.providers = loadProviders();
        if (!fs.existsSync(config.DOWNLOAD_DIR)) {
            fs.mkdirSync(config.DOWNLOAD_DIR, { recursive: true });
        }
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

    async run() {
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
}

const main = async () => {
    try {
        const app = new App();
        await app.run();
    } catch (error) {
        logger.error(`Kritik bir hata oluştu: ${error.message}`);
        console.error(error); // Geliştirme için stack trace'i göster
    } finally {
        logger.success("\n👋 Görüşmek üzere!");
        process.exit(0);
    }
};

process.on("SIGINT", () => {
    logger.warn("\nİşlem iptal edildi. Çıkılıyor.");
    process.exit(0);
});

main();
