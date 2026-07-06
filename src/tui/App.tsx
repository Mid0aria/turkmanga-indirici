import { LogItem } from "@/ui/logger";
import { Box, Text, TextProps } from "ink";
import StatusIndicator from "./components/atoms/StatusIndicator";
import useTUI, { TuiStep } from "./hooks/useTUI";
import ChapterRangeView from "./views/ChapterRangeView";
import ChapterSelectView from "./views/ChapterSelectView";
import ConfirmDownloadView from "./views/ConfirmDownloadView";
import DownloadingView from "./views/DownloadingView";
import FinishedView from "./views/FinishedView";
import MainMenuView from "./views/MainMenuView";
import SearchInputView from "./views/SearchInputView";
import SearchResultsView from "./views/SearchResultsView";
import SettingsView from "./views/SettingsView";

const getStepLabel = (step: TuiStep): string => {
    switch (step) {
        case "MAIN_MENU":
            return "Ana Menü";
        case "SETTINGS":
            return "Ayarlar Menüsü";
        case "SETTINGS_MANUAL_DIR":
            return "Manuel Klasör Girişi";
        case "SEARCH_INPUT":
            return "Manga Arama Paneli";
        case "SEARCHING":
            return "Arama Yapılıyor";
        case "SEARCH_RESULTS":
            return "Arama Sonuçları";
        case "FETCHING_CHAPTERS":
            return "Bölümler Çekiliyor";
        case "CHAPTER_SELECT":
            return "Bölüm İndirme Seçimi";
        case "CHAPTER_RANGE_START":
            return "Bölüm Aralığı Başlangıcı";
        case "CHAPTER_RANGE_END":
            return "Bölüm Aralığı Bitişi";
        case "CONFIRM_DOWNLOAD":
            return "İndirme Onay Ekranı";
        case "CONFIRM_PARALLEL":
            return "Paralel İndirme Ayarı";
        case "DOWNLOADING":
            return "İndirme İşlemi Devam Ediyor";
        case "FINISHED":
            return "İndirme Tamamlandı";
        default:
            return "Uygulama";
    }
};

const getStepGuide = (step: TuiStep): string => {
    if (step === "SEARCHING" || step === "FETCHING_CHAPTERS") {
        return "⏳ Lütfen işlem tamamlanana kadar bekleyin...";
    }
    if (step === "DOWNLOADING") {
        return "📦 İndirme yapılıyor, lütfen terminali kapatmayın.";
    }

    const baseGuide = "[↑/↓] Gezin  [Enter] Seç";
    const escBack = "  [ESC] Geri Dön";

    switch (step) {
        case "MAIN_MENU":
            return baseGuide;
        case "SETTINGS":
        case "SEARCH_RESULTS":
        case "CHAPTER_SELECT":
        case "CONFIRM_DOWNLOAD":
        case "CONFIRM_PARALLEL":
        case "FINISHED":
            return baseGuide + escBack;
        case "SETTINGS_MANUAL_DIR":
        case "SEARCH_INPUT":
        case "CHAPTER_RANGE_START":
        case "CHAPTER_RANGE_END":
            return "[Metin Girişi] Yazın ve [Enter]'a basın" + escBack;
        default:
            return "";
    }
};

const renderLogLine = (log: LogItem, idx: number) => {
    let icon = "💬 ";
    let color: TextProps["color"] = "white";

    switch (log.type) {
        case "info":
            icon = "ℹ️  ";
            color = "cyan";
            break;
        case "success":
            icon = "✅ ";
            color = "green";
            break;
        case "warn":
            icon = "⚠️  ";
            color = "yellow";
            break;
        case "error":
            icon = "❌ ";
            color = "red";
            break;
        case "header":
            icon = "📣 ";
            color = "magenta";
            break;
    }

    let cleanedMessage = log.message.trim();
    if (
        cleanedMessage.startsWith("✅") ||
        cleanedMessage.startsWith("❌") ||
        cleanedMessage.startsWith("⚠️")
    ) {
        cleanedMessage = cleanedMessage.substring(1).trim();
    }

    const timeStr = log.timestamp.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    return (
        <Box key={idx} flexDirection="row" justifyContent="space-between">
            <Box flexDirection="row">
                <Text color={color}>{icon}</Text>
                <Text color={color}>{cleanedMessage}</Text>
            </Box>
            <Text color="gray" dimColor>
                [{timeStr}]
            </Text>
        </Box>
    );
};

