const os = require("os");
const { connect } = require("puppeteer-real-browser");
const axios = require("axios").default;
const cheerio = require("cheerio");

class MangaTrProvider {
    constructor() {
        this.name = "MangaTR";
        this.baseUrl = "https://manga-tr.com";
        this.browser = null;
        this.page = null;
        this.cookieString = "";
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
        this.cachedContainersMap = new Map();
    }

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

    getDownloadHeaders(chapterUrl) {
        return {
            Referer: chapterUrl || this.baseUrl,
            Origin: this.baseUrl,
            "User-Agent": this.userAgent,
            cookie: this.cookieString,
        };
    }

    async _ensureBrowser() {
        if (this.browser) {
            try {
                await this.browser.version();
                return;
            } catch {
                this.browser = null;
                this.page = null;
            }
        }

        const isLinux = os.platform() === "linux";
        try {
            const { browser, page } = await connect({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                executablePath: isLinux
                    ? "/usr/bin/chromium-browser"
                    : undefined,
            });

            this.browser = browser;
            this.page = page;

            this.browser.on("targetcreated", async (target) => {
                try {
                    if (target.type() === "page") {
                        const newPage = await target.page();
                        if (newPage) {
                            newPage.on("framenavigated", async (frame) => {
                                if (frame === newPage.mainFrame()) {
                                    const url = newPage.url();
                                    if (
                                        url &&
                                        !url.includes("manga-tr.com") &&
                                        url !== "about:blank"
                                    ) {
                                        try {
                                            await newPage.close();
                                        } catch {
                                            //ignore
                                        }
                                    }
                                }
                            });
                        }
                    }
                } catch {
                    //ignore
                }
            });

            await this.page.goto(this.baseUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            try {
                await this.page.evaluate(() => {
                    return !!(
                        document.querySelector("#navbar-search-input") ||
                        document.querySelector("#sidebar-search-input")
                    );
                });
            } catch (e) {
                console.error(e);
            }

            this.userAgent = await this.page.evaluate(
                () => navigator.userAgent,
            );

            const cookies = await this.page.cookies(
                "https://manga-tr.com",
                "https://check.ddos-guard.net",
            );
            const docCookie = await this.page.evaluate(() => document.cookie);

            const cookieMap = new Map();
            if (docCookie) {
                docCookie.split(";").forEach((c) => {
                    const parts = c.split("=");
                    if (parts.length === 2) {
                        cookieMap.set(parts[0].trim(), parts[1].trim());
                    }
                });
            }
            cookies.forEach((c) => {
                cookieMap.set(c.name, c.value);
            });

            this.cookieString = Array.from(cookieMap.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join("; ");
        } catch (error) {
            console.error(
                `[${this.name}] Puppeteer başlatılamadı veya çerezler alınamadı: ${error.message}`,
            );
            throw error;
        }
    }

    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {
                console.error(`[${this.name}] Tarayıcı kapatılamadı:`, e);
            }
            this.browser = null;
            this.page = null;
        }
    }

