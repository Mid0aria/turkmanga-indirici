import TextInput from "@/tui/components/atoms/TextInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Chapter } from "@/types";
import { Box, Text } from "ink";

interface ChapterRangeViewProps {
    step: TuiStep;
    allChapters: Chapter[];
    rangeStartInput: string;
    rangeEndInput: string;
    setRangeStartInput: (val: string) => void;
    setRangeEndInput: (val: string) => void;
    handleRangeStartSubmit: () => void;
    handleRangeEndSubmit: () => void;
}

export const ChapterRangeView = ({
    step,
    allChapters,
    rangeStartInput,
    rangeEndInput,
    setRangeStartInput,
    setRangeEndInput,
    handleRangeStartSubmit,
    handleRangeEndSubmit,
}: ChapterRangeViewProps) => {
    const firstChapter = allChapters[0]?.number;
    const lastChapter = allChapters[allChapters.length - 1]?.number;

    if (step === "CHAPTER_RANGE_END") {
        return (
            <Box flexDirection="column">
                <Box marginBottom={1}>
                    <Text color="yellow">
                        Bitiş bölüm numarasını girin (Başlangıç: {rangeStartInput}, Maksimum:{" "}
                        {lastChapter}):
                    </Text>
                </Box>
                <TextInput
                    value={rangeEndInput}
                    onChange={setRangeEndInput}
                    onSubmit={handleRangeEndSubmit}
                    placeholder="Örn: 10"
                />
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text color="yellow">
                    Başlangıç bölüm numarasını girin (Mevcut aralık: {firstChapter} - {lastChapter}
                    ):
                </Text>
            </Box>
            <TextInput
                value={rangeStartInput}
                onChange={setRangeStartInput}
                onSubmit={handleRangeStartSubmit}
                placeholder="Örn: 1"
            />
        </Box>
    );
};

export default ChapterRangeView;
