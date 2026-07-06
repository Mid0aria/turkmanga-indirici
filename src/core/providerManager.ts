import { PROVIDERS_DIR } from "@/config";
import { Manga, MangaProvider } from "@/types";
import logger from "@/ui/logger";
import fs from "fs";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

export const loadProviders = (): Record<string, MangaProvider> => {
    const providers: Record<string, MangaProvider> = {};
    if (!fs.existsSync(PROVIDERS_DIR)) {
        logger.warn("'providers' klasörü bulunamadı. Hiçbir sağlayıcı yüklenmedi.");
        return providers;
    }

    const providerFiles = fs
        .readdirSync(PROVIDERS_DIR)
        .filter(
            (file) => (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".d.ts"),
        );

    logger.info("🔧 Sağlayıcılar yükleniyor...");

    for (const file of providerFiles) {
        const filePath = path.resolve(PROVIDERS_DIR, file);
        try {
            const ProviderModule = require(filePath);
            const ProviderClass = ProviderModule.default || ProviderModule;
            const providerInstance = new ProviderClass() as MangaProvider;
            if (providerInstance.name) {
                providers[providerInstance.name] = providerInstance;
                logger.log(`   ✅ ${providerInstance.name} yüklendi.`);
            } else {
                logger.warn(
                    `   ${file} dosyası geçerli bir 'name' özelliğine sahip değil, atlanıyor.`,
                );
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`   Hata: ${file} yüklenemedi - ${msg}`);
        }
    }
    return providers;
};

export const searchAllProviders = async (
    providers: Record<string, MangaProvider>,
    title: string,
): Promise<Manga[]> => {
    if (Object.keys(providers).length === 0) {
        logger.error("Yüklü sağlayıcı bulunamadı. 'providers' klasörünü kontrol edin.");
        return [];
    }
    logger.header(`"${title}" için tüm sağlayıcılarda arama yapılıyor...`);

    const searchPromises = Object.values(providers).map((provider) =>
        provider.search(title).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn(`${provider.name} aramasında hata: ${msg}`);
            return []; // Hata durumunda boş dizi döndür
        }),
    );

    const results = await Promise.all(searchPromises);
    const allManga = results.flat();

    if (allManga.length > 0) {
        logger.success(`Toplam ${allManga.length} sonuç bulundu.`);
    } else {
        logger.error("Hiçbir sağlayıcıda manga bulunamadı!");
    }
    return allManga;
};

export default {
    loadProviders,
    searchAllProviders,
};
