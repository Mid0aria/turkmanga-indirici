const axios = require("axios");
const cheerio = require("cheerio");

class WebtoonTrProvider {
    constructor() {
        this.name = "WebtoonTR";
        this.baseUrl = "https://webtoontr.net";
        this.searchUrl = "https://webtoontr.net/wp-admin/admin-ajax.php";
    }

    getDownloadHeaders(chapterUrl) {
        return {
            Referer: chapterUrl || this.baseUrl,
        };
    }

    _extractChapterNumber(title) {
        const match = title.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[0]) : 0;
    }

    async search(title) {
        try {
            const response = await axios.post(
                this.searchUrl,
                `action=wp-manga-search-manga&title=${encodeURIComponent(
                    title,
                )}`,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            );

            if (response.data.success && response.data.data.length > 0) {
                return response.data.data.map((manga) => ({
                    title: manga.title,
                    url: manga.url,
                    provider: this.name,
                    latestChapter: "Bilinmiyor", // Bu API son bölüm bilgisini vermiyor
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

            $("li.wp-manga-chapter").each((_, element) => {
                const linkElement = $(element).find("a");
                const chapterLink = linkElement.attr("href");
                const chapterTitle = linkElement.text().trim();

                if (chapterLink && chapterTitle) {
                    chapters.push({
                        title: chapterTitle,
                        url: chapterLink,
                        number: this._extractChapterNumber(chapterTitle),
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
            const images = [];

            $(".reading-content img, .read-container img").each(
                (_, element) => {
                    const imgSrc =
                        $(element).attr("src")?.trim() ||
                        $(element).attr("data-src")?.trim();
                    if (imgSrc) {
                        images.push(imgSrc);
                    }
                },
            );

            return images.filter(Boolean);
        } catch (error) {
            console.error(
                `[${this.name}] Resim URL'lerini alma hatası: ${error.message}`,
            );
            return [];
        }
    }
}

module.exports = WebtoonTrProvider;
