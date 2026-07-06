import TextInput from "@/tui/components/atoms/TextInput";
import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Settings } from "@/types";
import { Box, Text } from "ink";

interface SettingsViewProps {
    step: TuiStep;
    setStep: (step: TuiStep) => void;
    settings: Settings;
    manualPathInput: string;
    setManualPathInput: (path: string) => void;
    handleFolderSelect: () => void;
    handleManualPathSubmit: () => void;
}

export const SettingsView = ({
    step,
    setStep,
    settings,
    manualPathInput,
    setManualPathInput,
    handleFolderSelect,
    handleManualPathSubmit,
}: SettingsViewProps) => {
    if (step === "SETTINGS_MANUAL_DIR") {
        return (
            <Box flexDirection="column">
                <Box marginBottom={1}>
                    <Text color="yellow">
                        Yeni indirme klasörünün tam yolunu girin ve [Enter]'a basın:
                    </Text>
                </Box>
                <TextInput
                    value={manualPathInput}
                    onChange={setManualPathInput}
                    onSubmit={handleManualPathSubmit}
                />
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Box marginBottom={1} flexDirection="column">
                <Text color="white">
                    Mevcut İndirme Klasörü:{" "}
                    <Text color="green" bold>
                        {settings.downloadDir}
                    </Text>
                </Text>
            </Box>
            <ScrollableSelectInput
                items={[
                    { label: "📁 İndirme Klasörünü Değiştir", value: "change_dir" },
                    { label: "↩️  Geri Dön", value: "back" },
                ]}
                onSelect={(val) => {
                    if (val === "change_dir") {
                        handleFolderSelect();
                    } else if (val === "back") {
                        setStep("MAIN_MENU");
                    }
                }}
            />
        </Box>
    );
};

export default SettingsView;