    async search(title) {
        try {
            if (!this.cookieString) {
                await this._ensureBrowser();
            }

            const options = {
                method: "GET",
                url: `${this.baseUrl}/search.single.php`,
                params: { q: title },
                headers: {
                    cookie: this.cookieString,
                    "x-requested-with": "XMLHttpRequest",
                    accept: "application/json, text/javascript, */*; q=0.01",
                    "user-agent": this.userAgent,
                    referer: `${this.baseUrl}/`,
                },
            };

            let response;
            try {
                response = await axios.request(options);
            } catch (err) {
                if (err.response && err.response.status === 403) {
                    await this.closeBrowser();
                    await this._ensureBrowser();
                    options.headers.cookie = this.cookieString;
                    options.headers["user-agent"] = this.userAgent;
                    response = await axios.request(options);
                } else {
                    throw err;
                }
            }

            const searchResult = response.data;
            if (!Array.isArray(searchResult)) return [];

            const mangaSection = searchResult.find(
                (section) => section?.header?.title?.toLowerCase() === "manga",
            );

            if (mangaSection && Array.isArray(mangaSection.data)) {
                return mangaSection.data
                    .map((manga) => {
                        let relativeUrl = "";
                        if (manga.onclick) {
                            const match = manga.onclick.match(
                                /window\.location='([^']+)'/,
                            );
                            relativeUrl = match
                                ? match[1]
                                : manga.onclick.split("'")[1];
                        }

                        return {
                            title: manga.primary,
                            url: relativeUrl
                                ? `${this.baseUrl}/${relativeUrl}`
                                : "",
                            provider: this.name,
                            latestChapter: "",
                            coverImageUrl: manga.image,
                        };
                    })
                    .filter((m) => m.url);
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

            for (let attempt = 0; attempt < 30; attempt++) {
                const pageTitle = await page.title();
                if (
                    pageTitle &&
                    !pageTitle.includes("Siteye Bağlanılıyor") &&
                    !pageTitle.includes("DDoS-Guard")
                ) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            const pageData = await page.evaluate(async (baseUrl) => {
                const htmlContent = document.documentElement.outerHTML;
                const keyMatch = htmlContent.match(
                    /const initialChapterListKey = '([^']+)';/,
                );

                if (!keyMatch || !keyMatch[1]) {
                    return { error: "initialChapterListKey bulunamadı." };
                }

                const initialChapterListKey = keyMatch[1];
                let offset = 0;
                const limit = 100;
                const rawChapters = [];
                let hasMore = true;

                while (hasMore) {
                    try {
                        const response = await fetch(
                            `${baseUrl}/cek/fetch_pages_manga.php`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/x-www-form-urlencoded",
                                    "X-Requested-With": "XMLHttpRequest",
                                },
                                body: new URLSearchParams({
                                    chapter_list_key: initialChapterListKey,
                                    offset: String(offset),
                                }).toString(),
                            },
                        );

                        const htmlData = await response.text();
                        if (!htmlData || htmlData.trim() === "") {
                            hasMore = false;
                            break;
                        }

                        const parser = new DOMParser();
                        const doc = parser.parseFromString(
                            htmlData,
                            "text/html",
                        );
                        const links = Array.from(doc.querySelectorAll("a"));
                        const pageChaptersCountBefore = rawChapters.length;

                        links.forEach((el, i) => {
                            const text = el.textContent
                                ? el.textContent.trim()
                                : "";
                            const href = el.getAttribute("href") || "";

                            if (
                                href.includes("-read-") &&
                                !text.toLowerCase().includes("ilk bölüm") &&
                                !text.toLowerCase().includes("son bölüm")
                            ) {
                                const numberMatch = text.match(/(\d+(\.\d+)?)/);
                                const number = numberMatch
                                    ? parseFloat(numberMatch[1])
                                    : i;

                                const chapterUrl = href.startsWith("http")
                                    ? href
                                    : `${baseUrl}/${href.startsWith("/") ? href.substring(1) : href}`;

                                rawChapters.push({
                                    title: text,
                                    url: chapterUrl,
                                    number: number,
                                });
                            }
                        });

                        const newChaptersFound =
                            rawChapters.length - pageChaptersCountBefore;
                        if (newChaptersFound === 0) {
                            hasMore = false;
                        } else {
                            if (offset === 0) {
                                offset = 20;
                            } else {
                                offset += limit;
                            }
                        }
                    } catch (e) {
                        return {
                            error: `Bölümler fetch edilirken hata oluştu: ${e.message}`,
                        };
                    }
                }

