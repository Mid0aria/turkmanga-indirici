const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

// İndirme işlemleri için çoklu ilerleme çubuğu oluşturuluyor
const multibar = new cliProgress.MultiBar(
    {
        clearOnComplete: false,
        hideCursor: true,
        stopOnComplete: true,
        format: `${colors.cyan("{bar}")} | {filename} | ${colors.yellow(
            "{value}",
        )}/${colors.green("{total}")} | ${colors.blue("{status}")}`,
    },
    cliProgress.Presets.shades_grey,
);

module.exports = {
    multibar,
    // Yeni bir ilerleme çubuğu oluşturmak için yardımcı fonksiyon
    createBar: (total, initialPayload = {}) => {
        return multibar.create(total, 0, initialPayload);
    },
};