export const TUIApp = () => {
    const tui = useTUI();

    const allProgressItems = Object.values(tui.downloadProgress);
    const completedCount = allProgressItems.filter((prog) => prog.value >= prog.total).length;

    const renderActiveContent = () => {
        switch (tui.step) {
            case "MAIN_MENU":
                return (
                    <MainMenuView
                        setStep={tui.setStep}
                        setSearchTerm={tui.setSearchTerm}
                        setStatusMessage={tui.setStatusMessage}
                        exit={tui.exit}
                    />
                );
            case "SETTINGS":
            case "SETTINGS_MANUAL_DIR":
                return (
                    <SettingsView
                        step={tui.step}
                        setStep={tui.setStep}
                        settings={tui.settings}
                        manualPathInput={tui.manualPathInput}
                        setManualPathInput={tui.setManualPathInput}
                        handleFolderSelect={tui.handleFolderSelect}
                        handleManualPathSubmit={tui.handleManualPathSubmit}
                    />
                );
            case "SEARCH_INPUT":
            case "SEARCHING":
                return (
                    <SearchInputView
                        step={tui.step}
                        searchTerm={tui.searchTerm}
                        setSearchTerm={tui.setSearchTerm}
                        handleSearchSubmit={tui.handleSearchSubmit}
                    />
                );
            case "SEARCH_RESULTS":
                return (
                    <SearchResultsView
                        searchResults={tui.searchResults}
                        highlightedManga={tui.highlightedManga}
                        setHighlightedManga={tui.setHighlightedManga}
                        handleMangaSelect={tui.handleMangaSelect}
                    />
                );
            case "FETCHING_CHAPTERS":
            case "CHAPTER_SELECT":
                return (
                    <ChapterSelectView
                        step={tui.step}
                        selectedManga={tui.selectedManga}
                        allChapters={tui.allChapters}
                        handleChapterChoice={tui.handleChapterChoice}
                    />
                );
            case "CHAPTER_RANGE_START":
            case "CHAPTER_RANGE_END":
                return (
                    <ChapterRangeView
                        step={tui.step}
                        allChapters={tui.allChapters}
                        rangeStartInput={tui.rangeStartInput}
                        rangeEndInput={tui.rangeEndInput}
                        setRangeStartInput={tui.setRangeStartInput}
                        setRangeEndInput={tui.setRangeEndInput}
                        handleRangeStartSubmit={tui.handleRangeStartSubmit}
                        handleRangeEndSubmit={tui.handleRangeEndSubmit}
                    />
                );
            case "CONFIRM_DOWNLOAD":
            case "CONFIRM_PARALLEL":
                return (
                    <ConfirmDownloadView
                        step={tui.step}
                        setStep={tui.setStep}
                        chaptersToDownload={tui.chaptersToDownload}
                        setUseParallel={tui.setUseParallel}
                        startDownloading={tui.startDownloading}
                    />
                );
            case "DOWNLOADING":
                return (
                    <DownloadingView
                        downloadProgress={tui.downloadProgress}
                        completedCount={completedCount}
                        totalCount={tui.chaptersToDownload.length}
                    />
                );
            case "FINISHED":
                return (
                    <FinishedView
                        setSearchTerm={tui.setSearchTerm}
                        setStep={tui.setStep}
                        exit={tui.exit}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="rgb(107,114,128)"
                padding={1}
                marginBottom={1}
            >
                <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
                    <Box flexDirection="row">
                        <Text color="white" bold>
                            📁 Klasör:{" "}
                        </Text>
                        <Text color="rgb(156,163,175)">{tui.settings.downloadDir}</Text>
                    </Box>
                    <Box flexDirection="row">
                        <Text color="white" bold>
                            ⚡ Mod:{" "}
                        </Text>
                        <Text color={tui.useParallel ? "rgb(52,211,153)" : "rgb(253,224,71)"}>
                            {tui.useParallel ? "Paralel (Çoklu Hızlı)" : "Sıralı (Tekli Güvenli)"}
                        </Text>
                    </Box>
                </Box>

                <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
                    <Box flexDirection="row">
                        <Text color="white" bold>
                            📦 Manga:{" "}
                        </Text>
                        <Text color="rgb(253,224,71)" bold>
                            {tui.selectedManga?.title || "Seçilmedi"}
                        </Text>
                        {tui.selectedManga && (
                            <Text color="gray" dimColor>
                                {" "}
                                ({tui.selectedManga.provider})
                            </Text>
                        )}
                    </Box>
                    <Box flexDirection="row">
                        <Text color="white" bold>
                            📥 İlerleme / Kuyruk:{" "}
                        </Text>
                        <Text color="rgb(56,189,248)">
                            {tui.chaptersToDownload.length > 0
                                ? `${completedCount} / ${tui.chaptersToDownload.length} bölüm tamamlandı`
                                : "Kuyruk boş"}
                        </Text>
                    </Box>
                </Box>

                <Box
                    borderStyle="single"
                    borderColor="rgb(75,85,99)"
                    paddingX={1}
                    marginBottom={1}
                    flexDirection="row"
                >
                    <Text color="rgb(167,139,250)" bold>
                        🎹 KILAVUZ:{" "}
                    </Text>
                    <Text color="white" dimColor>
                        {" "}
                        {getStepGuide(tui.step)}
                    </Text>
                </Box>

                {tui.logs.length > 0 && (
                    <Box
                        borderStyle="single"
                        borderColor="rgb(75,85,99)"
                        paddingX={1}
                        flexDirection="column"
                    >
                        <Box marginBottom={1}>
                            <Text color="rgb(56,189,248)" bold>
                                📋 SON SİSTEM GÜNLÜKLERİ
                            </Text>
                        </Box>
                        {tui.logs.slice(-3).map((log, idx) => renderLogLine(log, idx))}
                    </Box>
                )}
            </Box>

            <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="rgb(167,139,250)"
                padding={1}
            >
                <Box marginBottom={1}>
                    <Text color="rgb(45,212,191)" bold underline>
                        🖥️ {getStepLabel(tui.step).toUpperCase()}
                    </Text>
                </Box>

                <Box minHeight={10} flexGrow={1}>
                    {renderActiveContent()}
                </Box>
                <StatusIndicator
                    errorMessage={tui.errorMessage}
                    statusMessage={tui.statusMessage}
                />
            </Box>
        </Box>
    );
};

export default TUIApp;
