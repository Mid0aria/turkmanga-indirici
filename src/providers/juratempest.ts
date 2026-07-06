import { Chapter, Manga, MangaProvider } from "@/types";
import logger from "@/ui/logger";
import os from "os";
import { connect, PuppeteerBrowser, PuppeteerPage, PuppeteerTarget } from "puppeteer-real-browser";

interface TempestSearchResult {
    json?: {
        hits?: Array<{
            titleJpRomaji?: string;
            titleTr?: string;
            titleEn?: string;
            titleJp?: string;
            slug: string;
            synopsis?: string;
            description?: string;
            genres?: Array<{ name: string }>;
            demographic?: string;
            releaseDate?: string;
            seriesStatus?: string;
            coverImageUrl?: string;
        }>;
    };
}

interface TempestChaptersResponse {
    json?: Array<{
        title?: string;
        slug: string;
        number: number;
    }>;
}

interface TempestChapterImagesResponse {
    json?: Array<{
        pages?: Array<{
            number: number;
            imageUrl: string;
        }>;
    }>;
}

export class TempestMangasProvider implements MangaProvider {
    name: string;
    baseUrl: string;
    browser: PuppeteerBrowser | null;
    userAgent: string;

    constructor() {
        this.name = "TempestMangas";
        this.baseUrl = "https://juratempe.st";
        this.browser = null;
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    }

    getDownloadHeaders(chapterUrl: string): Record<string, string> {
        return {
            Referer: chapterUrl || this.baseUrl,
            Origin: this.baseUrl,
            "User-Agent": this.userAgent,
        };
    }

