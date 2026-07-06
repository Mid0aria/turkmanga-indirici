import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { Box, Text } from "ink";

interface FinishedViewProps {
    setSearchTerm: (term: string) => void;
    setStep: (step: "SEARCH_INPUT" | "MAIN_MENU") => void;
    exit: () => void;
}

export const FinishedView = ({ setSearchTerm, setStep, exit }: FinishedViewProps) => {
    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text color="rgb(52,211,153)" bold>
                    🎉 Tebrikler! Tüm seçili bölümler başarıyla indirildi.
                </Text>
            </Box>
            <ScrollableSelectInput
                items={[
                    { label: "🔄 Başka Bir Manga Ara", value: "search" },
                    { label: "🏠 Ana Menüye Dön", value: "menu" },
                    { label: "🚪 Çıkış Yap", value: "exit" },
                ]}
                onSelect={(val) => {
                    if (val === "search") {
                        setSearchTerm("");
                        setStep("SEARCH_INPUT");
                    } else if (val === "menu") {
                        setStep("MAIN_MENU");
                    } else if (val === "exit") {
                        exit();
                    }
                }}
            />
        </Box>
    );
};

export default FinishedView;
