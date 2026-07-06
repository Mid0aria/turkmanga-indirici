import archiver from "archiver";
import fs from "fs";

export const createSafeFileName = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, "").trim();
};

export async function ensureDirExists(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export const createCBZ = (sourceDir: string, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 0 } }); // Seviye 0 = sadece depolama, daha hızlı

        output.on("close", () => resolve());
        archive.on("error", (err: unknown) => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
};
