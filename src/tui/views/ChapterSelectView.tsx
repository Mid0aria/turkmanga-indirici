import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Chapter, Manga } from "@/types";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface ChapterSelectViewProps {
    step: TuiStep;
    selectedManga: Manga | null;
    allChapters: Chapter[];
    handleChapterChoice: (choice: string) => void;
}

export const ChapterSelectView = ({
    step,
    selectedManga,
    allChapters,
    handleChapterChoice,
}: ChapterSelectViewProps) => {
    if (step === "FETCHING_CHAPTERS") {
        return (
            <Box flexDirection="column" alignItems="center" justifyContent="center" height={8}>
                <Text color="yellow">
                    <Spinner type="dots" />
                </Text>
                <Box marginTop={1}>
                    <Text color="cyan" bold>
                        "{selectedManga?.title}"
                    </Text>
                </Box>
                <Box marginTop={1}>
                    <Text color="gray" italic>
                        Bölüm listesi çekiliyor, lütfen bekleyin...
                    </Text>
                </Box>
            </Box>
        );
    }

    const firstChapter = allChapters[0]?.number;
    const lastChapter = allChapters[allChapters.length - 1]?.number;

    return (
        <Box flexDirection="column">
            <Box marginBottom={1} flexDirection="column">
                <Text color="white">Seçenek listesinden indirme metodunu seçin:</Text>
                <Text color="gray" italic>
                    (Mevcut aralık: Bölüm {firstChapter} - {lastChapter})
                </Text>
            </Box>
            <ScrollableSelectInput
                items={[
                    { label: "1. Tüm Bölümleri İndir", value: "all" },
                    { label: "2. Belirli Bir Bölüm Aralığı İndir", value: "range" },
                    { label: "3. Sadece Son Bölümü İndir", value: "last" },
                    { label: "❌ İptal Et", value: "cancel" },
                ]}
                onSelect={handleChapterChoice}
            />
        </Box>
    );
};

export default ChapterSelectView;
