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

const askSelectChapterRange = async (chapters) => {
    const firstChapter = chapters[0].number;
    const lastChapter = chapters[chapters.length - 1].number;

    const { choice } = await customPrompt([
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
    ]);

    if (choice !== "range") {
        return { choice };
    }

    const { start } = await customPrompt([
        {
            type: "input",
            name: "start",
            message: `Başlangıç bölümü (${firstChapter}-${lastChapter}):`,
            validate: (input) =>
                !isNaN(parseFloat(input)) || "Lütfen bir sayı girin.",
            filter: (input) => parseFloat(input),
        },
    ]);

    const { end } = await customPrompt([
        {
            type: "input",
            name: "end",
            message: `Bitiş bölümü (${start}-${lastChapter}):`,
            validate: (input) => {
                const endValue = parseFloat(input);
                if (isNaN(endValue)) {
                    return "Lütfen bir sayı girin.";
                }
                if (endValue < start) {
                    return "Bitiş, başlangıçtan büyük olmalı.";
                }
                return true;
            },
            filter: (input) => parseFloat(input),
        },
    ]);

    return { choice, start, end };
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
    inquirer,
    customPrompt,
    askMainMenuAction,
    askSettingsMenu,
    askForDirectoryPath,
    askSearchTerm,
    askSelectManga,
    askSelectChapterRange,
    askConfirmation,
    askParallelDownload,
};
