import { searchAllProviders } from "@/core/providerManager";
import { Manga, MangaProvider } from "@/types";
import { useState } from "react";
import { TuiStep } from "./useTUI";

export const useMangaSearch = (
    providers: Record<string, MangaProvider>,
    setStep: (step: TuiStep) => void,
    setErrorMessage: (msg: string) => void,
) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Manga[]>([]);
    const [highlightedManga, setHighlightedManga] = useState<Manga | null>(null);

    const handleSearchSubmit = async () => {
        if (!searchTerm.trim()) {
            setErrorMessage("Lütfen arama terimi girin.");
            return;
        }

        setErrorMessage("");
        setStep("SEARCHING");
        try {
            const results = await searchAllProviders(providers, searchTerm);
            setSearchResults(results);
            if (results.length === 0) {
                setStep("SEARCH_INPUT");
                setErrorMessage("Manga bulunamadı. Lütfen başka bir şey aratın.");
            } else {
                setHighlightedManga(results[0]);
                setStep("SEARCH_RESULTS");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setStep("SEARCH_INPUT");
            setErrorMessage(`Arama sırasında hata: ${msg}`);
        }
    };

    return {
        searchTerm,
        setSearchTerm,
        searchResults,
        setSearchResults,
        highlightedManga,
        setHighlightedManga,
        handleSearchSubmit,
    };
};

export default useMangaSearch;
