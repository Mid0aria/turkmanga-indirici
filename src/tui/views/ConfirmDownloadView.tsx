import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Chapter } from "@/types";
import { Box, Text } from "ink";

interface ConfirmDownloadViewProps {
    step: TuiStep;
    setStep: (step: TuiStep) => void;
    chaptersToDownload: Chapter[];
    setUseParallel: (val: boolean) => void;
    startDownloading: () => void;
}

export const ConfirmDownloadView = ({
    step,
    setStep,
    chaptersToDownload,
    setUseParallel,
    startDownloading,
}: ConfirmDownloadViewProps) => {
    if (step === "CONFIRM_PARALLEL") {
        return (
            <Box flexDirection="column">
                <Box marginBottom={1} flexDirection="column">
                    <Text color="rgb(253,224,71)" bold>
                        Bölümleri paralel indirmek ister misiniz?
                    </Text>
                    <Text color="rgb(156,163,175)" italic>
                        (Paralel indirme çok daha hızlıdır fakat ağ/işlemci yükünü artırır.)
                    </Text>
                </Box>
                <ScrollableSelectInput
                    items={[
                        { label: "Evet, Paralel İndir (Önerilen)", value: "yes" },
                        { label: "Hayır, Teker Teker İndir", value: "no" },
                    ]}
                    onSelect={(val) => {
                        setUseParallel(val === "yes");
                        setTimeout(() => startDownloading(), 50);
                    }}
                />
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Box marginBottom={1} flexDirection="column">
                <Text color="rgb(248,113,113)" bold>
                    ⚠️ {chaptersToDownload.length} adet bölüm indirilecek.
                </Text>
                <Text color="rgb(56,189,248)">İşlemi onaylıyor musunuz?</Text>
            </Box>
            <ScrollableSelectInput
                items={[
                    { label: "Evet, Onayla ve Devam Et", value: "yes" },
                    { label: "Hayır, Seçime Geri Dön", value: "no" },
                ]}
                onSelect={(val) => {
                    if (val === "yes") {
                        setStep("CONFIRM_PARALLEL");
                    } else {
                        setStep("CHAPTER_SELECT");
                    }
                }}
            />
        </Box>
    );
};

export default ConfirmDownloadView;
