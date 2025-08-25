const axios = require("axios");
const cheerio = require("cheerio");
const { connect } = require("puppeteer-real-browser");
const { URLSearchParams } = require("url");
const prompts = require("../ui/prompts");
const logger = require("../ui/logger");

class MangaTRProvider {
    constructor() {
        this.name = "MangaTR";
        this.baseUrl = "https://manga-tr.com";
        this.searchUrl =
            "https://manga-tr.com/app/manga/controllers/search.single.php?q=";

        this.session = {
            cookies: null,
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        };
    }

    async _initializeSession() {
        let browser, page;
        try {
            ({ browser, page } = await connect({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            }));

            await page.setUserAgent(this.session.userAgent);

            await page.goto(this.baseUrl, {
                waitUntil: "networkidle0",
                timeout: 90000,
            });

            let isPageReady = false;
            const maxAttempts = 30;
            const checkInterval = 2000;
            let attempts = 0;

            while (!isPageReady && attempts < maxAttempts) {
                attempts++;

                try {
                    isPageReady = await page.evaluate(() => {
                        const searchText = "aramak için manga adını yazın";
                        // eslint-disable-next-line no-undef
                        return document.body.innerText
                            .toLowerCase()
                            .includes(searchText);
                    });

                    if (isPageReady) break;
                    // eslint-disable-next-line no-empty
                } catch {}

                if (!isPageReady) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, checkInterval),
                    );
                }
            }

            if (!isPageReady) {
                throw new Error(
                    `Sayfa ${maxAttempts} denemeden sonra doğrulanamadı. Anahtar metin bulunamadı.`,
                );
            }

            const cookies = await page.cookies();
            this.session.cookies = cookies
                .map((c) => `${c.name}=${c.value}`)
                .join("; ");
        } catch {
            this.session = { cookies: null, userAgent: null };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async _ensureSession() {
        if (!this.session.cookies || !this.session.userAgent) {
            await this._initializeSession();
        }
    }

    _getRequestHeaders(referer = this.baseUrl) {
        if (!this.session.cookies || !this.session.userAgent) {
            throw new Error(
                "Oturum başlatılmamış. _ensureSession() çağrılmalı.",
            );
        }
        return {
            "User-Agent": this.session.userAgent,
            Cookie: this.session.cookies,
            Referer: referer,
        };
    }

    getDownloadHeaders(chapterUrl) {
        return this._getRequestHeaders(chapterUrl);
    }

    async search(title) {
        try {
            await this._ensureSession();
            const response = await axios.get(
                `${this.searchUrl}${encodeURIComponent(title)}`,
                {
                    headers: {
                        ...this._getRequestHeaders(),
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                },
            );

            if (response.data?.[0]?.data?.length > 0) {
                return response.data[0].data.map((manga) => {
                    const match = manga.onclick.match(/'([^']+)'/);
                    const fullUrl = match ? `${this.baseUrl}/${match[1]}` : "";

                    return {
                        title: manga.primary,
                        url: fullUrl,
                        provider: this.name,
                        latestChapter: manga.post_latest,
                    };
                });
            }

            return [];
        } catch (error) {
            console.error(`[${this.name}] Arama hatası: ${error.message}`);
            return [];
        }
    }

    async getChapters(mangaUrl) {
        try {
            await this._ensureSession();

            // "https://manga-tr.com/manga-infinite-mana.html" -> "infinite-mana"
            const mangaSlug = mangaUrl
                .split("/")
                .pop()
                .replace("manga-", "")
                .replace(".html", "");
            if (!mangaSlug) {
                throw new Error(
                    `Manga slug'ı URL'den çıkarılamadı: ${mangaUrl}`,
                );
            }

            const chaptersAjaxUrl = `${this.baseUrl}/cek/fetch_pages_manga.php?manga_cek=${mangaSlug}`;

            const initialResponse = await axios.get(chaptersAjaxUrl, {
                headers: {
                    ...this._getRequestHeaders(mangaUrl),
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            let allChaptersHtml = initialResponse.data;
            const $ = cheerio.load(allChaptersHtml);

            let lastPage = 1;
            const lastPageElement = $(".pagination1 a[title='Last']");
            if (lastPageElement.length > 0) {
                lastPage = parseInt(lastPageElement.attr("data-page"), 10);
            } else {
                $(".pagination1 a[data-page]").each((_, el) => {
                    const pageNum = parseInt($(el).attr("data-page"), 10);
                    if (!isNaN(pageNum) && pageNum > lastPage)
                        lastPage = pageNum;
                });
            }
            if (lastPage > 1) {
                for (let i = 2; i <= lastPage; i++) {
                    const postData = new URLSearchParams();
                    postData.append("page", i.toString());
                    const pageResponse = await axios.post(
                        chaptersAjaxUrl,
                        postData,
                        {
                            headers: {
                                ...this._getRequestHeaders(mangaUrl),
                                "Content-Type":
                                    "application/x-www-form-urlencoded; charset=UTF-8",
                                "X-Requested-With": "XMLHttpRequest",
                            },
                        },
                    );
                    allChaptersHtml += pageResponse.data;
                }
            }

            const final$ = cheerio.load(allChaptersHtml);
            const allRawChapters = [];
            final$("tr.table-bordered.tbm").each((_, element) => {
                const row = final$(element);
                const linkElement = row.find("td:first-child a");
                const chapterUrl = linkElement.attr("href");
                const chapterTitle = linkElement.find("b").text().trim();
                const fansubName =
                    row.find("td:nth-child(2) a.fansub-r").text().trim() ||
                    "Bilinmiyor";

                if (chapterUrl && chapterTitle) {
                    const numberMatch = chapterTitle.match(/ (\d+(\.\d+)?)$/);
                    const chapterNumber = numberMatch
                        ? parseFloat(numberMatch[1])
                        : -1;
                    if (chapterNumber !== -1) {
                        allRawChapters.push({
                            title: chapterTitle,
                            url: `${this.baseUrl}/${chapterUrl}`,
                            number: chapterNumber,
                            fansub: fansubName,
                        });
                    }
                }
            });

            if (allRawChapters.length === 0) return [];

            const groupedByNumber = allRawChapters.reduce((acc, chapter) => {
                const { number } = chapter;
                if (!acc[number]) {
                    acc[number] = [];
                }
                if (!acc[number].some((c) => c.fansub === chapter.fansub)) {
                    acc[number].push(chapter);
                }
                return acc;
            }, {});

            const finalChapterList = [];
            const chapterNumbers = Object.keys(groupedByNumber)
                .map(parseFloat)
                .sort((a, b) => a - b);

            for (const number of chapterNumbers) {
                const availableTranslations = groupedByNumber[number];

                if (availableTranslations.length === 1) {
                    finalChapterList.push(availableTranslations[0]);
                } else {
                    logger.info(
                        `Bölüm ${number} için ${availableTranslations.length} farklı çeviri bulundu:`,
                    );

                    const choices = availableTranslations.map((ch) => ({
                        name: `Fansub: ${ch.fansub.padEnd(20)} | Başlık: ${ch.title}`,
                        value: ch,
                    }));
                    choices.push({ name: "Bu bölümü atla", value: "skip" });

                    const { selectedChapter } = await prompts.customPrompt([
                        {
                            type: "list",
                            name: "selectedChapter",
                            message: `Bölüm ${number} için hangi çeviriyi kullanmak istersin?`,
                            choices: choices,
                            pageSize: choices.length,
                        },
                    ]);

                    if (selectedChapter !== "skip") {
                        finalChapterList.push(selectedChapter);
                    } else {
                        logger.warn(
                            `Bölüm ${number} kullanıcı tarafından atlandı.`,
                        );
                    }
                }
            }

            return finalChapterList;
        } catch (error) {
            console.error(`[${this.name}] Bölüm alma hatası: ${error.message}`);
            return [];
        }
    }

    async getChapterImages(chapterUrl) {
        try {
            await this._ensureSession();

            const response = await axios.get(chapterUrl, {
                headers: this._getRequestHeaders(chapterUrl),
            });

            const $ = cheerio.load(response.data);
            const images = [];

            $("div.chapter-content img.chapter-img").each((_, element) => {
                const dataSrc = $(element).attr("data-src");

                if (
                    dataSrc &&
                    typeof dataSrc === "string" &&
                    dataSrc.trim() !== ""
                ) {
                    try {
                        const decodedUrl = Buffer.from(
                            dataSrc.trim(),
                            "base64",
                        ).toString("utf-8");
                        images.push(decodedUrl);
                    } catch (e) {
                        console.warn("Base64 decode hatası:", e.message);
                    }
                }
            });

            if (images.length === 0) {
                console.warn(
                    `[${this.name}] Bu bölüm için resim bulunamadı: ${chapterUrl}. Sayfa yapısı değişmiş olabilir.`,
                );
            }

            return images;
        } catch (error) {
            console.error(
                `[${this.name}] Resim URL'lerini alma hatası: ${error.message}`,
            );
            return [];
        }
    }
}

module.exports = MangaTRProvider;
