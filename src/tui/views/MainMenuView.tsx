import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Box, Text } from "ink";

interface MainMenuViewProps {
    setStep: (step: TuiStep) => void;
    setSearchTerm: (term: string) => void;
    setStatusMessage: (msg: string) => void;
    exit: () => void;
}

export const MainMenuView = ({
    setStep,
    setSearchTerm,
    setStatusMessage,
    exit,
}: MainMenuViewProps) => {
    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text color="gray" italic>
                    Türkçe manga indirme arayüzüne hoş geldiniz. Lütfen yapmak istediğiniz işlemi
                    seçin:
                </Text>
            </Box>
            <ScrollableSelectInput
                items={[
                    { label: "🚀 Manga Ara ve İndir", value: "search" },
                    { label: "⚙️  Ayarlar", value: "settings" },
                    { label: "🚪 Çıkış", value: "exit" },
                ]}
                onSelect={(val) => {
                    if (val === "search") {
                        setSearchTerm("");
                        setStep("SEARCH_INPUT");
                    } else if (val === "settings") {
                        setStatusMessage("");
                        setStep("SETTINGS");
                    } else if (val === "exit") {
                        exit();
                    }
                }}
            />
        </Box>
    );
};

export default MainMenuView;