    async _ensureBrowser(): Promise<void> {
        if (this.browser) {
            try {
                await this.browser.version();
                return;
            } catch {
                this.browser = null;
            }
        }

        const isLinux = os.platform() === "linux";
        try {
            const { browser } = await connect({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                executablePath: isLinux ? "/usr/bin/chromium-browser" : undefined,
            });

            this.browser = browser;

            this.browser.on("targetcreated", (target: PuppeteerTarget) => {
                const handleTarget = async () => {
                    try {
                        if (target.type() === "page") {
                            const newPage = await target.page();
                            if (newPage) {
                                newPage.on("framenavigated", (frame: unknown) => {
                                    const checkFrame = async () => {
                                        if (frame === newPage.mainFrame()) {
                                            const url = newPage.url();
                                            if (
                                                url &&
                                                !url.includes("juratempe.st") &&
                                                url !== "about:blank"
                                            ) {
                                                try {
                                                    await newPage.close();
                                                    logger.info(
                                                        `[${this.name}] Reklam sekmesi engellendi ve kapatıldı: ${url}`,
                                                    );
                                                } catch {
                                                    // ignore
                                                }
                                            }
                                        }
                                    };
                                    checkFrame();
                                });

                                const url = newPage.url();
                                if (url && !url.includes("juratempe.st") && url !== "about:blank") {
                                    await newPage.close();
                                    logger.info(
                                        `[${this.name}] Reklam sekmesi engellendi ve kapatıldı: ${url}`,
                                    );
                                }
                            }
                        }
                    } catch {
                        // ignore
                    }
                };
                handleTarget();
            });

            const tempPage = await this._createNewPage();
            this.userAgent = (await tempPage.evaluate(() => navigator.userAgent)) as string;
            await tempPage.close();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[${this.name}] Puppeteer başlatılamadı: ${msg}`);
            throw error;
        }
    }

    async _createNewPage(): Promise<PuppeteerPage> {
        if (!this.browser) {
            throw new Error("Tarayıcı başlatılmamış.");
        }
        const page = await this.browser.newPage();
        try {
            await page.evaluateOnNewDocument(() => {
                const win = globalThis as unknown as { open: unknown };
                win.open = () => {
                    return { focus: () => {} };
                };
            });
        } catch {
            // ignore
        }
        return page;
    }

    async closeBrowser(): Promise<void> {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.error(`[${this.name}] Tarayıcı kapatılamadı: ${msg}`);
            }
            this.browser = null;
        }
    }

    async executeScript<T>(fn: (...args: never[]) => unknown, ...args: unknown[]): Promise<T> {
        await this._ensureBrowser();
        let page: PuppeteerPage | null = null;
        try {
            page = await this._createNewPage();
            await page.goto(this.baseUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });
            return (await page.evaluate(fn, ...args)) as T;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[${this.name}] Sayfa içi kod çalıştırma hatası: ${msg}`);
            throw error;
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch {
                    // ignore
                }
            }
        }
    }

    async search(title: string): Promise<Manga[]> {
        try {
            const results = await this.executeScript<TempestSearchResult>(async (query) => {
                const response = await fetch("https://juratempe.st/api/rpc/search/manga", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        json: {
                            q: query,
                            limit: 20,
                            offset: 0,
                        },
                    }),
                });
                return await response.json();
            }, title);

            if (results?.json?.hits) {
                return results.json.hits.map((manga) => ({
                    title: manga.titleJpRomaji || manga.titleTr || manga.titleEn || manga.slug,
                    titleTr: manga.titleTr,
                    titleEn: manga.titleEn,
                    titleJp: manga.titleJp,
                    url: `${this.baseUrl}/explore/${manga.slug}`,
                    provider: this.name,
                    latestChapter: "",
                    summary: manga.synopsis || manga.description,
                    genres: manga.genres ? manga.genres.map((g) => g.name).join(", ") : "",
                    demographic: manga.demographic,
                    releaseDate: manga.releaseDate,
                    status: manga.seriesStatus,
                    coverImageUrl: manga.coverImageUrl,
                }));
            }
            return [];
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[${this.name}] Arama hatası: ${msg}`);
            return [];
        }
    }

    async getChapters(mangaUrl: string): Promise<Chapter[] & { metadata?: Partial<Manga> }> {
        let page: PuppeteerPage | null = null;
        try {
            await this._ensureBrowser();

            const parts = mangaUrl.split("/");
            const mangaSlug = parts.pop();

            if (!mangaSlug) {
                throw new Error(`Geçersiz manga URL'i: ${mangaUrl}`);
            }

            page = await this._createNewPage();

            await page.goto(mangaUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            const apiResult = (await page.evaluate(async (slug: string) => {
                const response = await fetch("https://juratempe.st/api/rpc/chapter/byMangaSlug", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        json: {
                            slug: slug,
                        },
                    }),
                });
                return await response.json();
            }, mangaSlug)) as TempestChaptersResponse;

            const chaptersList = apiResult?.json || [];

            const chapters: Chapter[] = chaptersList.map((ch) => ({
                title: ch.title || `Bölüm ${ch.slug}`,
                url: `${mangaUrl}/${ch.slug}`,
                number: ch.number,
            }));

            const sorted = chapters.sort((a, b) => a.number - b.number);
            return sorted as Chapter[] & { metadata?: Partial<Manga> };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[${this.name}] Bölüm alma hatası: ${msg}`);
            return [] as Chapter[] & { metadata?: Partial<Manga> };
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch {
                    // ignore
                }
            }
        }
    }

    async getChapterImages(chapterUrl: string): Promise<string[]> {
        let page: PuppeteerPage | null = null;
        try {
            await this._ensureBrowser();

            const parts = chapterUrl.split("/");
            const chapterSlug = parts.pop();
            const mangaSlug = parts.pop();

            if (!mangaSlug || !chapterSlug) {
                throw new Error(`Geçersiz bölüm URL'i: ${chapterUrl}`);
            }

            page = await this._createNewPage();

            await page.goto(chapterUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            const apiResult = (await page.evaluate(
                async (mSlug: string, cSlug: string) => {
                    const response = await fetch(
                        "https://juratempe.st/api/rpc/release/byChapterSlug",
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                json: {
                                    mangaSlug: mSlug,
                                    chapterSlug: cSlug,
                                },
                            }),
                        },
                    );
                    return await response.json();
                },
                mangaSlug,
                chapterSlug,
            )) as TempestChapterImagesResponse;

            const releases = apiResult?.json || [];
            const pages = releases[0]?.pages || [];

            if (pages.length === 0) {
                logger.warn(
                    `[${this.name}] Resim bulunamadı. API yanıtı: ${JSON.stringify(apiResult)}`,
                );
            }

            return pages.sort((a, b) => a.number - b.number).map((p) => p.imageUrl);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`[${this.name}] Resimleri alma hatası: ${msg} (Konum: ${chapterUrl})`);
            return [];
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch {
                    // ignore
                }
            }
        }
    }
}

export default TempestMangasProvider;
