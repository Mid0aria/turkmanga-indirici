import * as cheerio from "cheerio";
import sharp from "sharp";

export async function decodeMangaTrPage(
    imageInput: string | Buffer,
    containerHtml: string,
): Promise<Buffer> {
    const $ = cheerio.load(containerHtml);

    const partDivs: ReturnType<typeof $>[] = [];
    $("div").each((_i, el) => {
        const styleStr = $(el).attr("style") || "";
        if (styleStr.includes("img_part.php")) {
            partDivs.push($(el));
        }
    });

    if (partDivs.length === 0) {
        throw new Error("No scrambled image parts found inside the HTML container.");
    }

    const image = sharp(imageInput);
    const { width, height } = await image.metadata();
    if (!width || !height) {
        throw new Error("Could not load image metadata");
    }
    const quarterHeight = Math.round(height / 4);

    const compositeList: { input: Buffer; top: number; left: number }[] = [];

    for (const $div of partDivs) {
        const styleStr = $div.attr("style") || "";
        const styles = parseStyles(styleStr);

        const topStr = styles["top"] || "";
        const topMatch = topStr.match(/(\d+(\.\d+)?)\s*%/);
        if (!topMatch) continue;
        const topVal = parseFloat(topMatch[1]);
        const destIndex = Math.round(topVal / 25);

        const bgPosStr = styles["background-position"] || "";
        const percentages = bgPosStr.match(/(\d+(\.\d+)?)\s*%/g);
        if (!percentages) continue;
        const yPercentStr = percentages.length >= 2 ? percentages[1] : percentages[0];
        const yPercent = parseFloat(yPercentStr);
        const srcIndex = Math.round(yPercent / 33.3333);

        const transform = styles["transform"] || "";
        const flip =
            transform.includes("scaleY(-1)") ||
            transform.includes("scale(-1, -1)") ||
            transform.includes("scale(-1,-1)");
        const flop =
            transform.includes("scaleX(-1)") ||
            transform.includes("scale(-1, -1)") ||
            transform.includes("scale(-1,-1)");
        const topOffset = srcIndex * quarterHeight;
        const currentHeight = srcIndex === 3 ? height - topOffset : quarterHeight;

        let part = sharp(imageInput).extract({
            left: 0,
            top: topOffset,
            width: width,
            height: currentHeight,
        });

        if (flop) {
            part = part.flop();
        }
        if (flip) {
            part = part.flip();
        }

        const partBuffer = await part.toBuffer();

        compositeList.push({
            input: partBuffer,
            top: destIndex * quarterHeight,
            left: 0,
        });
    }

    const outputBuffer = await sharp({
        create: {
            width: width,
            height: height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite(compositeList)
        .png()
        .toBuffer();

    return outputBuffer;
}

function parseStyles(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {};
    styleStr.split(";").forEach((item) => {
        const parts = item.split(":");
        if (parts.length >= 2) {
            const key = parts[0].trim().toLowerCase();
            const value = parts.slice(1).join(":").trim();
            styles[key] = value;
        }
    });
    return styles;
}
