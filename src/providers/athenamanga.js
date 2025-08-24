const axios = require("axios");
const cheerio = require("cheerio");

class AthenaMangaProvider {
    constructor() {
        this.name = "AthenaManga";
        this.baseUrl = "https://athenamanga.com";
        this.searchUrl = "https://athenamanga.com/wp-admin/admin-ajax.php";
    }

    /**
     * Helper function to extract chapter number from a title string.
     * @param {string} title - The chapter title (e.g., "Bölüm 125")
     * @returns {number} - The extracted chapter number (e.g., 125)
     */
    _extractChapterNumber(title) {
        const match = title.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[0]) : 0;
    }

    getDownloadHeaders(chapterUrl) {
        return {
            Referer: chapterUrl || this.baseUrl,
        };
    }

    async search(title) {
        try {
            const response = await axios.post(
                this.searchUrl,
                `action=ts_ac_do_search&ts_ac_query=${encodeURIComponent(
                    title,
                ).replace(/%20/g, "+")}`,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            );

            if (response.data?.series?.[0]?.all?.length > 0) {
                return response.data.series[0].all.map((manga) => ({
                    title: manga.post_title,
                    url: manga.post_link,
                    provider: this.name,
                    latestChapter: manga.post_latest,
                }));
            }
            return [];
        } catch (error) {
            console.error(`[${this.name}] Arama hatası: ${error.message}`);
            return [];
        }
    }

    async getChapters(mangaUrl) {
        try {
            const response = await axios.get(mangaUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            });
            const $ = cheerio.load(response.data);
            const chapters = [];

            $("#chapterlist li").each((_, element) => {
                const linkElement = $(element).find("a");
                const chapterLink = linkElement.attr("href");
                const chapterTitle = linkElement
                    .find("span.chapternum")
                    .text()
                    .trim();
                const chapterNumber = parseFloat($(element).data("num"));

                if (chapterLink && chapterTitle && !isNaN(chapterNumber)) {
                    chapters.push({
                        title: chapterTitle,
                        url: chapterLink,
                        number: chapterNumber,
                    });
                }
            });

            return chapters.sort((a, b) => a.number - b.number);
        } catch (error) {
            console.error(`[${this.name}] Bölüm alma hatası: ${error.message}`);
            return [];
        }
    }

    async getChapterImages(chapterUrl) {
        try {
            const response = await axios.get(chapterUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            });
            const $ = cheerio.load(response.data);
            let images = [];

            $("script").each((_, element) => {
                const scriptContent = $(element).html();
                if (scriptContent?.includes("ts_reader.run")) {
                    const match = scriptContent.match(
                        /ts_reader\.run\((.*)\);/,
                    );
                    if (match?.[1]) {
                        try {
                            const readerData = JSON.parse(match[1]);
                            if (readerData.sources?.[0]?.images) {
                                images = readerData.sources[0].images;
                                return false;
                            }
                        } catch {
                            /* Hata olursa görmezden gel, yedek yönteme geç */
                        }
                    }
                }
            });

            if (images.length === 0) {
                $("#readerarea img.ts-main-image").each((_, element) => {
                    const imgSrc =
                        $(element).attr("src") || $(element).attr("data-src");
                    if (imgSrc) images.push(imgSrc.trim());
                });
            }

            return images.filter(
                (url) => typeof url === "string" && url.trim() !== "",
            );
        } catch (error) {
            console.error(
                `[${this.name}] Resim URL'lerini alma hatası: ${error.message}`,
            );
            return [];
        }
    }
}

module.exports = AthenaMangaProvider;
