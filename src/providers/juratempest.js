const os = require("os");
const { connect } = require("puppeteer-real-browser");

class TempestMangasProvider {
    constructor() {
        this.name = "TempestMangas";
        this.baseUrl = "https://juratempe.st";
        this.browser = null;
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    }

    getDownloadHeaders(chapterUrl) {
        return {
            Referer: chapterUrl || this.baseUrl,
            Origin: this.baseUrl,
            "User-Agent": this.userAgent,
        };
    }

    async _ensureBrowser() {
        if (this.browser) {
            try {
                await this.browser.version();
                return;
            } catch (e) {
                this.browser = null;
            }
        }

        const isLinux = os.platform() === "linux";
        try {
            const { browser } = await connect({
                headless: false, // Görsel takip için false bırakıldı
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                executablePath: isLinux
                    ? "/usr/bin/chromium-browser"
                    : undefined,
            });

            this.browser = browser;

            // REKLAM/POPUP ENGELLEYİCİ: Yeni açılan alakasız sekmeleri otomatik tespit edip kapat
            this.browser.on("targetcreated", async (target) => {
                try {
                    if (target.type() === "page") {
                        const newPage = await target.page();
                        if (newPage) {
                            // URL yönlendirmelerini takip et
                            newPage.on("framenavigated", async (frame) => {
                                if (frame === newPage.mainFrame()) {
                                    const url = newPage.url();
                                    if (url && !url.includes("juratempe.st") && url !== "about:blank") {
                                        try {
                                            await newPage.close();
                                            console.log(`[${this.name}] Reklam sekmesi engellendi ve kapatıldı: ${url}`);
                                        } catch {
                                            // ignore
                                        }
                                    }
                                }
                            });

                            const url = newPage.url();
                            if (url && !url.includes("juratempe.st") && url !== "about:blank") {
                                await newPage.close();
                                console.log(`[${this.name}] Reklam sekmesi engellendi ve kapatıldı: ${url}`);
                            }
                        }
                    }
                } catch {
                    // ignore
                }
            });

            const tempPage = await this._createNewPage();
            this.userAgent = await tempPage.evaluate(() => navigator.userAgent);
            await tempPage.close();
        } catch (error) {
            console.error(
                `[${this.name}] Puppeteer başlatılamadı: ${error.message}`,
            );
            throw error;
        }
    }

