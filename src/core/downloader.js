const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { createSafeFileName, createCBZ } = require("../utils/fileUtils");
const { multibar, createBar } = require("../ui/progressBar");
const logger = require("../ui/logger");

// YENİ FONKSİYON: XML içindeki özel karakterlerden kaçınmak için
const escapeXml = (unsafe) => {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
        }
    });
};

// YENİ FONKSİYON: ComicInfo.xml içeriğini oluşturur
const createComicInfoXml = (metadata) => {
    return `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Series>${escapeXml(metadata.series)}</Series>
  <Title>${escapeXml(metadata.title)}</Title>
  <Number>${escapeXml(metadata.number)}</Number>
  <Web>${escapeXml(metadata.web)}</Web>
  <PageCount>${metadata.pageCount}</PageCount>
  <ScanInformation>${escapeXml(metadata.provider)}</ScanInformation>
  <Writer></Writer>
  <Penciller></Penciller>
  <Inker></Inker>
  <Colorist></Colorist>
  <Letterer></Letterer>
  <CoverArtist></CoverArtist>
  <Editor></Editor>
  <Publisher></Publisher>
  <Genre></Genre>
  <Summary></Summary>
</ComicInfo>`;
};

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
    } catch (e) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error(
            `Resim indirilemedi: ${e.message} |${url.substring(0, 60)}...`,
        );
    }
};

const downloadSingleChapter = async (chapterInfo, provider) => {
    const { chapter, mangaDir, safeMangaName, index, total } = chapterInfo;
    const numberString = String(chapter.number).padStart(3, "0");
    const chapterFileName = `${safeMangaName}-${numberString}`;
    const chapterDir = path.join(mangaDir, chapterFileName);
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
                ? provider.getDownloadHeaders()
                : {};

            await downloadImage(url, imagePath, headers);
        });

        for (let i = 0; i < imageTasks.length; i++) {
            await imageTasks[i]();
            // İlerleme çubuğunu resim indirme aşaması için %15 ile %70 arasına yayalım
            chapterBar.update(
                15 + Math.floor(((i + 1) / imageTasks.length) * 55),
            );
        }

        // DEĞİŞİKLİK: Metadata oluşturma ve yazma adımı
        chapterBar.update(75, { status: "Metadata oluşturuluyor..." });
        const metadata = {
            series: chapterInfo.mangaTitle, // Manga başlığını chapterInfo'ya eklememiz gerekecek
            title: chapter.title,
            number: chapter.number,
            web: chapter.url,
            pageCount: imageUrls.length,
            provider: provider.name,
        };
        const xmlContent = createComicInfoXml(metadata);
        const xmlPath = path.join(chapterDir, "ComicInfo.xml");
        fs.writeFileSync(xmlPath, xmlContent);
        // BİTİŞ

        chapterBar.update(85, { status: "CBZ oluşturuluyor..." });
        await createCBZ(chapterDir, cbzPath);

        chapterBar.update(95, { status: "Temizlik yapılıyor..." });
        fs.rmSync(chapterDir, { recursive: true, force: true });

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

const downloadChapters = async (
    chapters,
    selectedManga,
    provider,
    useParallel,
    downloadDir,
) => {
    const safeMangaName = createSafeFileName(selectedManga.title);
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
        // DEĞİŞİKLİK: Manga başlığını buraya ekliyoruz ki downloadSingleChapter içinde kullanılabilsin
        mangaTitle: selectedManga.title,
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
