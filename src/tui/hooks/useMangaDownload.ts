import { downloadChapters, ProgressState } from "@/core/downloader";
import { Chapter, Manga, MangaProvider, Settings } from "@/types";
import { useState } from "react";
import { TuiStep } from "./useTUI";

export const useMangaDownload = (
    providers: Record<string, MangaProvider>,
    setStep: (step: TuiStep) => void,
    setErrorMessage: (msg: string) => void,
    selectedManga: Manga | null,
    chaptersToDownload: Chapter[],
    settings: Settings,
) => {
    const [useParallel, setUseParallel] = useState(true);
    const [downloadProgress, setDownloadProgress] = useState<Record<string, ProgressState>>({});

    const startDownloading = async () => {
        setStep("DOWNLOADING");
        setDownloadProgress({});
        try {
            if (!selectedManga) return;
            const provider = providers[selectedManga.provider];

            await downloadChapters(
                chaptersToDownload,
                selectedManga,
                provider,
                useParallel,
                settings.downloadDir,
                (filename, progress) => {
                    setDownloadProgress((prev) => ({
                        ...prev,
                        [filename]: progress,
                    }));
                },
            );
            setStep("FINISHED");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setStep("MAIN_MENU");
            setErrorMessage(`İndirme sırasında hata oluştu: ${msg}`);
        }
    };

    return {
        useParallel,
        setUseParallel,
        downloadProgress,
        setDownloadProgress,
        startDownloading,
    };
};

export default useMangaDownload;
