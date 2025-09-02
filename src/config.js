const path = require("path");

module.exports = {
    DOWNLOAD_DIR: path.join(
        process.env.USERPROFILE || process.env.HOME,
        "Downloads",
        "MangaDownloads",
    ),
    PROVIDERS_DIR: path.join(__dirname, "providers"),
    MAX_CHAPTER_CONCURRENCY: 5, // Bölümlerin aynı anda indirilme limiti
    MAX_IMAGE_CONCURRENCY: 5, // Bir bölümdeki resimlerin aynı anda indirilme limiti
};
