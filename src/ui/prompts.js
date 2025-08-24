const inquirer = require("inquirer");
const fse = require("fs-extra");
const logger = require("./logger");

const prompt = inquirer.createPromptModule();

const customPrompt = async (questions) => {
    try {
        const answers = await prompt(questions);
        return answers;
    } catch (error) {
        if (error.message.includes("SIGINT")) {
            logger.warn("\nİşlem iptal edildi. Çıkılıyor.");
            process.exit(0);
        }
        throw error;
    }
};

const askMainMenuAction = () =>
    customPrompt([
        {
            type: "list",
            name: "action",
            message: "Ne yapmak istersin?",
            choices: [
                { name: "🚀 Manga Ara ve İndir", value: "search" },
                { name: "⚙️  Ayarlar", value: "settings" },
                { name: "🚪 Çıkış", value: "exit" },
            ],
        },
    ]);

const askSettingsMenu = () =>
    customPrompt([
        {
            type: "list",
            name: "action",
            message: "Ayarlar Menüsü",
            choices: [
                { name: "📁 İndirme Klasörünü Değiştir", value: "changeDir" },
                { name: "↩️  Geri", value: "back" },
            ],
        },
    ]);

const askForDirectoryPath = (currentPath) =>
    customPrompt([
        {
            type: "input",
            name: "folderPath",
            message: "Yeni indirme klasörü yolunu girin:",
            default: currentPath,
            validate: (input) => {
                const trimmedInput = input.trim();
                if (!trimmedInput) return "Yol boş olamaz.";
                if (!fse.existsSync(trimmedInput)) {
                    return "Bu yol mevcut değil. Lütfen var olan bir klasör girin.";
                }
                if (!fse.lstatSync(trimmedInput).isDirectory()) {
                    return "Girilen yol bir dizin değil.";
                }
                return true;
            },
            filter: (input) => input.trim(),
        },
    ]);

const askSearchTerm = () =>
    customPrompt([
        {
            type: "input",
            name: "term",
            message: "🔍 Hangi mangayı aramak istersin? (çıkmak için 'exit')",
            validate: (input) =>
                input.trim().length > 0 || "Lütfen bir manga adı girin.",
        },
    ]);

const askSelectManga = (mangaList) => {
    const choices = mangaList.map((manga, index) => ({
        name: `${manga.title} [${manga.provider}] (Son Bölüm: ${manga.latestChapter || "Bilinmiyor"})`,
        value: index,
    }));

    return customPrompt([
        {
            type: "list",
            name: "mangaIndex",
            message: "📚 Bulunan sonuçlardan birini seç:",
            choices: choices,
            pageSize: 10,
        },
    ]);
};

const askSelectChapterRange = (chapters) => {
    const firstChapter = chapters[0].number;
    const lastChapter = chapters[chapters.length - 1].number;

    return customPrompt([
        {
            type: "list",
            name: "choice",
            message: "📋 Hangi bölümleri indirmek istersin?",
            choices: [
                { name: "1. Tüm bölümler", value: "all" },
                { name: "2. Belirli bir aralık", value: "range" },
                { name: "3. Sadece son bölüm", value: "last" },
                { name: "İptal", value: "cancel" },
            ],
        },
        {
            type: "input",
            name: "start",
            message: `Başlangıç bölümü (${firstChapter}-${lastChapter}):`,
            when: (answers) => answers.choice === "range",
            validate: (input) =>
                !isNaN(parseFloat(input)) || "Lütfen bir sayı girin.",
            filter: (input) => parseFloat(input),
        },
        {
            type: "input",
            name: "end",
            message: (answers) =>
                `Bitiş bölümü (${answers.start}-${lastChapter}):`,
            when: (answers) => answers.choice === "range",
            validate: (input, answers) =>
                parseFloat(input) >= answers.start ||
                "Bitiş, başlangıçtan büyük olmalı.",
            filter: (input) => parseFloat(input),
        },
    ]);
};

const askConfirmation = (message) =>
    customPrompt([
        {
            type: "confirm",
            name: "confirmed",
            message: message,
            default: true,
        },
    ]);

const askParallelDownload = () =>
    customPrompt([
        {
            type: "confirm",
            name: "parallel",
            message:
                "⚡ Bölümleri paralel olarak indirmek ister misin? (Daha hızlı)",
            default: true,
        },
    ]);

module.exports = {
    askMainMenuAction,
    askSettingsMenu,
    askForDirectoryPath,
    askSearchTerm,
    askSelectManga,
    askSelectChapterRange,
    askConfirmation,
    askParallelDownload,
};
