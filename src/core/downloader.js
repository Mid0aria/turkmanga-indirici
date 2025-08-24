const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { createSafeFileName, createCBZ } = require("../utils/fileUtils");
const { multibar, createBar } = require("../ui/progressBar");
const logger = require("../ui/logger");

const downloadImage = async (url, filePath, headers) => {
    try {
        const response = await axios.get(url, {
            responseType: "stream",
            headers,
        });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error(
            `Resim indirilemedi: ${url.substring(0, 60)}... - ${error.message}`,
        );
    }
};

const downloadSingleChapter = async (chapterInfo, provider) => {
    const { chapter, mangaDir, safeMangaName, index, total } = chapterInfo;
    const numberString = String(chapter.number).padStart(4, "0");
    const chapterFileName = `${safeMangaName}-b${numberString}`;
    const chapterDir = path.join(mangaDir, "temp", chapterFileName); // Geçici klasör
    const cbzPath = path.join(mangaDir, `${chapterFileName}.cbz`);

    if (fs.existsSync(cbzPath)) {
        logger.warn(
            `[${index + 1}/${total}] ${chapter.title} zaten mevcut, atlanıyor.`,
        );
        return;
    }

    const chapterBar = createBar(100, {
        filename: `${chapterFileName}.cbz`,
        status: "Başlatılıyor...",
    });

    try {
        if (!fs.existsSync(chapterDir))
            fs.mkdirSync(chapterDir, { recursive: true });

        chapterBar.update(5, { status: "Resim linkleri alınıyor..." });
        const imageUrls = await provider.getChapterImages(chapter.url);
        if (imageUrls.length === 0) {
            chapterBar.update(100, { status: "Resim Yok!" });
            fs.rmSync(chapterDir, { recursive: true, force: true });
            return;
        }

        chapterBar.update(15, {
            status: `${imageUrls.length} resim indiriliyor...`,
        });

        const imageTasks = imageUrls.map((url, i) => async () => {
            const ext = path.extname(new URL(url).pathname) || ".jpg";
            const imagePath = path.join(
                chapterDir,
                `${String(i + 1).padStart(3, "0")}${ext}`,
            );
            const headers = provider.getDownloadHeaders
                ? provider.getDownloadHeaders(url)
                : {};
            await downloadImage(url, imagePath, headers);
        });

        for (let i = 0; i < imageTasks.length; i++) {
            await imageTasks[i]();
            chapterBar.update(
                15 + Math.floor(((i + 1) / imageTasks.length) * 60),
            );
        }

        chapterBar.update(75, { status: "CBZ oluşturuluyor..." });
        await createCBZ(chapterDir, cbzPath);

        chapterBar.update(95, { status: "Temizlik yapılıyor..." });
        fs.rmSync(path.join(mangaDir, "temp"), {
            recursive: true,
            force: true,
        });

        chapterBar.update(100, { status: "Tamamlandı!" });
    } catch (error) {
        chapterBar.update(100, {
            status: `Hata: ${error.message.substring(0, 30)}`,
        });
        if (fs.existsSync(chapterDir)) {
            fs.rmSync(chapterDir, { recursive: true, force: true });
        }
    }
};

// SADECE BU FONKSİYONUN İMZASI VE İLK SATIRI DEĞİŞTİ
const downloadChapters = async (
    chapters,
    selectedManga,
    provider,
    useParallel,
    downloadDir,
) => {
    const safeMangaName = createSafeFileName(selectedManga.title);
    // DEĞİŞİKLİK: Sabit config yolu yerine parametre kullanılıyor
    const mangaDir = path.join(downloadDir, safeMangaName);
    if (!fs.existsSync(mangaDir)) fs.mkdirSync(mangaDir, { recursive: true });

    logger.header("İNDİRME BAŞLIYOR");
    logger.info(`Manga: ${selectedManga.title}`);
    logger.info(`Bölümler: ${chapters.length} adet`);
    logger.info(`Konum: ${mangaDir}\n`);

    const chapterQueue = chapters.map((chapter, index) => ({
        chapter,
        mangaDir,
        safeMangaName,
        index,
        total: chapters.length,
    }));

    const concurrency = useParallel ? config.MAX_CHAPTER_CONCURRENCY : 1;

    const worker = async () => {
        while (chapterQueue.length > 0) {
            const chapterInfo = chapterQueue.shift();
            if (chapterInfo) {
                await downloadSingleChapter(chapterInfo, provider);
            }
        }
    };

    const workers = Array(concurrency).fill(null).map(worker);
    await Promise.all(workers);

    multibar.stop();
    logger.success("\nTüm indirme işlemleri tamamlandı!");
};

module.exports = { downloadChapters };
