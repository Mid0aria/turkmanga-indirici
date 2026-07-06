import { Chapter, Manga, MangaProvider } from "@/types";
import { useState } from "react";
import { TuiStep } from "./useTUI";

export const useMangaChapters = (
    providers: Record<string, MangaProvider>,
    setStep: (step: TuiStep) => void,
    setErrorMessage: (msg: string) => void,
    setSelectedManga: (manga: Manga | null) => void,
) => {
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [chaptersToDownload, setChaptersToDownload] = useState<Chapter[]>([]);
    const [rangeStartInput, setRangeStartInput] = useState("");
    const [rangeEndInput, setRangeEndInput] = useState("");

    const handleMangaSelect = async (manga: Manga) => {
        setSelectedManga(manga);
        setStep("FETCHING_CHAPTERS");
        try {
            const provider = providers[manga.provider];
            if (!provider) {
                throw new Error("Manga sağlayıcısı bulunamadı.");
            }
            const chapters = await provider.getChapters(manga.url);
            if (chapters.metadata) {
                Object.assign(manga, chapters.metadata);
            }
            if (chapters.length === 0) {
                setStep("SEARCH_RESULTS");
                setErrorMessage("Bu manga için hiçbir bölüm bulunamadı.");
                return;
            }
            setAllChapters(chapters);
            setStep("CHAPTER_SELECT");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setStep("SEARCH_RESULTS");
            setErrorMessage(`Bölümler çekilirken hata: ${msg}`);
        }
    };

    const handleChapterChoice = (choice: string) => {
        setErrorMessage("");
        if (choice === "all") {
            setChaptersToDownload(allChapters);
            setStep("CONFIRM_DOWNLOAD");
        } else if (choice === "last") {
            setChaptersToDownload([allChapters[allChapters.length - 1]]);
            setStep("CONFIRM_DOWNLOAD");
        } else if (choice === "range") {
            setRangeStartInput("");
            setRangeEndInput("");
            setStep("CHAPTER_RANGE_START");
        } else if (choice === "cancel") {
            setStep("SEARCH_RESULTS");
        }
    };

    const handleRangeStartSubmit = () => {
        const start = parseFloat(rangeStartInput);
        if (isNaN(start)) {
            setErrorMessage("Geçersiz sayı girdiniz.");
            return;
        }
        setErrorMessage("");
        setStep("CHAPTER_RANGE_END");
    };

    const handleRangeEndSubmit = () => {
        const start = parseFloat(rangeStartInput);
        const end = parseFloat(rangeEndInput);
        if (isNaN(end) || end < start) {
            setErrorMessage("Geçersiz bitiş sayısı. Bitiş sayısı başlangıçtan büyük olmalıdır.");
            return;
        }
        setErrorMessage("");
        const selected = allChapters.filter((c) => c.number >= start && c.number <= end);
        if (selected.length === 0) {
            setErrorMessage("Bu aralıkta hiçbir bölüm bulunamadı.");
            return;
        }
        setChaptersToDownload(selected);
        setStep("CONFIRM_DOWNLOAD");
    };

    return {
        allChapters,
        setAllChapters,
        chaptersToDownload,
        setChaptersToDownload,
        rangeStartInput,
        setRangeStartInput,
        rangeEndInput,
        setRangeEndInput,
        handleMangaSelect,
        handleChapterChoice,
        handleRangeStartSubmit,
        handleRangeEndSubmit,
    };
};

export default useMangaChapters;
