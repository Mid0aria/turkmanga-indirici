import { loadProviders } from "@/core/providerManager";
import { Manga } from "@/types";
import { getHistory, LogItem, subscribe } from "@/ui/logger";
import { useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import useMangaChapters from "./useMangaChapters";
import useMangaDownload from "./useMangaDownload";
import useMangaSearch from "./useMangaSearch";
import useSettings from "./useSettings";

export type TuiStep =
    | "MAIN_MENU"
    | "SETTINGS"
    | "SETTINGS_MANUAL_DIR"
    | "SEARCH_INPUT"
    | "SEARCHING"
    | "SEARCH_RESULTS"
    | "FETCHING_CHAPTERS"
    | "CHAPTER_SELECT"
    | "CHAPTER_RANGE_START"
    | "CHAPTER_RANGE_END"
    | "CONFIRM_DOWNLOAD"
    | "CONFIRM_PARALLEL"
    | "DOWNLOADING"
    | "FINISHED";

export const useTUI = () => {
    const { exit } = useApp();

    const [step, setStep] = useState<TuiStep>("MAIN_MENU");
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
    const [logs, setLogs] = useState<LogItem[]>(() => getHistory());

    useEffect(() => {
        const unsubscribe = subscribe((item) => {
            setLogs((prev) => [...prev, item].slice(-50));
        });
        return unsubscribe;
    }, []);

    const [providers] = useState(() => loadProviders());

    const settingsHook = useSettings(setStep, setStatusMessage, setErrorMessage);

    const searchHook = useMangaSearch(providers, setStep, setErrorMessage);

    const chaptersHook = useMangaChapters(providers, setStep, setErrorMessage, setSelectedManga);

    const downloadHook = useMangaDownload(
        providers,
        setStep,
        setErrorMessage,
        selectedManga,
        chaptersHook.chaptersToDownload,
        settingsHook.settings,
    );

    useInput((_input, key) => {
        if (key.escape) {
            setErrorMessage("");
            if (step === "SETTINGS" || step === "SEARCH_INPUT") {
                setStep("MAIN_MENU");
            } else if (step === "SETTINGS_MANUAL_DIR") {
                setStep("SETTINGS");
            } else if (step === "SEARCH_RESULTS") {
                setStep("SEARCH_INPUT");
            } else if (step === "CHAPTER_SELECT") {
                setStep("SEARCH_RESULTS");
            } else if (step === "CHAPTER_RANGE_START" || step === "CHAPTER_RANGE_END") {
                setStep("CHAPTER_SELECT");
            } else if (step === "CONFIRM_DOWNLOAD") {
                setStep("CHAPTER_SELECT");
            } else if (step === "CONFIRM_PARALLEL") {
                setStep("CONFIRM_DOWNLOAD");
            }
        }
    });

    return {
        exit,
        step,
        setStep,
        errorMessage,
        setErrorMessage,
        statusMessage,
        setStatusMessage,
        selectedManga,
        logs,

        settings: settingsHook.settings,
        manualPathInput: settingsHook.manualPathInput,
        setManualPathInput: settingsHook.setManualPathInput,
        handleFolderSelect: settingsHook.handleFolderSelect,
        handleManualPathSubmit: settingsHook.handleManualPathSubmit,

        searchTerm: searchHook.searchTerm,
        setSearchTerm: searchHook.setSearchTerm,
        searchResults: searchHook.searchResults,
        highlightedManga: searchHook.highlightedManga,
        setHighlightedManga: searchHook.setHighlightedManga,
        handleSearchSubmit: searchHook.handleSearchSubmit,

        allChapters: chaptersHook.allChapters,
        chaptersToDownload: chaptersHook.chaptersToDownload,
        rangeStartInput: chaptersHook.rangeStartInput,
        setRangeStartInput: chaptersHook.setRangeStartInput,
        rangeEndInput: chaptersHook.rangeEndInput,
        setRangeEndInput: chaptersHook.setRangeEndInput,
        handleMangaSelect: chaptersHook.handleMangaSelect,
        handleChapterChoice: chaptersHook.handleChapterChoice,
        handleRangeStartSubmit: chaptersHook.handleRangeStartSubmit,
        handleRangeEndSubmit: chaptersHook.handleRangeEndSubmit,

        useParallel: downloadHook.useParallel,
        setUseParallel: downloadHook.setUseParallel,
        downloadProgress: downloadHook.downloadProgress,
        startDownloading: downloadHook.startDownloading,
    };
};

export default useTUI;