                return {
                    htmlContent,
                    rawChapters,
                };
            }, this.baseUrl);

            if (pageData.error) {
                throw new Error(pageData.error);
            }

            const { htmlContent, rawChapters } = pageData;
            const chapters = [];
            const seenUrls = new Set();

            rawChapters
                .sort((a, b) => a.number - b.number)
                .forEach((ch) => {
                    if (!seenUrls.has(ch.url)) {
                        seenUrls.add(ch.url);
                        chapters.push(ch);
                    }
                });

            try {
                const jsonLdMatch = htmlContent.match(
                    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
                );
                if (jsonLdMatch && jsonLdMatch[1]) {
                    const jsonLd = JSON.parse(jsonLdMatch[1]);

                    let releaseDate = "";
                    const yearMatch = htmlContent.match(
                        /<div class="bento-hero-meta">[\s\S]*?<span>(\d{4})<\/span>/,
                    );
                    if (yearMatch && yearMatch[1]) {
                        releaseDate = `${yearMatch[1]}-01-01`;
                    }

                    chapters.metadata = {
                        summary: jsonLd.description || "",
                        genres: Array.isArray(jsonLd.genre)
                            ? jsonLd.genre.join(", ")
                            : jsonLd.genre || "",
                        releaseDate,
                        status: "Continuing",
                        titleTr: jsonLd.name || "",
                    };
                }
            } catch {
                // ignore
            }

            return chapters;
        } catch (error) {
            console.error(
                `[${this.name}] Bölüm çekme hatası: ${error.message}`,
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

    async getChapterImages(chapterUrl) {
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            let page = null;
            try {
                await this._ensureBrowser();

                page = await this._createNewPage();
                await page.goto(chapterUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000,
                });

                for (let t = 0; t < 30; t++) {
                    const chapterTitle = await page.title();
                    if (
                        chapterTitle &&
                        !chapterTitle.includes("Siteye Bağlanılıyor") &&
                        !chapterTitle.includes("DDoS-Guard")
                    ) {
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));

                const result = await page.evaluate(() => {
                    let pageAttr = "";
                    const allElements = Array.from(
                        document.querySelectorAll("*"),
                    );
                    for (const el of allElements) {
                        const attrs = el.attributes;
                        for (let i = 0; i < attrs.length; i++) {
                            const name = attrs[i].name;
                            if (
                                name.startsWith("data-") &&
                                attrs[i].value === "0"
                            ) {
                                pageAttr = name;
                                break;
                            }
                        }
                        if (pageAttr) break;
                    }

                    if (!pageAttr)
                        return {
                            error: "Sayfa indeksini tutan dinamik data-* özniteliği bulunamadı.",
                        };

                    const containers = Array.from(
                        document.querySelectorAll(`div[${pageAttr}]`),
                    );
                    containers.sort((a, b) => {
                        const idxA = parseInt(
                            a.getAttribute(pageAttr) || "0",
                            10,
                        );
                        const idxB = parseInt(
                            b.getAttribute(pageAttr) || "0",
                            10,
                        );
                        return idxA - idxB;
                    });

                    const bgImages = [];
                    const containerHtmls = [];

                    containers.forEach((container) => {
                        let imgUrl = "";
                        const divs = Array.from(
                            container.querySelectorAll("div"),
                        );
                        for (const div of divs) {
                            const bg = div.style.backgroundImage;
                            if (bg && bg.includes("img_part.php")) {
                                imgUrl = bg
                                    .replace(/url\(["']?|["']?\)/g, "")
                                    .trim();
                                break;
                            }
                        }

                        if (imgUrl) {
                            bgImages.push(imgUrl);
                            containerHtmls.push(container.outerHTML);
                        }
                    });

                    return {
                        bgImages,
                        containerHtmls,
                    };
                });

                if (result.error) {
                    throw new Error(result.error);
                }

                if (!this.cachedContainersMap)
                    this.cachedContainersMap = new Map();
                this.cachedContainersMap.set(
                    chapterUrl,
                    result.containerHtmls || [],
                );
                return result.bgImages || [];
            } catch (err) {
                lastError = err;
                await new Promise((resolve) =>
                    setTimeout(resolve, attempt * 1000 + Math.random() * 1000),
                );
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
        return [];
    }

    async scrambleResolver(imagePath, index, chapterUrl) {
        try {
            if (!this.cachedContainersMap) this.cachedContainersMap = new Map();
            const containers = this.cachedContainersMap.get(chapterUrl);
            if (containers && containers[index]) {
                const containerHtml = containers[index];
                const fs = require("fs");
                const {
                    decodeMangaTrPage,
                } = require("../utils/scrambleResolver");

                const scrambledBuffer = fs.readFileSync(imagePath);
                const decodedBuffer = await decodeMangaTrPage(
                    scrambledBuffer,
                    containerHtml,
                );
                fs.writeFileSync(imagePath, decodedBuffer);
            }
        } catch {
            //ignore
        }
    }
}

module.exports = MangaTrProvider;