    // JS tabanlı window.open reklamlarını bloke eden güvenli sayfa oluşturucu
    async _createNewPage() {
        const page = await this.browser.newPage();
        try {
            await page.evaluateOnNewDocument(() => {
                window.open = () => {
                    console.log("window.open engellendi.");
                    return { focus: () => {} };
                };
            });
        } catch {
            // ignore
        }
        return page;
    }

    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {
                console.error(`[${this.name}] Tarayıcı kapatılamadı:`, e);
            }
            this.browser = null;
        }
    }

    async executeScript(fn, ...args) {
        await this._ensureBrowser();
        let page = null;
        try {
            page = await this._createNewPage();
            await page.goto(this.baseUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });
            return await page.evaluate(fn, ...args);
        } catch (error) {
            console.error(
                `[${this.name}] Sayfa içi kod çalıştırma hatası: ${error.message}`,
            );
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

    async search(title) {
        try {
            const results = await this.executeScript(async (query) => {
                const response = await fetch(
                    "https://juratempe.st/api/rpc/search/manga",
                    {
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
                    },
                );
                return await response.json();
            }, title);

            if (results?.json?.hits) {
                return results.json.hits.map((manga) => ({
                    title:
                        manga.titleJpRomaji ||
                        manga.titleTr ||
                        manga.titleEn ||
                        manga.slug,
                    titleTr: manga.titleTr,
                    titleEn: manga.titleEn,
                    titleJp: manga.titleJp,
                    url: `${this.baseUrl}/explore/${manga.slug}`,
                    provider: this.name,
                    latestChapter: "",
                    // ComicInfo.xml için zenginleştirilmiş veri
                    summary: manga.synopsis || manga.description,
                    genres: manga.genres
                        ? manga.genres.map((g) => g.name).join(", ")
                        : "",
                    demographic: manga.demographic,
                    releaseDate: manga.releaseDate,
                    status: manga.seriesStatus,
                }));
            }
            return [];
        } catch (error) {
            console.error(`[${this.name}] Arama hatası: ${error.message}`);
            return [];
        }
    }

    async getChapters(mangaUrl) {
        let page = null;
        try {
            await this._ensureBrowser();
            page = await this._createNewPage();

            await page.goto(mangaUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            try {
                await page.waitForSelector("a[data-slot='chapter-row']", {
                    timeout: 15000,
                });
            } catch (e) {
                const title = await page.title();
                const bodyText = await page.evaluate(() =>
                    document.body.innerText.substring(0, 300),
                );
                console.warn(
                    `\n[${this.name}] Bölüm listesi yüklenmesi beklenirken zaman aşımı oluştu. ` +
                        `Sayfa Başlığı: "${title}". İçerik: "${bodyText.replace(/\n/g, " ").trim()}"\n`,
                );
            }

            const allChapters = [];
            let hasNextPage = true;
            let safetyCounter = 0;
            const maxPages = 50;

            while (hasNextPage && safetyCounter < maxPages) {
                safetyCounter++;

                const pageChapters = await page.evaluate((mUrl) => {
                    const results = [];
                    const mangaSlug = mUrl.split("/").pop();

                    let links = Array.from(
                        document.querySelectorAll("a[data-slot='chapter-row']"),
                    );
                    if (links.length === 0) {
                        links = Array.from(document.querySelectorAll("a"));
                    }

                    for (const link of links) {
                        const href = link.href;
                        if (!href) continue;

                        const regex = new RegExp(
                            `/explore/${mangaSlug}/([^/]+)$`,
                        );
                        const match = href.match(regex);

                        if (match) {
                            const chapterSlug = match[1];
                            if (
                                ["edit", "delete", "reviews"].includes(
                                    chapterSlug,
                                )
                            )
                                continue;

                            const text = link.innerText.trim();
                            let number = parseFloat(
                                chapterSlug.replace(/-/g, "."),
                            );
                            if (isNaN(number)) {
                                const numMatch = text.match(/(\d+(\.\d+)?)/);
                                number = numMatch ? parseFloat(numMatch[1]) : 0;
                            }

                            results.push({
                                title: text || `Bölüm ${chapterSlug}`,
                                url: href,
                                number: number,
                            });
                        }
                    }
                    return results;
                }, mangaUrl);

                allChapters.push(...pageChapters);

                const nextButtonHandle = await page.evaluateHandle(() => {
                    const allButtons = Array.from(
                        document.querySelectorAll(
                            "button[data-slot='button'], a[data-slot='button']",
                        ),
                    );
                    const page1Btn = allButtons.find(
                        (b) => b.innerText.trim() === "1",
                    );
                    if (!page1Btn) return null;

                    const container =
                        page1Btn.closest("nav") || page1Btn.parentElement;
                    if (!container) return null;

                    const navButtons = Array.from(
                        container.querySelectorAll(
                            "button[data-slot='button'], a[data-slot='button']",
                        ),
                    );
                    if (navButtons.length < 2) return null;

                    const btn = navButtons[navButtons.length - 1];

                    if (
                        btn &&
                        btn.innerText.trim() !== "1" &&
                        !btn.disabled &&
                        !btn.classList.contains("disabled") &&
                        btn.getAttribute("aria-disabled") !== "true"
                    ) {
                        return btn;
                    }
                    return null;
                });

                const nextButton = nextButtonHandle.asElement();
                if (nextButton) {
                    const firstItemBefore = await page.evaluate(() => {
                        const el = document.querySelector(
                            "a[data-slot='chapter-row']",
                        );
                        return el ? el.href : null;
                    });

                    await nextButton.click();
                    await nextButtonHandle.dispose();

                    let loaded = false;
                    for (let check = 0; check < 30; check++) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 200),
                        );
                        const firstItemAfter = await page.evaluate(() => {
                            const el = document.querySelector(
                                "a[data-slot='chapter-row']",
                            );
                            return el ? el.href : null;
                        });

                        if (
                            firstItemAfter &&
                            firstItemAfter !== firstItemBefore
                        ) {
                            loaded = true;
                            break;
                        }
                    }

                    if (!loaded) {
                        hasNextPage = false;
                    }
                } else {
                    await nextButtonHandle.dispose();
                    hasNextPage = false;
                }
            }

            const uniqueChapters = [];
            const seenUrls = new Set();
            for (const ch of allChapters) {
                if (!seenUrls.has(ch.url)) {
                    seenUrls.add(ch.url);
                    uniqueChapters.push(ch);
                }
            }

            return uniqueChapters.sort((a, b) => a.number - b.number);
        } catch (error) {
            console.error(`[${this.name}] Bölüm alma hatası: ${error.message}`);
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

    async getChapterImages(chapterUrl) {
        let page = null;
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

            const apiResult = await page.evaluate(
                async (mSlug, cSlug) => {
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
            );

            const releases = apiResult?.json || [];
            const pages = releases[0]?.pages || [];

            if (pages.length === 0) {
                console.warn(
                    `[${this.name}] Resim bulunamadı. API yanıtı:`,
                    JSON.stringify(apiResult),
                );
            }

            return pages
                .sort((a, b) => a.number - b.number)
                .map((page) => page.imageUrl);
        } catch (error) {
            console.error(
                `[${this.name}] Resimleri alma hatası: ${error.message} (Konum: ${chapterUrl})`,
            );
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

module.exports = TempestMangasProvider;
