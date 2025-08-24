const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("../ui/logger");

const loadProviders = () => {
    const providers = {};
    if (!fs.existsSync(config.PROVIDERS_DIR)) {
        logger.warn(
            "'providers' klasörü bulunamadı. Hiçbir sağlayıcı yüklenmedi.",
        );
        return providers;
    }

    const providerFiles = fs
        .readdirSync(config.PROVIDERS_DIR)
        .filter((file) => file.endsWith(".js"));

    logger.info("🔧 Sağlayıcılar yükleniyor...");

    for (const file of providerFiles) {
        const filePath = path.join(config.PROVIDERS_DIR, file);
        try {
            const ProviderClass = require(filePath);
            const providerInstance = new ProviderClass();
            if (providerInstance.name) {
                providers[providerInstance.name] = providerInstance;
                logger.log(`   ✅ ${providerInstance.name} yüklendi.`);
            } else {
                logger.warn(
                    `   ${file} dosyası geçerli bir 'name' özelliğine sahip değil, atlanıyor.`,
                );
            }
        } catch (error) {
            logger.error(`   Hata: ${file} yüklenemedi - ${error.message}`);
        }
    }
    return providers;
};

const searchAllProviders = async (providers, title) => {
    if (Object.keys(providers).length === 0) {
        logger.error(
            "Yüklü sağlayıcı bulunamadı. 'providers' klasörünü kontrol edin.",
        );
        return [];
    }
    logger.header(`"${title}" için tüm sağlayıcılarda arama yapılıyor...`);

    const searchPromises = Object.values(providers).map((provider) =>
        provider.search(title).catch((err) => {
            logger.warn(`${provider.name} aramasında hata: ${err.message}`);
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

module.exports = { loadProviders, searchAllProviders };
