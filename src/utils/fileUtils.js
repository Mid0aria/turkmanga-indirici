const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const createSafeFileName = (name) => {
    return name
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, "_")
        .trim();
};

const createCBZ = (sourceDir, outputPath) => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 0 } }); // Seviye 0 = sadece depolama, daha hızlı

        output.on("close", () => resolve());
        archive.on("error", (err) => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
};

module.exports = { createSafeFileName, createCBZ };
