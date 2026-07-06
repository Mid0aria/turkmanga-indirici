import config from "@/config";
import { Chapter, Manga, MangaProvider } from "@/types";
import logger from "@/ui/logger";
import { createBar, multibar } from "@/ui/progressBar";
import { createCBZ, createSafeFileName } from "@/utils/fileUtils";
import axios from "axios";
import fs from "fs";
import path from "path";

const escapeXml = (unsafe: string): string => {
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
            default:
                return c;
        }
    });
};

interface ComicInfoMetadata {
    series: string;
    title: string;
    number: number;
    web: string;
    pageCount: number;
    provider: string;
    genre: string;
    summary: string;
    year: string;
    month: string;
    day: string;
    manga: string;
}

const createComicInfoXml = (metadata: ComicInfoMetadata): string => {
    return `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Series>${escapeXml(metadata.series)}</Series>
  <Title>${escapeXml(metadata.title)}</Title>
  <Number>${escapeXml(String(metadata.number))}</Number>
  <Web>${escapeXml(metadata.web)}</Web>
  <PageCount>${metadata.pageCount}</PageCount>
  <ScanInformation>${escapeXml(metadata.provider)}</ScanInformation>
  <Genre>${escapeXml(metadata.genre || "")}</Genre>
  <Summary>${escapeXml(metadata.summary || "")}</Summary>
  <Year>${escapeXml(metadata.year || "")}</Year>
  <Month>${escapeXml(metadata.month || "")}</Month>
  <Day>${escapeXml(metadata.day || "")}</Day>
  <Manga>${escapeXml(metadata.manga || "Yes")}</Manga>
  <Writer></Writer>
  <Penciller></Penciller>
  <Inker></Inker>
  <Colorist></Colorist>
  <Letterer></Letterer>
  <CoverArtist></CoverArtist>
  <Editor></Editor>
  <Publisher></Publisher>
</ComicInfo>`;
};

const cleanChapterTitle = (title: string, number: number): string => {
    if (!title) return "";
    let clean = title.trim();

    const numStr = String(number);
    const prefixRegex = new RegExp(`^Bölüm\\s+${numStr.replace(".", "\\.")}\\s*[-–—:]*\\s*`, "i");
    clean = clean.replace(prefixRegex, "");

    if (
        clean.toLowerCase() === `bölüm ${numStr}`.toLowerCase() ||
        clean === "" ||
        clean === numStr
    ) {
        return "";
    }

    return clean;
};

let globalBytesDownloaded = 0;
let lastSpeedCalcTime = Date.now();
let lastSpeedValue = 0;

export const getDownloadSpeed = (): number => {
    const now = Date.now();
    const diffSec = (now - lastSpeedCalcTime) / 1000;
    if (diffSec >= 0.5) {
        lastSpeedValue = globalBytesDownloaded / diffSec;
        globalBytesDownloaded = 0;
        lastSpeedCalcTime = now;
    }
    return lastSpeedValue;
};

const downloadImage = async (
    url: string,
    filePath: string,
    headers: Record<string, string>,
): Promise<void> => {
    try {
        const response = await axios.get(url, {
            responseType: "stream",
            headers,
        });
        response.data.on("data", (chunk: Buffer) => {
            globalBytesDownloaded += chunk.length;
        });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    } catch (e: unknown) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const errorMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`Resim indirilemedi: ${errorMsg} |${url.substring(0, 60)}...`);
    }
};

export interface ProgressState {
    filename: string;
    value: number;
    total: number;
    status: string;
}

interface ChapterQueueItem {
    chapter: Chapter;
    mangaDir: string;
    safeMangaName: string;
    chapterFileName: string;
    index: number;
    total: number;
    mangaTitle: string;
    mangaMetadata: Partial<Manga>;
}

const downloadSingleChapter = async (
    chapterInfo: ChapterQueueItem,
    provider: MangaProvider,
    onProgress?: (filename: string, progress: ProgressState) => void,
): Promise<void> => {
    const { chapter, mangaDir, chapterFileName, index, total } = chapterInfo;
    const chapterDir = path.join(mangaDir, chapterFileName);
    const cbzPath = path.join(mangaDir, `${chapterFileName}.cbz`);
    const filename = `${chapterFileName}.cbz`;

    const updateProgress = (value: number, status: string) => {
        if (onProgress) {
            onProgress(filename, { filename, value, total: 100, status });
        } else {
            chapterBar?.update(value, { status });
        }
    };

    if (fs.existsSync(cbzPath)) {
        if (onProgress) {
            onProgress(filename, {
                filename,
                value: 100,
                total: 100,
                status: "Zaten mevcut, atlandı.",
            });
        } else {
            logger.warn(`[${index + 1}/${total}] ${chapter.title} zaten mevcut, atlanıyor.`);
        }
        return;
    }

    let chapterBar: ReturnType<typeof createBar> | null = null;
    if (!onProgress) {
        chapterBar = createBar(100, {
            filename,
            status: "Başlatılıyor...",
        });
    } else {
        updateProgress(0, "Başlatılıyor...");
    }

    try {
        if (!fs.existsSync(chapterDir)) fs.mkdirSync(chapterDir, { recursive: true });

        updateProgress(5, "Resim linkleri alınıyor...");
        const imageUrls = await provider.getChapterImages(chapter.url);
        if (imageUrls.length === 0) {
            updateProgress(100, "Resim Yok!");
            return;
        }

        updateProgress(15, `${imageUrls.length} resim indiriliyor...`);

        const imageTasks = imageUrls.map((url, i) => async () => {
            let ext = path.extname(new URL(url).pathname) || ".jpg";
            if (ext.toLowerCase() === ".php") {
                ext = ".png";
            }
            const imagePath = path.join(chapterDir, `${String(i + 1).padStart(3, "0")}${ext}`);
            const headers = provider.getDownloadHeaders
                ? provider.getDownloadHeaders(chapter.url)
                : {};

            await downloadImage(url, imagePath, headers);
            if (typeof provider.scrambleResolver === "function") {
                await provider.scrambleResolver(imagePath, i, chapter.url);
            }
        });

        for (let i = 0; i < imageTasks.length; i++) {
            await imageTasks[i]();
            updateProgress(
                15 + Math.floor(((i + 1) / imageTasks.length) * 55),
                `${imageUrls.length} resimden ${i + 1} tanesi indirildi...`,
            );
        }

        updateProgress(75, "Metadata oluşturuluyor...");

        let year = "";
        let month = "";
        let day = "";
        if (chapterInfo.mangaMetadata?.releaseDate) {
            try {
                const date = new Date(chapterInfo.mangaMetadata.releaseDate);
                if (!isNaN(date.getTime())) {
                    year = String(date.getFullYear());
                    month = String(date.getMonth() + 1);
                    day = String(date.getDate());
                }
            } catch {
                // ignore
            }
        }

        const metadata: ComicInfoMetadata = {
            series: chapterInfo.mangaTitle,
            title: cleanChapterTitle(chapter.title, chapter.number),
            number: chapter.number,
            web: chapter.url,
            pageCount: imageUrls.length,
            provider: provider.name,
            genre: chapterInfo.mangaMetadata?.genres || "",
            summary: chapterInfo.mangaMetadata?.summary || "",
            year,
            month,
            day,
            manga: "Yes",
        };
        const xmlContent = createComicInfoXml(metadata);
        const xmlPath = path.join(chapterDir, "ComicInfo.xml");
        fs.writeFileSync(xmlPath, xmlContent);

        updateProgress(85, "CBZ oluşturuluyor...");
        await createCBZ(chapterDir, cbzPath);

        updateProgress(95, "Temizlik yapılıyor...");
        fs.rmSync(chapterDir, { recursive: true, force: true });

        updateProgress(100, "Tamamlandı!");
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateProgress(100, `Hata: ${errorMsg.substring(0, 30)}`);
        if (fs.existsSync(chapterDir)) {
            fs.rmSync(chapterDir, { recursive: true, force: true });
        }
    }
};

export const downloadChapters = async (
    chapters: Chapter[],
    selectedManga: Manga,
    provider: MangaProvider,
    useParallel: boolean,
    downloadDir: string,
    onProgress?: (filename: string, progress: ProgressState) => void,
): Promise<void> => {
    const safeMangaName = createSafeFileName(selectedManga.title);
    const mangaDir = path.join(downloadDir, safeMangaName);
    if (!fs.existsSync(mangaDir)) fs.mkdirSync(mangaDir, { recursive: true });

    if (selectedManga.coverImageUrl) {
        try {
            const coverPath = path.join(mangaDir, "cover.png");
            if (!fs.existsSync(coverPath)) {
                if (!onProgress) logger.info("Kapak resmi indiriliyor: cover.png");
                const headers = provider.getDownloadHeaders
                    ? provider.getDownloadHeaders(selectedManga.url)
                    : {};
                await downloadImage(selectedManga.coverImageUrl, coverPath, headers);
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (!onProgress) logger.warn(`Kapak resmi indirilemedi: ${errMsg}`);
        }
    }

    if (!onProgress) {
        logger.header("İNDİRME BAŞLIYOR");
        logger.info(`Manga: ${selectedManga.title}`);
        logger.info(`Bölümler: ${chapters.length} adet`);
        logger.info(`Konum: ${mangaDir}\n`);
    }

    const seenFileNames = new Set<string>();
    const chapterQueue: ChapterQueueItem[] = chapters.map((chapter, index) => {
        const parts = String(chapter.number).split(".");
        const integerPart = parts[0].padStart(3, "0");
        const numberString = parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
        const baseFileName = `${safeMangaName}-${numberString}`;
        let uniqueFileName = baseFileName;
        let counter = 1;

        while (seenFileNames.has(uniqueFileName)) {
            counter++;
            uniqueFileName = `${baseFileName}_${counter}`;
        }
        seenFileNames.add(uniqueFileName);

        return {
            chapter,
            mangaDir,
            safeMangaName,
            chapterFileName: uniqueFileName,
            index,
            total: chapters.length,
            mangaTitle: selectedManga.title,
            mangaMetadata: {
                summary: selectedManga.summary,
                genres: selectedManga.genres,
                demographic: selectedManga.demographic,
                releaseDate: selectedManga.releaseDate,
                status: selectedManga.status,
                titleTr: selectedManga.titleTr,
                titleEn: selectedManga.titleEn,
                titleJp: selectedManga.titleJp,
            },
        };
    });

    const concurrency = useParallel ? config.MAX_CHAPTER_CONCURRENCY : 1;

    const worker = async () => {
        while (chapterQueue.length > 0) {
            const chapterInfo = chapterQueue.shift();
            if (chapterInfo) {
                await downloadSingleChapter(chapterInfo, provider, onProgress);
            }
        }
    };

    const workers = Array(concurrency).fill(null).map(worker);
    await Promise.all(workers);

    if (!onProgress) {
        multibar.stop();
        logger.success("\nTüm indirme işlemleri tamamlandı!");
    }
};

export default {
    downloadChapters,
    getDownloadSpeed,
};
